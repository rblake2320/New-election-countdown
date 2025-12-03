export class PerplexityCongressService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('PERPLEXITY_API_KEY not found in environment variables');
    }
  }

  private async makeRequest(messages: any[]): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages,
        max_tokens: 2000,
        temperature: 0.2,
        search_recency_filter: 'month',
        return_related_questions: false
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    return response.json();
  }

  async findMissingCongressMembers(currentMembers: any[]): Promise<any> {
    const houseCount = currentMembers.filter(m => m.chamber === 'House').length;
    const senateCount = currentMembers.filter(m => m.chamber === 'Senate').length;

    const messages = [
      {
        role: 'system',
        content: 'You are a congressional data expert. Provide accurate, current information about U.S. Congress members.'
      },
      {
        role: 'user',
        content: `I have a congressional dataset with ${houseCount} House members (should be 435) and ${senateCount} Senate members (should be 100). 

Please identify:
1. Which House districts are currently vacant or have recent changes
2. Any states with irregular senator counts
3. Recent congressional appointments or special elections that might affect the roster

Focus on identifying specific missing members or recent changes to help complete an accurate congressional roster for the current Congress.`
      }
    ];

    try {
      const response = await this.makeRequest(messages);
      return {
        success: true,
        data: response.choices[0]?.message?.content || '',
        citations: response.citations || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async verifyCongressionalData(memberName: string, state: string, district: string): Promise<any> {
    const messages = [
      {
        role: 'system',
        content: 'Verify congressional member information using current, official sources.'
      },
      {
        role: 'user',
        content: `Please verify: Is ${memberName} currently serving as the representative for ${state}${district ? ` district ${district}` : ' (Senate)'}? If not, who is the current representative?`
      }
    ];

    try {
      const response = await this.makeRequest(messages);
      return {
        success: true,
        data: response.choices[0]?.message?.content || '',
        citations: response.citations || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async searchWithAI(query: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: 'You are an election information expert. Provide accurate, factual information about elections, candidates, and voting procedures.'
      },
      {
        role: 'user',
        content: query
      }
    ];

    try {
      const response = await this.makeRequest(messages);
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Perplexity AI search error:', error);
      return '';
    }
  }
}

export const perplexityCongressService = new PerplexityCongressService();