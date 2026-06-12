/**
 * One-time backfill: attach the verified runoff candidate fields
 * (from seed-data-2026 UPCOMING_RUNOFFS) to existing runoff election rows.
 * Idempotent — skips candidates already present on the event.
 */
import { config } from 'dotenv';
config();

async function main() {
  const { db } = await import('../server/db');
  const { elections, candidates } = await import('../shared/schema');
  const { UPCOMING_RUNOFFS } = await import('../server/seed-data-2026');
  const { eq, and } = await import('drizzle-orm');

  let added = 0;
  for (const race of UPCOMING_RUNOFFS) {
    if (race.candidates.length === 0) continue;
    const [row] = await db
      .select()
      .from(elections)
      .where(and(eq(elections.title, race.title), eq(elections.state, race.state)));
    if (!row) {
      console.log('⚠️ no election row for', race.title);
      continue;
    }
    const existing = await db.select().from(candidates).where(eq(candidates.electionId, row.id));
    const have = new Set(existing.map((c) => c.name.toLowerCase()));
    for (const c of race.candidates) {
      if (have.has(c.name.toLowerCase())) continue;
      await db.insert(candidates).values({
        name: c.name,
        party: c.party,
        electionId: row.id,
        isIncumbent: c.isIncumbent,
        description: c.description,
        dataSource: 'editorial_verified',
        sourceStatus: 'editorial_verified',
        ballotStatus: 'not_certified',
        normalizedName: c.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        pollingSupport: null,
        pollingTrend: null,
      });
      added++;
    }
  }
  console.log('runoff candidates added:', added);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
