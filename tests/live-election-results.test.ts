import { describe, expect, it } from 'vitest';
import { liveElectionResultsSchema, liveResultReportInputSchema, liveResultsBatchSchema, noLiveElectionResults } from '../shared/live-election-results';

// Boundary-only test objects; these are never seed data or a user-visible feed.
const recorded = () => ({
  schemaVersion: 1 as const, electionId: 1, reportId: 1, revision: 'r1-test-only', status: 'unofficial' as const,
  source: { id: 'test-only-source', kind: 'official_state_page' as const, name: 'Test-only publisher', url: 'https://example.gov/boundary-only', sourceContestId: 'test-only-contest' },
  sourcePayloadSha256: 'a'.repeat(64), asOf: '2024-11-06T02:00:00Z', asOfBasis: 'source_timestamp' as const,
  retrievedAt: '2024-11-06T02:01:00Z', totalVotes: 0,
  reporting: { percent: null, basis: 'source_unspecified' as const, precinctsReporting: null, precinctsTotal: null },
  candidates: [{ candidateId: null, sourceCandidateId: 'test-only-option', name: 'Test-only ballot option', party: null, votes: 0, percent: null, isWinner: false }],
  winnerCalledBy: null, certification: null, supersedesReportId: null, history: [], stale: false, staleSince: null,
});
const posting = () => {
  const { reportId: _reportId, revision: _revision, history: _history, stale: _stale, staleSince: _staleSince, ...fields } = recorded();
  return { ...fields, expectedRevision: null, idempotencyKey: 'test-only-source-snapshot', note: null };
};

describe('ET-6 observed-result transport contract', () => {
  it('represents no verified ingested result with nulls rather than invented zeros', () => {
    const none = noLiveElectionResults(1);
    expect(none.status).toBe('none'); expect(none.totalVotes).toBeNull(); expect(none.candidates).toEqual([]);
    expect(none.asOf).toBeNull(); expect(none.retrievedAt).toBeNull();
    expect(liveElectionResultsSchema.safeParse({ ...none, totalVotes: 0 }).success).toBe(false);
  });
  it('keeps genuinely reported zero separate from absence and leaves unknown percentages null', () => {
    const row = liveElectionResultsSchema.parse(recorded());
    expect(row.totalVotes).toBe(0); expect(row.reporting?.percent).toBeNull(); expect(row.candidates[0].percent).toBeNull();
  });
  it('rejects projected-winner fields at either input boundary', () => {
    expect(liveResultReportInputSchema.safeParse({ ...posting(), isProjectedWinner: true }).success).toBe(false);
    const row = posting();
    expect(liveResultReportInputSchema.safeParse({ ...row, candidates: [{ ...row.candidates[0], isProjectedWinner: true }] }).success).toBe(false);
  });
  it('does not turn 100 percent precincts or certification into a computed winner', () => {
    const base = recorded();
    const complete = { ...base, reporting: { percent: 100, basis: 'precincts', precinctsReporting: 2, precinctsTotal: 2 } };
    expect(liveElectionResultsSchema.parse(complete).candidates[0].isWinner).toBe(false);
    const certified = { ...complete, status: 'certified', certification: { url: 'https://example.gov/boundary-only-certification', certifiedAt: null } };
    expect(liveElectionResultsSchema.parse(certified).candidates[0].isWinner).toBe(false);
    expect(liveElectionResultsSchema.safeParse({ ...certified, candidates: [{ ...base.candidates[0], isWinner: true }] }).success).toBe(false);
  });
  it.each(['', 'not a url'])('returns validation failures rather than throwing for malformed URL %j', url => {
    const source = { ...posting(), source: { ...posting().source, url } };
    expect(() => liveResultReportInputSchema.safeParse(source)).not.toThrow();
    expect(liveResultReportInputSchema.safeParse(source).success).toBe(false);
    const declaration = { ...posting(), winnerCalledBy: { source: 'Test-only official decision', url, at: recorded().asOf }, candidates: [{ ...posting().candidates[0], isWinner: true }] };
    expect(() => liveResultReportInputSchema.safeParse(declaration)).not.toThrow();
    expect(liveResultReportInputSchema.safeParse(declaration).success).toBe(false);
    const certified = { ...posting(), status: 'certified', certification: { url, certifiedAt: null } };
    expect(() => liveResultReportInputSchema.safeParse(certified)).not.toThrow();
    expect(liveResultReportInputSchema.safeParse(certified).success).toBe(false);
  });
  it('rejects certification without evidence and AP certification', () => {
    expect(liveElectionResultsSchema.safeParse({ ...recorded(), status: 'certified' }).success).toBe(false);
    expect(liveElectionResultsSchema.safeParse({ ...recorded(), status: 'certified', source: { ...recorded().source, kind: 'ap' }, certification: { url: 'https://example.gov/test-only', certifiedAt: null } }).success).toBe(false);
  });
  it('requires a real timestamp basis and refuses future source time', () => {
    expect(liveElectionResultsSchema.safeParse({ ...recorded(), asOf: null }).success).toBe(false);
    expect(liveElectionResultsSchema.parse({ ...recorded(), asOf: null, asOfBasis: 'not_provided' }).asOf).toBeNull();
    expect(liveElectionResultsSchema.safeParse({ ...recorded(), asOf: '2024-11-06T03:00:00Z' }).success).toBe(false);
  });
  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('refuses invalid vote count %s', votes => {
    expect(liveResultReportInputSchema.safeParse({ ...posting(), candidates: [{ ...posting().candidates[0], votes }] }).success).toBe(false);
  });
  it('refuses duplicate source options and candidate bindings before a writer can run', () => {
    const row = posting();
    expect(liveResultReportInputSchema.safeParse({ ...row, candidates: [row.candidates[0], row.candidates[0]] }).success).toBe(false);
    expect(liveResultReportInputSchema.safeParse({ ...row, candidates: [{ ...row.candidates[0], candidateId: 1 }, { ...row.candidates[0], candidateId: 1, sourceCandidateId: 'another-test-only-option' }] }).success).toBe(false);
  });
  it('never accepts none or server-generated metadata as a posted report', () => {
    expect(liveResultReportInputSchema.safeParse({ ...posting(), status: 'none' }).success).toBe(false);
    expect(liveResultReportInputSchema.safeParse({ ...posting(), reportId: 7 }).success).toBe(false);
  });
  it('keeps stale counts but requires the actual failure time', () => {
    expect(liveElectionResultsSchema.safeParse({ ...recorded(), stale: true }).success).toBe(false);
    expect(liveElectionResultsSchema.parse({ ...recorded(), stale: true, staleSince: '2024-11-06T02:02:00Z' }).candidates).toHaveLength(1);
  });
  it('allows multiple official declared winners, without a highest-vote rule', () => {
    const row = recorded();
    const multiple = { ...row, winnerCalledBy: { source: 'Test-only official declaration', url: 'https://example.gov/test-only-decision', at: row.asOf }, candidates: [{ ...row.candidates[0], isWinner: true }, { ...row.candidates[0], sourceCandidateId: 'another-test-only-option', isWinner: true }] };
    expect(liveElectionResultsSchema.parse(multiple).candidates.filter(candidate => candidate.isWinner)).toHaveLength(2);
  });
  it('validates a single-poll full-replacement batch and refuses duplicate contests/phantom deltas', () => {
    const batch = { schemaVersion: 1, date: '2026-11-03', results: [noLiveElectionResults(1), noLiveElectionResults(2)], cursor: 'test-only-snapshot-hash', reset: true };
    expect(liveResultsBatchSchema.parse(batch).results).toHaveLength(2);
    expect(liveResultsBatchSchema.safeParse({ ...batch, results: [noLiveElectionResults(1), noLiveElectionResults(1)] }).success).toBe(false);
    expect(liveResultsBatchSchema.safeParse({ ...batch, reset: false }).success).toBe(false);
    expect(liveResultsBatchSchema.safeParse({ ...batch, date: '2026-02-30' }).success).toBe(false);
  });
});
