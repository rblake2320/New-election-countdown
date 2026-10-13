import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {verifyBrowserWire} from './verify-browser-wire.mjs';
const fixture=new URL('../tests/fixtures/browser-wire/mixed-155624-654a31f1.json',import.meta.url);
export function loadReplay(){
 const bytes=readFileSync(fixture);
 if(createHash('sha256').update(bytes).digest('hex')!=='213871a8c1360ea58e54cd16916b5f253826bfd34c069cdd50365d55f8a6e4d6')throw Error('Replay fixture byte hash mismatch');
 return JSON.parse(bytes);
}
export function auditReplay(){
 const replay=loadReplay();
 const results=[];
 for(const engine of ['firefox','webkit'])for(const width of [1280,390]){
  const matches=replay.packets.filter(p=>p.expected.engine===engine&&p.expected.width===width);
  if(matches.length!==1)throw Error('Exactly one replay per engine/width required');
  const p=matches[0];
  const result=verifyBrowserWire(p.polls,p.timeline,replay.wireLog,p.controller,{engine,width});
  results.push({engine,width,outcome:result.outcome,wire304Count:result.wire304Count,changed200Count:result.changed200Count});
 }
 return {outcome:'Worked',runId:replay.runId,results};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(auditReplay(),null,2));
