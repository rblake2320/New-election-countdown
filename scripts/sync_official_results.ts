import 'dotenv/config';
import pg from 'pg';
import { open, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadResultsManifest } from '../server/official-results-manifest';
import { syncOfficialResults } from '../server/official-results-sync';
import { OfficialResultsError } from '../server/official-results-error';
import { ZodError } from 'zod';

// No web-boot import or implicit write mode; DATABASE_URL remains process-only.
const args = process.argv.slice(2);
const allowed = new Set(['--apply', '--manifest', '--expect-sha256', '--expect-preimage-sha256', '--receipt', '--rollback-run']);
const values = new Map<string, string>();
for (let index = 0; index < args.length; index++) {
  const key = args[index];
  if (!allowed.has(key) || values.has(key)) throw new Error('Unknown or repeated CLI argument');
  if (key === '--apply') values.set(key, 'true');
  else {
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error('CLI argument requires a value: ' + key);
    values.set(key, value);
  }
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (values.has('--rollback-run') && values.has('--manifest')) throw new Error('Rollback cannot specify a manifest');
if (!values.has('--receipt')) throw new Error('--receipt requires a new retained evidence file');
const destination = resolve(values.get('--receipt')!);
const temporary = destination + '.tmp-' + randomUUID();
// Refuse an occupied destination before doing any DB mutation; reserve it.
const reservation = await open(destination, 'wx', 0o600);
await reservation.close();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let committed = false;
let committedRunId: string | null = null;
let output: Awaited<ReturnType<typeof open>> | null = null;
try {
  // Exercise both output paths before connecting to PostgreSQL.
  output = await open(temporary, 'wx', 0o600);
  const proof = values.has('--rollback-run') ? {} : await loadResultsManifest(values.get('--manifest') ?? 'data/official-results/2026-11-03.json');
  const receipt = await syncOfficialResults(pool, {
    ...proof, mode: values.has('--apply') ? 'apply' : 'dry-run',
    expectedManifestSha256: values.get('--expect-sha256'),
    expectedPreimageSha256: values.get('--expect-preimage-sha256'),
    rollbackRunId: values.get('--rollback-run'),
  });
  committed = receipt.mode === 'apply';
  committedRunId = receipt.runId;
  try { await output.writeFile(JSON.stringify(receipt, null, 2) + '\n'); await output.sync(); }
  finally { await output.close(); output = null; }
  await rename(temporary, destination);
  console.log(JSON.stringify({ mode: receipt.mode, operation: receipt.operation, runId: receipt.runId,
    targetCount: receipt.targetCount, changedCount: receipt.changedCount,
    phaseSkippedCount: receipt.phaseSkippedCount, phaseSkipped: receipt.phaseSkipped,
    manifestSha256: receipt.manifestSha256, preimageSha256: receipt.preimageSha256,
    postimageSha256: receipt.postimageSha256, receipt: destination }));
} catch (error) {
  // Raw DB errors can contain connection details; never print them here.
  const errorCode = typeof (error as { code?: unknown }).code === 'string' && /^[A-Z0-9_]{1,32}$/.test((error as { code: string }).code)
    ? (error as { code: string }).code : 'C6_OPERATION_ERROR';
  const reason = error instanceof OfficialResultsError ? error.message : error instanceof ZodError
    ? 'Schema validation refused: ' + error.issues.map(issue => issue.path.join('.') + ':' + issue.code).join(', ')
    : 'Operation failed (' + errorCode + '); inspect private database or filesystem diagnostics.';
  await output?.close().catch(() => {}); output = null;
  const failure = { outcome: committed ? 'Applied' : 'Failed', receiptExport: 'Failed',
    committed, runId: committedRunId, errorCode, reason,
    temporaryReceipt: committed ? temporary : null, checkedAt: new Date().toISOString() };
  await writeFile(destination, JSON.stringify(failure, null, 2) + '\n').catch(() => {});
  console.error(JSON.stringify(failure));
  if (committed) console.error('Recover the durable DB audit before retrying this committed run.');
  if (!committed) await unlink(temporary).catch(() => {});
  process.exitCode = 1;
} finally { await pool.end(); }
