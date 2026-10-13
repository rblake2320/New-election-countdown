import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rows: [] as unknown[], select: vi.fn(), processEvent: vi.fn(), elections: vi.fn(), fetch: vi.fn() }));
vi.mock('../../server/db', () => ({ db: { select: mocks.select } }));
vi.mock('../../server/storage', () => ({ storage: { getElections: mocks.elections } }));
vi.mock('../../server/services/alert-engine-service', () => ({ alertEngineService: { processEvent: mocks.processEvent } }));
import { CandidatePositionAPI } from '../../server/candidate-position-api';
import { EnhancedPositionService } from '../../server/enhanced-position-service';
import { MichiganCandidateService } from '../../server/michigan-candidate-service';
const realStatement = JSON.parse(readFileSync('tests/fixtures/c38/actual-statement-proof.json', 'utf8'));
import { EventProcessorService } from '../../server/services/event-processor-service';
const chain = () => {
 const query = { from: vi.fn(), leftJoin: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn() };
 for (const key of ['from', 'leftJoin', 'where', 'orderBy'] as const) query[key].mockReturnValue(query);
 query.limit.mockResolvedValue([]);
 query.orderBy.mockImplementation(() => Promise.resolve(mocks.rows));
 return query;
};
beforeEach(() => { vi.clearAllMocks(); mocks.rows = []; mocks.select.mockImplementation(chain); mocks.elections.mockResolvedValue([]); vi.stubGlobal('fetch', mocks.fetch); vi.stubEnv('OPENFEC_API_KEY', ''); });

describe('C38 source and receiving contracts', () => {
 it('does not turn party, committee membership or a website into a candidate policy statement', async () => {
  let calls = 0;
  mocks.select.mockImplementation(() => {
   const q = chain(); q.limit.mockResolvedValue(++calls === 1 ? [{ candidate: { id: 1, party: 'D', website: 'https://example.invalid/' }, congressMember: { committees: ['Education'], chamber: 'House', yearsInOffice: 12 } }] : []); return q;
  });
  expect(await new CandidatePositionAPI().getPositionsForCandidate(1)).toEqual([]);
 });
 it('refuses database outage instead of presenting source failure as no positions', async () => {
  mocks.select.mockImplementation(() => { throw new Error('isolated database outage'); });
  await expect(new CandidatePositionAPI().getPositionsForCandidate(1)).rejects.toMatchObject({ code: 'POSITION_SOURCE_UNAVAILABLE' });
 });
 it('returns no enhanced position when no verified source position exists', async () => {
  expect(await new EnhancedPositionService().getEnhancedPositions(1)).toEqual([]);
 });
 it('refuses unsupported Michigan legacy roster rather than publishing hardcoded names or fetching 2024 FEC filings', async () => {
  await expect(new MichiganCandidateService().fetchMichiganCandidates(1)).rejects.toMatchObject({ code: 'LEGACY_MICHIGAN_SOURCE_UNVERIFIED' });
  expect(mocks.fetch).not.toHaveBeenCalled();
 });
 it('uses actual election.date in the alert receiving payload', async () => {
  const date = new Date('2026-11-03T00:00:00Z');
  await new EventProcessorService().processElectionEvent({ id: 1, title: 'Offline receiving boundary', state: 'CA', date, type: 'general', level: 'state' } as never, { electionId: 1, eventType: 'voting_started' });
  expect(mocks.processEvent.mock.calls.at(-1)?.[1].electionDate).toEqual(date);
 });
 it('refuses unconfigured scheduling instead of guessing registration/early-voting dates or claiming scheduled work', async () => {
  await expect(new EventProcessorService().scheduleDeadlineReminders({ id: 1, title: 'Offline source boundary', date: new Date('2026-11-03T00:00:00Z') } as never)).rejects.toMatchObject({ code: 'SCHEDULER_UNAVAILABLE' });
 });
 it('preserves real source wording and row provenance without inventing confidence or source freshness', async () => {
  // Isolated DB boundary record, not an actual campaign-portal/import claim.
  // Positive text is a fetched exact seven-word official source excerpt.
  mocks.rows = [{ id: 1, candidateId: 1, category: 'Healthcare', position: realStatement.retainedExactExcerpt, isVerified: true, sourceUrl: realStatement.sourceUrl, lastUpdated: null, createdAt: null }];
  const positions = await new CandidatePositionAPI().getPositionsForCandidate(1);
  expect(positions).toEqual([{ category: 'Healthcare', position: realStatement.retainedExactExcerpt, confidence: null, sources: [{ type: 'Candidate Portal', sourcePositionId: 1, description: realStatement.retainedExactExcerpt, confidence: null, url: realStatement.sourceUrl, date: null }] }]);
  const enriched = await new EnhancedPositionService().enrichCandidateWithPositions({ id: 1 });
  expect(enriched.enhancedPositions[0].position).toBe(realStatement.retainedExactExcerpt);
  expect(enriched.positionSummary.lastUpdated).toBeNull();
  expect(enriched.positionSummary.averageConfidence).toBeNull();
  expect(enriched.positionSummary.sourceAvailability.votingRecord).toEqual({ status: 'unavailable', code: 'PROVIDER_NOT_CONFIGURED' });
 });
 it('does not expose unverified or differently bound position rows', async () => {
  mocks.rows = [{ id: 1, candidateId: 1, isVerified: false }, { id: 2, candidateId: 2, isVerified: true }];
  expect(await new CandidatePositionAPI().getPositionsForCandidate(1)).toEqual([]);
 });
 it.each([0, -1, NaN, 1.5])('refuses malformed candidate identity %s before querying', async id => {
  await expect(new CandidatePositionAPI().getPositionsForCandidate(id)).rejects.toMatchObject({ code: 'INVALID_CANDIDATE_ID' });
  expect(mocks.select).not.toHaveBeenCalled();
 });
 it.each(['javascript:alert(1)', 'https://user:secret@example.invalid/', 'not a URL'])('refuses unsafe provenance URLs %s', async url => {
  mocks.rows = [{ id: 1, candidateId: 1, category: 'Healthcare', position: realStatement.retainedExactExcerpt, isVerified: true, sourceUrl: url, lastUpdated: null, createdAt: null }];
  await expect(new CandidatePositionAPI().getPositionsForCandidate(1)).rejects.toMatchObject({ code: 'INVALID_POSITION_SOURCE' });
 });
 it('makes source outage distinct from a successful empty enhanced-position lookup', async () => {
  mocks.select.mockImplementation(() => { throw new Error('isolated source outage'); });
  const enriched = await new EnhancedPositionService().enrichCandidateWithPositions({ id: 1 });
  expect(enriched.positionSummary.totalCategories).toBeNull();
  expect(enriched.positionSummary.dataQuality).toBe('unavailable');
  expect(enriched.positionSummary.sourceAvailability.candidatePortal.code).toBe('POSITION_SOURCE_UNAVAILABLE');
 });
 it('filters Michigan lookup by actual primary type, state, date and 20-day scope with missing fields safely ignored', async () => {
  mocks.elections.mockResolvedValue([
   { id: 1, state: null, type: 'primary', date: new Date('2026-10-14T00:00:00Z') },
   { id: 2, state: 'MI', type: 'general', date: new Date('2026-10-14T00:00:00Z') },
   { id: 3, state: 'MI', type: 'primary', date: new Date('2026-09-01T00:00:00Z') },
   { id: 4, state: 'MI', type: 'primary', date: new Date('2026-12-01T00:00:00Z') },
  ]);
  expect(await new MichiganCandidateService().findMichiganPrimaryElection(new Date('2026-10-13T00:00:00Z'))).toBeNull();
 });
 it('refuses Michigan catalog outage explicitly rather than reporting no upcoming primary', async () => {
  mocks.elections.mockRejectedValue(new Error('isolated outage'));
  await expect(new MichiganCandidateService().findMichiganPrimaryElection()).rejects.toMatchObject({ code: 'MICHIGAN_CATALOG_UNAVAILABLE' });
 });
 it('refuses cross-election alert context before emitting or claiming a result', async () => {
  await expect(new EventProcessorService().processElectionEvent({ id: 1, title: 'Offline context', date: new Date('2026-11-03T00:00:00Z') } as never, { electionId: 2, eventType: 'results_update' })).rejects.toMatchObject({ code: 'INVALID_EVENT_CONTEXT' });
  expect(mocks.processEvent).not.toHaveBeenCalled();
 });

 it('does not invent processing history from the stats-read clock', () => {
  expect(new EventProcessorService().getProcessingStats().lastProcessingTime).toBeNull();
 });

});
