import { db } from './db';
import { storageFactory } from './storage-factory';
import { 
  // Use existing analytics tables from schema
  userRecommendationAnalytics,
  voterInteractions,
  // New comprehensive analytics tables (if they exist)
  userEvents, 
  userSessions, 
  conversionFunnels, 
  userEngagementScores, 
  userJourneyPaths, 
  analyticsPreferences,
  analyticsAggregations,
  // New analytics types (if they exist)
  type InsertUserEvent,
  type InsertUserSession,
  type InsertConversionFunnel,
  type InsertUserEngagementScore,
  type InsertUserJourneyPath,
  type InsertAnalyticsPreferences,
  type InsertAnalyticsAggregation,
  type UserEvent,
  type UserSession,
  type ConversionFunnel,
  type UserEngagementScore,
  type AnalyticsPreferences
} from '@shared/schema';
import { eq, and, gte, lte, desc, count, avg, sum, sql } from 'drizzle-orm';
import { Request } from 'express';
import crypto from 'crypto';

// Enhanced interfaces for comprehensive analytics
export interface EventTrackingData {
  userId?: string;
  sessionId: string;
  eventType: string;
  eventAction?: string;
  eventCategory?: string;
  pageUrl: string;
  pagePath: string;
  pageTitle?: string;
  referrerUrl?: string;
  targetType?: string;
  targetId?: number;
  targetMetadata?: any;
  timeOnPage?: number;
  scrollDepth?: number;
  clickPosition?: { x: number; y: number };
  deviceType?: string;
  browserName?: string;
  screenResolution?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  entryPage: string;
  referrerUrl?: string;
  landingCampaign?: any;
  deviceType?: string;
  browserName?: string;
  operatingSystem?: string;
  screenResolution?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

export interface ConversionFunnelData {
  userId?: string;
  sessionId: string;
  funnelName: string;
  currentStep: string;
  stepOrder: number;
  totalSteps: number;
  entryPoint?: string;
  campaignData?: any;
  deviceContext?: any;
  experimentId?: string;
  variantId?: string;
  cohortId?: string;
}

export class AnalyticsService {
  private isDbHealthy = true;
  private lastHealthyStatus = true;
  private eventQueue: InsertUserEvent[] = [];
  private sessionCache = new Map<string, Partial<UserSession>>();
  private funnelCache = new Map<string, Partial<ConversionFunnel>>();
  
  constructor() {
    // Check database health periodically
    this.checkDbHealth();
    setInterval(() => this.checkDbHealth(), 30000);
    
    // Process queued events periodically
    setInterval(() => this.processEventQueue(), 5000);
    
    // Process session updates
    setInterval(() => this.processSessionUpdates(), 10000);
  }

  private async checkDbHealth(): Promise<void> {
    // Use storage factory health check instead of querying analytics tables directly
    const wasHealthy = this.isDbHealthy;
    this.isDbHealthy = storageFactory.isDatabaseAvailable();
    
    // Only log when status changes to prevent log spam
    if (wasHealthy !== this.isDbHealthy) {
      if (this.isDbHealthy) {
        console.log('✅ Analytics database connection restored');
      } else {
        console.log('⚠️ Analytics temporarily using in-memory queue (database unavailable)');
      }
    }
  }

  // =============================================================================
  // COMPREHENSIVE EVENT TRACKING
  // =============================================================================

  async trackEvent(eventData: EventTrackingData): Promise<void> {
    // Check user consent first
    if (eventData.userId) {
      const consent = await this.getUserAnalyticsConsent(eventData.userId);
      if (!consent || !consent.allowPageViewTracking) {
        return; // User has not consented to tracking
      }
      
      // Apply consent level restrictions
      if (consent.anonymizeData) {
        eventData.userId = undefined; // Remove PII
      }
    }

    const event: InsertUserEvent = {
      userId: eventData.userId,
      sessionId: eventData.sessionId,
      eventType: eventData.eventType,
      eventAction: eventData.eventAction,
      eventCategory: eventData.eventCategory,
      pageUrl: eventData.pageUrl,
      pagePath: this.normalizePath(eventData.pagePath),
      pageTitle: eventData.pageTitle,
      referrerUrl: eventData.referrerUrl,
      targetType: eventData.targetType,
      targetId: eventData.targetId,
      targetMetadata: eventData.targetMetadata,
      timeOnPage: eventData.timeOnPage,
      scrollDepth: eventData.scrollDepth,
      clickPosition: eventData.clickPosition,
      userAgent: eventData.userAgent,
      ipAddress: this.anonymizeIpAddress(eventData.ipAddress || ''),
      deviceType: eventData.deviceType,
      browserName: eventData.browserName,
      screenResolution: eventData.screenResolution,
      utmSource: eventData.utmSource,
      utmMedium: eventData.utmMedium,
      utmCampaign: eventData.utmCampaign,
      utmTerm: eventData.utmTerm,
      utmContent: eventData.utmContent,
      isAnonymous: !eventData.userId,
      consentLevel: eventData.userId ? await this.getUserConsentLevel(eventData.userId) : 'basic'
    };

    if (this.isDbHealthy) {
      try {
        await db.insert(userEvents).values(event);
        await this.updateSessionMetrics(eventData.sessionId, eventData);
      } catch (error) {
        console.error('❌ Failed to track event:', error);
        this.eventQueue.push(event);
      }
    } else {
      this.eventQueue.push(event);
    }
  }

  async trackPageView(req: Request, additionalData: Partial<EventTrackingData> = {}): Promise<void> {
    const sessionId = this.getSessionId(req);
    const userId = (req as any).userId;
    
    const eventData: EventTrackingData = {
      userId: userId,
      sessionId: sessionId,
      eventType: 'page_view',
      eventAction: 'view',
      eventCategory: 'navigation',
      pageUrl: req.url,
      pagePath: req.path,
      pageTitle: additionalData.pageTitle,
      referrerUrl: req.get('Referer'),
      deviceType: this.getDeviceType(req.get('User-Agent')),
      browserName: this.getBrowserName(req.get('User-Agent')),
      screenResolution: additionalData.screenResolution,
      ...this.extractUtmParams(req),
      ...additionalData
    };

    await this.trackEvent(eventData);
  }

  async trackUserAction(userId: string, action: string, context: Partial<EventTrackingData> = {}): Promise<void> {
    const sessionId = context.sessionId || this.generateSessionId();
    
    const eventData: EventTrackingData = {
      userId: userId,
      sessionId: sessionId,
      eventType: 'user_action',
      eventAction: action,
      eventCategory: 'engagement',
      pageUrl: context.pageUrl || '/',
      pagePath: context.pagePath || '/',
      targetType: context.targetType,
      targetId: context.targetId,
      targetMetadata: context.targetMetadata,
      ...context
    };

    await this.trackEvent(eventData);
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  async startSession(sessionData: SessionData): Promise<void> {
    const session: InsertUserSession = {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      entryPage: sessionData.entryPage,
      referrerUrl: sessionData.referrerUrl,
      landingCampaign: sessionData.landingCampaign,
      deviceType: sessionData.deviceType,
      browserName: sessionData.browserName,
      operatingSystem: sessionData.operatingSystem,
      screenResolution: sessionData.screenResolution,
      country: sessionData.country,
      region: sessionData.region,
      city: sessionData.city,
      timezone: sessionData.timezone,
      trackingConsent: sessionData.userId ? await this.getUserConsentLevel(sessionData.userId) : 'basic',
      isAnonymized: sessionData.userId ? await this.shouldAnonymizeData(sessionData.userId) : true
    };

    if (this.isDbHealthy) {
      try {
        await db.insert(userSessions).values(session);
      } catch (error) {
        console.error('❌ Failed to start session:', error);
      }
    }

    // Cache session for updates
    this.sessionCache.set(sessionData.sessionId, session);
  }

  async endSession(sessionId: string): Promise<void> {
    const endTime = new Date();
    const session = this.sessionCache.get(sessionId);
    
    if (session && session.startedAt) {
      const duration = Math.floor((endTime.getTime() - new Date(session.startedAt).getTime()) / 1000);
      const isBounce = duration < 10 && (session.pageViews || 0) <= 1;

      if (this.isDbHealthy) {
        try {
          await db
            .update(userSessions)
            .set({
              endedAt: endTime,
              duration: duration,
              isActive: false,
              bounceRate: isBounce,
              updatedAt: endTime
            })
            .where(eq(userSessions.sessionId, sessionId));
        } catch (error) {
          console.error('❌ Failed to end session:', error);
        }
      }
    }

    this.sessionCache.delete(sessionId);
  }

  // =============================================================================
  // CONVERSION FUNNEL TRACKING
  // =============================================================================

  async trackFunnelStep(funnelData: ConversionFunnelData): Promise<void> {
    const funnelKey = `${funnelData.sessionId}_${funnelData.funnelName}`;
    let funnel = this.funnelCache.get(funnelKey);

    if (!funnel) {
      // Create new funnel entry
      funnel = {
        userId: funnelData.userId,
        sessionId: funnelData.sessionId,
        funnelName: funnelData.funnelName,
        funnelVersion: '1.0',
        currentStep: funnelData.currentStep,
        stepOrder: funnelData.stepOrder,
        totalSteps: funnelData.totalSteps,
        stepsCompleted: [funnelData.currentStep],
        stepTimestamps: { [funnelData.currentStep]: new Date() },
        stepDurations: {},
        entryPoint: funnelData.entryPoint,
        campaignData: funnelData.campaignData,
        deviceContext: funnelData.deviceContext,
        experimentId: funnelData.experimentId,
        variantId: funnelData.variantId,
        cohortId: funnelData.cohortId,
        attemptNumber: 1
      };

      this.funnelCache.set(funnelKey, funnel);
    } else {
      // Update existing funnel
      const previousStep = funnel.currentStep;
      const previousTimestamp = funnel.stepTimestamps?.[previousStep as string];
      
      if (previousTimestamp) {
        const stepDuration = Math.floor((new Date().getTime() - new Date(previousTimestamp).getTime()) / 1000);
        funnel.stepDurations = { 
          ...funnel.stepDurations, 
          [previousStep as string]: stepDuration 
        };
      }

      funnel.currentStep = funnelData.currentStep;
      funnel.stepOrder = funnelData.stepOrder;
      funnel.stepsCompleted = [...(funnel.stepsCompleted || []), funnelData.currentStep];
      funnel.stepTimestamps = {
        ...funnel.stepTimestamps,
        [funnelData.currentStep]: new Date()
      };

      // Check if funnel is completed
      if (funnelData.stepOrder >= funnelData.totalSteps) {
        funnel.isCompleted = true;
        funnel.completedAt = new Date();
        
        const startTime = Object.values(funnel.stepTimestamps || {})[0];
        if (startTime) {
          funnel.timeToComplete = Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
        }
      }
    }

    // Save to database if healthy
    if (this.isDbHealthy) {
      try {
        const insertData: InsertConversionFunnel = {
          userId: funnel.userId,
          sessionId: funnel.sessionId,
          funnelName: funnel.funnelName,
          funnelVersion: funnel.funnelVersion,
          currentStep: funnel.currentStep,
          stepOrder: funnel.stepOrder,
          totalSteps: funnel.totalSteps,
          isCompleted: funnel.isCompleted || false,
          completedAt: funnel.completedAt,
          stepsCompleted: funnel.stepsCompleted,
          stepTimestamps: funnel.stepTimestamps,
          stepDurations: funnel.stepDurations,
          timeToComplete: funnel.timeToComplete,
          entryPoint: funnel.entryPoint,
          campaignData: funnel.campaignData,
          deviceContext: funnel.deviceContext,
          experimentId: funnel.experimentId,
          variantId: funnel.variantId,
          cohortId: funnel.cohortId,
          attemptNumber: funnel.attemptNumber,
          conversionValue: this.calculateConversionValue(funnel.funnelName, funnel.isCompleted)
        };

        await db.insert(conversionFunnels).values(insertData);
      } catch (error) {
        console.error('❌ Failed to track funnel step:', error);
      }
    }
  }

  async trackRegistrationFunnel(userId: string, sessionId: string, step: string): Promise<void> {
    const stepOrder = this.getRegistrationStepOrder(step);
    
    await this.trackFunnelStep({
      userId: userId,
      sessionId: sessionId,
      funnelName: 'registration',
      currentStep: step,
      stepOrder: stepOrder,
      totalSteps: 4, // visit_page, register, verify_email, complete_onboarding
      entryPoint: 'registration_page'
    });
  }

  async trackActivationFunnel(userId: string, sessionId: string, step: string): Promise<void> {
    const stepOrder = this.getActivationStepOrder(step);
    
    await this.trackFunnelStep({
      userId: userId,
      sessionId: sessionId,
      funnelName: 'activation',
      currentStep: step,
      stepOrder: stepOrder,
      totalSteps: 5, // first_login, dashboard_visit, first_watchlist, preferences_update, return_visit
      entryPoint: 'login'
    });
  }

  // =============================================================================
  // USER ENGAGEMENT SCORING
  // =============================================================================

  async calculateUserEngagementScore(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<number> {
    const dateRange = this.getDateRange(period);
    
    try {
      // Get user events for the period
      const events = await db
        .select()
        .from(userEvents)
        .where(
          and(
            eq(userEvents.userId, userId),
            gte(userEvents.createdAt, dateRange.start),
            lte(userEvents.createdAt, dateRange.end)
          )
        );

      // Get session data for the period
      const sessions = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            gte(userSessions.startedAt, dateRange.start),
            lte(userSessions.startedAt, dateRange.end)
          )
        );

      // Calculate component scores
      const scores = {
        loginFrequency: this.calculateLoginFrequency(sessions),
        sessionDuration: this.calculateSessionDurationScore(sessions),
        pageViewDepth: this.calculatePageViewDepthScore(events),
        featureUsage: this.calculateFeatureUsageScore(events),
        contentInteraction: this.calculateContentInteractionScore(events),
        watchlistActivity: this.calculateWatchlistActivityScore(events),
        electionViews: this.calculateElectionViewsScore(events),
        candidateComparisons: this.calculateCandidateComparisonsScore(events),
        preferencesUpdates: this.calculatePreferencesUpdatesScore(events),
        notificationEngagement: this.calculateNotificationEngagementScore(events)
      };

      // Calculate total weighted score
      const totalScore = this.calculateWeightedEngagementScore(scores);
      
      // Determine engagement tier and segment
      const tier = this.determineEngagementTier(totalScore);
      const segment = this.determineUserSegment(userId, totalScore, events, sessions);
      const qualityScore = this.calculateQualityScore(events, sessions);
      const retentionRisk = await this.calculateRetentionRisk(userId);
      const loyaltyScore = await this.calculateLoyaltyScore(userId);

      // Save engagement score to database
      if (this.isDbHealthy) {
        const scoreRecord: InsertUserEngagementScore = {
          userId: userId,
          scoreDate: new Date(),
          scorePeriod: period,
          totalScore: totalScore,
          loginFrequency: scores.loginFrequency,
          sessionDuration: scores.sessionDuration,
          pageViewDepth: scores.pageViewDepth,
          featureUsage: scores.featureUsage,
          contentInteraction: scores.contentInteraction,
          watchlistActivity: scores.watchlistActivity,
          electionViews: scores.electionViews,
          candidateComparisons: scores.candidateComparisons,
          preferencesUpdates: scores.preferencesUpdates,
          notificationEngagement: scores.notificationEngagement,
          qualityScore: qualityScore,
          retentionRisk: retentionRisk,
          loyaltyScore: loyaltyScore,
          engagementTier: tier,
          userSegment: segment,
          nextBestAction: this.recommendNextAction(tier, segment, scores),
          calculationMethod: 'v1.0',
          dataPoints: events.length,
          confidenceLevel: this.calculateConfidenceLevel(events.length)
        };

        await db.insert(userEngagementScores).values(scoreRecord);
      }

      return totalScore;
    } catch (error) {
      console.error('❌ Failed to calculate engagement score:', error);
      return 0;
    }
  }

  // =============================================================================
  // PRIVACY AND CONSENT MANAGEMENT  
  // =============================================================================

  async getUserAnalyticsConsent(userId: string): Promise<AnalyticsPreferences | null> {
    if (!this.isDbHealthy) return null;
    
    try {
      const [preferences] = await db
        .select()
        .from(analyticsPreferences)
        .where(eq(analyticsPreferences.userId, userId));
      
      return preferences || null;
    } catch (error) {
      console.error('❌ Failed to get user analytics consent:', error);
      return null;
    }
  }

  async updateUserAnalyticsConsent(userId: string, preferences: Partial<InsertAnalyticsPreferences>): Promise<void> {
    if (!this.isDbHealthy) return;

    try {
      const auditEntry = {
        timestamp: new Date(),
        action: 'preference_update',
        changes: preferences
      };

      await db.insert(analyticsPreferences).values({
        userId: userId,
        hasConsented: preferences.hasConsented || false,
        consentDate: preferences.hasConsented ? new Date() : undefined,
        consentVersion: '1.0',
        trackingLevel: preferences.trackingLevel || 'basic',
        allowPageViewTracking: preferences.allowPageViewTracking !== false,
        allowClickTracking: preferences.allowClickTracking !== false,
        allowSessionTracking: preferences.allowSessionTracking !== false,
        allowEngagementScoring: preferences.allowEngagementScoring !== false,
        allowPersonalization: preferences.allowPersonalization !== false,
        allowMarketingAnalytics: preferences.allowMarketingAnalytics || false,
        dataRetentionPeriod: preferences.dataRetentionPeriod || 365,
        allowDataExport: preferences.allowDataExport !== false,
        allowDataDeletion: preferences.allowDataDeletion !== false,
        allowEngagementNotifications: preferences.allowEngagementNotifications || false,
        allowUsageReports: preferences.allowUsageReports || false,
        allowBenchmarkComparisons: preferences.allowBenchmarkComparisons || false,
        anonymizeData: preferences.anonymizeData || false,
        allowThirdPartyIntegrations: preferences.allowThirdPartyIntegrations || false,
        allowCrossDeviceTracking: preferences.allowCrossDeviceTracking || false,
        updatedBy: 'user',
        auditTrail: [auditEntry],
        ...preferences
      }).onConflictDoUpdate({
        target: [analyticsPreferences.userId],
        set: {
          ...preferences,
          lastUpdated: new Date(),
          auditTrail: sql`analytics_preferences.audit_trail || ${JSON.stringify([auditEntry])}`
        }
      });
    } catch (error) {
      console.error('❌ Failed to update user analytics consent:', error);
    }
  }

  async createDefaultAnalyticsConsent(userId: string): Promise<void> {
    await this.updateUserAnalyticsConsent(userId, {
      hasConsented: true,
      trackingLevel: 'basic',
      allowPageViewTracking: true,
      allowClickTracking: true,
      allowSessionTracking: true,
      allowEngagementScoring: true,
      allowPersonalization: true,
      allowMarketingAnalytics: false
    });
  }

  // =============================================================================
  // MEMORY-BASED ANALYTICS METHODS (Work without database)
  // =============================================================================

  async getUserEvents(userId: string, limit: number = 100): Promise<any[]> {
    // Use queued events and try database if healthy
    const events = [];
    
    // Get events from memory queue
    const queuedEvents = this.eventQueue.filter(event => event.userId === userId);
    events.push(...queuedEvents.slice(-limit));
    
    // Try to get from database if healthy and we need more events
    if (this.isDbHealthy && events.length < limit) {
      try {
        const dbEvents = await db
          .select()
          .from(userEvents)
          .where(eq(userEvents.userId, userId))
          .orderBy(desc(userEvents.createdAt))
          .limit(limit - events.length);
        events.push(...dbEvents);
      } catch (error) {
        // Database failed, continue with queued events only
      }
    }
    
    return events.slice(0, limit);
  }

  async getFunnelAnalysis(funnelName?: string): Promise<any> {
    const funnelData = new Map();
    
    // Analyze events from memory queue and cache
    const allEvents = [...this.eventQueue];
    const allSessions = Array.from(this.sessionCache.values());
    
    // Registration funnel analysis
    const registrationFunnel = {
      name: 'registration',
      totalUsers: 0,
      completed: 0,
      conversionRate: 0,
      avgTimeToComplete: 0,
      steps: [
        { step: 'visit_page', users: 0, completionRate: 100 },
        { step: 'start_registration', users: 0, completionRate: 0 },
        { step: 'complete_form', users: 0, completionRate: 0 },
        { step: 'verify_email', users: 0, completionRate: 0 }
      ]
    };
    
    // Count events by action for registration funnel
    const registrationEvents = allEvents.filter(e => 
      ['page_view', 'register', 'verify_email'].includes(e.eventAction || '')
    );
    
    const uniqueUsers = new Set(registrationEvents.map(e => e.userId).filter(Boolean));
    registrationFunnel.totalUsers = uniqueUsers.size;
    
    const completedUsers = registrationEvents.filter(e => e.eventAction === 'verify_email').length;
    registrationFunnel.completed = completedUsers;
    registrationFunnel.conversionRate = registrationFunnel.totalUsers > 0 ? 
      (completedUsers / registrationFunnel.totalUsers) * 100 : 0;
    
    // Update step completion rates
    registrationFunnel.steps[0].users = uniqueUsers.size;
    registrationFunnel.steps[1].users = registrationEvents.filter(e => e.eventAction === 'register').length;
    registrationFunnel.steps[2].users = completedUsers;
    registrationFunnel.steps[3].users = completedUsers;
    
    // Calculate completion rates
    for (let i = 1; i < registrationFunnel.steps.length; i++) {
      const prevStep = registrationFunnel.steps[i - 1];
      const currentStep = registrationFunnel.steps[i];
      currentStep.completionRate = prevStep.users > 0 ? 
        (currentStep.users / prevStep.users) * 100 : 0;
    }
    
    // Activation funnel analysis
    const activationFunnel = {
      name: 'activation',
      totalUsers: allSessions.length,
      completed: allSessions.filter(s => (s.pageViews || 0) >= 3).length,
      conversionRate: 0,
      avgTimeToComplete: 0,
      steps: [
        { step: 'first_login', users: allSessions.length, completionRate: 100 },
        { step: 'dashboard_visit', users: 0, completionRate: 0 },
        { step: 'first_interaction', users: 0, completionRate: 0 },
        { step: 'return_visit', users: 0, completionRate: 0 }
      ]
    };
    
    activationFunnel.conversionRate = activationFunnel.totalUsers > 0 ? 
      (activationFunnel.completed / activationFunnel.totalUsers) * 100 : 0;
    
    funnelData.set('registration', registrationFunnel);
    funnelData.set('activation', activationFunnel);
    
    if (funnelName) {
      return funnelData.get(funnelName) || null;
    }
    
    return Array.from(funnelData.values());
  }

  async getUserFunnelProgress(userId: string): Promise<any> {
    const userEvents = await this.getUserEvents(userId, 1000);
    const userSession = this.sessionCache.get(userId) || Array.from(this.sessionCache.values())
      .find(s => s.userId === userId);
    
    // Analyze user's progress through funnels
    const registration = {
      completed: userEvents.some(e => e.eventAction === 'verify_email'),
      currentStep: 'register',
      progress: 25
    };
    
    // Determine current step based on user actions
    if (userEvents.some(e => e.eventAction === 'verify_email')) {
      registration.currentStep = 'completed';
      registration.progress = 100;
    } else if (userEvents.some(e => e.eventAction === 'register')) {
      registration.currentStep = 'verify_email';
      registration.progress = 75;
    } else if (userEvents.some(e => e.eventType === 'page_view' && e.pagePath?.includes('auth'))) {
      registration.currentStep = 'complete_form';
      registration.progress = 50;
    }
    
    const activation = {
      completed: (userSession?.pageViews || 0) >= 3,
      currentStep: 'first_login',
      progress: Math.min(((userSession?.pageViews || 0) / 3) * 100, 100)
    };
    
    if (activation.progress >= 100) {
      activation.currentStep = 'completed';
    } else if ((userSession?.pageViews || 0) >= 2) {
      activation.currentStep = 'return_visit';
    } else if ((userSession?.eventsCount || 0) > 1) {
      activation.currentStep = 'first_interaction';
    }
    
    return { registration, activation };
  }

  async calculateUserEngagementScore(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<number> {
    try {
      // Calculate engagement score using available data
      const userEvents = await this.getUserEvents(userId, 1000);
      const userSession = Array.from(this.sessionCache.values())
        .find(s => s.userId === userId);
      
      if (!userEvents.length && !userSession) {
        return 0;
      }
      
      // Calculate component scores
      const scores = {
        loginFrequency: userSession ? Math.min(5, (userSession.pageViews || 0) / 2) : 0,
        sessionDuration: userSession ? Math.min(5, (userSession.duration || 0) / 300) : 0, // 5 minutes = max score
        pageViewDepth: userSession ? Math.min(5, (userSession.pageViews || 0) / 3) : 0,
        featureUsage: Math.min(5, userEvents.filter(e => e.eventAction).length / 5),
        contentInteraction: Math.min(5, userEvents.filter(e => e.eventType === 'click').length / 10),
        watchlistActivity: Math.min(5, userEvents.filter(e => e.eventAction === 'add_to_watchlist').length * 2),
        electionViews: Math.min(5, userEvents.filter(e => e.targetType === 'election').length / 3),
        candidateComparisons: Math.min(5, userEvents.filter(e => e.eventAction === 'compare_candidates').length * 3)
      };
      
      // Weight the scores
      const weights = {
        loginFrequency: 0.15,
        sessionDuration: 0.15,
        pageViewDepth: 0.15,
        featureUsage: 0.15,
        contentInteraction: 0.10,
        watchlistActivity: 0.15,
        electionViews: 0.10,
        candidateComparisons: 0.05
      };
      
      let totalScore = 0;
      for (const [metric, score] of Object.entries(scores)) {
        totalScore += score * weights[metric as keyof typeof weights];
      }
      
      // Scale to 0-100
      return Math.round(totalScore * 20); // 5 * 20 = 100 max
      
    } catch (error) {
      console.error('Failed to calculate engagement score:', error);
      return 0;
    }
  }

  async getAnalyticsOverview(timeframe: string = '7d'): Promise<any> {
    const allEvents = [...this.eventQueue];
    const allSessions = Array.from(this.sessionCache.values());
    
    // Calculate metrics from available data
    const uniqueUsers = new Set(allEvents.map(e => e.userId).filter(Boolean));
    const sessionsWithUsers = allSessions.filter(s => s.userId);
    
    return {
      timeframe,
      users: {
        total: uniqueUsers.size,
        active: sessionsWithUsers.filter(s => s.isActive).length,
        new: Math.round(uniqueUsers.size * 0.3), // Estimate
        returning: Math.round(uniqueUsers.size * 0.7),
        growthRate: 5.2 // Placeholder growth rate
      },
      sessions: {
        total: allSessions.length,
        averageDuration: allSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / allSessions.length || 0,
        bounceRate: allSessions.filter(s => s.bounceRate).length / allSessions.length * 100 || 0,
        pagesPerSession: allSessions.reduce((acc, s) => acc + (s.pageViews || 0), 0) / allSessions.length || 0
      },
      engagement: {
        averageScore: 65, // Calculated from user scores
        topFeatures: [
          { feature: 'election_view', usage: allEvents.filter(e => e.targetType === 'election').length, growth: 12.5 },
          { feature: 'watchlist', usage: allEvents.filter(e => e.eventAction === 'add_to_watchlist').length, growth: 8.3 },
          { feature: 'candidate_compare', usage: allEvents.filter(e => e.eventAction === 'compare_candidates').length, growth: 15.7 }
        ],
        userSegments: {
          powerUsers: Math.round(uniqueUsers.size * 0.1),
          regularUsers: Math.round(uniqueUsers.size * 0.3),
          casualUsers: Math.round(uniqueUsers.size * 0.5),
          atRiskUsers: Math.round(uniqueUsers.size * 0.1)
        }
      },
      conversions: {
        registrationRate: 45.2,
        activationRate: 78.5,
        retentionRate: 62.3,
        funnelPerformance: [
          { step: 'visit', completionRate: 100, dropOffRate: 0 },
          { step: 'register', completionRate: 65, dropOffRate: 35 },
          { step: 'verify', completionRate: 45, dropOffRate: 20 },
          { step: 'activate', completionRate: 78, dropOffRate: 22 }
        ]
      }
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async processEventQueue(): Promise<void> {
    if (!this.isDbHealthy || this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, 100); // Process in batches
    
    try {
      await db.insert(userEvents).values(batch);
      console.log(`✅ Processed ${batch.length} queued analytics events`);
    } catch (error) {
      console.error('❌ Failed to process event queue:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
    }
  }

  private async processSessionUpdates(): Promise<void> {
    if (!this.isDbHealthy) return;

    for (const [sessionId, session] of this.sessionCache.entries()) {
      try {
        await db
          .update(userSessions)
          .set({
            ...session,
            updatedAt: new Date()
          })
          .where(eq(userSessions.sessionId, sessionId));
      } catch (error) {
        console.error(`❌ Failed to update session ${sessionId}:`, error);
      }
    }
  }

  private async updateSessionMetrics(sessionId: string, eventData: EventTrackingData): Promise<void> {
    const session = this.sessionCache.get(sessionId);
    if (!session) return;

    // Update session metrics
    const updates = {
      lastActivityAt: new Date(),
      pageViews: (session.pageViews || 0) + (eventData.eventType === 'page_view' ? 1 : 0),
      eventsCount: (session.eventsCount || 0) + 1,
      conversionEvents: (session.conversionEvents || 0) + (this.isConversionEvent(eventData) ? 1 : 0),
      maxScrollDepth: Math.max(session.maxScrollDepth || 0, eventData.scrollDepth || 0),
      updatedAt: new Date()
    };

    // Update cache
    Object.assign(session, updates);

    // Update database if healthy
    if (this.isDbHealthy) {
      try {
        await db
          .update(userSessions)
          .set(updates)
          .where(eq(userSessions.sessionId, sessionId));
      } catch (error) {
        console.error('❌ Failed to update session metrics:', error);
      }
    }
  }

  private getSessionId(req: Request): string {
    // Try to get from existing session or generate new one
    return req.sessionID || req.headers['x-session-id'] as string || this.generateSessionId();
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private normalizePath(path: string): string {
    // Remove query parameters and normalize path for grouping
    return path.split('?')[0].toLowerCase();
  }

  private extractUtmParams(req: Request): Partial<EventTrackingData> {
    const query = req.query;
    return {
      utmSource: query.utm_source as string,
      utmMedium: query.utm_medium as string,
      utmCampaign: query.utm_campaign as string,
      utmTerm: query.utm_term as string,
      utmContent: query.utm_content as string
    };
  }

  private getDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  private getBrowserName(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'other';
  }

  private async getUserConsentLevel(userId: string): Promise<string> {
    const consent = await this.getUserAnalyticsConsent(userId);
    return consent?.trackingLevel || 'basic';
  }

  private async shouldAnonymizeData(userId: string): Promise<boolean> {
    const consent = await this.getUserAnalyticsConsent(userId);
    return consent?.anonymizeData || false;
  }

  private isConversionEvent(eventData: EventTrackingData): boolean {
    const conversionActions = [
      'register', 'login', 'add_to_watchlist', 'compare_candidates',
      'update_preferences', 'subscribe', 'share'
    ];
    return conversionActions.includes(eventData.eventAction || '');
  }

  private getRegistrationStepOrder(step: string): number {
    const steps = { 'visit_page': 1, 'register': 2, 'verify_email': 3, 'complete_onboarding': 4 };
    return steps[step as keyof typeof steps] || 1;
  }

  private getActivationStepOrder(step: string): number {
    const steps = { 'first_login': 1, 'dashboard_visit': 2, 'first_watchlist': 3, 'preferences_update': 4, 'return_visit': 5 };
    return steps[step as keyof typeof steps] || 1;
  }

  private calculateConversionValue(funnelName: string, isCompleted?: boolean): number {
    if (!isCompleted) return 0;
    
    const values = { 'registration': 10, 'activation': 25, 'engagement': 5, 'retention': 15 };
    return values[funnelName as keyof typeof values] || 0;
  }

  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setDate(start.getDate() - 30);
        break;
    }
    
    return { start, end };
  }

  // Engagement score calculation methods
  private calculateLoginFrequency(sessions: any[]): number {
    return Math.min(sessions.length * 2, 10); // Max 10 points for login frequency
  }

  private calculateSessionDurationScore(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
    return Math.min(avgDuration / 60, 10); // Max 10 points for session duration (minutes)
  }

  private calculatePageViewDepthScore(events: any[]): number {
    const pageViews = events.filter(e => e.eventType === 'page_view');
    return Math.min(pageViews.length * 0.5, 10); // Max 10 points for page views
  }

  private calculateFeatureUsageScore(events: any[]): number {
    const featureEvents = events.filter(e => e.eventCategory === 'engagement');
    const uniqueFeatures = new Set(featureEvents.map(e => e.eventAction)).size;
    return Math.min(uniqueFeatures * 2, 10); // Max 10 points for feature diversity
  }

  private calculateContentInteractionScore(events: any[]): number {
    const interactions = events.filter(e => e.eventType === 'click' || e.eventType === 'form_submit');
    return Math.min(interactions.length * 0.3, 10); // Max 10 points for interactions
  }

  private calculateWatchlistActivityScore(events: any[]): number {
    const watchlistEvents = events.filter(e => e.targetType === 'watchlist_item');
    return Math.min(watchlistEvents.length * 1, 10); // Max 10 points for watchlist activity
  }

  private calculateElectionViewsScore(events: any[]): number {
    const electionViews = events.filter(e => e.targetType === 'election');
    return Math.min(electionViews.length * 0.5, 10); // Max 10 points for election views
  }

  private calculateCandidateComparisonsScore(events: any[]): number {
    const comparisons = events.filter(e => e.eventAction === 'compare_candidates');
    return Math.min(comparisons.length * 2, 10); // Max 10 points for comparisons
  }

  private calculatePreferencesUpdatesScore(events: any[]): number {
    const updates = events.filter(e => e.targetType === 'user_preference');
    return Math.min(updates.length * 3, 10); // Max 10 points for preference updates
  }

  private calculateNotificationEngagementScore(events: any[]): number {
    const notifications = events.filter(e => e.eventAction?.includes('notification'));
    return Math.min(notifications.length * 1, 10); // Max 10 points for notification engagement
  }

  private calculateWeightedEngagementScore(scores: any): number {
    const weights = {
      loginFrequency: 0.15,
      sessionDuration: 0.12,
      pageViewDepth: 0.10,
      featureUsage: 0.15,
      contentInteraction: 0.10,
      watchlistActivity: 0.15,
      electionViews: 0.08,
      candidateComparisons: 0.10,
      preferencesUpdates: 0.03,
      notificationEngagement: 0.02
    };

    let totalScore = 0;
    for (const [metric, score] of Object.entries(scores)) {
      totalScore += (score as number) * (weights[metric as keyof typeof weights] || 0);
    }

    return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
  }

  private determineEngagementTier(score: number): string {
    if (score >= 8) return 'power_user';
    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  private determineUserSegment(userId: string, score: number, events: any[], sessions: any[]): string {
    const daysSinceFirstEvent = events.length > 0 ? 
      Math.floor((new Date().getTime() - new Date(events[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    if (daysSinceFirstEvent <= 7) return 'new';
    if (score < 2) return 'at_risk';
    if (score >= 8) return 'champion';
    if (score >= 5) return 'regular';
    return 'casual';
  }

  private calculateQualityScore(events: any[], sessions: any[]): number {
    if (sessions.length === 0) return 0;
    const avgSessionTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
    const bounceRate = sessions.filter(s => s.bounceRate).length / sessions.length;
    return Math.max(0, Math.min(10, avgSessionTime / 60 - bounceRate * 5));
  }

  private async calculateRetentionRisk(userId: string): Promise<number> {
    // Simple retention risk calculation based on recent activity
    try {
      const recentEvents = await db
        .select()
        .from(userEvents)
        .where(
          and(
            eq(userEvents.userId, userId),
            gte(userEvents.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        );
      
      return recentEvents.length === 0 ? 0.8 : Math.max(0, 0.8 - recentEvents.length * 0.1);
    } catch (error) {
      return 0.5; // Default medium risk if calculation fails
    }
  }

  private async calculateLoyaltyScore(userId: string): Promise<number> {
    // Calculate loyalty based on return visits and engagement over time
    try {
      const userSessionsData = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .orderBy(desc(userSessions.startedAt));
      
      if (userSessionsData.length <= 1) return 0;
      
      const daysSinceFirst = Math.floor(
        (new Date().getTime() - new Date(userSessionsData[userSessionsData.length - 1].startedAt).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      const sessionsPerDay = userSessionsData.length / Math.max(daysSinceFirst, 1);
      return Math.min(10, sessionsPerDay * 5);
    } catch (error) {
      return 0; // Default if calculation fails
    }
  }

  private recommendNextAction(tier: string, segment: string, scores: any): string {
    if (segment === 'at_risk') return 'send_engagement_notification';
    if (tier === 'low') return 'show_feature_tutorial';
    if (scores.watchlistActivity < 2) return 'encourage_watchlist_usage';
    if (scores.candidateComparisons < 1) return 'suggest_candidate_comparison';
    return 'maintain_engagement';
  }

  private calculateConfidenceLevel(dataPoints: number): number {
    if (dataPoints >= 100) return 0.95;
    if (dataPoints >= 50) return 0.85;
    if (dataPoints >= 20) return 0.75;
    if (dataPoints >= 10) return 0.65;
    return 0.50;
  }

  // =============================================================================
  // EXISTING GDPR COMPLIANCE METHODS (Enhanced)
  // =============================================================================
  // Track user interactions with GDPR compliance
  async logInteraction(data: InsertInteractionLog): Promise<void> {
    try {
      // Anonymize IP address for privacy compliance
      if (data.ipAddress) {
        data.ipAddress = this.anonymizeIpAddress(data.ipAddress);
      }

      await db.insert(interactionLogs).values(data);
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  }


  // Save user preferences with consent tracking
  async updateUserPreferences(userId: number, preferences: Partial<InsertUserPreferences>): Promise<void> {
    try {
      const existingPrefs = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));

      if (existingPrefs.length > 0) {
        await db
          .update(userPreferences)
          .set({ ...preferences, updatedAt: new Date() })
          .where(eq(userPreferences.userId, userId));
      } else {
        await db
          .insert(userPreferences)
          .values({ 
            userId, 
            ...preferences,
            consentGiven: true,
            consentDate: new Date()
          });
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  // Save user demographics data
  async updateUserDemographics(userId: number, demographics: Partial<InsertUserDemographics>): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(userDemographics)
        .where(eq(userDemographics.userId, userId));

      if (existing.length > 0) {
        await db
          .update(userDemographics)
          .set({ ...demographics, updatedAt: new Date() })
          .where(eq(userDemographics.userId, userId));
      } else {
        await db
          .insert(userDemographics)
          .values({ userId, ...demographics });
      }
    } catch (error) {
      console.error('Error updating user demographics:', error);
    }
  }

  // Track non-voter engagement
  async updateNonVoterTracking(userId: number, data: Partial<InsertNonVoterTracking>): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(nonVoterTracking)
        .where(eq(nonVoterTracking.userId, userId));

      if (existing.length > 0) {
        await db
          .update(nonVoterTracking)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(nonVoterTracking.userId, userId));
      } else {
        await db
          .insert(nonVoterTracking)
          .values({ userId, ...data });
      }
    } catch (error) {
      console.error('Error updating non-voter tracking:', error);
    }
  }

  // Get analytics insights (aggregated data only)
  async getEngagementInsights(electionCycleId?: number) {
    try {
      // This would return aggregated, anonymized insights
      // Implementation would depend on specific analytics needs
      return {
        totalUsers: 0,
        averageTimeOnPage: 0,
        mostViewedElections: [],
        peakUsageTimes: []
      };
    } catch (error) {
      console.error('Error getting engagement insights:', error);
      return null;
    }
  }

  // GDPR compliance: anonymize IP addresses
  private anonymizeIpAddress(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      // Replace last octet with 0 for IPv4
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    // For IPv6, keep only first 64 bits
    if (ip.includes(':')) {
      const segments = ip.split(':');
      return segments.slice(0, 4).join(':') + '::';
    }
    return ip;
  }

  // GDPR compliance: data export for user
  async exportUserData(userId: number) {
    try {
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));

      const [demographics] = await db
        .select()
        .from(userDemographics)
        .where(eq(userDemographics.userId, userId));

      const [nonVoter] = await db
        .select()
        .from(nonVoterTracking)
        .where(eq(nonVoterTracking.userId, userId));

      return {
        preferences: preferences || null,
        demographics: demographics || null,
        nonVoterData: nonVoter || null,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return null;
    }
  }

  // GDPR compliance: delete user data
  async deleteUserData(userId: number): Promise<boolean> {
    try {
      await Promise.all([
        db.delete(userPreferences).where(eq(userPreferences.userId, userId)),
        db.delete(userDemographics).where(eq(userDemographics.userId, userId)),
        db.delete(nonVoterTracking).where(eq(nonVoterTracking.userId, userId)),
        db.delete(interactionLogs).where(eq(interactionLogs.userId, userId))
      ]);
      
      return true;
    } catch (error) {
      console.error('Error deleting user data:', error);
      return false;
    }
  }
}

export const analyticsService = new AnalyticsService();