
import { build } from 'esbuild';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const base=resolve('artifacts/candidate-receiving');
const stubs={
 'google-civic-service':"export function getGoogleCivicService(){return null}",
 'congress-bill-service':"export function getCongressBillService(){return null}",
 'perplexity-service':"export function getPerplexityService(){return null}",
 'census-service':"export const censusService={}",
 'civic-aggregator-service':"export const civicAggregatorService={async getComprehensiveCandidateData(){globalThis.__providerBoundaryCalls=(globalThis.__providerBoundaryCalls||0)+1;return []}}",
 'votesmart-service':"export const voteSmartService=null",
 'background-work':"export class BackgroundWork {run(){return Promise.resolve()} every(){return ()=>{}} async stop(){}}",
};
for(const label of ['before','after']){
 const frozen=resolve(base,'snapshots',label);
 const entry=resolve(base,'entry-'+label+'.ts');
 writeFileSync(entry,
  "import express from 'express';import {electionsRouter} from './snapshots/"+label+"/server/routes/elections';"+
  "import {storageFactory} from './snapshots/"+label+"/server/storage-factory';"+
  "import {pool} from './snapshots/"+label+"/server/db';"+
  "import {apiLimiter} from './snapshots/"+label+"/server/security-middleware';"+
  "import {generalCandidateListHandler} from './snapshots/c/server/general-candidate-list';"+
  "import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';"+
  "import {createHash} from 'node:crypto';"+
  "const target=new URL(process.env.DATABASE_URL||'http://absent');assert(process.env.FEC_FIRST_PRIVATE_TEST==='1'&&target.hostname==='127.0.0.1'&&target.port==='5571'&&target.pathname==='/et_sol_fec_first','Dedicated receiving target only');"+
  "globalThis.__providerBoundaryCalls=0;await storageFactory.forceHealthCheck();assert.equal(storageFactory.getHealthStatus().currentStorageType,'database');"+
  "let queryCount=0;const originalQuery=pool.query.bind(pool);pool.query=(...args)=>{queryCount++;return originalQuery(...args)};"+
  "const app=express();app.get('/__review/state',(_req,res)=>res.json({queryCount,providerBoundaryCalls:globalThis.__providerBoundaryCalls||0,externalProviderCalls:0,storageMode:storageFactory.getHealthStatus().currentStorageType}));app.use('/api',apiLimiter);app.get('/api/elections/:id/general-candidates',generalCandidateListHandler(pool));app.use('/api/elections',electionsRouter);"+
  "const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));"+
  "writeFileSync(process.env.RECEIVING_READY_FILE,JSON.stringify({port:server.address().port,mode:storageFactory.getHealthStatus().currentStorageType,boundary:'actual router/factory/DatabaseStorage/Drizzle/PostgreSQL; provider empty responses and scheduled background disabled',phase:process.env.RECEIVING_PHASE,head:'"+label+"'}));"+
  "process.on('SIGTERM',async()=>{await new Promise(r=>server.close(r));await pool.end();process.exit(0)});");
 await build({entryPoints:[entry],outfile:resolve(base,'compiled-'+label+'.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'warning',
  plugins:[{name:'explicit-receiving-boundaries',setup(plugin){
   plugin.onResolve({filter:/.*/},args=>{
    if(args.path==='@shared/schema')return {path:resolve(frozen,'shared/schema.ts')};
    const name=args.path.replace(/^.*\//,'').replace(/\.js$/,'');
    if(Object.hasOwn(stubs,name))return {path:name,namespace:'boundary'};
   });
   plugin.onLoad({filter:/.*/,namespace:'boundary'},args=>({contents:stubs[args.path],loader:'js'}));
  }}]});
}
console.log('Compiled immutable before/after routers with real storage/factory/database; provider/background boundaries explicit');
