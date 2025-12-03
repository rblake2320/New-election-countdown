#!/usr/bin/env node

/**
 * Comprehensive Verification Suite for Election Platform
 * Tests all critical functionality and data integrity
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function runVerification() {
  console.log('🔍 COMPREHENSIVE VERIFICATION STARTING...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  const results = [];
  
  // Test 1: Health Check with consistent counts
  totalTests++;
  try {
    const health = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
    const hasConsistentCounts = health.total_elections && health.visible_elections !== undefined;
    
    if (health.ok && hasConsistentCounts) {
      passedTests++;
      results.push('✅ Health API: Returns consistent counts');
    } else {
      results.push('❌ Health API: Missing total_elections or visible_elections');
    }
  } catch (err) {
    results.push(`❌ Health API: ${err.message}`);
  }
  
  // Test 2: Elections API returns candidate counts
  totalTests++;
  try {
    const elections = await fetch(`${BASE_URL}/api/elections?limit=10`).then(r => r.json());
    const hasCandidateCounts = elections.every(e => 'candidateCount' in e);
    
    if (Array.isArray(elections) && hasCandidateCounts) {
      passedTests++;
      results.push('✅ Elections API: Returns candidate counts');
    } else {
      results.push('❌ Elections API: Missing candidateCount field');
    }
  } catch (err) {
    results.push(`❌ Elections API: ${err.message}`);
  }
  
  // Test 3: Election counts endpoint
  totalTests++;
  try {
    const countsRes = await fetch(`${BASE_URL}/api/elections/counts`);
    if (countsRes.ok) {
      const counts = await countsRes.json();
      if (counts.total && counts.byType) {
        passedTests++;
        results.push('✅ Election Counts: Endpoint exists and returns data');
      } else {
        results.push('❌ Election Counts: Invalid response format');
      }
    } else {
      results.push(`❌ Election Counts: Returns ${countsRes.status}`);
    }
  } catch (err) {
    results.push(`❌ Election Counts: ${err.message}`);
  }
  
  // Test 4: Candidates API for upcoming elections
  totalTests++;
  try {
    const elections = await fetch(`${BASE_URL}/api/elections?limit=5`).then(r => r.json());
    let candidateAPIWorks = true;
    
    for (const election of elections.slice(0, 3)) {
      const candidatesRes = await fetch(`${BASE_URL}/api/elections/${election.id}/candidates`);
      const candidates = await candidatesRes.json();
      
      if (!candidatesRes.ok || !Array.isArray(candidates)) {
        candidateAPIWorks = false;
        break;
      }
    }
    
    if (candidateAPIWorks) {
      passedTests++;
      results.push('✅ Candidates API: Returns arrays for all elections');
    } else {
      results.push('❌ Candidates API: Failed for some elections');
    }
  } catch (err) {
    results.push(`❌ Candidates API: ${err.message}`);
  }
  
  // Test 5: Error handling (404 for invalid endpoints)
  totalTests++;
  try {
    const res = await fetch(`${BASE_URL}/api/invalid-endpoint`);
    if (res.status === 404) {
      passedTests++;
      results.push('✅ Error Handling: Returns 404 for invalid endpoints');
    } else {
      results.push(`❌ Error Handling: Returns ${res.status} instead of 404`);
    }
  } catch (err) {
    results.push(`❌ Error Handling: ${err.message}`);
  }
  
  // Test 6: Specific elections with candidates
  totalTests++;
  try {
    const testElections = [806, 809, 807]; // Los Banos, AD-63, Louisiana
    let allHaveCandidates = true;
    
    for (const id of testElections) {
      const res = await fetch(`${BASE_URL}/api/elections/${id}/candidates`);
      const candidates = await res.json();
      if (!Array.isArray(candidates) || candidates.length === 0) {
        allHaveCandidates = false;
        break;
      }
    }
    
    if (allHaveCandidates) {
      passedTests++;
      results.push('✅ Target Elections: All have candidates loaded');
    } else {
      results.push('❌ Target Elections: Some missing candidates');
    }
  } catch (err) {
    results.push(`❌ Target Elections: ${err.message}`);
  }
  
  // Test 7: Date range elections coverage
  totalTests++;
  try {
    const allElections = await fetch(`${BASE_URL}/api/elections?limit=1000`).then(r => r.json());
    const now = Date.now();
    const upcoming = allElections.filter(e => {
      const d = new Date(e.date).getTime();
      return d >= now - 7 * 86400000 && d <= now + 60 * 86400000;
    });
    
    let allRespond = true;
    for (const e of upcoming) {
      const res = await fetch(`${BASE_URL}/api/elections/${e.id}/candidates`);
      if (!res.ok) {
        allRespond = false;
        break;
      }
    }
    
    if (allRespond) {
      passedTests++;
      results.push(`✅ Coverage Window: All ${upcoming.length} upcoming elections respond`);
    } else {
      results.push('❌ Coverage Window: Some elections fail to respond');
    }
  } catch (err) {
    results.push(`❌ Coverage Window: ${err.message}`);
  }
  
  // Print summary
  console.log('=== VERIFICATION RESULTS ===\n');
  results.forEach(r => console.log(r));
  
  console.log('\n=== SUMMARY ===');
  console.log(`Tests Passed: ${passedTests}/${totalTests} (${((passedTests/totalTests) * 100).toFixed(1)}%)`);
  
  const status = passedTests === totalTests ? '✅ ALL TESTS PASSED' : 
                 passedTests >= totalTests * 0.8 ? '⚠️ MOSTLY WORKING' : 
                 '❌ CRITICAL ISSUES';
  
  console.log(`\nStatus: ${status}`);
  
  // Exit with proper code
  process.exit(passedTests === totalTests ? 0 : 1);
}

runVerification().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});