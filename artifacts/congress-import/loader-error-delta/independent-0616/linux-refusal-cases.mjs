import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync('/tmp/sol-congress-refusal-');fs.chmodSync(dir,0o755);
fs.mkdirSync(dir+'/dist/congress-data',{recursive:true});fs.mkdirSync(dir+'/data/congress/119',{recursive:true});
fs.copyFileSync('/review/dist/probe.mjs',dir+'/dist/probe.mjs');
fs.copyFileSync('/review/snapshot/data/congress/119/official-current-members.json',dir+'/dist/congress-data/official-current-members.json');
fs.copyFileSync('/review/snapshot/data/congress/119/official-current-members.json',dir+'/data/congress/119/official-current-members.json');
const checks=[];
function probe(expectedCode){
  const expression=`const fs=await import('node:fs');const m=await import('${dir}/dist/probe.mjs');let directError=null;try{fs.readFileSync('${dir}/dist/congress-data/official-current-members.json');}catch(e){directError=e.code;}let actual;try{actual={loaded:true,manifestSha256:m.loadOfficialCongressSnapshot().manifestSha256,path:m.defaultOfficialCongressManifestPath()};}catch(e){actual={loaded:false,errorCode:e.code};}console.log(JSON.stringify({directError,packagedExists:fs.existsSync('${dir}/dist/congress-data/official-current-members.json'),actual}));`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',expression],{uid:1001,gid:1001,encoding:'utf8'});if(run.status!==0)throw Error(run.stderr);
  const result=JSON.parse(run.stdout);checks.push({scenario:expectedCode+' refuses without fallback',uid:1001,...result,outcome:result.directError===expectedCode&&!result.actual.loaded&&result.actual.errorCode===expectedCode?'Worked':'Failed'});
}
fs.chmodSync(dir+'/dist/congress-data',0o000);try{probe('EACCES');}finally{fs.chmodSync(dir+'/dist/congress-data',0o755);}
fs.renameSync(dir+'/dist/congress-data',dir+'/dist/congress-data-held');fs.writeFileSync(dir+'/dist/congress-data','not a directory',{flag:'wx'});probe('ENOTDIR');
console.log(JSON.stringify({head:JSON.parse(fs.readFileSync('/review/source-receipt.json','utf8')).head,outcome:checks.every(c=>c.outcome==='Worked')?'Worked':'Failed',checks,databaseConnections:0,providerFetchCalls:0,network:'none'}));
