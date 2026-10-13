import { build } from 'esbuild';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
const mode=process.argv[2]??'current';if(!['old','current'].includes(mode))throw new Error('Use old or current');
const folder=resolve('artifacts/position-provenance');mkdirSync(folder,{recursive:true});
const file=resolve('server/position-aggregator-service.ts');
const oldHead='8c0f45af0490e0b0a341bce2b97c8878d420bb71';
const old=mode==='old'?execFileSync('git',['show',oldHead+':server/position-aggregator-service.ts'],{encoding:'utf8'}):null;
const compiled=resolve(folder,`compiled-${mode}.mjs`),receipt=resolve(process.argv[3]??`artifacts/position-provenance/compiled-${mode}-${Date.now()}.json`);
const harness=`
import {PositionAggregatorService} from './server/position-aggregator-service.ts';
import {readFileSync,writeFileSync} from 'node:fs';
const state=globalThis.__positionFixture,source=JSON.parse(readFileSync('tests/fixtures/c38/actual-statement-proof.json','utf8'));
const checks=[];
async function check(scenario,fn){try{if(!(await fn()))throw new Error('Expected behavior absent');checks.push({scenario,outcome:'Worked'});}catch(error){checks.push({scenario,outcome:'Failed',reason:error.message});}}
async function sourceRecord(){const service=new PositionAggregatorService(),getter=Reflect.get(service,'getCandidatePortalPosition');return typeof getter==='function'?await Reflect.apply(getter,service,[1,'Healthcare']):(await service.aggregatePositionsForCandidate(1))[0]?.positions[0];}
state.rows=[{id:1,candidateId:1,category:'Healthcare',position:source.retainedExactExcerpt,isVerified:true,sourceUrl:source.sourceUrl,lastUpdated:null,createdAt:null}];
const observed=await sourceRecord();
await check('Real retained source words remain unchanged',async()=>observed.position===source.retainedExactExcerpt);
await check('No95percent source confidence invented',async()=>observed.confidence===null);
await check('Missing recorded date remains null, not parsing clock',async()=>observed.dateRecorded===null);
state.rows=[];
await check('Successful empty verified source is empty',async()=>(await new PositionAggregatorService().aggregatePositionsForCandidate(1)).length===0);
state.outage=true;
await check('Source failure is typed unavailable rather than empty',async()=>{try{await sourceRecord();return false;}catch(error){return error.code==='POSITION_SOURCE_UNAVAILABLE';}});
state.outage=false;
await check('Unsupported aggregated writer refuses before claiming persistence',async()=>{try{await new PositionAggregatorService().updateCandidatePositions(1);return false;}catch(error){return error.code==='AGGREGATED_POSITION_WRITER_UNAVAILABLE';}});
if(${JSON.stringify(mode)}==='current'){
 state.cached=[{candidateId:1,candidateName:'Source-bound receiver fixture',category:'Healthcare',confidence:0.95,aggregatedPosition:source.retainedExactExcerpt,positions:[{source:'candidate_upload',confidence:0.95,position:source.retainedExactExcerpt,dateRecorded:new Date()}]}];
 await check('Stale schema-valid legacy cache cannot re-publish revoked statement',async()=>(await new PositionAggregatorService().aggregatePositionsForCandidate(1)).length===0&&state.cacheReads===0);
 await check('Missing external provider adapter is explicit unavailable',async()=>new PositionAggregatorService().getSourceAvailability().votingRecord.code==='ADAPTER_NOT_CONFIGURED');
}
const result={mode:${JSON.stringify(mode)},oldHead:${JSON.stringify(oldHead)},boundaries:'Actual bundled source modules with DB/cache fixtures; no real PG/source-provider/cache-delivery claim',networkCalls:state.networkCalls,checks,observedSourceRecord:observed};
writeFileSync(process.argv[2],JSON.stringify(result,null,2)+String.fromCharCode(10),{flag:'wx'});console.log(JSON.stringify(result));
if(state.networkCalls||(${JSON.stringify(mode)}==='current'&&checks.some(x=>x.outcome==='Failed')))process.exitCode=1;
`;
const db=`import {candidates} from '@shared/schema';const state=globalThis.__positionFixture;export const db={select(){if(state.outage)throw new Error('isolated DB outage');let identity=false;const q={from(table){identity=table===candidates;return q},where(){return q},orderBy(){return q},limit(){return Promise.resolve(identity?[{id:1,name:'Source-bound receiver fixture'}]:state.rows)},then(ok,no){return Promise.resolve(state.rows).then(ok,no)}};return q;}};`;
await build({stdin:{contents:harness,resolveDir:process.cwd(),sourcefile:'position-provenance-harness.ts'},outfile:compiled,bundle:true,platform:'node',format:'esm',packages:'external',target:'node24',
 banner:{js:`globalThis.__positionFixture={rows:[],outage:false,cached:null,cacheReads:0,networkCalls:0};globalThis.fetch=async()=>{globalThis.__positionFixture.networkCalls++;throw new Error('NETWORK_FORBIDDEN')};process.env.PROPUBLICA_API_KEY='';process.env.OPENSECRETS_API_KEY='';`},
 plugins:[{name:'explicit-db-cache-boundaries',setup(b){
  b.onResolve({filter:/^\.\/(db|cache-service)$/},args=>({path:args.path.slice(2),namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='db'?db:`const s=globalThis.__positionFixture;export const cacheService={get:async()=>{s.cacheReads++;return s.cached},set:async()=>{}};`,loader:'js',resolveDir:process.cwd()}));
  if(mode==='old')b.onLoad({filter:/position-aggregator-service\.ts$/},args=>args.path===file?{contents:old,loader:'ts',resolveDir:resolve(file,'..')}:undefined);
 }}]});
const run=spawnSync(process.execPath,[compiled,receipt],{stdio:'inherit'});if(run.error)throw run.error;process.exitCode=run.status??1;
