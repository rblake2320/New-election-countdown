import { db } from "./db";
import { candidateSubscriptions, candidates, candidateQA, candidatePositions, campaignContent, voterInteractions } from "@shared/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

interface CandidateSession {
  candidateId: number;
  subscriptionTier: string;
  features: any;
  isVerified: boolean;
}

export class CandidateSecurityService {
  private readonly JWT_SECRET = process.env.CANDIDATE_JWT_SECRET || 'candidate-secure-key-2024';
  private readonly SESSION_DURATION = '7d';
  
  // Rate limiting configurations per subscription tier
  private readonly rateLimits = {
    basic: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
    premium: { windowMs: 15 * 60 * 1000, max: 500 }, // 500 requests per 15 minutes
    enterprise: { windowMs: 15 * 60 * 1000, max: 2000 } // 2000 requests per 15 minutes
  };

  // Create rate limiter based on subscription tier
  createRateLimiter(tier: string) {
    const limits = this.rateLimits[tier as keyof typeof this.rateLimits] || this.rateLimits.basic;
    
    return rateLimit({
      windowMs: limits.windowMs,
      max: limits.max,
      message: {
        error: 'Rate limit exceeded',
        tier,
        limit: limits.max,
        windowMs: limits.windowMs
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => {
        // Use candidate ID for rate limiting
        return req.candidateSession?.candidateId?.toString() || req.ip || 'anonymous';
      }
    });
  }

  // Authenticate candidate session
  async authenticateCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please provide valid candidate authentication token' 
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Verify candidate exists and subscription is active
      const [candidate] = await db
        .select({
          id: candidates.id,
          name: candidates.name,
          isVerified: candidates.isVerified,
          subscriptionTier: candidates.subscriptionTier,
          subscription: candidateSubscriptions
        })
        .from(candidates)
        .leftJoin(candidateSubscriptions, eq(candidates.id, candidateSubscriptions.candidateId))
        .where(and(
          eq(candidates.id, decoded.candidateId),
          eq(candidateSubscriptions.isActive, true),
          gte(candidateSubscriptions.endDate, new Date())
        ));

      if (!candidate) {
        return res.status(401).json({ 
          error: 'Invalid or expired subscription',
          message: 'Please renew your subscription to access the campaign portal' 
        });
      }

      // Attach candidate session to request
      req.candidateSession = {
        candidateId: candidate.id,
        subscriptionTier: candidate.subscriptionTier || 'basic',
        features: candidate.subscription?.features || {},
        isVerified: candidate.isVerified || false
      };

      next();
    } catch (error) {
      console.error('Candidate authentication error:', error);
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid or expired authentication token' 
      });
    }
  }

  // Check subscription feature access
  checkFeatureAccess(requiredFeature: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const session = req.candidateSession;
      
      if (!session) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const tierFeatures = {
        basic: ['basic_qa', 'position_management', 'basic_analytics'],
        premium: ['basic_qa', 'position_management', 'basic_analytics', 'advanced_qa', 'content_management', 'real_time_polling'],
        enterprise: ['basic_qa', 'position_management', 'basic_analytics', 'advanced_qa', 'content_management', 'real_time_polling', 'custom_branding', 'api_access', 'bulk_operations']
      };

      const allowedFeatures = tierFeatures[session.subscriptionTier as keyof typeof tierFeatures] || tierFeatures.basic;
      
      if (!allowedFeatures.includes(requiredFeature)) {
        return res.status(403).json({ 
          error: 'Feature not available',
          message: `${requiredFeature} requires ${this.getRequiredTier(requiredFeature)} subscription or higher`,
          currentTier: session.subscriptionTier,
          requiredTier: this.getRequiredTier(requiredFeature)
        });
      }

      next();
    };
  }

  private getRequiredTier(feature: string): string {
    if (['basic_qa', 'position_management', 'basic_analytics'].includes(feature)) return 'basic';
    if (['advanced_qa', 'content_management', 'real_time_polling'].includes(feature)) return 'premium';
    return 'enterprise';
  }

  // Validate content for security and compliance
  async validateContent(content: string, contentType: string): Promise<{ isValid: boolean; warnings: string[]; sanitized: string }> {
    const warnings: string[] = [];
    let sanitized = content;

    // Remove potentially harmful content
    const harmfulPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ];

    harmfulPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        warnings.push('Potentially harmful content detected and removed');
        sanitized = sanitized.replace(pattern, '');
      }
    });

    // Check for compliance issues (campaign finance, election law)
    const compliancePatterns = [
      /\b(?:cash|bitcoin|cryptocurrency|anonymous.donation)\b/gi,
      /\b(?:voter.suppression|election.fraud)\b/gi
    ];

    compliancePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        warnings.push('Content may require legal review for compliance');
      }
    });

    // Validate character limits based on content type
    const limits = {
      'qa_answer': 5000,
      'position_statement': 10000,
      'campaign_content': 50000
    };

    const limit = limits[contentType as keyof typeof limits] || 1000;
    if (sanitized.length > limit) {
      warnings.push(`Content exceeds ${limit} character limit`);
      sanitized = sanitized.substring(0, limit);
    }

    return {
      isValid: warnings.length === 0 || warnings.every(w => !w.includes('harmful')),
      warnings,
      sanitized
    };
  }

  // Generate secure candidate authentication token
  async generateCandidateToken(candidateId: number): Promise<string> {
    const payload = {
      candidateId,
      type: 'candidate_portal',
      issued: Date.now()
    };

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.SESSION_DURATION });
  }

  // Log security events
  async logSecurityEvent(event: {
    candidateId: number;
    eventType: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    try {
      // Insert security log (could be a dedicated security_logs table)
      await db.insert(voterInteractions).values({
        candidateId: event.candidateId,
        interactionType: `security_${event.eventType}`,
        metadata: {
          event: event.eventType,
          description: event.description,
          timestamp: new Date().toISOString(),
          ...event.metadata
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Audit trail for candidate actions
  async createAuditLog(req: Request, action: string, details: any) {
    const session = req.candidateSession;
    if (!session) return;

    await this.logSecurityEvent({
      candidateId: session.candidateId,
      eventType: 'audit',
      description: `Candidate action: ${action}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        action,
        details,
        subscriptionTier: session.subscriptionTier,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Check for suspicious activity patterns
  async checkSuspiciousActivity(candidateId: number): Promise<{ isSuspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    
    // Check for rapid content creation (potential spam)
    const recentContent = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaignContent)
      .where(and(
        eq(campaignContent.candidateId, candidateId),
        gte(campaignContent.createdAt, new Date(Date.now() - 60 * 60 * 1000)) // last hour
      ));

    if (recentContent[0]?.count > 20) {
      reasons.push('Unusually high content creation rate');
    }

    // Check for multiple login attempts from different IPs
    const recentLogins = await db
      .select({ 
        ipAddress: voterInteractions.ipAddress,
        count: sql<number>`count(*)` 
      })
      .from(voterInteractions)
      .where(and(
        eq(voterInteractions.candidateId, candidateId),
        eq(voterInteractions.interactionType, 'security_login'),
        gte(voterInteractions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // last 24 hours
      ))
      .groupBy(voterInteractions.ipAddress);

    if (recentLogins.length > 5) {
      reasons.push('Multiple login attempts from different locations');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  }

  // Data encryption for sensitive information
  async encryptSensitiveData(data: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(data, saltRounds);
  }

  async verifySensitiveData(data: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(data, hash);
  }
}

// Extend Express Request type to include candidate session
declare global {
  namespace Express {
    interface Request {
      candidateSession?: CandidateSession;
    }
  }
}

export const candidateSecurityService = new CandidateSecurityService();