import express from "express";
import { storageFactory } from "../storage-factory";
import { testDatabaseConnection, connectWithRetry } from "../db";

export const healthEnhancedRouter = express.Router();

/**
 * Enhanced database health endpoint with detailed diagnostics
 * GET /api/health/database
 */
healthEnhancedRouter.get("/database", async (req, res) => {
  try {
    const healthStatus = storageFactory.getHealthStatus();
    const uptime = Math.floor(process.uptime());
    
    // Perform a real-time connection test
    const connectionTest = await testDatabaseConnection(5000);
    
    res.json({
      timestamp: new Date().toISOString(),
      uptime: uptime + 's',
      database: {
        isHealthy: healthStatus.isDatabaseHealthy,
        isMemoryOptimized: healthStatus.isMemoryOptimized,
        systemHealthy: healthStatus.systemHealthy,
        mode: healthStatus.mode,
        currentStorageType: healthStatus.currentStorageType,
        consecutiveFailures: healthStatus.consecutiveFailures,
        retryAttempts: healthStatus.retryAttempts,
        healthCheckInterval: healthStatus.healthCheckInterval + 'ms',
        lastHealthCheck: healthStatus.lastHealthCheck,
        queueLength: healthStatus.queueLength
      },
      connectionStats: healthStatus.connectionStats,
      realtimeTest: {
        success: connectionTest.success,
        latency: connectionTest.latency + 'ms',
        error: connectionTest.error,
        timestamp: new Date().toISOString()
      },
      diagnostics: healthStatus.diagnostics.map(d => ({
        timestamp: d.timestamp,
        success: d.success,
        latency: d.latency ? d.latency + 'ms' : null,
        error: d.error
      })),
      recommendations: generateHealthRecommendations(healthStatus)
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'health_check_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Force database reconnection endpoint
 * POST /api/health/reconnect
 */
healthEnhancedRouter.post("/reconnect", async (req, res) => {
  try {
    console.log('🔄 Manual database reconnection requested...');
    
    const result = await storageFactory.forceReconnect();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Database reconnection successful after ${result.attempts} attempts`,
        attempts: result.attempts,
        timestamp: new Date().toISOString(),
        healthStatus: storageFactory.getHealthStatus()
      });
    } else {
      res.status(503).json({
        success: false,
        message: `Database reconnection failed after ${result.attempts} attempts`,
        attempts: result.attempts,
        error: result.error,
        timestamp: new Date().toISOString(),
        healthStatus: storageFactory.getHealthStatus()
      });
    }
  } catch (error) {
    console.error('Reconnection attempt error:', error);
    res.status(500).json({
      success: false,
      error: 'reconnection_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Force health check endpoint
 * POST /api/health/check
 */
healthEnhancedRouter.post("/check", async (req, res) => {
  try {
    console.log('🔍 Manual health check requested...');
    
    await storageFactory.forceHealthCheck();
    
    const healthStatus = storageFactory.getHealthStatus();
    
    res.json({
      success: true,
      message: 'Health check completed',
      timestamp: new Date().toISOString(),
      healthStatus: {
        isDatabaseHealthy: healthStatus.isDatabaseHealthy,
        mode: healthStatus.mode,
        consecutiveFailures: healthStatus.consecutiveFailures,
        retryAttempts: healthStatus.retryAttempts,
        lastHealthCheck: healthStatus.lastHealthCheck,
        connectionStats: healthStatus.connectionStats
      }
    });
  } catch (error) {
    console.error('Manual health check error:', error);
    res.status(500).json({
      success: false,
      error: 'health_check_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Clear connection diagnostics history
 * POST /api/health/clear-diagnostics
 */
healthEnhancedRouter.post("/clear-diagnostics", async (req, res) => {
  try {
    storageFactory.clearDiagnostics();
    
    res.json({
      success: true,
      message: 'Connection diagnostics history cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clear diagnostics error:', error);
    res.status(500).json({
      success: false,
      error: 'clear_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Connection stress test endpoint
 * POST /api/health/stress-test
 */
healthEnhancedRouter.post("/stress-test", async (req, res) => {
  try {
    const { iterations = 10, timeout = 3000 } = req.body;
    
    console.log(`🏋️ Running connection stress test (${iterations} iterations)...`);
    
    const results = [];
    
    for (let i = 1; i <= iterations; i++) {
      const startTime = Date.now();
      const result = await testDatabaseConnection(timeout);
      const totalTime = Date.now() - startTime;
      
      results.push({
        iteration: i,
        success: result.success,
        latency: result.latency,
        totalTime,
        error: result.error,
        timestamp: new Date().toISOString()
      });
      
      // Small delay between tests
      if (i < iterations) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const avgLatency = results
      .filter(r => r.latency)
      .reduce((sum, r) => sum + r.latency!, 0) / results.filter(r => r.latency).length;
    
    console.log(`✅ Stress test completed: ${successCount}/${iterations} successful (${(successCount/iterations*100).toFixed(1)}%)`);
    
    res.json({
      success: true,
      summary: {
        totalIterations: iterations,
        successfulIterations: successCount,
        failedIterations: iterations - successCount,
        successRate: Math.round((successCount / iterations) * 100 * 100) / 100,
        averageLatency: Math.round(avgLatency * 100) / 100,
        totalDuration: results[results.length - 1].totalTime + 'ms'
      },
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stress test error:', error);
    res.status(500).json({
      success: false,
      error: 'stress_test_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate health recommendations based on current status
 */
function generateHealthRecommendations(healthStatus: any): string[] {
  const recommendations = [];
  
  if (!healthStatus.isDatabaseHealthy) {
    if (healthStatus.consecutiveFailures > 5) {
      recommendations.push('High consecutive failure count detected. Consider checking network connectivity.');
    }
    
    if (healthStatus.connectionStats.successRate < 50) {
      recommendations.push('Low connection success rate. Database may be experiencing persistent issues.');
    }
    
    if (healthStatus.retryAttempts > 10) {
      recommendations.push('Multiple retry attempts failed. Consider manual reconnection or checking database status.');
    }
    
    if (healthStatus.mode === 'memory_optimized') {
      recommendations.push('System is in memory-optimized mode. Data changes will not persist until database reconnects.');
    }
    
    recommendations.push('Try using POST /api/health/reconnect to force a reconnection attempt.');
  } else {
    if (healthStatus.connectionStats.averageLatency > 1000) {
      recommendations.push('High connection latency detected. Consider checking network performance.');
    }
    
    if (healthStatus.queueLength > 0) {
      recommendations.push(`${healthStatus.queueLength} operations queued. They will sync automatically.`);
    }
    
    recommendations.push('Database connection is healthy. System operating normally.');
  }
  
  return recommendations;
}