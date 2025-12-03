import { type Election, type InsertElection, type Candidate, type InsertCandidate } from "@shared/schema";

export interface DataGovElectionResponse {
  // Define based on actual data.gov election API response structure
  results?: any[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export class DataGovService {
  private apiKey: string;
  private baseUrl = 'https://api.data.gov/';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(endpoint, this.baseUrl);
    
    // Add API key and other parameters
    url.searchParams.set('api_key', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Data.gov API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async fetchElections(state?: string, year?: string): Promise<Election[]> {
    try {
      // Example endpoint - adjust based on actual data.gov election API
      const params: Record<string, string> = {};
      if (state) params.state = state;
      if (year) params.year = year;

      const data = await this.makeRequest('elections/upcoming', params);
      
      // Transform data.gov response to our Election format
      return this.transformElectionsData(data);
    } catch (error) {
      console.error('Error fetching elections from data.gov:', error);
      throw error;
    }
  }

  async fetchCandidates(electionId: string): Promise<Candidate[]> {
    try {
      const data = await this.makeRequest(`elections/${electionId}/candidates`);
      return this.transformCandidatesData(data);
    } catch (error) {
      console.error('Error fetching candidates from data.gov:', error);
      throw error;
    }
  }

  private transformElectionsData(data: any): Election[] {
    // Transform data.gov election data to our schema
    // This will need to be adjusted based on the actual API response structure
    if (!data.results) return [];

    return data.results.map((item: any, index: number) => ({
      id: index + 1,
      title: item.election_name || item.title || 'Unknown Election',
      subtitle: item.description || null,
      location: item.location || item.jurisdiction || 'Unknown',
      state: item.state_code || item.state || 'Unknown',
      date: new Date(item.election_date || item.date),
      type: this.mapElectionType(item.election_type || item.type),
      level: this.mapElectionLevel(item.level || item.jurisdiction_type),
      offices: item.offices || [],
      description: item.description || null,
      pollsOpen: item.polls_open || null,
      pollsClose: item.polls_close || null,
      timezone: item.timezone || null,
      isActive: item.is_active !== false,
    }));
  }

  private transformCandidatesData(data: any): Candidate[] {
    if (!data.results) return [];

    return data.results.map((item: any, index: number) => ({
      id: index + 1,
      name: item.candidate_name || item.name || 'Unknown Candidate',
      party: item.party_code || item.party || 'Unknown',
      electionId: null, // Will be set when associating with election
      pollingSupport: item.polling_percentage || null,
      isIncumbent: item.is_incumbent || false,
      description: item.bio || item.description || null,
      website: item.website || null,
    }));
  }

  private mapElectionType(type: string): string {
    const typeMap: Record<string, string> = {
      'primary': 'primary',
      'general': 'general',
      'special': 'special',
      'runoff': 'general',
      'recall': 'special',
    };
    return typeMap[type?.toLowerCase()] || 'general';
  }

  private mapElectionLevel(level: string): string {
    const levelMap: Record<string, string> = {
      'federal': 'federal',
      'state': 'state',
      'local': 'local',
      'county': 'local',
      'municipal': 'local',
      'city': 'local',
    };
    return levelMap[level?.toLowerCase()] || 'local';
  }
}

// Singleton instance
let dataGovService: DataGovService | null = null;

export function getDataGovService(): DataGovService | null {
  const apiKey = process.env.DATA_GOV_API_KEY;
  
  if (!apiKey) {
    console.warn('DATA_GOV_API_KEY not found in environment variables');
    return null;
  }
  
  if (!dataGovService) {
    dataGovService = new DataGovService(apiKey);
  }
  
  return dataGovService;
}