import { type Election, type InsertElection, type Candidate, type InsertCandidate } from "@shared/schema";

export interface GoogleCivicElection {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId?: string;
}

export interface GoogleCivicContest {
  type: string;
  office: string;
  level: string[];
  roles: string[];
  district?: {
    name: string;
    scope: string;
  };
  candidates?: Array<{
    name: string;
    party?: string;
    candidateUrl?: string;
    channels?: Array<{
      type: string;
      id: string;
    }>;
  }>;
}

export interface GoogleCivicVoterInfoResponse {
  election: GoogleCivicElection;
  contests?: GoogleCivicContest[];
  state?: Array<{
    name: string;
    electionAdministrationBody?: {
      name: string;
      electionInfoUrl?: string;
      electionRegistrationUrl?: string;
      electionRegistrationConfirmationUrl?: string;
      absenteeVotingInfoUrl?: string;
      votingLocationFinderUrl?: string;
      ballotInfoUrl?: string;
      correspondenceAddress?: any;
    };
  }>;
}

export class GoogleCivicService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/civicinfo/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    
    // Add API key and other parameters
    url.searchParams.set('key', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Civic API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async fetchElections(): Promise<Election[]> {
    try {
      const data = await this.makeRequest('elections');
      
      if (!data.elections) {
        return [];
      }

      return data.elections.map((election: GoogleCivicElection, index: number) => ({
        id: index + 1000, // Offset to avoid conflicts with seeded data
        title: election.name,
        subtitle: null,
        location: this.extractLocationFromOcd(election.ocdDivisionId),
        state: this.extractStateFromOcd(election.ocdDivisionId),
        date: new Date(election.electionDay),
        type: this.determineElectionType(election.name),
        level: this.determineElectionLevel(election.ocdDivisionId, election.name),
        offices: [],
        description: `Election sourced from Google Civic Information API`,
        pollsOpen: null,
        pollsClose: null,
        timezone: null,
        isActive: true,
      }));
    } catch (error) {
      console.error('Error fetching elections from Google Civic API:', error);
      throw error;
    }
  }

  async fetchVoterInfo(address: string, electionId?: string): Promise<{
    election: Election;
    contests: Array<{
      office: string;
      candidates: Candidate[];
    }>;
  } | null> {
    try {
      const params: Record<string, string> = { address };
      if (electionId) {
        params.electionId = electionId;
      }

      const data: GoogleCivicVoterInfoResponse = await this.makeRequest('/voterinfo', params);
      
      if (!data.election) {
        return null;
      }

      const election: Election = {
        id: parseInt(data.election.id) || 0,
        title: data.election.name,
        subtitle: null,
        location: address,
        state: this.extractStateFromOcd(data.election.ocdDivisionId),
        date: new Date(data.election.electionDay),
        type: this.determineElectionType(data.election.name),
        level: this.determineElectionLevel(data.election.ocdDivisionId, data.election.name),
        offices: data.contests?.map(c => c.office) || [],
        description: `Voter information for ${address}`,
        pollsOpen: null,
        pollsClose: null,
        timezone: null,
        isActive: true,
      };

      const contests = data.contests?.map(contest => ({
        office: contest.office,
        candidates: contest.candidates?.map((candidate, index) => ({
          id: index + 2000, // Offset for Google Civic candidates
          name: candidate.name,
          party: candidate.party || 'Unknown',
          electionId: election.id,
          pollingSupport: null,
          pollingTrend: null,
          lastPollingUpdate: null,
          pollingSource: null,
          isIncumbent: false,
          description: null,
          website: candidate.candidateUrl || null,
          votesReceived: null,
          votePercentage: null,
          isWinner: false,
          isProjectedWinner: false,
          isVerified: false,
          subscriptionTier: null,
          profileImageUrl: null,
          campaignBio: null,
          contactEmail: null,
          campaignPhone: null,
          socialMedia: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) || []
      })) || [];

      return { election, contests };
    } catch (error) {
      console.error('Error fetching voter info from Google Civic API:', error);
      throw error;
    }
  }

  private extractLocationFromOcd(ocdId?: string): string {
    if (!ocdId) return 'Unknown';
    
    // Extract location from OCD ID format: ocd-division/country:us/state:ca/place:san_francisco
    const parts = ocdId.split('/');
    const statePart = parts.find(p => p.startsWith('state:'));
    const placePart = parts.find(p => p.startsWith('place:'));
    
    if (placePart) {
      return placePart.replace('place:', '').replace(/_/g, ' ').toUpperCase();
    }
    if (statePart) {
      return statePart.replace('state:', '').toUpperCase();
    }
    
    return 'Unknown';
  }

  private extractStateFromOcd(ocdId?: string): string {
    if (!ocdId) return 'Unknown';
    
    const statePart = ocdId.split('/').find(p => p.startsWith('state:'));
    return statePart ? statePart.replace('state:', '').toUpperCase() : 'Unknown';
  }

  private determineElectionType(name: string): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('primary')) return 'primary';
    if (nameLower.includes('special')) return 'special';
    if (nameLower.includes('runoff')) return 'general';
    if (nameLower.includes('general')) return 'general';
    
    return 'general';
  }

  private determineElectionLevel(ocdId?: string, name?: string): string {
    if (!ocdId && !name) return 'local';
    
    const nameLower = name?.toLowerCase() || '';
    
    if (nameLower.includes('president') || nameLower.includes('congress') || nameLower.includes('senate') || nameLower.includes('house')) {
      return 'federal';
    }
    
    if (ocdId) {
      if (ocdId.includes('country:us') && ocdId.split('/').length <= 3) {
        return 'federal';
      }
      if (ocdId.includes('state:') && !ocdId.includes('place:') && !ocdId.includes('county:')) {
        return 'state';
      }
    }
    
    if (nameLower.includes('governor') || nameLower.includes('state') || nameLower.includes('assembly') || nameLower.includes('legislature')) {
      return 'state';
    }
    
    return 'local';
  }
}

// Singleton instance
let googleCivicService: GoogleCivicService | null = null;

export function getGoogleCivicService(): GoogleCivicService | null {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  
  if (!apiKey) {
    console.warn('GOOGLE_CIVIC_API_KEY not found in environment variables');
    return null;
  }
  
  if (!googleCivicService) {
    googleCivicService = new GoogleCivicService(apiKey);
  }
  
  return googleCivicService;
}