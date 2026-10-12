/**
 * ET-6 v1.2 admin posting form. Lane D receiving defect (PR #48): the old form
 * copied candidate counts into state once at mount, so Dan Sullivan showed 0
 * while the server had 10, and switching races could carry or zero counts.
 * Real page, real hooks, MSW at the network boundary. Elections and candidates
 * are the server's captured bytes; the results body is a v1.2 contract example
 * validated by C's schema (A's endpoint is not on main yet).
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import AdminResultsEntry from '../client/src/pages/admin-results-entry';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';
import { liveElectionResultsSchema, liveResultReportInputSchema, noLiveElectionResults } from '../shared/live-election-results';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
// Radix Select needs these pointer/scroll APIs, which jsdom lacks.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
// jsdom's Blob lacks arrayBuffer() (every supported browser has it).
Blob.prototype.arrayBuffer ??= function (this: Blob) {
  return new Promise<ArrayBuffer>(done => { const r = new FileReader(); r.onload = () => done(r.result as ArrayBuffer); r.readAsArrayBuffer(this); });
};

const alaska = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/results-current/elections.body.json'), 'utf8')).filter((e: { state: string }) => e.state === 'AK');
const candidates2 = readFileSync(resolve(process.cwd(), 'tests/fixtures/election-2/candidates.body.json'));
const source = { id: 'ak-doe-enr', kind: 'official_state_enr', name: 'Alaska Division of Elections', url: 'https://www.elections.alaska.gov/results/26GENR/', sourceContestId: 'US-SEN' };
const recorded2 = liveElectionResultsSchema.parse({
  ...noLiveElectionResults(2), reportId: 7, revision: 'r7-1a2b3c4d', status: 'unofficial',
  electionContext: { state: 'AK', electionDate: '2026-11-03', type: 'general', level: 'federal', office: 'U.S. Senate' },
  reporting: { percent: null, basis: 'source_unspecified', precinctsReporting: null, precinctsTotal: null },
  source, sourcePayloadSha256: 'b'.repeat(64), asOf: null, asOfBasis: 'not_provided', retrievedAt: '2026-11-04T05:00:00Z', totalVotes: 10,
  candidates: [
    { candidateId: 1, sourceCandidateId: 'sullivan', name: 'Dan Sullivan', party: 'R', votes: 10, percent: null, isWinner: false },
    { candidateId: 2, sourceCandidateId: 'peltola', name: 'Mary Peltola', party: 'D', votes: 0, percent: null, isWinner: false },
  ],
});

let posted: unknown[] = [];
let uploads: { type: string | null; filename: string | null; size: number }[] = [];
const sourceList = { sources: [
  { id: 'ak-doe-enr', kind: 'official_state_enr', name: 'Alaska Division of Elections', url: 'https://www.elections.alaska.gov/results/26GENR/', state: 'AK' },
  // A's real list returns url: null for the manual entry (the admin supplies the page).
  { id: 'admin_manual:AK', kind: 'admin_manual', name: 'Manual entry from an official Alaska page', url: null, state: 'AK' },
] };
const digestOf = async (buf: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
const server = setupServer(
  http.get('/api/auth/me', () => HttpResponse.json({ user: { id: 'admin-1', email: 'ops@example.org', role: 'admin' } })),
  http.get('/api/elections', () => HttpResponse.json(alaska)),
  http.get('/api/elections/2/candidates', () => new HttpResponse(candidates2, { headers: { 'Content-Type': 'application/json' } })),
  http.get('/api/elections/:id/candidates', () => HttpResponse.json([])),
  http.get('/api/elections/2/results', () => HttpResponse.json(recorded2, { headers: { ETag: 'W/"2-r7"' } })),
  http.get('/api/elections/:id/results', ({ params }) => HttpResponse.json(noLiveElectionResults(Number(params.id)))),
  http.get('/api/results/sources', () => HttpResponse.json(sourceList)),
  // The server rehashes what it stores (A: POST /api/admin/results-evidence, raw body).
  http.post('/api/admin/results-evidence', async ({ request }) => {
    const buf = await request.arrayBuffer();
    uploads.push({ type: request.headers.get('content-type'), filename: request.headers.get('x-evidence-filename'), size: buf.byteLength });
    return HttpResponse.json({ sha256: await digestOf(buf), size: buf.byteLength, contentType: request.headers.get('content-type') }, { status: 201 });
  }),
  http.post('/api/elections/:id/results', async ({ request }) => { posted.push(await request.json()); return HttpResponse.json({ error: 'stale', code: 'stale_revision' }, { status: 409 }); }),
);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T05:20:00Z'));
});
afterEach(() => { server.resetHandlers(); posted = []; uploads = []; });
afterAll(() => { server.close(); vi.useRealTimers(); });

const renderForm = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() })}><AdminResultsEntry /></QueryClientProvider>);

async function chooseRace(titlePart: RegExp) {
  const trigger = await screen.findByRole('combobox', { name: 'Race' });
  await waitFor(() => expect(trigger).not.toBeDisabled());
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: titlePart }));
}

describe('admin results entry (ET-6 v1.2)', () => {
  it('loads the recorded counts for the race (Sullivan 10, not 0)', async () => {
    renderForm();
    await chooseRace(/U\.S\. Senate Election - Alaska/);
    const line = await screen.findByTestId('line-0');
    expect(within(line).getByLabelText('Name as published')).toHaveValue('Dan Sullivan');
    expect(within(line).getByLabelText('Votes')).toHaveValue('10');
    expect(screen.getByLabelText('Total votes (as published)')).toHaveValue('10');
    expect(screen.getByText('Revision r7-1a2b3c4d')).toBeInTheDocument();
  });

  it('a race with no report starts from its candidates with blank, not zero, counts', async () => {
    server.use(http.get('/api/elections/2/results', () => HttpResponse.json(noLiveElectionResults(2))));
    renderForm();
    await chooseRace(/U\.S\. Senate Election - Alaska/);
    const line = await screen.findByTestId('line-0');
    expect(within(line).getByLabelText('Votes')).toHaveValue('');
    expect(screen.getByText('No report recorded yet')).toBeInTheDocument();
  });

  it('switching races with unsaved edits asks first and never carries counts across', async () => {
    renderForm();
    await chooseRace(/U\.S\. Senate Election - Alaska/);
    const votes = within(await screen.findByTestId('line-0')).getByLabelText('Votes');
    fireEvent.change(votes, { target: { value: '12' } });
    await chooseRace(/Alaska Gubernatorial Election/);
    const warning = await screen.findByText('You have unsaved changes for this race.');
    fireEvent.click(within(warning.closest('[role=alert]') as HTMLElement).getByRole('button', { name: 'Keep editing' }));
    expect(within(screen.getByTestId('line-0')).getByLabelText('Votes')).toHaveValue('12');
    await chooseRace(/Alaska Gubernatorial Election/);
    fireEvent.click(await screen.findByRole('button', { name: 'Discard and switch' }));
    expect(await screen.findByText('This race has no candidates recorded yet.')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('12')).toBeNull();
    expect(screen.queryByDisplayValue('Dan Sullivan')).toBeNull();
  });

  it('a winner without the official declaration is refused before anything is sent', async () => {
    renderForm();
    await chooseRace(/U\.S\. Senate Election - Alaska/);
    const line = await screen.findByTestId('line-0');
    fireEvent.click(within(line).getByRole('checkbox', { name: 'Officially declared winner' }));
    fireEvent.click(screen.getByTestId('button-post-report'));
    const alert = await screen.findByText('The report was not posted.');
    // The form names the exact missing fields: the source page and the official declaration.
    expect(alert.closest('[role=alert]')).toHaveTextContent('Declaration URL is required.');
    expect(posted).toEqual([]);
  });

  it('posts the contract body with expectedRevision and an idempotency key; 409 stale_revision is explained', async () => {
    renderForm();
    await chooseRace(/U\.S\. Senate Election - Alaska/);
    const line = await screen.findByTestId('line-0');
    fireEvent.change(within(line).getByLabelText('Votes'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Total votes (as published)'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Registered source'), { target: { value: 'ak-doe-enr' } });
    expect(screen.getByLabelText('Official results URL (https)')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Source contest ID'), { target: { value: 'US-SEN' } });
    const file = new File(['<html>official results</html>'], 'ak-results.html', { type: 'text/html' });
    fireEvent.change(screen.getByLabelText('Official results file or page snapshot'), { target: { files: [file] } });
    await screen.findByText(/Stored: ak-results\.html \(SHA-256 [0-9a-f]{64}\)/);
    expect(uploads).toEqual([{ type: 'text/html', filename: 'ak-results.html', size: file.size }]);
    fireEvent.click(screen.getByTestId('button-post-report'));
    expect(await screen.findByText(/Someone recorded a newer report for this race since you loaded it/)).toBeInTheDocument();
    expect(posted).toHaveLength(1);
    const body = liveResultReportInputSchema.parse(posted[0]);
    expect(body.expectedRevision).toBe('r7-1a2b3c4d');
    expect(body.idempotencyKey.length).toBeGreaterThan(8);
    expect(body.candidates[0]).toMatchObject({ sourceCandidateId: 'sullivan', votes: 15, percent: null, isWinner: false });
    expect(body.source).toMatchObject({ id: 'ak-doe-enr', kind: 'official_state_enr', sourceContestId: 'US-SEN' });
    expect(body.sourcePayloadSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(body.asOf).toBeNull();
    expect(body.asOfBasis).toBe('not_provided');
    expect(JSON.stringify(posted[0])).not.toMatch(/Projected/i);
  });

  it('A\'s writer refusals (evidence_missing, unknown_source, contest_key_conflict) are explained', async () => {
    for (const [code, text] of [
      ['evidence_missing', /no stored copy of the official file/],
      ['unknown_source', /That source is not registered/],
      ['contest_key_conflict', /already recorded for a different race/],
    ] as const) {
      server.use(http.post('/api/elections/:id/results', () => HttpResponse.json({ error: code, code }, { status: 422 })));
      const { unmount } = renderForm();
      await chooseRace(/U\.S\. Senate Election - Alaska/);
      await screen.findByTestId('line-0');
      fireEvent.change(screen.getByLabelText('Registered source'), { target: { value: 'ak-doe-enr' } });
      fireEvent.change(screen.getByLabelText('Source contest ID'), { target: { value: 'US-SEN' } });
      fireEvent.change(screen.getByLabelText('Official results file or page snapshot'), { target: { files: [new File(['x'], 'r.html', { type: 'text/html' })] } });
      await screen.findByText(/Stored: r\.html/);
      fireEvent.click(screen.getByTestId('button-post-report'));
      expect(await screen.findByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it('refuses unsupported or failed evidence uploads and never posts without a stored file', async () => {
    renderForm();
    await chooseRace(/U\.S\. Senate Election - Alaska/);
    await screen.findByTestId('line-0');
    const input = screen.getByLabelText('Official results file or page snapshot');
    fireEvent.change(input, { target: { files: [new File(['MZ'], 'tool.exe', { type: 'application/x-msdownload' })] } });
    expect(await screen.findByText(/files of type application\/x-msdownload are not accepted/)).toBeInTheDocument();
    expect(uploads).toEqual([]);
    server.use(http.post('/api/admin/results-evidence', () => HttpResponse.json({ error: 'Evidence exceeds 10 MB', code: 'evidence_too_large' }, { status: 413 })));
    fireEvent.change(input, { target: { files: [new File(['x'], 'big.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText(/The file was not stored \(413: Evidence exceeds 10 MB\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Stored:/)).toBeNull();
  });

  it('a failed source list is stated and leaves the picker unusable', async () => {
    server.use(http.get('/api/results/sources', () => HttpResponse.json({ error: 'boom' }, { status: 503 })));
    renderForm();
    await chooseRace(/U\.S\. Senate Election - Alaska/);
    expect(await screen.findByText(/The list of registered sources could not be loaded \(503\)/)).toBeInTheDocument();
  });

  it('a manual source (url: null from the real list) with no URL typed shows an error instead of doing nothing', async () => {
    renderForm();
    await chooseRace(/U\.S\. Senate Election - Alaska/);
    await screen.findByTestId('line-0');
    await waitFor(() => expect(screen.getByRole('option', { name: /Manual entry/ })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Registered source'), { target: { value: 'admin_manual:AK' } });
    fireEvent.click(screen.getByTestId('button-post-report'));
    expect((await screen.findByText('The report was not posted.')).closest('[role=alert]')).toHaveTextContent('Official results URL is required.');
    expect(posted).toEqual([]);
  });

  it('renders access denied, then the form, as the admin check resolves (no hook-order crash)', async () => {
    let resolveMe: ((r: Response) => void) | null = null;
    server.use(http.get('/api/auth/me', () => new Promise<Response>(r => { resolveMe = r; })));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderForm();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    await waitFor(() => expect(resolveMe).not.toBeNull());
    resolveMe!(HttpResponse.json({ user: { id: 'admin-1', role: 'admin' } }) as unknown as Response);
    expect(await screen.findByText('Record Official Results')).toBeInTheDocument();
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/Rendered more hooks|change in the order of Hooks/);
    errors.mockRestore();
  });
});
