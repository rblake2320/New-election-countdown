// Controlled source-health failure in the reviewed private database. No vote/source rows are invented or changed.
import pg from 'pg';
const url=new URL(process.env.DATABASE_URL??'');
if(url.hostname!=='et6-prod-109656-3a740d1d-db'||url.port!=='5432'||url.pathname!=='/et6_receiving'||url.search||url.hash)throw Error('Wrong private receiving destination');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const receipt={at:new Date().toISOString(),scope:'Private controlled first-source-failure receiving; no external outage claim',outcome:'Running'};
let inserted;
const request=async(path,headers={})=>{const r=await fetch('http://127.0.0.1:5000'+path,{headers});const text=await r.text();return{status:r.status,etag:r.headers.get('etag'),body:text?JSON.parse(text):null};};
try{
  if((await pool.query('SELECT count(*)::int AS n FROM election_result_reports WHERE election_id=24')).rows[0].n!==0)throw Error('Failure target must have no report');
  if((await pool.query('SELECT count(*)::int AS n FROM result_source_health WHERE election_id=24')).rows[0].n!==0)throw Error('Failure target already has health state; preserve it');
  receipt.before=await request('/api/results?ids=24,4242401');
  inserted=(await pool.query(`INSERT INTO result_source_health(election_id,source_id,context_state,context_election_date,context_type,context_level,context_office,outcome,automatic,ttl_seconds,last_attempt_at,last_success_at,stale_since)
    SELECT id,official_results_source->>'publisher',state,date::date,type,level,title,'failed',true,90,clock_timestamp(),NULL,clock_timestamp() FROM elections WHERE id=24 AND state='NC' AND official_results_source->>'publisher' IS NOT NULL RETURNING to_jsonb(result_source_health) AS row`)).rows[0]?.row;
  if(!inserted)throw Error('Exact existing source failure could not be recorded');
  receipt.failed=await request('/api/results?ids=24,4242401',{'If-None-Match':receipt.before.etag});
  receipt.singleFailed=await request('/api/elections/24/results');
  receipt.cached=await request('/api/results?ids=24,4242401',{'If-None-Match':receipt.failed.etag});
  receipt.dateBatch=await request('/api/results?date=2026-11-03');
  const mixed=receipt.failed.body;
  receipt.checks={mixed200:receipt.failed.status===200,oneHealthy:mixed?.results?.length===1&&mixed.results[0].electionId===4242401&&mixed.results[0].totalVotes===1903115,oneError:mixed?.errors?.length===1&&mixed.errors[0].electionId===24&&mixed.errors[0].code==='source_unavailable',single503:receipt.singleFailed.status===503,conditional304:receipt.cached.status===304,dateScope:receipt.dateBatch.status===200&&receipt.dateBatch.body.results.length===505&&receipt.dateBatch.body.errors?.length===1};
}catch(error){receipt.error=error.message;}
finally{
  if(inserted){const restored=await pool.query('DELETE FROM result_source_health WHERE election_id=$1 AND source_id=$2 AND last_attempt_at=$3::timestamptz RETURNING election_id',[inserted.election_id,inserted.source_id,inserted.last_attempt_at]);receipt.restored=restored.rowCount===1;}
  receipt.after=await request('/api/results?ids=24,4242401');
  receipt.outcome=!receipt.error&&receipt.restored&&Object.values(receipt.checks??{}).every(Boolean)&&receipt.after.status===200?'Worked':'Failed';
  await pool.end();console.log(JSON.stringify(receipt));if(receipt.outcome!=='Worked')process.exitCode=1;
}
