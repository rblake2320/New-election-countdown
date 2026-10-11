import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { testProxyLoad } from './test-proxy-load.mjs';

const exec = promisify(execFile);
const suffix = `${process.pid}-${randomBytes(3).toString('hex')}`;
const network = `et-test-${suffix}`;
const db = `et-db-${suffix}`;
const app = `et-app-${suffix}`;
const image = process.env.TEST_IMAGE || 'electiontracker:et5';
const builder = process.env.TEST_BUILDER_IMAGE || 'electiontracker:et5-builder';
const password = randomBytes(24).toString('hex');
const databaseURL = `postgresql://et_test:${password}@${db}:5432/et_test`;
const evidence = process.env.CONTAINER_EVIDENCE_DIR || 'test-results/container';
const preview = process.env.TEST_BROWSER_PREVIEW === '1';
await fs.mkdir(evidence, { recursive: true });
const docker = async (...args) => {
  try {
    return (await exec('docker', args, { timeout: 180_000, maxBuffer: 8 * 1024 * 1024 })).stdout.trim();
  } catch (error) {
    // Never include command arguments (which can include test-only credentials).
    throw new Error(`docker ${args[0]} failed: ${String(error.stderr || error.code).replaceAll(password, '[redacted]')}`);
  }
};
const delay = () => new Promise(resolve => setTimeout(resolve, 1000));
const report = { image, builder, network: 'internal, no published ports', passed: false };
try {
  await docker('network', 'create', ...(preview ? [] : ['--internal']), network);
  await docker('run', '-d', '--name', db, '--network', network,
    '-e', 'POSTGRES_USER=et_test', '-e', `POSTGRES_PASSWORD=${password}`,
    '-e', 'POSTGRES_DB=et_test', 'postgres:16-alpine');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { await docker('exec', db, 'pg_isready', '-U', 'et_test', '-d', 'et_test'); ready = true; break; }
    catch { await delay(); }
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready');
  const schemaLog = await docker('run', '--rm', '--network', network,
    '-e', `DATABASE_URL=${databaseURL}`, '--entrypoint', 'npx', builder, 'drizzle-kit', 'push', '--force');
  await fs.writeFile(`${evidence}/schema.log`, schemaLog);
  await docker('run', '-d', '--name', app, '--network', network,
    ...(preview ? ['-p', '127.0.0.1:5059:5000'] : []),
    '-e', `DATABASE_URL=${databaseURL}`, '-e', `JWT_SECRET=${password}`,
    '-e', `CANDIDATE_JWT_SECRET=${password}`, '-e', 'APP_ORIGIN=http://127.0.0.1:5000', image);
  const probe = `Promise.all(['/', '/api/health', '/api/elections'].map(async path => {
    const r=await fetch('http://127.0.0.1:5000'+path);
    if(r.status!==200) throw Error(path+' status '+r.status);
    const body=await r.text();
    if(path==='/api/elections' && !Array.isArray(JSON.parse(body))) throw Error('elections response is not an array');
    if(path==='/api/health' && JSON.parse(body).ok!==true) throw Error('health not ready');
    return {path,status:r.status,bytes:body.length};
  })).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e.message);process.exitCode=1})`;
  let lastError;
  for (let i = 0; i < 60; i++) {
    if (await docker('inspect', '--format', '{{.State.Running}}', app) !== 'true') {
      throw new Error('Packaged server exited before serving HTTP');
    }
    try { report.http = JSON.parse(await docker('exec', app, 'node', '-e', probe)); lastError = null; break; }
    catch (error) { lastError = error; await delay(); }
  }
  if (lastError) throw lastError;
  const counts = await docker('exec', db, 'psql', '-U', 'et_test', '-d', 'et_test', '-Atc',
    'select count(*), count(distinct (title,state,date,type)) from elections;');
  const [total, distinct] = counts.split('|').map(Number);
  report.elections = { total, distinct };
  if (!(total > 0) || total !== distinct) throw new Error(`Duplicate or empty initial seed: ${counts}`);
  report.boundary = await docker('exec', app, 'node', '-e',
    `const fs=require('fs');for(const p of ['node_modules/vite','node_modules/vitest','node_modules/@playwright/test','node_modules/tailwindcss','server','shared'])if(fs.existsSync(p))throw Error('Unexpected runtime path '+p);console.log('production-only paths verified')`);
  report.imageId = await docker('inspect', '--format', '{{.Image}}', app);
  if (preview) {
    report.network = 'isolated test bridge; browser preview bound only to 127.0.0.1:5059';
    console.log('Isolated browser preview ready at http://127.0.0.1:5059 (maximum 5 minutes)');
    for (let i = 0; i < 300; i++) {
      try { await fs.access(`${evidence}/browser-done`); break; } catch {}
      await delay();
    }
  }
  if (process.env.TEST_DB_OUTAGE === '1') {
    const healthProbe = `fetch('http://127.0.0.1:5000/api/health',{signal:AbortSignal.timeout(10000)}).then(async r=>console.log(JSON.stringify({status:r.status,body:await r.json()}))).catch(e=>{console.error(e.message);process.exitCode=1})`;
    const waitHealth = async (status, ok, timeout) => {
      const started = Date.now();
      let last;
      while (Date.now() - started < timeout) {
        try {
          last = JSON.parse(await docker('exec', app, 'node', '-e', healthProbe));
          if (last.status === status && last.body.ok === ok) return { ...last, elapsedMs: Date.now() - started };
        } catch (error) { last = { error: error.message }; }
        await delay();
      }
      throw new Error(`Health transition timed out: expected ${status}/${ok}, last ${JSON.stringify(last)}`);
    };
    await docker('stop', '-t', '5', db);
    report.outage = await waitHealth(503, false, 90_000);
    await docker('start', db);
    report.recovery = await waitHealth(200, true, 120_000);
    const recoveredCounts = await docker('exec', db, 'psql', '-U', 'et_test', '-d', 'et_test', '-Atc',
      'select count(*), count(distinct (title,state,date,type)) from elections;');
    if (recoveredCounts !== counts) throw new Error('Election counts changed across database outage');
    report.recovery.countsPreserved = true;
    report.recovery.http = JSON.parse(await docker('exec', app, 'node', '-e', probe));
  }
  if (process.env.TEST_PROXY_LOAD === '1') {
    await testProxyLoad({ docker, network, app, evidence, report });
  }
  report.passed = true;
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  try { await fs.writeFile(`${evidence}/application.log`, await docker('logs', app)); } catch {}
  await fs.writeFile(`${evidence}/receipt.json`, JSON.stringify(report, null, 2) + '\n');
  for (const name of [app, db]) { try { await docker('rm', '-f', name); } catch {} }
  try { await docker('network', 'rm', network); } catch {}
}
console.log(JSON.stringify(report, null, 2));
