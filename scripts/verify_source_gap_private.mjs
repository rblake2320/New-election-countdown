/** Twelve reviewed public source facts: exact private clone only, no source/provider writes. */
import pg from 'pg';
import {parse} from 'dotenv';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
const database='et_sol_data_6c78a3148c6b';
const artifact=resolve('artifacts/source-gap-private');
const sha=v=>createHash('sha256').update(v).digest('hex');
const useAliases=process.argv.includes('--reviewed-aliases');
const body=readFileSync(join(artifact,useAliases?'reviewed-supplement-aliases.json':'reviewed-supplement.json'));
const manifestSha=useAliases?'39bf7e06f36c4f175a8eecc6ae60e767f040e8ba35486d7f45fb42a3a5dc0082':'0877a940f63bae7c9a9f459c8d38c673096a6365e40dbd0ebd82d4ce7aabbe75';
if(sha(body)!==manifestSha)throw new Error('Supplement byte pin changed');
const {parseNomineeManifest,runNomineeRefresh}=await import(pathToFileURL(join(artifact,'nominee-core.mjs')).href);
const {guard,snapshot,sourceHash,createPrivateDirectory,savePrivateSnapshot,rollbackSourceRows}=await import(pathToFileURL(join(artifact,'rollback-core.mjs')).href);
const manifest=parseNomineeManifest(JSON.parse(body));
const env=parse(readFileSync(process.env.ELECTION_ENV_FILE??'D:/projects/New-election-countdown/.env'));
const u=new URL(env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.port!=='5432')throw new Error('Approved loopback endpoint required');
u.pathname='/'+database;u.searchParams.set('options','-c timezone=UTC'+(process.argv.includes('--apply')?'':' -c default_transaction_read_only=on'));
const pool=new pg.Pool({connectionString:u.toString(),max:2});
const authorize=name=>{if(name!==database)throw new Error('Exact assigned private database required');};
const capture=async()=>{const c=await pool.connect();try{await guard(c,database,authorize);await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const value=await snapshot(c,database,false,authorize);await c.query('ROLLBACK');return value;}finally{c.release();}};
const summary=p=>({actions:p.actions.length,unresolved:p.unresolved,candidateInserts:p.candidateInserts??0,sourceChanges:p.sourceChanges??0,auditId:p.auditId??null,rows:p.actions.map(a=>({state:a.record.state,district:a.record.district,name:a.record.name,partyRaw:a.record.partyRaw,normalizedParty:a.party,electionId:a.electionId,candidateId:a.candidateId??null}))});
const result={version:1,database,mode:process.argv.includes('--apply')?'private-apply-repeat-rollback':'read-only-plan',manifestSha,nomineeCoreSha:sha(readFileSync(join(artifact,'nominee-core.mjs'))),rollbackCoreSha:sha(readFileSync(join(artifact,'rollback-core.mjs'))),startedAt:new Date().toISOString()};
let before,after,privateDirectory;
try{
 before=await capture();result.beforeHash=before.hash;result.beforeCounts=Object.fromEntries(Object.entries(before.tables).map(([t,r])=>[t,r.length]));
 const plan=await runNomineeRefresh(pool,manifest,manifestSha,false);result.plan=summary(plan);
 const afterPlan=await capture();if(afterPlan.hash!==before.hash)throw new Error('Dry-run changed source rows');result.dryRunUnchanged=true;
 const targets=new Set(plan.actions.map(a=>a.electionId));
 result.targetBefore=before.tables.elections.filter(e=>targets.has(e.id)).map(e=>({id:e.id,state:e.state,title:e.title,date:e.date,phase:e.type,profiles:before.tables.candidates.filter(c=>c.election_id===e.id).map(c=>({id:c.id,name:c.name,party:c.party})),currentGeneralRows:before.tables.candidate_source_records.filter(s=>s.is_current&&s.source_layer==='general_candidate_list'&&s.metadata.electionId===e.id).length}));
 if(plan.unresolved.length)throw new Error('Review collisions or party refusals before apply');
 if(process.argv.includes('--apply')){
  if(process.env.SOURCE_GAP_EXPECT_PREIMAGE!==before.hash)throw new Error('Explicit reviewed complete preimage SHA required');
  privateDirectory=join('C:/.codex/private/election-source-backups','source-gap-'+randomUUID());createPrivateDirectory(privateDirectory);savePrivateSnapshot(join(privateDirectory,'before.json'),before);
  result.apply=summary(await runNomineeRefresh(pool,manifest,manifestSha,true));after=await capture();savePrivateSnapshot(join(privateDirectory,'after-apply.json'),after);
  result.afterHash=after.hash;
  const beforeIds=new Set(before.tables.candidates.map(c=>c.id));
  const originalAfter=after.tables.candidates.filter(c=>beforeIds.has(c.id));
  if(sourceHash(originalAfter)!==sourceHash(before.tables.candidates))throw new Error('Original profile fields changed');result.allOriginalProfilesPreserved=true;
  for(const t of ['elections','election_catalog_correction_runs','official_results_sync_runs'])if(sourceHash(before.tables[t])!==sourceHash(after.tables[t]))throw new Error('Unassigned data table changed');
  const outsideBefore=before.tables.candidate_source_records.filter(s=>!targets.has(s.metadata?.electionId));
  const outsideAfter=after.tables.candidate_source_records.filter(s=>!targets.has(s.metadata?.electionId));
  if(sourceHash(outsideBefore)!==sourceHash(outsideAfter))throw new Error('Foreign source membership changed');result.outsideReceivingScopesUnchanged=true;
  result.targetAfter=[...targets].map(id=>({electionId:id,profiles:after.tables.candidates.filter(c=>c.election_id===id).length,currentGeneralRows:after.tables.candidate_source_records.filter(s=>s.is_current&&s.source_layer==='general_candidate_list'&&s.metadata.electionId===id).length}));
  result.repeat=summary(await runNomineeRefresh(pool,manifest,manifestSha,true));after=await capture();savePrivateSnapshot(join(privateDirectory,'after-repeat.json'),after);
  if(result.repeat.candidateInserts!==0||result.repeat.sourceChanges!==0)throw new Error('Exact-repeat source/candidate writes');
  result.rollback=await rollbackSourceRows(pool,before,after,{authorizeDatabase:authorize});after=null;
  const restored=await capture();if(restored.hash!==before.hash)throw new Error('Exact logical source preimage not restored');result.restoredHash=restored.hash;result.rollbackExact=true;
 }
 result.outcome='Worked';
}catch(error){result.outcome='Failed';result.failure={type:error.name,code:error.code??null,message:error.message};
 // Restore only a retained complete postimage through the same guarded source-only helper.
 if(before&&privateDirectory){try{
  const current=await capture();savePrivateSnapshot(join(privateDirectory,'failure-post.json'),current);
  if(current.hash===before.hash)result.failureRestoredHash=current.hash;
  else if(after){result.failureRollback=await rollbackSourceRows(pool,before,after,{authorizeDatabase:authorize});result.failureRestoredHash=(await capture()).hash;}
  else throw new Error('No retained owned postimage: refuse automatic rollback of unknown intervening rows');
 }catch(e){result.failureRollbackError={code:e.code??null,message:e.message};}}
 process.exitCode=1;
}finally{
 result.finishedAt=new Date().toISOString();writeFileSync(join(artifact,(useAliases?'alias-':'')+(process.argv.includes('--apply')?'private-apply-receipt.json':'read-only-plan.json')),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({outcome:result.outcome,beforeHash:result.beforeHash,actions:result.plan?.actions,newProfiles:result.plan?.rows.filter(r=>r.candidateId===null).length,unresolved:result.plan?.unresolved,applied:result.apply?{inserts:result.apply.candidateInserts,sourceChanges:result.apply.sourceChanges}:null,repeat:result.repeat?{inserts:result.repeat.candidateInserts,sourceChanges:result.repeat.sourceChanges}:null,rollbackExact:result.rollbackExact??false,failure:result.failure??null}));await pool.end();
}
