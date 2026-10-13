/** Execute the actual listing route bodies and receiving route order. Synthetic boundary data only. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const h = vi.hoisted(() => ({ error: true, rows: [] as any[], strictReads:0, candidateReads:0 }));
vi.mock('../server/storage', () => ({ storage: {
  getElections: async () => h.error ? [] : h.rows,
  getElectionsStrict: async () => { h.strictReads++; if(h.error) throw new Error('private database detail'); return h.rows; },
  getElectionStats: async () => ({ total: h.rows.length, byType: { General: h.rows.length } }),
  getCandidatesByElection: async () => {h.candidateReads++;return [];},
} }));
vi.mock('../server/db', () => ({ db: {}, pool: {} }));
vi.mock('../server/civic-aggregator-service', () => ({ civicAggregatorService: {} }));
vi.mock('../server/services/votesmart-service', () => ({ voteSmartService: null }));
import { electionsRouter } from '../server/routes/elections';
import { storage } from '../server/storage';
import {GeocoderUnavailableError,GeocoderInputError,validGeocodeAddress,parseGeocodeCoordinates} from '../server/mapquest-service';
import { sendElectionListingUnavailable } from '../server/election-list-handler';
const source=readFileSync('server/routes.ts','utf8');
const registrationCache=new Map<string,string>();
function registration(start:string,end:string){const cached=registrationCache.get(start);if(cached)return cached;const at=source.indexOf(start);const text=source.slice(at,source.indexOf('\n  });',at)+8);const script=execFileSync(process.execPath,['--input-type=module','-e',"import {transformSync} from 'esbuild'; import {readFileSync} from 'node:fs'; process.stdout.write(transformSync(readFileSync(0,'utf8'),{loader:'ts',format:'cjs'}).code);"],{input:text,encoding:'utf8'});registrationCache.set(start,script);return script;}
function app(){
 const a=express();
 const search=()=>new Function('app','storage','perplexityCongressService','sendElectionListingUnavailable',registration('  // Enhanced election search with AI','  // Election verification endpoint with AI validation'))(a,storage,{},sendElectionListingUnavailable);
 const searchBeforeRouter=source.indexOf('  // Enhanced election search with AI')<source.indexOf('app.use("/api/elections", electionDegradedModeHandler, electionsRouter)');
 if(searchBeforeRouter)search();
 a.use('/api/elections',electionsRouter);
 if(!searchBeforeRouter)search();
 new Function('app','storage','mapQuestService','sendElectionListingUnavailable','GeocoderUnavailableError','GeocoderInputError','validGeocodeAddress','parseGeocodeCoordinates',registration('  app.get("/api/elections-by-location"','  // Congress API endpoints from your list'))(a,storage,{geocodeAddress:async()=>({state:'CO',city:'Denver',county:'Denver'})},sendElectionListingUnavailable,GeocoderUnavailableError,GeocoderInputError,validGeocodeAddress,parseGeocodeCoordinates);
 return a;
}
beforeEach(()=>{h.error=true;h.rows=[];h.strictReads=0;h.candidateReads=0;});
afterEach(()=>vi.useRealTimers());
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

describe('missing-candidate single-query window and count contract',()=>{
 for(const query of ['garbage','0','121','1.5','','Infinity','60&window=60','60&window=70']){
  it('rejects window='+query+' before storage',async()=>{const r=await request(app()).get('/api/elections/missing-candidates?window='+query);expect([r.status,r.body.code]).toEqual([400,'invalid_query']);expect(h.strictReads).toBe(0);});
 }
 it('rejects bracket-style array window before storage',async()=>{const r=await request(app()).get('/api/elections/missing-candidates?window[]=60');expect([r.status,r.body.code]).toEqual([400,'invalid_query']);expect(h.strictReads).toBe(0);});
 it('accepts exact integer boundaries1/120 and default60',async()=>{
  h.error=false;for(const [query,days] of [['?window=1',1],['?window=120',120],['',60]] as const){const r=await request(app()).get('/api/elections/missing-candidates'+query);expect(r.status).toBe(200);expect(r.body.window_days).toBe(days);}
 });
 it('returns only exact zero-count rows using one strict read and zero per-race reads',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));h.error=false;
  h.rows=[{id:1,title:'Colorado Senate',state:'CO',date:new Date('2026-11-03'),candidateCount:0},{id:2,title:'Arizona Senate',state:'AZ',date:new Date('2026-11-03'),candidateCount:2}];
  const r=await request(app()).get('/api/elections/missing-candidates');expect(r.status).toBe(200);expect(r.body.missing.map((e:any)=>e.id)).toEqual([1]);expect(r.body.missing[0].candidate_count).toBe(0);expect(h.strictReads).toBe(1);expect(h.candidateReads).toBe(0);
 });
 for(const count of [undefined,null,-1,0.5,NaN,Infinity,'0']){
  it('refuses invalid candidateCount '+String(count)+' instead of inventing zero',async()=>{
   vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));h.error=false;h.rows=[{id:1,title:'Colorado Senate',state:'CO',date:new Date('2026-11-03'),candidateCount:count}];
   const r=await request(app()).get('/api/elections/missing-candidates');expect([r.status,r.body.code]).toEqual([503,'listing_unavailable']);expect(h.candidateReads).toBe(0);
  });
 }
});
describe('calendar-day upcoming counts',()=>{
 it('retains Nov3 unknown/Adak races at Nov4 05:30Z while NY is past',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-04T05:30:00Z'));h.error=false;
  h.rows=[{id:1,date:new Date('2026-11-03'),timezone:null,type:'general'},{id:2,date:new Date('2026-11-03'),timezone:'America/Adak',type:'general'},{id:3,date:new Date('2026-11-03'),timezone:'America/New_York',type:'general'}];
  const r=await request(app()).get('/api/elections/counts');expect(r.status).toBe(200);expect([r.body.total,r.body.upcoming,r.body.past]).toEqual([3,2,1]);
 });
});

describe('published type casing does not lose counts',()=>{
 it('combines known case/space variants, preserves exact unknown keys',async()=>{
  h.error=false;h.rows=['Primary','primary','General','general','Special',' Unclassified ','Unclassified','__proto__','constructor'].map((type,id)=>({id,date:new Date('2026-11-03'),timezone:null,type}));
  const r=await request(app()).get('/api/elections/counts');expect(r.status).toBe(200);expect(r.body.byType.Primary).toBe(2);expect(r.body.byType.General).toBe(2);expect(r.body.byType.Special).toBe(1);expect(r.body.byType[' Unclassified ']).toBe(1);expect(r.body.byType.Unclassified).toBe(1);expect(Object.hasOwn(r.body.byType,'__proto__')).toBe(true);expect(r.body.byType.__proto__).toBe(1);expect(r.body.byType.constructor).toBe(1);
 });
});
