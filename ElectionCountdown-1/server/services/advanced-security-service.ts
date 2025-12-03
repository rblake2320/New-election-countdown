/**
 * Advanced Security Service
 * Enhanced threat detection, automated response, and security analytics
 * Builds on existing security-middleware.ts foundations
 */

import { Request, Response, NextFunction } from 'express';
import { monitoringService } from './monitoring-service';
import { securityLogger } from '../security-middleware';

export interface ThreatLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  reasons: string[];
  action: 'log' | 'throttle' | 'block' | 'captcha';
}

export interface SecurityAnalytics {
  totalRequests: number;
  blockedRequests: number;
  suspiciousRequests: number;
  threatsByLevel: Record<string, number>;
  topAttackTypes: Array<{ type: string; count: number }>;
  topAttackerIPs: Array<{ ip: string; count: number; threatLevel: string }>;
  recentBlocks: Array<{ ip: string; reason: string; timestamp: Date }>;
}

class AdvancedSecurityService {
  private requestHistory = new Map<string, Array<{ timestamp: number; path: string; threat: ThreatLevel }>>();
  private blockedIPs = new Set<string>();
  private suspiciousPatterns: Array<{ pattern: RegExp; type: string; weight: number }> = [
    // Advanced SQL injection patterns
    { pattern: /(\bunion\b.*\bselect\b|\bselect\b.*\bunion\b)/i, type: 'sql_injection_advanced', weight: 30 },
    { pattern: /(\bexec\b|\bexecute\b).*\(/i, type: 'sql_execution', weight: 40 },
    { pattern: /(benchmark|sleep|waitfor)\s*\(/i, type: 'sql_timing_attack', weight: 35 },
    
    // XSS patterns
    { pattern: /<script[^>]*>.*?<\/script>/i, type: 'xss_script_tag', weight: 40 },
    { pattern: /javascript\s*:/i, type: 'xss_javascript_protocol', weight: 30 },
    { pattern: /on(click|load|error|focus|blur)\s*=/i, type: 'xss_event_handler', weight: 25 },
    
    // Path traversal
    { pattern: /\.\.[\/\\]/g, type: 'path_traversal', weight: 35 },
    { pattern: /(\/etc\/passwd|\/proc\/|\.\.\/)/i, type: 'directory_traversal', weight: 40 },
    
    // Command injection
    { pattern: /[;&|`$(){}]/g, type: 'command_injection', weight: 30 },
    { pattern: /(rm\s+-rf|format\s+c:|del\s+\/)/i, type: 'destructive_command', weight: 45 },
    
    // Enumeration attempts
    { pattern: /(admin|root|test|demo|guest)/i, type: 'username_enumeration', weight: 15 },
    { pattern: /(password|passwd|pwd|secret)/i, type: 'password_enumeration', weight: 20 },
    
    // Data exfiltration
    { pattern: /(base64|hex|url)encode/i, type: 'encoding_attempt', weight: 20 },
    { pattern: /eval\s*\(|function\s*\(/i, type: 'code_execution', weight: 35 }
  ];

  private analytics: SecurityAnalytics = {
    totalRequests: 0,
    blockedRequests: 0,
    suspiciousRequests: 0,
    threatsByLevel: { low: 0, medium: 0, high: 0, critical: 0 },
    topAttackTypes: [],
    topAttackerIPs: [],
    recentBlocks: []
  };

  /**
   * Check if request is from legitimate monitoring/testing client
   */
  private isLegitimateClient(req: Request): boolean {
    const userAgent = req.get('User-Agent') || '';
    const host = req.get('Host') || '';
    const ip = req.ip || req.connection?.remoteAddress || '';
    
    // Allow HeadlessChrome (Playwright/Puppeteer testing)
    if (userAgent.includes('HeadlessChrome') || userAgent.includes('Playwright') || userAgent.includes('Puppeteer')) {
      return true;
    }
    
    // Allow localhost requests
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.') || 
        host.includes('localhost') || host.includes('127.0.0.1')) {
      return true;
    }
    
    // Allow internal monitoring services
    if (userAgent.includes('ElectionTracker') || userAgent.includes('Replit-Agent')) {
      return true;
    }
    
    // Allow monitoring endpoints
    const monitoringPaths = [
      '/api/monitoring', '/api/health', '/api/failover', '/api/storage/health',
      '/api/system/status', '/api/track', '/api/analytics', '/favicon.ico', '/'
    ];
    
    if (monitoringPaths.some(path => req.path.startsWith(path) || req.path === path)) {
      return true;
    }
    
    return false;
  }

  /**
   * Analyze request for threats
   */
  analyzeRequest(req: Request): ThreatLevel {
    // Skip threat analysis for legitimate monitoring clients
    if (this.isLegitimateClient(req)) {
      return {
        level: 'low',
        score: 0,
        reasons: [],
        action: 'log'
      };
    }

    const threats: { type: string; weight: number }[] = [];
    let totalScore = 0;
    
    // Analyze URL, query params, and headers
    const analysisTargets = [
      req.url,
      JSON.stringify(req.query),
      JSON.stringify(req.body || {}),
      req.get('User-Agent') || '',
      req.get('Referer') || ''
    ];

    for (const target of analysisTargets) {
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.pattern.test(target)) {
          threats.push({ type: pattern.type, weight: pattern.weight });
          totalScore += pattern.weight;
        }
      }
    }

    // Check request frequency (rate-based detection)
    const ipHistory = this.getIPHistory(req.ip || 'unknown');
    const recentRequests = ipHistory.filter(r => Date.now() - r.timestamp < 60000); // Last minute
    
    if (recentRequests.length > 50) {
      threats.push({ type: 'rapid_requests', weight: 25 });
      totalScore += 25;
    }

    // Check for suspicious paths
    if (req.path.match(/\/(admin|wp-admin|phpmyadmin|\.git|\.env)/)) {
      threats.push({ type: 'sensitive_path_access', weight: 20 });
      totalScore += 20;
    }

    // Check for automation signatures
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.match(/(bot|crawler|spider|scraper)/i) && !userAgent.match(/(googlebot|bingbot)/i)) {
      threats.push({ type: 'automated_tool', weight: 15 });
      totalScore += 15;
    }

    // Determine threat level and action
    let level: ThreatLevel['level'] = 'low';
    let action: ThreatLevel['action'] = 'log';

    if (totalScore >= 80) {
      level = 'critical';
      action = 'block';
    } else if (totalScore >= 50) {
      level = 'high';
      action = 'throttle';
    } else if (totalScore >= 25) {
      level = 'medium';
      action = 'captcha';
    }

    return {
      level,
      score: Math.min(totalScore, 100),
      reasons: threats.map(t => t.type),
      action
    };
  }

  /**
   * Get IP request history
   */
  private getIPHistory(ip: string): Array<{ timestamp: number; path: string; threat: ThreatLevel }> {
    return this.requestHistory.get(ip) || [];
  }

  /**
   * Record request for analysis
   */
  private recordRequest(ip: string, path: string, threat: ThreatLevel): void {
    if (!this.requestHistory.has(ip)) {
      this.requestHistory.set(ip, []);
    }
    
    const history = this.requestHistory.get(ip)!;
    history.push({ timestamp: Date.now(), path, threat });
    
    // Keep only last 1000 requests per IP
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    // Clean old entries (older than 24 hours)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = history.filter(r => r.timestamp > dayAgo);
    this.requestHistory.set(ip, filtered);
  }

  /**
   * Express middleware for advanced threat detection
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      this.analytics.totalRequests++;
      
      // Skip security checks for monitoring endpoints
      const monitoringPaths = [
        '/api/monitoring',
        '/api/health',
        '/api/failover/status',
        '/api/failover/health',
        '/api/failover/orchestration',
        '/api/storage/health',
        '/api/system/status',
        '/api/track'
      ];
      
      if (monitoringPaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      const clientIP = req.ip || 'unknown';
      
      // Check if IP is blocked
      if (this.blockedIPs.has(clientIP)) {
        this.analytics.blockedRequests++;
        this.recordBlockedRequest(clientIP, 'IP_BLOCKED', 'Previously blocked for suspicious activity');
        
        return res.status(403).json({
          error: 'access_denied',
          message: 'Your IP has been temporarily blocked due to suspicious activity',
          support: 'Contact support if you believe this is an error'
        });
      }

      // Analyze request for threats
      const threat = this.analyzeRequest(req);
      this.recordRequest(clientIP, req.path, threat);
      
      // Update analytics
      if (threat.score > 0) {
        this.analytics.suspiciousRequests++;
        this.analytics.threatsByLevel[threat.level]++;
      }

      // Take action based on threat level
      switch (threat.action) {
        case 'block':
          this.analytics.blockedRequests++;
          this.blockedIPs.add(clientIP);
          this.recordBlockedRequest(clientIP, threat.level.toUpperCase(), threat.reasons.join(', '));
          
          // Remove from blocked list after 1 hour
          setTimeout(() => {
            this.blockedIPs.delete(clientIP);
          }, 60 * 60 * 1000);

          securityLogger.error({
            type: 'BLOCKED_REQUEST',
            ip: clientIP,
            path: req.path,
            threatLevel: threat.level,
            score: threat.score,
            reasons: threat.reasons,
            userAgent: req.get('User-Agent')
          });

          monitoringService.recordError(`Blocked ${threat.level} threat from ${clientIP}: ${threat.reasons.join(', ')}`);

          return res.status(403).json({
            error: 'security_violation',
            message: 'Request blocked due to security policy violation',
            threatLevel: threat.level,
            score: threat.score
          });

        case 'throttle':
          // Add artificial delay for suspicious requests
          setTimeout(() => {
            securityLogger.warn({
              type: 'THROTTLED_REQUEST',
              ip: clientIP,
              path: req.path,
              threatLevel: threat.level,
              score: threat.score,
              reasons: threat.reasons
            });
            next();
          }, 2000); // 2 second delay
          break;

        case 'captcha':
          // In a real implementation, you'd integrate with a CAPTCHA service
          securityLogger.info({
            type: 'SUSPICIOUS_REQUEST',
            ip: clientIP,
            path: req.path,
            threatLevel: threat.level,
            score: threat.score,
            reasons: threat.reasons
          });
          
          // Add security headers
          res.setHeader('X-Security-Warning', 'Suspicious activity detected');
          res.setHeader('X-Threat-Score', threat.score.toString());
          next();
          break;

        default:
          next();
      }
    };
  }

  /**
   * Record blocked request for analytics
   */
  private recordBlockedRequest(ip: string, reason: string, details: string): void {
    this.analytics.recentBlocks.unshift({
      ip,
      reason,
      timestamp: new Date()
    });
    
    // Keep only last 100 blocks
    if (this.analytics.recentBlocks.length > 100) {
      this.analytics.recentBlocks.pop();
    }
  }

  /**
   * Get security analytics
   */
  getAnalytics(): SecurityAnalytics {
    // Calculate top attack types
    const attackCounts = new Map<string, number>();
    for (const [, requests] of Array.from(this.requestHistory.entries())) {
      for (const request of requests) {
        for (const reason of request.threat.reasons) {
          attackCounts.set(reason, (attackCounts.get(reason) || 0) + 1);
        }
      }
    }

    this.analytics.topAttackTypes = Array.from(attackCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate top attacker IPs
    const ipCounts = new Map<string, { count: number; maxThreat: string }>();
    for (const [ip, requests] of Array.from(this.requestHistory.entries())) {
      const suspiciousRequests = requests.filter((r: any) => r.threat.score > 0);
      if (suspiciousRequests.length > 0) {
        const maxThreat = suspiciousRequests.reduce((max: any, req: any) => 
          req.threat.score > max.threat.score ? req : max
        );
        ipCounts.set(ip, {
          count: suspiciousRequests.length,
          maxThreat: maxThreat.threat.level
        });
      }
    }

    this.analytics.topAttackerIPs = Array.from(ipCounts.entries())
      .map(([ip, data]) => ({ ip, count: data.count, threatLevel: data.maxThreat }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return this.analytics;
  }

  /**
   * Manually block IP address
   */
  blockIP(ip: string, reason: string = 'Manual block'): void {
    this.blockedIPs.add(ip);
    this.recordBlockedRequest(ip, 'MANUAL_BLOCK', reason);
    
    securityLogger.warn({
      type: 'MANUAL_IP_BLOCK',
      ip,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    
    securityLogger.info({
      type: 'IP_UNBLOCKED',
      ip,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  /**
   * Clear all blocked IPs
   */
  clearBlockedIPs(): void {
    this.blockedIPs.clear();
    securityLogger.info({
      type: 'ALL_IPS_UNBLOCKED',
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const advancedSecurityService = new AdvancedSecurityService();
export default advancedSecurityService;