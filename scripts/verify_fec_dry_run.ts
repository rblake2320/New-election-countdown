/** Read-only source-data acceptance against the intended local ElectionTracker DB. */
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { extractFecMaster } from '../server/fec-source-artifacts';
import assert from 'node:assert/strict';
import { parseFecMaster, runFecSync, FEC_MASTER_URL } from '../server/fec-candidate-sync';
config({ path: process.env.ELECTION_ENV_FILE || '.env' });
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Pass the retained official source ZIP');
const bytes = readFileSync(sourcePath);
const hash = createHash('sha256').update(bytes).digest('hex');
const source = await extractFecMaster(bytes);
const parsed = parseFecMaster(source);
assert.equal(parsed.total, parsed.rows.length + parsed.filtered + parsed.incomplete + parsed.duplicateIds);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, options: '-c default_transaction_read_only=on' });
async function fingerprint() {
  const data = await pool.query("SELECT count(*)::int AS count, md5(coalesce(string_agg(row_to_json(c)::text, '' ORDER BY id), '')) AS digest FROM candidates c");
  return data.rows[0];
}
try {
  const before = await fingerprint();
  const plan = await runFecSync(pool, parsed.rows, hash, false);
  const after = await fingerprint();
  assert.deepEqual(after, before, 'Dry-run altered source candidates');
  assert.equal(parsed.rows.length, plan.actions.length + plan.unchanged + plan.unmatched.length);
  const unresolved: Record<string, number> = {};
  for (const item of plan.unmatched) unresolved[item.reason] = (unresolved[item.reason] ?? 0) + 1;
  const counts: Record<string, number> = {};
  for (const item of plan.actions) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
  const receipt = { outcome: 'worked', source_url: FEC_MASTER_URL, source_sha256: hash, source_zip: sourcePath,
    git_head: execFileSync('git', ['rev-parse','HEAD'], { encoding: 'utf8' }).trim(),
    source_rows: parsed.total, eligible: parsed.rows.length, filtered: parsed.filtered, incomplete: parsed.incomplete,
    source_row_conservation: true, plan_row_conservation: true, actions: counts, unresolved,
    candidate_table_before: before, candidate_table_after: after, candidate_table_unchanged: true,
    database_session_read_only: (await pool.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,
    applied: false, label: 'FEC filings; not general-election nominees or certified ballot coverage' };
  writeFileSync('artifacts/lane-c/fec-live-dry-run.json', JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt));
} finally { await pool.end(); }
