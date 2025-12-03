export interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(messages: Array<{role: string, content: string}>): Promise<PerplexityResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.2,
        top_p: 0.9,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchElections(query: string): Promise<string> {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are an expert on U.S. elections. Provide comprehensive, accurate information about upcoming elections with specific dates, locations, and details. Focus on authentic, verifiable election data.'
        },
        {
          role: 'user',
          content: query
        }
      ];

      const response = await this.makeRequest(messages);
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error searching elections with Perplexity:', error);
      throw error;
    }
  }

  async findAllElectionsUntil2026(): Promise<string> {
    const query = `List all scheduled U.S. elections from January 2025 through November 2026, including:
    - Federal elections (House, Senate, Presidential)
    - State elections (Governor, Legislature, State offices)
    - Local elections (Mayor, City Council, School Board)
    - Special elections
    - Primary elections
    - Municipal elections
    - Off-year elections
    
    For each election, provide: date, location, offices, and type. Focus on comprehensive coverage of all election types and levels.`;

    return this.searchElections(query);
  }

  async searchSpecificElection(state: string, year: string, type?: string): Promise<string> {
    const typeQuery = type ? ` ${type} elections` : ' elections';
    const query = `Find all ${year}${typeQuery} in ${state}, including federal, state, and local elections. Provide specific dates, locations, and offices being contested.`;
    
    return this.searchElections(query);
  }

  async searchCandidateInfo(candidateName: string, election: string): Promise<string> {
    const query = `Find information about candidate ${candidateName} running in ${election}. Include party affiliation, background, campaign website, and key policy positions.`;
    
    return this.searchElections(query);
  }

  async verifyElectionDate(electionTitle: string, date: string): Promise<string> {
    const query = `Verify the date and details for ${electionTitle} scheduled for ${date}. Confirm if this date is accurate and provide any additional context about this election.`;
    
    return this.searchElections(query);
  }
}

export function getPerplexityService(): PerplexityService | null {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn('Perplexity API key not found');
    return null;
  }
  return new PerplexityService(apiKey);
}