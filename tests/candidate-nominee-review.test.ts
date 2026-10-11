import {it,expect} from 'vitest';
import {parseNomineeManifest,planNomineeRefresh,runNomineeRefresh} from '../server/candidate-nominee-sync';
import {getGeneralCandidateList} from '../server/general-candidate-list';
const source={id:'review',state:'NE',kind:'official_general_candidate_list',name:'Official fixture',url:'https://sos.nebraska.gov/fixture.pdf',sha256:'a'.repeat(64),publishedAt:'2026-09-11',retrievedAt:'2026-10-11T00:00:00Z',electionDate:'2026-11-03',completeScopes:[{office:'H',district:'01',expectedCount:1}],expectedRowCount:1};
const row={sourceId:'review',state:'NE',office:'H',district:'01',date:'2026-11-03',name:'Alex Example',partyRaw:'Republican',incumbent:null};
const race={id:1,state:'NE',title:'U.S. House Election - NE-01',level:'federal',type:'general',date:'2026-11-03',offices:['U.S. House of Representatives']};
const candidate={id:9,election_id:1,name:'Alex Example',party:'R',data_source:'state_general_list',source_status:'general_list_record',fec_candidate_id:null,fec_status:null,source_file_sha256:'b'.repeat(64)};
it('accepts an explicit complete zero-candidate snapshot so vacancy removal is representable',()=>{
 const manifest=parseNomineeManifest({version:1,sources:[{...source,completeScopes:[{office:'H',district:'01',expectedCount:0}],expectedRowCount:0}],candidates:[]});
 expect(manifest.candidates).toHaveLength(0);
});
it('quarantines two official candidates whose aliases resolve to one existing identity',()=>{
 const manifest=parseNomineeManifest({version:1,sources:[{...source,completeScopes:[{office:'H',district:'01',expectedCount:2}],expectedRowCount:2}],candidates:[row,{...row,name:'Taylor Example',aliases:['Alex Example']}]});
 const plan=planNomineeRefresh(manifest,[race],[candidate]);
 const ids=plan.actions.map(a=>a.candidateId).filter(id=>id!=null);
 expect(new Set(ids).size).toBe(ids.length);
 expect(plan.unresolved.length).toBeGreaterThan(0);
});
it('refuses an older published source before displacing a newer current source',async()=>{
 const queries:string[]=[];
 const client={query:async(sql:string,params?:unknown[])=>{
  queries.push(sql);
  if(sql.includes('to_regclass'))return {rows:[{elections:'elections',candidates:'candidates',sources:'candidate_source_records',audit:'candidate_ingest_runs',snapshots:'general_candidate_list_snapshots'}],rowCount:1};
  if(sql.startsWith('SELECT id,state'))return {rows:[race],rowCount:1};
  if(sql.startsWith('SELECT id,election_id'))return {rows:[candidate],rowCount:1};
  if(sql.startsWith('SELECT id,source_file_sha256'))return {rows:[{id:501,source_file_sha256:'b'.repeat(64),metadata:{publishedAt:'2026-10-01'},source_synced_at:'2026-10-02T00:00:00Z'}],rowCount:1};
  if(sql.startsWith('INSERT INTO candidate_ingest_runs'))return {rows:[{id:77}],rowCount:1};
  return {rows:[],rowCount:1};
 },release(){}};
 const manifest=parseNomineeManifest({version:1,sources:[source],candidates:[row]});
 await expect(runNomineeRefresh({connect:async()=>client} as any,manifest,'a'.repeat(64),true)).rejects.toThrow(/older|stale|publication|fresh/i);
 expect(queries.some(s=>s.startsWith('UPDATE candidate_source_records'))).toBe(false);
});

it('does not mistake an audited complete zero-row list for an unrecorded list',async()=>{
 const pool={query:async(sql:string)=>{
  if(sql.includes('to_regclass'))return {rows:[{elections:'elections',candidates:'candidates',sources:'candidate_source_records',audit:'candidate_ingest_runs',snapshots:'general_candidate_list_snapshots'}],rowCount:1};
  if(sql.startsWith('SELECT id FROM elections'))return {rows:[{id:1}],rowCount:1};
  if(sql.includes('general_candidate_list_snapshots'))return {rows:[{url:source.url,checkedAt:source.retrievedAt,snapshotSha256:'c'.repeat(64),name:source.name,publishedAt:'2026-10-01',scope:{office:'H',district:'01',expectedCount:0}}],rowCount:1};
  if(sql.includes('candidate_ingest_runs'))return {rows:[{source_file_sha256:'c'.repeat(64),receipt:{sourceIds:['review'],candidateInserts:0,sourceChanges:1,completeScopes:[{state:'NE',office:'H',district:'01',date:'2026-11-03',expectedCount:0}]}}],rowCount:1};
  return {rows:[],rowCount:0};
 }};
 const result=await getGeneralCandidateList(pool as any,1);
 expect(result.candidates).toEqual([]);
 expect(result.status).not.toBe('not_recorded');
});
it('blocks an older complete roster even when its membership is disjoint from the current roster',async()=>{
 const queries:Array<{sql:string,params?:unknown[]}>=[];
 const client={query:async(sql:string,params?:unknown[])=>{
  queries.push({sql,params});
  if(sql.includes('to_regclass'))return {rows:[{elections:'elections',candidates:'candidates',sources:'candidate_source_records',audit:'candidate_ingest_runs',snapshots:'general_candidate_list_snapshots'}],rowCount:1};
  if(sql.startsWith('SELECT id,state'))return {rows:[race],rowCount:1};
  if(sql.startsWith('SELECT id,election_id'))return {rows:[{...candidate,name:'Taylor Current'}],rowCount:1};
  if(sql.startsWith('SELECT id,source_file_sha256'))return {rows:[],rowCount:0};
  if(sql.startsWith('INSERT INTO candidates'))return {rows:[{id:10}],rowCount:1};
  if(sql.startsWith('INSERT INTO candidate_ingest_runs'))return {rows:[{id:78}],rowCount:1};
  if(sql.startsWith('SELECT')&&sql.includes('general_candidate_list_snapshots'))return {rows:[{id:601,scope_key:'H|01|*|*',source_url:source.url,source_file_sha256:'b'.repeat(64),metadata:{publishedAt:'2026-10-01',scope:{office:'H',district:'01',expectedCount:1}}}],rowCount:1};
  if(sql.startsWith('SELECT')&&sql.includes('candidate_source_records'))return {rows:[{candidate_id:9,source_file_sha256:'b'.repeat(64),metadata:{publishedAt:'2026-10-01',office:'H',district:'01',state:'NE',electionDate:'2026-11-03'}}],rowCount:1};
  return {rows:[],rowCount:1};
 },release(){}};
 const manifest=parseNomineeManifest({version:1,sources:[source],candidates:[row]});
 await expect(runNomineeRefresh({connect:async()=>client} as any,manifest,'a'.repeat(64),true)).rejects.toThrow(/older|stale|publication|fresh/i);
 expect(queries.some(q=>q.sql.startsWith('INSERT INTO candidates'))).toBe(false);
});

it('acknowledges sourced qualified empty coverage without pretending no source was recorded',async()=>{
 const pool={query:async(sql:string)=>{
  if(sql.includes('to_regclass'))return {rows:[{elections:'elections',candidates:'candidates',sources:'candidate_source_records',snapshots:'general_candidate_list_snapshots'}],rowCount:1};
  if(sql.startsWith('SELECT id FROM elections'))return {rows:[{id:1}],rowCount:1};
  if(sql.includes('general_candidate_list_snapshots'))return {rows:[{url:source.url,checkedAt:source.retrievedAt,snapshotSha256:'c'.repeat(64),name:source.name,publishedAt:source.publishedAt,scope:{office:'H',district:'01',partyRaw:'Republican',expectedCount:0}}],rowCount:1};
  return {rows:[],rowCount:0};
 }};
 const result=await getGeneralCandidateList(pool as any,1);
 expect(result.candidates).toEqual([]);expect((result as any).sources).toHaveLength(1);
 expect(result.status).not.toBe('not_recorded');
});
