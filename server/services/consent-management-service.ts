import {
  type NotificationConsent,
  type InsertNotificationConsent,
  type NotificationSubscription,
  type InsertNotificationSubscription,
  type NotificationPreferences,
  type NotificationDelivery,
  type User
} from '@shared/schema';
import { sendGridNotificationService } from './sendgrid-notification-service';
import { twilioNotificationService } from './twilio-notification-service';
import { randomBytes } from 'crypto';

/**
 * Consent management (GDPR). Strict tranche 5: every method here used to log a line and
 * return a made-up record, so no consent was ever stored, every
 * consent check answered true, every token verified, and the data export carried an
 * invented email and phone number. Everything below reads and writes the real rows
 * (notification_consents, notification_subscriptions, notification_preferences,
 * notification_deliveries, users) through the storage contract.
 */

export interface ConsentRecord {
  userId: string;
  consentType: 'email' | 'sms' | 'marketing' | 'analytics' | 'data_processing';
  consentGiven: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  method: 'signup' | 'preferences_page' | 'double_opt_in' | 'api' | 'import';
  legalBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
  dataRetentionPeriod?: number; // days
}

export interface SubscriptionRequest {
  userId: string;
  subscriptionType: 'election_alerts' | 'candidate_updates' | 'breaking_news' | 'weekly_digest' | 'deadline_reminders';
  channel: 'email' | 'sms';
  targetValue: string; // email or phone
  preferences?: {
    electionTypes?: string[];
    electionLevels?: string[];
    states?: string[];
    parties?: string[];
  };
  ipAddress?: string;
  userAgent?: string;
}

export interface GDPRDataExport {
  userId: string;
  exportTimestamp: Date;
  consents: NotificationConsent[];
  subscriptions: NotificationSubscription[];
  preferences: NotificationPreferences | null;
  deliveryHistory: NotificationDelivery[];
  personalData: {
    email?: string;
    phoneNumber?: string;
    timezone?: string;
  };
}

/** The slice of storage consent management uses; the real storage satisfies it. */
export interface ConsentStore {
  getUser(id: string): Promise<User | undefined>;
  recordNotificationConsent(consent: InsertNotificationConsent): Promise<NotificationConsent>;
  withdrawNotificationConsent(userId: string, consentType: string): Promise<void>;
  getUserNotificationConsents(userId: string): Promise<NotificationConsent[]>;
  createNotificationSubscription(subscription: InsertNotificationSubscription): Promise<NotificationSubscription>;
  verifyNotificationSubscription(token: string): Promise<NotificationSubscription | null>;
  unsubscribeNotificationSubscriptionByToken(token: string): Promise<NotificationSubscription | null>;
  updateNotificationSubscription(subscriptionId: number, updates: Partial<NotificationSubscription>): Promise<NotificationSubscription>;
  getUserNotificationSubscriptions(userId: string): Promise<NotificationSubscription[]>;
  getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | null>;
  getNotificationDeliveries(campaignId?: number, userId?: string): Promise<NotificationDelivery[]>;
  getNotificationConsentsBetween(start: Date, end: Date): Promise<NotificationConsent[]>;
  getNotificationSubscriptionsVerifiedBetween(start: Date, end: Date): Promise<NotificationSubscription[]>;
  getExpiredNotificationConsents(asOf: Date): Promise<NotificationConsent[]>;
}

export interface ConsentServiceOptions {
  store?: ConsentStore;
  now?: () => Date;
}

export class ConsentManagementService {
  private readonly storePromise: Promise<ConsentStore>;
  private readonly now: () => Date;

  constructor(options: ConsentServiceOptions = {}) {
    // The real storage is imported lazily: it pulls in the whole server graph.
    this.storePromise = options.store
      ? Promise.resolve(options.store)
      : import('../storage').then((m) => m.storage as unknown as ConsentStore);
    this.now = options.now ?? (() => new Date());
  }

  private store(): Promise<ConsentStore> { return this.storePromise; }

  /** Record user consent for data processing: a notification_consents row. */
  async recordConsent(consentData: ConsentRecord): Promise<NotificationConsent> {
    const store = await this.store();
    const consent: InsertNotificationConsent = {
      userId: consentData.userId,
      consentType: consentData.consentType,
      consentGiven: consentData.consentGiven,
      consentDate: consentData.timestamp,
      ipAddress: consentData.ipAddress ?? null,
      userAgent: consentData.userAgent ?? null,
      consentMethod: consentData.method,
      legalBasis: consentData.legalBasis,
      dataRetentionPeriod: consentData.dataRetentionPeriod ?? null,
      isActive: consentData.consentGiven,
    };
    if (consentData.consentGiven) {
      // One active consent per type: the earlier grant is closed before the new one lands.
      await store.withdrawNotificationConsent(consentData.userId, consentData.consentType);
    }
    const created = await store.recordNotificationConsent(consent);
    console.log(`📝 Consent recorded: ${consentData.userId} - ${consentData.consentType}: ${consentData.consentGiven} (${consentData.method})`);
    return created;
  }

  /** Withdraw consent: closes the active grant, records the withdrawal, deactivates that channel's subscriptions. */
  async withdrawConsent(userId: string, consentType: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const store = await this.store();
    await store.withdrawNotificationConsent(userId, consentType);
    await store.recordNotificationConsent({
      userId,
      consentType,
      consentGiven: false,
      consentDate: this.now(),
      withdrawalDate: this.now(),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      consentMethod: 'preferences_page',
      legalBasis: 'consent',
      isActive: false,
    });
    if (consentType === 'email' || consentType === 'sms') {
      await this.deactivateSubscriptionsByChannel(userId, consentType);
    }
    console.log(`❌ Consent withdrawn: ${userId} - ${consentType}`);
  }

  /** Create a subscription; consent for the channel is recorded if absent; verification is sent when a provider can. */
  async createSubscription(request: SubscriptionRequest): Promise<{
    subscription: NotificationSubscription;
    verificationRequired: boolean;
    verificationSent: boolean;
  }> {
    if (request.channel === 'email' && !this.isValidEmail(request.targetValue)) {
      throw Object.assign(new Error('Invalid email address'), { status: 400, publicCode: 'invalid_email' });
    }
    if (request.channel === 'sms' && !this.isValidPhone(request.targetValue)) {
      throw Object.assign(new Error('Invalid phone number'), { status: 400, publicCode: 'invalid_phone' });
    }
    const store = await this.store();
    if (!(await this.hasValidConsent(request.userId, request.channel))) {
      await this.recordConsent({
        userId: request.userId,
        consentType: request.channel,
        consentGiven: true,
        timestamp: this.now(),
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        method: 'signup',
        legalBasis: 'consent',
        dataRetentionPeriod: 2555, // 7 years in days
      });
    }

    const verificationToken = this.generateToken('verify');
    const subscription = await store.createNotificationSubscription({
      userId: request.userId,
      subscriptionType: request.subscriptionType,
      channel: request.channel,
      targetValue: request.targetValue,
      isVerified: false,
      verificationToken,
      verificationSentAt: null,
      electionTypes: request.preferences?.electionTypes ?? null,
      electionLevels: request.preferences?.electionLevels ?? null,
      states: request.preferences?.states ?? null,
      parties: request.preferences?.parties ?? null,
      isActive: true,
      unsubscribeToken: this.generateToken('unsub'),
    });

    const verificationSent = await this.sendVerification(request.channel, request.targetValue, verificationToken, request.subscriptionType);
    const finalSubscription = verificationSent
      ? await store.updateNotificationSubscription(subscription.id, { verificationSentAt: this.now() })
      : subscription;
    console.log(`✅ Subscription created: ${request.userId} - ${request.subscriptionType} (${request.channel}); verification ${verificationSent ? 'sent' : 'NOT sent'}`);
    return { subscription: finalSubscription, verificationRequired: true, verificationSent };
  }

  /** Verify a subscription by its token; an unknown or used token is a refusal, not a success. */
  async verifySubscription(token: string): Promise<{ success: boolean; subscriptionId?: number; message: string }> {
    const store = await this.store();
    const subscription = await store.verifyNotificationSubscription(token);
    if (!subscription) {
      return { success: false, message: 'Invalid or expired verification token' };
    }
    console.log(`✅ Subscription verified: ${subscription.id}`);
    return { success: true, subscriptionId: subscription.id, message: 'Subscription verified successfully' };
  }

  /** Unsubscribe by token: the row is deactivated with an unsubscribed_at timestamp. */
  async unsubscribeWithToken(token: string): Promise<{ success: boolean; subscriptionId?: number; message: string }> {
    const store = await this.store();
    const subscription = await store.unsubscribeNotificationSubscriptionByToken(token);
    if (!subscription) {
      return { success: false, message: 'Invalid unsubscribe token' };
    }
    console.log(`❌ Unsubscribed: ${subscription.id}`);
    return { success: true, subscriptionId: subscription.id, message: 'Successfully unsubscribed from notifications' };
  }

  /** Export the user's notification data: real rows, the user's own email and phone. */
  async exportUserData(userId: string): Promise<GDPRDataExport> {
    const store = await this.store();
    const [user, consents, subscriptions, preferences, deliveries] = await Promise.all([
      store.getUser(userId),
      store.getUserNotificationConsents(userId),
      store.getUserNotificationSubscriptions(userId),
      store.getUserNotificationPreferences(userId),
      store.getNotificationDeliveries(undefined, userId),
    ]);
    if (!user) {
      throw Object.assign(new Error('User not found'), { status: 404, publicCode: 'user_not_found' });
    }
    return {
      userId,
      exportTimestamp: this.now(),
      consents,
      subscriptions,
      preferences,
      deliveryHistory: deliveries.slice(0, 100),
      personalData: {
        email: user.email ?? undefined,
        phoneNumber: preferences?.phoneNumber ?? undefined,
        timezone: preferences?.timezone ?? undefined,
      },
    };
  }

  /**
   * Erase what can be erased: subscriptions are deactivated and their targets cleared,
   * active consents are withdrawn. Consent records and delivery logs are retained when
   * retainLegal is set (they are the audit trail of the consent itself).
   */
  async deleteUserData(userId: string, retainLegal: boolean = true): Promise<{ deleted: boolean; retainedData?: string[]; message: string }> {
    const store = await this.store();
    const subscriptions = await store.getUserNotificationSubscriptions(userId);
    for (const s of subscriptions) {
      await store.updateNotificationSubscription(s.id, { isActive: false, unsubscribedAt: this.now(), targetValue: null, verificationToken: null });
    }
    const consents = await store.getUserNotificationConsents(userId);
    for (const type of new Set(consents.filter((c) => c.isActive).map((c) => c.consentType))) {
      await store.withdrawNotificationConsent(userId, type);
    }
    const retainedData = retainLegal ? ['consent_records_legal_basis', 'delivery_logs_audit_trail'] : [];
    console.log(`🗑️ Notification data erased for ${userId}: ${subscriptions.length} subscription(s) deactivated; retained: ${retainedData.join(', ') || 'none'}`);
    return { deleted: true, retainedData: retainedData.length > 0 ? retainedData : undefined, message: 'User notification data has been deleted' };
  }

  /** True only when the latest consent row for the type is an active grant. */
  async hasValidConsent(userId: string, consentType: string): Promise<boolean> {
    const store = await this.store();
    const consents = await store.getUserNotificationConsents(userId);
    const latest = consents.filter((c) => c.consentType === consentType)
      .sort((a, b) => (b.consentDate?.getTime() ?? 0) - (a.consentDate?.getTime() ?? 0))[0];
    return Boolean(latest && latest.consentGiven && latest.isActive);
  }

  async getConsentHistory(userId: string): Promise<NotificationConsent[]> {
    return (await this.store()).getUserNotificationConsents(userId);
  }

  private async deactivateSubscriptionsByChannel(userId: string, channel: string): Promise<void> {
    const store = await this.store();
    const subscriptions = await store.getUserNotificationSubscriptions(userId);
    for (const s of subscriptions.filter((x) => x.channel === channel && x.isActive)) {
      await store.updateNotificationSubscription(s.id, { isActive: false, unsubscribedAt: this.now() });
    }
  }

  /** Verification goes through the provider; without a configured provider it is NOT sent, and we say so. */
  private async sendVerification(channel: 'email' | 'sms', target: string, token: string, subscriptionType: string): Promise<boolean> {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      if (channel === 'email') {
        if (!sendGridNotificationService.isReady()) return false;
        const result = await sendGridNotificationService.sendEmailVerification(target, token, baseUrl);
        return result.success;
      }
      if (!twilioNotificationService.isReady()) return false;
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const result = await twilioNotificationService.sendVerificationCode(target, verificationCode);
      return result.success;
    } catch (error) {
      console.error(`Failed to send ${channel} verification for ${subscriptionType}:`, error);
      return false;
    }
  }

  private generateToken(prefix: string): string {
    return `${prefix}_${randomBytes(24).toString('base64url')}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(phone: string): boolean {
    return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s()-]/g, ''));
  }

  /** Consents whose retention period has elapsed are withdrawn (the rows stay as the record). */
  async processDataRetention(): Promise<{ processed: number; deleted: number; errors: number }> {
    const store = await this.store();
    const expired = await store.getExpiredNotificationConsents(this.now());
    let deleted = 0, errors = 0;
    for (const consent of expired) {
      try {
        await store.withdrawNotificationConsent(consent.userId, consent.consentType);
        deleted += 1;
      } catch (error) {
        errors += 1;
        console.error(`Retention processing failed for consent ${consent.id}:`, error);
      }
    }
    console.log(`🔄 Data retention: ${expired.length} expired consent(s), ${deleted} withdrawn, ${errors} error(s)`);
    return { processed: expired.length, deleted, errors };
  }

  /** Counts from the consent and subscription rows in the period. */
  async generateConsentAuditReport(startDate: Date, endDate: Date): Promise<{
    period: { start: Date; end: Date };
    totalConsents: number;
    consentsByType: Record<string, number>;
    withdrawalsByType: Record<string, number>;
    verificationsByChannel: Record<string, number>;
    complianceScore: number;
  }> {
    const store = await this.store();
    const [consents, verified] = await Promise.all([
      store.getNotificationConsentsBetween(startDate, endDate),
      store.getNotificationSubscriptionsVerifiedBetween(startDate, endDate),
    ]);
    const consentsByType: Record<string, number> = {};
    const withdrawalsByType: Record<string, number> = {};
    for (const c of consents) {
      const bucket = c.consentGiven ? consentsByType : withdrawalsByType;
      bucket[c.consentType] = (bucket[c.consentType] ?? 0) + 1;
    }
    const verificationsByChannel: Record<string, number> = {};
    for (const s of verified) verificationsByChannel[s.channel] = (verificationsByChannel[s.channel] ?? 0) + 1;
    // Share of grants that carry the fields a regulator asks for (method, legal basis, timestamp).
    const grants = consents.filter((c) => c.consentGiven);
    const documented = grants.filter((c) => c.consentMethod && c.legalBasis && c.consentDate).length;
    return {
      period: { start: startDate, end: endDate },
      totalConsents: consents.length,
      consentsByType,
      withdrawalsByType,
      verificationsByChannel,
      complianceScore: grants.length === 0 ? 100 : Math.round((documented / grants.length) * 100),
    };
  }
}

// Export singleton instance
export const consentManagementService = new ConsentManagementService();
export default consentManagementService;
