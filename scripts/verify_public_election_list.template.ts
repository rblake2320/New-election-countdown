import {GeocoderUnavailableError,GeocoderInputError,validGeocodeAddress,parseGeocodeCoordinates} from '../server/mapquest-service';
import assert from 'node:assert/strict';
import express, {type RequestHandler} from 'express';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {writeFileSync} from 'node:fs';
import {getTableColumns} from 'drizzle-orm';
import {DatabaseStorage,storage,stopStorageBackground} from '../server/storage';
import {StorageFactory} from '../server/storage-factory';
import {pool} from '../server/db';
import {elections,candidates} from '../shared/schema';
import {MemStorage} from '../server/mem-storage';
import {electionsRouter} from '../server/routes/elections';
import {electionListHandler,sendElectionListingUnavailable} from '../server/election-list-handler';
import {ElectionFilterError,electionCalendarDay,normalizeElectionFilters,type ElectionListing,type ElectionQueryFilters} from '../server/election-list-filters';
/* IMMUTABLE_OLD_HANDLER */
const url=new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname,process.env.OWNED_LIST_FIXTURE_HOST);assert.equal(url.pathname,'/sol_public_list_fixture');assert.equal(url.search,'');
assert.ok(['5432','1'].includes(url.port));assert.equal(process.env.OWNED_LIST_FIXTURE_LABEL,'sol-c-public-list-fault-20261013');
await stopStorageBackground();
const store=new DatabaseStorage();const app=express();const outcomes:unknown[]=[];
const mapQuestService={geocodeAddress:async()=>({state:'CO',city:'Denver',county:'Denver'})};
const perplexityCongressService={searchWithAI:async()=>{throw new Error('Acceptance must not call an external provider');}};
/* ACTUAL_SEARCH_REGISTRATION */
/* ACTUAL_LOCATION_REGISTRATION */
Object.assign(storage,{currentStorage:store});
app.get('/api/elections',electionListHandler(store));app.use('/api/elections',electionsRouter);
app.get('/old',oldElectionListHandler(storage));app.get('/factory',electionListHandler(storage));
const server=createServer(app);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const root=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
async function get(path:string){const r=await fetch(root+path);return {status:r.status,body:await r.json()};}
try{
 if(url.port==='1'){
  const error=await store.getElectionsStrict().then(()=>null,e=>e);
  assert.equal(error?.cause?.code??error?.code,'ECONNREFUSED');
  const r=await get('/api/elections');assert.equal(r.status,503);assert.equal(r.body.code,'listing_unavailable');
  outcomes.push({scenario:'actual native pg closed-port refusal through DatabaseStorage and compiled HTTP handler',nativeCode:'ECONNREFUSED',response:r});
 }else{
  assert.equal((await pool.query('select current_database() as name')).rows[0].name,'sol_public_list_fixture');
  for(const [name,table] of [['elections',elections],['candidates',candidates]] as const){
   const columns=Object.values(getTableColumns(table)).map(c=>`"${c.name}" ${c.getSQLType()}${c.primary?' primary key':''}`);
   await pool.query(`create table "${name}" (${columns.join(',')})`);
  }
  await pool.query(`insert into elections(id,title,location,state,date,type,level,is_active) values (1,'U.S. Senate Election - Colorado','Colorado','CO','2026-11-03','general','federal',true),(2,'U.S. Senate Election - California','California','CA','2026-11-03','general','federal',false)`);
  const first=await get('/api/elections');assert.equal(first.status,200);assert.deepEqual(first.body.map((r:any)=>r.id),[1]);
  outcomes.push({scenario:'healthy compiled native-PG listing excludes inactive row',response:first});
  const stats=await store.getElectionStats();const counts=await get('/api/elections/counts');assert.equal(counts.status,200);assert.equal(counts.body.total,stats.total);assert.deepEqual(counts.body.byType,stats.byType);
  outcomes.push({scenario:'count derivation equals existing real-PG active-row stats',counts:counts.body,stats:{total:stats.total,byType:stats.byType}});
  // Observe the actual native driver query count; no fabricated query result.
  const originalQuery=pool.query;let queryReads=0;
  Object.defineProperty(pool,'query',{value:function(...args:unknown[]){queryReads++;return Reflect.apply(originalQuery,pool,args);},configurable:true});
  for(const query of ['garbage','0','121','1.5','','60&window=60','60&window=70']){
    queryReads=0;const r=await get('/api/elections/missing-candidates?window='+query);assert.equal(r.status,400);assert.equal(r.body.code,'invalid_query');assert.equal(queryReads,0);outcomes.push({scenario:'strict malformed window '+query,response:r,nativeQueries:queryReads});
  }
  queryReads=0;const arrayWindow=await get('/api/elections/missing-candidates?window[]=60');assert.equal(arrayWindow.status,400);assert.equal(queryReads,0);outcomes.push({scenario:'array window refused before native query',response:arrayWindow,nativeQueries:queryReads});
  queryReads=0;const exactZero=await get('/api/elections/missing-candidates');assert.deepEqual(exactZero.body.missing.map((e:any)=>e.id),[1]);assert.equal(queryReads,1);outcomes.push({scenario:'native candidateCount zero, one grouped query',response:exactZero,nativeQueries:queryReads});
  await pool.query("insert into candidates(id,election_id,party) values(10,1,'D')");
  queryReads=0;const exactOne=await get('/api/elections/missing-candidates');assert.deepEqual(exactOne.body.missing,[]);assert.equal(queryReads,1);outcomes.push({scenario:'native candidateCount one excludes race, one grouped query',response:exactOne,nativeQueries:queryReads});
  await pool.query('delete from candidates where id=10');
  const actualDate=globalThis.Date;
  globalThis.Date=new Proxy(actualDate,{construct(target,args){return Reflect.construct(target,args.length?args:['2026-11-04T05:30:00Z']);}});
  try{
    await pool.query("insert into elections(id,title,location,state,date,type,level,timezone,is_active) values(3,'U.S. Senate Election - Alaska','Alaska','AK','2026-11-03','general','federal','America/Adak',true),(4,'U.S. Senate Election - New York','New York','NY','2026-11-03','general','federal','America/New_York',true)");
    const night=await get('/api/elections/counts');assert.equal(night.status,200);assert.deepEqual([night.body.total,night.body.upcoming,night.body.past],[3,2,1]);outcomes.push({scenario:'actual native Nov3 unknown/Adak vsNY at pinnedNov4 05:30Z',response:night});
    await pool.query('delete from elections where id in(3,4)');
  }finally{globalThis.Date=actualDate;}
  await pool.query("insert into elections(id,title,location,state,date,type,level,is_active) values(3,'Colorado Primary A','Colorado','CO','2026-11-03','Primary','federal',true),(4,'Colorado Primary B','Colorado','CO','2026-11-03','primary','federal',true),(5,'Colorado General A','Colorado','CO','2026-11-03','General','federal',true),(6,'Colorado General B','Colorado','CO','2026-11-03','general','federal',true),(7,'Colorado Special','Colorado','CO','2026-11-03','Special','federal',true),(8,'Colorado Referendum','Colorado','CO','2026-11-03','Referendum','federal',true),(9,'Colorado Unknown A','Colorado','CO','2026-11-03','__proto__','federal',true),(10,'Colorado Unknown B','Colorado','CO','2026-11-03','constructor','federal',true)");
  const typeCounts=await get('/api/elections/counts');assert.equal(typeCounts.status,200);assert.deepEqual([typeCounts.body.byType.Primary,typeCounts.body.byType.General,typeCounts.body.byType.Special,typeCounts.body.byType.Referendum],[2,3,1,1]);assert.equal(Object.hasOwn(typeCounts.body.byType,'__proto__'),true);assert.equal(typeCounts.body.byType.__proto__,1);assert.equal(typeCounts.body.byType.constructor,1);outcomes.push({scenario:'actual native mixed-case known types aggregate, unknown key preserved (includes baseline general row)',response:typeCounts});
  await pool.query('delete from elections where id between 3 and 10');
  const empty=await get('/api/elections?state=NY');assert.deepEqual(empty,{status:200,body:[]});outcomes.push({scenario:'legitimate filtered empty200[]',response:empty});
  const bad=await get('/api/elections?timeframe=bad');assert.equal(bad.status,400);outcomes.push({scenario:'invalid filter400',response:bad});
  for(const path of ['/api/elections/search?query=Colorado','/api/elections/missing-candidates','/api/elections-by-location?address=Denver']){const r=await get(path);assert.equal(r.status,200);outcomes.push({scenario:'healthy actual reserved route '+path,response:r});}
  await pool.query('alter table elections rename to elections_fault');
  const error=await store.getElectionsStrict().then(()=>null,e=>e);assert.equal(error?.cause?.code,'42P01');
  for(const path of ['/api/elections','/api/elections/counts','/api/elections/search?query=Colorado','/api/elections/missing-candidates','/api/elections-by-location?address=Denver']){const r=await get(path);assert.equal(r.status,503);assert.equal(r.body.code,'listing_unavailable');outcomes.push({scenario:'actual native SQL relation fault '+path,nativeCode:'42P01',response:r});}
  await pool.query('alter table elections_fault rename to elections');
  const recovered=await get('/api/elections');assert.equal(recovered.status,200);assert.deepEqual(recovered.body,first.body);outcomes.push({scenario:'same process SQL recovery restores identical list',response:recovered});
  const memory=new MemStorage();Object.assign(storage,{currentStorage:memory,memoryStorage:memory});
  const old=await get('/old');assert.deepEqual(old,{status:200,body:[]});
  const current=await get('/factory');assert.equal(current.status,503);assert.equal(current.body.code,'listing_unavailable');
  outcomes.push({scenario:'real factory degraded memory immutable-old200[] / current typed503',old,current});
 }
 const receipt={outcome:'Worked',compiled:true,actualNativePg:true,syntheticOwnedDatabase:true,hostPortsExposed:false,sharedDatabaseTouched:false,outcomes};
 writeFileSync('/evidence/'+(url.port==='1'?'refined-native-refusal.json':'refined-native-fault-recovery.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({outcome:'Worked',scenarios:outcomes.length,mode:url.port==='1'?'refusal':'fault-recovery'}));
}finally{await new Promise<void>(r=>server.close(()=>r()));await pool.end();}
