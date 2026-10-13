/** C-only read-only receiving plan; deliberately has no apply mode. */
import pg from 'pg';
import {parse} from 'dotenv';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseNomineeManifest,runNomineeRefresh} from '../server/candidate-nominee-sync.ts';
import {guard,snapshot} from './source_data_rollback.ts';
import {stateCoverage} from './source_data_capture.ts';
const expectedBefore='99d76b1c02ac17d106aa3534e43493d70f8f5e3095cbe75e5127c896584be673';
const manifestSha='f83bee609922a2213213d26fdd956c248a69a14718936ff2f39a757c0821223a';
const path='artifacts/source-gap-private-sd/incremental-manifest.json';
const bytes=readFileSync(path);
if(createHash('sha256').update(bytes).digest('hex')!==manifestSha)throw new Error('Exact reviewed incremental manifest required');
const manifest=parseNomineeManifest(JSON.parse(bytes));
if(manifest.candidates.length!==87||manifest.sources.length!==26)throw new Error('Reviewed source counts differ');
if(!process.env.ELECTION_ENV_FILE)throw new Error('Explicit approved source environment file required');
const env=parse(readFileSync(process.env.ELECTION_ENV_FILE));
const url=new URL(env.DATABASE_URL);
if(!['postgres:','postgresql:'].includes(url.protocol)||!['localhost','127.0.0.1'].includes(url.hostname)||(url.port||'5432')!=='5432'||url.pathname!=='/elections'||url.search||url.hash)throw new Error('Exact local5432/elections transport without routing overrides required');
const authorize=name=>{if(name!=='elections')throw new Error('Only the explicitly approved shared source database may be inspected');};
const pool=new pg.Pool({connectionString:url.toString(),max:2,options:'-c default_transaction_read_only=on -c timezone=UTC',connectionTimeoutMillis:10000});
const capture=async()=>{const c=await pool.connect();try{await guard(c,'elections',authorize);await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const s=await snapshot(c,'elections',false,authorize);await c.query('ROLLBACK');return s;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}};
const receipt={mode:'shared-source-read-only-incremental-plan',manifestSha256:manifestSha,expectedPreimageSha256:expectedBefore,database:'local5432/elections',startedAt:new Date().toISOString(),deploymentPerformed:false,applyPerformed:false};
try{
 const before=await capture();if(before.hash!==expectedBefore)throw new Error('Shared source preimage drifted; no plan accepted');
 const plan=await runNomineeRefresh(pool,manifest,manifestSha,false);
 const perState={};
 for(const action of plan.actions){const row=perState[action.record.state]??={rows:0,newCandidates:0,reusedProfiles:0,sourceIds:new Set(),races:new Set()};row.rows++;row.sourceIds.add(action.source.id);row.races.add(action.electionId);if(action.candidateId==null)row.newCandidates++;else row.reusedProfiles++;}
 receipt.perState=Object.fromEntries(Object.entries(perState).map(([state,r])=>[state,{rows:r.rows,newCandidates:r.newCandidates,reusedProfiles:r.reusedProfiles,sources:r.sourceIds.size,races:r.races.size}]));
 receipt.beforeCounts=stateCoverage(before);
 receipt.actions=plan.actions.map(a=>({electionId:a.electionId,candidateId:a.candidateId??null,state:a.record.state,office:a.record.office,district:a.record.district,name:a.record.name,ballotName:a.record.ballotName??null,partyRaw:a.record.partyRaw,partyValue:a.party,sourceId:a.source.id,ballotAccessType:a.record.ballotAccessType??'not_specified'}));
 receipt.unresolved=plan.unresolved;
 const after=await capture();receipt.preimageSha256=before.hash;receipt.postimageSha256=after.hash;receipt.readOnlyUnchanged=before.hash===after.hash;
 receipt.outcome=receipt.readOnlyUnchanged&&plan.unresolved.length===0&&plan.actions.length===87?'Worked':'Blocked';
 receipt.finishedAt=new Date().toISOString();
 mkdirSync('artifacts/source-gap-shared',{recursive:true});writeFileSync('artifacts/source-gap-shared/dry-run.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({outcome:receipt.outcome,perState:receipt.perState,unresolved:receipt.unresolved,readOnlyUnchanged:receipt.readOnlyUnchanged,applyPerformed:false}));
 if(receipt.outcome!=='Worked')process.exitCode=1;
}finally{await pool.end();}
