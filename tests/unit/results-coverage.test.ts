import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';

const manifest = (status: string, publisher = 'ak-doe') => ({ publisher, routeType: 'election_specific_results', governmentUrl: 'https://www.elections.alaska.gov/results/26GENR/', routeVerification: 'worked', status });
const elections = [
  { id: 1, title: 'U.S. Senate - Alaska', state: 'AK', date: new Date('2026-11-03T06:00:00Z'), type: 'general', level: 'federal', officialResultsUrl: 'https://www.elections.alaska.gov/results/26GENR/', officialResultsSource: manifest('published') },
  { id: 2, title: 'Governor - Wyoming', state: 'WY', date: new Date('2026-11-03T07:00:00Z'), type: 'general', level: 'state', officialResultsUrl: null, officialResultsSource: manifest('published', 'wy-sos') },
  { id: 3, title: 'House - Texas 7', state: 'TX', date: new Date('2026-11-03T06:00:00Z'), type: 'general', level: 'federal', officialResultsUrl: null, officialResultsSource: manifest('unknown', 'tx-sos') },
  { id: 4, title: 'Mayor - Nowhere', state: 'OH', date: new Date('2026-11-03T05:00:00Z'), type: 'general', level: 'local', officialResultsUrl: null, officialResultsSource: null },
  { id: 5, title: 'Earlier primary', state: 'AK', date: new Date('2026-08-18T06:00:00Z'), type: 'primary', level: 'federal', officialResultsUrl: null, officialResultsSource: manifest('published') },
];
vi.mock('../../server/storage', () => ({ storage: { getElections: vi.fn(async () => elections) } }));

import { ResultsIngestionService } from '../../server/results-ingestion-service';
import { registerResultsCoverageRoute } from '../../server/results-coverage-routes';

describe('ET-6 results coverage: automatic only with published manifest + registered adapter', () => {
  it('classifies every race on the date with a reason and never counts an unregistered publisher as automatic', async () => {
    const svc = new ResultsIngestionService();
    svc.registerAdapter('ak-doe', async () => null);
    const c = await svc.coverage('2026-11-03');
    expect(c.counts).toEqual({ total: 4, automatic: 1, manualOnly: 3 });
    expect(c.races.map((r) => [r.electionId, r.mode, r.reason])).toEqual([
      [1, 'automatic', 'adapter_registered'],
      [2, 'manual_only', 'no_adapter'],
      [3, 'manual_only', 'manifest_not_published'],
      [4, 'manual_only', 'no_manifest'],
    ]);
    expect(c.races.find((r) => r.electionId === 5)).toBeUndefined();
    expect((await svc.coverage()).counts.total).toBe(5);
  });

  it('serves it over real HTTP; rejects a malformed date with 400 and reports storage failure as 503', async () => {
    const svc = new ResultsIngestionService();
    const app = express();
    let fail = false;
    registerResultsCoverageRoute(app, { coverage: (d) => (fail ? Promise.reject(new Error('db down')) : svc.coverage(d)) });
    const server = createServer(app);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      const ok = await fetch(`${base}/api/results/coverage?date=2026-11-03`);
      expect(ok.status).toBe(200);
      const body = await ok.json();
      expect(body.counts).toEqual({ total: 4, automatic: 0, manualOnly: 4 });
      expect(body.races.every((r: { mode: string }) => r.mode === 'manual_only')).toBe(true);
      const bad = await fetch(`${base}/api/results/coverage?date=Nov3`);
      expect(bad.status).toBe(400);
      expect((await bad.json()).code).toBe('invalid_query');
      fail = true;
      const down = await fetch(`${base}/api/results/coverage`);
      expect(down.status).toBe(503);
      expect((await down.json()).code).toBe('results_unavailable');
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
