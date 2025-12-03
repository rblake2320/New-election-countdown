import { 
  NotificationDelivery, 
  InsertNotificationDelivery, 
  NotificationTemplate,
  NotificationCampaign,
  NotificationEvent,
  NotificationSubscription
} from '@shared/schema';
import { sendGridNotificationService } from './sendgrid-notification-service';
import { twilioNotificationService } from './twilio-notification-service';
import { storage } from '../storage';

export interface QueuedNotification {
  id: string;
  type: 'email' | 'sms';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recipient: string;
  content: {
    subject?: string;
    message: string;
    html?: string;
    templateData?: Record<string, any>;
  };
  metadata: {
    campaignId?: number;
    userId?: string;
    subscriptionId?: number;
    templateId?: number;
    eventId?: number;
  };
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  expiresAt?: Date;
}

export interface NotificationQueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
}

export class NotificationQueueService {
  private isProcessing = false;
  private rateLimits = {
    email: 100, // per minute
    sms: 60    // per minute
  };
  
  private lastProcessed = {
    email: 0,
    sms: 0
  };

  constructor() {
    this.startQueueProcessor();
    this.startCleanupTask();
    console.log('✅ Database-backed Notification Queue Service initialized');
  }

  /**
   * Add notification to queue
   */
  async queueNotification(notification: Omit<QueuedNotification, 'id' | 'retryCount'>): Promise<string> {
    try {
      // Create database delivery record
      const deliveryData: InsertNotificationDelivery = {
        campaignId: notification.metadata.campaignId || null,
        userId: notification.metadata.userId || null,
        subscriptionId: notification.metadata.subscriptionId || null,
        templateId: notification.metadata.templateId || null,
        channel: notification.type,
        recipient: notification.recipient,
        subject: notification.content.subject || null,
        content: notification.content.message,
        status: 'queued',
        retryCount: 0,
        queuedAt: notification.scheduledAt || new Date()
      };
      
      const delivery = await storage.createNotificationDelivery(deliveryData);
      
      console.log(`📬 Notification queued: ${delivery.id} (${notification.type})`);
      return delivery.id.toString();
    } catch (error) {
      console.error('Failed to queue notification:', error);
      throw new Error('Failed to queue notification');
    }
  }

  /**
   * Add multiple notifications to queue
   */
  async queueBulkNotifications(notifications: Omit<QueuedNotification, 'id' | 'retryCount'>[]): Promise<string[]> {
    const ids: string[] = [];
    
    for (const notification of notifications) {
      const id = await this.queueNotification(notification);
      ids.push(id);
    }
    
    console.log(`📬 Bulk notifications queued: ${ids.length} notifications`);
    return ids;
  }

  /**
   * Process election event and create notifications
   */
  async processElectionEvent(
    event: NotificationEvent,
    subscriptions: NotificationSubscription[],
    template?: NotificationTemplate
  ): Promise<string[]> {
    const notifications: Omit<QueuedNotification, 'id' | 'retryCount'>[] = [];
    
    for (const subscription of subscriptions) {
      if (!subscription.isActive || !subscription.isVerified) continue;
      
      const priority = event.priority as any || 'normal';
      const scheduledAt = new Date();
      
      // Set urgency-based scheduling
      if (priority === 'urgent') {
        // Immediate delivery
      } else if (priority === 'high') {
        scheduledAt.setMinutes(scheduledAt.getMinutes() + 1);
      } else {
        scheduledAt.setMinutes(scheduledAt.getMinutes() + 5);
      }

      let content: any = {};
      
      if (subscription.channel === 'email') {
        content = {
          subject: this.generateSubjectFromEvent(event),
          message: this.generateTextFromEvent(event),
          html: this.generateHtmlFromEvent(event),
          templateData: event.eventData
        };
      } else if (subscription.channel === 'sms') {
        content = {
          message: this.generateSMSFromEvent(event)
        };
      }

      notifications.push({
        type: subscription.channel as 'email' | 'sms',
        priority,
        recipient: subscription.targetValue!,
        content,
        metadata: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          templateId: template?.id,
          eventId: event.id
        },
        maxRetries: priority === 'urgent' ? 5 : 3,
        scheduledAt,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }
    
    return this.queueBulkNotifications(notifications);
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor() {
    setInterval(async () => {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Queue processor error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process queued notifications
   */
  private async processQueue() {
    try {
      // Get queued notifications from database
      const queuedDeliveries = await storage.getQueuedNotifications(50); // Limit to 50 at a time
      
      if (queuedDeliveries.length === 0) return;
      
      // Filter by rate limits
      const emailDeliveries = queuedDeliveries
        .filter(d => d.channel === 'email')
        .slice(0, this.getRemainingRateLimit('email'));
        
      const smsDeliveries = queuedDeliveries
        .filter(d => d.channel === 'sms')
        .slice(0, this.getRemainingRateLimit('sms'));
      
      // Process both types
      const allDeliveries = [...emailDeliveries, ...smsDeliveries];
      
      for (const delivery of allDeliveries) {
        await this.processNotificationDelivery(delivery);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  /**
   * Process individual notification
   */
  private async processNotification(notification: QueuedNotification) {
    const startTime = Date.now();
    this.processing.add(notification.id);
    
    try {
      let result: any;
      
      if (notification.type === 'email') {
        result = await sendGridNotificationService.sendEmail({
          to: notification.recipient,
          from: 'notifications@electiontracker.app',
          subject: notification.content.subject!,
          text: notification.content.message,
          html: notification.content.html,
          templateData: notification.content.templateData
        });
      } else if (notification.type === 'sms') {
        result = await twilioNotificationService.sendSMS({
          to: notification.recipient,
          message: notification.content.message
        });
      }

      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        this.completed.set(notification.id, {
          success: true,
          timestamp: new Date(),
          processingTime
        });
        
        console.log(`✅ Notification sent: ${notification.id} (${processingTime}ms)`);
      } else {
        throw new Error(result.error || 'Unknown delivery error');
      }
      
      // Remove from queue
      this.queue.delete(notification.id);
      
    } catch (error: any) {
      console.error(`❌ Notification failed: ${notification.id}`, error.message);
      
      notification.retryCount++;
      
      if (notification.retryCount >= notification.maxRetries) {
        // Max retries reached, mark as failed
        this.failed.set(notification.id, {
          error: error.message,
          timestamp: new Date(),
          retryCount: notification.retryCount
        });
        
        this.queue.delete(notification.id);
      } else {
        // Retry with exponential backoff
        const backoffMinutes = Math.pow(2, notification.retryCount) * 5; // 5, 10, 20, 40 minutes
        notification.scheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        
        console.log(`🔄 Retrying notification ${notification.id} in ${backoffMinutes} minutes (attempt ${notification.retryCount}/${notification.maxRetries})`);
      }
    } finally {
      this.processing.delete(notification.id);
      this.updateRateLimit(notification.type);
    }
  }

  /**
   * Get remaining rate limit for type
   */
  private getRemainingRateLimit(type: 'email' | 'sms'): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    if (this.lastProcessed[type] < oneMinuteAgo) {
      // Reset counter if more than a minute has passed
      return this.rateLimits[type];
    }
    
    // Calculate based on current processing
    const currentProcessing = Array.from(this.processing.values()).filter(id => {
      const notification = this.queue.get(id);
      return notification?.type === type;
    }).length;
    
    return Math.max(0, this.rateLimits[type] - currentProcessing);
  }

  /**
   * Update rate limit tracking
   */
  private updateRateLimit(type: 'email' | 'sms') {
    this.lastProcessed[type] = Date.now();
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): NotificationQueueStats {
    const queued = this.queue.size;
    const processing = this.processing.size;
    const completedEntries = Array.from(this.completed.values());
    const failedEntries = Array.from(this.failed.values());
    
    const totalProcessed = completedEntries.length + failedEntries.length;
    const successful = completedEntries.length;
    
    const averageProcessingTime = completedEntries.length > 0
      ? completedEntries.reduce((sum, entry) => sum + entry.processingTime, 0) / completedEntries.length
      : 0;
    
    const successRate = totalProcessed > 0 ? (successful / totalProcessed) * 100 : 0;

    return {
      queued,
      processing,
      completed: successful,
      failed: failedEntries.length,
      totalProcessed,
      averageProcessingTime,
      successRate
    };
  }

  /**
   * Get detailed queue status
   */
  getDetailedStatus() {
    return {
      stats: this.getQueueStats(),
      queuedNotifications: Array.from(this.queue.values()),
      recentCompleted: Array.from(this.completed.entries()).slice(-10),
      recentFailed: Array.from(this.failed.entries()).slice(-10),
      rateLimits: this.rateLimits,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clear completed and failed entries (cleanup task)
   */
  private startCleanupTask() {
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Clean completed entries older than 1 hour
      for (const [id, entry] of this.completed.entries()) {
        if (entry.timestamp < oneHourAgo) {
          this.completed.delete(id);
        }
      }
      
      // Clean failed entries older than 1 hour
      for (const [id, entry] of this.failed.entries()) {
        if (entry.timestamp < oneHourAgo) {
          this.failed.delete(id);
        }
      }
      
      // Remove expired notifications from queue
      for (const [id, notification] of this.queue.entries()) {
        if (notification.expiresAt && notification.expiresAt < new Date()) {
          this.queue.delete(id);
          console.log(`🗑️ Expired notification removed: ${id}`);
        }
      }
    }, 15 * 60 * 1000); // Every 15 minutes
  }

  /**
   * Generate event-based content
   */
  private generateSubjectFromEvent(event: NotificationEvent): string {
    switch (event.eventType) {
      case 'election_result':
        return `🗳️ Election Results: ${event.eventData.electionTitle}`;
      case 'candidate_update':
        return `📢 Candidate Update: ${event.eventData.candidateName}`;
      case 'breaking_news':
        return `🚨 Breaking Election News`;
      case 'deadline_reminder':
        return `⏰ Election Deadline Reminder`;
      default:
        return 'Election Tracker Alert';
    }
  }

  private generateTextFromEvent(event: NotificationEvent): string {
    return event.eventData.message || 'New election update available.';
  }

  private generateHtmlFromEvent(event: NotificationEvent): string {
    return `<div style="font-family: Arial, sans-serif;">
      <h2>${this.generateSubjectFromEvent(event)}</h2>
      <p>${this.generateTextFromEvent(event)}</p>
    </div>`;
  }

  private generateSMSFromEvent(event: NotificationEvent): string {
    const emoji = event.eventType === 'election_result' ? '🗳️' : 
                  event.eventType === 'breaking_news' ? '🚨' : 
                  event.eventType === 'deadline_reminder' ? '⏰' : '📢';
    
    return `${emoji} ${event.eventData.message || 'Election update'}\n\nReply STOP to unsubscribe`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cancel queued notification
   */
  cancelNotification(id: string): boolean {
    if (this.queue.has(id) && !this.processing.has(id)) {
      this.queue.delete(id);
      console.log(`❌ Notification cancelled: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Update rate limits
   */
  updateRateLimits(email: number, sms: number) {
    this.rateLimits.email = email;
    this.rateLimits.sms = sms;
    console.log(`📊 Rate limits updated: email=${email}/min, sms=${sms}/min`);
  }
}

// Export singleton instance
export const notificationQueueService = new NotificationQueueService();
export default notificationQueueService;