import {readFileSync} from 'node:fs';
import {parseNomineeManifest} from '../server/candidate-nominee-sync';
for(const [state,file] of [['ga','ga-2026-general-incremental.json'],['mn','mn-2026-general-incremental.json'],['mn-current-sgh03','mn-2026-general-current-sgh03.json']]){
  const manifest=parseNomineeManifest(JSON.parse(readFileSync(`artifacts/ga-mn-general/drafts/${file}`,'utf8')));
  console.log(JSON.stringify({state,outcome:'Worked',sources:manifest.sources.length,candidates:manifest.candidates.length,scopes:manifest.sources.flatMap(s=>s.completeScopes),dbWrites:false}));
  const controls: Array<[string,(value: typeof manifest)=>void]>=[
    ['wrong declared row count',value=>{value.sources[0].expectedRowCount+=1;}],
    ['row date mismatches source',value=>{value.candidates[0].date='2026-11-04';}],
    ['row state mismatches source',value=>{value.candidates[0].state='AK';}],
    ['complete scope count mismatches rows',value=>{value.sources[0].completeScopes[0].expectedCount+=1;}],
  ];
  for(const [scenario,mutate] of controls){
    const value=structuredClone(manifest);mutate(value);let refused=false;
    try{parseNomineeManifest(value);}catch{refused=true;}
    if(!refused)throw new Error(`${state}: unsafe source mutation accepted: ${scenario}`);
    console.log(JSON.stringify({state,scenario,outcome:'Worked',result:'Refused',dbWrites:false}));
  }
}
