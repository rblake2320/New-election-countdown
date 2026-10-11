import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import * as importer from './dist/probe.mjs';
const own=fileURLToPath(new URL('.',import.meta.url));const packaged=join(own,'dist/congress-data/official-current-members.json'),fallback=join(own,'data/congress/119/official-current-members.json');
const bytes=await fs.readFile(own+'snapshot/data/congress/119/official-current-members.json');
await fs.mkdir(own+'dist/congress-data',{recursive:true});await fs.mkdir(own+'data/congress/119',{recursive:true});await fs.writeFile(packaged,bytes);await fs.writeFile(fallback,bytes);
const checks=[];async function check(name,fn){try{await fn();checks.push({name,outcome:'Worked'});}catch(e){checks.push({name,outcome:'Failed',error:e.stack});process.exitCode=1;}}
await check('compiled packaged default',()=>{assert.equal(importer.defaultOfficialCongressManifestPath(),packaged);assert.equal(importer.loadOfficialCongressSnapshot().manifestSha256,importer.OFFICIAL_CONGRESS_MANIFEST_SHA);});
await check('bad packaged SHA refuses despite valid source fallback',async()=>{await fs.writeFile(packaged,Buffer.concat([bytes,Buffer.from('\n')]));try{assert.throws(()=>importer.loadOfficialCongressSnapshot(),/snapshot SHA/);assert.equal(importer.loadOfficialCongressSnapshot(fallback).manifestSha256,importer.OFFICIAL_CONGRESS_MANIFEST_SHA);}finally{await fs.writeFile(packaged,bytes);}});
await check('alternate cwd independent',()=>{const previous=process.cwd();try{process.chdir(own+'snapshot');assert.equal(importer.defaultOfficialCongressManifestPath(),packaged);assert.equal(importer.loadOfficialCongressSnapshot().snapshot.members.length,539);}finally{process.chdir(previous);}});
await check('explicit absolute manifest retained',()=>{assert.equal(importer.loadOfficialCongressSnapshot(fallback).manifestSha256,importer.OFFICIAL_CONGRESS_MANIFEST_SHA);});
await check('packaged ENOENT uses module-relative source fallback',async()=>{await fs.unlink(packaged);try{assert.equal(importer.defaultOfficialCongressManifestPath(),fallback);assert.equal(importer.loadOfficialCongressSnapshot().snapshot.members.length,539);}finally{await fs.writeFile(packaged,bytes);}});
await check('both resource paths absent refuses rather than count success',async()=>{await fs.unlink(packaged);await fs.unlink(fallback);try{assert.throws(()=>importer.loadOfficialCongressSnapshot(),e=>e.code==='ENOENT');}finally{await fs.writeFile(packaged,bytes);await fs.writeFile(fallback,bytes);}});
const report={head:'0616a699b00be0bde009550ab2eac048ebdd7539',outcome:checks.every(c=>c.outcome==='Worked')?'Worked':'Failed',checks,databaseConnections:0,providerFetchCalls:0};await fs.writeFile(own+'path-review-receipt.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
