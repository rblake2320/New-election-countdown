/**
 * Security Management API Routes
 * Advanced security analytics, threat management, and IP control
 */
import { Router, Request, Response } from 'express';
import { advancedSecurityService } from '../services/advanced-security-service';
import { requireAdminForAutofix } from '../middleware/autofix-security';

const router = Router();

/**
 * GET /api/security/analytics
 * Get comprehensive security analytics
 */
router.get('/analytics', requireAdminForAutofix, (req: Request, res: Response) => {
  try {
    const analytics = advancedSecurityService.getAnalytics();
    
    res.json({
      status: 'success',
      data: {
        ...analytics,
        summary: {
          blockRate: analytics.totalRequests > 0 
            ? ((analytics.blockedRequests / analytics.totalRequests) * 100).toFixed(2)
            : '0.00',
          suspiciousRate: analytics.totalRequests > 0
            ? ((analytics.suspiciousRequests / analytics.totalRequests) * 100).toFixed(2)
            : '0.00',
          totalThreats: Object.values(analytics.threatsByLevel).reduce((a, b) => a + b, 0)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching security analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch security analytics'
    });
  }
});

/**
 * GET /api/security/blocked-ips
 * Get currently blocked IP addresses
 */
router.get('/blocked-ips', requireAdminForAutofix, (req: Request, res: Response) => {
  try {
    const blockedIPs = advancedSecurityService.getBlockedIPs();
    
    res.json({
      status: 'success',
      data: {
        blockedIPs,
        count: blockedIPs.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching blocked IPs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch blocked IPs'
    });
  }
});

/**
 * POST /api/security/block-ip
 * Manually block an IP address
 */
router.post('/block-ip', requireAdminForAutofix, (req: Request, res: Response) => {
  try {
    const { ip, reason } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        status: 'error',
        message: 'IP address is required'
      });
    }
    
    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid IP address format'
      });
    }
    
    advancedSecurityService.blockIP(ip, reason || 'Manual administrative block');
    
    res.json({
      status: 'success',
      message: `IP ${ip} has been blocked`,
      data: {
        ip,
        reason: reason || 'Manual administrative block',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to block IP address'
    });
  }
});

/**
 * POST /api/security/unblock-ip
 * Unblock an IP address
 */
router.post('/unblock-ip', requireAdminForAutofix, (req: Request, res: Response) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        status: 'error',
        message: 'IP address is required'
      });
    }
    
    advancedSecurityService.unblockIP(ip);
    
    res.json({
      status: 'success',
      message: `IP ${ip} has been unblocked`,
      data: {
        ip,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unblock IP address'
    });
  }
});

/**
 * POST /api/security/clear-blocked-ips
 * Clear all blocked IP addresses
 */
router.post('/clear-blocked-ips', requireAdminForAutofix, (req: Request, res: Response) => {
  try {
    const blockedCount = advancedSecurityService.getBlockedIPs().length;
    advancedSecurityService.clearBlockedIPs();
    
    res.json({
      status: 'success',
      message: `Cleared ${blockedCount} blocked IP addresses`,
      data: {
        clearedCount: blockedCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error clearing blocked IPs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear blocked IPs'
    });
  }
});

/**
 * GET /api/security/dashboard
 * Get comprehensive security dashboard data
 */
router.get('/dashboard', requireAdminForAutofix, (req: Request, res: Response) => {
  try {
    const analytics = advancedSecurityService.getAnalytics();
    const blockedIPs = advancedSecurityService.getBlockedIPs();
    
    const dashboard = {
      overview: {
        totalRequests: analytics.totalRequests,
        blockedRequests: analytics.blockedRequests,
        suspiciousRequests: analytics.suspiciousRequests,
        blockRate: analytics.totalRequests > 0 
          ? ((analytics.blockedRequests / analytics.totalRequests) * 100).toFixed(2) + '%'
          : '0.00%',
        suspiciousRate: analytics.totalRequests > 0
          ? ((analytics.suspiciousRequests / analytics.totalRequests) * 100).toFixed(2) + '%'
          : '0.00%'
      },
      threats: {
        byLevel: analytics.threatsByLevel,
        total: Object.values(analytics.threatsByLevel).reduce((a, b) => a + b, 0),
        topTypes: analytics.topAttackTypes.slice(0, 5),
        topAttackers: analytics.topAttackerIPs.slice(0, 5)
      },
      blocking: {
        currentlyBlocked: blockedIPs.length,
        recentBlocks: analytics.recentBlocks.slice(0, 10),
        blockedIPs: blockedIPs.slice(0, 20) // Show max 20 for dashboard
      },
      status: {
        securityLevel: analytics.blockedRequests > 10 ? 'high' : 
                      analytics.suspiciousRequests > 50 ? 'medium' : 'normal',
        lastUpdate: new Date().toISOString()
      }
    };
    
    res.json({
      status: 'success',
      data: dashboard
    });
  } catch (error) {
    console.error('Error fetching security dashboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch security dashboard'
    });
  }
});

/**
 * GET /api/security/health
 * Get security system health status
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const analytics = advancedSecurityService.getAnalytics();
    
    // Calculate security health score
    let healthScore = 100;
    
    // Penalize high block rates
    const blockRate = analytics.totalRequests > 0 
      ? (analytics.blockedRequests / analytics.totalRequests) * 100 
      : 0;
    
    if (blockRate > 10) healthScore -= 30;
    else if (blockRate > 5) healthScore -= 15;
    
    // Penalize high suspicious rates
    const suspiciousRate = analytics.totalRequests > 0
      ? (analytics.suspiciousRequests / analytics.totalRequests) * 100
      : 0;
      
    if (suspiciousRate > 20) healthScore -= 20;
    else if (suspiciousRate > 10) healthScore -= 10;
    
    // Penalize high critical threats
    if (analytics.threatsByLevel.critical > 50) healthScore -= 25;
    else if (analytics.threatsByLevel.critical > 20) healthScore -= 15;
    
    const status = healthScore >= 80 ? 'healthy' : 
                   healthScore >= 60 ? 'warning' : 'critical';
    
    res.json({
      status: 'success',
      data: {
        healthScore: Math.max(healthScore, 0),
        status,
        metrics: {
          totalRequests: analytics.totalRequests,
          blockRate: blockRate.toFixed(2) + '%',
          suspiciousRate: suspiciousRate.toFixed(2) + '%',
          criticalThreats: analytics.threatsByLevel.critical,
          currentlyBlocked: advancedSecurityService.getBlockedIPs().length
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching security health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch security health status'
    });
  }
});

export default router;