/**
 * Admin Validation API Routes
 * 
 * Provides admin endpoints for managing the multi-layer validation system
 */

import { Router } from 'express';
import { db } from '../db';
import { elections, dataProvenance, manualReviewQueue, auditRuns } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auditService } from '../services/audit-service';
import type { InsertDataProvenance } from '@shared/schema';

const router = Router();

/**
 * GET /api/admin/validation-issues
 * List validation issues from manual_review_queue
 * Query params: severity, status, limit
 */
router.get('/validation-issues', async (req, res) => {
  try {
    const severity = req.query.severity as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const issues = await auditService.getValidationIssues({
      severity,
      status,
      limit
    });

    res.json({
      success: true,
      count: issues.length,
      issues,
      filters: { severity, status, limit }
    });
  } catch (error) {
    console.error('Error fetching validation issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch validation issues',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/admin/audit-history
 * List recent audit runs with summary stats
 * Query params: limit
 */
router.get('/audit-history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const history = await auditService.getAuditHistory(limit);

    const summary = {
      totalAudits: history.length,
      completed: history.filter(a => a.status === 'completed').length,
      failed: history.filter(a => a.status === 'failed').length,
      totalIssuesFound: history.reduce((sum, a) => sum + (a.issuesFound || 0), 0),
      totalEntitiesChecked: history.reduce((sum, a) => sum + (a.totalEntitiesChecked || 0), 0),
      avgDuration: history.reduce((sum, a) => sum + (a.duration || 0), 0) / (history.length || 1)
    };

    res.json({
      success: true,
      summary,
      history
    });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit history',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/admin/fix-election
 * Manually fix an election date and mark as verified
 * Body: { electionId, newDate, reason }
 */
router.post('/fix-election', async (req, res) => {
  try {
    const { electionId, newDate, reason } = req.body;

    if (!electionId || !newDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: electionId and newDate'
      });
    }

    const electionIdNum = parseInt(electionId);
    if (isNaN(electionIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid electionId'
      });
    }

    // Get current election
    const election = await db.select()
      .from(elections)
      .where(eq(elections.id, electionIdNum))
      .limit(1);

    if (election.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Election not found'
      });
    }

    const currentElection = election[0];
    const previousDate = currentElection.date.toISOString();
    const newDateObj = new Date(newDate);

    // Update election date
    await db.update(elections)
      .set({ date: newDateObj })
      .where(eq(elections.id, electionIdNum));

    // Create provenance record
    const provenanceRecord: InsertDataProvenance = {
      entityType: 'election',
      entityId: electionIdNum,
      fieldName: 'date',
      sourceType: 'manual_correction',
      currentValue: newDateObj.toISOString(),
      previousValue: previousDate,
      isVerified: true,
      verificationMethod: 'manual_admin_review',
      changeReason: reason || 'Manual correction via admin API',
      enteredBy: 'system_admin',
      importMethod: 'manual'
    };

    await db.insert(dataProvenance).values(provenanceRecord);

    console.log(`[Admin API] Fixed election ${electionIdNum} date from ${previousDate} to ${newDate}`);

    res.json({
      success: true,
      message: 'Election date updated successfully',
      election: {
        id: electionIdNum,
        title: currentElection.title,
        previousDate,
        newDate: newDateObj.toISOString()
      },
      provenanceRecorded: true
    });
  } catch (error) {
    console.error('Error fixing election:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix election',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/admin/run-audit
 * Trigger on-demand audit
 * Query params: scope (optional), state (optional)
 */
router.get('/run-audit', async (req, res) => {
  try {
    const scopeParam = req.query.scope as string | undefined;
    const state = req.query.state as string | undefined;

    const scope = {
      type: (scopeParam || 'all_elections') as 'all_elections' | 'recent_updates' | 'specific_state' | 'all_candidates',
      state
    };

    console.log('[Admin API] Starting on-demand audit with scope:', scope);

    const report = await auditService.runAudit(scope, 'admin_api');

    res.json({
      success: true,
      message: 'Audit completed successfully',
      report: {
        auditId: report.auditId,
        totalChecked: report.totalChecked,
        issuesFound: report.issuesFound,
        criticalIssues: report.criticalIssues,
        warnings: report.warnings,
        autoFixed: report.autoFixed,
        manualReviewQueued: report.manualReviewQueued,
        duration: report.duration,
        breakdown: report.breakdown,
        affectedElections: report.affectedElections.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error running audit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run audit',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/admin/validation-stats
 * Get overall validation statistics
 */
router.get('/validation-stats', async (req, res) => {
  try {
    const pendingIssues = await db.select()
      .from(manualReviewQueue)
      .where(eq(manualReviewQueue.reviewStatus, 'pending'));

    const recentAudits = await db.select()
      .from(auditRuns)
      .orderBy(desc(auditRuns.createdAt))
      .limit(5);

    const stats = {
      pendingReviews: pendingIssues.length,
      criticalIssues: pendingIssues.filter(i => i.issueSeverity === 'critical').length,
      highPriorityIssues: pendingIssues.filter(i => i.issueSeverity === 'high').length,
      recentAudits: recentAudits.map(a => ({
        auditId: a.auditId,
        type: a.auditType,
        status: a.status,
        issuesFound: a.issuesFound,
        startedAt: a.startedAt
      }))
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching validation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch validation stats',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
