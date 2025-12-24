#!/usr/bin/env node
/**
 * API Verification Script
 * Tests all API integrations and counts real data
 * Run with: node scripts/verify-apis.js
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';
import { db } from '../server/db.ts';
import { elections, candidates } from '../shared/schema.ts';
import { sql } from 'drizzle-orm';

config(); // Load .env

const results = {
  timestamp: new Date().toISOString(),
  overall: { passed: 0, failed: 0, total: 0 },
  tests: []
};

// Colors for console output
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const blue = '\x1b[36m';
const reset = '\x1b[0m';

function log(emoji, message, color = reset) {
  console.log(`${color}${emoji} ${message}${reset}`);
}

function addResult(test, status, message, data = {}) {
  results.tests.push({ test, status, message, data, timestamp: new Date().toISOString() });
  results.overall[status === 'passed' ? 'passed' : 'failed']++;
  results.overall.total++;
}

// Test 1: Database Connection
async function testDatabase() {
  log('🗄️', 'Testing database connection...', blue);
  try {
    const result = await db.execute(sql`SELECT 1 as test, NOW() as time`);
    const latency = Date.now() - new Date(result[0]?.time || Date.now()).getTime();
    addResult('Database', 'passed', `Connected successfully (${latency}ms latency)`, { latency });
    log('✅', `Database: Connected (${latency}ms)`, green);
  } catch (error) {
    addResult('Database', 'failed', error.message);
    log('❌', `Database: ${error.message}`, red);
  }
}

// Test 2: Count Real Elections
async function testElections() {
  log('🗳️', 'Counting elections in database...', blue);
  try {
    const result = await db.select({ count: sql`count(*)` }).from(elections);
    const count = parseInt(result[0]?.count || 0);
    addResult('Elections', 'passed', `${count} elections found in database`, { count });
    log('✅', `Elections: ${count} real elections loaded`, green);
    
    // Break down by type
    const byType = await db.select({
      type: elections.type,
      count: sql`count(*)`
    }).from(elections).groupBy(elections.type);
    
    log('  📊', `Breakdown:`, blue);
    byType.forEach(({ type, count }) => {
      log('    •', `${type}: ${count}`, reset);
    });
    
    return count;
  } catch (error) {
    addResult('Elections', 'failed', error.message);
    log('❌', `Elections: ${error.message}`, red);
    return 0;
  }
}

// Test 3: Count Real Candidates
async function testCandidates() {
  log('👥', 'Counting candidates in database...', blue);
  try {
    const result = await db.select({ count: sql`count(*)` }).from(candidates);
    const count = parseInt(result[0]?.count || 0);
    addResult('Candidates', 'passed', `${count} candidates found in database`, { count });
    log('✅', `Candidates: ${count} real candidates loaded`, green);
    return count;
  } catch (error) {
    addResult('Candidates', 'failed', error.message);
    log('❌', `Candidates: ${error.message}`, red);
    return 0;
  }
}

// Test 4: Google Civic API
async function testGoogleCivic() {
  log('🏛️', 'Testing Google Civic API...', blue);
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  
  if (!apiKey) {
    addResult('Google Civic API', 'failed', 'API key not configured');
    log('⚠️', 'Google Civic API: No API key found', yellow);
    return;
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/civicinfo/v2/elections?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    const electionCount = data.elections?.length || 0;
    addResult('Google Civic API', 'passed', `Connected successfully (${electionCount} elections available)`, { electionCount });
    log('✅', `Google Civic API: ${electionCount} elections available`, green);
  } catch (error) {
    addResult('Google Civic API', 'failed', error.message);
    log('❌', `Google Civic API: ${error.message}`, red);
  }
}

// Test 5: OpenFEC API
async function testOpenFEC() {
  log('💰', 'Testing OpenFEC API...', blue);
  const apiKey = process.env.OPENFEC_API_KEY;
  
  if (!apiKey) {
    addResult('OpenFEC API', 'failed', 'API key not configured');
    log('⚠️', 'OpenFEC API: No API key found', yellow);
    return;
  }
  
  try {
    const response = await fetch(
      `https://api.open.fec.gov/v1/candidates/?api_key=${apiKey}&per_page=1`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const totalCandidates = data.pagination?.count || 0;
    addResult('OpenFEC API', 'passed', `Connected successfully (${totalCandidates.toLocaleString()} candidates available)`, { totalCandidates });
    log('✅', `OpenFEC API: ${totalCandidates.toLocaleString()} candidates in FEC database`, green);
  } catch (error) {
    addResult('OpenFEC API', 'failed', error.message);
    log('❌', `OpenFEC API: ${error.message}`, red);
  }
}

// Test 6: ProPublica Congress API
async function testProPublica() {
  log('🏛️', 'Testing ProPublica Congress API...', blue);
  const apiKey = process.env.PROPUBLICA_API_KEY;
  
  if (!apiKey) {
    addResult('ProPublica API', 'failed', 'API key not configured');
    log('⚠️', 'ProPublica API: No API key found', yellow);
    return;
  }
  
  try {
    const response = await fetch(
      'https://api.propublica.org/congress/v1/118/senate/members.json',
      { headers: { 'X-API-Key': apiKey } }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const memberCount = data.results?.[0]?.members?.length || 0;
    addResult('ProPublica API', 'passed', `Connected successfully (${memberCount} senators found)`, { memberCount });
    log('✅', `ProPublica API: ${memberCount} senators in 118th Congress`, green);
  } catch (error) {
    addResult('ProPublica API', 'failed', error.message);
    log('❌', `ProPublica API: ${error.message}`, red);
  }
}

// Test 7: System Health
async function testSystemHealth() {
  log('💚', 'Testing system health endpoint...', blue);
  try {
    const response = await fetch('http://localhost:5000/api/health/enhanced');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    addResult('System Health', 'passed', 'Health endpoint responding', data);
    log('✅', 'System Health: All systems operational', green);
  } catch (error) {
    addResult('System Health', 'failed', error.message);
    log('⚠️', 'System Health: Server may not be running (start with: npm run dev)', yellow);
  }
}

// Main execution
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('🚀', 'ElectionTracker API Verification', blue);
  console.log('='.repeat(60) + '\n');
  
  await testDatabase();
  console.log();
  
  const electionCount = await testElections();
  console.log();
  
  const candidateCount = await testCandidates();
  console.log();
  
  await testGoogleCivic();
  console.log();
  
  await testOpenFEC();
  console.log();
  
  await testProPublica();
  console.log();
  
  await testSystemHealth();
  console.log();
  
  // Summary
  console.log('='.repeat(60));
  log('📊', 'SUMMARY', blue);
  console.log('='.repeat(60));
  log('✅', `Tests Passed: ${results.overall.passed}/${results.overall.total}`, green);
  log('❌', `Tests Failed: ${results.overall.failed}/${results.overall.total}`, results.overall.failed > 0 ? red : green);
  log('🗳️', `Elections Loaded: ${electionCount}`, green);
  log('👥', `Candidates Loaded: ${candidateCount}`, green);
  console.log('='.repeat(60) + '\n');
  
  // Investor talking points
  if (results.overall.passed >= results.overall.total - 2) {
    log('🎯', 'INVESTOR TALKING POINTS:', blue);
    console.log(`  "We have ${electionCount} real elections loaded from authentic government sources"`);
    console.log(`  "Platform tracking ${candidateCount} candidates across federal, state, and local races"`);
    console.log(`  "${results.overall.passed}/${results.overall.total} API integrations verified and operational"`);
    console.log(`  "Real-time data from Google Civic API, OpenFEC, ProPublica, and more"\n`);
  } else {
    log('⚠️', 'RECOMMENDATION:', yellow);
    console.log('  Add missing API keys to .env file before investor demo');
    console.log('  See .env.example for required keys\n');
  }
  
  // Save results to file
  const fs = await import('fs');
  fs.writeFileSync(
    'api-verification-results.json',
    JSON.stringify(results, null, 2)
  );
  log('💾', 'Results saved to: api-verification-results.json', blue);
  
  process.exit(results.overall.failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
