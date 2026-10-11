import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { FecAction, FecRow } from '../server/fec-candidate-sync';

export interface ExpectedRegistration { electionId: number; record: FecRow }

/** Independent catalog SQL: only the six corrected Louisiana House primaries. */
export async function expectedLouisianaRegistrations(pool: Pool, rows: FecRow[]): Promise<ExpectedRegistration[]> {
  const races = (await pool.query(`SELECT id,title FROM elections WHERE state='LA'
    AND date::date='2026-11-03' AND lower(level)='federal' AND lower(type)='primary'
    AND offices=ARRAY['U.S. House of Representatives']::text[] ORDER BY title`)).rows;
  if (!races.length) return []; // The uncorrected main catalog still has general contests.
  assert.deepEqual(races.map(r => r.title), Array.from({length:6},(_,i)=>`U.S. House Election - LA-0${i+1}`));
  const expected = (await pool.query(`SELECT e.id AS "electionId", r.value AS record
    FROM jsonb_array_elements($1::jsonb) r(value) JOIN elections e
    ON e.title='U.S. House Election - LA-'||(r.value->>'district')
    WHERE r.value->>'state'='LA' AND r.value->>'office'='H'
      AND e.id=ANY($2::int[]) ORDER BY r.value->>'candId'`, [JSON.stringify(rows),races.map(r=>r.id)])).rows;
  assert.equal(expected.length, rows.filter(r=>r.state==='LA' && r.office==='H').length);
  assert(expected.length > 0);
  return expected;
}

export function assertRegistrationActions(actions: FecAction[], expected: ExpectedRegistration[]) {
  const ordered = (rows: unknown[]) => rows.map(r=>JSON.stringify(r)).sort();
  assert(actions.every(a=>a.kind==='insert' && a.candidateId == null), 'Registration stage permits only independently expected new inserts');
  assert.deepEqual(ordered(actions.map(a=>({electionId:a.electionId,record:a.record}))),
    ordered(expected.map(e=>({electionId:e.electionId,record:e.record}))), 'Exact LA registration action set');
}
