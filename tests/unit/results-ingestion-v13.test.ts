import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';

// ---- storage double: elections + the writer, recorded so each test can inspect what was written ----
const manifest = (status: string, publisher: string, routeVerification: 'worked' | 'blocked' = 'worked') => ({
  publisher, routeType: 'election_specific_results', governmentUrl: 'https://results.enr.clarityelections.com/NC/', routeVerification, status,
});
const elections: any[] = [];
const recorded: any[] = [];
vi.mock('../../server/storage', () => ({
  storage: {
    getElections: vi.fn(async () => elections),
    recordResultReport: vi.fn(async (electionId: number, input: any) => {
      recorded.push({ electionId, input });
      return { created: true, payload: { reportId: recorded.length, revision: `r${recorded.length}-abcdef12` } };
    }),
  },
}));

import { ResultsIngestionService, type AdapterElection, type AdapterContext } from '../../server/results-ingestion-service';
import { resultsSourceRegistry, ResultsSourceRegistry } from '../../server/results-source-registry';
import { MemResultReportStore, evidenceSignatureProblem, EVIDENCE_CONTENT_TYPES } from '../../server/results-store';
import { registerResultsRoutes } from '../../server/results-routes';

const SHA = (c: string) => c.repeat(64);
function snapshot(electionId: number, sourceId: string, over: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1, electionId, status: 'unofficial',
    reporting: { percent: 50, basis: 'precincts', precinctsReporting: 1, precinctsTotal: 2 },
    source: { id: sourceId, kind: 'official_state_enr', name: 'NC SBE', url: 'https://results.enr.clarityelections.com/NC/US-SEN', sourceContestId: 'US-SEN' },
    sourcePayloadSha256: SHA('a'), asOf: '2024-03-06T03:00:00Z', asOfBasis: 'source_timestamp', retrievedAt: '2024-03-06T03:01:00Z', totalVotes: 10,
    candidates: [{ candidateId: null, sourceCandidateId: 'c1', name: 'A', party: 'D', votes: 10, percent: 100, isWinner: false }],
    winnerCalledBy: null, certification: null, note: null, supersedesReportId: null, ...over,
  };
}
const ncPrimary = { id: 11, title: 'US Senate - NC (2024 primary replay)', state: 'NC', date: new Date('2024-03-05T05:00:00Z'), type: 'primary', level: 'federal', officialResultsUrl: null, officialResultsSource: null };
const akGeneral = { id: 2, title: 'U.S. Senate Election - Alaska', state: 'AK', date: new Date('2026-11-03T06:00:00Z'), type: 'general', level: 'federal', officialResultsUrl: null, officialResultsSource: manifest('unknown', 'ak-doe') };
const blocked = { id: 3, title: 'Governor - OH', state: 'OH', date: new Date('2026-11-03T05:00:00Z'), type: 'general', level: 'state', officialResultsUrl: null, officialResultsSource: manifest('not_linked', 'oh-sos', 'blocked') };
const noSource = { id: 4, title: 'Mayor - Nowhere', state: 'OH', date: new Date('2026-11-03T05:00:00Z'), type: 'general', level: 'local', officialResultsUrl: null, officialResultsSource: null };

beforeEach(() => { elections.length = 0; recorded.length = 0; resultsSourceRegistry.clear(); });

describe('v1.3 delta 1: source registry is independent of the C6 manifest', () => {
  it('registers exact tuples, refuses unusable entries, and admits by election id or state+day+phase with real historical dates', () => {
    const reg = new ResultsSourceRegistry();
    expect(() => reg.register({ id: 'x', kind: 'official_state_enr', name: 'x', state: 'NC', allowedUrls: ['http://insecure'], electionDate: '2024-03-05' })).toThrow(/https/);
    expect(() => reg.register({ id: 'x', kind: 'official_state_enr', name: 'x', state: 'NC', allowedHosts: ['a.b'] })).toThrow(/electionDate or electionIds/);
    expect(() => reg.register({ id: 'admin_manual:NC', kind: 'official_state_enr', name: 'x', state: 'NC', allowedHosts: ['a.b'], electionDate: '2024-03-05' })).toThrow(/reserved/);
    reg.register({ id: 'nc-sbe-2024p', kind: 'official_state_enr', name: 'NC SBE', state: 'NC', allowedHosts: ['results.enr.clarityelections.com'], electionDate: '2024-03-05', phase: 'primary', role: 'statewide' });
    reg.register({ id: 'wa-sos-2024p', kind: 'official_state_page', name: 'WA SOS', state: 'WA', allowedUrls: ['https://www.sos.wa.gov/x.xlsx'], electionIds: [77] });
    expect(reg.admittedFor({ id: 11, state: 'NC', date: '2024-03-05T05:00:00Z', type: 'primary' }).map((s) => s.id)).toEqual(['nc-sbe-2024p']);
    expect(reg.admittedFor({ id: 11, state: 'NC', date: '2026-11-03T05:00:00Z', type: 'general' })).toEqual([]); // never relabelled to Nov 2026
    expect(reg.admittedFor({ id: 11, state: 'NC', date: '2024-03-05T05:00:00Z', type: 'general' })).toEqual([]); // phase bound
    expect(reg.admittedFor({ id: 77, state: 'WA', date: '2024-08-06T07:00:00Z', type: 'primary' }).map((s) => s.id)).toEqual(['wa-sos-2024p']);
    expect(reg.mismatch({ id: 'nc-sbe-2024p', kind: 'official_state_page', url: 'https://results.enr.clarityelections.com/NC/x' })).toMatch(/kind/);
    expect(reg.mismatch({ id: 'nc-sbe-2024p', kind: 'official_state_enr', url: 'https://evil.example/NC/x' })).toMatch(/not an allowed/);
    expect(reg.mismatch({ id: 'nc-sbe-2024p', kind: 'official_state_enr', url: 'https://results.enr.clarityelections.com/NC/x' })).toBeNull();
    expect(reg.mismatch({ id: 'nobody', kind: 'official_state_enr', url: 'https://a.b/' })).toBe('not_registered');
  });

  it('the picker lists registered sources without claiming publication; manifest rows keep their flag', async () => {
    resultsSourceRegistry.register({ id: 'nc-sbe-2024p', kind: 'official_state_enr', name: 'NC SBE', state: 'NC', allowedHosts: ['results.enr.clarityelections.com'], electionDate: '2024-03-05', electionIds: [11] });
    const store = new MemResultReportStore(() => true, () => true, () => [], () => null, () => null, () => [{ election_id: 2, state: 'AK', publisher: 'ak-doe', route_type: 'election_specific_results', government_url: 'https://www.elections.alaska.gov/results/', status: 'published' }]);
    const all = await store.listResultSources();
    expect(all.find((s) => s.id === 'nc-sbe-2024p')).toMatchObject({ registeredBy: 'registry', published: false, electionIds: [11], url: null });
    expect(all.find((s) => s.id === 'ak-doe')).toMatchObject({ registeredBy: 'manifest', published: true });
    expect(all.find((s) => s.id === 'admin_manual:NC')).toMatchObject({ kind: 'admin_manual', url: null, published: false });
  });
});

describe('v1.3 delta 4: the writer refuses kind/URL tampering against the registration', () => {
  const mem = () => new MemResultReportStore(() => true, () => true, () => [], () => new Date('2024-03-05T05:00:00Z'), () => ({ state: 'NC', electionDate: '2024-03-05', type: 'primary', level: 'federal', office: 'US Senate' }), () => []);
  beforeEach(() => resultsSourceRegistry.register({ id: 'nc-sbe-2024p', kind: 'official_state_enr', name: 'NC SBE', state: 'NC', allowedHosts: ['results.enr.clarityelections.com'], electionDate: '2024-03-05', electionIds: [11] }));
  it('accepts the registered kind on an allowed host, refuses a relabelled kind and a foreign URL with 422 source_mismatch', async () => {
    const ok = await mem().recordResultReport(11, snapshot(11, 'nc-sbe-2024p') as any, { postedBy: 'ingest:nc-sbe-2024p', idempotencyKey: null });
    expect(ok.created).toBe(true);
    await expect(mem().recordResultReport(11, snapshot(11, 'nc-sbe-2024p', { source: { ...snapshot(11, 'nc-sbe-2024p').source, kind: 'official_state_page' } }) as any, { postedBy: 'x', idempotencyKey: null }))
      .rejects.toMatchObject({ status: 422, publicCode: 'source_mismatch' });
    await expect(mem().recordResultReport(11, snapshot(11, 'nc-sbe-2024p', { source: { ...snapshot(11, 'nc-sbe-2024p').source, url: 'https://evil.example/NC/US-SEN' } }) as any, { postedBy: 'x', idempotencyKey: null }))
      .rejects.toMatchObject({ status: 422, publicCode: 'source_mismatch' });
    await expect(mem().recordResultReport(11, snapshot(11, 'unknown-src') as any, { postedBy: 'x', idempotencyKey: null }))
      .rejects.toMatchObject({ status: 422, publicCode: 'unknown_source' });
  });
});

describe('v1.3 deltas 2/5/6: admitted polling, foreign refusal, lifetime', () => {
  it('polls an admitted source before publication (null → not_published, status never manufactured); blocked route → not_admitted; no manifest+no registry → silent manual-only', async () => {
    elections.push(ncPrimary, akGeneral, blocked, noSource);
    resultsSourceRegistry.register({ id: 'nc-sbe-2024p', kind: 'official_state_enr', name: 'NC SBE', state: 'NC', allowedHosts: ['results.enr.clarityelections.com'], electionDate: '2024-03-05', phase: 'primary' });
    const svc = new ResultsIngestionService();
    const seen: Array<[number, AdapterContext['source']]> = [];
    svc.registerAdapter('nc-sbe-2024p', async (e: AdapterElection, ctx: AdapterContext) => { seen.push([e.id, ctx.source]); return null; });
    svc.registerAdapter('ak-doe', async (e, ctx) => { seen.push([e.id, ctx.source]); return null; });
    const out = await svc.ingestResults();
    expect(out).toEqual([
      { electionId: 11, outcome: 'not_published', sourceId: 'nc-sbe-2024p', publication: 'none' },
      { electionId: 2, outcome: 'not_published', sourceId: 'ak-doe', publication: 'unknown' },
      { electionId: 3, outcome: 'not_admitted', reason: 'route_blocked', sourceId: 'oh-sos' },
    ]);
    expect(seen.map(([id, s]) => [id, s.via, s.publication])).toEqual([[11, 'registry', 'none'], [2, 'manifest', 'unknown']]);
    expect(recorded).toEqual([]);
    const cov = await svc.coverage();
    expect(cov.counts).toEqual({ total: 4, automatic: 2, manualOnly: 2 });
    expect(cov.races.map((r) => [r.electionId, r.mode, r.reason, r.manifestStatus, r.admittedVia])).toEqual([
      [11, 'automatic', 'adapter_registered', 'none', 'registry'],
      [2, 'automatic', 'adapter_registered', 'unknown', 'manifest'],
      [3, 'manual_only', 'route_blocked', 'not_linked', null],
      [4, 'manual_only', 'no_source', 'none', null],
    ]);
  });

  it('refuses adapter output that names another race or another source instead of overwriting the ids', async () => {
    elections.push(ncPrimary);
    resultsSourceRegistry.register({ id: 'nc-sbe-2024p', kind: 'official_state_enr', name: 'NC SBE', state: 'NC', allowedHosts: ['results.enr.clarityelections.com'], electionIds: [11] });
    const svc = new ResultsIngestionService();
    svc.registerAdapter('nc-sbe-2024p', async () => snapshot(99, 'nc-sbe-2024p') as any);
    expect((await svc.ingestResults())[0]).toMatchObject({ outcome: 'refused', code: 'foreign_election' });
    svc.registerAdapter('nc-sbe-2024p', async () => snapshot(11, 'other-src') as any);
    expect((await svc.ingestResults())[0]).toMatchObject({ outcome: 'refused', code: 'foreign_source' });
    svc.registerAdapter('nc-sbe-2024p', async () => snapshot(11, 'nc-sbe-2024p') as any);
    expect((await svc.ingestResults())[0]).toMatchObject({ outcome: 'recorded', sourceId: 'nc-sbe-2024p', reportId: 1 });
    expect(recorded).toHaveLength(1);
    expect(recorded[0].electionId).toBe(11);
  });

  it('never overlaps cycles, passes an AbortSignal, aborts on stopPolling, and reports a timed-out adapter as failed (not none)', async () => {
    elections.push(ncPrimary);
    resultsSourceRegistry.register({ id: 'nc-sbe-2024p', kind: 'official_state_enr', name: 'NC SBE', state: 'NC', allowedHosts: ['results.enr.clarityelections.com'], electionIds: [11] });
    const svc = new ResultsIngestionService();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let adapterStarted!: () => void;
    const started = new Promise<void>((r) => { adapterStarted = r; });
    svc.registerAdapter('nc-sbe-2024p', (_e, ctx) => new Promise((_resolve, reject) => {
      adapterStarted();
      ctx.signal.addEventListener('abort', () => reject(Object.assign(new Error('fetch aborted'), { name: 'AbortError' })));
      gate.then(() => reject(new Error('source timeout after 5000 ms')));
    }));
    const first = svc.ingestResults();
    const second = svc.ingestResults(); // lands while the first is in flight
    expect(svc.getStatus()).toMatchObject({ cycleInFlight: true, overlapSkipped: 1 });
    await started; // the adapter's fetch is in progress when the stop arrives
    await svc.stopPolling(); // aborts the adapter
    const out = await first;
    expect(await second).toBe(out); // the skipped tick observed the in-flight cycle, it did not start another
    expect(out[0]).toMatchObject({ outcome: 'failed', aborted: true, sourceId: 'nc-sbe-2024p' });
    expect(svc.getStatus().cycleInFlight).toBe(false);
    release();
    // a plain timeout without abort is 'failed' too
    svc.registerAdapter('nc-sbe-2024p', async () => { throw new Error('source timeout after 5000 ms'); });
    expect((await svc.ingestResults())[0]).toMatchObject({ outcome: 'failed', aborted: false, message: /timeout/ });
    expect(recorded).toEqual([]);
  });
});

describe('v1.3 delta 3: XLSX evidence is retained under its own type with a signature check', () => {
  const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const workbook = Buffer.concat([Buffer.from('PK\u0003\u0004', 'latin1'), Buffer.from('\u0000'.repeat(26) + '[Content_Types].xml' + 'PK\u0003\u0004' + '\u0000'.repeat(26) + 'xl/workbook.xml<x/>', 'latin1')]);
  it('signature rules: XLSX must be an OOXML zip; PDF must start with %PDF-; a workbook cannot pass as a PDF', () => {
    expect((EVIDENCE_CONTENT_TYPES as readonly string[]).includes(XLSX)).toBe(true);
    expect(evidenceSignatureProblem(XLSX, workbook)).toBeNull();
    expect(evidenceSignatureProblem(XLSX, Buffer.from('%PDF-1.7 not a zip'))).toMatch(/ZIP/);
    expect(evidenceSignatureProblem(XLSX, Buffer.concat([Buffer.from('PK\u0003\u0004', 'latin1'), Buffer.alloc(40)]))).toMatch(/OOXML/);
    expect(evidenceSignatureProblem('application/pdf', workbook)).toMatch(/%PDF-/);
    expect(evidenceSignatureProblem('application/pdf', Buffer.from('%PDF-1.4\n%x'))).toBeNull();
    expect(evidenceSignatureProblem('application/json', Buffer.from('{}'))).toBeNull();
  });

  it('over real HTTP: a workbook is retained as XLSX (201 + sha256 of the raw bytes); a workbook labelled PDF is 400 evidence_signature_mismatch', async () => {
    const store = new MemResultReportStore(() => true, () => true);
    const app = express();
    registerResultsRoutes(app, { store, isAuthenticated: (_r: any, _s: any, n: any) => n(), requireAdmin: (_r: any, _s: any, n: any) => n(), adminIdentity: () => 'tester' } as any);
    const server = createServer(app);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      const ok = await fetch(`${base}/api/admin/results-evidence`, { method: 'POST', headers: { 'content-type': XLSX, 'x-evidence-filename': 'TotalsforWeb.xlsx' }, body: workbook });
      expect(ok.status).toBe(201);
      const body = await ok.json();
      const { createHash } = await import('node:crypto');
      expect(body).toMatchObject({ sha256: createHash('sha256').update(workbook).digest('hex'), size: workbook.length, contentType: XLSX });
      const bad = await fetch(`${base}/api/admin/results-evidence`, { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: workbook });
      expect(bad.status).toBe(400);
      expect((await bad.json()).code).toBe('evidence_signature_mismatch');
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
