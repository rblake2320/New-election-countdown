// Offline old-image negative control: real539 source members + one synthetic
// legacy DB row, mocked read boundary, no network/database/app execution.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {syncOfficialCongress} from '/app/dist/offline-old-congress.mjs';
const actual=JSON.parse(readFileSync('/app/data/congress/119/official-current-members.json','utf8'));
const rows=actual.members.map((m,i)=>({id:i+1,bioguide_id:m.bioguideId,name:m.name,party:m.partyRaw,state:m.state,district:m.district,chamber:m.chamber,congress:119}));
rows.push({id:540,bioguide_id:'IMPORT_SYNTHETIC_SCOPE_CONTROL',name:'SYNTHETIC_UNVERIFIED_LEGACY',party:'R',state:'ZZ',district:'01',chamber:'House',congress:119});
const client={query:async(sql)=>sql.includes('to_regclass')?{rows:[{members:'congress_members',audit:'congress_official_import_runs'}]}:sql.includes('to_jsonb(m)')?{rows:rows.map(row=>({row}))}:{rows:[]},release:()=>{}};
const receipt=await syncOfficialCongress({connect:async()=>client});
console.log(JSON.stringify({outcome:receipt.catalogComplete===false?'Worked':'Failed',scenario:'dry-run-with-all-official-members-and-one-unreviewed-legacy-row',expectedCatalogComplete:false,actualCatalogComplete:receipt.catalogComplete,sourceCoverageComplete:receipt.sourceCoverageComplete,unreviewedLegacyRowIds:receipt.unreviewedLegacyRowIds,sourceFileSha256:createHash('sha256').update(readFileSync('/app/server/congress-official-import.ts')).digest('hex'),boundary:'Actual retained image source; DB read mocked; no sockets/network or user-visible synthetic data'}));
