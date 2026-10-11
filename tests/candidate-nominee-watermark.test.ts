import {it,expect} from 'vitest';
import {parseNomineeManifest,runNomineeRefresh} from '../server/candidate-nominee-sync';
it('preserves broad absence freshness outside a newer narrow party update',async()=>{
 const race={id:1,state:'NE',title:'U.S. House Election - NE-01',level:'federal',type:'general',date:'2026-11-03',offices:['U.S. House of Representatives']};
 const snapshotRows:any[]=[{id:1,scope_key:'H|01|*|*',source_url:'https://sos.nebraska.gov/full.pdf',source_file_sha256:'b'.repeat(64),is_current:true,metadata:{publishedAt:'2026-10-01',scope:{office:'H',district:'01',expectedCount:0}}}];
 const insertedCandidates:any[]=[];const queries:Array<{sql:string,params:any[]}>=[];
 const client={query:async(sql:string,params:any[]=[])=>{
  queries.push({sql,params});
  if(sql.includes('to_regclass'))return {rows:[{elections:'elections',candidates:'candidates',sources:'candidate_source_records',audit:'candidate_ingest_runs',snapshots:'general_candidate_list_snapshots'}],rowCount:1};
  if(sql.startsWith('SELECT id,state'))return {rows:[race],rowCount:1};
  if(sql.startsWith('SELECT id,election_id'))return {rows:insertedCandidates,rowCount:insertedCandidates.length};
  if(sql.startsWith('SELECT')&&sql.includes('general_candidate_list_snapshots'))return {rows:sql.includes('is_current=true')?snapshotRows.filter(r=>r.is_current):snapshotRows,rowCount:sql.includes('is_current=true')?snapshotRows.filter(r=>r.is_current).length:snapshotRows.length};
  if(sql.startsWith('SELECT')&&sql.includes('candidate_source_records'))return {rows:[],rowCount:0};
  if(sql.startsWith('UPDATE general_candidate_list_snapshots')){for(const r of snapshotRows)if(params[0].includes(r.id))r.is_current=false;return {rows:[],rowCount:params[0].length};}
  if(sql.startsWith('INSERT INTO general_candidate_list_snapshots')){snapshotRows.push({id:snapshotRows.length+1,election_id:params[0],scope_key:params[1],source_url:params[2],source_file_sha256:params[3],metadata:JSON.parse(params[5]),is_current:true});return {rows:[],rowCount:1};}
  if(sql.startsWith('INSERT INTO candidates')){insertedCandidates.push({id:9,name:params[0],party:params[1],election_id:params[2]});return {rows:[{id:9}],rowCount:1};}
  if(sql.startsWith('INSERT INTO candidate_ingest_runs'))return {rows:[{id:77}],rowCount:1};
  return {rows:[],rowCount:0};
 },release(){}};
 const source=(id:string,publishedAt:string,partyRaw:string,count:number)=>({id,state:'NE',kind:'official_general_candidate_list',name:'Official scoped fixture',url:'https://sos.nebraska.gov/'+id+'.pdf',sha256:'a'.repeat(64),publishedAt,retrievedAt:'2026-10-11T00:00:00Z',electionDate:'2026-11-03',completeScopes:[{office:'H',district:'01',partyRaw,expectedCount:count}],expectedRowCount:count});
 const republican=parseNomineeManifest({version:1,sources:[source('republican','2026-10-02','Republican',0)],candidates:[]});
 await runNomineeRefresh({connect:async()=>client} as any,republican,'c'.repeat(64),true);
 const olderDemocratic=parseNomineeManifest({version:1,sources:[source('older-democratic','2026-09-11','Democratic',1)],candidates:[{sourceId:'older-democratic',state:'NE',office:'H',district:'01',date:'2026-11-03',name:'Old Withdrawn Fixture',partyRaw:'Democratic',incumbent:null}]});
 await expect(runNomineeRefresh({connect:async()=>client} as any,olderDemocratic,'d'.repeat(64),true)).rejects.toThrow(/older|stale|publication|fresh/i);
 expect(insertedCandidates).toHaveLength(0);
});
