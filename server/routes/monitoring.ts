/**
 * Production Monitoring API Routes
 * Advanced system monitoring and alerting endpoints
 */
import { Router, Request, Response } from 'express';
import { monitoringService } from '../services/monitoring-service';

const router = Router();

/**
 * GET /api/monitoring/metrics
 * Get current system metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getMetrics();
    const healthScore = monitoringService.getHealthScore();
    
    res.json({
      status: 'success',
      data: {
        ...metrics,
        healthScore,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching monitoring metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch system metrics'
    });
  }
});

/**
 * GET /api/monitoring/health
 * Get system health score and status
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const healthScore = monitoringService.getHealthScore();
    const metrics = monitoringService.getMetrics();
    
    // Determine overall status based on health score
    let status: 'healthy' | 'degraded' | 'critical';
    if (healthScore >= 90) {
      status = 'healthy';
    } else if (healthScore >= 60) {
      status = 'degraded';
    } else {
      status = 'critical';
    }
    
    res.json({
      status: 'success',
      data: {
        healthScore,
        status,
        uptime: metrics.uptime,
        memoryUsage: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024), // MB
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount,
        errorRate: metrics.requestCount > 0 
          ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(2)
          : '0.00',
        avgResponseTime: Math.round(metrics.avgResponseTime),
        dbStatus: metrics.dbStatus,
        apiStatus: metrics.apiStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching health status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch health status'
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Get recent system alerts
 */
router.get('/alerts', (req: Request, res: Response) => {
  try {
    const alerts = monitoringService.getAlerts();
    
    res.json({
      status: 'success',
      data: {
        alerts,
        count: alerts.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch alerts'
    });
  }
});

/**
 * POST /api/monitoring/alerts/clear
 * Clear all alerts
 */
router.post('/alerts/clear', (req: Request, res: Response) => {
  try {
    monitoringService.clearAlerts();
    
    res.json({
      status: 'success',
      message: 'All alerts cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing alerts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear alerts'
    });
  }
});

/**
 * GET /api/monitoring/dashboard
 * Get comprehensive dashboard data
 */
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getMetrics();
    const healthScore = monitoringService.getHealthScore();
    const alerts = monitoringService.getAlerts();
    
    // Calculate additional dashboard metrics
    const errorRate = metrics.requestCount > 0 
      ? ((metrics.errorCount / metrics.requestCount) * 100)
      : 0;
    
    const memoryUsageMB = Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024);
    const memoryLimitMB = Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024);
    
    // API health summary
    const apiServices = Object.keys(metrics.apiStatus);
    const healthyApis = apiServices.filter(service => 
      metrics.apiStatus[service as keyof typeof metrics.apiStatus]
    ).length;
    
    res.json({
      status: 'success',
      data: {
        overview: {
          healthScore,
          status: healthScore >= 90 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'critical',
          uptime: metrics.uptime,
          lastError: metrics.lastError,
          lastErrorTime: metrics.lastErrorTime
        },
        performance: {
          requestCount: metrics.requestCount,
          errorCount: metrics.errorCount,
          errorRate: errorRate.toFixed(2),
          avgResponseTime: Math.round(metrics.avgResponseTime)
        },
        resources: {
          memoryUsed: memoryUsageMB,
          memoryLimit: memoryLimitMB,
          memoryPercentage: ((memoryUsageMB / memoryLimitMB) * 100).toFixed(1)
        },
        services: {
          database: metrics.dbStatus,
          apis: {
            total: apiServices.length,
            healthy: healthyApis,
            degraded: apiServices.length - healthyApis,
            details: metrics.apiStatus
          }
        },
        alerts: {
          count: alerts.length,
          recent: alerts.slice(-5) // Last 5 alerts
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard data'
    });
  }
});

export default router;