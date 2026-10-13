import {Client} from 'pg';
import {createHash} from 'node:crypto';
import {PgResultReportStore} from '../../server/results-store';
import {resultsSourceRegistry as registry} from '../../server/results-source-registry';
const url=new URL(process.env.DATABASE_URL!);if(url.hostname!=='et6-prod-109656-3a740d1d-db'||url.pathname!=='/et6_receiving')throw Error('private guard');
const c=new Client({connectionString:url.href});await c.connect();
const tables=['elections','candidates','candidate_source_records','general_candidate_list_snapshots','candidate_ingest_runs','election_catalog_correction_runs','official_results_sync_runs','election_result_reports','candidate_result_lines','result_evidence_blobs','election_results'];
async function digests(){const out={};for(const t of tables){const q=await c.query(`SELECT to_jsonb(t) AS row FROM public.${t} t ORDER BY to_jsonb(t)::text`);out[t]={count:q.rowCount,sha256:createHash('sha256').update(JSON.stringify(q.rows)).digest('hex')};}return out;}
const before=await digests();const cases=[];let rollback=false;
try{
 await c.query('BEGIN');
 const race=(await c.query("SELECT id,state,date,type FROM elections WHERE date < CURRENT_DATE AND state IS NOT NULL ORDER BY id LIMIT 1")).rows[0];if(!race)throw Error('no past race');
 const day=race.date.toISOString().slice(0,10);
 const source={id:'private-registry-boundary',name:'PRIVATE TEST ONLY',kind:'official_state_enr' as const,state:race.state,electionIds:[race.id],electionDate:day,phase:race.type,allowedUrls:['https://example.invalid/results']};
 const proxy={query:(...args)=>c.query(...args),connect:async()=>({query:(sql,...args)=>c.query(sql==='BEGIN'?'SAVEPOINT writer':sql==='COMMIT'?'RELEASE SAVEPOINT writer':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT writer':sql,...args),release:()=>{}})};
 const store=new PgResultReportStore(proxy as any);
 const input={schemaVersion:1,electionId:race.id,status:'unofficial',reporting:{percent:null,basis:null,precinctsReporting:null,precinctsTotal:null},source:{id:source.id,kind:source.kind,name:source.name,url:source.allowedUrls[0],sourceContestId:'private-boundary'},sourcePayloadSha256:'a'.repeat(64),asOf:null,asOfBasis:'not_provided',retrievedAt:new Date().toISOString(),totalVotes:1,candidates:[{candidateId:null,sourceCandidateId:'private-fixture',name:'PRIVATE TEST ONLY',party:null,votes:1,percent:null,isWinner:false}],winnerCalledBy:null,certification:null,note:null,supersedesReportId:null};
 for(const [name,patch] of [['id',{electionIds:[999999]}],['state',{state:race.state==='NC'?'LA':'NC'}],['date',{electionDate:'1900-01-01'}],['phase',{phase:'not-the-race-phase'}]]){
 registry.clear();registry.register({...source,...patch});const prior=await digests();let refusal=null;try{await store.recordResultReport(race.id,input as any,{postedBy:'private-boundary',idempotencyKey:null});}catch(e){refusal={status:e.status,code:e.publicCode};}
 const unchanged=JSON.stringify(prior)===JSON.stringify(await digests());const worked=refusal?.status===422&&['source_mismatch','unknown_source'].includes(refusal.code)&&unchanged;cases.push({name,refusal,unchanged,worked});if(!worked)throw Error('boundary failed '+name);
 }
 registry.clear();registry.register(source);const outcome=await store.recordResultReport(race.id,input as any,{postedBy:'private-boundary',idempotencyKey:null});cases.push({name:'valid-control',created:outcome.created,worked:outcome.created===true});if(!outcome.created)throw Error('control failed');
}finally{await c.query('ROLLBACK');rollback=true;}
const after=await digests();await c.end();const unchanged=JSON.stringify(before)===JSON.stringify(after);console.log(JSON.stringify({outcome:unchanged&&cases.every(x=>x.worked)?'Worked':'Failed',cases,rollback,before,after,unchanged,sequenceCaveat:'PostgreSQL result sequence increments are not transactional; source table rows are unchanged.'},null,2));if(!unchanged)process.exitCode=1;
