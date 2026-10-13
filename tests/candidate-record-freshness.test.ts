import { describe, expect, it } from 'vitest';
import { candidateRecordUpdatedAt } from '../server/candidate-record-freshness';

describe('persisted candidate record timestamp', () => {
  it('normalizes Date and explicit ISO offsets to the recorded instant', () => {
    const expected = '2026-09-12T13:14:15.123Z';
    expect(candidateRecordUpdatedAt({ updatedAt: new Date(expected) })).toBe(expected);
    expect(candidateRecordUpdatedAt({ updated_at: '2026-09-12T15:14:15.123+02:00' })).toBe(expected);
    expect(candidateRecordUpdatedAt({ updatedAt: '2026-09-12T13:14:15.123Z' })).toBe(expected);
  });

  it('never borrows generated provider clocks or unrelated source clocks', () => {
    expect(candidateRecordUpdatedAt({ lastUpdated: '2026-10-13T12:00:00Z',
      sourceSyncedAt: new Date(), source_synced_at: new Date() })).toBeNull();
  });

  it.each([undefined, null, {}, '', 'garbage', '10', 1234, true,
    '2026-09-12', '2026-09-12T13:14:15', '2026-02-30T13:14:15Z',
    '2026-09-12T24:00:00Z', '2026-09-12T13:14:15+25:00', new Date(NaN)])(
    'unknown or invalid persisted value %s remains null', value => {
      expect(candidateRecordUpdatedAt({ updatedAt: value })).toBeNull();
    });

  it('supports the valid snake_case alias without mutating either field', () => {
    const row = { updatedAt: null, updated_at: '2026-09-12T13:14:15Z' };
    const preimage = JSON.stringify(row);
    expect(candidateRecordUpdatedAt(row)).toBe('2026-09-12T13:14:15.000Z');
    expect(JSON.stringify(row)).toBe(preimage);
  });
});
