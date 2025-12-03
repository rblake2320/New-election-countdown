import fetch from 'node-fetch';
import { aiValidationService } from './ai-validation-service';
import { eventProcessingService } from './event-processing-service';

interface GlobalElectionData {
  country: string;
  countryCode: string;
  electionType: string;
  date: string;
  title: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  participatingParties: string[];
  voterTurnout?: number;
  results?: any[];
  source: string;
  lastUpdated: Date;
}

interface IDEAData {
  elections: GlobalElectionData[];
  democratic_indices: any[];
  electoral_systems: any[];
}

interface OpenStatesEvent {
  id: string;
  type: 'bill' | 'vote' | 'committee' | 'session';
  state: string;
  date: string;
  data: any;
}

export class GlobalElectionService {
  private ideaApiKey: string;
  private openStatesKey: string;
  private aceNetworkEndpoint: string;
  private ballotpediaKey: string;

  constructor() {
    this.ideaApiKey = process.env.IDEA_API_KEY || '';
    this.openStatesKey = process.env.OPEN_STATES_KEY || '';
    this.aceNetworkEndpoint = process.env.ACE_NETWORK_API || 'https://aceproject.org/api/v1';
    this.ballotpediaKey = process.env.BALLOTPEDIA_KEY || '';
  }

  // International IDEA API Integration
  async fetchIDEAElections(country?: string): Promise<GlobalElectionData[]> {
    try {
      const url = `https://www.idea.int/data-tools/data/electoral-management/api/elections${country ? `?country=${country}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.ideaApiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`IDEA API error: ${response.status}`);
      }

      const data: IDEAData = await response.json() as IDEAData;
      
      return data.elections?.map(election => ({
        country: election.country,
        countryCode: election.countryCode,
        electionType: election.electionType,
        date: election.date,
        title: election.title,
        status: this.determineElectionStatus(election.date),
        participatingParties: election.participatingParties || [],
        voterTurnout: election.voterTurnout,
        results: election.results,
        source: 'International IDEA',
        lastUpdated: new Date()
      })) || [];
    } catch (error) {
      console.error('IDEA API fetch failed:', error);
      return [];
    }
  }

  // ACE Electoral Network Integration
  async fetchACEElectoralData(): Promise<any[]> {
    try {
      const response = await fetch(`${this.aceNetworkEndpoint}/electoral-systems`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`ACE Network API error: ${response.status}`);
      }

      return await response.json() as any[];
    } catch (error) {
      console.error('ACE Network fetch failed:', error);
      return [];
    }
  }

  // Open States API Integration for Legislative Activity
  async fetchOpenStatesEvents(state?: string): Promise<OpenStatesEvent[]> {
    try {
      const baseUrl = 'https://v3.openstates.org/events';
      const params = new URLSearchParams({
        'include': 'participants,agenda',
        'per_page': '100'
      });
      
      if (state) {
        params.append('jurisdiction', state.toLowerCase());
      }

      const response = await fetch(`${baseUrl}?${params}`, {
        headers: {
          'X-API-KEY': this.openStatesKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Open States API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      return data.results?.map((event: any) => ({
        id: event.id,
        type: event.classification?.[0] || 'session',
        state: event.jurisdiction?.name || state || 'unknown',
        date: event.start_date,
        data: {
          name: event.name,
          description: event.description,
          location: event.location,
          participants: event.participants,
          agenda: event.agenda
        }
      })) || [];
    } catch (error) {
      console.error('Open States API fetch failed:', error);
      return [];
    }
  }

  // Ballotpedia Integration
  async fetchBallotpediaData(state: string, year: string): Promise<any[]> {
    try {
      // Note: Ballotpedia API requires authentication and specific endpoints
      const url = `https://ballotpedia.org/api/v4/elections`;
      const params = new URLSearchParams({
        'filters[state]': state,
        'filters[year]': year,
        'limit': '100'
      });

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.ballotpediaKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Ballotpedia API error: ${response.status}`);
      }

      return await response.json() as any[];
    } catch (error) {
      console.error('Ballotpedia API fetch failed:', error);
      return [];
    }
  }

  // VoteSmart Integration
  async fetchVoteSmartCandidateRatings(candidateId: string): Promise<any> {
    try {
      const url = `https://api.votesmart.org/Rating.getCandidateRating`;
      const params = new URLSearchParams({
        'key': process.env.VOTESMART_API_KEY || '',
        'candidateId': candidateId,
        'o': 'JSON'
      });

      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`VoteSmart API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('VoteSmart API fetch failed:', error);
      return null;
    }
  }

  // Democracy Works Ballot API Integration
  async fetchBallotInfo(address: string): Promise<any> {
    try {
      const url = 'https://api.democracy.works/ballot-info';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEMOCRACY_WORKS_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          election_date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error(`Democracy Works API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Democracy Works API fetch failed:', error);
      return null;
    }
  }

  // Enhanced election monitoring with multiple sources
  async monitorGlobalElections(): Promise<void> {
    console.log('Starting global election monitoring...');

    // Monitor major democracies
    const countries = ['USA', 'CAN', 'GBR', 'DEU', 'FRA', 'AUS', 'JPN', 'IND'];
    
    for (const country of countries) {
      try {
        const elections = await this.fetchIDEAElections(country);
        
        for (const election of elections) {
          // Validate election data
          const validation = await aiValidationService.validateElectionDate(
            election.title,
            election.date,
            election.country
          );

          if (validation.verified) {
            // Process as election event
            await eventProcessingService.ingestEvent({
              type: 'result_update',
              electionId: this.generateElectionId(election),
              data: election,
              timestamp: new Date()
            }, 'global_monitor');
          }
        }
      } catch (error) {
        console.error(`Failed to monitor elections for ${country}:`, error);
      }
    }
  }

  // Real-time legislative activity monitoring
  async monitorLegislativeActivity(): Promise<void> {
    console.log('Monitoring legislative activity...');

    const states = ['ca', 'tx', 'ny', 'fl', 'pa', 'il', 'oh', 'ga', 'nc', 'mi'];
    
    for (const state of states) {
      try {
        const events = await this.fetchOpenStatesEvents(state);
        
        for (const event of events) {
          // Process legislative events that might affect elections
          if (this.isElectionRelevant(event)) {
            await eventProcessingService.ingestEvent({
              type: 'candidate_change',
              electionId: this.findRelatedElection(event),
              data: {
                legislativeEvent: event,
                impact: 'potential_candidate_change'
              },
              timestamp: new Date(event.date)
            }, 'legislative_monitor');
          }
        }
      } catch (error) {
        console.error(`Failed to monitor legislative activity for ${state}:`, error);
      }
    }
  }

  // Enhanced ballot information service
  async getEnhancedBallotInfo(address: string): Promise<any> {
    try {
      // Combine multiple sources for comprehensive ballot information
      const [democracyWorks, ballotpedia] = await Promise.allSettled([
        this.fetchBallotInfo(address),
        this.getBallotpediaInfoByAddress(address)
      ]);

      const combined = {
        address,
        timestamp: new Date(),
        sources: []
      };

      if (democracyWorks.status === 'fulfilled' && democracyWorks.value) {
        combined.sources.push({
          provider: 'Democracy Works',
          data: democracyWorks.value
        });
      }

      if (ballotpedia.status === 'fulfilled' && ballotpedia.value) {
        combined.sources.push({
          provider: 'Ballotpedia',
          data: ballotpedia.value
        });
      }

      return combined;
    } catch (error) {
      console.error('Enhanced ballot info fetch failed:', error);
      return null;
    }
  }

  // Crowdsourced verification integration
  async submitCrowdsourcedReport(report: {
    electionId: number;
    reportType: 'discrepancy' | 'verification' | 'update';
    evidence: string;
    location: string;
    reporterInfo: any;
  }): Promise<boolean> {
    try {
      // Validate reporter location
      const locationValid = await this.validateReporterLocation(
        report.location,
        report.reporterInfo.ipAddress
      );

      if (!locationValid) {
        console.warn('Invalid reporter location detected');
        return false;
      }

      // Validate evidence
      const evidenceValidation = await aiValidationService.validateElectionClaim(
        `Election discrepancy report: ${report.evidence}`,
        'crowdsourced_verification'
      );

      if (evidenceValidation.confidence > 0.6) {
        // Submit to event processing
        await eventProcessingService.ingestEvent({
          type: 'result_update',
          electionId: report.electionId,
          data: {
            crowdsourcedReport: report,
            validationScore: evidenceValidation.confidence
          },
          timestamp: new Date()
        }, 'crowdsource');

        return true;
      }

      return false;
    } catch (error) {
      console.error('Crowdsourced report submission failed:', error);
      return false;
    }
  }

  // Utility methods
  private determineElectionStatus(electionDate: string): 'upcoming' | 'ongoing' | 'completed' {
    const now = new Date();
    const election = new Date(electionDate);
    const daysDiff = Math.floor((election.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 0) return 'upcoming';
    if (daysDiff === 0) return 'ongoing';
    return 'completed';
  }

  private generateElectionId(election: GlobalElectionData): number {
    // Generate a consistent ID based on election properties
    const hash = this.simpleHash(`${election.country}-${election.date}-${election.electionType}`);
    return Math.abs(hash) % 1000000;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private isElectionRelevant(event: OpenStatesEvent): boolean {
    const relevantKeywords = [
      'election', 'voting', 'ballot', 'candidate', 'campaign',
      'redistricting', 'polling', 'voter', 'registration'
    ];
    
    const eventText = `${event.data.name} ${event.data.description}`.toLowerCase();
    return relevantKeywords.some(keyword => eventText.includes(keyword));
  }

  private findRelatedElection(event: OpenStatesEvent): number {
    // Logic to find related election ID based on state and date
    // This would typically query the database
    return 1; // Placeholder
  }

  private async getBallotpediaInfoByAddress(address: string): Promise<any> {
    // Helper method to get Ballotpedia info by address
    // Would typically involve geocoding and then querying by district
    return null;
  }

  private async validateReporterLocation(reportedLocation: string, ipAddress: string): Promise<boolean> {
    // Validate that reporter is actually in the location they claim
    // This would use GeoIP services to verify
    return true; // Simplified for now
  }

  // Status and health checks
  getServiceStatus(): {
    ideaConnected: boolean;
    openStatesConnected: boolean;
    aceNetworkConnected: boolean;
    ballotpediaConnected: boolean;
    lastMonitoringRun: Date;
  } {
    return {
      ideaConnected: !!this.ideaApiKey,
      openStatesConnected: !!this.openStatesKey,
      aceNetworkConnected: !!this.aceNetworkEndpoint,
      ballotpediaConnected: !!this.ballotpediaKey,
      lastMonitoringRun: new Date()
    };
  }
}

export const globalElectionService = new GlobalElectionService();