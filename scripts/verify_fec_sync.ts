/** Synthetic fixture only: atomicity, provenance preservation, repeat-run no-op. */
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import pg from 'pg';
import { parseFecMaster, runFecSync } from '../server/fec-candidate-sync';
import { persistFecManifest } from '../server/fec-source-artifacts';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const line = (id: string, name: string, party = 'REP') => [id,name,party,'2026','TX','H','01','C','C','C00000001','','','','',''].join('|');
const hash = 'a'.repeat(64);
async function snapshot(): Promise<string> {
  const q = await pool.query("SELECT md5(coalesce(string_agg(row_to_json(c)::text, '' ORDER BY id), '')) AS digest FROM candidates c");
  return q.rows[0].digest;
}
try {
  const identity = await pool.query('SELECT current_database() AS name');
  assert.equal(identity.rows[0].name, 'et_sol_c_fec_test', 'Use only the dedicated disposable fixture');
  await pool.query(`CREATE TABLE elections (id serial PRIMARY KEY,state text,title text,level text,type text,date timestamp,offices text[]);
    CREATE TABLE candidates (id serial PRIMARY KEY,election_id int REFERENCES elections(id),name text NOT NULL,party text,fec_candidate_id text,fec_status text,data_source text,source_status text,source_file_sha256 text,source_synced_at timestamp,updated_at timestamp,description text,is_incumbent boolean,normalized_name text,ballot_status text,ballot_source_url text,polling_support int,polling_trend text);
    INSERT INTO elections (state,title,level,type,date,offices) VALUES ('TX','U.S. House Election - TX-01','federal','general','2026-11-03',ARRAY['U.S. House of Representatives']);
    INSERT INTO candidates (election_id,name,party,description,ballot_status,ballot_source_url,data_source,source_status,source_file_sha256,source_synced_at)
      VALUES (1,'Alex Example','Democratic','Existing independently authored fixture','certified','https://example.test/isolated-fixture','state_ballot','ballot_certified','dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd','2026-09-11');`);
  await pool.query(readFileSync('migrations/20261011_candidate_source_records.sql', 'utf8'));
  await pool.query(readFileSync('migrations/20261011_candidate_source_records.sql', 'utf8'));
  const rows = parseFecMaster([line('H6TX01001','EXAMPLE, ALEX','DEM'),line('H6TX01002','DISTINCT, TAYLOR'),line('H6TX01003',"O'BRIEN, JO",'')].join('\n')).rows;
  const initial = await snapshot();
  const dry = await runFecSync(pool, rows, hash, false);
  assert.equal(dry.actions.length, 3);
  assert.equal(await snapshot(), initial);
  const first = await runFecSync(pool, rows, hash, true);
  assert.equal(first.actions.length, 3);
  const after = await snapshot();
  const editorial = (await pool.query('SELECT * FROM candidates WHERE id=1')).rows[0];
  assert.equal(editorial.ballot_status, 'certified');
  assert.equal(editorial.ballot_source_url, 'https://example.test/isolated-fixture');
  assert.equal(editorial.data_source, 'state_ballot');
  assert.equal(editorial.source_status, 'ballot_certified');
  assert.equal(editorial.source_file_sha256, 'd'.repeat(64));
  assert.equal((await pool.query('SELECT source_synced_at::text AS value FROM candidates WHERE id=1')).rows[0].value, '2026-09-11 00:00:00');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM candidate_source_records WHERE candidate_id=1 AND source_file_sha256=$1', [hash])).rows[0].n, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM candidate_ingest_runs WHERE id=$1', [first.auditId])).rows[0].n, 1);
  const diskFailure = persistFecManifest('isolated-fixture',hash,{mode:'applied',database_audit_id:first.auditId},()=> { throw Object.assign(new Error('injected fixture ENOSPC'),{code:'ENOSPC'}); });
  assert.equal(diskFailure.outcome, 'applied');
  assert.equal(diskFailure.receipt_file, null);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM candidate_ingest_runs WHERE id=$1', [diskFailure.database_audit_id])).rows[0].n, 1);
  assert.equal(editorial.party, 'Democratic');
  assert.equal(editorial.description, 'Existing independently authored fixture');
  const imported = (await pool.query('SELECT * FROM candidates WHERE id>1 ORDER BY id')).rows;
  assert.equal(imported.length, 2);
  for (const c of imported) { assert.equal(c.source_status, 'fec_registered'); assert.equal(c.ballot_status, 'not_certified'); assert.equal(c.polling_support, null); }
  assert.equal(imported[1].name, "Jo O'Brien");
  assert.equal(imported[1].party, 'O');
  const repeat = await runFecSync(pool, rows, hash, true);
  assert.equal(repeat.actions.length, 0);
  assert.equal(repeat.unchanged, 3);
  assert.equal(await snapshot(), after);
  await pool.query(`CREATE FUNCTION reject_fixture_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='Failure Example' THEN RAISE EXCEPTION 'injected fixture failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fixture_failure BEFORE INSERT ON candidates FOR EACH ROW EXECUTE FUNCTION reject_fixture_insert();`);
  const provenanceBefore = (await pool.query('SELECT (SELECT count(*) FROM candidate_source_records)::int AS sources,(SELECT count(*) FROM candidate_ingest_runs)::int AS runs')).rows[0];
  let rejected = false;
  try { await runFecSync(pool, [...rows, ...parseFecMaster(line('H6TX01004','EXAMPLE, FAILURE')).rows], 'b'.repeat(64), true); }
  catch (error) { rejected = (error as { code?: string }).code === 'P0001'; }
  assert(rejected, 'Injected write failure must propagate');
  assert.equal(await snapshot(), after, 'Earlier updates/inserts must roll back');
  assert.deepEqual((await pool.query('SELECT (SELECT count(*) FROM candidate_source_records)::int AS sources,(SELECT count(*) FROM candidate_ingest_runs)::int AS runs')).rows[0], provenanceBefore, 'Source layers and receipt must roll back with candidate writes');
  const concurrentRows = parseFecMaster(line('H6TX01005','CONCURRENT, TAYLOR')).rows;
  const concurrent = await Promise.all([runFecSync(pool, concurrentRows, hash, true), runFecSync(pool, concurrentRows, hash, true)]);
  assert.equal(concurrent.reduce((n,p) => n+p.actions.length, 0), 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM candidates WHERE fec_candidate_id=$1', ['H6TX01005'])).rows[0].n, 1);
  const changedParty = parseFecMaster(line('H6TX01002','DISTINCT, TAYLOR','DEM')).rows;
  const refreshed = await runFecSync(pool, changedParty, 'c'.repeat(64), true);
  assert.equal(refreshed.actions.length, 1);
  assert.equal((await pool.query('SELECT party FROM candidates WHERE fec_candidate_id=$1', ['H6TX01002'])).rows[0].party, 'D');
  const restored = await runFecSync(pool,parseFecMaster(line('H6TX01002','DISTINCT, TAYLOR','REP')).rows,hash,true);
  assert.equal(restored.actions.length,1);
  assert.equal((await pool.query('SELECT party FROM candidates WHERE fec_candidate_id=$1',['H6TX01002'])).rows[0].party,'R');
  const current = (await pool.query('SELECT s.source_file_sha256 FROM candidate_source_records s JOIN candidates c ON c.id=s.candidate_id WHERE c.fec_candidate_id=$1 AND s.is_current=true',['H6TX01002'])).rows;
  assert.deepEqual(current,[{source_file_sha256:hash}]);
  const receipt = { outcome: 'worked', fixture: 'isolated synthetic PostgreSQL', checks: { dry_run_no_writes: true, atomic_apply: true, exact_repeat_no_candidate_changes: true, migration_idempotent: true, existing_ballot_hash_and_timestamp_preserved: true, separate_fec_source_retained: true, transactional_apply_receipt: true, committed_receipt_survives_local_disk_failure: true, registration_never_certified: true, unknown_party_not_independent: true, parameterized_apostrophe_name: true, injected_failure_full_rollback: true, concurrent_apply_one_identity: true, imported_party_refresh: true, historical_source_reactivation_updates_current_version: true }, first_actions: first.actions.length, repeated_actions: repeat.actions.length };
  writeFileSync('artifacts/lane-c/fec-private-postgres.json', JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt));
} finally { await pool.end(); }
