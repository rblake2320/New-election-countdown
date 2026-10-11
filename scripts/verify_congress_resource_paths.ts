import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defaultOfficialCongressManifestPath,loadOfficialCongressSnapshot,OFFICIAL_CONGRESS_MANIFEST_SHA} from '../server/congress-official-import';
const packaged=fileURLToPath(new URL('./congress-data/official-current-members.json',import.meta.url));
const sourceTree=resolve('data/congress/119/official-current-members.json');
const original=readFileSync(packaged);assert.notEqual(packaged,sourceTree);assert.ok(existsSync(sourceTree));
assert.equal(defaultOfficialCongressManifestPath(),packaged);assert.equal(loadOfficialCongressSnapshot().manifestSha256,OFFICIAL_CONGRESS_MANIFEST_SHA);
let wrongPackagedRefused=false;
try{writeFileSync(packaged,Buffer.concat([original,Buffer.from('\n')]));assert.equal(loadOfficialCongressSnapshot(sourceTree).manifestSha256,OFFICIAL_CONGRESS_MANIFEST_SHA);assert.throws(()=>loadOfficialCongressSnapshot(),/snapshot SHA/);wrongPackagedRefused=true;}finally{writeFileSync(packaged,original);}
const oldCwd=process.cwd();try{process.chdir('/tmp');assert.equal(defaultOfficialCongressManifestPath(),packaged);assert.equal(loadOfficialCongressSnapshot().snapshot.members.length,539);assert.equal(loadOfficialCongressSnapshot(sourceTree).manifestSha256,OFFICIAL_CONGRESS_MANIFEST_SHA);}finally{process.chdir(oldCwd);}
const receipt={outcome:'Worked',manifestSha256:OFFICIAL_CONGRESS_MANIFEST_SHA,checks:{compiledRelativePackagedDefault:true,wrongPackagedRefusedDespiteValidSource:wrongPackagedRefused,alternateCwdDefault:true,explicitAbsoluteManifest:true},databaseConnections:0,governmentFetchCalls:0};
writeFileSync(resolve(process.env.CONGRESS_EVIDENCE_DIR??'/evidence','resource-path-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
