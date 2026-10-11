/** Curated source validation only: no network or database use. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseNomineeManifest } from '../server/candidate-nominee-sync';
const files=readdirSync('data/nominees').filter(name=>name.endsWith('-2026-general.json')).sort();
const sources=[],candidates=[],receipts=[];
for(const file of files){
  const bytes=readFileSync(join('data/nominees',file));
  const m=parseNomineeManifest(JSON.parse(bytes.toString('utf8')));
  sources.push(...m.sources);candidates.push(...m.candidates);
  receipts.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),sources:m.sources.length,rows:m.candidates.length,completeScopes:m.sources.reduce((n,s)=>n+s.completeScopes.length,0)});
}
const combined=parseNomineeManifest({version:1,sources,candidates});
writeFileSync('data/nominees/combined-2026-reviewed.json',JSON.stringify(combined,null,2));
const receipt={outcome:'worked',states:Array.from(new Set(combined.sources.map(s=>s.state))),records:combined.candidates.length,sources:combined.sources.length,files:receipts,unknownIncumbency:combined.candidates.filter(c=>c.incumbent==null).length,writeIns:combined.candidates.filter(c=>c.ballotAccessType==='write_in').length,ballotStatusPromoted:false,dbWrites:false};
writeFileSync('artifacts/lane-c/nominee-manifests-validation.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt));
