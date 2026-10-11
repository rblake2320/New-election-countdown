import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemStorage } from '../server/mem-storage';
import type { Election } from '../shared/schema';

// Isolated in-memory fixtures. These records never enter the application DB.
const election = (id: number, date: string, active = true): Election => ({
  id, date: new Date(date), title: 'Colorado U.S. Senate', state: 'CO',
  location: 'Colorado', subtitle: null, description: null, type: 'general',
  level: 'federal', offices: ['U.S. Senate'], pollsOpen: null,
  pollsClose: null, timezone: null, isActive: active,
});

describe('election listing contract in failover memory', () => {
  let store: MemStorage;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T14:30:00Z'));
    store = new MemStorage();
    const fixture = store as any;
    fixture.elections = new Map([
      [1, election(1, '2026-09-15T00:00:00Z')],
      [2, election(2, '2026-11-03T00:00:00Z')],
      [3, election(3, '2026-10-11T00:00:00Z')],
      [4, election(4, '2027-02-01T00:00:00Z')],
      [5, election(5, '2026-11-03T00:00:00Z', false)],
    ]);
    fixture.candidates = new Map([
      [10, { id: 10, electionId: 2, party: 'D' }],
      [11, { id: 11, electionId: 2, party: 'Republican' }],
    ]);
    fixture.candidatesByElection = new Map([[2, [10, 11]]]);
  });
  afterEach(() => vi.useRealTimers());

  it('returns today and Nov 3 for next-30-days, excluding prior and inactive elections', async () => {
    expect((await store.getElections({ timeframe: 'next-30-days' })).map(e => e.id)).toEqual([3, 2]);
  });
  it('honors the timeRange alias instead of returning past elections', async () => {
    expect((await store.getElections({ timeRange: 'next-90-days' })).map(e => e.id)).toEqual([3, 2]);
  });
  it('includes the whole UTC calendar day for the legacy week filter', async () => {
    expect((await store.getElections({ timeframe: 'week' })).map(e => e.id)).toEqual([3]);
  });
  it('matches party names and codes and counts all candidates, not just the selected party', async () => {
    const byName = await store.getElections({ party: 'Democratic' });
    const byCode = await store.getElections({ party: 'D' });
    expect(byName.map(e => e.id)).toEqual([2]);
    expect(byName).toEqual(byCode);
    expect((byName[0] as any).candidateCount).toBe(2);
    expect((await store.getElections({ party: 'Republican' })).map(e => e.id)).toEqual([2]);
  });
  it('rejects unknown timeframes instead of silently broadening or truncating', async () => {
    await expect(store.getElections({ timeframe: 'next-3-centuries' })).rejects.toThrow(/timeframe/i);
  });
  it('honors the API recent-date floor before returning rows', async () => {
    const result = await store.getElections({ minDate: new Date('2026-10-12T00:00:00Z') } as any);
    expect(result.map(e => e.id)).toEqual([2, 4]);
  });
  it('keeps Nov 3 races at 05:30 UTC on Nov 4 when timezone metadata is absent', async () => {
    vi.setSystemTime(new Date('2026-11-04T05:30:00Z'));
    expect((await store.getElections({ timeframe: 'upcoming' })).map(e => e.id)).toContain(2);
  });
  it('uses each known election timezone, retaining Aleutian races after New York midnight', async () => {
    vi.setSystemTime(new Date('2026-11-04T05:30:00Z'));
    const fixture = store as any;
    fixture.elections.get(2).timezone = 'America/Adak';
    fixture.elections.set(6, { ...election(6, '2026-11-03T00:00:00Z'), timezone: 'America/New_York' });
    const ids = (await store.getElections({ timeframe: 'upcoming' })).map(e => e.id);
    expect(ids).toContain(2);
    expect(ids).not.toContain(6);
  });
  it('treats a legacy missing party as Other without crashing', async () => {
    (store as any).candidates.set(12, { id: 12, electionId: 3, party: null });
    expect((await store.getElections({ party: 'O' })).map(e => e.id)).toEqual([3]);
  });
});
