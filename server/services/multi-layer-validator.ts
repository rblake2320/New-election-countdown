/**
 * Multi-Layer Validation Orchestrator
 * 
 * Coordinates all validation layers with graceful fallbacks:
 * - Layer 1: Rules-based (always available, instant)
 * - Layer 2: AI-powered (Perplexity API, 2-5s)
 * - Layer 3: Official sources (.gov sites, 5-10s)
 * - Layer 4: Manual review queue (for failures)
 */

import { ElectionRulesValidator, buildValidationResult, buildProvenanceRecord } from './election-validation-service';
import type { 
  InsertValidationResult,
  InsertDataProvenance,
  InsertManualReviewQueue,
  ValidationResult
} from '@shared/schema';
import { nanoid } from 'nanoid';

export interface Election {
  id: number;
  state: string;
  date: Date | string;
  type: string;
  level: string;
  title?: string;
  subtitle?: string;
}

export interface ValidationOptions {
  skipAI?: boolean;
  skipOfficialSources?: boolean;
  requireManualReview?: boolean;
  confidenceThreshold?: number; // Minimum confidence to pass (default 70)
}

export interface MultiLayerValidationResult {
  isValid: boolean;
  finalConfidence: number;
  layersExecuted: number[];
  errors: string[];
  warnings: string[];
  requiresManualReview: boolean;
  validationResults: InsertValidationResult[];
  provenanceRecords: InsertDataProvenance[];
  manualReviewItem?: InsertManualReviewQueue;
}

/**
 * Main validation orchestrator
 */
export class MultiLayerValidator {
  private rulesValidator: ElectionRulesValidator;
  private perplexityApiKey: string | undefined;
  
  constructor() {
    this.rulesValidator = new ElectionRulesValidator();
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  }
  
  /**
   * Validate an election through all available layers
   */
  async validateElection(
    election: Election,
    options: ValidationOptions = {}
  ): Promise<MultiLayerValidationResult> {
    const {
      skipAI = false,
      skipOfficialSources = false,
      confidenceThreshold = 70
    } = options;
    
    const validationResults: InsertValidationResult[] = [];
    const provenanceRecords: InsertDataProvenance[] = [];
    const layersExecuted: number[] = [];
    
    // Track per-layer verdicts separately for reconciliation
    interface LayerVerdict {
      layer: number;
      isValid: boolean;
      confidence: number;
      errors: string[];
      warnings: string[];
    }
    const layerVerdicts: LayerVerdict[] = [];
    
    // Layer 1: Rules-based validation (always run)
    const rulesResult = this.rulesValidator.validateElectionDate(
      election.state,
      election.date,
      election.type,
      election.level,
      election.title
    );
    
    layersExecuted.push(1);
    layerVerdicts.push({
      layer: 1,
      isValid: rulesResult.isValid,
      confidence: rulesResult.confidenceScore,
      errors: rulesResult.errors,
      warnings: rulesResult.warnings
    });
    
    validationResults.push(
      buildValidationResult(
        'election',
        election.id,
        rulesResult,
        'date_rules'
      )
    );
    
    provenanceRecords.push(
      buildProvenanceRecord(
        'election',
        election.id,
        'date',
        'rules_validator',
        typeof election.date === 'string' ? election.date : election.date.toISOString()
      )
    );
    
    // If rules validation passed with high confidence, we can skip other layers
    if (rulesResult.isValid && rulesResult.confidenceScore >= 90) {
      return {
        isValid: true,
        finalConfidence: rulesResult.confidenceScore,
        layersExecuted,
        errors: [],
        warnings: rulesResult.warnings,
        requiresManualReview: false,
        validationResults,
        provenanceRecords
      };
    }
    
    // Layer 2: AI-powered verification (if available and not skipped)
    if (!skipAI && this.perplexityApiKey) {
      try {
        const aiResult = await this.validateWithAI(election);
        layersExecuted.push(2);
        
        layerVerdicts.push({
          layer: 2,
          isValid: aiResult.isValid,
          confidence: aiResult.confidenceScore,
          errors: aiResult.errors,
          warnings: aiResult.warnings
        });
        
        validationResults.push(
          buildValidationResult(
            'election',
            election.id,
            aiResult,
            'ai_verification'
          )
        );
        
        provenanceRecords.push(
          buildProvenanceRecord(
            'election',
            election.id,
            'date',
            'perplexity_ai',
            typeof election.date === 'string' ? election.date : election.date.toISOString()
          )
        );
      } catch (error) {
        layerVerdicts.push({
          layer: 2,
          isValid: false,
          confidence: 0,
          errors: [],
          warnings: ['AI verification failed - API unavailable']
        });
      }
    }
    
    // Layer 3: Official source verification (if not skipped)
    if (!skipOfficialSources) {
      try {
        const officialResult = await this.validateWithOfficialSources(election);
        layersExecuted.push(3);
        
        layerVerdicts.push({
          layer: 3,
          isValid: officialResult.isValid,
          confidence: officialResult.confidenceScore,
          errors: officialResult.errors,
          warnings: officialResult.warnings
        });
        
        validationResults.push(
          buildValidationResult(
            'election',
            election.id,
            officialResult,
            'official_source'
          )
        );
        
        provenanceRecords.push(
          buildProvenanceRecord(
            'election',
            election.id,
            'date',
            'state_sos_website',
            typeof election.date === 'string' ? election.date : election.date.toISOString()
          )
        );
      } catch (error) {
        layerVerdicts.push({
          layer: 3,
          isValid: false,
          confidence: 0,
          errors: [],
          warnings: ['Official source verification unavailable']
        });
      }
    }
    
    // Reconcile layer verdicts to get final decision
    const reconciled = this.reconcileLayerVerdicts(layerVerdicts);
    
    // Determine if manual review is needed based on final verdict
    const requiresManualReview = 
      !reconciled.isValid ||
      reconciled.finalConfidence < confidenceThreshold ||
      (layersExecuted.length < 2 && !reconciled.isValid);
    
    // Layer 4: Queue for manual review if needed
    let manualReviewItem: InsertManualReviewQueue | undefined;
    if (requiresManualReview) {
      manualReviewItem = this.createManualReviewItem(
        election,
        reconciled.finalErrors,
        reconciled.finalWarnings,
        reconciled.finalConfidence,
        validationResults
      );
    }
    
    return {
      isValid: reconciled.isValid,
      finalConfidence: reconciled.finalConfidence,
      layersExecuted,
      errors: reconciled.finalErrors,
      warnings: reconciled.finalWarnings,
      requiresManualReview,
      validationResults,
      provenanceRecords,
      manualReviewItem
    };
  }
  
  /**
   * Reconcile verdicts from multiple validation layers
   * Later layers can override earlier layer errors if they have higher confidence
   */
  private reconcileLayerVerdicts(verdicts: Array<{
    layer: number;
    isValid: boolean;
    confidence: number;
    errors: string[];
    warnings: string[];
  }>) {
    // Find highest confidence verdict
    const highestConfidenceVerdict = verdicts.reduce((max, v) => 
      v.confidence > max.confidence ? v : max
    , verdicts[0]);
    
    // Collect all warnings (warnings don't invalidate)
    const allWarnings = verdicts.flatMap(v => v.warnings);
    
    // If highest confidence layer says valid, use that verdict
    // Otherwise, collect errors from all invalid layers
    const isValid = highestConfidenceVerdict.isValid && highestConfidenceVerdict.confidence >= 70;
    const finalErrors = isValid ? [] : verdicts
      .filter(v => !v.isValid)
      .flatMap(v => v.errors);
    
    // Add disagreement warnings if layers conflict
    const validCount = verdicts.filter(v => v.isValid).length;
    const invalidCount = verdicts.filter(v => !v.isValid).length;
    if (validCount > 0 && invalidCount > 0) {
      allWarnings.push(
        `Validation layers disagree: ${validCount} passed, ${invalidCount} failed`
      );
    }
    
    return {
      isValid,
      finalConfidence: highestConfidenceVerdict.confidence,
      finalErrors,
      finalWarnings: allWarnings
    };
  }
  
  /**
   * Layer 2: AI-powered verification using Perplexity
   */
  private async validateWithAI(election: Election) {
    // Graceful fallback if API key not available
    if (!this.perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }
    
    const query = this.buildAIQuery(election);
    
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{
            role: 'user',
            content: query
          }],
          max_tokens: 500,
          temperature: 0.2,
          return_citations: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseAIResponse(data, election);
    } catch (error) {
      console.error('AI verification failed:', error);
      throw error;
    }
  }
  
  /**
   * Build AI query for election verification
   */
  private buildAIQuery(election: Election): string {
    const dateStr = typeof election.date === 'string' 
      ? election.date 
      : election.date.toISOString().split('T')[0];
    
    return `When is the ${election.title || election.type} election in ${election.state} in ${new Date(election.date).getFullYear()}? 
    
Current data shows: ${dateStr}

Please verify if this date is correct according to official state election schedules. 
Provide a yes/no answer and cite official sources.`;
  }
  
  /**
   * Parse AI response into validation result
   */
  private parseAIResponse(data: any, election: Election) {
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    // Simple heuristic: look for confirmation keywords
    const isConfirmed = content.toLowerCase().includes('correct') ||
                       content.toLowerCase().includes('yes') ||
                       content.toLowerCase().includes('accurate');
    
    const hasDiscrepancy = content.toLowerCase().includes('incorrect') ||
                          content.toLowerCase().includes('no') ||
                          content.toLowerCase().includes('should be');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (hasDiscrepancy) {
      errors.push(`AI verification suggests date may be incorrect: ${content.substring(0, 200)}`);
    }
    
    if (citations.length === 0) {
      warnings.push('AI verification has no official citations');
    }
    
    return {
      isValid: isConfirmed && !hasDiscrepancy,
      errors,
      warnings,
      confidenceScore: isConfirmed ? 85 : 50,
      validationLayer: 2,
      sourcesChecked: citations
    };
  }
  
  /**
   * Layer 3: Verify against official .gov sources
   */
  private async validateWithOfficialSources(election: Election) {
    // Placeholder for official source verification
    // In production, this would scrape state SoS websites or call official APIs
    
    return {
      isValid: true,
      errors: [],
      warnings: ['Official source verification not yet implemented'],
      confidenceScore: 60,
      validationLayer: 3,
      sourcesChecked: []
    };
  }
  
  /**
   * Create manual review queue item
   */
  private createManualReviewItem(
    election: Election,
    errors: string[],
    warnings: string[],
    confidence: number,
    validationResults: InsertValidationResult[]
  ): InsertManualReviewQueue {
    const severity = errors.length > 0 ? 'critical' : 
                    warnings.length > 2 ? 'high' : 
                    confidence < 50 ? 'medium' : 'low';
    
    const priority = severity === 'critical' ? 90 :
                    severity === 'high' ? 70 :
                    severity === 'medium' ? 50 : 30;
    
    return {
      reviewId: nanoid(),
      entityType: 'election',
      entityId: election.id,
      fieldName: 'date',
      issueType: errors.length > 0 ? 'incorrect_date' : 'low_confidence',
      issueSeverity: severity,
      issueDescription: errors.length > 0 
        ? `Date validation failed: ${errors.join('; ')}`
        : `Low confidence validation (${confidence}%): ${warnings.join('; ')}`,
      issueDetails: {
        election: {
          state: election.state,
          date: election.date,
          type: election.type,
          title: election.title
        },
        validationErrors: errors,
        validationWarnings: warnings,
        confidence
      },
      currentValue: typeof election.date === 'string' 
        ? election.date 
        : election.date.toISOString().split('T')[0],
      validationResultId: null, // Will be set after validation results are inserted
      priority
    };
  }
}

/**
 * Singleton instance
 */
export const multiLayerValidator = new MultiLayerValidator();
