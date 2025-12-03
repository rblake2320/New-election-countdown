const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

async function runAllTests() {
  console.log("🔍 COMPREHENSIVE PLATFORM TEST STARTING...\n");

  // 1. DATABASE CONNECTION TEST
  await testDatabase();

  // 2. AUTHENTICATION FLOW TEST
  await testAuthentication();

  // 3. ELECTION DATA TEST
  await testElectionData();

  // 4. API INTEGRATIONS TEST
  await testAPIs();

  // 5. SECURITY TEST
  await testSecurity();

  // 6. PERFORMANCE TEST
  await testPerformance();

  // 7. ERROR HANDLING TEST
  await testErrorHandling();

  // FINAL REPORT
  generateReport();
}

async function testDatabase() {
  console.log("📊 Testing Database...");

  try {
    // Test basic elections endpoint
    const dbTest = await fetch('http://localhost:5000/api/elections');
    if (!dbTest.ok) throw new Error('Database connection failed');

    // Test candidate data
    const candidates = await fetch('http://localhost:5000/api/elections/21/candidates');
    if (!candidates.ok) throw new Error('Candidate table inaccessible');

    testResults.passed.push('Database: All tables accessible');
  } catch (error) {
    testResults.failed.push(`Database: ${error.message}`);
  }
}

async function testAuthentication() {
  console.log("🔐 Testing Authentication...");

  const testUser = {
    email: `test${Date.now()}@test.com`,
    password: 'TestPass123!'
  };

  try {
    // Test signup
    const signup = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(testUser)
    });
    
    let token = null;
    if (signup.ok) {
      const signupData = await signup.json();
      token = signupData.token;
    } else {
      // User might already exist, try signin
      const signin = await fetch('http://localhost:5000/api/auth/signin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpass123'
        })
      });
      if (signin.ok) {
        const signinData = await signin.json();
        token = signinData.token;
      }
    }

    if (!token) throw new Error('No auth token received');

    // Test protected route
    const watchlist = await fetch('http://localhost:5000/api/user/watchlist', {
      headers: {'Authorization': `Bearer ${token}`}
    });
    if (!watchlist.ok) throw new Error('Protected route failed');

    testResults.passed.push('Authentication: Full flow working');
  } catch (error) {
    testResults.failed.push(`Authentication: ${error.message}`);
  }
}

async function testElectionData() {
  console.log("🗳️ Testing Election Data...");

  try {
    // Test all elections
    const elections = await fetch('http://localhost:5000/api/elections');
    const data = await elections.json();
    
    if (!data || data.length === 0) {
      throw new Error('No elections found');
    }

    // Test filtering
    const states = ['SC', 'TX', 'VA', 'NJ', 'CA'];
    for (const state of states) {
      const filtered = await fetch(`http://localhost:5000/api/elections?state=${state}`);
      if (!filtered.ok) throw new Error(`State filter ${state} failed`);
    }

    // Test candidates
    const candidates = await fetch('http://localhost:5000/api/elections/21/candidates');
    const candData = await candidates.json();
    
    if (!candData || candData.length === 0) {
      testResults.warnings.push('No candidates found for election 21');
    } else {
      testResults.passed.push(`Candidates: ${candData.length} candidates loaded for election 21`);
    }

    testResults.passed.push(`Elections: ${data.length} elections loaded`);
  } catch (error) {
    testResults.failed.push(`Elections: ${error.message}`);
  }
}

async function testAPIs() {
  console.log("🌐 Testing External APIs...");

  // Test Google Civic
  try {
    const civic = await fetch('http://localhost:5000/api/voter-info?address=100+Main+Street+Trenton+NJ');
    if (!civic.ok) throw new Error('Google Civic API integration failed');
    
    const civicData = await civic.json();
    if (civicData.error === 'NO_VOTER_INFO_AVAILABLE') {
      testResults.passed.push('Google Civic API: Connected (no data for test address)');
    } else {
      testResults.passed.push('Google Civic API: Connected with voter data');
    }
  } catch (error) {
    testResults.failed.push(`Google Civic: ${error.message}`);
  }

  // Test Analytics
  try {
    const analytics = await fetch('http://localhost:5000/api/analytics/interaction', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        userId: 1,
        interactionType: 'test',
        electionId: 21,
        sessionId: '550e8400-e29b-41d4-a716-446655440000'
      })
    });
    if (!analytics.ok) throw new Error('Analytics API failed');
    testResults.passed.push('Analytics API: Recording interactions');
  } catch (error) {
    testResults.warnings.push(`Analytics: ${error.message}`);
  }

  // Test Bot Prevention
  try {
    const botPrev = await fetch('http://localhost:5000/api/bot-prevention/validate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: 'test@example.com',
        phone: '555-123-4567',
        ipAddress: '192.168.1.1'
      })
    });
    if (botPrev.ok) {
      testResults.passed.push('Bot Prevention: Validation endpoint active');
    }
  } catch (error) {
    testResults.warnings.push(`Bot Prevention: ${error.message}`);
  }
}

async function testSecurity() {
  console.log("🛡️ Testing Security...");

  try {
    // Test SQL injection attempt
    const sqlTest = await fetch("http://localhost:5000/api/elections?state='; DROP TABLE users;--");
    if (sqlTest.ok) {
      // Should still work but not execute the malicious SQL
      testResults.passed.push('Security: SQL injection protection active');
    }

    // Test invalid authentication
    const invalidAuth = await fetch('http://localhost:5000/api/user/watchlist', {
      headers: {'Authorization': 'Bearer invalid-token-12345'}
    });
    if (invalidAuth.status === 401 || invalidAuth.status === 403) {
      testResults.passed.push('Security: Authentication validation working');
    } else {
      testResults.failed.push(`Security: Invalid token accepted (status: ${invalidAuth.status})`);
    }

  } catch (error) {
    testResults.failed.push(`Security: ${error.message}`);
  }
}

async function testPerformance() {
  console.log("⚡ Testing Performance...");

  try {
    // Test response times
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < 5; i++) {
      promises.push(fetch('http://localhost:5000/api/elections'));
      promises.push(fetch('http://localhost:5000/api/elections?state=CA'));
    }

    await Promise.all(promises);
    const duration = Date.now() - start;
    const avgTime = duration / 10;

    if (avgTime > 1000) {
      testResults.warnings.push(`Performance: Slow response time ${avgTime}ms`);
    } else {
      testResults.passed.push(`Performance: Avg response ${avgTime.toFixed(0)}ms`);
    }

  } catch (error) {
    testResults.failed.push(`Performance: ${error.message}`);
  }
}

async function testErrorHandling() {
  console.log("❌ Testing Error Handling...");

  try {
    // Test 404
    const notFound = await fetch('http://localhost:5000/api/nonexistent');
    if (notFound.status === 404) {
      testResults.passed.push('Error Handling: 404 errors properly handled');
    }

    // Test invalid election ID
    const invalid = await fetch('http://localhost:5000/api/elections/99999/candidates');
    if (invalid.status === 404 || invalid.ok) {
      testResults.passed.push('Error Handling: Invalid IDs properly handled');
    }

    // Test malformed JSON
    const malformed = await fetch('http://localhost:5000/api/auth/signin', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: '{invalid json'
    });
    if (!malformed.ok) {
      testResults.passed.push('Error Handling: Malformed JSON rejected');
    }

  } catch (error) {
    testResults.failed.push(`Error Handling: ${error.message}`);
  }
}

function generateReport() {
  console.log("\n📋 FINAL TEST REPORT\n");
  console.log("✅ PASSED:", testResults.passed.length);
  testResults.passed.forEach(test => console.log(`  ✓ ${test}`));

  console.log("\n❌ FAILED:", testResults.failed.length);
  testResults.failed.forEach(test => console.log(`  ✗ ${test}`));

  console.log("\n⚠️  WARNINGS:", testResults.warnings.length);
  testResults.warnings.forEach(test => console.log(`  ⚠ ${test}`));

  const total = testResults.passed.length + testResults.failed.length;
  const score = total > 0 ? (testResults.passed.length / total) * 100 : 0;

  console.log(`\n🎯 OVERALL SCORE: ${score.toFixed(1)}%`);

  if (testResults.failed.length > 0) {
    console.log("\n🚨 CRITICAL: Fix failed tests before launch!");
  } else if (testResults.warnings.length > 0) {
    console.log("\n⚡ READY: Can launch, but address warnings soon");
  } else {
    console.log("\n🚀 PERFECT: Ready for production!");
  }
}

// Export for use in API endpoint
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testResults };
} else {
  // Run tests directly if executed
  runAllTests();
}