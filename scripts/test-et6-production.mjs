import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// D receiving infrastructure. No result report is invented or inserted here.
// A real C source packet/replay is a separate acceptance step when delivered.
const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const label = 'org.electiontracker.et6-receiving';
const delay = () => new Promise(r => setTimeout(r, 1000));

// Cleanup requires both strict names and the matching ownership label. This
// never selects arbitrary containers by a broad name prefix.
async function cleanup(resources, call) {
  const { runId, app, db, schema, network } = resources;
  if (!/^\d+-[a-f0-9]{8}$/.test(runId)) throw new Error('Invalid cleanup run ID');
  const prefix = `et6-prod-${runId}`;
  if (network !== prefix || app !== `${prefix}-app` || db !== `${prefix}-db` || schema !== `${prefix}-schema`) throw new Error('Invalid cleanup resource names');
  const outcomes = [];
  for (const [kind, name] of [['container', schema], ['container', app], ['container', db], ['network', network]]) {
    const names = (await call(kind, 'ls', ...(kind === 'network' ? [] : ['-a']), '--format', kind === 'network' ? '{{.Name}}' : '{{.Names}}')).split(/\r?\n/);
    const exists = names.includes(name);
    if (!exists) { outcomes.push({ name, outcome: 'absent' }); continue; }
    const format = kind === 'network' ? `{{index .Labels "${label}"}}` : `{{index .Config.Labels "${label}"}}`;
    if (await call(kind, 'inspect', '--format', format, name) !== runId) throw new Error(`Cleanup ownership mismatch: ${name}`);
    if (kind === 'network') await call('network', 'rm', name);
    else await call('rm', '-f', name);
    outcomes.push({ name, outcome: 'removed' });
  }
  return outcomes;
}

async function writeJson(path, value) {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2));
  await rename(`${path}.tmp`, path);
}

if (process.argv[2] === '--cleanup') {
  if (!process.argv[3] || process.argv.length !== 4) throw new Error('Usage: node scripts/test-et6-production.mjs --cleanup receipt.json');
  const path = resolve(process.argv[3]);
  const receipt = JSON.parse(await readFile(path, 'utf8'));
  const call = async (...args) => {
    try { return (await execute('docker', args, { timeout: 180000, maxBuffer: 1024 * 1024 })).stdout.trim(); }
    catch { throw new Error(`Docker cleanup operation failed: ${args[0]}`); }
  };
  receipt.cleanup = await cleanup(receipt.resources, call);
  receipt.resourcesRetained = false;
  await writeJson(path, receipt);
  console.log(JSON.stringify({ receipt: path, cleanup: receipt.cleanup }));
} else {
  if (process.argv.length !== 2) throw new Error('Unknown receiving harness argument');
  const image = process.env.ET6_PRODUCTION_IMAGE || 'electiontracker:et6-d-8c0f45a';
  const builder = process.env.ET6_BUILDER_IMAGE || `${image}-builder`;
  const port = Number(process.env.ET6_BROWSER_PORT || 5091);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid loopback preview port');
  const runId = `${process.pid}-${randomBytes(4).toString('hex')}`;
  const network = `et6-prod-${runId}`;
  const resources = { runId, network, db: `${network}-db`, app: `${network}-app`, schema: `${network}-schema`, database: 'et6_receiving', role: 'et6_receiving' };
  const { app, db, schema, database, role } = resources;
  const evidence = resolve(process.env.ET6_EVIDENCE_DIR || resolve(root, 'test-results', network));
  await mkdir(evidence, { recursive: true });
  const receiptPath = resolve(evidence, 'receipt.json');
  const secrets = [randomBytes(24).toString('hex'), randomBytes(32).toString('hex'), randomBytes(24).toString('hex')];
  const [password, jwt, fixturePassword] = secrets;
  const databaseURL = `postgresql://${role}:${password}@${db}:5432/${database}`;
  const redact = value => secrets.reduce((s, secret) => s.replaceAll(secret, '[redacted]'), String(value));
  const report = {
    outcome: 'Running', startedAt: new Date().toISOString(), image, builder, resources, resourcesRetained: false,
    url: `http://127.0.0.1:${port}`, networkScope: 'owned private bridge; application published on loopback only; database has no published port',
    checks: [], sourceReplay: { outcome: 'Blocked', reason: 'C historical source adapter/packet not yet provided; no official result fixtures fabricated' },
    fixture: { email: 'et6-admin@example.test', passwordEnvironment: 'ET6_FIXTURE_PASSWORD', scope: 'Disposable private admin identity only' },
    cleanupCommand: ['node', resolve(root, 'scripts/test-et6-production.mjs'), '--cleanup', receiptPath],
  };
  async function docker(...args) {
    try { return (await execute('docker', args, { timeout: 180000, maxBuffer: 8 * 1024 * 1024 })).stdout.trim(); }
    catch (error) { throw new Error(`docker ${args[0]} failed: ${redact(error.stderr || error.code)}`); }
  }
  const sql = text => docker('exec', db, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', role, '-d', database, '-Atc', text);
  const run = code => docker('exec', app, 'node', '--input-type=module', '-e', code);
  function check(name, good) {
    report.checks.push({ name, outcome: good ? 'Worked' : 'Failed' });
    if (!good) throw new Error(name);
  }
  try {
    report.imageId = await docker('image', 'inspect', '--format', '{{.Id}}', image);
    report.builderId = await docker('image', 'inspect', '--format', '{{.Id}}', builder);
    await writeJson(receiptPath, report); // Names exist durably before resource creation.
    await docker('network', 'create', '--label', `${label}=${runId}`, network);
    await docker('run', '-d', '--name', db, '--label', `${label}=${runId}`, '--network', network,
      '-e', `POSTGRES_USER=${role}`, '-e', `POSTGRES_DB=${database}`, '-e', `POSTGRES_PASSWORD=${password}`, 'postgres:16-alpine');
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try { await docker('exec', db, 'pg_isready', '-U', role, '-d', database); ready = true; break; } catch { await delay(); }
    }
    check('owned PostgreSQL ready', ready);
    await writeFile(resolve(evidence, 'schema.log'), redact(await docker('run', '--rm', '--name', schema, '--label', `${label}=${runId}`, '--network', network,
      '-e', `DATABASE_URL=${databaseURL}`, '--entrypoint', 'node_modules/.bin/drizzle-kit', builder, 'push', '--force')));
    const migrationPath = resolve(root, 'migrations/20261011_live_results_reports.sql');
    const migration = await readFile(migrationPath);
    report.migration = { file: 'migrations/20261011_live_results_reports.sql', sha256: createHash('sha256').update(migration).digest('hex') };
    await docker('cp', migrationPath, `${db}:/tmp/et6-results-migration.sql`);
    for (let i = 0; i < 2; i++) await docker('exec', db, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', role, '-d', database, '-f', '/tmp/et6-results-migration.sql');
    check('explicit results migration applies and repeats', await sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('election_result_reports','candidate_result_lines','result_evidence_blobs')") === '3');
    await docker('run', '-d', '--name', app, '--label', `${label}=${runId}`, '--network', network, '-p', `127.0.0.1:${port}:5000`,
      '-e', `DATABASE_URL=${databaseURL}`, '-e', `JWT_SECRET=${jwt}`, '-e', `CANDIDATE_JWT_SECRET=${jwt}`,
      '-e', `ET6_FIXTURE_PASSWORD=${fixturePassword}`, '-e', `APP_ORIGIN=http://127.0.0.1:${port}`, image);
    ready = false;
    for (let i = 0; i < 60; i++) {
      if (await docker('inspect', '--format', '{{.State.Running}}', app) !== 'true') throw new Error('Packaged app exited during startup');
      try { await run("const r=await fetch('http://127.0.0.1:5000/api/health');if(r.status!==200||(await r.json()).ok!==true)throw Error('not ready')"); ready = true; break; } catch { await delay(); }
    }
    check('production health is ready', ready);
    const hostHealth = await fetch(`${report.url}/api/health`, { signal: AbortSignal.timeout(10000) });
    check('loopback browser preview is reachable', hostHealth.status === 200 && (await hostHealth.json()).ok === true);
    report.fixtureRegistration = JSON.parse(await run(`import pg from 'pg';
      const base='http://127.0.0.1:5000';
      const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'et6-admin@example.test',password:process.env.ET6_FIXTURE_PASSWORD})});
      if(r.status!==201)throw Error('fixture registration status '+r.status);
      const cookie=r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');if(!cookie)throw Error('fixture cookie absent');
      const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
      try{const q=await pool.query("UPDATE users SET role='admin' WHERE email=$1 RETURNING id",['et6-admin@example.test']);if(q.rowCount!==1)throw Error('fixture role setup failed');}finally{await pool.end();}
      const me=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});const body=await me.json();if(me.status!==200||body.user?.role!=='admin')throw Error('fixture session role mismatch');
      const invalid=await fetch(base+'/api/elections/1/results',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'});const refusal=await invalid.json();
      if(invalid.status!==422||refusal.code!=='invalid_report')throw Error('invalid report contract');
      console.log(JSON.stringify({register:201,me:200,role:body.user.role,invalidReport:{status:invalid.status,code:refusal.code}}));`));
    const ids = JSON.parse(await sql('SELECT coalesce(json_agg(id ORDER BY id),\'[]\'::json) FROM (SELECT id FROM elections ORDER BY id LIMIT 3) e'));
    check('real seeded elections available for none-state reads', ids.length > 0);
    report.results = JSON.parse(await run(`const base='http://127.0.0.1:5000',ids=${JSON.stringify(ids)},out={};
      async function get(path,headers={}){const r=await fetch(base+path,{headers});const text=await r.text();return {status:r.status,etag:r.headers.get('etag'),body:text?JSON.parse(text):null};}
      out.single=await get('/api/elections/'+ids[0]+'/results');
      if(out.single.status!==200||out.single.body.status!=='none'||out.single.body.totalVotes!==null||out.single.body.source!==null||out.single.body.candidates.length!==0)throw Error('none payload contract');
      out.alias=await get('/api/elections/'+ids[0]+'/live-results');if(JSON.stringify(out.alias.body)!==JSON.stringify(out.single.body))throw Error('alias mismatch');
      out.singleCached=await get('/api/elections/'+ids[0]+'/results',{'If-None-Match':out.single.etag});if(out.singleCached.status!==304||out.singleCached.body!==null)throw Error('single cache contract');
      const path='/api/results?ids='+ids.join(',');out.batch=await get(path);
      if(out.batch.status!==200||!out.batch.etag||!out.batch.body.cursor||out.batch.body.results.length!==ids.length||out.batch.body.results.some(x=>x.status!=='none')||JSON.stringify(out.batch.body.results.map(x=>x.electionId).sort((a,b)=>a-b))!==JSON.stringify(ids))throw Error('batch contract '+JSON.stringify({ids,batch:out.batch}));
      out.batchCached=await get(path,{'If-None-Match':out.batch.etag});out.cursorCached=await get(path+'&cursor='+encodeURIComponent(out.batch.body.cursor));
      if(out.batchCached.status!==304||out.cursorCached.status!==304||out.batchCached.body!==null||out.cursorCached.body!==null)throw Error('batch cache contract');
      out.invalid=[];for(const path of ['/api/results','/api/results?ids=abc','/api/results?ids=1&date=2026-11-03']){const x=await get(path);if(x.status!==400||x.body.code!=='invalid_query')throw Error('invalid query contract');out.invalid.push({path,status:x.status,code:x.body.code});}
      const missing=await get('/api/elections/not-an-id/results');if(missing.status!==404||missing.body.code!=='election_not_found')throw Error('invalid ID contract');out.invalid.push({path:'invalid ID',status:missing.status,code:missing.body.code});
      console.log(JSON.stringify(out));`));
    check('none read, alias, batch, validators and invalid inputs', true);
    report.resultRowCounts = await sql("SELECT (SELECT count(*) FROM election_result_reports)||':'||(SELECT count(*) FROM candidate_result_lines)||':'||(SELECT count(*) FROM result_evidence_blobs)");
    check('no fabricated reports, candidate votes or evidence inserted', report.resultRowCounts === '0:0:0');
    report.outcome = 'Worked';
    report.resourcesRetained = process.env.ET6_KEEP_RESOURCES !== '0';
    await writeJson(receiptPath, report);
  } catch (error) {
    report.outcome = 'Failed'; report.error = redact(error.message); process.exitCode = 1;
  } finally {
    try { await writeFile(resolve(evidence, 'application.log'), redact(await docker('logs', app))); } catch { /* App may not have been created. */ }
    if (report.outcome !== 'Worked' || !report.resourcesRetained) {
      report.resourcesRetained = false;
      try { report.cleanup = await cleanup(resources, docker); }
      catch (error) { report.cleanupError = redact(error.message); report.outcome = 'Failed'; process.exitCode = 1; }
    }
    report.completedAt = new Date().toISOString();
    await writeJson(receiptPath, report);
  }
  console.log(JSON.stringify({ receipt: receiptPath, ...report }));
}

