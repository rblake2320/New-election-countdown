import { nanoid } from 'nanoid';
import { notificationQueueService } from './notification-queue-service';
import type { IStorage } from '../storage';
import type { 
  BackupMonitoringConfiguration,
  BackupAlert, 
  BackupHealthMetric,
  InsertBackupMonitoringConfiguration,
  InsertBackupAlert,
  InsertBackupHealthMetric
} from '@shared/schema';

export class BackupMonitoringConfigurationError extends Error {}

export interface AlertChannel {
  type: 'email' | 'sms' | 'webhook' | 'slack';
  target: string;
  priority: number;
  escalationLevel: number;
}

export interface AlertRule {
  metricType: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains';
  threshold: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface BackupEvent {
  eventId: string;
  eventType: 'backup_started' | 'backup_completed' | 'backup_failed' | 'backup_warning';
  backupJobId: string;
  backupType: 'full' | 'incremental' | 'differential';
  source: string;
  destination: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'warning';
  size?: number;
  duration?: number;
  errorMessage?: string;
  metadata?: any;
}

export interface AlertContext {
  alertId: string;
  configurationId: number;
  event: BackupEvent;
  rule: AlertRule;
  channels: AlertChannel[];
  escalationRules: any[];
}

/**
 * Backup Success Alert System - Real-time monitoring and multi-channel alerting
 * 
 * Records observed backup events and queues configured email alerts.
 * Delivery state belongs to the notification worker and its provider receipts.
 */
export class BackupAlertService {
  private storage: IStorage;
  private monitoringInterval?: NodeJS.Timeout;
  private alertQueue: AlertContext[] = [];
  private activeAlerts = new Map<string, AlertContext>();
  
  
  constructor(storage: IStorage) {
    this.storage = storage;
    // Event-driven service: no timer claiming unimplemented health checks.
  }

  /**
   * Create a new backup monitoring configuration
   */
  async createMonitoringConfiguration(config: Omit<InsertBackupMonitoringConfiguration, 'id'>): Promise<BackupMonitoringConfiguration> {
    // Validate configuration
    this.validateMonitoringConfiguration(config);
    
    const newConfig = await this.storage.createBackupMonitoringConfiguration({
      ...config
    });

    console.log(`[BackupAlertService] Created monitoring configuration: ${newConfig.name}`);
    
    return newConfig;
  }

  /**
   * Process a backup event and generate alerts if needed
   */
  async processBackupEvent(event: BackupEvent): Promise<void> {
    console.log(`[BackupAlertService] Processing backup event: ${event.eventType} for job ${event.backupJobId}`);
    
    // Record health metric
    await this.recordHealthMetric(event);
    
    // Get active monitoring configurations
    const configs = await this.storage.getActiveMonitoringConfigurations();
    
    for (const config of configs) {
      await this.evaluateAlertRules(config, event);
    }
  }

  /**
   * Record a health metric based on backup event
   */
  private async recordHealthMetric(event: BackupEvent): Promise<void> {
    if (event.status !== 'completed' && event.status !== 'failed') return;
    await this.storage.createBackupHealthMetric({
      metricType: 'event',
      metricDate: event.endTime ?? event.startTime,
      totalBackups: 1,
      successfulBackups: event.status === 'completed' ? 1 : 0,
      failedBackups: event.status === 'failed' ? 1 : 0,
      successRate: event.status === 'completed' ? '100' : '0',
      averageBackupDuration: event.duration === undefined ? null : Math.round(event.duration * 60),
      averageBackupSize: event.size ?? null,
      metricsByType: { [event.backupType]: { eventId: event.eventId, backupJobId: event.backupJobId, status: event.status } }
    });
  }

  /**
   * Evaluate alert rules for a monitoring configuration
   */
  private async evaluateAlertRules(config: BackupMonitoringConfiguration, event: BackupEvent): Promise<void> {
    if (!config.isEnabled || event.status !== 'failed') return;
    if (config.backupTypes?.length && !config.backupTypes.includes(event.backupType)) return;
    // This event handler emits operation-failure alerts. Aggregate threshold and
    // missing-backup monitoring belong to BackupMonitoringService.
    const severity = config.alertSeverity;
    const rule: AlertRule = {
      metricType: 'backup_failure', condition: 'equals', threshold: 'failed',
      severity: severity === 'low' || severity === 'medium' || severity === 'critical' ? severity : 'high',
      description: 'Backup operation failed'
    };
    await this.triggerAlert(config, rule, event);
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(config: BackupMonitoringConfiguration, rule: AlertRule, event: BackupEvent): Promise<void> {
    const alertId = nanoid();
    
    // Check for duplicate alerts (deduplication)
    const existingAlerts = await this.storage.getActiveBackupAlerts();
    const duplicate = existingAlerts.find(alert => 
      alert.configurationId === config.id &&
      alert.alertType === rule.metricType &&
      alert.severity === rule.severity &&
      typeof alert.alertData === 'object' && alert.alertData !== null &&
      'backupJobId' in alert.alertData && alert.alertData.backupJobId === event.backupJobId &&
      (alert.createdAt !== null ? Date.now() - alert.createdAt.getTime() : Infinity) < 60 * 60 * 1000 // Within 1 hour
    );
    
    if (duplicate) {
      console.log(`[BackupAlertService] Duplicate alert suppressed: ${rule.metricType} for ${event.backupJobId}`);
      return;
    }
    
    // Create alert record
    const alert = await this.storage.createBackupAlert({
      alertId,
      configurationId: config.id,
      alertType: rule.metricType,
      severity: rule.severity,
      status: 'active',
      title: rule.description,
      message: this.generateAlertMessage(rule, event),
      affectedBackupTypes: [event.backupType],
      alertData: { eventId: event.eventId, backupJobId: event.backupJobId, source: event.source, configuration: config.name }

    });
    
    // Create alert context for processing
    const alertContext: AlertContext = {
      alertId,
      configurationId: config.id,
      event,
      rule,
      channels: (config.alertChannels ?? []).includes('email')
        ? (config.alertEmails ?? []).map(target => ({ type: 'email', target, priority: 1, escalationLevel: 1 })) : [],
      escalationRules: Array.isArray(config.escalationRules) ? config.escalationRules : []
    };
    
    this.activeAlerts.set(alertId, alertContext);
    this.alertQueue.push(alertContext);
    
    console.log(`[BackupAlertService] Alert triggered: ${rule.severity} - ${rule.description}`);
    
    // Process alert immediately
    await this.processAlert(alertContext);
  }

  /**
   * Process an alert by sending notifications
   */
  private async processAlert(context: AlertContext): Promise<void> {
    console.log(`[BackupAlertService] Processing alert: ${context.alertId}`);
    
    // Send notifications through configured channels
    for (const channel of context.channels) {
      try {
        await this.sendNotification(context, channel);
      } catch (error) {
        console.error(`[BackupAlertService] Failed to send notification via ${channel.type}:`, error);
      }
    }
    
    // A queued notification is not a delivered notification. Keep the alert active.
  }

  /**
   * Send notification through a specific channel
   */
  private async sendNotification(context: AlertContext, channel: AlertChannel): Promise<void> {
    const message = this.formatNotificationMessage(context, channel.type);
    
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel.target, context.rule.severity, message);
        break;
        
      case 'sms':
        await this.sendSmsNotification(channel.target, message);
        break;
        
      case 'webhook':
        await this.sendWebhookNotification(channel.target, context);
        break;
        
      case 'slack':
        await this.sendSlackNotification(channel.target, context, message);
        break;
        
      default:
        console.warn(`[BackupAlertService] Unknown notification channel: ${channel.type}`);
    }
  }

  /**
   * Send email notification (via SendGrid)
   */
  private async sendEmailNotification(email: string, severity: string, message: string): Promise<void> {
    await notificationQueueService.queueNotification({ type: 'email', priority: severity === 'critical' ? 'urgent' : 'normal', recipient: email, content: { subject: 'Backup alert', message }, metadata: {}, maxRetries: 3, scheduledAt: new Date() });
  }

  /**
   * Send SMS notification (via Twilio)
   */
  private async sendSmsNotification(phone: string, message: string): Promise<void> {
    await notificationQueueService.queueNotification({ type: 'sms', priority: 'high', recipient: phone, content: { message }, metadata: {}, maxRetries: 3, scheduledAt: new Date() });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(url: string, context: AlertContext): Promise<void> {
    throw new Error('BACKUP_CHANNEL_UNAVAILABLE: no approved webhook transport is configured');
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(webhook: string, context: AlertContext, message: string): Promise<void> {
    throw new Error('BACKUP_CHANNEL_UNAVAILABLE: no approved Slack transport is configured');
  }

  /**
   * Format notification message for different channels
   */
  private formatNotificationMessage(context: AlertContext, channelType: string): string {
    const { rule, event } = context;
    
    if (channelType === 'sms') {
      // Short format for SMS
      return `BACKUP ALERT [${rule.severity.toUpperCase()}]: ${event.backupJobId} - ${rule.description}`;
    }
    
    // Detailed format for email/webhook/slack
    return `
BACKUP MONITORING ALERT

Severity: ${rule.severity.toUpperCase()}
Alert Type: ${rule.metricType}
Description: ${rule.description}

Backup Details:
- Job ID: ${event.backupJobId}
- Type: ${event.backupType}
- Source: ${event.source}
- Status: ${event.status}
- Start Time: ${event.startTime.toISOString()}
${event.endTime ? `- End Time: ${event.endTime.toISOString()}` : ''}
${event.duration ? `- Duration: ${Math.round(event.duration)} minutes` : ''}
${event.size ? `- Size: ${this.formatBytes(event.size)}` : ''}
${event.errorMessage ? `- Error: ${event.errorMessage}` : ''}

Alert ID: ${context.alertId}
Triggered: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, event: BackupEvent): string {
    switch (rule.metricType) {
      case 'backup_failure':
        return `Backup job ${event.backupJobId} failed: ${event.errorMessage || 'Unknown error'}`;
        
      case 'backup_duration':
        return `Backup job ${event.backupJobId} took ${event.duration} minutes (threshold: ${rule.threshold} minutes)`;
        
      case 'backup_size':
        return `Backup job ${event.backupJobId} size ${this.formatBytes(event.size || 0)} (threshold: ${this.formatBytes(rule.threshold as number)})`;
        
      default:
        return `${rule.description} - Backup job: ${event.backupJobId}`;
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<BackupAlert> {
    const alert = await this.storage.acknowledgeBackupAlert(alertId, acknowledgedBy);
    
    console.log(`[BackupAlertService] Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    
    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<BackupAlert> {
    const alert = await this.storage.resolveBackupAlert(alertId, resolvedBy);
    
    // Remove from active alerts
    this.activeAlerts.delete(alertId);
    
    console.log(`[BackupAlertService] Alert resolved: ${alertId} by ${resolvedBy}`);
    
    return alert;
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<BackupAlert[]> {
    return await this.storage.getActiveBackupAlerts();
  }

  /**
   * Get health metrics
   */
  async getHealthMetrics(filters?: any): Promise<BackupHealthMetric[]> {
    return await this.storage.getBackupHealthMetrics(filters);
  }

  /**
   * Get health trends
   */
  async getHealthTrends(days: number = 7): Promise<BackupHealthMetric[]> {
    return await this.storage.getBackupHealthTrends(days);
  }

  /**
   * Generate health summary
   */
  async generateHealthSummary(dateFrom: Date, dateTo: Date): Promise<any> {
    return await this.storage.generateBackupHealthSummary(dateFrom, dateTo);
  }

  /**
   * Validate monitoring configuration
   */
  validateMonitoringConfiguration(config: Pick<InsertBackupMonitoringConfiguration, 'name' | 'monitoringType' | 'alertChannels' | 'alertEmails'>): void {
    if (!config.name?.trim()) throw new BackupMonitoringConfigurationError('Configuration name is required');
    if (!['all_backups', 'backup_type'].includes(config.monitoringType)) {
      throw new BackupMonitoringConfigurationError('Event alerts support all_backups or backup_type monitoring');
    }
    if ((config.alertChannels ?? []).some(channel => !['email', 'dashboard'].includes(channel))) {
      throw new BackupMonitoringConfigurationError('Event alerts support dashboard and configured email delivery');
    }
    if (config.alertChannels?.includes('email') && !config.alertEmails?.length) {
      throw new BackupMonitoringConfigurationError('Email alerts require configured recipients');
    }
  }

  /**
   * Simulate a backup event (for testing)
   */
  async simulateBackupEvent(eventType: BackupEvent['eventType'], backupJobId: string): Promise<void> {
    throw new Error('SYNTHETIC_EVENT_DISABLED: simulated events cannot write operational backup health');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
}