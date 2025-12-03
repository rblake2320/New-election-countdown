/**
 * Health-checked database wrapper for seeding scripts and operations that need direct DB access
 * Prevents database operations when the database is unhealthy, avoiding stack traces and failures
 */

import { storageFactory } from './storage-factory';

// Define a placeholder that prevents any database operations when unhealthy
const healthCheckedDbProxy = new Proxy({} as any, {
  get(target, prop) {
    // Always check database health first
    if (!storageFactory.isDatabaseAvailable()) {
      const operation = String(prop);
      
      // Get detailed health status for better diagnostics
      const healthStatus = storageFactory.getHealthStatus();
      
      // Log the blocked operation with health details
      console.log(`🚫 Blocked database operation '${operation}' - Database is unhealthy`);
      console.log('ℹ️  Database seeding/migration operations are disabled during outages for safety');
      console.log(`📊 Health Status:`, {
        mode: healthStatus.mode,
        consecutiveFailures: healthStatus.consecutiveFailures,
        retryAttempts: healthStatus.retryAttempts,
        lastHealthCheck: healthStatus.lastHealthCheck,
        successRate: healthStatus.connectionStats.successRate + '%'
      });
      console.log('ℹ️  Wait for database health to be restored, then retry the operation');
      console.log('🔄 Or use forceReconnect() to attempt immediate recovery');
      
      // Return a function that throws a descriptive error
      return () => {
        throw new Error(`Database operation '${operation}' blocked: Database is unhealthy. Please wait for health restoration and retry.`);
      };
    }
    
    // Database is healthy, dynamically import and delegate to real db
    return async (...args: any[]) => {
      try {
        const { db } = await import('./db');
        const method = (db as any)[prop];
        
        if (typeof method === 'function') {
          return await method.apply(db, args);
        }
        
        return method;
      } catch (error) {
        // If we get a database error during a healthy state, log it cleanly
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`💥 Database operation '${String(prop)}' failed:`, errorMessage);
        throw error;
      }
    };
  }
});

/**
 * Safe database wrapper that respects health checking
 * Use this instead of importing { db } directly in seeding scripts
 */
export const safeDb = healthCheckedDbProxy;

/**
 * Helper function to check if database operations are safe
 * Use this before attempting any manual database operations
 */
export function isDatabaseSafe(): boolean {
  return storageFactory.isDatabaseAvailable();
}

/**
 * Helper function to get database health status
 * Useful for logging and error reporting
 */
export function getDatabaseHealthStatus() {
  return {
    isHealthy: storageFactory.isDatabaseAvailable(),
    healthInfo: storageFactory.getHealthStatus()
  };
}

/**
 * Safe wrapper for database operations with automatic retry
 * Waits for database health before proceeding
 */
export async function withHealthyDatabase<T>(
  operation: () => Promise<T>,
  maxWaitSeconds: number = 60
): Promise<T> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  
  while (Date.now() - startTime < maxWaitMs) {
    if (storageFactory.isDatabaseAvailable()) {
      try {
        return await operation();
      } catch (error) {
        // If operation fails due to database becoming unhealthy, retry
        if (!storageFactory.isDatabaseAvailable()) {
          console.log('🔄 Database became unhealthy during operation, retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        // Otherwise, it's a real error, rethrow it
        throw error;
      }
    }
    
    console.log('⏳ Waiting for database to become healthy...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Database did not become healthy within ${maxWaitSeconds} seconds`);
}