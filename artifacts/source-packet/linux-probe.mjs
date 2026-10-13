import { readFileSync, mkdirSync, cpSync, writeFileSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseOfficialSourcePacket } from './parse_official_source_packet.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
process.chdir('/scratch');
const cases=[];
for(const [folder,name,total] of [['wa','initial.packet.json',1903073],['wa','recount.packet.json',1903115],['wa-senate','packet.json',1948716],['ca','packet.json',9262468],['nc-manual','packet.json',827755],['nc-house-manual','packet.json',67376],['la-manual','packet.json',196212]]){
  const path=`/packet/${folder}/${name}`,target=JSON.parse(readFileSync(`/packet/${folder}/target-binding.json`));
  const receipt=await parseOfficialSourcePacket(path,hash(readFileSync(path)),target);
  if(receipt.input.totalVotes!==total)throw new Error('Wrong actual portable count');
  cases.push({folder,name,outcome:'Worked',totalVotes:receipt.input.totalVotes,status:receipt.input.status,sourceKind:receipt.input.source.kind,sourceContestId:receipt.input.source.sourceContestId});
}
cpSync('/packet/wa','/scratch/hostile',{recursive:true});mkdirSync('/scratch/outside');
cpSync('/packet/wa/raw/wa-2024-recount-all-candidates.xlsx','/scratch/outside/payload.xlsx');
symlinkSync('/scratch/outside','/scratch/hostile/link','dir');
const packet=JSON.parse(readFileSync('/scratch/hostile/initial.packet.json'));packet.files.find(file=>file.role==='payload').path='link/payload.xlsx';
const bytes=Buffer.from(JSON.stringify(packet));writeFileSync('/scratch/hostile/initial.packet.json',bytes);
let refused=false;try{await parseOfficialSourcePacket('/scratch/hostile/initial.packet.json',hash(bytes),packet.targetBinding);}catch(error){if(error.code!=='PATH_REFUSED')throw error;refused=true;}
if(!refused)throw new Error('Linux symlink escape accepted');
console.log(JSON.stringify({outcome:'Worked',platform:process.platform,node:process.version,compiledModuleSha256:hash(readFileSync('/packet/parse_official_source_packet.mjs')),actualPositiveCases:cases,actualPosixSymlinkEscape:'Refused',network:'none',filesystem:'read-only input + bounded tmpfs',noDb:true},null,2));
