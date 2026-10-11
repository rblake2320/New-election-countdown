import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { buildElectionListQuery } from '../server/election-list-query';
import { normalizeElectionFilters } from '../server/election-list-filters';
import express from 'express';
import request from 'supertest';
import { electionListHandler } from '../server/election-list-handler';

const database = drizzle({ client: { query: () => { throw new Error('Compiler test must not connect'); } } as any, schema });
const now = new Date('2026-10-11T14:30:00Z');

describe('database listing query contract', () => {
  it('compiles a single grouped statement with date filtering and full candidate counts', () => {
    const { sql, params } = buildElectionListQuery(database, { timeframe: 'next-30-days', party: 'Democratic', level: 'Federal' }, now).toSQL();
    expect(sql).toContain('count("candidates"."id")');
    expect(sql).toContain('left join "candidates"');
    expect(sql).toContain('exists (select 1');
    expect(sql).toContain('group by "elections"."id"');
    expect(params).toContain('2026-10-11T00:00:00.000Z');
    expect(params).toContain('2026-11-11T00:00:00.000Z');
    expect(params).toContain('federal');
    expect(params).toContain('democratic');
  });
  it('keeps injected search text in parameters and treats wildcard input literally', () => {
    const term = "x%' OR 1=1 --";
    const query = buildElectionListQuery(database, { search: term }, now).toSQL();
    expect(query.sql).not.toContain(term);
    expect(query.params).toContain("%x\\%' OR 1=1 --%");
  });
  it('handles month-end and leap-year windows without skipping into another month', () => {
    expect(normalizeElectionFilters({ timeframe: 'month' }, new Date('2026-01-31T12:00:00Z')).until?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(normalizeElectionFilters({ timeframe: 'year' }, new Date('2028-02-29T12:00:00Z')).until?.toISOString()).toBe('2029-03-01T00:00:00.000Z');
  });
  it('rejects malformed scalar fields, conflicting ranges and mixed all selections', () => {
    for (const filters of [{ cycle: ['2026'] }, { cycle: '2026junk' }, { state: {} }, { level: ['all', 'federal'] }, { timeframe: 'week', timeRange: 'year' }]) {
      expect(() => normalizeElectionFilters(filters, now)).toThrow();
    }
    expect(normalizeElectionFilters({ search: 'all' }, now).search).toBe('all');
  });
});

describe('HTTP listing contract', () => {
  it('rejects invalid filters before reading storage', async () => {
    let reads = 0;
    const app = express();
    app.get('/api/elections', electionListHandler({ getElections: async () => { reads++; return []; } }, () => now));
    await request(app).get('/api/elections?timeframe=typo').expect(400);
    expect(reads).toBe(0);
  });
  it('reports a storage exception as unavailable instead of returning a healthy empty list', async () => {
    const app = express();
    app.get('/api/elections', electionListHandler({ getElections: async () => { throw new Error('private connection detail'); } }, () => now));
    const result = await request(app).get('/api/elections').expect(503);
    expect(result.body).toEqual({ error: 'Election listing temporarily unavailable' });
  });
});
