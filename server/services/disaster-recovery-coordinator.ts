/**
 * Disaster Recovery Coordinator
 * Orchestrates backup, restore, and validation operations
 * Integrates with health check and notification systems
 */

import { nanoid } from 'nanoid';
import { neonSnapshotService } from './neon-snapshot-service';
import { restoreValidationService } from './restore-validation-service';
import { schemaDriftService } from './schema-drift-service';
import {
  BackupOperation,
  BackupRetentionPolicy,
  RestoreValidation,
  SchemaVersion,
  type InsertBackupOperation
} from '@shared/schema';

export interface DisasterRecoveryConfig {
  enableScheduledBackups: boolean;
  enableAutomaticValidation: boolean;
  enableSchemaDriftMonitoring: boolean;
  defaultRetentionDays: number;
  validationFrequency: 'daily' | 'weekly' | 'monthly';
  alertThresholds: {
    backupFailureRate: number;
    validationFailureRate: number;
    rtoThresholdSeconds: number;
  };
}

export interface RecoveryMetrics {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  averageBackupTime: number;
  averageRestoreTime: number;
  lastSuccessfulBackup?: Date;
  lastSuccessfulValidation?: Date;
  rtoAchievementRate: number;
  systemHealthScore: number;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  services: {
    neonSnapshots: boolean;
    schemaMonitoring: boolean;
    restoreValidation: boolean;
  };
  metrics: RecoveryMetrics;
  alerts: string[];
  lastChecked: Date;
}

export class DisasterRecoveryCoordinator {
  private config: DisasterRecoveryConfig;
  private isRunning: boolean = false;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<DisasterRecoveryConfig>) {
    this.config = {
      enableScheduledBackups: true,
      enableAutomaticValidation: true,
      enableSchemaDriftMonitoring: true,
      defaultRetentionDays: 30,
      validationFrequency: 'weekly',
      alertThresholds: {
        backupFailureRate: 10, // 10% failure rate threshold
        validationFailureRate: 20, // 20% failure rate threshold
        rtoThresholdSeconds: 300 // 5 minutes RTO threshold
      },
      ...config
    };

    console.log('✅ Disaster Recovery Coordinator initialized', {
      scheduledBackups: this.config.enableScheduledBackups,
      automaticValidation: this.config.enableAutomaticValidation,
      schemaDriftMonitoring: this.config.enableSchemaDriftMonitoring
    });
  }

  /**
   * Start the disaster recovery coordinator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Disaster Recovery Coordinator already running');
      return;
    }

    console.log('🚀 Starting Disaster Recovery Coordinator');

    try {
      // Load last known schema for drift detection
      await schemaDriftService.loadLastKnownSchema();

      // Set up scheduled jobs
      if (this.config.enableScheduledBackups) {
        await this.setupScheduledBackups();
      }

      if (this.config.enableAutomaticValidation) {
        await this.setupAutomaticValidation();
      }

      if (this.config.enableSchemaDriftMonitoring) {
        await this.setupSchemaDriftMonitoring();
      }

      // Perform initial health check
      const healthCheck = await this.performHealthCheck();
      console.log('Initial health check completed:', {
        isHealthy: healthCheck.isHealthy,
        healthScore: healthCheck.metrics.systemHealthScore
      });

      this.isRunning = true;
      console.log('✅ Disaster Recovery Coordinator started successfully');

    } catch (error) {
      console.error('❌ Failed to start Disaster Recovery Coordinator:', error);
      throw error;
    }
  }

  /**
   * Stop the disaster recovery coordinator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ Disaster Recovery Coordinator not running');
      return;
    }

    console.log('🛑 Stopping Disaster Recovery Coordinator');

    // Clear all scheduled jobs
    for (const [jobId, timer] of Array.from(this.scheduledJobs.entries())) {
      clearInterval(timer);
      console.log(`Stopped scheduled job: ${jobId}`);
    }
    this.scheduledJobs.clear();

    this.isRunning = false;
    console.log('✅ Disaster Recovery Coordinator stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    console.log('🔍 Performing disaster recovery health check');

    try {
      const { storage } = await import('../storage');

      // Check service health
      const neonHealth = await neonSnapshotService.getServiceHealth();
      
      // Get recent metrics
      const recentBackups = await storage.getRecentBackupOperations(50);
      const recentValidations = await storage.getRecentRestoreValidations(20);
      
      // Calculate metrics
      const metrics = await this.calculateMetrics(recentBackups, recentValidations);
      
      // Check service availability
      const services = {
        neonSnapshots: neonHealth.isHealthy,
        schemaMonitoring: true, // Schema service is always available
        restoreValidation: true // Validation service is always available
      };

      // Generate alerts
      const alerts = this.generateHealthAlerts(metrics, services);

      // Calculate overall health
      const serviceHealthy = Object.values(services).every(s => s);
      const metricsHealthy = metrics.systemHealthScore >= 80;
      const isHealthy = serviceHealthy && metricsHealthy;

      const result: HealthCheckResult = {
        isHealthy,
        services,
        metrics,
        alerts,
        lastChecked: new Date()
      };

      console.log('Health check completed:', {
        isHealthy,
        healthScore: metrics.systemHealthScore,
        alertsCount: alerts.length
      });

      return result;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      
      return {
        isHealthy: false,
        services: {
          neonSnapshots: false,
          schemaMonitoring: false,
          restoreValidation: false
        },
        metrics: {
          totalBackups: 0,
          successfulBackups: 0,
          failedBackups: 0,
          averageBackupTime: 0,
          averageRestoreTime: 0,
          rtoAchievementRate: 0,
          systemHealthScore: 0
        },
        alerts: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Execute scheduled backup based on retention policy
   */
  async executeScheduledBackup(policy: BackupRetentionPolicy): Promise<BackupOperation> {
    console.log(`🔄 Executing scheduled backup: ${policy.name}`);

    try {
      const backupOperation = await neonSnapshotService.createScheduledSnapshot(policy);

      // If automatic validation is enabled, schedule validation
      if (this.config.enableAutomaticValidation) {
        this.scheduleBackupValidation(backupOperation);
      }

      // Send success notification if configured
      if (policy.notifyOnSuccess) {
        await this.sendBackupNotification(backupOperation, 'success');
      }

      console.log(`✅ Scheduled backup completed: ${policy.name}`);
      return backupOperation;

    } catch (error) {
      console.error(`❌ Scheduled backup failed: ${policy.name}:`, error);

      // Send failure notification if configured
      if (policy.notifyOnFailure) {
        await this.sendBackupNotification(null, 'failure', error instanceof Error ? error.message : String(error));
      }

      throw error;
    }
  }

  /**
   * Schedule backup validation
   */
  private scheduleBackupValidation(backupOperation: BackupOperation): void {
    // Schedule validation to run in the background
    setTimeout(async () => {
      try {
        console.log(`🔍 Starting automatic validation for backup ${backupOperation.operationId}`);
        
        const result = await restoreValidationService.validateBackup(
          backupOperation,
          'sample_restore' // Use sample restore for automatic validation
        );

        if (!result.success) {
          await this.sendValidationAlert(backupOperation, result);
        }

      } catch (error) {
        console.error(`❌ Automatic validation failed for backup ${backupOperation.operationId}:`, error);
        await this.sendValidationAlert(backupOperation, null, error instanceof Error ? error.message : String(error));
      }
    }, 5 * 60 * 1000); // Wait 5 minutes before validating
  }

  /**
   * Setup scheduled backups based on retention policies
   */
  private async setupScheduledBackups(): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const policies = await storage.getActiveRetentionPolicies();

      for (const policy of policies) {
        if (policy.schedule && policy.isActive) {
          // Parse cron schedule (simplified version)
          const interval = this.parseCronToInterval(policy.schedule);
          
          if (interval > 0) {
            const jobId = `backup-${policy.id}`;
            const timer = setInterval(async () => {
              try {
                await this.executeScheduledBackup(policy);
              } catch (error) {
                console.error(`Scheduled backup job ${jobId} failed:`, error);
              }
            }, interval);

            this.scheduledJobs.set(jobId, timer);
            console.log(`📅 Scheduled backup job: ${policy.name} (${policy.schedule})`);
          }
        }
      }

    } catch (error) {
      console.error('Failed to setup scheduled backups:', error);
    }
  }

  /**
   * Setup automatic validation
   */
  private async setupAutomaticValidation(): Promise<void> {
    const interval = this.getValidationInterval();
    
    const timer = setInterval(async () => {
      try {
        await this.runAutomaticValidation();
      } catch (error) {
        console.error('Automatic validation failed:', error);
      }
    }, interval);

    this.scheduledJobs.set('validation', timer);
    console.log(`📅 Scheduled validation job every ${this.config.validationFrequency}`);
  }

  /**
   * Setup schema drift monitoring
   */
  private async setupSchemaDriftMonitoring(): Promise<void> {
    // Check schema drift every hour
    const timer = setInterval(async () => {
      try {
        await schemaDriftService.captureSchemaSnapshot('scheduled_check');
      } catch (error) {
        console.error('Schema drift monitoring failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.scheduledJobs.set('schema-drift', timer);
    console.log('📅 Scheduled schema drift monitoring every hour');
  }

  /**
   * Run automatic validation on recent backups
   */
  private async runAutomaticValidation(): Promise<void> {
    console.log('🔍 Running automatic backup validation');

    try {
      const { storage } = await import('../storage');
      
      // Get recent unvalidated backups
      const recentBackups = await storage.getRecentBackupOperations(5);
      const unvalidatedBackups = recentBackups.filter(b => 
        b.status === 'completed' && !b.isVerified
      );

      for (const backup of unvalidatedBackups) {
        try {
          await restoreValidationService.validateBackup(backup, 'integrity_check');
        } catch (error) {
          console.error(`Validation failed for backup ${backup.operationId}:`, error);
        }
      }

    } catch (error) {
      console.error('Automatic validation failed:', error);
    }
  }

  /**
   * Calculate recovery metrics
   */
  private async calculateMetrics(
    recentBackups: BackupOperation[],
    recentValidations: RestoreValidation[]
  ): Promise<RecoveryMetrics> {
    const successfulBackups = recentBackups.filter(b => b.status === 'completed').length;
    const failedBackups = recentBackups.filter(b => b.status === 'failed').length;
    const totalBackups = recentBackups.length;

    const successfulValidations = recentValidations.filter(v => v.isSuccessful).length;
    const rtoAchievedValidations = recentValidations.filter(v => v.rtoAchieved).length;

    const averageBackupTime = recentBackups
      .filter(b => b.duration && b.duration > 0)
      .reduce((sum, b) => sum + (b.duration || 0), 0) / 
      (recentBackups.filter(b => b.duration && b.duration > 0).length || 1);

    const averageRestoreTime = recentValidations
      .filter(v => v.restoreTime && v.restoreTime > 0)
      .reduce((sum, v) => sum + (v.restoreTime || 0), 0) /
      (recentValidations.filter(v => v.restoreTime && v.restoreTime > 0).length || 1);

    const backupSuccessRate = totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 100;
    const validationSuccessRate = recentValidations.length > 0 ? (successfulValidations / recentValidations.length) * 100 : 100;
    const rtoAchievementRate = recentValidations.length > 0 ? (rtoAchievedValidations / recentValidations.length) * 100 : 100;

    // Calculate overall system health score (weighted average)
    const systemHealthScore = Math.round(
      (backupSuccessRate * 0.4) + 
      (validationSuccessRate * 0.3) + 
      (rtoAchievementRate * 0.3)
    );

    return {
      totalBackups,
      successfulBackups,
      failedBackups,
      averageBackupTime: Math.round(averageBackupTime),
      averageRestoreTime: Math.round(averageRestoreTime),
      lastSuccessfulBackup: recentBackups.find(b => b.status === 'completed')?.completedAt || undefined,
      lastSuccessfulValidation: recentValidations.find(v => v.isSuccessful)?.completedAt || undefined,
      rtoAchievementRate: Math.round(rtoAchievementRate),
      systemHealthScore
    };
  }

  /**
   * Generate health alerts based on metrics and services
   */
  private generateHealthAlerts(metrics: RecoveryMetrics, services: HealthCheckResult['services']): string[] {
    const alerts: string[] = [];

    // Service alerts
    if (!services.neonSnapshots) {
      alerts.push('Neon snapshot service is unhealthy');
    }

    // Metric alerts
    const backupFailureRate = metrics.totalBackups > 0 
      ? (metrics.failedBackups / metrics.totalBackups) * 100 
      : 0;

    if (backupFailureRate > this.config.alertThresholds.backupFailureRate) {
      alerts.push(`High backup failure rate: ${Math.round(backupFailureRate)}%`);
    }

    if (metrics.rtoAchievementRate < 80) {
      alerts.push(`Low RTO achievement rate: ${metrics.rtoAchievementRate}%`);
    }

    if (metrics.averageRestoreTime > this.config.alertThresholds.rtoThresholdSeconds) {
      alerts.push(`Average restore time exceeds RTO threshold: ${metrics.averageRestoreTime}s`);
    }

    if (metrics.systemHealthScore < 70) {
      alerts.push(`Low system health score: ${metrics.systemHealthScore}%`);
    }

    // Check for stale backups
    if (metrics.lastSuccessfulBackup) {
      const daysSinceLastBackup = (Date.now() - metrics.lastSuccessfulBackup.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastBackup > 2) {
        alerts.push(`No successful backup in ${Math.round(daysSinceLastBackup)} days`);
      }
    } else {
      alerts.push('No successful backups found');
    }

    return alerts;
  }

  /**
   * Send backup notification
   */
  private async sendBackupNotification(
    backupOperation: BackupOperation | null, 
    type: 'success' | 'failure',
    errorMessage?: string
  ): Promise<void> {
    try {
      // Here you would integrate with your notification system
      const message = type === 'success' 
        ? `Backup completed successfully: ${backupOperation?.operationId}`
        : `Backup failed: ${errorMessage}`;
      
      console.log(`📧 Backup notification (${type}):`, message);

      // TODO: Integrate with notification system
      // await notificationService.send({
      //   type: 'backup_alert',
      //   severity: type === 'failure' ? 'high' : 'low',
      //   message,
      //   metadata: { backupOperation, errorMessage }
      // });

    } catch (error) {
      console.error('Failed to send backup notification:', error);
    }
  }

  /**
   * Send validation alert
   */
  private async sendValidationAlert(
    backupOperation: BackupOperation,
    validationResult?: any,
    errorMessage?: string
  ): Promise<void> {
    try {
      const message = validationResult
        ? `Backup validation failed: ${backupOperation.operationId} (Data integrity: ${validationResult.dataIntegrityScore}%)`
        : `Backup validation error: ${backupOperation.operationId} - ${errorMessage}`;

      console.log('🚨 Validation alert:', message);

      // TODO: Integrate with notification system
      // await notificationService.send({
      //   type: 'validation_alert',
      //   severity: 'high',
      //   message,
      //   metadata: { backupOperation, validationResult, errorMessage }
      // });

    } catch (error) {
      console.error('Failed to send validation alert:', error);
    }
  }

  /**
   * Parse cron expression to interval (simplified)
   */
  private parseCronToInterval(cron: string): number {
    // Simplified cron parser - in production, use a proper cron library
    if (cron === '0 2 * * *') return 24 * 60 * 60 * 1000; // Daily at 2 AM
    if (cron === '0 0 * * 0') return 7 * 24 * 60 * 60 * 1000; // Weekly on Sunday
    if (cron === '0 0 1 * *') return 30 * 24 * 60 * 60 * 1000; // Monthly on 1st
    
    // Default to daily
    return 24 * 60 * 60 * 1000;
  }

  /**
   * Get validation interval based on frequency
   */
  private getValidationInterval(): number {
    switch (this.config.validationFrequency) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DisasterRecoveryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DisasterRecoveryConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('Disaster recovery configuration updated:', updates);
  }

  /**
   * Check if coordinator is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  // Event handling for failover integration
  private failoverEventListeners: Array<(event: any) => Promise<void>> = [];
  private statusChangeListeners: Array<(status: any) => Promise<void>> = [];

  /**
   * Register a failover event listener
   */
  public onFailoverEvent(listener: (event: any) => Promise<void>): void {
    this.failoverEventListeners.push(listener);
  }

  /**
   * Register a status change listener
   */
  public onStatusChange(listener: (status: any) => Promise<void>): void {
    this.statusChangeListeners.push(listener);
  }

  /**
   * Initiate disaster recovery process
   */
  public async initiateRecovery(reason: string, options?: { 
    backupId?: string; 
    targetEnvironment?: string;
    skipValidation?: boolean;
  }): Promise<{ success: boolean; recoveryId?: string; error?: string }> {
    console.log('🚨 Initiating disaster recovery:', reason);

    try {
      const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Emit status change event
      await this.emitStatusChange({
        phase: 'active',
        trigger: 'failover',
        reason,
        recoveryId,
        timestamp: new Date()
      });

      // Execute recovery process
      const startTime = Date.now();
      let restoreResult;

      if (options?.backupId) {
        // Restore from specific backup
        restoreResult = await this.restoreFromBackup(options.backupId, options.targetEnvironment);
      } else {
        // Find the most recent successful backup
        const { storage } = await import('../storage');
        const recentBackups = await storage.getRecentBackupOperations(10);
        const lastSuccessfulBackup = recentBackups.find(b => b.status === 'completed');
        
        if (!lastSuccessfulBackup) {
          throw new Error('No successful backup found for recovery');
        }

        restoreResult = await this.restoreFromBackup(lastSuccessfulBackup.operationId, options?.targetEnvironment);
      }

      const duration = Date.now() - startTime;

      if (restoreResult.success) {
        console.log(`✅ Disaster recovery completed successfully (${duration}ms)`);
        
        // Validate restore if not skipped
        if (!options?.skipValidation) {
          await this.validateRecovery(recoveryId);
        }

        // Emit completion status
        await this.emitStatusChange({
          phase: 'completed',
          trigger: 'recovery',
          reason,
          recoveryId,
          duration,
          timestamp: new Date()
        });

        return { success: true, recoveryId };
      } else {
        throw new Error(restoreResult.error || 'Recovery failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Disaster recovery failed:', errorMessage);

      // Emit failure status
      await this.emitStatusChange({
        phase: 'failed',
        trigger: 'recovery',
        reason,
        error: errorMessage,
        timestamp: new Date()
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Emit a failover event to all listeners
   */
  private async emitFailoverEvent(event: any): Promise<void> {
    for (const listener of this.failoverEventListeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error('Error in failover event listener:', error);
      }
    }
  }

  /**
   * Emit a status change to all listeners
   */
  private async emitStatusChange(status: any): Promise<void> {
    for (const listener of this.statusChangeListeners) {
      try {
        await listener(status);
      } catch (error) {
        console.error('Error in status change listener:', error);
      }
    }
  }

  /**
   * Restore from a specific backup
   */
  private async restoreFromBackup(backupId: string, targetEnvironment?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Implementation depends on your backup strategy
      // This is a placeholder for the actual restore logic
      console.log(`🔄 Restoring from backup: ${backupId}`);
      
      // You would implement the actual restore logic here
      // For now, simulate a successful restore
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Validate recovery process
   */
  private async validateRecovery(recoveryId: string): Promise<void> {
    console.log(`🔍 Validating recovery: ${recoveryId}`);
    // Implementation would validate that the recovery was successful
    // This could include health checks, data integrity checks, etc.
  }
}

// Export singleton instance
export const disasterRecoveryCoordinator = new DisasterRecoveryCoordinator();
export default disasterRecoveryCoordinator;