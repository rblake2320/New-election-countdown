import type { Request, Response, NextFunction } from 'express';

interface ComplianceConfig {
  regulations: string[];
  dataTypes: string[];
  retentionPeriod: number;
  allowedCountries: string[];
}

interface DataClassification {
  type: 'voter_location' | 'ballot_preferences' | 'personal_info' | 'political_affiliation';
  sensitivity: 'public' | 'restricted' | 'confidential';
  jurisdiction: string[];
}

interface AuditLog {
  timestamp: Date;
  userId?: string;
  action: string;
  dataType: string;
  ipAddress: string;
  userAgent: string;
  complianceStatus: 'approved' | 'flagged' | 'blocked';
  reason?: string;
}

export class ComplianceService {
  private config: ComplianceConfig = {
    regulations: ['GDPR', 'CCPA', 'PIPEDA', 'LGPD', 'GlobalVoterProtectAct'],
    dataTypes: ['voter_location', 'ballot_preferences', 'personal_info', 'political_affiliation'],
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years in milliseconds
    allowedCountries: ['US', 'CA', 'GB', 'EU', 'AU', 'NZ']
  };

  private auditLogs: AuditLog[] = [];

  // Geographic compliance checker
  async checkGeoCompliance(req: Request): Promise<boolean> {
    const clientIP = this.getClientIP(req);
    const country = await this.getCountryFromIP(clientIP);
    
    if (!this.config.allowedCountries.includes(country)) {
      this.logCompliance(req, 'geo_check', 'blocked', `Access from ${country} not permitted`);
      return false;
    }
    
    return true;
  }

  // GDPR compliance middleware
  gdprMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('User-Agent') || '';
    const acceptsDataProcessing = req.headers['x-data-consent'] === 'true';
    
    // Check if request involves personal data
    if (this.involvesPersonalData(req)) {
      if (!acceptsDataProcessing) {
        this.logCompliance(req, 'gdpr_check', 'blocked', 'No data processing consent');
        return res.status(403).json({
          error: 'Data processing consent required',
          gdpr: true,
          redirectTo: '/privacy-consent'
        });
      }
    }
    
    this.logCompliance(req, 'gdpr_check', 'approved');
    next();
  };

  // CCPA compliance middleware
  ccpaMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const doNotSell = req.headers['x-do-not-sell'] === 'true';
    const californiaRequest = req.headers['cf-ipcountry'] === 'US' || 
                            req.headers['x-state'] === 'CA';
    
    if (californiaRequest && doNotSell) {
      // Flag for no data sharing/selling
      req.body.ccpaDoNotSell = true;
      this.logCompliance(req, 'ccpa_check', 'approved', 'Do not sell flag set');
    }
    
    next();
  };

  // Election law compliance
  electionLawMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const isElectionDay = this.isElectionDay();
    const involvesVoting = this.involvesVotingData(req);
    
    if (isElectionDay && involvesVoting) {
      // Enhanced logging during election periods
      this.logCompliance(req, 'election_law', 'approved', 'Election day voting data access');
      
      // Rate limiting during elections
      const rateLimitKey = this.getClientIP(req);
      if (this.checkElectionDayRateLimit(rateLimitKey)) {
        return res.status(429).json({
          error: 'Rate limit exceeded during election period',
          retryAfter: 300 // 5 minutes
        });
      }
    }
    
    next();
  };

  // Data retention compliance
  async enforceDataRetention(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.config.retentionPeriod);
    
    // Clean up old audit logs
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);
    
    // In a real implementation, this would clean database records
    console.log(`Data retention enforced: removed records older than ${cutoffDate.toISOString()}`);
  }

  // Privacy rights handler
  async handlePrivacyRequest(request: {
    type: 'access' | 'deletion' | 'portability' | 'correction';
    userId: string;
    email: string;
    verification: string;
  }): Promise<{ success: boolean; data?: any; message: string }> {
    
    // Verify identity (simplified)
    if (!this.verifyIdentity(request.userId, request.verification)) {
      return {
        success: false,
        message: 'Identity verification failed'
      };
    }
    
    switch (request.type) {
      case 'access':
        return {
          success: true,
          data: await this.getUserData(request.userId),
          message: 'User data retrieved'
        };
        
      case 'deletion':
        await this.deleteUserData(request.userId);
        return {
          success: true,
          message: 'User data deleted successfully'
        };
        
      case 'portability':
        return {
          success: true,
          data: await this.exportUserData(request.userId),
          message: 'User data exported in portable format'
        };
        
      case 'correction':
        return {
          success: true,
          message: 'Data correction request submitted for review'
        };
        
      default:
        return {
          success: false,
          message: 'Invalid request type'
        };
    }
  }

  // International election compliance
  async validateInternationalElection(electionData: {
    country: string;
    type: string;
    date: string;
    regulations: string[];
  }): Promise<boolean> {
    
    // Check against international election standards
    const ideaStandards = await this.checkIDEACompliance(electionData);
    const aceCompliance = await this.checkACECompliance(electionData);
    
    return ideaStandards && aceCompliance;
  }

  private getClientIP(req: Request): string {
    return req.headers['cf-connecting-ip'] as string ||
           req.headers['x-forwarded-for'] as string ||
           req.connection.remoteAddress ||
           '127.0.0.1';
  }

  private async getCountryFromIP(ip: string): Promise<string> {
    // In production, use a GeoIP service
    // For now, return US as default
    return 'US';
  }

  private involvesPersonalData(req: Request): boolean {
    const personalDataPaths = [
      '/api/user',
      '/api/watchlist',
      '/api/voter-info',
      '/api/analytics/interaction'
    ];
    
    return personalDataPaths.some(path => req.path.startsWith(path));
  }

  private involvesVotingData(req: Request): boolean {
    const votingPaths = [
      '/api/elections',
      '/api/candidates',
      '/api/voter-info',
      '/api/ballot'
    ];
    
    return votingPaths.some(path => req.path.startsWith(path));
  }

  private isElectionDay(): boolean {
    const today = new Date();
    const electionDays = [
      '2024-11-05', // General Election Day
      '2025-11-04', // Next General Election Day
      '2026-11-03'  // Following General Election Day
    ];
    
    const todayStr = today.toISOString().split('T')[0];
    return electionDays.includes(todayStr);
  }

  private checkElectionDayRateLimit(ip: string): boolean {
    // Simplified rate limiting - in production, use Redis
    return false;
  }

  private logCompliance(
    req: Request, 
    action: string, 
    status: 'approved' | 'flagged' | 'blocked',
    reason?: string
  ): void {
    this.auditLogs.push({
      timestamp: new Date(),
      userId: req.headers['x-user-id'] as string,
      action,
      dataType: this.classifyDataType(req),
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent') || '',
      complianceStatus: status,
      reason
    });
  }

  private classifyDataType(req: Request): string {
    if (req.path.includes('voter-info')) return 'voter_location';
    if (req.path.includes('ballot')) return 'ballot_preferences';
    if (req.path.includes('user')) return 'personal_info';
    if (req.path.includes('analytics')) return 'political_affiliation';
    return 'general';
  }

  private verifyIdentity(userId: string, verification: string): boolean {
    // Simplified verification - in production, use proper identity verification
    return verification.length > 8;
  }

  private async getUserData(userId: string): Promise<any> {
    // Return user data for privacy requests
    return {
      userId,
      dataCollected: this.auditLogs.filter(log => log.userId === userId),
      retentionPolicy: this.config.retentionPeriod / (1000 * 60 * 60 * 24) + ' days'
    };
  }

  private async deleteUserData(userId: string): Promise<void> {
    // Remove user from audit logs
    this.auditLogs = this.auditLogs.filter(log => log.userId !== userId);
    // In production, this would cascade delete from all tables
  }

  private async exportUserData(userId: string): Promise<any> {
    const userData = await this.getUserData(userId);
    return {
      format: 'JSON',
      standard: 'GDPR Article 20',
      data: userData,
      exportDate: new Date().toISOString()
    };
  }

  private async checkIDEACompliance(electionData: any): Promise<boolean> {
    // Check against International IDEA standards
    // In production, this would call their API
    return true;
  }

  private async checkACECompliance(electionData: any): Promise<boolean> {
    // Check against ACE Electoral Network standards
    // In production, this would integrate with ACE API
    return true;
  }

  // Get compliance status for dashboard
  getComplianceStatus(): {
    regulations: string[];
    auditLogCount: number;
    lastRetentionCleanup: Date;
    dataTypes: string[];
  } {
    return {
      regulations: this.config.regulations,
      auditLogCount: this.auditLogs.length,
      lastRetentionCleanup: new Date(),
      dataTypes: this.config.dataTypes
    };
  }
}

export const complianceService = new ComplianceService();