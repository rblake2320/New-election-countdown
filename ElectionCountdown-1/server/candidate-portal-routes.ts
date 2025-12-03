import type { Express } from "express";
import { candidateSecurityService } from "./candidate-security-service";
import { candidateManagementService } from "./candidate-management-service";
import { aiValidationService } from "./ai-validation-service";
import { 
  insertCandidatePositionSchema, 
  insertCandidateQASchema, 
  insertCampaignContentSchema 
} from "@shared/schema";

export function registerCandidatePortalRoutes(app: Express) {
  
  // Apply authentication middleware to all candidate portal routes
  app.use('/api/candidate-portal/*', candidateSecurityService.authenticateCandidate.bind(candidateSecurityService));

  // Candidate Dashboard
  app.get('/api/candidate-portal/dashboard', 
    candidateSecurityService.createRateLimiter('basic'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        
        const dashboard = await candidateManagementService.getDashboardSummary(candidateId);
        
        await candidateSecurityService.createAuditLog(req, 'dashboard_view', { candidateId });
        
        res.json(dashboard);
      } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
      }
    }
  );

  // Profile Management
  app.get('/api/candidate-portal/profile',
    candidateSecurityService.createRateLimiter('basic'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const profile = await candidateManagementService.getCandidateProfile(candidateId);
        res.json(profile);
      } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
      }
    }
  );

  app.put('/api/candidate-portal/profile',
    candidateSecurityService.createRateLimiter('basic'),
    candidateSecurityService.checkFeatureAccess('position_management'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const updates = req.body;
        
        // Validate and sanitize profile updates
        const validation = await candidateSecurityService.validateContent(
          JSON.stringify(updates), 
          'profile_update'
        );
        
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid profile content', 
            warnings: validation.warnings 
          });
        }
        
        const updated = await candidateManagementService.updateCandidateProfile(candidateId, updates);
        
        await candidateSecurityService.createAuditLog(req, 'profile_update', { updates });
        
        res.json(updated);
      } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
      }
    }
  );

  // Position Management
  app.get('/api/candidate-portal/positions',
    candidateSecurityService.createRateLimiter('basic'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const category = req.query.category as string;
        
        const positions = await candidateManagementService.getPositions(candidateId, category);
        res.json(positions);
      } catch (error) {
        console.error('Positions fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch positions' });
      }
    }
  );

  app.post('/api/candidate-portal/positions',
    candidateSecurityService.createRateLimiter('premium'),
    candidateSecurityService.checkFeatureAccess('position_management'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        
        // Validate input
        const validatedData = insertCandidatePositionSchema.parse(req.body);
        
        // Content validation and sanitization
        const validation = await candidateSecurityService.validateContent(
          validatedData.position + ' ' + (validatedData.detailedStatement || ''),
          'position_statement'
        );
        
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid position content', 
            warnings: validation.warnings 
          });
        }
        
        // AI validation for factual accuracy
        const aiValidation = await aiValidationService.validateElectionClaim(
          validatedData.position,
          `Category: ${validatedData.category}`
        );
        
        const position = await candidateManagementService.createPosition(candidateId, {
          ...validatedData,
          position: validation.sanitized.substring(0, validatedData.position.length),
          detailedStatement: validation.sanitized.substring(validatedData.position.length).trim() || validatedData.detailedStatement
        });
        
        await candidateSecurityService.createAuditLog(req, 'position_created', { 
          positionId: position.id, 
          category: validatedData.category,
          aiValidation: aiValidation.confidence
        });
        
        res.status(201).json({ 
          position, 
          aiValidation: {
            confidence: aiValidation.confidence,
            warnings: aiValidation.warnings
          }
        });
      } catch (error) {
        console.error('Position creation error:', error);
        res.status(500).json({ error: 'Failed to create position' });
      }
    }
  );

  app.put('/api/candidate-portal/positions/:id',
    candidateSecurityService.createRateLimiter('premium'),
    candidateSecurityService.checkFeatureAccess('position_management'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const positionId = parseInt(req.params.id);
        const updates = req.body;
        
        // Content validation
        if (updates.position || updates.detailedStatement) {
          const validation = await candidateSecurityService.validateContent(
            (updates.position || '') + ' ' + (updates.detailedStatement || ''),
            'position_statement'
          );
          
          if (!validation.isValid) {
            return res.status(400).json({ 
              error: 'Invalid position content', 
              warnings: validation.warnings 
            });
          }
        }
        
        const updated = await candidateManagementService.updatePosition(candidateId, positionId, updates);
        
        if (!updated) {
          return res.status(404).json({ error: 'Position not found' });
        }
        
        await candidateSecurityService.createAuditLog(req, 'position_updated', { positionId, updates });
        
        res.json(updated);
      } catch (error) {
        console.error('Position update error:', error);
        res.status(500).json({ error: 'Failed to update position' });
      }
    }
  );

  app.delete('/api/candidate-portal/positions/:id',
    candidateSecurityService.createRateLimiter('premium'),
    candidateSecurityService.checkFeatureAccess('position_management'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const positionId = parseInt(req.params.id);
        
        const deleted = await candidateManagementService.deletePosition(candidateId, positionId);
        
        if (!deleted) {
          return res.status(404).json({ error: 'Position not found' });
        }
        
        await candidateSecurityService.createAuditLog(req, 'position_deleted', { positionId });
        
        res.json({ success: true });
      } catch (error) {
        console.error('Position deletion error:', error);
        res.status(500).json({ error: 'Failed to delete position' });
      }
    }
  );

  // Q&A Management
  app.get('/api/candidate-portal/qa',
    candidateSecurityService.createRateLimiter('basic'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const filters = {
          category: req.query.category as string,
          isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
          isPriority: req.query.isPriority === 'true' ? true : req.query.isPriority === 'false' ? false : undefined
        };
        
        const qas = await candidateManagementService.getQAs(candidateId, filters);
        res.json(qas);
      } catch (error) {
        console.error('Q&A fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch Q&As' });
      }
    }
  );

  app.post('/api/candidate-portal/qa',
    candidateSecurityService.createRateLimiter('premium'),
    candidateSecurityService.checkFeatureAccess('advanced_qa'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        
        // Validate input
        const validatedData = insertCandidateQASchema.parse(req.body);
        
        // Content validation
        const validation = await candidateSecurityService.validateContent(
          validatedData.question + ' ' + validatedData.answer,
          'qa_answer'
        );
        
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid Q&A content', 
            warnings: validation.warnings 
          });
        }
        
        // AI validation for answer accuracy
        const aiValidation = await aiValidationService.validateElectionClaim(
          validatedData.answer,
          `Question: ${validatedData.question}`
        );
        
        const qa = await candidateManagementService.createQA(candidateId, {
          ...validatedData,
          answer: validation.sanitized.substring(validatedData.question.length).trim()
        });
        
        await candidateSecurityService.createAuditLog(req, 'qa_created', { 
          qaId: qa.id, 
          category: validatedData.category,
          aiValidation: aiValidation.confidence
        });
        
        res.status(201).json({ 
          qa, 
          aiValidation: {
            confidence: aiValidation.confidence,
            warnings: aiValidation.warnings
          }
        });
      } catch (error) {
        console.error('Q&A creation error:', error);
        res.status(500).json({ error: 'Failed to create Q&A' });
      }
    }
  );

  // Campaign Content Management
  app.get('/api/candidate-portal/content',
    candidateSecurityService.createRateLimiter('basic'),
    candidateSecurityService.checkFeatureAccess('content_management'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const filters = {
          contentType: req.query.contentType as string,
          isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined
        };
        
        const content = await candidateManagementService.getContent(candidateId, filters);
        res.json(content);
      } catch (error) {
        console.error('Content fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
      }
    }
  );

  app.post('/api/candidate-portal/content',
    candidateSecurityService.createRateLimiter('premium'),
    candidateSecurityService.checkFeatureAccess('content_management'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        
        // Validate input
        const validatedData = insertCampaignContentSchema.parse(req.body);
        
        // Content validation and sanitization
        const validation = await candidateSecurityService.validateContent(
          validatedData.content,
          'campaign_content'
        );
        
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid campaign content', 
            warnings: validation.warnings 
          });
        }
        
        const content = await candidateManagementService.createContent(candidateId, {
          ...validatedData,
          content: validation.sanitized
        });
        
        await candidateSecurityService.createAuditLog(req, 'content_created', { 
          contentId: content.id, 
          contentType: validatedData.contentType
        });
        
        res.status(201).json(content);
      } catch (error) {
        console.error('Content creation error:', error);
        res.status(500).json({ error: 'Failed to create content' });
      }
    }
  );

  app.put('/api/candidate-portal/content/:id/publish',
    candidateSecurityService.createRateLimiter('premium'),
    candidateSecurityService.checkFeatureAccess('content_management'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const contentId = parseInt(req.params.id);
        
        const published = await candidateManagementService.publishContent(candidateId, contentId);
        
        if (!published) {
          return res.status(404).json({ error: 'Content not found' });
        }
        
        await candidateSecurityService.createAuditLog(req, 'content_published', { contentId });
        
        res.json(published);
      } catch (error) {
        console.error('Content publish error:', error);
        res.status(500).json({ error: 'Failed to publish content' });
      }
    }
  );

  // Analytics and Insights
  app.get('/api/candidate-portal/analytics',
    candidateSecurityService.createRateLimiter('basic'),
    candidateSecurityService.checkFeatureAccess('basic_analytics'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const timeframe = (req.query.timeframe as '24h' | '7d' | '30d' | '90d') || '7d';
        
        const analytics = await candidateManagementService.getCandidateAnalytics(candidateId, timeframe);
        
        await candidateSecurityService.createAuditLog(req, 'analytics_view', { timeframe });
        
        res.json(analytics);
      } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
      }
    }
  );

  // Real-time Polling Data
  app.get('/api/candidate-portal/polling',
    candidateSecurityService.createRateLimiter('premium'),
    candidateSecurityService.checkFeatureAccess('real_time_polling'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const days = parseInt(req.query.days as string) || 30;
        
        const polling = await candidateManagementService.getPollingTrends(candidateId, days);
        res.json(polling);
      } catch (error) {
        console.error('Polling data error:', error);
        res.status(500).json({ error: 'Failed to fetch polling data' });
      }
    }
  );

  // Subscription Status
  app.get('/api/candidate-portal/subscription',
    candidateSecurityService.createRateLimiter('basic'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const subscription = await candidateManagementService.getSubscriptionStatus(candidateId);
        res.json(subscription);
      } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription status' });
      }
    }
  );

  // Security and Audit
  app.get('/api/candidate-portal/security/activity',
    candidateSecurityService.createRateLimiter('enterprise'),
    candidateSecurityService.checkFeatureAccess('api_access'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        
        // Check for suspicious activity
        const suspiciousActivity = await candidateSecurityService.checkSuspiciousActivity(candidateId);
        
        res.json({
          candidateId,
          securityStatus: suspiciousActivity.isSuspicious ? 'warning' : 'normal',
          alerts: suspiciousActivity.reasons,
          lastChecked: new Date()
        });
      } catch (error) {
        console.error('Security check error:', error);
        res.status(500).json({ error: 'Failed to check security status' });
      }
    }
  );

  // Search functionality
  app.get('/api/candidate-portal/search',
    candidateSecurityService.createRateLimiter('basic'),
    async (req, res) => {
      try {
        const candidateId = req.candidateSession!.candidateId;
        const query = req.query.q as string;
        const type = req.query.type as string;
        
        if (!query || query.length < 2) {
          return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }
        
        let results: any = {};
        
        if (!type || type === 'content') {
          results.content = await candidateManagementService.searchContent(candidateId, query);
        }
        
        if (!type || type === 'qa') {
          results.qa = await candidateManagementService.searchQAs(candidateId, query);
        }
        
        res.json(results);
      } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
      }
    }
  );
}