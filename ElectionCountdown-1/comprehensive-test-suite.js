#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Election Tracker Platform
 * Tests all major functionality and identifies issues
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(status, test, message) {
  const timestamp = new Date().toISOString();
  const entry = { test, message, timestamp };
  
  if (status === 'PASS') {
    results.passed.push(entry);
    console.log(`✅ PASS: ${test} - ${message}`);
  } else if (status === 'FAIL') {
    results.failed.push(entry);
    console.log(`❌ FAIL: ${test} - ${message}`);
  } else if (status === 'WARN') {
    results.warnings.push(entry);
    console.log(`⚠️  WARN: ${test} - ${message}`);
  }
}

async function testDatabaseConnectivity() {
  console.log('\n=== DATABASE CONNECTIVITY TESTS ===');
  
  try {
    // Test database through API endpoints instead of direct connection
    const response = await fetch(`${BASE_URL}/api/stats`);
    if (response.ok) {
      const stats = await response.json();
      log('PASS', 'Database Connection', `Database accessible via API, ${stats.total} total elections`);
      
      if (stats.total === 0) {
        log('WARN', 'Database Data', 'No elections found in database');
      }
    } else {
      log('FAIL', 'Database Connection', `API stats endpoint failed: ${response.status}`);
    }
    
  } catch (error) {
    log('FAIL', 'Database Connection', `Database connectivity test failed: ${error.message}`);
  }
}

async function testAPIEndpoints() {
  console.log('\n=== API ENDPOINT TESTS ===');
  
  const endpoints = [
    { path: '/api/elections', name: 'Elections API' },
    { path: '/api/election-cycles', name: 'Election Cycles API' },
    { path: '/api/stats', name: 'Statistics API' },
    { path: '/api/auth/user', name: 'Auth API', expectedStatus: 401 }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`);
      const expectedStatus = endpoint.expectedStatus || 200;
      
      if (response.status === expectedStatus) {
        const data = await response.json();
        log('PASS', endpoint.name, `Response ${response.status}, data length: ${Array.isArray(data) ? data.length : 'object'}`);
      } else {
        log('FAIL', endpoint.name, `Expected ${expectedStatus}, got ${response.status}`);
      }
    } catch (error) {
      log('FAIL', endpoint.name, `Request failed: ${error.message}`);
    }
  }
}

async function testElectionDetailsAPI() {
  console.log('\n=== ELECTION DETAILS API TESTS ===');
  
  try {
    // Get first election
    const electionsResponse = await fetch(`${BASE_URL}/api/elections`);
    const elections = await electionsResponse.json();
    
    if (elections.length === 0) {
      log('FAIL', 'Election Details', 'No elections available for testing');
      return;
    }
    
    const testElection = elections[0];
    
    // Test candidates endpoint
    const candidatesResponse = await fetch(`${BASE_URL}/api/elections/${testElection.id}/candidates`);
    if (candidatesResponse.ok) {
      const candidates = await candidatesResponse.json();
      log('PASS', 'Candidates API', `Election ${testElection.id} has ${candidates.length} candidates`);
    } else {
      log('FAIL', 'Candidates API', `Failed to fetch candidates for election ${testElection.id}`);
    }
    
    // Test results endpoint
    const resultsResponse = await fetch(`${BASE_URL}/api/elections/${testElection.id}/results`);
    if (resultsResponse.ok) {
      const results = await resultsResponse.json();
      log('PASS', 'Results API', `Election ${testElection.id} results loaded`);
    } else {
      log('FAIL', 'Results API', `Failed to fetch results for election ${testElection.id}`);
    }
    
    // Test AI analysis endpoint (this is the slow one)
    console.log('Testing AI Analysis (may take 10+ seconds)...');
    const start = Date.now();
    const detailsResponse = await fetch(`${BASE_URL}/api/election-details/${testElection.id}`);
    const duration = Date.now() - start;
    
    if (detailsResponse.ok) {
      const details = await detailsResponse.json();
      log('PASS', 'AI Analysis API', `Generated in ${duration}ms`);
      
      if (duration > 5000) {
        log('WARN', 'AI Analysis Performance', `Slow response: ${duration}ms - caching should improve this`);
      }
      
      // Test caching by making same request again
      const cacheStart = Date.now();
      const cachedResponse = await fetch(`${BASE_URL}/api/election-details/${testElection.id}`);
      const cacheDuration = Date.now() - cacheStart;
      
      if (cachedResponse.ok && cacheDuration < 1000) {
        log('PASS', 'AI Analysis Caching', `Cached response in ${cacheDuration}ms`);
      } else {
        log('FAIL', 'AI Analysis Caching', `Cache not working - took ${cacheDuration}ms`);
      }
    } else {
      log('FAIL', 'AI Analysis API', `Failed to generate analysis for election ${testElection.id}`);
    }
    
  } catch (error) {
    log('FAIL', 'Election Details', `Testing failed: ${error.message}`);
  }
}

async function testPerformanceMetrics() {
  console.log('\n=== PERFORMANCE TESTS ===');
  
  // Test elections loading performance
  const start = Date.now();
  const response = await fetch(`${BASE_URL}/api/elections`);
  const duration = Date.now() - start;
  
  if (response.ok && duration < 500) {
    log('PASS', 'Elections Loading Speed', `${duration}ms - Good performance`);
  } else if (duration < 2000) {
    log('WARN', 'Elections Loading Speed', `${duration}ms - Acceptable but could be faster`);
  } else {
    log('FAIL', 'Elections Loading Speed', `${duration}ms - Too slow`);
  }
  
  // Test concurrent requests (simulating multiple users)
  const concurrentStart = Date.now();
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(fetch(`${BASE_URL}/api/elections`));
  }
  
  try {
    await Promise.all(promises);
    const concurrentDuration = Date.now() - concurrentStart;
    log('PASS', 'Concurrent Requests', `5 simultaneous requests completed in ${concurrentDuration}ms`);
  } catch (error) {
    log('FAIL', 'Concurrent Requests', `Failed concurrent requests: ${error.message}`);
  }
}

async function testDataIntegrity() {
  console.log('\n=== DATA INTEGRITY TESTS ===');
  
  try {
    const electionsResponse = await fetch(`${BASE_URL}/api/elections`);
    const elections = await electionsResponse.json();
    
    // Check for required fields
    let validElections = 0;
    let invalidElections = 0;
    
    for (const election of elections) {
      if (election.title && election.date && election.state && election.type) {
        validElections++;
      } else {
        invalidElections++;
        log('WARN', 'Data Integrity', `Election ${election.id} missing required fields`);
      }
    }
    
    log('PASS', 'Election Data Validation', `${validElections} valid elections, ${invalidElections} with issues`);
    
    // Check date formats
    const futureElections = elections.filter(e => new Date(e.date) > new Date());
    const pastElections = elections.filter(e => new Date(e.date) <= new Date());
    
    log('PASS', 'Election Dates', `${futureElections.length} future, ${pastElections.length} past elections`);
    
  } catch (error) {
    log('FAIL', 'Data Integrity', `Data validation failed: ${error.message}`);
  }
}

async function testExternalAPIIntegrations() {
  console.log('\n=== EXTERNAL API INTEGRATION TESTS ===');
  
  // Check for API keys in environment
  const requiredKeys = ['GOOGLE_CIVIC_API_KEY', 'PERPLEXITY_API_KEY'];
  const optionalKeys = ['PROPUBLICA_API_KEY', 'OPENFEC_API_KEY', 'OPENSTATES_API_KEY', 'VOTESMART_API_KEY'];
  
  for (const key of requiredKeys) {
    if (process.env[key]) {
      log('PASS', 'API Keys', `${key} is configured`);
    } else {
      log('FAIL', 'API Keys', `${key} is missing - core functionality limited`);
    }
  }
  
  for (const key of optionalKeys) {
    if (process.env[key]) {
      log('PASS', 'API Keys', `${key} is configured`);
    } else {
      log('WARN', 'API Keys', `${key} is missing - some features limited`);
    }
  }
}

async function testErrorHandling() {
  console.log('\n=== ERROR HANDLING TESTS ===');
  
  // Test invalid election ID
  try {
    const response = await fetch(`${BASE_URL}/api/elections/99999/candidates`);
    if (response.status === 404 || response.status === 400) {
      log('PASS', 'Error Handling', 'Invalid election ID handled correctly');
    } else {
      log('FAIL', 'Error Handling', `Invalid election ID returned ${response.status}`);
    }
  } catch (error) {
    log('WARN', 'Error Handling', `Network error on invalid ID: ${error.message}`);
  }
  
  // Test malformed requests
  try {
    const response = await fetch(`${BASE_URL}/api/elections/abc/candidates`);
    if (response.status >= 400) {
      log('PASS', 'Error Handling', 'Malformed request handled correctly');
    } else {
      log('FAIL', 'Error Handling', 'Malformed request not properly handled');
    }
  } catch (error) {
    log('WARN', 'Error Handling', `Network error on malformed request: ${error.message}`);
  }
}

function generateTestReport() {
  console.log('\n=== COMPREHENSIVE TEST REPORT ===');
  console.log(`Total Tests: ${results.passed.length + results.failed.length + results.warnings.length}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n=== CRITICAL ISSUES TO FIX ===');
    results.failed.forEach(failure => {
      console.log(`- ${failure.test}: ${failure.message}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n=== IMPROVEMENTS NEEDED ===');
    results.warnings.forEach(warning => {
      console.log(`- ${warning.test}: ${warning.message}`);
    });
  }
  
  if (results.passed.length > 0) {
    console.log('\n=== WORKING CORRECTLY ===');
    results.passed.forEach(pass => {
      console.log(`- ${pass.test}: ${pass.message}`);
    });
  }
  
  // Overall assessment
  const failureRate = results.failed.length / (results.passed.length + results.failed.length + results.warnings.length);
  console.log('\n=== OVERALL ASSESSMENT ===');
  
  if (failureRate === 0) {
    console.log('🎉 EXCELLENT: All tests passed! Platform is fully functional.');
  } else if (failureRate < 0.1) {
    console.log('✅ GOOD: Platform is mostly functional with minor issues.');
  } else if (failureRate < 0.3) {
    console.log('⚠️  FAIR: Platform has some significant issues that need attention.');
  } else {
    console.log('❌ POOR: Platform has major issues that need immediate fixing.');
  }
}

async function runAllTests() {
  console.log('🧪 Starting Comprehensive Test Suite for Election Tracker Platform\n');
  
  await testDatabaseConnectivity();
  await testAPIEndpoints();
  await testElectionDetailsAPI();
  await testPerformanceMetrics();
  await testDataIntegrity();
  await testExternalAPIIntegrations();
  await testErrorHandling();
  
  generateTestReport();
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});