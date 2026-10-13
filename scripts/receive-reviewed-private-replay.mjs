import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const phase = process.argv[2];
if (!['default','initial','recount'].includes(phase)) throw Error('Expected default, initial or recount');
const receiptKey=process.argv[3]??phase;
if(!/^[a-z0-9-]+$/.test(receiptKey))throw Error('Invalid receipt key');
const app='et6-prod-109656-3a740d1d-app', db='et6-prod-109656-3a740d1d-db', network='et6-prod-109656-3a740d1d';
const label='org.electiontracker.et6-receiving', runId='109656-3a740d1d';
const image=process.env.ET6_RECEIVING_IMAGE??'sha256:5dd7b582980963dc1d7f246877c9b186a5777947c562563c7cfc7cad1c1ffd99';
if(!/^sha256:[a-f0-9]{64}$/.test(image))throw Error('Immutable image ID required');
const docker=(args,env=process.env)=>{try{return execFileSync('docker',args,{encoding:'utf8',env,timeout:180000,maxBuffer:8*1024*1024}).trim();}catch{throw Error('Docker operation failed: '+args[0]);}};
const old=JSON.parse(docker(['inspect',app]))[0], database=JSON.parse(docker(['inspect',db]))[0];
if(old.Config.Labels[label]!==runId||database.Config.Labels[label]!==runId||database.HostConfig.PortBindings?.['5432/tcp']?.length)throw Error('Ownership/isolation mismatch');
const env={...process.env};
for(const line of old.Config.Env){const at=line.indexOf('=');const key=line.slice(0,at);if(['DATABASE_URL','JWT_SECRET','CANDIDATE_JWT_SECRET','ET6_FIXTURE_PASSWORD','APP_ORIGIN'].includes(key))env[key]=line.slice(at+1);}
const url=new URL(env.DATABASE_URL);
if(url.hostname!==db||url.port!=='5432'||url.pathname!=='/et6_receiving'||url.search||url.hash)throw Error('Wrong destination');
for(const key of Object.keys(env))if(key.startsWith('OFFICIAL_RESULTS_'))delete env[key];
if(phase!=='default')Object.assign(env,{
 OFFICIAL_RESULTS_REPLAY:'private_fixture',OFFICIAL_RESULTS_NETWORK_ENABLED:'false',
 OFFICIAL_RESULTS_REPLAY_TARGET_ID:'et6-d-source-copy-20261013',
 OFFICIAL_RESULTS_REPLAY_TARGET_SHA256:'6eaa1762c8da047f03d9b263244092cd8e62093fd39b315f23c499ab598ff12d',
 OFFICIAL_RESULTS_SOURCE_PACKET:`wa/${phase}.packet.json`,
 OFFICIAL_RESULTS_SOURCE_PACKET_SHA256:phase==='initial'?'c829680c33da6d5e1eb8a4caf1b3ac489d2906d5284aade91d1bf24bea747660':'637e7671bc1cbc71c859e160aac2393c26a646342f9c81f292be0d838066bff2',
});
const args=['run','-d','--name',app,'--label',`${label}=${runId}`,'--network',network,'-p','127.0.0.1:5094:5000'];
for(const key of ['DATABASE_URL','JWT_SECRET','CANDIDATE_JWT_SECRET','ET6_FIXTURE_PASSWORD','APP_ORIGIN',...Object.keys(env).filter(k=>k.startsWith('OFFICIAL_RESULTS_'))])if(env[key])args.push('-e',key);
docker(['stop',app]); docker(['rename',app,`${app}-before-${receiptKey}`]);
docker([...args,image],env);
for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:5094/api/health');if(r.status===200&&(await r.json()).ok)break;}catch{}if(i===39)throw Error('Health timeout');await new Promise(r=>setTimeout(r,1000));}
const code=String.raw`
import pg from 'pg';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const phase=process.argv[1],base='http://127.0.0.1:5000',pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const out={phase,startedAt:new Date().toISOString(),outcome:'Running'};
try{
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'et6-admin@example.test',password:process.env.ET6_FIXTURE_PASSWORD})});
if(login.status!==200)throw Error('Fixture login failed');
const cookie=login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
const req=async(path,options={})=>{const r=await fetch(base+path,{...options,headers:{Cookie:cookie,...options.headers}});const text=await r.text();return{status:r.status,etag:r.headers.get('etag'),body:text?JSON.parse(text):null};};
if(phase!=='default'){
const packet=JSON.parse(await readFile('/app/data/official-results/live/replay/wa/'+phase+'.packet.json','utf8'));
const t=packet.targetBinding;
await pool.query('INSERT INTO elections(id,title,location,state,date,type,level,description) VALUES($1,$2,$3,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING',[t.id,t.title,t.state,t.date,t.type,t.level,'Private receiving of an actual historical official recording']);
const actual=(await pool.query("SELECT id,title,state,to_char(date,'YYYY-MM-DD') AS date,type,level FROM elections WHERE id=$1",[t.id])).rows[0];
for(const k of Object.keys(t))if(actual[k]!==t[k])throw Error('Target mismatch '+k);
out.target=actual;out.before=await req('/api/results?ids='+t.id);
}
out.trigger=await req('/api/admin/results-ingestion/trigger',{method:'POST'});
out.status=await req('/api/admin/results-ingestion/status');
if(out.trigger.status!==200||out.status.status!==200)throw Error('Ingestion failed');
if(phase!=='default'){
out.detail=await req('/api/elections/4242401/results');
const p=out.detail.body;if(p.totalVotes!==(phase==='initial'?1903073:1903115)||p.status!=='certified'||p.candidates.length!==8)throw Error('Actual parsed result mismatch');
out.batch=await req('/api/results?ids=4242401',{headers:{'If-None-Match':out.before.etag}});
out.cached=await req('/api/results?ids=4242401',{headers:{'If-None-Match':out.batch.etag}});
if(out.cached.status!==304)throw Error('Cache did not return304');
out.repeatTrigger=await req('/api/admin/results-ingestion/trigger',{method:'POST'});
out.repeat=await req('/api/elections/4242401/results');
if(out.repeat.body.reportId!==p.reportId)throw Error('Repeat created a report');
out.sql=(await pool.query('SELECT count(*)::int AS lines,sum(votes)::text AS votes FROM candidate_result_lines WHERE report_id=$1',[p.reportId])).rows[0];
if(out.sql.lines!==8||Number(out.sql.votes)!==p.totalVotes)throw Error('SQL mismatch');
out.evidence=[];
const packet=JSON.parse(await readFile('/app/data/official-results/live/replay/wa/'+phase+'.packet.json','utf8'));
for(const f of packet.files){const b=await readFile('/app/data/official-results/live/replay/wa/'+f.path);const stored=(await pool.query('SELECT bytes FROM result_evidence_blobs WHERE sha256=$1',[f.sha256])).rows[0]?.bytes;if(!stored||!stored.equals(b)||createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('Evidence byte mismatch');out.evidence.push({path:f.path,sha256:f.sha256,bytes:b.length,equals:true});}
}
out.outcome='Worked';
}catch(e){out.outcome='Failed';out.error=e.message;process.exitCode=1;
// Stop private automatic retries after a failed receiving assertion.
try{const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'et6-admin@example.test',password:process.env.ET6_FIXTURE_PASSWORD})});const cookie=r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');out.stopStatus=(await fetch(base+'/api/admin/results-ingestion/stop',{method:'POST',headers:{Cookie:cookie}})).status;}catch{out.stopStatus='failed';}
}finally{await pool.end();out.completedAt=new Date().toISOString();console.log(JSON.stringify(out));}
`;
const dir='docs/evidence/et6/wa-production';mkdirSync(dir,{recursive:true});
let output;
try{output=execFileSync('docker',['exec',app,'node','--input-type=module','-e',code,phase],{encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});}
catch(e){output=e.stdout||JSON.stringify({outcome:'Failed',error:'Receiving execution failed'});process.exitCode=1;}
writeFileSync(`${dir}/${receiptKey}.json`,output);
writeFileSync(`${dir}/${receiptKey}-runtime.json`,JSON.stringify({phase,image,app,db,port:5094,at:new Date().toISOString()},null,2));
const summary=JSON.parse(output);console.log(JSON.stringify({phase,outcome:summary.outcome,error:summary.error,completedAt:summary.completedAt}));
