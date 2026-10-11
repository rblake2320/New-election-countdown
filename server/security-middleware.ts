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

// Hostile-input detection. Real SQL safety comes from parameterised queries
// (drizzle / pg placeholders); this list only catches obvious attack strings so
// they can be logged and rejected. It deliberately does NOT match apostrophes
// or the words "or"/"and" — "O'Brien" and "governor and senate" are searches.
const sqlPatterns = [
  /\bunion\b[\s\S]{0,40}\bselect\b/i,
  /;\s*(drop|delete|insert|update|alter|create|truncate)\b/i,
  /\/\*[\s\S]*\*\//,
  /--\s*$/m,
  /\b(xp_cmdshell|information_schema|pg_sleep|sleep\s*\()/i,
  /'\s*(or|and)\s*['\d]+\s*=\s*['\d]+/i,
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
];

// Check if endpoint is a monitoring endpoint
const isMonitoringEndpoint = (path: string): boolean => {
  return monitoringEndpointsAllowlist.some(allowedPath =>
    path.startsWith(allowedPath) || path === allowedPath
  );
};


// Input validation middleware — applied uniformly (no Host/User-Agent based
// bypass: those headers are attacker-controlled). Caps length and rejects only
// clearly hostile strings; see sqlPatterns.
const MAX_QUERY_PARAM_LENGTH = 200;
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  if (isMonitoringEndpoint(req.path)) return next();

  const { search, state, type, q } = req.query;
  const params = [search, state, type, q].filter(Boolean);

  for (const param of params) {
    const values = Array.isArray(param) ? param : [param];
    for (const value of values) {
      if (typeof value !== 'string') continue;
      if (value.length > MAX_QUERY_PARAM_LENGTH) {
        return res.status(400).json({ error: 'Invalid input', message: `Query parameters are limited to ${MAX_QUERY_PARAM_LENGTH} characters` });
      }
      if (checkForSQLInjection(value)) {
        logSuspiciousActivity(req, 'SQL_INJECTION_ATTEMPT', { parameter: value.slice(0, 80), endpoint: req.path });
        return res.status(400).json({ error: 'Invalid input detected', message: 'Search terms contain disallowed content' });
      }
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

/**
 * One 429 contract for every limiter (UX review P1: the detail page rendered an
 * existing race as "Not Found" after a 429). Clients get a machine-readable code,
 * the seconds to wait, and the standard Retry-After header; nothing else changes.
 */
export const RATE_LIMITED_ERROR = 'rate_limited' as const;
export function rateLimitedHandler(scope: string) {
  return (req: any, res: any, _next: any, options: any) => {
    const windowMs = Number(options?.windowMs ?? 60_000);
    const resetTime: Date | undefined = req.rateLimit?.resetTime;
    const retryAfterSeconds = Math.max(1, Math.ceil(((resetTime ? resetTime.getTime() - Date.now() : windowMs)) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      error: RATE_LIMITED_ERROR,
      scope,
      message: 'Too many requests from this client; retry shortly. The resource itself was not checked.',
      retryAfterSeconds,
      limit: options?.max ?? options?.limit ?? null,
    });
  };
}

// Rate limiting for search endpoints
export const searchLimiter = rateLimit({
  // Sized for election night (measured 2026-10-11): every filter change is one
  // /api/elections call; 60/min per IP tolerates rapid filtering and shared NAT.
  windowMs: 60 * 1000,
  max: 60,
  handler: rateLimitedHandler('search'),
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

// Analytics ingestion: unauthenticated DB write, so it gets its own cap
// (batched client events; 120 batches/min per IP is far above real usage).
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many analytics requests', retryAfter: '1 minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
export const apiLimiter = rateLimit({
  // 300/min per IP: a user scrolling the full 500-card grid fires ~1 call per
  // card; 1000/15min (the old value) tripped after ~2 full scrolls.
  windowMs: 60 * 1000,
  max: 300,
  handler: rateLimitedHandler('api'),
  standardHeaders: true,
  legacyHeaders: false,
  // One predicate (a second `skip` key silently overrode the first). Use the
  // full URL path because this limiter is mounted at /api, which strips the
  // prefix from req.path. Health/readiness probes and the monitoring
  // allow-list never consume client quota.
  skip: (req) => {
    const fullPath = (req.originalUrl || req.url || '').split('?')[0];
    return fullPath.startsWith('/api/health') || isMonitoringEndpoint(fullPath);
  }
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