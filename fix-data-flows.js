#!/usr/bin/env node

/**
 * Data Flow Verification and Repair Script
 * Ensures all database connections, API flows, and data integrity are working properly
 */

import { db } from './server/db.ts';
import { elections, candidates, congressMembers } from './shared/schema.ts';
import { sql, eq, count, isNull } from 'drizzle-orm';

async function verifyDatabaseConnections() {
  console.log('🔌 Verifying Database Connections...');
  
  try {
    // Test basic connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection: OK');
    
    // Test table existence and structure
    const tables = [
      { name: 'elections', schema: elections },
      { name: 'candidates', schema: candidates },
      { name: 'congress_members', schema: congressMembers }
    ];
    
    for (const table of tables) {
      try {
        const count = await db.select({ count: sql`count(*)` }).from(table.schema);
        console.log(`✅ Table ${table.name}: ${count[0].count} records`);
      } catch (error) {
        console.error(`❌ Table ${table.name}: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function verifyDataIntegrity() {
  console.log('\n🔍 Verifying Data Integrity...');
  
  // Check for elections without candidates
  const electionsWithoutCandidates = await db
    .select({
      state: elections.state,
      count: count()
    })
    .from(elections)
    .leftJoin(candidates, eq(elections.id, candidates.electionId))
    .where(isNull(candidates.id))
    .groupBy(elections.state)
    .orderBy(sql`count(*) DESC`);
    
  console.log('\n📊 Elections Missing Candidates by State:');
  electionsWithoutCandidates.forEach(row => {
    console.log(`   ${row.state}: ${row.count} elections`);
  });
  
  // Check for orphaned candidates
  const orphanedCandidates = await db
    .select({ count: count() })
    .from(candidates)
    .leftJoin(elections, eq(candidates.electionId, elections.id))
    .where(isNull(elections.id));
    
  if (orphanedCandidates[0].count > 0) {
    console.log(`⚠️  Found ${orphanedCandidates[0].count} orphaned candidates`);
  } else {
    console.log('✅ No orphaned candidates found');
  }
  
  // Verify data quality
  const dataQualityCheck = await db
    .select({
      totalElections: count(elections.id),
      electionsWithCandidates: count(candidates.id)
    })
    .from(elections)
    .leftJoin(candidates, eq(elections.id, candidates.electionId));
    
  const coveragePercent = Math.round((dataQualityCheck[0].electionsWithCandidates / dataQualityCheck[0].totalElections) * 100);
  console.log(`\n📈 Data Coverage: ${coveragePercent}% (${dataQualityCheck[0].electionsWithCandidates}/${dataQualityCheck[0].totalElections} elections have candidates)`);
  
  return coveragePercent;
}

async function fixRelationshipIntegrity() {
  console.log('\n🔧 Fixing Relationship Integrity...');
  
  // Clean up orphaned candidates
  const orphanCleanup = await db
    .delete(candidates)
    .where(
      sql`election_id NOT IN (SELECT id FROM elections)`
    );
    
  console.log(`✅ Cleaned up orphaned candidates`);
  
  // Ensure all election IDs are properly set
  const candidateCheck = await db
    .select({
      id: candidates.id,
      electionId: candidates.electionId
    })
    .from(candidates)
    .where(isNull(candidates.electionId));
    
  if (candidateCheck.length > 0) {
    console.log(`⚠️  Found ${candidateCheck.length} candidates with null election_id`);
  } else {
    console.log('✅ All candidates properly linked to elections');
  }
}

async function verifyAPIEndpoints() {
  console.log('\n🌐 Verifying API Endpoints...');
  
  const baseUrl = 'http://localhost:5000';
  const endpoints = [
    '/api/elections',
    '/api/elections/800/candidates',
    '/api/congress/members',
    '/api/health'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (response.ok) {
        console.log(`✅ ${endpoint}: OK (${response.status})`);
      } else {
        console.log(`⚠️  ${endpoint}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function generateDataFlowReport() {
  console.log('\n📋 Generating Data Flow Report...');
  
  // Get comprehensive statistics
  const stats = await db.execute(sql`
    SELECT 
      'Total Elections' as metric,
      COUNT(*) as value
    FROM elections
    UNION ALL
    SELECT 
      'Elections with Candidates',
      COUNT(DISTINCT e.id)
    FROM elections e
    INNER JOIN candidates c ON e.id = c.election_id
    UNION ALL
    SELECT 
      'Total Candidates',
      COUNT(*)
    FROM candidates
    UNION ALL
    SELECT 
      'Congress Members',
      COUNT(*)
    FROM congress_members
    UNION ALL
    SELECT 
      'Upcoming Elections',
      COUNT(*)
    FROM elections
    WHERE date >= CURRENT_DATE
  `);
  
  console.log('\n📊 SYSTEM STATUS REPORT');
  console.log('========================');
  stats.forEach(row => {
    console.log(`${row.metric}: ${row.value}`);
  });
}

async function main() {
  console.log('🚀 Starting Data Flow Verification and Repair');
  console.log('==============================================\n');
  
  // Step 1: Verify database connections
  const dbOk = await verifyDatabaseConnections();
  if (!dbOk) {
    console.error('❌ Database connection failed. Aborting.');
    process.exit(1);
  }
  
  // Step 2: Verify data integrity
  const coverage = await verifyDataIntegrity();
  
  // Step 3: Fix relationship integrity
  await fixRelationshipIntegrity();
  
  // Step 4: Verify API endpoints
  await verifyAPIEndpoints();
  
  // Step 5: Generate final report
  await generateDataFlowReport();
  
  console.log('\n🎉 DATA FLOW VERIFICATION COMPLETE');
  
  if (coverage < 50) {
    console.log('\n⚠️  RECOMMENDATION: Run comprehensive-data-population.js to improve data coverage');
  } else {
    console.log('\n✅ Data coverage is adequate');
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});