/** Synthetic fixture only: atomicity, provenance preservation, repeat-run no-op. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import pg from 'pg';
import { parseFecMaster, runFecSync } from '../server/fec-candidate-sync';
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
    INSERT INTO candidates (election_id,name,party,description,ballot_status,ballot_source_url) VALUES (1,'Alex Example','Democratic','Existing independently authored fixture','certified','https://example.test/isolated-fixture');`);
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
  assert.equal(editorial.data_source, null);
  assert.equal(editorial.source_status, null);
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
  let rejected = false;
  try { await runFecSync(pool, [...rows, ...parseFecMaster(line('H6TX01004','EXAMPLE, FAILURE')).rows], 'b'.repeat(64), true); }
  catch (error) { rejected = (error as { code?: string }).code === 'P0001'; }
  assert(rejected, 'Injected write failure must propagate');
  assert.equal(await snapshot(), after, 'Earlier updates/inserts must roll back');
  const concurrentRows = parseFecMaster(line('H6TX01005','CONCURRENT, TAYLOR')).rows;
  const concurrent = await Promise.all([runFecSync(pool, concurrentRows, hash, true), runFecSync(pool, concurrentRows, hash, true)]);
  assert.equal(concurrent.reduce((n,p) => n+p.actions.length, 0), 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM candidates WHERE fec_candidate_id=$1', ['H6TX01005'])).rows[0].n, 1);
  const changedParty = parseFecMaster(line('H6TX01002','DISTINCT, TAYLOR','DEM')).rows;
  const refreshed = await runFecSync(pool, changedParty, 'c'.repeat(64), true);
  assert.equal(refreshed.actions.length, 1);
  assert.equal((await pool.query('SELECT party FROM candidates WHERE fec_candidate_id=$1', ['H6TX01002'])).rows[0].party, 'D');
  const receipt = { outcome: 'worked', fixture: 'isolated synthetic PostgreSQL', checks: { dry_run_no_writes: true, atomic_apply: true, exact_repeat_no_changes: true, existing_ballot_and_provenance_preserved: true, registration_never_certified: true, unknown_party_not_independent: true, parameterized_apostrophe_name: true, injected_failure_full_rollback: true, concurrent_apply_one_identity: true, imported_party_refresh: true }, first_actions: first.actions.length, repeated_actions: repeat.actions.length };
  writeFileSync('artifacts/lane-c/fec-private-postgres.json', JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt));
} finally { await pool.end(); }
