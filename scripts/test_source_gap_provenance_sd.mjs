import {readFileSync, writeFileSync, mkdirSync, mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {assertSourceGapRuntime} from './source_gap_runtime_pin_sd.mjs';
const dir='artifacts/source-gap-private-sd', head='72f7e8e6e5ac3fb93a7d31993c094565c1de1310';
const checks=[];
function check(scenario,ok){checks.push({scenario,outcome:ok?'Worked':'Failed'});if(!ok)throw new Error(scenario);}
check('all seven physical runtime modules match immutable green source',assertSourceGapRuntime(head).modules===7);
let oldRefused=false;try{assertSourceGapRuntime('9e10c4cf472a860489e97eb6f18f023abba1378f');}catch(e){oldRefused=/Runtime source pin differs/.test(e.message);}
check('historical red source refuses current green runtime instead of mislabelling it',oldRefused);
const isolated=mkdtempSync(join(tmpdir(),'sd-source-pin-'));
for(const r of JSON.parse(readFileSync(dir+'/runtime-provenance.json')).modules.filter(r=>r.case==='green')){
 const dest=join(isolated,r.path);mkdirSync(join(dest,'..'),{recursive:true});writeFileSync(dest,readFileSync(r.physicalSnapshot?dir+'/'+r.physicalSnapshot:r.path));
}
check('isolated source copy passes without database or secret access',assertSourceGapRuntime(head,isolated).modules===7);
const altered=join(isolated,'server/candidate-nominee-sync.ts');writeFileSync(altered,readFileSync(altered,'utf8')+'\n// private source tamper control\n');
let tamperRefused=false;try{assertSourceGapRuntime(head,isolated);}catch(e){tamperRefused=/Runtime source pin differs/.test(e.message);}
check('actual changed importer bytes refuse before database work',tamperRefused);
const inputRoot=mkdtempSync(join(tmpdir(),'sd-source-input-'));mkdirSync(join(inputRoot,dir,'inputs'),{recursive:true});
for(const r of JSON.parse(readFileSync(dir+'/input-index.json')).inputs)writeFileSync(join(inputRoot,dir,'inputs',r.label+'.json'),readFileSync(dir+'/inputs/'+r.label+'.json'));
const prep=process.cwd()+'/scripts/prepare_source_gap_sd.mjs';
const valid=spawnSync(process.execPath,[prep],{cwd:inputRoot,encoding:'utf8',windowsHide:true});
check('portable pinned input copies reproduce87 without origin worktrees',valid.status===0&&JSON.parse(valid.stdout).rows===87);
check('portable combined bytes match actual reviewed manifest',readFileSync(join(inputRoot,dir,'incremental-manifest.json')).equals(readFileSync(dir+'/incremental-manifest.json')));
const input=join(inputRoot,dir,'inputs/GA.json');writeFileSync(input,readFileSync(input,'utf8')+'\n');
const bad=spawnSync(process.execPath,[prep],{cwd:inputRoot,encoding:'utf8',windowsHide:true});
check('changed public input bytes are refused before combining',bad.status!==0&&/Immutable source proposal changed: GA/.test(bad.stderr));
const actual=JSON.parse(readFileSync(dir+'/full-private-gate.json'));
check('actual retained apply/repeat/restore counts match reviewed expectations',actual.outcome==='Worked'&&actual.apply.candidateInserts===36&&actual.apply.sourceChanges===87&&actual.repeat.candidateInserts===0&&actual.repeat.sourceChanges===0&&actual.restoredHash===actual.checks[0].expected&&Object.values(actual.apply.actualNewProfilesByState).reduce((a,b)=>a+b,0)===36);
const receipt={outcome:'Worked',checks,databaseConnections:0,privateScratch:isolated,inputScratch:inputRoot};
writeFileSync(dir+'/provenance-controls.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({outcome:receipt.outcome,checks:checks.length}));
