import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OfficialResultParseError } from '../server/official-result-adapters/types';
import { parseOfficialSourcePacket } from '../server/official-result-adapters/packet';
export { parseOfficialSourcePacket, loadReviewedPacketBytes, officialSourcePacketSchema } from '../server/official-result-adapters/packet';
export type { OfficialSourcePacket } from '../server/official-result-adapters/packet';
function refuse(code:string,message:string):never { throw new OfficialResultParseError(code,message); }
function boundedFile(path:string,limit:number):Buffer {
  const info=statSync(path);if(!info.isFile()||info.size<1||info.size>limit)refuse('FILE_BOUND','Target file is missing, empty or oversized');return readFileSync(path);
}
async function main(){
  try{
    const args=process.argv.slice(2),get=(flag:string)=>{const index=args.indexOf(flag);if(index<0||!args[index+1])refuse('CLI_ARGUMENT','Required '+flag+' absent');return args[index+1]??refuse('CLI_ARGUMENT','Missing argument');};
    if(args.length!==6||new Set(args.filter((_,i)=>i%2===0)).size!==3)refuse('CLI_ARGUMENT','Use --packet --sha256 --target only; no post/apply mode');
    const target=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(boundedFile(resolve(get('--target')),256*1024)));
    console.log(JSON.stringify(await parseOfficialSourcePacket(resolve(get('--packet')),get('--sha256'),target),null,2));
  }catch(error){console.log(JSON.stringify({outcome:'Refused',mode:'dry_run_only',code:error instanceof OfficialResultParseError?error.code:'INVALID_INPUT',message:error instanceof Error?error.message:'Invalid input'},null,2));process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
