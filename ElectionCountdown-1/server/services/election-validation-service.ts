/**
 * Comprehensive Election Date Validation Service
 * 
 * Multi-layer validation system for election dates:
 * - Layer 1: Rules-based validation (state laws, federal requirements)
 * - Layer 2: AI-powered verification (Perplexity AI)
 * - Layer 3: Official source cross-reference (.gov sites)
 * - Layer 4: Manual review queue
 */

import type { 
  ValidationResult, 
  InsertValidationResult,
  DataProvenance,
  InsertDataProvenance 
} from '@shared/schema';

export interface ElectionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidenceScore: number; // 0-100
  validationLayer: number; // 1-4
  sourcesChecked: string[];
}

export interface StateElectionRule {
  state: string;
  generalElectionDay: string; // e.g., "Tuesday after first Monday in November"
  primaryElectionMonth?: string;
  allowedDaysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  specialElectionRules?: string;
  runoffRules?: string;
  notes?: string;
}

/**
 * Federal Coordinated Election Rule:
 * Tuesday following the first Monday in November (even years for federal elections)
 */
function getExpectedCoordinatedElectionDate(year: number): Date {
  // Find first Monday in November
  const nov1 = new Date(Date.UTC(year, 10, 1)); // Month 10 = November
  const dayOfWeek = nov1.getUTCDay();
  
  // Calculate days until Monday (1)
  let daysToMonday = (1 - dayOfWeek + 7) % 7;
  if (daysToMonday === 0) daysToMonday = 0; // Nov 1 is Monday
  
  const firstMonday = new Date(Date.UTC(year, 10, 1 + daysToMonday));
  
  // Election is the Tuesday after first Monday
  const electionDate = new Date(firstMonday);
  electionDate.setUTCDate(firstMonday.getUTCDate() + 1);
  
  return electionDate;
}

/**
 * State-specific election rules database
 */
const STATE_ELECTION_RULES: Record<string, StateElectionRule> = {
  // Federal coordinated states (use Tuesday-after-first-Monday in November)
  AL: { state: 'Alabama', generalElectionDay: 'Tuesday after first Monday in November' },
  AK: { state: 'Alaska', generalElectionDay: 'Tuesday after first Monday in November' },
  AZ: { state: 'Arizona', generalElectionDay: 'Tuesday after first Monday in November' },
  AR: { state: 'Arkansas', generalElectionDay: 'Tuesday after first Monday in November' },
  CA: { state: 'California', generalElectionDay: 'Tuesday after first Monday in November' },
  CO: { 
    state: 'Colorado', 
    generalElectionDay: 'Tuesday after first Monday in November',
    notes: 'Coordinated elections in odd years typically first Tuesday in November'
  },
  CT: { state: 'Connecticut', generalElectionDay: 'Tuesday after first Monday in November' },
  DE: { state: 'Delaware', generalElectionDay: 'Tuesday after first Monday in November' },
  FL: { state: 'Florida', generalElectionDay: 'Tuesday after first Monday in November' },
  GA: { state: 'Georgia', generalElectionDay: 'Tuesday after first Monday in November' },
  HI: { state: 'Hawaii', generalElectionDay: 'Tuesday after first Monday in November' },
  ID: { state: 'Idaho', generalElectionDay: 'Tuesday after first Monday in November' },
  IL: { state: 'Illinois', generalElectionDay: 'Tuesday after first Monday in November' },
  IN: { state: 'Indiana', generalElectionDay: 'Tuesday after first Monday in November' },
  IA: { state: 'Iowa', generalElectionDay: 'Tuesday after first Monday in November' },
  KS: { state: 'Kansas', generalElectionDay: 'Tuesday after first Monday in November' },
  KY: { state: 'Kentucky', generalElectionDay: 'Tuesday after first Monday in November' },
  
  // Louisiana - SPECIAL CASE: Saturday elections
  LA: { 
    state: 'Louisiana', 
    generalElectionDay: 'Saturday in November (varies)',
    allowedDaysOfWeek: [6], // Only Saturdays
    specialElectionRules: 'All elections must be on Saturday',
    notes: 'Federal special elections require gubernatorial proclamation'
  },
  
  ME: { state: 'Maine', generalElectionDay: 'Tuesday after first Monday in November' },
  MD: { state: 'Maryland', generalElectionDay: 'Tuesday after first Monday in November' },
  MA: { state: 'Massachusetts', generalElectionDay: 'Tuesday after first Monday in November' },
  MI: { state: 'Michigan', generalElectionDay: 'Tuesday after first Monday in November' },
  MN: { state: 'Minnesota', generalElectionDay: 'Tuesday after first Monday in November' },
  MS: { state: 'Mississippi', generalElectionDay: 'Tuesday after first Monday in November' },
  MO: { state: 'Missouri', generalElectionDay: 'Tuesday after first Monday in November' },
  MT: { state: 'Montana', generalElectionDay: 'Tuesday after first Monday in November' },
  NE: { state: 'Nebraska', generalElectionDay: 'Tuesday after first Monday in November' },
  NV: { state: 'Nevada', generalElectionDay: 'Tuesday after first Monday in November' },
  NH: { state: 'New Hampshire', generalElectionDay: 'Tuesday after first Monday in November' },
  NJ: { state: 'New Jersey', generalElectionDay: 'Tuesday after first Monday in November' },
  NM: { state: 'New Mexico', generalElectionDay: 'Tuesday after first Monday in November' },
  NY: { state: 'New York', generalElectionDay: 'Tuesday after first Monday in November' },
  NC: { state: 'North Carolina', generalElectionDay: 'Tuesday after first Monday in November' },
  ND: { state: 'North Dakota', generalElectionDay: 'Tuesday after first Monday in November' },
  OH: { state: 'Ohio', generalElectionDay: 'Tuesday after first Monday in November' },
  OK: { state: 'Oklahoma', generalElectionDay: 'Tuesday after first Monday in November' },
  OR: { state: 'Oregon', generalElectionDay: 'Tuesday after first Monday in November' },
  PA: { state: 'Pennsylvania', generalElectionDay: 'Tuesday after first Monday in November' },
  RI: { state: 'Rhode Island', generalElectionDay: 'Tuesday after first Monday in November' },
  SC: { state: 'South Carolina', generalElectionDay: 'Tuesday after first Monday in November' },
  SD: { state: 'South Dakota', generalElectionDay: 'Tuesday after first Monday in November' },
  TN: { state: 'Tennessee', generalElectionDay: 'Tuesday after first Monday in November' },
  TX: { state: 'Texas', generalElectionDay: 'Tuesday after first Monday in November' },
  UT: { state: 'Utah', generalElectionDay: 'Tuesday after first Monday in November' },
  VT: { state: 'Vermont', generalElectionDay: 'Tuesday after first Monday in November' },
  VA: { state: 'Virginia', generalElectionDay: 'Tuesday after first Monday in November' },
  WA: { state: 'Washington', generalElectionDay: 'Tuesday after first Monday in November' },
  WV: { state: 'West Virginia', generalElectionDay: 'Tuesday after first Monday in November' },
  WI: { state: 'Wisconsin', generalElectionDay: 'Tuesday after first Monday in November' },
  WY: { state: 'Wyoming', generalElectionDay: 'Tuesday after first Monday in November' },
};

/**
 * Layer 1: Rules-Based Validation
 * Fast, deterministic validation using known state laws
 */
export class ElectionRulesValidator {
  /**
   * Validate election date against state-specific rules
   */
  validateElectionDate(
    state: string,
    date: Date | string,
    electionType: string,
    electionLevel: string,
    electionTitle?: string
  ): ElectionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sources: string[] = ['State Election Law Database'];
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getUTCFullYear();
    const dayOfWeek = dateObj.getUTCDay();
    
    // Get state rules
    const stateRule = STATE_ELECTION_RULES[state];
    if (!stateRule) {
      warnings.push(`No validation rules found for state: ${state}`);
      return {
        isValid: true,
        errors: [],
        warnings,
        confidenceScore: 50,
        validationLayer: 1,
        sourcesChecked: sources
      };
    }
    
    // Check Louisiana Saturday rule
    if (state === 'LA') {
      if (dayOfWeek !== 6) {
        errors.push(
          `Louisiana elections must be on Saturday (found ${this.getDayName(dayOfWeek)})`
        );
      }
      
      // Federal special elections need proclamation
      if (electionLevel?.toLowerCase() === 'federal' && 
          electionType?.toLowerCase().includes('special')) {
        warnings.push(
          'Louisiana federal special elections require gubernatorial proclamation'
        );
      }
    }
    
    // Check coordinated elections (General elections on Tuesday after first Monday)
    if (this.isCoordinatedElection(electionType, electionTitle)) {
      const expectedDate = getExpectedCoordinatedElectionDate(year);
      const actualDate = dateObj.toISOString().split('T')[0];
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (actualDate !== expectedDateStr) {
        // For coordinated elections in odd years (local/state), there's more flexibility
        if (year % 2 === 1 && state === 'CO') {
          // Colorado coordinated elections in odd years are typically first Tuesday in November
          const firstTuesdayNov = this.getFirstTuesdayOfNovember(year);
          const firstTuesdayStr = firstTuesdayNov.toISOString().split('T')[0];
          
          if (actualDate !== firstTuesdayStr && actualDate !== expectedDateStr) {
            errors.push(
              `Colorado coordinated election should be ${this.formatDate(firstTuesdayNov)} ` +
              `or ${this.formatDate(expectedDate)} (found ${this.formatDate(dateObj)})`
            );
          }
        } else {
          errors.push(
            `Expected coordinated election date: ${this.formatDate(expectedDate)} ` +
            `(found ${this.formatDate(dateObj)})`
          );
        }
      }
      
      // Coordinated elections should be on Tuesday
      if (dayOfWeek !== 2 && state !== 'LA') {
        errors.push(
          `Coordinated elections must be on Tuesday (found ${this.getDayName(dayOfWeek)})`
        );
      }
    }
    
    // Check for special election rules
    if (electionType?.toLowerCase().includes('special')) {
      warnings.push(
        'Special elections may have different date requirements - verify with official proclamation'
      );
    }
    
    // Check for reasonable date range
    const now = new Date();
    const yearsDiff = Math.abs(year - now.getFullYear());
    if (yearsDiff > 4) {
      errors.push(`Election date appears unrealistic (${yearsDiff} years from now)`);
    }
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(errors.length, warnings.length, state);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidenceScore,
      validationLayer: 1,
      sourcesChecked: sources
    };
  }
  
  /**
   * Determine if this is a coordinated election
   */
  private isCoordinatedElection(electionType: string, electionTitle?: string): boolean {
    const type = electionType?.toLowerCase() || '';
    const title = electionTitle?.toLowerCase() || '';
    
    return (
      type.includes('general') ||
      type.includes('coordinated') ||
      title.includes('general election') ||
      title.includes('coordinated election')
    );
  }
  
  /**
   * Get first Tuesday of November for a given year
   */
  private getFirstTuesdayOfNovember(year: number): Date {
    const nov1 = new Date(Date.UTC(year, 10, 1));
    const dayOfWeek = nov1.getUTCDay();
    
    // Calculate days until Tuesday (2)
    let daysToTuesday = (2 - dayOfWeek + 7) % 7;
    if (daysToTuesday === 0) daysToTuesday = 0; // Nov 1 is Tuesday
    
    return new Date(Date.UTC(year, 10, 1 + daysToTuesday));
  }
  
  /**
   * Calculate confidence score based on validation results
   */
  private calculateConfidence(errorCount: number, warningCount: number, state: string): number {
    let score = 100;
    
    // Reduce score for each error
    score -= errorCount * 30;
    
    // Reduce score for each warning
    score -= warningCount * 10;
    
    // Reduce score if state rules are incomplete
    const stateRule = STATE_ELECTION_RULES[state];
    if (!stateRule) score -= 40;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }
  
  /**
   * Get day name from day number
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }
}

/**
 * Validation result builder
 */
export function buildValidationResult(
  entityType: string,
  entityId: number,
  validation: ElectionValidation,
  validationType: string
): InsertValidationResult {
  return {
    entityType,
    entityId,
    validationType,
    validationLayer: validation.validationLayer,
    isValid: validation.isValid,
    confidenceScore: validation.confidenceScore.toString(),
    validationStatus: validation.isValid ? 'passed' : 'failed',
    issuesFound: validation.errors.length > 0 ? validation.errors.map((msg, idx) => ({
      code: `ERR${idx + 1}`,
      message: msg,
      severity: 'error'
    })) : null,
    warnings: validation.warnings,
    sourcesChecked: validation.sourcesChecked,
    sourceAgreement: validation.sourcesChecked.length > 0 ? '100' : null,
    validatedBy: 'system'
  };
}

/**
 * Provenance record builder
 */
export function buildProvenanceRecord(
  entityType: string,
  entityId: number,
  fieldName: string,
  sourceType: string,
  currentValue: string
): InsertDataProvenance {
  return {
    entityType,
    entityId,
    fieldName,
    sourceType,
    currentValue,
    dataCollectedAt: new Date(),
    isOfficialSource: sourceType.includes('gov') || sourceType.includes('official'),
    importMethod: 'validation_check'
  };
}
