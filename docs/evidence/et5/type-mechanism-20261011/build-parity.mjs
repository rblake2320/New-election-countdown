import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const candidate=readFileSync('tsconfig.json');
const baseline=readFileSync('/review/test-results/baseline-tsconfig.json');
const candidateBuilder=readFileSync('scripts/build-server.mjs');
const baselineBuilder=readFileSync('/review/test-results/baseline-build-server.mjs');
const result={};
function files(dir){return readdirSync(dir).flatMap(name=>{const path=dir+'/'+name;return statSync(path).isDirectory()?files(path):[path]})}
try{
  for(const [name,config] of [['baseline',baseline],['strong',candidate]]){
    writeFileSync('tsconfig.json',config);
    writeFileSync('scripts/build-server.mjs',name==='baseline'?baselineBuilder:candidateBuilder);
    const run=spawnSync('npm',['run','build'],{encoding:'utf8'});
    if(run.status!==0)throw Error(name+' build failed: '+run.stderr+run.stdout);
    result[name]=Object.fromEntries(files('dist').sort().map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
  }
  result.differences=[...new Set([...Object.keys(result.baseline),...Object.keys(result.strong)])].filter(file=>result.baseline[file]!==result.strong[file]);
  console.log(JSON.stringify(result,null,2));
  assert.equal(result.differences.length,0,'Compiler repair changed emitted build bytes');
}finally{writeFileSync('tsconfig.json',candidate);writeFileSync('scripts/build-server.mjs',candidateBuilder)}
