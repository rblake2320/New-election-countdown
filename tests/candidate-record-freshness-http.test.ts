/** Real Express/loopback route receiving; only storage/provider boundaries are isolated fixtures. */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const h = vi.hoisted(() => ({ candidate: {} as Record<string, unknown>, mode: 'empty', calls: 0 }));
vi.mock('../server/storage', () => ({ storage: {
  getElection: async () => ({ id: 7, title: 'U.S. House', offices: ['U.S. House'], state: 'NC', location: '01' }),
  getCandidatesByElection: async () => [h.candidate],
  getCandidatesByIds: async () => [h.candidate],
} }));
vi.mock('../server/db', () => ({ pool: {} }));
vi.mock('../server/auth', () => ({ isAuthenticated: (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('../server/election-integrity-routes', () => ({ registerElectionIntegrityRoutes: () => {} }));
vi.mock('../server/services/votesmart-service', () => ({ voteSmartService: null }));
vi.mock('../server/civic-aggregator-service', () => ({ civicAggregatorService: {
  getComprehensiveCandidateData: async () => {
    h.calls++;
    if (h.mode === 'throw') throw new Error('isolated unavailable provider');
    if (h.mode === 'empty') return [];
    // This reproduces the existing provider aggregate's generated capture clock,
    // including its all-empty/missing-key path. It is not a publisher update.
    return [{ voteSmartData: { bio: null, detailedBio: null, positions: [], votingRecord: [],
      ratings: [], photoUrl: null, issues: [], lastUpdated: new Date().toISOString() } }];
  },
} }));
import { electionsRouter } from '../server/routes/elections';

let server: Server;
let base: string;
const recorded = '2026-09-12T13:14:15.123Z';
const paths = ['/api/elections/7/candidates', '/api/elections/7/candidates/9'];
beforeAll(async () => {
  const app = express();
  app.use('/api/elections', electionsRouter);
  server = createServer(app);
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>(done => server.close(() => done())));
beforeEach(() => {
  h.candidate = { id: 9, electionId: 7, name: 'Fixture Candidate', party: 'D',
    description: 'Recorded profile', campaignBio: 'Recorded biography', updatedAt: new Date(recorded),
    createdAt: new Date('2026-01-01T00:00:00Z'), isIncumbent: false, isVerified: false,
    dataSource: 'fec_bulk', sourceStatus: 'fec_registered', ballotStatus: 'not_certified' };
  h.mode = 'empty'; h.calls = 0;
});

async function getCandidate(path: string) {
  const res = await fetch(base + path);
  expect(res.status).toBe(200);
  const json = await res.json();
  return Array.isArray(json) ? json[0] : json;
}

describe('candidate record freshness comes from persisted rows', () => {
  it('two actual GETs separated by the clock retain the same stored timestamp and profiles', async () => {
    const preimage = JSON.stringify(h.candidate);
    for (const path of paths) {
      const first = await getCandidate(path);
      await new Promise(done => setTimeout(done, 25));
      const second = await getCandidate(path);
      expect(first.last_data_update).toBe(recorded);
      expect(second.last_data_update).toBe(recorded);
      expect(second).toMatchObject({ id: 9, name: 'Fixture Candidate', description: 'Recorded profile',
        campaign_bio: 'Recorded biography', source: { data_source: 'fec_bulk', source_status: 'fec_registered' } });
    }
    expect(JSON.stringify(h.candidate)).toBe(preimage);
  });

  it('ignores parseable request-generated VoteSmart clocks on enriched list and detail responses', async () => {
    h.mode = 'generated';
    for (const path of paths) {
      const first = await getCandidate(path);
      await new Promise(done => setTimeout(done, 25));
      const second = await getCandidate(path);
      expect(first.last_data_update).toBe(recorded);
      expect(second.last_data_update).toBe(recorded);
    }
    expect(h.calls).toBe(4);
  });

  it('unknown persisted timestamps stay null even when the provider supplies a parseable generated clock', async () => {
    h.candidate.updatedAt = null; h.mode = 'generated';
    for (const path of paths) expect((await getCandidate(path)).last_data_update).toBeNull();
  });

  it('provider failure preserves the persisted record timestamp and profile', async () => {
    h.mode = 'throw';
    for (const path of paths) {
      expect(await getCandidate(path)).toMatchObject({ last_data_update: recorded, campaign_bio: 'Recorded biography' });
    }
  });

  it('raw SQL snake_case timestamps are normalized to the same instant', async () => {
    delete h.candidate.updatedAt;
    h.candidate.updated_at = '2026-09-12T15:14:15.123+02:00';
    for (const path of paths) expect((await getCandidate(path)).last_data_update).toBe(recorded);
  });
});
