import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
const exec = promisify(execFile);
const suffix = `${process.pid}-${randomBytes(3).toString('hex')}`;
const network = `et-c6-phase-net-${suffix}`, database = `et-c6-phase-db-${suffix}`;
const password = randomBytes(24).toString('hex');
const databaseUrl = `postgresql://et_c6_phase_test:${password}@${database}:5432/et_c6_phase_test`;
const evidence = `artifacts/c6-phase-${suffix}`;
await fs.mkdir(evidence, { recursive: true });
const docker = async (...args) => {
  try { return (await exec('docker', args, { timeout: 180000, maxBuffer: 8 * 1024 * 1024 })).stdout.trim(); }
  catch (error) { throw new Error((String(error.stderr || '') + String(error.stdout || error.code)).replaceAll(databaseUrl, '[private DB]').replaceAll(password, '[redacted]')); }
};
const report = { outcome: 'Failed', fixtureOnly: true, realReturnsClaim: false, noApplicationServer: true, zeroPublishedPorts: true };
try {
  await docker('network', 'create', '--internal', network);
  await docker('run', '-d', '--name', database, '--network', network, '-e', 'POSTGRES_USER=et_c6_phase_test',
    '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_DB=et_c6_phase_test', 'postgres:16-alpine');
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await docker('exec', database, 'pg_isready', '-U', 'et_c6_phase_test', '-d', 'et_c6_phase_test'); ready = true; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 1000)); }
  }
  if (!ready) throw new Error('Disposable phase PG not ready');
  await docker('run', '--rm', '--network', network,
    '--mount', `type=bind,source=${path.resolve('.')},target=/review,readonly`,
    '--mount', `type=bind,source=${path.resolve(evidence)},target=/app/artifacts/c6-phase`,
    '-e', `DATABASE_URL=${databaseUrl}`, '--entrypoint', 'sh', 'electiontracker:c6-results-builder', '-c',
    'node_modules/.bin/esbuild /review/scripts/verify_results_phase_routing.ts --bundle --platform=node --format=esm --packages=external --outfile=/app/phase-acceptance.mjs && node /app/phase-acceptance.mjs');
  report.acceptance = JSON.parse(await fs.readFile(evidence + '/phase-routing-receipt.json', 'utf8'));
  report.outcome = 'Worked';
} catch (error) { report.error = error.message; process.exitCode = 1; }
finally {
  await fs.writeFile(evidence + '/harness-receipt.json', JSON.stringify(report, null, 2) + '\n');
  try { await docker('rm', '-f', database); } catch {}
  try { await docker('network', 'rm', network); } catch {}
}
console.log(JSON.stringify({ evidence, ...report }));
