/**
 * Failover Integration Service
 * Integrates failover capabilities with notification system and disaster recovery coordinator
 */

import type { StorageFactory } from '../storage-factory';
import type { FailoverExecution } from './failover-orchestration-service';

export interface FailoverNotificationConfig {
  enableEmailAlerts: boolean;
  enableSlackAlerts: boolean;
  enableWebhookAlerts: boolean;
  criticalFailoverThreshold: number; // Number of failures before critical alert
  alertCooldownMs: number; // Minimum time between similar alerts
}

export interface FailoverIntegrationMetrics {
  notificationsSent: number;
  disasterRecoveryActivations: number;
  lastIntegrationCheck: Date;
  integrationHealth: 'healthy' | 'degraded' | 'failed';
  alertsInCooldown: number;
}

export class FailoverIntegrationService {
  private storageFactory: StorageFactory;
  private config: FailoverNotificationConfig;
  private metrics: FailoverIntegrationMetrics;
  private alertHistory: Map<string, Date> = new Map();
  private isInitialized = false;

  constructor(storageFactory: StorageFactory) {
    this.storageFactory = storageFactory;
    this.config = {
      enableEmailAlerts: true,
      enableSlackAlerts: false,
      enableWebhookAlerts: true,
      criticalFailoverThreshold: 3,
      alertCooldownMs: 300000 // 5 minutes
    };
    this.metrics = {
      notificationsSent: 0,
      disasterRecoveryActivations: 0,
      lastIntegrationCheck: new Date(),
      integrationHealth: 'healthy',
      alertsInCooldown: 0
    };
  }

  /**
   * Initialize failover integrations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up storage factory event listeners
      this.setupStorageFactoryIntegration();
      
      // Set up orchestration service integration
      await this.setupOrchestrationIntegration();
      
      // Set up disaster recovery coordinator integration
      await this.setupDisasterRecoveryIntegration();
      
      // Set up health monitoring integration
      await this.setupHealthMonitoringIntegration();

      this.isInitialized = true;
      this.metrics.integrationHealth = 'healthy';
      
      console.log('✅ Failover Integration Service initialized successfully');
      
      // Send initialization notification
      await this.sendNotification({
        type: 'info',
        title: 'Failover Integration Active',
        message: 'Application resilience and failover monitoring is now active',
        severity: 'low',
        metadata: {
          timestamp: new Date().toISOString(),
          integrations: ['storage', 'orchestration', 'disaster_recovery', 'health_monitoring']
        }
      });

    } catch (error) {
      this.metrics.integrationHealth = 'failed';
      console.error('❌ Failed to initialize Failover Integration Service:', error);
      
      // Send failure notification
      await this.sendNotification({
        type: 'error',
        title: 'Failover Integration Failed',
        message: `Failed to initialize failover integrations: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'high',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Set up storage factory event integration
   */
  private setupStorageFactoryIntegration(): void {
    // Listen for storage factory failover events
    this.storageFactory.onFailoverEvent(async (event) => {
      await this.handleFailoverEvent(event);
    });

    // Listen for health status changes
    this.storageFactory.onHealthStatusChange(async (healthStatus) => {
      await this.handleHealthStatusChange(healthStatus);
    });

    console.log('📡 Storage factory integration configured');
  }

  /**
   * Set up orchestration service integration
   */
  private async setupOrchestrationIntegration(): Promise<void> {
    try {
      const { failoverOrchestrationService } = await import('./failover-orchestration-service');
      
      // Register callback for failover executions
      failoverOrchestrationService.onFailoverExecution(async (execution: FailoverExecution) => {
        await this.handleOrchestrationExecution(execution);
      });

      console.log('🎯 Orchestration service integration configured');
    } catch (error) {
      console.log('⚠️ Orchestration service not available for integration:', error);
    }
  }

  /**
   * Set up disaster recovery coordinator integration
   */
  private async setupDisasterRecoveryIntegration(): Promise<void> {
    try {
      const { disasterRecoveryCoordinator } = await import('./disaster-recovery-coordinator');
      
      // Register failover event handler with disaster recovery coordinator
      disasterRecoveryCoordinator.onFailoverEvent(async (event) => {
        await this.handleDisasterRecoveryEvent(event);
      });

      // Register for disaster recovery status updates
      disasterRecoveryCoordinator.onStatusChange(async (status) => {
        if (status.phase === 'active' && status.trigger === 'failover') {
          await this.sendNotification({
            type: 'warning',
            title: 'Disaster Recovery Activated',
            message: `Disaster recovery activated due to failover: ${status.reason}`,
            severity: 'high',
            metadata: {
              phase: status.phase,
              trigger: status.trigger,
              reason: status.reason
            }
          });
        }
      });

      console.log('🛡️ Disaster recovery coordinator integration configured');
    } catch (error) {
      console.log('⚠️ Disaster recovery coordinator not available for integration:', error);
    }
  }

  /**
   * Set up health monitoring integration
   */
  private async setupHealthMonitoringIntegration(): Promise<void> {
    try {
      const { healthCheckService } = await import('./health-check-service');
      
      // Register failover event callback
      healthCheckService.onFailoverEvent(async (event) => {
        await this.handleHealthMonitoringEvent(event);
      });

      console.log('🏥 Health monitoring integration configured');
    } catch (error) {
      console.log('⚠️ Health monitoring service not available for integration:', error);
    }
  }

  /**
   * Handle storage factory failover events
   */
  private async handleFailoverEvent(event: any): Promise<void> {
    const alertKey = `failover_${event.toMode}_${event.trigger}`;
    
    if (this.isInCooldown(alertKey)) {
      this.metrics.alertsInCooldown++;
      return;
    }

    let severity: 'low' | 'medium' | 'high' = 'medium';
    let title = 'Database Failover Event';
    
    if (event.trigger === 'HEALTH_CHECK_FAILURE') {
      severity = 'high';
      title = 'Critical Database Failover';
    } else if (event.trigger === 'MANUAL') {
      severity = 'low';
      title = 'Manual Database Failover';
    }

    await this.sendNotification({
      type: event.success ? 'info' : 'error',
      title,
      message: `Database failover ${event.success ? 'succeeded' : 'failed'}: ${event.fromMode} → ${event.toMode}`,
      severity,
      metadata: {
        fromMode: event.fromMode,
        toMode: event.toMode,
        trigger: event.trigger,
        success: event.success,
        latency: event.latency,
        reason: event.reason,
        timestamp: event.timestamp
      }
    });

    this.alertHistory.set(alertKey, new Date());

    // Trigger disaster recovery if this is a critical failure
    if (!event.success && severity === 'high') {
      await this.triggerDisasterRecoveryCoordination(event);
    }
  }

  /**
   * Handle health status changes
   */
  private async handleHealthStatusChange(healthStatus: any): Promise<void> {
    const alertKey = `health_${healthStatus.mode}_${healthStatus.systemHealthy}`;
    
    if (this.isInCooldown(alertKey)) {
      this.metrics.alertsInCooldown++;
      return;
    }

    // Alert on critical health changes
    if (!healthStatus.systemHealthy || healthStatus.consecutiveFailures >= this.config.criticalFailoverThreshold) {
      await this.sendNotification({
        type: 'warning',
        title: 'Database Health Critical',
        message: `System health degraded: ${healthStatus.consecutiveFailures} consecutive failures in ${healthStatus.mode} mode`,
        severity: 'high',
        metadata: {
          mode: healthStatus.mode,
          consecutiveFailures: healthStatus.consecutiveFailures,
          isDatabaseHealthy: healthStatus.isDatabaseHealthy,
          isReplicaHealthy: healthStatus.isReplicaHealthy,
          lastHealthCheck: healthStatus.lastHealthCheck
        }
      });

      this.alertHistory.set(alertKey, new Date());
    }

    // Alert on recovery
    if (healthStatus.systemHealthy && healthStatus.consecutiveFailures === 0) {
      const recoveryKey = `recovery_${healthStatus.mode}`;
      if (!this.isInCooldown(recoveryKey)) {
        await this.sendNotification({
          type: 'success',
          title: 'Database Health Restored',
          message: `System health restored in ${healthStatus.mode} mode`,
          severity: 'low',
          metadata: {
            mode: healthStatus.mode,
            isDatabaseHealthy: healthStatus.isDatabaseHealthy,
            isReplicaHealthy: healthStatus.isReplicaHealthy
          }
        });

        this.alertHistory.set(recoveryKey, new Date());
      }
    }
  }

  /**
   * Handle orchestration execution events
   */
  private async handleOrchestrationExecution(execution: FailoverExecution): Promise<void> {
    const alertKey = `orchestration_${execution.planId}_${execution.status}`;
    
    if (this.isInCooldown(alertKey)) {
      this.metrics.alertsInCooldown++;
      return;
    }

    let severity: 'low' | 'medium' | 'high' = 'medium';
    let type: 'info' | 'warning' | 'error' | 'success' = 'info';

    switch (execution.status) {
      case 'completed':
        type = 'success';
        severity = 'low';
        break;
      case 'failed':
        type = 'error';
        severity = 'high';
        break;
      case 'rolled_back':
        type = 'warning';
        severity = 'high';
        break;
      case 'in_progress':
        severity = 'medium';
        break;
    }

    await this.sendNotification({
      type,
      title: `Failover Orchestration ${execution.status}`,
      message: `Orchestrated failover execution ${execution.status}: ${execution.reason}`,
      severity,
      metadata: {
        executionId: execution.id,
        planId: execution.planId,
        trigger: execution.trigger,
        status: execution.status,
        reason: execution.reason,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        metrics: execution.metrics
      }
    });

    this.alertHistory.set(alertKey, new Date());
  }

  /**
   * Handle disaster recovery events
   */
  private async handleDisasterRecoveryEvent(event: any): Promise<void> {
    this.metrics.disasterRecoveryActivations++;
    
    await this.sendNotification({
      type: 'error',
      title: 'Disaster Recovery Activated',
      message: `Disaster recovery procedures activated: ${event.reason}`,
      severity: 'high',
      metadata: {
        reason: event.reason,
        trigger: event.trigger,
        phase: event.phase,
        timestamp: event.timestamp
      }
    });
  }

  /**
   * Handle health monitoring events
   */
  private async handleHealthMonitoringEvent(event: any): Promise<void> {
    await this.sendNotification({
      type: 'info',
      title: 'Health Monitoring Alert',
      message: `Health monitoring event: ${event.message}`,
      severity: 'medium',
      metadata: event
    });
  }

  /**
   * Send notification through available channels
   */
  private async sendNotification(notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      this.metrics.notificationsSent++;

      // Send via notification queue service
      try {
        const { notificationQueueService } = await import('./notification-queue-service');
        await notificationQueueService.queueNotification({
          type: 'email',
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          metadata: {
            ...notification.metadata,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.log('Notification queue service not available:', error);
      }

      // Send via email if enabled and critical
      if (this.config.enableEmailAlerts && notification.severity === 'high') {
        await this.sendEmailAlert(notification);
      }

      // Send via webhook if enabled
      if (this.config.enableWebhookAlerts) {
        await this.sendWebhookAlert(notification);
      }

      console.log(`📧 Failover notification sent: ${notification.title}`);

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(notification: any): Promise<void> {
    try {
      // Import SendGrid service for email notifications
      const { sendGridNotificationService } = await import('./sendgrid-notification-service');
      
      await sendGridNotificationService.sendEmail({
        to: process.env.ALERT_EMAIL || 'admin@example.com',
        subject: `[Failover Alert] ${notification.title}`,
        text: `${notification.message}\n\nDetails: ${JSON.stringify(notification.metadata, null, 2)}`,
        html: `
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          <h3>Details:</h3>
          <pre>${JSON.stringify(notification.metadata, null, 2)}</pre>
        `
      });
    } catch (error) {
      console.log('Email alert service not available:', error);
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(notification: any): Promise<void> {
    try {
      const webhookUrl = process.env.FAILOVER_WEBHOOK_URL;
      if (!webhookUrl) return;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...notification,
          timestamp: new Date().toISOString(),
          source: 'failover_integration'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.log('Webhook alert failed:', error);
    }
  }

  /**
   * Trigger disaster recovery coordination
   */
  private async triggerDisasterRecoveryCoordination(event: any): Promise<void> {
    try {
      const { disasterRecoveryCoordinator } = await import('./disaster-recovery-coordinator');
      
      await disasterRecoveryCoordinator.initiateRecovery({
        trigger: 'failover_failure',
        reason: `Critical failover failure: ${event.fromMode} → ${event.toMode}`,
        severity: 'high',
        metadata: event
      });

      this.metrics.disasterRecoveryActivations++;
      console.log('🛡️ Disaster recovery coordination triggered');

    } catch (error) {
      console.error('Failed to trigger disaster recovery coordination:', error);
    }
  }

  /**
   * Check if alert is in cooldown period
   */
  private isInCooldown(alertKey: string): boolean {
    const lastAlert = this.alertHistory.get(alertKey);
    if (!lastAlert) return false;
    
    const cooldownExpiry = new Date(lastAlert.getTime() + this.config.alertCooldownMs);
    return new Date() < cooldownExpiry;
  }

  /**
   * Update integration configuration
   */
  updateConfig(updates: Partial<FailoverNotificationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('📝 Failover integration configuration updated');
  }

  /**
   * Get integration metrics
   */
  getMetrics(): FailoverIntegrationMetrics {
    this.metrics.lastIntegrationCheck = new Date();
    return { ...this.metrics };
  }

  /**
   * Get integration status
   */
  getStatus(): {
    initialized: boolean;
    health: string;
    config: FailoverNotificationConfig;
    metrics: FailoverIntegrationMetrics;
    alertsInCooldown: number;
  } {
    return {
      initialized: this.isInitialized,
      health: this.metrics.integrationHealth,
      config: this.config,
      metrics: this.getMetrics(),
      alertsInCooldown: Array.from(this.alertHistory.entries()).filter(([_, timestamp]) => {
        const cooldownExpiry = new Date(timestamp.getTime() + this.config.alertCooldownMs);
        return new Date() < cooldownExpiry;
      }).length
    };
  }

  /**
   * Clear alert history (for testing or maintenance)
   */
  clearAlertHistory(): void {
    this.alertHistory.clear();
    this.metrics.alertsInCooldown = 0;
    console.log('🗑️ Alert history cleared');
  }
}

// Create singleton instance
let failoverIntegrationService: FailoverIntegrationService | null = null;

export async function initializeFailoverIntegration(storageFactory: StorageFactory): Promise<FailoverIntegrationService> {
  if (!failoverIntegrationService) {
    failoverIntegrationService = new FailoverIntegrationService(storageFactory);
    await failoverIntegrationService.initialize();
  }
  return failoverIntegrationService;
}

export function getFailoverIntegrationService(): FailoverIntegrationService | null {
  return failoverIntegrationService;
}