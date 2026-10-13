/** Actual MapQuestService and actual receiving handler bodies; provider-response fixtures are isolated synthetic boundary tests, never live-provider proof. */
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as geo from '../server/mapquest-service';
const source=readFileSync('server/routes.ts','utf8');const cache=new Map<string,string>();
function registration(path:string){const cached=cache.get(path);if(cached)return cached;const start=source.indexOf(`  app.get("${path}"`);const text=source.slice(start,source.indexOf('\n  });',start)+8);const script=execFileSync(process.execPath,['--input-type=module','-e',"import {transformSync} from 'esbuild';import{readFileSync}from'node:fs';process.stdout.write(transformSync(readFileSync(0,'utf8'),{loader:'ts',format:'cjs'}).code);"],{input:text,encoding:'utf8'});cache.set(path,script);return script;}
const paths=['/api/elections-by-location','/api/geocode','/api/reverse-geocode','/api/validate-address'];
const queries=['?address=Raleigh%20NC','?address=Raleigh%20NC','?lat=0&lng=0','?address=Raleigh%20NC'];
let fetchBoundary:ReturnType<typeof vi.fn>;let reads:number;
function app(service:geo.MapQuestService){const a=express();const storage={getElectionsStrict:async()=>{reads++;return [];}};for(const path of paths)new Function('app','mapQuestService','storage','GeocoderUnavailableError','GeocoderInputError','validGeocodeAddress','parseGeocodeCoordinates','sendElectionListingUnavailable',registration(path))(a,service,storage,geo.GeocoderUnavailableError,geo.GeocoderInputError,geo.validGeocodeAddress,geo.parseGeocodeCoordinates,(res:express.Response)=>res.status(503).json({code:'listing_unavailable'}));return a;}
beforeEach(()=>{vi.stubEnv('MAPQUEST_API_KEY','');fetchBoundary=vi.fn(()=>{throw new Error('No live provider call authorized in this test');});vi.stubGlobal('fetch',fetchBoundary);reads=0;});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('actual optional geocoder config failure',()=>{
 for(const [i,path] of paths.entries())it(path+' reports missing configuration503, no provider or SQL call',async()=>{const r=await request(app(new geo.MapQuestService())).get(path+queries[i]);expect([r.status,r.body.code]).toEqual([503,'geocoder_unavailable']);expect(fetchBoundary).not.toHaveBeenCalled();expect(reads).toBe(0);});
 it('nearby wrapper propagates unavailable rather than inventing empty',async()=>{await expect(new geo.MapQuestService().findNearbyElections(0,0)).rejects.toMatchObject({code:'geocoder_unavailable'});expect(fetchBoundary).not.toHaveBeenCalled();});
});
describe('malformed inputs precede geocoder configuration',()=>{
 for(const query of ['', '?address= ', '?address=a&address=b', '?lat=12junk&lng=4','?lat=91&lng=0','?lat=0&lng=181','?lat=0&lng=0&lng=1','?lat=Infinity&lng=0','?lat=&lng=0'])it(query||'missing input',async()=>{const r=await request(app(new geo.MapQuestService())).get('/api/elections-by-location'+query);expect(r.status).toBe(400);expect(fetchBoundary).not.toHaveBeenCalled();expect(reads).toBe(0);});
});
describe('isolated synthetic provider boundary failures (no real provider claim)',()=>{
 it('transport failure is unavailable503 on every receiver, no raw detail/key',async()=>{
  vi.stubEnv('MAPQUEST_API_KEY','unit-boundary-only-not-a-provider-key');fetchBoundary.mockRejectedValue(new Error('private endpoint failure'));
  for(const [i,path] of paths.entries()){const r=await request(app(new geo.MapQuestService())).get(path+queries[i]);expect([r.status,r.body.code]).toEqual([503,'geocoder_unavailable']);expect(JSON.stringify(r.body)).not.toMatch(/private endpoint|unit-boundary/);}
 });
 for(const status of [403,500])it('provider JSON status '+status+' with HTTP200 is unavailable',async()=>{vi.stubEnv('MAPQUEST_API_KEY','unit-boundary-only-not-a-provider-key');fetchBoundary.mockResolvedValue({ok:true,json:async()=>({info:{statuscode:status},results:[]})});const r=await request(app(new geo.MapQuestService())).get('/api/elections-by-location?address=RaleighNC');expect([r.status,r.body.code]).toEqual([503,'geocoder_unavailable']);});
 it('worked provider status0/no matches preserves null/404/400 and false validation truthfully',async()=>{
  vi.stubEnv('MAPQUEST_API_KEY','unit-boundary-only-not-a-provider-key');fetchBoundary.mockResolvedValue({ok:true,json:async()=>({info:{statuscode:0},results:[]})});
  const service=new geo.MapQuestService();expect(await service.geocodeAddress('unknown')).toBe(null);
  const a=app(service);expect((await request(a).get('/api/geocode?address=unknown')).status).toBe(404);expect((await request(a).get('/api/elections-by-location?address=unknown')).status).toBe(400);expect((await request(a).get('/api/validate-address?address=unknown')).body).toEqual({isValid:false});
 });
 it('provider input status400 remains400 rather than outage',async()=>{vi.stubEnv('MAPQUEST_API_KEY','unit-boundary-only-not-a-provider-key');fetchBoundary.mockResolvedValue({ok:true,json:async()=>({info:{statuscode:400},results:[]})});const r=await request(app(new geo.MapQuestService())).get('/api/elections-by-location?address=unknown');expect(r.status).toBe(400);});
 for(const body of [{},{info:{statuscode:0}},{info:{statuscode:0},results:[{}]},{info:{statuscode:0},results:[{locations:[{}]}]}])it('malformed response is503 rather than no-match',async()=>{vi.stubEnv('MAPQUEST_API_KEY','unit-boundary-only-not-a-provider-key');fetchBoundary.mockResolvedValue({ok:true,json:async()=>body});const r=await request(app(new geo.MapQuestService())).get('/api/elections-by-location?address=x');expect([r.status,r.body.code]).toEqual([503,'geocoder_unavailable']);});
});

describe('synthetic positive response contract, not a real configured-provider claim',()=>{
 it('preserves exact source labels and original reverse input coordinates',async()=>{
  vi.stubEnv('MAPQUEST_API_KEY','unit-boundary-only-not-a-provider-key');
  fetchBoundary.mockResolvedValue({ok:true,json:async()=>({info:{statuscode:0},results:[{locations:[{latLng:{lat:35.78,lng:-78.64},adminArea3:'NC',adminArea4:'Wake',adminArea5:'Raleigh',postalCode:'27601',street:'',geocodeQuality:'CITY'}]}]})});
  const service=new geo.MapQuestService();expect(await service.geocodeAddress('Raleigh NC')).toEqual({latitude:35.78,longitude:-78.64,state:'NC',county:'Wake',city:'Raleigh',postalCode:'27601',street:'',quality:'CITY'});
  const reverse=await service.reverseGeocode(0,0);expect(reverse?.latitude).toBe(0);expect(reverse?.longitude).toBe(0);expect(reverse?.state).toBe('NC');
 });
 for(const status of [401,403,429,500])it('HTTP failure '+status+' is unavailable503',async()=>{vi.stubEnv('MAPQUEST_API_KEY','unit-boundary-only-not-a-provider-key');fetchBoundary.mockResolvedValue({ok:false,status});const r=await request(app(new geo.MapQuestService())).get('/api/elections-by-location?address=RaleighNC');expect([r.status,r.body.code]).toEqual([503,'geocoder_unavailable']);});
});
