import { MailService } from '@sendgrid/mail';
import { 
  NotificationDelivery, 
  InsertNotificationDelivery, 
  NotificationTemplate,
  NotificationPreferences 
} from '@shared/schema';

export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  tags?: string[];
  customArgs?: Record<string, string>;
  trackingSettings?: {
    clickTracking?: { enable: boolean };
    openTracking?: { enable: boolean };
    subscriptionTracking?: { enable: boolean };
  };
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export class SendGridNotificationService {
  private mailService: MailService;
  private isConfigured: boolean = false;
  private defaultFrom: string = 'notifications@electiontracker.app';

  constructor() {
    this.mailService = new MailService();
    this.initialize();
  }

  private initialize() {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.warn('SENDGRID_API_KEY not found - email notifications will be disabled');
        return;
      }

      this.mailService.setApiKey(apiKey);
      this.isConfigured = true;
      console.log('✅ SendGrid notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid service:', error);
    }
  }

  /**
   * Send a single email notification
   */
  async sendEmail(params: EmailParams): Promise<EmailDeliveryResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'SendGrid service not configured - missing API key'
      };
    }

    try {
      const emailData: any = {
        to: params.to,
        from: params.from || this.defaultFrom,
        subject: params.subject,
        ...(params.templateId && { templateId: params.templateId }),
        ...(params.templateData && { dynamicTemplateData: params.templateData }),
        ...(params.tags && { categories: params.tags }),
        ...(params.customArgs && { customArgs: params.customArgs }),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: true },
          ...params.trackingSettings
        }
      };

      // Add content based on what's provided
      if (params.text && params.html) {
        emailData.content = [
          { type: 'text/plain', value: params.text },
          { type: 'text/html', value: params.html }
        ];
      } else if (params.html) {
        emailData.content = [
          { type: 'text/html', value: params.html }
        ];
      } else if (params.text) {
        emailData.content = [
          { type: 'text/plain', value: params.text }
        ];
      } else if (!params.templateId) {
        // Fallback if no content provided and no template
        emailData.content = [
          { type: 'text/plain', value: 'No content provided' }
        ];
      }

      const response = await this.mailService.send(emailData);
      
      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'] || 'unknown',
        statusCode: response[0]?.statusCode
      };
    } catch (error: any) {
      console.error('SendGrid email error:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown SendGrid error',
        statusCode: error.code
      };
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(
    emails: EmailParams[], 
    rateLimitPerMinute: number = 100
  ): Promise<EmailDeliveryResult[]> {
    if (!this.isConfigured) {
      return emails.map(() => ({
        success: false,
        error: 'SendGrid service not configured'
      }));
    }

    const results: EmailDeliveryResult[] = [];
    const delay = Math.ceil(60000 / rateLimitPerMinute); // Delay between emails in ms

    for (let i = 0; i < emails.length; i++) {
      const result = await this.sendEmail(emails[i]);
      results.push(result);

      // Rate limiting delay (except for last email)
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Send templated election alert email
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
  ): Promise<EmailDeliveryResult> {
    const subject = this.generateSubject(alertType, data.electionTitle);
    const htmlContent = this.generateElectionAlertHTML(alertType, data);
    const textContent = this.generateElectionAlertText(alertType, data);

    return this.sendEmail({
      to,
      from: this.defaultFrom,
      subject,
      text: textContent,
      html: htmlContent,
      tags: ['election_alert', alertType],
      customArgs: {
        alert_type: alertType,
        election: data.electionTitle
      }
    });
  }

  /**
   * Send weekly digest email
   */
  async sendWeeklyDigest(
    to: string,
    digestData: {
      userName: string;
      upcomingElections: Array<{title: string; date: string; location: string}>;
      recentResults: Array<{title: string; winner: string; date: string}>;
      candidateUpdates: Array<{name: string; update: string; election: string}>;
      unsubscribeUrl: string;
    }
  ): Promise<EmailDeliveryResult> {
    const subject = `Your Weekly Election Digest - ${new Date().toLocaleDateString()}`;
    const htmlContent = this.generateWeeklyDigestHTML(digestData);
    const textContent = this.generateWeeklyDigestText(digestData);

    return this.sendEmail({
      to,
      from: this.defaultFrom,
      subject,
      text: textContent,
      html: htmlContent,
      tags: ['weekly_digest'],
      customArgs: {
        digest_type: 'weekly'
      }
    });
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(
    to: string,
    userData: {
      firstName?: string;
      lastName?: string;
      email: string;
    },
    baseUrl: string = 'https://electiontracker.app'
  ): Promise<EmailDeliveryResult> {
    const userName = userData.firstName ? `${userData.firstName}` : 'there';
    const subject = `Welcome to Election Tracker, ${userName}! 🗳️`;
    const htmlContent = this.generateWelcomeEmailHTML(userData, baseUrl);
    const textContent = this.generateWelcomeEmailText(userData, baseUrl);

    return this.sendEmail({
      to,
      from: this.defaultFrom,
      subject,
      text: textContent,
      html: htmlContent,
      tags: ['welcome_email', 'onboarding'],
      customArgs: {
        email_type: 'welcome',
        user_email: userData.email
      }
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(
    to: string,
    verificationToken: string,
    baseUrl: string
  ): Promise<EmailDeliveryResult> {
    const verificationUrl = `${baseUrl}/notifications/verify-email?token=${verificationToken}`;
    
    const subject = 'Verify your email for Election Tracker notifications';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Click the link below to verify your email address and start receiving election notifications:</p>
        <a href="${verificationUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email Address
        </a>
        <p>If you didn't request this verification, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `;
    
    const textContent = `
      Verify your email address for Election Tracker notifications
      
      Click this link to verify: ${verificationUrl}
      
      If you didn't request this verification, you can safely ignore this email.
      This link will expire in 24 hours.
    `;

    return this.sendEmail({
      to,
      from: this.defaultFrom,
      subject,
      text: textContent,
      html: htmlContent,
      tags: ['email_verification']
    });
  }

  /**
   * Generate subject line based on alert type
   */
  private generateSubject(alertType: string, electionTitle: string): string {
    switch (alertType) {
      case 'result':
        return `🗳️ Election Results: ${electionTitle}`;
      case 'update':
        return `📢 Election Update: ${electionTitle}`;
      case 'breaking_news':
        return `🚨 Breaking: ${electionTitle}`;
      case 'deadline':
        return `⏰ Deadline Reminder: ${electionTitle}`;
      default:
        return `Election Alert: ${electionTitle}`;
    }
  }

  /**
   * Generate HTML content for election alerts
   */
  private generateElectionAlertHTML(
    alertType: string,
    data: any
  ): string {
    const emoji = alertType === 'result' ? '🗳️' : 
                  alertType === 'breaking_news' ? '🚨' : 
                  alertType === 'deadline' ? '⏰' : '📢';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #333; margin: 0;">${emoji} ${data.electionTitle}</h1>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
          <h2 style="color: #495057; margin-top: 0;">${data.alertMessage}</h2>
          
          ${data.details ? `<p style="color: #6c757d; line-height: 1.6;">${data.details}</p>` : ''}
          
          ${data.actionUrl ? `
            <div style="margin: 20px 0;">
              <a href="${data.actionUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View Details
              </a>
            </div>
          ` : ''}
        </div>
        
        <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            You're receiving this because you subscribed to election alerts.
            <br>
            <a href="${data.unsubscribeUrl}" style="color: #6c757d;">Unsubscribe</a> | 
            <a href="/notifications/preferences" style="color: #6c757d;">Manage Preferences</a>
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate text content for election alerts
   */
  private generateElectionAlertText(
    alertType: string,
    data: any
  ): string {
    return `
      ${data.electionTitle}
      
      ${data.alertMessage}
      
      ${data.details || ''}
      
      ${data.actionUrl ? `View details: ${data.actionUrl}` : ''}
      
      ---
      You're receiving this because you subscribed to election alerts.
      Unsubscribe: ${data.unsubscribeUrl}
      Manage preferences: /notifications/preferences
    `.trim();
  }

  /**
   * Generate HTML content for weekly digest
   */
  private generateWeeklyDigestHTML(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #0066cc; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">📊 Your Weekly Election Digest</h1>
          <p style="margin: 10px 0 0 0;">Hello ${data.userName}!</p>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #dee2e6;">
          ${data.upcomingElections.length > 0 ? `
            <h2 style="color: #495057;">🗳️ Upcoming Elections</h2>
            ${data.upcomingElections.map((election: any) => `
              <div style="padding: 10px; border-left: 3px solid #0066cc; margin: 10px 0; background: #f8f9fa;">
                <strong>${election.title}</strong><br>
                📅 ${election.date} | 📍 ${election.location}
              </div>
            `).join('')}
          ` : ''}
          
          ${data.recentResults.length > 0 ? `
            <h2 style="color: #495057;">🏆 Recent Results</h2>
            ${data.recentResults.map((result: any) => `
              <div style="padding: 10px; border-left: 3px solid #28a745; margin: 10px 0; background: #f8f9fa;">
                <strong>${result.title}</strong><br>
                Winner: ${result.winner} | ${result.date}
              </div>
            `).join('')}
          ` : ''}
          
          ${data.candidateUpdates.length > 0 ? `
            <h2 style="color: #495057;">📢 Candidate Updates</h2>
            ${data.candidateUpdates.map((update: any) => `
              <div style="padding: 10px; border-left: 3px solid #ffc107; margin: 10px 0; background: #f8f9fa;">
                <strong>${update.name}</strong> - ${update.election}<br>
                ${update.update}
              </div>
            `).join('')}
          ` : ''}
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            <a href="${data.unsubscribeUrl}" style="color: #6c757d;">Unsubscribe</a> | 
            <a href="/notifications/preferences" style="color: #6c757d;">Manage Preferences</a>
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate text content for weekly digest
   */
  private generateWeeklyDigestText(data: any): string {
    let content = `Your Weekly Election Digest\n\nHello ${data.userName}!\n\n`;
    
    if (data.upcomingElections.length > 0) {
      content += "UPCOMING ELECTIONS:\n";
      data.upcomingElections.forEach((election: any) => {
        content += `• ${election.title} - ${election.date} (${election.location})\n`;
      });
      content += "\n";
    }
    
    if (data.recentResults.length > 0) {
      content += "RECENT RESULTS:\n";
      data.recentResults.forEach((result: any) => {
        content += `• ${result.title} - Winner: ${result.winner} (${result.date})\n`;
      });
      content += "\n";
    }
    
    if (data.candidateUpdates.length > 0) {
      content += "CANDIDATE UPDATES:\n";
      data.candidateUpdates.forEach((update: any) => {
        content += `• ${update.name} (${update.election}): ${update.update}\n`;
      });
      content += "\n";
    }
    
    content += `---\nUnsubscribe: ${data.unsubscribeUrl}\nManage preferences: /notifications/preferences`;
    
    return content;
  }

  /**
   * Generate HTML content for welcome email
   */
  private generateWelcomeEmailHTML(
    userData: { firstName?: string; lastName?: string; email: string },
    baseUrl: string
  ): string {
    const userName = userData.firstName ? userData.firstName : 'there';
    const fullName = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}` 
      : userData.firstName || 'New User';

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0066cc 0%, #004499 100%); color: white; padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🗳️ Welcome to Election Tracker</h1>
          <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Your Gateway to Democracy</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hello ${userName}! 👋</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 25px 0;">
            Welcome to the most comprehensive election tracking platform! We're excited to help you stay informed about elections at every level of government.
          </p>
          
          <!-- Platform Overview -->
          <div style="background: #f8fafb; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0066cc;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">🚀 What Makes Us Special</h3>
            <ul style="color: #555; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li><strong>613+ Tracked Elections</strong> - Federal, state, and local races</li>
              <li><strong>Real-time Updates</strong> - Live results and breaking news</li>
              <li><strong>Candidate Profiles</strong> - Comprehensive information and positions</li>
              <li><strong>Smart Watchlists</strong> - Follow elections that matter to you</li>
              <li><strong>Data Transparency</strong> - Verified, authentic election information</li>
            </ul>
          </div>
          
          <!-- Getting Started Guide -->
          <div style="background: #ffffff; border: 1px solid #e5e9ec; border-radius: 8px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px;">🎯 Get Started in 3 Easy Steps</h3>
            
            <div style="display: flex; align-items: center; margin: 15px 0; padding: 15px; background: #f0f8ff; border-radius: 6px;">
              <div style="background: #28a745; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">✓</div>
              <div style="flex: 1;">
                <strong style="color: #333;">Create Account</strong> - You're all set! 
              </div>
            </div>
            
            <div style="display: flex; align-items: center; margin: 15px 0; padding: 15px; background: #fff7e6; border-radius: 6px;">
              <div style="background: #0066cc; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">2</div>
              <div style="flex: 1;">
                <strong style="color: #333;">Explore Elections</strong> - Browse upcoming races in your area
                <div style="margin-top: 10px;">
                  <a href="${baseUrl}/" style="background: #0066cc; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 14px;">
                    Browse Elections
                  </a>
                </div>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; margin: 15px 0; padding: 15px; background: #f0f8ff; border-radius: 6px;">
              <div style="background: #0066cc; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">3</div>
              <div style="flex: 1;">
                <strong style="color: #333;">Create Your Watchlist</strong> - Save elections you care about
                <div style="margin-top: 10px;">
                  <a href="${baseUrl}/dashboard" style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 14px;">
                    Go to Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Feature Highlights -->
          <div style="margin: 30px 0;">
            <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px;">✨ Explore Key Features</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
              <div style="background: #f8fafb; padding: 20px; border-radius: 6px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                <strong style="color: #333; display: block; font-size: 14px;">Congress Tracker</strong>
                <span style="color: #666; font-size: 12px;">Follow your representatives</span>
              </div>
              
              <div style="background: #f8fafb; padding: 20px; border-radius: 6px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
                <strong style="color: #333; display: block; font-size: 14px;">Candidate Compare</strong>
                <span style="color: #666; font-size: 12px;">Side-by-side analysis</span>
              </div>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${baseUrl}/congress" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">
                Explore All Features
              </a>
            </div>
          </div>
          
          <!-- Support Section -->
          <div style="background: #f8fafb; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <h4 style="color: #333; margin: 0 0 10px 0;">Need Help Getting Started?</h4>
            <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">
              Our team is here to help you make the most of Election Tracker.
            </p>
            <a href="mailto:support@electiontracker.app" style="color: #0066cc; text-decoration: none; font-weight: 500;">
              Contact Support
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e9ec;">
          <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">
            You're receiving this welcome email because you just created an account with Election Tracker.
          </p>
          <p style="color: #666; margin: 0; font-size: 12px;">
            <a href="${baseUrl}/notifications/preferences" style="color: #666; text-decoration: none;">Manage Email Preferences</a> | 
            <a href="${baseUrl}/notifications/unsubscribe" style="color: #666; text-decoration: none;">Unsubscribe</a>
          </p>
          <div style="margin-top: 20px;">
            <p style="color: #999; font-size: 11px; margin: 0;">
              © 2025 Election Tracker. Making democracy transparent and accessible.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate text content for welcome email
   */
  private generateWelcomeEmailText(
    userData: { firstName?: string; lastName?: string; email: string },
    baseUrl: string
  ): string {
    const userName = userData.firstName ? userData.firstName : 'there';

    return `
Welcome to Election Tracker, ${userName}! 🗳️

Your Gateway to Democracy

Hello ${userName}! 👋

Welcome to the most comprehensive election tracking platform! We're excited to help you stay informed about elections at every level of government.

🚀 WHAT MAKES US SPECIAL:
• 613+ Tracked Elections - Federal, state, and local races
• Real-time Updates - Live results and breaking news  
• Candidate Profiles - Comprehensive information and positions
• Smart Watchlists - Follow elections that matter to you
• Data Transparency - Verified, authentic election information

🎯 GET STARTED IN 3 EASY STEPS:

✓ Step 1: Create Account - You're all set!

2. Explore Elections - Browse upcoming races in your area
   → Browse Elections: ${baseUrl}/

3. Create Your Watchlist - Save elections you care about  
   → Go to Dashboard: ${baseUrl}/dashboard

✨ EXPLORE KEY FEATURES:
📊 Congress Tracker - Follow your representatives
🔍 Candidate Compare - Side-by-side analysis

→ Explore All Features: ${baseUrl}/congress

NEED HELP GETTING STARTED?
Our team is here to help you make the most of Election Tracker.
Contact Support: support@electiontracker.app

---

You're receiving this welcome email because you just created an account with Election Tracker.

Manage Email Preferences: ${baseUrl}/notifications/preferences
Unsubscribe: ${baseUrl}/notifications/unsubscribe

© 2025 Election Tracker. Making democracy transparent and accessible.
    `.trim();
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
      error: !this.isConfigured ? 'Missing SENDGRID_API_KEY environment variable' : undefined
    };
  }
}

// Export singleton instance
export const sendGridNotificationService = new SendGridNotificationService();
export default sendGridNotificationService;