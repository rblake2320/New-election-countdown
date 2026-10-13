import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { registerRequestBodyParsers } from '../../server/request-body-parsers';
import { registerResultsRoutes } from '../../server/results-routes';
import { globalWriteGuard } from '../../server/middleware/health-guard';
import { MemStorage } from '../../server/mem-storage';
import { EVIDENCE_MAX_BYTES } from '../../server/results-store';

const health = vi.hoisted(() => ({ isDatabaseAvailable: vi.fn(() => true) }));
vi.mock('../../server/storage-factory', () => ({ storageFactory: health }));

// Retained official Louisiana JSON from lane C's source packet; byte-identical to
// the real upload that returned empty_evidence in the compiled production app.
// https://voterportal.sos.la.gov/ElectionResults/ElectionResults/Data?blob=20260627/RacesCandidates_Multiparish.htm
// Retrieved 2026-10-12T05:05:48.486533Z, no response-body transformations.
const official = readFileSync('tests/fixtures/la-jun27-results-evidence.json');
const sha = 'cf1e6a52f5554f0bb4959f6b9ad7cc583e53f70e57ca28b62346f7c8c01be637';

describe('production body parsers composed with the evidence route over HTTP', () => {
  let server: Server;
  let base: string;
  let store: MemStorage;
  let persist: ReturnType<typeof vi.spyOn>;
  beforeEach(async () => {
    health.isDatabaseAvailable.mockReturnValue(true);
    store = new MemStorage();
    persist = vi.spyOn(store, 'storeResultEvidence');
    const app = express();
    registerRequestBodyParsers(app);
    app.use('/api', globalWriteGuard);
    registerResultsRoutes(app, {
      store,
      isAuthenticated: (req, res, next) => req.headers['x-test-role'] ? next() : res.sendStatus(401),
      requireAdmin: (req, res, next) => req.headers['x-test-role'] === 'admin' ? next() : res.sendStatus(403),
      adminIdentity: () => 'test-admin',
    });
    app.post('/api/body-control', (req: any, res) => res.json({ body: req.body, raw: req.rawBody?.toString('utf8') }));
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    vi.restoreAllMocks();
  });
  const post = (body: Buffer | string, type = 'application/json', path = '/api/admin/results-evidence', role = 'admin') =>
    fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': type, ...(role ? { 'x-test-role': role } : {}) }, body });

  it('retains the exact official JSON bytes and hash, and repeats idempotently', async () => {
    expect(official.length).toBe(6321);
    expect(createHash('sha256').update(official).digest('hex')).toBe(sha);
    const first = await post(official);
    expect(first.status, JSON.stringify(await first.clone().json())).toBe(201);
    expect(await first.json()).toMatchObject({ sha256: sha, size: 6321, contentType: 'application/json' });
    expect(persist).toHaveBeenCalledWith(official, 'application/json', null, 'admin:test-admin');
    expect((await post(official)).status).toBe(200);
  });

  it('uses the same case-insensitive and optional-trailing-slash route matching as Express', async () => {
    expect((await post(official, 'application/json; charset=utf-8', '/API/ADMIN/RESULTS-EVIDENCE/?upload=1')).status).toBe(201);
  });

  it('accepts JSON evidence above the normal JSON parser limit up to exactly 10 MB', async () => {
    const bytes = Buffer.concat([official, Buffer.alloc(EVIDENCE_MAX_BYTES - official.length, ' ')]);
    const accepted = await post(bytes);
    expect(accepted.status).toBe(201);
    expect((await accepted.json()).size).toBe(EVIDENCE_MAX_BYTES);
    const refused = await post(Buffer.concat([bytes, Buffer.from(' ')]));
    expect(refused.status).toBe(413);
    expect((await refused.json()).code).toBe('evidence_too_large');
    expect(persist).toHaveBeenCalledTimes(1);
  }, 15000);

  it('keeps media and empty-body errors, without storing rejected bytes', async () => {
    const media = await post('a=1', 'application/x-www-form-urlencoded');
    expect(media.status).toBe(415);
    expect((await media.json()).code).toBe('unsupported_evidence_type');
    const empty = await post('');
    expect(empty.status).toBe(400);
    expect((await empty.json()).code).toBe('empty_evidence');
    expect(persist).not.toHaveBeenCalled();
  });

  it('still applies authentication, admin authorization, and the real database write guard', async () => {
    expect((await post(official, 'application/json', undefined, '')).status).toBe(401);
    expect((await post(official, 'application/json', undefined, 'member')).status).toBe(403);
    health.isDatabaseAvailable.mockReturnValue(false);
    expect((await post(official)).status).toBe(503);
    expect(persist).not.toHaveBeenCalled();
  });

  it('preserves normal JSON parsing, webhook rawBody, urlencoded forms and the ordinary JSON limit', async () => {
    const json = '{ "hello" : "world" }';
    expect(await (await post(json, 'application/json', '/api/body-control')).json()).toEqual({ body: { hello: 'world' }, raw: json });
    expect(await (await post('hello=world', 'application/x-www-form-urlencoded', '/api/body-control')).json()).toEqual({ body: { hello: 'world' } });
    expect((await post(JSON.stringify({ text: 'x'.repeat(110_000) }), 'application/json', '/api/body-control')).status).toBe(413);
  });
});
