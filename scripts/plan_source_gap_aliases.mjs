import pg from 'pg';
import {parse} from 'dotenv';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const database='et_sol_data_6c78a3148c6b';
const env=parse(readFileSync('D:/projects/New-election-countdown/.env'));
const u=new URL(env.DATABASE_URL);if(!['localhost','127.0.0.1'].includes(u.hostname)||u.port!=='5432')throw new Error('Exact private loopback required');
u.pathname='/'+database;u.searchParams.set('options','-c default_transaction_read_only=on -c timezone=UTC');
const pool=new pg.Pool({connectionString:u.toString()});
const dir=resolve('artifacts/source-gap-private');
const {parseNomineeManifest,runNomineeRefresh,planNomineeRefresh}=await import(pathToFileURL(dir+'/nominee-core.mjs').href);
const {snapshot}=await import(pathToFileURL(dir+'/rollback-core.mjs').href);
const authorize=name=>{if(name!==database)throw new Error('Exact assigned private target required');};
const capture=async()=>{const c=await pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const s=await snapshot(c,database,false,authorize);await c.query('ROLLBACK');return s;}finally{c.release();}};
try{
 const bytes=readFileSync(dir+'/reviewed-supplement-aliases.json');const sha=createHash('sha256').update(bytes).digest('hex');
 const expected=JSON.parse(readFileSync(dir+'/identity-disposition.json')).manifestSha256;if(sha!==expected)throw new Error('Reviewed alias manifest hash mismatch');
 const m=parseNomineeManifest(JSON.parse(bytes));const before=await capture();
 for(const [id,fecId,district] of [[10330,'H2SC02059','02'],[12225,'H8SC04250','04']]){
  const c=before.tables.candidates.find(c=>c.id===id);
  const s=before.tables.candidate_source_records.filter(s=>s.candidate_id===id&&s.is_current&&s.source_layer==='fec_registration');
  if(c?.fec_candidate_id!==fecId||c.party!=='R'||c.fec_status!=='C'||s.length!==1)throw new Error('Current reviewed FEC identity changed');
  const proof=s[0].metadata;
  if(proof.fecCandidateId!==fecId||proof.electionYear!==2026||proof.state!=='SC'||proof.office!=='H'||proof.district!==district||proof.electionId!==c.election_id||proof.electionDate!=='2026-11-03'||proof.partyRaw!=='REP'||proof.fecStatus!=='C')throw new Error('Current FEC source tuple changed');
 }
 const plan=await runNomineeRefresh(pool,m,sha,false);if(plan.unresolved.length||plan.actions.length!==12||plan.actions.filter(a=>a.candidateId==null).length!==4)throw new Error('Revised read-only plan mismatch');
 for(const [name,id] of [['Joe Wilson',10330],['William Timmons',12225]])if(plan.actions.find(a=>a.record.name===name)?.candidateId!==id)throw new Error('Explicit alias failed exact current profile association');
 const elections=before.tables.elections.map(e=>({...e,date:String(e.date).slice(0,10)}));
 const candidates=before.tables.candidates;
 // Pure negative controls using actual retained rows with one controlled mutation; no PG writes.
 const badParty=planNomineeRefresh(m,elections,candidates.map(c=>c.id===10330?{...c,party:'D'}:c));
 if(!badParty.unresolved.some(u=>u.name==='Joe Wilson'&&u.reason==='party-conflict'))throw new Error('Opposing party was not refused');
 const badIdentity=planNomineeRefresh(m,elections,[...candidates,{...candidates.find(c=>c.id===10330),id:2147483646}]);
 if(!badIdentity.unresolved.some(u=>u.name==='Joe Wilson'&&u.reason==='ambiguous-identity'))throw new Error('Ambiguous duplicate was not refused');
 const after=await capture();if(after.hash!==before.hash)throw new Error('Read-only alias research changed source rows');
 const receipt={outcome:'Worked',readOnly:true,manifestSha256:sha,beforeHash:before.hash,afterHash:after.hash,actions:plan.actions.map(a=>({name:a.record.name,partyRaw:a.record.partyRaw,electionId:a.electionId,candidateId:a.candidateId??null,aliases:a.record.aliases??[],ballotName:a.record.ballotName})),newProfiles:4,unresolved:plan.unresolved,controlledNegatives:[{case:'opposing party',outcome:'Refused party-conflict'},{case:'duplicated same alias identity',outcome:'Refused ambiguous-identity'}],checkedAt:new Date().toISOString()};
 writeFileSync(dir+'/alias-plan-readonly.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({outcome:receipt.outcome,newProfiles:4,unresolved:[],beforeHash:before.hash,afterHash:after.hash,controlledNegatives:receipt.controlledNegatives}));
}finally{await pool.end();}
