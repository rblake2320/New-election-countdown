/**
 * Lane B server branch (C's redistribution C-A-limit-B13), real HTTP over a real socket:
 *  - GET /api/elections/:id returns the SAME row as the list (poll hours + provenance + candidateCount) - ET-44
 *  - GET /api/candidates/:id carries the same `source` layer as /api/elections/:id/candidates
 *  - GET /api/admin/elections (guarded): inclusive dates, no 30-day cutoff, typed errors, 503 never [].
 * Real express + the real route modules on the real MemStorage. Only the Postgres handle used for
 * biography/positions rows and the external enrichment service are replaced (empty), as the
 * PostgreSQL path is proven by the private-runtime receiving.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const h = vi.hoisted(() => ({ storage: null as any }));
vi.mock('../server/storage', () => ({ get storage() { return h.storage; } }));
vi.mock('../server/db', () => {
  const empty = { from: () => ({ where: () => Object.assign(Promise.resolve([]), { limit: () => Promise.resolve([]) }) }) };
  return { db: { select: () => empty }, pool: { query: async () => ({ rows: [] }) } };
});
vi.mock('../server/civic-aggregator-service', () => ({ civicAggregatorService: { getComprehensiveCandidateData: async () => [] } }));
vi.mock('../server/services/votesmart-service', () => ({ voteSmartService: null }));
vi.mock('../server/perplexity-service', () => ({ getPerplexityService: () => null }));

import { MemStorage } from '../server/mem-storage';
import { electionsRouter } from '../server/routes/elections';
import candidatesRouter from '../server/routes/candidates';
import { adminElectionLookupHandler } from '../server/admin-election-lookup';

let server: Server; let base: string; let mem: MemStorage;
let ids: { nc: number; la: number; ak: number; far: number }; let fecId: number; let certId: number;
let allow = true; let failing = false;

beforeAll(async () => {
  mem = new MemStorage(); h.storage = mem;
  const mk = (title: string, state: string, date: string, extra: object = {}) => mem.createElection({
    title, subtitle: null, location: state, state, date: new Date(date), type: 'general', level: 'federal', offices: [title], description: null,
    pollsOpen: '6:30 AM', pollsClose: '7:30 PM', timezone: 'America/New_York', isActive: true, ...extra,
  } as any);
  const nc = await mk('U.S. House NC-01', 'NC', '2026-03-03T00:00:00Z', { pollCloseKind: 'polls', pollHoursBasis: 'statewide_latest', pollHoursSource: 'https://elections.example.gov/nc/hours' });
  const la = await mk('U.S. House LA-01', 'LA', '2026-06-27T00:00:00Z');
  const ak = await mk('U.S. Senate - Alaska', 'AK', '2026-11-03T00:00:00Z', { timezone: 'America/Anchorage' });
  const far = await mk('U.S. Senate - Texas', 'TX', '2028-11-07T00:00:00Z');
  ids = { nc: nc.id, la: la.id, ak: ak.id, far: far.id };
  fecId = (await mem.createCandidate({ name: 'Fran Fec', party: 'D', electionId: ak.id, dataSource: 'fec_bulk', sourceStatus: 'fec_registered', ballotStatus: 'not_certified', fecStatus: 'C' } as any)).id;
  certId = (await mem.createCandidate({ name: 'Cal Certified', party: 'R', electionId: ak.id, dataSource: 'state_ballot', sourceStatus: 'ballot_certified', ballotStatus: 'certified' } as any)).id;
  const app = express();
  const guard: express.RequestHandler = (_q, res, next) => (allow ? next() : res.status(403).json({ error: 'Admin only' }));
  app.get('/api/admin/elections', guard, adminElectionLookupHandler({
    getElectionsStrict: async f => { if (failing) throw new Error('db down'); return mem.getElectionsStrict(f); },
  }));
  app.use('/api/elections', electionsRouter);
  app.use('/api/candidates', candidatesRouter);
  server = createServer(app);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>(r => server.close(() => r())));
const get = async (path: string) => { const res = await fetch(base + path); return { status: res.status, body: await res.json() as any }; };
const idsOf = (body: any[]) => body.map(e => e.id);

describe('ET-44: single-election payload carries the list row', () => {
  it('has every poll field the list has, plus candidateCount', async () => {
    const one = (await get(`/api/elections/${ids.nc}`)).body;
    const fromAdmin = (await get('/api/admin/elections?from=2026-03-03&to=2026-03-03')).body[0];
    for (const k of ['pollsOpen', 'pollsClose', 'timezone', 'pollCloseKind', 'pollHoursBasis', 'pollHoursSource', 'subtitle', 'location', 'offices', 'description', 'isActive', 'candidateCount']) {
      expect(one, k).toHaveProperty(k);
      expect(one[k], k).toEqual(fromAdmin[k]);
    }
    expect(one.pollsClose).toBe('7:30 PM');
    expect(one.pollHoursSource).toBe('https://elections.example.gov/nc/hours');
  });
  it('counts candidates and keeps the legacy `candidates` number', async () => {
    const one = (await get(`/api/elections/${ids.ak}`)).body;
    expect(one.candidateCount).toBe(2);
    expect(one.candidates).toBe(2);
  });
  it('404 for a missing race, 400 for a malformed id', async () => {
    expect((await get('/api/elections/999999')).status).toBe(404);
    expect((await get('/api/elections/2.5')).status).toBe(400);
  });
});

describe('candidate DTO keeps the source layer on both endpoints', () => {
  it('/api/candidates/:id source == /api/elections/:id/candidates source (FEC registration)', async () => {
    const list = (await get(`/api/elections/${ids.ak}/candidates`)).body as any[];
    const fromList = list.find(c => c.id === fecId);
    const single = (await get(`/api/candidates/${fecId}`)).body;
    expect(fromList.source).toEqual({ data_source: 'fec_bulk', source_status: 'fec_registered', ballot_status: 'not_certified', fec_status: 'C' });
    expect(single.source).toEqual(fromList.source);
  });
  it('a certified candidate keeps ballot_status certified; an unset marker stays null, never invented', async () => {
    const single = (await get(`/api/candidates/${certId}`)).body;
    expect(single.source).toEqual({ data_source: 'state_ballot', source_status: 'ballot_certified', ballot_status: 'certified', fec_status: null });
  });
});

describe('GET /api/admin/elections', () => {
  it('returns older races the public 30-day window cannot (NC Mar 3, LA Jun 27), inclusive of both end dates', async () => {
    const r = await get('/api/admin/elections?from=2026-03-03&to=2026-06-27');
    expect(r.status).toBe(200);
    expect(idsOf(r.body)).toEqual([ids.nc, ids.la]);
    expect(r.body[0]).toHaveProperty('candidateCount');
  });
  it('a one-day window matches only that election date; far-future races are reachable (no future cutoff)', async () => {
    expect(idsOf((await get('/api/admin/elections?from=2026-06-27&to=2026-06-27')).body)).toEqual([ids.la]);
    expect(idsOf((await get('/api/admin/elections?from=2028-11-07&to=2028-11-07')).body)).toEqual([ids.far]);
  });
  it('state and q narrow the result', async () => {
    expect(idsOf((await get('/api/admin/elections?from=2026-01-01&to=2026-12-31&state=nc')).body)).toEqual([ids.nc]);
    expect(idsOf((await get('/api/admin/elections?from=2026-01-01&to=2026-12-31&q=alaska')).body)).toEqual([ids.ak]);
    expect((await get('/api/admin/elections?from=2026-01-01&to=2026-12-31&q=zzz')).body).toEqual([]);
  });
  it('400 invalid_query for missing/garbage/rolled-over dates, to < from, bad state, repeated params', async () => {
    for (const qs of ['', '?from=2026-03-03', '?from=x&to=2026-03-04', '?from=2026-02-31&to=2026-03-04', '?from=2026-03-05&to=2026-03-04',
      '?from=2026-03-01&to=2026-03-04&state=Narnia', '?from=2026-03-01&to=2026-03-04&q=a&q=b', '?from=2026-03-01&from=2026-03-02&to=2026-03-04']) {
      const r = await get('/api/admin/elections' + qs);
      expect([r.status, r.body.code], qs).toEqual([400, 'invalid_query']);
    }
  });
  it('422 range_too_large past 400 days, accepted at exactly 400', async () => {
    const big = await get('/api/admin/elections?from=2026-01-01&to=2027-03-01');
    expect([big.status, big.body.code]).toEqual([422, 'range_too_large']);
    expect((await get('/api/admin/elections?from=2026-01-01&to=2027-02-05')).status).toBe(200);
  });
  it('403 when the admin guard denies', async () => {
    allow = false;
    try { expect((await get('/api/admin/elections?from=2026-03-03&to=2026-03-03')).status).toBe(403); } finally { allow = true; }
  });
  it('503 lookup_unavailable on storage failure, never an empty list', async () => {
    failing = true;
    try {
      const r = await get('/api/admin/elections?from=2026-03-03&to=2026-03-03');
      expect([r.status, r.body.code]).toEqual([503, 'lookup_unavailable']);
      expect(Array.isArray(r.body)).toBe(false);
    } finally { failing = false; }
  });
});
