/**
 * Smoke Tests - Basic functionality checks
 * Run with: npm test
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Smoke Tests - Critical Endpoints', () => {
  
  describe('Health Checks', () => {
    test('Health endpoint should return OK', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });

    test('Enhanced health endpoint should return system status', async () => {
      const response = await fetch(`${BASE_URL}/api/health/enhanced`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('Elections API', () => {
    test('Should fetch elections list', async () => {
      const response = await fetch(`${BASE_URL}/api/elections`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('Should handle election filtering', async () => {
      const response = await fetch(`${BASE_URL}/api/elections?level=federal`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('Should return 404 for non-existent election', async () => {
      const response = await fetch(`${BASE_URL}/api/elections/999999`);
      expect(response.status).toBe(404);
    });
  });

  describe('Authentication', () => {
    test('Should reject access to protected routes without auth', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/me`);
      expect(response.status).toBe(401);
    });

    test('Login endpoint should exist', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'test' })
      });
      // Should return 401 (invalid credentials) not 404 (endpoint missing)
      expect([401, 400]).toContain(response.status);
    });
  });

  describe('Candidates API', () => {
    test('Should fetch candidates list', async () => {
      const response = await fetch(`${BASE_URL}/api/candidates`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Static Assets', () => {
    test('Should serve homepage', async () => {
      const response = await fetch(`${BASE_URL}/`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for non-existent API routes', async () => {
      const response = await fetch(`${BASE_URL}/api/nonexistent-endpoint`);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('Should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/elections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{'
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Security Headers', () => {
    test('Should include security headers', async () => {
      const response = await fetch(`${BASE_URL}/`);
      
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-xss-protection')).toBeTruthy();
    });
  });

  describe('CORS', () => {
    test('Should handle CORS preflight', async () => {
      const response = await fetch(`${BASE_URL}/api/elections`, {
        method: 'OPTIONS'
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    test('Should accept reasonable number of requests', async () => {
      // Make 5 requests quickly
      const promises = Array(5).fill(null).map(() => 
        fetch(`${BASE_URL}/api/health`)
      );
      
      const responses = await Promise.all(promises);
      const allOk = responses.every(r => r.status === 200);
      expect(allOk).toBe(true);
    });
  });
});

describe('Database Integration', () => {
  test('Should connect to database', async () => {
    const response = await fetch(`${BASE_URL}/api/health/enhanced`);
    const data = await response.json();
    
    expect(data.database).toBeDefined();
    expect(data.database.connected).toBe(true);
  });
});

describe('API Response Format', () => {
  test('Elections should have required fields', async () => {
    const response = await fetch(`${BASE_URL}/api/elections`);
    const elections = await response.json();
    
    if (elections.length > 0) {
      const election = elections[0];
      expect(election).toHaveProperty('id');
      expect(election).toHaveProperty('title');
      expect(election).toHaveProperty('date');
      expect(election).toHaveProperty('state');
    }
  });

  test('Candidates should have required fields', async () => {
    const response = await fetch(`${BASE_URL}/api/candidates`);
    const candidates = await response.json();
    
    if (candidates.length > 0) {
      const candidate = candidates[0];
      expect(candidate).toHaveProperty('id');
      expect(candidate).toHaveProperty('name');
      expect(candidate).toHaveProperty('party');
    }
  });
});
