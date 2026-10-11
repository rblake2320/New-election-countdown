/** Official FEC master sync. Dry-run by default; filings never establish general-election nomination. */
import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { FEC_MASTER_URL, parseFecMaster, runFecSync } from '../server/fec-candidate-sync';
import { extractFecMaster, persistFecManifest } from '../server/fec-source-artifacts';

config({ path: process.env.ELECTION_ENV_FILE || '.env' });
const args = process.argv.slice(2);
const known = args.every(a => ['--dry-run', '--apply', '--include-prior'].includes(a) || /^--expect-sha256=[a-f0-9]{64}$/.test(a));
if (!known || (args.includes('--apply') && args.includes('--dry-run'))) throw new Error('Use --dry-run (default), --include-prior, or --apply --expect-sha256=<reviewed-source-hash>');
const apply = args.includes('--apply');
const expectedHash = args.find(a => a.startsWith('--expect-sha256='))?.slice('--expect-sha256='.length);
if (apply && !expectedHash) throw new Error('Apply requires the source SHA256 from a reviewed dry-run');
const MAX_BYTES = 64 * 1024 * 1024;
let stage = 'configuration';

async function download(): Promise<Buffer> {
  const response = await fetch(FEC_MASTER_URL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok || !response.body) throw new Error(`FEC source HTTP ${response.status}`);
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('FEC source exceeds byte limit');
  const chunks: Buffer[] = [];
  const reader = response.body.getReader();
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) throw new Error('FEC source exceeds byte limit');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  // Refresh every run; stale local ZIPs cannot silently become today's source.
  stage = 'source-download';
  const bytes = await download();
  const fetchedAt = new Date();
  const hash = createHash('sha256').update(bytes).digest('hex');
  stage = 'source-snapshot';
  const directory = join(process.cwd(), 'election-data-2026');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `cn26-${hash}.zip`), bytes);
  if (expectedHash && expectedHash !== hash) throw new Error('FEC source changed since reviewed plan; rerun dry-run');
  stage = 'source-validation';
  const source = await extractFecMaster(bytes, MAX_BYTES);
  const parsed = parseFecMaster(source, args.includes('--include-prior'));
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10_000, options: apply ? undefined : '-c default_transaction_read_only=on' });
  try {
    stage = 'database-sync';
    const plan = await runFecSync(pool, parsed.rows, hash, apply, fetchedAt);
    const totals: Record<string, number> = {};
    for (const action of plan.actions) totals[action.kind] = (totals[action.kind] ?? 0) + 1;
    const manifest = {
      source_url: FEC_MASTER_URL,
      source_description_url: 'https://www.fec.gov/campaign-finance-data/candidate-master-file-description/',
      source_file_sha256: hash, fetched_at: fetchedAt.toISOString(), cycle: 2026,
      source_status: 'fec_registered', ballot_certification: false, general_election_nomination: false,
      mode: apply ? 'applied' : 'read-only-dry-run',
      database_audit_id: plan.auditId ?? null,
      source_rows: parsed.total, filtered_rows: parsed.filtered, incomplete_rows: parsed.incomplete, duplicate_source_ids: parsed.duplicateIds,
      eligible_rows: parsed.rows.length, actions: totals, unchanged: plan.unchanged,
      unmatched: plan.unmatched,
      planned: plan.actions.map(a => ({ kind: a.kind, fecId: a.record.candId, electionId: a.electionId, candidateId: a.candidateId })),
    };
    stage = 'receipt-file';
    const receipt = persistFecManifest(directory, hash, manifest);
    console.log(JSON.stringify({ ...receipt, mode: manifest.mode, source_sha256: hash, fetched_at: manifest.fetched_at, source_rows: parsed.total, incomplete_rows: parsed.incomplete, eligible_rows: parsed.rows.length, actions: totals, unchanged: plan.unchanged, unmatched: plan.unmatched.length }));
  } finally { await pool.end(); }
}
main().catch(error => {
  const code = typeof error?.code === 'string' ? error.code : undefined;
  const message = code ? 'FEC sync transaction/source operation failed' : error instanceof Error ? error.message : 'FEC sync failed';
  console.error(JSON.stringify({ outcome: 'failed', stage, message, code }));
  process.exitCode = 1;
});
