import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseNomineeManifest, planNomineeRefresh, MASSACHUSETTS_JAMES_IDENTITY_URL } from '../server/candidate-nominee-sync';
const source = { id:'fixture',state:'NE',kind:'official_general_candidate_list',name:'Isolated official-list fixture',url:'https://sos.nebraska.gov/isolated-fixture.pdf',sha256:'a'.repeat(64),publishedAt:'2026-09-11',retrievedAt:'2026-10-11T00:00:00Z',electionDate:'2026-11-03',completeScopes:[{office:'H',district:'01',expectedCount:1}],expectedRowCount:1 };
const row = { sourceId:'fixture',state:'NE',office:'H',district:'01',date:'2026-11-03',name:'Alex Example',partyRaw:'Republican',incumbent:null,sourcePage:1 };
const raw = () => ({version:1,sources:[source],candidates:[row]});
const race = {id:1,state:'NE',title:'U.S. House Election - NE-01',level:'federal',type:'general',date:'2026-11-03',offices:['U.S. House of Representatives']};
const existing = {id:9,election_id:1,name:'Alex Example',party:'R',data_source:'fec_bulk',source_status:'fec_registered',fec_candidate_id:'H6NE01001',fec_status:'C',source_file_sha256:'b'.repeat(64)};
describe('sourced general candidate refresh',()=>{
 it('accepts factual official general-list rows without asserting ballot certification',()=>{
  const manifest=parseNomineeManifest(raw());expect(manifest.candidates).toHaveLength(1);expect(manifest.sources[0].kind).toBe('official_general_candidate_list');
 });
 it('rejects filing/primary results passed off as general nominees',()=>{expect(()=>parseNomineeManifest({...raw(),sources:[{...source,kind:'fec_registration'}]})).toThrow();});
 it('rejects mismatched source state or date',()=>{expect(()=>parseNomineeManifest({...raw(),candidates:[{...row,state:'TX'}]})).toThrow(/source/);expect(()=>parseNomineeManifest({...raw(),candidates:[{...row,date:'2026-11-04'}]})).toThrow(/source/);});
 it('rejects non-HTTPS or non-government source links',()=>{expect(()=>parseNomineeManifest({...raw(),sources:[{...source,url:'javascript:alert(1)'}]})).toThrow();expect(()=>parseNomineeManifest({...raw(),sources:[{...source,url:'https://example.test/fake.pdf'}]})).toThrow();});
 it('admits only the reviewed county-delegated Montana ballot and binds its state',()=>{
  const reviewed=JSON.parse(readFileSync('data/nominees/mt-2026-general.json','utf8'));
  expect(parseNomineeManifest(reviewed).candidates.filter(row=>row.sourceId===reviewed.sources[0].id)).toHaveLength(7);
  const link=new URL(reviewed.sources[0].url);
  for(const changes of [{hostname:'other.sharepoint.com'},{pathname:'/other/library.aspx'},{id:'/administration/elect/Public/other.pdf'},{username:'caller'}]){
   const changed=new URL(link);
   if('id' in changes)changed.searchParams.set('id',changes.id!);
   else Object.assign(changed,changes);
   expect(()=>parseNomineeManifest({...reviewed,sources:[{...reviewed.sources[0],url:changed.href}]})).toThrow();
  }
  expect(()=>parseNomineeManifest({...reviewed,sources:[{...reviewed.sources[0],state:'OH'}]})).toThrow();
 });
 it('rejects contact/profile content in a nominee row',()=>{expect(()=>parseNomineeManifest({...raw(),candidates:[{...row,biography:'Invented fixture bio'}]})).toThrow();});
 it('restricts the reviewed OCPF document to its exact MA Governor identity, never ballot or party proof',()=>{
  const evidence={url:MASSACHUSETTS_JAMES_IDENTITY_URL,sha256:'d2d4489189dc036164e12ac7ac3f69c38d4bd3fb823738ff71647b265771fd1a',title:'Name and Governor role only',sourcePage:1};
  const record={...row,state:'MA',office:'G',district:'00',name:'Andrea Corinne James',partyRaw:'Independent',identityEvidence:evidence};
  const src={...source,state:'MA',completeScopes:[{office:'G',district:'00',expectedCount:1}]};
  const manifest={version:1,sources:[src],candidates:[record]};
  expect(parseNomineeManifest(manifest).candidates[0].partyRaw).toBe('Independent');
  for(const changed of [{...record,name:'Another identity'},{...record,office:'H',district:'01'},{...record,identityEvidence:{...evidence,url:evidence.url.replace('19010-cpf101-1-030325','other')}}])expect(()=>parseNomineeManifest({...manifest,candidates:[changed]})).toThrow();
  expect(()=>parseNomineeManifest({...manifest,sources:[{...src,url:evidence.url}]})).toThrow();
  expect(()=>parseNomineeManifest({...manifest,candidates:[{...record,partyEvidence:evidence}]})).toThrow();
 });
 it('binds the exact state-office-district-date and reuses an existing identity',()=>{
  const plan=planNomineeRefresh(parseNomineeManifest(raw()),[race],[existing]);expect(plan.actions[0].candidateId).toBe(9);expect(plan.actions[0].electionId).toBe(1);expect(plan.actions[0]).not.toHaveProperty('ballotStatus');expect(plan.actions[0]).not.toHaveProperty('fecCandidateId');
 });
 it('does not match a primary or past-cycle race',()=>{const plan=planNomineeRefresh(parseNomineeManifest(raw()),[{...race,type:'primary'},{...race,id:2,date:'2024-11-05'}],[]);expect(plan.actions).toHaveLength(0);expect(plan.unresolved[0].reason).toBe('missing-race');});
 it('quarantines ambiguous duplicate identities',()=>{const plan=planNomineeRefresh(parseNomineeManifest(raw()),[race],[existing,{...existing,id:10}]);expect(plan.actions).toHaveLength(0);expect(plan.unresolved[0].reason).toBe('ambiguous-identity');});
 it('quarantines an unproven party change instead of merging same-name people',()=>{const plan=planNomineeRefresh(parseNomineeManifest(raw()),[race],[{...existing,party:'D'}]);expect(plan.actions).toHaveLength(0);expect(plan.unresolved[0].reason).toBe('party-conflict');});
 it('does not infer affiliation from By Petition',()=>{const plan=planNomineeRefresh(parseNomineeManifest({...raw(),candidates:[{...row,partyRaw:'By Petition'}]}),[race],[{...existing,party:'I'}]);expect(plan.actions[0].candidateId).toBe(9);expect(plan.actions[0].party).toBe('I');});
 it('retains unknown affiliation/incumbency on a new record',()=>{const plan=planNomineeRefresh(parseNomineeManifest({...raw(),candidates:[{...row,partyRaw:''}]}),[race],[]);expect(plan.actions[0].party).toBe('');expect(plan.actions[0].record.incumbent).toBeNull();});
 it('matches explicit registered party and write-in party wrappers without losing their raw text',()=>{
  for(const partyRaw of ['(Registered Republican)','Write-In (Republican)']){
   const plan=planNomineeRefresh(parseNomineeManifest({...raw(),candidates:[{...row,partyRaw}]}),[race],[existing]);
   expect(plan.unresolved).toEqual([]);expect(plan.actions[0].candidateId).toBe(9);expect(plan.actions[0].party).toBe('R');expect(plan.actions[0].record.partyRaw).toBe(partyRaw);
  }
 });
 it('reuses one existing identity when an official fusion row includes its party',()=>{
  const plan=planNomineeRefresh(parseNomineeManifest({...raw(),candidates:[{...row,partyRaw:'DEM/PROG'}]}),[race],[{...existing,party:'D'}]);
  expect(plan.unresolved).toEqual([]);expect(plan.actions).toHaveLength(1);expect(plan.actions[0].candidateId).toBe(9);expect(plan.actions[0].record.partyRaw).toBe('DEM/PROG');
 });
 it('rejects duplicate identities even when row-count metadata matches',()=>{expect(()=>parseNomineeManifest({...raw(),sources:[{...source,expectedRowCount:2,completeScopes:[{office:'H',district:'01',expectedCount:2}]}],candidates:[row,row]})).toThrow(/duplicate/);});
 it('rejects overlapping complete scopes and repeated identities across source documents',()=>{
  const other={...source,id:'second',url:'https://sos.nebraska.gov/second-fixture.pdf',completeScopes:[]};
  expect(()=>parseNomineeManifest({...raw(),sources:[source,other],candidates:[row,{...row,sourceId:'second'}]})).toThrow(/duplicate/);
  expect(()=>parseNomineeManifest({...raw(),sources:[source,{...other,completeScopes:[{office:'H',district:'01',partyRaw:'Republican',expectedCount:1}],expectedRowCount:0}],candidates:[row]})).toThrow(/overlap/);
 });
});
