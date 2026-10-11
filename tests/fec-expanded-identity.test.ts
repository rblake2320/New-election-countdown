
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseNomineeManifest, planNomineeRefresh } from '../server/candidate-nominee-sync';
import { normalizedCandidateName, FEC_MASTER_URL } from '../server/fec-candidate-sync';

const evidence=JSON.parse(readFileSync('artifacts/fec-first/expanded-official-fec-evidence.json','utf8'));
const delta=JSON.parse(readFileSync('artifacts/fec-first/expanded-delta-plan.json','utf8'));

function fixture(page:any) {
  const gov=structuredClone(page.governmentRow),fec=page.fecBulkTuple;
  gov.identityResolution={
    kind:'reviewed_fec_identity',fecCandidateId:fec.candId,
    expectedFecPartyRaw:fec.partyRaw,expectedStatePartyRaw:gov.partyRaw,
    ...(normalizedCandidateName(gov.name)!==normalizedCandidateName(fec.displayName)?{expectedFecName:fec.displayName}:{}),
    fecEvidence:{url:page.url,sha256:page.sha256,retrievedAt:page.retrievedAt},
  };
  const detail=delta.additionalConflicts.find((item:any)=>item.fecFacts.some((f:any)=>f.candId===fec.candId));
  const race=structuredClone(detail.races[0]),core=structuredClone(detail.existing[0]);
  const source={candidate_id:core.id,is_current:true,source_url:FEC_MASTER_URL,source_file_sha256:core.source_file_sha256,
    metadata:{fecCandidateId:fec.candId,partyRaw:fec.partyRaw,fecStatus:fec.status,electionYear:2026,state:fec.state,
      office:fec.office,district:fec.district,electionId:race.id,electionDate:gov.date,normalizedName:normalizedCandidateName(fec.displayName)}};
  const input={version:1,sources:[{...page.governmentSource,completeScopes:[],expectedRowCount:1}],candidates:[gov]};
  return {input,race,core,source};
}

describe('additional individually reviewed FEC identities',()=>{
  it.each(evidence.fecPages)('retains reviewed declaration in authoritative input $fecCandidateId',(page:any)=>{
    const input=parseNomineeManifest(JSON.parse(readFileSync('data/nominees/'+page.governmentRow.state.toLowerCase()+'-2026-general.json','utf8')));
    const row=input.candidates.find(candidate=>candidate.sourceId===page.governmentRow.sourceId&&candidate.name===page.governmentRow.name&&candidate.office===page.governmentRow.office&&candidate.district===page.governmentRow.district);
    expect(row?.identityResolution).toEqual(fixture(page).input.candidates[0].identityResolution);
  });
  it.each(evidence.fecPages)('resolves exact current tuple $fecCandidateId without changing the government label',(page:any)=>{
    const f=fixture(page),coreBefore=structuredClone(f.core);
    const plan=planNomineeRefresh(parseNomineeManifest(f.input),[f.race],[f.core],[f.source]);
    expect(plan.unresolved).toEqual([]);
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({candidateId:f.core.id,identityResolutionApplied:true});
    expect(plan.actions[0].record.partyRaw).toBe(page.governmentRow.partyRaw);
    expect(f.core).toEqual(coreBefore);
  });
  it.each(evidence.fecPages)('refuses changed opposing party $fecCandidateId',(page:any)=>{
    const f=fixture(page);f.core.party='R';
    const plan=planNomineeRefresh(parseNomineeManifest(f.input),[f.race],[f.core],[f.source]);
    expect(plan.actions).toHaveLength(0);expect(plan.unresolved[0].reason).toBe('fec-identity-resolution-conflict');
  });
  it.each(evidence.fecPages)('refuses changed raw FEC party $fecCandidateId',(page:any)=>{
    const f=fixture(page);f.source.metadata.partyRaw='REP';
    expect(planNomineeRefresh(parseNomineeManifest(f.input),[f.race],[f.core],[f.source]).actions).toHaveLength(0);
  });
  it('refuses an expected FEC name absent from the recorded official aliases',()=>{
    const f=fixture(evidence.fecPages.find((p:any)=>p.fecCandidateId==='H6AK01092'));
    f.input.candidates[0].identityResolution.expectedFecName='Other Person';
    expect(()=>parseNomineeManifest(f.input)).toThrow(/name.*alias/i);
  });
  it('refuses surname-first name resolution when its official alias is absent',()=>{
    const f=fixture(evidence.fecPages.find((p:any)=>p.fecCandidateId==='H6AK01092'));
    delete f.input.candidates[0].aliases;
    expect(()=>parseNomineeManifest(f.input)).toThrow(/name.*alias/i);
  });
  it('binds the current proof and core to the exact declared FEC name',()=>{
    const f=fixture(evidence.fecPages.find((p:any)=>p.fecCandidateId==='H6AK01092'));
    f.source.metadata.normalizedName='otherperson';
    expect(planNomineeRefresh(parseNomineeManifest(f.input),[f.race],[f.core],[f.source]).actions).toHaveLength(0);
  });
  it('refuses matching malformed current source hashes',()=>{
    const f=fixture(evidence.fecPages[0]);f.core.source_file_sha256='bad';f.source.source_file_sha256='bad';
    expect(planNomineeRefresh(parseNomineeManifest(f.input),[f.race],[f.core],[f.source]).actions).toHaveLength(0);
  });
});
