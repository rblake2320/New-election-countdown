import './parent-route-private-env.mjs';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createHash, randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { pool } from '../server/db.ts';
import { createSession, revokeSession, signSession, SESSION_COOKIE, isAuthenticated } from '../server/auth.ts';
import { candidatePositionAPI } from '../server/candidate-position-api.ts';
import { compareVerifiedCandidatePolicies } from '../server/verified-policy-comparison.ts';
import { registerVerifiedPolicyRoutes } from '../server/verified-policy-routes.ts';
import { registerElectionIntegrityRoutes } from '../server/election-integrity-routes.ts';
import { VotingIntentionsService } from '../server/voting-intentions.ts';
import { setSecurityEventSink, requestIdMiddleware } from '../server/security-events.ts';

const sourceSha='8a357ae79f4574056135c9ba749eddaeb7598366';
const artifact='artifacts/parent-route-private';mkdirSync(artifact,{recursive:true});
const subjectHash=actor=>createHash('sha256').update('voting-intention\0'+actor).digest('hex');
const identity=async()=>{
 const r=(await pool.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
 if(r.database!=='et_sol_data_6c78a3148c6b'||r.port!==5432)throw new Error('Private database identity guard refused');return r;
};
if(process.argv.includes('--worker')){
 await identity();const decisions=[];setSecurityEventSink(line=>decisions.push(JSON.parse(line)));
 let outboundCalls=0;globalThis.fetch=()=>{outboundCalls++;throw new Error('External provider calls forbidden in this private receiving review');};
 const app=express();app.use(requestIdMiddleware,express.json({limit:'64kb'}),cookieParser());
 registerVerifiedPolicyRoutes(app,{positions:id=>candidatePositionAPI.getPositionsForCandidate(id),compare:compareVerifiedCandidatePolicies});
 const router=express.Router();registerElectionIntegrityRoutes(router,{
  getElection:async id=>(await pool.query('SELECT id FROM elections WHERE id=$1',[id])).rows[0],
  authenticate:isAuthenticated,actor:req=>typeof Reflect.get(req,'userId')==='string'?Reflect.get(req,'userId'):null,
  intentions:new VotingIntentionsService(pool),
 });app.use('/api/elections',router);
 const server=app.listen(0,'127.0.0.1',()=>process.send?.({ready:true,port:server.address().port,sourceSha}));
 let poolClosed=false;
 process.on('message',async m=>{if(m?.authFault){await pool.end();poolClosed=true;process.send?.({authFaultApplied:true});}if(m?.stop){await new Promise(resolve=>server.close(resolve));if(!poolClosed)await pool.end();process.send?.({stopped:true,decisions,outboundCalls});process.exit(0);}});
}else{
 const privateIdentity=await identity();const nonce=randomUUID();const actors=['A','B','C','legacy'].map(k=>'private-unit-parent-'+k+'-'+nonce);
 const hashes=actors.map(subjectHash),electionIds=[190010001,190010002],candidateIds=[190010011,190010012,190010021];
 const originalTables=['users','auth_sessions','candidate_profiles','candidates','candidate_positions','elections','user_voting_intentions'];
 const snapshot=async()=>{
  const out={};for(const name of originalTables)out[name]=(await pool.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(md5(to_jsonb(t)::text)||':'||xmin::text,',' ORDER BY id::text),'')) AS rowAndXminDigest FROM ${name} t`)).rows[0];return out;
 };
 const before=await snapshot();const checks=[],responses=[],workers=[],workerLogs=[],ownedActors=[],ownedElectionIds=[],ownedCandidateIds=[];let originalPreserved=false,cleanupWorked=false;
 const check=(scenario,condition,details={})=>{const r={scenario,outcome:condition?'Worked':'Failed',...details};checks.push(r);if(!condition)console.log(JSON.stringify({critical:r}));return r;};
 const startWorker=async()=>{
  const child=fork(fileURLToPath(import.meta.url),['--worker'],{silent:true,windowsHide:true,env:{...process.env}});let stdout='',stderr='';child.stdout.on('data',b=>{stdout+=b});child.stderr.on('data',b=>{stderr+=b});
  const info=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Compiled private worker startup timeout')),10000);child.on('message',m=>{if(m?.ready){clearTimeout(timer);resolve(m)}});child.once('exit',code=>{if(code!==0)reject(new Error('Compiled private worker startup refused'))});});
  workers.push({child,...info});workerLogs.push({pid:child.pid,get stdout(){return stdout},get stderr(){return stderr}});return 'http://127.0.0.1:'+info.port;
 };
 const cookies=[];
 const request=async(base,path,{cookie,body,headers={},method=body===undefined?'GET':'POST'}={})=>{
  const h={...headers};if(body!==undefined)h['content-type']='application/json';if(cookie)h.cookie=cookie;
  const started=performance.now();const res=await fetch(base+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const value=await res.json();const durationMs=performance.now()-started;responses.push({path,method,status:res.status,body:value,durationMs});return {status:res.status,body:value,durationMs};
 };
 const readIntention=async actor=>(await pool.query('SELECT id,election_id,candidate_id,session_id,party_preference,confidence,is_likely_voter,created_at,updated_at,xmin::text AS xmin FROM user_voting_intentions WHERE session_id=$1 ORDER BY id',[subjectHash(actor)])).rows;
 try{
  const collision=(await pool.query('SELECT id FROM elections WHERE id=ANY($1)',[electionIds])).rowCount+(await pool.query('SELECT id FROM candidates WHERE id=ANY($1)',[candidateIds])).rowCount;
  if(collision)throw new Error('Private fixture identifier collision; refusing mutation');
  for(const actor of actors){await pool.query("INSERT INTO users(id,email,role,first_name) VALUES($1,$2,'user','PRIVATE UNIT ACTOR - NOT A VOTER')",[actor,actor+'@example.invalid']);ownedActors.push(actor);}
  for(const id of electionIds){await pool.query("INSERT INTO elections(id,title,location,state,date,type,level) VALUES($1,'PRIVATE UNIT ROUTE FIXTURE - NOT AN OFFICIAL ELECTION','PRIVATE TEST','ZZ','2030-01-01','general','federal')",[id]);ownedElectionIds.push(id);}
  for(const [i,id] of candidateIds.entries()){await pool.query("INSERT INTO candidates(id,name,party,election_id) VALUES($1,$2,'O',$3)",[id,'PRIVATE UNIT CANDIDATE '+(i+1)+' - NOT A REAL PERSON',i===2?electionIds[1]:electionIds[0]]);ownedCandidateIds.push(id);}
  for(const actor of actors)cookies.push(SESSION_COOKIE+'='+await createSession(actor,'PRIVATE UNIT ACCEPTANCE','127.0.0.1'));
  const [base,other]=[await startWorker(),await startWorker()];const path='/api/elections/'+electionIds[0]+'/voting-intention';
  let r=await request(base,'/api/civic/compare?candidateIds='+candidateIds.slice(0,2).join(',')+'&policyCategories=healthcare,economy');
  check('actual verified-source zero comparison is truthful empty',r.status===200&&r.body.length===2&&r.body.every(x=>x.positions.length===0),{status:r.status,verifiedSourceRows:0});
  r=await request(base,'/api/candidates/'+candidateIds[0]+'/positions');check('local positions without VoteSmart key empty',r.status===200&&Array.isArray(r.body)&&r.body.length===0,{status:r.status});
  await pool.query("INSERT INTO candidate_positions(candidate_id,category,position,is_verified) VALUES($1,'private-unit-policy','PRIVATE UNVERIFIED UNIT STATEMENT',false)",[candidateIds[0]]);
  r=await request(base,'/api/candidates/'+candidateIds[0]+'/positions');check('unverified local statement excluded',r.status===200&&r.body.length===0,{status:r.status});
  const position=(await pool.query("INSERT INTO candidate_positions(candidate_id,category,position,is_verified,source_url) VALUES($1,'private-unit-policy','PRIVATE VERIFIED UNIT STATEMENT - NOT A CAMPAIGN POLICY',true,'https://example.invalid/private-unit-source') RETURNING id",[candidateIds[0]])).rows[0];
  r=await request(base,'/api/candidates/'+candidateIds[0]+'/positions');check('actual verified row exposed with exact source and unknown confidence',r.status===200&&r.body.length===1&&r.body[0].confidence===null&&r.body[0].sources[0].sourcePositionId===position.id&&r.body[0].sources[0].confidence===null,{status:r.status,actualPositionRowId:position.id});
  r=await request(base,'/api/civic/compare?candidateIds='+candidateIds[0]+'&policyCategories=private-unit-policy');check('actual local comparison exact source statement',r.status===200&&r.body[0].positions.length===1&&r.body[0].positions[0].sourcePositionId===position.id&&r.body[0].positions[0].confidence===null,{status:r.status});
  r=await request(base,'/api/civic/compare?candidateIds='+candidateIds[0]+'&policyCategories=unit');check('policy category substring never creates inferred position',r.status===200&&r.body[0].positions.length===0,{status:r.status});
  for(const malformed of ['1.5','1abc','0','2147483648']){r=await request(base,'/api/candidates/'+malformed+'/positions');check('strict positions identifier '+malformed,r.status===400,{status:r.status});}
  r=await request(base,'/api/civic/compare?candidateIds=1.5&policyCategories=healthcare');check('strict comparison identifier',r.status===400,{status:r.status});
  r=await request(base,'/api/elections/'+electionIds[0]+'/political-analysis');check('political analysis typed503 no invented score',r.status===503&&r.body.code==='political_analysis_unavailable'&&r.body.source===null&&r.body.asOf===null&&!['leaning','intensity','competitiveness','baseline','lastUpdated'].some(k=>k in r.body),{status:r.status});
  r=await request(base,path,{body:{candidateId:candidateIds[0]}});check('no cookie401',r.status===401,{status:r.status});
  r=await request(base,path,{cookie:cookies[0],headers:{origin:'https://foreign.invalid'},body:{candidateId:candidateIds[0]}});check('foreign origin403',r.status===403,{status:r.status});
  r=await request(base,path,{cookie:cookies[0],headers:{'sec-fetch-site':'same-site'},body:{candidateId:candidateIds[0]}});check('foreign same-site fetch metadata403',r.status===403,{status:r.status});
  r=await request(base,path,{cookie:cookies[0],body:{candidateId:candidateIds[2]}});check('foreign candidate422',r.status===422&&r.body.code==='candidate_not_in_election',{status:r.status});
  r=await request(base,path,{cookie:cookies[0],body:{candidateId:candidateIds[0],actor:actors[1],sessionId:'forged-unit-session'}});check('forged actor/session body422',r.status===422&&r.body.code==='invalid_intention',{status:r.status});
  const invalidCookie=cookies[0].slice(0,-1)+(cookies[0].endsWith('a')?'b':'a');r=await request(base,path,{cookie:invalidCookie,body:{candidateId:candidateIds[0]}});check('bad JWT signature401',r.status===401,{status:r.status});
  r=await request(base,path,{cookie:SESSION_COOKIE+'='+signSession({uid:actors[0],jti:randomUUID()}),body:{candidateId:candidateIds[0]}});check('signed JWT without auth_sessions row401',r.status===401,{status:r.status});
  check('all pre-write refusals preserve zero preference rows',(await readIntention(actors[0])).length===0);
  r=await request(base,path,{cookie:cookies[0],body:{candidateId:candidateIds[0]}});const first=(await readIntention(actors[0]))[0];check('actual201 committed row unknown valuesNULL',r.status===201&&r.body.success===true&&first?.confidence===null&&first?.is_likely_voter===null&&first?.session_id===hashes[0]&&first?.session_id!==actors[0],{status:r.status,storedConfidence:first?.confidence,storedLikelyVoter:first?.is_likely_voter});
  r=await request(other,path,{cookie:cookies[0],body:{candidateId:candidateIds[0]}});const repeat=(await readIntention(actors[0]))[0];check('actual200 cross-process repeat stable id xmin bytes',r.status===200&&first.id===repeat.id&&first.xmin===repeat.xmin&&JSON.stringify(first)===JSON.stringify(repeat),{status:r.status,firstXmin:first.xmin,repeatXmin:repeat.xmin});
  r=await request(base,path,{cookie:cookies[0],body:{candidateId:candidateIds[1],partyPreference:'R',confidence:'high'}});let changed=(await readIntention(actors[0]))[0];check('actual200 changed preference updates same row',r.status===200&&changed.id===first.id&&changed.xmin!==first.xmin&&changed.candidate_id===candidateIds[1]&&changed.confidence==='high'&&(await readIntention(actors[0])).length===1,{status:r.status,beforeXmin:first.xmin,afterXmin:changed.xmin});
  r=await request(base,path,{cookie:cookies[0],body:{candidateId:candidateIds[1],partyPreference:'R',confidence:'low'}});changed=(await readIntention(actors[0]))[0];check('explicit low confidence is preserved',r.status===200&&changed.confidence==='low'&&changed.is_likely_voter===null,{status:r.status,storedConfidence:changed.confidence});
  r=await request(base,path,{cookie:cookies[0],body:{candidateId:candidateIds[1],partyPreference:'R'}});changed=(await readIntention(actors[0]))[0];check('omitted confidence clears prior low toNULL',r.status===200&&changed.confidence===null&&changed.is_likely_voter===null,{status:r.status,storedConfidence:changed.confidence});
  const concurrently=await Promise.all(Array.from({length:12},(_,i)=>request(i%2?base:other,path,{cookie:cookies[2],body:{candidateId:candidateIds[0]}})));const current=await readIntention(actors[2]);check('twelve retries across two real processes create one current row',current.length===1&&concurrently.filter(x=>x.status===201).length===1&&concurrently.filter(x=>x.status===200).length===11,{statuses:concurrently.map(x=>x.status),rows:current.length});
  r=await request(base,path,{cookie:cookies[1],body:{partyPreference:'Undecided'}});check('different authenticated subject gets own single row',r.status===201&&(await readIntention(actors[1])).length===1&&(await readIntention(actors[0])).length===1,{status:r.status});
  const lock=await pool.connect();await lock.query('BEGIN');await lock.query('LOCK TABLE user_voting_intentions IN ACCESS EXCLUSIVE MODE');
  try{r=await request(base,path,{cookie:cookies[0],body:{candidateId:candidateIds[0]}});check('native PostgreSQL lock failure typed503 no acknowledgement',r.status===503&&r.body.code==='intention_store_unavailable'&&!('success' in r.body)&&r.durationMs>=1900&&r.durationMs<12000,{status:r.status,durationMs:r.durationMs,actualFault:'private access-exclusive lock triggers service2s lock_timeout'});}finally{await lock.query('ROLLBACK');lock.release();}
  check('native PostgreSQL failure preserves previous row',JSON.stringify(changed)===JSON.stringify((await readIntention(actors[0]))[0]));
  await pool.query('UPDATE auth_sessions SET expires_at=now()-interval \'1 minute\' WHERE user_id=$1',[actors[1]]);r=await request(base,path,{cookie:cookies[1],body:{partyPreference:'Other'}});check('signed JWT expired database session401',r.status===401,{status:r.status});
  const tokenC=cookies[2].slice(SESSION_COOKIE.length+1);const payload=JSON.parse(Buffer.from(tokenC.split('.')[1],'base64url').toString());await revokeSession(actors[2],payload.jti);r=await request(base,path,{cookie:cookies[2],body:{partyPreference:'Other'}});check('revoked auth_sessions JWT401',r.status===401,{status:r.status});
  await pool.query("INSERT INTO user_voting_intentions(election_id,session_id,candidate_id) VALUES($1,$2,$3)",[electionIds[0],hashes[3],candidateIds[0]]);
  r=await request(base,path,{cookie:cookies[3],body:{candidateId:candidateIds[1]}});const legacy=(await readIntention(actors[3]))[0];check('unknown likelihood on legacy-default current row remains honestNULL',r.status===200&&legacy.confidence===null&&legacy.is_likely_voter===null,{status:r.status,storedConfidence:legacy.confidence,storedLikelyVoter:legacy.is_likely_voter});
  await pool.query('UPDATE user_voting_intentions SET is_likely_voter=TRUE WHERE session_id=$1',[hashes[3]]);const legacyEqualBefore=(await readIntention(actors[3]))[0];
  r=await request(other,path,{cookie:cookies[3],body:{candidateId:candidateIds[1]}});const legacyEqualAfter=(await readIntention(actors[3]))[0];check('exact preference equality clears legacytrue once',r.status===200&&legacyEqualAfter.is_likely_voter===null&&legacyEqualAfter.confidence===null&&legacyEqualAfter.xmin!==legacyEqualBefore.xmin&&legacyEqualAfter.id===legacyEqualBefore.id,{status:r.status,beforeXmin:legacyEqualBefore.xmin,afterXmin:legacyEqualAfter.xmin});
  r=await request(base,path,{cookie:cookies[3],body:{candidateId:candidateIds[1]}});const repairedRepeat=(await readIntention(actors[3]))[0];check('next repaired equality retry keeps xmin bytes stable',r.status===200&&JSON.stringify(repairedRepeat)===JSON.stringify(legacyEqualAfter),{status:r.status,beforeXmin:legacyEqualAfter.xmin,afterXmin:repairedRepeat.xmin});
  await new Promise(resolve=>{workers[0].child.on('message',m=>{if(m?.authFaultApplied)resolve()});workers[0].child.send({authFault:true});});
  r=await request(base,path,{cookie:cookies[0],body:{candidateId:candidateIds[0]}});check('actual auth pool unavailability fails closed503',r.status===503&&r.body.error==='session_store_unavailable'&&!('success' in r.body),{status:r.status});
  r=await request(base,'/api/elections/'+electionIds[0]+'/political-analysis');check('actual election reader outage no fabricated score503',r.status===503&&r.body.code==='election_store_unavailable',{status:r.status});
  r=await request(base,'/api/candidates/'+candidateIds[0]+'/positions');check('actual local position store outage typed503',r.status===503&&r.body.code==='POSITION_SOURCE_UNAVAILABLE',{status:r.status});
 }catch(error){checks.push({scenario:'harness execution',outcome:'Failed',reason:error instanceof Error?error.message:'Unknown exception'});}
 finally{
  for(const worker of workers){const stopped=await new Promise(resolve=>{const timer=setTimeout(()=>resolve({stopped:false}),10000);worker.child.on('message',m=>{if(m?.stopped){clearTimeout(timer);resolve(m)}});worker.child.send({stop:true});});check('compiled worker stopped with no provider calls',stopped.stopped&&stopped.outboundCalls===0,{pid:worker.child.pid,outboundCalls:stopped.outboundCalls??null});}
  await pool.query('DELETE FROM user_voting_intentions WHERE session_id=ANY($1)',[ownedActors.map(subjectHash)]);await pool.query('DELETE FROM candidate_positions WHERE candidate_id=ANY($1)',[ownedCandidateIds]);await pool.query('DELETE FROM auth_sessions WHERE user_id=ANY($1)',[ownedActors]);await pool.query('DELETE FROM candidates WHERE id=ANY($1)',[ownedCandidateIds]);await pool.query('DELETE FROM elections WHERE id=ANY($1)',[ownedElectionIds]);await pool.query('DELETE FROM users WHERE id=ANY($1)',[ownedActors]);
  const after=await snapshot();originalPreserved=JSON.stringify(before)===JSON.stringify(after);check('original complete rows and xmin preserved after fixture cleanup',originalPreserved,{before,after});cleanupWorked=originalPreserved;
  const receipt={outcome:checks.every(c=>c.outcome==='Worked')?'Worked':'Failed',sourceSha,privateIdentity,compiledSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),mockCount:0,realHttp:true,realAuthSessionValidation:true,realPg:true,checks,responses,fixtureScope:'Private labelled unit actors and synthetic races/candidates only; never real voter intentions or official results',originalPreserved,cleanupWorked};
  writeFileSync(artifact+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');for(const [i,log] of workerLogs.entries())writeFileSync(artifact+'/worker-'+i+'.log',log.stdout+log.stderr);console.log(JSON.stringify({outcome:receipt.outcome,checks:checks.length,failed:checks.filter(c=>c.outcome==='Failed'),originalPreserved,cleanupWorked}));await pool.end();if(receipt.outcome!=='Worked')process.exitCode=1;
 }
}
