// Run inside the reviewed production container against its owned private PG only.
import pg from 'pg';
import jwt from 'jsonwebtoken';
import {createHash} from 'node:crypto';
const u=new URL(process.env.DATABASE_URL??'');
if(u.hostname!=='et6-prod-109656-3a740d1d-db'||u.port!=='5432'||u.pathname!=='/et6_receiving'||u.search||u.hash)throw Error('Wrong private destination');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const out={at:new Date().toISOString(),scope:'Actual production routes and signed session; synthetic Undecided preference on the private fixture account only',checks:[],outcome:'Running'};
let cookie='',subject='',createdId;
const check=(name,ok)=>{out.checks.push({name,worked:!!ok});if(!ok)throw Error(name);};
const req=async(path,body,extra={},authenticated=true)=>{const r=await fetch('http://127.0.0.1:5000'+path,{method:body===undefined?'GET':'POST',headers:{...(authenticated?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});return{status:r.status,body:await r.json()};};
const row=async()=> (await pool.query('SELECT id,candidate_id,party_preference,confidence,is_likely_voter,created_at,updated_at,xmin::text FROM user_voting_intentions WHERE election_id=2 AND session_id=$1',[subject])).rows;
try{
 const login=await fetch('http://127.0.0.1:5000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'et6-admin@example.test',password:process.env.ET6_FIXTURE_PASSWORD})});
 check('actual fixture login',login.status===200);
 cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 const token=cookie.split('; ').find(x=>x.startsWith('et.sid='))?.slice(7);
 const claims=jwt.verify(decodeURIComponent(token??''),process.env.JWT_SECRET);
 check('actual signed JWT verified',typeof claims==='object'&&typeof claims.uid==='string');
 subject=createHash('sha256').update('voting-intention\0'+claims.uid).digest('hex');
 check('preserve preexisting fixture preferences',(await row()).length===0);
 out.analysis=await req('/api/elections/2/political-analysis');
 check('registered typed analysis503',out.analysis.status===503&&out.analysis.body.code==='political_analysis_unavailable'&&out.analysis.body.source===null&&out.analysis.body.asOf===null&&!('leaning' in out.analysis.body));
 out.invalidAnalysis=await req('/api/elections/2junk/political-analysis');
 check('invalid analysis id400',out.invalidAnalysis.status===400);
 const ids=(await pool.query('SELECT id FROM candidates WHERE election_id=2 ORDER BY id LIMIT 2')).rows.map(x=>x.id);
 check('actual stored candidate subjects',ids.length===2);
 out.policy=[];
 for(const id of ids){const n=(await pool.query('SELECT count(*)::int AS n FROM candidate_positions WHERE candidate_id=$1 AND is_verified=true',[id])).rows[0].n;const r=await req('/api/candidates/'+id+'/positions');out.policy.push({candidateId:id,verifiedSqlRows:n,response:r});check('source-only positions exact empty SQL '+id,n===0&&r.status===200&&Array.isArray(r.body)&&r.body.length===0);}
 out.compare=await req('/api/civic/compare?candidateIds='+ids.join(',')+'&policyCategories=Healthcare');
 check('source-only comparison has no invented positions',out.compare.status===200&&out.compare.body.length===1&&out.compare.body[0].category==='Healthcare'&&out.compare.body[0].positions.length===0);
 out.badPolicy=await req('/api/candidates/1junk/positions');check('strict policy id400',out.badPolicy.status===400);
 const body={partyPreference:'Undecided',confidence:'low'};
 out.unsigned=await req('/api/elections/2/voting-intention',body,{},false);check('unsigned401 without write',out.unsigned.status===401&&(await row()).length===0);
 out.foreign=await req('/api/elections/2/voting-intention',body,{Origin:'https://foreign.invalid'});check('foreign origin403 without write',out.foreign.status===403&&(await row()).length===0);
 out.first=await req('/api/elections/2/voting-intention',body,{Origin:'http://127.0.0.1:5000'});createdId=out.first.body.intention?.id;
 check('real route commits first201',out.first.status===201&&Number.isInteger(createdId));
 let stored=await row();check('SQL persisted exact fields and null unsupported likelihood',stored.length===1&&stored[0].id===createdId&&stored[0].party_preference==='Undecided'&&stored[0].confidence==='low'&&stored[0].candidate_id===null&&stored[0].is_likely_voter===null);
 const first=JSON.stringify(stored);
 out.repeat=await req('/api/elections/2/voting-intention',body);check('repeat200 unchanged full row and xmin',out.repeat.status===200&&out.repeat.body.intention.id===createdId&&JSON.stringify(await row())===first);
 out.update=await req('/api/elections/2/voting-intention',{...body,confidence:'high'});check('update persists same id',out.update.status===200&&out.update.body.intention.id===createdId&&(await row())[0].confidence==='high');
 const foreign=(await pool.query('SELECT id FROM candidates WHERE election_id<>2 ORDER BY id LIMIT 1')).rows[0].id;
 const beforeRefusal=JSON.stringify(await row());
 out.foreignCandidate=await req('/api/elections/2/voting-intention',{candidateId:foreign});check('foreign candidate422 unchanged',out.foreignCandidate.status===422&&out.foreignCandidate.body.code==='candidate_not_in_election'&&JSON.stringify(await row())===beforeRefusal);
 out.spoof=await req('/api/elections/2/voting-intention',{...body,userId:'not-the-authenticated-subject'});check('body actor spoof422 unchanged',out.spoof.status===422&&JSON.stringify(await row())===beforeRefusal);
 const fresh=new pg.Pool({connectionString:process.env.DATABASE_URL});try{const r=(await fresh.query('SELECT confidence,is_likely_voter FROM user_voting_intentions WHERE id=$1',[createdId])).rows[0];check('independent new PG connection sees committed value',r?.confidence==='high'&&r.is_likely_voter===null);}finally{await fresh.end();}
 out.outcome='Worked';
}catch(e){out.error=e.message;out.outcome='Failed';process.exitCode=1;}
finally{
 if(createdId){const removed=await pool.query('DELETE FROM user_voting_intentions WHERE id=$1 AND session_id=$2 AND election_id=2 RETURNING id',[createdId,subject]);out.fixtureCleanup=removed.rowCount===1;if(!out.fixtureCleanup){out.outcome='Failed';process.exitCode=1;}}
 await pool.end();out.completedAt=new Date().toISOString();console.log(JSON.stringify(out));
}
