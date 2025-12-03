import { storage } from './storage';
import fetch from 'node-fetch';

interface ElectionResult {
  electionId: number;
  totalVotes: number;
  reportingPrecincts: number;
  totalPrecincts: number;
  percentReporting: number;
  isComplete: boolean;
  resultsSource: string;
  candidateResults: CandidateResult[];
}

interface CandidateResult {
  candidateId: number;
  votesReceived: number;
  votePercentage: number;
  isWinner: boolean;
  isProjectedWinner: boolean;
}

export class ResultsIngestionService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private googleCivicApiKey: string | null = null;

  constructor() {
    this.googleCivicApiKey = process.env.GOOGLE_CIVIC_API_KEY || null;
  }

  /**
   * Start the automated results ingestion polling
   */
  async startPolling(intervalSeconds: number = 30): Promise<void> {
    if (this.isRunning) {
      console.log('Results ingestion already running');
      return;
    }

    console.log(`Starting automated results ingestion (every ${intervalSeconds} seconds)`);
    this.isRunning = true;

    // Initial run
    await this.ingestResults();

    // Schedule recurring polls
    this.pollingInterval = setInterval(async () => {
      await this.ingestResults();
    }, intervalSeconds * 1000);
  }

  /**
   * Stop the automated polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isRunning = false;
    console.log('Results ingestion stopped');
  }

  /**
   * Main ingestion method - checks all sources
   */
  async ingestResults(): Promise<void> {
    console.log('[Results Ingestion] Starting ingestion cycle...');

    try {
      // Get elections happening today or recently (within 1 day)
      const activeElections = await this.getActiveElections();
      console.log(`[Results Ingestion] Found ${activeElections.length} active elections`);

      if (activeElections.length === 0) {
        return;
      }

      // Try multiple sources in parallel
      await Promise.allSettled([
        this.ingestFromGoogleCivic(activeElections),
        this.ingestFromStateSources(activeElections),
        // Future: Add AP Elections API here when available
        // this.ingestFromAPElections(activeElections),
      ]);

      console.log('[Results Ingestion] Ingestion cycle complete');
    } catch (error) {
      console.error('[Results Ingestion] Error during ingestion:', error);
    }
  }

  /**
   * Get elections that are happening now or recently
   */
  private async getActiveElections(): Promise<any[]> {
    const elections = await storage.getElections({});
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    return elections.filter(e => {
      const electionDate = new Date(e.date);
      return electionDate >= oneDayAgo && electionDate <= twoDaysFromNow && e.isActive;
    });
  }

  /**
   * Ingest results from Google Civic Information API
   */
  private async ingestFromGoogleCivic(elections: any[]): Promise<void> {
    if (!this.googleCivicApiKey) {
      console.log('[Google Civic] API key not configured, skipping');
      return;
    }

    console.log(`[Google Civic] Checking ${elections.length} elections...`);

    for (const election of elections) {
      try {
        // Note: Google Civic API doesn't provide real-time vote counts
        // It's mainly for voter information, but we check for available data
        const url = `https://www.googleapis.com/civicinfo/v2/elections?key=${this.googleCivicApiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.log(`[Google Civic] API returned ${response.status} for election ${election.id}`);
          continue;
        }

        const data: any = await response.json();
        
        // Google Civic API primarily provides election dates and polling places
        // Not comprehensive vote counts, but we log availability
        console.log(`[Google Civic] Found ${data.elections?.length || 0} elections in API`);
        
      } catch (error) {
        console.error(`[Google Civic] Error for election ${election.id}:`, error);
      }
    }
  }

  /**
   * Ingest results from state-level sources
   * This would integrate with existing web scrapers
   */
  private async ingestFromStateSources(elections: any[]): Promise<void> {
    console.log(`[State Sources] Checking ${elections.length} elections...`);

    // Group elections by state
    const electionsByState = new Map<string, any[]>();
    for (const election of elections) {
      if (!electionsByState.has(election.state)) {
        electionsByState.set(election.state, []);
      }
      electionsByState.get(election.state)!.push(election);
    }

    // Check each state
    for (const [state, stateElections] of electionsByState) {
      try {
        await this.checkStateSource(state, stateElections);
      } catch (error) {
        console.error(`[State Sources] Error for state ${state}:`, error);
      }
    }
  }

  /**
   * Check state-specific election results source
   */
  private async checkStateSource(state: string, elections: any[]): Promise<void> {
    // State-specific result URLs (these would need actual scraping logic)
    const stateUrls: Record<string, string> = {
      'VA': 'https://results.elections.virginia.gov',
      'WI': 'https://elections.wi.gov/elections-voting/results',
      'GA': 'https://results.enr.clarityelections.com/GA',
      'AL': 'https://www.sos.alabama.gov/alabama-votes/voter/election-information',
      'TX': 'https://results.sos.state.tx.us',
      'PA': 'https://www.electionreturns.pa.gov',
      'FL': 'https://results.elections.myflorida.com',
      'OH': 'https://www.ohiosos.gov/elections/election-results-and-data',
      'NC': 'https://er.ncsbe.gov',
      'MI': 'https://mielections.us/election/results',
    };

    const stateUrl = stateUrls[state];
    if (!stateUrl) {
      console.log(`[State Sources] No URL configured for state ${state}`);
      return;
    }

    console.log(`[State Sources] Checking ${state} (${elections.length} elections)`);

    // In a production system, you would:
    // 1. Fetch the state's election results page
    // 2. Parse the HTML/JSON for vote counts
    // 3. Match results to your database elections
    // 4. Update the database with new results

    // For now, we log the intent
    // The actual scraping would use the existing electionScraper
    console.log(`[State Sources] Would check ${stateUrl} for ${state} elections`);
  }

  /**
   * Determine race winner based on results
   * Auto-call races when conditions are met
   */
  async determineWinner(electionId: number): Promise<void> {
    try {
      const results = await storage.getElectionResults(electionId);
      
      if (!results || !results.candidates || results.candidates.length === 0) {
        return;
      }

      // Get reporting percentage
      const percentReporting = parseFloat(results.percentReporting?.toString() || '0');
      
      // Sort candidates by votes
      const sortedCandidates = [...results.candidates].sort((a, b) => 
        (b.votesReceived || 0) - (a.votesReceived || 0)
      );

      const leader = sortedCandidates[0];
      const runnerUp = sortedCandidates[1];

      if (!leader || !runnerUp) {
        return;
      }

      const leaderVotes = leader.votesReceived || 0;
      const runnerUpVotes = runnerUp.votesReceived || 0;
      const totalVotes = results.totalVotes || 0;

      if (totalVotes === 0) {
        return;
      }

      // Calculate vote margin
      const voteMargin = leaderVotes - runnerUpVotes;
      const marginPercentage = (voteMargin / totalVotes) * 100;

      // Race calling logic
      let shouldCallWinner = false;
      let shouldProjectWinner = false;

      // Call winner if:
      // 1. 100% reporting and leader has most votes
      if (percentReporting >= 100) {
        shouldCallWinner = true;
      }
      // 2. >95% reporting and margin > 5%
      else if (percentReporting >= 95 && marginPercentage > 5) {
        shouldCallWinner = true;
      }
      // 3. >80% reporting and margin > 10%
      else if (percentReporting >= 80 && marginPercentage > 10) {
        shouldCallWinner = true;
      }
      // 4. Project winner if >50% reporting and margin > 15%
      else if (percentReporting >= 50 && marginPercentage > 15) {
        shouldProjectWinner = true;
      }

      // Update winner status
      if (shouldCallWinner || shouldProjectWinner) {
        const candidateResults = results.candidates.map(c => ({
          candidateId: c.id,
          votesReceived: c.votesReceived || 0,
          votePercentage: parseFloat(c.votePercentage?.toString() || '0'),
          isWinner: shouldCallWinner && c.id === leader.id,
          isProjectedWinner: shouldProjectWinner && c.id === leader.id,
        }));

        await storage.updateElectionResults(electionId, {
          totalVotes,
          reportingPrecincts: results.reportingPrecincts,
          totalPrecincts: results.totalPrecincts,
          percentReporting,
          isComplete: percentReporting >= 100,
          candidateResults,
        });

        const status = shouldCallWinner ? 'WINNER CALLED' : 'PROJECTED WINNER';
        console.log(`[Race Calling] ${status} for election ${electionId}: ${leader.name} (${marginPercentage.toFixed(2)}% margin, ${percentReporting}% reporting)`);
      }
    } catch (error) {
      console.error(`[Race Calling] Error determining winner for election ${electionId}:`, error);
    }
  }

  /**
   * Manual result update (called from API)
   */
  async updateElectionResults(electionId: number, resultsData: ElectionResult): Promise<any> {
    try {
      console.log(`[Manual Update] Updating results for election ${electionId}`);
      
      const updatedResults = await storage.updateElectionResults(electionId, resultsData);
      
      // Auto-determine winner if conditions met
      await this.determineWinner(electionId);
      
      return updatedResults;
    } catch (error) {
      console.error(`[Manual Update] Error updating election ${electionId}:`, error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasGoogleCivicKey: !!this.googleCivicApiKey,
      pollingActive: !!this.pollingInterval,
    };
  }
}

// Singleton instance
export const resultsIngestionService = new ResultsIngestionService();
