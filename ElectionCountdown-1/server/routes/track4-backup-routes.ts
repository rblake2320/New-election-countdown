import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { BackupAlertService } from '../services/backup-alert-service';
import { 
  BackupMonitoringConfiguration,
  BackupAlert,
  BackupHealthMetric
} from '@shared/schema';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Initialize service
const backupAlertService = new BackupAlertService(storage);

// Validation schemas
const createMonitoringConfigSchema = z.object({
  configurationName: z.string().min(1),
  monitoringType: z.enum(['backup_completion', 'backup_failure', 'backup_duration', 'backup_size']),
  targetSources: z.array(z.string()).min(1),
  alertRules: z.array(z.object({
    metricType: z.string(),
    condition: z.enum(['greater_than', 'less_than', 'equals', 'not_equals', 'contains']),
    threshold: z.union([z.number(), z.string()]),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string()
  })).min(1),
  notificationChannels: z.array(z.object({
    type: z.enum(['email', 'sms', 'webhook', 'slack']),
    target: z.string(),
    priority: z.number().min(1),
    escalationLevel: z.number().min(1)
  })).min(1),
  escalationRules: z.array(z.any()).optional(),
  isEnabled: z.boolean().default(true),
  description: z.string().optional(),
  checkInterval: z.number().positive().optional(),
  retentionPeriod: z.number().positive().optional()
});

const simulateEventSchema = z.object({
  eventType: z.enum(['backup_started', 'backup_completed', 'backup_failed', 'backup_warning']),
  backupJobId: z.string().min(1)
});

// GET /api/v1/track4/backup/monitoring/configurations - Get monitoring configurations
router.get('/monitoring/configurations', isAuthenticated, async (req, res) => {
  try {
    const { enabled, monitoringType } = req.query;
    
    const filters: any = {};
    if (enabled !== undefined) filters.enabled = enabled === 'true';
    if (monitoringType) filters.monitoringType = monitoringType as string;
    
    const configurations = await storage.getBackupMonitoringConfigurations(filters);
    
    res.json({
      success: true,
      data: configurations,
      count: configurations.length
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting monitoring configurations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/backup/monitoring/configurations - Create monitoring configuration
router.post('/monitoring/configurations', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createMonitoringConfigSchema.parse(req.body);
    
    const configuration = await backupAlertService.createMonitoringConfiguration(validatedData);
    
    res.status(201).json({
      success: true,
      data: configuration,
      message: 'Monitoring configuration created successfully'
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error creating monitoring configuration:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/monitoring/configurations/:id - Get specific configuration
router.get('/monitoring/configurations/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const configuration = await storage.getBackupMonitoringConfiguration(id);
    
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    res.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting configuration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/track4/backup/monitoring/configurations/:id - Update configuration
router.put('/monitoring/configurations/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = createMonitoringConfigSchema.partial().parse(req.body);
    
    const configuration = await storage.updateBackupMonitoringConfiguration(id, updates);
    
    res.json({
      success: true,
      data: configuration,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error updating configuration:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/v1/track4/backup/monitoring/configurations/:id - Delete configuration
router.delete('/monitoring/configurations/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteBackupMonitoringConfiguration(id);
    
    res.json({
      success: true,
      message: 'Configuration deleted successfully'
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error deleting configuration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/alerts - Get backup alerts
router.get('/alerts', isAuthenticated, async (req, res) => {
  try {
    const { status, severity, alertType, page = '1', limit = '20' } = req.query;
    
    const filters: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    
    if (status) filters.status = status as string;
    if (severity) filters.severity = severity as string;
    if (alertType) filters.alertType = alertType as string;
    
    const alerts = await storage.getBackupAlerts(filters);
    
    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        count: alerts.length
      }
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/alerts/active - Get active alerts
router.get('/alerts/active', isAuthenticated, async (req, res) => {
  try {
    const alerts = await backupAlertService.getActiveAlerts();
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting active alerts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/alerts/:alertId - Get specific alert
router.get('/alerts/:alertId', isAuthenticated, async (req, res) => {
  try {
    const alertId = req.params.alertId;
    const alert = await storage.getBackupAlert(alertId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting alert:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/backup/alerts/:alertId/acknowledge - Acknowledge alert
router.post('/alerts/:alertId/acknowledge', isAuthenticated, async (req, res) => {
  try {
    const alertId = req.params.alertId;
    const { acknowledgedBy } = req.body;
    
    if (!acknowledgedBy) {
      return res.status(400).json({
        success: false,
        error: 'acknowledgedBy is required'
      });
    }
    
    const alert = await backupAlertService.acknowledgeAlert(alertId, acknowledgedBy);
    
    res.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/backup/alerts/:alertId/resolve - Resolve alert
router.post('/alerts/:alertId/resolve', isAuthenticated, async (req, res) => {
  try {
    const alertId = req.params.alertId;
    const { resolvedBy } = req.body;
    
    if (!resolvedBy) {
      return res.status(400).json({
        success: false,
        error: 'resolvedBy is required'
      });
    }
    
    const alert = await backupAlertService.resolveAlert(alertId, resolvedBy);
    
    res.json({
      success: true,
      data: alert,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/health/metrics - Get health metrics
router.get('/health/metrics', isAuthenticated, async (req, res) => {
  try {
    const { metricType, dateFrom, dateTo } = req.query;
    
    const filters: any = {};
    if (metricType) filters.metricType = metricType as string;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    
    const metrics = await backupAlertService.getHealthMetrics(filters);
    
    res.json({
      success: true,
      data: metrics,
      count: metrics.length
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting health metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/health/trends - Get health trends
router.get('/health/trends', isAuthenticated, async (req, res) => {
  try {
    const { days = '7' } = req.query;
    const trends = await backupAlertService.getHealthTrends(parseInt(days as string));
    
    res.json({
      success: true,
      data: trends,
      period: `${days} days`
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting health trends:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/health/summary - Get health summary
router.get('/health/summary', isAuthenticated, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const defaultDateFrom = new Date();
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 7);
    
    const fromDate = dateFrom ? new Date(dateFrom as string) : defaultDateFrom;
    const toDate = dateTo ? new Date(dateTo as string) : new Date();
    
    const summary = await backupAlertService.generateHealthSummary(fromDate, toDate);
    
    res.json({
      success: true,
      data: summary,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting health summary:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/backup/simulate - Simulate backup event (for testing)
router.post('/simulate', isAuthenticated, async (req, res) => {
  try {
    const { eventType, backupJobId } = simulateEventSchema.parse(req.body);
    
    await backupAlertService.simulateBackupEvent(eventType, backupJobId);
    
    res.json({
      success: true,
      message: `Simulated ${eventType} event for backup job ${backupJobId}`
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error simulating backup event:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/dashboard - Get backup monitoring dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const activeAlerts = await backupAlertService.getActiveAlerts();
    const healthTrends = await backupAlertService.getHealthTrends(7);
    const configurations = await storage.getActiveMonitoringConfigurations();
    
    // Calculate summary statistics
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;
    const totalConfigurations = configurations.length;
    const enabledConfigurations = configurations.filter(c => c.isEnabled).length;
    
    const summary = {
      totalAlerts: activeAlerts.length,
      criticalAlerts,
      highAlerts,
      totalConfigurations,
      enabledConfigurations,
      configurationHealth: totalConfigurations > 0 ? (enabledConfigurations / totalConfigurations) * 100 : 100
    };
    
    res.json({
      success: true,
      data: {
        summary,
        activeAlerts: activeAlerts.slice(0, 10), // Latest 10 alerts
        healthTrends: healthTrends.slice(0, 50), // Latest 50 metrics
        configurations: configurations.slice(0, 20) // Latest 20 configurations
      }
    });
  } catch (error) {
    console.error('[Track4BackupRoutes] Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/backup/health - Health check for backup alert service
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      service: 'Backup Success Alert System',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;