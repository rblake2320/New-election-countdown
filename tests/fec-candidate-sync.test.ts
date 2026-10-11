import { describe, it, expect, vi } from 'vitest';
import { parseFecMaster, buildFecSyncPlan, runFecSync } from '../server/fec-candidate-sync';
const line = (id = 'H6TX01001', name = 'EXAMPLE, ALEX', party = 'DEM', state = 'TX', office = 'H', district = '01') => [id, name, party, '2026', state, office, district, 'C', 'C', 'C00000001', '', '', '', '', ''].join('|');
const house = { id: 1, state: 'TX', title: 'U.S. House Election - TX-01', level: 'federal', type: 'general', date: '2026-11-03', offices: ['U.S. House of Representatives'] };
const candidate = { id: 10, election_id: 1, name: 'Alex Example', party: 'Democratic', fec_candidate_id: null, fec_status: null, source_file_sha256: null, data_source: null, source_status: null, ballot_status: 'certified' };
describe('FEC sync identity, provenance and race safety', () => {
  it.each(['N','P'])('refuses applying audit-only status %s before opening a database connection', async status => {
    const fields=line().split('|');fields[8]=status;
    const rows=parseFecMaster(fields.join('|'),true).rows;
    const connect=vi.fn(async()=>{throw new Error('Unexpected fixture database connection');});
    await expect(runFecSync({connect} as any,rows,'a'.repeat(64),true)).rejects.toThrow(/audit-only|current.*future/i);
    expect(connect).not.toHaveBeenCalled();
  });
  it('accepts the official 15-field layout, retaining raw status and party', () => {
    const parsed = parseFecMaster(line());
    expect(parsed.rows[0]).toMatchObject({ candId: 'H6TX01001', displayName: 'Alex Example', party: 'D', partyRaw: 'DEM', status: 'C' });
    expect(parsed.total).toBe(1);
  });
  it('rejects a truncated source before planning writes', () => { expect(() => parseFecMaster('H6TX01001|EXAMPLE')).toThrow(/15 fields/); });
  it('preserves a missing party as empty rather than inventing an affiliation', () => { expect(parseFecMaster(line('H6TX01001', 'EXAMPLE, ALEX', '')).rows[0].party).toBe(''); });
  it('preserves unknown incumbency as null', () => {
    const fields = line().split('|'); fields[7] = '';
    expect(parseFecMaster(fields.join('|')).rows[0].incumbent).toBeNull();
  });
  it('counts nullable official names/districts as incomplete without inventing an at-large race', () => {
    const incomplete = ['H6AZ08210', '', '', '2026', 'AZ', 'H', '', '', 'C', 'C00894121', '', '', '', '', ''].join('|');
    const parsed = parseFecMaster(line() + '\n' + incomplete + '\n' + line('H6TX01002', 'OTHER, ALEX', 'REP', 'TX', 'H', ''));
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.incomplete).toBe(2);
    expect(parsed.total).toBe(3);
  });
  it('enriches by name, race AND party, preserving unrecorded provenance and ballot state', () => {
    const plan = buildFecSyncPlan(parseFecMaster(line()).rows, [house], [candidate], 'a'.repeat(64));
    expect(plan.actions[0]).toMatchObject({ kind: 'enrich', candidateId: 10 });
    expect(plan.actions[0]).not.toHaveProperty('ballotStatus');
    expect(plan.actions[0]).not.toHaveProperty('dataSource');
    expect(candidate.data_source).toBeNull();
    expect(candidate.ballot_status).toBe('certified');
  });
  it('does not link the same name from a different party', () => {
    const plan = buildFecSyncPlan(parseFecMaster(line()).rows, [house], [{ ...candidate, party: 'R' }], 'a'.repeat(64));
    expect(plan.actions[0].kind).toBe('insert');
  });
  it('does not deduplicate distinct FEC identities merely because their names match', () => {
    const plan = buildFecSyncPlan(parseFecMaster(line() + '\n' + line('H6TX01002')).rows, [house], [], 'a'.repeat(64));
    expect(plan.actions).toHaveLength(0);
    expect(plan.unmatched).toEqual([
      { fecId: 'H6TX01001', reason: 'ambiguous-identity' },
      { fecId: 'H6TX01002', reason: 'ambiguous-identity' },
    ]);
  });
  it('still plans an unrelated unambiguous record while quarantining a name collision', () => {
    const rows = parseFecMaster(line() + '\n' + line('H6TX01002') + '\n' + line('H6TX01003', 'DISTINCT, TAYLOR', 'REP')).rows;
    const plan = buildFecSyncPlan(rows, [house], [], 'a'.repeat(64));
    expect(plan.actions.map(a => a.record.candId)).toEqual(['H6TX01003']);
    expect(plan.unmatched).toHaveLength(2);
  });
  it('rejects ambiguous existing editorial matches instead of choosing the last one', () => {
    expect(() => buildFecSyncPlan(parseFecMaster(line()).rows, [house], [candidate, { ...candidate, id: 11 }], 'a'.repeat(64))).toThrow(/ambiguous/);
  });
  it('does not select a Senate contest arbitrarily when regular and special share a state', () => {
    const senate = { ...house, id: 2, state: 'FL', title: 'Senate', offices: ['U.S. Senate'] };
    const plan = buildFecSyncPlan(parseFecMaster(line('S6FL00001', 'EXAMPLE, ALEX', 'REP', 'FL', 'S', '00')).rows, [senate, { ...senate, id: 3, type: 'special' }], [], 'a'.repeat(64));
    expect(plan.actions).toHaveLength(0);
    expect(plan.unmatched[0].reason).toBe('ambiguous-race');
  });
  it('is a no-op for identical source and candidate metadata on a repeated run', () => {
    const plan = buildFecSyncPlan(parseFecMaster(line()).rows, [house], [{ ...candidate, fec_candidate_id: 'H6TX01001', fec_status: 'C', source_file_sha256: 'a'.repeat(64) }], 'a'.repeat(64), [{ candidate_id: 10, source_file_sha256: 'a'.repeat(64), is_current: true, metadata: { fecStatus:'C',fecCandidateId:'H6TX01001',partyRaw:'DEM',electionYear:2026,state:'TX',office:'H',district:'01',electionId:1,electionDate:'2026-11-03',normalizedName:'alexexample' } }]);
    expect(plan.actions).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });
  it('keeps past-cycle candidate rows untouched and inserts a distinct current-race registration', () => {
    const plan = buildFecSyncPlan(parseFecMaster(line()).rows, [house], [{ ...candidate, election_id: 42, fec_candidate_id: 'H6TX01001' }], 'a'.repeat(64));
    expect(plan.actions[0].kind).toBe('insert');
  });
  it('quarantines an editorial party conflict even when its FEC identity is known', () => {
    const plan = buildFecSyncPlan(parseFecMaster(line('H6TX01001','EXAMPLE, ALEX','REP')).rows, [house], [{ ...candidate, fec_candidate_id: 'H6TX01001' }], 'a'.repeat(64));
    expect(plan.actions).toHaveLength(0);
    expect(plan.unmatched[0].reason).toBe('conflicting-party');
  });
  it('quarantines a changed FEC ID instead of inserting the same identity twice', () => {
    const plan = buildFecSyncPlan(parseFecMaster(line('H6TX01002')).rows, [house], [{ ...candidate, fec_candidate_id: 'H6TX01001' }], 'a'.repeat(64));
    expect(plan.actions).toHaveLength(0);
    expect(plan.unmatched[0].reason).toBe('ambiguous-identity');
  });
  it('keeps Constitution and Conservative affiliations distinct', () => {
    const records = parseFecMaster(line('H6TX01001','EXAMPLE, ALEX','CON')).rows;
    expect(records[0].party).toBe('CON');
    const plan = buildFecSyncPlan(records, [house], [{ ...candidate, party: 'Conservative' }], 'a'.repeat(64));
    expect(plan.actions[0].kind).toBe('insert');
  });
  it('does not turn No Party Affiliation into an Independent registration', () => {
    expect(parseFecMaster(line('H6TX01001','EXAMPLE, ALEX','NPA')).rows[0].party).toBe('NPA');
  });
  it('updates when a historically seen source returns after a different current version', () => {
    const current = { ...candidate, data_source: 'fec_bulk', party: 'R', fec_candidate_id: 'H6TX01001', fec_status: 'C', source_file_sha256: 'b'.repeat(64) };
    const history = [
      { candidate_id: 10, source_file_sha256: 'a'.repeat(64), is_current: false, metadata: { fecStatus:'C',fecCandidateId:'H6TX01001',partyRaw:'DEM',electionYear:2026,state:'TX',office:'H',district:'01',electionId:1,electionDate:'2026-11-03',normalizedName:'alexexample' } },
      { candidate_id: 10, source_file_sha256: 'b'.repeat(64), is_current: true, metadata: { fecStatus:'C',fecCandidateId:'H6TX01001',partyRaw:'DEM',electionYear:2026,state:'TX',office:'H',district:'01',electionId:1,electionDate:'2026-11-03',normalizedName:'alexexample' } },
    ];
    const plan = buildFecSyncPlan(parseFecMaster(line()).rows,[house],[current],'a'.repeat(64),history);
    expect(plan.actions[0]?.kind).toBe('update');
    expect(plan.unchanged).toBe(0);
  });
  it('does not mistake inactive historical evidence for a current editorial enrichment', () => {
    const plan = buildFecSyncPlan(parseFecMaster(line()).rows,[house],[{...candidate,fec_candidate_id:'H6TX01001',fec_status:'C'}],'a'.repeat(64),[
      {candidate_id:10,source_file_sha256:'a'.repeat(64),is_current:false,metadata:{fecStatus:'C'}},
      {candidate_id:10,source_file_sha256:'b'.repeat(64),is_current:true,metadata:{fecStatus:'C'}},
    ]);
    expect(plan.actions[0]?.kind).toBe('source_refresh');
  });
});

it('refreshes missing source tuple without changing the matching candidate profile',()=>{
 const core={...candidate,fec_candidate_id:'H6TX01001',fec_status:'C',description:'Existing independently authored fixture'};
 const plan=buildFecSyncPlan(parseFecMaster(line()).rows,[house],[core],'a'.repeat(64),[{candidate_id:10,source_file_sha256:'a'.repeat(64),is_current:true,metadata:{fecStatus:'C'}}]);expect(plan.actions[0].kind).toBe('source_refresh');expect(core.description).toBe('Existing independently authored fixture');
});
