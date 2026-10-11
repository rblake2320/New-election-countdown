import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Run: node --experimental-vm-modules --test tests/congress-legacy-guard.node.mjs
// Byte-pinned old controls also work in a shallow CI checkout without Git history.
const fixtureRoot = path.join(root, 'tests/fixtures/congress-legacy');
const fixtureProvenance = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'provenance.json'), 'utf8'));
function frozenSource(name) {
  const declared = fixtureProvenance.files[name];
  const bytes = fs.readFileSync(path.join(fixtureRoot, declared.fixture));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), declared.sha256, 'Legacy control fixture digest changed');
  return bytes.toString('utf8');
}
const before = frozenSource('bulk_restore_congress.js');
const after = fs.readFileSync(path.join(root, 'bulk_restore_congress.js'), 'utf8');
const siblingBefore = frozenSource('restore_congress_members.js');
const siblingAfter = fs.readFileSync(path.join(root, 'restore_congress_members.js'), 'utf8');
const directory = process.env.CONGRESS_LEGACY_GUARD_EVIDENCE_DIR
  ?? path.join(root, 'artifacts/congress-legacy-guard-runs', `${process.pid}-${randomUUID()}`);
fs.mkdirSync(directory, { recursive: true });
console.log(JSON.stringify({ legacyGuardEvidence: directory }));
const control = { bioguideId:'EXPLICIT_EXISTING_CONTROL', name:'Synthetic existing local profile', description:'Must remain intact' };
const fixture = [
  { full_name:'Explicit Fixture Missing ID A', party:'D', state:'MN', district:'Senate', chamber:'Senate' },
  { full_name:'Explicit Fixture Missing ID B', party:'R', state:'MN', district:'01', chamber:'House' },
];

async function simulatedEntry(source, members, rejectInsert = false) {
  const receipt = { imports:[], envReads:[], fileCalls:[], dbCalls:[], rows:[structuredClone(control)], inserted:[], stdout:[], stderr:[] };
  let finish;
  const exited = new Promise(resolve => { finish = resolve; });
  const fakeProcess = { exit(code) { receipt.exitCode = code; finish(); }, get exitCode() { return receipt.exitCode; }, set exitCode(code) { receipt.exitCode=code; finish(); } };
  fakeProcess.env = new Proxy({}, {get(_target,key){receipt.envReads.push(String(key)); return key==='DATABASE_URL' ? 'explicit-synthetic-connection-placeholder' : undefined;}});
  const context = vm.createContext({ console:{log:(...args)=>receipt.stdout.push(args.join(' ')),error:(...args)=>receipt.stderr.push(args.join(' '))}, process:fakeProcess });
  const database = {
    async delete(table) { receipt.dbCalls.push({kind:'delete',table}); receipt.rows=[]; },
    insert(table) {
      receipt.dbCalls.push({kind:'insert',table});
      return { values(rows) { receipt.inserted.push(...structuredClone(rows)); return { async onConflictDoNothing() {
        if (rejectInsert) throw new Error('Explicit synthetic insert failure');
        receipt.rows.push(...structuredClone(rows));
      }}; }};
    },
    select() { receipt.dbCalls.push({kind:'select'}); return { async from() { return receipt.rows; } }; },
  };
  const module = new vm.SourceTextModule(source, { context });
  await module.link(async specifier => {
    receipt.imports.push(specifier);
    let exports;
    if (specifier === 'fs') exports = { default:{readFileSync(file) { receipt.fileCalls.push(file); return JSON.stringify(members); }} };
    else if (specifier === './server/db.js') exports = { db:database };
    else if (specifier === './shared/schema.js') exports = { congressMembers:'explicit_synthetic_table' };
    else if (specifier === '@neondatabase/serverless') exports = { Pool:class {
      constructor(options) {receipt.dbCalls.push({kind:'pool',options});}
      async query(sql,params) {
        if(sql.startsWith('DELETE')) {receipt.dbCalls.push({kind:'delete'}); receipt.rows=[]; return {};}
        if(sql.includes('INSERT INTO')) {
          receipt.dbCalls.push({kind:'insert'});
          const row={bioguideId:params[0],name:params[1],congress:params[6]}; receipt.inserted.push(row);
          if(rejectInsert)throw new Error('Explicit synthetic insert failure');
          receipt.rows.push(row); return {};
        }
        if(sql.startsWith('SELECT COUNT')) {receipt.dbCalls.push({kind:'select'}); return {rows:[{count:receipt.rows.length}]};}
        throw new Error('Unexpected synthetic query');
      }
      async end() {receipt.dbCalls.push({kind:'end'}); receipt.exitCode??=0; finish();}
    }};
    else throw new Error('Refused unexpected synthetic module: ' + specifier);
    return new vm.SyntheticModule(Object.keys(exports), function() { for(const [key,value] of Object.entries(exports)) this.setExport(key,value); }, {context});
  });
  await module.evaluate();
  await Promise.race([exited, new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Synthetic entrypoint did not finish')),2000); timer.unref();})]);
  return receipt;
}

test('immutable old writer deletes the existing synthetic profile before an insertion failure', async () => {
  const red = await simulatedEntry(before, fixture, true);
  assert.equal(red.exitCode,1);
  assert.equal(red.fileCalls.length,1);
  assert.equal(red.dbCalls[0].kind,'delete');
  assert.equal(red.dbCalls[1].kind,'insert');
  assert.equal(red.rows.length,0);
  fs.writeFileSync(path.join(directory,'old-delete-first-red.json'),JSON.stringify(red,null,2)+'\n');
});

test('immutable old writer fabricates order-dependent ids from unverified names', async () => {
  const forward = await simulatedEntry(before, fixture);
  const reverse = await simulatedEntry(before, fixture.slice().reverse());
  assert.equal(forward.exitCode,0); assert.equal(reverse.exitCode,0);
  const ids = result => Object.fromEntries(result.inserted.map(row=>[row.name,row.bioguideId]));
  assert.notDeepEqual(ids(forward),ids(reverse));
  assert(forward.inserted.every(row=>row.congress===119));
  fs.writeFileSync(path.join(directory,'old-identity-red.json'),JSON.stringify({forward,reverse},null,2)+'\n');
});

test('immutable sibling deletes before failure and swallows the failure as a normal exit', async () => {
  const red=await simulatedEntry(siblingBefore,fixture,true);
  assert.equal(red.exitCode,0);
  assert.deepEqual(red.envReads,['DATABASE_URL']);
  assert.equal(red.rows.length,0);
  assert.equal(red.dbCalls[1].kind,'delete');
  assert(red.stderr.some(line=>line.includes('Error restoring congressional members')));
  assert.deepEqual(red.inserted.map(row=>row.bioguideId),fixture.map(row=>row.full_name));
  fs.writeFileSync(path.join(directory,'sibling-old-delete-and-name-id-red.json'),JSON.stringify(red,null,2)+'\n');
});

test('guarded source emits typed refusal before any application module/file/database access', async () => {
  const green = await simulatedEntry(after, fixture, true);
  assert.equal(green.exitCode,1);
  assert.deepEqual(green.imports,[]);
  assert.deepEqual(green.envReads,[]);
  assert.deepEqual(green.fileCalls,[]);
  assert.deepEqual(green.dbCalls,[]);
  assert.deepEqual(green.rows,[control]);
  const message = JSON.parse(green.stderr.join('\n'));
  assert.equal(message.code,'LEGACY_CONGRESS_SOURCE_UNVERIFIED');
  assert.equal(message.outcome,'refused');
  assert.equal(message.stage,'before_file_or_database_access');
  assert.match(message.remediation,/sync_official_congress/);
  fs.writeFileSync(path.join(directory,'new-mocked-access-green.json'),JSON.stringify(green,null,2)+'\n');
});

test('guarded sibling refuses before environment, file or database access', async () => {
  const green=await simulatedEntry(siblingAfter,fixture,true);
  assert.equal(green.exitCode,1);
  assert.deepEqual(green.imports,[]);
  assert.deepEqual(green.envReads,[]);
  assert.deepEqual(green.fileCalls,[]);
  assert.deepEqual(green.dbCalls,[]);
  assert.deepEqual(green.rows,[control]);
  assert.equal(JSON.parse(green.stderr.join('\n')).operation,'restore_congress_members');
  fs.writeFileSync(path.join(directory,'sibling-new-mocked-access-green.json'),JSON.stringify(green,null,2)+'\n');
});

for(const filename of ['bulk_restore_congress.js','restore_congress_members.js'])test('actual Node '+filename+' refuses in an empty working directory even with --apply', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'congress-legacy-guard-'));
  try {
    const loader = "export async function resolve(specifier,context,next){if(context.parentURL?.endsWith('/"+filename+"')){console.error(JSON.stringify({applicationImportAttempt:specifier}));throw Error('Application imports forbidden by guard probe');}return next(specifier,context);}";
    const loaderUrl = 'data:text/javascript,' + encodeURIComponent(loader);
    const result = spawnSync(process.execPath,['--no-warnings','--experimental-loader='+loaderUrl,path.join(root,filename),'--apply'],{cwd:temp,env:{},encoding:'utf8'});
    assert.equal(result.status,1);
    assert.equal(result.stdout,'');
    const lines=result.stderr.trim().split('\n').map(line=>JSON.parse(line));
    const imports=lines.filter(line=>line.applicationImportAttempt);
    assert.deepEqual(imports,[]);
    const message=lines.find(line=>line.code);
    assert.equal(message.code,'LEGACY_CONGRESS_SOURCE_UNVERIFIED');
    assert.equal(message.writes,false);
    assert.deepEqual(fs.readdirSync(temp),[]);
    fs.writeFileSync(path.join(directory,filename==='bulk_restore_congress.js'?'actual-entrypoint-green.json':'sibling-actual-entrypoint-green.json'),JSON.stringify({exitCode:result.status,stdout:result.stdout,message,applicationImports:imports,applicationFileCalls:0,applicationDatabaseCalls:0,callBasis:'Actual loader refuses any application import; guarded source has no file/database access, confirmed separately by identical source mock probe',emptyWorkingDirectory:true,environment:'empty; no DB/provider/secrets'},null,2)+'\n');
  } finally { fs.rmdirSync(temp); }
});

{
  fs.writeFileSync(path.join(directory,'source-provenance.json'),JSON.stringify({beforeCommit:'425510af784c166fbdf761165c3f39d48ebf4130',beforeSha256:createHash('sha256').update(before).digest('hex'),afterSha256:createHash('sha256').update(after).digest('hex'),oldExecution:'exact immutable source via Node VM with synthetic fs/db/schema/process; zero real DB/provider/env',newExecution:'same mock imports/calls plus actual Node child with empty environment/working directory',scope:'bulk_restore_congress.js only; no importer/service/schema/routes/packages'},null,2)+'\n');
}
