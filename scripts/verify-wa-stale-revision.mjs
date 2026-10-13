// Run inside the D-owned app only; fixture credentials never leave its environment.
if(new URL(process.env.DATABASE_URL).hostname!=='et6-prod-109656-3a740d1d-db')throw Error('Wrong private target');
const base='http://127.0.0.1:5000';
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'et6-admin@example.test',password:process.env.ET6_FIXTURE_PASSWORD})});
if(login.status!==200)throw Error('Login failed');
const cookie=login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
const before=await(await fetch(base+'/api/elections/4242401/results')).json();
const fields=['schemaVersion','electionId','status','reporting','source','sourcePayloadSha256','asOf','asOfBasis','retrievedAt','totalVotes','candidates','winnerCalledBy','certification','supersedesReportId'];
const input=Object.fromEntries(fields.map(k=>[k,before[k]]));
input.source={...input.source,name:input.source.name+' stale concurrency probe'};
input.note=null;input.expectedRevision='stale-invalid';input.idempotencyKey='D-private-stale-'+Date.now();
const r=await fetch(base+'/api/elections/4242401/results',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(input)});
const body=await r.json();const after=await(await fetch(base+'/api/elections/4242401/results')).json();
const receipt={at:new Date().toISOString(),status:r.status,body,reportUnchanged:before.reportId===after.reportId&&before.revision===after.revision&&JSON.stringify(before.candidates)===JSON.stringify(after.candidates)};
receipt.outcome=r.status===409&&body.code==='stale_revision'&&receipt.reportUnchanged?'Worked':'Failed';
console.log(JSON.stringify(receipt));if(receipt.outcome!=='Worked')process.exitCode=1;
