// Regional political baseline data for US states and territories
const REGIONAL_BASELINES = {
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

function calculateAdvancedPoliticalLeaning(
  state,
  candidates,
  currentPolling,
  momentum,
  userVotingIntentions
) {
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

function analyzeCandidateComposition(candidates) {
  if (!candidates || candidates.length === 0) {
    return { democratic: 0, republican: 0, independent: 0, total: 0 };
  }
  
  const leftParties = ['Democratic', 'Democrat', 'Green', 'Liberal', 'Progressive'];
  const rightParties = ['Republican', 'Conservative', 'GOP', 'Libertarian'];
  
  let democratic = 0;
  let republican = 0;
  let independent = 0;
  
  candidates.forEach((candidate) => {
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
  baseline,
  candidateData,
  polling,
  momentum,
  userIntentions
) {
  // Start with baseline expectation
  let currentLeaning = 
    baseline === 'red' ? 'right' :
    baseline === 'blue' ? 'left' : 'split';
  
  let intensity = 'medium';
  let isShifting = false;
  let shiftDirection;
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

export { calculateAdvancedPoliticalLeaning };