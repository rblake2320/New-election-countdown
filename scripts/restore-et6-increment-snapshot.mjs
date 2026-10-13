// Restore only the pinned, actual C postapply source rows into a fresh D-owned DB.
// The raw snapshot remains private. This script never prints rows or connection data.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import pg from 'pg';

const FILE_SHA = 'a3901dba6dcc1158b19e3631e812b9f659a1c68480d35466b578d000d1d17719';
const SOURCE_SHA = '769c35bb4b850257f9409ee567da95e00b271855d510cbb0015e8557e431f93a';
const TABLES = ['elections', 'candidates', 'candidate_source_records', 'general_candidate_list_snapshots', 'candidate_ingest_runs', 'election_catalog_correction_runs', 'official_results_sync_runs'];
const EXPECTED_COUNTS = [537, 3480, 3943, 539, 4, 1, 1];
const sha = value => createHash('sha256').update(value).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.entries(value)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item)).join(',') + '}';
  return JSON.stringify(value);
}
const refuse = code => { const error = new Error(code); error.safeCode = code; throw error; };

let client;
let inTransaction = false;
try {
  const host = process.env.ET6_EXPECTED_DB_HOST;
  if (!host || !/^et6-prod-[a-z0-9-]+-db$/.test(host)) refuse('EXPECTED_PRIVATE_HOST_REQUIRED');
  const raw = readFileSync('/tmp/source-snapshot.json');
  if (sha(raw) !== FILE_SHA) refuse('SNAPSHOT_FILE_HASH_MISMATCH');
  const snapshot = JSON.parse(raw.toString('utf8'));
  if (snapshot.version !== 1 || snapshot.database !== 'elections' || !snapshot.tables ||
      Object.keys(snapshot.tables).sort().join('|') !== [...TABLES].sort().join('|') ||
      TABLES.some((table, index) => !Array.isArray(snapshot.tables[table]) || snapshot.tables[table].length !== EXPECTED_COUNTS[index]) ||
      snapshot.hash !== SOURCE_SHA || sha(canonical(snapshot.tables)) !== SOURCE_SHA) refuse('SOURCE_SNAPSHOT_MISMATCH');

  client = new pg.Client(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {});
  const target = client.connectionParameters;
  if (target.host !== host || target.database !== 'et6_receiving' || Number(target.port) !== 5432) refuse('PRIVATE_TARGET_MISMATCH');
  await client.connect();
  const identity = (await client.query('SELECT current_database() AS database, inet_server_port() AS port')).rows[0];
  if (identity.database !== 'et6_receiving' || identity.port !== 5432) refuse('PRIVATE_DATABASE_IDENTITY_MISMATCH');
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  inTransaction = true;
  await client.query("SET LOCAL TIME ZONE 'UTC'");
  await client.query("SET LOCAL statement_timeout = '120s'");
  await client.query("SET LOCAL lock_timeout = '5s'");
  // Identifiers are exclusively the fixed table allowlist, never row content.
  await client.query('LOCK TABLE ' + TABLES.map(table => `public."${table}"`).join(', ') + ' IN ACCESS EXCLUSIVE MODE');
  for (const table of TABLES) {
    if ((await client.query(`SELECT count(*)::text AS count FROM public."${table}"`)).rows[0].count !== '0') refuse('PRIVATE_SOURCE_TABLE_NOT_EMPTY');
    const columns = (await client.query(
      "SELECT column_name, is_generated FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
      [table],
    )).rows;
    if (!columns.length || columns.some(column => column.is_generated !== 'NEVER')) refuse('PRIVATE_SOURCE_SCHEMA_MISMATCH');
    const expectedKeys = columns.map(column => column.column_name).sort().join('|');
    if (snapshot.tables[table].some(row => row === null || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).sort().join('|') !== expectedKeys)) refuse('PRIVATE_SOURCE_SCHEMA_MISMATCH');
  }
  for (const table of TABLES) {
    await client.query(`INSERT INTO public."${table}" SELECT * FROM jsonb_populate_recordset(NULL::public."${table}", $1::jsonb)`, [JSON.stringify(snapshot.tables[table])]);
  }
  const restored = {};
  for (const table of TABLES) restored[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM public."${table}" t ORDER BY t.id`)).rows.map(result => result.row);
  if (sha(canonical(restored)) !== SOURCE_SHA) refuse('RESTORED_SOURCE_HASH_MISMATCH');
  // Sequence values are not transactional in PostgreSQL. Bump them only after
  // every row/hash check; a later failure can leave an advanced private sequence,
  // but all inserted rows still roll back and no shared database is targeted.
  for (const table of TABLES) {
    const sequence = (await client.query("SELECT pg_get_serial_sequence($1, 'id') AS sequence", ['public.' + table])).rows[0].sequence;
    if (sequence) {
      const maximum = (await client.query(`SELECT max(id)::text AS maximum FROM public."${table}"`)).rows[0].maximum;
      await client.query('SELECT setval($1::regclass, $2::bigint, $3::boolean)', [sequence, maximum ?? '1', maximum !== null]);
    }
  }
  await client.query('COMMIT');
  inTransaction = false;
  console.log(JSON.stringify({ outcome: 'Worked', fileSha256: FILE_SHA, sourceSha256: SOURCE_SHA, counts: Object.fromEntries(TABLES.map(table => [table, restored[table].length])) }));
} catch (error) {
  if (client && inTransaction) await client.query('ROLLBACK').catch(() => {});
  console.error(JSON.stringify({ outcome: 'Failed', code: error.safeCode ?? 'PRIVATE_SOURCE_RESTORE_FAILED' }));
  process.exitCode = 1;
} finally {
  if (client) await client.end().catch(() => {});
}
