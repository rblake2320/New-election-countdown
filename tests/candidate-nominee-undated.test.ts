import {it,expect} from 'vitest';
import {parseNomineeManifest,runNomineeRefresh} from '../server/candidate-nominee-sync';
it.each([false,true])('rejects replay of an older retrieved undated source before mutations, apply=%s',async(apply)=>{
 const url='https://s3.amazonaws.com/dl.ncsbe.gov/Elections/2026/Candidate%20Filing/Candidate_Listing_2026.csv';
 const race={id:1,state:'NC',title:'U.S. House Election - NC-01',level:'federal',type:'general',date:'2026-11-03',offices:['U.S. House of Representatives']};
 const oldSource={id:'old-reviewed',state:'NC',kind:'official_general_candidate_list',name:'Undated official source fixture',url,sha256:'a'.repeat(64),publishedAt:null,retrievedAt:'2026-09-11T00:00:00Z',electionDate:'2026-11-03',completeScopes:[{office:'H',district:'01',expectedCount:1}],expectedRowCount:1};
 const row={sourceId:'old-reviewed',state:'NC',office:'H',district:'01',date:'2026-11-03',name:'Old Withdrawn Fixture',partyRaw:'DEM',incumbent:null};
 const mutations:string[]=[];
 const client={query:async(sql:string)=>{
  if(sql.includes('to_regclass'))return {rows:[{elections:'elections',candidates:'candidates',sources:'candidate_source_records',audit:'candidate_ingest_runs',snapshots:'general_candidate_list_snapshots'}],rowCount:1};
  if(sql.startsWith('SELECT id,state'))return {rows:[race],rowCount:1};
  if(sql.startsWith('SELECT id,election_id'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT')&&sql.includes('general_candidate_list_snapshots'))return {rows:[{id:501,scope_key:'H|01|*|*',source_url:url,source_file_sha256:'b'.repeat(64),source_synced_at:new Date('2026-10-11T00:00:00Z'),is_current:true,metadata:{publishedAt:null,scope:{office:'H',district:'01',expectedCount:0}}}],rowCount:1};
  if(sql.startsWith('SELECT')&&sql.includes('candidate_source_records'))return {rows:[],rowCount:0};
  if(/^(INSERT|UPDATE)/.test(sql))mutations.push(sql);
  if(sql.startsWith('INSERT INTO candidates'))return {rows:[{id:10}],rowCount:1};
  if(sql.startsWith('INSERT INTO candidate_ingest_runs'))return {rows:[{id:77}],rowCount:1};
  return {rows:[],rowCount:1};
 },release(){}};
 await expect(runNomineeRefresh({connect:async()=>client} as any,parseNomineeManifest({version:1,sources:[oldSource],candidates:[row]}),'a'.repeat(64),apply)).rejects.toThrow(/older|stale|retriev|fresh/i);
 expect(mutations).toHaveLength(0);
});
