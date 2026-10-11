import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

// D-owned receiving test: only the runtime image executes the CLI and HTTP app.
// The builder supplies schema tooling to an owned, disposable database only.
const execute = promisify(execFile);
const suffix = `${process.pid}-${randomBytes(4).toString('hex')}`;
const network = `et-congress-prod-${suffix}`;
const db = `${network}-db`, app = `${network}-app`;
const image = process.env.CONGRESS_PRODUCTION_IMAGE;
const builder = process.env.CONGRESS_BUILDER_IMAGE;
if (!image || !builder) throw new Error('Explicit production and builder image tags are required');
const evidence = `test-results/congress-production-${suffix}`;
await mkdir(evidence, { recursive: true });
const password = randomBytes(24).toString('hex');
const url = `postgresql://et_congress_production_test:${password}@${db}:5432/et_congress_production_test`;
const report = { outcome: 'Failed', image, builder, network: 'internal; no published ports', checks: [] };
async function docker(...args) {
  try { return (await execute('docker', args, { timeout: 180000, maxBuffer: 8 * 1024 * 1024 })).stdout.trim(); }
  catch (error) { throw new Error(`docker ${args[0]}: ${String(error.stderr || error.code).replaceAll(password, '[redacted]')}`); }
}
const sql = text => docker('exec', db, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'et_congress_production_test', '-d', 'et_congress_production_test', '-Atc', text);
const run = code => docker('exec', app, 'node', '--input-type=module', '-e', code);
function check(name, value) { if (!value) throw new Error(name); report.checks.push({ name, outcome: 'Worked' }); }
async function cli(args, label) {
  // Credentials stay in the app environment. No host source or data is mounted.
  const result = JSON.parse(await run(`import {spawnSync} from 'node:child_process';import {readFileSync,existsSync} from 'node:fs';
    const args=${JSON.stringify(args)},path='/tmp/${label}.json';
    const r=spawnSync(process.execPath,['/app/dist/sync_official_congress.js',...args,'--receipt',path],{cwd:'/tmp',encoding:'utf8',env:process.env});
    console.log(JSON.stringify({status:r.status,stdout:r.stdout,stderr:r.stderr,receipt:existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null}));`));
  await writeFile(`${evidence}/${label}.json`, JSON.stringify(result, null, 2));
  return result;
}
const catalog = () => sql("SELECT count(*)||':'||coalesce(md5(string_agg(row_to_json(m)::text,'' ORDER BY id)),'empty') FROM congress_members m");
try {
  report.imageId = await docker('image', 'inspect', '--format', '{{.Id}}', image);
  report.builderId = await docker('image', 'inspect', '--format', '{{.Id}}', builder);
  report.boundary = JSON.parse(await docker('run', '--rm', '--network', 'none', '--entrypoint', 'node', image, '-e', `
    const fs=require('fs'),crypto=require('crypto');
    for(const p of ['data','server','shared','scripts','node_modules/esbuild','node_modules/tsx','node_modules/typescript'])if(fs.existsSync(p))throw Error('Unexpected runtime path '+p);
    for(const p of ['dist/index.js','dist/sync_official_congress.js','dist/congress-data/official-current-members.json','dist/congress-data/migration.sql'])if(!fs.existsSync(p))throw Error('Missing runtime artifact '+p);
    if(process.getuid()===0)throw Error('Runtime must be nonroot');
    console.log(JSON.stringify({uid:process.getuid(),manifestSha256:crypto.createHash('sha256').update(fs.readFileSync('dist/congress-data/official-current-members.json')).digest('hex')}));`));
  check('runtime-only artifacts and nonroot identity', report.boundary.uid > 0);
  await docker('network', 'create', '--internal', network);
  await docker('run', '-d', '--name', db, '--network', network, '-e', 'POSTGRES_USER=et_congress_production_test', '-e', 'POSTGRES_DB=et_congress_production_test', '-e', `POSTGRES_PASSWORD=${password}`, 'postgres:16-alpine');
  let ready = false;
  for (let i = 0; i < 30; i++) { try { await docker('exec', db, 'pg_isready', '-U', 'et_congress_production_test'); ready = true; break; } catch { await new Promise(r => setTimeout(r, 1000)); } }
  check('owned PostgreSQL ready', ready);
  await writeFile(`${evidence}/schema.txt`, await docker('run', '--rm', '--network', network, '-e', `DATABASE_URL=${url}`, '--entrypoint', 'node_modules/.bin/drizzle-kit', builder, 'push', '--force'));
  await docker('run', '-d', '--name', app, '--network', network, '-e', `DATABASE_URL=${url}`, '-e', `JWT_SECRET=${password}`, '-e', `CANDIDATE_JWT_SECRET=${password}`, '-e', 'APP_ORIGIN=http://127.0.0.1:5000', image);
  ready = false;
  for (let i = 0; i < 60; i++) { try { await run("const r=await fetch('http://127.0.0.1:5000/api/health');if(r.status!==200)throw Error('health '+r.status)"); ready = true; break; } catch { await new Promise(r => setTimeout(r, 1000)); } }
  check('actual packaged HTTP server healthy', ready);
  const before = await catalog();
  const auditsBefore = await sql('SELECT count(*) FROM congress_official_import_runs');
  const dry = await cli([], 'dry-default-from-tmp');
  check('default compiled-relative loader dry-run receives 539 real members', dry.status === 0 && dry.receipt?.sourceMemberCount === 539 && dry.receipt.committed === false && dry.receipt.manifestSha256 === report.boundary.manifestSha256);
  check('dry-run leaves full catalog and audit unchanged', before === await catalog() && auditsBefore === await sql('SELECT count(*) FROM congress_official_import_runs'));
  const unguarded = await cli(['--apply'], 'apply-without-digests');
  check('apply without explicit digest refuses', unguarded.status !== 0 && unguarded.receipt?.committed === false && /exact reviewed manifest SHA/.test(unguarded.stderr));
  await run("import fs from 'node:fs';fs.writeFileSync('/tmp/altered-manifest.json',fs.readFileSync('/app/dist/congress-data/official-current-members.json','utf8')+' ')");
  const altered = await cli(['--manifest', '/tmp/altered-manifest.json'], 'altered-source');
  check('changed source bytes refuse', altered.status !== 0 && /SHA differs/.test(altered.stderr));
  await sql('DROP TABLE congress_official_import_runs');
  const noMigration = await cli([], 'missing-migration');
  check('missing audit migration refuses', noMigration.status !== 0 && /Run migrations/.test(noMigration.stderr));
  const migration = await run("import fs from 'node:fs';process.stdout.write(fs.readFileSync('/app/dist/congress-data/migration.sql','utf8'))");
  await sql(migration); await sql(migration);
  check('shipped migration applies and repeats', await sql("SELECT count(*) FROM congress_official_import_runs") === '0');
  const afterMigration = await cli([], 'after-shipped-migration');
  check('CLI receives after shipped migration', afterMigration.status === 0 && afterMigration.receipt?.sourceMemberCount === 539);
  // Register through the actual server; role changes below are private fixture setup.
  await run(`import fs from 'node:fs';const r=await fetch('http://127.0.0.1:5000/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'congress-receiving@example.test',password:'Disposable-Fixture-2026!'})});if(!r.ok)throw Error('registration '+r.status);const cookie=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');if(!cookie)throw Error('no cookie');fs.writeFileSync('/tmp/test-cookie',cookie,{mode:0o600});`);
  const http = async (authenticated, expected) => JSON.parse(await run(`import fs from 'node:fs';const out=[];for(const path of ['/api/congress/import','/api/congress/sync-all']){const r=await fetch('http://127.0.0.1:5000'+path,{method:'POST',headers:{'Content-Type':'application/json',${authenticated ? "Cookie:fs.readFileSync('/tmp/test-cookie','utf8')," : ''}},body:'{}'});const body=await r.json();if(r.status!==${expected})throw Error(path+' status '+r.status+' '+JSON.stringify(body));out.push({path,status:r.status,body});}console.log(JSON.stringify(out));`));
  report.anonymous = await http(false, 401);
  report.ordinary = await http(true, 403);
  await sql("UPDATE users SET role='admin' WHERE email='congress-receiving@example.test'");
  report.legacy = await http(true, 422);
  check('actual admin legacy routes return typed refusal', report.legacy.every(r => r.body.code === 'LEGACY_CONGRESS_SOURCE_UNVERIFIED' && !('result' in r.body)));
  check('all refusal paths preserve full catalog and zero audits', before === await catalog() && await sql('SELECT count(*) FROM congress_official_import_runs') === '0');
  report.outcome = 'Worked';
} catch (error) { report.error = error.message; process.exitCode = 1; }
finally {
  await docker('rm', '-f', app).catch(() => {});
  await docker('rm', '-f', db).catch(() => {});
  await docker('network', 'rm', network).catch(() => {});
  await writeFile(`${evidence}/receipt.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
