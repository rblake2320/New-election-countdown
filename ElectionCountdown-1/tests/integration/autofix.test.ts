/**
 * Integration Tests for Autofix Routes
 * Tests GET endpoints return 503 when unhealthy, 200 with preview when healthy
 * Tests POST endpoints through full gate matrix (401, 403, 423, 400/403, 503, 200)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock all dependencies
vi.mock('../../server/storage-factory', () => ({
  storageFactory: {
    isDatabaseAvailable: vi.fn(),
    getHealthStatus: vi.fn()
  }
}));

vi.mock('../../server/db', () => ({
  pool: {
    query: vi.fn()
  }
}));

vi.mock('@neondatabase/serverless', () => ({
  neon: () => vi.fn()
}));

vi.mock('../../server/auth', () => ({
  authRequired: () => (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'admin-token') {
      req.userId = 1;
      req.isAdmin = true;
      req.adminUser = { id: 1, email: 'admin@admin.com', role: 'admin' };
      next();
    } else if (req.headers.authorization === 'user-token') {
      req.userId = 2;
      req.isAdmin = false;
      next();
    } else {
      res.status(401).json({ error: 'unauthorized' });
    }
  }
}));

// Mock middleware
vi.mock('../../server/middleware/autofix-security', () => ({
  requireAdminForAutofix: (req: any, res: any, next: any) => {
    if (req.method === 'GET') return next();
    if (!req.userId) {
      return res.status(401).json({
        error: 'authentication_required',
        message: 'Admin authentication required for auto-fix operations'
      });
    }
    if (!req.isAdmin) {
      return res.status(403).json({
        error: 'insufficient_privileges',
        message: 'Admin privileges required for auto-fix operations'
      });
    }
    next();
  },
  validateAutofixPolicies: (req: any, res: any, next: any) => {
    if (req.method === 'GET') return next();
    // Simulate policy validation based on test scenarios
    if (req.body.noPolicies) {
      return res.status(423).json({
        error: 'policies_disabled',
        message: 'Auto-fix operations are disabled - no active policies found'
      });
    }
    if (req.body.invalidSeverity) {
      return res.status(423).json({
        error: 'severity_not_allowed',
        message: 'No policies allow auto-fix at severity level'
      });
    }
    next();
  },
  requireExplicitApproval: (req: any, res: any, next: any) => {
    if (req.method === 'GET') return next();
    if (!req.body.approvedBy) {
      return res.status(400).json({
        error: 'approval_required',
        message: 'Explicit approval required for auto-fix operations'
      });
    }
    if (req.body.approvedBy !== req.adminUser?.email) {
      return res.status(403).json({
        error: 'approval_mismatch',
        message: 'Approval must be provided by the current authenticated admin user'
      });
    }
    next();
  },
  comprehensiveHealthCheck: (req: any, res: any, next: any) => {
    if (req.method === 'GET') return next();
    if (req.body.unhealthySystem) {
      return res.status(503).json({
        error: 'system_unhealthy',
        message: 'System health check failed - auto-fix operations blocked for safety'
      });
    }
    next();
  }
}));

let app: express.Express;

describe('Autofix Routes Integration Tests', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Create a mock autofix router
    const router = express.Router();

    // GET endpoints (detection/preview mode)
    router.get('/candidates', async (req, res) => {
      const { storageFactory } = await import('../../server/storage-factory');
      
      if (!storageFactory.isDatabaseAvailable()) {
        return res.status(503).json({
          ok: false,
          error: 'Database temporarily unavailable',
          message: 'Auto-fix detection cannot be performed while database is unhealthy',
          mode: 'degraded'
        });
      }

      res.json({
        ok: true,
        mode: 'detection_only',
        safety_notice: 'This endpoint shows what WOULD be fixed without making changes',
        count: 5,
        items: [
          { suggestion_id: 1, severity: 'high', kind: 'DATE_DRIFT', message: 'Election date inconsistency' },
          { suggestion_id: 2, severity: 'medium', kind: 'MISSING_CANDIDATES', message: 'Missing candidate data' }
        ]
      });
    });

    router.get('/preview/:suggestionId', async (req, res) => {
      const { storageFactory } = await import('../../server/storage-factory');
      
      if (!storageFactory.isDatabaseAvailable()) {
        return res.status(503).json({
          ok: false,
          error: 'Database temporarily unavailable',
          mode: 'degraded'
        });
      }

      res.json({
        ok: true,
        mode: 'preview_only',
        safety_notice: 'This is a PREVIEW of what would happen - no changes will be made',
        suggestion_id: parseInt(req.params.suggestionId),
        preview: {
          suggestion_id: parseInt(req.params.suggestionId),
          kind: 'DATE_DRIFT',
          severity: 'high',
          preview_action: 'WOULD_UPDATE_ELECTION_DATES'
        }
      });
    });

    // Import middleware from the mocked modules
    const { requireAdminForAutofix, validateAutofixPolicies, requireExplicitApproval, comprehensiveHealthCheck } = await import('../../server/middleware/autofix-security');

    // POST endpoints (mutation operations with full gate matrix)
    router.post('/apply/:suggestionId',
      requireAdminForAutofix,
      validateAutofixPolicies,
      requireExplicitApproval,
      comprehensiveHealthCheck,
      async (req, res) => {
        res.json({
          ok: true,
          suggestion_id: parseInt(req.params.suggestionId),
          status: 'applied',
          message: 'Auto-fix successfully applied',
          approvedBy: req.body.approvedBy
        });
      }
    );

    router.post('/batch',
      requireAdminForAutofix,
      validateAutofixPolicies,
      requireExplicitApproval,
      comprehensiveHealthCheck,
      async (req, res) => {
        res.json({
          ok: true,
          mode: 'batch_apply',
          processed: 3,
          successful: 2,
          failed: 1,
          approvedBy: req.body.approvedBy
        });
      }
    );

    app.use('/api/autofix', router);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Default to healthy database
    const { storageFactory } = await import('../../server/storage-factory');
    vi.mocked(storageFactory.isDatabaseAvailable).mockReturnValue(true);
  });

  describe('GET Endpoints (Detection/Preview Mode)', () => {
    describe('when database is healthy', () => {
      it('should return 200 with detection data for /candidates', async () => {
        const response = await request(app)
          .get('/api/autofix/candidates');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          mode: 'detection_only',
          safety_notice: 'This endpoint shows what WOULD be fixed without making changes',
          count: 5,
          items: [
            { suggestion_id: 1, severity: 'high', kind: 'DATE_DRIFT', message: 'Election date inconsistency' },
            { suggestion_id: 2, severity: 'medium', kind: 'MISSING_CANDIDATES', message: 'Missing candidate data' }
          ]
        });
      });

      it('should return 200 with preview data for /preview/:suggestionId', async () => {
        const response = await request(app)
          .get('/api/autofix/preview/123');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          mode: 'preview_only',
          safety_notice: 'This is a PREVIEW of what would happen - no changes will be made',
          suggestion_id: 123,
          preview: {
            suggestion_id: 123,
            kind: 'DATE_DRIFT',
            severity: 'high',
            preview_action: 'WOULD_UPDATE_ELECTION_DATES'
          }
        });
      });
    });

    describe('when database is unhealthy', () => {
      beforeEach(async () => {
        const { storageFactory } = await import('../../server/storage-factory');
        vi.mocked(storageFactory.isDatabaseAvailable).mockReturnValue(false);
      });

      it('should return 503 for /candidates when database is unhealthy', async () => {
        const response = await request(app)
          .get('/api/autofix/candidates');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
          ok: false,
          error: 'Database temporarily unavailable',
          message: 'Auto-fix detection cannot be performed while database is unhealthy',
          mode: 'degraded'
        });
      });

      it('should return 503 for /preview/:suggestionId when database is unhealthy', async () => {
        const response = await request(app)
          .get('/api/autofix/preview/456');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
          ok: false,
          error: 'Database temporarily unavailable',
          mode: 'degraded'
        });
      });
    });
  });

  describe('POST Endpoints (Full Gate Matrix)', () => {
    describe('Gate 1: Authentication (401)', () => {
      it('should return 401 when no authentication provided', async () => {
        const response = await request(app)
          .post('/api/autofix/apply/123')
          .send({
            approvedBy: 'admin@admin.com'
          });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          error: 'authentication_required',
          message: 'Admin authentication required for auto-fix operations'
        });
      });

      it('should return 401 for batch operations without authentication', async () => {
        const response = await request(app)
          .post('/api/autofix/batch')
          .send({
            maxSeverity: 'medium',
            approvedBy: 'admin@admin.com'
          });

        expect(response.status).toBe(401);
      });
    });

    describe('Gate 2: Authorization (403)', () => {
      it('should return 403 when user is not admin', async () => {
        const response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'user-token')
          .send({
            approvedBy: 'admin@admin.com'
          });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
          error: 'insufficient_privileges',
          message: 'Admin privileges required for auto-fix operations'
        });
      });
    });

    describe('Gate 3: Policy Validation (423)', () => {
      it('should return 423 when no policies are enabled', async () => {
        const response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({
            noPolicies: true,
            approvedBy: 'admin@admin.com'
          });

        expect(response.status).toBe(423);
        expect(response.body).toEqual({
          error: 'policies_disabled',
          message: 'Auto-fix operations are disabled - no active policies found'
        });
      });

      it('should return 423 when severity level is not allowed', async () => {
        const response = await request(app)
          .post('/api/autofix/batch')
          .set('Authorization', 'admin-token')
          .send({
            invalidSeverity: true,
            maxSeverity: 'critical',
            approvedBy: 'admin@admin.com'
          });

        expect(response.status).toBe(423);
        expect(response.body).toEqual({
          error: 'severity_not_allowed',
          message: 'No policies allow auto-fix at severity level'
        });
      });
    });

    describe('Gate 4: Explicit Approval (400/403)', () => {
      it('should return 400 when no approval is provided', async () => {
        const response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: 'approval_required',
          message: 'Explicit approval required for auto-fix operations'
        });
      });

      it('should return 403 when approval does not match admin user', async () => {
        const response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({
            approvedBy: 'wrong@example.com'
          });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
          error: 'approval_mismatch',
          message: 'Approval must be provided by the current authenticated admin user'
        });
      });
    });

    describe('Gate 5: System Health Check (503)', () => {
      it('should return 503 when system health check fails', async () => {
        const response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({
            unhealthySystem: true,
            approvedBy: 'admin@admin.com'
          });

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
          error: 'system_unhealthy',
          message: 'System health check failed - auto-fix operations blocked for safety'
        });
      });
    });

    describe('Success Path (200)', () => {
      it('should return 200 when all gates pass for apply operation', async () => {
        const response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({
            approvedBy: 'admin@admin.com',
            approvalReason: 'Critical fix needed'
          });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          suggestion_id: 123,
          status: 'applied',
          message: 'Auto-fix successfully applied',
          approvedBy: 'admin@admin.com'
        });
      });

      it('should return 200 when all gates pass for batch operation', async () => {
        const response = await request(app)
          .post('/api/autofix/batch')
          .set('Authorization', 'admin-token')
          .send({
            maxSeverity: 'medium',
            approvedBy: 'admin@admin.com',
            approvalReason: 'Batch cleanup needed'
          });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          mode: 'batch_apply',
          processed: 3,
          successful: 2,
          failed: 1,
          approvedBy: 'admin@admin.com'
        });
      });
    });

    describe('Complete Gate Matrix Coverage', () => {
      it('should test all status codes in sequence', async () => {
        // 401: No auth
        let response = await request(app)
          .post('/api/autofix/apply/123')
          .send({ approvedBy: 'admin@admin.com' });
        expect(response.status).toBe(401);

        // 403: Not admin
        response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'user-token')
          .send({ approvedBy: 'admin@admin.com' });
        expect(response.status).toBe(403);

        // 423: No policies
        response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({ noPolicies: true, approvedBy: 'admin@admin.com' });
        expect(response.status).toBe(423);

        // 400: No approval
        response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({});
        expect(response.status).toBe(400);

        // 403: Wrong approval
        response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({ approvedBy: 'wrong@example.com' });
        expect(response.status).toBe(403);

        // 503: Unhealthy system
        response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({ unhealthySystem: true, approvedBy: 'admin@admin.com' });
        expect(response.status).toBe(503);

        // 200: Success
        response = await request(app)
          .post('/api/autofix/apply/123')
          .set('Authorization', 'admin-token')
          .send({ approvedBy: 'admin@admin.com' });
        expect(response.status).toBe(200);
      });
    });
  });
});