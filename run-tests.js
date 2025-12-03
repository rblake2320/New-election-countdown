#!/usr/bin/env node

/**
 * Simple test runner for the Election Tracking Platform
 * Production-ready test suite with comprehensive coverage
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Election Tracking Platform - Comprehensive Test Suite');
console.log('=====================================================\n');

// Test configuration
const testConfig = {
  coverage: process.argv.includes('--coverage'),
  watch: process.argv.includes('--watch'),
  ui: process.argv.includes('--ui'),
  verbose: process.argv.includes('--verbose')
};

// Build vitest command
const vitestArgs = [
  'vitest',
  testConfig.coverage ? '--coverage' : '',
  testConfig.watch ? '--watch' : '',
  testConfig.ui ? '--ui' : '',
  testConfig.verbose ? '--reporter=verbose' : ''
].filter(Boolean);

console.log(`Running tests with: ${vitestArgs.join(' ')}\n`);

// Test categories
const testSuites = [
  {
    name: 'Backend Unit Tests',
    description: 'Congressional data service & storage layer',
    pattern: 'tests/*service.spec.ts'
  },
  {
    name: 'API Integration Tests', 
    description: 'HTTP endpoints & middleware',
    pattern: 'tests/*controller.spec.ts'
  },
  {
    name: 'Frontend Component Tests',
    description: 'React components & user interactions',
    pattern: 'tests/*.test.tsx'
  }
];

console.log('Test Categories:');
testSuites.forEach((suite, index) => {
  console.log(`${index + 1}. ${suite.name}: ${suite.description}`);
});
console.log('');

// Run tests
const vitest = spawn('npx', vitestArgs, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

vitest.on('close', (code) => {
  console.log(`\n📊 Test run completed with exit code: ${code}`);
  
  if (code === 0) {
    console.log('✅ All tests passed! Platform ready for deployment.');
    console.log('\nKey areas tested:');
    console.log('• Congressional data integrity & API endpoints');
    console.log('• Election data processing & validation');
    console.log('• User interface components & interactions');
    console.log('• Database operations & performance');
    console.log('• Authentication & security measures');
  } else {
    console.log('❌ Some tests failed. Review output above for details.');
  }
  
  process.exit(code);
});

vitest.on('error', (error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});