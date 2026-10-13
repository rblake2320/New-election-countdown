import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out='artifacts/source-gap-private-sd';mkdirSync(out+'/inputs',{recursive:true});
const inputs=[
 ['SCFL','D:/projects/et-wt/sol-verified-policy-comparison/artifacts/source-gap-private/reviewed-supplement-aliases.json','39bf7e06f36c4f175a8eecc6ae60e767f040e8ba35486d7f45fb42a3a5dc0082'],
 ['GA','D:/projects/et-wt/sol-ga-mn-general-sources/artifacts/ga-mn-general/drafts/ga-2026-general-incremental.json','d01af1b3246ba080ad38ea41b60ee626e32d0b1f2c76cc00258627e090d855a0'],
 ['MN','D:/projects/et-wt/sol-ga-mn-general-sources/artifacts/ga-mn-general/drafts/mn-2026-general-incremental.json','94bfd107aa250cc91082091d8f3d8e3be2af703c5806a56480843456fb0d53b4'],
 ['AR','D:/projects/et-wt/sol-c-source-gaps/artifacts/nominee-source-gaps/refinement/ar-general-three-gaps-refined-draft.json','3542c6725cb4e3c7859ed9623aa087f8f242055560d2d6cc50d505b29e05a99b'],
 ['AZ','D:/projects/et-wt/sol-c-source-gaps/artifacts/nominee-source-gaps/refinement/az-general-gov-h06-h07-refined-draft.json','a76b4fef5b00bf5c9071207d5a528ccd3504d84dbc8ada6a4f0bcddbd6f7f8fe'],
 ['AZWEB','D:/projects/et-wt/sol-c-source-gaps/artifacts/nominee-source-gaps/az-h02-h05-web-reviewed-draft.json','381599694a2a56a671045ffaf58bef20ab2ffb0611230ce1d277464e7ee55831'],
 ['IL','D:/projects/et-wt/sol-c-source-gaps/artifacts/nominee-source-gaps/il-general-governor-draft.json','ff55c63006017ffc646bf9643a26eaaf9ff02510dcb4d8883168112760dc2c0e'],
 ['AZWI','D:/projects/et-wt/sol-c-source-gaps/artifacts/nominee-source-gaps/az-h06-write-in-addon-draft.json','3748bf0277ea3a14c752261458abf14059f773dc49d38fe9e233bd122799ddf8'],
];
const hash=b=>createHash('sha256').update(b).digest('hex'),combined={version:1,sources:[],candidates:[]},receipt=[];
const identities=new Map(),sourceIds=new Map();
for(const [label,path,expected] of inputs){
 const captured=out+'/inputs/'+label+'.json';const fromOrigins=process.argv.includes('--capture-origins');
 const b=readFileSync(fromOrigins?path:captured);if(hash(b)!==expected)throw new Error('Immutable source proposal changed: '+label);
 if(fromOrigins)writeFileSync(captured,b);const m=JSON.parse(b);const duplicateRows=[];
 for(const s of m.sources){if(sourceIds.has(s.id))throw new Error('Repeated source ID requires explicit review: '+s.id);sourceIds.set(s.id,s);combined.sources.push(s);}
 for(const r of m.candidates){
  const key=[r.state,r.office,r.district,r.date,r.name.trim().toLocaleLowerCase()].join('|');
  if(identities.has(key))duplicateRows.push({key,prior:identities.get(key),incoming:r});else{identities.set(key,r);combined.candidates.push(r);}
 }
 receipt.push({label,path,sha256:expected,rows:m.candidates.length,sources:m.sources.length,duplicateRows});
}
// Never silently discard a qualified write-in or overwrite its publisher evidence.
if(receipt.some(r=>r.duplicateRows.length)){writeFileSync(out+'/duplicate-review.json',JSON.stringify(receipt.filter(r=>r.duplicateRows.length),null,2)+'\n');throw new Error('Explicit duplicate fact/class/source review required before combined manifest');}
writeFileSync(out+'/incremental-manifest.json',JSON.stringify(combined,null,2)+'\n');
writeFileSync(out+'/input-index.json',JSON.stringify({inputs:receipt,canonicalInputMode:'byte-pinned copies under inputs; origins are provenance only unless --capture-origins explicitly selected',heldSeparate:['GA current sixteen qualified-write-in refresh','MN current nine S/G/H03 refresh'],rows:combined.candidates.length,sources:combined.sources.length,noRowsDropped:true,duplicateRows:0},null,2)+'\n');
console.log(JSON.stringify({outcome:'Worked',rows:combined.candidates.length,sources:combined.sources.length,duplicateRows:0,heldRefreshesSeparate:true}));
