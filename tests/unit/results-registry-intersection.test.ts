import { afterEach, describe, expect, it } from 'vitest';
import { ResultsSourceRegistry, resultsSourceRegistry, type AdmissionTarget } from '../../server/results-source-registry';
import { MemResultReportStore } from '../../server/results-store';
import type { ResultReportInput } from '../../server/results-reports';

const source = { id: 'nc-exact', kind: 'official_state_enr' as const, name: 'NC', state: 'NC', allowedUrls: ['https://www.ncsbe.gov/results'], electionIds: [24], electionDate: '2024-03-05', phase: 'primary' };
const target: AdmissionTarget = { id: 24, state: 'NC', date: '2024-03-05', type: 'primary' };
const mismatches: Array<[string, Partial<AdmissionTarget>]> = [
  ['ID', { id: 25 }], ['state', { state: 'LA' }], ['missing state', { state: null }],
  ['date', { date: '2024-03-06' }], ['phase', { type: 'general' }],
];
afterEach(() => resultsSourceRegistry.clear());

describe('reviewed registry constraints intersect', () => {
  it.each(mismatches)('refuses a mismatched %s even when other constraints match', (_, change) => {
    const registry = new ResultsSourceRegistry(); registry.register(source);
    expect(registry.admittedFor(target).map(s => s.id)).toEqual([source.id]);
    expect(registry.admittedFor({ ...target, ...change })).toEqual([]);
  });
  it('supports state/date registrations and ID-only registrations without weakening declared constraints', () => {
    const registry = new ResultsSourceRegistry();
    registry.register({ ...source, electionIds: undefined });
    expect(registry.admittedFor({ ...target, id: 25 })).toHaveLength(1);
    registry.register({ ...source, electionDate: undefined, phase: undefined });
    expect(registry.admittedFor({ ...target, date: '2020-01-01', type: 'general' })).toHaveLength(1);
    expect(registry.admittedFor({ ...target, state: 'LA' })).toEqual([]);
    expect(registry.admittedFor({ ...target, id: 25 })).toEqual([]);
  });
  it.each(mismatches)('writer independently refuses mismatched %s without storing a report', async (_, change) => {
    resultsSourceRegistry.register(source);
    const race = { ...target, ...change };
    const store = new MemResultReportStore(() => true, () => true, () => [], () => new Date(race.date), () => ({ state: race.state ?? '', electionDate: String(race.date), type: race.type, level: 'federal', office: 'Senate' }), () => []);
    const input: ResultReportInput = {
      schemaVersion: 1, electionId: race.id, status: 'unofficial',
      reporting: { percent: null, basis: null, precinctsReporting: null, precinctsTotal: null },
      source: { id: source.id, kind: source.kind, name: source.name, url: source.allowedUrls[0], sourceContestId: 'test' },
      sourcePayloadSha256: 'a'.repeat(64), asOf: null, asOfBasis: 'not_provided', retrievedAt: '2024-03-07T00:00:00Z', totalVotes: 1,
      candidates: [{ candidateId: null, sourceCandidateId: 'test', name: 'Test-only boundary fixture', party: null, votes: 1, percent: null, isWinner: false }],
      winnerCalledBy: null, certification: null, note: null, supersedesReportId: null,
    };
    await expect(store.recordResultReport(race.id, input, { postedBy: 'boundary-test', idempotencyKey: null })).rejects.toMatchObject({ status: 422 });
    expect((await store.getResultsPayload(race.id))?.reportId).toBeNull();
  });
});
