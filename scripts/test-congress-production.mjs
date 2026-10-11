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
const browserNetwork = `${network}-browser`;
const image = process.env.CONGRESS_PRODUCTION_IMAGE;
const builder = process.env.CONGRESS_BUILDER_IMAGE;
const previewPort = Number(process.env.CONGRESS_BROWSER_PREVIEW_PORT || 0);
if (previewPort && (!Number.isInteger(previewPort) || previewPort < 1024 || previewPort > 65535)) throw new Error('Invalid loopback preview port');
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
    for(const p of ['data/congress','server','shared','scripts','node_modules/esbuild','node_modules/tsx','node_modules/typescript'])if(fs.existsSync(p))throw Error('Unexpected runtime path '+p);
    for(const p of ['dist/index.js','dist/sync_official_congress.js','dist/congress-data/official-current-members.json','dist/congress-data/migration.sql'])if(!fs.existsSync(p))throw Error('Missing runtime artifact '+p);
    if(process.getuid()===0)throw Error('Runtime must be nonroot');
    console.log(JSON.stringify({uid:process.getuid(),rootCongressSourcePresent:fs.existsSync('data/congress'),otherRootData:fs.existsSync('data')?fs.readdirSync('data'):[],manifestSha256:crypto.createHash('sha256').update(fs.readFileSync('dist/congress-data/official-current-members.json')).digest('hex')}));`));
  check('runtime-only artifacts and nonroot identity', report.boundary.uid > 0);
  await docker('network', 'create', '--internal', network);
  await docker('run', '-d', '--name', db, '--network', network, '-e', 'POSTGRES_USER=et_congress_production_test', '-e', 'POSTGRES_DB=et_congress_production_test', '-e', `POSTGRES_PASSWORD=${password}`, 'postgres:16-alpine');
  let ready = false;
  for (let i = 0; i < 30; i++) { try { await docker('exec', db, 'pg_isready', '-U', 'et_congress_production_test'); ready = true; break; } catch { await new Promise(r => setTimeout(r, 1000)); } }
  check('owned PostgreSQL ready', ready);
  await writeFile(`${evidence}/schema.txt`, await docker('run', '--rm', '--network', network, '-e', `DATABASE_URL=${url}`, '--entrypoint', 'node_modules/.bin/drizzle-kit', builder, 'push', '--force'));
  await docker('run', '-d', '--name', app, '--network', network, ...(previewPort ? ['-p', `127.0.0.1:${previewPort}:5000`] : []), '-e', `DATABASE_URL=${url}`, '-e', `JWT_SECRET=${password}`, '-e', `CANDIDATE_JWT_SECRET=${password}`, '-e', 'APP_ORIGIN=http://127.0.0.1:5000', image);
  if (previewPort) {
    await docker('network', 'create', browserNetwork);
    await docker('network', 'connect', browserNetwork, app);
  }
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
  // Independent receiving oracle: actual pinned JSON projected with SQL, without
  // importing any importer/planner/hash implementation. Synthetic rows are only
  // labelled legacy/history/preservation controls in this disposable database.
  await run(`import fs from 'node:fs';import pg from 'pg';
    const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
    try {
      const members=JSON.parse(fs.readFileSync('/app/dist/congress-data/official-current-members.json','utf8')).members;
      await pool.query('CREATE TABLE d_expected_congress (member jsonb NOT NULL)');
      await pool.query('INSERT INTO d_expected_congress SELECT value FROM jsonb_array_elements($1::jsonb)',[JSON.stringify(members)]);
      await pool.query('ALTER TABLE congress_members ADD COLUMN d_retained_proof jsonb');
      await pool.query("INSERT INTO congress_members(bioguide_id,name,party,state,chamber,congress,d_retained_proof) VALUES ('IMPORT_D_FIXTURE','Synthetic legacy preservation fixture','UNKNOWN','ZZ','House',119,$1),('HISTORY_D_FIXTURE','Synthetic historical preservation fixture','UNKNOWN','ZZ','Senate',118,$1)",[JSON.stringify({nested:{owner:'D private fixture'},values:[1,null,'preserve']})]);
      const m=members[0];
      await pool.query('INSERT INTO congress_members(bioguide_id,name,party,state,district,chamber,congress,created_at,updated_at,d_retained_proof) VALUES($1,$2,$3,$4,$5,$6,119,$7,$8,$9)',[m.bioguideId,'Synthetic stale-name update control',m.partyRaw,m.state,m.district,m.chamber,'2020-01-02T03:04:05Z','2021-02-03T04:05:06Z',JSON.stringify({existingOfficial:'preserve every unrelated field'})]);
      await pool.query('CREATE TABLE d_congress_before AS SELECT id,to_jsonb(m) AS row FROM congress_members m');
    } finally { await pool.end(); }`);
  const guardedDry = await cli([], 'positive-guarded-dry');
  check('positive fixture dry-run plans 538 inserts and one update', guardedDry.status === 0 && guardedDry.receipt.insertedCount === 538 && guardedDry.receipt.updatedCount === 1);
  const apply = await cli(['--apply', '--expect-manifest-sha', guardedDry.receipt.manifestSha256, '--expect-preimage-sha', guardedDry.receipt.preimageSha256], 'positive-apply');
  check('actual production CLI commits guarded positive apply', apply.status === 0 && apply.receipt.committed === true && apply.receipt.changedCount === 539 && apply.receipt.catalogComplete === false && apply.receipt.sourceCoverageComplete === true);
  const equalitySQL = `WITH expected AS (
    SELECT member->>'bioguideId' id,member->>'name' name,member->>'partyRaw' party,member->>'state' state,member->>'district' district,member->>'chamber' chamber,(member->>'congress')::int congress FROM d_expected_congress
  ), actual AS (SELECT * FROM congress_members WHERE bioguide_id IN (SELECT id FROM expected))
  SELECT json_build_object('expected', (SELECT count(*) FROM expected), 'distinctExpected', (SELECT count(DISTINCT id) FROM expected),
    'received', (SELECT count(*) FROM actual), 'mismatches', (SELECT count(*) FROM expected e FULL JOIN actual a ON a.bioguide_id=e.id WHERE e.id IS NULL OR a.bioguide_id IS NULL OR ROW(e.name,e.party,e.state,e.district,e.chamber,e.congress) IS DISTINCT FROM ROW(a.name,a.party,a.state,a.district,a.chamber,a.congress)),
    'total', (SELECT count(*) FROM congress_members))`;
  report.positiveSQL = JSON.parse(await sql(equalitySQL));
  check('independent SQL receives exactly 539 real IDs and every approved field', report.positiveSQL.expected === 539 && report.positiveSQL.distinctExpected === 539 && report.positiveSQL.received === 539 && report.positiveSQL.mismatches === 0 && report.positiveSQL.total === 541);
  const protectedSQL = `SELECT count(*) FROM d_congress_before b LEFT JOIN congress_members m USING(id)
    WHERE m.id IS NULL OR (CASE WHEN b.row->>'bioguide_id' IN ('IMPORT_D_FIXTURE','HISTORY_D_FIXTURE') THEN b.row IS DISTINCT FROM to_jsonb(m)
    ELSE (b.row - ARRAY['bioguide_id','name','party','state','district','chamber','congress']) IS DISTINCT FROM (to_jsonb(m) - ARRAY['bioguide_id','name','party','state','district','chamber','congress']) END)`;
  check('legacy/history full rows and all unrelated existing fields preserved', await sql(protectedSQL) === '0');
  const xminSQL = "SELECT md5(string_agg(id::text||':'||xmin::text,',' ORDER BY id)) FROM congress_members";
  const firstXmin = await sql(xminSQL), firstCatalog = await catalog();
  const repeatDry = await cli([], 'repeat-guarded-dry');
  check('repeat dry-run plans zero member writes', repeatDry.status === 0 && repeatDry.receipt.changedCount === 0);
  const repeat = await cli(['--apply', '--expect-manifest-sha', repeatDry.receipt.manifestSha256, '--expect-preimage-sha', repeatDry.receipt.preimageSha256], 'positive-repeat');
  check('guarded production repeat commits zero member writes with stable xmin/full rows', repeat.status === 0 && repeat.receipt.committed === true && repeat.receipt.changedCount === 0 && firstXmin === await sql(xminSQL) && firstCatalog === await catalog() && await sql(protectedSQL) === '0');
  report.audit = JSON.parse(await run(`import pg from 'pg';const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});try{
    const expected=${JSON.stringify([apply.receipt, repeat.receipt])};
    const {rows}=await pool.query('SELECT id,manifest_sha256,preimage_sha256,postimage_sha256,receipt,jsonb_array_length(preimage) AS before_count,jsonb_array_length(postimage) AS after_count FROM congress_official_import_runs ORDER BY created_at,id');
    if(rows.length!==2)throw Error('expected two durable audit rows');
    for(const e of expected){const r=rows.find(x=>x.id===e.runId);if(!r||r.manifest_sha256!==e.manifestSha256||r.preimage_sha256!==e.preimageSha256||r.postimage_sha256!==e.postimageSha256||r.receipt.committed!==true||r.receipt.changedCount!==e.changedCount||r.after_count!==541)throw Error('durable audit differs from committed receipt');}
    if(!rows.some(r=>r.before_count===3&&r.receipt.changedCount===539)||!rows.some(r=>r.before_count===541&&r.receipt.changedCount===0))throw Error('wrong durable before/after scope');
    console.log(JSON.stringify({rows:rows.length,runIds:rows.map(r=>r.id),afterCounts:rows.map(r=>r.after_count)}));
  }finally{await pool.end();}`));
  check('separate database connection reads exact committed audits and full image scopes', report.audit.rows === 2);
  const auditDigestSQL = "SELECT md5(string_agg(row_to_json(r)::text,'' ORDER BY id)) FROM congress_official_import_runs r";
  const auditDigest = await sql(auditDigestSQL);
  await sql(migration);
  check('shipped audit migration repeat preserves durable audit rows byte-for-byte', auditDigest === await sql(auditDigestSQL));
  report.positiveRepeat = { changedCount: repeat.receipt.changedCount, xminDigest: firstXmin, catalog: firstCatalog, auditDigest };
  const membersCapture = JSON.parse(await run(`import pg from 'pg';import {createHash} from 'node:crypto';
    const response=await fetch('http://127.0.0.1:5000/api/members?scope=all');
    const bytes=Buffer.from(await response.arrayBuffer());
    if(response.status!==200)throw Error('members status '+response.status);
    const actual=JSON.parse(bytes.toString('utf8'));if(!Array.isArray(actual))throw Error('members must be an array');
    const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
    try {
      const {rows}=await pool.query('SELECT id,bioguide_id AS "bioguideId",name,party,state,district,chamber,congress,created_at AS "createdAt",updated_at AS "updatedAt" FROM congress_members ORDER BY id');
      const expected=JSON.parse(JSON.stringify(rows)),byId=new Map(expected.map(x=>[x.id,x]));
      const canonical=row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))));
      const mismatches=actual.filter(row=>!byId.has(row.id)||canonical(row)!==canonical(byId.get(row.id))).length;
      const duplicateIds=actual.length-new Set(actual.map(x=>x.id)).size;
      if(actual.length!==541||expected.length!==541||mismatches||duplicateIds)throw Error('members SQL receiving mismatch');
      console.log(JSON.stringify({status:response.status,contentType:response.headers.get('content-type'),bodyBase64:bytes.toString('base64'),responseSha256:createHash('sha256').update(bytes).digest('hex'),responseBytes:bytes.length,rows:actual.length,sqlRows:expected.length,mismatches,duplicateIds,sqlProjection:expected,partyCounts:actual.reduce((a,r)=>(a[r.party??'null']=(a[r.party??'null']??0)+1,a),{}),territoryCounts:Object.fromEntries(['PR','GU','AS','MP','VI'].map(s=>[s,actual.filter(r=>r.state===s).length]))}));
    }finally{await pool.end();}`));
  await writeFile(`${evidence}/members-response.json`, Buffer.from(membersCapture.bodyBase64, 'base64'));
  await writeFile(`${evidence}/members-sql-projection.json`, JSON.stringify(membersCapture.sqlProjection, null, 2));
  const { bodyBase64, sqlProjection, ...membersMetadata } = membersCapture;
  report.membersReceiving = { ...membersMetadata, path: '/api/members?scope=all', sourceBase: 'http://127.0.0.1:5000 inside owned runtime container', imageId: report.imageId, manifestSha256: report.boundary.manifestSha256, phase: 'after guarded 539-member apply and zero-write repeat', actualSourceMembers: 539, syntheticPreservationControls: 2, responseFile: 'members-response.json', sqlFile: 'members-sql-projection.json' };
  await writeFile(`${evidence}/members-receiving.json`, JSON.stringify(report.membersReceiving, null, 2));
  check('actual GET members payload matches independent SQL for all 541 rows and exposed fields', membersMetadata.mismatches === 0 && membersMetadata.duplicateIds === 0);
  report.scopes = JSON.parse(await run(`import pg from 'pg';const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});try{
    const cases=[['/api/members',539,"congress=119 AND bioguide_id ~ '^[A-Z][0-9]{6}$'"],['/api/members?scope=history',1,'congress<>119'],['/api/members?scope=legacy',1,"congress=119 AND bioguide_id !~ '^[A-Z][0-9]{6}$'"],...['PR','GU','AS','MP','VI'].map(s=>['/api/members/'+s,1,"state='"+s+"'"])];const out=[];
    for(const [path,count,where] of cases){const r=await fetch('http://127.0.0.1:5000'+path),body=await r.json();const {rows}=await pool.query('SELECT bioguide_id FROM congress_members WHERE '+where);if(r.status!==200||body.length!==count||JSON.stringify(body.map(x=>x.bioguideId).sort())!==JSON.stringify(rows.map(x=>x.bioguide_id).sort()))throw Error('scope mismatch '+path);out.push({path,status:r.status,count:body.length,scope:r.headers.get('x-congress-scope')});}console.log(JSON.stringify(out));
  }finally{await pool.end();}`));
  check('actual current/history/legacy and five territory reads match independent SQL', report.scopes.length === 8);
  report.outcome = 'Worked';
} catch (error) { report.error = error.message; process.exitCode = 1; }
finally {
  if (previewPort && report.outcome === 'Worked') {
    report.preview = { url: `http://127.0.0.1:${previewPort}`, app, db, network, browserNetwork };
    report.network = 'internal database network; app published only to loopback for browser receiving';
  } else {
    await docker('rm', '-f', app).catch(() => {});
    await docker('rm', '-f', db).catch(() => {});
    await docker('network', 'rm', network).catch(() => {});
    if (previewPort) await docker('network', 'rm', browserNetwork).catch(() => {});
  }
  await writeFile(`${evidence}/receipt.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
