import { describe, it, expect } from 'vitest';
import {
  SEATS, composition, compositionIssues, currentCongress, filterMembers, inCongress, memberPartyLabel, partyCode, seatLabel,
} from '../client/src/lib/congress-members';
import { actualMemberRows, officialVacancies } from './helpers/congress-api-rows';

const rows = actualMemberRows();
const current = inCongress(rows, 119);
const all = { search: '', party: 'all', state: '', chamber: 'all' };
const byId = (id: string) => rows.find(r => r.bioguideId === id)!;

describe('Congress member helpers on the actual GET /api/members response (541 rows)', () => {
  it('counts current-Congress voting, nonvoting and Senate rows against seats fixed by law', () => {
    const c = composition(rows, 119);
    expect(c).toMatchObject({
      congress: 119, total: 540, otherCongress: 1,
      senate: 100, houseVoting: 433, houseNonVoting: 6, unrecognizedHouseSeat: 1, otherChamber: 0,
    });
    expect(c.senateStateIssues).toEqual([]);
    expect(c.duplicateHouseSeats).toEqual([]);
    // The two unfilled voting seats are the source's explicit vacancies; nothing is invented to fill them.
    expect(SEATS.houseVoting - c.houseVoting).toBe(officialVacancies().length);
    expect(c.byParty).toEqual({ Republican: 274, Democratic: 262, Independent: 3, 'Party not recorded': 1 });
    expect(compositionIssues(c)).toEqual(['1 House record(s) with no recognized seat']);
  });

  it('does not count the preserved 118th-Congress row as a sitting senator', () => {
    const history = byId('HISTORY_D_FIXTURE');
    expect(history.congress).toBe(118);
    expect(current).not.toContain(history);
    // Negative control: counting every row (main's behavior) reports 101 senators for 100 seats.
    expect(rows.filter(r => r.chamber === 'Senate')).toHaveLength(101);
  });

  it('does not count a House row with no district outside the six nonvoting jurisdictions as a delegate', () => {
    const control = byId('IMPORT_D_FIXTURE');
    expect(seatLabel(control)).toBe('Seat not recorded');
    expect(memberPartyLabel(control.party)).toBe('Party not recorded');
    // Negative control: "House and no district" alone would give 7 nonvoting members for 6 seats.
    expect(current.filter(r => r.chamber === 'House' && r.district === null)).toHaveLength(7);
  });

  it('party filter matches stored single-letter codes (the old label-substring filter matched none)', () => {
    expect(filterMembers(current, { ...all, party: 'R' })).toHaveLength(274);
    expect(filterMembers(current, { ...all, party: 'D' })).toHaveLength(262);
    expect(filterMembers(current, { ...all, party: 'I' })).toHaveLength(3);
    // Negative control: the predicate main shipped, 'R'.includes('republican'), drops every row.
    expect(current.filter(m => m.party.toLowerCase().includes('republican'))).toHaveLength(0);
  });

  it('chamber filter is exact and state filter is case-insensitive', () => {
    expect(filterMembers(current, { ...all, chamber: 'Senate' })).toHaveLength(100);
    expect(filterMembers(current, { ...all, chamber: 'House' })).toHaveLength(440);
    const vt = filterMembers(current, { ...all, state: 'vt' });
    expect(vt.map(m => `${m.name}|${seatLabel(m)}|${memberPartyLabel(m.party)}`).sort()).toEqual([
      'Becca Balint|At-large district|Democratic',
      'Bernard Sanders|Senator|Independent',
      'Peter Welch|Senator|Democratic',
    ]);
    expect(filterMembers(current, { ...all, party: 'I', chamber: 'Senate' })).toHaveLength(2);
  });

  it('labels at-large, numbered, delegate and resident commissioner seats from real rows', () => {
    expect(seatLabel(byId('B001323'))).toBe('At-large district'); // AK "00"
    expect(seatLabel(byId('M000194'))).toBe('District 1'); // SC "01"
    expect(seatLabel(byId('N000147'))).toBe('Delegate (nonvoting)'); // DC
    expect(seatLabel(byId('H001103'))).toBe('Resident Commissioner (nonvoting)'); // PR
    const nonVoting = current.filter(r => seatLabel(r).endsWith('(nonvoting)')).map(r => r.state).sort();
    expect(nonVoting).toEqual(['AS', 'DC', 'GU', 'MP', 'PR', 'VI']);
  });

  it('keeps rows written by older importers readable', () => {
    expect(partyCode('Democratic')).toBe('D');
    expect(partyCode(' r ')).toBe('R');
    expect(partyCode(null)).toBe('');
    expect(memberPartyLabel('Working Families')).toBe('Working Families');
    expect(seatLabel({ chamber: 'House', state: 'NY', district: '3' })).toBe('District 3');
    expect(composition([{ chamber: 'Senate', state: 'AK', congress: 119 }], 119).senateStateIssues)
      .toEqual(['AK: 1 senator record for 2 seats']);
    expect(composition([
      { chamber: 'House', state: 'NY', district: '3' }, { chamber: 'House', state: 'NY', district: '03' },
    ], 119).duplicateHouseSeats).toEqual(['NY-3: 2 records for one seat']);
  });

  it('derives the sitting Congress from the date, turning over on January 3 of odd years', () => {
    expect(currentCongress(new Date('2026-10-11T12:00:00Z'))).toBe(119);
    expect(currentCongress(new Date('2027-01-02T12:00:00Z'))).toBe(119);
    expect(currentCongress(new Date('2027-01-03T18:00:00Z'))).toBe(120);
    expect(currentCongress(new Date('2025-01-03T18:00:00Z'))).toBe(119);
  });
});
