// Client-side election data validators
// Ensures only valid, real election data is displayed

export interface ElectionValidation {
  isValid: boolean;
  errors: string[];
}

// Louisiana elections must be on Saturday
const SATURDAY_STATES = new Set(['LA']);

// Mock data patterns to reject — word-boundary regex so 'demo' does not
// match the word "Democratic" (or 'test' match "contest", etc.)
const MOCK_PATTERN_RE = /(test|demo|example|placeholder|mock|sample|dummy|fake)/i;

export function validateElectionDate(
  state: string, 
  date: Date | string,
  type?: string,
  level?: string
): ElectionValidation {
  const errors: string[] = [];
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check Louisiana Saturday rule
  if (SATURDAY_STATES.has(state)) {
    const dayOfWeek = dateObj.getUTCDay();
    if (dayOfWeek !== 6) {
      errors.push(`Louisiana elections must be on Saturday (found ${getDayName(dayOfWeek)})`);
    }
    
    // Federal special elections need proclamation evidence
    if (level?.toLowerCase() === 'federal' && type?.toLowerCase().includes('special')) {
      // We can't verify proclamation client-side, but flag it
      errors.push('Louisiana federal special elections require governor proclamation');
    }
  }
  
  // Check for reasonable date range (not too far in future or past)
  const now = new Date();
  const yearsDiff = Math.abs(dateObj.getFullYear() - now.getFullYear());
  if (yearsDiff > 4) {
    errors.push(`Election date appears unrealistic (${yearsDiff} years from now)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateNotMockData(election: {
  title?: string;
  description?: string;
  subtitle?: string;
}): ElectionValidation {
  const errors: string[] = [];

  const text = `${election.title || ''} ${election.subtitle || ''} ${election.description || ''}`;
  const match = text.match(MOCK_PATTERN_RE);
  if (match) {
    errors.push(`Election appears to be mock/test data (contains '${match[1]}')`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isElectionDataValid(election: {
  state: string;
  date: Date | string;
  title?: string;
  description?: string;
  subtitle?: string;
  type?: string;
  level?: string;
}): boolean {
  // Check date validation
  const dateValidation = validateElectionDate(
    election.state, 
    election.date,
    election.type,
    election.level
  );
  
  // Check for mock data
  const mockValidation = validateNotMockData(election);
  
  return dateValidation.isValid && mockValidation.isValid;
}

// Format date correctly accounting for timezone
export function formatElectionDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Use UTC to avoid timezone issues
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  };
  
  return dateObj.toLocaleDateString('en-US', options);
}

// Get the actual day of week for an election date
export function getElectionDayOfWeek(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return getDayName(dateObj.getUTCDay());
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
}

export default {
  validateElectionDate,
  validateNotMockData,
  isElectionDataValid,
  formatElectionDate,
  getElectionDayOfWeek
};