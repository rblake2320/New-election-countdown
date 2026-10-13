// New disposable internal-only environment. Never inspects/stops/replaces an existing runtime.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const exec=promisify(execFile);
const image='sha256:4fd2c2f8427c1271b3502824dce782006257b0f77a3d88524ecc936867f403f1';
const builder='sha256:1b0a3a14c046439e9ffccd359e912ec5fa765e00f98a4e64c77323d50498ff6c';
const runId=`${process.pid}-${randomBytes(4).toString('hex')}`,network=`et6-prod-${runId}`;
const names={db:network+'-db',schema:network+'-schema',restore:network+'-restore',app:network+'-app'};
const label='org.electiontracker.et6-internal';
const dir=resolve('docs/evidence/et6/final-image-load',runId);await mkdir(dir,{recursive:true});
const report={outcome:'Running',startedAt:new Date().toISOString(),runId,image,builder,network,names,scope:'New disposable internal Docker network, no host ports; source-only pinned copy and existing 10-client20/40RPS60s profile',checks:[],cleanup:[]};
const save=()=>writeFile(resolve(dir,'receipt.json'),JSON.stringify(report,null,2));
const check=(name,ok)=>{report.checks.push({name,worked:!!ok});if(!ok)throw Error(name);};
const password=randomBytes(24).toString('hex'),jwt=randomBytes(32).toString('hex'),fixture=randomBytes(24).toString('hex');
const env={...process.env,POSTGRES_USER:'et6_receiving',POSTGRES_DB:'et6_receiving',POSTGRES_PASSWORD:password,DATABASE_URL:`postgresql://et6_receiving:${password}@${names.db}:5432/et6_receiving`,JWT_SECRET:jwt,CANDIDATE_JWT_SECRET:jwt,ET6_FIXTURE_PASSWORD:fixture,ET6_EXPECTED_DB_HOST:names.db,OFFICIAL_RESULTS_NETWORK_ENABLED:'false'};
async function docker(...args){try{return(await exec('docker',args,{env,timeout:300000,maxBuffer:12*1024*1024})).stdout.trim();}catch(e){throw Error(`Docker ${args[0]} failed (${e.code??'unknown'}); no credential output retained`);}}
const own=['--label','org.electiontracker.et6-receiving='+runId,'--label',`${label}=${runId}`,'--network',network];
const run=code=>docker('exec',names.app,'node','--input-type=module','-e',code);
async function receivingScript(file,receiptName){
 const code=await readFile(file,'utf8');
 const result=await exec('docker',['exec',names.app,'node','--input-type=module','-e',code],{env,timeout:300000,maxBuffer:12*1024*1024}).then(r=>({exit:0,stdout:r.stdout}),e=>({exit:e.code,stdout:e.stdout??''}));
 await writeFile(resolve(dir,receiptName),result.stdout);
 const receipt=JSON.parse(result.stdout);check(receiptName+' exit and outcome',result.exit===0&&receipt.outcome==='Worked');return receipt;
}
const pause=()=>new Promise(r=>setTimeout(r,1000));
await save();
try{
 check('immutable production image exists',await docker('image','inspect','--format','{{.Id}}',image)===image);
 check('immutable builder image exists',await docker('image','inspect','--format','{{.Id}}',builder)===builder);
 const snapshot=resolve(process.env.ET6_SOURCE_SNAPSHOT??'');
 check('pinned source-only snapshot',createHash('sha256').update(await readFile(snapshot)).digest('hex')==='a3901dba6dcc1158b19e3631e812b9f659a1c68480d35466b578d000d1d17719');
 await docker('network','create','--internal','--label','org.electiontracker.et6-receiving='+runId,'--label',`${label}=${runId}`,network);
 check('network has no external route',await docker('network','inspect','--format','{{.Internal}}',network)==='true');
 await docker('run','-d','--name',names.db,...own,'--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_USER','-e','POSTGRES_DB','-e','POSTGRES_PASSWORD','postgres:16-alpine');
 let ready=false;for(let i=0;i<30;i++){try{await docker('exec',names.db,'pg_isready','-U','et6_receiving','-d','et6_receiving');ready=true;break;}catch{await pause();}}check('fresh private PG ready',ready);
 await writeFile(resolve(dir,'schema.log'),await docker('run','--rm','--name',names.schema,...own,'-e','DATABASE_URL','--entrypoint','node_modules/.bin/drizzle-kit',builder,'push','--force'));
 for(const migration of ['20261011_live_results_reports.sql','20261013_result_source_health.sql']){
  await docker('cp',resolve('migrations',migration),names.db+':/tmp/'+migration);
  await docker('exec',names.db,'psql','-v','ON_ERROR_STOP=1','-U','et6_receiving','-d','et6_receiving','-f','/tmp/'+migration);
 }
 const restoreCode=await readFile('scripts/restore-et6-increment-snapshot.mjs','utf8');
 await docker('create','--name',names.restore,...own,'-e','DATABASE_URL','-e','ET6_EXPECTED_DB_HOST','--entrypoint','node',builder,'--input-type=module','-e',restoreCode);
 await docker('cp',snapshot,names.restore+':/tmp/source-snapshot.json');
 const restored=await docker('start','-a',names.restore);await writeFile(resolve(dir,'source-restore.json'),restored);
 check('source-only full-row digest restored',await docker('inspect','--format','{{.State.ExitCode}}',names.restore)==='0'&&JSON.parse(restored).sourceSha256==='769c35bb4b850257f9409ee567da95e00b271855d510cbb0015e8557e431f93a');
 await docker('run','-d','--name',names.app,...own,'-e','DATABASE_URL','-e','JWT_SECRET','-e','CANDIDATE_JWT_SECRET','-e','ET6_FIXTURE_PASSWORD','-e','ET6_EXPECTED_DB_HOST','-e','OFFICIAL_RESULTS_NETWORK_ENABLED',image);
 for(const name of [names.db,names.app])check('no host ports '+name,['{}','null'].includes(await docker('inspect','--format','{{json .HostConfig.PortBindings}}',name)));
 ready=false;for(let i=0;i<60;i++){try{await run("const r=await fetch('http://127.0.0.1:5000/api/health');if(r.status!==200||(await r.json()).ok!==true)throw Error('not ready')");ready=true;break;}catch{await pause();}}check('actual production entrypoint ready',ready);
 check('actual batch baseline has506 healthy races',JSON.parse(await run("const r=await fetch('http://127.0.0.1:5000/api/results?date=2026-11-03');const b=await r.json();console.log(JSON.stringify(r.status===200&&b.results.length===506&&(!b.errors||b.errors.length===0)));"))===true);
 const loadScript=resolve('scripts/test-et6-load.mjs');
 report.loadScriptSha256=createHash('sha256').update(await readFile(loadScript)).digest('hex');
 const loadInput={outcome:'Worked',resourcesRetained:true,image,imageId:image,resources:{runId,network,app:names.app}};
 const loadInputPath=resolve(dir,'load-input.json');await writeFile(loadInputPath,JSON.stringify(loadInput,null,2));
 const loaded=await exec(process.execPath,[loadScript,loadInputPath],{timeout:240000,maxBuffer:4*1024*1024}).then(r=>({exit:0,stdout:r.stdout,stderr:r.stderr}),e=>({exit:e.code,stdout:e.stdout??'',stderr:e.stderr??''}));
 await writeFile(resolve(dir,'load-execution.json'),JSON.stringify(loaded,null,2));
 report.load=JSON.parse(loaded.stdout);check('existing load profile worked',loaded.exit===0&&report.load.outcome==='Worked');
 const sourceCheck=String.raw`import pg from 'pg';import{createHash}from'node:crypto';const p=new pg.Pool({connectionString:process.env.DATABASE_URL});const tables=['elections','candidates','candidate_source_records','general_candidate_list_snapshots','candidate_ingest_runs','election_catalog_correction_runs','official_results_sync_runs'];function canon(v){if(Array.isArray(v))return '['+v.map(canon).join(',')+']';if(v!==null&&typeof v==='object')return '{'+Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>JSON.stringify(k)+':'+canon(x)).join(',')+'}';return JSON.stringify(v);}try{const values={};for(const t of tables)values[t]=(await p.query('SELECT to_jsonb(t) AS row FROM public."'+t+'" t ORDER BY t.id')).rows.map(x=>x.row);console.log(JSON.stringify({sha256:createHash('sha256').update(canon(values)).digest('hex'),counts:Object.fromEntries(tables.map(t=>[t,values[t].length]))}));}finally{await p.end();}`;
 report.sourceAfter=JSON.parse(await run(sourceCheck));check('all seven source tables unchanged after runtime receiving',report.sourceAfter.sha256==='769c35bb4b850257f9409ee567da95e00b271855d510cbb0015e8557e431f93a');
 report.outcome='Worked';
}catch(e){report.outcome='Failed';report.error=e.message;process.exitCode=1;}
finally{
 // Exact generated names and independent ownership checks; never selects existing5094.
 for(const name of [names.schema,names.app,names.restore,names.db]){
  try{const existing=(await docker('container','ls','-a','--format','{{.Names}}')).split(/\r?\n/);if(!existing.includes(name)){report.cleanup.push({name,outcome:'absent'});continue;}
   if(!name.startsWith(network+'-')||await docker('inspect','--format',`{{index .Config.Labels "${label}"}}`,name)!==runId)throw Error('ownership mismatch');
   await docker('rm','-f',name);report.cleanup.push({name,outcome:'removed'});
  }catch(e){report.cleanup.push({name,outcome:'Failed',error:e.message});report.outcome='Failed';process.exitCode=1;}
 }
 try{if((await docker('network','ls','--format','{{.Name}}')).split(/\r?\n/).includes(network)){if(await docker('network','inspect','--format',`{{index .Labels "${label}"}}`,network)!==runId)throw Error('network ownership mismatch');await docker('network','rm',network);}report.cleanup.push({name:network,outcome:'removed or absent'});}catch(e){report.cleanup.push({name:network,outcome:'Failed',error:e.message});report.outcome='Failed';process.exitCode=1;}
 report.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({outcome:report.outcome,error:report.error,receipt:resolve(dir,'receipt.json')}));
}
