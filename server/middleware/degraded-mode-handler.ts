/**
 * Degraded Mode Handler Middleware
 * Handles API requests gracefully when the system is in degraded modes (READ_ONLY, REPLICA, etc.)
 */

import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface DegradedModeResponse {
  degradedMode: boolean;
  currentMode: string;
  message: string;
  alternatives?: string[];
  retryAfter?: number;
}

/**
 * Middleware to handle requests when system is in degraded mode
 */
export function degradedModeHandler(options: {
  allowReadOperations?: boolean;
  allowWriteOperations?: boolean;
  customMessage?: string;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const healthStatus = storage.getHealthStatus();
      const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      const isReadOperation = ['GET', 'HEAD'].includes(req.method);

      // Check if we're in a degraded mode
      const isDegradedMode = healthStatus.mode !== 'database' && healthStatus.mode !== 'hybrid';
      
      if (!isDegradedMode) {
        // Normal operation, continue
        return next();
      }

      // Handle degraded modes
      const degradedResponse: DegradedModeResponse = {
        degradedMode: true,
        currentMode: healthStatus.mode,
        message: options.customMessage || getDegradedModeMessage(healthStatus.mode),
        alternatives: getDegradedModeAlternatives(healthStatus.mode, isWriteOperation)
      };

      // In READ_ONLY mode, block write operations but allow reads
      if (healthStatus.mode === 'read_only') {
        if (isWriteOperation) {
          return res.status(503).json({
            error: 'Service temporarily read-only',
            ...degradedResponse,
            retryAfter: 300, // 5 minutes
            alternatives: [
              'Try again later when the system is fully operational',
              'Use GET requests to access existing data',
              'Check /api/failover/status for system status updates'
            ]
          });
        }
        // Allow read operations in read-only mode
        res.setHeader('X-System-Mode', 'read-only');
        res.setHeader('X-Degraded-Mode', 'true');
        return next();
      }

      // In REPLICA mode, allow reads but block writes
      if (healthStatus.mode === 'replica') {
        if (isWriteOperation) {
          return res.status(503).json({
            error: 'Service operating on replica database - writes unavailable',
            ...degradedResponse,
            retryAfter: 600, // 10 minutes
            alternatives: [
              'Use GET requests to access data from replica',
              'Wait for primary database restoration',
              'Check /api/failover/status for recovery progress'
            ]
          });
        }
        // Allow read operations in replica mode with warning
        res.setHeader('X-System-Mode', 'replica');
        res.setHeader('X-Degraded-Mode', 'true');
        res.setHeader('X-Data-Source', 'replica');
        return next();
      }

      // In MEMORY mode, provide limited functionality
      if (healthStatus.mode === 'memory' || healthStatus.mode === 'memory_optimized') {
        if (isWriteOperation) {
          return res.status(503).json({
            error: 'Service operating in memory mode - limited functionality',
            ...degradedResponse,
            retryAfter: 180, // 3 minutes
            alternatives: [
              'Data changes are not persisted in memory mode',
              'Check /api/failover/status for database restoration',
              'Contact support if this persists'
            ]
          });
        }
        // Allow read operations in memory mode with warning
        res.setHeader('X-System-Mode', healthStatus.mode);
        res.setHeader('X-Degraded-Mode', 'true');
        res.setHeader('X-Data-Source', 'memory');
        res.setHeader('X-Data-Persistence', 'temporary');
        return next();
      }

      // Unknown mode - be conservative
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        ...degradedResponse,
        retryAfter: 120,
        alternatives: [
          'Check /api/failover/status for current system status',
          'Contact support if this issue persists'
        ]
      });

    } catch (error) {
      console.error('Error in degraded mode handler:', error);
      // If we can't determine the mode, allow the request to proceed
      // but add a warning header
      res.setHeader('X-Mode-Check-Failed', 'true');
      next();
    }
  };
}

/**
 * Get appropriate message for degraded mode
 */
function getDegradedModeMessage(mode: string): string {
  switch (mode) {
    case 'read_only':
      return 'System is temporarily in read-only mode due to database maintenance or connectivity issues';
    case 'replica':
      return 'System is operating on replica database - read access only';
    case 'memory':
      return 'System is operating in memory mode - data persistence unavailable';
    case 'memory_optimized':
      return 'System is operating in optimized memory mode with limited persistence';
    default:
      return 'System is operating in degraded mode with limited functionality';
  }
}

/**
 * Get alternatives for degraded mode
 */
function getDegradedModeAlternatives(mode: string, isWriteOperation: boolean): string[] {
  const alternatives = [];
  
  if (isWriteOperation) {
    alternatives.push('Try again later when the system is fully operational');
    
    if (mode === 'replica' || mode === 'read_only') {
      alternatives.push('Use GET requests to access existing data');
    }
    
    alternatives.push('Check /api/failover/status for system status updates');
    
    if (mode === 'memory' || mode === 'memory_optimized') {
      alternatives.push('Note: Any changes made will not be permanently stored');
    }
  } else {
    if (mode === 'replica') {
      alternatives.push('Data is being served from replica database');
    }
    if (mode === 'memory' || mode === 'memory_optimized') {
      alternatives.push('Data is being served from memory cache');
    }
  }
  
  return alternatives;
}

/**
 * Specific middleware for election-related endpoints
 */
export function electionDegradedModeHandler(req: Request, res: Response, next: NextFunction) {
  return degradedModeHandler({
    customMessage: 'Election data service is temporarily in limited mode'
  })(req, res, next);
}

/**
 * Specific middleware for candidate-related endpoints
 */
export function candidateDegradedModeHandler(req: Request, res: Response, next: NextFunction) {
  return degradedModeHandler({
    customMessage: 'Candidate data service is temporarily in limited mode'
  })(req, res, next);
}

/**
 * Specific middleware for admin endpoints (more restrictive)
 */
export function adminDegradedModeHandler(req: Request, res: Response, next: NextFunction) {
  const healthStatus = storage.getHealthStatus();
  
  // Admin operations require full database functionality
  if (healthStatus.mode !== 'database' && healthStatus.mode !== 'hybrid') {
    return res.status(503).json({
      error: 'Administrative operations unavailable in degraded mode',
      degradedMode: true,
      currentMode: healthStatus.mode,
      message: 'Admin functions require full database connectivity',
      alternatives: [
        'Wait for database restoration',
        'Check /api/failover/status for recovery progress',
        'Contact system administrator if urgent'
      ],
      retryAfter: 300
    });
  }
  
  next();
}

/**
 * Middleware to add system status headers to all responses
 */
export function systemStatusHeaders(req: Request, res: Response, next: NextFunction) {
  try {
    const healthStatus = storage.getHealthStatus();
    
    res.setHeader('X-System-Mode', healthStatus.mode);
    res.setHeader('X-System-Healthy', healthStatus.systemHealthy.toString());
    res.setHeader('X-Database-Healthy', healthStatus.isDatabaseHealthy.toString());
    res.setHeader('X-Replica-Healthy', healthStatus.isReplicaHealthy.toString());
    
    if (healthStatus.mode !== 'database') {
      res.setHeader('X-Degraded-Mode', 'true');
    }
    
    // Add performance metrics
    if (healthStatus.connectionStats) {
      res.setHeader('X-Connection-Success-Rate', healthStatus.connectionStats.successRate.toString());
    }
    
  } catch (error) {
    console.error('Error adding system status headers:', error);
  }
  
  next();
}

/**
 * Enhanced error handler that provides degraded mode context
 */
export function degradedModeErrorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  try {
    const healthStatus = storage.getHealthStatus();
    const isDegradedMode = healthStatus.mode !== 'database';
    
    // If we're in degraded mode and this is a database-related error, provide context
    if (isDegradedMode && (
      error.message?.includes('database') ||
      error.message?.includes('connection') ||
      error.code === 'ECONNREFUSED'
    )) {
      return res.status(503).json({
        error: 'Service temporarily degraded',
        degradedMode: true,
        currentMode: healthStatus.mode,
        message: 'The requested operation failed due to current system limitations',
        originalError: error.message,
        alternatives: [
          'Try again later when the system is fully operational',
          'Check /api/failover/status for system status',
          'Use read-only operations if available'
        ],
        retryAfter: 180
      });
    }
    
    // For other errors in degraded mode, add context headers
    if (isDegradedMode) {
      res.setHeader('X-Degraded-Mode-Context', 'true');
      res.setHeader('X-Current-Mode', healthStatus.mode);
    }
    
  } catch (contextError) {
    console.error('Error in degraded mode error handler:', contextError);
  }
  
  // Continue with normal error handling
  next(error);
}