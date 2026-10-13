import {assertSourceGapRuntime} from './source_gap_runtime_pin_sd.mjs';
assertSourceGapRuntime('9e10c4cf472a860489e97eb6f18f023abba1378f');
import pg from 'pg';import {parse} from 'dotenv';
import {readFileSync,writeFileSync} from 'node:fs';import {randomUUID,createHash} from 'node:crypto';
import {parseNomineeManifest,runNomineeRefresh} from '../server/candidate-nominee-sync.ts';
import {guard,snapshot,DATA_TABLES} from './source_data_rollback.ts';
const database='et_sol_data_6c78a3148c6b',dir='artifacts/source-gap-private-sd';
const env=parse(readFileSync('D:/projects/New-election-countdown/.env'));const u=new URL(env.DATABASE_URL);if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.port!=='5432')throw new Error('Approved local target required');
u.pathname='/'+database;u.searchParams.set('options','-c timezone=UTC');const appName='source-sd-race-'+randomUUID();u.searchParams.set('application_name',appName);
const pool=new pg.Pool({connectionString:u.toString(),max:4});const authorize=name=>{if(name!==database)throw new Error('Exact private database required');};
const capture=async()=>{const c=await pool.connect();try{await guard(c,database,authorize);await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const s=await snapshot(c,database,false,authorize);await c.query('ROLLBACK');return s;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}};
const before=await capture();if(before.hash!=='1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2')throw new Error('Reviewed baseline drift; refusing private marker');
const bytes=readFileSync(dir+'/incremental-manifest.json');const manifestSha=createHash('sha256').update(bytes).digest('hex');if(manifestSha!=='f83bee609922a2213213d26fdd956c248a69a14718936ff2f39a757c0821223a')throw new Error('Manifest byte pin changed');const manifest=parseNomineeManifest(JSON.parse(bytes));
const result={runtimeImporterHead:'9e10c4cf472a860489e97eb6f18f023abba1378f',database,beforeHash:before.hash,nomineeWrites:0,auditMarkerPurpose:'Private concurrency control only, not a source ingest or official candidate fact',waitObserved:false};
const writer=await pool.connect();let markerId,writerOpen=false,attempt;
try{
 await guard(writer,database,authorize);await writer.query('BEGIN');writerOpen=true;await writer.query('SELECT pg_advisory_xact_lock($1)',[2026110301]);
 markerId=(await writer.query("INSERT INTO candidate_ingest_runs(source_layer,source_url,source_file_sha256,applied_at,receipt) VALUES('private_gate_control','urn:private:sd-stale-snapshot-control',$1,now(),$2::jsonb) RETURNING id",['f'.repeat(64),JSON.stringify({purpose:'PRIVATE UNIT STALE-GUARD CONTROL - NOT OFFICIAL INGEST',nonce:appName})])).rows[0].id;
 attempt=runNomineeRefresh(pool,manifest,manifestSha,true,{beforeApply:async client=>{
  await client.query('LOCK TABLE '+DATA_TABLES.map(t=>'public.'+t).join(',')+' IN SHARE ROW EXCLUSIVE MODE');await guard(client,database,authorize);
  const captured=await snapshot(client,database,false,authorize);result.callbackSnapshotHash=captured.hash;result.guardWouldAccept=captured.hash===before.hash;
  if(!result.guardWouldAccept)throw Object.assign(new Error('Expected private preimage differs'),{code:'PREIMAGE_DRIFT'});
  throw Object.assign(new Error('Private race probe forced abort before any nominee/source/audit application writes'),{code:'RACE_PROBE_ABORT'});
 }}).then(()=>({code:'UNEXPECTED_COMMIT'}),e=>({code:e.code??null,message:e.message}));
 for(let i=0;i<50;i++){
  const q=await writer.query("SELECT count(*)::int AS n FROM pg_locks WHERE locktype='advisory' AND granted=false AND classid=0 AND objid=$1::oid AND pid<>pg_backend_pid() AND database=(SELECT oid FROM pg_database WHERE datname=current_database())",[2026110301]);
  if(q.rows[0].n){result.waitObserved=true;break;}await new Promise(resolve=>setTimeout(resolve,20));
 }
 if(!result.waitObserved)throw new Error('Actual importer advisory-lock wait not observed');
 await writer.query('COMMIT');writerOpen=false;result.attempt=await attempt;result.actualCommittedHash=(await capture()).hash;
 result.guardRejectedCommittedDrift=result.actualCommittedHash!==before.hash&&result.guardWouldAccept===false&&result.attempt.code==='PREIMAGE_DRIFT';
 result.outcome=result.guardRejectedCommittedDrift?'Worked':'Failed';
}finally{
 if(writerOpen)await writer.query('ROLLBACK');writer.release();if(attempt)await attempt;
 if(markerId)await pool.query("DELETE FROM candidate_ingest_runs WHERE id=$1 AND source_layer='private_gate_control' AND source_url='urn:private:sd-stale-snapshot-control'",[markerId]);
 const restored=await capture();result.restoredHash=restored.hash;result.cleanupWorked=restored.hash===before.hash;result.applicationRowsAndOriginalAuditCountPreserved=result.cleanupWorked;
 writeFileSync(dir+'/advisory-snapshot-race.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await pool.end();if(result.outcome!=='Worked'||!result.cleanupWorked)process.exitCode=1;
}
