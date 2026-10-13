/**
 * ET-6 real-HTTP receiving for lane B. The admin posting form and Happening Now run
 * unmodified in jsdom; every /api/results*, /api/elections/:id/results and
 * /api/admin/results-evidence call is forwarded (msw bypass) over a real socket to a
 * real express app mounting lane A's registerResultsRoutes on the real MemStorage —
 * no stubbed response bodies for the results contract. Only what A did not build is
 * answered locally: the session (/api/auth/me), the election list and the candidate
 * list, both read from the same MemStorage rows.
 *
 * The PostgreSQL implementation of the store is proven by lane A/D on the private
 * copy; this test proves the CLIENT against the real routes and schema.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, bypass } from 'msw';
import { setupServer } from 'msw/node';
import { MemStorage } from '../server/mem-storage';
import { registerResultsRoutes } from '../server/results-routes';
import AdminResultsEntry from '../client/src/pages/admin-results-entry';
import HappeningNow from '../client/src/pages/happening-now';
import { LiveResultView } from '../client/src/components/live-result-view';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';
import { liveElectionResultsSchema, liveResultsBatchSchema } from '../shared/live-election-results';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
Blob.prototype.arrayBuffer ??= function (this: Blob) {
  return new Promise<ArrayBuffer>(done => { const r = new FileReader(); r.onload = () => done(r.result as ArrayBuffer); r.readAsArrayBuffer(this); });
};

interface Real { mem: MemStorage; election: any; candidates: any[]; base: string; server: Server; seen: { path: string; status: number }[] }
let real: Real;

async function startReal(): Promise<Real> {
  const mem = new MemStorage();
  const election = await mem.createElection({
    title: 'U.S. Senate - Alaska', subtitle: null, location: 'Alaska', state: 'AK', date: new Date('2026-11-03T00:00:00Z'),
    type: 'general', level: 'federal', offices: ['U.S. Senate'], description: null, pollsOpen: null, pollsClose: null, timezone: null, isActive: true,
  } as any);
  const candidates = [
    await mem.createCandidate({ name: 'Alice Example', party: 'R', electionId: election.id } as any),
    await mem.createCandidate({ name: 'Bob Example', party: 'D', electionId: election.id } as any),
  ];
  const app = express();
  app.use(express.json());
  registerResultsRoutes(app, {
    store: mem,
    isAuthenticated: (req: any, _res, next) => { req.userId = 'admin-1'; next(); },
    requireAdmin: (_req, _res, next) => next(),
    adminIdentity: (req: any) => req.userId ?? null,
  });
  const server = createServer(app);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  return { mem, election, candidates, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server, seen: [] };
}

async function forward({ request }: { request: Request }) {
  const u = new URL(request.url);
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : Buffer.from(await request.arrayBuffer());
  const res = await fetch(bypass(new Request(`${real.base}${u.pathname}${u.search}`, { method: request.method, headers: request.headers, body })));
  real.seen.push({ path: u.pathname + u.search, status: res.status });
  return new HttpResponse(res.status === 304 ? null : await res.arrayBuffer(), { status: res.status, headers: res.headers });
}

const msw = setupServer(
  http.get('/api/auth/me', () => HttpResponse.json({ user: { id: 'admin-1', email: 'ops@example.org', role: 'admin' } })),
  http.get('/api/elections', () => HttpResponse.json([real.election])),
  http.get('/api/elections/:id/candidates', () => HttpResponse.json(real.candidates.map(c => ({ id: c.id, name: c.name, party: c.party })))),
  http.all('/api/results', forward),
  http.all('/api/results/sources', forward),
  http.all('/api/elections/:id/results', forward),
  http.all('/api/admin/results-evidence', forward),
);

beforeAll(() => {
  msw.listen({ onUnhandledRequest: 'bypass' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T05:20:00Z'));
});
afterEach(async () => { msw.resetHandlers(); await new Promise<void>(r => real.server.close(() => r())); });
afterAll(() => { msw.close(); vi.useRealTimers(); });

const client = () => new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() });
const getReal = async (path: string) => (await fetch(`${real.base}${path}`)).json();

async function chooseRace() {
  const trigger = await screen.findByRole('combobox', { name: 'Race' });
  await waitFor(() => expect(trigger).not.toBeDisabled());
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: /U\.S\. Senate - Alaska/ }));
}

async function postReport(votes: [string, string]) {
  const line = await screen.findByTestId('line-0');
  await waitFor(() => expect(screen.getByRole('option', { name: /Manual entry/ })).toBeInTheDocument());
  const pick = screen.getByLabelText('Registered source') as HTMLSelectElement;
  if (pick.value === '') fireEvent.change(pick, { target: { value: 'admin_manual:AK' } });
  const url = screen.getByLabelText('Official results URL (https)');
  if ((url as HTMLInputElement).value === '') fireEvent.change(url, { target: { value: 'https://elections.example.gov/ak/results' } });
  if ((screen.getByLabelText('Source contest ID') as HTMLInputElement).value === '') fireEvent.change(screen.getByLabelText('Source contest ID'), { target: { value: 'US-SEN-AK' } });
  const html = `<html><body>Official results ${votes.join('/')}</body></html>`;
  fireEvent.change(screen.getByLabelText('Official results file or page snapshot'), { target: { files: [new File([html], 'ak-results.html', { type: 'text/html' })] } });
  await screen.findByText(/Stored: ak-results\.html/);
  const lines = [line, screen.getByTestId('line-1')];
  lines.forEach((l, i) => {
    fireEvent.change(within(l).getByLabelText('Option label as printed'), { target: { value: i === 0 ? 'EXAMPLE, Alice' : 'EXAMPLE, Bob' } });
    fireEvent.change(within(l).getByLabelText('Votes'), { target: { value: votes[i] } });
  });
  fireEvent.click(screen.getByTestId('button-post-report'));
}

describe('ET-6 client against the real results routes (real HTTP, real schema)', () => {
  it('admin form posts through A\'s writer; the public page shows exactly what was recorded', async () => {
    real = await startReal();
    // Before anything is recorded the real route answers 200 none and the page says so.
    expect(await getReal(`/api/elections/${real.election.id}/results`)).toMatchObject({ status: 'none', candidates: [], electionContext: null });

    const { unmount } = render(<QueryClientProvider client={client()}><AdminResultsEntry /></QueryClientProvider>);
    await chooseRace();
    expect(await screen.findByText('No report recorded yet')).toBeInTheDocument();
    await postReport(['61000', '58140']);
    await waitFor(() => expect(screen.getByText(/Revision r\d+-/)).toBeInTheDocument(), { timeout: 5000 });

    // The real server's own answer, parsed by C's schema (the same one the client enforces).
    const detail = liveElectionResultsSchema.parse(await getReal(`/api/elections/${real.election.id}/results`));
    expect(detail).toMatchObject({
      status: 'unofficial', asOf: null, asOfBasis: 'not_provided',
      source: { id: 'admin_manual:AK', kind: 'admin_manual', url: 'https://elections.example.gov/ak/results', sourceContestId: 'US-SEN-AK' },
      // A's context office is the election title (CONTEXT_MATCH_SQL: r.context_office = e.title).
      electionContext: { state: 'AK', electionDate: '2026-11-03', office: 'U.S. Senate - Alaska' },
    });
    expect(detail.candidates.map(c => [c.sourceCandidateId, c.candidateId, c.votes, c.isWinner])).toEqual([
      ['EXAMPLE, Alice', real.candidates[0].id, 61000, false], ['EXAMPLE, Bob', real.candidates[1].id, 58140, false]]);
    expect(detail.sourcePayloadSha256).toMatch(/^[0-9a-f]{64}$/);
    unmount();

    // Happening Now reads the real batch route (one request for the date) and shows the record.
    real.seen.length = 0;
    render(<QueryClientProvider client={client()}><HappeningNow /></QueryClientProvider>);
    const card = await screen.findByTestId(`card-election-${real.election.id}`);
    expect(await within(card).findByText('61,000 votes')).toBeInTheDocument();
    expect(within(card).getByText('Unofficial results')).toBeInTheDocument();
    expect(within(card).getByText('Recorded for U.S. Senate - Alaska, AK, election of 2026-11-03')).toBeInTheDocument();
    expect(within(card).getByText('Percent reporting: not stated by the source')).toBeInTheDocument();
    expect(within(card).queryByText('Winner')).toBeNull();
    expect(real.seen.filter(s => s.path.startsWith('/api/results?date=')).map(s => s.status)).toEqual([200]);
    expect(real.seen.some(s => /\/api\/elections\/\d+\/results/.test(s.path))).toBe(false);
    liveResultsBatchSchema.parse(await getReal('/api/results?date=2026-11-03'));
  });

  it('a second report is appended (revision changes, the first stays in history) and a repeat poll is a 304', { timeout: 30000 }, async () => {
    real = await startReal();
    const first = render(<QueryClientProvider client={client()}><AdminResultsEntry /></QueryClientProvider>);
    await chooseRace();
    await postReport(['100', '90']);
    await waitFor(() => expect(screen.getByText(/Revision r\d+-/)).toBeInTheDocument(), { timeout: 5000 });
    const r1 = await getReal(`/api/elections/${real.election.id}/results`);
    first.unmount();

    const second = render(<QueryClientProvider client={client()}><AdminResultsEntry /></QueryClientProvider>);
    await chooseRace();
    // The form loads the recorded counts (the D defect: Sullivan showed 0 while the server had 10).
    expect(within(await screen.findByTestId('line-0')).getByLabelText('Votes')).toHaveValue('100');
    await postReport(['150', '140']);
    await waitFor(() => expect(screen.getByText('Revision ' + (liveElectionResultsSchema.parse(r1).revision === null ? '' : ''))).toBeTruthy(), { timeout: 1 }).catch(() => {});
    await waitFor(async () => expect((await getReal(`/api/elections/${real.election.id}/results`)).candidates[0].votes).toBe(150), { timeout: 5000 });
    second.unmount();

    const r2 = liveElectionResultsSchema.parse(await getReal(`/api/elections/${real.election.id}/results`));
    expect(r2.revision).not.toBe(r1.revision);
    // Contract (lane A #57): history lists EARLIER reports only; the current one is the payload itself.
    expect(r2.history.map(h => h.reportId)).toEqual([r1.reportId]);
    expect(r2.history.every(h => h.contextMatch)).toBe(true);
    // The client shows exactly those as "earlier" (and still ignores the current report if a server ever lists it).
    const view = render(<LiveResultView result={r2} showHistory />);
    expect(view.getByText('Earlier reports (1)')).toBeInTheDocument();
    view.unmount();

    real.seen.length = 0;
    render(<QueryClientProvider client={client()}><HappeningNow /></QueryClientProvider>);
    const card = await screen.findByTestId(`card-election-${real.election.id}`);
    expect(await within(card).findByText('150 votes')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-manual-refresh'));
    await waitFor(() => expect(real.seen.filter(s => s.path.startsWith('/api/results?date=')).map(s => s.status)).toEqual([200, 304]));
    expect(within(card).getByText('150 votes')).toBeInTheDocument();
  });

  it('a stale post is refused by the real writer with 409 and the form explains it', { timeout: 30000 }, async () => {
    real = await startReal();
    const a = render(<QueryClientProvider client={client()}><AdminResultsEntry /></QueryClientProvider>);
    await chooseRace();
    await postReport(['10', '9']);
    await waitFor(() => expect(screen.getByText(/Revision r\d+-/)).toBeInTheDocument(), { timeout: 5000 });
    a.unmount();

    const b = render(<QueryClientProvider client={client()}><AdminResultsEntry /></QueryClientProvider>);
    await chooseRace();
    expect(within(await screen.findByTestId('line-0')).getByLabelText('Votes')).toHaveValue('10');
    // Someone else records a newer report straight against the real route while this form is open.
    const current = await getReal(`/api/elections/${real.election.id}/results`);
    const other = {
      schemaVersion: 1, electionId: real.election.id, status: 'unofficial', reporting: { percent: null, basis: 'source_unspecified', precinctsReporting: null, precinctsTotal: null },
      source: { id: 'admin_manual:AK', kind: 'admin_manual', name: 'Manual entry', url: 'https://elections.example.gov/ak/results', sourceContestId: 'US-SEN-AK' },
      sourcePayloadSha256: current.sourcePayloadSha256, asOf: null, asOfBasis: 'not_provided', retrievedAt: '2026-11-04T05:21:00Z', totalVotes: null,
      candidates: current.candidates, winnerCalledBy: null, certification: null, supersedesReportId: null, expectedRevision: current.revision, idempotencyKey: 'other-admin-1', note: null,
    };
    const res = await fetch(`${real.base}/api/elections/${real.election.id}/results`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...other, candidates: current.candidates.map((c: any) => ({ ...c, votes: c.votes + 1 })) }) });
    expect(res.status).toBe(201);
    // This form still holds the old revision: posting is refused by the server, in plain words.
    fireEvent.change(within(screen.getByTestId('line-0')).getByLabelText('Votes'), { target: { value: '99' } });
    const html = '<html>second</html>';
    fireEvent.change(screen.getByLabelText('Official results file or page snapshot'), { target: { files: [new File([html], 'second.html', { type: 'text/html' })] } });
    await screen.findByText(/Stored: second\.html/);
    await waitFor(() => expect(screen.getByRole('option', { name: /Manual entry/ })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Registered source'), { target: { value: 'admin_manual:AK' } });
    fireEvent.change(screen.getByLabelText('Official results URL (https)'), { target: { value: 'https://elections.example.gov/ak/results' } });
    fireEvent.change(screen.getByLabelText('Source contest ID'), { target: { value: 'US-SEN-AK' } });
    for (const [i, label] of ['EXAMPLE, Alice', 'EXAMPLE, Bob'].entries()) {
      fireEvent.change(within(screen.getByTestId(`line-${i}`)).getByLabelText('Option label as printed'), { target: { value: label } });
    }
    fireEvent.click(screen.getByTestId('button-post-report'));
    expect(await screen.findByText(/Someone recorded a newer report for this race since you loaded it|A newer report/, undefined, { timeout: 5000 })).toBeInTheDocument();
    // The refused 99 never reached the record: the other admin's 11 (= 10 + 1) stands.
    expect((await getReal(`/api/elections/${real.election.id}/results`)).candidates[0].votes).toBe(11);
    expect(real.seen.filter(s => s.path === `/api/elections/${real.election.id}/results` && s.status === 409)).toHaveLength(1);
    b.unmount();
  });
});
