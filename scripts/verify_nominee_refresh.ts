/** Apply actual reviewed source records only to the dedicated disposable database. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'dotenv';
import pg from 'pg';
import express from 'express';
import { parseNomineeManifest, runNomineeRefresh } from '../server/candidate-nominee-sync';
import { generalCandidateListHandler } from '../server/general-candidate-list';
const envFile=process.env.ELECTION_ENV_FILE;
assert(envFile,'Set the intended ElectionTracker source environment file');
const sourceUrl=parse(readFileSync(envFile)).DATABASE_URL;
assert(sourceUrl,'Source database configuration absent');
const sourceTarget=new URL(sourceUrl);
assert(['127.0.0.1','localhost'].includes(sourceTarget.hostname) && (sourceTarget.port||'5432')==='5432' && sourceTarget.pathname==='/elections','Only approved local ElectionTracker data source');
const source=new pg.Pool({connectionString:sourceUrl,max:1,options:'-c default_transaction_read_only=on'});
const fixture=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3});
const bytes=readFileSync('data/nominees/combined-2026-reviewed.json');
const manifest=parseNomineeManifest(JSON.parse(bytes.toString('utf8'))),hash=createHash('sha256').update(bytes).digest('hex');
async function candidateDigest(pool:pg.Pool,ids?:number[]){return (await pool.query("SELECT count(*)::int AS count,md5(coalesce(string_agg(row_to_json(c)::text,'' ORDER BY id),'')) AS digest FROM candidates c WHERE $1::int[] IS NULL OR id=ANY($1::int[])",[ids??null])).rows[0];}
async function sourceDigest(){return (await fixture.query("SELECT md5(coalesce(string_agg(row_to_json(s)::text,'' ORDER BY id),'')) AS digest FROM candidate_source_records s")).rows[0].digest;}
try{
 assert.equal((await fixture.query('SELECT current_database() AS name')).rows[0].name,'et_sol_c_nominees_test');
 const sharedBefore=await candidateDigest(source);
 const electionColumns=['id','state','title','level','type','date','offices'];
 const candidateColumns=['id','election_id','name','party','is_incumbent','description','website','profile_image_url','is_verified','fec_candidate_id','fec_status','data_source','source_status','normalized_name','ballot_status','ballot_source_url','source_file_sha256','source_synced_at','polling_support','polling_trend'];
 const elections=(await source.query(`SELECT ${electionColumns.join(',')} FROM elections ORDER BY id`)).rows;
 const candidates=(await source.query(`SELECT ${candidateColumns.join(',')} FROM candidates ORDER BY id`)).rows;
 await fixture.query(`CREATE TABLE elections(id serial PRIMARY KEY,state text,title text,level text,type text,date timestamp,offices text[]);
 CREATE TABLE candidates(id serial PRIMARY KEY,election_id integer REFERENCES elections(id),name text NOT NULL,party text,is_incumbent boolean,description text,website text,profile_image_url text,is_verified boolean DEFAULT false,fec_candidate_id text,fec_status text,data_source text,source_status text,normalized_name text,ballot_status text,ballot_source_url text,source_file_sha256 text,source_synced_at timestamp,polling_support integer,polling_trend text,updated_at timestamp DEFAULT now());`);
 for(const e of elections)await fixture.query(`INSERT INTO elections(${electionColumns.join(',')}) VALUES(${electionColumns.map((_,i)=>'$'+(i+1)).join(',')})`,electionColumns.map(c=>e[c]));
 for(const c of candidates)await fixture.query(`INSERT INTO candidates(${candidateColumns.join(',')}) VALUES(${candidateColumns.map((_,i)=>'$'+(i+1)).join(',')})`,candidateColumns.map(k=>c[k]));
 await fixture.query("SELECT setval(pg_get_serial_sequence('candidates','id'),(SELECT max(id) FROM candidates))");
 await fixture.query(readFileSync('migrations/20261011_candidate_source_records.sql','utf8'));
 const existingIds=candidates.map(c=>c.id),before=await candidateDigest(fixture,existingIds);
 const dry=await runNomineeRefresh(fixture,manifest,hash,false);
 assert.equal(dry.unresolved.length,0);assert.equal(dry.actions.length,259);assert.deepEqual(await candidateDigest(fixture,existingIds),before);
 const first=await runNomineeRefresh(fixture,manifest,hash,true);
 assert.equal(first.candidateInserts,244);assert.equal(first.sourceChanges,259);
 assert.deepEqual(await candidateDigest(fixture,existingIds),before,'Original profile/FEC/ballot fields changed');
 const after=await candidateDigest(fixture),sourcesAfter=await sourceDigest();
 const second=await runNomineeRefresh(fixture,manifest,hash,true);
 assert.equal(second.candidateInserts,0);assert.equal(second.sourceChanges,0);
 assert.deepEqual(await candidateDigest(fixture),after);assert.equal(await sourceDigest(),sourcesAfter);
 const count=(await fixture.query("SELECT count(*)::int AS n FROM candidate_source_records WHERE source_layer='general_candidate_list' AND is_current=true")).rows[0].n;
 assert.equal(count,259);
 const unknownParty=(await fixture.query("SELECT count(*)::int AS n FROM candidates c JOIN candidate_source_records s ON s.candidate_id=c.id WHERE s.is_current=true AND s.metadata->>'ballotAccessType'='write_in' AND s.metadata->>'partyRaw'='' AND c.party=''")).rows[0].n;
 assert.equal(unknownParty,11);
 const app=express();app.get('/api/elections/:id/general-candidates',generalCandidateListHandler(fixture));
 const listener=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>listener.on('listening',resolve));
 let httpCases=0,records=0;
 try{
  const address=listener.address();assert(address&&typeof address==='object');
  const origin=`http://127.0.0.1:${address.port}`;
  mkdirSync('artifacts/lane-c/real-roster-payloads',{recursive:true});
  const raceIds=Array.from(new Set(first.actions.map(a=>a.electionId)));
  for(const id of raceIds){
   const response=await fetch(`${origin}/api/elections/${id}/general-candidates`);assert.equal(response.status,200);
   const body=await response.json();assert.equal(body.status,'sourced');
   const expected=first.actions.filter(a=>a.electionId===id);assert.equal(body.candidates.length,expected.length);
   for(const c of body.candidates){assert(c.generalListSourceUrl.startsWith('https://'));assert.equal(c.generalListSource.ballotCertificationPromoted,false);assert(!('contactEmail' in c));assert(!('campaignPhone' in c));}
   const firstRecord=body.candidates[0]?.generalListSource;
   const keep=(firstRecord?.state==='TX'&&firstRecord?.office==='S')||(firstRecord?.state==='NE'&&firstRecord?.office==='G')||(firstRecord?.state==='WA'&&firstRecord?.district==='01')||(firstRecord?.state==='NV'&&firstRecord?.district==='03');
   if(keep)writeFileSync(`artifacts/lane-c/real-roster-payloads/${firstRecord.state}-${id}.json`,JSON.stringify({receipt:{source:'actual private PostgreSQL through real Express handler',httpStatus:response.status,manifestSha256:hash,capturedAt:new Date().toISOString(),electionId:id},body},null,2));
   records+=body.candidates.length;httpCases++;
  }
  assert.equal(records,259);
  assert.equal((await fetch(`${origin}/api/elections/nope/general-candidates`)).status,400);httpCases++;
  assert.equal((await fetch(`${origin}/api/elections/999999/general-candidates`)).status,404);httpCases++;
 }finally{await new Promise<void>((resolve,reject)=>listener.close(error=>error?reject(error):resolve()));}
 // An injected write failure must restore candidates, source versions and audit receipts.
 await fixture.query(`CREATE FUNCTION reject_nominee_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='Failure Example' THEN RAISE EXCEPTION 'injected fixture failure'; END IF; RETURN NEW; END $$;
 CREATE TRIGGER nominee_fixture_failure BEFORE INSERT ON candidates FOR EACH ROW EXECUTE FUNCTION reject_nominee_fixture();`);
 const modified=structuredClone(manifest),ne=modified.sources.find(s=>s.state==='NE')!;
 ne.expectedRowCount++;
 const targetScope=ne.completeScopes.find(s=>s.office==='H'&&s.district==='01')!;targetScope.expectedCount++;
 modified.candidates.push({sourceId:ne.id,state:'NE',office:'H',district:'01',date:'2026-11-03',name:'Failure Example',partyRaw:'Republican',incumbent:null,sourcePage:1});
 const auditBefore=(await fixture.query('SELECT count(*)::int AS n FROM candidate_ingest_runs')).rows[0].n;
 let rolledBack=false;try{await runNomineeRefresh(fixture,parseNomineeManifest(modified),'f'.repeat(64),true);}catch(error){rolledBack=(error as {code?:string}).code==='P0001';}
 assert(rolledBack);assert.deepEqual(await candidateDigest(fixture),after);assert.equal(await sourceDigest(),sourcesAfter);assert.equal((await fixture.query('SELECT count(*)::int AS n FROM candidate_ingest_runs')).rows[0].n,auditBefore);
 assert.deepEqual(await candidateDigest(source),sharedBefore,'Shared source candidates changed');
 const receipt={outcome:'worked',fixture:'dedicated disposable PostgreSQL',manifestSha256:hash,sourceRecords:259,states:9,receivingRaces:new Set(first.actions.map(a=>a.electionId)).size,firstCandidateInserts:first.candidateInserts,repeatCandidateInserts:second.candidateInserts,repeatSourceChanges:second.sourceChanges,httpContracts:httpCases,checks:{source_row_conservation:true,dry_run_no_writes:true,original_profiles_fec_ballot_fields_unchanged:true,repeat_idempotent:true,write_in_unknown_party_preserved:true,receiving_http_records_and_provenance_verified:true,private_contacts_not_exposed:true,injected_failure_full_rollback:true,shared_candidate_table_unchanged:true},sharedBefore};
 writeFileSync('artifacts/lane-c/nominees-private-postgres.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}finally{await fixture.end();await source.end();}
