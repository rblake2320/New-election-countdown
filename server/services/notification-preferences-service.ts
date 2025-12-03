import { 
  NotificationPreferences, 
  InsertNotificationPreferences,
  NotificationSubscription,
  InsertNotificationSubscription,
  NotificationConsent
} from '@shared/schema';
import { consentManagementService } from './consent-management-service';
import { storage } from '../storage';

export interface PreferencesUpdate {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  phoneNumber?: string;
  electionResultsEnabled?: boolean;
  candidateUpdatesEnabled?: boolean;
  breakingNewsEnabled?: boolean;
  weeklyDigestEnabled?: boolean;
  deadlineRemindersEnabled?: boolean;
  stateFilter?: string[];
  localElectionsEnabled?: boolean;
  federalElectionsEnabled?: boolean;
  immediateNotifications?: boolean;
  dailyDigest?: boolean;
  weeklyDigest?: boolean;
  preferredDeliveryTime?: string;
  timezone?: string;
}

export interface SubscriptionSettings {
  subscriptionType: string;
  channel: string;
  isActive: boolean;
  electionTypes?: string[];
  electionLevels?: string[];
  states?: string[];
  parties?: string[];
}

export interface NotificationFrequency {
  immediate: boolean;
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  customSchedule?: {
    days: number[]; // 0-6, Sunday to Saturday
    time: string; // HH:MM format
  };
}

export class NotificationPreferencesService {
  constructor() {
    console.log('✅ Notification Preferences Service initialized');
  }

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      console.log(`📋 Fetching preferences for user: ${userId}`);
      
      // Use real database operation through storage interface
      const preferences = await storage.getUserNotificationPreferences(userId);
      
      // If no preferences exist, create default ones
      if (!preferences) {
        console.log(`🔄 No preferences found for user ${userId}, creating defaults`);
        return await storage.createDefaultNotificationPreferences(userId);
      }
      
      return preferences;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      throw new Error('Failed to fetch preferences');
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateUserPreferences(
    userId: string, 
    updates: PreferencesUpdate,
    ipAddress?: string,
    userAgent?: string
  ): Promise<NotificationPreferences> {
    try {
      // Validate updates
      this.validatePreferencesUpdate(updates);

      // Check consent requirements
      await this.handleConsentUpdates(userId, updates, ipAddress, userAgent);

      // Use real database operation through storage interface
      const updatedPreferences = await storage.updateUserNotificationPreferences(userId, updates);
      
      console.log(`✅ Preferences updated for user: ${userId}`);
      
      return updatedPreferences;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }

  /**
   * Create default preferences for new user
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Use real database operation through storage interface
      const defaultPreferences = await storage.createDefaultNotificationPreferences(userId);
      
      console.log(`✅ Default preferences created for user: ${userId}`);
      
      return defaultPreferences;
    } catch (error) {
      console.error('Failed to create default preferences:', error);
      throw new Error('Failed to create default preferences');
    }
  }

  /**
   * Get user's active subscriptions with preferences
   */
  async getUserSubscriptions(userId: string): Promise<NotificationSubscription[]> {
    try {
      console.log(`📋 Fetching subscriptions for user: ${userId}`);
      
      // Use real database operation through storage interface
      const subscriptions = await storage.getUserNotificationSubscriptions(userId);
      
      return subscriptions;
    } catch (error) {
      console.error('Failed to get user subscriptions:', error);
      throw new Error('Failed to fetch subscriptions');
    }
  }

  /**
   * Update subscription settings
   */
  async updateSubscriptionSettings(
    subscriptionId: number,
    settings: Partial<SubscriptionSettings>
  ): Promise<NotificationSubscription> {
    try {
      // Validate subscription ID
      if (!subscriptionId || subscriptionId <= 0) {
        throw new Error('Invalid subscription ID');
      }

      // Map settings to database fields
      const updates: Partial<NotificationSubscription> = {};
      
      if (settings.subscriptionType !== undefined) {
        updates.subscriptionType = settings.subscriptionType;
      }
      
      if (settings.channel !== undefined) {
        updates.channel = settings.channel;
      }
      
      if (settings.isActive !== undefined) {
        updates.isActive = settings.isActive;
        // If deactivating, set unsubscribed timestamp
        if (!settings.isActive) {
          updates.unsubscribedAt = new Date();
        }
      }
      
      if (settings.electionTypes !== undefined) {
        updates.electionTypes = settings.electionTypes;
      }
      
      if (settings.electionLevels !== undefined) {
        updates.electionLevels = settings.electionLevels;
      }
      
      if (settings.states !== undefined) {
        updates.states = settings.states;
      }
      
      if (settings.parties !== undefined) {
        updates.parties = settings.parties;
      }

      // Use real database operation through storage interface
      const updatedSubscription = await storage.updateNotificationSubscription(subscriptionId, updates);
      
      console.log(`✅ Subscription settings updated in database: ${subscriptionId}`);
      
      return updatedSubscription;
    } catch (error) {
      console.error('Failed to update subscription settings:', error);
      throw new Error(`Failed to update subscription settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get notification frequency settings
   */
  async getNotificationFrequency(userId: string): Promise<NotificationFrequency> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      return {
        immediate: preferences?.immediateNotifications ?? false,
        daily: preferences?.dailyDigest ?? false,
        weekly: preferences?.weeklyDigest ?? true,
        monthly: false, // Could be added as a preference
        customSchedule: {
          days: [1, 2, 3, 4, 5], // Monday to Friday
          time: preferences?.preferredDeliveryTime ?? "09:00"
        }
      };
    } catch (error) {
      console.error('Failed to get notification frequency:', error);
      throw new Error('Failed to get notification frequency');
    }
  }

  /**
   * Update notification frequency
   */
  async updateNotificationFrequency(
    userId: string,
    frequency: Partial<NotificationFrequency>
  ): Promise<NotificationFrequency> {
    try {
      const updates: PreferencesUpdate = {
        immediateNotifications: frequency.immediate,
        dailyDigest: frequency.daily,
        weeklyDigest: frequency.weekly,
        preferredDeliveryTime: frequency.customSchedule?.time
      };

      await this.updateUserPreferences(userId, updates);
      
      console.log(`✅ Notification frequency updated for user: ${userId}`);
      return await this.getNotificationFrequency(userId);
    } catch (error) {
      console.error('Failed to update notification frequency:', error);
      throw new Error('Failed to update notification frequency');
    }
  }

  /**
   * Get geographic preferences
   */
  async getGeographicPreferences(userId: string): Promise<{
    states: string[];
    includeLocal: boolean;
    includeFederal: boolean;
    includeState: boolean;
  }> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      return {
        states: preferences?.stateFilter ?? [],
        includeLocal: preferences?.localElectionsEnabled ?? false,
        includeFederal: preferences?.federalElectionsEnabled ?? true,
        includeState: true // Could be added as separate preference
      };
    } catch (error) {
      console.error('Failed to get geographic preferences:', error);
      throw new Error('Failed to get geographic preferences');
    }
  }

  /**
   * Update geographic preferences
   */
  async updateGeographicPreferences(
    userId: string,
    geographic: {
      states?: string[];
      includeLocal?: boolean;
      includeFederal?: boolean;
    }
  ): Promise<void> {
    try {
      const updates: PreferencesUpdate = {
        stateFilter: geographic.states,
        localElectionsEnabled: geographic.includeLocal,
        federalElectionsEnabled: geographic.includeFederal
      };

      await this.updateUserPreferences(userId, updates);
      console.log(`✅ Geographic preferences updated for user: ${userId}`);
    } catch (error) {
      console.error('Failed to update geographic preferences:', error);
      throw new Error('Failed to update geographic preferences');
    }
  }

  /**
   * Create a new notification subscription
   */
  async createSubscription(subscriptionData: {
    userId: string;
    subscriptionType: string;
    channel: 'email' | 'sms';
    targetValue: string;
    electionTypes?: string[];
    electionLevels?: string[];
    states?: string[];
    parties?: string[];
  }): Promise<NotificationSubscription> {
    try {
      // Validate required fields
      if (!subscriptionData.userId || !subscriptionData.subscriptionType || !subscriptionData.channel || !subscriptionData.targetValue) {
        throw new Error('Missing required subscription fields');
      }

      // Validate channel type
      if (!['email', 'sms'].includes(subscriptionData.channel)) {
        throw new Error('Invalid channel type. Must be email or sms');
      }

      // Generate verification token
      const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const unsubscribeToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const insertData: InsertNotificationSubscription = {
        userId: subscriptionData.userId,
        subscriptionType: subscriptionData.subscriptionType,
        channel: subscriptionData.channel,
        targetValue: subscriptionData.targetValue,
        isVerified: false,
        verificationToken,
        verificationSentAt: new Date(),
        verifiedAt: null,
        electionTypes: subscriptionData.electionTypes || [],
        electionLevels: subscriptionData.electionLevels || [],
        states: subscriptionData.states || [],
        parties: subscriptionData.parties || [],
        isActive: true,
        unsubscribedAt: null,
        unsubscribeToken
      };

      // Use real database operation through storage interface
      const subscription = await storage.createNotificationSubscription(insertData);
      
      console.log(`✅ New subscription created in database: ${subscription.id}`);
      
      return subscription;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a notification subscription
   */
  async deleteSubscription(subscriptionId: number): Promise<void> {
    try {
      // Validate subscription ID
      if (!subscriptionId || subscriptionId <= 0) {
        throw new Error('Invalid subscription ID');
      }

      // Use real database operation through storage interface
      await storage.deleteNotificationSubscription(subscriptionId);
      
      console.log(`✅ Subscription deleted from database: ${subscriptionId}`);
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      throw new Error(`Failed to delete subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a notification subscription using verification token
   */
  async verifySubscription(verificationToken: string): Promise<NotificationSubscription | null> {
    try {
      // Validate token
      if (!verificationToken || verificationToken.trim() === '') {
        throw new Error('Invalid verification token');
      }

      // Use real database operation through storage interface
      const subscription = await storage.verifyNotificationSubscription(verificationToken);
      
      if (subscription) {
        console.log(`✅ Subscription verified in database: ${subscription.id}`);
      } else {
        console.log(`❌ Verification token not found: ${verificationToken}`);
      }
      
      return subscription;
    } catch (error) {
      console.error('Failed to verify subscription:', error);
      throw new Error(`Failed to verify subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unsubscribe using unsubscribe token
   */
  async unsubscribeByToken(unsubscribeToken: string): Promise<void> {
    try {
      // Validate token
      if (!unsubscribeToken || unsubscribeToken.trim() === '') {
        throw new Error('Invalid unsubscribe token');
      }

      // Use real database operation through storage interface
      await storage.unsubscribeNotification(unsubscribeToken);
      
      console.log(`✅ Unsubscribed via token in database: ${unsubscribeToken}`);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw new Error(`Failed to unsubscribe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: number): Promise<NotificationSubscription | null> {
    try {
      // Validate subscription ID
      if (!subscriptionId || subscriptionId <= 0) {
        throw new Error('Invalid subscription ID');
      }

      // Get all user subscriptions and filter by ID
      // Note: This is a workaround since storage doesn't have getSubscriptionById
      const allSubscriptions = await storage.getUserNotificationSubscriptions('');
      const subscription = allSubscriptions.find(s => s.id === subscriptionId);
      
      return subscription || null;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      throw new Error(`Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk disable all notifications
   */
  async disableAllNotifications(userId: string): Promise<void> {
    try {
      const updates: PreferencesUpdate = {
        emailEnabled: false,
        smsEnabled: false,
        electionResultsEnabled: false,
        candidateUpdatesEnabled: false,
        breakingNewsEnabled: false,
        weeklyDigestEnabled: false,
        deadlineRemindersEnabled: false,
        immediateNotifications: false,
        dailyDigest: false,
        weeklyDigest: false
      };

      await this.updateUserPreferences(userId, updates);
      console.log(`❌ All notifications disabled for user: ${userId}`);
    } catch (error) {
      console.error('Failed to disable all notifications:', error);
      throw new Error('Failed to disable all notifications');
    }
  }

  /**
   * Enable recommended notifications for new users
   */
  async enableRecommendedNotifications(userId: string, userProfile?: {
    state?: string;
    interests?: string[];
  }): Promise<void> {
    try {
      const updates: PreferencesUpdate = {
        emailEnabled: true,
        electionResultsEnabled: true,
        candidateUpdatesEnabled: true,
        weeklyDigestEnabled: true,
        deadlineRemindersEnabled: true,
        federalElectionsEnabled: true,
        weeklyDigest: true,
        stateFilter: userProfile?.state ? [userProfile.state] : []
      };

      await this.updateUserPreferences(userId, updates);
      console.log(`✅ Recommended notifications enabled for user: ${userId}`);
    } catch (error) {
      console.error('Failed to enable recommended notifications:', error);
      throw new Error('Failed to enable recommended notifications');
    }
  }

  /**
   * Validate preferences update
   */
  private validatePreferencesUpdate(updates: PreferencesUpdate): void {
    // Validate phone number format if provided
    if (updates.phoneNumber && !this.isValidPhoneNumber(updates.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Validate time format
    if (updates.preferredDeliveryTime && !this.isValidTimeFormat(updates.preferredDeliveryTime)) {
      throw new Error('Invalid time format. Use HH:MM format');
    }

    // Validate timezone
    if (updates.timezone && !this.isValidTimezone(updates.timezone)) {
      throw new Error('Invalid timezone');
    }

    // Validate state codes
    if (updates.stateFilter) {
      for (const state of updates.stateFilter) {
        if (!this.isValidStateCode(state)) {
          throw new Error(`Invalid state code: ${state}`);
        }
      }
    }
  }

  /**
   * Handle consent updates when preferences change
   */
  private async handleConsentUpdates(
    userId: string,
    updates: PreferencesUpdate,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Record consent when enabling email notifications
    if (updates.emailEnabled === true) {
      await consentManagementService.recordConsent({
        userId,
        consentType: 'email',
        consentGiven: true,
        timestamp: new Date(),
        ipAddress,
        userAgent,
        method: 'preferences_page',
        legalBasis: 'consent'
      });
    }

    // Record consent withdrawal when disabling email
    if (updates.emailEnabled === false) {
      await consentManagementService.withdrawConsent(
        userId,
        'email',
        ipAddress,
        userAgent
      );
    }

    // Record consent when enabling SMS notifications
    if (updates.smsEnabled === true) {
      await consentManagementService.recordConsent({
        userId,
        consentType: 'sms',
        consentGiven: true,
        timestamp: new Date(),
        ipAddress,
        userAgent,
        method: 'preferences_page',
        legalBasis: 'consent'
      });
    }

    // Record consent withdrawal when disabling SMS
    if (updates.smsEnabled === false) {
      await consentManagementService.withdrawConsent(
        userId,
        'sms',
        ipAddress,
        userAgent
      );
    }
  }

  /**
   * Validation helper methods
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private isValidStateCode(state: string): boolean {
    const validStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'DC', 'AS', 'GU', 'MP', 'PR', 'VI'
    ];
    return validStates.includes(state.toUpperCase());
  }
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesService();
export default notificationPreferencesService;