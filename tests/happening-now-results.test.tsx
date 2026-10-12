/**
 * ET-6 (owner: post results live or as soon as an official source publishes them).
 * Happening Now must never present unknown reporting as 0%, an error as "no results",
 * or a projection as a call. Real page, app QueryClient defaults, MSW at the network
 * boundary. Bodies are the server's own bytes (tests/fixtures/results-current):
 * /api/elections is filtered to its election-2 row so one card renders; the
 * "votes posted" case adds counts to the captured election-2 body because no
 * official results have been posted yet. It is marked as derived below.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import HappeningNow from '../client/src/pages/happening-now';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';

const dir = resolve(process.cwd(), 'tests/fixtures/results-current');
const elections = JSON.parse(readFileSync(resolve(dir, 'elections.body.json'), 'utf8'));
const results2Bytes = readFileSync(resolve(dir, 'results-2.body.json'));
const election2 = elections.filter((e: { id: number }) => e.id === 2);

// Derived: the captured election-2 body with counts as an admin post would add them,
// and no percent reporting (the current endpoint never returns it).
const withVotes = (() => {
  const body = JSON.parse(results2Bytes.toString());
  const [a, b] = body.candidates;
  Object.assign(a, { votesReceived: 61000, votePercentage: '51.20', isWinner: false, isProjectedWinner: true });
  Object.assign(b, { votesReceived: 58140, votePercentage: '48.80', isWinner: false, isProjectedWinner: false });
  return { ...body, hasResults: true, totalVotes: 119140 };
})();

const server = setupServer(
  http.get('/api/elections', () => HttpResponse.json(election2)),
  http.get('/api/elections/:id/results', () => new HttpResponse(results2Bytes, { headers: { 'Content-Type': 'application/json' } })),
);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T05:00:00Z'));
});
afterEach(() => server.resetHandlers());
afterAll(() => { server.close(); vi.useRealTimers(); });

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() })}>
    <HappeningNow />
  </QueryClientProvider>,
);

describe('Happening Now results (ET-6)', () => {
  it('captured server results for election 2 render as "No results reported yet"', async () => {
    renderPage();
    const card = await screen.findByTestId('card-election-2');
    expect(await within(card).findByText(/No results reported yet/)).toBeInTheDocument();
    expect(within(card).queryByText(/0\.0%|0 \/ 0 precincts/)).toBeNull();
  });

  it('a results request that fails is an error with retry, never "no results"', async () => {
    server.use(http.get('/api/elections/:id/results', () => HttpResponse.json({ message: 'Failed to fetch election results' }, { status: 500 })));
    renderPage();
    const card = await screen.findByTestId('card-election-2');
    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent('Results could not be loaded (500)');
    expect(within(card).queryByText(/No results reported yet/)).toBeNull();
    server.use(http.get('/api/elections/:id/results', () => new HttpResponse(results2Bytes, { headers: { 'Content-Type': 'application/json' } })));
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(card).findByText(/No results reported yet/)).toBeInTheDocument();
  });

  it('posted votes without percent reporting say so; no 0%, no projection badge', async () => {
    server.use(http.get('/api/elections/:id/results', () => HttpResponse.json(withVotes)));
    renderPage();
    const card = await screen.findByTestId('card-election-2');
    expect(await within(card).findByText('Reporting: not yet stated by the source')).toBeInTheDocument();
    expect(within(card).queryByText(/0\.0%/)).toBeNull();
    expect(within(card).queryByText(/precincts/)).toBeNull();
    expect(within(card).queryByText(/Projected/i)).toBeNull();
    expect(within(card).queryByText(/Winner/i)).toBeNull();
    expect(within(card).getByText('Leading in reported votes')).toBeInTheDocument();
    expect(within(card).getByText('61,000 votes')).toBeInTheDocument();
  });

  it('a failed elections request is an error, not "no elections"', async () => {
    server.use(http.get('/api/elections', () => HttpResponse.json({ error: 'boom' }, { status: 503 })));
    renderPage();
    expect(await screen.findByText(/Elections could not be loaded \(503\)/)).toBeInTheDocument();
    expect(screen.queryByText(/No elections from the past 30 days/)).toBeNull();
  });
});
