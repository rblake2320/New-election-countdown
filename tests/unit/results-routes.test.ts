import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { MemStorage } from '../../server/mem-storage';
import { registerResultsRoutes } from '../../server/results-routes';
import { resultReportInputSchema, type ResultReportInput } from '../../server/results-reports';

// ET-6 live official results, contract v1.2 — real express + the real MemStorage (same store
// semantics as the PostgreSQL implementation; the DB path is proven live on the private copy).

const SHA = 'a'.repeat(64);
// MemStorage hands out ids from one counter shared by every entity, so candidate ids are captured per harness.
let CID: [number, number] = [0, 0];
// Fixtures sit in the PAST: the writer refuses retrievedAt in the future and snapshots before election day.
const ELECTION_DAY = '2026-10-01';

function snapshot(over: Partial<ResultReportInput> = {}): ResultReportInput {
  return {
    schemaVersion: 1,
    electionId: 0, // the post helper overrides this with the route election
    status: 'unofficial',
    reporting: { percent: 61.25, basis: 'precincts', precinctsReporting: 245, precinctsTotal: 400 },
    source: { id: 'ak-doe', kind: 'official_state_enr', name: 'Alaska Division of Elections', url: 'https://www.elections.alaska.gov/results/26GENR/', sourceContestId: 'US-SEN' },
    sourcePayloadSha256: SHA,
    asOf: '2026-10-02T05:12:00Z',
    asOfBasis: 'source_timestamp',
    retrievedAt: '2026-10-02T05:13:10Z',
    totalVotes: 150000,
    candidates: [
      { candidateId: CID[0], sourceCandidateId: 'c1', name: 'Alice Example', party: 'R', votes: 80000, percent: 53.33, isWinner: false },
      { candidateId: CID[1], sourceCandidateId: 'c2', name: 'Bob Example', party: 'D', votes: 70000, percent: 46.67, isWinner: false },
    ],
    winnerCalledBy: null,
    certification: null,
    note: null,
    supersedesReportId: null,
    ...over,
  };
}

async function harness(admin = true) {
  const mem = new MemStorage();
  const manifest = { publisher: 'ak-doe', routeType: 'election_specific_results', governmentUrl: 'https://www.elections.alaska.gov/results/26GENR/', routeVerification: 'worked', status: 'published' };
  const e = await mem.createElection({ title: 'U.S. Senate - Alaska', subtitle: null, location: 'Alaska', state: 'AK', date: new Date(`${ELECTION_DAY}T00:00:00Z`), type: 'general', level: 'federal', offices: ['U.S. Senate'], description: null, pollsOpen: null, pollsClose: null, timezone: null, isActive: true, officialResultsSource: manifest } as any);
  const e2 = await mem.createElection({ title: 'Governor - Alaska', subtitle: null, location: 'Alaska', state: 'AK', date: new Date(`${ELECTION_DAY}T00:00:00Z`), type: 'general', level: 'state', offices: ['Governor'], description: null, pollsOpen: null, pollsClose: null, timezone: null, isActive: true } as any);
  const c1 = await mem.createCandidate({ name: 'Alice Example', party: 'Republican', electionId: e.id } as any);
  const c2 = await mem.createCandidate({ name: 'Bob Example', party: 'Democratic', electionId: e.id } as any);
  CID = [c1.id, c2.id];
  const app = express();
  app.use(express.json());
  registerResultsRoutes(app, {
    store: mem,
    isAuthenticated: (req: any, res, next) => { if (!admin) return res.status(401).json({ error: 'Authentication required' }); req.userId = 'admin-1'; next(); },
    requireAdmin: (_req, _res, next) => next(),
    adminIdentity: (req: any) => req.userId ?? null,
  });
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  const post = (id: number, body: unknown) => fetch(`${base}/api/elections/${id}/results`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...(body as object), schemaVersion: 1, electionId: id }) });
  const get = (path: string, headers: Record<string, string> = {}) => fetch(`${base}${path}`, { headers });
  const upload = (bytes: Buffer | string, type = 'text/html') => fetch(`${base}/api/admin/results-evidence`, { method: 'POST', headers: { 'content-type': type }, body: bytes });
  return { mem, e, e2, post, get, upload, close: () => new Promise<void>((r) => server.close(() => r())) };
}

describe('canonical input hash (lane C finding on #50)', () => {
  it('changes when any nested field changes and ignores key order', async () => {
    const { canonicalInputHash, stableStringify } = await import('../../server/results-reports');
    const base = { ...snapshot(), electionId: 1 };
    const h0 = canonicalInputHash(base);
    const variants: Array<[string, any]> = [
      ['candidate votes', { ...base, candidates: [{ ...base.candidates[0], votes: base.candidates[0].votes + 1 }, base.candidates[1]] }],
      ['candidate order', { ...base, candidates: [base.candidates[1], base.candidates[0]] }],
      ['source.id', { ...base, source: { ...base.source, id: 'other-source' } }],
      ['source.url', { ...base, source: { ...base.source, url: 'https://www.elections.alaska.gov/results/26GENR/other' } }],
      ['reporting.percent', { ...base, reporting: { ...base.reporting!, percent: 99 } }],
      ['asOf', { ...base, asOf: '2026-10-02T05:13:00Z' }],
      ['isWinner flag', { ...base, candidates: [{ ...base.candidates[0], isWinner: true }, base.candidates[1]] }],
      ['sourcePayloadSha256', { ...base, sourcePayloadSha256: 'b'.repeat(64) }],
    ];
    for (const [label, v] of variants) expect(canonicalInputHash(v), label).not.toBe(h0);
    // same content, different key order at nested levels -> same hash
    const reordered = { ...base, source: Object.fromEntries(Object.entries(base.source).reverse()), candidates: base.candidates.map((c) => Object.fromEntries(Object.entries(c).reverse())) } as any;
    expect(canonicalInputHash(reordered)).toBe(h0);
    // note / supersedesReportId are not part of the content identity
    expect(canonicalInputHash({ ...base, note: 'x', supersedesReportId: 7 })).toBe(h0);
    expect(stableStringify({ b: [3, { z: 1, y: 2 }], a: null })).toBe('{"a":null,"b":[3,{"y":2,"z":1}]}');
  });
});

describe('ET-6 results contract (v1.2)', () => {
  let h: Awaited<ReturnType<typeof harness>>;
  beforeEach(async () => { h = await harness(); });

  it('the schema refuses projections, missing evidence and pre-contract shapes', () => {
    const valid = { ...snapshot(), electionId: 1 };
    expect(resultReportInputSchema.safeParse(valid).success).toBe(true);
    expect(resultReportInputSchema.safeParse({ ...valid, isProjectedWinner: true } as any).success).toBe(false);
    expect(resultReportInputSchema.safeParse({ ...valid, status: 'projected' }).success).toBe(false);
    const cert = resultReportInputSchema.safeParse({ ...valid, status: 'certified' });
    expect(cert.success).toBe(false);
    if (!cert.success) expect(cert.error.issues.map((i) => i.path.join('.'))).toContain('certification');
    const declared = resultReportInputSchema.safeParse({ ...valid, candidates: [{ ...valid.candidates[0], isWinner: true }, valid.candidates[1]] });
    expect(declared.success).toBe(false); // declared winner without winnerCalledBy evidence
    expect(resultReportInputSchema.safeParse({ ...valid, asOf: null }).success).toBe(false); // asOf null needs not_provided
    expect(resultReportInputSchema.safeParse({ ...valid, asOf: null, asOfBasis: 'not_provided' }).success).toBe(true);
  });

  it('GET before any report is 200 status none with nulls, never an error', async () => {
    try {
      const res = await h.get(`/api/elections/${h.e.id}/results`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ schemaVersion: 1, electionId: h.e.id, status: 'none', reportId: null, source: null, asOf: null, retrievedAt: null, totalVotes: null, candidates: [], history: [], electionContext: null });
      expect(res.headers.get('etag')).toMatch(new RegExp(`^W/"${h.e.id}-none-[a-f0-9]{24}"$`));
      expect((await h.get('/api/elections/99999/results')).status).toBe(404);
      expect((await h.get(`/api/elections/${h.e.id}/live-results`)).status).toBe(200); // alias
    } finally { await h.close(); }
  });

  it('admin POST records a snapshot (201), replays idempotently (200), refuses conflicts (409) and bad input (422)', async () => {
    try {
      const body = { ...snapshot(), idempotencyKey: 'post-0001', expectedRevision: null };
      const first = await h.post(h.e.id, body);
      expect(first.status).toBe(201);
      const p = await first.json();
      expect(p.status).toBe('unofficial');
      expect(p.revision).toMatch(/^r1-[0-9a-f]{8}$/);
      expect(p.candidates.map((c: any) => c.votes)).toEqual([80000, 70000]);
      expect(p.candidates.every((c: any) => c.isWinner === false)).toBe(true);
      expect(p.electionContext).toEqual({ state: 'AK', electionDate: ELECTION_DAY, type: 'general', level: 'federal', office: 'U.S. Senate - Alaska' });
      expect(p.history).toEqual([]); // the current report is not repeated in its own history

      const replay = await h.post(h.e.id, body);
      expect(replay.status).toBe(200);
      expect((await replay.json()).reportId).toBe(p.reportId);

      const conflict = await h.post(h.e.id, { ...body, totalVotes: 150001 });
      expect(conflict.status).toBe(409);
      expect((await conflict.json()).code).toBe('idempotency_conflict');
      // same key, only a NESTED candidate count differs (lane C's case) -> still a conflict, never a silent replay
      const nested = await h.post(h.e.id, { ...body, candidates: [{ ...body.candidates[0], votes: body.candidates[0].votes + 1 }, body.candidates[1]] });
      expect(nested.status).toBe(409);
      expect((await nested.json()).code).toBe('idempotency_conflict');

      const stale = await h.post(h.e.id, { ...snapshot({ asOf: '2026-10-02T06:00:00Z', retrievedAt: '2026-10-02T06:01:00Z', sourcePayloadSha256: 'b'.repeat(64) }), idempotencyKey: 'post-0002', expectedRevision: 'r0-deadbeef' });
      expect(stale.status).toBe(409);
      expect((await stale.json()).code).toBe('stale_revision');

      const older = await h.post(h.e.id, { ...snapshot({ asOf: '2026-10-02T04:00:00Z', retrievedAt: '2026-10-02T04:01:00Z', sourcePayloadSha256: 'c'.repeat(64) }), idempotencyKey: 'post-0003', expectedRevision: null });
      expect(older.status).toBe(409);
      expect((await older.json()).code).toBe('older_than_latest');

      const pre = await h.post(h.e.id, { ...snapshot({ asOf: '2026-09-20T12:00:00Z', retrievedAt: '2026-09-20T12:01:00Z', sourcePayloadSha256: 'd'.repeat(64) }), idempotencyKey: 'post-0004', expectedRevision: null });
      expect(pre.status).toBe(422);
      expect((await pre.json()).code).toBe('pre_election_snapshot');

      const wrongRace = await h.post(h.e2.id, { ...snapshot({ sourcePayloadSha256: 'e'.repeat(64) }), idempotencyKey: 'post-0005', expectedRevision: null });
      expect(wrongRace.status).toBe(422); // candidate ids belong to e, not e2

      for (const url of ['', 'garbage', 'http://insecure.example', 'javascript:alert(1)']) {
        const g = await h.post(h.e.id, { ...snapshot({ source: { ...snapshot().source, url } }), idempotencyKey: 'post-garbage-url', expectedRevision: null });
        expect(g.status, url).toBe(422);
        expect((await g.json()).code).toBe('invalid_report');
      }
      const bad = await h.post(h.e.id, { ...snapshot(), idempotencyKey: 'post-0006', expectedRevision: null, status: 'none' });
      expect(bad.status).toBe(422);
      const badBody = await bad.json();
      expect(badBody.code).toBe('invalid_report');
      expect(badBody.details.some((d: any) => d.path === 'status')).toBe(true);
    } finally { await h.close(); }
  });

  it('a declared winner needs the official declaration; certified needs certification evidence', async () => {
    try {
      const ev = await (await h.upload('<html>certified results page</html>')).json();
      const res = await h.post(h.e.id, {
        ...snapshot({
          sourcePayloadSha256: ev.sha256,
          status: 'certified',
          reporting: { percent: 100, basis: 'precincts', precinctsReporting: 400, precinctsTotal: 400 },
          candidates: [{ ...snapshot().candidates[0], isWinner: true }, snapshot().candidates[1]],
          winnerCalledBy: { source: 'Alaska Division of Elections', url: 'https://www.elections.alaska.gov/results/26GENR/certified', at: '2026-10-05T18:00:00Z' },
          certification: { url: 'https://www.elections.alaska.gov/results/26GENR/certified', certifiedAt: '2026-10-05T18:00:00Z' },
          asOf: '2026-10-05T18:00:00Z', retrievedAt: '2026-10-05T18:05:00Z',
        }),
        idempotencyKey: 'post-cert', expectedRevision: null,
      });
      expect(res.status).toBe(201);
      const p = await res.json();
      expect(p.status).toBe('certified');
      expect(p.candidates.find((c: any) => c.candidateId === CID[0]).isWinner).toBe(true);
      expect(p.candidates.find((c: any) => c.candidateId === CID[1]).isWinner).toBe(false);
      expect(p.winnerCalledBy.url).toContain('certified');
    } finally { await h.close(); }
  });

  it('ETag/304 on the detail read; batch read lists every race on the date with explicit none rows and an opaque cursor', async () => {
    try {
      const posted = await h.post(h.e.id, { ...snapshot(), idempotencyKey: 'post-batch-0001', expectedRevision: null });
      expect(posted.status, JSON.stringify(await posted.clone().json())).toBe(201);
      const first = await h.get(`/api/elections/${h.e.id}/results`);
      const etag = first.headers.get('etag')!;
      expect((await h.get(`/api/elections/${h.e.id}/results`, { 'if-none-match': etag })).status).toBe(304);

      const batch = await h.get(`/api/results?date=${ELECTION_DAY}`);
      expect(batch.status).toBe(200);
      const b = await batch.json();
      expect(b).toMatchObject({ schemaVersion: 1, date: ELECTION_DAY, reset: true });
      expect(b.results.map((r: any) => [r.electionId, r.status])).toEqual([[h.e.id, 'unofficial'], [h.e2.id, 'none']]);
      expect(b.results[0].history).toEqual([]); // batch rows carry the key, empty (shared batch schema)
      expect(typeof b.cursor).toBe('string');
      expect((await h.get(`/api/results?date=${ELECTION_DAY}&cursor=${b.cursor}`)).status).toBe(304);
      expect((await h.get(`/api/results?date=${ELECTION_DAY}`, { 'if-none-match': batch.headers.get('etag')! })).status).toBe(304);
      expect((await h.get(`/api/results?date=${ELECTION_DAY}&cursor=stale`)).status).toBe(200);
      expect((await h.get(`/api/results?ids=${h.e2.id}`)).status).toBe(200);
      expect((await h.get('/api/results')).status).toBe(400);
      expect((await h.get(`/api/results?date=${ELECTION_DAY}&ids=1`)).status).toBe(400);
    } finally { await h.close(); }
  });

  it('a report recorded under a context the election row no longer has is never current (admin date edit acceptance)', async () => {
    try {
      const posted = await h.post(h.e.id, { ...snapshot(), idempotencyKey: 'post-context-0001', expectedRevision: null });
      expect(posted.status, JSON.stringify(await posted.clone().json())).toBe(201);
      expect((await (await h.get(`/api/elections/${h.e.id}/results`)).json()).status).toBe('unofficial');
      // Admin moves the election date (same id, FK intact). The old votes must not move with it.
      (h.mem as any).elections.get(h.e.id).date = new Date('2026-10-06T00:00:00Z'); // MemStorage has no election update; the DB path is proven live
      const after = await (await h.get(`/api/elections/${h.e.id}/results`)).json();
      expect(after.status).toBe('none');
      expect(after.electionContext).toBeNull();
      expect(after.history).toHaveLength(1);
      expect(after.history[0].contextMatch).toBe(false);
      const batchOld = await (await h.get(`/api/results?date=${ELECTION_DAY}`)).json();
      expect(batchOld.results.map((r: any) => r.electionId)).not.toContain(h.e.id);
      const batchNew = await (await h.get('/api/results?date=2026-10-06')).json();
      expect(batchNew.results).toEqual([expect.objectContaining({ electionId: h.e.id, status: 'none' })]);
    } finally { await h.close(); }
  });

  it('unauthenticated POST is refused and writes nothing', async () => {
    await h.close();
    const anon = await harness(false);
    try {
      const res = await anon.post(anon.e.id, { ...snapshot(), idempotencyKey: 'anon', expectedRevision: null });
      expect(res.status).toBe(401);
      expect((await (await anon.get(`/api/elections/${anon.e.id}/results`)).json()).status).toBe('none');
    } finally { await anon.close(); }
  });

  it('sources are registered: unknown ids are refused, the picker lists the manifest + admin_manual, manual entries need retained evidence', async () => {
    try {
      const picker = await (await h.get('/api/results/sources?state=AK')).json();
      expect(picker.sources.map((x: any) => [x.id, x.kind])).toEqual([['admin_manual:AK', 'admin_manual'], ['ak-doe', 'official_state_enr']]);
      expect(picker.sources.find((x: any) => x.id === 'ak-doe').electionIds).toEqual([h.e.id]);
      expect((await h.get('/api/results/sources?state=alaska')).status).toBe(400);

      const unknown = await h.post(h.e.id, { ...snapshot({ source: { ...snapshot().source, id: 'random-blog' } }), idempotencyKey: 'post-unknown-src', expectedRevision: null });
      expect(unknown.status).toBe(422);
      expect((await unknown.json()).code).toBe('unknown_source');

      const manualNoEvidence = await h.post(h.e.id, { ...snapshot({ source: { id: 'admin_manual:AK', kind: 'admin_manual', name: 'Alaska Division of Elections', url: 'https://www.elections.alaska.gov/results/26GENR/summary', sourceContestId: 'US-SEN' }, sourcePayloadSha256: 'f'.repeat(64) }), idempotencyKey: 'post-manual-noev', expectedRevision: null });
      expect(manualNoEvidence.status).toBe(422);
      expect((await manualNoEvidence.json()).code).toBe('evidence_missing');

      const wrongHost = await h.post(h.e.id, { ...snapshot({ source: { id: 'admin_manual:AK', kind: 'admin_manual', name: 'x', url: 'https://example.com/page', sourceContestId: 'US-SEN' } }), idempotencyKey: 'post-manual-host', expectedRevision: null });
      expect(wrongHost.status).toBe(422);
      expect((await wrongHost.json()).code).toBe('unknown_source');

      const up = await h.upload('<html>official page as saved by the admin</html>');
      expect(up.status).toBe(201);
      const ev = await up.json();
      expect(ev.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect((await h.upload('<html>official page as saved by the admin</html>')).status).toBe(200); // same bytes
      expect((await h.upload('x', 'application/zip')).status).toBe(415);
      const manual = await h.post(h.e.id, { ...snapshot({ source: { id: 'admin_manual:AK', kind: 'admin_manual', name: 'Alaska Division of Elections', url: 'https://www.elections.alaska.gov/results/26GENR/summary', sourceContestId: 'US-SEN' }, sourcePayloadSha256: ev.sha256 }), idempotencyKey: 'post-manual-ok', expectedRevision: null });
      expect(manual.status, JSON.stringify(await manual.clone().json())).toBe(201);
      expect((await manual.json()).source.kind).toBe('admin_manual');

      // NC-style shared raw id: the same qualified contest key may never bind a second election.
      expect((await h.post(h.e.id, { ...snapshot(), idempotencyKey: 'post-enr-first', expectedRevision: null })).status).toBe(201);
      (h.mem as any).elections.get(h.e2.id).officialResultsSource = (h.mem as any).elections.get(h.e.id).officialResultsSource;
      const crossBind = await h.post(h.e2.id, { ...snapshot({ sourcePayloadSha256: 'e'.repeat(64), candidates: [{ candidateId: null, sourceCandidateId: 'x1', name: 'Other Person', party: null, votes: 10, percent: null, isWinner: false }] }), idempotencyKey: 'post-crossbind', expectedRevision: null });
      expect(crossBind.status).toBe(422);
      expect((await crossBind.json()).code).toBe('contest_key_conflict');
    } finally { await h.close(); }
  });

  it('two different recordings from one raw payload are both kept (WA recount workbook case)', async () => {
    try {
      const first = await h.post(h.e.id, { ...snapshot(), idempotencyKey: 'post-wa-before', expectedRevision: null });
      expect(first.status).toBe(201);
      const after = await h.post(h.e.id, { ...snapshot({ asOf: '2026-10-02T09:00:00Z', retrievedAt: '2026-10-02T09:01:00Z', totalVotes: 150010, candidates: [{ ...snapshot().candidates[0], votes: 80010 }, snapshot().candidates[1]] }), idempotencyKey: 'post-wa-after', expectedRevision: null });
      expect(after.status, JSON.stringify(await after.clone().json())).toBe(201); // same sourcePayloadSha256, different content -> a second report
      const p = await after.json();
      expect(p.history).toHaveLength(1); // earlier reports only: the first snapshot
      expect(p.history[0].reportId).toBe((await first.json()).reportId);
      expect(p.history[0].contextMatch).toBe(true);
      expect(p.totalVotes).toBe(150010);
    } finally { await h.close(); }
  });
});
