/**
 * Unit Tests for Health Guard Middleware
 * Tests the globalWriteGuard and healthAwareErrorHandler middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { globalWriteGuard, healthAwareErrorHandler, requireHealthyDatabase } from '../../server/middleware/health-guard';

// Mock the module before using it
vi.mock('../../server/storage-factory', () => ({
  storageFactory: {
    isDatabaseAvailable: vi.fn(),
    getHealthStatus: vi.fn()
  }
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

describe('globalWriteGuard Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when database is healthy', () => {
    beforeEach(() => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
    });

    it('should allow GET requests to pass through', () => {
      const { req, res, next } = createMockReqRes('GET', '/test');

      globalWriteGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow OPTIONS requests to pass through', () => {
      const { req, res, next } = createMockReqRes('OPTIONS', '/test');

      globalWriteGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow write operations when database is healthy', () => {
      const { req, res, next } = createMockReqRes('POST', '/test');

      globalWriteGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow PUT operations when database is healthy', () => {
      const { req, res, next } = createMockReqRes('PUT', '/test');

      globalWriteGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow DELETE operations when database is healthy', () => {
      const { req, res, next } = createMockReqRes('DELETE', '/test');

      globalWriteGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('when database is unhealthy', () => {
    beforeEach(() => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
    });

    it('should still allow GET requests when database is unhealthy', () => {
      const { req, res, next } = createMockReqRes('GET', '/any-path');

      globalWriteGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should still allow OPTIONS requests when database is unhealthy', () => {
      const { req, res, next } = createMockReqRes('OPTIONS', '/any-path');

      globalWriteGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 503 for POST requests when database is unhealthy', () => {
      const { req, res, next } = createMockReqRes('POST', '/test');

      globalWriteGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'service_unavailable',
        message: 'Database is temporarily unavailable. Write operations are disabled for system safety.',
        mode: 'degraded',
        allowedOperations: ['GET requests', 'OPTIONS requests', '/api/track (202)', '/api/storage/health'],
        retryAfter: 30
      });
    });

    it('should return 503 for PUT requests when database is unhealthy', () => {
      const { req, res, next } = createMockReqRes('PUT', '/test');

      globalWriteGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'service_unavailable',
          mode: 'degraded',
          retryAfter: 30
        })
      );
    });

    it('should return 503 for DELETE requests when database is unhealthy', () => {
      const { req, res, next } = createMockReqRes('DELETE', '/test');

      globalWriteGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'service_unavailable',
          mode: 'degraded'
        })
      );
    });

    it('should return 503 for PATCH requests when database is unhealthy', () => {
      const { req, res, next } = createMockReqRes('PATCH', '/test');

      globalWriteGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('special allowlist handling', () => {
    beforeEach(() => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
    });

    it('should allow /track endpoint with 202 response when database is unhealthy', () => {
      const { req, res, next } = createMockReqRes('POST', '/track');

      globalWriteGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Analytics event accepted',
        status: 'queued',
        dbHealthy: false
      });
    });

    it('should allow /storage/health endpoint to pass through', () => {
      const { req, res, next } = createMockReqRes('POST', '/storage/health');

      globalWriteGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle case insensitive methods correctly', () => {
      const { req, res, next } = createMockReqRes('post', '/test');

      globalWriteGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
    });
  });
});

describe('healthAwareErrorHandler Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockErrorReqRes(path: string = '/test', method: string = 'POST') {
    const req = { method, path } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as any as Response;
    const next = vi.fn() as NextFunction;
    
    return { req, res, next };
  }

  describe('when database is unhealthy', () => {
    beforeEach(() => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
    });

    it('should convert ECONNREFUSED error to 503 when database is unhealthy', () => {
      const { req, res, next } = createMockErrorReqRes('/test', 'POST');
      const dbError = new Error('Connection failed');
      dbError.code = 'ECONNREFUSED';

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'service_unavailable',
        message: 'Database connection lost. System is in degraded mode.',
        mode: 'degraded',
        path: '/test',
        method: 'POST'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should convert ENOTFOUND error to 503 when database is unhealthy', () => {
      const { req, res, next } = createMockErrorReqRes('/api/data', 'GET');
      const dbError = new Error('DNS lookup failed');
      dbError.code = 'ENOTFOUND';

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'service_unavailable',
        message: 'Database connection lost. System is in degraded mode.',
        mode: 'degraded',
        path: '/api/data',
        method: 'GET'
      });
    });

    it('should convert ETIMEDOUT error to 503 when database is unhealthy', () => {
      const { req, res, next } = createMockErrorReqRes('/update', 'PUT');
      const dbError = new Error('Connection timeout');
      dbError.code = 'ETIMEDOUT';

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'service_unavailable',
          mode: 'degraded',
          path: '/update',
          method: 'PUT'
        })
      );
    });

    it('should convert connection-related errors to 503', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const dbError = new Error('connection failed to database');

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'service_unavailable',
          mode: 'degraded'
        })
      );
    });

    it('should convert database-related errors to 503', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const dbError = new Error('database query failed');

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should convert timeout errors to 503', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const dbError = new Error('Operation timeout exceeded');

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should convert DatabaseError to 503', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const dbError = new Error('Query failed');
      dbError.name = 'DatabaseError';

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should convert ConnectionError to 503', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const dbError = new Error('Cannot connect');
      dbError.name = 'ConnectionError';

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('when database is healthy', () => {
    beforeEach(() => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
    });

    it('should pass database errors to default handler when database is healthy', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const dbError = new Error('Connection failed');
      dbError.code = 'ECONNREFUSED';

      healthAwareErrorHandler(dbError, req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('non-database errors', () => {
    beforeEach(() => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
    });

    it('should pass non-database errors to default handler regardless of DB health', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const validationError = new Error('Invalid input');

      healthAwareErrorHandler(validationError, req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(validationError);
    });

    it('should pass authorization errors to default handler', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const authError = new Error('Unauthorized');
      authError.name = 'AuthorizationError';

      healthAwareErrorHandler(authError, req, res, next);

      expect(next).toHaveBeenCalledWith(authError);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
    });

    it('should handle null/undefined errors gracefully', () => {
      const { req, res, next } = createMockErrorReqRes('/test');

      healthAwareErrorHandler(null, req, res, next);

      expect(next).toHaveBeenCalledWith(null);
    });

    it('should handle errors without message property', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const error = { code: 'ECONNREFUSED' };

      healthAwareErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should handle errors without code property', () => {
      const { req, res, next } = createMockErrorReqRes('/test');
      const error = new Error('database connection lost');

      healthAwareErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });
});

describe('requireHealthyDatabase Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow requests when database is healthy', () => {
    mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
    const { req, res, next } = createMockReqRes('GET', '/test');

    requireHealthyDatabase(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should return 503 when database is unhealthy', () => {
    mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
    mockStorageFactory.getHealthStatus.mockReturnValue({
      mode: 'memory',
      isDatabaseHealthy: false,
      retryAttempts: 5
    });

    const { req, res, next } = createMockReqRes('POST', '/critical-operation');

    requireHealthyDatabase(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'database_unavailable',
      message: 'This operation requires a healthy database connection',
      path: '/critical-operation',
      healthStatus: {
        mode: 'memory',
        isDatabaseHealthy: false,
        retryAttempts: 5
      }
    });
  });

  it('should work with different HTTP methods', () => {
    mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
    mockStorageFactory.getHealthStatus.mockReturnValue({});

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach(method => {
      const { req, res, next } = createMockReqRes(method, '/test');
      requireHealthyDatabase(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
      
      vi.clearAllMocks();
    });
  });
});