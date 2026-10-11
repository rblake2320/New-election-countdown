import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { parseNomineeManifest, runNomineeRefresh } from '../server/candidate-nominee-sync';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const origin = process.env.INTERNAL_APP_ORIGIN;
assert(origin && /^http:\/\/et-app-[\w-]+:5000$/.test(origin), 'Only the harness-owned app is allowed');
try {
  assert.equal((await pool.query('select current_database() as name')).rows[0].name, 'et_test');
  for (const file of ['20261011_candidate_source_records.sql', '20261011_general_candidate_list_snapshots.sql']) {
    await pool.query(readFileSync(`migrations/${file}`, 'utf8'));
    await pool.query(readFileSync(`migrations/${file}`, 'utf8'));
  }
  const bytes = readFileSync('data/nominees/combined-2026-reviewed.json');
  const manifest = parseNomineeManifest(JSON.parse(bytes.toString()));
  const hash = createHash('sha256').update(bytes).digest('hex');
  const ids = (await pool.query('select id from candidates order by id')).rows.map(r => r.id);
  const digest = async () => (await pool.query("select md5(string_agg(row_to_json(c)::text,'' order by id)) as digest from candidates c where id=any($1::int[])", [ids])).rows[0].digest;
  const before = await digest();
  const dry = await runNomineeRefresh(pool, manifest, hash, false);
  assert.equal(dry.unresolved.length, 0);
  assert.equal(dry.actions.length, 259);
  assert.equal(await digest(), before);
  const first = await runNomineeRefresh(pool, manifest, hash, true);
  assert.equal(await digest(), before, 'Existing profiles/provenance must be preserved');
  const repeat = await runNomineeRefresh(pool, manifest, hash, true);
  assert.equal(repeat.candidateInserts, 0);
  assert.equal(repeat.sourceChanges, 0);
  const races = [...new Set(first.actions.map(a => a.electionId))];
  const outcomes = [];
  let records = 0;
  for (const id of races) {
    const response = await fetch(`${origin}/api/elections/${id}/general-candidates`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'sourced');
    const expected = (await pool.query("select distinct c.id from candidates c join candidate_source_records s on s.candidate_id=c.id where c.election_id=$1 and s.source_layer='general_candidate_list' and s.is_current=true order by c.id", [id])).rows.map(r => r.id);
    assert.deepEqual(body.candidates.map(c => c.id).sort((a,b) => a-b), expected);
    assert(['complete', 'scoped', 'unspecified'].includes(body.coverage));
    for (const candidate of body.candidates) {
      assert(candidate.generalListSourceUrl.startsWith('https://'));
      assert.equal(candidate.generalListSource.ballotCertificationPromoted, false);
    }
    records += body.candidates.length;
    outcomes.push({ electionId: id, rows: body.candidates.length, coverage: body.coverage });
  }
  assert.equal(races.length, 91);
  assert.equal(records, 259);
  console.log(JSON.stringify({ migrationsAppliedTwice: true, manifestSha256: hash,
    originalCandidates: ids.length, originalProfilesPreserved: true,
    candidateInserts: first.candidateInserts, sourceChanges: first.sourceChanges,
    repeatCandidateInserts: 0, repeatSourceChanges: 0, compiledHttpRaces: races.length,
    compiledHttpRecords: records, outcomes }));
} finally { await pool.end(); }
