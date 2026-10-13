import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const pins={
  "72f7e8e6e5ac3fb93a7d31993c094565c1de1310": {
    "server/louisiana-house-catalog.ts": "7e5d41d86c243753ab4bc981632a014904a0eb2fad1655d48adbe9d6936acd92",
    "server/fec-candidate-sync.ts": "d4e754bc562a4ee38b543497b4033d096f1216e4da86890b56d7e8ce928d64b0",
    "server/candidate-nominee-sync.ts": "d8e4c09b3cc7ce12c4e4853c3ff1f992a621dde101c32e9811f538edadd1d5b6",
    "server/official-results-error.ts": "9161ab112462e8d8a0ae14b2dc230e65d9b0f9d504fa61e5a77640e66477c2bf",
    "shared/official-results.ts": "a0329d592679740738f81e8165e616f5f4dee4ffca8aa3cccd149d1ee64722c0",
    "server/official-results-manifest.ts": "76015fdb495e604cf616a56fb045cb392166e25682d2f986b56fb0224a5848f0",
    "scripts/source_data_rollback.ts": "6a458aaf5450b55733034ec13072294f312d68acbf51812e715facdbef17f17c"
  },
  "9e10c4cf472a860489e97eb6f18f023abba1378f": {
    "server/louisiana-house-catalog.ts": "7e5d41d86c243753ab4bc981632a014904a0eb2fad1655d48adbe9d6936acd92",
    "server/fec-candidate-sync.ts": "d4e754bc562a4ee38b543497b4033d096f1216e4da86890b56d7e8ce928d64b0",
    "server/candidate-nominee-sync.ts": "e6a0c2c5ff822bc30e4a9e29cd3ba9dae6464c2f981cfc11d19b14f29639ae12",
    "server/official-results-error.ts": "9161ab112462e8d8a0ae14b2dc230e65d9b0f9d504fa61e5a77640e66477c2bf",
    "shared/official-results.ts": "a0329d592679740738f81e8165e616f5f4dee4ffca8aa3cccd149d1ee64722c0",
    "server/official-results-manifest.ts": "76015fdb495e604cf616a56fb045cb392166e25682d2f986b56fb0224a5848f0",
    "scripts/source_data_rollback.ts": "6a458aaf5450b55733034ec13072294f312d68acbf51812e715facdbef17f17c"
  }
};
export function assertSourceGapRuntime(head, root=process.cwd()){
 const files=pins[head];if(!files)throw new Error('Unreviewed runtime head');
 for(const [path,expected] of Object.entries(files)){
  const normalized=readFileSync(resolve(root,path),'utf8').replace(/\r\n/g,'\n');
  if(createHash('sha256').update(normalized).digest('hex')!==expected)throw new Error('Runtime source pin differs: '+path);
 }
 return {outcome:'Worked',runtimeHead:head,modules:Object.keys(files).length};
}
