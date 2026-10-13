import { config } from 'dotenv';
import pg from 'pg';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { runFecSync } from '../server/fec-candidate-sync';
import { runNomineeRefresh } from '../server/candidate-nominee-sync';
import { runLouisianaHouseCorrection } from '../server/louisiana-house-catalog';
import { syncOfficialResults } from '../server/official-results-sync';
import { pollHoursFor } from '../server/poll-hours-2026';
import { loadReviewedReleaseSources, captureSourceSnapshot, stateCoverage } from './source_data_release';

config({path:process.env.ELECTION_ENV_FILE??'.env',quiet:true});
const url=new URL(process.env.DATABASE_URL??'');
if(!['localhost','127.0.0.1'].includes(url.hostname)||(url.port||'5432')!=='5432'||url.pathname!=='/elections')throw new Error('Approved target required');
const pool=new pg.Pool({connectionString:url.toString(),max:1,options:'-c default_transaction_read_only=on'});
const authorize=(name:string)=>{if(name!=='elections')throw new Error('Wrong source target');};
try {
  const before=await captureSourceSnapshot(pool,'elections',authorize);
  const sources=await loadReviewedReleaseSources('C:/Users/techai/.codex/tmp/sol-fec-first-physical/artifacts/fec-first/cn26.zip');
  const fec=await runFecSync(pool,sources.fecRows,sources.fecSha,false);
  const nominees=await runNomineeRefresh(pool,sources.manifest,sources.manifestSha,false);
  const catalog=await runLouisianaHouseCorrection(pool);
  const links=await syncOfficialResults(pool,{...sources.links,mode:'dry-run'});
  const rows=before.tables.elections.filter(row=>String(row.date).slice(0,10)==='2026-11-03');
  const pollChanges=rows.filter(row=>{const h=pollHoursFor(String(row.state),String(row.title));return!h||row.polls_open!==h.open||row.polls_close!==h.close||row.timezone!==h.tz||row.poll_close_kind!==h.kind||row.poll_hours_basis!==h.basis||row.poll_hours_source!==h.source;}).length;
  const after=await captureSourceSnapshot(pool,'elections',authorize);
  if(after.hash!==before.hash||fec.actions.length||nominees.unresolved.length||nominees.actions.some(action=>action.candidateId==null)||catalog.changes.length||links.changedCount||pollChanges)throw new Error('Read-only repeat or receiving failed');
  const perState=stateCoverage(after);
  const total=Object.values(perState).reduce((out,state)=>{for(const[k,v]of Object.entries(state))out[k]=(out[k]??0)+v;return out;},{} as Record<string,number>);
  const receipt={outcome:'Worked',database:'local5432/elections',readOnly:true,checkedAt:new Date().toISOString(),sourceBeforeHash:before.hash,sourceAfterHash:after.hash,repeat:{FECactions:0,nomineeNewCandidates:0,nomineeUnresolved:0,LAchanges:0,resultsChanges:0,pollChanges:0},totals:total,perState};
  mkdirSync('artifacts/data-deployment',{recursive:true});writeFileSync('artifacts/data-deployment/shared-readonly-receiving.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  // Review exact tuples for C's22 configured live federal contests.
  const approved=rows.filter(row=>['NC','LA'].includes(String(row.state))&&String(row.level)==='federal').map(row=>({id:Number(row.id),state:String(row.state),date:String(row.date).slice(0,10),type:String(row.type),level:String(row.level),title:String(row.title)}));
  if(approved.length!==22)throw new Error('Expected22 NC/LA federal source bindings');
  mkdirSync('data/official-results/live',{recursive:true});writeFileSync('data/official-results/live/2026-nc-la-target-bindings.json',JSON.stringify({version:1,reviewedAt:new Date().toISOString(),sourceSnapshotSha256:after.hash,targets:approved},null,2)+'\n');
  console.log(JSON.stringify({outcome:'Worked',totals:total,repeat:receipt.repeat,approvedLiveTargets:approved.length,sourceHash:after.hash}));
}finally{await pool.end();}
