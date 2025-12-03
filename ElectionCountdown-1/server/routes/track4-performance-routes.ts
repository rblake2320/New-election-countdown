import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { RtoRpoPerformanceDashboardService } from '../services/rto-rpo-dashboard-service';
import { 
  RtoRpoTarget,
  RtoRpoMeasurement,
  PerformanceBenchmark
} from '@shared/schema';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Initialize service
const dashboardService = new RtoRpoPerformanceDashboardService();

// Validation schemas
const createTargetSchema = z.object({
  serviceName: z.string().min(1),
  serviceType: z.string().min(1),
  businessCriticality: z.enum(['low', 'medium', 'high', 'critical']),
  rtoTargetMinutes: z.number().positive(),
  rpoTargetMinutes: z.number().min(0),
  description: z.string().optional(),
  ownerTeam: z.string().optional(),
  environment: z.string().optional(),
  serviceCategory: z.string().optional(),
  isActive: z.boolean().default(true)
});

const createMeasurementSchema = z.object({
  measurementId: z.string().min(1),
  targetId: z.number().positive(),
  measurementType: z.enum(['drill', 'incident', 'test', 'scheduled']),
  actualRtoMinutes: z.number().min(0),
  actualRpoMinutes: z.number().min(0),
  measuredAt: z.string().transform(str => new Date(str)),
  context: z.string().optional(),
  triggeredBy: z.string().optional(),
  environment: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.any().optional()
});

const createBenchmarkSchema = z.object({
  benchmarkName: z.string().min(1),
  industry: z.string().min(1),
  serviceCategory: z.string().min(1),
  sourceType: z.enum(['industry_standard', 'regulatory', 'best_practice', 'internal']),
  rtoMinutes: z.number().positive().optional(),
  rpoMinutes: z.number().min(0).optional(),
  description: z.string().optional(),
  sourceReference: z.string().optional(),
  applicabilityNotes: z.string().optional(),
  isActive: z.boolean().default(true)
});

// GET /api/v1/track4/performance/targets - Get RTO/RPO targets
router.get('/targets', isAuthenticated, async (req, res) => {
  try {
    const { active, serviceType, businessCriticality } = req.query;
    
    const filters: any = {};
    if (active !== undefined) filters.active = active === 'true';
    if (serviceType) filters.serviceType = serviceType as string;
    if (businessCriticality) filters.businessCriticality = businessCriticality as string;
    
    const targets = await storage.getRtoRpoTargets(filters);
    
    res.json({
      success: true,
      data: targets,
      count: targets.length
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting targets:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/performance/targets - Create RTO/RPO target
router.post('/targets', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createTargetSchema.parse(req.body);
    
    const target = await dashboardService.createRtoRpoTarget(validatedData);
    
    res.status(201).json({
      success: true,
      data: target,
      message: 'RTO/RPO target created successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error creating target:', error);
    
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

// GET /api/v1/track4/performance/targets/:id - Get specific target
router.get('/targets/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const target = await storage.getRtoRpoTarget(id);
    
    if (!target) {
      return res.status(404).json({
        success: false,
        error: 'Target not found'
      });
    }
    
    res.json({
      success: true,
      data: target
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting target:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/track4/performance/targets/:id - Update target
router.put('/targets/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = createTargetSchema.partial().parse(req.body);
    
    const target = await storage.updateRtoRpoTarget(id, updates);
    
    res.json({
      success: true,
      data: target,
      message: 'Target updated successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error updating target:', error);
    
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

// DELETE /api/v1/track4/performance/targets/:id - Delete target
router.delete('/targets/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteRtoRpoTarget(id);
    
    res.json({
      success: true,
      message: 'Target deleted successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error deleting target:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/performance/targets/:id/trends - Get target performance trends
router.get('/targets/:id/trends', isAuthenticated, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const { days = '30' } = req.query;
    
    const trends = await dashboardService.getTargetTrends(targetId, parseInt(days as string));
    
    res.json({
      success: true,
      data: trends,
      period: `${days} days`
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting target trends:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/performance/measurements - Get RTO/RPO measurements
router.get('/measurements', isAuthenticated, async (req, res) => {
  try {
    const { targetId, measurementType, dateFrom, dateTo, page = '1', limit = '50' } = req.query;
    
    const filters: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    
    if (targetId) filters.targetId = parseInt(targetId as string);
    if (measurementType) filters.measurementType = measurementType as string;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    
    const measurements = await storage.getRtoRpoMeasurements(filters);
    
    res.json({
      success: true,
      data: measurements,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        count: measurements.length
      }
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting measurements:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/performance/measurements - Record new measurement
router.post('/measurements', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createMeasurementSchema.parse(req.body);
    
    const measurement = await dashboardService.recordMeasurement(validatedData);
    
    res.status(201).json({
      success: true,
      data: measurement,
      message: 'Measurement recorded successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error recording measurement:', error);
    
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

// GET /api/v1/track4/performance/measurements/:measurementId - Get specific measurement
router.get('/measurements/:measurementId', isAuthenticated, async (req, res) => {
  try {
    const measurementId = req.params.measurementId;
    const measurement = await storage.getRtoRpoMeasurement(measurementId);
    
    if (!measurement) {
      return res.status(404).json({
        success: false,
        error: 'Measurement not found'
      });
    }
    
    res.json({
      success: true,
      data: measurement
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting measurement:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/track4/performance/measurements/:measurementId - Update measurement
router.put('/measurements/:measurementId', isAuthenticated, async (req, res) => {
  try {
    const measurementId = req.params.measurementId;
    const updates = createMeasurementSchema.partial().parse(req.body);
    
    const measurement = await storage.updateRtoRpoMeasurement(measurementId, updates);
    
    res.json({
      success: true,
      data: measurement,
      message: 'Measurement updated successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error updating measurement:', error);
    
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

// GET /api/v1/track4/performance/dashboard - Get comprehensive dashboard data
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const { serviceType, days = '30' } = req.query;
    
    const dashboardData = await dashboardService.getDashboardData(
      serviceType as string, 
      parseInt(days as string)
    );
    
    res.json({
      success: true,
      data: dashboardData,
      period: `${days} days`
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/performance/compliance - Get real-time compliance status
router.get('/compliance', isAuthenticated, async (req, res) => {
  try {
    const complianceStatus = await dashboardService.getRealTimeComplianceStatus();
    
    res.json({
      success: true,
      data: complianceStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting compliance status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/performance/reports/compliance - Generate compliance report
router.post('/reports/compliance', isAuthenticated, async (req, res) => {
  try {
    const { dateFrom, dateTo, serviceType } = req.body;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        error: 'dateFrom and dateTo are required'
      });
    }
    
    const report = await dashboardService.generateComplianceReport(
      new Date(dateFrom),
      new Date(dateTo),
      serviceType
    );
    
    res.json({
      success: true,
      data: report,
      message: 'Compliance report generated successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/performance/benchmarks - Get performance benchmarks
router.get('/benchmarks', isAuthenticated, async (req, res) => {
  try {
    const { active, industry, sourceType } = req.query;
    
    const filters: any = {};
    if (active !== undefined) filters.active = active === 'true';
    if (industry) filters.industry = industry as string;
    if (sourceType) filters.sourceType = sourceType as string;
    
    const benchmarks = await storage.getPerformanceBenchmarks(filters);
    
    res.json({
      success: true,
      data: benchmarks,
      count: benchmarks.length
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting benchmarks:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/performance/benchmarks - Create benchmark
router.post('/benchmarks', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createBenchmarkSchema.parse(req.body);
    
    const benchmark = await storage.createPerformanceBenchmark(validatedData);
    
    res.status(201).json({
      success: true,
      data: benchmark,
      message: 'Benchmark created successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error creating benchmark:', error);
    
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

// GET /api/v1/track4/performance/benchmarks/:id - Get specific benchmark
router.get('/benchmarks/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const benchmark = await storage.getPerformanceBenchmark(id);
    
    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: 'Benchmark not found'
      });
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error getting benchmark:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/track4/performance/benchmarks/:id - Update benchmark
router.put('/benchmarks/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = createBenchmarkSchema.partial().parse(req.body);
    
    const benchmark = await storage.updatePerformanceBenchmark(id, updates);
    
    res.json({
      success: true,
      data: benchmark,
      message: 'Benchmark updated successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error updating benchmark:', error);
    
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

// DELETE /api/v1/track4/performance/benchmarks/:id - Delete benchmark
router.delete('/benchmarks/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deletePerformanceBenchmark(id);
    
    res.json({
      success: true,
      message: 'Benchmark deleted successfully'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error deleting benchmark:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/performance/compare - Compare against benchmarks
router.post('/compare', isAuthenticated, async (req, res) => {
  try {
    const { serviceType, businessCriticality } = req.body;
    
    if (!serviceType || !businessCriticality) {
      return res.status(400).json({
        success: false,
        error: 'serviceType and businessCriticality are required'
      });
    }
    
    const comparison = await dashboardService.compareAgainstBenchmarks(serviceType, businessCriticality);
    
    res.json({
      success: true,
      data: comparison,
      message: 'Benchmark comparison completed'
    });
  } catch (error) {
    console.error('[Track4PerformanceRoutes] Error comparing benchmarks:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/performance/health - Health check for performance dashboard service
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      service: 'RTO/RPO Performance Dashboard Service',
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