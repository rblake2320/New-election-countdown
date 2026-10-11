// Private acceptance only: real OS permission failure after a real CLI commit.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import pg from 'pg';
const [manifestSha256, preimageSha256, postimageSha256] = process.argv.slice(1);
assert.ok([manifestSha256, preimageSha256, postimageSha256].every(hash => /^[a-f0-9]{64}$/.test(hash)));
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/et_c6_test');
const directory = '/app/artifacts/c6-receipt-fault';
const destination = directory + '/receipt.json';
await fs.mkdir(directory, { recursive: false });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const blocker = await pool.connect();
let child;
try {
  await blocker.query('BEGIN');
  await blocker.query('SELECT pg_advisory_xact_lock(2026110301)');
  child = spawn(process.execPath, ['dist/sync_official_results.js', '--apply',
    '--expect-sha256', manifestSha256, '--expect-preimage-sha256', preimageSha256,
    '--receipt', destination], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stdout.resume(); child.stderr.on('data', data => { stderr += data.toString(); });
  const finished = new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  let preflight = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await fs.readdir(directory)).some(file => file.startsWith('receipt.json.tmp-'))) { preflight = true; break; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.ok(preflight, 'Temporary output must be preflighted before acquiring the writer lock');
  // The already-open receipt file can be written; renaming in this directory
  // will fail for the actual non-root runtime user after the DB commit.
  await fs.chmod(directory, 0o555);
  await blocker.query('ROLLBACK');
  assert.equal(await finished, 1);
  const receipt = JSON.parse(await fs.readFile(destination, 'utf8'));
  assert.equal(receipt.outcome, 'Applied');
  assert.equal(receipt.committed, true);
  assert.equal(receipt.receiptExport, 'Failed');
  assert.equal(receipt.errorCode, 'EACCES');
  assert.ok(receipt.runId);
  assert.ok(stderr.includes(receipt.runId));
  const audit = (await pool.query('SELECT * FROM public.official_results_sync_runs WHERE id=$1', [receipt.runId])).rows[0];
  assert.equal(audit.postimage_sha256, postimageSha256);
  assert.ok(audit.changed_count > 450);
  const retained = JSON.parse(await fs.readFile(receipt.temporaryReceipt, 'utf8'));
  assert.equal(retained.runId, receipt.runId);
  assert.equal(retained.postimageSha256, postimageSha256);
  console.log(JSON.stringify({ outcome: 'Worked', scenario: 'actual non-root chmod denies postcommit rename',
    durableAuditPreserved: true, temporaryReceiptPreserved: true, operatorOutcome: receipt.outcome,
    runId: receipt.runId, changedCount: audit.changed_count, preflightBeforeDB: true }));
} finally {
  await fs.chmod(directory, 0o755);
  await blocker.query('ROLLBACK').catch(() => {});
  blocker.release(); await pool.end();
  if (child && child.exitCode === null) child.kill('SIGTERM');
}
