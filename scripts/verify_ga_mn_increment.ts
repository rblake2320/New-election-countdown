import {readFileSync} from 'node:fs';
import {parseNomineeManifest} from '../server/candidate-nominee-sync';
for(const state of ['ga','mn']){
  const manifest=parseNomineeManifest(JSON.parse(readFileSync(`artifacts/ga-mn-general/drafts/${state}-2026-general-incremental.json`,'utf8')));
  console.log(JSON.stringify({state,outcome:'Worked',sources:manifest.sources.length,candidates:manifest.candidates.length,scopes:manifest.sources.flatMap(s=>s.completeScopes),dbWrites:false}));
}
