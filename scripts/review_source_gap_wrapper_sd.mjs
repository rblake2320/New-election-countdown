/** Finite offline review: actual bundled helpers/catch bodies, no PostgreSQL connections. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {assertGitPinnedSourceGapRuntime} from './source_gap_runtime_pin_sd.mjs';
const head='fda521497dd5abc9c6f48e253554e3fca3d38cdf',dir='artifacts/source-gap-private-sd/runtime-repair-fda52149';
assertGitPinnedSourceGapRuntime(head);
const sha=b=>createHash('sha256').update(b).digest('hex'),checks=[];
function check(scenario,ok,details={}){checks.push({scenario,outcome:ok?'Worked':'Failed',...details});}
async function bundledImport(path){
 const physical=resolve('offline-source-review-entry.mjs'),url=pathToFileURL(physical).href;
 const code=(await build({stdin:{contents:`import {stateCoverage} from ${JSON.stringify(path)}; console.log(JSON.stringify({exportsAvailable:typeof stateCoverage==='function'})); await new Promise(resolve=>setTimeout(resolve,0));`,resolveDir:process.cwd(),sourcefile:'offline-source-review-entry.mjs'},bundle:true,platform:'node',format:'esm',packages:'external',write:false,banner:{js:`process.argv[1]=${JSON.stringify(physical)};process.argv.splice(2,process.argv.length,'--apply-owner-approved-increment');`}})).outputFiles[0].text;
 // stdin's raw [eval1] URL differs from the canonical escaped physical URL.
 // Substitute only module identity; actual compiled helper/CLI logic remains unchanged.
 const result=spawnSync(process.execPath,['--input-type=module'],{input:code.replaceAll('import.meta.url',JSON.stringify(url)),encoding:'utf8',windowsHide:true});
 return {exitCode:result.status,stdout:result.stdout,stderr:result.stderr,canonicalEntryUrl:url};
}
function catchBody(source){const start=source.lastIndexOf('}catch(error){'),end=source.lastIndexOf('}finally{');if(start<0||end<start)throw new Error('Reviewed final catch layout changed');return source.slice(start+1,end+1);}
async function recovery(source,fault){
 const receipt={},trace={retained:0,rollbackCalls:0},baseline={hash:'private-before'},owned={hash:'private-owned'};
 const context={receipt,before:baseline,first:owned,knownPost:owned,writeCommitted:true,pool:{},authorize:()=>{},privateDirectory:'unused',receiptPath:'private-offline-receipt',join,
  captureSourceSnapshot:async()=>{if(fault==='snapshot')throw new Error('PRIVATE_RECOVERY_CAPTURE_UNAVAILABLE');return fault==='foreign'?{hash:'private-foreign'}:owned;},
  savePrivateSnapshot:()=>{if(fault==='snapshot-file')throw new Error('PRIVATE_RECOVERY_FILE_UNAVAILABLE');},
  rollbackSourceRows:async()=>{trace.rollbackCalls++;throw new Error('PRIVATE_RECOVERY_ROLLBACK_UNAVAILABLE');},
  retain:()=>{trace.retained++;if(fault==='journal')throw new Error('PRIVATE_FINAL_JOURNAL_UNAVAILABLE');},
  console:{error:value=>{trace.safeError=typeof value==='string'?JSON.parse(value):value;}}};
 const execute=new Function('context','with(context){return(async()=>{try{throw new Error("PRIVATE_OPERATION_FAILURE")}'+catchBody(source)+'})();}');
 let thrown;try{await execute(context);}catch(e){thrown=e.message;}
 return {fault,trace,receipt,thrown};
}
const wrapperBytes=readFileSync('scripts/apply_reviewed_source_gap_increment.mjs'),wrapper=wrapperBytes.toString('utf8');
const old=readFileSync(dir+'/wrapper-before-recovery-barrier.mjs');
check('frozen old recovery body loses final journal when snapshot throws',(await recovery(old.toString('utf8'),'snapshot')).trace.retained===0,{oldWrapperSha256:sha(old),expected:'retained red'});
for(const fault of ['snapshot','snapshot-file','rollback','foreign']){
 const r=await recovery(wrapper,fault);
 check('actual updated catch classifies '+fault+' without false rollback ack',r.trace.retained===1&&r.receipt.outcome==='Blocked'&&r.receipt.rollbackExact!==true,r);
}
const journal=await recovery(wrapper,'journal');
check('actual final journal failure emits safeBlocked classification',journal.trace.safeError?.outcome==='Blocked'&&journal.trace.safeError?.classification==='recovery_journal_unavailable'&&journal.receipt.outcome==='Blocked',journal);
const cli=await bundledImport('./scripts/source_data_release.ts');
check('CLI-bearing helper import reproduces unintended old dispatch',cli.exitCode===1&&/INVALID_ARGUMENT/.test(cli.stderr)&&/Unknown or repeated argument/.test(cli.stderr),cli);
const pure=await bundledImport('./scripts/source_data_capture.ts');
check('pure helper import with same canonical entry and owner argument has no CLI dispatch',pure.exitCode===0&&pure.stderr===''&&JSON.parse(pure.stdout).exportsAvailable,pure);
const noArgsBuild=await build({entryPoints:['scripts/apply_reviewed_source_gap_increment.mjs'],bundle:true,platform:'node',format:'esm',packages:'external',write:false});
const noArgs=spawnSync(process.execPath,['--input-type=module'],{input:noArgsBuild.outputFiles[0].text,encoding:'utf8',windowsHide:true});
check('actual bundled wrapper without mandatory owner arguments refuses before DB/config reads',noArgs.status!==0&&/Exact reviewed owner-authorized source increment arguments required/.test(noArgs.stderr),{exitCode:noArgs.status});
const gate=readFileSync(dir+'/full-private-gate.json');
check('reviewed wrapper binds actual new owning core and24-check gate',wrapper.includes(`const core='${head}'` )&&wrapper.includes(`const gateSha='${sha(gate)}'`)&&wrapper.includes('gate.checks.length!==24')&&wrapper.includes("runtime-repair-fda52149/full-private-gate.json"));
const result={outcome:checks.every(c=>c.outcome==='Worked')?'Worked':'Failed',sourceHead:head,wrapperSha256:sha(wrapperBytes),databaseConnections:0,networkRequests:0,codeEdits:0,checks};
writeFileSync(dir+'/wrapper-review-controls.json',JSON.stringify(result,null,2)+'\n');
writeFileSync(dir+'/wrapper-reviewed.mjs',wrapperBytes);
console.log(JSON.stringify({outcome:result.outcome,checks:checks.map(c=>({scenario:c.scenario,outcome:c.outcome})),wrapperSha256:result.wrapperSha256}));if(result.outcome!=='Worked')process.exitCode=1;
