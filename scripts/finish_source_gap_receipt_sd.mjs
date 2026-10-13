import {readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';
import {loadPrivateSnapshot} from './source_data_rollback.ts';
const dir='artifacts/source-gap-private-sd',receipt=JSON.parse(readFileSync(dir+'/full-private-gate.json'));
if(receipt.outcome!=='Worked'||receipt.database!=='et_sol_data_6c78a3148c6b')throw new Error('Successful actual private receipt required');
const backup=join('C:/.codex/private/election-source-backups',receipt.privateBackupRunId);const before=loadPrivateSnapshot(join(backup,'before.json')),after=loadPrivateSnapshot(join(backup,'after-apply.json'));
if(before.hash!==receipt.checks[0].actual||after.hash!==receipt.afterApplyHash)throw new Error('Raw private snapshot binding differs');
const oldIds=new Set(before.tables.candidates.map(c=>c.id));const states=['SC','FL','GA','MN','AR','AZ','IL'];
receipt.apply.actualNewProfilesByState=Object.fromEntries(states.map(state=>[state,after.tables.candidates.filter(c=>!oldIds.has(c.id)&&after.tables.elections.some(e=>e.id===c.election_id&&e.state===state)).length]));
for(const stage of ['plan','apply','repeat'])for(const value of Object.values(receipt[stage].byState)){value.unboundActions=value.newProfiles;delete value.newProfiles;}
if(Object.values(receipt.apply.actualNewProfilesByState).reduce((a,b)=>a+b,0)!==receipt.apply.candidateInserts)throw new Error('Actual inserted rows do not conserve the application count');
receipt.actualCountDerivation='Independent original and after-apply owner-restricted full row snapshots; no new database operations. unboundActions reports planner IDs before binding, not actual insertion count.';
writeFileSync(dir+'/full-private-gate.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({outcome:'Worked',actualNewProfilesByState:receipt.apply.actualNewProfilesByState,actualInserted:receipt.apply.candidateInserts,noDatabaseOperations:true}));
