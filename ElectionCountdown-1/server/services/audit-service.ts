/**
 * Automated Audit Service
 * 
 * Runs scheduled audits on all elections and generates comprehensive reports
 */

import { db } from '../db';
import { 
  elections, 
  validationResults, 
  dataProvenance, 
  auditRuns, 
  manualReviewQueue 
} from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { multiLayerValidator } from './multi-layer-validator';
import type { Election, MultiLayerValidationResult } from './multi-layer-validator';
import type { InsertAuditRun } from '@shared/schema';
import { nanoid } from 'nanoid';

export interface AuditScope {
  type: 'all_elections' | 'recent_updates' | 'specific_state' | 'all_candidates';
  state?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
}

export interface AuditReport {
  auditId: string;
  totalChecked: number;
  issuesFound: number;
  criticalIssues: number;
  warnings: number;
  autoFixed: number;
  manualReviewQueued: number;
  breakdown: Record<string, number>;
  affectedElections: Array<{
    id: number;
    state: string;
    title: string;
    issues: string[];
  }>;
  duration: number;
}

/**
 * Main audit orchestrator
 */
export class AuditService {
  /**
   * Run a comprehensive audit on elections
   */
  async runAudit(
    scope: AuditScope = { type: 'all_elections' },
    triggeredBy: string = 'scheduler'
  ): Promise<AuditReport> {
    const auditId = nanoid();
    const startTime = Date.now();
    
    console.log(`[Audit ${auditId}] Starting audit - scope: ${scope.type}`);
    
    // Create audit run record
    const auditRun: InsertAuditRun = {
      auditId,
      auditType: this.getAuditType(triggeredBy),
      auditScope: scope.type,
      scopeFilters: scope,
      status: 'running',
      startedAt: new Date(),
      triggeredBy
    };
    
    try {
      // Insert initial audit run
      await db.insert(auditRuns).values(auditRun);
      
      // Fetch elections to audit
      const electionsToAudit = await this.fetchElectionsForAudit(scope);
      console.log(`[Audit ${auditId}] Found ${electionsToAudit.length} elections to audit`);
      
      // Validate each election
      const results: MultiLayerValidationResult[] = [];
      const issueBreakdown: Record<string, number> = {};
      const affectedElections: Array<{ id: number; state: string; title: string; issues: string[] }> = [];
      
      let criticalIssues = 0;
      let totalWarnings = 0;
      let autoFixed = 0;
      let manualReviewQueued = 0;
      
      for (const election of electionsToAudit) {
        try {
          const result = await multiLayerValidator.validateElection(election, {
            confidenceThreshold: 70
          });
          
          results.push(result);
          
          // Track issues
          if (result.errors.length > 0) {
            criticalIssues += result.errors.length;
            affectedElections.push({
              id: election.id,
              state: election.state,
              title: election.title || `${election.type} Election`,
              issues: result.errors
            });
            
            // Categorize issues
            for (const error of result.errors) {
              const category = this.categorizeError(error);
              issueBreakdown[category] = (issueBreakdown[category] || 0) + 1;
            }
          }
          
          totalWarnings += result.warnings.length;
          
          // Save validation results
          if (result.validationResults.length > 0) {
            await db.insert(validationResults).values(result.validationResults);
          }
          
          // Save provenance records
          if (result.provenanceRecords.length > 0) {
            await db.insert(dataProvenance).values(result.provenanceRecords);
          }
          
          // Queue for manual review if needed
          if (result.requiresManualReview && result.manualReviewItem) {
            await db.insert(manualReviewQueue).values(result.manualReviewItem);
            manualReviewQueued++;
          }
          
        } catch (error) {
          console.error(`[Audit ${auditId}] Error validating election ${election.id}:`, error);
          issueBreakdown['validation_error'] = (issueBreakdown['validation_error'] || 0) + 1;
        }
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      // Update audit run with results
      await db.update(auditRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          duration,
          totalEntitiesChecked: electionsToAudit.length,
          issuesFound: criticalIssues,
          criticalIssues,
          warningsFound: totalWarnings,
          autoFixesApplied: autoFixed,
          manualReviewsQueued: manualReviewQueued,
          issueBreakdown,
          affectedEntities: affectedElections,
          validationSummary: {
            passRate: Math.round(((electionsToAudit.length - affectedElections.length) / electionsToAudit.length) * 100),
            avgConfidence: Math.round(results.reduce((sum, r) => sum + r.finalConfidence, 0) / results.length),
            layersCoverage: this.calculateLayersCoverage(results)
          }
        })
        .where(eq(auditRuns.auditId, auditId));
      
      console.log(`[Audit ${auditId}] Completed - ${criticalIssues} issues found in ${duration}s`);
      
      return {
        auditId,
        totalChecked: electionsToAudit.length,
        issuesFound: criticalIssues,
        criticalIssues,
        warnings: totalWarnings,
        autoFixed,
        manualReviewQueued,
        breakdown: issueBreakdown,
        affectedElections,
        duration
      };
      
    } catch (error) {
      console.error(`[Audit ${auditId}] Audit failed:`, error);
      
      // Mark audit as failed
      await db.update(auditRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: { error: String(error) }
        })
        .where(eq(auditRuns.auditId, auditId));
      
      throw error;
    }
  }
  
  /**
   * Fetch elections based on audit scope
   */
  private async fetchElectionsForAudit(scope: AuditScope): Promise<Election[]> {
    // Build conditions
    const conditions = [];
    
    if (scope.type === 'specific_state' && scope.state) {
      conditions.push(eq(elections.state, scope.state));
    }
    
    if (scope.dateRange) {
      conditions.push(
        gte(elections.date, scope.dateRange.start),
        lte(elections.date, scope.dateRange.end)
      );
    }
    
    // Execute query with all conditions
    const query = db.select().from(elections);
    const finalQuery = conditions.length > 0 
      ? query.where(and(...conditions))
      : query;
    
    const results = scope.limit
      ? await finalQuery.limit(scope.limit)
      : await finalQuery;
    
    return results.map(e => ({
      id: e.id,
      state: e.state,
      date: e.date,
      type: e.type || 'General',
      level: e.level || 'Local',
      title: e.title || undefined,
      subtitle: e.subtitle || undefined
    }));
  }
  
  /**
   * Get audit type based on trigger
   */
  private getAuditType(triggeredBy: string): string {
    if (triggeredBy === 'scheduler') return 'daily_validation';
    if (triggeredBy.startsWith('user_')) return 'on_demand';
    return 'manual';
  }
  
  /**
   * Categorize error for reporting
   */
  private categorizeError(error: string): string {
    if (error.includes('date')) return 'incorrect_date';
    if (error.includes('Saturday')) return 'day_of_week_violation';
    if (error.includes('coordinated')) return 'coordinated_election_mismatch';
    if (error.includes('unrealistic')) return 'invalid_date_range';
    return 'other';
  }
  
  /**
   * Calculate coverage of validation layers
   */
  private calculateLayersCoverage(results: MultiLayerValidationResult[]): Record<string, number> {
    const coverage: Record<string, number> = {
      layer1: 0,
      layer2: 0,
      layer3: 0,
      layer4: 0
    };
    
    for (const result of results) {
      for (const layer of result.layersExecuted) {
        coverage[`layer${layer}`]++;
      }
    }
    
    return coverage;
  }
  
  /**
   * Get recent audit history
   */
  async getAuditHistory(limit: number = 10) {
    return await db.select()
      .from(auditRuns)
      .orderBy(desc(auditRuns.createdAt))
      .limit(limit);
  }
  
  /**
   * Get validation issues that need manual review
   */
  async getValidationIssues(filters?: {
    severity?: string;
    status?: string;
    limit?: number;
  }) {
    // Build conditions
    const conditions = [];
    
    if (filters?.severity) {
      conditions.push(eq(manualReviewQueue.issueSeverity, filters.severity));
    }
    
    if (filters?.status) {
      conditions.push(eq(manualReviewQueue.reviewStatus, filters.status));
    }
    
    // Build query
    const query = db.select().from(manualReviewQueue);
    const withWhere = conditions.length > 0 
      ? query.where(and(...conditions))
      : query;
    const withOrder = withWhere.orderBy(desc(manualReviewQueue.priority));
    
    return filters?.limit 
      ? await withOrder.limit(filters.limit)
      : await withOrder;
  }
  
  /**
   * Resolve a validation issue
   */
  async resolveIssue(
    reviewId: string,
    resolution: 'fixed' | 'dismissed_incorrect' | 'dismissed_duplicate',
    resolvedBy: string,
    notes?: string,
    fixApplied?: any
  ) {
    return await db.update(manualReviewQueue)
      .set({
        reviewStatus: 'resolved',
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes: notes,
        fixApplied,
        updatedAt: new Date()
      })
      .where(eq(manualReviewQueue.reviewId, reviewId));
  }
}

/**
 * Singleton instance
 */
export const auditService = new AuditService();

/**
 * Schedule daily audits (to be called by cron or scheduler)
 */
export async function scheduleDailyAudit() {
  console.log('[Scheduler] Running daily election audit');
  
  try {
    const report = await auditService.runAudit(
      { type: 'all_elections' },
      'scheduler'
    );
    
    console.log('[Scheduler] Daily audit completed:', {
      auditId: report.auditId,
      totalChecked: report.totalChecked,
      issuesFound: report.issuesFound,
      duration: report.duration
    });
    
    return report;
  } catch (error) {
    console.error('[Scheduler] Daily audit failed:', error);
    throw error;
  }
}
