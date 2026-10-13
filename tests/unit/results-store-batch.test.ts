import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PgResultReportStore } from '../../server/results-store';

describe('PostgreSQL results batch without reports', () => {
  it.each([
    { ids: [1, 2, 3] },
    { date: '2026-11-03' },
  ])('preserves election identity for %j despite the null report-side election_id', async (filter) => {
    // Real LEFT JOIN shape: r.* includes a null election_id when no report exists.
    // The election identity must have a distinct projection and be read from it.
    const query = vi.fn(async (sql: string) => {
      if(sql.includes('result_source_health'))return{rows:[]};
      expect(sql).toMatch(/e\.id\s+AS\s+e_id\b/i);
      return {
        rows: [1, 2, 3].map((id) => ({
          e_id: id,
          e_state: 'AK',
          e_date: new Date('2026-11-03T00:00:00Z'),
          e_type: 'general',
          e_level: 'federal',
          e_title: `Fixture race ${id}`,
          id: null,
          election_id: null,
        })),
      };
    });
    const store = new PgResultReportStore({ query } as unknown as Pool);

    const batch = await store.listResultsPayloads(filter);

    expect(batch.results.map((result) => result.electionId)).toEqual([1, 2, 3]);
    expect(batch.results).toHaveLength(3);
    for (const result of batch.results) {
      expect(result).toMatchObject({ status: 'none', reportId: null, candidates: [] });
    }
    // No report IDs means no candidate query is needed.
    expect(query).toHaveBeenCalledTimes(2); // One bounded health query, including no-report races.
  });
});
