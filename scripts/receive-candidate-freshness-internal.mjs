// Read-only actual production HTTP/PG freshness acceptance on new disposable fixture.
import pg from 'pg';
import {createHash} from 'node:crypto';
const url=new URL(process.env.DATABASE_URL??''),host=process.env.ET6_EXPECTED_DB_HOST;
if(!host||!/^et6-prod-\d+-[a-f0-9]{8}-db$/.test(host)||host==='et6-prod-109656-3a740d1d-db'||url.hostname!==host||url.port!=='5432'||url.pathname!=='/et6_receiving'||url.search||url.hash)throw Error('New disposable destination required');
const p=new pg.Pool({connectionString:process.env.DATABASE_URL});
const out={outcome:'Running',at:new Date().toISOString(),checks:[],responses:[]};
const check=(name,ok)=>{out.checks.push({name,worked:!!ok});if(!ok)throw Error(name);};
const digest=async()=>createHash('sha256').update(JSON.stringify((await p.query('SELECT to_jsonb(c) AS row FROM candidates c ORDER BY id')).rows)).digest('hex');
const get=async path=>{const r=await fetch('http://127.0.0.1:5000'+path,{signal:AbortSignal.timeout(20000)});return{status:r.status,body:await r.json()};};
try{
 out.beforeSha256=await digest();
 const rows=(await p.query('SELECT id,election_id,updated_at FROM candidates WHERE election_id IS NOT NULL ORDER BY id LIMIT 2')).rows;
 check('actual stored candidate subjects',rows.length===2);
 for(const row of rows){
  const expected=row.updated_at===null?null:new Date(row.updated_at).toISOString();
  const path=`/api/elections/${row.election_id}/candidates/${row.id}`;
  const first=await get(path);const second=await get(path);
  const listing=await get(`/api/elections/${row.election_id}/candidates`);
  const listed=Array.isArray(listing.body)?listing.body.find(c=>c.id===row.id):undefined;
  out.responses.push({candidateId:row.id,electionId:row.election_id,sqlTimestamp:expected,firstStatus:first.status,secondStatus:second.status,firstTimestamp:first.body.last_data_update,secondTimestamp:second.body.last_data_update,listStatus:listing.status,listTimestamp:listed?.last_data_update});
  check('two actual detail GETs match SQL '+row.id,first.status===200&&second.status===200&&first.body.last_data_update===expected&&second.body.last_data_update===expected);
  check('actual list matches SQL '+row.id,listing.status===200&&listed?.last_data_update===expected);
 }
 out.afterSha256=await digest();check('all full candidate profiles unchanged',out.beforeSha256===out.afterSha256);out.outcome='Worked';
}catch(e){out.outcome='Failed';out.error=e.message;process.exitCode=1;}
finally{await p.end();out.completedAt=new Date().toISOString();console.log(JSON.stringify(out));}
