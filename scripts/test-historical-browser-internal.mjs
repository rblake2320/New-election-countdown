// New disposable internal-only environment. Never inspects/stops/replaces an existing runtime.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,cp,readdir,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
const exec=promisify(execFile);
const mode=process.env.ET6_RECEIVING_MODE??'historical';
if(!['historical','mixed'].includes(mode))throw Error('Unknown receiving mode');
const image=process.env.ET6_REPAIRED_IMAGE;
const builder=process.env.ET6_REPAIRED_BUILDER;
if(!/^sha256:[a-f0-9]{64}$/.test(image??'')||!/^sha256:[a-f0-9]{64}$/.test(builder??''))throw Error('Immutable repaired app and matching builder required before fixture creation');
const browserImage='sha256:7b13b1d7a5be26b94fd703b92382ad650719b9f939c4f3ffe710bc8c9a49591a';
const proxyImage='caddy@sha256:881bbc60f9986d5ab8e7cfd6cf7e4ef3c9c0439fef2429d035d065577882f028';
const runId=`${process.pid}-${randomBytes(4).toString('hex')}`,network=`et6-prod-${runId}`;
const hostname=network+'.internal',wrongHostname=network+'-wrong.internal',base='https://'+hostname;
const names={db:network+'-db',schema:network+'-schema',restore:network+'-restore',app:network+'-app'};
const label='org.electiontracker.et6-internal';
const dir=resolve('docs/evidence/et6/'+(mode==='mixed'?'mixed-browser-internal':'historical-browser-internal'),runId);await mkdir(dir,{recursive:true});
const report={outcome:'Running',startedAt:new Date().toISOString(),runId,image,builder,network,names,scope:'New disposable internal Docker network, no host ports; source-only pinned copy and synthetic auth',checks:[],cleanup:[]};
const save=()=>writeFile(resolve(dir,'receipt.json'),JSON.stringify(report,null,2));
const check=(name,ok)=>{report.checks.push({name,worked:!!ok});if(!ok)throw Error(name);};
const password=randomBytes(24).toString('hex'),jwt=randomBytes(32).toString('hex'),fixture=randomBytes(24).toString('hex');
const env={...process.env,APP_ORIGIN:base,APP_URL:base,POSTGRES_USER:'et6_receiving',POSTGRES_DB:'et6_receiving',POSTGRES_PASSWORD:password,DATABASE_URL:`postgresql://et6_receiving:${password}@${names.db}:5432/et6_receiving`,JWT_SECRET:jwt,CANDIDATE_JWT_SECRET:jwt,ET6_FIXTURE_PASSWORD:fixture,ET6_EXPECTED_DB_HOST:names.db,OFFICIAL_RESULTS_NETWORK_ENABLED:process.env.ET6_NETWORK_MODE??'true'};
async function docker(...args){try{return(await exec('docker',args,{env,timeout:300000,maxBuffer:12*1024*1024})).stdout.trim();}catch(e){throw Error(`Docker ${args[0]} failed (${e.code??'unknown'}); no credential output retained`);}}
const own=['--label',`${label}=${runId}`,'--network',network];
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
 check('network mode declared', ['true','false'].includes(env.OFFICIAL_RESULTS_NETWORK_ENABLED));report.officialNetworkMode=env.OFFICIAL_RESULTS_NETWORK_ENABLED;
 check('TLS orchestration reviewed before creation',process.env.ET6_TLS_TRUST_READY==='reviewed');
 const suppliedBundle=process.env.ET6_BROWSER_BUNDLE;if(!suppliedBundle)throw Error('Frozen B bundle required');
 const bundle=resolve(dir,'bundle');await cp(resolve(suppliedBundle),bundle,{recursive:true});
 const sums=await readFile(resolve(bundle,'SHA256SUMS'),'utf8');
 check('final reviewed B manifest',createHash('sha256').update(sums).digest('hex')===(mode==='mixed'?'7ad0b1c023b66e1018579ea824e88c6c8841ade558506a3acf60a262aee4b292':'45d6f411a1182952a7a45f19989782bb16f809784decdd4f564db3387bd18a82'));
 const listed=new Set();for(const line of sums.trim().split(/\r?\n/)){const m=line.match(/^([a-f0-9]{64})\s+\*?(.+)$/);if(!m||m[2].includes('..')||m[2].includes(':')||m[2].startsWith('/')||m[2].startsWith('\\')||listed.has(m[2].replace(/^\.\//,'')))throw Error('Invalid bundle manifest');listed.add(m[2].replace(/^\.\//,''));check('bundle '+m[2],createHash('sha256').update(await readFile(resolve(bundle,m[2]))).digest('hex')===m[1]);}
 async function inventory(root,prefix=''){const paths=[];for(const f of await readdir(resolve(root,prefix))){const rel=(prefix?prefix+'/':'')+f;const st=await lstat(resolve(root,rel));if(st.isSymbolicLink())throw Error('Fixture files cannot be symlinks');if(st.isDirectory())paths.push(...await inventory(root,rel));else paths.push(rel);}return paths;}
 check('full B package manifest',listed.size===176&&(await inventory(bundle)).filter(p=>p!=='SHA256SUMS').every(p=>listed.has(p))&&listed.has(mode==='mixed'?'mixed_happening_now.cjs':'historical_admin_74.cjs')&&listed.has('node_modules/playwright/package.json')&&listed.has('node_modules/playwright-core/package.json'));
 const prep=resolve(dir,'tls-prep');await cp(resolve('docs/evidence/et6/internal-tls-prep'),prep,{recursive:true});
 report.prepHashes={};for(const p of await inventory(prep))report.prepHashes[p]=createHash('sha256').update(await readFile(resolve(prep,p))).digest('hex');
 report.bundleManifestSha256=createHash('sha256').update(sums).digest('hex');report.browserImage=browserImage;report.proxyImage=proxyImage;report.base=base;
 check('immutable production image exists',await docker('image','inspect','--format','{{.Id}}',image)===image);
 check('immutable builder image exists',await docker('image','inspect','--format','{{.Id}}',builder)===builder);
 const snapshot=resolve(process.env.ET6_SOURCE_SNAPSHOT??'');
 check('pinned source-only snapshot',createHash('sha256').update(await readFile(snapshot)).digest('hex')==='a3901dba6dcc1158b19e3631e812b9f659a1c68480d35466b578d000d1d17719');
 await docker('network','create','--internal','--label',`${label}=${runId}`,network);
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
 await docker('run','-d','--name',names.app,...own,'-e','APP_ORIGIN','-e','APP_URL','-e','DATABASE_URL','-e','JWT_SECRET','-e','CANDIDATE_JWT_SECRET','-e','ET6_FIXTURE_PASSWORD','-e','ET6_EXPECTED_DB_HOST','-e','OFFICIAL_RESULTS_NETWORK_ENABLED',image);
 for(const name of [names.db,names.app])check('no host ports '+name,['{}','null'].includes(await docker('inspect','--format','{{json .HostConfig.PortBindings}}',name)));
 ready=false;for(let i=0;i<60;i++){try{await run("const r=await fetch('http://127.0.0.1:5000/api/health');if(r.status!==200||(await r.json()).ok!==true)throw Error('not ready')");ready=true;break;}catch{await pause();}}check('actual production entrypoint ready',ready);
 report.registration=JSON.parse(await run("const r=await fetch('http://127.0.0.1:5000/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'et6-admin@example.test',password:process.env.ET6_FIXTURE_PASSWORD})});console.log(JSON.stringify({status:r.status}));if(r.status!==201)process.exitCode=1;"));
 check('new synthetic auth fixture registered',report.registration.status===201);
 await run("import pg from 'pg';const p=new pg.Pool({connectionString:process.env.DATABASE_URL});try{const r=await p.query(\"UPDATE users SET role='admin' WHERE email='et6-admin@example.test' RETURNING id\");if(r.rowCount!==1)throw Error('fixture account mismatch');}finally{await p.end();}");
 await docker('exec',names.app,'mkdir','-p','/tmp/et6-manual');
 for(const state of ['nc','la'])await docker('cp',resolve('artifacts/source-packet',state+'-manual'),names.app+':/tmp/et6-manual/');
 if(mode==='historical')report.seed=await receivingScript('scripts/seed-historical-internal.mjs','historical-posts.json');
 const proxy=network+'-tls';
 const caddy=resolve(dir,'Caddyfile');
 await writeFile(caddy,`{
 skip_install_trust
 fallback_sni ${hostname}
}
https://${hostname} {
 tls internal
 reverse_proxy ${names.app}:5000
}
:443 {
 reverse_proxy ${names.app}:5000
}
`);
 await docker('run','-d','--name',proxy,...own,'--network-alias',hostname,'--network-alias',wrongHostname,'--tmpfs','/data','--tmpfs','/config','-v',dir+':/et6-config:ro',proxyImage,'caddy','run','--config','/et6-config/Caddyfile');
 const caFile=resolve(dir,'fixture-ca.crt');
 let caReady=false;for(let i=0;i<20;i++){try{await writeFile(caFile,await docker('exec',proxy,'cat','/data/caddy/pki/authorities/local/root.crt'));caReady=true;break;}catch{await pause();}}check('ephemeral proxy CA ready',caReady);
 check('proxy has no host ports',['{}','null'].includes(await docker('inspect','--format','{{json .HostConfig.PortBindings}}',proxy)));
 // Pin the generated leaf for BOTH DNS aliases: the negative control must
 // reach this exact certificate and fail hostname validation, not DNS/SNI routing.
 const leaf='/data/caddy/certificates/local/'+hostname+'/'+hostname;
 let leafReady=false;for(let i=0;i<30;i++){try{await docker('exec',proxy,'test','-s',leaf+'.crt');leafReady=true;break;}catch{await pause();}}check('exact generated leaf ready',leafReady);
 await writeFile(resolve(dir,'fixture-leaf.crt'),await docker('exec',proxy,'cat',leaf+'.crt'));
 env.BASE=base;env.WRONG_BASE='https://'+wrongHostname;
 env.UPSTREAM='http://'+names.app+':5000';
 report.tlsControls=[];
 for(const trusted of [false,true]){
  env.CA_TRUSTED=String(trusted);
  const controlArgs=['run','--rm','--init','--name',network+'-browser',...own,'--shm-size=1g','-v',bundle+':/harness:ro','-v',prep+':/prep:ro','-v',caFile+':/run/et6-ca/root.crt:ro','-v',resolve(dir,'fixture-leaf.crt')+':/run/et6-ca/leaf.crt:ro','-e','BASE','-e','WRONG_BASE','-e','CA_TRUSTED',browserImage,'sh','-c',(trusted?'sh /prep/prepare-trust.sh >&2 && ':'')+'runuser -u pwuser -- env HOME=/home/pwuser '+(trusted?'NODE_EXTRA_CA_CERTS=/run/et6-ca/root.crt ':'')+'node /prep/tls-controls.mjs'];
  const control=await exec('docker',controlArgs,{env,timeout:240000,maxBuffer:2*1024*1024}).then(r=>({exit:0,stdout:r.stdout,stderr:r.stderr}),e=>({exit:e.code,stdout:e.stdout??'',stderr:e.stderr??''}));
  await writeFile(resolve(dir,'tls-'+(trusted?'trusted':'absent')+'.json'),JSON.stringify(control,null,2));
  report.tlsControls.push({trusted,exit:control.exit});check('actual TLS controls '+trusted,control.exit===0&&JSON.parse(control.stdout).outcome==='Worked');
 }
 const headerArgs=['run','--rm','--name',network+'-browser',...own,'-v',prep+':/prep:ro','-v',caFile+':/run/et6-ca/root.crt:ro','-e','BASE','-e','UPSTREAM','-e','NODE_EXTRA_CA_CERTS=/run/et6-ca/root.crt',browserImage,'node','/prep/headers.mjs'];
 const headerOutput=await docker(...headerArgs);await writeFile(resolve(dir,'headers.json'),headerOutput);check('unchanged upstream/proxy security headers and document bytes',JSON.parse(headerOutput).outcome==='Worked');
 const protectedRows=String.raw`import pg from 'pg';import{createHash}from'node:crypto';const p=new pg.Pool({connectionString:process.env.DATABASE_URL});try{const ts=(await p.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE '%result%' OR tablename='candidates') ORDER BY tablename")).rows;const result={};for(const {tablename:t}of ts){if(!/^[a-z_]+$/.test(t))throw Error('table guard');const rows=(await p.query('SELECT to_jsonb(t) row FROM public."'+t+'" t ORDER BY to_jsonb(t)::text')).rows;result[t]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}console.log(JSON.stringify(result));}finally{await p.end();}`;
 report.protectedBefore=JSON.parse(await run(protectedRows));
 report.browsers=[];
 if(mode==='mixed'){
  const {runMixedBrowserStage}=await import('./run-mixed-browser-stage.mjs');
  await runMixedBrowserStage({docker,exec,env,names,network,label,runId,dir,bundle,prep,caFile,browserImage,base,check,save,report});
 }else for(const engine of ['chromium','firefox','webkit'])for(const width of [1280,390]){
  const outDir=resolve(dir,engine+'-'+width);await mkdir(outDir,{recursive:true});
  env.BASE=base;env.ADMIN_PASSWORD=fixture;env.OUT='/out';env.BROWSER=engine;env.WIDTH=String(width);
  const args=['run','--rm','--init','--name',network+'-browser','--label',`${label}=${runId}`,'--network',network,'--shm-size=1g','-v',bundle+':/harness:ro','-v',prep+':/prep:ro','-v',caFile+':/run/et6-ca/root.crt:ro','-v',outDir+':/out','-e','BASE','-e','ADMIN_PASSWORD','-e','OUT','-e','BROWSER','-e','WIDTH',browserImage,'sh','-c','sh /prep/prepare-trust.sh && runuser -u pwuser -- env HOME=/home/pwuser NODE_EXTRA_CA_CERTS=/run/et6-ca/root.crt FIREFOX_PROFILE_DIR=/tmp/et6-firefox-profile node /harness/historical_admin_74.cjs'];
  const result=await exec('docker',args,{env,timeout:180000,maxBuffer:1024*1024}).then(r=>({exit:0,stdout:r.stdout,stderr:r.stderr}),e=>({exit:e.code,stdout:e.stdout??'',stderr:e.stderr??''}));
  await writeFile(resolve(outDir,'execution.json'),JSON.stringify(result,null,2));report.browsers.push({engine,width,exit:result.exit});await save();
  if(result.exit!==0)throw Error('Browser acceptance failed '+engine+'/'+width);
  const security=JSON.parse(await readFile(resolve(outDir,'security.json'),'utf8'));
  check(engine+'/'+width+' authenticated cookie attributes',security.cookies.length>0&&security.cookies.every(c=>c.secure&&c.httpOnly&&c.sameSite==='Lax'));
  const headers=JSON.parse(headerOutput);
  for(const path of ['/auth','/admin/results']){
   const actual=security.documents.filter(d=>d.url===path);const expected=headers.checks.find(c=>c.path===path);
   check(engine+'/'+width+' document retained '+path,actual.length>0);
   for(const doc of actual)check(engine+'/'+width+' shipped document and security headers '+path,doc.status===200&&doc.bodySha256===expected.proxyBodySha256&&Object.entries(expected.proxyHeaders).every(([key,value])=>(doc.headers[key]??null)===value));
  }
 }
 report.protectedAfter=JSON.parse(await run(protectedRows));check('all results and profiles unchanged by browser receiving',JSON.stringify(report.protectedBefore)===JSON.stringify(report.protectedAfter));

 const sourceCheck=String.raw`import pg from 'pg';import{createHash}from'node:crypto';const p=new pg.Pool({connectionString:process.env.DATABASE_URL});const tables=['elections','candidates','candidate_source_records','general_candidate_list_snapshots','candidate_ingest_runs','election_catalog_correction_runs','official_results_sync_runs'];function canon(v){if(Array.isArray(v))return '['+v.map(canon).join(',')+']';if(v!==null&&typeof v==='object')return '{'+Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>JSON.stringify(k)+':'+canon(x)).join(',')+'}';return JSON.stringify(v);}try{const values={};for(const t of tables)values[t]=(await p.query('SELECT to_jsonb(t) AS row FROM public."'+t+'" t '+(t==='elections'?'WHERE t.id NOT IN (4242404,4242405) ':'')+'ORDER BY t.id')).rows.map(x=>x.row);console.log(JSON.stringify({sha256:createHash('sha256').update(canon(values)).digest('hex'),counts:Object.fromEntries(tables.map(t=>[t,values[t].length]))}));}finally{await p.end();}`;
 report.sourceAfter=JSON.parse(await run(sourceCheck));check('all seven source tables unchanged after runtime receiving',report.sourceAfter.sha256==='769c35bb4b850257f9409ee567da95e00b271855d510cbb0015e8557e431f93a');
 report.outcome='Worked';
}catch(e){report.outcome='Failed';report.error=e.message;process.exitCode=1;}
finally{
 for(const name of [network+'-tls',names.app]){try{await writeFile(resolve(dir,name.endsWith('-tls')?'proxy.log':'app.log'),await docker('logs','--tail','160',name));}catch{/* Preserve original failure if a container was never created. */}}
 // Exact generated names and independent ownership checks; never selects existing5094.
 for(const name of [network+'-browser',...['firefox','webkit'].flatMap(engine=>[1280,390].map(width=>`${network}-browser-${engine}-${width}`)),network+'-tls',names.schema,names.app,names.restore,names.db]){
  try{const existing=(await docker('container','ls','-a','--format','{{.Names}}')).split(/\r?\n/);if(!existing.includes(name)){report.cleanup.push({name,outcome:'absent'});continue;}
   if(!name.startsWith(network+'-')||await docker('inspect','--format',`{{index .Config.Labels "${label}"}}`,name)!==runId)throw Error('ownership mismatch');
   await docker('rm','-f',name);report.cleanup.push({name,outcome:'removed'});
  }catch(e){report.cleanup.push({name,outcome:'Failed',error:e.message});report.outcome='Failed';process.exitCode=1;}
 }
 try{if((await docker('network','ls','--format','{{.Name}}')).split(/\r?\n/).includes(network)){if(await docker('network','inspect','--format',`{{index .Labels "${label}"}}`,network)!==runId)throw Error('network ownership mismatch');await docker('network','rm',network);}report.cleanup.push({name:network,outcome:'removed or absent'});}catch(e){report.cleanup.push({name:network,outcome:'Failed',error:e.message});report.outcome='Failed';process.exitCode=1;}
 report.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({outcome:report.outcome,error:report.error,receipt:resolve(dir,'receipt.json')}));
}
