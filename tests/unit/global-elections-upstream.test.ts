import { describe, it, expect } from 'vitest';
import { GlobalElectionService, UpstreamError } from '../../server/global-election-service';

// ET-41: GET /api/global/elections used to answer 200 [] whenever International IDEA was missing a
// key or answered 404, so an outage read as "no elections anywhere". The service now raises a
// typed upstream error the route maps to 503 with a code. Real service class; the only injected
// piece is the HTTP transport (the real endpoint is exercised live, see the PR receipt).

const fetchReturning = (status: number, body: unknown = {}) => (async () => ({
  ok: status >= 200 && status < 300, status,
  json: async () => body,
})) as unknown as typeof fetch;

describe('global elections upstream honesty (ET-41)', () => {
  it('no IDEA key -> provider_not_configured before any network call', async () => {
    let called = 0;
    const svc = new GlobalElectionService({ env: {} as NodeJS.ProcessEnv, fetchImpl: (async () => { called++; return { ok: true, status: 200, json: async () => ({}) }; }) as unknown as typeof fetch });
    await expect(svc.fetchIDEAElections()).rejects.toMatchObject({ publicCode: 'provider_not_configured', status: 503 });
    expect(called).toBe(0);
  });

  it('upstream 404 -> upstream_unavailable carrying the upstream status, never []', async () => {
    const svc = new GlobalElectionService({ env: { IDEA_API_KEY: 'test-key' } as NodeJS.ProcessEnv, fetchImpl: fetchReturning(404) });
    const err = await svc.fetchIDEAElections('CAN').catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err).toMatchObject({ publicCode: 'upstream_unavailable', upstreamStatus: 404, provider: 'International IDEA' });
  });

  it('network failure and unreadable body are upstream_unavailable too', async () => {
    const down = new GlobalElectionService({ env: { IDEA_API_KEY: 'k' } as NodeJS.ProcessEnv, fetchImpl: (async () => { throw new Error('ECONNRESET'); }) as unknown as typeof fetch });
    await expect(down.fetchIDEAElections()).rejects.toMatchObject({ publicCode: 'upstream_unavailable', upstreamStatus: null });
    const garbage = new GlobalElectionService({ env: { IDEA_API_KEY: 'k' } as NodeJS.ProcessEnv, fetchImpl: (async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } })) as unknown as typeof fetch });
    await expect(garbage.fetchIDEAElections()).rejects.toMatchObject({ publicCode: 'upstream_unavailable', upstreamStatus: 200 });
  });

  it('a real 200 body is mapped, not swallowed', async () => {
    const svc = new GlobalElectionService({ env: { IDEA_API_KEY: 'k' } as NodeJS.ProcessEnv, fetchImpl: fetchReturning(200, { elections: [{ country: 'Canada', countryCode: 'CAN', electionType: 'federal', date: '2029-10-20', title: 'Federal election' }] }) });
    const rows = await svc.fetchIDEAElections('CAN');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ country: 'Canada', source: 'International IDEA' });
  });

  it('Open States without a key is provider_not_configured (same bug class on /api/global/legislative)', async () => {
    const svc = new GlobalElectionService({ env: {} as NodeJS.ProcessEnv, fetchImpl: fetchReturning(200, []) });
    await expect(svc.fetchOpenStatesEvents('TX')).rejects.toMatchObject({ publicCode: 'provider_not_configured' });
  });
});
