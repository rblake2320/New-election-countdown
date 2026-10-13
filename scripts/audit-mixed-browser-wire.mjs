import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {verifyBrowserWire} from './verify-browser-wire.mjs';
const root=resolve(process.argv[2]??'');
if(!process.argv[2])throw Error('Pass retained mixed-browser evidence directory');
const log=(await readFile(resolve(root,'wire-app-timestamped.log'),'utf8')).replace(/^\uFEFF/,'');
const results=[];
for(const width of [1280,390]){
 const execution=JSON.parse(await readFile(resolve(root,`mixed-${width}/controller-execution.json`),'utf8'));
 const controller=JSON.parse(execution.stdout.trim().split(/\r?\n/).at(-1));
 if(execution.exit!==0||controller.outcome!=='Worked')throw Error('Controller failed');
 for(const engine of ['firefox','webkit']){
  const path=resolve(root,`mixed-${width}/${engine}`);
  const polls=JSON.parse(await readFile(resolve(path,'requests.json'),'utf8')).resultPolls;
  const timeline=JSON.parse(await readFile(resolve(path,'timeline.json'),'utf8'));
  const result=verifyBrowserWire(polls,timeline,log,controller,{engine,width});
  await writeFile(resolve(path,'wire-strict-verification.json'),JSON.stringify(result,null,2)+'\n');
  results.push({engine,width,outcome:result.outcome,wire304Count:result.wire304Count,changed200Count:result.changed200Count});
 }
}
await writeFile(resolve(root,'wire-strict-summary.json'),JSON.stringify({outcome:'Worked',results},null,2)+'\n');
console.log(JSON.stringify(results));
