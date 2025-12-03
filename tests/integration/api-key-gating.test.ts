/**
 * Integration Tests for API Key Gating
 * Tests Congress routes return 503 when keys missing, 200 when provided
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock API key validation service
vi.mock('../../server/api-key-validation-service', () => ({
  apiKeyValidationService: {
    isKeyAvailable: vi.fn(),
    generateMissingKeyError: vi.fn(),
    checkAllKeys: vi.fn(),
    getNotificationSummary: vi.fn()
  }
}));

// Mock other dependencies  
vi.mock('../../server/storage-factory', () => ({
  storageFactory: {
    isDatabaseAvailable: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('../../server/db', () => ({
  pool: { query: vi.fn() }
}));

vi.mock('../../server/storage', () => ({
  storage: {},
  initializeData: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../server/cache-service', () => ({
  cacheService: {}
}));

// Mock congressional services
vi.mock('../../server/congress-bill-service', () => ({
  getCongressBillService: vi.fn(() => ({
    getAllBills: vi.fn().mockResolvedValue([
      { id: 'hr1', title: 'Test Bill 1', congress: '119' },
      { id: 'hr2', title: 'Test Bill 2', congress: '119' }
    ]),
    getBillsByState: vi.fn().mockResolvedValue([
      { id: 'hr1-ca', title: 'California Bill', state: 'CA' }
    ])
  }))
}));

vi.mock('../../server/perplexity-congress-service', () => ({
  perplexityCongressService: {
    getCongressMembers: vi.fn().mockResolvedValue([
      { id: 'S000148', name: 'Chuck Schumer', party: 'Democratic', state: 'NY' },
      { id: 'M000639', name: 'Bob Menendez', party: 'Democratic', state: 'NJ' }
    ]),
    getMembersByState: vi.fn().mockResolvedValue([
      { id: 'S000148', name: 'Chuck Schumer', party: 'Democratic', state: 'NY' }
    ])
  }
}));

let app: express.Express;

describe('API Key Gating Integration Tests', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Import middleware
    const { requireProPublicaAPI, requireVoteSmartAPI, requireCongressionalAPI } = await import('../../server/middleware/api-key-guard');

    // Import services
    const { getCongressBillService } = await import('../../server/congress-bill-service');
    const { perplexityCongressService } = await import('../../server/perplexity-congress-service');

    const router = express.Router();

    // Congress routes with API key gating
    router.get('/bills', requireProPublicaAPI, async (req, res) => {
      const billService = getCongressBillService();
      const bills = await billService.getAllBills();
      res.json({ ok: true, bills });
    });

    router.get('/bills/state/:state', requireProPublicaAPI, async (req, res) => {
      const billService = getCongressBillService();
      const bills = await billService.getBillsByState(req.params.state);
      res.json({ ok: true, state: req.params.state, bills });
    });

    router.get('/members', requireCongressionalAPI, async (req, res) => {
      const members = await perplexityCongressService.getCongressMembers();
      res.json({ ok: true, members });
    });

    router.get('/members/state/:state', requireCongressionalAPI, async (req, res) => {
      const members = await perplexityCongressService.getMembersByState(req.params.state);
      res.json({ ok: true, state: req.params.state, members });
    });

    router.get('/positions', requireVoteSmartAPI, async (req, res) => {
      res.json({ 
        ok: true, 
        positions: [
          { candidate: 'John Doe', position: 'Pro healthcare reform', issue: 'Healthcare' }
        ]
      });
    });

    app.use('/api/congress', router);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe('ProPublica API Gating', () => {
    describe('when ProPublica API key is missing', () => {
      beforeEach(async () => {
        const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
        vi.mocked(apiKeyValidationService.isKeyAvailable).mockReturnValue(false);
        vi.mocked(apiKeyValidationService.generateMissingKeyError).mockReturnValue({
          service: 'ProPublica',
          reason: 'missing_api_key',
          message: 'ProPublica API key required for this feature. Purpose: Congressional voting records, member data, bill tracking',
          setupUrl: 'https://www.propublica.org/datastore/api/propublica-congress-api',
          status: 503
        });
      });

      it('should return 503 for /bills when ProPublica key is missing', async () => {
        const response = await request(app)
          .get('/api/congress/bills');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
          service: 'ProPublica',
          reason: 'missing_api_key',
          message: 'ProPublica API key required for this feature. Purpose: Congressional voting records, member data, bill tracking',
          setupUrl: 'https://www.propublica.org/datastore/api/propublica-congress-api',
          status: 503,
          path: '/api/congress/bills',
          method: 'GET',
          missingKeys: ['PROPUBLICA_API_KEY'],
          timestamp: expect.any(String)
        });
      });

      it('should return 503 for /bills/state/:state when ProPublica key is missing', async () => {
        const response = await request(app)
          .get('/api/congress/bills/state/CA');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
          service: 'ProPublica',
          reason: 'missing_api_key',
          message: 'ProPublica API key required for this feature. Purpose: Congressional voting records, member data, bill tracking',
          setupUrl: 'https://www.propublica.org/datastore/api/propublica-congress-api',
          status: 503,
          path: '/api/congress/bills/state/CA',
          method: 'GET',
          missingKeys: ['PROPUBLICA_API_KEY'],
          timestamp: expect.any(String)
        });
      });
    });

    describe('when ProPublica API key is available', () => {
      beforeEach(async () => {
        const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
        vi.mocked(apiKeyValidationService.isKeyAvailable).mockReturnValue(true);
      });

      it('should return 200 for /bills when ProPublica key is available', async () => {
        const response = await request(app)
          .get('/api/congress/bills');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          bills: [
            { id: 'hr1', title: 'Test Bill 1', congress: '119' },
            { id: 'hr2', title: 'Test Bill 2', congress: '119' }
          ]
        });
      });

      it('should return 200 for /bills/state/:state when ProPublica key is available', async () => {
        const response = await request(app)
          .get('/api/congress/bills/state/CA');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          state: 'CA',
          bills: [
            { id: 'hr1-ca', title: 'California Bill', state: 'CA' }
          ]
        });
      });
    });
  });

  describe('Congressional API Gating (Multiple Keys)', () => {
    describe('when all congressional API keys are missing', () => {
      beforeEach(async () => {
        const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
        // All congressional keys are missing
        vi.mocked(apiKeyValidationService.isKeyAvailable).mockReturnValue(false);
      });

      it('should return 503 for /members when no congressional APIs are available', async () => {
        const response = await request(app)
          .get('/api/congress/members');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
          service: 'Congressional Data',
          reason: 'missing_api_key',
          message: 'At least one congressional data API key is required (ProPublica, Congress.gov, or OpenStates)',
          path: '/api/congress/members',
          method: 'GET',
          availableServices: [],
          requiredServices: ['ProPublica', 'Congress.gov', 'OpenStates'],
          timestamp: expect.any(String)
        });
      });

      it('should return 503 for /members/state/:state when no congressional APIs are available', async () => {
        const response = await request(app)
          .get('/api/congress/members/state/NY');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
          service: 'Congressional Data',
          reason: 'missing_api_key',
          message: 'At least one congressional data API key is required (ProPublica, Congress.gov, or OpenStates)',
          path: '/api/congress/members/state/NY',
          method: 'GET',
          availableServices: [],
          requiredServices: ['ProPublica', 'Congress.gov', 'OpenStates'],
          timestamp: expect.any(String)
        });
      });
    });

    describe('when at least one congressional API key is available', () => {
      beforeEach(async () => {
        const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
        // Mock that ProPublica is available but others are not
        vi.mocked(apiKeyValidationService.isKeyAvailable).mockImplementation((keyName: string) => {
          return keyName === 'PROPUBLICA_API_KEY';
        });
      });

      it('should return 200 for /members when at least one congressional API is available', async () => {
        const response = await request(app)
          .get('/api/congress/members');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          members: [
            { id: 'S000148', name: 'Chuck Schumer', party: 'Democratic', state: 'NY' },
            { id: 'M000639', name: 'Bob Menendez', party: 'Democratic', state: 'NJ' }
          ]
        });
      });

      it('should return 200 for /members/state/:state when at least one congressional API is available', async () => {
        const response = await request(app)
          .get('/api/congress/members/state/NY');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          state: 'NY',
          members: [
            { id: 'S000148', name: 'Chuck Schumer', party: 'Democratic', state: 'NY' }
          ]
        });
      });
    });

    describe('when multiple congressional API keys are available', () => {
      beforeEach(async () => {
        const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
        // Mock that ProPublica and Congress API are available
        vi.mocked(apiKeyValidationService.isKeyAvailable).mockImplementation((keyName: string) => {
          return ['PROPUBLICA_API_KEY', 'CONGRESS_API_KEY'].includes(keyName);
        });
      });

      it('should return 200 for /members with multiple congressional APIs available', async () => {
        const response = await request(app)
          .get('/api/congress/members');

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.members).toHaveLength(2);
      });
    });
  });

  describe('VoteSmart API Gating', () => {
    describe('when VoteSmart API key is missing', () => {
      beforeEach(async () => {
        const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
        vi.mocked(apiKeyValidationService.isKeyAvailable).mockReturnValue(false);
        vi.mocked(apiKeyValidationService.generateMissingKeyError).mockReturnValue({
          service: 'VoteSmart',
          reason: 'missing_api_key',
          message: 'VoteSmart API key required for this feature. Purpose: Candidate positions, voting records, biographical information',
          setupUrl: 'https://votesmart.org/api',
          status: 503
        });
      });

      it('should return 503 for /positions when VoteSmart key is missing', async () => {
        const response = await request(app)
          .get('/api/congress/positions');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
          service: 'VoteSmart',
          reason: 'missing_api_key',
          message: 'VoteSmart API key required for this feature. Purpose: Candidate positions, voting records, biographical information',
          setupUrl: 'https://votesmart.org/api',
          status: 503,
          path: '/api/congress/positions',
          method: 'GET',
          missingKeys: ['VOTESMART_API_KEY'],
          timestamp: expect.any(String)
        });
      });
    });

    describe('when VoteSmart API key is available', () => {
      beforeEach(async () => {
        const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
        vi.mocked(apiKeyValidationService.isKeyAvailable).mockReturnValue(true);
      });

      it('should return 200 for /positions when VoteSmart key is available', async () => {
        const response = await request(app)
          .get('/api/congress/positions');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          positions: [
            { candidate: 'John Doe', position: 'Pro healthcare reform', issue: 'Healthcare' }
          ]
        });
      });
    });
  });

  describe('Mixed API Key Scenarios', () => {
    it('should handle different API keys being available for different endpoints', async () => {
      const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
      
      // Mock VoteSmart available but ProPublica not available
      vi.mocked(apiKeyValidationService.isKeyAvailable).mockImplementation((keyName: string) => {
        return keyName === 'VOTESMART_API_KEY';
      });

      vi.mocked(apiKeyValidationService.generateMissingKeyError).mockReturnValue({
        service: 'ProPublica',
        reason: 'missing_api_key',
        message: 'ProPublica API key required',
        status: 503
      });

      // VoteSmart endpoint should work
      const positionsResponse = await request(app)
        .get('/api/congress/positions');
      expect(positionsResponse.status).toBe(200);

      // ProPublica endpoint should fail
      const billsResponse = await request(app)
        .get('/api/congress/bills');
      expect(billsResponse.status).toBe(503);
    });

    it('should test rapid succession of requests with different key availability', async () => {
      const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
      
      // First request: no keys available
      vi.mocked(apiKeyValidationService.isKeyAvailable).mockReturnValue(false);
      vi.mocked(apiKeyValidationService.generateMissingKeyError).mockReturnValue({
        service: 'ProPublica',
        reason: 'missing_api_key',
        message: 'ProPublica API key required',
        status: 503
      });

      let response = await request(app)
        .get('/api/congress/bills');
      expect(response.status).toBe(503);

      // Second request: keys become available
      vi.mocked(apiKeyValidationService.isKeyAvailable).mockReturnValue(true);

      response = await request(app)
        .get('/api/congress/bills');
      expect(response.status).toBe(200);
    });
  });

  describe('Error Response Structure Validation', () => {
    beforeEach(async () => {
      const { apiKeyValidationService } = await import('../../server/api-key-validation-service');
      vi.mocked(apiKeyValidationService.isKeyAvailable).mockReturnValue(false);
      vi.mocked(apiKeyValidationService.generateMissingKeyError).mockReturnValue({
        service: 'TestService',
        reason: 'missing_api_key',
        message: 'Test API key required',
        setupUrl: 'https://test.com/api',
        status: 503
      });
    });

    it('should return structured error responses with all required fields', async () => {
      const response = await request(app)
        .get('/api/congress/bills');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('reason');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('setupUrl');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('method');
      expect(response.body).toHaveProperty('missingKeys');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});