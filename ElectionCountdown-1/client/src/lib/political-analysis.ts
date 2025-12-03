// Regional political baseline data for US states and territories
export const REGIONAL_BASELINES: Record<string, 'red' | 'blue' | 'purple'> = {
  // Traditionally Republican (Red) states
  'AL': 'red', 'AK': 'red', 'AR': 'red', 'FL': 'red', 'GA': 'red',
  'ID': 'red', 'IN': 'red', 'IA': 'red', 'KS': 'red', 'KY': 'red',
  'LA': 'red', 'MS': 'red', 'MO': 'red', 'MT': 'red', 'NE': 'red',
  'ND': 'red', 'OH': 'red', 'OK': 'red', 'SC': 'red', 'SD': 'red',
  'TN': 'red', 'TX': 'red', 'UT': 'red', 'WV': 'red', 'WY': 'red',
  
  // Traditionally Democratic (Blue) states
  'CA': 'blue', 'CT': 'blue', 'DE': 'blue', 'HI': 'blue', 'IL': 'blue',
  'MD': 'blue', 'MA': 'blue', 'MN': 'blue', 'NV': 'blue', 'NJ': 'blue',
  'NM': 'blue', 'NY': 'blue', 'OR': 'blue', 'RI': 'blue', 'VT': 'blue',
  'WA': 'blue', 'DC': 'blue',
  
  // Competitive/Swing (Purple) states
  'AZ': 'purple', 'CO': 'purple', 'ME': 'purple', 'MI': 'purple',
  'NH': 'purple', 'NC': 'purple', 'PA': 'purple', 'VA': 'purple',
  'WI': 'purple',
};

interface PoliticalData {
  democraticSupport: number;
  republicanSupport: number;
  independentSupport: number;
  undecided: number;
  totalPolled?: number;
  lastUpdated?: Date;
}

interface MomentumData {
  democraticTrend: number; // Positive = gaining, negative = losing
  republicanTrend: number;
  timeWindow: number; // Days of trend data
  confidence: number; // 0-1 confidence in the trend
}

interface PoliticalAnalysis {
  leaning: 'left' | 'right' | 'split' | 'neutral';
  intensity: 'low' | 'medium' | 'high';
  baseline: 'red' | 'blue' | 'purple';
  isShifting: boolean;
  shiftDirection?: 'red-to-blue' | 'blue-to-red';
  competitiveness: number; // 0-1, higher = more competitive
}

export function calculateAdvancedPoliticalLeaning(
  state: string,
  candidates: any[],
  currentPolling?: PoliticalData,
  momentum?: MomentumData,
  userVotingIntentions?: PoliticalData
): PoliticalAnalysis {
  const stateCode = state?.toUpperCase();
  const baseline = REGIONAL_BASELINES[stateCode] || 'purple';
  
  // Analyze candidate composition
  const candidateAnalysis = analyzeCandidateComposition(candidates);
  
  // Combine all data sources for final analysis
  const analysis = combineDataSources(
    baseline,
    candidateAnalysis,
    currentPolling,
    momentum,
    userVotingIntentions
  );
  
  return analysis;
}

function analyzeCandidateComposition(candidates: any[]) {
  if (!candidates || candidates.length === 0) {
    return { democratic: 0, republican: 0, independent: 0, total: 0 };
  }
  
  const leftParties = ['Democratic', 'Democrat', 'Green', 'Liberal', 'Progressive'];
  const rightParties = ['Republican', 'Conservative', 'GOP', 'Libertarian'];
  
  let democratic = 0;
  let republican = 0;
  let independent = 0;
  
  candidates.forEach((candidate: any) => {
    const party = candidate.party || '';
    if (leftParties.some(p => party.includes(p))) {
      democratic++;
    } else if (rightParties.some(p => party.includes(p))) {
      republican++;
    } else {
      independent++;
    }
  });
  
  return { democratic, republican, independent, total: candidates.length };
}

function combineDataSources(
  baseline: 'red' | 'blue' | 'purple',
  candidateData: any,
  polling?: PoliticalData,
  momentum?: MomentumData,
  userIntentions?: PoliticalData
): PoliticalAnalysis {
  // Start with baseline expectation
  let currentLeaning: 'left' | 'right' | 'split' | 'neutral' = 
    baseline === 'red' ? 'right' :
    baseline === 'blue' ? 'left' : 'split';
  
  let intensity: 'low' | 'medium' | 'high' = 'medium';
  let isShifting = false;
  let shiftDirection: 'red-to-blue' | 'blue-to-red' | undefined;
  let competitiveness = baseline === 'purple' ? 0.8 : 0.3;
  
  // Factor in real-time polling if available
  if (polling) {
    const demSupport = polling.democraticSupport;
    const repSupport = polling.republicanSupport;
    const margin = Math.abs(demSupport - repSupport);
    
    // Determine current leading
    if (demSupport > repSupport + 5) {
      currentLeaning = 'left';
    } else if (repSupport > demSupport + 5) {
      currentLeaning = 'right';
    } else {
      currentLeaning = 'split';
      competitiveness = 0.9;
    }
    
    // Set intensity based on margin
    intensity = margin > 15 ? 'high' : margin > 7 ? 'medium' : 'low';
  }
  
  // Check for momentum shifts
  if (momentum && momentum.confidence > 0.6) {
    const demTrend = momentum.democraticTrend;
    const repTrend = momentum.republicanTrend;
    const trendStrength = Math.max(Math.abs(demTrend), Math.abs(repTrend));
    
    // Detect significant shifts
    if (trendStrength > 0.1) { // 10% shift
      isShifting = true;
      
      // Determine shift direction
      if (baseline === 'red' && demTrend > 0.05) {
        shiftDirection = 'red-to-blue';
        currentLeaning = 'split'; // Show purple for shifting
        competitiveness = Math.min(0.9, competitiveness + 0.3);
      } else if (baseline === 'blue' && repTrend > 0.05) {
        shiftDirection = 'blue-to-red';
        currentLeaning = 'split'; // Show purple for shifting
        competitiveness = Math.min(0.9, competitiveness + 0.3);
      } else if (baseline === 'purple') {
        // For purple states, any significant movement creates shifting
        shiftDirection = demTrend > repTrend ? 'red-to-blue' : 'blue-to-red';
        currentLeaning = 'split'; // Keep purple for competitive races with momentum
        competitiveness = 0.95;
      }
    }
  }
  
  // Factor in user voting intentions from the platform
  if (userIntentions && userIntentions.totalPolled && userIntentions.totalPolled > 50) {
    const userDemSupport = userIntentions.democraticSupport;
    const userRepSupport = userIntentions.republicanSupport;
    
    // If user intentions significantly differ from baseline, show competitive
    if (baseline === 'red' && userDemSupport > 40) {
      isShifting = true;
      currentLeaning = 'split';
    } else if (baseline === 'blue' && userRepSupport > 40) {
      isShifting = true;
      currentLeaning = 'split';
    }
  }
  
  return {
    leaning: currentLeaning,
    intensity,
    baseline,
    isShifting,
    shiftDirection,
    competitiveness
  };
}

// Simulate momentum trends for demonstration (in production, this would come from real polling data)
function simulateMomentumTrends(electionId: number, baseline: 'red' | 'blue' | 'purple'): MomentumData | undefined {
  // Create deterministic "momentum" based on election ID and baseline
  const seed = electionId % 100;
  
  // 20% chance of significant momentum shift for red/blue states
  // 40% chance for purple states (naturally more volatile)
  const shiftProbability = baseline === 'purple' ? 0.4 : 0.2;
  const hasShift = (seed / 100) < shiftProbability;
  
  if (!hasShift) return undefined;
  
  // Simulate trend direction based on election characteristics
  const isRedToBlue = seed % 2 === 0;
  
  let democraticTrend = 0;
  let republicanTrend = 0;
  
  if (baseline === 'red' && isRedToBlue) {
    // Red state trending blue
    democraticTrend = 0.08; // 8% gain
    republicanTrend = -0.06; // 6% loss
  } else if (baseline === 'blue' && !isRedToBlue) {
    // Blue state trending red
    democraticTrend = -0.07; // 7% loss
    republicanTrend = 0.09; // 9% gain
  } else if (baseline === 'purple') {
    // Competitive state with shifting dynamics
    democraticTrend = isRedToBlue ? 0.05 : -0.04;
    republicanTrend = isRedToBlue ? -0.04 : 0.06;
  }
  
  return {
    democraticTrend,
    republicanTrend,
    timeWindow: 30, // 30 days of trend data
    confidence: 0.75, // High confidence in simulated data
  };
}

// Simulate user voting intentions for more dynamic analysis
function simulateUserVotingIntentions(electionId: number, baseline: 'red' | 'blue' | 'purple'): PoliticalData | undefined {
  const seed = electionId % 50;
  
  // Only simulate if we have "enough" users (arbitrary threshold for demo)
  if (seed < 10) return undefined;
  
  const baselineSupport = baseline === 'red' ? { dem: 35, rep: 55, ind: 10 } :
                        baseline === 'blue' ? { dem: 55, rep: 35, ind: 10 } :
                        { dem: 45, rep: 45, ind: 10 };
  
  // Add some variation based on election ID
  const variation = (seed - 25) * 0.4; // -10 to +10 variation
  
  return {
    democraticSupport: Math.max(0, Math.min(100, baselineSupport.dem + variation)),
    republicanSupport: Math.max(0, Math.min(100, baselineSupport.rep - variation)),
    independentSupport: baselineSupport.ind,
    undecided: 0,
    totalPolled: seed * 2 + 50, // 50-150 "users"
    lastUpdated: new Date(),
  };
}

// Enhanced version with momentum simulation for demo purposes
export function calculateAdvancedPoliticalLeaningWithMomentum(
  state: string,
  candidates: any[],
  electionId?: number
): PoliticalAnalysis {
  const stateCode = state?.toUpperCase();
  const baseline = REGIONAL_BASELINES[stateCode] || 'purple';
  
  // Analyze candidate composition
  const candidateAnalysis = analyzeCandidateComposition(candidates);
  
  // Simulate momentum and user data for demonstration
  let momentum: MomentumData | undefined;
  let userIntentions: PoliticalData | undefined;
  
  if (electionId) {
    momentum = simulateMomentumTrends(electionId, baseline);
    userIntentions = simulateUserVotingIntentions(electionId, baseline);
  }
  
  // Log momentum data for debugging
  if (momentum) {
    console.log(`Momentum detected for election ${electionId}: Democratic ${momentum.democraticTrend > 0 ? '+' : ''}${(momentum.democraticTrend * 100).toFixed(1)}%, Republican ${momentum.republicanTrend > 0 ? '+' : ''}${(momentum.republicanTrend * 100).toFixed(1)}%`);
  }
  
  // Combine all data sources for final analysis
  const analysis = combineDataSources(
    baseline,
    candidateAnalysis,
    undefined, // No real polling data yet
    momentum,
    userIntentions
  );
  
  return analysis;
}

// Legacy function for backward compatibility
export function calculatePoliticalLeaning(candidates: any[]) {
  const candidateData = analyzeCandidateComposition(candidates);
  
  if (candidateData.total === 0) {
    return { leaning: 'neutral' as const, intensity: 'low' as const };
  }
  
  const { democratic, republican } = candidateData;
  
  const leaning = 
    democratic > 0 && republican > 0 ? 'split' :
    democratic > republican ? 'left' :
    republican > democratic ? 'right' : 'neutral';
  
  return { leaning, intensity: 'medium' as const };
}