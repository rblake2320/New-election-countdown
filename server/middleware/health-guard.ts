import { Request, Response, NextFunction } from 'express';
import { storageFactory } from '../storage-factory';

/**
 * Global write-guard middleware that blocks ALL write operations when database is unhealthy
 * This is critical for system safety - prevents any database operations during outages
 */
export function globalWriteGuard(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const path = req.path;
  
  // Allow all GET requests to pass through
  if (method === 'GET') {
    return next();
  }
  
  // Allow OPTIONS requests (CORS preflight)
  if (method === 'OPTIONS') {
    return next();
  }
  
  // Special allowlist handling
  // Note: Since middleware is mounted on "/api", paths here don't include "/api" prefix
  if (path === '/track') {
    // Track endpoint always returns 202 even when DB is down
    return res.status(202).json({
      message: 'Analytics event accepted',
      status: 'queued',
      dbHealthy: storageFactory.isDatabaseAvailable()
    });
  }
  
  if (path === '/storage/health') {
    // Health endpoint always returns 200
    return next();
  }
  
  // Allow authentication endpoints - users need to register/login even when DB is unhealthy
  if (path === '/auth/register' || path === '/auth/signin' || path === '/auth/login' || path === '/auth/logout') {
    // Auth operations work in memory mode
    return next();
  }
  
  // Allow onboarding preferences during outages - MemStorage can handle this
  if (path === '/user/preferences/onboarding') {
    // Onboarding preferences work in memory mode
    return next();
  }
  
  // Check database health for all other write operations
  if (!storageFactory.isDatabaseAvailable()) {
    const errorResponse = {
      error: 'service_unavailable',
      message: 'Database is temporarily unavailable. Write operations are disabled for system safety.',
      mode: 'degraded',
      allowedOperations: ['GET requests', 'OPTIONS requests', '/api/track (202)', '/api/storage/health'],
      retryAfter: 30
    };
    
    // Log the blocked operation (concise, no stack trace)
    console.log(`🚫 Blocked ${method} ${path} - Database unhealthy`);
    
    return res.status(503).json(errorResponse);
  }
  
  // Database is healthy, allow the write operation
  return next();
}

/**
 * Error handling middleware that catches and downgrades DB-down errors
 * Prevents stack traces from leaking during database outages
 */
export function healthAwareErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Check if this is a database connection error
  const isDatabaseError = err && (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ETIMEDOUT' ||
    err.message?.includes('connection') ||
    err.message?.includes('database') ||
    err.message?.includes('timeout') ||
    err.name === 'DatabaseError' ||
    err.name === 'ConnectionError'
  );
  
  if (isDatabaseError && !storageFactory.isDatabaseAvailable()) {
    // Downgrade to concise log without stack trace
    console.log(`🔌 DB connection error during ${req.method} ${req.path} - Expected during outage`);
    
    return res.status(503).json({
      error: 'service_unavailable',
      message: 'Database connection lost. System is in degraded mode.',
      mode: 'degraded',
      path: req.path,
      method: req.method
    });
  }
  
  // For non-database errors or when DB is healthy, pass to default error handler
  next(err);
}

/**
 * Database health checker for individual routes that need explicit health validation
 * Use this in routes that absolutely must verify database health before proceeding
 */
export function requireHealthyDatabase(req: Request, res: Response, next: NextFunction) {
  if (!storageFactory.isDatabaseAvailable()) {
    console.log(`⚕️  Health check failed for ${req.method} ${req.path} - Database unhealthy`);
    
    return res.status(503).json({
      error: 'database_unavailable',
      message: 'This operation requires a healthy database connection',
      path: req.path,
      healthStatus: storageFactory.getHealthStatus()
    });
  }
  
  next();
}