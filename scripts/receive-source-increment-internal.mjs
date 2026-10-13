import pg from 'pg';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const u=new URL(process.env.DATABASE_URL??''),host=process.env.ET6_EXPECTED_DB_HOST;
assert(host&&/^et6-prod-\d+-[a-f0-9]{8}-db$/.test(host)&&host!=='et6-prod-109656-3a740d1d-db'&&u.hostname===host&&u.port==='5432'&&u.pathname==='/et6_receiving'&&!u.search&&!u.hash);
const p=new pg.Pool({connectionString:process.env.DATABASE_URL});
const out={outcome:'Running',startedAt:new Date().toISOString(),checks:[],rosters:[]};
const check=(name,ok)=>{out.checks.push({name,worked:!!ok});assert(ok,name);};
try{
 const elections=(await p.query("SELECT id,state,title,type,date::text AS date FROM elections WHERE date='2026-11-03' ORDER BY id")).rows;
 const candidates=(await p.query('SELECT to_jsonb(c) AS row FROM candidates c ORDER BY id')).rows.map(x=>x.row);
 const sources=(await p.query("SELECT to_jsonb(s) AS row FROM candidate_source_records s WHERE source_layer='general_candidate_list' AND is_current=true ORDER BY id")).rows.map(x=>x.row);
 const snapshots=(await p.query('SELECT to_jsonb(s) AS row FROM general_candidate_list_snapshots s WHERE is_current=true ORDER BY id')).rows.map(x=>x.row);
 out.profileShaBefore=createHash('sha256').update(JSON.stringify(candidates)).digest('hex');
 const ids=new Set(elections.map(e=>e.id)), novProfiles=candidates.filter(c=>ids.has(c.election_id));
 out.sql={races:elections.length,nov3Profiles:novProfiles.length,allProfiles:candidates.length,officialFacts:sources.length,newSources:sources.filter(s=>s.id>=3857&&s.id<=3943).length};
 check('independent SQL totals506/3464/3480/1448/87',elections.length===506&&novProfiles.length===3464&&candidates.length===3480&&sources.length===1448&&out.sql.newSources===87);
 const receivedNew=new Set();
 for(const e of elections){
  await new Promise(r=>setTimeout(r,260));
  const r=await fetch(`http://127.0.0.1:5000/api/elections/${e.id}/general-candidates`,{signal:AbortSignal.timeout(15000)});
  assert.equal(r.status,200,`HTTP ${e.id}`);const body=await r.json();
  const raceProfiles=candidates.filter(c=>c.election_id===e.id);
  const expected=[];
  for(const c of raceProfiles){
   const selected=sources.filter(s=>s.candidate_id===c.id).sort((a,b)=>{
    const da=/^\d{4}-\d{2}-\d{2}$/.test(a.metadata?.publishedAt??'')?a.metadata.publishedAt:'';
    const db=/^\d{4}-\d{2}-\d{2}$/.test(b.metadata?.publishedAt??'')?b.metadata.publishedAt:'';
    return db.localeCompare(da)||new Date(b.source_synced_at)-new Date(a.source_synced_at)||b.id-a.id;
   })[0];if(selected)expected.push({c,s:selected});
  }
  if(body.status==='not_applicable'){assert(!['general','special'].includes(e.type.toLowerCase()),`unexpected not_applicable ${e.id}`);assert.equal(body.candidates.length,0);assert.equal(expected.length,0);}
  else{
   assert.deepEqual(body.candidates.map(c=>c.id).sort((a,b)=>a-b),expected.map(x=>x.c.id).sort((a,b)=>a-b),`membership ${e.id}`);
   for(const {c,s} of expected){const actual=body.candidates.find(x=>x.id===c.id);
    assert.equal(actual.name,s.metadata.ballotName??c.name);assert.equal(actual.party,s.metadata.partyValue??'');
    assert.deepEqual(actual.generalListSource,s.metadata);assert.equal(actual.generalListSourceUrl,s.source_url);assert.equal(actual.generalListSnapshotSha256,s.source_file_sha256);
    for(const [field,col] of Object.entries({description:'description',website:'website',profileImageUrl:'profile_image_url',isVerified:'is_verified',fecCandidateId:'fec_candidate_id',ballotStatus:'ballot_status',dataSource:'data_source',sourceStatus:'source_status'}))assert.deepEqual(actual[field],c[col]);
    if(s.id>=3857&&s.id<=3943)receivedNew.add(s.id);
   }
   const expectedSnapshots=snapshots.filter(s=>s.election_id===e.id);
   assert.equal(body.sources.length,expectedSnapshots.length);
   for(const s of expectedSnapshots)assert(body.sources.some(x=>x.url===s.source_url&&x.snapshotSha256===s.source_file_sha256&&JSON.stringify(x.scope)===JSON.stringify(s.metadata.scope)),`scope ${e.id}`);
  }
  out.rosters.push({electionId:e.id,status:r.status,payload:body,responseSha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')});
  if(out.rosters.length%100===0)console.error('rosters verified '+out.rosters.length);
 }
 check('all506 actual HTTP rosters exact',out.rosters.length===506);check('all87 new memberships received',receivedNew.size===87);out.newSourceIds=[...receivedNew].sort((a,b)=>a-b);
 out.profileShaAfter=createHash('sha256').update(JSON.stringify((await p.query('SELECT to_jsonb(c) AS row FROM candidates c ORDER BY id')).rows.map(x=>x.row))).digest('hex');
 check('all3480 full profiles unchanged',out.profileShaBefore===out.profileShaAfter);out.outcome='Worked';
}catch(e){out.outcome='Failed';out.error=e.message;process.exitCode=1;}finally{await p.end();out.completedAt=new Date().toISOString();console.log(JSON.stringify(out));}
