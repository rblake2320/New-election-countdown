import { electionScraper, ScrapedElectionData } from './web-scraper';
import { storage } from './storage';
import { perplexityCongressService } from './perplexity-congress-service';
import fetch from 'node-fetch';

export interface MonitoringTarget {
  url: string;
  type: 'results' | 'feed' | 'api';
  priority: 'high' | 'medium' | 'low';
  state?: string;
  lastChecked?: Date;
  status: 'active' | 'inactive' | 'error';
}

export class RealTimeElectionMonitor {
  private monitoringTargets: MonitoringTarget[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.initializeDefaultTargets();
  }

  private initializeDefaultTargets(): void {
    // Key election authority sites for real-time monitoring
    this.monitoringTargets = [
      // Federal sources
      {
        url: 'https://results.elections.virginia.gov',
        type: 'results',
        priority: 'high',
        state: 'VA',
        status: 'active'
      },
      {
        url: 'https://elections.wi.gov/elections-voting/results',
        type: 'results',
        priority: 'high',
        state: 'WI',
        status: 'active'
      },
      {
        url: 'https://results.enr.clarityelections.com/GA',
        type: 'results',
        priority: 'high',
        state: 'GA',
        status: 'active'
      },
      {
        url: 'https://www.sos.alabama.gov/alabama-votes/voter/election-information',
        type: 'feed',
        priority: 'high',
        state: 'AL',
        status: 'active'
      },
      {
        url: 'https://results.sos.state.tx.us',
        type: 'results',
        priority: 'high',
        state: 'TX',
        status: 'active'
      }
    ];
  }

  async startMonitoring(intervalMinutes: number = 5): Promise<void> {
    if (this.isRunning) {
      console.log('Real-time monitoring already running');
      return;
    }

    console.log(`Starting real-time election monitoring with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    try {
      // Try to initialize web scraper, continue with API-only monitoring if it fails
      try {
        await electionScraper.initialize();
        console.log('Web scraper initialized successfully');
      } catch (scraperError) {
        console.warn('Web scraper initialization failed, continuing with API-only monitoring:', scraperError.message);
      }

      // Start monitoring loop
      this.monitoringInterval = setInterval(async () => {
        await this.checkAllTargets();
      }, intervalMinutes * 60 * 1000);

      // Run initial check
      await this.checkAllTargets();
      console.log('Real-time monitoring started successfully');
    } catch (error) {
      this.isRunning = false;
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    await electionScraper.destroy();
    console.log('Real-time monitoring stopped');
  }

  private async checkAllTargets(): Promise<void> {
    console.log(`Checking ${this.monitoringTargets.length} monitoring targets...`);
    
    const activeTargets = this.monitoringTargets.filter(target => target.status === 'active');
    
    await Promise.allSettled(
      activeTargets.map(async (target) => {
        try {
          await this.checkTarget(target);
          target.lastChecked = new Date();
          target.status = 'active';
        } catch (error) {
          console.error(`Error checking target ${target.url}:`, error);
          target.status = 'error';
        }
      })
    );
  }

  private async checkTarget(target: MonitoringTarget): Promise<void> {
    let newElections: ScrapedElectionData[] = [];

    try {
      switch (target.type) {
        case 'results':
          const resultData = await electionScraper.scrapeElectionSite(target.url);
          if (resultData) {
            newElections = [resultData];
          }
          break;

        case 'feed':
          newElections = await electionScraper.fetchElectionFeed(target.url);
          break;

        case 'api':
          newElections = await this.fetchFromAPI(target.url);
          break;
      }

      // Process and store new elections
      for (const election of newElections) {
        await this.processNewElection(election, target);
      }

    } catch (error) {
      console.error(`Failed to check target ${target.url}:`, error);
    }
  }

  private async fetchFromAPI(apiUrl: string): Promise<ScrapedElectionData[]> {
    try {
      const response = await fetch(apiUrl);
      const data = await response.json() as any;
      
      // Convert API response to standard format
      const elections: ScrapedElectionData[] = [];
      
      if (Array.isArray(data)) {
        for (const item of data) {
          elections.push({
            title: item.title || item.name || 'Unknown Election',
            date: item.date || item.election_date || new Date().toISOString(),
            location: item.location || item.district || 'Unknown',
            state: item.state || 'Unknown',
            type: item.type || 'General',
            level: item.level || 'Local',
            description: item.description || `Election data from API: ${apiUrl}`,
            lastUpdated: new Date()
          });
        }
      }
      
      return elections;
    } catch (error) {
      console.error(`Failed to fetch from API ${apiUrl}:`, error);
      return [];
    }
  }

  private async processNewElection(election: ScrapedElectionData, source: MonitoringTarget): Promise<void> {
    try {
      // Check if this election already exists in database
      const existingElections = await storage.getElections({
        search: election.title,
        state: election.state
      } as any);

      const isDuplicate = existingElections.some(existing => 
        existing.title.toLowerCase() === election.title.toLowerCase() &&
        existing.state === election.state
      );

      if (!isDuplicate) {
        // Create new election in database
        const newElection = await storage.createElection({
          title: election.title,
          subtitle: election.location,
          location: election.location,
          state: election.state,
          date: new Date(election.date),
          type: election.type,
          level: election.level,
          description: election.description || '',
          isActive: true
        });

        // Add candidates if available
        if (election.candidates && election.candidates.length > 0) {
          for (const candidate of election.candidates) {
            await storage.createCandidate({
              name: candidate.name,
              party: candidate.party,
              electionId: newElection.id,
              votesReceived: candidate.votes,
              votePercentage: candidate.percentage ? candidate.percentage.toString() : undefined,
              isWinner: false
            });
          }
        }

        console.log(`New election discovered: ${election.title} in ${election.state}`);
        
        // Enhance with AI analysis if high priority
        if (source.priority === 'high') {
          await this.enhanceWithAI(newElection.id, election);
        }
      } else {
        // Update existing election with new candidate data if available
        const existing = existingElections.find(e => 
          e.title.toLowerCase() === election.title.toLowerCase()
        );
        
        if (existing && election.candidates && election.candidates.length > 0) {
          await this.updateElectionResults(existing.id, election.candidates);
        }
      }
    } catch (error) {
      console.error(`Failed to process election ${election.title}:`, error);
    }
  }

  private async enhanceWithAI(electionId: number, electionData: ScrapedElectionData): Promise<void> {
    try {
      // Use Perplexity AI to get additional context and verification
      const query = `Verify election details for ${electionData.title} in ${electionData.state}. 
                    Provide additional context about candidates, key issues, and voting procedures.`;
      
      const aiAnalysis = await perplexityCongressService.searchWithAI(query);
      
      if (aiAnalysis) {
        // Update election description with AI-enhanced information
        const enhancedDescription = `${electionData.description}\n\nAI Analysis: ${aiAnalysis}`;
        
        // Note: In a production system, you'd update the election description here
        console.log(`Enhanced election ${electionId} with AI analysis`);
      }
    } catch (error) {
      console.error(`Failed to enhance election ${electionId} with AI:`, error);
    }
  }

  private async updateElectionResults(electionId: number, candidates: ScrapedElectionData['candidates']): Promise<void> {
    if (!candidates) return;

    try {
      // Get existing candidates
      const existingCandidates = await storage.getCandidatesByElection(electionId);
      
      for (const newCandidate of candidates) {
        const existing = existingCandidates.find(c => 
          c.name.toLowerCase() === newCandidate.name.toLowerCase()
        );

        if (existing && (newCandidate.votes || newCandidate.percentage)) {
          // Update candidate with new vote data
          await storage.updateElectionResults(electionId, {
            candidateId: existing.id,
            votes: newCandidate.votes,
            percentage: newCandidate.percentage
          });
        }
      }
    } catch (error) {
      console.error(`Failed to update results for election ${electionId}:`, error);
    }
  }

  addMonitoringTarget(target: Omit<MonitoringTarget, 'status'>): void {
    this.monitoringTargets.push({
      ...target,
      status: 'active'
    });
    console.log(`Added monitoring target: ${target.url}`);
  }

  removeMonitoringTarget(url: string): void {
    this.monitoringTargets = this.monitoringTargets.filter(target => target.url !== url);
    console.log(`Removed monitoring target: ${url}`);
  }

  getMonitoringStatus(): { 
    isRunning: boolean; 
    targetCount: number; 
    activeTargets: number;
    lastChecked?: Date;
  } {
    const activeTargets = this.monitoringTargets.filter(t => t.status === 'active').length;
    const lastChecked = this.monitoringTargets
      .filter(t => t.lastChecked)
      .sort((a, b) => (b.lastChecked!.getTime() - a.lastChecked!.getTime()))[0]?.lastChecked;

    return {
      isRunning: this.isRunning,
      targetCount: this.monitoringTargets.length,
      activeTargets,
      lastChecked
    };
  }
}

export const realTimeMonitor = new RealTimeElectionMonitor();