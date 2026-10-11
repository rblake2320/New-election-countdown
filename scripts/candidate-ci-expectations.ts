import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NomineeManifest } from '../server/candidate-nominee-sync';

/** Resolve reviewed rows directly in SQL, independently of the ingest planner. */
export async function expectedManifestRaces(pool: Pool, manifest: NomineeManifest) {
  assert(manifest.candidates.length > 0, 'Acceptance manifest must not be empty');
  const { rows } = await pool.query<{ ordinal: number; election_ids: number[] }>(`
    SELECT (r.ordinality-1)::int AS ordinal, coalesce(array_agg(e.id ORDER BY e.id)
      FILTER (WHERE e.id IS NOT NULL), '{}'::int[]) AS election_ids
    FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY r(value, ordinality)
    LEFT JOIN elections e ON e.state=r.value->>'state'
      AND e.date::date=(r.value->>'date')::date AND lower(e.type) IN ('general','special')
      AND (r.value->>'raceTitle' IS NULL OR e.title=r.value->>'raceTitle')
      AND CASE r.value->>'office'
        WHEN 'S' THEN 'U.S. Senate'=ANY(e.offices)
        WHEN 'G' THEN EXISTS (SELECT 1 FROM unnest(e.offices) o WHERE lower(o)='governor')
        WHEN 'H' THEN 'U.S. House of Representatives'=ANY(e.offices)
          AND substring(e.title FROM '[A-Z]{2}-(?:[0-9]{2}|AL)') =
            (r.value->>'state')||'-'||CASE WHEN r.value->>'district'='00'
              AND e.title ~ '[A-Z]{2}-AL' THEN 'AL' ELSE r.value->>'district' END
        ELSE false END
    GROUP BY r.ordinality ORDER BY r.ordinality`, [JSON.stringify(manifest.candidates)]);
  assert.equal(rows.length, manifest.candidates.length);
  const expected = new Map<number, NomineeManifest['candidates']>();
  for (const row of rows) {
    assert.equal(row.election_ids.length, 1, `Manifest row ${row.ordinal}: missing or ambiguous race`);
    const id = row.election_ids[0];
    expected.set(id, [...(expected.get(id) ?? []), manifest.candidates[row.ordinal]]);
  }
  return expected;
}

export function assertManifestReceiving(expected: NomineeManifest['candidates'], candidates: any[]) {
  const key = (r: any) => JSON.stringify([r.sourceId, r.name, r.partyRaw, r.state, r.office, r.district, r.date]);
  assert.deepEqual(candidates.map(c => key({ ...c.generalListSource, name: c.generalListSource.legalName,
    date: c.generalListSource.electionDate })).sort(), expected.map(key).sort(), 'Exact reviewed manifest receiving mismatch');
}
