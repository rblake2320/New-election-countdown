import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const state = vi.hoisted(() => ({ error: 'The endpoint has been disabled. Enable it using Neon API and retry.', reads: 0 }));
vi.mock('../server/db', () => ({ db: {}, pool: { query: async () => { throw new Error(state.error); } }, testDatabaseConnection: async () => ({ success: false, error: 'private unavailable' }), connectWithRetry: vi.fn() }));
vi.mock('../server/election-list-query', async original => ({
  ...(await original<typeof import('../server/election-list-query')>()),
  buildElectionListQuery: () => { state.reads++; return state.error ? Promise.reject(new Error(state.error)) : Promise.resolve([]); },
}));
import { DatabaseStorage } from '../server/storage';
import { electionListHandler } from '../server/election-list-handler';
import { StorageFactory, storageFactory } from '../server/storage-factory';
const app = () => express().get('/api/elections', electionListHandler(new DatabaseStorage()));
afterAll(() => storageFactory.destroy());
beforeEach(() => { state.error = 'The endpoint has been disabled. Enable it using Neon API and retry.'; state.reads = 0; });
describe('public list uses strict DatabaseStorage reads', () => {
  it('disabled database is typed503, never a healthy empty list', async () => {
    const res = await request(app()).get('/api/elections');
    expect([res.status, res.body.code]).toEqual([503, 'listing_unavailable']);
    expect(Array.isArray(res.body)).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('Neon');
  });
  it('healthy legitimate empty remains200[]', async () => {
    state.error = '';
    const res = await request(app()).get('/api/elections');
    expect([res.status, res.body]).toEqual([200, []]);
  });
  it('invalid filter400 precedes any database read', async () => {
    const res = await request(app()).get('/api/elections?timeframe=typo');
    expect(res.status).toBe(400); expect(state.reads).toBe(0);
  });
  it('other driver failure is typed503 too', async () => {
    state.error = 'connect ECONNREFUSED private-host:5432';
    const res = await request(app()).get('/api/elections');
    expect([res.status, res.body.code]).toEqual([503, 'listing_unavailable']);
    expect(JSON.stringify(res.body)).not.toContain('private-host');
  });
  it('actual factory strict method refuses degraded memory even when its fallback would be empty', async () => {
    const factory = Object.create(StorageFactory.prototype) as StorageFactory;
    const empty = { getElections: async () => [] };
    Object.assign(factory, { currentStorage: empty, memoryStorage: empty });
    const res = await request(express().get('/api/elections', electionListHandler(factory))).get('/api/elections');
    expect([res.status, res.body.code]).toEqual([503, 'listing_unavailable']);
  });
});
