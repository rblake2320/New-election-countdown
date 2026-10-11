/**
 * Database seeding — verified 2026 election cycle data only.
 * Sources: Ballotpedia, NCSL, state SOS sites, AP/NPR/CNN, Cook Political Report
 * (compiled and verified 2026-06-11). No placeholder or invented data.
 * Run with: npm run db:seed (or automatically on first server start)
 */

import { db } from './db';
import { elections, candidates } from '../shared/schema';
import { sql } from 'drizzle-orm';
import {
  SENATE_RACES,
  GOVERNOR_RACES,
  UPCOMING_PRIMARIES,
  UPCOMING_RUNOFFS,
  HOUSE_SPECIALS,
  type SeedRace,
} from './seed-data-2026';

import { houseRaces } from './house-races-2026';

export async function seedDatabase() {
  console.log('🌱 Starting database seed (verified 2026 data)...');

  try {
    const existing = await db.select().from(elections).limit(1);
    if (existing.length > 0) {
      console.log('✅ Database already seeded, skipping...');
      return;
    }

    const allRaces: SeedRace[] = [
      ...SENATE_RACES,
      ...GOVERNOR_RACES,
      ...houseRaces(),
      ...UPCOMING_PRIMARIES,
      ...UPCOMING_RUNOFFS,
      ...HOUSE_SPECIALS,
    ];

    console.log(`📊 Seeding ${allRaces.length} elections...`);
    for (const race of allRaces) {
      const [inserted] = await db
        .insert(elections)
        .values({
          title: race.title,
          subtitle: race.subtitle,
          location: race.state,
          state: race.state,
          date: new Date(race.date),
          type: race.type,
          level: race.level,
          offices: [race.office],
          description: race.description,
          isActive: true,
        })
        .returning({ id: elections.id });

      if (race.candidates.length > 0) {
        await db.insert(candidates).values(
          race.candidates.map((c) => ({
            name: c.name,
            party: c.party,
            electionId: inserted.id,
            isIncumbent: c.isIncumbent,
            description: c.description,
            // Polling fields stay null until real polls are ingested
            pollingSupport: null,
            pollingTrend: null,
          })),
        );
      }
    }

    const stats = await getStats();
    console.log('✅ Database seeding complete!');
    console.log(`   Elections: ${stats.elections}`);
    console.log(`   Candidates: ${stats.candidates}`);
    console.log('   Congress members: populated via scripts/sync_congress.ts when CONGRESS_API_KEY is set');
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}

async function getStats() {
  const electionCount = await db.select({ count: sql`count(*)` }).from(elections);
  const candidateCount = await db.select({ count: sql`count(*)` }).from(candidates);
  return {
    elections: parseInt(electionCount[0]?.count?.toString() || '0'),
    candidates: parseInt(candidateCount[0]?.count?.toString() || '0'),
  };
}

// CLI lives in scripts/seed-database.ts. An import.meta.url direct-run guard
// becomes true for every bundled module in dist/index.js and exits the server.
