import { readFileSync, writeFileSync, cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseOfficialSourcePacket as oldParse } from './old-runtime.mjs';
import { parseOfficialSourcePacket as newParse } from '../parse_official_source_packet.mjs';
const directory=fileURLToPath(new URL('.',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const records=[];
for(const [state,folder] of [['NC','nc-manual'],['LA','la-manual']]){
  const scratch=mkdtempSync(join(tmpdir(),'sol-manual-id-same-input-'));
  cpSync(new URL(`../${folder}/raw`,import.meta.url),join(scratch,'raw'),{recursive:true});
  const oldBytes=readFileSync(new URL(`old-${state}.packet.json`,import.meta.url)),oldPath=join(scratch,'packet.json');writeFileSync(oldPath,oldBytes);
  const target=JSON.parse(readFileSync(new URL(`../${folder}/target-binding.json`,import.meta.url)));
  const old=await oldParse(oldPath,hash(oldBytes),target);if(old.input.source.id!==state)throw new Error('Old same-input negative not reproduced');
  let refusal;try{await newParse(oldPath,hash(oldBytes),target);}catch(error){refusal=error.code;}
  if(refusal!=='MANUAL_SOURCE_REFUSED')throw new Error('New source did not refuse same wrong metadata');
  const newPath=fileURLToPath(new URL(`../${folder}/packet.json`,import.meta.url));
  const current=await newParse(newPath,hash(readFileSync(newPath)),target);
  if(current.input.source.id!==`admin_manual:${state}`||current.input.totalVotes!==old.input.totalVotes||current.input.retrievedAt!==old.input.retrievedAt||JSON.stringify(current.input.candidates)!==JSON.stringify(old.input.candidates))throw new Error('Producer correction altered facts');
  records.push({state,old:{outcome:'Failed',sourceId:old.input.source.id,reason:'Accepted bare-state sourceID incompatible with actual A manualSourcePicker receiving contract'},sameInputNew:{outcome:'Worked',wrongMetadata:'Refused',code:refusal},correctedPacket:{outcome:'Worked',sourceId:current.input.source.id,totalVotes:current.input.totalVotes,retrievedAt:current.input.retrievedAt},votesNamesPartyAndCaptureUnchanged:true,oldManifestSha256:hash(oldBytes),newManifestSha256:hash(readFileSync(newPath))});
}
console.log(JSON.stringify({outcome:'Worked',oldRuntimeHead:'554cbef13bf1d48cedea41af030a60614da14846',newRuntimeHead:'696da4ac0148f7a887cd8f54d8f6858f61525adf',oldModuleSha256:hash(readFileSync(new URL('old-runtime.mjs',import.meta.url))),newModuleSha256:hash(readFileSync(new URL('../parse_official_source_packet.mjs',import.meta.url))),records,noDb:true,noNetwork:true},null,2));
