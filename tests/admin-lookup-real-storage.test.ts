/**
 * D's PR #81 RED: the REAL DatabaseStorage swallows "endpoint has been disabled" into [] (public
 * legacy storage behaviour; old public RED retained separately), so the admin historical lookup answered 200 [] instead of 503. The lookup now uses
 * getElectionsStrict. These run the real DatabaseStorage + real query builder + the real express handler;
 * only the query is replaced by one that fails like a disabled endpoint.
 */
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const failure = vi.hoisted(() => ({ message: 'The endpoint has been disabled. Enable it using Neon API and retry.' }));
vi.mock('../server/db', () => ({ db: {}, pool: { query: async () => { throw new Error(failure.message); } } }));
// D's injected query: the driver error reaches storage unwrapped, exactly as a disabled Neon endpoint presents it.
vi.mock('../server/election-list-query', async importOriginal => ({
  ...(await importOriginal<typeof import('../server/election-list-query')>()),
  buildElectionListQuery: () => Promise.reject(new Error(failure.message)),
}));

import { DatabaseStorage } from '../server/storage';
import { adminElectionLookupHandler } from '../server/admin-election-lookup';
import { electionListHandler } from '../server/election-list-handler';

const q = '/api/admin/elections?from=2026-03-03&to=2026-03-03';
const appFor = (storage: any) => express().get('/api/admin/elections', adminElectionLookupHandler(storage));

describe('admin lookup on the real DatabaseStorage', () => {
  it('legacy storage fallback still resolves [], but the public strict handler refuses it', async () => {
    const storage = new DatabaseStorage();
    await expect(storage.getElections({} as any)).resolves.toEqual([]);
    const res = await request(express().get('/api/elections', electionListHandler(storage))).get('/api/elections');
    expect([res.status, res.body.code]).toEqual([503, 'listing_unavailable']);
  });
  it('strict path rejects with the database error', async () => {
    const error: any = await new DatabaseStorage().getElectionsStrict({} as any).then(() => null, e => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/endpoint has been disabled/);
  });
  it('the admin endpoint answers 503 lookup_unavailable, never 200 []', async () => {
    const res = await request(appFor(new DatabaseStorage())).get(q);
    expect([res.status, res.body.code]).toEqual([503, 'lookup_unavailable']);
    expect(Array.isArray(res.body)).toBe(false);
  });
});
