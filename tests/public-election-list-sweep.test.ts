/** Execute the actual listing route bodies and receiving route order. Synthetic boundary data only. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const h = vi.hoisted(() => ({ error: true, rows: [] as any[] }));
vi.mock('../server/storage', () => ({ storage: {
  getElections: async () => h.error ? [] : h.rows,
  getElectionsStrict: async () => { if(h.error) throw new Error('private database detail'); return h.rows; },
  getElectionStats: async () => ({ total: h.rows.length, byType: { General: h.rows.length } }),
  getCandidatesByElection: async () => [],
} }));
vi.mock('../server/db', () => ({ db: {}, pool: {} }));
vi.mock('../server/civic-aggregator-service', () => ({ civicAggregatorService: {} }));
vi.mock('../server/services/votesmart-service', () => ({ voteSmartService: null }));
import { electionsRouter } from '../server/routes/elections';
import { storage } from '../server/storage';
import { sendElectionListingUnavailable } from '../server/election-list-handler';
const source=readFileSync('server/routes.ts','utf8');
function registration(start:string,end:string){const at=source.indexOf(start);const text=source.slice(at,source.indexOf('\n  });',at)+8);return execFileSync(process.execPath,['--input-type=module','-e',"import {transformSync} from 'esbuild'; import {readFileSync} from 'node:fs'; process.stdout.write(transformSync(readFileSync(0,'utf8'),{loader:'ts',format:'cjs'}).code);"],{input:text,encoding:'utf8'});}
function app(){
 const a=express();
 const search=()=>new Function('app','storage','perplexityCongressService','sendElectionListingUnavailable',registration('  // Enhanced election search with AI','  // Election verification endpoint with AI validation'))(a,storage,{},sendElectionListingUnavailable);
 const searchBeforeRouter=source.indexOf('  // Enhanced election search with AI')<source.indexOf('app.use("/api/elections", electionDegradedModeHandler, electionsRouter)');
 if(searchBeforeRouter)search();
 a.use('/api/elections',electionsRouter);
 if(!searchBeforeRouter)search();
 new Function('app','storage','mapQuestService','sendElectionListingUnavailable',registration('  app.get("/api/elections-by-location"','  // Congress API endpoints from your list'))(a,storage,{geocodeAddress:async()=>({state:'CO',city:'Denver',county:'Denver'})},sendElectionListingUnavailable);
 return a;
}
beforeEach(()=>{h.error=true;h.rows=[];});
describe('equivalent public election listing routes',()=>{
 for(const path of ['/api/elections/counts','/api/elections/missing-candidates','/api/elections/search?query=Colorado','/api/elections-by-location?address=Denver']){
  it(path+' refuses outages with typed503',async()=>{const r=await request(app()).get(path);expect([r.status,r.body.code]).toEqual([503,'listing_unavailable']);expect(JSON.stringify(r.body)).not.toContain('private database detail');});
 }
 it('reserved search validates missing query before storage',async()=>{expect((await request(app()).get('/api/elections/search')).status).toBe(400);});
 it('healthy empty listings preserve their intended response shapes',async()=>{
  h.error=false;
  expect((await request(app()).get('/api/elections/counts')).body).toEqual({total:0,upcoming:0,past:0,byType:{Primary:0,General:0,Special:0}});
  expect((await request(app()).get('/api/elections/missing-candidates')).body).toEqual({window_days:60,missing:[]});
  expect((await request(app()).get('/api/elections/search?query=x')).body).toEqual({elections:[],aiEnhancement:null,totalResults:0});
  const r=await request(app()).get('/api/elections-by-location?address=Denver');expect(r.status).toBe(200);expect(r.body.elections).toEqual([]);
 });
});
