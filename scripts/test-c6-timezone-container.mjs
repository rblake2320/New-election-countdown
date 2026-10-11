import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const exec = promisify(execFile);
const suffix = `${process.pid}-${randomBytes(3).toString('hex')}`;
const network = `et-c6-tz-net-${suffix}`, database = `et-c6-tz-db-${suffix}`;
const builder = 'electiontracker:c6-results-builder';
const password = randomBytes(24).toString('hex');
const databaseUrl = `postgresql://et_c6_test:${password}@${database}:5432/et_sol_c_timezone_test`;
const evidence = `artifacts/c6-main-timezone-${suffix}`;
await fs.mkdir(evidence, { recursive: true });
const docker = async (...args) => {
  try { return (await exec('docker', args, { timeout: 180000, maxBuffer: 8 * 1024 * 1024 })).stdout.trim(); }
  catch (error) { throw new Error(String(error.stderr || error.stdout || error.code).replaceAll(databaseUrl, '[private database]').replaceAll(password, '[redacted]')); }
};
const report = { outcome: 'Failed', network: 'internal, zero published ports', compiledFromCurrentOwnedCheckout: true, syntheticPrivateFixture: true };
try {
  await docker('network', 'create', '--internal', network);
  await docker('run', '-d', '--name', database, '--network', network,
    '-e', 'POSTGRES_USER=et_c6_test', '-e', `POSTGRES_PASSWORD=${password}`,
    '-e', 'POSTGRES_DB=et_sol_c_timezone_test', 'postgres:16-alpine');
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await docker('exec', database, 'pg_isready', '-U', 'et_c6_test', '-d', 'et_sol_c_timezone_test'); ready = true; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 1000)); }
  }
  if (!ready) throw new Error('Owned timezone PostgreSQL unavailable');
  const result = await docker('run', '--rm', '--network', network,
    '--mount', `type=bind,source=${path.resolve('.')},target=/review,readonly`,
    '--mount', `type=bind,source=${path.resolve(evidence)},target=/app/artifacts/lane-c`,
    '-e', `DATABASE_URL=${databaseUrl}`, '--entrypoint', 'sh', builder, '-c',
    'node_modules/.bin/esbuild /review/scripts/verify_election_timezone.ts --bundle --platform=node --format=esm --packages=external --outfile=/app/timezone-acceptance.mjs && node /app/timezone-acceptance.mjs');
  report.acceptance = JSON.parse(result);
  report.outcome = 'Worked';
} catch (error) { report.error = error.message; process.exitCode = 1; }
finally {
  await fs.writeFile(evidence + '/harness-receipt.json', JSON.stringify(report, null, 2) + '\n');
  try { await docker('rm', '-f', database); } catch {}
  try { await docker('network', 'rm', network); } catch {}
}
console.log(JSON.stringify({ evidence, ...report }));
