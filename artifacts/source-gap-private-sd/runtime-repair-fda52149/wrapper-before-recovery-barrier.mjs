/** Explicit C-only owner-authorized source increment; never applies schema or deploys. */
import pg from 'pg';
import {parse} from 'dotenv';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseNomineeManifest,runNomineeRefresh} from '../server/candidate-nominee-sync.ts';
import {captureSourceSnapshot,stateCoverage} from './source_data_capture.ts';
import {DATA_TABLES,guard,snapshot,sourceHash,createPrivateDirectory,savePrivateSnapshot,rollbackSourceRows} from './source_data_rollback.ts';
const preimage='99d76b1c02ac17d106aa3534e43493d70f8f5e3095cbe75e5127c896584be673';
const manifestSha='f83bee609922a2213213d26fdd956c248a69a14718936ff2f39a757c0821223a';
const core='72f7e8e6e5ac3fb93a7d31993c094565c1de1310';
const gateSha='53c3c3b96de871501117ed54bc7dc2553e7b37b5270aa309331109d413d88c51';
const args=process.argv.slice(2);
if(JSON.stringify(args)!==JSON.stringify(['--apply-owner-approved-increment','--expect-preimage-sha256',preimage,'--expect-manifest-sha256',manifestSha]))throw new Error('Exact reviewed owner-authorized source increment arguments required');
const out='artifacts/source-gap-shared',receiptPath=out+'/apply-done.json';
if(existsSync(receiptPath))throw new Error('Retained increment receipt exists; inspect outcome before any recovery or retry');
const hash=b=>createHash('sha256').update(b).digest('hex');
const gateBytes=readFileSync('artifacts/source-gap-private-sd/full-private-gate.json');
if(hash(gateBytes)!==gateSha)throw new Error('Reviewed actual private gate receipt changed');
const gate=JSON.parse(gateBytes);
if(gate.outcome!=='Worked'||gate.runtimeImporterHead!==core||gate.manifestSha!==manifestSha||gate.checks.length!==17||!gate.checks.every(c=>c.outcome==='Worked')||gate.restoredHash!=='1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2')throw new Error('Exact actual private apply/repeat/preservation/rollback gate required');
const expectedCore=execFileSync('git',['show',core+':server/candidate-nominee-sync.ts']);
if(expectedCore.toString('utf8').replaceAll('\r\n','\n')!==readFileSync('server/candidate-nominee-sync.ts','utf8').replaceAll('\r\n','\n'))throw new Error('Runtime importer differs from the independently tested core');
const manifestBytes=readFileSync('artifacts/source-gap-private-sd/incremental-manifest.json');
if(hash(manifestBytes)!==manifestSha)throw new Error('Exact reviewed incremental manifest required');
const manifest=parseNomineeManifest(JSON.parse(manifestBytes));
const dry=JSON.parse(readFileSync(out+'/dry-run.json','utf8'));
if(dry.outcome!=='Worked'||dry.manifestSha256!==manifestSha||dry.preimageSha256!==preimage||dry.postimageSha256!==preimage||dry.actions.length!==87||dry.unresolved.length||!dry.readOnlyUnchanged||dry.applyPerformed!==false)throw new Error('Actual shared read-only dry-run required');
const backup=JSON.parse(readFileSync(out+'/backup-receipt.json','utf8'));
if(backup.outcome!=='Worked'||backup.privateRestore!=='Worked'||backup.dpapiReadback!=='identical'||backup.archiveSha256!=='6d67f7e22f72d74759cc1ba3fea014aa1d5127b7c2637300a9b6c453c5732a6c'||backup.privateDatabase!=='et_sol_data_68fa478d817d'||hash(readFileSync(backup.archive))!==backup.protectedSha256||backup.plaintextFileRetained!==false)throw new Error('Exact fresh protected PostgreSQL backup/restore required');
if(!process.env.ELECTION_ENV_FILE)throw new Error('Explicit approved source environment required');
const env=parse(readFileSync(process.env.ELECTION_ENV_FILE));
const url=new URL(env.DATABASE_URL);
if(!['postgres:','postgresql:'].includes(url.protocol)||!['localhost','127.0.0.1'].includes(url.hostname)||(url.port||'5432')!=='5432'||url.pathname!=='/elections'||url.search||url.hash)throw new Error('Exact approved local5432/elections transport without routing overrides required');
const authorize=name=>{if(name!=='elections')throw new Error('Only the owner-approved shared source database is writable');};
const backupUrl=new URL(url);backupUrl.pathname='/'+backup.privateDatabase;
const backupPool=new pg.Pool({connectionString:backupUrl.toString(),max:1,options:'-c timezone=UTC -c default_transaction_read_only=on',connectionTimeoutMillis:10000});
try{const restored=await captureSourceSnapshot(backupPool,backup.privateDatabase,name=>{if(name!==backup.privateDatabase)throw new Error('Exact fresh private restore target required');});if(restored.hash!==preimage)throw new Error('Fresh backup restore differs from reviewed shared source preimage');}finally{await backupPool.end();}
const pool=new pg.Pool({connectionString:url.toString(),max:2,options:'-c timezone=UTC',connectionTimeoutMillis:10000,query_timeout:60000});
const privateDirectory=join('C:/.codex/private/election-source-backups','source-gap-shared-'+randomUUID());
createPrivateDirectory(privateDirectory);mkdirSync(out,{recursive:true});
const receipt={mode:'owner-authorized-shared-source-increment',startedAt:new Date().toISOString(),runtimeImporterHead:core,privateGateSha256:gateSha,manifestSha256:manifestSha,reviewedPreimageSha256:preimage,backupVerified:true,privateRowImages:privateDirectory,database:'local5432/elections',deploymentPerformed:false,schemaApplied:false};
const retain=()=>writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
const admission=expected=>async client=>{
 // First transactional statement touching the source tables must be LOCK;
 // guard()/snapshot() SELECT only after all plain table writers have finished.
 await client.query('LOCK TABLE '+DATA_TABLES.map(t=>'public.'+t).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
 await guard(client,'elections',authorize);
 const observed=await snapshot(client,'elections',false,authorize);
 if(observed.hash!==expected)throw new Error('PREIMAGE_DRIFT: guarded current source rows differ; no data writes accepted');
};
let before,knownPost,first,writeCommitted=false;
const captureOwnedPostimage=stage=>async(client,plan)=>{
 const post=await snapshot(client,'elections',false,authorize);
 if(stage==='first'){
  if(plan.candidateInserts!==36||plan.sourceChanges!==87||plan.unresolved.length)throw new Error('Actual shared apply differs from reviewed private/dry-run counts');
  const oldIds=new Set(before.tables.candidates.map(r=>r.id));
  if(sourceHash(post.tables.candidates.filter(r=>oldIds.has(r.id)))!==sourceHash(before.tables.candidates))throw new Error('Existing complete candidate profile changed');
  for(const table of ['elections','election_catalog_correction_runs','official_results_sync_runs'])if(sourceHash(post.tables[table])!==sourceHash(before.tables[table]))throw new Error('Unassigned source table changed: '+table);
  const oldSourceIds=new Set(before.tables.candidate_source_records.map(r=>r.id));
  if(sourceHash(post.tables.candidate_source_records.filter(r=>oldSourceIds.has(r.id)))!==sourceHash(before.tables.candidate_source_records))throw new Error('Existing complete source history changed');
  first=post;
 }else{
  if(plan.candidateInserts!==0||plan.sourceChanges!==0||plan.unresolved.length||DATA_TABLES.filter(t=>t!=='candidate_ingest_runs').some(t=>sourceHash(first.tables[t])!==sourceHash(post.tables[t])))throw new Error('Exact shared repeat changed source/profile data');
 }
 const previous=stage==='first'?before:first;
 const oldAuditIds=new Set(previous.tables.candidate_ingest_runs.map(r=>r.id));
 const added=post.tables.candidate_ingest_runs.filter(r=>!oldAuditIds.has(r.id));
 if(post.tables.candidate_ingest_runs.length!==previous.tables.candidate_ingest_runs.length+1||added.length!==1||added[0].id!==plan.auditId||added[0].source_file_sha256!==manifestSha||sourceHash(post.tables.candidate_ingest_runs.filter(r=>oldAuditIds.has(r.id)))!==sourceHash(previous.tables.candidate_ingest_runs))throw new Error('Source audit delta is not bound to the owned apply');
 // This snapshot is captured while admission and all seven table locks are held.
 // A later independent row can never be adopted as part of our rollback image.
 savePrivateSnapshot(join(privateDirectory,stage==='first'?'applied.json':'after.json'),post);
 knownPost=post;
};
try{
 before=await captureSourceSnapshot(pool,'elections',authorize);
 if(before.hash!==preimage)throw new Error('Shared preimage drifted before admission');
 savePrivateSnapshot(join(privateDirectory,'before.json'),before);retain();
 const plan=await runNomineeRefresh(pool,manifest,manifestSha,true,{beforeApply:admission(preimage),afterApply:captureOwnedPostimage('first')});
 writeCommitted=true;receipt.apply={candidateInserts:plan.candidateInserts,sourceChanges:plan.sourceChanges,auditId:plan.auditId,unresolved:plan.unresolved};retain();
 const actualFirst=await captureSourceSnapshot(pool,'elections',authorize);
 if(actualFirst.hash!==first.hash)throw new Error('Concurrent source postimage detected after committed apply');
 const oldIds=new Set(before.tables.candidates.map(r=>r.id));
 const repeat=await runNomineeRefresh(pool,manifest,manifestSha,true,{beforeApply:admission(first.hash),afterApply:captureOwnedPostimage('repeat')});
 const after=await captureSourceSnapshot(pool,'elections',authorize);
 if(after.hash!==knownPost.hash)throw new Error('Concurrent source postimage detected after committed repeat');
 receipt.repeat={candidateInserts:repeat.candidateInserts,sourceChanges:repeat.sourceChanges,auditId:repeat.auditId};
 receipt.originalProfileCount=oldIds.size;receipt.originalFullProfilesPreserved=true;receipt.sourceTablesStableAcrossRepeat=true;receipt.postimageSha256=after.hash;receipt.perState=stateCoverage(after);receipt.outcome='Worked';receipt.finishedAt=new Date().toISOString();retain();
 console.log(JSON.stringify({outcome:receipt.outcome,apply:receipt.apply,repeat:receipt.repeat,postimageSha256:after.hash,originalFullProfilesPreserved:true,schemaApplied:false,deploymentPerformed:false}));
}catch(error){
 receipt.outcome='Failed';receipt.error=error instanceof Error?error.message:'Source increment refused';
 if(before){
  const current=await captureSourceSnapshot(pool,'elections',authorize);savePrivateSnapshot(join(privateDirectory,'failed-postimage.json'),current);
  if(current.hash===before.hash)receipt.rollbackExact=true;
  else if(knownPost&&current.hash===knownPost.hash){receipt.commitOutcome='owned_committed_postimage_verified';receipt.rollback=await rollbackSourceRows(pool,before,knownPost,{authorizeDatabase:authorize});receipt.rollbackExact=receipt.rollback.hash===before.hash;}
  else{receipt.outcome='Blocked';receipt.rollbackPerformed=false;receipt.classification='unknown_or_concurrent_source_postimage';}
 }
 receipt.writeCommitted=writeCommitted;receipt.finishedAt=new Date().toISOString();retain();throw error;
}finally{await pool.end();}
