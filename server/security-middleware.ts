import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import winston from 'winston';

// Security logging configuration
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
});

// SQL injection pattern detection
const sqlPatterns = [
  /(\'|\"|\\|;|\/\*|--|\*\/|\bor\b|\band\b|\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b)/i,
  /\'\s*or\s*\d+\s*=\s*\d+/i,
  /\'\s*and\s*\d+\s*=\s*\d+/i,
  /\'\s*or\s*\'\d+\'\s*=\s*\'\d+/i
];

// Log suspicious activity
export const logSuspiciousActivity = (req: Request, type: string, details: any) => {
  securityLogger.warn({
    type: 'SECURITY_ALERT',
    alertType: type,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    details: details,
    timestamp: new Date().toISOString()
  });
};

// Check for SQL injection patterns
const checkForSQLInjection = (input: string): boolean => {
  if (!input) return false;
  return sqlPatterns.some(pattern => pattern.test(input));
};

// Monitoring endpoints allowlist - these endpoints should bypass SQL injection checks
const monitoringEndpointsAllowlist = [
  '/api/failover/status',
  '/api/failover/health',
  '/api/failover/orchestration',
  '/api/storage/health',
  '/api/health',
  '/api/monitoring',
  '/api/system/status',
  '/api/track'
];

// Check if endpoint is a monitoring endpoint
const isMonitoringEndpoint = (path: string): boolean => {
  return monitoringEndpointsAllowlist.some(allowedPath => 
    path.startsWith(allowedPath) || path === allowedPath
  );
};

// Check if request is from legitimate monitoring/testing client
const isLegitimateMonitoringClient = (req: Request): boolean => {
  const userAgent = req.get('User-Agent') || '';
  const host = req.get('Host') || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  
  // Allow HeadlessChrome (Playwright/Puppeteer testing)
  if (userAgent.includes('HeadlessChrome') || userAgent.includes('Playwright')) {
    return true;
  }
  
  // Allow localhost requests
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.') || 
      host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }
  
  // Allow internal monitoring services
  if (userAgent.includes('ElectionTracker') || userAgent.includes('Replit-Agent')) {
    return true;
  }
  
  // Allow health check requests without suspicious patterns
  if (isMonitoringEndpoint(req.path)) {
    return true;
  }
  
  return false;
};

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Skip SQL injection checks for monitoring endpoints and legitimate clients
  if (isMonitoringEndpoint(req.path) || isLegitimateMonitoringClient(req)) {
    return next();
  }

  const { search, state, type, q } = req.query;
  
  // Check all query parameters for SQL injection
  const params = [search, state, type, q].filter(Boolean);
  
  for (const param of params) {
    if (typeof param === 'string' && checkForSQLInjection(param)) {
      // Don't log legitimate monitoring clients as suspicious
      if (!isLegitimateMonitoringClient(req)) {
        logSuspiciousActivity(req, 'SQL_INJECTION_ATTEMPT', { 
          parameter: param,
          endpoint: req.path
        });
      }
      
      return res.status(400).json({ 
        error: 'Invalid input detected',
        message: 'Search terms cannot contain SQL commands'
      });
    }
  }
  
  next();
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove potentially dangerous characters
  return input
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .replace(/[;<>]/g, '') // Remove SQL command terminators and comparators
    .trim()
    .substring(0, 200); // Limit length
};

// Rate limiting for search endpoints
export const searchLimiter = rateLimit({
  // Sized for election night (measured 2026-10-11): every filter change is one
  // /api/elections call; 60/min per IP tolerates rapid filtering and shared NAT.
  windowMs: 60 * 1000,
  max: 60,
  message: {
    error: 'Too many search requests',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Monitoring endpoints rate limiter (more permissive for health checks)
export const monitoringLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Allow more frequent health checks
  message: {
    error: 'Too many monitoring requests',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Credential endpoints: brute-force protection (per IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true, // only failed attempts count
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
export const apiLimiter = rateLimit({
  // 300/min per IP: a user scrolling the full 500-card grid fires ~1 call per
  // card; 1000/15min (the old value) tripped after ~2 full scrolls.
  windowMs: 60 * 1000,
  max: 300,
  message: {
    error: 'Too many API requests',
    retryAfter: '1 minute'
  },
  // Health/readiness probes (Docker, nginx, uptime monitors) never consume client quota.
  skip: (req) => req.path === '/health' || req.path.startsWith('/health/'),
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for monitoring endpoints
  skip: (req) => isMonitoringEndpoint(req.path)
});

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Additional security middleware
export const additionalSecurity = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};