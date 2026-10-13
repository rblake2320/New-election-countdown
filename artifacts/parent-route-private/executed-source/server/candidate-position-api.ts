import { db } from './db';
import { candidatePositions, type CandidatePosition } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export class CandidatePositionUnavailableError extends Error {
  constructor(public readonly code: 'POSITION_SOURCE_UNAVAILABLE' | 'INVALID_CANDIDATE_ID' | 'INVALID_POSITION_SOURCE', message: string) {
    super(message); this.name = 'CandidatePositionUnavailableError';
  }
}
export interface PositionSource {
  type: 'Candidate Portal'; sourcePositionId: number; description: string;
  confidence: null; url: string | null; date: Date | null;
}
export interface PositionData {
  category: string; position: string; confidence: null; sources: PositionSource[];
}

/** Return actual verified, candidate-supplied records. Party, congressional
 * tenure/committees and a website link are not evidence of a policy position. */
export class CandidatePositionAPI {
  async getPositionsForCandidate(candidateId: number): Promise<PositionData[]> {
    if (!Number.isSafeInteger(candidateId) || candidateId < 1) throw new CandidatePositionUnavailableError('INVALID_CANDIDATE_ID', 'A positive candidate identifier is required');
    let rows: CandidatePosition[];
    try {
      rows = await db.select().from(candidatePositions).where(and(
        eq(candidatePositions.candidateId, candidateId), eq(candidatePositions.isVerified, true),
      )).orderBy(desc(candidatePositions.lastUpdated), desc(candidatePositions.id));
    } catch {
      throw new CandidatePositionUnavailableError('POSITION_SOURCE_UNAVAILABLE', 'Verified candidate position records are unavailable');
    }
    if (!Array.isArray(rows)) throw new CandidatePositionUnavailableError('POSITION_SOURCE_UNAVAILABLE', 'Verified candidate position records are unavailable');
    const positions: PositionData[] = [];
    const categories = new Set<string>();
    for (const row of rows) {
      // Keep this boundary even though SQL filters these fields: a row without
      // the exact verified subject binding cannot become a public statement.
      if (row.candidateId !== candidateId || row.isVerified !== true) continue;
      if (!Number.isSafeInteger(row.id) || row.id < 1 || !row.category?.trim() || !row.position?.trim()) throw new CandidatePositionUnavailableError('INVALID_POSITION_SOURCE', 'Verified position has invalid source identity or text');
      if (categories.has(row.category)) continue;
      let sourceUrl: string | null = null;
      if (row.sourceUrl !== null) {
        try { const url = new URL(row.sourceUrl); if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Unsafe source URL'); sourceUrl = row.sourceUrl; }
        catch { throw new CandidatePositionUnavailableError('INVALID_POSITION_SOURCE', 'Verified position has an invalid source URL'); }
      }
      const date = row.lastUpdated ?? row.createdAt ?? null;
      if (date !== null && (!(date instanceof Date) || !Number.isFinite(date.getTime()))) throw new CandidatePositionUnavailableError('INVALID_POSITION_SOURCE', 'Verified position has an invalid recorded date');
      categories.add(row.category);
      positions.push({ category: row.category, position: row.position, confidence: null, sources: [{
        type: 'Candidate Portal', sourcePositionId: row.id, description: row.position,
        confidence: null, url: sourceUrl, date,
      }] });
    }
    return positions;
  }
}
export const candidatePositionAPI = new CandidatePositionAPI();
