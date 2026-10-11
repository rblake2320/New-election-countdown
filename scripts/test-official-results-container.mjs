import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const exec = promisify(execFile);
const suffix = `${process.pid}-${randomBytes(3).toString('hex')}`;
const network = `et-c6-net-${suffix}`, db = `et-c6-db-${suffix}`, app = `et-c6-app-${suffix}`, tokyoApp = `et-c6-tokyo-${suffix}`;
const builder = process.env.C6_BUILDER_IMAGE || 'electiontracker:c6-results-builder';
const image = process.env.C6_RUNTIME_IMAGE || 'electiontracker:c6-results';
const password = randomBytes(24).toString('hex');
const databaseUrl = `postgresql://et_c6_test:${password}@${db}:5432/et_c6_test`;
const evidence = `artifacts/c6-private-${suffix}`;
await fs.mkdir(evidence, { recursive: true });
const docker = async (...args) => {
  try { return (await exec('docker', args, { timeout: 300000, maxBuffer: 8 * 1024 * 1024 })).stdout.trim(); }
  catch (error) { throw new Error(`docker ${args[0]} failed: ${String(error.stderr || '') + String(error.stdout || error.code)} `.replaceAll(databaseUrl, '[private database]').replaceAll(password, '[redacted]')); }
};
const report = { outcome: 'Failed', network: 'internal, zero published ports', image, builder, physicalDependencies: true };
const delay = () => new Promise(resolve => setTimeout(resolve, 1000));
try {
  report.builderImageId = await docker('image', 'inspect', '--format', '{{.Id}}', builder);
  report.expectedRuntimeImageId = await docker('image', 'inspect', '--format', '{{.Id}}', image);
  await docker('network', 'create', '--internal', network);
  await docker('run', '-d', '--name', db, '--network', network, '-e', 'POSTGRES_USER=et_c6_test',
    '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_DB=et_c6_test', 'postgres:16-alpine');
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await docker('exec', db, 'pg_isready', '-U', 'et_c6_test', '-d', 'et_c6_test'); ready = true; break; }
    catch { await delay(); }
  }
  if (!ready) throw new Error('Private PostgreSQL not ready');
  await fs.writeFile(evidence + '/schema.log', await docker('run', '--rm', '--network', network,
    '-e', `DATABASE_URL=${databaseUrl}`, '--entrypoint', 'npx', builder, 'drizzle-kit', 'push', '--force'));
  // Exercise the additive migration against a schema without the new columns.
  await docker('exec', db, 'psql', '-U', 'et_c6_test', '-d', 'et_c6_test', '-v', 'ON_ERROR_STOP=1', '-c',
    'ALTER TABLE public.elections DROP COLUMN official_results_url, DROP COLUMN official_results_source; DROP TABLE public.official_results_sync_runs;');
  const migrate = `const {default:pg}=await import('pg');const fs=await import('node:fs/promises');
    const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});try{
      const sql=await fs.readFile('migrations/20261011_official_results_routes.sql','utf8');
      await pool.query(sql);await pool.query(sql);
      const cols=await pool.query("SELECT column_name,is_nullable,data_type FROM information_schema.columns WHERE table_name='elections' AND column_name LIKE 'official_results_%' ORDER BY column_name");
      if(cols.rows.length!==2||cols.rows.some(r=>r.is_nullable!=='YES'))throw Error('Nullable migration mismatch');
      console.log(JSON.stringify({runs:2,columns:cols.rows,outcome:'Worked'}));
    }finally{await pool.end()}`;
  report.migration = JSON.parse(await docker('run', '--rm', '--network', network, '-e', `DATABASE_URL=${databaseUrl}`,
    '--entrypoint', 'node', builder, '--input-type=module', '-e', migrate));
  await docker('run', '-d', '--name', app, '--network', network, '-e', `DATABASE_URL=${databaseUrl}`,
    '-e', `JWT_SECRET=${password}`, '-e', `CANDIDATE_JWT_SECRET=${password}`,
    '-e', 'APP_ORIGIN=http://127.0.0.1:5000', image);
  ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await docker('exec', app, 'node', '-e', "fetch('http://127.0.0.1:5000/api/elections').then(async r=>{const a=await r.json();if(r.status!==200||!Array.isArray(a)||a.length<450)process.exit(1)})");
      ready = true; break;
    } catch { await delay(); }
  }
  if (!ready) throw new Error('Compiled app did not seed and serve real catalog');
  report.runtimeImageId = await docker('inspect', '--format', '{{.Image}}', app);
  if (report.runtimeImageId !== report.expectedRuntimeImageId) throw new Error('Runtime image changed during acceptance');
  report.compiledDefaultDryRun = JSON.parse(await docker('exec', app, 'node', 'dist/sync_official_results.js', '--receipt', 'artifacts/c6-cli-default-dry.json'));
  let refused = false;
  try {
    await docker('exec', app, 'node', 'dist/sync_official_results.js', '--apply',
      '--expect-sha256', '0'.repeat(64), '--expect-preimage-sha256', report.compiledDefaultDryRun.preimageSha256,
      '--receipt', 'artifacts/c6-cli-guard-failed.json');
  } catch { refused = true; }
  if (!refused) throw new Error('Packaged CLI accepted incorrect manifest SHA');
  report.compiledGuard = JSON.parse(await docker('exec', app, 'node', '-e',
    "console.log(require('fs').readFileSync('artifacts/c6-cli-guard-failed.json','utf8'))"));
  if (report.compiledGuard.committed || report.compiledGuard.errorCode !== 'C6_REFUSED' || !report.compiledGuard.reason.includes('Manifest SHA guard')) throw new Error('Guard refusal lacks retained honest diagnosis');
  await docker('run', '--rm', '--network', network,
    '--mount', `type=bind,source=${path.resolve('.')},target=/review,readonly`,
    '--mount', `type=bind,source=${path.resolve(evidence)},target=/app/artifacts/c6-acceptance`,
    '-e', `DATABASE_URL=${databaseUrl}`, '-e', `INTERNAL_APP_ORIGIN=http://${app}:5000`,
    '--entrypoint', 'sh', builder, '-c', 'node_modules/.bin/esbuild /review/scripts/verify_official_results.ts --bundle --platform=node --format=esm --packages=external --outfile=/app/c6-acceptance.mjs && node /app/c6-acceptance.mjs');
  report.acceptance = JSON.parse(await fs.readFile(evidence + '/receipt.json', 'utf8'));
  if (report.acceptance.outcome !== 'Worked') throw new Error('C6 acceptance reported a failure');
  const finalDry = JSON.parse(await docker('exec', app, 'node', 'dist/sync_official_results.js', '--receipt', 'artifacts/c6-cli-before-apply-dry.json'));
  const expected = report.acceptance.readyForPackagedApply;
  if (finalDry.preimageSha256 !== expected.preimageSha256 || finalDry.changedCount !== expected.changedCount) throw new Error('Compiled dry-run differs from acceptance preimage');
  report.compiledApply = JSON.parse(await docker('exec', app, 'node', 'dist/sync_official_results.js', '--apply',
    '--expect-sha256', finalDry.manifestSha256, '--expect-preimage-sha256', finalDry.preimageSha256,
    '--receipt', 'artifacts/c6-cli-apply.json'));
  if (report.compiledApply.postimageSha256 !== expected.postimageSha256 || report.compiledApply.changedCount !== expected.changedCount) throw new Error('Packaged CLI apply changed unintended fields');
  report.finalCompiledRepeat = JSON.parse(await docker('exec', app, 'node', 'dist/sync_official_results.js', '--receipt', 'artifacts/c6-cli-final-dry.json'));
  if (report.finalCompiledRepeat.changedCount !== 0) throw new Error('Packaged CLI differs from acceptance module');
  const rollbackDry = JSON.parse(await docker('exec', app, 'node', 'dist/sync_official_results.js',
    '--rollback-run', report.compiledApply.runId, '--receipt', 'artifacts/c6-cli-rollback-dry.json'));
  report.compiledRollback = JSON.parse(await docker('exec', app, 'node', 'dist/sync_official_results.js', '--apply',
    '--rollback-run', report.compiledApply.runId, '--expect-sha256', rollbackDry.manifestSha256,
    '--expect-preimage-sha256', rollbackDry.preimageSha256, '--receipt', 'artifacts/c6-cli-rollback-apply.json'));
  if (report.compiledRollback.postimageSha256 !== finalDry.preimageSha256) throw new Error('Packaged rollback did not restore full preimage');
  const receiptFault = await fs.readFile('scripts/verify-official-results-receipt-fault.mjs', 'utf8');
  report.postcommitReceiptFault = JSON.parse(await docker('exec', app, 'node', '--input-type=module', '-e', receiptFault,
    finalDry.manifestSha256, finalDry.preimageSha256, expected.postimageSha256));
  report.compiledReapply = JSON.parse(await docker('exec', app, 'node', 'dist/sync_official_results.js', '--apply',
    '--expect-sha256', finalDry.manifestSha256, '--expect-preimage-sha256', expected.postimageSha256,
    '--receipt', 'artifacts/c6-cli-reapply.json'));
  if (report.compiledReapply.postimageSha256 !== expected.postimageSha256) throw new Error('Packaged reapply differs from receiving evidence');
  const auditFingerprint = () => docker('exec', db, 'psql', '-U', 'et_c6_test', '-d', 'et_c6_test', '-Atc',
    "SELECT (SELECT md5(string_agg(to_jsonb(e)::text,'' ORDER BY id)) FROM elections e), (SELECT md5(string_agg(to_jsonb(r)::text,'' ORDER BY id)) FROM official_results_sync_runs r), (SELECT count(*) FROM official_results_sync_runs);");
  const beforeSchemaSync = await auditFingerprint();
  await fs.writeFile(evidence + '/audit-schema-sync.log', await docker('run', '--rm', '--network', network,
    '-e', `DATABASE_URL=${databaseUrl}`, '--entrypoint', 'npx', builder,
    'drizzle-kit', 'push', '--force', '--config', 'scripts/drizzle-official-results.config.ts'));
  if (await auditFingerprint() !== beforeSchemaSync) throw new Error('Later Drizzle audit-table synchronization altered data or durable audit receipts');
  report.auditSchemaSync = { outcome: 'Worked', catalogAndAuditPreserved: true, auditRows: Number(beforeSchemaSync.split('|')[2]) };
  await docker('run', '-d', '--name', tokyoApp, '--network', network, '-e', `DATABASE_URL=${databaseUrl}`,
    '-e', `JWT_SECRET=${password}`, '-e', `CANDIDATE_JWT_SECRET=${password}`, '-e', 'TZ=Asia/Tokyo',
    '-e', 'APP_ORIGIN=http://127.0.0.1:5000', image);
  ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await docker('exec', tokyoApp, 'node', '-e', "fetch('http://127.0.0.1:5000/api/health').then(r=>{if(r.status!==200)process.exit(1)})"); ready = true; break; }
    catch { await delay(); }
  }
  if (!ready) throw new Error('Tokyo packaged reader did not become ready');
  const timezoneProbe = `const {default:pg}=await import('pg');const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
    try { const r=(await pool.query("SELECT id,date,to_char(date,'YYYY-MM-DD') AS day FROM elections WHERE state='AL' AND date='2026-11-03'::date ORDER BY id LIMIT 1")).rows[0];
      const nativeUtcDay=r.date.toISOString().slice(0,10);if(nativeUtcDay!=='2026-11-02'||r.day!=='2026-11-03')throw Error('Tokyo native-PG negative control did not reproduce');
      const response=await fetch('http://127.0.0.1:5000/api/elections/'+r.id);const body=await response.json();
      if(response.status!==200||body.date.slice(0,10)!==r.day||!body.officialResultsSource||body.officialResultsSource.targetElectionDate!==r.day)throw Error('Canonical Tokyo detail projection mismatch');
      const listingResponse=await fetch('http://127.0.0.1:5000/api/elections?state=AL');const listing=(await listingResponse.json()).find(e=>e.id===r.id);
      if(listingResponse.status!==200||!listing||listing.date.slice(0,10)!==r.day||!listing.officialResultsSource||listing.officialResultsSource.targetElectionDate!==r.day)throw Error('Canonical Tokyo listing projection mismatch');
      console.log(JSON.stringify({outcome:'Worked',operatorTimezone:process.env.TZ,nativeUtcDay,storedDay:r.day,detailDay:body.date.slice(0,10),listingDay:listing.date.slice(0,10),sourceRetained:true}));
    } finally{await pool.end()}`;
  report.operatorTimezone = JSON.parse(await docker('exec', tokyoApp, 'node', '--input-type=module', '-e', timezoneProbe));
  report.outcome = 'Worked';
} catch (error) { report.error = error.message; process.exitCode = 1; }
finally {
  try { await fs.writeFile(evidence + '/application.log', await docker('logs', app)); } catch {}
  try { await docker('cp', app + ':/app/artifacts/c6-cli-default-dry.json', evidence + '/compiled-default-dry.json'); } catch {}
  try { await docker('cp', app + ':/app/artifacts/c6-cli-guard-failed.json', evidence + '/compiled-guard-failed.json'); } catch {}
  try { await docker('cp', app + ':/app/artifacts/c6-cli-apply.json', evidence + '/compiled-apply.json'); } catch {}
  try { await docker('cp', app + ':/app/artifacts/c6-cli-final-dry.json', evidence + '/compiled-final-dry.json'); } catch {}
  try { await docker('cp', app + ':/app/artifacts/c6-cli-rollback-apply.json', evidence + '/compiled-rollback.json'); } catch {}
  try { await docker('cp', app + ':/app/artifacts/c6-cli-reapply.json', evidence + '/compiled-reapply.json'); } catch {}
  try { await docker('cp', app + ':/app/artifacts/c6-receipt-fault', evidence + '/postcommit-receipt-fault'); } catch {}
  await fs.writeFile(evidence + '/harness-receipt.json', JSON.stringify(report, null, 2) + '\n');
  for (const owned of [tokyoApp, app, db]) { try { await docker('rm', '-f', owned); } catch {} }
  try { await docker('network', 'rm', network); } catch {}
}
console.log(JSON.stringify({ evidence, ...report }, null, 2));
