/**
 * ET-41 client half. Server (lane A, PR #52) now answers 503 with a code when the
 * international provider is missing or failing; before, every failure was `200 []`
 * and the page said "No global elections data available". Real page, app QueryClient
 * defaults, MSW at the network boundary. 503 bodies follow A's documented shapes
 * (provider_not_configured / upstream_unavailable); success bodies follow the page's
 * GlobalElection interface because the provider has never answered in this project.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import GlobalDashboard from '../client/src/pages/global-dashboard';
import { queryClient as appQueryClient } from '../client/src/lib/queryClient';

Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

const status = {
  ideaConnected: false, openStatesConnected: false, aceNetworkConnected: false, ballotpediaConnected: false,
  lastMonitoringRun: '2026-11-04T05:00:00Z',
  monitoring: { isRunning: true, targetCount: 4, activeTargets: 3 },
  eventProcessing: { queueLength: 2, isProcessing: false, eventsProcessedToday: 7, precinctCount: 11, districtCallCount: 1 },
  compliance: { regulations: ['GDPR'], auditLogCount: 5, lastRetentionCleanup: '2026-11-01T00:00:00Z', dataTypes: ['a', 'b'] },
};
const election = (country: string, title: string) => ({ country, countryCode: country.slice(0, 2).toUpperCase(), electionType: 'general', date: '2026-12-01', title, status: 'upcoming', participatingParties: ['P1'], source: 'International IDEA' });
const notConfigured = { error: 'International IDEA is not configured', code: 'provider_not_configured', provider: 'idea', upstreamStatus: null };

const server = setupServer(
  http.get('/api/global/status', () => HttpResponse.json(status)),
  http.get('/api/global/elections', () => HttpResponse.json([election('Brazil', 'Brazil general'), election('Chile', 'Chile general')])),
  http.get('/api/global/legislative/all', () => HttpResponse.json([])),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() })}><GlobalDashboard /></QueryClientProvider>);

describe('Global Election Observatory (ET-41 client half)', () => {
  it('a missing provider is an error with retry, never "no elections"', async () => {
    server.use(http.get('/api/global/elections', () => HttpResponse.json(notConfigured, { status: 503 })));
    renderPage();
    const alert = await screen.findByText('Global elections are unavailable: the data provider is not configured.');
    expect(alert.closest('[role=alert]')).toHaveTextContent('This does not mean there are no elections.');
    expect(screen.queryByText(/No global elections data available|reports no elections/)).toBeNull();
    expect(screen.queryByText(/^\d+ Countr(y|ies)$/)).toBeNull();
    expect(within(alert.closest('[role=alert]') as HTMLElement).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('an upstream failure is stated as the provider not answering', async () => {
    server.use(http.get('/api/global/elections', () => HttpResponse.json({ error: 'x', code: 'upstream_unavailable', provider: 'idea', upstreamStatus: 404 }, { status: 503 })));
    renderPage();
    expect(await screen.findByText('Global elections are unavailable: the data provider is not answering.')).toBeInTheDocument();
  });

  it('all countries stay selectable after one is chosen, and the list filters', async () => {
    renderPage();
    expect(await screen.findByText('Brazil general')).toBeInTheDocument();
    expect(screen.getByText('2 Countries')).toBeInTheDocument();
    const open = () => fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    open();
    fireEvent.click(await screen.findByRole('option', { name: 'Chile' }));
    expect(await screen.findByText('Chile general')).toBeInTheDocument();
    expect(screen.queryByText('Brazil general')).toBeNull();
    open();
    expect(await screen.findByRole('option', { name: 'Brazil' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All Countries' })).toBeInTheDocument();
  });

  it('a failed status request hides the figures instead of showing "Stopped" and zeros', async () => {
    server.use(http.get('/api/global/status', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));
    renderPage();
    expect(await screen.findByText(/System status could not be loaded \(500\)/)).toBeInTheDocument();
    expect(screen.queryByText('Stopped')).toBeNull();
    expect(screen.queryByText('Event Processing')).toBeNull();
  });

  it('data sources show only what the status endpoint reports; no hard-coded "Connected" rows', async () => {
    renderPage();
    await screen.findByText('Brazil general');
    const tab = screen.getByRole('tab', { name: 'Data Sources' });
    fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
    fireEvent.click(tab);
    expect(await screen.findByText('International IDEA')).toBeInTheDocument();
    expect(screen.queryByText('ProPublica Congress')).toBeNull();
    expect(screen.queryByText('VoteSmart')).toBeNull();
    expect(screen.queryByText('Connected')).toBeNull();
    expect(screen.getAllByText('Disconnected').length).toBe(4);
  });

  it('a legislative provider failure is an error, and the unverified compliance claim is gone', async () => {
    server.use(http.get('/api/global/legislative/all', () => HttpResponse.json({ error: 'x', code: 'provider_not_configured', provider: 'openstates', upstreamStatus: null }, { status: 503 })));
    renderPage();
    await screen.findByText('Brazil general');
    const leg = screen.getByRole('tab', { name: 'Legislative Activity' });
    fireEvent.mouseDown(leg, { button: 0, ctrlKey: false });
    fireEvent.click(leg);
    expect(await screen.findByText('Legislative activity are unavailable: the data provider is not configured.')).toBeInTheDocument();
    expect(screen.queryByText('No recent legislative activity')).toBeNull();
    const comp = screen.getByRole('tab', { name: 'Compliance' });
    fireEvent.mouseDown(comp, { button: 0, ctrlKey: false });
    fireEvent.click(comp);
    await screen.findByText('Audit Log Entries');
    expect(screen.queryByText(/in compliance with GDPR, CCPA, PIPEDA, LGPD/)).toBeNull();
  });
});
