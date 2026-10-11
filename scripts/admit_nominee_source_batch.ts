/** Admit reviewed extractor output only; never fetch or write a database. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { parseNomineeManifest } from '../server/candidate-nominee-sync';
import { normalizedCandidateName } from '../server/fec-candidate-sync';
const paths=process.argv.slice(2);if(!paths.length)throw new Error('Pass reviewed per-state extractor manifests');
mkdirSync('data/nominees',{recursive:true});mkdirSync('artifacts/lane-c/sources',{recursive:true});
const hash=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
for(const path of paths){
 const bytes=readFileSync(path),input=JSON.parse(bytes.toString('utf8'));
 const states=new Set(input.sources.map((s:{state:string})=>s.state));if(states.size!==1)throw new Error('Admit one state per file');
 const state=Array.from(states)[0] as string;
 const normalizations=[];
 if(state==='MA'){
  const proof=JSON.parse(readFileSync('artifacts/lane-c/sources/ma-secondary-identity-primary.json','utf8'));
  for(const row of input.candidates.filter((r:{office:string})=>r.office==='G')){
   if(!proof.rows.some((p:{text:string})=>p.text.includes(row.name)))throw new Error('Governor full identity lacks the reviewed supporting record');
   row.identityEvidence={url:proof.url,sha256:proof.sha256,title:'Massachusetts official 2026 primary results (name identity only)'};
   normalizations.push({name:row.name,ballotName:row.ballotName??null,identityEvidence:row.identityEvidence,nominationInferredFromPrimary:false});
  }
 }
 if(state==='WY'){
  const proof=JSON.parse(readFileSync('artifacts/lane-c/sources/wy-party-cross-document-proof.json','utf8'));
  for(const row of input.candidates){
   const pair=proof.pairs.find((p:{candidate:string,office:string,district:string,csvRawParty:string})=>normalizedCandidateName(p.candidate)===normalizedCandidateName(row.name)&&p.office===row.office&&p.district===row.district&&p.csvRawParty===row.partyRaw);
   if(!pair)continue;
   const value=({Libertarian:'L',Constitution:'CON'} as Record<string,string>)[pair.pdfExplicitParty];if(!value)throw new Error('Unreviewed secondary party label');
   row.partyValue=value;row.partyEvidence={url:proof.companionPDF.url,sha256:proof.companionPDF.sha256,sourcePage:proof.companionPDF.sourcePage,title:'Wyoming Secretary of State general-election candidate list (PDF)'};
   normalizations.push({name:row.name,partyRaw:row.partyRaw,partyValue:value,evidence:row.partyEvidence});
  }
 }
 const manifest=parseNomineeManifest(input),output=JSON.stringify(manifest,null,2),file=`data/nominees/${state.toLowerCase()}-2026-general.json`;
 writeFileSync(file,output);
 const receipt={outcome:'worked',state,reviewedExtractor:basename(path),inputSha256:hash(bytes),outputSha256:hash(output),sourceRows:manifest.candidates.length,sources:manifest.sources.length,normalizations,dbWrites:false};
 writeFileSync(`artifacts/lane-c/sources/${state.toLowerCase()}-source-admission.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}
