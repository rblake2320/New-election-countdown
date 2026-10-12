/**
 * ET-6 (owner: post results live or as soon as an official source publishes them).
 * The per-race cases moved to tests/live-results-v12.test.tsx when Happening Now
 * switched to the v1.2 batch read; this file keeps the election-list error case. Real page, app QueryClient defaults, MSW at the network
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
  it('a failed elections request is an error, not "no elections"', async () => {
    server.use(http.get('/api/elections', () => HttpResponse.json({ error: 'boom' }, { status: 503 })));
    renderPage();
    expect(await screen.findByText(/Elections could not be loaded \(503\)/)).toBeInTheDocument();
    expect(screen.queryByText(/No elections from the past 30 days/)).toBeNull();
  });
});
