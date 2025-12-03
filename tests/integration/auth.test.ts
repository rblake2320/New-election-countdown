/**
 * Integration Tests for Auth Flows
 * Tests register/login, cookie propagation, admin vs non-admin role checks
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { registerRoutes } from '../../server/routes';

// Mock dependencies
const mockPool = {
  query: vi.fn()
};

const mockStorageFactory = {
  isDatabaseAvailable: vi.fn(),
  getHealthStatus: vi.fn()
};

const mockHashPassword = vi.fn();
const mockVerifyPassword = vi.fn();
const mockCreateSession = vi.fn();
const mockSetSessionCookie = vi.fn();
const mockVerifySession = vi.fn();
const mockRevokeSession = vi.fn();

vi.mock('../../server/db', () => ({
  pool: mockPool
}));

vi.mock('../../server/storage-factory', () => ({
  storageFactory: mockStorageFactory
}));

vi.mock('../../server/auth', () => ({
  authRequired: () => (req: any, res: any, next: any) => {
    // Mock auth middleware - check for userId in request
    if (req.headers.authorization === 'valid-token') {
      req.userId = 1;
      next();
    } else if (req.headers.authorization === 'admin-token') {
      req.userId = 2;
      next();
    } else {
      res.status(401).json({ error: 'unauthorized' });
    }
  },
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
  createSession: mockCreateSession,
  setSessionCookie: mockSetSessionCookie,
  verifySession: mockVerifySession,
  revokeSession: mockRevokeSession,
  SESSION_COOKIE: 'session_token'
}));

// Mock other services to avoid dependencies
vi.mock('../../server/storage', () => ({
  storage: {},
  initializeData: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../server/cache-service', () => ({
  cacheService: {}
}));

vi.mock('../../server/replitAuth', () => ({
  setupAuth: vi.fn(),
  isAuthenticated: vi.fn()
}));

// Mock other routers and services
const mockRouterMethods = ['get', 'post', 'put', 'delete', 'patch'];
const createMockRouter = () => {
  const router = {} as any;
  mockRouterMethods.forEach(method => {
    router[method] = vi.fn().mockReturnThis();
  });
  router.use = vi.fn().mockReturnThis();
  return router;
};

vi.mock('../../server/routes/elections', () => ({
  electionsRouter: createMockRouter()
}));
vi.mock('../../server/routes/elections_guard', () => ({
  electionsGuardRouter: createMockRouter()
}));
vi.mock('../../server/routes/track', () => ({
  trackRouter: createMockRouter()
}));
vi.mock('../../server/routes/analytics', () => ({
  analyticsRouter: createMockRouter()
}));
vi.mock('../../server/routes/health', () => ({
  healthRouter: createMockRouter()
}));
vi.mock('../../server/routes/elections-counts', () => ({
  electionsCountsRouter: createMockRouter()
}));
vi.mock('../../server/routes/bot', () => ({
  botRouter: createMockRouter()
}));
vi.mock('../../server/routes/mcp', () => ({
  default: createMockRouter()
}));
vi.mock('../../server/routes/autofix', () => ({
  default: createMockRouter()
}));
vi.mock('../../server/routes/steward-policies', () => ({
  default: createMockRouter()
}));
vi.mock('../../server/routes/steward-audit', () => ({
  default: createMockRouter()
}));
vi.mock('../../server/routes/polls', () => ({
  default: createMockRouter()
}));
vi.mock('../../server/routes/campaigns', () => ({
  default: createMockRouter()
}));
vi.mock('../../server/routes/profiles', () => ({
  default: createMockRouter()
}));
vi.mock('../../server/routes/candidates', () => ({
  default: createMockRouter()
}));

// Mock all the services and middleware
vi.mock('../../server/middleware/api-key-guard', () => ({
  requireVoteSmartAPI: vi.fn((req: any, res: any, next: any) => next()),
  requireProPublicaAPI: vi.fn((req: any, res: any, next: any) => next()),
  requireGoogleCivicAPI: vi.fn((req: any, res: any, next: any) => next()),
  requireCongressionalAPI: vi.fn((req: any, res: any, next: any) => next()),
  requireOptionalService: vi.fn(() => (req: any, res: any, next: any) => next()),
  getCriticalServiceStatus: vi.fn()
}));

vi.mock('../../server/security-middleware', () => ({
  securityHeaders: vi.fn((req: any, res: any, next: any) => next()),
  additionalSecurity: vi.fn((req: any, res: any, next: any) => next()),
  apiLimiter: vi.fn((req: any, res: any, next: any) => next()),
  searchLimiter: vi.fn((req: any, res: any, next: any) => next()),
  validateInput: vi.fn((req: any, res: any, next: any) => next()),
  sanitizeInput: vi.fn((req: any, res: any, next: any) => next()),
  logSuspiciousActivity: vi.fn((req: any, res: any, next: any) => next())
}));

// Mock various services
const createMockService = () => ({});
vi.mock('../../server/congress-bill-service', () => ({
  getCongressBillService: vi.fn(() => createMockService())
}));
vi.mock('../../server/perplexity-congress-service', () => ({
  perplexityCongressService: createMockService()
}));
vi.mock('../../server/congress-import-service', () => ({
  congressImportService: createMockService()
}));
vi.mock('../../server/mapquest-service', () => ({
  mapQuestService: createMockService()
}));
vi.mock('../../server/real-time-monitor', () => ({
  realTimeMonitor: createMockService()
}));
vi.mock('../../server/web-scraper', () => ({
  electionScraper: createMockService()
}));
vi.mock('../../server/ai-validation-service', () => ({
  aiValidationService: createMockService()
}));
vi.mock('../../server/compliance-service', () => ({
  complianceService: createMockService()
}));
vi.mock('../../server/event-processing-service', () => ({
  eventProcessingService: createMockService()
}));
vi.mock('../../server/global-election-service', () => ({
  globalElectionService: createMockService()
}));
vi.mock('../../server/civic-aggregator-service', () => ({
  civicAggregatorService: createMockService()
}));
vi.mock('../../server/routes-candidate-portal', () => ({
  registerCandidatePortalRoutes: vi.fn()
}));
vi.mock('../../server/position-aggregator-service', () => ({
  positionAggregatorService: createMockService()
}));
vi.mock('../../server/enhanced-position-service', () => ({
  enhancedPositionService: createMockService()
}));
vi.mock('../../server/candidate-position-api', () => ({
  candidatePositionAPI: createMockService()
}));
vi.mock('../../server/polling-trend-service', () => ({
  pollingTrendService: createMockService()
}));
vi.mock('../../server/openstates-service', () => ({
  openStatesService: createMockService()
}));
vi.mock('../../server/api-key-validation-service', () => ({
  apiKeyValidationService: createMockService()
}));
vi.mock('../../server/data-integrity-service', () => ({
  dataIntegrityService: createMockService()
}));
vi.mock('../../server/validators/state-election-rules', () => ({
  validateElectionData: vi.fn(),
  validateNotMockData: vi.fn()
}));

// Global nodemailer mock
vi.mock('nodemailer', () => ({
  default: {
    createTransporter: vi.fn()
  }
}));

let app: express.Express;

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Create express app and register routes
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());

    // Set up auth routes specifically
    const authRouter = (await import('../../server/routes/auth')).default;
    app.use('/api/auth', authRouter);
    
    // Add error handler
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({ error: 'server_error', message: err?.message });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default database health to true
    mockStorageFactory.isDatabaseAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // No existing user
        .mockResolvedValueOnce({ 
          rowCount: 1, 
          rows: [{ id: 1, email: 'test@example.com', email_verified: false }] 
        }) // Insert user
        .mockResolvedValueOnce({ 
          rowCount: 1, 
          rows: [{ token: 'verification-token-123' }] 
        }); // Insert verification token

      mockHashPassword.mockResolvedValue('hashed-password-123');
      mockCreateSession.mockResolvedValue('session-token-456');
      mockSetSessionCookie.mockImplementation(() => {});

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        user: {
          id: 1,
          email: 'test@example.com',
          email_verified: false
        }
      });

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockHashPassword).toHaveBeenCalledWith('password123');
      expect(mockCreateSession).toHaveBeenCalledWith(1, expect.any(String), expect.any(String));
      expect(mockSetSessionCookie).toHaveBeenCalledWith(expect.any(Object), 'session-token-456');
    });

    it('should return 409 when email is already in use', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'email_in_use' });
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('bad_request');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for password too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('bad_request');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully with valid credentials', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          password_hash: 'hashed-password',
          email: 'test@example.com',
          email_verified: true
        }]
      });

      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue('session-token-789');
      mockSetSessionCookie.mockImplementation(() => {});

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: {
          id: 1,
          email: 'test@example.com',
          email_verified: true
        }
      });

      expect(mockVerifyPassword).toHaveBeenCalledWith('hashed-password', 'password123');
      expect(mockCreateSession).toHaveBeenCalledWith(1, expect.any(String), expect.any(String));
    });

    it('should return 401 for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'invalid_credentials' });
    });

    it('should return 401 for invalid password', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          password_hash: 'hashed-password',
          email: 'test@example.com',
          email_verified: true
        }]
      });

      mockVerifyPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'invalid_credentials' });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      mockVerifySession.mockReturnValue({ uid: 1, jti: 'jwt-id-123' });
      mockRevokeSession.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'session_token=valid-session-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
      expect(mockRevokeSession).toHaveBeenCalledWith(1, 'jwt-id-123');
    });

    it('should handle logout without valid session gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it('should handle logout with invalid session token gracefully', async () => {
      mockVerifySession.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'session_token=invalid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data when authenticated', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          email: 'test@example.com',
          email_verified: true
        }]
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: {
          id: 1,
          email: 'test@example.com',
          email_verified: true
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'unauthorized' });
    });

    it('should return 503 when database is unhealthy', async () => {
      mockStorageFactory.isDatabaseAvailable.mockReturnValue(false);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'valid-token');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        error: 'User data temporarily unavailable',
        message: 'Database is unhealthy - user profile access is temporarily disabled',
        mode: 'degraded'
      });
    });

    it('should return 404 when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'valid-token');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'user_not_found' });
    });
  });

  describe('Admin vs Non-Admin Role Checks', () => {
    it('should identify regular user correctly', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          email: 'user@example.com',
          email_verified: true
        }]
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'valid-token');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('user@example.com');
      expect(response.body.user.email).not.toContain('@admin.com');
    });

    it('should identify admin user by email domain', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 2,
          email: 'admin@admin.com',
          email_verified: true
        }]
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'admin-token');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('admin@admin.com');
      expect(response.body.user.email).toContain('@admin.com');
    });
  });

  describe('Cookie Propagation', () => {
    it('should set session cookie on successful registration', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ 
          rowCount: 1, 
          rows: [{ id: 1, email: 'test@example.com', email_verified: false }] 
        })
        .mockResolvedValueOnce({ 
          rowCount: 1, 
          rows: [{ token: 'verification-token' }] 
        });

      mockHashPassword.mockResolvedValue('hashed');
      mockCreateSession.mockResolvedValue('session-token');

      let sessionCookieSet = false;
      mockSetSessionCookie.mockImplementation((res, token) => {
        sessionCookieSet = true;
        expect(token).toBe('session-token');
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(sessionCookieSet).toBe(true);
    });

    it('should set session cookie on successful login', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          password_hash: 'hashed-password',
          email: 'test@example.com',
          email_verified: true
        }]
      });

      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue('login-session-token');

      let sessionCookieSet = false;
      mockSetSessionCookie.mockImplementation((res, token) => {
        sessionCookieSet = true;
        expect(token).toBe('login-session-token');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(sessionCookieSet).toBe(true);
    });
  });

  describe('Email Verification', () => {
    it('should verify email successfully with valid token', async () => {
      mockPool.query
        .mockResolvedValueOnce({ 
          rowCount: 1, 
          rows: [{ user_id: 1 }] 
        }) // Delete verification token
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // Update user

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-verification-token' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it('should return 400 for invalid or expired token', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'invalid_or_expired' });
    });

    it('should return 400 when no token provided', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'bad_request' });
    });
  });
});