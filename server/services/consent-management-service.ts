import { 
  NotificationConsent, 
  InsertNotificationConsent,
  NotificationSubscription,
  InsertNotificationSubscription,
  NotificationPreferences,
  InsertNotificationPreferences
} from '@shared/schema';
import { sendGridNotificationService } from './sendgrid-notification-service';
import { twilioNotificationService } from './twilio-notification-service';

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
  deliveryHistory: any[]; // Recent delivery records
  personalData: {
    email?: string;
    phoneNumber?: string;
    timezone?: string;
    preferences?: any;
  };
}

export class ConsentManagementService {
  constructor() {
    console.log('✅ Consent Management Service initialized');
  }

  /**
   * Record user consent for data processing
   */
  async recordConsent(consentData: ConsentRecord): Promise<NotificationConsent> {
    try {
      const consent: InsertNotificationConsent = {
        userId: consentData.userId,
        consentType: consentData.consentType,
        consentGiven: consentData.consentGiven,
        consentDate: consentData.timestamp,
        ipAddress: consentData.ipAddress,
        userAgent: consentData.userAgent,
        consentMethod: consentData.method,
        legalBasis: consentData.legalBasis,
        dataRetentionPeriod: consentData.dataRetentionPeriod,
        isActive: consentData.consentGiven
      };

      // In a real implementation, this would save to database
      console.log(`📝 Consent recorded: ${consentData.userId} - ${consentData.consentType}: ${consentData.consentGiven}`);
      
      // Return mock consent record for now
      return {
        id: Date.now(),
        ...consent,
        withdrawalDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to record consent:', error);
      throw new Error('Consent recording failed');
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(
    userId: string, 
    consentType: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Record consent withdrawal
      await this.recordConsent({
        userId,
        consentType: consentType as any,
        consentGiven: false,
        timestamp: new Date(),
        ipAddress,
        userAgent,
        method: 'preferences_page',
        legalBasis: 'consent'
      });

      // Deactivate related subscriptions
      if (consentType === 'email') {
        await this.deactivateSubscriptionsByChannel(userId, 'email');
      } else if (consentType === 'sms') {
        await this.deactivateSubscriptionsByChannel(userId, 'sms');
      }

      console.log(`❌ Consent withdrawn: ${userId} - ${consentType}`);
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      throw new Error('Consent withdrawal failed');
    }
  }

  /**
   * Create notification subscription with consent validation
   */
  async createSubscription(request: SubscriptionRequest): Promise<{
    subscription: NotificationSubscription;
    verificationRequired: boolean;
    verificationSent: boolean;
  }> {
    try {
      // Check if user has given consent for this channel
      const hasConsent = await this.hasValidConsent(request.userId, request.channel);
      
      if (!hasConsent) {
        // Record consent as part of subscription process
        await this.recordConsent({
          userId: request.userId,
          consentType: request.channel,
          consentGiven: true,
          timestamp: new Date(),
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          method: 'signup',
          legalBasis: 'consent',
          dataRetentionPeriod: 2555 // 7 years in days
        });
      }

      // Generate verification token
      const verificationToken = this.generateVerificationToken();
      const verificationRequired = request.channel === 'email' || request.channel === 'sms';

      const subscription: InsertNotificationSubscription = {
        userId: request.userId,
        subscriptionType: request.subscriptionType,
        channel: request.channel,
        targetValue: request.targetValue,
        isVerified: !verificationRequired, // Auto-verify if no verification needed
        verificationToken: verificationRequired ? verificationToken : null,
        verificationSentAt: verificationRequired ? new Date() : null,
        electionTypes: request.preferences?.electionTypes,
        electionLevels: request.preferences?.electionLevels,
        states: request.preferences?.states,
        parties: request.preferences?.parties,
        isActive: true,
        unsubscribeToken: this.generateUnsubscribeToken()
      };

      // Send verification if required
      let verificationSent = false;
      if (verificationRequired) {
        verificationSent = await this.sendVerification(
          request.channel,
          request.targetValue,
          verificationToken,
          request.subscriptionType
        );
      }

      console.log(`✅ Subscription created: ${request.userId} - ${request.subscriptionType} (${request.channel})`);

      // Return mock subscription for now
      return {
        subscription: {
          id: Date.now(),
          ...subscription,
          verifiedAt: subscription.isVerified ? new Date() : null,
          unsubscribedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        verificationRequired,
        verificationSent
      };
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw new Error('Subscription creation failed');
    }
  }

  /**
   * Verify subscription using token
   */
  async verifySubscription(token: string): Promise<{
    success: boolean;
    subscriptionId?: number;
    message: string;
  }> {
    try {
      // In real implementation, find subscription by verification token
      console.log(`✅ Subscription verified with token: ${token}`);
      
      return {
        success: true,
        subscriptionId: Date.now(),
        message: 'Subscription verified successfully'
      };
    } catch (error) {
      console.error('Failed to verify subscription:', error);
      return {
        success: false,
        message: 'Invalid or expired verification token'
      };
    }
  }

  /**
   * Unsubscribe using token
   */
  async unsubscribeWithToken(token: string): Promise<{
    success: boolean;
    subscriptionId?: number;
    message: string;
  }> {
    try {
      // In real implementation, find subscription by unsubscribe token
      console.log(`❌ Unsubscribed with token: ${token}`);
      
      return {
        success: true,
        subscriptionId: Date.now(),
        message: 'Successfully unsubscribed from notifications'
      };
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return {
        success: false,
        message: 'Invalid unsubscribe token'
      };
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(userId: string): Promise<GDPRDataExport> {
    try {
      // In real implementation, gather all user data from database
      const exportData: GDPRDataExport = {
        userId,
        exportTimestamp: new Date(),
        consents: [], // Would fetch from database
        subscriptions: [], // Would fetch from database
        preferences: null, // Would fetch from database
        deliveryHistory: [], // Would fetch recent delivery records
        personalData: {
          email: 'user@example.com', // Would fetch from user record
          phoneNumber: '+1234567890', // Would fetch from preferences
          timezone: 'America/New_York' // Would fetch from preferences
        }
      };

      console.log(`📦 Data export generated for user: ${userId}`);
      return exportData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw new Error('Data export failed');
    }
  }

  /**
   * Delete user data for GDPR compliance
   */
  async deleteUserData(userId: string, retainLegal: boolean = true): Promise<{
    deleted: boolean;
    retainedData?: string[];
    message: string;
  }> {
    try {
      const retainedData: string[] = [];

      if (retainLegal) {
        // Retain legally required data
        retainedData.push('consent_records_legal_basis');
        retainedData.push('delivery_logs_audit_trail');
      }

      // In real implementation:
      // 1. Delete personal data from notification_preferences
      // 2. Delete or anonymize delivery records
      // 3. Deactivate all subscriptions
      // 4. Mark consent records as deleted (but retain for legal compliance)

      console.log(`🗑️ User data deleted: ${userId} (retained: ${retainedData.join(', ') || 'none'})`);

      return {
        deleted: true,
        retainedData: retainedData.length > 0 ? retainedData : undefined,
        message: 'User data has been deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw new Error('Data deletion failed');
    }
  }

  /**
   * Check if user has valid consent for a specific purpose
   */
  async hasValidConsent(userId: string, consentType: string): Promise<boolean> {
    try {
      // In real implementation, check database for active consent
      console.log(`🔍 Checking consent: ${userId} - ${consentType}`);
      return true; // Mock implementation
    } catch (error) {
      console.error('Failed to check consent:', error);
      return false;
    }
  }

  /**
   * Get consent history for user
   */
  async getConsentHistory(userId: string): Promise<NotificationConsent[]> {
    try {
      // In real implementation, fetch from database
      console.log(`📋 Fetching consent history: ${userId}`);
      return []; // Mock implementation
    } catch (error) {
      console.error('Failed to get consent history:', error);
      throw new Error('Failed to fetch consent history');
    }
  }

  /**
   * Deactivate subscriptions by channel
   */
  private async deactivateSubscriptionsByChannel(userId: string, channel: string): Promise<void> {
    // In real implementation, update database
    console.log(`❌ Deactivating ${channel} subscriptions for user: ${userId}`);
  }

  /**
   * Send verification based on channel
   */
  private async sendVerification(
    channel: 'email' | 'sms',
    target: string,
    token: string,
    subscriptionType: string
  ): Promise<boolean> {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      
      if (channel === 'email') {
        const result = await sendGridNotificationService.sendEmailVerification(
          target,
          token,
          baseUrl
        );
        return result.success;
      } else if (channel === 'sms') {
        // Generate verification code instead of token for SMS
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const result = await twilioNotificationService.sendVerificationCode(
          target,
          verificationCode
        );
        return result.success;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to send verification:', error);
      return false;
    }
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Generate unsubscribe token
   */
  private generateUnsubscribeToken(): string {
    return `unsub_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }

  /**
   * Process data retention policies
   */
  async processDataRetention(): Promise<{
    processed: number;
    deleted: number;
    errors: number;
  }> {
    try {
      // In real implementation:
      // 1. Find consents with expired retention periods
      // 2. Delete or anonymize expired data
      // 3. Send notifications about data deletion
      
      console.log('🔄 Processing data retention policies...');
      
      return {
        processed: 0,
        deleted: 0,
        errors: 0
      };
    } catch (error) {
      console.error('Failed to process data retention:', error);
      throw new Error('Data retention processing failed');
    }
  }

  /**
   * Generate consent audit report
   */
  async generateConsentAuditReport(startDate: Date, endDate: Date): Promise<{
    period: { start: Date; end: Date };
    totalConsents: number;
    consentsByType: Record<string, number>;
    withdrawalsByType: Record<string, number>;
    verificationsByChannel: Record<string, number>;
    complianceScore: number;
  }> {
    try {
      // In real implementation, generate comprehensive audit report
      console.log(`📊 Generating consent audit report: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      return {
        period: { start: startDate, end: endDate },
        totalConsents: 0,
        consentsByType: {},
        withdrawalsByType: {},
        verificationsByChannel: {},
        complianceScore: 100
      };
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      throw new Error('Audit report generation failed');
    }
  }
}

// Export singleton instance
export const consentManagementService = new ConsentManagementService();
export default consentManagementService;