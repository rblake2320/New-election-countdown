/**
 * React component tests for CongressData.
 *
 * Member data is the exact GET /api/members response captured from the production
 * image after the official 539-member import (tests/fixtures/congress-members, SHA
 * pinned in the helper). It is served byte-for-byte at the HTTP boundary and also
 * primed into a QueryClient configured like the app's, so the real component and its
 * real query run with no hook replacement. Bills and committees keep small stand-in
 * payloads; this file asserts nothing about their content.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CongressData } from '../client/src/components/congress-data.jsx';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';
import { actualMemberRows, actualMembersResponseBytes } from './helpers/congress-api-rows';

const memberBytes = actualMembersResponseBytes();
const members = actualMemberRows();
const serveMembers = () =>
  new HttpResponse(memberBytes, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

const committees = [
  { id: 1, systemCode: 'HSJU', name: 'House Committee on the Judiciary', chamber: 'House', committeeTypeCode: 'Standing' },
  { id: 2, systemCode: 'SSJU', name: 'Senate Committee on the Judiciary', chamber: 'Senate', committeeTypeCode: 'Standing' },
];

const stateRequests: string[] = [];
const server = setupServer(
  http.get('/api/members', serveMembers),
  http.get('/api/members/:state', ({ params }) => {
    const state = String(params.state);
    stateRequests.push(state);
    return HttpResponse.json(members.filter(m => m.state === state));
  }),
  http.get('/api/committees', () => HttpResponse.json(committees)),
  http.get('/api/bills', () => HttpResponse.json([])),
  http.get('/api/bills/:congress', () => HttpResponse.json([])),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // The sitting Congress is derived from the date; pin it to the capture date.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-11T17:30:00Z'));
});
afterEach(() => { server.resetHandlers(); stateRequests.length = 0; });
afterAll(() => { server.close(); vi.useRealTimers(); });

/** A client with the app's real defaults; optionally primed with the actual response. */
const renderWithClient = (ui: React.ReactElement, { prime = true } = {}) => {
  const client = new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() });
  if (prime) client.setQueryData(['/api/members'], members);
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const memberCard = (name: string) => screen.getByText(name).closest('div.p-3') as HTMLElement;

describe('CongressData members on the actual /api/members response', () => {
  it('lists the sitting Congress only and states honest composition counts', () => {
    renderWithClient(<CongressData />);
    expect(screen.getByText('Members, bills and committees of the U.S. Congress')).toBeInTheDocument();
    expect(screen.getByText(
      '119th Congress: 100 senators, 433 voting representatives, 6 nonvoting House members, 1 without a recognized seat',
    )).toBeInTheDocument();
    // 540 current rows; the 118th-Congress preservation row is not listed as a sitting member.
    expect(screen.getByText('Showing 540 of 540 members')).toBeInTheDocument();
    expect(screen.queryByText('Synthetic historical preservation fixture')).not.toBeInTheDocument();
  });

  it('fetches the same bytes over HTTP when the cache is empty', async () => {
    renderWithClient(<CongressData />, { prime: false });
    expect(await screen.findByText('Showing 540 of 540 members')).toBeInTheDocument();
  });

  it('shows party names and seat labels instead of raw codes or "District 00"', () => {
    renderWithClient(<CongressData />);
    fireEvent.change(screen.getByPlaceholderText('State (e.g., CA, NY)'), { target: { value: 'VT' } });
    expect(screen.getByText('Showing 3 of 540 members')).toBeInTheDocument();
    expect(within(memberCard('Becca Balint')).getByText('VT · At-large district')).toBeInTheDocument();
    expect(within(memberCard('Becca Balint')).getByText('Democratic')).toBeInTheDocument();
    expect(within(memberCard('Bernard Sanders')).getByText('VT · Senator')).toBeInTheDocument();
    expect(within(memberCard('Bernard Sanders')).getByText('Independent')).toBeInTheDocument();
  });

  it('labels the Resident Commissioner, delegates and numbered districts', () => {
    renderWithClient(<CongressData />);
    const search = screen.getByPlaceholderText('Search by name or ID...');
    fireEvent.change(search, { target: { value: 'H001103' } });
    expect(screen.getByText('PR · Resident Commissioner (nonvoting)')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'N000147' } });
    expect(screen.getByText('DC · Delegate (nonvoting)')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'Nancy Mace' } });
    expect(within(memberCard('Nancy Mace')).getByText('SC · District 1')).toBeInTheDocument();
    expect(within(memberCard('Nancy Mace')).getByText('Republican')).toBeInTheDocument();
  });

  it('labels the preserved row with no seat and no party honestly', () => {
    renderWithClient(<CongressData />);
    fireEvent.change(screen.getByPlaceholderText('Search by name or ID...'), { target: { value: 'IMPORT_D_FIXTURE' } });
    expect(screen.getByText('ZZ · Seat not recorded')).toBeInTheDocument();
    expect(screen.getByText('Party not recorded')).toBeInTheDocument();
  });

  it('distinguishes "no match" from "no data" and clears filters back to the full list', () => {
    renderWithClient(<CongressData />);
    const search = screen.getByPlaceholderText('Search by name or ID...');
    fireEvent.change(search, { target: { value: 'Schumer' } });
    expect(screen.getByText('Showing 1 of 540 members')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'NoSuchMember' } });
    expect(screen.getByText('No members found matching current filters')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear Filters'));
    expect(search).toHaveValue('');
    expect(screen.getByText('Showing 540 of 540 members')).toBeInTheDocument();
  });

  it('offers no member sync on the public page (the admin route refuses legacy sync)', () => {
    renderWithClient(<CongressData />);
    expect(screen.queryByText(/Sync All/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument();
  });
});

describe('CongressData member load states', () => {
  it('a server error is shown as an error with retry, never as an empty roster', async () => {
    server.use(http.get('/api/members', () => HttpResponse.json({ error: 'Internal server error' }, { status: 500 })));
    renderWithClient(<CongressData />, { prime: false });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Member data could not be loaded, so no members are shown.');
    expect(screen.queryByText(/Showing 0 of 0 members/)).not.toBeInTheDocument();
    expect(screen.queryByText('No members found matching current filters')).not.toBeInTheDocument();

    server.use(http.get('/api/members', serveMembers));
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Showing 540 of 540 members')).toBeInTheDocument();
  });

  it('a non-JSON gateway body is an error, not an empty list', async () => {
    server.use(http.get('/api/members', () => new HttpResponse('<html>gateway error</html>', { status: 502 })));
    renderWithClient(<CongressData />, { prime: false });
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  });

  it('a 200 with a non-list body is an error', async () => {
    server.use(http.get('/api/members', () => HttpResponse.json({ error: 'not a list' })));
    renderWithClient(<CongressData />, { prime: false });
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  });

  it('an empty table says no records are loaded, not that filters matched nothing', async () => {
    server.use(http.get('/api/members', () => HttpResponse.json([])));
    renderWithClient(<CongressData />, { prime: false });
    expect(await screen.findByText('No member records are loaded yet.')).toBeInTheDocument();
    expect(screen.queryByText('No members found matching current filters')).not.toBeInTheDocument();
  });

  it('members-by-state waits for a full two-letter code before requesting', async () => {
    renderWithClient(<CongressData />);
    const input = screen.getByLabelText('State code');
    fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.getByText('Enter a two-letter state code.')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'ak' } });
    expect(await screen.findByText('Showing 3 of 3 members')).toBeInTheDocument();
    expect(stateRequests).toEqual(['AK']);
  });

  it('members-by-state errors are shown as errors', async () => {
    server.use(http.get('/api/members/:state', () => HttpResponse.json({ error: 'invalid_state' }, { status: 400 })));
    renderWithClient(<CongressData />);
    fireEvent.change(screen.getByLabelText('State code'), { target: { value: 'ZZ' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  });
});

describe('Accessibility', () => {
  it('provides proper ARIA labels and roles', () => {
    renderWithClient(<CongressData />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bills' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Committees' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter by party/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter by chamber/i })).toBeInTheDocument();
    expect(screen.getByLabelText('State code')).toBeInTheDocument();
  });
});

describe('Performance', () => {
  it('renders the full actual roster within budget', async () => {
    const start = performance.now();
    renderWithClient(<CongressData />, { prime: false });
    expect(await screen.findByText('Showing 540 of 540 members')).toBeInTheDocument();
    expect(performance.now() - start).toBeLessThan(3000);
  });
});
