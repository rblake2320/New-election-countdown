import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parseNomineeManifest} from '../server/candidate-nominee-sync';
const raw=()=>JSON.parse(readFileSync('tests/fixtures/source-delegation/az-pima-ccec.json','utf8'));
describe('actual county ballot source with separately bound identity/party guide',()=>{
 it('admits the separately delegated official write-in file and preserves its exact H06 printed office/name',()=>{
  const d=JSON.parse(readFileSync('tests/fixtures/source-delegation/az-pima-write-in.json','utf8'));
  const m=parseNomineeManifest(d);expect(m.candidates).toHaveLength(1);expect(m.candidates[0]).toMatchObject({name:'MICHAEL DORLAND',office:'H',district:'06',ballotAccessType:'write_in',partyRaw:'IND'});
  const changed=structuredClone(d);changed.sources[0].url+='?unreviewed=1';expect(()=>parseNomineeManifest(changed)).toThrow();
  changed.sources[0].url=d.sources[0].url;changed.sources[0].state='CA';expect(()=>parseNomineeManifest(changed)).toThrow(/Pima/);
 });
 it('admits the exact government-delegated Pima list and four guide identities without promoting guide eligibility',()=>{
  const m=parseNomineeManifest(raw());expect(m.candidates).toHaveLength(12);
  expect(m.sources).toHaveLength(2);expect(m.sources.some(s=>s.url.includes('blob.core'))).toBe(false);
  expect(m.candidates.find(r=>r.name==='Risa Lombardo')?.partyValue).toBe('G');
  expect(m.candidates.find(r=>r.name==='Teri Ann Hourihan')?.partyRaw).toBe('NOL');
 });
 it.each(['https://content.civicplus.com/api/assets/az-pimacounty/other','https://content.civicplus.com/api/assets/az-pimacounty/d2c310c3-ade7-484e-a6f0-1ddaebec0799?other=1','https://content.civicplus.com/api/assets/az-pimacounty/d2c310c3-ade7-484e-a6f0-1ddaebec0799#x','https://other.civicplus.com/api/assets/az-pimacounty/d2c310c3-ade7-484e-a6f0-1ddaebec0799','https://storageccec.blob.core.usgovcloudapi.net/public/docs/1509-1497AllDistrictWebEnglishv2.pdf'])('rejects an unreviewed ballot-source destination %s',url=>{
  const d=raw();d.sources[0].url=url;expect(()=>parseNomineeManifest(d)).toThrow();
 });
 it('binds delegated ballot-source authority to Arizona',()=>{const d=raw();d.sources[0].state='CA';expect(()=>parseNomineeManifest(d)).toThrow(/Pima/);});
 it.each(['name','partyRaw','partyValue','state','office','district','date','hash','page','url'])('refuses guide evidence with a changed %s binding',field=>{
  const d=raw(),r=d.candidates[2];
  if(field==='hash')r.partyEvidence.sha256='a'.repeat(64);
  else if(field==='page')r.identityEvidence.sourcePage=20;
  else if(field==='url')r.partyEvidence.url=r.partyEvidence.url.replace('1509-1497','9999-9999');
  else r[field]=({name:'Other Person',partyRaw:'REP',partyValue:'R',state:'CA',office:'H',district:'01',date:'2026-11-04'} as Record<string,string>)[field];
  expect(()=>parseNomineeManifest(d)).toThrow();
 });
 it.each(['','not a url','http://x.gov'])('rejects malformed URL normally, rather than throwing an uncaught URL TypeError: %s',url=>{
  const d=raw();d.sources[0].url=url;
  try{parseNomineeManifest(d);throw new Error('accepted malformed URL');}catch(e){expect(e).not.toBeInstanceOf(TypeError);expect(String(e)).not.toContain('accepted malformed');}
 });
});
