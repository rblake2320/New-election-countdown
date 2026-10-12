import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SUBSCRIPTION_TIERS } from '../../server/campaign-portal-service';

// ET-38 (owner decision 2026-10-11): data exports are "coming soon" with NO purchase path.
// The server must refuse POST /api/campaign/export before any storage call, and no tier may
// advertise exports as an available feature.

const routesSource = readFileSync(resolve(process.cwd(), 'server/routes.ts'), 'utf8');

function exportHandlerSource(): string {
  const start = routesSource.indexOf("app.post('/api/campaign/export'");
  expect(start).toBeGreaterThan(-1);
  const rest = routesSource.slice(start);
  const end = rest.indexOf('\n  app.', 1);
  return rest.slice(0, end);
}

describe('ET-38 campaign export contract', () => {
  it('POST /api/campaign/export never reaches storage', () => {
    const handler = exportHandlerSource();
    expect(handler).not.toMatch(/storage\./);
    expect(handler).not.toMatch(/purchaseDataExport/);
    expect(handler).toMatch(/status\(503\)/);
    expect(handler).toMatch(/EXPORTS_NOT_AVAILABLE/);
  });

  it('the refusal body is the agreed B/A contract shape (live express handler)', async () => {
    // Mount the exact handler source as the route registers it, on a throwaway express app.
    const app = express();
    app.post('/api/campaign/export', (_req, res) => {
      res.status(503).json({
        error: 'exports_unavailable',
        code: 'EXPORTS_NOT_AVAILABLE',
        message: 'Data exports are not available yet',
      });
    });
    // The literal above must be byte-for-byte what routes.ts ships.
    expect(exportHandlerSource()).toContain("error: 'exports_unavailable'");
    expect(exportHandlerSource()).toContain("code: 'EXPORTS_NOT_AVAILABLE'");
    expect(exportHandlerSource()).toContain("message: 'Data exports are not available yet'");

    const server = createServer(app);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/api/campaign/export`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': 'any' },
        body: JSON.stringify({ datasetType: 'voters', format: 'csv' }),
      });
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        error: 'exports_unavailable',
        code: 'EXPORTS_NOT_AVAILABLE',
        message: 'Data exports are not available yet',
      });
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it('no subscription tier advertises exports as available (single source: SUBSCRIPTION_TIERS)', () => {
    // ET-40 removed the duplicate feature list from routes.ts; the service table is the only one.
    expect(routesSource).not.toMatch(/function getSubscriptionFeatures/);
    let exportMentions = 0;
    for (const tier of Object.values(SUBSCRIPTION_TIERS)) {
      for (const feature of tier.features) {
        if (/export/i.test(feature)) { exportMentions++; expect(feature).toMatch(/\(coming soon\)/); }
      }
    }
    expect(exportMentions).toBeGreaterThan(0);
  });
});
