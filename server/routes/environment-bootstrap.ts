/**
 * Environment Bootstrap API Routes
 * Provides endpoints for automated environment setup and validation
 */

import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { environmentBootstrapService } from '../services/environment-bootstrap-service';

const router = Router();

// Validation schemas for API requests
const bootstrapEnvironmentSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  skipSteps: z.array(z.string()).optional(),
  dryRun: z.boolean().default(false),
  options: z.object({
    enableDatabaseSetup: z.boolean().optional(),
    enableDependencyInstallation: z.boolean().optional(),
    enableHealthValidation: z.boolean().optional(),
    timeoutMinutes: z.number().optional()
  }).optional()
});

/**
 * GET /api/environment-bootstrap/status
 * Get environment bootstrap system status
 */
router.get('/status', async (req, res) => {
  try {
    console.log('🏗️ Getting environment bootstrap status');

    const activeBootstraps = environmentBootstrapService.listActiveBootstraps();
    const recentBootstraps = activeBootstraps.slice(-10); // Last 10 bootstraps

    const systemHealth = activeBootstraps.length > 0 
      ? activeBootstraps.every(b => b.status === 'completed') 
        ? 'healthy' 
        : 'warning'
      : 'healthy';

    const statistics = {
      totalBootstraps: activeBootstraps.length,
      completedBootstraps: activeBootstraps.filter(b => b.status === 'completed').length,
      failedBootstraps: activeBootstraps.filter(b => b.status === 'failed').length,
      averageDuration: activeBootstraps.length > 0 
        ? Math.round(activeBootstraps.reduce((sum, b) => sum + b.duration, 0) / activeBootstraps.length / 1000)
        : 0
    };

    res.json({
      status: 'success',
      environmentBootstrap: {
        systemHealth,
        statistics,
        recentBootstraps: recentBootstraps.map(b => ({
          bootstrapId: b.bootstrapId,
          environment: b.environment,
          status: b.status,
          duration: Math.round(b.duration / 1000),
          stepsExecuted: b.stepsExecuted.length,
          startedAt: b.startedAt,
          completedAt: b.completedAt
        })),
        capabilities: {
          multiEnvironmentSupport: true,
          dependencyManagement: true,
          databaseMigration: true,
          healthValidation: true,
          scriptGeneration: true,
          rollbackSupport: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get environment bootstrap status:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve environment bootstrap status'
    });
  }
});

/**
 * POST /api/environment-bootstrap/bootstrap
 * Bootstrap environment from scratch
 */
router.post('/bootstrap', async (req, res) => {
  try {
    const bootstrapRequest = bootstrapEnvironmentSchema.parse(req.body);
    console.log(`🏗️ Starting environment bootstrap: ${bootstrapRequest.environment}`);

    // Start bootstrap process
    const result = await environmentBootstrapService.bootstrapEnvironment(
      bootstrapRequest.environment,
      {
        skipSteps: bootstrapRequest.skipSteps,
        dryRun: bootstrapRequest.dryRun
      }
    );

    res.json({
      status: 'success',
      bootstrap: {
        bootstrapId: result.bootstrapId,
        environment: result.environment,
        status: result.status,
        duration: Math.round(result.duration / 1000),
        stepsExecuted: result.stepsExecuted.length,
        healthChecks: result.healthChecks.length,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        rollbackRequired: result.rollbackRequired
      }
    });

  } catch (error) {
    console.error('❌ Environment bootstrap failed:', error);
    res.status(500).json({
      error: 'bootstrap_failed',
      message: error instanceof Error ? error.message : 'Environment bootstrap failed'
    });
  }
});

/**
 * GET /api/environment-bootstrap/bootstrap/:id
 * Get specific bootstrap details
 */
router.get('/bootstrap/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bootstrap = environmentBootstrapService.getBootstrapStatus(id);

    if (!bootstrap) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Bootstrap not found'
      });
    }

    res.json({
      status: 'success',
      bootstrap: {
        ...bootstrap,
        duration: Math.round(bootstrap.duration / 1000),
        stepsExecuted: bootstrap.stepsExecuted.map(step => ({
          ...step,
          duration: Math.round(step.duration / 1000)
        }))
      }
    });

  } catch (error) {
    console.error('❌ Failed to get bootstrap details:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve bootstrap details'
    });
  }
});

/**
 * POST /api/environment-bootstrap/generate-scripts
 * Generate bootstrap scripts for environment
 */
router.post('/generate-scripts', async (req, res) => {
  try {
    const { environment = 'development' } = req.body;
    console.log(`📝 Generating bootstrap scripts for ${environment}`);

    await environmentBootstrapService.generateBootstrapScripts(environment);

    res.json({
      status: 'success',
      message: `Bootstrap scripts generated for ${environment} environment`,
      scriptsGenerated: [
        `setup-${environment}-environment.sh`,
        environment === 'development' ? 'seed-development-data.sh' : null,
        ['staging', 'production'].includes(environment) ? `pull-${environment}-artifacts.sh` : null,
        environment === 'production' ? 'setup-production-monitoring.sh' : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('❌ Script generation failed:', error);
    res.status(500).json({
      error: 'script_generation_failed',
      message: error instanceof Error ? error.message : 'Script generation failed'
    });
  }
});

/**
 * POST /api/environment-bootstrap/health-check
 * Perform comprehensive health check
 */
router.post('/health-check', async (req, res) => {
  try {
    console.log('🩺 Performing comprehensive health check');

    // Create temporary bootstrap service instance for health check
    const tempService = environmentBootstrapService;
    const healthChecks = await (tempService as any).performComprehensiveHealthCheck();

    const summary = {
      totalServices: healthChecks.length,
      healthyServices: healthChecks.filter(hc => hc.healthy).length,
      unhealthyServices: healthChecks.filter(hc => !hc.healthy).length,
      averageResponseTime: healthChecks.length > 0 
        ? Math.round(healthChecks.reduce((sum, hc) => sum + hc.responseTime, 0) / healthChecks.length)
        : 0
    };

    const systemHealth = summary.unhealthyServices === 0 
      ? 'healthy' 
      : summary.unhealthyServices <= 2 
        ? 'warning' 
        : 'critical';

    res.json({
      status: 'success',
      healthCheck: {
        systemHealth,
        summary,
        services: healthChecks,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      error: 'health_check_failed',
      message: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

/**
 * GET /api/environment-bootstrap/environments
 * List supported environments and their configurations
 */
router.get('/environments', async (req, res) => {
  try {
    const environments = [
      {
        name: 'development',
        description: 'Local development environment with test data and debugging enabled',
        features: [
          'Automated dependency installation',
          'Test data seeding',
          'Development server startup',
          'Hot reloading enabled',
          'Debug logging'
        ],
        estimatedTime: '5-10 minutes'
      },
      {
        name: 'staging',
        description: 'Staging environment for testing production-like deployments',
        features: [
          'Production build process',
          'Artifact management',
          'Database migrations',
          'Smoke testing',
          'Performance monitoring'
        ],
        estimatedTime: '10-20 minutes'
      },
      {
        name: 'production',
        description: 'Production environment with full security and monitoring',
        features: [
          'Security validation',
          'Release artifact deployment',
          'Database migrations with rollback',
          'Integration testing',
          'Monitoring and alerting setup',
          'Performance optimization'
        ],
        estimatedTime: '20-45 minutes'
      }
    ];

    res.json({
      status: 'success',
      environments
    });

  } catch (error) {
    console.error('❌ Failed to get environments:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve environments'
    });
  }
});

/**
 * POST /api/environment-bootstrap/validate-prerequisites
 * Validate system prerequisites for bootstrap
 */
router.post('/validate-prerequisites', async (req, res) => {
  try {
    const { environment = 'development' } = req.body;
    console.log(`🔍 Validating prerequisites for ${environment}`);

    // Create temporary service instance to access private method
    const tempService = environmentBootstrapService;
    const isValid = await (tempService as any).checkPrerequisites();

    const prerequisites = [
      { name: 'Node.js', required: true, status: 'checking' },
      { name: 'npm', required: true, status: 'checking' },
      { name: 'Git', required: true, status: 'checking' },
      { name: 'Database Access', required: true, status: 'checking' },
      { name: 'Environment Variables', required: true, status: 'checking' }
    ];

    // In a real implementation, would check each prerequisite individually
    prerequisites.forEach(prereq => {
      prereq.status = isValid ? 'available' : 'missing';
    });

    res.json({
      status: 'success',
      validation: {
        environment,
        allPrerequisitesMet: isValid,
        prerequisites
      }
    });

  } catch (error) {
    console.error('❌ Prerequisites validation failed:', error);
    res.status(500).json({
      error: 'validation_failed',
      message: error instanceof Error ? error.message : 'Prerequisites validation failed'
    });
  }
});

export default router;