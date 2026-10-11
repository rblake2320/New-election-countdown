/**
 * Congress admin page on actual responses: the exact GET /api/members bytes captured
 * after the official import, and the actual 401/403/422 bodies the production image
 * returned for POST /api/congress/import in the same run (receipt.json). The admin
 * buttons must never report a refused or failed import as success.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import CongressAdminPage from '../client/src/pages/congress-admin';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';
import { actualMembersResponseBytes, actualReceipt, defaultScopeMemberRows } from './helpers/congress-api-rows';

const memberBytes = actualMembersResponseBytes();
const receipt = actualReceipt() as ReturnType<typeof actualReceipt> & {
  anonymous: Array<{ path: string; status: number; body: Record<string, unknown> }>;
  ordinary: Array<{ path: string; status: number; body: Record<string, unknown> }>;
};
const recorded = (section: 'legacy' | 'anonymous' | 'ordinary') =>
  receipt[section].find(r => r.path === '/api/congress/import')!;

let memberGets = 0;
const server = setupServer(
  http.get('/api/members', () => {
    memberGets++;
    return new HttpResponse(memberBytes, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-11T17:30:00Z'));
});
afterEach(() => { server.resetHandlers(); memberGets = 0; });
afterAll(() => { server.close(); vi.useRealTimers(); });

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() });
  return render(<QueryClientProvider client={client}><CongressAdminPage /></QueryClientProvider>);
};

const reimport = () => fireEvent.click(screen.getByRole('button', { name: /Re-import Data/ }));

describe('Congress admin counts on the actual /api/members response', () => {
  it('reports seats against law and records against the sitting Congress', async () => {
    renderPage();
    expect(await screen.findByText('119th Congress Member Records')).toBeInTheDocument();
    const text = document.body.textContent!;
    expect(text).toContain('540');
    expect(text).toContain('541 seats in total, including 6 nonvoting House seats.');
    expect(text).toContain('1 record(s) from other Congresses are not counted.');
    expect(text).toContain('433 of 435 voting seats');
    expect(text).toContain('2 voting seat(s) have no member record');
    expect(text).toContain('Nonvoting delegates and resident commissioner: 6 of 6');
    expect(text).toContain('100 of 100 seats');
    expect(text).toContain('Every seat has a member record');
    // The retired arithmetic: 535 - 541 = "-6 missing".
    expect(text).not.toMatch(/-\d+ missing/);
    expect(text).not.toContain('Expected: 535');
  });

  it('shows party names and the unlabelled preserved row as a data issue', async () => {
    renderPage();
    await screen.findByText('Party Breakdown');
    for (const label of ['Republican: 274', 'Democratic: 262', 'Independent: 3', 'Party not recorded: 1']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText(/^R: /)).not.toBeInTheDocument();
    expect(screen.getByText('• 1 House record(s) with no recognized seat')).toBeInTheDocument();
  });

  it('server default scope (PR #34): no data issues and nothing excluded', async () => {
    server.use(http.get('/api/members', () => HttpResponse.json(defaultScopeMemberRows())));
    renderPage();
    await screen.findByText('Party Breakdown');
    const text = document.body.textContent!;
    expect(text).toContain('119th Congress Member Records539');
    expect(text).not.toContain('from other Congresses');
    expect(text).toContain('433 of 435 voting seats');
    expect(screen.queryByText('Data Issues Detected:')).not.toBeInTheDocument();
    expect(screen.queryByText(/Party not recorded/)).not.toBeInTheDocument();
  });

  it('a members load failure is an error, not zero counts', async () => {
    server.use(http.get('/api/members', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Member data could not be loaded');
    expect(alert).toHaveTextContent('Member data request failed (500)');
    expect(screen.queryByText('Party Breakdown')).not.toBeInTheDocument();
  });
});

describe('Congress admin re-import outcome', () => {
  it.each([
    ['legacy 422 refusal', 'legacy', /^422: Legacy Congress dataset has no reviewed source digest; nothing was imported \(LEGACY_CONGRESS_SOURCE_UNVERIFIED\)$/],
    ['non-admin 403', 'ordinary', /^403: Administrative privileges required to access this resource$/],
    ['signed-out 401', 'anonymous', /^401: unauthorized$/],
  ] as const)('%s is shown as "Import not performed" and members are not re-read', async (_n, section, message) => {
    const actual = recorded(section);
    server.use(http.post('/api/congress/import', () => HttpResponse.json(actual.body, { status: actual.status })));
    renderPage();
    await screen.findByText('Party Breakdown');
    const before = memberGets;
    reimport();
    const alert = await screen.findByText('Import not performed');
    expect(within(alert.closest('[role="alert"]') as HTMLElement).getByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/importer accepted the request/)).not.toBeInTheDocument();
    expect(memberGets).toBe(before);
  });

  it('a 2xx importer result is reported as accepted and members are re-read', async () => {
    server.use(http.post('/api/congress/import', () =>
      HttpResponse.json({ status: 'importer_result', result: { insertedCount: 0 }, validation: null })));
    renderPage();
    await screen.findByText('Party Breakdown');
    const before = memberGets;
    reimport();
    expect(await screen.findByText(/importer accepted the request/)).toBeInTheDocument();
    await waitFor(() => expect(memberGets).toBe(before + 1));
    expect(screen.queryByText('Import not performed')).not.toBeInTheDocument();
  });

  it('a network failure is not reported as success', async () => {
    server.use(http.post('/api/congress/import', () => HttpResponse.error()));
    renderPage();
    await screen.findByText('Party Breakdown');
    reimport();
    expect(await screen.findByText('Import not performed')).toBeInTheDocument();
  });

  it('a refused member analysis shows the server message', async () => {
    const actual = recorded('ordinary');
    server.use(http.post('/api/congress/find-missing', () => HttpResponse.json(actual.body, { status: actual.status })));
    renderPage();
    await screen.findByText('Party Breakdown');
    fireEvent.click(screen.getByRole('button', { name: /Find Missing Members/ }));
    expect(await screen.findByText('Error: 403: Administrative privileges required to access this resource')).toBeInTheDocument();
  });
});
