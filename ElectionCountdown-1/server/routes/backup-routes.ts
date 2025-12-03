/**
 * Backup Management API Routes
 * Provides comprehensive API endpoints for disaster recovery system management
 */

import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { neonSnapshotService } from '../services/neon-snapshot-service';
import { restoreValidationService } from '../services/restore-validation-service';
import { schemaDriftService } from '../services/schema-drift-service';
import {
  insertBackupOperationSchema,
  insertBackupRetentionPolicySchema,
  insertBackupStorageLocationSchema,
  insertRestoreValidationSchema
} from '@shared/schema';

const router = Router();

// Validation schemas for API requests
const createSnapshotSchema = z.object({
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

const restoreSnapshotSchema = z.object({
  snapshotId: z.string(),
  targetBranchId: z.string(),
  finalizeRestore: z.boolean().default(true),
  restoreName: z.string().optional()
});

const validateBackupSchema = z.object({
  backupOperationId: z.number(),
  validationType: z.enum(['integrity_check', 'full_restore', 'sample_restore', 'schema_validation']).default('full_restore')
});

const retentionPolicySchema = insertBackupRetentionPolicySchema.extend({
  alertEmails: z.array(z.string().email()).optional()
});

const storageLocationSchema = insertBackupStorageLocationSchema;

/**
 * GET /api/backup/status
 * Get overall backup system status and health
 */
router.get('/status', async (req, res) => {
  try {
    console.log('📊 Getting backup system status');

    const { storage } = await import('../storage');

    // Get recent backup operations
    const recentBackups = await storage.getRecentBackupOperations(10);
    
    // Get active retention policies
    const retentionPolicies = await storage.getActiveRetentionPolicies();
    
    // Get storage locations
    const storageLocations = await storage.getBackupStorageLocations();
    
    // Get Neon service health
    const neonHealth = await neonSnapshotService.getServiceHealth();
    
    // Get recent validations
    const recentValidations = await storage.getRecentRestoreValidations(5);
    
    // Get latest schema version
    const latestSchema = await storage.getLatestSchemaVersion();

    // Calculate system health
    const failedBackups = recentBackups.filter(b => b.status === 'failed').length;
    const successfulBackups = recentBackups.filter(b => b.status === 'completed').length;
    const backupSuccessRate = recentBackups.length > 0 
      ? Math.round((successfulBackups / recentBackups.length) * 100) 
      : 100;

    const failedValidations = recentValidations.filter(v => !v.isSuccessful).length;
    const validationSuccessRate = recentValidations.length > 0
      ? Math.round(((recentValidations.length - failedValidations) / recentValidations.length) * 100)
      : 100;

    const isSystemHealthy = neonHealth.isHealthy && 
                           backupSuccessRate >= 90 && 
                           validationSuccessRate >= 80;

    const status = {
      isHealthy: isSystemHealthy,
      timestamp: new Date().toISOString(),
      backups: {
        total: recentBackups.length,
        successful: successfulBackups,
        failed: failedBackups,
        successRate: backupSuccessRate,
        lastBackup: recentBackups[0] || null
      },
      validations: {
        total: recentValidations.length,
        successful: recentValidations.length - failedValidations,
        failed: failedValidations,
        successRate: validationSuccessRate,
        lastValidation: recentValidations[0] || null
      },
      retention: {
        activePolicies: retentionPolicies.length,
        policies: retentionPolicies
      },
      storage: {
        locationCount: storageLocations.length,
        locations: storageLocations
      },
      schema: {
        currentVersion: latestSchema?.versionHash?.substring(0, 8) || 'unknown',
        lastCheck: latestSchema?.detectedAt || null,
        riskLevel: latestSchema?.riskLevel || 'unknown'
      },
      neon: neonHealth
    };

    res.json(status);

  } catch (error) {
    console.error('❌ Failed to get backup status:', error);
    res.status(500).json({
      error: 'Failed to get backup status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/backup/snapshot
 * Create a new database snapshot
 */
router.post('/snapshot', async (req, res) => {
  try {
    const data = createSnapshotSchema.parse(req.body);
    
    console.log('🔄 Creating database snapshot via API');

    const options = {
      name: data.name,
      tags: data.tags,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      metadata: data.metadata
    };

    const result = await neonSnapshotService.createSnapshot(options);

    res.status(201).json({
      success: true,
      snapshot: result.snapshot,
      backupOperation: result.backupOperation,
      message: 'Snapshot created successfully'
    });

  } catch (error) {
    console.error('❌ Failed to create snapshot:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to create snapshot',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/backup/snapshots
 * List available snapshots
 */
router.get('/snapshots', async (req, res) => {
  try {
    const snapshots = await neonSnapshotService.listSnapshots();
    
    res.json({
      snapshots,
      total: snapshots.length
    });

  } catch (error) {
    console.error('❌ Failed to list snapshots:', error);
    res.status(500).json({
      error: 'Failed to list snapshots',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/backup/restore
 * Restore from a snapshot
 */
router.post('/restore', async (req, res) => {
  try {
    const data = restoreSnapshotSchema.parse(req.body);
    
    console.log(`🔄 Restoring from snapshot ${data.snapshotId}`);

    const restoreResult = await neonSnapshotService.restoreSnapshot(data.snapshotId, {
      targetBranchId: data.targetBranchId,
      finalizeRestore: data.finalizeRestore,
      restoreName: data.restoreName
    });

    if (restoreResult.success) {
      res.json({
        success: true,
        result: restoreResult,
        message: 'Restore completed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: restoreResult.error,
        message: 'Restore failed'
      });
    }

  } catch (error) {
    console.error('❌ Failed to restore snapshot:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to restore snapshot',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/backup/validate
 * Validate a backup operation
 */
router.post('/validate', async (req, res) => {
  try {
    const data = validateBackupSchema.parse(req.body);
    
    console.log(`🔄 Starting backup validation for operation ${data.backupOperationId}`);

    const { storage } = await import('../storage');
    const backupOperation = await storage.getBackupOperation(data.backupOperationId);
    
    if (!backupOperation) {
      return res.status(404).json({
        error: 'Backup operation not found'
      });
    }

    // Start validation in background
    const validationPromise = restoreValidationService.validateBackup(
      backupOperation,
      data.validationType
    );

    // Return immediately with validation ID
    res.status(202).json({
      success: true,
      message: 'Validation started',
      backupOperationId: data.backupOperationId,
      validationType: data.validationType
    });

    // Handle validation completion in background
    validationPromise.then(result => {
      console.log(`✅ Validation completed for operation ${data.backupOperationId}:`, {
        success: result.success,
        dataIntegrity: `${result.dataIntegrityScore}%`,
        schemaIntegrity: `${result.schemaIntegrityScore}%`
      });
    }).catch(error => {
      console.error(`❌ Validation failed for operation ${data.backupOperationId}:`, error);
    });

  } catch (error) {
    console.error('❌ Failed to start validation:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to start validation',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/backup/operations
 * Get backup operations with filtering and pagination
 */
router.get('/operations', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const type = req.query.type as string;

    const { storage } = await import('../storage');
    const operations = await storage.getBackupOperations({
      page,
      limit,
      status,
      type
    });

    res.json(operations);

  } catch (error) {
    console.error('❌ Failed to get backup operations:', error);
    res.status(500).json({
      error: 'Failed to get backup operations',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/backup/validations
 * Get restore validations with filtering
 */
router.get('/validations', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const { storage } = await import('../storage');
    const validations = await storage.getRestoreValidations({
      page,
      limit,
      status
    });

    res.json(validations);

  } catch (error) {
    console.error('❌ Failed to get validations:', error);
    res.status(500).json({
      error: 'Failed to get validations',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/backup/schema/current
 * Get current schema version and drift status
 */
router.get('/schema/current', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    const latestSchema = await storage.getLatestSchemaVersion();
    
    if (!latestSchema) {
      return res.status(404).json({
        error: 'No schema version found'
      });
    }

    res.json({
      schemaVersion: latestSchema,
      summary: {
        version: latestSchema.versionHash.substring(0, 8),
        detectedAt: latestSchema.detectedAt,
        riskLevel: latestSchema.riskLevel,
        isBreakingChange: latestSchema.isBreakingChange,
        tableCount: latestSchema.tableCount,
        hasChanges: !!latestSchema.changesFromPrevious
      }
    });

  } catch (error) {
    console.error('❌ Failed to get schema version:', error);
    res.status(500).json({
      error: 'Failed to get schema version',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/backup/schema/capture
 * Capture current schema snapshot
 */
router.post('/schema/capture', async (req, res) => {
  try {
    console.log('📸 Capturing schema snapshot via API');

    const schemaVersion = await schemaDriftService.captureSchemaSnapshot('manual');

    res.status(201).json({
      success: true,
      schemaVersion,
      message: 'Schema snapshot captured successfully'
    });

  } catch (error) {
    console.error('❌ Failed to capture schema:', error);
    res.status(500).json({
      error: 'Failed to capture schema',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/backup/policies
 * Create a new retention policy
 */
router.post('/policies', async (req, res) => {
  try {
    const data = retentionPolicySchema.parse(req.body);
    
    const { storage } = await import('../storage');
    const policy = await storage.createBackupRetentionPolicy(data);

    res.status(201).json({
      success: true,
      policy,
      message: 'Retention policy created successfully'
    });

  } catch (error) {
    console.error('❌ Failed to create retention policy:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to create retention policy',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/backup/policies
 * Get retention policies
 */
router.get('/policies', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    const policies = await storage.getBackupRetentionPolicies();

    res.json({
      policies,
      total: policies.length
    });

  } catch (error) {
    console.error('❌ Failed to get retention policies:', error);
    res.status(500).json({
      error: 'Failed to get retention policies',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/backup/storage
 * Add a new storage location
 */
router.post('/storage', async (req, res) => {
  try {
    const data = storageLocationSchema.parse(req.body);
    
    const { storage } = await import('../storage');
    const storageLocation = await storage.createBackupStorageLocation(data);

    res.status(201).json({
      success: true,
      storageLocation,
      message: 'Storage location created successfully'
    });

  } catch (error) {
    console.error('❌ Failed to create storage location:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to create storage location',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/backup/storage
 * Get storage locations
 */
router.get('/storage', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    const locations = await storage.getBackupStorageLocations();

    res.json({
      locations,
      total: locations.length
    });

  } catch (error) {
    console.error('❌ Failed to get storage locations:', error);
    res.status(500).json({
      error: 'Failed to get storage locations',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/backup/cleanup
 * Run cleanup operations for expired backups
 */
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 Starting backup cleanup via API');

    const cleanupResult = await neonSnapshotService.cleanupExpiredSnapshots();

    res.json({
      success: true,
      result: cleanupResult,
      message: `Cleanup completed: ${cleanupResult.deleted.length} deleted, ${cleanupResult.failed.length} failed`
    });

  } catch (error) {
    console.error('❌ Failed to run cleanup:', error);
    res.status(500).json({
      error: 'Failed to run cleanup',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;