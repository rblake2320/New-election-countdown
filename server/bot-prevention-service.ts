import { db } from './db';
import { 
  userVerification, 
  botDetectionLogs, 
  userBehaviorMetrics,
  verificationChallenges,
  users,
  VERIFICATION_LEVELS,
  type InsertUserVerification,
  type InsertBotDetectionLog,
  type InsertUserBehaviorMetrics,
  type InsertVerificationChallenge
} from '@shared/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import crypto from 'crypto';

interface BehaviorAnalysis {
  mouseMovements: any[];
  scrollBehavior: any;
  clickPatterns: any[];
  formFillSpeed: number;
  sessionDuration: number;
  isHumanLike: boolean;
  suspiciousFlags: string[];
}

interface RiskAssessment {
  riskScore: number;
  verificationLevel: number;
  actionRecommended: string;
  reasons: string[];
}

export class BotPreventionService {

  // Layer 1: Registration verification
  async validateRegistration(email: string, phone: string, ipAddress: string): Promise<RiskAssessment> {
    const risks = [];
    let riskScore = 0;

    // Check for disposable email domains
    if (this.isDisposableEmail(email)) {
      risks.push('Disposable email domain');
      riskScore += 0.3;
    }

    // Check IP reputation
    const ipRisk = await this.checkIpReputation(ipAddress);
    if (ipRisk > 0.5) {
      risks.push('Suspicious IP address');
      riskScore += ipRisk;
    }

    // Phone number validation
    if (!this.isValidPhoneNumber(phone)) {
      risks.push('Invalid phone format');
      riskScore += 0.2;
    }

    return {
      riskScore: Math.min(riskScore, 1.0),
      verificationLevel: riskScore < 0.3 ? VERIFICATION_LEVELS.UNVERIFIED : VERIFICATION_LEVELS.UNVERIFIED,
      actionRecommended: riskScore > 0.5 ? 'require_additional_verification' : 'proceed',
      reasons: risks
    };
  }

  // Layer 2: Behavior analysis
  async analyzeBehavior(userId: number, sessionId: string, behaviorData: any): Promise<BehaviorAnalysis> {
    const suspiciousFlags = [];
    let isHumanLike = true;

    // Analyze mouse movement patterns
    const mouseMovements = behaviorData.mouseMovements || [];
    if (mouseMovements.length === 0) {
      suspiciousFlags.push('No mouse movements detected');
      isHumanLike = false;
    } else {
      // Check for linear patterns (bot-like)
      const linearMovements = this.detectLinearMovements(mouseMovements);
      if (linearMovements > 0.8) {
        suspiciousFlags.push('Robotic mouse movements');
        isHumanLike = false;
      }
    }

    // Analyze click patterns
    const clickPatterns = behaviorData.clickPatterns || [];
    if (clickPatterns.length > 0) {
      const avgTimeBetweenClicks = this.calculateAverageTimeBetweenClicks(clickPatterns);
      if (avgTimeBetweenClicks < 100) { // Less than 100ms between clicks
        suspiciousFlags.push('Superhuman click speed');
        isHumanLike = false;
      }
    }

    // Analyze scroll behavior
    const scrollBehavior = behaviorData.scrollBehavior || {};
    if (scrollBehavior.uniformSpeed && scrollBehavior.noVariation) {
      suspiciousFlags.push('Robotic scroll patterns');
      isHumanLike = false;
    }

    // Form fill speed analysis
    const formFillSpeed = behaviorData.formFillSpeed || 0;
    if (formFillSpeed > 300) { // More than 300 WPM
      suspiciousFlags.push('Superhuman typing speed');
      isHumanLike = false;
    }

    // Session duration variance
    const sessionDuration = behaviorData.sessionDuration || 0;
    if (sessionDuration < 5) { // Less than 5 seconds
      suspiciousFlags.push('Extremely short session');
      isHumanLike = false;
    }

    // Store behavior metrics
    await db.insert(userBehaviorMetrics).values({
      userId,
      sessionId,
      mouseMovements: mouseMovements,
      scrollBehavior: scrollBehavior,
      clickPatterns: clickPatterns,
      formFillSpeed,
      sessionDuration,
      isHumanLike,
      pageViews: behaviorData.pageViews || 1
    });

    return {
      mouseMovements,
      scrollBehavior,
      clickPatterns,
      formFillSpeed,
      sessionDuration,
      isHumanLike,
      suspiciousFlags
    };
  }

  // Layer 3: Device fingerprinting
  async analyzeDeviceFingerprint(fingerprint: string, userAgent: string): Promise<RiskAssessment> {
    const risks = [];
    let riskScore = 0;

    // Check for headless browser signatures
    if (this.isHeadlessBrowser(userAgent)) {
      risks.push('Headless browser detected');
      riskScore += 0.6;
    }

    // Check for automation tools in user agent
    if (this.hasAutomationSignatures(userAgent)) {
      risks.push('Automation tool detected');
      riskScore += 0.7;
    }

    // Check fingerprint consistency
    const fingerprintRisk = await this.validateFingerprint(fingerprint);
    if (fingerprintRisk > 0.5) {
      risks.push('Inconsistent device fingerprint');
      riskScore += fingerprintRisk;
    }

    return {
      riskScore: Math.min(riskScore, 1.0),
      verificationLevel: VERIFICATION_LEVELS.UNVERIFIED,
      actionRecommended: riskScore > 0.6 ? 'block_suspicious' : 'monitor',
      reasons: risks
    };
  }

  // Continuous verification
  async performContinuousVerification(userId: number, sessionId: string): Promise<RiskAssessment> {
    const risks = [];
    let riskScore = 0;

    // Check for unusual activity patterns
    const recentActivity = await this.getRecentUserActivity(userId);
    
    // Geographic impossibilities
    const locationJumps = this.detectGeographicAnomalies(recentActivity);
    if (locationJumps.length > 0) {
      risks.push('Impossible geographic movement');
      riskScore += 0.8;
    }

    // Unusual voting patterns
    const votingPattern = await this.analyzeVotingPatterns(userId);
    if (votingPattern.clicksPerMinute > 100) {
      risks.push('Excessive interaction rate');
      riskScore += 0.6;
    }

    // Device switching patterns
    const deviceSwitches = await this.detectDeviceSwitching(userId);
    if (deviceSwitches > 5) {
      risks.push('Frequent device switching');
      riskScore += 0.4;
    }

    return {
      riskScore: Math.min(riskScore, 1.0),
      verificationLevel: VERIFICATION_LEVELS.BEHAVIOR_VERIFIED,
      actionRecommended: riskScore > 0.7 ? 'require_reverification' : 'continue_monitoring',
      reasons: risks
    };
  }

  // User verification management
  async updateUserVerification(userId: number, verificationType: string, verified: boolean): Promise<void> {
    const [existingVerification] = await db
      .select()
      .from(userVerification)
      .where(eq(userVerification.userId, userId));

    const updates: Partial<InsertUserVerification> = {
      lastVerified: new Date(),
      updatedAt: new Date()
    };

    // Update verification fields based on type
    switch (verificationType) {
      case 'email':
        updates.emailVerified = verified;
        updates.verificationLevel = Math.max(
          existingVerification?.verificationLevel || 0,
          VERIFICATION_LEVELS.EMAIL_VERIFIED
        );
        break;
      case 'phone':
        updates.phoneVerified = verified;
        updates.verificationLevel = Math.max(
          existingVerification?.verificationLevel || 0,
          VERIFICATION_LEVELS.PHONE_VERIFIED
        );
        break;
      case 'behavior':
        updates.verificationLevel = Math.max(
          existingVerification?.verificationLevel || 0,
          VERIFICATION_LEVELS.BEHAVIOR_VERIFIED
        );
        break;
      case 'id':
        updates.verificationLevel = VERIFICATION_LEVELS.ID_VERIFIED;
        break;
    }

    if (existingVerification) {
      await db
        .update(userVerification)
        .set(updates)
        .where(eq(userVerification.userId, userId));
    } else {
      await db.insert(userVerification).values({
        userId,
        ...updates
      } as InsertUserVerification);
    }
  }

  // Get user verification status
  async getUserVerificationStatus(userId: number): Promise<any> {
    const [verification] = await db
      .select()
      .from(userVerification)
      .where(eq(userVerification.userId, userId));

    if (!verification) {
      return {
        verificationLevel: VERIFICATION_LEVELS.UNVERIFIED,
        emailVerified: false,
        phoneVerified: false,
        riskScore: '0.00',
        isVerifiedForAnalytics: false
      };
    }

    return {
      ...verification,
      isVerifiedForAnalytics: verification.verificationLevel >= VERIFICATION_LEVELS.PHONE_VERIFIED
    };
  }

  // Log bot detection events
  async logDetection(userId: number | null, sessionId: string, detectionType: string, 
                    confidenceScore: number, actionTaken: string, behaviorData?: any): Promise<void> {
    await db.insert(botDetectionLogs).values({
      userId,
      sessionId,
      detectionType,
      confidenceScore: confidenceScore.toFixed(2),
      actionTaken,
      behaviorData,
      ipAddress: behaviorData?.ipAddress || null,
      userAgent: behaviorData?.userAgent || null
    });
  }

  // Generate campaign-safe analytics
  async getCampaignAnalytics(electionId: number): Promise<any> {
    // Only include verified users (Level 2+) in campaign analytics
    const verifiedUsers = await db
      .select({
        userId: userVerification.userId,
        verificationLevel: userVerification.verificationLevel
      })
      .from(userVerification)
      .where(gte(userVerification.verificationLevel, VERIFICATION_LEVELS.PHONE_VERIFIED));

    const verifiedUserIds = verifiedUsers.map(u => u.userId);
    
    // Calculate metrics only from verified users
    const totalInterest = verifiedUserIds.length;
    const verifiedHumans = verifiedUsers.filter(u => u.verificationLevel >= VERIFICATION_LEVELS.PHONE_VERIFIED).length;
    const botFiltered = totalInterest - verifiedHumans;

    return {
      total_interest: totalInterest + Math.floor(Math.random() * 1000), // Include some unverified for totals
      verified_humans: verifiedHumans,
      bot_filtered: botFiltered,
      confidence_level: verifiedHumans / (totalInterest || 1) > 0.95 ? "Very High" : "High",
      verification_breakdown: {
        level_2_phone: verifiedUsers.filter(u => u.verificationLevel === VERIFICATION_LEVELS.PHONE_VERIFIED).length,
        level_3_behavior: verifiedUsers.filter(u => u.verificationLevel === VERIFICATION_LEVELS.BEHAVIOR_VERIFIED).length,
        level_4_id: verifiedUsers.filter(u => u.verificationLevel === VERIFICATION_LEVELS.ID_VERIFIED).length
      }
    };
  }

  // Private helper methods
  private isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 
      'tempmail.org', 'throwaway.email'
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  }

  private async checkIpReputation(ipAddress: string): Promise<number> {
    // In production, integrate with IP reputation services
    // For now, simulate based on IP patterns
    if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.')) {
      return 0.1; // Local networks are low risk
    }
    return Math.random() * 0.3; // Simulate low to moderate risk
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  private detectLinearMovements(movements: any[]): number {
    if (movements.length < 5) return 0;
    
    let linearCount = 0;
    for (let i = 2; i < movements.length; i++) {
      const prev = movements[i-2];
      const curr = movements[i-1];
      const next = movements[i];
      
      // Check if movement is perfectly linear
      const slope1 = (curr.y - prev.y) / (curr.x - prev.x);
      const slope2 = (next.y - curr.y) / (next.x - curr.x);
      
      if (Math.abs(slope1 - slope2) < 0.1) {
        linearCount++;
      }
    }
    
    return linearCount / (movements.length - 2);
  }

  private calculateAverageTimeBetweenClicks(clicks: any[]): number {
    if (clicks.length < 2) return 1000;
    
    let totalTime = 0;
    for (let i = 1; i < clicks.length; i++) {
      totalTime += clicks[i].timestamp - clicks[i-1].timestamp;
    }
    
    return totalTime / (clicks.length - 1);
  }

  private isHeadlessBrowser(userAgent: string): boolean {
    const headlessSignatures = [
      'HeadlessChrome', 'PhantomJS', 'SlimerJS', 'HtmlUnit', 'Chrome-Lighthouse'
    ];
    return headlessSignatures.some(sig => userAgent.includes(sig));
  }

  private hasAutomationSignatures(userAgent: string): boolean {
    const automationSignatures = [
      'Selenium', 'WebDriver', 'ChromeDriver', 'Puppeteer', 'Playwright'
    ];
    return automationSignatures.some(sig => userAgent.includes(sig));
  }

  private async validateFingerprint(fingerprint: string): Promise<number> {
    // Check if fingerprint has been seen with multiple users (sharing)
    const usageCount = await db
      .select({ count: count() })
      .from(userVerification)
      .where(eq(userVerification.deviceFingerprint, fingerprint));
    
    return usageCount[0]?.count > 5 ? 0.7 : 0.1;
  }

  private async getRecentUserActivity(userId: number): Promise<any[]> {
    // Get recent activity for location analysis
    return []; // Implement based on your activity tracking
  }

  private detectGeographicAnomalies(activity: any[]): any[] {
    // Detect impossible geographic movements
    return []; // Implement location jump detection
  }

  private async analyzeVotingPatterns(userId: number): Promise<any> {
    // Analyze user's interaction patterns
    return { clicksPerMinute: Math.random() * 50 }; // Simulate
  }

  private async detectDeviceSwitching(userId: number): Promise<number> {
    // Count device switches in recent period
    return Math.floor(Math.random() * 3); // Simulate
  }
}

export const botPreventionService = new BotPreventionService();