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

// 2020-census House apportionment — every district is up Nov 3, 2026
const HOUSE_SEATS: Record<string, number> = {
  CA: 52, TX: 38, FL: 28, NY: 26, PA: 17, IL: 17, OH: 15, GA: 14, NC: 14, MI: 13,
  NJ: 12, VA: 11, WA: 10, AZ: 9, IN: 9, MA: 9, TN: 9, MD: 8, MN: 8, MO: 8,
  WI: 8, CO: 8, AL: 7, SC: 7, LA: 6, KY: 6, OR: 6, OK: 5, CT: 5, IA: 4,
  AR: 4, KS: 4, MS: 4, NV: 4, UT: 4, NM: 3, NE: 3, WV: 2, ID: 2, HI: 2,
  ME: 2, NH: 2, RI: 2, MT: 2, ND: 1, SD: 1, DE: 1, VT: 1, WY: 1, AK: 1,
};

function houseRaces(): SeedRace[] {
  const races: SeedRace[] = [];
  for (const [state, seats] of Object.entries(HOUSE_SEATS)) {
    for (let d = 1; d <= seats; d++) {
      const district = seats === 1 ? 'At-Large' : `District ${d}`;
      races.push({
        state,
        title: `U.S. House Election - ${state}-${seats === 1 ? 'AL' : String(d).padStart(2, '0')}`,
        subtitle: `${state} ${district}`,
        type: 'general',
        level: 'federal',
        office: 'U.S. House of Representatives',
        date: '2026-11-03',
        description: `${state} ${district} U.S. House seat — general election November 3, 2026.`,
        candidates: [],
      });
    }
  }
  return races;
}

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

// Run if called directly (cross-platform path comparison)
import { pathToFileURL } from 'url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
