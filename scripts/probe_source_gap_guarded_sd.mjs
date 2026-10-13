import {assertSourceGapRuntime,assertGitPinnedSourceGapRuntime} from './source_gap_runtime_pin_sd.mjs';
const reviewedHead=process.argv.find(a=>a.startsWith('--review-runtime-head='))?.split('=')[1];
if(reviewedHead)assertGitPinnedSourceGapRuntime(reviewedHead);else if(!process.argv.includes('--rollback-old'))assertSourceGapRuntime('72f7e8e6e5ac3fb93a7d31993c094565c1de1310');
if(process.argv.includes('--rollback-new')&&!reviewedHead)throw new Error('New rollback controls require immutable reviewed runtime head');
import pg from 'pg';import {parse} from 'dotenv';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';
import {parseNomineeManifest,runNomineeRefresh} from '../server/candidate-nominee-sync.ts';
import {guard,snapshot,DATA_TABLES,rollbackSourceRows} from './source_data_rollback.ts';
import {rollbackSourceRows as oldRollback} from '../artifacts/source-gap-private-sd/runtime-source/green/scripts/source_data_rollback.ts';
const database='et_sol_data_6c78a3148c6b',base='artifacts/source-gap-private-sd',dir=reviewedHead?base+'/runtime-repair-'+reviewedHead.slice(0,8):base,baseline='1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2';mkdirSync(dir,{recursive:true});
const env=parse(readFileSync('D:/projects/New-election-countdown/.env'));const u=new URL(env.DATABASE_URL);if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.port!=='5432')throw new Error('Approved local5432 required');u.pathname='/'+database;u.searchParams.set('options','-c timezone=UTC');
const pool=new pg.Pool({connectionString:u.toString(),max:4}),single=new pg.Pool({connectionString:u.toString(),max:1});const authorize=name=>{if(name!==database)throw new Error('Exact private database required');};
const capture=async()=>{const c=await pool.connect();try{await guard(c,database,authorize);await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const s=await snapshot(c,database,false,authorize);await c.query('ROLLBACK');return s;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}};
const b=readFileSync(base+'/incremental-manifest.json'),manifestSha=createHash('sha256').update(b).digest('hex');if(manifestSha!=='f83bee609922a2213213d26fdd956c248a69a14718936ff2f39a757c0821223a')throw new Error('Manifest byte pin changed');const manifest=parseNomineeManifest(JSON.parse(b));
const result={runtimeImporterHead:reviewedHead??'72f7e8e6e5ac3fb93a7d31993c094565c1de1310',database,manifestSha,checks:[],nomineeApplicationWrites:0};
const check=(scenario,ok,details={})=>result.checks.push({scenario,outcome:ok?'Worked':'Failed',...details});
async function rollbackOldRace(kind,isNew=false){
 const before=await capture(),writer=await pool.connect();let marker,open=false,attempt;
 const seen={kind,immutableHelper:(isNew?reviewedHead:'72f7e8e')+':scripts/source_data_rollback.ts',faultAfterWrites:1};
 try{
  if(before.hash!==baseline)throw new Error('Exact baseline required before rollback control');
  await guard(writer,database,authorize);await writer.query('BEGIN');open=true;
  if(kind==='advisory')await writer.query('SELECT pg_advisory_xact_lock($1)',[2026110301]);
  marker=(await writer.query("INSERT INTO candidate_ingest_runs(source_layer,source_url,source_file_sha256,applied_at,receipt) VALUES('private_gate_control','urn:private:sd-rollback-old-control',$1,now(),$2::jsonb) RETURNING id",['d'.repeat(64),JSON.stringify({purpose:'PRIVATE ROLLBACK ADMISSION CONTROL - NOT OFFICIAL INGEST',kind})])).rows[0].id;
  attempt=(isNew?rollbackSourceRows:oldRollback)(pool,before,before,{faultAfterWrites:1,authorizeDatabase:authorize}).then(()=>({code:'UNEXPECTED_COMMIT'}),e=>({code:e.code??null,message:e.message}));
  if(isNew&&kind==='advisory'){
   const started=performance.now();seen.busyAttempt=await Promise.race([attempt,new Promise(resolve=>setTimeout(()=>resolve({code:'BUSY_REFUSAL_TIMEOUT'}),1000))]);seen.busyMs=performance.now()-started;
   check('new rollback busy admission refuses before mutation',seen.busyAttempt.code!=='BUSY_REFUSAL_TIMEOUT'&&/busy/.test(seen.busyAttempt.message??''),seen);
  }else{
  seen.waitObserved=false;
  for(let i=0;i<100;i++){
   const query=kind==='advisory'?"SELECT count(*)::int AS n FROM pg_locks WHERE locktype='advisory' AND granted=false AND classid=0 AND objid=2026110301::oid AND pid<>pg_backend_pid() AND database=(SELECT oid FROM pg_database WHERE datname=current_database())":"SELECT count(*)::int AS n FROM pg_locks WHERE locktype='relation' AND relation='public.candidate_ingest_runs'::regclass AND granted=false AND pid<>pg_backend_pid() AND database=(SELECT oid FROM pg_database WHERE datname=current_database())";
   if((await writer.query(query)).rows[0].n){seen.waitObserved=true;break;}
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  if(!seen.waitObserved)throw new Error('Actual rollback wait not observed');
  }
  await writer.query('COMMIT');open=false;seen.actualCommittedHash=(await capture()).hash;seen.attempt=await attempt;
  if(isNew&&kind==='advisory')seen.retry=await rollbackSourceRows(pool,before,before,{faultAfterWrites:1,authorizeDatabase:authorize}).then(()=>({code:'UNEXPECTED_COMMIT'}),e=>({code:e.code??null,message:e.message}));
  check((isNew?'new':'old')+' rollback '+kind+' refuses committed source drift before mutations',(seen.retry??seen.attempt).code==='POSTIMAGE_DRIFT',seen);
  if(isNew){const unlocked=await freshLock();check('rollback '+kind+' releases admission after refusal',unlocked.admitted&&unlocked.released,unlocked);}
 }finally{
  if(open)await writer.query('ROLLBACK');writer.release();if(attempt)await attempt;
  if(marker)await pool.query("DELETE FROM candidate_ingest_runs WHERE id=$1 AND source_layer='private_gate_control' AND source_url='urn:private:sd-rollback-old-control'",[marker]);
  check('rollback '+kind+' control cleanup restores exact baseline',(await capture()).hash===baseline);
 }
}
async function forced(p,expected){const seen={callbackCalled:false};try{await runNomineeRefresh(p,manifest,manifestSha,true,{beforeApply:async c=>{
 seen.callbackCalled=true;await c.query('LOCK TABLE '+DATA_TABLES.map(t=>'public.'+t).join(',')+' IN SHARE ROW EXCLUSIVE MODE');await guard(c,database,authorize);const s=await snapshot(c,database,false,authorize);seen.snapshotHash=s.hash;
 if(s.hash!==expected)throw Object.assign(new Error('Preimage differs'),{code:'PREIMAGE_DRIFT'});throw Object.assign(new Error('Private injected callback refusal before all application writes'),{code:'INJECTED_CALLBACK_REFUSAL'});
 }});seen.code='UNEXPECTED_COMMIT';}catch(e){seen.code=e.code??null;seen.message=e.message;}return seen;}
async function freshLock(){const c=new pg.Client({connectionString:u.toString()});try{await c.connect();await guard(c,database,authorize);const pid=(await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const admitted=(await c.query('SELECT pg_try_advisory_lock($1) AS admitted',[2026110301])).rows[0].admitted;let released=null;if(admitted)released=(await c.query('SELECT pg_advisory_unlock($1) AS released',[2026110301])).rows[0].released;return {pid,admitted,released};}finally{await c.end();}}
async function markerRace(kind){const c=await pool.connect();let marker,open=false,attempt;const seen={kind};try{
 await guard(c,database,authorize);await c.query('BEGIN');open=true;if(kind==='advisory')await c.query('SELECT pg_advisory_xact_lock($1)',[2026110301]);
 marker=(await c.query("INSERT INTO candidate_ingest_runs(source_layer,source_url,source_file_sha256,applied_at,receipt) VALUES('private_gate_control','urn:private:sd-guarded-control',$1,now(),$2::jsonb) RETURNING id",['e'.repeat(64),JSON.stringify({purpose:'PRIVATE LOCK/SNAPSHOT CONTROL - NOT OFFICIAL INGEST',kind})])).rows[0].id;
 attempt=forced(pool,baseline);
 if(kind==='advisory'){
  const started=performance.now();seen.attempt=await attempt;seen.durationMs=performance.now()-started;
  check('busy admission refuses before BEGIN/callback/writes',seen.attempt.callbackCalled===false&&/writer is busy/.test(seen.attempt.message)&&seen.durationMs<1000,seen);
 }else{
  seen.waitObserved=false;for(let i=0;i<100;i++){
   const q=await c.query("SELECT count(*)::int AS n FROM pg_locks WHERE locktype='relation' AND relation='public.candidate_ingest_runs'::regclass AND granted=false AND pid<>pg_backend_pid() AND database=(SELECT oid FROM pg_database WHERE datname=current_database())");
   if(q.rows[0].n){seen.waitObserved=true;break;}await new Promise(resolve=>setTimeout(resolve,20));
  }if(!seen.waitObserved)throw new Error('Actual source table wait not observed');
 }
 await c.query('COMMIT');open=false;seen.actualCommittedHash=(await capture()).hash;
 if(kind==='advisory'){seen.retry=await forced(pool,baseline);check('after marker commit fresh retry rejects actual committed drift',seen.retry.code==='PREIMAGE_DRIFT'&&seen.retry.snapshotHash===seen.actualCommittedHash&&seen.actualCommittedHash!==baseline,seen);}
 else{seen.attempt=await attempt;check('plain table writer commit visible after first table-lock query',seen.attempt.code==='PREIMAGE_DRIFT'&&seen.attempt.snapshotHash===seen.actualCommittedHash&&seen.actualCommittedHash!==baseline,seen);}
 const lock=await freshLock();check('fresh connection acquires admission after '+kind+' refusal',lock.admitted===true&&lock.released===true,lock);
}finally{if(open)await c.query('ROLLBACK');c.release();if(attempt)await attempt;if(marker)await pool.query("DELETE FROM candidate_ingest_runs WHERE id=$1 AND source_layer='private_gate_control' AND source_url='urn:private:sd-guarded-control'",[marker]);check('marker cleanup exact baseline after '+kind,(await capture()).hash===baseline);}}
try{
 result.beforeHash=(await capture()).hash;if(result.beforeHash!==baseline)throw new Error('Baseline drift');
 if(process.argv.includes('--rollback-old')||process.argv.includes('--rollback-new')){
  const isNew=process.argv.includes('--rollback-new');result.mode=isNew?'immutable-new-rollback-admission':'immutable-old-rollback-admission-red';result.rollbackApplicationWritesCommitted=0;
  await rollbackOldRace('advisory',isNew);await rollbackOldRace('table',isNew);
 }else{
 const stale=await forced(pool,'0'.repeat(64));check('wrong expected preimage refuses before source/audit writes',stale.code==='PREIMAGE_DRIFT'&&(await capture()).hash===baseline,stale);
 await markerRace('advisory');await markerRace('table');
 for(let i=0;i<3;i++){const refusal=await forced(single,baseline);check('same pool1 callback refusal '+i,refusal.code==='INJECTED_CALLBACK_REFUSAL'&&(await capture()).hash===baseline,refusal);const lock=await freshLock();check('no reentrant admission depth after pool1 refusal '+i,lock.admitted&&lock.released,lock);}
 }
 result.afterHash=(await capture()).hash;check('all original source data/audit rows preserved',result.afterHash===baseline);
}catch(e){check('guard probe execution',false,{code:e.code??null,message:e.message});}
finally{result.outcome=result.checks.every(c=>c.outcome==='Worked')?'Worked':'Failed';writeFileSync(dir+(process.argv.includes('--rollback-old')?'/rollback-admission-red.json':process.argv.includes('--rollback-new')?'/rollback-admission-green.json':'/guarded-lock-green.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await single.end();await pool.end();if(result.outcome!=='Worked')process.exitCode=1;}
