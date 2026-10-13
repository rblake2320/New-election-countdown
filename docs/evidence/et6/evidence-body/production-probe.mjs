import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
const base='http://127.0.0.1:5000',out={scenario:'Actual official LA JSON evidence upload and repeat through compiled production middleware'};
const body=await readFile('/tmp/la-official-evidence.json');
const sha=createHash('sha256').update(body).digest('hex');
if(sha!=='cf1e6a52f5554f0bb4959f6b9ad7cc583e53f70e57ca28b62346f7c8c01be637')throw Error('source hash mismatch');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{
 const before=await pool.query('SELECT (SELECT count(*)::int FROM election_result_reports) AS reports,(SELECT count(*)::int FROM candidate_result_lines) AS lines,(SELECT count(*)::int FROM result_evidence_blobs) AS evidence');out.before=before.rows[0];
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'et6-admin@example.test',password:process.env.ET6_FIXTURE_PASSWORD})});if(login.status!==200)throw Error('login '+login.status);
 const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 out.uploads=[];
 for(const path of ['/api/admin/results-evidence','/API/ADMIN/RESULTS-EVIDENCE/?repeat=1']){
  const r=await fetch(base+path,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-Evidence-Filename':'LA-Jun27-races.raw.json'},body});const result=await r.json();out.uploads.push({path,status:r.status,body:result});
  if(r.status!==(out.uploads.length===1?201:200)||result.sha256!==sha||result.size!==6321)throw Error('upload contract '+JSON.stringify(out.uploads));
 }
 const stored=await pool.query('SELECT sha256,size_bytes,content_type,bytes FROM result_evidence_blobs WHERE sha256=$1',[sha]);
 if(stored.rows.length!==1||!stored.rows[0].bytes.equals(body))throw Error('stored bytes differ');
 out.stored={rows:1,sha256:createHash('sha256').update(stored.rows[0].bytes).digest('hex'),bytes:stored.rows[0].size_bytes,contentType:stored.rows[0].content_type};
 out.after=(await pool.query('SELECT (SELECT count(*)::int FROM election_result_reports) AS reports,(SELECT count(*)::int FROM candidate_result_lines) AS lines,(SELECT count(*)::int FROM result_evidence_blobs) AS evidence')).rows[0];
 if(out.after.reports!==out.before.reports||out.after.lines!==out.before.lines||out.after.evidence!==out.before.evidence+1)throw Error('unexpected mutation');
 out.outcome='Worked';out.completedAt=new Date().toISOString();console.log(JSON.stringify(out));
}finally{await pool.end()}
