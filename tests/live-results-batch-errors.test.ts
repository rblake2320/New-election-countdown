import { describe, expect, it } from 'vitest';
import { liveResultReadErrorSchema, liveResultsBatchSchema, noLiveElectionResults } from '../shared/live-election-results';
const failure = { electionId: 3, code: 'source_unavailable' as const, message: 'Official results could not be confirmed for this race', sourceId: 'nc-enr-reviewed', failedSince: '2026-11-04T01:00:00.000Z', electionContext: { state: 'NC', electionDate: '2026-11-03', type: 'general', level: 'federal', office: 'U.S. Senate Election - North Carolina' } };
const base = () => ({ schemaVersion: 1 as const, date: '2026-11-03', cursor: 'opaque-snapshot-set', reset: true as const, results: [noLiveElectionResults(1), noLiveElectionResults(2)], errors: [structuredClone(failure)] });
describe('partial source failures remain separate from observed or empty result records', () => {
  it('keeps two valid result outcomes beside one contextual failure', () => { const parsed = liveResultsBatchSchema.parse(base()); expect(parsed.results.map(row => row.electionId)).toEqual([1, 2]); expect(parsed.errors?.[0].electionId).toBe(3); });
  it('accepts earlier batches with no errors field', () => { const value = base(); delete (value as { errors?: unknown }).errors; expect(liveResultsBatchSchema.safeParse(value).success).toBe(true); });
  it('refuses the same election in results and errors', () => { const value = base(); value.errors[0].electionId = 1; expect(liveResultsBatchSchema.safeParse(value).success).toBe(false); });
  it('refuses duplicated error outcomes', () => { const value = base(); value.errors.push(structuredClone(failure)); expect(liveResultsBatchSchema.safeParse(value).success).toBe(false); });
  it('refuses a failure from another election date', () => { const value = base(); value.errors[0].electionContext.electionDate = '2026-11-02'; expect(liveResultsBatchSchema.safeParse(value).success).toBe(false); });
  it.each(['totalVotes', 'candidates', 'isProjectedWinner'])('an error cannot carry invented %s', key => { expect(liveResultReadErrorSchema.safeParse({ ...failure, [key]: key === 'candidates' ? [] : 0 }).success).toBe(false); });
  it.each(['not a timestamp', '2026-11-04T01:00:00+99:99'])('refuses invalid observed failure clock %s', failedSince => { expect(liveResultReadErrorSchema.safeParse({ ...failure, failedSince }).success).toBe(false); });
  it('requires the complete recorded race context', () => { const value = { ...failure, electionContext: { ...failure.electionContext } }; delete (value.electionContext as { office?: string }).office; expect(liveResultReadErrorSchema.safeParse(value).success).toBe(false); });
  it('never accepts none plus stale as a substitute failure record', () => { const value = base(); value.results[0].stale = true; value.results[0].staleSince = failure.failedSince; expect(liveResultsBatchSchema.safeParse(value).success).toBe(false); });
});
