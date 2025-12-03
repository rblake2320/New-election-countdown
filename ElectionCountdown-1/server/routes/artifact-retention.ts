/**
 * Artifact Retention API Routes
 * Provides endpoints for managing artifact storage, versioning, and rollback capabilities
 */

import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { insertArtifactStorageSchema } from '@shared/schema';
import { artifactRetentionService } from '../services/artifact-retention-service';

const router = Router();

// Validation schemas for API requests
const storeArtifactSchema = z.object({
  artifactName: z.string(),
  artifactType: z.enum(['deployment', 'configuration', 'dependency', 'backup', 'database_schema', 'environment_config']),
  version: z.string(),
  environment: z.string(),
  data: z.string(), // Base64 encoded data
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  retentionDays: z.number().optional(),
  compressionType: z.enum(['gzip', 'brotli', 'none']).optional(),
  encryptionType: z.enum(['aes-256', 'none']).optional()
});

const rollbackArtifactSchema = z.object({
  targetVersion: z.string(),
  environment: z.string(),
  affectedServices: z.array(z.string()).optional(),
  reason: z.string().optional()
});

const compareVersionsSchema = z.object({
  fromVersion: z.string(),
  toVersion: z.string(),
  environment: z.string().optional()
});

/**
 * GET /api/artifact-retention/status
 * Get artifact retention system status and storage statistics
 */
router.get('/status', async (req, res) => {
  try {
    console.log('📊 Getting artifact retention status');

    const [storageStats, integrityCheck] = await Promise.all([
      artifactRetentionService.getStorageStatistics(),
      artifactRetentionService.verifyArtifactIntegrity()
    ]);

    const systemHealth = integrityCheck.corruptedArtifacts === 0 && integrityCheck.missingFiles === 0
      ? 'healthy'
      : integrityCheck.corruptedArtifacts > 5 || integrityCheck.missingFiles > 3
        ? 'critical'
        : 'warning';

    res.json({
      status: 'success',
      artifactRetention: {
        systemHealth,
        storage: storageStats,
        integrity: {
          totalArtifacts: integrityCheck.totalArtifacts,
          verifiedArtifacts: integrityCheck.verifiedArtifacts,
          corruptedArtifacts: integrityCheck.corruptedArtifacts,
          missingFiles: integrityCheck.missingFiles,
          integrityPercentage: integrityCheck.totalArtifacts > 0 
            ? Math.round((integrityCheck.verifiedArtifacts / integrityCheck.totalArtifacts) * 100)
            : 100
        },
        capabilities: {
          versionTracking: true,
          rollbackSupport: true,
          integrityVerification: true,
          automatedCleanup: true,
          compressionSupport: true,
          retentionPolicies: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get artifact retention status:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve artifact retention status'
    });
  }
});

/**
 * POST /api/artifact-retention/artifacts
 * Store new artifact with versioning
 */
router.post('/artifacts', async (req, res) => {
  try {
    const artifactRequest = storeArtifactSchema.parse(req.body);
    console.log(`📦 Storing artifact: ${artifactRequest.artifactName} v${artifactRequest.version}`);

    // Decode base64 data
    const data = Buffer.from(artifactRequest.data, 'base64');

    const result = await artifactRetentionService.storeArtifact({
      ...artifactRequest,
      data
    });

    res.json({
      status: 'success',
      artifact: {
        artifactId: result.artifactId,
        contentHash: result.contentHash,
        storageLocation: result.storageLocation
      }
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
 * GET /api/artifact-retention/artifacts/:name
 * Get all versions of an artifact
 */
router.get('/artifacts/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { environment } = req.query;

    const versions = await artifactRetentionService.getArtifactVersions(
      name,
      environment as string
    );

    res.json({
      status: 'success',
      artifact: name,
      versions
    });

  } catch (error) {
    console.error('❌ Failed to get artifact versions:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve artifact versions'
    });
  }
});

/**
 * GET /api/artifact-retention/artifacts/:name/:version
 * Retrieve specific artifact version
 */
router.get('/artifacts/:name/:version', async (req, res) => {
  try {
    const { name, version } = req.params;
    const { environment } = req.query;

    const result = await artifactRetentionService.retrieveArtifact(
      name,
      version,
      environment as string
    );

    // Return artifact metadata and base64-encoded data
    res.json({
      status: 'success',
      artifact: {
        id: result.artifact.id,
        artifactName: result.artifact.artifactName,
        artifactType: result.artifact.artifactType,
        version: result.artifact.version,
        environment: result.artifact.environment,
        contentHash: result.artifact.contentHash,
        size: result.artifact.size,
        tags: result.artifact.tags,
        metadata: result.artifact.metadata,
        createdAt: result.artifact.createdAt,
        data: result.data.toString('base64')
      }
    });

  } catch (error) {
    console.error('❌ Failed to retrieve artifact:', error);
    res.status(500).json({
      error: 'artifact_retrieval_failed',
      message: error instanceof Error ? error.message : 'Failed to retrieve artifact'
    });
  }
});

/**
 * POST /api/artifact-retention/artifacts/:name/compare
 * Compare two versions of an artifact
 */
router.post('/artifacts/:name/compare', async (req, res) => {
  try {
    const { name } = req.params;
    const compareRequest = compareVersionsSchema.parse(req.body);

    const comparison = await artifactRetentionService.compareVersions(
      name,
      compareRequest.fromVersion,
      compareRequest.toVersion,
      compareRequest.environment
    );

    res.json({
      status: 'success',
      comparison
    });

  } catch (error) {
    console.error('❌ Failed to compare artifact versions:', error);
    res.status(500).json({
      error: 'comparison_failed',
      message: error instanceof Error ? error.message : 'Failed to compare artifact versions'
    });
  }
});

/**
 * POST /api/artifact-retention/artifacts/:name/rollback
 * Rollback artifact to previous version
 */
router.post('/artifacts/:name/rollback', async (req, res) => {
  try {
    const { name } = req.params;
    const rollbackRequest = rollbackArtifactSchema.parse(req.body);

    const result = await artifactRetentionService.rollbackArtifact(
      name,
      rollbackRequest.targetVersion,
      rollbackRequest.environment,
      rollbackRequest.affectedServices || []
    );

    res.json({
      status: 'success',
      rollback: result
    });

  } catch (error) {
    console.error('❌ Artifact rollback failed:', error);
    res.status(500).json({
      error: 'rollback_failed',
      message: error instanceof Error ? error.message : 'Artifact rollback failed'
    });
  }
});

/**
 * POST /api/artifact-retention/cleanup
 * Perform manual cleanup of expired artifacts
 */
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 Starting manual artifact cleanup');

    const result = await artifactRetentionService.performAutomatedCleanup();

    res.json({
      status: 'success',
      cleanup: result
    });

  } catch (error) {
    console.error('❌ Artifact cleanup failed:', error);
    res.status(500).json({
      error: 'cleanup_failed',
      message: error instanceof Error ? error.message : 'Artifact cleanup failed'
    });
  }
});

/**
 * POST /api/artifact-retention/verify
 * Verify integrity of all stored artifacts
 */
router.post('/verify', async (req, res) => {
  try {
    console.log('🔍 Starting artifact integrity verification');

    const result = await artifactRetentionService.verifyArtifactIntegrity();

    res.json({
      status: 'success',
      verification: result
    });

  } catch (error) {
    console.error('❌ Artifact verification failed:', error);
    res.status(500).json({
      error: 'verification_failed',
      message: error instanceof Error ? error.message : 'Artifact verification failed'
    });
  }
});

/**
 * GET /api/artifact-retention/storage-stats
 * Get detailed storage statistics
 */
router.get('/storage-stats', async (req, res) => {
  try {
    const stats = await artifactRetentionService.getStorageStatistics();

    // Calculate additional metrics
    const totalSizeMB = Math.round(stats.totalSize / 1024 / 1024);
    const avgArtifactSizeMB = stats.totalArtifacts > 0 
      ? Math.round((stats.totalSize / stats.totalArtifacts) / 1024 / 1024 * 100) / 100
      : 0;

    res.json({
      status: 'success',
      storageStatistics: {
        ...stats,
        totalSizeMB,
        avgArtifactSizeMB,
        storageByType: Object.entries(stats.storageByType).map(([type, data]) => ({
          type,
          count: data.count,
          sizeMB: Math.round(data.size / 1024 / 1024)
        })),
        storageByEnvironment: Object.entries(stats.storageByEnvironment).map(([env, data]) => ({
          environment: env,
          count: data.count,
          sizeMB: Math.round(data.size / 1024 / 1024)
        }))
      }
    });

  } catch (error) {
    console.error('❌ Failed to get storage statistics:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve storage statistics'
    });
  }
});

/**
 * GET /api/artifact-retention/artifacts
 * Search and filter artifacts
 */
router.get('/artifacts', async (req, res) => {
  try {
    const { 
      environment, 
      type, 
      tag, 
      active = 'true',
      limit = '50',
      offset = '0' 
    } = req.query;

    const { storage } = await import('../storage');
    const artifacts = await storage.getArtifacts?.({
      environment: environment as string,
      type: type as string,
      tag: tag as string,
      active: active === 'true',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    }) || [];

    // Remove sensitive data from response
    const safeArtifacts = artifacts.map(artifact => ({
      id: artifact.id,
      artifactName: artifact.artifactName,
      artifactType: artifact.artifactType,
      version: artifact.version,
      environment: artifact.environment,
      contentHash: artifact.contentHash,
      size: artifact.size,
      compressionType: artifact.compressionType,
      encryptionType: artifact.encryptionType,
      tags: artifact.tags,
      isActive: artifact.isActive,
      retentionDate: artifact.retentionDate,
      createdAt: artifact.createdAt,
      createdBy: artifact.createdBy
    }));

    res.json({
      status: 'success',
      artifacts: safeArtifacts,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: safeArtifacts.length
      }
    });

  } catch (error) {
    console.error('❌ Failed to search artifacts:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to search artifacts'
    });
  }
});

/**
 * PUT /api/artifact-retention/artifacts/:id
 * Update artifact metadata
 */
router.put('/artifacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags, metadata, retentionDays, isActive } = req.body;

    const { storage } = await import('../storage');
    
    const updateData: any = {};
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (retentionDays !== undefined) {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() + retentionDays);
      updateData.retentionDate = retentionDate;
    }

    if (storage.updateArtifact) {
      await storage.updateArtifact(parseInt(id), updateData);
    }

    res.json({
      status: 'success',
      message: 'Artifact updated successfully'
    });

  } catch (error) {
    console.error('❌ Failed to update artifact:', error);
    res.status(500).json({
      error: 'update_failed',
      message: error instanceof Error ? error.message : 'Failed to update artifact'
    });
  }
});

/**
 * DELETE /api/artifact-retention/artifacts/:id
 * Delete specific artifact
 */
router.delete('/artifacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force = 'false' } = req.query;

    const { storage } = await import('../storage');
    
    if (force === 'true') {
      // Force delete even if not expired
      if (storage.deleteArtifact) {
        await storage.deleteArtifact(parseInt(id));
      }
    } else {
      // Only delete if expired
      const artifact = await storage.getArtifactById?.(parseInt(id));
      if (!artifact) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Artifact not found'
        });
      }

      if (artifact.retentionDate && new Date() < new Date(artifact.retentionDate)) {
        return res.status(400).json({
          error: 'not_expired',
          message: 'Artifact has not reached retention date'
        });
      }

      if (storage.deleteArtifact) {
        await storage.deleteArtifact(parseInt(id));
      }
    }

    res.json({
      status: 'success',
      message: 'Artifact deleted successfully'
    });

  } catch (error) {
    console.error('❌ Failed to delete artifact:', error);
    res.status(500).json({
      error: 'deletion_failed',
      message: error instanceof Error ? error.message : 'Failed to delete artifact'
    });
  }
});

export default router;