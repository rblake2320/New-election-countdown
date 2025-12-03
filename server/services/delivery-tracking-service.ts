import { 
  NotificationDelivery, 
  InsertNotificationDelivery,
  NotificationCampaign,
  NotificationWebhook
} from '@shared/schema';

export interface DeliveryMetrics {
  campaignId?: number;
  dateRange: { start: Date; end: Date };
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  totalOpened: number;
  totalClicked: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  averageDeliveryTime: number; // in seconds
  channelBreakdown: {
    email: DeliveryChannelMetrics;
    sms: DeliveryChannelMetrics;
  };
}

export interface DeliveryChannelMetrics {
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  averageDeliveryTime: number;
}

export interface DeliveryAnalytics {
  hourlyDelivery: Array<{ hour: string; count: number; success: number; failed: number }>;
  dailyDelivery: Array<{ date: string; count: number; success: number; failed: number }>;
  errorBreakdown: Array<{ errorCode: string; count: number; percentage: number }>;
  providerPerformance: Array<{ provider: string; deliveryRate: number; averageTime: number }>;
  geographicDistribution: Array<{ region: string; count: number; successRate: number }>;
}

export interface DeliveryAlert {
  id: string;
  type: 'high_failure_rate' | 'slow_delivery' | 'bounce_spike' | 'unsubscribe_spike';
  severity: 'warning' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  detectedAt: Date;
  campaignId?: number;
  channel?: string;
  isResolved: boolean;
}

export class DeliveryTrackingService {
  private deliveryCache: Map<string, NotificationDelivery> = new Map();
  private metricsCache: Map<string, DeliveryMetrics> = new Map();
  private alertThresholds = {
    failureRate: 15, // 15% failure rate triggers alert
    deliveryTime: 300, // 5 minutes average delivery time
    bounceRate: 5, // 5% bounce rate
    unsubscribeRate: 2, // 2% unsubscribe rate
  };
  private activeAlerts: Map<string, DeliveryAlert> = new Map();

  constructor() {
    this.startAnalyticsProcessor();
    this.startAlertMonitoring();
    console.log('✅ Delivery Tracking Service initialized');
  }

  /**
   * Record a new delivery attempt
   */
  async recordDelivery(deliveryData: InsertNotificationDelivery): Promise<NotificationDelivery> {
    try {
      const delivery: NotificationDelivery = {
        id: Date.now(), // In real implementation, this would be auto-generated
        ...deliveryData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Cache the delivery for quick access
      this.deliveryCache.set(delivery.id.toString(), delivery);

      // Invalidate metrics cache to force recalculation
      this.invalidateMetricsCache(delivery.campaignId);

      console.log(`📊 Delivery recorded: ${delivery.id} (${delivery.channel})`);
      return delivery;
    } catch (error) {
      console.error('Failed to record delivery:', error);
      throw new Error('Delivery recording failed');
    }
  }

  /**
   * Update delivery status (sent, delivered, failed, etc.)
   */
  async updateDeliveryStatus(
    deliveryId: number,
    status: string,
    metadata?: {
      externalId?: string;
      errorCode?: string;
      errorMessage?: string;
      providerResponse?: any;
      cost?: number;
    }
  ): Promise<void> {
    try {
      const delivery = this.deliveryCache.get(deliveryId.toString());
      if (!delivery) {
        console.error(`Delivery not found: ${deliveryId}`);
        return;
      }

      // Update delivery record
      delivery.status = status as any;
      delivery.updatedAt = new Date();

      // Set appropriate timestamp based on status
      switch (status) {
        case 'sent':
          delivery.sentAt = new Date();
          break;
        case 'delivered':
          delivery.deliveredAt = new Date();
          break;
        case 'failed':
          delivery.failedAt = new Date();
          delivery.errorCode = metadata?.errorCode;
          delivery.errorMessage = metadata?.errorMessage;
          break;
        case 'bounced':
          delivery.bouncedAt = new Date();
          delivery.errorCode = metadata?.errorCode;
          delivery.errorMessage = metadata?.errorMessage;
          break;
        case 'opened':
          delivery.openedAt = new Date();
          break;
        case 'clicked':
          delivery.clickedAt = new Date();
          break;
      }

      // Update metadata if provided
      if (metadata) {
        if (metadata.externalId) delivery.externalId = metadata.externalId;
        if (metadata.providerResponse) delivery.providerResponse = metadata.providerResponse;
        if (metadata.cost) delivery.cost = metadata.cost.toString();
      }

      // Update cache
      this.deliveryCache.set(deliveryId.toString(), delivery);

      // Invalidate metrics cache
      this.invalidateMetricsCache(delivery.campaignId);

      console.log(`📊 Delivery status updated: ${deliveryId} -> ${status}`);
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      throw new Error('Delivery status update failed');
    }
  }

  /**
   * Get delivery metrics for a campaign or date range
   */
  async getDeliveryMetrics(
    campaignId?: number,
    dateRange?: { start: Date; end: Date }
  ): Promise<DeliveryMetrics> {
    try {
      const cacheKey = `metrics_${campaignId || 'all'}_${dateRange?.start?.getTime() || 'all'}`;
      
      // Check cache first
      if (this.metricsCache.has(cacheKey)) {
        return this.metricsCache.get(cacheKey)!;
      }

      // Calculate metrics from delivery data
      const deliveries = Array.from(this.deliveryCache.values()).filter(delivery => {
        if (campaignId && delivery.campaignId !== campaignId) return false;
        if (dateRange) {
          const deliveryDate = new Date(delivery.createdAt);
          if (deliveryDate < dateRange.start || deliveryDate > dateRange.end) return false;
        }
        return true;
      });

      const totalSent = deliveries.length;
      const totalDelivered = deliveries.filter(d => d.status === 'delivered').length;
      const totalFailed = deliveries.filter(d => d.status === 'failed').length;
      const totalBounced = deliveries.filter(d => d.status === 'bounced').length;
      const totalOpened = deliveries.filter(d => d.openedAt).length;
      const totalClicked = deliveries.filter(d => d.clickedAt).length;
      const totalUnsubscribed = deliveries.filter(d => d.status === 'unsubscribed').length;

      // Calculate rates
      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
      const unsubscribeRate = totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0;

      // Calculate average delivery time
      const deliveredNotifications = deliveries.filter(d => d.deliveredAt && d.sentAt);
      const averageDeliveryTime = deliveredNotifications.length > 0
        ? deliveredNotifications.reduce((sum, d) => {
            const sentTime = new Date(d.sentAt!).getTime();
            const deliveredTime = new Date(d.deliveredAt!).getTime();
            return sum + (deliveredTime - sentTime);
          }, 0) / deliveredNotifications.length / 1000 // Convert to seconds
        : 0;

      // Channel breakdown
      const emailDeliveries = deliveries.filter(d => d.channel === 'email');
      const smsDeliveries = deliveries.filter(d => d.channel === 'sms');

      const channelBreakdown = {
        email: this.calculateChannelMetrics(emailDeliveries),
        sms: this.calculateChannelMetrics(smsDeliveries)
      };

      const metrics: DeliveryMetrics = {
        campaignId,
        dateRange: dateRange || { start: new Date(0), end: new Date() },
        totalSent,
        totalDelivered,
        totalFailed,
        totalBounced,
        totalOpened,
        totalClicked,
        totalUnsubscribed,
        deliveryRate,
        openRate,
        clickRate,
        bounceRate,
        unsubscribeRate,
        averageDeliveryTime,
        channelBreakdown
      };

      // Cache the metrics
      this.metricsCache.set(cacheKey, metrics);

      return metrics;
    } catch (error) {
      console.error('Failed to get delivery metrics:', error);
      throw new Error('Metrics calculation failed');
    }
  }

  /**
   * Get detailed delivery analytics
   */
  async getDeliveryAnalytics(
    campaignId?: number,
    dateRange?: { start: Date; end: Date }
  ): Promise<DeliveryAnalytics> {
    try {
      const deliveries = Array.from(this.deliveryCache.values()).filter(delivery => {
        if (campaignId && delivery.campaignId !== campaignId) return false;
        if (dateRange) {
          const deliveryDate = new Date(delivery.createdAt);
          if (deliveryDate < dateRange.start || deliveryDate > dateRange.end) return false;
        }
        return true;
      });

      // Hourly delivery breakdown
      const hourlyData = new Map<string, { count: number; success: number; failed: number }>();
      
      // Daily delivery breakdown
      const dailyData = new Map<string, { count: number; success: number; failed: number }>();

      // Error breakdown
      const errorData = new Map<string, number>();

      deliveries.forEach(delivery => {
        const date = new Date(delivery.createdAt);
        const hour = `${date.getHours()}:00`;
        const day = date.toISOString().split('T')[0];

        // Hourly data
        if (!hourlyData.has(hour)) {
          hourlyData.set(hour, { count: 0, success: 0, failed: 0 });
        }
        const hourlyEntry = hourlyData.get(hour)!;
        hourlyEntry.count++;
        if (delivery.status === 'delivered') hourlyEntry.success++;
        if (delivery.status === 'failed' || delivery.status === 'bounced') hourlyEntry.failed++;

        // Daily data
        if (!dailyData.has(day)) {
          dailyData.set(day, { count: 0, success: 0, failed: 0 });
        }
        const dailyEntry = dailyData.get(day)!;
        dailyEntry.count++;
        if (delivery.status === 'delivered') dailyEntry.success++;
        if (delivery.status === 'failed' || delivery.status === 'bounced') dailyEntry.failed++;

        // Error data
        if (delivery.errorCode) {
          errorData.set(delivery.errorCode, (errorData.get(delivery.errorCode) || 0) + 1);
        }
      });

      // Convert maps to arrays
      const hourlyDelivery = Array.from(hourlyData.entries()).map(([hour, data]) => ({
        hour,
        ...data
      }));

      const dailyDelivery = Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        ...data
      }));

      const totalErrors = Array.from(errorData.values()).reduce((sum, count) => sum + count, 0);
      const errorBreakdown = Array.from(errorData.entries()).map(([errorCode, count]) => ({
        errorCode,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }));

      // Mock provider performance (in real implementation, calculate from actual data)
      const providerPerformance = [
        { provider: 'SendGrid', deliveryRate: 98.5, averageTime: 1.2 },
        { provider: 'Twilio', deliveryRate: 97.8, averageTime: 2.1 }
      ];

      // Mock geographic distribution
      const geographicDistribution = [
        { region: 'US-East', count: deliveries.length * 0.4, successRate: 98.2 },
        { region: 'US-West', count: deliveries.length * 0.3, successRate: 97.9 },
        { region: 'US-Central', count: deliveries.length * 0.2, successRate: 98.5 },
        { region: 'Other', count: deliveries.length * 0.1, successRate: 96.8 }
      ];

      return {
        hourlyDelivery,
        dailyDelivery,
        errorBreakdown,
        providerPerformance,
        geographicDistribution
      };
    } catch (error) {
      console.error('Failed to get delivery analytics:', error);
      throw new Error('Analytics calculation failed');
    }
  }

  /**
   * Process webhook events from providers
   */
  async processWebhook(
    provider: 'sendgrid' | 'twilio',
    eventType: string,
    webhookData: any
  ): Promise<void> {
    try {
      console.log(`🔗 Processing webhook: ${provider} - ${eventType}`);

      // Store webhook data
      const webhook: NotificationWebhook = {
        id: Date.now(),
        provider,
        eventType,
        deliveryId: null, // Would be resolved from webhookData
        externalId: webhookData.sg_message_id || webhookData.MessageSid || webhookData.id,
        webhookData,
        processed: false,
        processedAt: null,
        errorMessage: null,
        createdAt: new Date()
      };

      // Process based on provider and event type
      if (provider === 'sendgrid') {
        await this.processSendGridWebhook(webhook);
      } else if (provider === 'twilio') {
        await this.processTwilioWebhook(webhook);
      }

      webhook.processed = true;
      webhook.processedAt = new Date();

      console.log(`✅ Webhook processed: ${provider} - ${eventType}`);
    } catch (error) {
      console.error('Failed to process webhook:', error);
      throw new Error('Webhook processing failed');
    }
  }

  /**
   * Get active delivery alerts
   */
  getActiveAlerts(): DeliveryAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.isResolved);
  }

  /**
   * Resolve delivery alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.isResolved = true;
      return true;
    }
    return false;
  }

  /**
   * Calculate channel-specific metrics
   */
  private calculateChannelMetrics(deliveries: NotificationDelivery[]): DeliveryChannelMetrics {
    const sent = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    const failed = deliveries.filter(d => d.status === 'failed').length;
    const bounced = deliveries.filter(d => d.status === 'bounced').length;
    const opened = deliveries.filter(d => d.openedAt).length;
    const clicked = deliveries.filter(d => d.clickedAt).length;
    const unsubscribed = deliveries.filter(d => d.status === 'unsubscribed').length;

    const deliveredNotifications = deliveries.filter(d => d.deliveredAt && d.sentAt);
    const averageDeliveryTime = deliveredNotifications.length > 0
      ? deliveredNotifications.reduce((sum, d) => {
          const sentTime = new Date(d.sentAt!).getTime();
          const deliveredTime = new Date(d.deliveredAt!).getTime();
          return sum + (deliveredTime - sentTime);
        }, 0) / deliveredNotifications.length / 1000
      : 0;

    return {
      sent,
      delivered,
      failed,
      bounced,
      opened,
      clicked,
      unsubscribed,
      averageDeliveryTime
    };
  }

  /**
   * Process SendGrid webhook
   */
  private async processSendGridWebhook(webhook: NotificationWebhook): Promise<void> {
    const data = webhook.webhookData;
    const externalId = data.sg_message_id;

    if (!externalId) return;

    // Find delivery by external ID
    const delivery = Array.from(this.deliveryCache.values())
      .find(d => d.externalId === externalId);

    if (!delivery) {
      console.warn(`Delivery not found for SendGrid webhook: ${externalId}`);
      return;
    }

    // Map SendGrid events to our status
    let status: string;
    switch (webhook.eventType) {
      case 'delivered':
        status = 'delivered';
        break;
      case 'bounce':
      case 'blocked':
      case 'dropped':
        status = 'bounced';
        break;
      case 'open':
        status = 'delivered'; // Keep status as delivered, just update opened timestamp
        await this.updateDeliveryStatus(delivery.id, 'opened');
        return;
      case 'click':
        await this.updateDeliveryStatus(delivery.id, 'clicked');
        return;
      case 'unsubscribe':
        status = 'unsubscribed';
        break;
      default:
        return; // Unknown event type
    }

    await this.updateDeliveryStatus(delivery.id, status, {
      errorCode: data.reason,
      errorMessage: data.reason,
      providerResponse: data
    });
  }

  /**
   * Process Twilio webhook
   */
  private async processTwilioWebhook(webhook: NotificationWebhook): Promise<void> {
    const data = webhook.webhookData;
    const externalId = data.MessageSid;

    if (!externalId) return;

    const delivery = Array.from(this.deliveryCache.values())
      .find(d => d.externalId === externalId);

    if (!delivery) {
      console.warn(`Delivery not found for Twilio webhook: ${externalId}`);
      return;
    }

    // Map Twilio status to our status
    let status: string;
    switch (data.MessageStatus) {
      case 'delivered':
        status = 'delivered';
        break;
      case 'failed':
      case 'undelivered':
        status = 'failed';
        break;
      default:
        return; // Status we don't track
    }

    await this.updateDeliveryStatus(delivery.id, status, {
      errorCode: data.ErrorCode,
      errorMessage: data.ErrorMessage,
      providerResponse: data,
      cost: parseFloat(data.Price) || 0
    });
  }

  /**
   * Invalidate metrics cache
   */
  private invalidateMetricsCache(campaignId?: number | null): void {
    for (const key of this.metricsCache.keys()) {
      if (campaignId && key.includes(`metrics_${campaignId}_`)) {
        this.metricsCache.delete(key);
      } else if (!campaignId && key.includes('metrics_all_')) {
        this.metricsCache.delete(key);
      }
    }
  }

  /**
   * Start analytics processor (background task)
   */
  private startAnalyticsProcessor(): void {
    setInterval(async () => {
      try {
        // Cleanup old cache entries
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        for (const [key, delivery] of this.deliveryCache.entries()) {
          if (new Date(delivery.createdAt).getTime() < oneHourAgo) {
            this.deliveryCache.delete(key);
          }
        }

        // Clear old metrics cache
        this.metricsCache.clear();
      } catch (error) {
        console.error('Analytics processor error:', error);
      }
    }, 15 * 60 * 1000); // Every 15 minutes
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkDeliveryAlerts();
      } catch (error) {
        console.error('Alert monitoring error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Check for delivery alerts
   */
  private async checkDeliveryAlerts(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent metrics
    const recentMetrics = await this.getDeliveryMetrics(undefined, {
      start: oneHourAgo,
      end: now
    });

    // Check failure rate
    if (recentMetrics.totalSent > 10 && recentMetrics.deliveryRate < (100 - this.alertThresholds.failureRate)) {
      this.createAlert({
        type: 'high_failure_rate',
        severity: 'critical',
        message: `High failure rate detected: ${(100 - recentMetrics.deliveryRate).toFixed(1)}%`,
        threshold: this.alertThresholds.failureRate,
        currentValue: 100 - recentMetrics.deliveryRate
      });
    }

    // Check bounce rate
    if (recentMetrics.totalSent > 10 && recentMetrics.bounceRate > this.alertThresholds.bounceRate) {
      this.createAlert({
        type: 'bounce_spike',
        severity: 'warning',
        message: `High bounce rate detected: ${recentMetrics.bounceRate.toFixed(1)}%`,
        threshold: this.alertThresholds.bounceRate,
        currentValue: recentMetrics.bounceRate
      });
    }

    // Check unsubscribe rate
    if (recentMetrics.totalSent > 10 && recentMetrics.unsubscribeRate > this.alertThresholds.unsubscribeRate) {
      this.createAlert({
        type: 'unsubscribe_spike',
        severity: 'warning',
        message: `High unsubscribe rate detected: ${recentMetrics.unsubscribeRate.toFixed(1)}%`,
        threshold: this.alertThresholds.unsubscribeRate,
        currentValue: recentMetrics.unsubscribeRate
      });
    }

    // Check delivery time
    if (recentMetrics.averageDeliveryTime > this.alertThresholds.deliveryTime) {
      this.createAlert({
        type: 'slow_delivery',
        severity: 'warning',
        message: `Slow delivery detected: ${recentMetrics.averageDeliveryTime.toFixed(1)}s average`,
        threshold: this.alertThresholds.deliveryTime,
        currentValue: recentMetrics.averageDeliveryTime
      });
    }
  }

  /**
   * Create delivery alert
   */
  private createAlert(alertData: Omit<DeliveryAlert, 'id' | 'detectedAt' | 'isResolved'>): void {
    const alertId = `${alertData.type}_${Date.now()}`;
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.type === alertData.type && !alert.isResolved);

    if (existingAlert) {
      // Update existing alert
      existingAlert.currentValue = alertData.currentValue;
      existingAlert.detectedAt = new Date();
    } else {
      // Create new alert
      const alert: DeliveryAlert = {
        id: alertId,
        ...alertData,
        detectedAt: new Date(),
        isResolved: false
      };

      this.activeAlerts.set(alertId, alert);
      console.warn(`🚨 Delivery alert created: ${alert.message}`);
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(): any {
    return {
      cachedDeliveries: this.deliveryCache.size,
      cachedMetrics: this.metricsCache.size,
      activeAlerts: this.getActiveAlerts().length,
      totalAlerts: this.activeAlerts.size
    };
  }
}

// Export singleton instance
export const deliveryTrackingService = new DeliveryTrackingService();
export default deliveryTrackingService;