/** Synthetic acceptance in an owned disposable DB; refuses every other database. */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { buildElectionListQuery } from '../server/election-list-query';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const database = drizzle({ client: pool, schema });
try {
  const identity = await pool.query('select current_database() as name');
  assert.equal(identity.rows[0].name, 'et_sol_c_timezone_test', 'fixture writes require the dedicated disposable test DB');
  await pool.query(`
    create table elections (id int primary key, title text not null, subtitle text, location text not null,
      state text not null, date timestamp not null, type text not null, level text not null,
      offices text[], description text, polls_open text, polls_close text, timezone text,
      poll_close_kind text, poll_hours_basis text, poll_hours_source text, is_active boolean);
    create table candidates (id int primary key, election_id int, party text);
    insert into elections(id,title,location,state,date,type,level,timezone,is_active) values
      (1,'Timezone fixture East','Fixture','NY','2026-11-03','general','federal','America/New_York',true),
      (2,'Timezone fixture West','Fixture','AK','2026-11-03','general','federal','America/Adak',true),
      (3,'Timezone fixture Unknown','Fixture','HI','2026-11-03','general','federal','Invalid/Zone',true),
      (4,'Timezone fixture Next day','Fixture','CO','2026-11-04','general','federal','America/Denver',true),
      (5,'Timezone fixture Month end','Fixture','NY','2026-02-28','general','federal','America/New_York',true),
      (6,'Timezone fixture Next month','Fixture','NY','2026-03-01','general','federal','America/New_York',true);
    insert into candidates values (10,1,null),(11,2,'D'),(12,2,'Republican'),(13,4,'DEM/PROG');
    set default_transaction_read_only=on;
  `);
  const outcomes: Record<string, unknown>[] = [];
  for (const [time, expected] of [
    ['2026-11-04T03:30:00Z', [1,2,3,4]],
    ['2026-11-04T05:30:00Z', [2,3,4]],
    ['2026-11-04T11:01:00Z', [4]],
  ] as const) {
    const rows = await buildElectionListQuery(database, { timeframe: 'upcoming' }, new Date(time));
    const actual = rows.map(row => row.id);
    assert.deepEqual(actual, expected);
    outcomes.push({ scenario: 'upcoming', time, expected, actual });
  }
  const other = await buildElectionListQuery(database, { party: 'O' }, new Date('2026-11-04T05:30:00Z'));
  assert.deepEqual(other.map(row => row.id), [1,4]);
  assert.equal(other[0].candidateCount, 1);
  outcomes.push({ scenario: 'legacy NULL and minor fusion component match Other', expected: [1,4], actual: other.map(row => row.id) });
  const fusionDem=await buildElectionListQuery(database,{party:'D'},new Date('2026-11-04T05:30:00Z'));
  assert.deepEqual(fusionDem.map(row=>row.id),[2,4]);
  assert.deepEqual(fusionDem.map(row=>row.candidateCount),[2,1]);
  outcomes.push({scenario:'one fusion identity matches its Democratic component without changing full counts',expected:[2,4],actual:fusionDem.map(row=>row.id),candidateCounts:fusionDem.map(row=>row.candidateCount)});
  const month = await buildElectionListQuery(database, { timeframe: 'month' }, new Date('2026-01-31T12:00:00Z'));
  assert.deepEqual(month.map(row => row.id), [5]);
  outcomes.push({ scenario: 'calendar month clamps to February end', expected: [5], actual: month.map(row => row.id) });
  mkdirSync('artifacts/lane-c', { recursive: true });
  const receipt = { synthetic_private_database: true, source_database_untouched: true, postgres_actual_execution: true, outcomes };
  writeFileSync('artifacts/lane-c/timezone-private-postgres.json', JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
} finally { await pool.end(); }
