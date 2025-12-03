// State-specific election date validation rules
// Ensures elections comply with state laws

interface ValidationResult {
  ok: boolean;
  code?: string;
  message?: string;
}

// Louisiana elections must be on Saturday per R.S. 18:402
const SATURDAY_STATES = new Set(['LA']);

// Federal elections are typically on Tuesday after first Monday in November
const FEDERAL_ELECTION_DAY = 2; // Tuesday

export function validateElectionDateByState(state: string, date: Date, level: string, type: string): ValidationResult {
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  
  // Louisiana specific rules
  if (SATURDAY_STATES.has(state)) {
    if (dayOfWeek !== 6) {
      return {
        ok: false,
        code: 'invalid_louisiana_date',
        message: `Louisiana elections must be held on Saturday per R.S. 18:402. Got ${getDayName(dayOfWeek)}.`
      };
    }
  }
  
  // Federal general elections (non-Louisiana) should be on Tuesday
  if (level?.toLowerCase() === 'federal' && 
      type?.toLowerCase() === 'general' && 
      !SATURDAY_STATES.has(state)) {
    // Check if it's the first Tuesday after first Monday in November
    if (isNovember(date) && dayOfWeek !== FEDERAL_ELECTION_DAY) {
      return {
        ok: false,
        code: 'invalid_federal_date',
        message: `Federal general elections must be on Tuesday after first Monday in November.`
      };
    }
  }
  
  return { ok: true };
}

export function requireProvenanceForSpecialElections(
  state: string, 
  level: string, 
  type: string,
  provenanceType?: string,
  provenanceUrl?: string
): ValidationResult {
  // Louisiana federal special elections require governor's proclamation per R.S. 18:591
  if (state === 'LA' && 
      level?.toLowerCase() === 'federal' && 
      type?.toLowerCase().includes('special')) {
    if (!provenanceType || provenanceType !== 'governor_proclamation' || !provenanceUrl) {
      return {
        ok: false,
        code: 'missing_proclamation',
        message: 'Louisiana federal special elections require a governor\'s proclamation per R.S. 18:591'
      };
    }
  }
  
  return { ok: true };
}

export function validateElectionData(election: {
  state: string;
  date: Date | string;
  level: string;
  type: string;
  provenanceType?: string;
  provenanceUrl?: string;
}): ValidationResult[] {
  const errors: ValidationResult[] = [];
  const date = typeof election.date === 'string' ? new Date(election.date) : election.date;
  
  // Validate date by state rules
  const dateValidation = validateElectionDateByState(
    election.state, 
    date, 
    election.level, 
    election.type
  );
  if (!dateValidation.ok) {
    errors.push(dateValidation);
  }
  
  // Validate provenance for special elections
  const provenanceValidation = requireProvenanceForSpecialElections(
    election.state,
    election.level,
    election.type,
    election.provenanceType,
    election.provenanceUrl
  );
  if (!provenanceValidation.ok) {
    errors.push(provenanceValidation);
  }
  
  return errors;
}

// Helper functions
function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
}

function isNovember(date: Date): boolean {
  return date.getUTCMonth() === 10; // 0-indexed, November = 10
}

// Validate that election is not mock/placeholder data
export function validateNotMockData(election: any): ValidationResult {
  const mockIndicators = [
    'test', 'demo', 'example', 'placeholder', 'mock', 'sample', 'dummy'
  ];
  
  const titleLower = (election.title || '').toLowerCase();
  const descLower = (election.description || '').toLowerCase();
  
  for (const indicator of mockIndicators) {
    if (titleLower.includes(indicator) || descLower.includes(indicator)) {
      return {
        ok: false,
        code: 'mock_data_detected',
        message: `Election appears to be mock/test data (contains '${indicator}')`
      };
    }
  }
  
  // Check for obviously fake data patterns
  if (!election.state || election.state.length !== 2) {
    return {
      ok: false,
      code: 'invalid_state',
      message: 'Election must have a valid 2-letter state code'
    };
  }
  
  // Ensure date is reasonable (not too far in future or past)
  const date = new Date(election.date);
  const now = new Date();
  const yearsDiff = Math.abs(date.getFullYear() - now.getFullYear());
  
  if (yearsDiff > 4) {
    return {
      ok: false,
      code: 'unrealistic_date',
      message: `Election date is unrealistic (${yearsDiff} years from now)`
    };
  }
  
  return { ok: true };
}

export default {
  validateElectionDateByState,
  requireProvenanceForSpecialElections,
  validateElectionData,
  validateNotMockData
};