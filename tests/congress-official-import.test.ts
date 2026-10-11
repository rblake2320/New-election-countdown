import {beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const mock=vi.hoisted(()=>({rows:[] as any[],writes:vi.fn(),connect:vi.fn()}));
vi.mock('../server/db',()=>({db:{select:()=>({from:async()=>mock.rows}),delete:mock.writes,insert:mock.writes},pool:{connect:mock.connect}}));
import {CongressImportService} from '../server/congress-import-service';
import {loadOfficialCongressSnapshot,defaultOfficialCongressManifestPath,validateOfficialCongressSnapshot,syncOfficialCongress,LegacyCongressImportRefused,sourceCoverageComplete,OFFICIAL_CONGRESS_MANIFEST_SHA} from '../server/congress-official-import';
const actual=JSON.parse(readFileSync('data/congress/119/official-current-members.json','utf8'));
beforeEach(()=>{mock.rows=[];mock.writes.mockClear();mock.connect.mockClear();});
describe('reviewed official Congress admission',()=>{
  it('legacy import refuses before any read/write or pool acquisition',async()=>{
    await expect(new CongressImportService().importFromCompleteDataset()).rejects.toBeInstanceOf(LegacyCongressImportRefused);
    expect(mock.writes).not.toHaveBeenCalled();expect(mock.connect).not.toHaveBeenCalled();
  });
  it('loads539 occupied real identities and two explicit null-person vacancies',()=>{
    const loaded=loadOfficialCongressSnapshot();expect(loaded.manifestSha256).toBe(OFFICIAL_CONGRESS_MANIFEST_SHA);expect(loaded.snapshot.members).toHaveLength(539);expect(loaded.snapshot.vacancies).toHaveLength(2);
  });
  it('source-tree fallback resolves the reviewed asset relative to module location',()=>{
    expect(defaultOfficialCongressManifestPath().replaceAll('\\','/')).toMatch(/\/data\/congress\/119\/official-current-members.json$/);
    expect(loadOfficialCongressSnapshot(defaultOfficialCongressManifestPath()).manifestSha256).toBe(OFFICIAL_CONGRESS_MANIFEST_SHA);
  });
  for(const [name,change] of [
    ['empty',(s:any)=>{s.members=[];}],['missing-member',(s:any)=>{s.members.pop();}],
    ['duplicate-ID',(s:any)=>{s.members[1].bioguideId=s.members[0].bioguideId;}],
    ['fabricated-ID',(s:any)=>{s.members[0].bioguideId='IMPORT_1';}],
    ['former',(s:any)=>{s.members[0].name+=' (former)';}],['vacant-person',(s:any)=>{s.members[0].name='(vacant)';}],
    ['wrong-source',(s:any)=>{s.sources[0].url='https://example.invalid/members';}],
    ['wrong-source-hash',(s:any)=>{s.sources[0].sha256='0'.repeat(64);}],
    ['wrong-context',(s:any)=>{s.sources[1].congressContextRetainedText='118th Congress';}],
    ['vacancy-person',(s:any)=>{s.vacancies[0].name='Unverified name';}],
    ['duplicate-vacancy',(s:any)=>{s.vacancies[1]=s.vacancies[0];}],
    ['wrong-role',(s:any)=>{s.members[0].role='senator';}],
    ['wrong-scope',(s:any)=>{s.counts.occupiedIncludingNonVoting=535;}],
  ] as Array<[string,(s:any)=>void]>){it('refuses '+name+' before a writer',()=>{const altered=structuredClone(actual);change(altered);expect(()=>validateOfficialCongressSnapshot(altered)).toThrow();expect(mock.connect).not.toHaveBeenCalled();});}
  it('altered byte snapshot refuses before database connection',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'et-congress-source-'));const file=join(dir,'wrong.json');
    try{writeFileSync(file,JSON.stringify(actual));await expect(syncOfficialCongress({connect:mock.connect} as any,{manifestPath:file})).rejects.toThrow(/SHA/);expect(mock.connect).not.toHaveBeenCalled();}finally{rmSync(file);rmdirSync(dir);}
  });
  it('apply without explicit guards refuses before connection',async()=>{
    await expect(syncOfficialCongress({connect:mock.connect} as any,{mode:'apply'})).rejects.toThrow(/manifest SHA/);expect(mock.connect).not.toHaveBeenCalled();
  });
  it('unknown runtime mode refuses before connection',async()=>{
    await expect(syncOfficialCongress({connect:mock.connect} as any,{mode:'unknown' as any})).rejects.toThrow(/Unknown/);expect(mock.connect).not.toHaveBeenCalled();
  });
  it('535 duplicate records do not declare reviewed completeness',async()=>{
    mock.rows=Array.from({length:535},()=>({name:'Synthetic',bioguideId:'IMPORT_1',party:'R',state:'AL',chamber:'House',congress:119}));
    expect(await new CongressImportService().validateImport()).toMatchObject({total:535,isComplete:false,expectedCounts:{house:439,senate:100,total:539}});
  });
  it('actual539 source identities and exact fields declare complete; changed field refuses completeness',()=>{
    const rows=actual.members.map((m:any)=>({bioguide_id:m.bioguideId,name:m.name,party:m.partyRaw,state:m.state,district:m.district,chamber:m.chamber,congress:m.congress}));
    expect(sourceCoverageComplete(rows,loadOfficialCongressSnapshot().snapshot)).toBe(true);rows[0].party=null;expect(sourceCoverageComplete(rows,loadOfficialCongressSnapshot().snapshot)).toBe(false);
  });
});
