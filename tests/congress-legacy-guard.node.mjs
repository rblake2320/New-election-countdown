import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const before = execFileSync('git', ['show', '425510af784c166fbdf761165c3f39d48ebf4130:bulk_restore_congress.js'], { cwd: root, encoding: 'utf8' });
const after = fs.readFileSync(path.join(root, 'bulk_restore_congress.js'), 'utf8');
const directory = path.join(root, 'artifacts/congress-legacy-guard');
fs.mkdirSync(directory, { recursive: true });
const control = { bioguideId:'EXPLICIT_EXISTING_CONTROL', name:'Synthetic existing local profile', description:'Must remain intact' };
const fixture = [
  { full_name:'Explicit Fixture Missing ID A', party:'D', state:'MN', district:'Senate', chamber:'Senate' },
  { full_name:'Explicit Fixture Missing ID B', party:'R', state:'MN', district:'01', chamber:'House' },
];

async function simulatedEntry(source, members, rejectInsert = false) {
  const receipt = { imports:[], fileCalls:[], dbCalls:[], rows:[structuredClone(control)], inserted:[], stdout:[], stderr:[] };
  let finish;
  const exited = new Promise(resolve => { finish = resolve; });
  const fakeProcess = { exit(code) { receipt.exitCode = code; finish(); }, get exitCode() { return receipt.exitCode; }, set exitCode(code) { receipt.exitCode=code; finish(); } };
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

test('guarded source emits typed refusal before any application module/file/database access', async () => {
  const green = await simulatedEntry(after, fixture, true);
  assert.equal(green.exitCode,1);
  assert.deepEqual(green.imports,[]);
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

test('actual Node entrypoint refuses in an empty working directory even with --apply', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'congress-legacy-guard-'));
  try {
    const loader = "export async function resolve(specifier,context,next){if(context.parentURL?.endsWith('/bulk_restore_congress.js')){console.error(JSON.stringify({applicationImportAttempt:specifier}));throw Error('Application imports forbidden by guard probe');}return next(specifier,context);}";
    const loaderUrl = 'data:text/javascript,' + encodeURIComponent(loader);
    const result = spawnSync(process.execPath,['--no-warnings','--experimental-loader='+loaderUrl,path.join(root,'bulk_restore_congress.js'),'--apply'],{cwd:temp,env:{},encoding:'utf8'});
    assert.equal(result.status,1);
    assert.equal(result.stdout,'');
    const lines=result.stderr.trim().split('\n').map(line=>JSON.parse(line));
    const imports=lines.filter(line=>line.applicationImportAttempt);
    assert.deepEqual(imports,[]);
    const message=lines.find(line=>line.code);
    assert.equal(message.code,'LEGACY_CONGRESS_SOURCE_UNVERIFIED');
    assert.equal(message.writes,false);
    assert.deepEqual(fs.readdirSync(temp),[]);
    fs.writeFileSync(path.join(directory,'actual-entrypoint-green.json'),JSON.stringify({exitCode:result.status,stdout:result.stdout,message,applicationImports:imports,applicationFileCalls:0,applicationDatabaseCalls:0,callBasis:'Actual loader refuses any application import; guarded source has no file/database access, confirmed separately by identical source mock probe',emptyWorkingDirectory:true,environment:'empty; no DB/provider/secrets'},null,2)+'\n');
  } finally { fs.rmdirSync(temp); }
});

{
  fs.writeFileSync(path.join(directory,'source-provenance.json'),JSON.stringify({beforeCommit:'425510af784c166fbdf761165c3f39d48ebf4130',beforeSha256:createHash('sha256').update(before).digest('hex'),afterSha256:createHash('sha256').update(after).digest('hex'),oldExecution:'exact immutable source via Node VM with synthetic fs/db/schema/process; zero real DB/provider/env',newExecution:'same mock imports/calls plus actual Node child with empty environment/working directory',scope:'bulk_restore_congress.js only; no importer/service/schema/routes/packages'},null,2)+'\n');
}
