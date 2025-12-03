/**
 * Determines the political leaning of an election based on candidate party data
 */

interface Candidate {
  party: string;
  pollingSupport?: number;
  votePercentage?: number;
}

export type PoliticalLeaning = 'left' | 'right' | 'split' | 'neutral';
export type LeaningIntensity = 'low' | 'medium' | 'high';

/**
 * Maps party abbreviations to political alignment
 */
const partyAlignment: Record<string, 'left' | 'right' | 'neutral'> = {
  // Democratic parties
  'D': 'left',
  'DEM': 'left',
  'Democratic': 'left',
  'Democrat': 'left',
  
  // Republican parties  
  'R': 'right',
  'REP': 'right',
  'Republican': 'right',
  'GOP': 'right',
  
  // Independent/Third parties
  'I': 'neutral',
  'IND': 'neutral',
  'Independent': 'neutral',
  'G': 'neutral',
  'Green': 'neutral',
  'L': 'neutral',
  'Libertarian': 'neutral',
  'C': 'neutral',
  'Constitution': 'neutral',
  'Working Families': 'left',
  'Progressive': 'left',
  'Conservative': 'right',
  'Reform': 'neutral',
  'Nonpartisan': 'neutral',
  'NP': 'neutral'
};

/**
 * Calculates political leaning based on candidate data
 */
export function calculatePoliticalLeaning(candidates: Candidate[]): {
  leaning: PoliticalLeaning;
  intensity: LeaningIntensity;
  breakdown: { left: number; right: number; neutral: number };
} {
  if (!candidates || candidates.length === 0) {
    return { leaning: 'neutral', intensity: 'low', breakdown: { left: 0, right: 0, neutral: 0 } };
  }

  // Calculate weighted scores based on polling or vote data
  let leftScore = 0;
  let rightScore = 0;
  let neutralScore = 0;
  let totalWeight = 0;

  candidates.forEach(candidate => {
    const alignment = getPartyAlignment(candidate.party);
    const weight = candidate.votePercentage || candidate.pollingSupport || 1; // Default weight of 1 if no data
    
    totalWeight += weight;
    
    switch (alignment) {
      case 'left':
        leftScore += weight;
        break;
      case 'right':
        rightScore += weight;
        break;
      case 'neutral':
        neutralScore += weight;
        break;
    }
  });

  // Normalize scores to percentages
  const leftPercent = totalWeight > 0 ? (leftScore / totalWeight) * 100 : 0;
  const rightPercent = totalWeight > 0 ? (rightScore / totalWeight) * 100 : 0;
  const neutralPercent = totalWeight > 0 ? (neutralScore / totalWeight) * 100 : 0;

  // Determine leaning and intensity
  const { leaning, intensity } = determineLeaningAndIntensity(leftPercent, rightPercent, neutralPercent);

  return {
    leaning,
    intensity,
    breakdown: {
      left: Math.round(leftPercent),
      right: Math.round(rightPercent), 
      neutral: Math.round(neutralPercent)
    }
  };
}

/**
 * Gets political alignment for a party
 */
function getPartyAlignment(party: string): 'left' | 'right' | 'neutral' {
  if (!party) return 'neutral';
  
  const normalizedParty = party.trim().toUpperCase();
  
  // Check exact matches first
  const exactMatch = Object.keys(partyAlignment).find(key => 
    key.toUpperCase() === normalizedParty
  );
  
  if (exactMatch) {
    return partyAlignment[exactMatch];
  }
  
  // Check partial matches for longer party names
  if (normalizedParty.includes('DEMOCRAT') || normalizedParty.includes('DEM')) {
    return 'left';
  }
  if (normalizedParty.includes('REPUBLICAN') || normalizedParty.includes('REP')) {
    return 'right';
  }
  if (normalizedParty.includes('PROGRESSIVE') || normalizedParty.includes('WORKING FAMILIES')) {
    return 'left';
  }
  if (normalizedParty.includes('CONSERVATIVE')) {
    return 'right';
  }
  
  return 'neutral';
}

/**
 * Determines leaning and intensity based on percentage breakdown
 */
function determineLeaningAndIntensity(
  leftPercent: number, 
  rightPercent: number, 
  neutralPercent: number
): { leaning: PoliticalLeaning; intensity: LeaningIntensity } {
  
  const dominantPercent = Math.max(leftPercent, rightPercent, neutralPercent);
  const difference = Math.abs(leftPercent - rightPercent);
  
  // Determine if it's split (competitive between left and right)
  const isCompetitive = difference <= 15 && (leftPercent > 25 || rightPercent > 25);
  
  if (isCompetitive) {
    // Split election - determine intensity based on how close it is
    const intensity: LeaningIntensity = difference <= 5 ? 'high' : 
                                       difference <= 10 ? 'medium' : 'low';
    return { leaning: 'split', intensity };
  }
  
  // Determine dominant leaning
  let leaning: PoliticalLeaning;
  if (leftPercent > rightPercent && leftPercent > neutralPercent) {
    leaning = 'left';
  } else if (rightPercent > leftPercent && rightPercent > neutralPercent) {
    leaning = 'right';
  } else {
    leaning = 'neutral';
  }
  
  // Determine intensity based on dominance
  const intensity: LeaningIntensity = dominantPercent >= 70 ? 'high' :
                                     dominantPercent >= 55 ? 'medium' : 'low';
  
  return { leaning, intensity };
}

/**
 * Gets a human-readable description of the political leaning
 */
export function getPoliticalLeaningDescription(
  leaning: PoliticalLeaning, 
  intensity: LeaningIntensity,
  breakdown: { left: number; right: number; neutral: number }
): string {
  switch (leaning) {
    case 'left':
      return intensity === 'high' ? 'Strongly Democratic' :
             intensity === 'medium' ? 'Leaning Democratic' : 'Slightly Democratic';
    case 'right':
      return intensity === 'high' ? 'Strongly Republican' :
             intensity === 'medium' ? 'Leaning Republican' : 'Slightly Republican';
    case 'split':
      return intensity === 'high' ? 'Highly Competitive' :
             intensity === 'medium' ? 'Competitive' : 'Moderately Competitive';
    case 'neutral':
      return 'Nonpartisan/Independent';
  }
}