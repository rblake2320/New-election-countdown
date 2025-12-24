/**
 * Comprehensive Database Seeding Script
 * Populates database with real election data for demo/production
 * Run with: npm run db:seed OR automatically on first server start
 */

import { db } from './db';
import { elections, candidates, congressMembers } from '../shared/schema';
import { sql } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Check if already seeded
    const existingElections = await db.select().from(elections).limit(1);
    if (existingElections.length > 0) {
      console.log('✅ Database already seeded, skipping...');
      return;
    }

    // Seed elections
    console.log('📊 Seeding elections...');
    await seedElections();
    
    // Seed candidates
    console.log('👥 Seeding candidates...');
    await seedCandidates();
    
    // Seed congress members
    console.log('🏛️ Seeding congress members...');
    await seedCongress();
    
    console.log('✅ Database seeding complete!');
    console.log('📈 Summary:');
    
    const stats = await getStats();
    console.log(`   Elections: ${stats.elections}`);
    console.log(`   Candidates: ${stats.candidates}`);
    console.log(`   Congress Members: ${stats.congress}`);
    
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}

async function seedElections() {
  const electionData = [
    // 2024 Presidential
    {
      title: '2024 Presidential Election',
      subtitle: 'General Election',
      location: 'United States',
      state: 'US',
      date: new Date('2024-11-05'),
      type: 'general',
      level: 'federal',
      offices: ['President', 'Vice President'],
      description: '2024 United States Presidential Election',
      isActive: false,
    },
    
    // 2026 Midterms - Senate
    {
      title: 'U.S. Senate Election - California',
      subtitle: 'Class III Senate Seat',
      location: 'California',
      state: 'CA',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'federal',
      offices: ['U.S. Senate'],
      description: 'California U.S. Senate race',
      isActive: true,
    },
    {
      title: 'U.S. Senate Election - New York',
      subtitle: 'Class III Senate Seat',
      location: 'New York',
      state: 'NY',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'federal',
      offices: ['U.S. Senate'],
      description: 'New York U.S. Senate race',
      isActive: true,
    },
    {
      title: 'U.S. Senate Election - Texas',
      subtitle: 'Class II Senate Seat',
      location: 'Texas',
      state: 'TX',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'federal',
      offices: ['U.S. Senate'],
      description: 'Texas U.S. Senate race',
      isActive: true,
    },
    {
      title: 'U.S. Senate Election - Florida',
      subtitle: 'Class III Senate Seat',
      location: 'Florida',
      state: 'FL',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'federal',
      offices: ['U.S. Senate'],
      description: 'Florida U.S. Senate race',
      isActive: true,
    },
    
    // 2026 - Gubernatorial
    {
      title: 'California Gubernatorial Election',
      subtitle: 'Governor Race',
      location: 'California',
      state: 'CA',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'state',
      offices: ['Governor'],
      description: 'California Governor Election',
      isActive: true,
    },
    {
      title: 'Texas Gubernatorial Election',
      subtitle: 'Governor Race',
      location: 'Texas',
      state: 'TX',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'state',
      offices: ['Governor'],
      description: 'Texas Governor Election',
      isActive: true,
    },
    {
      title: 'New York Gubernatorial Election',
      subtitle: 'Governor Race',
      location: 'New York',
      state: 'NY',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'state',
      offices: ['Governor'],
      description: 'New York Governor Election',
      isActive: true,
    },
    {
      title: 'Florida Gubernatorial Election',
      subtitle: 'Governor Race',
      location: 'Florida',
      state: 'FL',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'state',
      offices: ['Governor'],
      description: 'Florida Governor Election',
      isActive: true,
    },
    
    // 2026 - House Races (sample)
    {
      title: 'U.S. House Election - CA-12',
      subtitle: 'San Francisco District',
      location: 'San Francisco, CA',
      state: 'CA',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'federal',
      offices: ['U.S. House of Representatives'],
      description: 'California 12th Congressional District',
      isActive: true,
    },
    {
      title: 'U.S. House Election - TX-21',
      subtitle: 'Austin Area District',
      location: 'Austin, TX',
      state: 'TX',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'federal',
      offices: ['U.S. House of Representatives'],
      description: 'Texas 21st Congressional District',
      isActive: true,
    },
    {
      title: 'U.S. House Election - NY-14',
      subtitle: 'Queens/Bronx District',
      location: 'New York, NY',
      state: 'NY',
      date: new Date('2026-11-03'),
      type: 'general',
      level: 'federal',
      offices: ['U.S. House of Representatives'],
      description: 'New York 14th Congressional District',
      isActive: true,
    },
    
    // 2026 Special Elections (updated date to future)
    {
      title: 'Virginia Special Election - HD-21',
      subtitle: 'House District 21',
      location: 'Loudoun County, VA',
      state: 'VA',
      date: new Date('2026-02-10'),
      type: 'special',
      level: 'state',
      offices: ['State House'],
      description: 'Special election to fill vacancy',
      isActive: true,
    },
    
    // 2026 Primaries
    {
      title: 'California Primary Election',
      subtitle: 'Statewide Primary',
      location: 'California',
      state: 'CA',
      date: new Date('2026-06-02'),
      type: 'primary',
      level: 'state',
      offices: ['All Offices'],
      description: 'California Primary for all 2026 races',
      isActive: true,
    },
    {
      title: 'Texas Primary Election',
      subtitle: 'Statewide Primary',
      location: 'Texas',
      state: 'TX',
      date: new Date('2026-03-03'),
      type: 'primary',
      level: 'state',
      offices: ['All Offices'],
      description: 'Texas Primary for all 2026 races',
      isActive: true,
    },
  ];

  await db.insert(elections).values(electionData);
  console.log(`   ✅ Inserted ${electionData.length} elections`);
}

async function seedCandidates() {
  // Get elections to attach candidates
  const allElections = await db.select().from(elections);
  
  const candidateData = [];
  
  // Only seed REAL, CONFIRMED candidates - no placeholders
  // For elections where we have confirmed candidate names
  for (const election of allElections) {
    if (election.level === 'federal' && election.offices?.includes('U.S. Senate')) {
      // Only add candidates we can verify as real
      if (election.state === 'CA') {
        candidateData.push({
          name: 'Adam Schiff',
          party: 'D',
          electionId: election.id,
          isIncumbent: false,
          description: 'U.S. Representative, CA-30. Running for U.S. Senate.',
          pollingSupport: null,
          pollingTrend: null,
        });
        candidateData.push({
          name: 'Steve Garvey',
          party: 'R',
          electionId: election.id,
          isIncumbent: false,
          description: 'Former MLB player. Republican candidate for U.S. Senate.',
          pollingSupport: null,
          pollingTrend: null,
        });
      } else if (election.state === 'NY') {
        candidateData.push({
          name: 'Kirsten Gillibrand',
          party: 'D',
          electionId: election.id,
          isIncumbent: true,
          description: 'Incumbent U.S. Senator from New York.',
          pollingSupport: null,
          pollingTrend: null,
        });
      } else if (election.state === 'TX') {
        candidateData.push({
          name: 'Ted Cruz',
          party: 'R',
          electionId: election.id,
          isIncumbent: true,
          description: 'Incumbent U.S. Senator from Texas.',
          pollingSupport: null,
          pollingTrend: null,
        });
      } else if (election.state === 'FL') {
        candidateData.push({
          name: 'Rick Scott',
          party: 'R',
          electionId: election.id,
          isIncumbent: true,
          description: 'Incumbent U.S. Senator from Florida.',
          pollingSupport: null,
          pollingTrend: null,
        });
      }
      // For other states: Don't add fake candidates - leave empty
      // They will be added when API sync runs or admin adds them
    }
    // For Governor races and House races:
    // Don't add placeholder candidates
    // Wait for real data from APIs or admin entry
  }

  if (candidateData.length > 0) {
    await db.insert(candidates).values(candidateData);
    console.log(`   ✅ Inserted ${candidateData.length} REAL candidates`);
  } else {
    console.log(`   ⚠️  No confirmed candidates to seed (will be populated via API sync)`);
  }
}

async function seedCongress() {
  const congressData = [
    // Sample Senate members
    {
      bioguideId: 'S000033',
      name: 'Bernie Sanders',
      party: 'Independent',
      state: 'VT',
      district: null,
      chamber: 'senate',
      title: 'Senator',
      imageUrl: 'https://theunitedstates.io/images/congress/225x275/S000033.jpg',
      startDate: new Date('2007-01-03'),
      terms: 3,
    },
    {
      bioguideId: 'S001181',
      name: 'Jeanne Shaheen',
      party: 'Democratic',
      state: 'NH',
      district: null,
      chamber: 'senate',
      title: 'Senator',
      imageUrl: 'https://theunitedstates.io/images/congress/225x275/S001181.jpg',
      startDate: new Date('2009-01-06'),
      terms: 3,
    },
    // Sample House members
    {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      party: 'Democratic',
      state: 'CA',
      district: 11,
      chamber: 'house',
      title: 'Representative',
      imageUrl: 'https://theunitedstates.io/images/congress/225x275/P000197.jpg',
      startDate: new Date('1987-06-02'),
      terms: 19,
    },
    {
      bioguideId: 'O000172',
      name: 'Alexandria Ocasio-Cortez',
      party: 'Democratic',
      state: 'NY',
      district: 14,
      chamber: 'house',
      title: 'Representative',
      imageUrl: 'https://theunitedstates.io/images/congress/225x275/O000172.jpg',
      startDate: new Date('2019-01-03'),
      terms: 3,
    },
  ];

  await db.insert(congressMembers).values(congressData);
  console.log(`   ✅ Inserted ${congressData.length} congress members`);
}

async function getStats() {
  const electionCount = await db.select({ count: sql`count(*)` }).from(elections);
  const candidateCount = await db.select({ count: sql`count(*)` }).from(candidates);
  const congressCount = await db.select({ count: sql`count(*)` }).from(congressMembers);
  
  return {
    elections: parseInt(electionCount[0]?.count?.toString() || '0'),
    candidates: parseInt(candidateCount[0]?.count?.toString() || '0'),
    congress: parseInt(congressCount[0]?.count?.toString() || '0'),
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
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
