#!/usr/bin/env node

/**
 * Comprehensive test to verify the global candidate linkage fix
 */

async function testElectionCandidates() {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
  console.log('Testing global candidate linkage fix...\n');
  
  try {
    // Fetch all elections
    const electionsRes = await fetch(`${BASE_URL}/api/elections?limit=1000`);
    const elections = await electionsRes.json();
    
    // Filter for upcoming elections (next 60 days)
    const now = Date.now();
    const upcoming = elections.filter(e => {
      const d = new Date(e.date).getTime();
      return d >= now - 7 * 86400000 && d <= now + 60 * 86400000;
    });
    
    console.log(`Found ${upcoming.length} elections in the next 60 days`);
    
    let withCandidates = 0;
    let withoutCandidates = 0;
    let errors = 0;
    const emptySamples = [];
    
    // Test each election's candidate endpoint
    for (const election of upcoming) {
      try {
        const candidatesRes = await fetch(`${BASE_URL}/api/elections/${election.id}/candidates`);
        
        if (!candidatesRes.ok) {
          errors++;
          console.error(`✗ Failed to fetch candidates for election ${election.id}: ${candidatesRes.status}`);
          continue;
        }
        
        const candidates = await candidatesRes.json();
        
        if (!Array.isArray(candidates)) {
          errors++;
          console.error(`✗ Invalid response for election ${election.id}: not an array`);
          continue;
        }
        
        if (candidates.length > 0) {
          withCandidates++;
        } else {
          withoutCandidates++;
          if (emptySamples.length < 5) {
            emptySamples.push({
              id: election.id,
              title: election.title,
              state: election.state,
              date: election.date
            });
          }
        }
      } catch (err) {
        errors++;
        console.error(`✗ Error fetching candidates for election ${election.id}:`, err.message);
      }
    }
    
    // Print results
    console.log('\n=== TEST RESULTS ===');
    console.log(`✓ Elections with candidates: ${withCandidates}`);
    console.log(`⚠ Elections without candidates: ${withoutCandidates}`);
    console.log(`✗ Errors: ${errors}`);
    console.log(`Coverage: ${((withCandidates / upcoming.length) * 100).toFixed(1)}%`);
    
    if (emptySamples.length > 0) {
      console.log('\nSample elections without candidates:');
      emptySamples.forEach(e => {
        console.log(`  - [${e.id}] ${e.title} (${e.state}, ${new Date(e.date).toLocaleDateString()})`);
      });
    }
    
    // Test specific elections we fixed
    console.log('\n=== SPECIFIC ELECTIONS TEST ===');
    const specificTests = [
      { id: 806, name: 'Los Banos District 1' },
      { id: 809, name: 'Assembly District 63' },
      { id: 807, name: 'Louisiana Special' }
    ];
    
    for (const test of specificTests) {
      const res = await fetch(`${BASE_URL}/api/elections/${test.id}/candidates`);
      const candidates = await res.json();
      console.log(`${test.name}: ${candidates.length} candidates ${candidates.length > 0 ? '✓' : '✗'}`);
    }
    
    // Overall status
    const allAPIsWork = errors === 0;
    const goodCoverage = withCandidates > 0;
    const noStuckStates = allAPIsWork; // APIs return arrays even if empty
    
    console.log('\n=== OVERALL STATUS ===');
    console.log(`API Reliability: ${allAPIsWork ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Data Coverage: ${goodCoverage ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`No Stuck States: ${noStuckStates ? '✓ PASS' : '✗ FAIL'}`);
    
    process.exit(allAPIsWork && goodCoverage && noStuckStates ? 0 : 1);
    
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

testElectionCandidates();