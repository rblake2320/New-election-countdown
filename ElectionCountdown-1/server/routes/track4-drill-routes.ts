import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { SyntheticFailoverDrillService } from '../services/synthetic-failover-drill-service';
import { 
  createInsertSchema,
  FailoverDrillConfiguration,
  DrillExecution,
  DrillStep
} from '@shared/schema';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Initialize service
const drillService = new SyntheticFailoverDrillService(storage);

// Validation schemas
const createDrillConfigSchema = z.object({
  drillName: z.string().min(1),
  drillType: z.enum(['failover', 'recovery', 'full_dr']),
  scenario: z.string().min(1),
  targetEnvironment: z.string().min(1),
  triggerType: z.enum(['manual', 'scheduled', 'automated']),
  scheduleExpression: z.string().optional(),
  expectedRtoMinutes: z.number().positive().optional(),
  expectedRpoMinutes: z.number().min(0).optional(),
  isEnabled: z.boolean().default(true),
  description: z.string().optional(),
  automationScript: z.string().optional(),
  preRequisites: z.array(z.string()).optional(),
  successCriteria: z.array(z.string()).optional(),
  rollbackProcedure: z.string().optional()
});

const executeDrillSchema = z.object({
  triggerType: z.enum(['manual', 'scheduled', 'automated']).optional(),
  triggerSource: z.string().optional()
});

// GET /api/v1/track4/drills/configurations - Get drill configurations
router.get('/configurations', isAuthenticated, async (req, res) => {
  try {
    const { enabled, drillType, scenario } = req.query;
    
    const filters: any = {};
    if (enabled !== undefined) filters.enabled = enabled === 'true';
    if (drillType) filters.drillType = drillType as string;
    if (scenario) filters.scenario = scenario as string;
    
    const configurations = await drillService.getDrillConfigurations(filters);
    
    res.json({
      success: true,
      data: configurations,
      count: configurations.length
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error getting configurations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/drills/configurations - Create drill configuration
router.post('/configurations', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createDrillConfigSchema.parse(req.body);
    
    const configuration = await drillService.createDrillConfiguration(validatedData);
    
    res.status(201).json({
      success: true,
      data: configuration,
      message: 'Drill configuration created successfully'
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error creating configuration:', error);
    
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

// GET /api/v1/track4/drills/configurations/:id - Get specific configuration
router.get('/configurations/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const configuration = await storage.getFailoverDrillConfiguration(id);
    
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
    console.error('[Track4DrillRoutes] Error getting configuration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/track4/drills/configurations/:id - Update configuration
router.put('/configurations/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = createDrillConfigSchema.partial().parse(req.body);
    
    const configuration = await storage.updateFailoverDrillConfiguration(id, updates);
    
    res.json({
      success: true,
      data: configuration,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error updating configuration:', error);
    
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

// DELETE /api/v1/track4/drills/configurations/:id - Delete configuration
router.delete('/configurations/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteFailoverDrillConfiguration(id);
    
    res.json({
      success: true,
      message: 'Configuration deleted successfully'
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error deleting configuration:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/drills/configurations/:id/execute - Execute drill
router.post('/configurations/:id/execute', isAuthenticated, async (req, res) => {
  try {
    const configurationId = parseInt(req.params.id);
    const { triggerType = 'manual', triggerSource = 'api' } = executeDrillSchema.parse(req.body);
    
    // Execute drill asynchronously
    const resultsPromise = drillService.executeDrill(configurationId, triggerType, triggerSource);
    
    // Return execution started response immediately
    res.status(202).json({
      success: true,
      message: 'Drill execution started',
      note: 'Use /executions/:executionId to track progress'
    });
    
    // Handle results asynchronously
    resultsPromise.catch(error => {
      console.error('[Track4DrillRoutes] Async drill execution error:', error);
    });
    
  } catch (error) {
    console.error('[Track4DrillRoutes] Error starting drill execution:', error);
    
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

// GET /api/v1/track4/drills/executions - Get drill executions
router.get('/executions', isAuthenticated, async (req, res) => {
  try {
    const { configurationId, status, triggerType, page = '1', limit = '20' } = req.query;
    
    const filters: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    
    if (configurationId) filters.configurationId = parseInt(configurationId as string);
    if (status) filters.status = status as string;
    if (triggerType) filters.triggerType = triggerType as string;
    
    const executions = await storage.getDrillExecutions(filters);
    
    res.json({
      success: true,
      data: executions,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        count: executions.length
      }
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error getting executions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/drills/executions/:executionId - Get specific execution
router.get('/executions/:executionId', isAuthenticated, async (req, res) => {
  try {
    const executionId = req.params.executionId;
    const execution = await drillService.getDrillExecutionStatus(executionId);
    
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }
    
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error getting execution:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/drills/executions/:executionId/steps - Get execution steps
router.get('/executions/:executionId/steps', isAuthenticated, async (req, res) => {
  try {
    const executionId = parseInt(req.params.executionId);
    const steps = await storage.getDrillStepsByExecution(executionId);
    
    res.json({
      success: true,
      data: steps,
      count: steps.length
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error getting execution steps:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/drills/recent - Get recent executions
router.get('/recent', isAuthenticated, async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    const executions = await drillService.getRecentDrillExecutions(parseInt(limit as string));
    
    res.json({
      success: true,
      data: executions,
      count: executions.length
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error getting recent executions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/drills/dashboard - Get dashboard data for drills
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const { days = '30' } = req.query;
    const executions = await storage.getDrillExecutionsForDashboard(parseInt(days as string));
    
    // Calculate summary statistics
    const totalDrills = executions.length;
    const successfulDrills = executions.filter(e => e.status === 'completed').length;
    const failedDrills = executions.filter(e => e.status === 'failed').length;
    const averageRto = executions
      .filter(e => e.actualRtoMinutes)
      .reduce((sum, e) => sum + (e.actualRtoMinutes || 0), 0) / (executions.filter(e => e.actualRtoMinutes).length || 1);
    
    const summary = {
      totalDrills,
      successfulDrills,
      failedDrills,
      successRate: totalDrills > 0 ? (successfulDrills / totalDrills) * 100 : 0,
      averageRto: Math.round(averageRto * 100) / 100
    };
    
    res.json({
      success: true,
      data: {
        summary,
        executions: executions.slice(0, 20), // Latest 20 executions
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('[Track4DrillRoutes] Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/drills/health - Health check for drill service
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      service: 'Synthetic Failover Drill Service',
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