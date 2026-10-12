/**
 * ET-6 v1.2 results on Happening Now and the election detail page.
 * Real pages and hooks, app QueryClient defaults, MSW at the network boundary.
 * The election list is the server's captured bytes (Alaska rows). Results bodies
 * are contract examples built and validated with C's own schema
 * (shared/live-election-results.ts); A's endpoints are not on main yet, so no
 * recorded response exists. D's receiving retest covers the real endpoint.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Router, Route } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import HappeningNow from '../client/src/pages/happening-now';
import ElectionDetails from '../client/src/pages/election-details';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';
import { liveElectionResultsSchema, liveResultsBatchSchema, noLiveElectionResults } from '../shared/live-election-results';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

const dir = resolve(process.cwd(), 'tests/fixtures/results-current');
const alaska = JSON.parse(readFileSync(resolve(dir, 'elections.body.json'), 'utf8')).filter((e: { state: string }) => e.state === 'AK');
const election2 = alaska.find((e: { id: number }) => e.id === 2);
const SHA = 'a'.repeat(64);
const source = { id: 'ak-doe-enr', kind: 'official_state_enr', name: 'Alaska Division of Elections', url: 'https://www.elections.alaska.gov/results/26GENR/', sourceContestId: 'US-SEN' };

const unofficial = (over: Record<string, unknown> = {}) => liveElectionResultsSchema.parse({
  ...noLiveElectionResults(2), reportId: 118, revision: 'r118-abcdef12', status: 'unofficial',
  reporting: { percent: null, basis: 'source_unspecified', precinctsReporting: null, precinctsTotal: null },
  source, sourcePayloadSha256: SHA, asOf: null, asOfBasis: 'not_provided', retrievedAt: '2026-11-04T05:13:10Z', totalVotes: 119140,
  candidates: [
    { candidateId: 2, sourceCandidateId: 'peltola', name: 'Mary Peltola', party: 'D', votes: 58140, percent: 48.8, isWinner: false },
    { candidateId: 1, sourceCandidateId: 'sullivan', name: 'Dan Sullivan', party: 'R', votes: 61000, percent: 51.2, isWinner: false },
  ],
  ...over,
});
const batch = (results: unknown[], cursor = 'c1') => liveResultsBatchSchema.parse({ schemaVersion: 1, date: '2026-11-03', results, cursor, reset: true });
const allNone = () => batch(alaska.map((e: { id: number }) => noLiveElectionResults(e.id)));

let calls: string[] = [];
const server = setupServer(
  http.get('/api/elections', () => HttpResponse.json(alaska)),
  http.get('/api/results', () => HttpResponse.json(allNone(), { headers: { ETag: 'W/"none"' } })),
);
server.events.on('request:start', ({ request }) => { const u = new URL(request.url); calls.push(u.pathname + u.search); });
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T05:20:00Z'));
});
afterEach(() => { server.resetHandlers(); calls = []; });
afterAll(() => { server.close(); vi.useRealTimers(); });

const client = () => new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() });
const renderHappeningNow = () => render(<QueryClientProvider client={client()}><HappeningNow /></QueryClientProvider>);
const withBatch = (results: unknown[], init: ResponseInit = {}) =>
  server.use(http.get('/api/results', () => HttpResponse.json(batch([...results, ...alaska.filter((e: { id: number }) => !results.some((r: any) => r.electionId === e.id)).map((e: { id: number }) => noLiveElectionResults(e.id))]), init)));

describe('Happening Now on the v1.2 batch read', () => {
  it('one batch request for the date, no per-race polls; none reads as not reported yet', async () => {
    renderHappeningNow();
    const card = await screen.findByTestId('card-election-2');
    expect(await within(card).findByText(/No results reported yet/)).toBeInTheDocument();
    expect(calls.filter(c => c.startsWith('/api/results'))).toEqual(['/api/results?date=2026-11-03']);
    expect(calls.filter(c => /\/api\/elections\/\d+\/results/.test(c))).toEqual([]);
  });

  it('unknown reporting and missing source time are stated, never 0% or the fetch time', async () => {
    withBatch([unofficial()]);
    renderHappeningNow();
    const card = await screen.findByTestId('card-election-2');
    expect(await within(card).findByText('Percent reporting: not stated by the source')).toBeInTheDocument();
    expect(within(card).getByText(/^The source gave no time for these counts; retrieved /)).toBeInTheDocument();
    expect(within(card).getByText('Unofficial results')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Alaska Division of Elections/ })).toHaveAttribute('href', source.url);
    expect(within(card).queryByText(/0\.0%/)).toBeNull();
    expect(within(card).queryByText('Winner')).toBeNull();
    expect(within(card).getByText(/No winner has been declared by an official source/)).toBeInTheDocument();
    const names = within(within(card).getByRole('list', { name: 'Candidate results' })).getAllByRole('listitem').map(li => li.textContent);
    expect(names[0]).toMatch(/Dan Sullivan.*51\.2%.*61,000 votes/);
  });

  it('source time, reporting basis and precincts are shown as the source gave them', async () => {
    withBatch([unofficial({ asOf: '2026-11-04T05:12:00Z', asOfBasis: 'source_timestamp',
      reporting: { percent: 87.5, basis: 'precincts', precinctsReporting: 412, precinctsTotal: 471 } })]);
    renderHappeningNow();
    const card = await screen.findByTestId('card-election-2');
    expect(await within(card).findByText('87.5% reporting of precincts · 412 of 471 precincts')).toBeInTheDocument();
    expect(within(card).getByText(/^Counts as of .*\(source time\), retrieved /)).toBeInTheDocument();
  });

  it('a winner appears only with an explicit official declaration naming that option', async () => {
    const declared = unofficial();
    declared.candidates[1].isWinner = true;
    withBatch([liveElectionResultsSchema.parse({ ...declared, winnerCalledBy: { source: 'Alaska Division of Elections', url: source.url, at: '2026-11-04T05:10:00Z' } })]);
    renderHappeningNow();
    const card = await screen.findByTestId('card-election-2');
    expect(await within(card).findByText('Winner')).toBeInTheDocument();
    expect(within(card).getByText(/Winner declared by/)).toHaveTextContent('Winner declared by Alaska Division of Elections on');
  });

  it('a stale snapshot keeps its counts and says the source stopped answering', async () => {
    withBatch([unofficial({ stale: true, staleSince: '2026-11-04T05:15:00Z' })]);
    renderHappeningNow();
    const card = await screen.findByTestId('card-election-2');
    expect(await within(card).findByRole('status')).toHaveTextContent(/The source has not answered since .* These are the last counts we received\./);
    expect(within(card).getByText('61,000 votes')).toBeInTheDocument();
  });

  it('503 results_unavailable is an error with retry, never "no results"', async () => {
    server.use(http.get('/api/results', () => HttpResponse.json({ error: 'Results storage unavailable', code: 'results_unavailable' }, { status: 503 })));
    renderHappeningNow();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Results could not be loaded: results are temporarily unavailable. This does not mean no results were reported.');
    expect(screen.queryByText(/No results reported yet/)).toBeNull();
    server.resetHandlers();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(await screen.findByTestId('card-election-2')).findByText(/No results reported yet/)).toBeInTheDocument();
  });

  it('a body that fails the contract is an error and its counts are never shown', async () => {
    const bad = JSON.parse(JSON.stringify(allNone()));
    bad.results[0] = { ...unofficial(), electionId: bad.results[0].electionId };
    bad.results[0].candidates[0].isWinner = true; // winner without an official declaration
    server.use(http.get('/api/results', () => HttpResponse.json(bad)));
    renderHappeningNow();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Results could not be shown: the response failed validation \(results\.0\.winnerCalledBy: Only an explicit official declaration may mark a winner\)/);
    expect(screen.queryByText(/votes/)).toBeNull();
  });

  it('sends If-None-Match and keeps the snapshot on 304', async () => {
    let seen: (string | null)[] = [];
    let n = 0;
    server.use(http.get('/api/results', ({ request }) => {
      seen.push(request.headers.get('If-None-Match'));
      return n++ === 0 ? HttpResponse.json(batch([unofficial(), ...alaska.filter((e: { id: number }) => e.id !== 2).map((e: { id: number }) => noLiveElectionResults(e.id))]), { headers: { ETag: 'W/"2-r118"' } })
        : new HttpResponse(null, { status: 304 });
    }));
    renderHappeningNow();
    const card = await screen.findByTestId('card-election-2');
    expect(await within(card).findByText('61,000 votes')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-manual-refresh'));
    await waitFor(() => expect(seen).toEqual([null, 'W/"2-r118"']));
    expect(within(card).getByText('61,000 votes')).toBeInTheDocument();
  });
});

describe('election detail results (v1.2 detail read)', () => {
  it('shows status, counts and earlier reports for the race', async () => {
    const detail = unofficial({ history: [{ reportId: 117, revision: 'r117-0badf00d', asOf: '2026-11-04T04:40:00Z', status: 'unofficial', percent: 61, sourceId: 'ak-doe-enr', sourceUrl: source.url }] });
    server.use(
      http.get('/api/elections/2', () => HttpResponse.json(election2)),
      http.get('/api/elections/2/results', () => HttpResponse.json(detail)),
      http.get('/api/elections/2/candidates', () => HttpResponse.json([])),
    );
    const { hook } = memoryLocation({ path: '/elections/2' });
    render(<QueryClientProvider client={client()}><Router hook={hook}><Route path="/elections/:id"><ElectionDetails /></Route></Router></QueryClientProvider>);
    expect(await screen.findByText('61,000 votes')).toBeInTheDocument();
    expect(screen.getAllByText('Unofficial results').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Earlier reports (1)')).toBeInTheDocument();
    expect(calls).toContain('/api/elections/2/results');
  });
});
