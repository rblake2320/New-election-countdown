import { and, eq, lt } from 'drizzle-orm';
import {
  notificationDeliveries,
  type NotificationDelivery,
  type InsertNotificationDelivery,
  type NotificationTemplate,
  type NotificationEvent,
  type NotificationSubscription
} from '@shared/schema';
import { sendGridNotificationService } from './sendgrid-notification-service';
import { twilioNotificationService } from './twilio-notification-service';
import { storage } from '../storage';
import { db } from '../db';

/**
 * Database-backed notification queue (strict tranche 3).
 *
 * The queue rows live in notification_deliveries. The processor used to call
 * `this.processNotificationDelivery`, which did not exist, and the stats read in-memory maps
 * that were never declared: every tick logged a TypeError and no queued notification was
 * ever sent. Everything below reads and writes the delivery rows:
 *  - due rows (status queued, nextRetryAt not in the future) go to SendGrid / Twilio;
 *  - a channel whose provider is not configured marks its rows failed with
 *    `provider_not_configured` (no retry storm, no pretending);
 *  - success -> sent + externalId; failure -> retry with exponential backoff up to
 *    MAX_RETRIES, then failed with the provider's error;
 *  - stats come from the table, not from this process's memory.
 */

export type NotificationChannel = 'email' | 'sms';

export interface QueuedNotification {
  id: string;
  type: NotificationChannel;
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

export interface ProviderSendResult { success: boolean; messageId?: string; error?: string; statusCode?: number }
export interface DeliveryProvider {
  isReady(): boolean;
  getStatus(): { configured: boolean; error?: string };
  send(delivery: NotificationDelivery): Promise<ProviderSendResult>;
}

/** The slice of storage the queue uses; the real storage satisfies it. */
export interface DeliveryStore {
  createNotificationDelivery(delivery: InsertNotificationDelivery): Promise<NotificationDelivery>;
  getQueuedNotifications(limit?: number): Promise<NotificationDelivery[]>;
  updateNotificationDelivery(id: number, updates: Partial<NotificationDelivery>): Promise<NotificationDelivery>;
  getNotificationDeliveryStats(campaignId?: number): Promise<{ total: number; queued: number; sending: number; sent: number; delivered: number; failed: number; bounced: number; opened: number; clicked: number }>;
}

export interface NotificationQueueOptions {
  store?: DeliveryStore;
  providers?: Record<NotificationChannel, DeliveryProvider>;
  /** false disables the interval timers (tests drive processQueue directly). */
  timers?: boolean;
  now?: () => number;
}

export const MAX_RETRIES = 3;
export const QUEUE_BATCH = 50;
const EXPIRE_AFTER_MS = 24 * 60 * 60 * 1000;

const emailProvider: DeliveryProvider = {
  isReady: () => sendGridNotificationService.isReady(),
  getStatus: () => sendGridNotificationService.getStatus(),
  send: (d) => sendGridNotificationService.sendEmail({
    to: d.recipient,
    from: process.env.NOTIFICATION_FROM_EMAIL || 'notifications@electiontracker.app',
    subject: d.subject || 'Election Tracker Alert',
    text: d.content,
  }),
};
const smsProvider: DeliveryProvider = {
  isReady: () => twilioNotificationService.isReady(),
  getStatus: () => twilioNotificationService.getStatus(),
  send: (d) => twilioNotificationService.sendSMS({ to: d.recipient, message: d.content }),
};

export class NotificationQueueService {
  private isProcessing = false;
  private rateLimits: Record<NotificationChannel, number> = { email: 100, sms: 60 }; // per minute
  private window: Record<NotificationChannel, { startedAt: number; sent: number }> = {
    email: { startedAt: 0, sent: 0 },
    sms: { startedAt: 0, sent: 0 },
  };
  private processingTimesMs: number[] = []; // this process, last 200 sends
  private providerWarned: Record<NotificationChannel, boolean> = { email: false, sms: false };
  private readonly store: DeliveryStore;
  private readonly providers: Record<NotificationChannel, DeliveryProvider>;
  private readonly now: () => number;
  private timers: NodeJS.Timeout[] = [];

  constructor(options: NotificationQueueOptions = {}) {
    this.store = options.store ?? (storage as unknown as DeliveryStore);
    this.providers = options.providers ?? { email: emailProvider, sms: smsProvider };
    this.now = options.now ?? (() => Date.now());
    if (options.timers !== false) {
      this.startQueueProcessor();
      this.startCleanupTask();
      console.log('✅ Database-backed Notification Queue Service initialized');
    }
  }

  /** Add notification to queue (a notification_deliveries row in status queued). */
  async queueNotification(notification: Omit<QueuedNotification, 'id' | 'retryCount'>): Promise<string> {
    try {
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
        queuedAt: notification.scheduledAt || new Date(this.now()),
        // A scheduled delivery is simply not due before its time.
        nextRetryAt: notification.scheduledAt && notification.scheduledAt.getTime() > this.now() ? notification.scheduledAt : null,
      };
      const delivery = await this.store.createNotificationDelivery(deliveryData);
      console.log(`📬 Notification queued: ${delivery.id} (${notification.type})`);
      return delivery.id.toString();
    } catch (error) {
      console.error('Failed to queue notification:', error);
      throw new Error('Failed to queue notification');
    }
  }

  async queueBulkNotifications(notifications: Omit<QueuedNotification, 'id' | 'retryCount'>[]): Promise<string[]> {
    const ids: string[] = [];
    for (const notification of notifications) {
      ids.push(await this.queueNotification(notification));
    }
    console.log(`📬 Bulk notifications queued: ${ids.length} notifications`);
    return ids;
  }

  /** Turn an election event into one queued delivery per active, verified email/sms subscription. */
  async processElectionEvent(
    event: NotificationEvent,
    subscriptions: NotificationSubscription[],
    template?: NotificationTemplate
  ): Promise<string[]> {
    const notifications: Omit<QueuedNotification, 'id' | 'retryCount'>[] = [];
    for (const subscription of subscriptions) {
      if (!subscription.isActive || !subscription.isVerified) continue;
      if (subscription.channel !== 'email' && subscription.channel !== 'sms') continue;
      if (!subscription.targetValue) continue;

      const priority = (event.priority as QueuedNotification['priority']) || 'normal';
      const scheduledAt = new Date(this.now());
      if (priority === 'high') scheduledAt.setMinutes(scheduledAt.getMinutes() + 1);
      else if (priority !== 'urgent') scheduledAt.setMinutes(scheduledAt.getMinutes() + 5);

      const content = subscription.channel === 'email'
        ? { subject: this.generateSubjectFromEvent(event), message: this.generateTextFromEvent(event), html: this.generateHtmlFromEvent(event), templateData: this.eventData(event) }
        : { message: this.generateSMSFromEvent(event) };

      notifications.push({
        type: subscription.channel,
        priority,
        recipient: subscription.targetValue,
        content,
        metadata: { userId: subscription.userId, subscriptionId: subscription.id, templateId: template?.id, eventId: event.id },
        maxRetries: priority === 'urgent' ? 5 : MAX_RETRIES,
        scheduledAt,
        expiresAt: new Date(this.now() + EXPIRE_AFTER_MS),
      });
    }
    return this.queueBulkNotifications(notifications);
  }

  // ---------------------------------------------------------------- processing

  private startQueueProcessor() {
    this.timers.push(setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Queue processor error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 5000));
  }

  /** One pass: send every due, rate-limit-admissible queued row. Returns how many were attempted. */
  async processQueue(): Promise<number> {
    const queued = await this.store.getQueuedNotifications(QUEUE_BATCH);
    if (queued.length === 0) return 0;
    const now = this.now();
    const due = queued.filter((d) => !d.nextRetryAt || new Date(d.nextRetryAt).getTime() <= now);
    const batch = [
      ...due.filter((d) => d.channel === 'email').slice(0, this.remainingRateLimit('email')),
      ...due.filter((d) => d.channel === 'sms').slice(0, this.remainingRateLimit('sms')),
    ];
    for (const delivery of batch) {
      await this.processNotificationDelivery(delivery);
    }
    return batch.length;
  }

  /** Send one delivery row and record exactly what happened on it. */
  async processNotificationDelivery(delivery: NotificationDelivery): Promise<NotificationDelivery> {
    const channel: NotificationChannel | null = delivery.channel === 'sms' ? 'sms' : delivery.channel === 'email' ? 'email' : null;
    if (!channel) {
      return this.store.updateNotificationDelivery(delivery.id, {
        status: 'failed', failedAt: new Date(this.now()), errorCode: 'unsupported_channel', errorMessage: `Unsupported channel: ${delivery.channel}`,
      });
    }
    const provider = this.providers[channel];
    if (!provider.isReady()) {
      if (!this.providerWarned[channel]) {
        this.providerWarned[channel] = true;
        console.warn(`⚠️ ${channel} notifications cannot be sent: ${provider.getStatus().error ?? 'provider not configured'}`);
      }
      return this.store.updateNotificationDelivery(delivery.id, {
        status: 'failed', failedAt: new Date(this.now()), errorCode: 'provider_not_configured',
        errorMessage: provider.getStatus().error ?? `${channel} provider not configured`,
      });
    }

    await this.store.updateNotificationDelivery(delivery.id, { status: 'sending' });
    const started = this.now();
    let result: ProviderSendResult;
    try {
      result = await provider.send(delivery);
    } catch (error) {
      result = { success: false, error: error instanceof Error ? error.message : String(error) };
    }
    this.countSend(channel, this.now() - started);

    if (result.success) {
      console.log(`✅ Notification sent: ${delivery.id} (${channel})`);
      return this.store.updateNotificationDelivery(delivery.id, {
        status: 'sent', sentAt: new Date(this.now()), externalId: result.messageId ?? null, errorCode: null, errorMessage: null,
        providerResponse: { messageId: result.messageId ?? null, statusCode: result.statusCode ?? null },
      });
    }

    const retryCount = (delivery.retryCount ?? 0) + 1;
    const error = result.error ?? 'Unknown delivery error';
    if (retryCount >= MAX_RETRIES) {
      console.error(`❌ Notification failed permanently: ${delivery.id} (${channel}) after ${retryCount} attempts: ${error}`);
      return this.store.updateNotificationDelivery(delivery.id, {
        status: 'failed', failedAt: new Date(this.now()), retryCount, errorCode: 'provider_error', errorMessage: error,
        providerResponse: { statusCode: result.statusCode ?? null, error },
      });
    }
    const backoffMinutes = Math.pow(2, retryCount) * 5; // 10, 20 minutes
    console.log(`🔄 Retrying notification ${delivery.id} in ${backoffMinutes} minutes (attempt ${retryCount}/${MAX_RETRIES}): ${error}`);
    return this.store.updateNotificationDelivery(delivery.id, {
      status: 'queued', retryCount, nextRetryAt: new Date(this.now() + backoffMinutes * 60 * 1000), errorCode: 'provider_error', errorMessage: error,
    });
  }

  private remainingRateLimit(channel: NotificationChannel): number {
    const w = this.window[channel];
    if (this.now() - w.startedAt >= 60_000) return this.rateLimits[channel];
    return Math.max(0, this.rateLimits[channel] - w.sent);
  }

  private countSend(channel: NotificationChannel, durationMs: number) {
    const w = this.window[channel];
    if (this.now() - w.startedAt >= 60_000) { w.startedAt = this.now(); w.sent = 0; }
    w.sent += 1;
    this.processingTimesMs.push(durationMs);
    if (this.processingTimesMs.length > 200) this.processingTimesMs.shift();
  }

  // ---------------------------------------------------------------- status

  /** Queue statistics from the delivery table (this process only contributes the timing sample). */
  async getQueueStats(): Promise<NotificationQueueStats> {
    const s = await this.store.getNotificationDeliveryStats();
    const completed = s.sent + s.delivered;
    const totalProcessed = completed + s.failed + s.bounced;
    const averageProcessingTime = this.processingTimesMs.length > 0
      ? this.processingTimesMs.reduce((a, b) => a + b, 0) / this.processingTimesMs.length
      : 0;
    return {
      queued: s.queued,
      processing: s.sending,
      completed,
      failed: s.failed + s.bounced,
      totalProcessed,
      averageProcessingTime,
      successRate: totalProcessed > 0 ? (completed / totalProcessed) * 100 : 0,
    };
  }

  async getDetailedStatus() {
    return {
      stats: await this.getQueueStats(),
      queuedNotifications: await this.store.getQueuedNotifications(20),
      providers: { email: this.providers.email.getStatus(), sms: this.providers.sms.getStatus() },
      rateLimits: this.rateLimits,
      isProcessing: this.isProcessing,
      timingSampleSize: this.processingTimesMs.length,
    };
  }

  /** Cancel a queued delivery; a row already sending/sent is left alone. */
  async cancelNotification(id: number | string): Promise<boolean> {
    const numeric = Number(id);
    if (!Number.isInteger(numeric)) return false;
    const [row] = await db.update(notificationDeliveries)
      .set({ status: 'cancelled', failedAt: new Date(this.now()), errorCode: 'cancelled', updatedAt: new Date(this.now()) })
      .where(and(eq(notificationDeliveries.id, numeric), eq(notificationDeliveries.status, 'queued')))
      .returning({ id: notificationDeliveries.id });
    if (row) console.log(`❌ Notification cancelled: ${row.id}`);
    return Boolean(row);
  }

  /** Rows queued for more than 24 h without a send are expired, on the row, every 15 minutes. */
  private startCleanupTask() {
    this.timers.push(setInterval(async () => {
      try {
        const cutoff = new Date(this.now() - EXPIRE_AFTER_MS);
        const expired = await db.update(notificationDeliveries)
          .set({ status: 'expired', failedAt: new Date(this.now()), errorCode: 'expired', errorMessage: 'Not sent within 24 hours of queueing', updatedAt: new Date(this.now()) })
          .where(and(eq(notificationDeliveries.status, 'queued'), lt(notificationDeliveries.queuedAt, cutoff)))
          .returning({ id: notificationDeliveries.id });
        if (expired.length > 0) console.log(`🗑️ Expired ${expired.length} queued notification(s) older than 24 h`);
      } catch (error) {
        console.error('Notification queue cleanup error:', error);
      }
    }, 15 * 60 * 1000));
  }

  updateRateLimits(email: number, sms: number) {
    this.rateLimits.email = email;
    this.rateLimits.sms = sms;
    console.log(`📊 Rate limits updated: email=${email}/min, sms=${sms}/min`);
  }

  destroy(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  // ---------------------------------------------------------------- content

  private eventData(event: NotificationEvent): Record<string, any> {
    return (event.eventData && typeof event.eventData === 'object') ? (event.eventData as Record<string, any>) : {};
  }

  private generateSubjectFromEvent(event: NotificationEvent): string {
    const data = this.eventData(event);
    switch (event.eventType) {
      case 'election_result':
        return `🗳️ Election Results: ${data.electionTitle ?? ''}`.trim();
      case 'candidate_update':
        return `📢 Candidate Update: ${data.candidateName ?? ''}`.trim();
      case 'breaking_news':
        return '🚨 Breaking Election News';
      case 'deadline_reminder':
        return '⏰ Election Deadline Reminder';
      default:
        return 'Election Tracker Alert';
    }
  }

  private generateTextFromEvent(event: NotificationEvent): string {
    return this.eventData(event).message || 'New election update available.';
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
    return `${emoji} ${this.generateTextFromEvent(event)}\n\nReply STOP to unsubscribe`;
  }
}

// Export singleton instance
export const notificationQueueService = new NotificationQueueService();
export default notificationQueueService;
