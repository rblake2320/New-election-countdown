/**
 * Unit Tests for Autofix Security Middleware
 * Tests all 5 middleware layers: requireAdminForAutofix, validateAutofixPolicies, 
 * requireExplicitApproval, comprehensiveHealthCheck
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  requireAdminForAutofix, 
  validateAutofixPolicies, 
  requireExplicitApproval,
  comprehensiveHealthCheck 
} from '../../server/middleware/autofix-security';

// Mock dependencies
const mockPool = {
  query: vi.fn()
};

const mockStorageFactory = {
  isDatabaseAvailable: vi.fn()
};

const mockSql = vi.fn();

const mockProcess = {
  env: {},
  memoryUsage: vi.fn()
};

// Mock the modules
vi.mock('../../server/db', () => ({
  pool: mockPool
}));

vi.mock('../../server/storage-factory', () => ({
  storageFactory: mockStorageFactory
}));

vi.mock('@neondatabase/serverless', () => ({
  neon: () => mockSql
}));

// Helper function to create mock request/response/next
function createMockReqRes(method: string = 'POST', path: string = '/autofix/apply/123', body: any = {}) {
  const req = {
    method,
    path,
    body,
    userId: undefined,
    isAdmin: undefined,
    adminUser: undefined
  } as any as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('requireAdminForAutofix Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset process.env
    mockProcess.env = {};
    vi.stubGlobal('process', mockProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests (detection/preview mode)', () => {
    it('should allow GET requests to pass through without authentication', () => {
      const { req, res, next } = createMockReqRes('GET', '/autofix/candidates');

      requireAdminForAutofix(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow GET requests regardless of database health', () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
      const { req, res, next } = createMockReqRes('GET', '/autofix/preview/456');

      requireAdminForAutofix(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('authentication requirements for mutations', () => {
    it('should return 401 when no user session is present', () => {
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');
      // req.userId is undefined

      requireAdminForAutofix(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'authentication_required',
        message: 'Admin authentication required for auto-fix operations',
        required: 'Valid admin session',
        endpoint: '/autofix/apply/123'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should work with different HTTP methods', () => {
      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      
      methods.forEach(method => {
        const { req, res, next } = createMockReqRes(method, '/autofix/batch');
        
        requireAdminForAutofix(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        
        vi.clearAllMocks();
      });
    });
  });

  describe('database health checks', () => {
    it('should return 503 when database is unhealthy', () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');
      req.userId = 1;

      requireAdminForAutofix(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'service_unavailable',
        message: 'Auto-fix operations blocked due to database health issues',
        mode: 'degraded',
        endpoint: '/autofix/apply/123'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should proceed to admin verification when database is healthy', () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
      mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');
      req.userId = 1;

      requireAdminForAutofix(req, res, next);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, COALESCE(role, \'user\') as role'),
        [1]
      );
    });
  });

  describe('admin privilege verification', () => {
    beforeEach(() => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
    });

    it('should return 401 when user is not found in database', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');
      req.userId = 999;

      requireAdminForAutofix(req, res, next);

      // Wait for promise to resolve
      await vi.waitFor(() => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'user_not_found',
          message: 'User session invalid',
          endpoint: '/autofix/apply/123'
        });
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user has no admin privileges', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 1, email: 'user@example.com', role: 'user' }]
      });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');
      req.userId = 1;

      requireAdminForAutofix(req, res, next);

      await vi.waitFor(() => {
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'insufficient_privileges',
          message: 'Admin privileges required for auto-fix operations',
          userRole: 'user',
          required: 'admin role or @admin.com email',
          endpoint: '/autofix/apply/123'
        });
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should grant access for user with admin role', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 1, email: 'admin@example.com', role: 'admin' }]
      });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');
      req.userId = 1;

      requireAdminForAutofix(req, res, next);

      await vi.waitFor(() => {
        expect(next).toHaveBeenCalledOnce();
        expect(req.isAdmin).toBe(true);
        expect(req.adminUser).toEqual({
          id: 1,
          email: 'admin@example.com',
          role: 'admin'
        });
      });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should grant access for user with @admin.com email', async () => {
      mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 2, email: 'user@admin.com', role: 'user' }]
      });
      
      const { req, res, next } = createMockReqRes('PUT', '/autofix/batch');
      req.userId = 2;

      requireAdminForAutofix(req, res, next);

      await vi.waitFor(() => {
        expect(next).toHaveBeenCalledOnce();
        expect(req.isAdmin).toBe(true);
        expect(req.adminUser).toEqual({
          id: 2,
          email: 'user@admin.com',
          role: 'user'
        });
      });
    });

    it('should grant access when ADMIN_FEATURES environment flag is set', async () => {
      mockProcess.env.ADMIN_FEATURES = '1';
      mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 3, email: 'regular@example.com', role: 'user' }]
      });
      
      const { req, res, next } = createMockReqRes('DELETE', '/autofix/suggestions/456');
      req.userId = 3;

      requireAdminForAutofix(req, res, next);

      await vi.waitFor(() => {
        expect(next).toHaveBeenCalledOnce();
        expect(req.isAdmin).toBe(true);
      });
    });

    it('should handle database query errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');
      req.userId = 1;

      requireAdminForAutofix(req, res, next);

      await vi.waitFor(() => {
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'admin_verification_failed',
          message: 'Failed to verify admin privileges',
          endpoint: '/autofix/apply/123'
        });
      });
    });

    it('should handle unexpected errors in middleware', () => {
      mockStorageFactory.isDatabaseAvailable.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');
      req.userId = 1;

      requireAdminForAutofix(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'admin_middleware_error',
        message: 'Admin verification system failure',
        endpoint: '/autofix/apply/123'
      });
    });
  });
});

describe('validateAutofixPolicies Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests (detection/preview mode)', () => {
    it('should allow GET requests to pass through without policy validation', async () => {
      const { req, res, next } = createMockReqRes('GET', '/autofix/candidates');

      await validateAutofixPolicies(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(mockSql).not.toHaveBeenCalled();
    });
  });

  describe('policy validation for mutations', () => {
    it('should return 423 when no auto-fix policies are enabled', async () => {
      mockSql.mockResolvedValue([{ enabled_count: '0', fixable_count: '0' }]);
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await validateAutofixPolicies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json).toHaveBeenCalledWith({
        error: 'policies_disabled',
        message: 'Auto-fix operations are disabled - no active policies found',
        enabledPolicies: 0,
        recommendation: 'Enable auto-fix policies in the admin dashboard first',
        endpoint: '/autofix/apply/123',
        mode: 'safety_locked'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 423 when policies are enabled but none have auto-fix capabilities', async () => {
      mockSql.mockResolvedValue([{ enabled_count: '3', fixable_count: '0' }]);
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await validateAutofixPolicies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json).toHaveBeenCalledWith({
        error: 'no_fixable_policies',
        message: 'No policies have auto-fix capabilities configured',
        enabledPolicies: '3',
        fixablePolicies: 0,
        recommendation: 'Configure auto-fix SQL for policies first',
        endpoint: '/autofix/apply/123',
        mode: 'safety_locked'
      });
    });

    it('should pass validation when policies are properly configured', async () => {
      mockSql.mockResolvedValue([{ enabled_count: '5', fixable_count: '3' }]);
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await validateAutofixPolicies(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('batch operation severity validation', () => {
    beforeEach(() => {
      // Mock successful policy check
      mockSql.mockResolvedValueOnce([{ enabled_count: '5', fixable_count: '3' }]);
    });

    it('should return 400 for invalid severity level', async () => {
      const { req, res, next } = createMockReqRes('POST', '/autofix/batch', { maxSeverity: 'invalid' });

      await validateAutofixPolicies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'invalid_severity',
        message: 'Invalid maxSeverity: invalid',
        validOptions: ['critical', 'high', 'medium', 'low'],
        endpoint: '/autofix/batch'
      });
    });

    it('should return 423 when no policies are compatible with severity level', async () => {
      mockSql.mockResolvedValueOnce([{ compatible_count: '0' }]);
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/batch', { maxSeverity: 'critical' });

      await validateAutofixPolicies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json).toHaveBeenCalledWith({
        error: 'severity_not_allowed',
        message: 'No policies allow auto-fix at severity level: critical',
        requestedSeverity: 'critical',
        recommendation: 'Adjust policy severity limits or request lower severity',
        endpoint: '/autofix/batch',
        mode: 'safety_locked'
      });
    });

    it('should pass validation when policies are compatible with severity', async () => {
      mockSql.mockResolvedValueOnce([{ compatible_count: '2' }]);
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/batch', { maxSeverity: 'medium' });

      await validateAutofixPolicies(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should use default severity "low" when not specified', async () => {
      mockSql.mockResolvedValueOnce([{ compatible_count: '3' }]);
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/batch', {});

      await validateAutofixPolicies(req, res, next);

      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('low'));
      expect(next).toHaveBeenCalledOnce();
    });

    it('should handle all valid severity levels', async () => {
      const severities = ['critical', 'high', 'medium', 'low'];
      
      for (const severity of severities) {
        mockSql.mockClear();
        mockSql.mockResolvedValueOnce([{ enabled_count: '5', fixable_count: '3' }]);
        mockSql.mockResolvedValueOnce([{ compatible_count: '1' }]);
        
        const { req, res, next } = createMockReqRes('POST', '/autofix/batch', { maxSeverity: severity });

        await validateAutofixPolicies(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        
        vi.clearAllMocks();
      }
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSql.mockRejectedValue(new Error('Database query failed'));
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await validateAutofixPolicies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'policy_validation_failed',
        message: 'Failed to validate auto-fix policies',
        details: 'Database query failed',
        endpoint: '/autofix/apply/123'
      });
    });
  });
});

describe('requireExplicitApproval Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests (detection/preview mode)', () => {
    it('should allow GET requests to pass through without approval', () => {
      const { req, res, next } = createMockReqRes('GET', '/autofix/preview/123');

      requireExplicitApproval(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('approval requirements for mutations', () => {
    it('should return 400 when no approvedBy is provided', () => {
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123', {});

      requireExplicitApproval(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'approval_required',
        message: 'Explicit approval required for auto-fix operations',
        required: {
          approvedBy: 'Admin email or ID who approves this operation',
          approvalReason: 'Reason for performing this auto-fix (optional but recommended)'
        },
        endpoint: '/autofix/apply/123',
        safety: 'This prevents accidental or automated executions'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 when approvedBy is empty string', () => {
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123', { approvedBy: '' });

      requireExplicitApproval(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('approval validation against admin user', () => {
    it('should return 403 when approval does not match admin user email', () => {
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123', { 
        approvedBy: 'wrong@example.com' 
      });
      req.adminUser = { id: 1, email: 'admin@example.com', role: 'admin' };

      requireExplicitApproval(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'approval_mismatch',
        message: 'Approval must be provided by the current authenticated admin user',
        providedBy: 'wrong@example.com',
        requiredBy: 'admin@example.com',
        endpoint: '/autofix/apply/123'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept approval with matching admin email', () => {
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123', { 
        approvedBy: 'admin@example.com',
        approvalReason: 'Critical data fix needed'
      });
      req.adminUser = { id: 1, email: 'admin@example.com', role: 'admin' };

      requireExplicitApproval(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body.auditTrail).toEqual({
        approvedBy: 'admin@example.com',
        approvalReason: 'Critical data fix needed',
        approvedAt: expect.any(String),
        adminUser: 'admin@example.com',
        endpoint: '/autofix/apply/123',
        method: 'POST'
      });
    });

    it('should accept approval with matching admin ID as string', () => {
      const { req, res, next } = createMockReqRes('PUT', '/autofix/batch', { 
        approvedBy: '123' 
      });
      req.adminUser = { id: 123, email: 'admin@example.com', role: 'admin' };

      requireExplicitApproval(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept approval with matching admin ID as number', () => {
      const { req, res, next } = createMockReqRes('DELETE', '/autofix/suggestions/456', { 
        approvedBy: 456 
      });
      req.adminUser = { id: 456, email: 'admin@example.com', role: 'admin' };

      requireExplicitApproval(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should work when no adminUser is set (for backwards compatibility)', () => {
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123', { 
        approvedBy: 'some@admin.com' 
      });
      // req.adminUser is undefined

      requireExplicitApproval(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle missing approval reason gracefully', () => {
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123', { 
        approvedBy: 'admin@example.com'
        // approvalReason not provided
      });
      req.adminUser = { id: 1, email: 'admin@example.com', role: 'admin' };

      requireExplicitApproval(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(req.body.auditTrail.approvalReason).toBe('No reason provided');
    });
  });
});

describe('comprehensiveHealthCheck Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.memoryUsage
    mockProcess.memoryUsage.mockReturnValue({
      rss: 100 * 1024 * 1024,
      heapTotal: 50 * 1024 * 1024,
      heapUsed: 30 * 1024 * 1024, // 30MB, under threshold
      external: 5 * 1024 * 1024,
      arrayBuffers: 1024 * 1024
    });
    vi.stubGlobal('process', mockProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests (detection/preview mode)', () => {
    it('should allow GET requests to pass through without full health check', async () => {
      const { req, res, next } = createMockReqRes('GET', '/autofix/candidates');

      await comprehensiveHealthCheck(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(mockStorageFactory.isDatabaseAvailable).not.toHaveBeenCalled();
    });
  });

  describe('comprehensive health validation for mutations', () => {
    it('should return 503 when database is unavailable', async () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
      mockSql.mockResolvedValue([{ test: 1 }]);
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await comprehensiveHealthCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'system_unhealthy',
        message: 'System health check failed - auto-fix operations blocked for safety',
        healthIssues: ['Database connectivity failed'],
        recommendation: 'Resolve health issues before attempting auto-fix operations',
        endpoint: '/autofix/apply/123',
        mode: 'safety_locked'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 503 when database query test fails', async () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
      mockSql.mockRejectedValue(new Error('Query execution failed'));
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await comprehensiveHealthCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'system_unhealthy',
        message: 'System health check failed - auto-fix operations blocked for safety',
        healthIssues: ['Database query test failed'],
        recommendation: 'Resolve health issues before attempting auto-fix operations',
        endpoint: '/autofix/apply/123',
        mode: 'safety_locked'
      });
    });

    it('should return 503 when memory usage is too high', async () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
      mockSql.mockResolvedValue([{ test: 1 }]);
      
      // Mock high memory usage (600MB, over 500MB threshold)
      mockProcess.memoryUsage.mockReturnValue({
        rss: 800 * 1024 * 1024,
        heapTotal: 700 * 1024 * 1024,
        heapUsed: 600 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024
      });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await comprehensiveHealthCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'system_unhealthy',
        message: 'System health check failed - auto-fix operations blocked for safety',
        healthIssues: ['High memory usage: 600.0MB'],
        recommendation: 'Resolve health issues before attempting auto-fix operations',
        endpoint: '/autofix/apply/123',
        mode: 'safety_locked'
      });
    });

    it('should accumulate multiple health issues', async () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);
      mockSql.mockRejectedValue(new Error('DB error'));
      mockProcess.memoryUsage.mockReturnValue({
        rss: 800 * 1024 * 1024,
        heapTotal: 700 * 1024 * 1024,
        heapUsed: 550 * 1024 * 1024, // Over threshold
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024
      });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await comprehensiveHealthCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          healthIssues: [
            'Database connectivity failed',
            'Database query test failed',
            'High memory usage: 550.0MB'
          ]
        })
      );
    });

    it('should pass when all health checks succeed', async () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
      mockSql.mockResolvedValue([{ test: 1 }]);
      // Memory usage already mocked as low in beforeEach
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await comprehensiveHealthCheck(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('System health check passed')
      );
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors during health check', async () => {
      mockStorageFactory.isDatabaseAvailable.mockImplementation(() => {
        throw new Error('Unexpected error in health check');
      });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await comprehensiveHealthCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'health_check_failed',
        message: 'Unable to perform system health check',
        details: 'Unexpected error in health check',
        endpoint: '/autofix/apply/123'
      });
    });

    it('should handle memory usage check errors gracefully', async () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
      mockSql.mockResolvedValue([{ test: 1 }]);
      mockProcess.memoryUsage.mockImplementation(() => {
        throw new Error('Memory check failed');
      });
      
      const { req, res, next } = createMockReqRes('POST', '/autofix/apply/123');

      await comprehensiveHealthCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});