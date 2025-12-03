#!/usr/bin/env node

/**
 * Data Sanity Check Runner
 * Runs comprehensive data integrity checks and reports issues
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function runSanityChecks() {
  console.log('🔍 Running Data Sanity Checks...\n');
  
  const issues = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  
  try {
    // Check 1: CA Uniform District Election Date Compliance
    console.log('1️⃣ Checking CA Uniform District Election dates...');
    const caUdelCheck = await sql`
      SELECT id, title, date::DATE as election_date
      FROM elections
      WHERE state = 'CA'
        AND level = 'Local'
        AND (title ILIKE '%uniform district%' OR title ILIKE '%special district%')
        AND date::DATE != '2025-11-04'
    `;
    
    if (caUdelCheck.length === 0) {
      console.log('   ✅ All CA Uniform District Elections on correct date (Nov 4, 2025)');
      passed++;
    } else {
      console.log(`   ⚠️ Found ${caUdelCheck.length} CA elections with incorrect dates:`);
      caUdelCheck.forEach(e => {
        console.log(`      - ID ${e.id}: "${e.title}" on ${e.election_date}`);
        issues.push({
          type: 'warning',
          check: 'CA UDEL Date',
          message: `Election ${e.id} has wrong date: ${e.election_date}`
        });
      });
      warnings++;
    }
    
    // Check 2: Duplicate Elections
    console.log('\n2️⃣ Checking for duplicate elections...');
    const duplicates = await sql`
      SELECT state, date::DATE as election_date, title, COUNT(*) as count
      FROM elections
      WHERE date >= CURRENT_DATE
      GROUP BY state, date::DATE, title
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length === 0) {
      console.log('   ✅ No duplicate elections found');
      passed++;
    } else {
      console.log(`   ❌ Found ${duplicates.length} duplicate election groups:`);
      duplicates.forEach(d => {
        console.log(`      - ${d.count}x "${d.title}" in ${d.state} on ${d.election_date}`);
        issues.push({
          type: 'error',
          check: 'Duplicates',
          message: `${d.count} duplicate elections: ${d.title}`
        });
      });
      failed++;
    }
    
    // Check 3: Elections with Truth Records
    console.log('\n3️⃣ Checking election truth records...');
    const truthCheck = await sql`
      SELECT COUNT(*) as total_elections,
             COUNT(et.election_id) as with_truth,
             COUNT(*) - COUNT(et.election_id) as without_truth
      FROM elections e
      LEFT JOIN election_truth et ON et.election_id = e.id
      WHERE e.date >= CURRENT_DATE
    `;
    
    const truthData = truthCheck[0];
    console.log(`   📊 ${truthData.with_truth}/${truthData.total_elections} elections have truth records`);
    if (truthData.with_truth > 0) {
      console.log('   ✅ Truth table is being used');
      passed++;
    } else {
      console.log('   ℹ️ Truth table not yet populated');
    }
    
    // Check 4: Congress Member Counts
    console.log('\n4️⃣ Checking congressional member counts...');
    const memberCounts = await sql`
      SELECT state, COUNT(*) as count
      FROM congress_members
      WHERE is_voting_member = true
      GROUP BY state
      HAVING state IN ('CA', 'TX', 'FL', 'NY')
      ORDER BY state
    `;
    
    const expectedCounts = {
      'CA': 54,  // 52 House + 2 Senate
      'TX': 40,  // 38 House + 2 Senate
      'FL': 29,  // 27 House + 2 Senate
      'NY': 28   // 26 House + 2 Senate
    };
    
    let congressOk = true;
    memberCounts.forEach(mc => {
      const expected = expectedCounts[mc.state];
      if (mc.count === expected) {
        console.log(`   ✅ ${mc.state}: ${mc.count} members (correct)`);
      } else {
        console.log(`   ❌ ${mc.state}: ${mc.count} members (expected ${expected})`);
        issues.push({
          type: 'error',
          check: 'Congress Count',
          message: `${mc.state} has ${mc.count} members, expected ${expected}`
        });
        congressOk = false;
      }
    });
    
    if (congressOk) passed++;
    else failed++;
    
    // Check 5: Upcoming Elections Without Candidates
    console.log('\n5️⃣ Checking upcoming elections for candidates...');
    const noCandidates = await sql`
      SELECT e.id, e.title, e.date::DATE as election_date, e.state,
             COUNT(ec.candidate_id) as candidate_count
      FROM elections e
      LEFT JOIN election_candidates ec ON ec.election_id = e.id
      WHERE e.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      GROUP BY e.id, e.title, e.date, e.state
      HAVING COUNT(ec.candidate_id) = 0
      ORDER BY e.date
      LIMIT 10
    `;
    
    if (noCandidates.length === 0) {
      console.log('   ✅ All upcoming elections (30 days) have candidates');
      passed++;
    } else {
      console.log(`   ⚠️ ${noCandidates.length} elections need candidates:`);
      noCandidates.forEach(e => {
        console.log(`      - ${e.election_date}: "${e.title}" (${e.state})`);
      });
      warnings++;
    }
    
    // Check 6: Data Sources
    console.log('\n6️⃣ Checking data sources...');
    const sources = await sql`
      SELECT name, authority, reliability, COUNT(ef.fact_id) as facts_count
      FROM sources s
      LEFT JOIN election_facts ef ON ef.source_id = s.id
      GROUP BY s.id, s.name, s.authority, s.reliability
      ORDER BY facts_count DESC
    `;
    
    console.log('   📊 Registered data sources:');
    sources.forEach(s => {
      console.log(`      - ${s.name}: ${s.facts_count} facts (${s.reliability}% reliable)`);
    });
    passed++;
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SANITY CHECK SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Total Checks: ${passed + warnings + failed}`);
    
    if (issues.length > 0) {
      console.log('\n📋 Issues Found:');
      issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : '⚠️';
        console.log(`   ${icon} [${issue.check}] ${issue.message}`);
      });
    }
    
    // Return status code
    if (failed > 0) {
      console.log('\n❌ Sanity check failed with errors');
      process.exit(1);
    } else if (warnings > 0) {
      console.log('\n⚠️ Sanity check passed with warnings');
      process.exit(0);
    } else {
      console.log('\n✅ All sanity checks passed!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error running sanity checks:', error);
    process.exit(1);
  }
}

// Run if called directly
runSanityChecks();

export { runSanityChecks };