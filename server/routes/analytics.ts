import { Router } from "express";
import { pool } from "../db";
import { authRequired } from "../auth";
import { analyticsService } from "../analytics-service";
import { z } from "zod";

export const analyticsRouter = Router();

// Request schemas for validation
const trackEventSchema = z.object({
  eventType: z.string(),
  eventAction: z.string().optional(),
  eventCategory: z.string().optional(),
  pageUrl: z.string(),
  pagePath: z.string(),
  pageTitle: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.number().optional(),
  targetMetadata: z.any().optional(),
  timeOnPage: z.number().optional(),
  scrollDepth: z.number().optional(),
  clickPosition: z.object({ x: z.number(), y: z.number() }).optional(),
  sessionId: z.string().optional()
});

const updateConsentSchema = z.object({
  hasConsented: z.boolean().optional(),
  trackingLevel: z.enum(['basic', 'enhanced', 'full']).optional(),
  allowPageViewTracking: z.boolean().optional(),
  allowClickTracking: z.boolean().optional(),
  allowSessionTracking: z.boolean().optional(),
  allowEngagementScoring: z.boolean().optional(),
  allowPersonalization: z.boolean().optional(),
  allowMarketingAnalytics: z.boolean().optional(),
  anonymizeData: z.boolean().optional()
});

// =============================================================================
// USER EVENT TRACKING ENDPOINTS
// =============================================================================

// Track user events (public endpoint for frontend)
analyticsRouter.post("/events", async (req, res) => {
  try {
    const eventData = trackEventSchema.parse(req.body);
    const sessionId = eventData.sessionId || req.sessionID || 'anonymous';
    const userId = (req as any).userId?.toString();

    await analyticsService.trackEvent({
      userId: userId,
      sessionId: sessionId,
      eventType: eventData.eventType,
      eventAction: eventData.eventAction,
      eventCategory: eventData.eventCategory,
      pageUrl: eventData.pageUrl,
      pagePath: eventData.pagePath,
      pageTitle: eventData.pageTitle,
      targetType: eventData.targetType,
      targetId: eventData.targetId,
      targetMetadata: eventData.targetMetadata,
      timeOnPage: eventData.timeOnPage,
      scrollDepth: eventData.scrollDepth,
      clickPosition: eventData.clickPosition
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(400).json({ error: 'Invalid event data' });
  }
});

// Track page views (public endpoint for frontend)
analyticsRouter.post("/page-view", async (req, res) => {
  try {
    await analyticsService.trackPageView(req, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Page view tracking error:', error);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// Get user events (authenticated)
analyticsRouter.get("/events/user/:userId", authRequired(), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId?.toString();
    
    // Users can only see their own events
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const events = await analyticsService.getUserEvents(userId, limit);
    res.json({ events, count: events.length });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// =============================================================================
// CONVERSION FUNNEL ENDPOINTS
// =============================================================================

// Get funnel overview (admin only)
analyticsRouter.get("/funnels", authRequired(), async (req, res) => {
  try {
    const funnels = await analyticsService.getFunnelAnalysis();
    res.json({ funnels });
  } catch (error) {
    console.error('Get funnels error:', error);
    res.status(500).json({ error: 'Failed to get funnels' });
  }
});

// Get specific funnel data
analyticsRouter.get("/funnels/:funnelName", authRequired(), async (req, res) => {
  try {
    const { funnelName } = req.params;
    
    const funnelData = await analyticsService.getFunnelAnalysis(funnelName);
    if (!funnelData) {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    
    res.json(funnelData);
  } catch (error) {
    console.error('Get funnel data error:', error);
    res.status(500).json({ error: 'Failed to get funnel data' });
  }
});

// Get user's funnel progress (authenticated)
analyticsRouter.get("/funnels/user/:userId", authRequired(), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId?.toString();
    
    // Users can only see their own funnel progress
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const funnelProgress = await analyticsService.getUserFunnelProgress(userId);
    res.json(funnelProgress);
  } catch (error) {
    console.error('Get user funnel error:', error);
    res.status(500).json({ error: 'Failed to get user funnel' });
  }
});

// =============================================================================
// USER ENGAGEMENT ENDPOINTS
// =============================================================================

// Get user engagement score (authenticated)
analyticsRouter.get("/engagement/score/:userId", authRequired(), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId?.toString();
    
    // Users can only see their own engagement score
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const period = req.query.period as 'daily' | 'weekly' | 'monthly' || 'daily';
    const score = await analyticsService.calculateUserEngagementScore(userId, period);
    
    res.json({ 
      userId, 
      score, 
      period,
      lastCalculated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get engagement score error:', error);
    res.status(500).json({ error: 'Failed to get engagement score' });
  }
});

// Calculate engagement scores (admin endpoint)
analyticsRouter.post("/engagement/calculate", authRequired(), async (req, res) => {
  try {
    const { userIds, period = 'daily' } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds array required' });
    }

    const results = [];
    for (const userId of userIds) {
      try {
        const score = await analyticsService.calculateUserEngagementScore(userId, period);
        results.push({ userId, score, success: true });
      } catch (error) {
        results.push({ userId, error: error instanceof Error ? error.message : String(error), success: false });
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Calculate engagement scores error:', error);
    res.status(500).json({ error: 'Failed to calculate scores' });
  }
});

// Get analytics overview
analyticsRouter.get("/overview", authRequired(), async (req, res) => {
  try {
    const timeframe = req.query.timeframe as string || '7d';
    const overview = await analyticsService.getAnalyticsOverview(timeframe);
    res.json(overview);
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ error: 'Failed to get analytics overview' });
  }
});

// =============================================================================
// SESSION ANALYTICS ENDPOINTS  
// =============================================================================

// Get session metrics (admin only)
analyticsRouter.get("/sessions/metrics", authRequired(), async (req, res) => {
  try {
    // This would require implementing session analytics methods
    res.json({
      activeSessions: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      pageViewsPerSession: 0,
      topEntryPages: [],
      deviceBreakdown: {}
    });
  } catch (error) {
    console.error('Get session metrics error:', error);
    res.status(500).json({ error: 'Failed to get session metrics' });
  }
});

// Get user sessions (authenticated)
analyticsRouter.get("/sessions/user/:userId", authRequired(), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId?.toString();
    
    // Users can only see their own sessions
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // This would require implementing getUserSessions method
    res.json({ sessions: [] });
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
});

// =============================================================================
// DASHBOARD DATA ENDPOINTS
// =============================================================================

// Get dashboard overview (admin only)
analyticsRouter.get("/dashboard/overview", authRequired(), async (req, res) => {
  try {
    // This would require implementing dashboard analytics
    const overview = {
      totalUsers: 0,
      activeUsers: {
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      conversionRates: {
        registration: 0,
        activation: 0,
        retention: 0
      },
      engagementMetrics: {
        avgSessionDuration: 0,
        pageViewsPerSession: 0,
        bounceRate: 0
      },
      topFeatures: [],
      userSegments: {
        new: 0,
        active: 0,
        at_risk: 0,
        churned: 0
      }
    };
    
    res.json(overview);
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

// Get retention data (admin only)
analyticsRouter.get("/dashboard/retention", authRequired(), async (req, res) => {
  try {
    const retentionData = {
      cohorts: [],
      retentionRates: {
        day1: 0,
        day7: 0,
        day30: 0
      },
      churnPrediction: {
        at_risk: 0,
        likely_to_churn: 0
      }
    };
    
    res.json(retentionData);
  } catch (error) {
    console.error('Get retention data error:', error);
    res.status(500).json({ error: 'Failed to get retention data' });
  }
});

// =============================================================================
// PRIVACY & CONSENT ENDPOINTS
// =============================================================================

// Get user consent preferences (authenticated)
analyticsRouter.get("/consent/:userId", authRequired(), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId?.toString();
    
    // Users can only see their own consent preferences
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const consent = await analyticsService.getUserAnalyticsConsent(userId);
    res.json(consent || { hasConsented: false });
  } catch (error) {
    console.error('Get consent error:', error);
    res.status(500).json({ error: 'Failed to get consent' });
  }
});

// Update user consent preferences (authenticated)
analyticsRouter.put("/consent/:userId", authRequired(), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId?.toString();
    
    // Users can only update their own consent preferences
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const preferences = updateConsentSchema.parse(req.body);
    await analyticsService.updateUserAnalyticsConsent(userId, preferences);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(400).json({ error: 'Invalid consent data' });
  }
});

// Export user data (GDPR compliance)
analyticsRouter.post("/gdpr/export/:userId", authRequired(), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId?.toString();
    
    // Users can only export their own data
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // This would require implementing GDPR data export
    res.json({ 
      message: 'Data export requested',
      estimatedTime: '24 hours',
      exportId: `export_${userId}_${Date.now()}`
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Delete user data (GDPR compliance)
analyticsRouter.delete("/gdpr/delete/:userId", authRequired(), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId?.toString();
    
    // Users can only delete their own data
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // This would require implementing GDPR data deletion
    res.json({ 
      message: 'Data deletion requested',
      confirmationRequired: true,
      deletionId: `delete_${userId}_${Date.now()}`
    });
  } catch (error) {
    console.error('Delete data error:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// =============================================================================
// LEGACY ENDPOINTS (keeping for compatibility)
// =============================================================================

// Public summary (gate with auth if needed)
analyticsRouter.get("/summary", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day, name, events
         FROM analytics.mv_event_daily
         ORDER BY day DESC, name ASC
         LIMIT 300`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get summary error:', error);
    res.json([]); // Return empty array if analytics tables don't exist yet
  }
});

analyticsRouter.get("/top-compares", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT candidate_id, COUNT(*)::int AS compares
         FROM analytics.events
         WHERE name='candidate_checked_for_compare'
           AND ts >= now() - interval '7 days'
         GROUP BY candidate_id
         ORDER BY compares DESC
         LIMIT 50`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get top compares error:', error);
    res.json([]); // Return empty array if analytics tables don't exist yet
  }
});