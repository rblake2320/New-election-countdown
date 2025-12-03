/**
 * Secrets Rotation API Routes
 * Provides endpoints for managing automated API key rotation and secrets vault
 */

import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import {
  insertSecretsVaultSchema,
  insertSecretsRotationHistorySchema
} from '@shared/schema';
import { secretsRotationService } from '../services/secrets-rotation-service';

const router = Router();

// Validation schemas for API requests
const rotateSecretSchema = z.object({
  secretName: z.string(),
  rotationType: z.enum(['manual', 'emergency']).default('manual'),
  reason: z.string().optional()
});

const createSecretSchema = insertSecretsVaultSchema.extend({
  secretValue: z.string().min(1)
});

const emergencyRotationSchema = z.object({
  secretName: z.string(),
  reason: z.string().min(10, 'Emergency reason must be at least 10 characters')
});

/**
 * GET /api/secrets-rotation/status
 * Get secrets rotation system status and health
 */
router.get('/status', async (req, res) => {
  try {
    console.log('🔐 Getting secrets rotation status');

    const status = await secretsRotationService.getRotationStatus();
    
    // Get validation results for all secrets
    const validationResults = await secretsRotationService.testAllSecrets();
    const healthySecrets = validationResults.filter(r => r.success).length;
    const totalSecrets = validationResults.length;

    const systemHealth = status.recentFailures === 0 && status.secretsNeedingRotation === 0
      ? 'healthy'
      : status.recentFailures > 3 || status.secretsNeedingRotation > 5
        ? 'critical'
        : 'warning';

    res.json({
      status: 'success',
      secretsRotation: {
        systemHealth,
        ...status,
        connectivity: {
          healthySecrets,
          totalSecrets,
          healthPercentage: totalSecrets > 0 ? Math.round((healthySecrets / totalSecrets) * 100) : 0
        },
        capabilities: {
          automatedRotation: true,
          emergencyRotation: true,
          connectivityValidation: true,
          scheduledRotation: true,
          secureVault: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get secrets rotation status:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve secrets rotation status'
    });
  }
});

/**
 * POST /api/secrets-rotation/initialize
 * Initialize secrets vault with current environment variables
 */
router.post('/initialize', async (req, res) => {
  try {
    console.log('🔐 Initializing secrets vault');

    await secretsRotationService.initializeSecretsVault();

    res.json({
      status: 'success',
      message: 'Secrets vault initialized successfully'
    });

  } catch (error) {
    console.error('❌ Failed to initialize secrets vault:', error);
    res.status(500).json({
      error: 'initialization_failed',
      message: error instanceof Error ? error.message : 'Failed to initialize secrets vault'
    });
  }
});

/**
 * POST /api/secrets-rotation/rotate
 * Manually rotate a specific secret
 */
router.post('/rotate', async (req, res) => {
  try {
    const rotationRequest = rotateSecretSchema.parse(req.body);
    console.log('🔄 Manual secret rotation:', rotationRequest.secretName);

    const { storage } = await import('../storage');
    const secret = await storage.getSecretByName?.(rotationRequest.secretName);
    
    if (!secret) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Secret not found'
      });
    }

    const result = await secretsRotationService.rotateSecret(
      secret.id,
      rotationRequest.rotationType
    );

    res.json({
      status: 'success',
      rotation: {
        rotationId: result.rotationId,
        status: result.status,
        duration: result.duration,
        validationResults: result.validationResults
      }
    });

  } catch (error) {
    console.error('❌ Secret rotation failed:', error);
    res.status(500).json({
      error: 'rotation_failed',
      message: error instanceof Error ? error.message : 'Secret rotation failed'
    });
  }
});

/**
 * POST /api/secrets-rotation/emergency
 * Emergency rotation for compromised secrets
 */
router.post('/emergency', async (req, res) => {
  try {
    const emergencyRequest = emergencyRotationSchema.parse(req.body);
    console.log('🚨 Emergency secret rotation:', emergencyRequest.secretName);

    const result = await secretsRotationService.emergencyRotateSecret(
      emergencyRequest.secretName,
      emergencyRequest.reason
    );

    res.json({
      status: 'success',
      emergencyRotation: {
        rotationId: result.rotationId,
        status: result.status,
        duration: result.duration,
        validationResults: result.validationResults
      }
    });

  } catch (error) {
    console.error('❌ Emergency rotation failed:', error);
    res.status(500).json({
      error: 'emergency_rotation_failed',
      message: error instanceof Error ? error.message : 'Emergency rotation failed'
    });
  }
});

/**
 * GET /api/secrets-rotation/secrets
 * Get all secrets in vault (without sensitive values)
 */
router.get('/secrets', async (req, res) => {
  try {
    const { storage } = await import('../storage');
    const secrets = await storage.getAllSecrets?.() || [];

    // Remove sensitive data from response
    const safeSecrets = secrets.map(secret => ({
      id: secret.id,
      secretName: secret.secretName,
      secretType: secret.secretType,
      serviceName: secret.serviceName,
      nextRotation: secret.nextRotation,
      lastRotated: secret.lastRotated,
      rotationFrequencyDays: secret.rotationFrequencyDays,
      isActive: secret.isActive,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt
    }));

    res.json({
      status: 'success',
      secrets: safeSecrets
    });

  } catch (error) {
    console.error('❌ Failed to get secrets:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve secrets'
    });
  }
});

/**
 * GET /api/secrets-rotation/history
 * Get rotation history
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = '50', secretName } = req.query;
    const { storage } = await import('../storage');
    
    const history = await storage.getRotationHistory?.({
      limit: parseInt(limit as string),
      secretName: secretName as string
    }) || [];

    res.json({
      status: 'success',
      history
    });

  } catch (error) {
    console.error('❌ Failed to get rotation history:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to retrieve rotation history'
    });
  }
});

/**
 * POST /api/secrets-rotation/test
 * Test connectivity for all secrets
 */
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 Testing all secrets connectivity');

    const validationResults = await secretsRotationService.testAllSecrets();
    
    const summary = {
      totalTested: validationResults.length,
      successful: validationResults.filter(r => r.success).length,
      failed: validationResults.filter(r => !r.success).length,
      averageResponseTime: validationResults.length > 0 
        ? Math.round(validationResults.reduce((sum, r) => sum + r.responseTime, 0) / validationResults.length)
        : 0
    };

    res.json({
      status: 'success',
      validation: {
        summary,
        results: validationResults
      }
    });

  } catch (error) {
    console.error('❌ Secret validation failed:', error);
    res.status(500).json({
      error: 'validation_failed',
      message: error instanceof Error ? error.message : 'Secret validation failed'
    });
  }
});

/**
 * POST /api/secrets-rotation/cleanup
 * Cleanup old rotation history
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { retentionDays = 365 } = req.body;
    console.log(`🧹 Cleaning up rotation history older than ${retentionDays} days`);

    await secretsRotationService.cleanupRotationHistory(retentionDays);

    res.json({
      status: 'success',
      message: 'Rotation history cleanup completed'
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    res.status(500).json({
      error: 'cleanup_failed',
      message: error instanceof Error ? error.message : 'Cleanup failed'
    });
  }
});

/**
 * PUT /api/secrets-rotation/secrets/:id/schedule
 * Update rotation schedule for a secret
 */
router.put('/secrets/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { rotationFrequencyDays } = req.body;

    if (!rotationFrequencyDays || rotationFrequencyDays < 1) {
      return res.status(400).json({
        error: 'invalid_frequency',
        message: 'Rotation frequency must be at least 1 day'
      });
    }

    const { storage } = await import('../storage');
    
    // Calculate new next rotation date
    const nextRotation = new Date();
    nextRotation.setDate(nextRotation.getDate() + rotationFrequencyDays);

    if (storage.updateSecret) {
      await storage.updateSecret(parseInt(id), {
        rotationFrequencyDays,
        nextRotation
      });
    }

    res.json({
      status: 'success',
      message: 'Rotation schedule updated',
      nextRotation
    });

  } catch (error) {
    console.error('❌ Failed to update rotation schedule:', error);
    res.status(500).json({
      error: 'schedule_update_failed',
      message: error instanceof Error ? error.message : 'Failed to update rotation schedule'
    });
  }
});

export default router;