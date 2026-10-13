import {assertSourceGapRuntime,assertGitPinnedSourceGapRuntime} from './source_gap_runtime_pin_sd.mjs';
const reviewedHead=process.argv.find(a=>a.startsWith('--review-runtime-head='))?.split('=')[1];
if(reviewedHead)assertGitPinnedSourceGapRuntime(reviewedHead);else assertSourceGapRuntime('72f7e8e6e5ac3fb93a7d31993c094565c1de1310');
import pg from 'pg';import {parse} from 'dotenv';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseNomineeManifest,runNomineeRefresh} from '../server/candidate-nominee-sync.ts';
import {guard,snapshot} from './source_data_rollback.ts';
const database='et_sol_data_6c78a3148c6b',base='artifacts/source-gap-private-sd',out=reviewedHead?base+'/runtime-repair-'+reviewedHead.slice(0,8):base;mkdirSync(out,{recursive:true});
const env=parse(readFileSync('D:/projects/New-election-countdown/.env'));const u=new URL(env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.port!=='5432')throw new Error('Approved local endpoint required');
u.pathname='/'+database;u.searchParams.set('options','-c timezone=UTC -c default_transaction_read_only=on');
const pool=new pg.Pool({connectionString:u.toString(),max:2});
const authorize=name=>{if(name!==database)throw new Error('Exact approved private database required');};
const hash=b=>createHash('sha256').update(b).digest('hex');
const capture=async()=>{const c=await pool.connect();try{await guard(c,database,authorize);await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const s=await snapshot(c,database,false,authorize);await c.query('ROLLBACK');return s;}catch(error){await c.query('ROLLBACK').catch(()=>{});throw error;}finally{c.release();}};
const receipt={runtimeImporterHead:reviewedHead??'72f7e8e6e5ac3fb93a7d31993c094565c1de1310',database,mode:'read-only',plans:[],refusals:[]};
try{
 const before=await capture();receipt.beforeHash=before.hash;receipt.expectedReviewedBefore='1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2';receipt.reviewedBaselineMatches=before.hash===receipt.expectedReviewedBefore;receipt.tableCounts=Object.fromEntries(Object.entries(before.tables).map(([t,r])=>[t,r.length]));
 const b=readFileSync(base+'/incremental-manifest.json');receipt.manifestSha256=hash(b);
 const original=JSON.parse(b);const labels=['SC','FL','GA','MN','AR','AZ','IL','all',...original.sources.filter(s=>s.state==='AZ').map(s=>'AZSOURCE:'+s.id)];
 for(const state of labels){
  const raw=JSON.parse(b);const m=state==='all'?raw:{version:1,sources:raw.sources.filter(s=>s.state===state),candidates:raw.candidates.filter(r=>r.state===state)};
  if(state.startsWith('AZSOURCE:')){const id=state.slice(9);m.sources=raw.sources.filter(s=>s.id===id);m.candidates=raw.candidates.filter(r=>r.sourceId===id);}
  try{const parsed=parseNomineeManifest(m);const p=await runNomineeRefresh(pool,parsed,hash(Buffer.from(JSON.stringify(m))),false);receipt.plans.push({state,rows:parsed.candidates.length,actions:p.actions.length,unresolved:p.unresolved,rowsPlanned:p.actions.map(a=>({state:a.record.state,office:a.record.office,district:a.record.district,name:a.record.name,partyRaw:a.record.partyRaw,partyValue:a.record.partyValue??null,normalizedParty:a.party,electionId:a.electionId,candidateId:a.candidateId??null}))});}
  catch(error){receipt.refusals.push({state,type:error.name,message:error.message});}
 }
 const after=await capture();receipt.afterHash=after.hash;receipt.dryRunUnchanged=after.hash===before.hash;receipt.outcome=receipt.reviewedBaselineMatches&&receipt.dryRunUnchanged&&receipt.refusals.length===0&&receipt.plans.every(p=>p.unresolved.length===0)?'Worked':'Blocked';
}finally{writeFileSync(out+'/read-only-plan.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({outcome:receipt.outcome,beforeHash:receipt.beforeHash,baselineMatches:receipt.reviewedBaselineMatches,dryRunUnchanged:receipt.dryRunUnchanged,plans:receipt.plans.map(p=>({state:p.state,rows:p.rows,actions:p.actions,unresolved:p.unresolved})),refusals:receipt.refusals}));await pool.end();}
