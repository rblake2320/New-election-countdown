/**
 * Unit Tests for API Key Guard Middleware
 * Tests the requireAPIKeys function and related middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  requireAPIKeys, 
  requireVoteSmartAPI, 
  requireProPublicaAPI, 
  requireGoogleCivicAPI, 
  requireCongressionalAPI,
  requireOptionalService,
  getCriticalServiceStatus 
} from '../../server/middleware/api-key-guard';

// Mock the API key validation service
const mockApiKeyValidationService = {
  isKeyAvailable: vi.fn(),
  generateMissingKeyError: vi.fn(),
  checkAllKeys: vi.fn(),
  getNotificationSummary: vi.fn()
};

vi.mock('../../server/api-key-validation-service', () => ({
  apiKeyValidationService: mockApiKeyValidationService
}));

// Helper function to create mock request/response/next
function createMockReqRes(method: string = 'GET', path: string = '/test') {
  const req = {
    method,
    path,
    body: {},
    query: {},
    headers: {}
  } as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  } as any as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('requireAPIKeys Middleware Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when all required keys are available', () => {
    beforeEach(() => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(true);
    });

    it('should allow request to proceed when all keys are available', () => {
      const middleware = requireAPIKeys(['VOTESMART_API_KEY', 'PROPUBLICA_API_KEY']);
      const { req, res, next } = createMockReqRes('GET', '/test');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(mockApiKeyValidationService.isKeyAvailable).toHaveBeenCalledWith('VOTESMART_API_KEY');
      expect(mockApiKeyValidationService.isKeyAvailable).toHaveBeenCalledWith('PROPUBLICA_API_KEY');
    });

    it('should handle single required key', () => {
      const middleware = requireAPIKeys(['GOOGLE_CIVIC_API_KEY']);
      const { req, res, next } = createMockReqRes('POST', '/test');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(mockApiKeyValidationService.isKeyAvailable).toHaveBeenCalledWith('GOOGLE_CIVIC_API_KEY');
    });

    it('should handle empty array of required keys', () => {
      const middleware = requireAPIKeys([]);
      const { req, res, next } = createMockReqRes('PUT', '/test');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(mockApiKeyValidationService.isKeyAvailable).not.toHaveBeenCalled();
    });
  });

  describe('when required keys are missing', () => {
    beforeEach(() => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(false);
      mockApiKeyValidationService.generateMissingKeyError.mockReturnValue({
        service: 'VoteSmart',
        reason: 'missing_api_key',
        message: 'VoteSmart API key required for this feature. Purpose: Candidate positions and voting records',
        setupUrl: 'https://votesmart.org/api',
        status: 503
      });
    });

    it('should return 503 with structured payload when missing required keys', () => {
      const middleware = requireAPIKeys(['VOTESMART_API_KEY']);
      const { req, res, next } = createMockReqRes('GET', '/congress/members');

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        service: 'VoteSmart',
        reason: 'missing_api_key',
        message: 'VoteSmart API key required for this feature. Purpose: Candidate positions and voting records',
        setupUrl: 'https://votesmart.org/api',
        status: 503,
        path: '/congress/members',
        method: 'GET',
        missingKeys: ['VOTESMART_API_KEY'],
        timestamp: expect.any(String)
      });
    });

    it('should return 503 for multiple missing keys with additional context', () => {
      const middleware = requireAPIKeys(['VOTESMART_API_KEY', 'PROPUBLICA_API_KEY', 'GOOGLE_CIVIC_API_KEY']);
      const { req, res, next } = createMockReqRes('POST', '/data/sync');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('(2 other required keys also missing)'),
          path: '/data/sync',
          method: 'POST',
          missingKeys: ['VOTESMART_API_KEY', 'PROPUBLICA_API_KEY', 'GOOGLE_CIVIC_API_KEY']
        })
      );
    });

    it('should check only the first missing key for error generation', () => {
      const middleware = requireAPIKeys(['MISSING_KEY_1', 'MISSING_KEY_2']);
      const { req, res, next } = createMockReqRes('GET', '/test');

      middleware(req, res, next);

      expect(mockApiKeyValidationService.generateMissingKeyError).toHaveBeenCalledWith('MISSING_KEY_1');
      expect(mockApiKeyValidationService.generateMissingKeyError).toHaveBeenCalledTimes(1);
    });
  });

  describe('when some keys are available and some are missing', () => {
    beforeEach(() => {
      mockApiKeyValidationService.generateMissingKeyError.mockReturnValue({
        service: 'ProPublica',
        reason: 'missing_api_key',
        message: 'ProPublica API key required',
        status: 503
      });
    });

    it('should return 503 if any required key is missing', () => {
      mockApiKeyValidationService.isKeyAvailable.mockImplementation((keyName: string) => {
        return keyName === 'VOTESMART_API_KEY'; // Only this one is available
      });

      const middleware = requireAPIKeys(['VOTESMART_API_KEY', 'PROPUBLICA_API_KEY']);
      const { req, res, next } = createMockReqRes('GET', '/test');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          missingKeys: ['PROPUBLICA_API_KEY']
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optional mode', () => {
    beforeEach(() => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(false);
    });

    it('should log warning but allow request when optional=true', () => {
      const middleware = requireAPIKeys(['OPTIONAL_API_KEY'], true);
      const { req, res, next } = createMockReqRes('GET', '/test');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Missing keys [OPTIONAL_API_KEY] (optional)')
      );
    });

    it('should log warnings for multiple optional missing keys', () => {
      const middleware = requireAPIKeys(['KEY1', 'KEY2'], true);
      const { req, res, next } = createMockReqRes('POST', '/optional-feature');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Missing keys [KEY1, KEY2] (optional)')
      );
    });
  });
});

describe('Predefined API Key Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockApiKeyValidationService.generateMissingKeyError.mockReturnValue({
      service: 'TestService',
      reason: 'missing_api_key',
      message: 'Test API key required',
      status: 503
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requireVoteSmartAPI', () => {
    it('should pass when VoteSmart API key is available', () => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(true);
      const { req, res, next } = createMockReqRes('GET', '/test');

      requireVoteSmartAPI(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(mockApiKeyValidationService.isKeyAvailable).toHaveBeenCalledWith('VOTESMART_API_KEY');
    });

    it('should return 503 when VoteSmart API key is missing', () => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(false);
      const { req, res, next } = createMockReqRes('GET', '/test');

      requireVoteSmartAPI(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireProPublicaAPI', () => {
    it('should pass when ProPublica API key is available', () => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(true);
      const { req, res, next } = createMockReqRes('GET', '/test');

      requireProPublicaAPI(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(mockApiKeyValidationService.isKeyAvailable).toHaveBeenCalledWith('PROPUBLICA_API_KEY');
    });

    it('should return 503 when ProPublica API key is missing', () => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(false);
      const { req, res, next } = createMockReqRes('GET', '/test');

      requireProPublicaAPI(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireGoogleCivicAPI', () => {
    it('should pass when Google Civic API key is available', () => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(true);
      const { req, res, next } = createMockReqRes('GET', '/test');

      requireGoogleCivicAPI(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(mockApiKeyValidationService.isKeyAvailable).toHaveBeenCalledWith('GOOGLE_CIVIC_API_KEY');
    });

    it('should return 503 when Google Civic API key is missing', () => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(false);
      const { req, res, next } = createMockReqRes('GET', '/test');

      requireGoogleCivicAPI(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireCongressionalAPI', () => {
    it('should pass when at least one congressional API key is available', () => {
      mockApiKeyValidationService.isKeyAvailable.mockImplementation((keyName: string) => {
        return keyName === 'PROPUBLICA_API_KEY'; // Only this one available
      });

      const { req, res, next } = createMockReqRes('GET', '/congress/members');

      requireCongressionalAPI(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Congressional API check for GET /congress/members: Using 1 available API(s)')
      );
    });

    it('should return 503 when no congressional API keys are available', () => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(false);

      const { req, res, next } = createMockReqRes('GET', '/congress/bills');

      requireCongressionalAPI(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        service: 'Congressional Data',
        reason: 'missing_api_key',
        message: 'At least one congressional data API key is required (ProPublica, Congress.gov, or OpenStates)',
        path: '/congress/bills',
        method: 'GET',
        availableServices: [],
        requiredServices: ['ProPublica', 'Congress.gov', 'OpenStates'],
        timestamp: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should log correct count when multiple congressional APIs are available', () => {
      mockApiKeyValidationService.isKeyAvailable.mockImplementation((keyName: string) => {
        return ['PROPUBLICA_API_KEY', 'CONGRESS_API_KEY'].includes(keyName);
      });

      const { req, res, next } = createMockReqRes('POST', '/congress/sync');

      requireCongressionalAPI(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Using 2 available API(s)')
      );
    });
  });

  describe('requireOptionalService', () => {
    it('should create optional middleware that logs but doesn\'t block', () => {
      mockApiKeyValidationService.isKeyAvailable.mockReturnValue(false);
      
      const optionalMiddleware = requireOptionalService('OPTIONAL_KEY');
      const { req, res, next } = createMockReqRes('GET', '/test');

      optionalMiddleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Missing keys [OPTIONAL_KEY] (optional)')
      );
    });
  });
});

describe('getCriticalServiceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return healthy status when all critical services are available', () => {
    mockApiKeyValidationService.checkAllKeys.mockReturnValue({
      allRequired: true,
      critical: [],
      missing: []
    });
    mockApiKeyValidationService.getNotificationSummary.mockReturnValue({
      show: false,
      critical: 0,
      optional: 0,
      message: 'All services operational'
    });

    const status = getCriticalServiceStatus();

    expect(status).toEqual({
      healthy: true,
      critical: 0,
      optional: 0,
      summary: {
        show: false,
        critical: 0,
        optional: 0,
        message: 'All services operational'
      }
    });
  });

  it('should return unhealthy status when critical services are missing', () => {
    mockApiKeyValidationService.checkAllKeys.mockReturnValue({
      allRequired: false,
      critical: [
        { key: 'VOTESMART_API_KEY', required: true },
        { key: 'GOOGLE_CIVIC_API_KEY', required: true }
      ],
      missing: [
        { key: 'VOTESMART_API_KEY', required: true },
        { key: 'GOOGLE_CIVIC_API_KEY', required: true },
        { key: 'OPTIONAL_KEY', required: false }
      ]
    });
    mockApiKeyValidationService.getNotificationSummary.mockReturnValue({
      show: true,
      critical: 2,
      optional: 1,
      message: '2 critical services unavailable'
    });

    const status = getCriticalServiceStatus();

    expect(status).toEqual({
      healthy: false,
      critical: 2,
      optional: 1,
      summary: {
        show: true,
        critical: 2,
        optional: 1,
        message: '2 critical services unavailable'
      }
    });
  });

  it('should handle mixed availability correctly', () => {
    mockApiKeyValidationService.checkAllKeys.mockReturnValue({
      allRequired: false,
      critical: [{ key: 'CRITICAL_KEY', required: true }],
      missing: [
        { key: 'CRITICAL_KEY', required: true },
        { key: 'OPTIONAL_KEY_1', required: false },
        { key: 'OPTIONAL_KEY_2', required: false }
      ]
    });
    mockApiKeyValidationService.getNotificationSummary.mockReturnValue({
      show: true,
      critical: 1,
      optional: 2,
      message: '1 critical service unavailable'
    });

    const status = getCriticalServiceStatus();

    expect(status.healthy).toBe(false);
    expect(status.critical).toBe(1);
    expect(status.optional).toBe(2);
  });
});