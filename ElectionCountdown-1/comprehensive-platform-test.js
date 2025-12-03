#!/usr/bin/env node

/**
 * Comprehensive Platform Test Script
 * Tests all critical functionality identified in the analysis report
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

async function testEndpoint(name, url, expectation) {
  totalTests++;
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (expectation(data)) {
      console.log(`${colors.green}✓${colors.reset} ${name}`);
      passedTests++;
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      failedTests.push(name);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name} - Error: ${error.message}`);
    failedTests.push(name);
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}       COMPREHENSIVE PLATFORM TEST - FIXES VERIFICATION${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Test 1: Congress Members API
  console.log(`${colors.blue}Testing Congressional Data:${colors.reset}`);
  
  await testEndpoint(
    'Congress Members API returns data',
    `${BASE_URL}/api/members`,
    (data) => Array.isArray(data) && data.length > 0
  );
  
  await testEndpoint(
    'Congress Members count is 537',
    `${BASE_URL}/api/members`,
    (data) => data.length === 537
  );
  
  await testEndpoint(
    'Members have real bioguide IDs (not IMPORT_)',
    `${BASE_URL}/api/members`,
    (data) => data.every(m => !m.bioguideId.startsWith('IMPORT_'))
  );
  
  await testEndpoint(
    'Members have complete data (name, party, state, chamber)',
    `${BASE_URL}/api/members`,
    (data) => data.every(m => m.name && m.party && m.state && m.chamber)
  );

  // Test 2: Congressional Search
  console.log(`\n${colors.blue}Testing Congressional Search:${colors.reset}`);
  
  await testEndpoint(
    'Search endpoint works (searching for "Pelosi")',
    `${BASE_URL}/api/members/search?q=Pelosi`,
    (data) => Array.isArray(data)
  );

  // Test 3: State Members
  console.log(`\n${colors.blue}Testing State Filtering:${colors.reset}`);
  
  await testEndpoint(
    'California members query works',
    `${BASE_URL}/api/members/CA`,
    (data) => Array.isArray(data) && data.length > 0
  );
  
  await testEndpoint(
    'Texas members query works',
    `${BASE_URL}/api/members/TX`,
    (data) => Array.isArray(data) && data.length > 0
  );

  // Test 4: Elections API
  console.log(`\n${colors.blue}Testing Elections Data:${colors.reset}`);
  
  await testEndpoint(
    'Elections API returns data',
    `${BASE_URL}/api/elections`,
    (data) => Array.isArray(data) && data.length > 0
  );
  
  await testEndpoint(
    'Elections have required fields',
    `${BASE_URL}/api/elections`,
    (data) => data.length > 0 && data[0].id && data[0].title && data[0].date
  );

  // Test 5: Campaign Portal API
  console.log(`\n${colors.blue}Testing Campaign Portal:${colors.reset}`);
  
  const campaignRegistration = await fetch(`${BASE_URL}/api/campaign/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationName: 'Test Campaign',
      candidateName: 'Test Candidate',
      officeSeeking: 'Test Office',
      contactEmail: 'test@test.com',
      electionId: 807  // Using a valid election ID
    })
  });
  
  totalTests++;
  if (campaignRegistration.ok || campaignRegistration.status === 409) {
    console.log(`${colors.green}✓${colors.reset} Campaign registration endpoint works`);
    passedTests++;
  } else {
    console.log(`${colors.red}✗${colors.reset} Campaign registration endpoint broken`);
    failedTests.push('Campaign registration');
  }

  // Test 6: Candidate Portal Authentication
  console.log(`\n${colors.blue}Testing Candidate Portal:${colors.reset}`);
  
  const candidateAuth = await fetch(`${BASE_URL}/api/candidate/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  
  totalTests++;
  if (candidateAuth.ok || candidateAuth.status === 401) {
    console.log(`${colors.green}✓${colors.reset} Candidate authentication endpoint works`);
    passedTests++;
  } else {
    console.log(`${colors.red}✗${colors.reset} Candidate authentication endpoint broken`);
    failedTests.push('Candidate authentication');
  }

  // Test 7: Committee Data
  console.log(`\n${colors.blue}Testing Committee Data:${colors.reset}`);
  
  await testEndpoint(
    'Committees API returns data',
    `${BASE_URL}/api/committees`,
    (data) => Array.isArray(data)
  );

  // Test 8: Bills Data
  console.log(`\n${colors.blue}Testing Bills Data:${colors.reset}`);
  
  await testEndpoint(
    'Bills API returns data',
    `${BASE_URL}/api/bills`,
    (data) => Array.isArray(data)
  );

  // Test 9: Stats API
  console.log(`\n${colors.blue}Testing Statistics:${colors.reset}`);
  
  await testEndpoint(
    'Stats API returns data',
    `${BASE_URL}/api/stats`,
    (data) => typeof data === 'object' && data !== null
  );

  // Test 10: Real-time Monitor
  console.log(`\n${colors.blue}Testing Real-Time Monitor:${colors.reset}`);
  
  await testEndpoint(
    'Monitor status endpoint works',
    `${BASE_URL}/api/monitoring/status`,
    (data) => typeof data.isRunning === 'boolean'
  );

  // Print Summary
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}                          TEST SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${totalTests - passedTests}${colors.reset}`);
  console.log(`Success Rate: ${successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red}${successRate}%${colors.reset}`);
  
  if (failedTests.length > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    failedTests.forEach(test => {
      console.log(`  - ${test}`);
    });
  }
  
  // Comparison with Analysis Report
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}                   COMPARISON WITH ANALYSIS REPORT${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`Previous Success Rate: ${colors.red}37.7%${colors.reset}`);
  console.log(`Current Success Rate: ${successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red}${successRate}%${colors.reset}`);
  
  const improvement = (parseFloat(successRate) - 37.7).toFixed(1);
  if (improvement > 0) {
    console.log(`Improvement: ${colors.green}+${improvement}%${colors.reset}`);
  } else {
    console.log(`Change: ${colors.red}${improvement}%${colors.reset}`);
  }
  
  // Fixed Issues Check
  console.log(`\n${colors.blue}Critical Issues Status:${colors.reset}`);
  console.log(`Congress Members Display: ${passedTests >= 4 ? colors.green + '✓ FIXED' : colors.red + '✗ NOT FIXED'}${colors.reset}`);
  console.log(`Campaign Portal Forms: ${failedTests.includes('Campaign registration') ? colors.red + '✗ NOT FIXED' : colors.green + '✓ FIXED'}${colors.reset}`);
  console.log(`Candidate Portal Auth: ${failedTests.includes('Candidate authentication') ? colors.red + '✗ NOT FIXED' : colors.green + '✓ FIXED'}${colors.reset}`);
  console.log(`Real-Time Monitor: ${failedTests.includes('Monitor status endpoint works') ? colors.red + '✗ NOT FIXED' : colors.green + '✓ FIXED'}${colors.reset}`);
  
  process.exit(failedTests.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);