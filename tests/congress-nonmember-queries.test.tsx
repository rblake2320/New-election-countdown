/**
 * /congress with the actual non-member responses from the production runtime that
 * crashed B35 (captured byte-for-byte in fixtures/congress-members/nonmember):
 * GET /api/bills and /api/committees return 200 [], GET /api/bills/119 returns
 * 503 {reason:"missing_api_key", ...} when no congressional data key is configured.
 * Members are the actual /api/members bytes. Real component, app QueryClient defaults.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CongressData } from '../client/src/components/congress-data.jsx';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';
import { actualMembersResponseBytes } from './helpers/congress-api-rows';

const dir = resolve(process.cwd(), 'tests/fixtures/congress-members/nonmember');
const body = (name: string) => readFileSync(resolve(dir, `${name}.body.json`));
const status = (name: string) => Number(/^HTTP\/1\.1 (\d{3})/.exec(readFileSync(resolve(dir, `${name}.headers.txt`), 'utf8'))![1]);
const actual = (name: string) => () =>
  new HttpResponse(body(name), { status: status(name), headers: { 'Content-Type': 'application/json; charset=utf-8' } });

const server = setupServer(
  http.get('/api/members', () => new HttpResponse(actualMembersResponseBytes(), { headers: { 'Content-Type': 'application/json' } })),
  http.get('/api/bills', actual('bills')),
  http.get('/api/bills/:congress', actual('bills-119')),
  http.get('/api/committees', actual('committees')),
  http.get('/api/committees/:chamber/:code/members', actual('committee-members-house-hsju00')),
);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-11T17:30:00Z'));
});
afterEach(() => server.resetHandlers());
afterAll(() => { server.close(); vi.useRealTimers(); });

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() })}>
    <CongressData />
  </QueryClientProvider>,
);
const openTab = (name: string) => {
  const tab = screen.getByRole('tab', { name });
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
  fireEvent.keyDown(tab, { key: 'Enter' });
  fireEvent.click(tab);
};

describe('CongressData with the actual production non-member responses', () => {
  it('captured statuses are the ones production returned', () => {
    expect([status('bills'), status('bills-119'), status('committees')]).toEqual([200, 503, 200]);
    expect(JSON.parse(body('bills-119').toString()).reason).toBe('missing_api_key');
  });

  it('renders the members page without crashing when bills-by-Congress is a 503 object', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();
    expect(await screen.findByText('Showing 540 of 540 members')).toBeInTheDocument();
    // Let the bills queries settle; a crash would unmount the tree and log the TypeError.
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByRole('tab', { name: 'Bills' })).toBeInTheDocument();
    expect(screen.getByText('Showing 540 of 540 members')).toBeInTheDocument();
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/is not a function/);
    errors.mockRestore();
  });

  it('Bills tab: an unconfigured source is stated, an empty list is stated, nothing is invented', async () => {
    renderPage();
    openTab('Bills');
    const byCongress = await screen.findByText(/Bills by Congress are unavailable: no congressional data source is configured/);
    expect(byCongress).toBeInTheDocument();
    expect(await screen.findByText('No bills are recorded yet.')).toBeInTheDocument();
  });

  it('Committees tab: an empty list says so instead of "Showing 0 of 0"', async () => {
    renderPage();
    openTab('Committees');
    expect(await screen.findByText('No committees are recorded yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Showing 0 of 0 committees/)).not.toBeInTheDocument();
  });

  it('a committees 500 is an error with retry', async () => {
    server.use(http.get('/api/committees', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));
    renderPage();
    openTab('Committees');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Committees could not be loaded (500).');
    server.use(http.get('/api/committees', actual('committees')));
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No committees are recorded yet.')).toBeInTheDocument();
  });

  it('a non-numeric Congress number is not requested', async () => {
    const seen: string[] = [];
    server.use(http.get('/api/bills/:congress', ({ params }) => { seen.push(String(params.congress)); return actual('bills-119')(); }));
    renderPage();
    openTab('Bills');
    const input = screen.getByPlaceholderText('Congress number (e.g., 119, 118)');
    fireEvent.change(input, { target: { value: '11a' } });
    expect(await screen.findByText('Enter a Congress number, such as 119.')).toBeInTheDocument();
    expect(seen.every(c => /^\d+$/.test(c))).toBe(true);
  });
});
