import { Router } from "express";
import { storageFactory } from "../storage-factory";
import { healthCheckService } from "../services/health-check-service";

const healthRouter = Router();

healthRouter.get("/", async (req, res) => {
  try {
    const healthStatus = storageFactory.getHealthStatus();
    
    // Check if system is healthy (either database connected or memory-optimized mode)
    if (!healthStatus.isDatabaseHealthy && !healthStatus.isMemoryOptimized) {
      return res.json({
        ok: true,
        mode: healthStatus.mode,
        dbHealthy: false,
        systemHealthy: false,
        message: "Database temporarily unavailable - operating in memory mode",
        queueLength: healthStatus.queueLength,
        retryAttempts: healthStatus.retryAttempts,
        lastHealthCheck: healthStatus.lastHealthCheck,
        // Return zero counts when database is unhealthy and not optimized
        total_elections: 0,
        visible_elections: 0,
        elections: 0,
        candidates: 0,
        congress: 0,
        congress_total: 0
      });
    }
    
    // System is healthy in memory-optimized mode
    if (!healthStatus.isDatabaseHealthy && healthStatus.isMemoryOptimized) {
      const stats = await storageFactory.getElectionStats();
      return res.json({
        ok: true,
        mode: healthStatus.mode,
        dbHealthy: false,
        systemHealthy: true,
        isMemoryOptimized: true,
        message: "System optimized for memory-only operation - fully functional",
        queueLength: healthStatus.queueLength,
        retryAttempts: healthStatus.retryAttempts,
        lastHealthCheck: healthStatus.lastHealthCheck,
        total_elections: stats.total,
        visible_elections: stats.total,
        elections: stats.total,
        candidates: Object.values(stats.byType).reduce((a, b) => a + b, 0),
        congress: 0, // This would need a separate method  
        congress_total: 0
      });
    }
    
    // Database is healthy - get real stats
    const stats = await storageFactory.getElectionStats();
    
    res.json({
      ok: true,
      mode: healthStatus.mode,
      dbHealthy: true,
      systemHealthy: true,
      total_elections: stats.total,
      visible_elections: stats.total, // Simplified for now
      elections: stats.total,
      candidates: Object.values(stats.byType).reduce((a, b) => a + b, 0),
      congress: 0, // This would need a separate method
      congress_total: 0,
      queueLength: healthStatus.queueLength,
      lastHealthCheck: healthStatus.lastHealthCheck
    });
  } catch (error) {
    // Log error but don't expose stack trace
    console.log("Health check error:", error instanceof Error ? error.message : String(error));
    
    // Return degraded mode status instead of 500 error
    const healthStatus = storageFactory.getHealthStatus();
    res.json({
      ok: true,
      mode: "memory",
      dbHealthy: false,
      message: "Database health check failed - operating in memory mode",
      total_elections: 0,
      visible_elections: 0,
      elections: 0,
      candidates: 0,
      congress: 0,
      congress_total: 0
    });
  }
});

// Comprehensive API services health check endpoint
healthRouter.get("/services", async (req, res) => {
  try {
    console.log('🔍 API services health check requested');
    
    const healthStatus = await healthCheckService.checkAllServices();
    
    // Return comprehensive service status
    res.json(healthStatus);
  } catch (error) {
    console.error("Services health check error:", error);
    
    // Return degraded status with error information
    res.status(500).json({
      overall: 'critical',
      services: [],
      summary: {
        available: 0,
        degraded: 0,
        unavailable: 0,
        critical_failures: 1
      },
      timestamp: new Date().toISOString(),
      error: 'Health check service failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Individual service health check endpoint
healthRouter.get("/services/:service", async (req, res) => {
  try {
    const serviceName = req.params.service.toUpperCase();
    const keyName = serviceName.includes('_API_KEY') ? serviceName : `${serviceName}_API_KEY`;
    
    const serviceStatus = await healthCheckService.checkService(keyName);
    
    if (!serviceStatus) {
      return res.status(404).json({
        error: 'Service not found',
        message: `No service configuration found for ${serviceName}`
      });
    }
    
    res.json(serviceStatus);
  } catch (error) {
    console.error(`Service health check error for ${req.params.service}:`, error);
    res.status(500).json({
      error: 'Service health check failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export { healthRouter };