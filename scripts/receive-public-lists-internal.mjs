// Actual HTTP fault/recovery against a disposable internal-only fixture only.
import pg from 'pg';
const u=new URL(process.env.DATABASE_URL??''),host=process.env.ET6_EXPECTED_DB_HOST;
if(!host||!/^et6-prod-\d+-[a-f0-9]{8}-db$/.test(host)||host==='et6-prod-109656-3a740d1d-db'||u.hostname!==host||u.port!=='5432'||u.pathname!=='/et6_receiving'||u.search||u.hash)throw Error('New disposable private destination required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const out={scope:'Actual production entrypoint with temporary missing relation in new disposable PG; no provider mocking',at:new Date().toISOString(),checks:[],outcome:'Running'};
const paths=['/api/elections','/api/elections/search?query=NC','/api/elections/counts','/api/elections/missing-candidates?window=60'];
const read=async path=>{const r=await fetch('http://127.0.0.1:5000'+path,{signal:AbortSignal.timeout(15000)});return{path,status:r.status,body:await r.json()};};
const check=(name,ok)=>{out.checks.push({name,worked:!!ok});if(!ok)throw Error(name);};
let renamed=false;
try{
 check('fault relation absent',(await pool.query("SELECT to_regclass('public.et6_fault_elections') AS existing")).rows[0].existing===null);
 out.before=[];for(const path of paths){const r=await read(path);out.before.push(r);check('normal200 '+path,r.status===200);}
 const grouped=(await pool.query("SELECT lower(trim(type)) AS kind,count(*)::int AS n FROM elections GROUP BY lower(trim(type))")).rows;
 const expected=Object.fromEntries(grouped.map(r=>[r.kind,r.n]));
 const counts=out.before[2].body;
 check('counts match independent SQL normalized aliases',counts.total===grouped.reduce((n,r)=>n+r.n,0)&&['Primary','General','Special'].every(k=>counts.byType[k]===(expected[k.toLowerCase()]??0)));
 out.invalidWindow=await read('/api/elections/missing-candidates?window=abc');check('invalid window400',out.invalidWindow.status===400);
 out.location=await read('/api/elections-by-location?address=Raleigh%2C%20NC');check('missing geocoder is503 rather than invalid address400',out.location.status===503&&out.location.body.code==='geocoder_unavailable');
 out.geocoder=[];for(const path of ['/api/geocode?address=Raleigh%2C%20NC','/api/reverse-geocode?lat=35.78&lng=-78.64','/api/validate-address?address=Raleigh%2C%20NC']){const r=await read(path);out.geocoder.push(r);check('configuration typed503 '+path,r.status===503&&r.body.code==='geocoder_unavailable');}
 out.empty=await read('/api/elections?search=ET6_NO_SUCH_RACE_74b95c29');check('legitimate empty filter200',out.empty.status===200&&Array.isArray(out.empty.body)&&out.empty.body.length===0);
 await pool.query('ALTER TABLE public.elections RENAME TO et6_fault_elections');renamed=true;
 out.failed=[];for(const path of paths){const r=await read(path);out.failed.push(r);check('missing relation typed503 '+path,r.status===503&&r.body.code==='listing_unavailable'&&!Array.isArray(r.body));}
}catch(e){out.error=e.message;out.outcome='Failed';process.exitCode=1;}
finally{
 if(renamed){await pool.query('ALTER TABLE public.et6_fault_elections RENAME TO elections');out.relationRestored=true;}
 if(renamed){out.recovered=[];for(const path of paths){const r=await read(path);out.recovered.push(r);if(r.status!==200){out.error='recovery '+path;process.exitCode=1;}}}
 out.outcome=!out.error&&out.relationRestored&&out.checks.every(x=>x.worked)?'Worked':'Failed';if(out.outcome!=='Worked')process.exitCode=1;
 await pool.end();out.completedAt=new Date().toISOString();console.log(JSON.stringify(out));
}
