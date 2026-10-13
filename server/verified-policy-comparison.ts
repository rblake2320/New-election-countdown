import { db } from './db';
import { candidates } from '@shared/schema';
import { inArray } from 'drizzle-orm';
import { candidatePositionAPI, CandidatePositionUnavailableError, type PositionData } from './candidate-position-api';

export const VERIFIED_COMPARE_MAX_CANDIDATES = 20;
export const VERIFIED_COMPARE_MAX_CATEGORIES = 20;
export interface VerifiedPolicyPosition {
  candidateId: string; candidateName: string; position: string; details: string;
  source: string | null; confidence: null;
  sourcePositionId: number | null; sourceUrl: string | null; recordedDate: string | null;
}
export interface VerifiedPolicyComparison { category: string; positions: VerifiedPolicyPosition[] }
export class VerifiedPolicyComparisonError extends Error {
  constructor(public readonly code: 'INVALID_CANDIDATE_IDS' | 'INVALID_POLICY_CATEGORIES' | 'CANDIDATE_NOT_FOUND' | 'CANDIDATE_SOURCE_UNAVAILABLE' | 'POSITION_SOURCE_UNAVAILABLE' | 'INVALID_POSITION_SOURCE', public readonly status: 400 | 404 | 422 | 503, message: string) {
    super(message); this.name = 'VerifiedPolicyComparisonError';
  }
}
function refuse(condition: unknown, code: VerifiedPolicyComparisonError['code'], status: VerifiedPolicyComparisonError['status'], message: string): asserts condition {
  if (!condition) throw new VerifiedPolicyComparisonError(code, status, message);
}
export function verifiedComparisonInputs(candidateIds: unknown, categories: unknown): { ids: number[]; categories: string[] } {
  const rawIds = typeof candidateIds === 'string' ? candidateIds.split(',') : candidateIds;
  refuse(Array.isArray(rawIds) && rawIds.length > 0 && rawIds.length <= VERIFIED_COMPARE_MAX_CANDIDATES, 'INVALID_CANDIDATE_IDS', 400, 'Use between one and twenty candidate identifiers');
  const ids: number[] = [];
  for (const value of rawIds) {
    refuse(typeof value === 'number' || typeof value === 'string' && /^[1-9]\d*$/.test(value.trim()), 'INVALID_CANDIDATE_IDS', 400, 'Candidate identifiers must be complete positive integers');
    const id = typeof value === 'number' ? value : Number(value.trim());
    refuse(Number.isSafeInteger(id) && id > 0 && id <= 2147483647, 'INVALID_CANDIDATE_IDS', 400, 'Candidate identifier is outside the stored integer range');
    if (!ids.includes(id)) ids.push(id);
  }
  const rawCategories = typeof categories === 'string' ? categories.split(',') : categories;
  refuse(Array.isArray(rawCategories) && rawCategories.length > 0 && rawCategories.length <= VERIFIED_COMPARE_MAX_CATEGORIES, 'INVALID_POLICY_CATEGORIES', 400, 'Use between one and twenty policy categories');
  const requested: string[] = [], keys = new Set<string>();
  for (const value of rawCategories) {
    refuse(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 100 && !/[\u0000-\u001f\u007f]/.test(value), 'INVALID_POLICY_CATEGORIES', 400, 'Policy categories must be nonempty bounded text');
    const category = value.trim(), key = category.toLowerCase();
    if (!keys.has(key)) { requested.push(category); keys.add(key); }
  }
  return { ids, categories: requested };
}

/** Exact source categories and verified subject rows only. No voting/party/funding inference. */
export async function compareVerifiedCandidatePolicies(candidateIds: unknown, policyCategories: unknown): Promise<VerifiedPolicyComparison[]> {
  const input = verifiedComparisonInputs(candidateIds, policyCategories);
  let identities: Array<{ id: number; name: string }>;
  try { identities = await db.select({ id: candidates.id, name: candidates.name }).from(candidates).where(inArray(candidates.id, input.ids)); }
  catch { throw new VerifiedPolicyComparisonError('CANDIDATE_SOURCE_UNAVAILABLE', 503, 'Candidate identity records are unavailable'); }
  refuse(Array.isArray(identities), 'CANDIDATE_SOURCE_UNAVAILABLE', 503, 'Candidate identity records are unavailable');
  const names = new Map<number, string>();
  for (const row of identities) {
    refuse(input.ids.includes(row.id) && typeof row.name === 'string' && row.name.trim().length > 0 && row.name.length <= 512 && !names.has(row.id), 'INVALID_POSITION_SOURCE', 422, 'Candidate identity is not uniquely bound to the requested stored subject');
    names.set(row.id, row.name);
  }
  refuse(input.ids.every(id => names.has(id)), 'CANDIDATE_NOT_FOUND', 404, 'A requested candidate profile was not found');
  const output: VerifiedPolicyComparison[] = input.categories.map(category => ({ category, positions: [] }));
  const byCategory = new Map(output.map(row => [row.category.toLowerCase(), row]));
  const read = async (id: number): Promise<PositionData[]> => {
    try { return await candidatePositionAPI.getPositionsForCandidate(id); }
    catch (error) {
      if (error instanceof CandidatePositionUnavailableError) throw new VerifiedPolicyComparisonError(error.code === 'INVALID_CANDIDATE_ID' ? 'INVALID_CANDIDATE_IDS' : error.code, error.code === 'INVALID_POSITION_SOURCE' ? 422 : error.code === 'INVALID_CANDIDATE_ID' ? 400 : 503, error.message);
      throw new VerifiedPolicyComparisonError('POSITION_SOURCE_UNAVAILABLE', 503, 'Verified candidate position records are unavailable');
    }
  };
  // At most20 local reads; no provider or enrichment boundary is invoked.
  const records = await Promise.all(input.ids.map(read));
  input.ids.forEach((id, index) => {
    const selected = new Set<string>();
    for (const position of records[index]) {
      const key = position.category.trim().toLowerCase();
      const category = byCategory.get(key);
      if (!category) continue; // Exact category equivalence, never a keyword/substring inference.
      if (selected.has(key)) continue;
      selected.add(key);
      refuse(position.sources.length === 1, 'INVALID_POSITION_SOURCE', 422, 'A comparison statement requires one exact verified source row');
      const source = position.sources[0];
      refuse(Number.isSafeInteger(source.sourcePositionId) && source.sourcePositionId > 0, 'INVALID_POSITION_SOURCE', 422, 'Verified source row identifier is missing');
      category.positions.push({ candidateId: String(id), candidateName: names.get(id)!, position: position.position, details: source.description, source: source.type, confidence: null, sourcePositionId: source.sourcePositionId, sourceUrl: source.url, recordedDate: source.date === null ? null : source.date.toISOString() });
    }
  });
  return output;
}
