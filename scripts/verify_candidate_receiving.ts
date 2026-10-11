import http from 'node:http';

import pg from 'pg';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {parse} from 'dotenv';
import {createHash,randomUUID} from 'node:crypto';
import {getTableConfig} from 'drizzle-orm/pg-core';
import * as schema from '../artifacts/candidate-receiving/snapshots/after/shared/schema';
import {parseFecMaster,runFecSync} from '../artifacts/candidate-receiving/snapshots/c/server/fec-candidate-sync';
import {extractFecMaster} from '../artifacts/candidate-receiving/snapshots/c/server/fec-source-artifacts';
import {parseNomineeManifest,runNomineeRefresh} from '../artifacts/candidate-receiving/snapshots/c/server/candidate-nominee-sync';

const artifact='artifacts/candidate-receiving';
const target=new URL(process.env.DATABASE_URL||'http://absent');
assert(process.env.FEC_FIRST_PRIVATE_TEST==='1'&&target.hostname==='127.0.0.1'&&target.port==='5571'&&target.pathname==='/et_sol_fec_first','Dedicated receiving target only');
const sourceUrl=parse(readFileSync(process.env.ELECTION_ENV_FILE!)).DATABASE_URL;
assert(sourceUrl,'Approved source missing');
const src=new URL(sourceUrl);
assert(['localhost','127.0.0.1'].includes(src.hostname)&&(src.port||'5432')==='5432'&&src.pathname==='/elections','Approved readonly EC source only');
const source=new pg.Pool({connectionString:sourceUrl,options:'-c default_transaction_read_only=on',max:1});
const fixture=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2});
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const quote=(s:string)=>'"'+s.replace(/"/g,'""')+'"';
const publicElection=['id','title','subtitle','location','state','date','type','level','offices','description','polls_open','polls_close','timezone','poll_close_kind','poll_hours_basis','poll_hours_source','is_active'];
const publicCandidate=['id','election_id','name','party','is_incumbent','description','campaign_bio','website','profile_image_url','is_verified','office','state','district','fec_candidate_id','fec_status','data_source','source_status','normalized_name','ballot_status','ballot_source_url','source_file_sha256','source_synced_at','polling_support','polling_trend','last_polling_update','polling_source','votes_received','vote_percentage','is_winner','is_projected_winner','updated_at'];

async function digest(pool:pg.Pool){return (await pool.query("SELECT count(*)::int AS count,md5(coalesce(string_agg(row_to_json(c)::text,'' ORDER BY id),'')) AS digest FROM candidates c")).rows[0]}
async function copyPublic(table:string,allowed:string[]){
 const present=(await source.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",[table])).rows;
 const cols=allowed.filter(name=>present.some(r=>r.column_name===name));
 const selection=cols.map(name=>quote(name)+(present.find(r=>r.column_name===name)!.data_type.includes('timestamp')?'::text AS '+quote(name):'')).join(',');
 const rows=(await source.query('SELECT '+selection+' FROM '+quote(table)+' ORDER BY id')).rows;
 for(const row of rows)await fixture.query('INSERT INTO '+quote(table)+' ('+cols.map(quote).join(',')+') VALUES ('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',cols.map(c=>row[c]));
 await fixture.query("SELECT setval(pg_get_serial_sequence($1,'id'),(SELECT max(id) FROM "+quote(table)+"))",[table]);
 return rows;
}
async function child(label:string,phase:string,run:(base:string)=>Promise<void>){
 const ready=artifact+'/ready-'+label+'-'+phase+'-'+randomUUID()+'.json',log=artifact+'/log-'+label+'-'+phase+'.txt';let output='';
 const processChild=spawn(process.execPath,[artifact+'/compiled-'+label+'.mjs'],{env:{...process.env,RECEIVING_PHASE:phase,RECEIVING_READY_FILE:ready},stdio:['ignore','pipe','pipe'],windowsHide:true});
 processChild.stdout.on('data',d=>output+=d);processChild.stderr.on('data',d=>output+=d);
 try{
  for(let i=0;i<120;i++){if(existsSync(ready))break;if(processChild.exitCode!==null)throw new Error('Compiled receiving child exited '+processChild.exitCode);await new Promise(r=>setTimeout(r,100));}
  assert(existsSync(ready),'Compiled receiver readiness absent');const state=JSON.parse(readFileSync(ready,'utf8'));assert.equal(state.mode,'database');
  await run('http://127.0.0.1:'+state.port);
 }finally{processChild.kill();await new Promise<void>(r=>{if(processChild.exitCode!==null)r();else processChild.once('exit',()=>r())});writeFileSync(log,output)}
}
async function capture(base:string,path:string,name:string){
 const r=await fetch(base+path);const body=await r.json();writeFileSync(artifact+'/'+name+'.json',JSON.stringify({receipt:{path,httpStatus:r.status,headers:Object.fromEntries(r.headers),capturedAt:new Date().toISOString(),providerBoundary:'empty stub; no external enrichment requests',storage:'actual frozen router/factory/DatabaseStorage/Drizzle/private PostgreSQL'},body},null,2)+'\n');return {status:r.status,body:body as any,headers:r.headers};
}
const observations:any[]=[];

async function verifyAfter(base:string,phase:string){
 const gov=await capture(base,'/api/elections/37/candidates',phase+'-gov37');
 const sen=await capture(base,'/api/elections/2/candidates',phase+'-sen2');
 assert.equal(gov.status,200);assert.equal(sen.status,200);
 const sql37=(await fixture.query('SELECT id,name,description,campaign_bio,fec_candidate_id,data_source,source_status,ballot_status,fec_status FROM candidates WHERE election_id=37 ORDER BY id')).rows;
 const sql2=(await fixture.query('SELECT id,name,description,campaign_bio,fec_candidate_id,data_source,source_status,ballot_status,fec_status FROM candidates WHERE election_id=2 ORDER BY id')).rows;
 assert.deepEqual(gov.body.map((c:any)=>c.id).sort((a:number,b:number)=>a-b),sql37.map(c=>c.id));
 assert.deepEqual(sen.body.map((c:any)=>c.id).sort((a:number,b:number)=>a-b),sql2.map(c=>c.id));
 for(const c of [...gov.body,...sen.body]){const row=[...sql37,...sql2].find(s=>s.id===c.id)!;assert.equal(c.description,row.description);assert.equal(c.campaignBio,row.campaign_bio);assert.equal(c.external_ids.fec_id,row.fec_candidate_id);assert.deepEqual(c.source,{data_source:row.data_source,source_status:row.source_status,ballot_status:row.ballot_status,fec_status:row.fec_status})}
 if(!sql37.length){assert.deepEqual(gov.body,[]);assert.equal(gov.headers.get('x-candidate-provenance'),'none')}

 if(phase==='after-a-before-c'){
  const address=new URL(base);
  const fromFreshClient=()=>new Promise<any>((resolve,reject)=>{const req=http.get({hostname:'127.0.0.1',port:address.port,path:'/api/elections/candidates-batch?ids=37',localAddress:'127.0.0.2'},res=>{let raw='';res.on('data',d=>raw+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(raw)}))});req.on('error',reject)});
  let accepted=0,limited=0,last:any;
  for(let i=0;i<320;i++){const r=await fromFreshClient();if(r.status===200)accepted++;else{assert.equal(r.status,429);assert.equal(r.body.error,'rate_limited');assert.equal(r.body.scope,'api');assert.equal(String(r.body.retryAfterSeconds),r.headers['retry-after']);assert.equal(r.body.limit,300);limited++;last=r;}}
  assert.equal(accepted,300);assert.equal(limited,20);
  writeFileSync(artifact+'/after-a-rate-limit.json',JSON.stringify({outcome:'Worked',requests:320,http200:accepted,http429:limited,lastResponse:last,client:'dedicated loopback127.0.0.2',actualFrozenMiddleware:'2ca8d74'},null,2)+'\n');
 }
 const beforeState=await (await fetch(base+'/__review/state')).json() as any;
 const batch=await capture(base,'/api/elections/candidates-batch?ids=37,2,506,37,999999',phase+'-batch');
 const afterState=await (await fetch(base+'/__review/state')).json() as any;
 assert.equal(batch.status,200);assert.equal(afterState.queryCount-beforeState.queryCount,1,'Batch must issue one real database query');
 assert.equal(batch.body.requested,4);assert.deepEqual(Object.keys(batch.body.candidates).sort(),['2','37','506','999999'].sort());
 for(const id of [37,2,506,999999]){const expected=(await fixture.query('SELECT id FROM candidates WHERE election_id=$1 ORDER BY id',[id])).rows.map(r=>r.id);assert.deepEqual(batch.body.candidates[id].map((r:any)=>r.id).sort((a:number,b:number)=>a-b),expected)}
 assert.deepEqual(batch.body.candidates[999999],[]);assert.equal(batch.headers.get('cache-control'),'public, max-age=300');
 const bad=await capture(base,'/api/elections/nope/candidates',phase+'-bad-id');assert.equal(bad.status,400);
 const missing=await capture(base,'/api/elections/999999/candidates',phase+'-missing');assert.equal(missing.status,404);
 const oversize=await capture(base,'/api/elections/candidates-batch?ids='+Array.from({length:101},(_,i)=>i+1).join(','),phase+'-batch-101');assert.equal(oversize.status,400);
 const fractional=await capture(base,'/api/elections/2.5/candidates',phase+'-fractional-id');
 assert.equal(fractional.status,400);
 const general37=await capture(base,'/api/elections/37/general-candidates',phase+'-general-gov37');
 const general2=await capture(base,'/api/elections/2/general-candidates',phase+'-general-sen2');
 const knownFec=Number((await fixture.query('SELECT count(*)::int AS n FROM candidates WHERE election_id=2 AND fec_candidate_id IS NOT NULL')).rows[0].n);
 observations.push({phase,ordinaryGov:gov.body.length,ordinarySen:sen.body.length,generalGov:general37.body.candidates.length,generalSen:general2.body.candidates.length,batchQueries:afterState.queryCount-beforeState.queryCount,fractionalIdCheck:{outcome:fractional.status===400?'Worked':'Failed',expected:400,actual:fractional.status},fractionalStatus:fractional.status,knownFecRows:knownFec,ordinaryFecIdentifiers:sen.body.filter((c:any)=>c.external_ids?.fec_id).length,ordinarySourceMarkers:sen.body.filter((c:any)=>c.source?.data_source||c.source?.source_status).length,batchBioFields:batch.body.candidates[2].filter((c:any)=>'description' in c||'campaignBio' in c).length,externalProviderCalls:afterState.externalProviderCalls,providerEmptyBoundaryInvocations:afterState.providerBoundaryCalls});
 if(phase==='after-c'){assert.equal(gov.body.length,5);assert.equal(general37.body.candidates.length,5);assert.equal(general2.body.candidates.length,6)}
}

async function main(){
 execFileSync(process.execPath,['scripts/build_candidate_receiving.mjs'],{stdio:'pipe'});
 await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');assert.equal((await source.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'on');const sharedBefore=await digest(source);
 for(const table of [schema.elections,schema.candidates]){
  const config=getTableConfig(table);
  await fixture.query('CREATE TABLE '+quote(config.name)+' ('+config.columns.map(col=>quote(col.name)+' '+col.getSQLType()+(col.name==='id'?' PRIMARY KEY':'')).join(',')+')');
 }
 const copiedElections=await copyPublic('elections',publicElection),copiedCandidates=await copyPublic('candidates',publicCandidate);
 await source.query('ROLLBACK');
 await fixture.query(readFileSync(artifact+'/snapshots/c/migrations/20261011_candidate_source_records.sql','utf8'));
 await fixture.query(readFileSync(artifact+'/snapshots/c/migrations/20261011_general_candidate_list_snapshots.sql','utf8'));
 assert.equal((await fixture.query('SELECT count(*)::int AS n FROM candidates WHERE election_id=37')).rows[0].n,0);
 await child('before','source136',async base=>{
  const gov=await capture(base,'/api/elections/37/candidates','before-gov37'),sen=await capture(base,'/api/elections/2/candidates','before-sen2');
  assert.equal(gov.status,200);assert(gov.body.length>0,'Main before must reproduce foreign-race borrowing');
  const foreign=(await fixture.query('SELECT id FROM candidates WHERE election_id=2 ORDER BY id')).rows.map(r=>r.id);
  assert.deepEqual(gov.body.map((c:any)=>c.id).sort((a:number,b:number)=>a-b),foreign);assert(gov.body.every((c:any)=>c.source_election_id===2));
  observations.push({phase:'before-main',databaseGovCandidates:0,returnedForeignSenCandidates:gov.body.length,sourceElectionIds:gov.body.map((c:any)=>c.source_election_id)});
 });
 await child('after','before-c',base=>verifyAfter(base,'after-a-before-c'));
 const bytes=readFileSync(process.env.FEC_ZIP_PATH!),zipSha=createHash('sha256').update(bytes).digest('hex');const fec=parseFecMaster(await extractFecMaster(bytes));const fecApply=await runFecSync(fixture,fec.rows,zipSha,true);
 await child('after','fec-only',base=>verifyAfter(base,'after-a-fec-only'));
 const manifestBytes=readFileSync(artifact+'/snapshots/c/data/nominees/combined-2026-reviewed.json'),manifestSha=createHash('sha256').update(manifestBytes).digest('hex'),manifest=parseNomineeManifest(JSON.parse(manifestBytes.toString('utf8')));
 const stackedIds=(await fixture.query('SELECT id FROM candidates ORDER BY id')).rows.map(r=>r.id),profileBefore=hash((await fixture.query('SELECT * FROM candidates ORDER BY id')).rows);
 const nominee=await runNomineeRefresh(fixture,manifest,manifestSha,true);assert.equal(nominee.unresolved.length,0);assert.equal(nominee.actions.length,1361);assert.equal(hash((await fixture.query('SELECT * FROM candidates WHERE id=ANY($1::int[]) ORDER BY id',[stackedIds])).rows),profileBefore);
 await child('after','after-c',base=>verifyAfter(base,'after-c'));
 const sharedAfter=await digest(source);assert.deepEqual(sharedAfter,sharedBefore);
 const receipt={outcome:'Worked exact membership, repaired identifiers and input contract',beforeHead:'426c709',afterHead:'2c152ef',cHead:'6ddda4b',manifestSha256:manifestSha,providerBoundary:'Explicit empty provider mocks; background schedulers disabled; actual factory, DB health query, storage SQL and HTTP router',externalProviderCalls:0,sharedBefore,sharedAfter,copiedElections:copiedElections.length,copiedCandidates:copiedCandidates.length,fecActions:fecApply.actions.length,officialRows:nominee.actions.length,observations};
 writeFileSync(artifact+'/receiving-review.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}
main().catch(e=>{console.error(JSON.stringify({outcome:'Failed',code:e.code,message:e.message}));process.exitCode=1}).finally(async()=>{await fixture.end();await source.end()});
