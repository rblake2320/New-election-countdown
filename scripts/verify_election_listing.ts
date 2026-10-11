/** Read-only PostgreSQL + real HTTP acceptance. Never seeds or mutates data. */
import { config } from 'dotenv';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import express from 'express';
import * as schema from '../shared/schema';
import { buildElectionListQuery } from '../server/election-list-query';
import { electionListHandler } from '../server/election-list-handler';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

config({ path: process.env.ELECTION_ENV_FILE ?? '.env' });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, options: '-c default_transaction_read_only=on' });
const database = drizzle({ client: pool, schema });
const measuredAt = new Date();
const clock = () => measuredAt;
let statementCount = 0;
const query = pool.query.bind(pool);
pool.query = ((...args: any[]) => { statementCount++; return (query as any)(...args); }) as any;
const app = express();
app.get('/api/elections', electionListHandler({ getElections: filters => buildElectionListQuery(database, filters, clock()) }, clock));
const server = app.listen(0, '127.0.0.1');
const outcomes: Record<string, unknown>[] = [];
try {
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const checks = ['', '?timeframe=next-30-days', '?level=federal', '?level=Federal', '?party=D', '?party=Democratic', '?timeframe=typo'];
  const seen = new Map<string, any[]>();
  for (const params of checks) {
    const start = performance.now();
    statementCount = 0;
    const response = await fetch(origin + '/api/elections' + params);
    const body = await response.json();
    const durationMs = performance.now() - start;
    if (params === '?timeframe=typo') {
      assert.equal(response.status, 400);
      assert.equal(statementCount, 0);
      outcomes.push({ query: params, status: response.status, sql_statements: statementCount, duration_ms: durationMs });
      continue;
    }
    assert.equal(response.status, 200);
    assert.equal(statementCount, 1, 'candidate counts must not require a query per election');
    assert(Array.isArray(body));
    assert(body.every(row => Number.isInteger(row.candidateCount) && row.candidateCount >= 0));
    if (params.includes('timeframe')) assert(body.every(row => row.date.slice(0, 10) >= measuredAt.toISOString().slice(0, 10)));
    seen.set(params, body);
    outcomes.push({ query: params, status: response.status, rows: body.length, sql_statements: statementCount, duration_ms: durationMs });
  }
  assert.deepEqual(seen.get('?level=federal'), seen.get('?level=Federal'));
  assert.deepEqual(seen.get('?party=D'), seen.get('?party=Democratic'));
  const control = await query('select e.id, count(c.id)::int as count from elections e left join candidates c on c.election_id=e.id where e.is_active=true group by e.id');
  const counts = new Map(control.rows.map(row => [row.id, row.count]));
  for (const row of seen.get('') ?? []) assert.equal(row.candidateCount, counts.get(row.id));
  const output = join(process.cwd(), 'artifacts', 'lane-c');
  mkdirSync(output, { recursive: true });
  const receipt = { measured_at: measuredAt.toISOString(), database_read_only: true, http_handler: 'server/election-list-handler.ts', outcomes, candidate_counts_match_independent_sql: true, aliases_match: true };
  writeFileSync(join(output, 'filters-live-postgres.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
}
