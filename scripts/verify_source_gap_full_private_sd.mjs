import {assertSourceGapRuntime,assertGitPinnedSourceGapRuntime} from './source_gap_runtime_pin_sd.mjs';
const reviewedHead=process.argv.find(a=>a.startsWith('--review-runtime-head='))?.split('=')[1];
if(reviewedHead)assertGitPinnedSourceGapRuntime(reviewedHead);else assertSourceGapRuntime('72f7e8e6e5ac3fb93a7d31993c094565c1de1310');
import pg from 'pg';import {parse} from 'dotenv';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {join} from 'node:path';import {createHash,randomUUID} from 'node:crypto';
import {parseNomineeManifest,runNomineeRefresh} from '../server/candidate-nominee-sync.ts';
import {guard,snapshot,sourceHash,DATA_TABLES,createPrivateDirectory,savePrivateSnapshot,rollbackSourceRows} from './source_data_rollback.ts';
const database='et_sol_data_6c78a3148c6b',base='artifacts/source-gap-private-sd',dir=reviewedHead?base+'/runtime-repair-'+reviewedHead.slice(0,8):base,expected='1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2';mkdirSync(dir,{recursive:true});
if(!process.argv.includes('--private-apply-repeat-rollback'))throw new Error('Explicit bounded private apply/repeat/rollback mode required');
const env=parse(readFileSync('D:/projects/New-election-countdown/.env'));const u=new URL(env.DATABASE_URL);if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.port!=='5432')throw new Error('Approved loopback5432 required');u.pathname='/'+database;u.searchParams.set('options','-c timezone=UTC');
const pool=new pg.Pool({connectionString:u.toString(),max:2});const authorize=name=>{if(name!==database)throw new Error('Exact approved private database required');};
const capture=async()=>{const c=await pool.connect();try{await guard(c,database,authorize);await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const s=await snapshot(c,database,false,authorize);await c.query('ROLLBACK');return s;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}};
const bytes=readFileSync(base+'/incremental-manifest.json'),manifestSha=createHash('sha256').update(bytes).digest('hex');if(manifestSha!=='f83bee609922a2213213d26fdd956c248a69a14718936ff2f39a757c0821223a')throw new Error('Immutable87-row source manifest changed');const manifest=parseNomineeManifest(JSON.parse(bytes));
const result={runtimeImporterHead:reviewedHead??'72f7e8e6e5ac3fb93a7d31993c094565c1de1310',database,manifestSha,rows:manifest.candidates.length,sources:manifest.sources.length,checks:[],sharedWrites:0,authUserWrites:0};
const check=(scenario,ok,details={})=>{result.checks.push({scenario,outcome:ok?'Worked':'Failed',...details});if(!ok)throw new Error(scenario);};
const beforeApply=hash=>async c=>{await c.query('LOCK TABLE '+DATA_TABLES.map(t=>'public.'+t).join(',')+' IN SHARE ROW EXCLUSIVE MODE');await guard(c,database,authorize);if((await snapshot(c,database,false,authorize)).hash!==hash)throw Object.assign(new Error('Reviewed source preimage changed under admitted writer/table locks'),{code:'PREIMAGE_DRIFT'});};
const summary=p=>({actions:p.actions.length,unresolved:p.unresolved,candidateInserts:p.candidateInserts??0,sourceChanges:p.sourceChanges??0,auditId:p.auditId??null,byState:Object.fromEntries([...new Set(p.actions.map(a=>a.record.state))].map(s=>[s,{rows:p.actions.filter(a=>a.record.state===s).length,unboundActions:p.actions.filter(a=>a.record.state===s&&a.candidateId==null).length}]))});
const withoutAudit=s=>Object.fromEntries(DATA_TABLES.filter(t=>t!=='candidate_ingest_runs').map(t=>[t,s.tables[t]]));
let before,retainedPost,backup;
try{
 before=await capture();check('actual approved private baseline matches reviewed seven-table content',before.hash===expected,{actual:before.hash,expected,counts:Object.fromEntries(DATA_TABLES.map(t=>[t,before.tables[t].length]))});
 const beforeIds=new Set(before.tables.candidates.map(c=>c.id));const originalHash=sourceHash(before.tables.candidates);
 result.plan=summary(await runNomineeRefresh(pool,manifest,manifestSha,false));check('full87 current private matching plan has no unresolved rows',result.plan.actions===87&&result.plan.unresolved.length===0,{actions:result.plan.actions,unresolved:result.plan.unresolved});check('actual dry-run is source/audit write-free',(await capture()).hash===before.hash);
 backup=join('C:/.codex/private/election-source-backups','source-gap-sd-'+randomUUID());createPrivateDirectory(backup);savePrivateSnapshot(join(backup,'before.json'),before);result.privateBackupRunId=backup.split(/[\\/]/).at(-1);
 if(reviewedHead){
  let called=false;
  try{await runNomineeRefresh(pool,manifest,manifestSha,true,{afterApply:async()=>{called=true;}});throw new Error('Unguarded postimage capture unexpectedly accepted');}catch(e){check('afterApply without guarded admission refuses with no callback or writes',/requires guarded source admission/.test(e.message)&&!called&&(await capture()).hash===before.hash);}
  let captured;
  try{await runNomineeRefresh(pool,manifest,manifestSha,true,{beforeApply:beforeApply(before.hash),afterApply:async(c,plan)=>{captured=await snapshot(c,database,false,authorize);savePrivateSnapshot(join(backup,'injected-after-apply.json'),captured);result.injectedAfterApply={candidateInserts:plan.candidateInserts,sourceChanges:plan.sourceChanges,auditId:plan.auditId,capturedHash:captured.hash};throw Object.assign(new Error('Private afterApply failure beforeCOMMIT'),{code:'INJECTED_AFTER_APPLY_FAILURE'});}});throw new Error('AfterApply fault unexpectedly committed');}catch(e){check('actual afterApply fault after87 staged source changes is atomic',e.code==='INJECTED_AFTER_APPLY_FAILURE'&&captured?.hash!==before.hash&&result.injectedAfterApply.candidateInserts===36&&result.injectedAfterApply.sourceChanges===87&&(await capture()).hash===before.hash,{code:e.code??null});}
 }
 let ownedApply,ownedRepeat;
 const ownedCapture=(kind)=>async(c,plan)=>{
  const image=await snapshot(c,database,false,authorize);
  const locks=(await c.query("SELECT txid_current_if_assigned() AS xid,(SELECT count(*)::int FROM pg_locks WHERE pid=pg_backend_pid() AND mode='ShareRowExclusiveLock' AND granted=true AND relation=ANY($1::regclass[])) AS source_locks",[DATA_TABLES.map(t=>'public.'+t)])).rows[0];
  const prior=new Set(before.tables.candidate_ingest_runs.map(r=>r.id));
  const audit=image.tables.candidate_ingest_runs.filter(r=>!prior.has(r.id));
  if(!locks.xid||locks.source_locks!==7||!audit.some(r=>r.id===plan.auditId))throw new Error('Owned capture is not afteraudit in transaction with all7 tablelocks');
  savePrivateSnapshot(join(backup,kind+'-owned-before-commit.json'),image);
  result[kind+'OwnedCapture']={sha256:image.hash,auditId:plan.auditId,transactionId:locks.xid,sourceLocks:locks.source_locks};
  if(kind==='apply')ownedApply=image;else ownedRepeat=image;
 };
 result.apply=summary(await runNomineeRefresh(pool,manifest,manifestSha,true,{beforeApply:beforeApply(before.hash),...(reviewedHead?{afterApply:ownedCapture('apply')}:{})}));retainedPost=await capture();savePrivateSnapshot(join(backup,'after-apply.json'),retainedPost);result.afterApplyHash=retainedPost.hash;
 if(reviewedHead)check('actual apply postimage captured beforeCOMMIT underall7 tablelocks matches receivingread',ownedApply?.hash===retainedPost.hash);
 if(reviewedHead){
  let foreignMarker;
  try{
   foreignMarker=(await pool.query("INSERT INTO candidate_ingest_runs(source_layer,source_url,source_file_sha256,applied_at,receipt) VALUES('private_gate_control','urn:private:sd-postcommit-ownership-control',$1,now(),$2::jsonb) RETURNING id",['c'.repeat(64),JSON.stringify({purpose:'PRIVATE POSTCOMMIT OWNERSHIP CONTROL - NOT OFFICIAL INGEST'})])).rows[0].id;
   const concurrent=await capture();
   check('actual postCOMMIT foreignnew audit changes receivinghash and isnotadopted asownedpost',concurrent.hash!==ownedApply.hash,{capturedOwnedHash:ownedApply.hash,actualConcurrentHash:concurrent.hash,foreignMarkerId:foreignMarker});
   try{await rollbackSourceRows(pool,before,ownedApply,{authorizeDatabase:authorize});throw new Error('Concurrent new audit unexpectedly removed');}catch(e){check('actual rollback refuses foreignnewrow ratherthan deleting it',e.code==='POSTIMAGE_DRIFT'&&(await capture()).hash===concurrent.hash,{code:e.code??null});}
  }finally{
   if(foreignMarker)await pool.query("DELETE FROM candidate_ingest_runs WHERE id=$1 AND source_layer='private_gate_control' AND source_url='urn:private:sd-postcommit-ownership-control'",[foreignMarker]);
  }
  check('own marker cleanup restores exactcapturedowned applypost',(await capture()).hash===ownedApply.hash);
 }
 if(result.apply.candidateInserts!==36||result.apply.sourceChanges!==87||result.apply.actions!==87||result.apply.unresolved.length!==0)throw new Error('Actual applied counts differ from the reviewed36-new/51-reuse87-row plan');
 result.apply.actualNewProfilesByState=Object.fromEntries([...new Set(manifest.candidates.map(r=>r.state))].map(state=>[state,retainedPost.tables.candidates.filter(c=>!beforeIds.has(c.id)&&retainedPost.tables.elections.some(e=>e.id===c.election_id&&e.state===state)).length]));
 check('all original complete candidate profile fields preserved',sourceHash(retainedPost.tables.candidates.filter(c=>beforeIds.has(c.id)))===originalHash,{originalProfiles:beforeIds.size});
 const oldSourceIds=new Set(before.tables.candidate_source_records.map(r=>r.id));check('all existing physical source history rows retained',before.tables.candidate_source_records.every(r=>retainedPost.tables.candidate_source_records.some(s=>s.id===r.id)),{oldHistoryRows:oldSourceIds.size});
 for(const t of ['elections','election_catalog_correction_runs','official_results_sync_runs'])check('unassigned table untouched '+t,sourceHash(before.tables[t])===sourceHash(retainedPost.tables[t]));
 const receiving=new Set(result.plan.actions?manifest.candidates.map(r=>r.state):[]);result.receivingStates=[...receiving];
 result.repeat=summary(await runNomineeRefresh(pool,manifest,manifestSha,true,{beforeApply:beforeApply(retainedPost.hash),...(reviewedHead?{afterApply:ownedCapture('repeat')}:{})}));const repeated=await capture();savePrivateSnapshot(join(backup,'after-repeat.json'),repeated);
 if(reviewedHead)check('actual repeat postimage captured beforeCOMMIT underall7 tablelocks matches receivingread',ownedRepeat?.hash===repeated.hash);
 check('exact repeat reports zero new profiles and source changes',result.repeat.candidateInserts===0&&result.repeat.sourceChanges===0,{candidateInserts:result.repeat.candidateInserts,sourceChanges:result.repeat.sourceChanges});
 check('exact repeat preserves complete candidate/source/scope content',sourceHash(withoutAudit(repeated))===sourceHash(withoutAudit(retainedPost)));check('repeat appends only one actual ingest audit',repeated.tables.candidate_ingest_runs.length===retainedPost.tables.candidate_ingest_runs.length+1);
 retainedPost=repeated;
 const sourceBeforeIds=new Set(before.tables.candidate_source_records.map(r=>r.id));const owned=retainedPost.tables.candidate_source_records.find(r=>!sourceBeforeIds.has(r.id));if(!owned)throw new Error('No newly owned source row for actual stale-postimage control');
 const changed={...owned.metadata,privateStalePostimageControl:'PRIVATE UNIT CONTROL ONLY - NOT PUBLISHER EVIDENCE'};
 await pool.query('UPDATE candidate_source_records SET metadata=$1::jsonb WHERE id=$2 AND metadata=$3::jsonb',[JSON.stringify(changed),owned.id,JSON.stringify(owned.metadata)]);
 const drifted=await capture();check('actual owned-row postimage drift exists',drifted.hash!==retainedPost.hash);
 try{await rollbackSourceRows(pool,before,retainedPost,{authorizeDatabase:authorize});throw new Error('Stale postimage unexpectedly rolled back');}catch(e){check('rollback refuses actual stale postimage before changes',e.code==='POSTIMAGE_DRIFT'&&(await capture()).hash===drifted.hash,{code:e.code??null});}
 const restoredOwned=await pool.query('UPDATE candidate_source_records SET metadata=$1::jsonb WHERE id=$2 AND metadata=$3::jsonb',[JSON.stringify(owned.metadata),owned.id,JSON.stringify(changed)]);check('controlled owned-row drift restored without overwriting foreign changes',restoredOwned.rowCount===1&&(await capture()).hash===retainedPost.hash);
 try{await rollbackSourceRows(pool,before,retainedPost,{faultAfterWrites:1,authorizeDatabase:authorize});throw new Error('Injected rollback fault unexpectedly committed');}catch(e){check('actual rollback mutation fault is atomic',e.code==='INJECTED_ROLLBACK_FAILURE'&&(await capture()).hash===retainedPost.hash,{code:e.code??null});}
 result.rollback=await rollbackSourceRows(pool,before,retainedPost,{authorizeDatabase:authorize});retainedPost=null;const restored=await capture();savePrivateSnapshot(join(backup,'restored.json'),restored);result.restoredHash=restored.hash;
 check('ordered rollback restores exact complete seven-table content',restored.hash===before.hash);check('all original profiles byte-equivalent after rollback',sourceHash(restored.tables.candidates)===originalHash);result.outcome='Worked';
}catch(e){result.outcome='Failed';result.failure={code:e.code??null,type:e.name,message:e.message};if(before&&backup){try{const actual=await capture();savePrivateSnapshot(join(backup,'failure-post.json'),actual);if(actual.hash===before.hash)result.failureRestoredHash=actual.hash;else if(retainedPost&&actual.hash===retainedPost.hash){result.failureRollback=await rollbackSourceRows(pool,before,retainedPost,{authorizeDatabase:authorize});result.failureRestoredHash=(await capture()).hash;}else result.rollbackBlocked='Current content differs from the retained owned postimage; refuse automatic overwrite';}catch(error){result.rollbackBlocked=error.message;}}process.exitCode=1;}
finally{result.finishedAt=new Date().toISOString();writeFileSync(dir+'/full-private-gate.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({outcome:result.outcome,checks:result.checks.length,plan:result.plan,apply:result.apply,repeat:result.repeat,afterApplyHash:result.afterApplyHash,restoredHash:result.restoredHash,failure:result.failure??null,rollbackBlocked:result.rollbackBlocked??null}));await pool.end();}
