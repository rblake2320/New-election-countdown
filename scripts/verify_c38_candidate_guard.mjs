import {build} from 'esbuild';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
const mode=process.argv[2]??'current';if(!['old','current'].includes(mode))throw new Error('Use old/current');
const folder=resolve('artifacts/c38-guard');mkdirSync(folder,{recursive:true});
const file=resolve('server/services/event-processor-service.ts'),oldHead='626f02d11d1503a9b498ef3005425c251c09e0ae';
const old=mode==='old'?execFileSync('git',['show',oldHead+':server/services/event-processor-service.ts'],{encoding:'utf8'}):null;
const output=resolve(folder,`compiled-${mode}.mjs`),receipt=resolve(process.argv[3]??`artifacts/c38-guard/${mode}-${Date.now()}.json`);
const harness=`
import{EventProcessorService}from'./server/services/event-processor-service.ts';
import{writeFileSync}from'node:fs';
const alerts=globalThis.__guardAlerts,rows=[];
const election={id:1,title:'Isolated guard receiver',date:new Date('2026-11-03T00:00:00Z'),state:'CA',type:'general',level:'state'};
const event={candidateId:7,electionId:1,eventType:'position_change',updateType:'minor',importance:1,verified:true};
for(const [name,electionId] of [['foreign',999],['null',null],['missing',undefined],['valid',1]]){
 alerts.length=0;const service=new EventProcessorService();let code=null;
 try{await service.processCandidateEvent({id:7,name:'Isolated subject',party:'I',electionId},election,event);}catch(error){code=error.code??null;}
 const alertCalls=alerts.length,queueSize=service.getProcessingStats().queueSize;
 const okay=name==='valid'?alertCalls===1&&queueSize===1:code==='INVALID_EVENT_CONTEXT'&&alertCalls===0&&queueSize===0;
 rows.push({scenario:name,storedCandidateElectionId:electionId??null,missingField:name==='missing',outcome:okay?'Worked':'Failed',code,alertCalls,queueSize});
}
const result={mode:${JSON.stringify(mode)},oldHead:${JSON.stringify(oldHead)},execution:'Actual bundled event processor; only timer/alert boundary fixtures; no DB or message delivery',rows};
writeFileSync(process.argv[2],JSON.stringify(result,null,2)+String.fromCharCode(10),{flag:'wx'});console.log(JSON.stringify(result));
if(${JSON.stringify(mode)}==='current'&&rows.some(row=>row.outcome==='Failed'))process.exitCode=1;
`;
await build({stdin:{contents:harness,resolveDir:process.cwd(),sourcefile:'c38-guard-harness.ts'},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',target:'node24',banner:{js:'globalThis.__guardAlerts=[];globalThis.setInterval=()=>({unref(){}});'},plugins:[{name:'alert-boundary-only',setup(b){
 b.onResolve({filter:/^\.\/alert-engine-service$/},()=>({path:'alerts',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const alertEngineService={processEvent:async(...args)=>{globalThis.__guardAlerts.push(args);return undefined;}};',loader:'js'}));
 if(mode==='old')b.onLoad({filter:/event-processor-service\.ts$/},args=>args.path===file?{contents:old,loader:'ts',resolveDir:resolve(file,'..')}:undefined);
}}]});
const child=spawnSync(process.execPath,[output,receipt],{stdio:'inherit'});if(child.error)throw child.error;process.exitCode=child.status??1;
