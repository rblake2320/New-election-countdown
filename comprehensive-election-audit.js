// Comprehensive Election Data Audit and Enhancement System
// Identifies missing elections and ensures complete coverage

import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function auditElectionData() {
  console.log('🔍 Starting comprehensive election data audit...');
  
  try {
    // Get current database elections
    const result = await pool.query(`
      SELECT 
        date,
        title,
        state,
        level,
        type,
        location
      FROM elections 
      WHERE date >= CURRENT_DATE 
      ORDER BY date ASC
    `);
    
    const dbElections = result.rows;
    console.log(`📊 Found ${dbElections.length} elections in database from today forward`);
    
    // Check for today's elections specifically
    const today = new Date().toISOString().split('T')[0];
    const todayElections = dbElections.filter(e => 
      e.date.toISOString().split('T')[0] === today
    );
    
    console.log(`📅 Elections scheduled for today (${today}):`);
    if (todayElections.length === 0) {
      console.log('❌ No elections found in database for today');
    } else {
      todayElections.forEach(election => {
        console.log(`  - ${election.title} (${election.state}, ${election.level})`);
      });
    }
    
    // Analyze gaps by checking key election dates
    console.log('\n🔍 Analyzing potential data gaps...');
    
    // Check for special elections that might be missing
    const specialElectionQuery = await pool.query(`
      SELECT COUNT(*) as count 
      FROM elections 
      WHERE type = 'Special' 
      AND date >= CURRENT_DATE 
      AND date <= CURRENT_DATE + INTERVAL '6 months'
    `);
    
    console.log(`🗳️ Special elections in next 6 months: ${specialElectionQuery.rows[0].count}`);
    
    // Check for local elections by state
    const localElectionQuery = await pool.query(`
      SELECT 
        state,
        COUNT(*) as local_count
      FROM elections 
      WHERE level = 'Local' 
      AND date >= CURRENT_DATE 
      GROUP BY state 
      ORDER BY local_count DESC
    `);
    
    console.log('\n🏛️ Local elections by state:');
    localElectionQuery.rows.forEach(row => {
      console.log(`  ${row.state}: ${row.local_count} elections`);
    });
    
    // Generate recommendations
    console.log('\n💡 Data Enhancement Recommendations:');
    
    if (todayElections.length === 0) {
      console.log('1. ⚠️  CRITICAL: No elections found for today - verify with official sources');
    }
    
    if (specialElectionQuery.rows[0].count < 10) {
      console.log('2. 📋 Consider expanding special election coverage');
    }
    
    // Check for missing primaries
    const primaryQuery = await pool.query(`
      SELECT COUNT(*) as count 
      FROM elections 
      WHERE type = 'Primary' 
      AND date >= CURRENT_DATE 
      AND date <= CURRENT_DATE + INTERVAL '1 year'
    `);
    
    if (primaryQuery.rows[0].count < 50) {
      console.log('3. 🗳️  Primary election coverage may be incomplete');
    }
    
    console.log('\n✅ Election data audit complete');
    
  } catch (error) {
    console.error('❌ Error during election audit:', error);
  } finally {
    await pool.end();
  }
}

// Enhanced election discovery system
async function discoverMissingElections() {
  console.log('\n🔍 Discovering potentially missing elections...');
  
  // Common election types and their typical scheduling
  const electionPatterns = [
    {
      type: 'Municipal',
      level: 'Local',
      months: [3, 4, 5, 11], // Spring and Fall
      description: 'City council, mayoral elections'
    },
    {
      type: 'School Board',
      level: 'Local', 
      months: [4, 5, 11],
      description: 'School district elections'
    },
    {
      type: 'Special District',
      level: 'Local',
      months: [2, 3, 4, 5, 6, 8, 9, 10, 11],
      description: 'Fire district, water district elections'
    },
    {
      type: 'Runoff',
      level: 'State',
      months: [4, 5, 6, 12],
      description: 'Post-primary runoff elections'
    }
  ];
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  console.log(`📅 Current period: Month ${currentMonth}, Year ${currentYear}`);
  
  electionPatterns.forEach(pattern => {
    if (pattern.months.includes(currentMonth)) {
      console.log(`🎯 Expected: ${pattern.description} (${pattern.type}, ${pattern.level})`);
    }
  });
  
  return electionPatterns;
}

async function main() {
  await auditElectionData();
  await discoverMissingElections();
}

main().catch(console.error);

export { auditElectionData, discoverMissingElections };