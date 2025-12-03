/**
 * Platform Continuity API Routes
 * Provides Infrastructure-as-Code, deployment management, and artifact tracking endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import {
  insertDeploymentHistorySchema,
  insertArtifactStorageSchema,
  insertEnvironmentConfigurationsSchema,
  insertPlatformContinuityEventsSchema
} from '@shared/schema';
import { infrastructureAsCodeService } from '../services/infrastructure-as-code-service';

const router = Router();

// Validation schemas for API requests
const deployStackSchema = z.object({
  manifestName: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  version: z.string().optional(),
  triggerType: z.enum(['manual', 'scheduled', 'automated', 'disaster_recovery']).default('manual'),
  deployedBy: z.string().optional()
});

const createManifestSchema = z.object({
  name: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  services: z.array(z.any()).optional(), // Will be validated by the service
  configuration: z.record(z.any()).optional()
});

const storeArtifactSchema = insertArtifactStorageSchema.extend({
  artifactData: z.string().optional() // Base64 encoded artifact data
});

const createEnvironmentConfigSchema = insertEnvironmentConfigurationsSchema;

/**
 * GET /api/platform-continuity/status
 * Get overall platform continuity system status
 */
router.get('/status', async (req, res) => {
  try {
    console.log('📊 Getting platform continuity status');

    const { storage } = await import('../storage');

    // Get recent deployments
    const recentDeployments = await storage.getRecentDeployments(10);
    
    // Get active artifacts
    const activeArtifacts = await storage.getActiveArtifacts();
    
    // Get environment configurations
    const envConfigs = await storage.getEnvironmentConfigurations();
    
    // Get recent events
    const recentEvents = await storage.getRecentPlatformContinuityEvents(20);

    // Calculate system health
    const healthMetrics = {
      deploymentsToday: recentDeployments.filter(d => 
        new Date(d.startedAt).toDateString() === new Date().toDateString()
      ).length,
      failedDeployments: recentDeployments.filter(d => d.status === 'failed').length,
      activeArtifactsCount: activeArtifacts.length,
      environmentsConfigured: envConfigs.length,
      lastSuccessfulDeployment: recentDeployments.find(d => d.status === 'completed')?.completedAt,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical' && !e.acknowledged).length
    };

    const systemHealth = healthMetrics.failedDeployments === 0 && healthMetrics.criticalEvents === 0 
      ? 'healthy' 
      : healthMetrics.criticalEvents > 0 
        ? 'critical' 
        : 'warning';

    res.json({
      status: 'success',
      platformContinuity: {
        systemHealth,
        healthMetrics,
        recentDeployments: recentDeployments.slice(0, 5),
        recentEvents: recentEvents.slice(0, 10),
        capabilities: {
          infrastructureAsCode: true,
          secretsRotation: true,
          artifactRetention: true,
          environmentBootstrapping: true,
          disasterRecoveryIntegration: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get platform continuity status:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve platform continuity status'
    });
  }
});

/**
 * POST /api/platform-continuity/deploy
 * Deploy application stack using Infrastructure-as-Code
 */
router.post('/deploy', async (req, res) => {
  try {
    const deployRequest = deployStackSchema.parse(req.body);
    console.log('🚀 Starting deployment:', deployRequest);

    // Record deployment start in database
    const { storage } = await import('../storage');
    const deploymentId = nanoid();

    const deployment = {
      deploymentId,
      manifestName: deployRequest.manifestName,
      environment: deployRequest.environment,
      version: deployRequest.version || '1.0.0',
      status: 'pending' as const,
      deploymentType: 'fresh' as const,
      triggerType: deployRequest.triggerType,
      deployedBy: deployRequest.deployedBy || 'api-user',
      servicesDeployed: [],
      artifactsUsed: [],
      configurationSnapshot: {},
      logs: [],
      metadata: { source: 'api', requestId: nanoid() }
    };

    await storage.createDeploymentHistory(deployment);

    // Log platform continuity event
    const event = {
      eventId: nanoid(),
      eventType: 'deployment' as const,
      category: 'infrastructure' as const,
      severity: 'info' as const,
      status: 'initiated' as const,
      title: `Deployment Started: ${deployRequest.manifestName}`,
      description: `Infrastructure-as-Code deployment initiated for ${deployRequest.environment} environment`,
      affectedServices: [],
      environment: deployRequest.environment,
      initiatedBy: deployRequest.deployedBy || 'api-user',
      metadata: { deploymentId, manifestName: deployRequest.manifestName }
    };

    await storage.createPlatformContinuityEvent(event);

    // Start deployment
    const deploymentResult = await infrastructureAsCodeService.deployStack(
      deployRequest.manifestName,
      deployRequest.environment
    );

    // Update deployment status
    await storage.updateDeploymentHistory(deploymentId, {
      status: deploymentResult.status,
      completedAt: deploymentResult.completedAt,
      duration: deploymentResult.completedAt 
        ? Math.floor((deploymentResult.completedAt.getTime() - deploymentResult.startedAt.getTime()) / 1000)
        : undefined,
      servicesDeployed: deploymentResult.services,
      logs: deploymentResult.logs,
      error: deploymentResult.error
    });

    res.json({
      status: 'success',
      deployment: deploymentResult
    });

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    res.status(500).json({
      error: 'deployment_failed',
      message: error instanceof Error ? error.message : 'Deployment failed'
    });
  }
});

/**
 * GET /api/platform-continuity/deployments
 * Get deployment history
 */
router.get('/deployments', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    const deployments = await storage.getRecentDeployments(50);

    res.json({
      status: 'success',
      deployments
    });

  } catch (error) {
    console.error('❌ Failed to get deployments:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve deployment history'
    });
  }
});

/**
 * GET /api/platform-continuity/deployments/:id
 * Get specific deployment details
 */
router.get('/deployments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { storage } = await import('../storage');
    
    const deployment = await storage.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Deployment not found'
      });
    }

    res.json({
      status: 'success',
      deployment
    });

  } catch (error) {
    console.error('❌ Failed to get deployment:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve deployment'
    });
  }
});

/**
 * POST /api/platform-continuity/rollback/:id
 * Rollback deployment
 */
router.post('/rollback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('↩️ Rolling back deployment:', id);

    await infrastructureAsCodeService.rollbackDeployment(id);

    // Log rollback event
    const { storage } = await import('../storage');
    const event = {
      eventId: nanoid(),
      eventType: 'rollback' as const,
      category: 'infrastructure' as const,
      severity: 'warning' as const,
      status: 'completed' as const,
      title: `Deployment Rollback: ${id}`,
      description: `Deployment ${id} has been rolled back`,
      affectedServices: [],
      initiatedBy: 'api-user',
      metadata: { originalDeploymentId: id }
    };

    await storage.createPlatformContinuityEvent(event);

    res.json({
      status: 'success',
      message: 'Deployment rolled back successfully'
    });

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    res.status(500).json({
      error: 'rollback_failed',
      message: error instanceof Error ? error.message : 'Rollback failed'
    });
  }
});

/**
 * POST /api/platform-continuity/manifests
 * Create deployment manifest
 */
router.post('/manifests', async (req, res) => {
  try {
    const manifestRequest = createManifestSchema.parse(req.body);
    console.log('📋 Creating deployment manifest:', manifestRequest.name);

    // Create default election platform manifest or custom manifest
    let manifest;
    if (manifestRequest.name === 'election-platform') {
      manifest = await infrastructureAsCodeService.createElectionPlatformManifest();
    } else {
      // Create custom manifest (would need additional implementation)
      throw new Error('Custom manifests not yet supported');
    }

    res.json({
      status: 'success',
      manifest
    });

  } catch (error) {
    console.error('❌ Failed to create manifest:', error);
    res.status(500).json({
      error: 'manifest_creation_failed',
      message: error instanceof Error ? error.message : 'Failed to create manifest'
    });
  }
});

/**
 * POST /api/platform-continuity/artifacts
 * Store artifact for versioning and retention
 */
router.post('/artifacts', async (req, res) => {
  try {
    const artifactRequest = storeArtifactSchema.parse(req.body);
    console.log('📦 Storing artifact:', artifactRequest.artifactName);

    const { storage } = await import('../storage');
    
    // Calculate retention date
    const retentionDays = parseInt(process.env.ARTIFACT_RETENTION_DAYS || '90');
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + retentionDays);

    const artifact = {
      ...artifactRequest,
      retentionDate,
      createdBy: 'api-user'
    };

    const artifactId = await storage.createArtifact?.(artifact);

    // Log artifact creation event
    const event = {
      eventId: nanoid(),
      eventType: 'artifact_cleanup' as const,
      category: 'artifacts' as const,
      severity: 'info' as const,
      status: 'completed' as const,
      title: `Artifact Stored: ${artifactRequest.artifactName}`,
      description: `Artifact ${artifactRequest.artifactName} v${artifactRequest.version} stored for ${artifactRequest.environment}`,
      affectedServices: [],
      environment: artifactRequest.environment,
      initiatedBy: 'api-user',
      metadata: { artifactId, artifactType: artifactRequest.artifactType }
    };

    await storage.createPlatformContinuityEvent(event);

    res.json({
      status: 'success',
      artifactId
    });

  } catch (error) {
    console.error('❌ Failed to store artifact:', error);
    res.status(500).json({
      error: 'artifact_storage_failed',
      message: error instanceof Error ? error.message : 'Failed to store artifact'
    });
  }
});

/**
 * GET /api/platform-continuity/artifacts
 * Get stored artifacts
 */
router.get('/artifacts', async (req, res) => {
  try {
    const { environment, type, limit = '50' } = req.query;
    const { storage } = await import('../storage');
    
    const artifacts = await storage.getArtifacts?.({
      environment: environment as string,
      type: type as string,
      limit: parseInt(limit as string)
    }) || [];

    res.json({
      status: 'success',
      artifacts
    });

  } catch (error) {
    console.error('❌ Failed to get artifacts:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve artifacts'
    });
  }
});

/**
 * POST /api/platform-continuity/environment-configs
 * Create environment configuration
 */
router.post('/environment-configs', async (req, res) => {
  try {
    const configRequest = createEnvironmentConfigSchema.parse(req.body);
    console.log('⚙️ Creating environment configuration:', configRequest.configurationName);

    const { storage } = await import('../storage');
    
    const config = {
      ...configRequest,
      templateVersion: '1.0.0',
      createdBy: 'api-user'
    };

    const configId = await storage.createEnvironmentConfiguration?.(config);

    res.json({
      status: 'success',
      configId
    });

  } catch (error) {
    console.error('❌ Failed to create environment configuration:', error);
    res.status(500).json({
      error: 'config_creation_failed',
      message: error instanceof Error ? error.message : 'Failed to create environment configuration'
    });
  }
});

/**
 * POST /api/platform-continuity/bootstrap
 * Bootstrap environment from scratch
 */
router.post('/bootstrap', async (req, res) => {
  try {
    const { environment = 'development', manifestName = 'election-platform' } = req.body;
    console.log('🏗️ Bootstrapping environment:', environment);

    // Generate deployment scripts
    await infrastructureAsCodeService.generateDeploymentScripts();

    // Create platform manifest
    const manifest = await infrastructureAsCodeService.createElectionPlatformManifest();

    // Log bootstrap event
    const { storage } = await import('../storage');
    const event = {
      eventId: nanoid(),
      eventType: 'environment_bootstrap' as const,
      category: 'infrastructure' as const,
      severity: 'info' as const,
      status: 'completed' as const,
      title: `Environment Bootstrap: ${environment}`,
      description: `Environment ${environment} has been bootstrapped with deployment scripts and manifests`,
      affectedServices: [],
      environment,
      initiatedBy: 'api-user',
      metadata: { manifestName }
    };

    await storage.createPlatformContinuityEvent(event);

    res.json({
      status: 'success',
      message: 'Environment bootstrapped successfully',
      manifest,
      scriptsGenerated: true
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
 * GET /api/platform-continuity/events
 * Get platform continuity events
 */
router.get('/events', async (req, res) => {
  try {
    const { category, severity, limit = '50' } = req.query;
    const { storage } = await import('../storage');
    
    const events = await storage.getPlatformContinuityEvents({
      category: category as string,
      severity: severity as string,
      limit: parseInt(limit as string)
    });

    res.json({
      status: 'success',
      events
    });

  } catch (error) {
    console.error('❌ Failed to get events:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve platform continuity events'
    });
  }
});

export default router;