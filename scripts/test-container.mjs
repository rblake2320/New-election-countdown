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
const previewPort = Number(process.env.TEST_BROWSER_PORT || 5059);
if (preview && (!Number.isInteger(previewPort) || previewPort < 1024 || previewPort > 65535)) {
  throw new Error('TEST_BROWSER_PORT must be an integer from 1024 to 65535');
}
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
    ...(preview ? ['-p', `127.0.0.1:${previewPort}:5000`] : []),
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
  if (process.env.TEST_USER_FLOW === '1') {
    const userProbe = `
      const base='http://127.0.0.1:5000';
      const registration=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'integration-user@example.test',password:'Disposable-Fixture-2026!'})});
      if(!registration.ok)throw Error('Registration status '+registration.status);
      const cookie=registration.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
      if(!cookie)throw Error('Registration did not create a session cookie');
      const results=[{path:'/api/auth/register',status:registration.status}];
      for(const path of ['/api/auth/me','/api/auth/dashboard','/api/recommendations','/api/watchlist']){
        const response=await fetch(base+path,{headers:{Cookie:cookie}});
        if(response.status!==200)throw Error(path+' status '+response.status);
        const body=await response.json();
        if(path==='/api/auth/me'&&body.user.role!=='user')throw Error('Missing ordinary-user role');
        if(path==='/api/auth/dashboard'&&body.user.emailVerified!==false)throw Error('New account email verification status is incorrect');
        results.push({path,status:response.status});
      }
      console.log(JSON.stringify(results));
    `;
    report.userFlow = JSON.parse(await docker('exec', app, 'node', '-e', userProbe));
  }
  if (process.env.TEST_ELECTION_TIMEZONE === '1') {
    // Fixture script refuses any database other than this dedicated name.
    // This database exists only inside this harness-owned disposable container.
    await docker('exec', db, 'psql', '-U', 'et_test', '-d', 'et_test', '-c',
      'create database et_sol_c_timezone_test;');
    const timezoneURL = databaseURL.replace(/\/et_test$/, '/et_sol_c_timezone_test');
    const output = await docker('run', '--rm', '--network', network,
      '-e', `DATABASE_URL=${timezoneURL}`, '--entrypoint', 'sh', builder, '-c',
      'node_modules/.bin/esbuild scripts/verify_election_timezone.ts --bundle --platform=node --format=esm --packages=external --outfile=timezone-acceptance.mjs && node timezone-acceptance.mjs');
    report.electionTimezone = JSON.parse(output);
  }
  if (process.env.TEST_LISTING_CONTRACT === '1') {
    const listingProbe = `
      const {default:pg}=await import('pg');
      const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,options:'-c default_transaction_read_only=on'});
      try {
        const now=new Date(); const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
        const recent=new Date(today.getTime()-30*86400000), end=new Date(today.getTime()+31*86400000);
        const control=await pool.query('select e.*,count(c.id)::int as candidate_count from elections e left join candidates c on c.election_id=e.id where e.is_active=true group by e.id order by e.date,e.id');
        const dem=await pool.query("select distinct election_id from candidates where lower(trim(party)) in ('d','dem','democratic','democrat','democratic party','dfl')");
        const demIds=new Set(dem.rows.map(r=>r.election_id));
        const cases=[['',r=>new Date(r.date)>=recent],['?timeframe=upcoming',r=>new Date(r.date)>=today],['?timeframe=next-30-days',r=>new Date(r.date)>=today&&new Date(r.date)<end],['?level=federal',r=>new Date(r.date)>=recent&&r.level.trim().toLowerCase()==='federal'],['?level=Federal',r=>new Date(r.date)>=recent&&r.level.trim().toLowerCase()==='federal'],['?party=D',r=>new Date(r.date)>=recent&&demIds.has(r.id)],['?party=Democratic',r=>new Date(r.date)>=recent&&demIds.has(r.id)]];
        const results=[];
        for(const [query,predicate] of cases){
          const response=await fetch('http://127.0.0.1:5000/api/elections'+query,{signal:AbortSignal.timeout(10000)});
          if(response.status!==200)throw Error(query+' status '+response.status);
          const rows=await response.json(),expected=control.rows.filter(predicate);
          if(JSON.stringify(rows.map(r=>r.id))!==JSON.stringify(expected.map(r=>r.id)))throw Error(query+' membership/order differs from independent SQL');
          const counts=new Map(expected.map(r=>[r.id,r.candidate_count]));
          if(rows.some(r=>r.candidateCount!==counts.get(r.id)))throw Error(query+' candidate count mismatch');
          results.push({query,status:200,rows:rows.length,membershipAndCountsMatch:true});
        }
        const invalid=await fetch('http://127.0.0.1:5000/api/elections?timeframe=typo');
        if(invalid.status!==400)throw Error('Invalid filter status '+invalid.status);
        results.push({query:'?timeframe=typo',status:400});
        console.log(JSON.stringify(results));
      }finally{await pool.end();}
    `;
    report.listingContract = JSON.parse(await docker('exec', app, 'node', '--input-type=module', '-e', listingProbe));
  }
  if (process.env.TEST_POLL_HOURS === '1') {
    const fingerprint = () => docker('exec', db, 'psql', '-U', 'et_test', '-d', 'et_test', '-Atc',
      "select md5(string_agg(row_to_json(e)::text,'' order by id)),md5(string_agg(xmin::text,',' order by id)) from elections e;");
    const runHours = (apply, inject = false) => docker('run', '--rm', '--network', network,
      '-e', `DATABASE_URL=${databaseURL}`,
      ...(inject ? ['-e', 'POLL_HOURS_INJECT_FAILURE_AFTER=100'] : []),
      '--entrypoint', 'sh', builder, '-c',
      'node_modules/.bin/esbuild scripts/seed_poll_hours_2026.ts --bundle --platform=node --format=esm --packages=external --outfile=poll-hours-acceptance.mjs && node poll-hours-acceptance.mjs' + (apply ? ' --apply' : ''));
    const before = await fingerprint();
    await runHours(false);
    if (await fingerprint() !== before) throw Error('Poll-hours dry-run changed rows');
    let rolledBack = false;
    try { await runHours(true, true); }
    catch (error) { if (!error.message.includes('injected failure after 100')) throw error; rolledBack = true; }
    if (!rolledBack || await fingerprint() !== before) throw Error('Poll-hours rollback failed');
    const applied = await runHours(true);
    const after = await fingerprint();
    const repeated = await runHours(true);
    if (await fingerprint() !== after || !repeated.includes('0 need changes')) throw Error('Poll-hours repeat changed rows');
    const probeHours = `
      const {default:pg}=await import('pg');const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,options:'-c default_transaction_read_only=on'});
      try{
        const expected=(await pool.query("select id,polls_open,polls_close,timezone,poll_close_kind,poll_hours_basis,poll_hours_source from elections where date='2026-11-03' order by id")).rows;
        if(expected.length!==506)throw Error('Expected506 election-day rows');
        const response=await fetch('http://127.0.0.1:5000/api/elections?timeframe=upcoming');
        if(response.status!==200)throw Error('Poll-hours HTTP status '+response.status);
        const rows=new Map((await response.json()).map(r=>[r.id,r]));
        const fields={polls_open:'pollsOpen',polls_close:'pollsClose',timezone:'timezone',poll_close_kind:'pollCloseKind',poll_hours_basis:'pollHoursBasis',poll_hours_source:'pollHoursSource'};
        for(const e of expected){const actual=rows.get(e.id);if(!actual)throw Error('Missing election '+e.id);for(const [sql,key] of Object.entries(fields))if(e[sql]!==actual[key])throw Error('Poll-hours HTTP mismatch '+e.id+' '+key);}
        console.log(JSON.stringify({rows:expected.length,fieldComparisons:expected.length*6,mismatches:0}));
      }finally{await pool.end();}`;
    report.pollHours = { dryRunUnchanged: true, injectedRollback: true, repeatUnchanged: true,
      applySummary: applied.split('\n').filter(line => /need changes|applied/.test(line)),
      compiledHttp: JSON.parse(await docker('exec', app, 'node', '--input-type=module', '-e', probeHours)) };
  }
  if (process.env.TEST_CANDIDATE_INGESTION === '1') {
    await docker('exec', db, 'psql', '-U', 'et_test', '-d', 'et_test', '-c',
      'create database et_sol_c_fec_test;');
    const fecOutput = await docker('run', '--rm', '--network', network,
      '-e', `DATABASE_URL=${databaseURL.replace(/\/et_test$/, '/et_sol_c_fec_test')}`,
      '--entrypoint', 'sh', builder, '-c',
      'node_modules/.bin/esbuild scripts/verify_fec_sync.ts --bundle --platform=node --format=esm --packages=external --outfile=fec-acceptance.mjs && node fec-acceptance.mjs');
    report.fecIngestion = JSON.parse(fecOutput);
    const nomineeOutput = await docker('run', '--rm', '--network', network,
      '-e', `DATABASE_URL=${databaseURL}`, '-e', `INTERNAL_APP_ORIGIN=http://${app}:5000`,
      '--entrypoint', 'sh', builder, '-c',
      'node_modules/.bin/esbuild scripts/refresh_general_candidates.ts --bundle --platform=node --format=esm --packages=external --outfile=nominee-cli-acceptance.mjs && node_modules/.bin/esbuild scripts/verify-candidate-integration.ts --bundle --platform=node --format=esm --packages=external --outfile=nominee-acceptance.mjs && node nominee-acceptance.mjs');
    report.nomineeIngestion = JSON.parse(nomineeOutput);
  }
  if (preview) {
    report.network = `isolated test bridge; browser preview bound only to 127.0.0.1:${previewPort}`;
    console.log(`Isolated browser preview ready at http://127.0.0.1:${previewPort} (maximum 5 minutes)`);
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
