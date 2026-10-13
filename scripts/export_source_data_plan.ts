/** Public counts/hashes only, derived from the protected actual rehearsal snapshots. */
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadPrivateSnapshot,sourceHash} from './source_data_rollback';
import {stateCoverage} from './source_data_release';
const receipt=JSON.parse(readFileSync('artifacts/source-data-release/exported-pipeline-rehearsal.json','utf8'));
if(receipt.outcome!=='Worked')throw new Error('Actual exported pipeline must succeed before publishing');
const dir=join('C:/.codex/private/election-source-backups',receipt.privateBackupRunId);
const before=loadPrivateSnapshot(join(dir,'before.json')),after=loadPrivateSnapshot(join(dir,'final-post.json'));
const original=stateCoverage(before),final=stateCoverage(after),summary=receipt.stages.find((s:any)=>s.stage==='summary'&&s.label==='first-apply');
const totals=Object.fromEntries(Object.keys(final.AL).map(key=>[key,Object.values(final).reduce((sum,state)=>sum+state[key],0)]));
const result={version:1,outcome:'Worked',date:'2026-11-03',database:receipt.database,baselineSourceHash:before.hash,finalSourceHash:after.hash,rollbackSourceHash:receipt.rollback.hash,rollbackExact:receipt.rollbackExact,rollbackFaultAtomic:receipt.rollbackFaultAtomic,actualPostimageDriftRefused:receipt.actualPostimageDriftRefused,sourceInputs:receipt.sources,initialTableCounts:receipt.initial.counts,finalTableCounts:summary.tableCounts,totals,states:Object.keys(final).sort().map(state=>({state,before:original[state],nomineePlan:summary.nomineePlanned[state]??{rows:0,newCandidates:0},after:final[state]})),LAHouseFecActionsByDistrict:summary.LAHouseFecActionsByDistrict,LAHouseRegistrationOnlyCounts:summary.LAHouseRegistrationOnlyCounts,fecUnmatchedByTuple:summary.fecUnmatchedByTuple,originalCandidateFieldChanges:summary.originalCandidateFieldChanges,originalProfilesPreserved:summary.originalProfilesPreserved,interpretation:'Candidate totals include FEC registrations, not certified nominees. Results metadata includes blocked NH routes; actual URL counts are separate. Null poll close is explicitly unknown. No source-row values or credentials retained.'};
writeFileSync('artifacts/source-data-release/final-per-state.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({outcome:result.outcome,totals,LAHouseRegistrationOnlyCounts:result.LAHouseRegistrationOnlyCounts,fieldChanges:result.originalCandidateFieldChanges,publicReceiptHash:sourceHash(result)}));
