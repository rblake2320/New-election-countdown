import twilio from 'twilio';
import { 
  NotificationDelivery, 
  InsertNotificationDelivery, 
  NotificationTemplate,
  NotificationPreferences 
} from '@shared/schema';

export interface SMSParams {
  to: string;
  message: string;
  from?: string;
  mediaUrl?: string[];
}

export interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export class TwilioNotificationService {
  private client: any;
  private isConfigured: boolean = false;
  private defaultFrom: string = '';

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !phoneNumber) {
        console.warn('Twilio credentials not found - SMS notifications will be disabled');
        console.warn('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
        return;
      }

      this.client = twilio(accountSid, authToken);
      this.defaultFrom = phoneNumber;
      this.isConfigured = true;
      console.log('✅ Twilio notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio service:', error);
    }
  }

  /**
   * Send a single SMS notification
   */
  async sendSMS(params: SMSParams): Promise<SMSDeliveryResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Twilio service not configured - missing credentials'
      };
    }

    try {
      // Validate phone number format
      const cleanTo = this.cleanPhoneNumber(params.to);
      if (!this.isValidPhoneNumber(cleanTo)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      // Truncate message if too long (SMS limit is 1600 characters)
      const message = params.message.length > 1600 
        ? params.message.substring(0, 1597) + '...'
        : params.message;

      const messageData: any = {
        body: message,
        from: params.from || this.defaultFrom,
        to: cleanTo
      };

      // Add media URLs if provided
      if (params.mediaUrl && params.mediaUrl.length > 0) {
        messageData.mediaUrl = params.mediaUrl;
      }

      const response = await this.client.messages.create(messageData);
      
      return {
        success: true,
        messageId: response.sid,
        statusCode: 200
      };
    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown Twilio error',
        statusCode: error.status || error.code
      };
    }
  }

  /**
   * Send bulk SMS messages with rate limiting
   */
  async sendBulkSMS(
    messages: SMSParams[], 
    rateLimitPerMinute: number = 60
  ): Promise<SMSDeliveryResult[]> {
    if (!this.isConfigured) {
      return messages.map(() => ({
        success: false,
        error: 'Twilio service not configured'
      }));
    }

    const results: SMSDeliveryResult[] = [];
    const delay = Math.ceil(60000 / rateLimitPerMinute); // Delay between messages in ms

    for (let i = 0; i < messages.length; i++) {
      const result = await this.sendSMS(messages[i]);
      results.push(result);

      // Rate limiting delay (except for last message)
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Send election alert SMS
   */
  async sendElectionAlert(
    to: string,
    alertType: 'result' | 'update' | 'breaking_news' | 'deadline',
    data: {
      electionTitle: string;
      alertMessage: string;
      details?: string;
      actionUrl?: string;
      unsubscribeUrl: string;
    }
  ): Promise<SMSDeliveryResult> {
    const emoji = alertType === 'result' ? '🗳️' : 
                  alertType === 'breaking_news' ? '🚨' : 
                  alertType === 'deadline' ? '⏰' : '📢';

    let message = `${emoji} ${data.electionTitle}\n\n${data.alertMessage}`;
    
    if (data.details) {
      message += `\n\n${data.details}`;
    }
    
    if (data.actionUrl) {
      message += `\n\nDetails: ${data.actionUrl}`;
    }
    
    message += `\n\nReply STOP to unsubscribe: ${data.unsubscribeUrl}`;

    return this.sendSMS({
      to,
      message
    });
  }

  /**
   * Send deadline reminder SMS
   */
  async sendDeadlineReminder(
    to: string,
    reminderData: {
      type: 'registration' | 'early_voting' | 'election_day';
      deadline: string;
      location: string;
      actionUrl?: string;
      unsubscribeUrl: string;
    }
  ): Promise<SMSDeliveryResult> {
    const typeEmoji = reminderData.type === 'registration' ? '📝' : 
                      reminderData.type === 'early_voting' ? '🗳️' : '🗳️';
    
    const typeText = reminderData.type === 'registration' ? 'Voter Registration' : 
                     reminderData.type === 'early_voting' ? 'Early Voting' : 'Election Day';

    let message = `${typeEmoji} ${typeText} Reminder\n\n`;
    message += `Deadline: ${reminderData.deadline}\n`;
    message += `Location: ${reminderData.location}`;
    
    if (reminderData.actionUrl) {
      message += `\n\nMore info: ${reminderData.actionUrl}`;
    }
    
    message += `\n\nReply STOP to unsubscribe: ${reminderData.unsubscribeUrl}`;

    return this.sendSMS({
      to,
      message
    });
  }

  /**
   * Send SMS verification code
   */
  async sendVerificationCode(
    to: string,
    verificationCode: string
  ): Promise<SMSDeliveryResult> {
    const message = `Your Election Tracker verification code is: ${verificationCode}\n\nThis code will expire in 10 minutes. Do not share this code with anyone.`;

    return this.sendSMS({
      to,
      message
    });
  }

  /**
   * Send SMS confirmation for subscription
   */
  async sendSubscriptionConfirmation(
    to: string,
    subscriptionType: string,
    unsubscribeUrl: string
  ): Promise<SMSDeliveryResult> {
    const message = `✅ You're now subscribed to ${subscriptionType} alerts from Election Tracker.\n\nReply STOP or visit: ${unsubscribeUrl}`;

    return this.sendSMS({
      to,
      message
    });
  }

  /**
   * Process incoming SMS (for STOP commands, etc.)
   */
  async processIncomingSMS(
    from: string,
    body: string,
    messageSid: string
  ): Promise<{
    action: 'unsubscribe' | 'resubscribe' | 'help' | 'unknown';
    response?: string;
  }> {
    const normalizedBody = body.trim().toLowerCase();
    
    if (['stop', 'unsubscribe', 'end', 'cancel', 'quit'].includes(normalizedBody)) {
      return {
        action: 'unsubscribe',
        response: 'You have been unsubscribed from Election Tracker SMS alerts. Text START to resubscribe.'
      };
    }
    
    if (['start', 'subscribe', 'yes'].includes(normalizedBody)) {
      return {
        action: 'resubscribe',
        response: 'Welcome back! You are now subscribed to Election Tracker SMS alerts.'
      };
    }
    
    if (['help', 'info'].includes(normalizedBody)) {
      return {
        action: 'help',
        response: 'Election Tracker SMS alerts. Text STOP to unsubscribe, START to resubscribe. Visit electiontracker.app for more info.'
      };
    }
    
    return {
      action: 'unknown',
      response: 'Unknown command. Text HELP for options, STOP to unsubscribe.'
    };
  }

  /**
   * Clean phone number to E.164 format
   */
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add +1 for US numbers if not present
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // Return as-is if already formatted or international
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Check message delivery status
   */
  async checkDeliveryStatus(messageSid: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    if (!this.isConfigured) {
      throw new Error('Twilio service not configured');
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error: any) {
      throw new Error(`Failed to check delivery status: ${error.message}`);
    }
  }

  /**
   * Get account balance and usage info
   */
  async getAccountInfo(): Promise<{
    balance: string;
    currency: string;
    accountSid: string;
  }> {
    if (!this.isConfigured) {
      throw new Error('Twilio service not configured');
    }

    try {
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      const balance = await this.client.balance.fetch();
      
      return {
        balance: balance.balance,
        currency: balance.currency,
        accountSid: account.sid
      };
    } catch (error: any) {
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * Check if service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; error?: string } {
    return {
      configured: this.isConfigured,
      error: !this.isConfigured ? 'Missing Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)' : undefined
    };
  }
}

// Export singleton instance
export const twilioNotificationService = new TwilioNotificationService();
export default twilioNotificationService;