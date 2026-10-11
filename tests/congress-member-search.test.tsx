/**
 * Public member search on the actual /api/members rows. The search handler applies
 * the server's own rule (storage.searchCongressMembers: case-insensitive substring on
 * name, state, party or bioguideId, limit 50) to those rows.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CongressMemberSearch } from '../client/src/components/congress-member-search';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';
import { actualMemberRows } from './helpers/congress-api-rows';

const rows = actualMemberRows();
const serverSearch = (q: string) => {
  const t = q.toLowerCase();
  return rows.filter(r => [r.name, r.state, r.party, r.bioguideId].some(v => (v ?? '').toLowerCase().includes(t))).slice(0, 50);
};

let writes = 0;
const server = setupServer(
  http.get('/api/members/search', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q');
    return q ? HttpResponse.json(serverSearch(q)) : HttpResponse.json({ error: 'Search query is required' }, { status: 400 });
  }),
  http.post('/api/congress/find-member', () => { writes++; return HttpResponse.json({ found: true }); }),
);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-11T17:30:00Z'));
});
afterEach(() => { server.resetHandlers(); writes = 0; });
afterAll(() => { server.close(); vi.useRealTimers(); });

const renderSearch = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() })}>
    <CongressMemberSearch />
  </QueryClientProvider>,
);
const search = (q: string) => {
  fireEvent.change(screen.getByLabelText('Member name'), { target: { value: q } });
  fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
};

describe('CongressMemberSearch on actual member rows', () => {
  it('shows party names, seat labels and party colors for single-letter codes', async () => {
    renderSearch();
    search('Begich');
    const card = (await screen.findByText('Nicholas J. Begich III')).closest('div.p-3') as HTMLElement;
    expect(within(card).getByText('AK · At-large district')).toBeInTheDocument();
    const badge = within(card).getByText('Republican');
    expect(badge.className).toContain('bg-red-100');
    expect(card.textContent).not.toContain('AK-00');
  });

  it('labels the Resident Commissioner and colors Democrats', async () => {
    renderSearch();
    search('H001103');
    const card = (await screen.findByText('Pablo José Hernández')).closest('div.p-3') as HTMLElement;
    expect(within(card).getByText('PR · Resident Commissioner (nonvoting)')).toBeInTheDocument();
    expect(within(card).getByText('Democratic').className).toContain('bg-blue-100');
  });

  it('labels a 118th-Congress row with its Congress instead of presenting it as sitting', async () => {
    renderSearch();
    search('preservation fixture');
    const current = (await screen.findByText('Synthetic legacy preservation fixture')).closest('div.p-3') as HTMLElement;
    expect(current.textContent).toContain('ZZ · Seat not recorded');
    expect(current.textContent).not.toContain('Congress');
    const history = screen.getByText('Synthetic historical preservation fixture').closest('div.p-3') as HTMLElement;
    expect(history.textContent).toContain('ZZ · Senator · 118th Congress');
  });

  it('no match says so and offers no database write', async () => {
    renderSearch();
    search('Zzyzx');
    expect(await screen.findByText('No members match "Zzyzx".')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add to Database/i })).not.toBeInTheDocument();
    expect(writes).toBe(0);
  });

  it('a failed search is an error with retry, not "no members found"', async () => {
    server.use(http.get('/api/members/search', () => HttpResponse.json({ error: 'Too many requests' }, { status: 429 })));
    renderSearch();
    search('Schumer');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Search could not be completed, so no results are shown.');
    expect(screen.queryByText(/No members match/)).not.toBeInTheDocument();
    server.resetHandlers();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Charles E. Schumer')).toBeInTheDocument();
  });
});
