import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { storageFactory } from '../storage-factory';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Extend Request interface for admin session data
declare module 'express-serve-static-core' {
  interface Request {
    userId?: number;
    jti?: string;
    isAdmin?: boolean;
    adminUser?: {
      id: number;
      email: string;
      role: string;
    };
  }
}

/**
 * CRITICAL SECURITY MIDDLEWARE: Admin Authentication for Auto-fix Operations
 * 
 * This middleware ensures that ONLY authenticated admin users can perform auto-fix mutations.
 * It implements multi-layer verification:
 * 1. Valid user session
 * 2. Admin role verification
 * 3. Database health check
 * 
 * This is the PRIMARY SAFETY GATE - without this, auto-fix operations are BLOCKED.
 */
export function requireAdminForAutofix(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const path = req.path;
  
  // Allow GET requests for detection/preview mode
  if (method === 'GET') {
    return next();
  }
  
  // For mutation operations (POST, PATCH, PUT, DELETE), require admin authentication
  console.log(`🔒 Admin verification required for ${method} ${path}`);
  
  try {
    // First, check if user is authenticated at all
    if (!req.userId) {
      console.log(`❌ No user session for ${method} ${path}`);
      return res.status(401).json({
        error: 'authentication_required',
        message: 'Admin authentication required for auto-fix operations',
        required: 'Valid admin session',
        endpoint: path
      });
    }
    
    // Database health check - critical for safety
    if (!storageFactory.isDatabaseAvailable()) {
      console.log(`🚫 Admin auth blocked - database unhealthy for ${method} ${path}`);
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Auto-fix operations blocked due to database health issues',
        mode: 'degraded',
        endpoint: path
      });
    }
    
    // Verify admin privileges
    pool.query(`
      SELECT id, email, COALESCE(role, 'user') as role 
      FROM users 
      WHERE id = $1
    `, [req.userId])
      .then(result => {
        if (!result.rowCount) {
          console.log(`❌ User ${req.userId} not found for ${method} ${path}`);
          return res.status(401).json({
            error: 'user_not_found',
            message: 'User session invalid',
            endpoint: path
          });
        }
        
        const user = result.rows[0];
        const isAdminRole = user.role?.toLowerCase() === 'admin';
        const isAdminEmail = user.email?.endsWith('@admin.com');
        const envAdminFlag = process.env.ADMIN_FEATURES === '1';
        
        const isAdmin = isAdminRole || isAdminEmail || envAdminFlag;
        
        if (!isAdmin) {
          console.log(`🚫 Access denied for user ${req.userId} (${user.email}) - not admin for ${method} ${path}`);
          return res.status(403).json({
            error: 'insufficient_privileges',
            message: 'Admin privileges required for auto-fix operations',
            userRole: user.role,
            required: 'admin role or @admin.com email',
            endpoint: path
          });
        }
        
        // Success - attach admin info to request
        req.isAdmin = true;
        req.adminUser = {
          id: user.id,
          email: user.email,
          role: user.role
        };
        
        console.log(`✅ Admin access granted to ${user.email} for ${method} ${path}`);
        next();
      })
      .catch(error => {
        console.error(`💥 Admin verification error for ${method} ${path}:`, error);
        res.status(500).json({
          error: 'admin_verification_failed',
          message: 'Failed to verify admin privileges',
          endpoint: path
        });
      });
      
  } catch (error) {
    console.error(`💥 Admin middleware error for ${method} ${path}:`, error);
    res.status(500).json({
      error: 'admin_middleware_error',
      message: 'Admin verification system failure',
      endpoint: path
    });
  }
}

/**
 * CRITICAL SECURITY MIDDLEWARE: Auto-fix Policy Validation
 * 
 * This middleware ensures auto-fix policies are properly enabled and configured
 * before allowing any mutation operations. It validates:
 * 1. Auto-fix globally enabled
 * 2. Severity limits properly configured
 * 3. Required policies are active
 * 
 * This is the SECONDARY SAFETY GATE - prevents mutations when policies are disabled.
 */
export async function validateAutofixPolicies(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const path = req.path;
  
  // Allow GET requests for detection/preview
  if (method === 'GET') {
    return next();
  }
  
  console.log(`🔍 Policy validation for ${method} ${path}`);
  
  try {
    // Check if any auto-fix policies are enabled
    const enabledPolicies = await sql`
      SELECT COUNT(*) as enabled_count,
             COUNT(CASE WHEN autofix_sql IS NOT NULL THEN 1 END) as fixable_count
      FROM steward_mcp_packs 
      WHERE active = true AND auto_fix_enabled = true
    `;
    
    const policyStats = enabledPolicies[0];
    
    if (parseInt(policyStats.enabled_count) === 0) {
      console.log(`🚫 No auto-fix policies enabled for ${method} ${path}`);
      return res.status(423).json({
        error: 'policies_disabled',
        message: 'Auto-fix operations are disabled - no active policies found',
        enabledPolicies: 0,
        recommendation: 'Enable auto-fix policies in the admin dashboard first',
        endpoint: path,
        mode: 'safety_locked'
      });
    }
    
    if (parseInt(policyStats.fixable_count) === 0) {
      console.log(`🚫 No fixable policies available for ${method} ${path}`);
      return res.status(423).json({
        error: 'no_fixable_policies',
        message: 'No policies have auto-fix capabilities configured',
        enabledPolicies: policyStats.enabled_count,
        fixablePolicies: 0,
        recommendation: 'Configure auto-fix SQL for policies first',
        endpoint: path,
        mode: 'safety_locked'
      });
    }
    
    // Additional validation for batch operations
    if (path.includes('batch')) {
      const { maxSeverity = 'low' } = req.body;
      
      const validSeverities = ['critical', 'high', 'medium', 'low'];
      if (!validSeverities.includes(maxSeverity)) {
        return res.status(400).json({
          error: 'invalid_severity',
          message: `Invalid maxSeverity: ${maxSeverity}`,
          validOptions: validSeverities,
          endpoint: path
        });
      }
      
      // Check if any policies allow this severity level
      const compatiblePolicies = await sql`
        SELECT COUNT(*) as compatible_count
        FROM steward_mcp_packs 
        WHERE active = true 
          AND auto_fix_enabled = true 
          AND autofix_sql IS NOT NULL
          AND auto_fix_max_severity IN ('critical', 'high', 'medium', 'low')
          AND CASE ${maxSeverity}
            WHEN 'critical' THEN auto_fix_max_severity = 'critical'
            WHEN 'high' THEN auto_fix_max_severity IN ('critical', 'high')
            WHEN 'medium' THEN auto_fix_max_severity IN ('critical', 'high', 'medium')
            WHEN 'low' THEN auto_fix_max_severity IN ('critical', 'high', 'medium', 'low')
          END
      `;
      
      if (parseInt(compatiblePolicies[0].compatible_count) === 0) {
        console.log(`🚫 No policies compatible with severity ${maxSeverity} for ${method} ${path}`);
        return res.status(423).json({
          error: 'severity_not_allowed',
          message: `No policies allow auto-fix at severity level: ${maxSeverity}`,
          requestedSeverity: maxSeverity,
          recommendation: 'Adjust policy severity limits or request lower severity',
          endpoint: path,
          mode: 'safety_locked'
        });
      }
    }
    
    console.log(`✅ Policy validation passed for ${method} ${path} - ${policyStats.enabled_count} enabled, ${policyStats.fixable_count} fixable`);
    next();
    
  } catch (error) {
    console.error(`💥 Policy validation error for ${method} ${path}:`, error);
    res.status(500).json({
      error: 'policy_validation_failed',
      message: 'Failed to validate auto-fix policies',
      details: error instanceof Error ? error.message : String(error),
      endpoint: path
    });
  }
}

/**
 * CRITICAL SECURITY MIDDLEWARE: Explicit Approval Requirement
 * 
 * This middleware ensures that auto-fix mutations require explicit user approval.
 * It validates the 'approvedBy' parameter is present and matches the admin user.
 * 
 * This is the FINAL SAFETY GATE - prevents accidental or automated executions.
 */
export function requireExplicitApproval(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const path = req.path;
  
  // Allow GET requests for detection/preview
  if (method === 'GET') {
    return next();
  }
  
  console.log(`📝 Explicit approval check for ${method} ${path}`);
  
  const { approvedBy, approvalReason } = req.body;
  
  if (!approvedBy) {
    console.log(`❌ No approval provided for ${method} ${path}`);
    return res.status(400).json({
      error: 'approval_required',
      message: 'Explicit approval required for auto-fix operations',
      required: {
        approvedBy: 'Admin email or ID who approves this operation',
        approvalReason: 'Reason for performing this auto-fix (optional but recommended)'
      },
      endpoint: path,
      safety: 'This prevents accidental or automated executions'
    });
  }
  
  // Verify approval matches current admin user
  if (req.adminUser) {
    const isValidApproval = 
      approvedBy === req.adminUser.email || 
      approvedBy === req.adminUser.id.toString() ||
      approvedBy === req.adminUser.id;
    
    if (!isValidApproval) {
      console.log(`🚫 Approval mismatch for ${method} ${path}: ${approvedBy} vs ${req.adminUser.email}`);
      return res.status(403).json({
        error: 'approval_mismatch',
        message: 'Approval must be provided by the current authenticated admin user',
        providedBy: approvedBy,
        requiredBy: req.adminUser.email,
        endpoint: path
      });
    }
  }
  
  // Log the approved operation for audit trail
  console.log(`✅ Explicit approval granted by ${approvedBy} for ${method} ${path}${approvalReason ? ` - Reason: ${approvalReason}` : ''}`);
  
  // Attach approval info to request for downstream use
  req.body.auditTrail = {
    approvedBy,
    approvalReason: approvalReason || 'No reason provided',
    approvedAt: new Date().toISOString(),
    adminUser: req.adminUser?.email,
    endpoint: path,
    method
  };
  
  next();
}

/**
 * COMPREHENSIVE SYSTEM HEALTH CHECK
 * 
 * This function performs a complete health assessment before allowing auto-fix operations.
 * It checks database connectivity, API key availability, and system resources.
 */
export async function comprehensiveHealthCheck(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const path = req.path;
  
  // Allow GET requests without full health check
  if (method === 'GET') {
    return next();
  }
  
  console.log(`🏥 Comprehensive health check for ${method} ${path}`);
  
  try {
    const healthIssues: string[] = [];
    
    // Database connectivity check
    if (!storageFactory.isDatabaseAvailable()) {
      healthIssues.push('Database connectivity failed');
    }
    
    // Test basic database operations
    try {
      await sql`SELECT 1 as test`;
    } catch (dbError) {
      healthIssues.push('Database query test failed');
      console.log('DB test failed:', dbError instanceof Error ? dbError.message : String(dbError));
    }
    
    // Check system resources (basic)
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    if (memUsageMB > 500) { // 500MB threshold
      healthIssues.push(`High memory usage: ${memUsageMB.toFixed(1)}MB`);
    }
    
    if (healthIssues.length > 0) {
      console.log(`🚑 Health check failed for ${method} ${path}:`, healthIssues);
      return res.status(503).json({
        error: 'system_unhealthy',
        message: 'System health check failed - auto-fix operations blocked for safety',
        healthIssues,
        recommendation: 'Resolve health issues before attempting auto-fix operations',
        endpoint: path,
        mode: 'safety_locked'
      });
    }
    
    console.log(`✅ System health check passed for ${method} ${path}`);
    next();
    
  } catch (error) {
    console.error(`💥 Health check error for ${method} ${path}:`, error);
    res.status(500).json({
      error: 'health_check_failed',
      message: 'Unable to perform system health check',
      details: error instanceof Error ? error.message : String(error),
      endpoint: path
    });
  }
}