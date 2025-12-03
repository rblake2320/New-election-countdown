/**
 * Failover Status Monitoring Dashboard API Routes
 * Provides endpoints for monitoring failover status, health metrics, and orchestration
 */

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Request validation schemas
const manualFailoverSchema = z.object({
  targetMode: z.enum(['database', 'memory', 'memory_optimized', 'hybrid', 'read_only', 'replica']),
  reason: z.string().min(1).max(500)
});

const failoverRuleUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  cooldownMs: z.number().min(0).optional(),
  priority: z.number().min(1).optional()
});

/**
 * GET /api/failover/status
 * Get comprehensive failover system status
 */
router.get('/status', async (req, res) => {
  try {
    // Get storage factory status
    const { storage } = await import('../storage');
    const healthStatus = storage.getHealthStatus();
    const replicaStatus = storage.getReplicaStatus();
    
    // Get orchestration service status if available
    let orchestrationStatus = null;
    try {
      const { failoverOrchestrationService } = await import('../services/failover-orchestration-service');
      orchestrationStatus = failoverOrchestrationService.getStatus();
    } catch (error) {
      console.log('Orchestration service not available:', error);
    }
    
    // Get enhanced health metrics if available
    let enhancedHealthMetrics = null;
    try {
      const { healthCheckService } = await import('../services/health-check-service');
      const comprehensiveHealth = await healthCheckService.performComprehensiveHealthCheck();
      enhancedHealthMetrics = comprehensiveHealth.database || null;
    } catch (error) {
      console.log('Enhanced health metrics not available:', error);
    }

    const response = {
      timestamp: new Date().toISOString(),
      storage: {
        currentMode: healthStatus.mode,
        isDatabaseHealthy: healthStatus.isDatabaseHealthy,
        isReplicaHealthy: healthStatus.isReplicaHealthy,
        isReadOnlyMode: healthStatus.isReadOnlyMode,
        isMemoryOptimized: healthStatus.isMemoryOptimized,
        systemHealthy: healthStatus.systemHealthy,
        activeReplica: healthStatus.activeReplica,
        queueLength: healthStatus.queueLength,
        retryAttempts: healthStatus.retryAttempts,
        consecutiveFailures: healthStatus.consecutiveFailures,
        lastHealthCheck: healthStatus.lastHealthCheck,
        connectionStats: healthStatus.connectionStats
      },
      replicas: {
        configured: Array.from(replicaStatus.configured.keys()),
        health: Object.fromEntries(
          Array.from(replicaStatus.health.entries()).map(([id, health]) => [
            id,
            {
              healthy: health.healthy,
              latency: health.latency,
              lastChecked: health.timestamp
            }
          ])
        ),
        active: replicaStatus.active
      },
      orchestration: orchestrationStatus,
      enhancedMetrics: enhancedHealthMetrics,
      failoverHistory: healthStatus.failoverEvents || []
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting failover status:', error);
    res.status(500).json({
      error: 'Failed to get failover status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/failover/health
 * Get detailed health metrics for all database connections
 */
router.get('/health', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    const healthStatus = storage.getHealthStatus();
    
    // Calculate health score
    let healthScore = 0;
    const factors = [];
    
    if (healthStatus.isDatabaseHealthy) {
      healthScore += 40;
      factors.push('Primary database healthy');
    }
    
    if (healthStatus.isReplicaHealthy) {
      healthScore += 30;
      factors.push('Replica database available');
    }
    
    if (healthStatus.systemHealthy) {
      healthScore += 20;
      factors.push('System operational');
    }
    
    if (healthStatus.connectionStats.successRate > 90) {
      healthScore += 10;
      factors.push('High connection success rate');
    }

    const recommendations = [];
    if (!healthStatus.isDatabaseHealthy) {
      recommendations.push('Investigate primary database connectivity');
    }
    if (!healthStatus.isReplicaHealthy) {
      recommendations.push('Check replica database configuration');
    }
    if (healthStatus.consecutiveFailures > 5) {
      recommendations.push('High failure rate detected - review system health');
    }

    res.json({
      timestamp: new Date().toISOString(),
      healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'critical',
      factors,
      recommendations,
      metrics: {
        primaryDatabase: {
          healthy: healthStatus.isDatabaseHealthy,
          mode: healthStatus.mode,
          readOnly: healthStatus.isReadOnlyMode,
          latency: healthStatus.connectionStats.averageLatency,
          successRate: healthStatus.connectionStats.successRate,
          consecutiveFailures: healthStatus.consecutiveFailures
        },
        replicas: {
          available: healthStatus.isReplicaHealthy,
          active: healthStatus.activeReplica,
          count: healthStatus.replicaHealth?.size || 0
        },
        system: {
          healthy: healthStatus.systemHealthy,
          memoryOptimized: healthStatus.isMemoryOptimized,
          queueLength: healthStatus.queueLength,
          lastHealthCheck: healthStatus.lastHealthCheck
        }
      },
      diagnostics: healthStatus.diagnostics
    });
  } catch (error) {
    console.error('Error getting health metrics:', error);
    res.status(500).json({
      error: 'Failed to get health metrics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/failover/trigger
 * Trigger manual failover to specified mode
 */
router.post('/trigger', async (req, res) => {
  try {
    const { targetMode, reason } = manualFailoverSchema.parse(req.body);
    
    const { storage } = await import('../storage');
    
    console.log(`🔄 Manual failover triggered: ${targetMode}`, { reason });
    
    const result = await storage.triggerManualFailover(targetMode, reason);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Failover to ${targetMode} initiated successfully`,
        targetMode,
        reason,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failover failed',
        message: result.error,
        targetMode,
        reason
      });
    }
  } catch (error) {
    console.error('Error triggering manual failover:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        error: 'Failed to trigger failover',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

/**
 * POST /api/failover/reconnect
 * Force database reconnection attempt
 */
router.post('/reconnect', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    
    console.log('🔄 Force reconnection triggered');
    
    const result = await storage.forceReconnect();
    
    res.json({
      success: result.success,
      attempts: result.attempts,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error forcing reconnection:', error);
    res.status(500).json({
      error: 'Failed to force reconnection',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/failover/history
 * Get failover execution history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    
    const { storage } = await import('../storage');
    const failoverHistory = storage.getFailoverHistory(limit);
    
    // Get orchestration history if available
    let orchestrationHistory = [];
    try {
      const { failoverOrchestrationService } = await import('../services/failover-orchestration-service');
      orchestrationHistory = failoverOrchestrationService.getExecutionHistory(limit);
    } catch (error) {
      console.log('Orchestration history not available:', error);
    }

    res.json({
      timestamp: new Date().toISOString(),
      failoverEvents: failoverHistory,
      orchestrationExecutions: orchestrationHistory,
      summary: {
        totalEvents: failoverHistory.length,
        successfulEvents: failoverHistory.filter(e => e.success).length,
        failedEvents: failoverHistory.filter(e => !e.success).length,
        recentEvents: failoverHistory.filter(e => 
          (new Date().getTime() - e.timestamp.getTime()) < 3600000 // Last hour
        ).length
      }
    });
  } catch (error) {
    console.error('Error getting failover history:', error);
    res.status(500).json({
      error: 'Failed to get failover history',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/failover/rules
 * Get current failover rules and configuration
 */
router.get('/rules', async (req, res) => {
  try {
    let rules = [];
    let serviceEnabled = false;
    
    try {
      const { failoverOrchestrationService } = await import('../services/failover-orchestration-service');
      rules = failoverOrchestrationService.getFailoverRules();
      const status = failoverOrchestrationService.getStatus();
      serviceEnabled = status.enabled;
    } catch (error) {
      console.log('Orchestration service not available:', error);
    }

    res.json({
      timestamp: new Date().toISOString(),
      serviceEnabled,
      rules: rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        trigger: rule.trigger,
        targetMode: rule.targetMode,
        priority: rule.priority,
        enabled: rule.enabled,
        cooldownMs: rule.cooldownMs,
        lastTriggered: rule.lastTriggered,
        condition: rule.condition
      }))
    });
  } catch (error) {
    console.error('Error getting failover rules:', error);
    res.status(500).json({
      error: 'Failed to get failover rules',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * PUT /api/failover/rules/:ruleId
 * Update failover rule configuration
 */
router.put('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = failoverRuleUpdateSchema.parse(req.body);
    
    const { failoverOrchestrationService } = await import('../services/failover-orchestration-service');
    failoverOrchestrationService.updateFailoverRule(ruleId, updates);
    
    res.json({
      success: true,
      message: `Failover rule ${ruleId} updated`,
      ruleId,
      updates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating failover rule:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        error: 'Failed to update failover rule',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

/**
 * GET /api/failover/metrics
 * Get real-time failover and performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    const healthStatus = storage.getHealthStatus();
    const replicaStatus = storage.getReplicaStatus();
    
    // Calculate uptime and availability metrics
    const now = new Date();
    const healthyPercent = Math.max(0, Math.min(100, 
      100 - (healthStatus.consecutiveFailures * 10)
    ));
    
    // Get recent performance data
    const recentDiagnostics = healthStatus.diagnostics.slice(-10);
    const avgLatency = recentDiagnostics.length > 0 
      ? recentDiagnostics.reduce((sum, d) => sum + (d.latency || 0), 0) / recentDiagnostics.length
      : 0;
    
    const metrics = {
      timestamp: now.toISOString(),
      availability: {
        primaryDatabase: healthStatus.isDatabaseHealthy ? 100 : 0,
        replicas: healthStatus.isReplicaHealthy ? 100 : 0,
        system: healthyPercent
      },
      performance: {
        averageLatency: Math.round(avgLatency),
        connectionSuccessRate: healthStatus.connectionStats.successRate,
        errorRate: healthStatus.connectionStats.recentFailures,
        queueDepth: healthStatus.queueLength
      },
      capacity: {
        replicasConfigured: replicaStatus.configured.size,
        replicasHealthy: Array.from(replicaStatus.health.values()).filter(h => h.healthy).length,
        activeConnections: healthStatus.isDatabaseHealthy ? 1 : 0,
        memoryOptimized: healthStatus.isMemoryOptimized
      },
      resilience: {
        failoverCapable: healthStatus.isReplicaHealthy || healthStatus.isMemoryOptimized,
        currentMode: healthStatus.mode,
        readOnlyMode: healthStatus.isReadOnlyMode,
        lastFailover: healthStatus.failoverEvents?.length > 0 
          ? healthStatus.failoverEvents[healthStatus.failoverEvents.length - 1].timestamp
          : null
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error getting failover metrics:', error);
    res.status(500).json({
      error: 'Failed to get failover metrics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/failover/diagnostics
 * Get detailed diagnostic information for troubleshooting
 */
router.get('/diagnostics', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    const healthStatus = storage.getHealthStatus();
    const replicaStatus = storage.getReplicaStatus();
    
    // Get orchestration diagnostics if available
    let orchestrationDiagnostics = null;
    try {
      const { failoverOrchestrationService } = await import('../services/failover-orchestration-service');
      const activeExecutions = failoverOrchestrationService.getActiveExecutions();
      const status = failoverOrchestrationService.getStatus();
      
      orchestrationDiagnostics = {
        serviceEnabled: status.enabled,
        activeExecutions: activeExecutions.length,
        rulesEnabled: status.enabledRules,
        recentExecutions: status.recentExecutions
      };
    } catch (error) {
      console.log('Orchestration diagnostics not available:', error);
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      storage: {
        mode: healthStatus.mode,
        currentStorageType: healthStatus.currentStorageType,
        isDatabaseHealthy: healthStatus.isDatabaseHealthy,
        isReplicaHealthy: healthStatus.isReplicaHealthy,
        isMemoryOptimized: healthStatus.isMemoryOptimized,
        retryAttempts: healthStatus.retryAttempts,
        consecutiveFailures: healthStatus.consecutiveFailures,
        healthCheckInterval: healthStatus.healthCheckInterval,
        lastHealthCheck: healthStatus.lastHealthCheck,
        queueLength: healthStatus.queueLength
      },
      connections: {
        primary: {
          healthy: healthStatus.isDatabaseHealthy,
          diagnostics: healthStatus.diagnostics,
          connectionStats: healthStatus.connectionStats
        },
        replicas: Object.fromEntries(
          Array.from(replicaStatus.health.entries()).map(([id, health]) => [
            id,
            {
              configured: replicaStatus.configured.has(id),
              healthy: health.healthy,
              latency: health.latency,
              lastChecked: health.timestamp
            }
          ])
        )
      },
      orchestration: orchestrationDiagnostics,
      environment: {
        databaseUrl: !!process.env.DATABASE_URL,
        replicaUrls: Object.keys(process.env).filter(key => key.startsWith('DATABASE_REPLICA_')).length,
        nodeEnv: process.env.NODE_ENV
      }
    };

    res.json(diagnostics);
  } catch (error) {
    console.error('Error getting failover diagnostics:', error);
    res.status(500).json({
      error: 'Failed to get failover diagnostics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;