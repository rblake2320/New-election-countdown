import { z } from 'zod';

const OpenStatesPersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  party: z.string(),
  jurisdiction: z.object({
    name: z.string(),
    classification: z.string(),
  }),
  current_role: z.object({
    title: z.string(),
    org_classification: z.string(),
    district: z.string().optional(),
    division_id: z.string(),
  }).optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  image: z.string().optional(),
  email: z.string().optional(),
  gender: z.string().optional(),
  birth_date: z.string().optional(),
  openstates_url: z.string().optional(),
});

type OpenStatesPerson = z.infer<typeof OpenStatesPersonSchema>;

export class OpenStatesService {
  private apiKey: string;
  private baseUrl = 'https://v3.openstates.org';
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  constructor() {
    this.apiKey = process.env.OPENSTATES_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OPENSTATES_API_KEY not configured. OpenStates features unavailable.');
    }
  }

  private async rateLimitedRequest(url: string): Promise<Response> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    return fetch(url);
  }

  async getCurrentCongressMembers(limit = 50): Promise<OpenStatesPerson[]> {
    if (!this.apiKey) return [];

    try {
      const url = `${this.baseUrl}/people?apikey=${this.apiKey}&jurisdiction=us&per_page=${limit}`;
      const response = await this.rateLimitedRequest(url);
      
      if (!response.ok) {
        throw new Error(`OpenStates API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.results?.map((person: any) => OpenStatesPersonSchema.parse(person)) || [];
    } catch (error) {
      console.error('Error fetching current Congress members:', error);
      return [];
    }
  }

  async searchMembersByState(state: string): Promise<OpenStatesPerson[]> {
    if (!this.apiKey) return [];

    try {
      const url = `${this.baseUrl}/people?apikey=${this.apiKey}&jurisdiction=us&current_role__division_id__contains=${state.toLowerCase()}&per_page=50`;
      const response = await this.rateLimitedRequest(url);
      
      if (!response.ok) {
        throw new Error(`OpenStates API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.results?.map((person: any) => OpenStatesPersonSchema.parse(person)) || [];
    } catch (error) {
      console.error(`Error fetching members for state ${state}:`, error);
      return [];
    }
  }

  async getMemberById(personId: string): Promise<OpenStatesPerson | null> {
    if (!this.apiKey) return null;

    try {
      const url = `${this.baseUrl}/people/${personId}?apikey=${this.apiKey}`;
      const response = await this.rateLimitedRequest(url);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`OpenStates API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return OpenStatesPersonSchema.parse(data);
    } catch (error) {
      console.error(`Error fetching member ${personId}:`, error);
      return null;
    }
  }

  async searchMembersByName(name: string): Promise<OpenStatesPerson[]> {
    if (!this.apiKey) return [];

    try {
      const url = `${this.baseUrl}/people?apikey=${this.apiKey}&jurisdiction=us&name=${encodeURIComponent(name)}&per_page=10`;
      const response = await this.rateLimitedRequest(url);
      
      if (!response.ok) {
        throw new Error(`OpenStates API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.results?.map((person: any) => OpenStatesPersonSchema.parse(person)) || [];
    } catch (error) {
      console.error(`Error searching members by name ${name}:`, error);
      return [];
    }
  }

  async getApiUsageInfo(): Promise<{ dailyLimit: number; remaining: number; resetTime?: string }> {
    // OpenStates default tier: 500 daily requests, 1 req/sec
    return {
      dailyLimit: 500,
      remaining: 500, // Would need to track this in practice
      resetTime: 'Daily reset at midnight UTC'
    };
  }
}

export const openStatesService = new OpenStatesService();