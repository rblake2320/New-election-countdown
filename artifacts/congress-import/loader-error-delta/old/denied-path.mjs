import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync('/tmp/sol-congress-denied-');fs.chmodSync(dir,0o755);
fs.mkdirSync(dir+'/dist/congress-data',{recursive:true});fs.mkdirSync(dir+'/data/congress/119',{recursive:true});
fs.copyFileSync('/review/dist/probe.mjs',dir+'/dist/probe.mjs');
fs.copyFileSync('/review/snapshot/data/congress/119/official-current-members.json',dir+'/dist/congress-data/official-current-members.json');
fs.copyFileSync('/review/snapshot/data/congress/119/official-current-members.json',dir+'/data/congress/119/official-current-members.json');
fs.chmodSync(dir+'/dist/congress-data',0o000);
const expression=`import('${dir}/dist/probe.mjs').then(m=>{let result;try{result={loaded:true,manifestSha256:m.loadOfficialCongressSnapshot().manifestSha256,path:m.defaultOfficialCongressManifestPath()};}catch(e){result={loaded:false,errorCode:e.code,message:e.message};}console.log(JSON.stringify(result));})`;
try{const run=spawnSync(process.execPath,['--input-type=module','-e',expression],{uid:1001,gid:1001,encoding:'utf8'});const actual=JSON.parse(run.stdout);console.log(JSON.stringify({head:'95ceff263691cc6c7da8753c32087725f1f0b207',scenario:'packaged directory exists but search permission denied; valid source fallback exists',uid:1001,actual,outcome:actual.loaded?'Failed':'Worked',expected:'EACCES refusal; no fallback except absent packaged asset',databaseConnections:0,providerFetchCalls:0}));}finally{fs.chmodSync(dir+'/dist/congress-data',0o755);}
