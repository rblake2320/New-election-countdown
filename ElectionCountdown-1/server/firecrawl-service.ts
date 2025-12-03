/**
 * Firecrawl Web Scraping Service
 * Scrapes authentic election data from official government sources
 */

interface FirecrawlResponse {
  success: boolean;
  data?: {
    content: string;
    markdown: string;
    html: string;
    metadata: {
      title: string;
      description: string;
      language: string;
      sourceURL: string;
    };
  };
  error?: string;
}

interface ScrapedElectionData {
  source: string;
  title: string;
  description: string;
  content: string;
  scrapedAt: Date;
  metadata: Record<string, any>;
}

interface CandidateInfo {
  name: string;
  party: string;
  office: string;
  website?: string;
  biography?: string;
  positions?: string[];
}

export class FirecrawlService {
  private baseUrl = 'https://api.firecrawl.dev/v0';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Scrape a single URL for election data
   */
  async scrapeUrl(url: string, includeHtml = false): Promise<ScrapedElectionData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: includeHtml ? ['markdown', 'html'] : ['markdown'],
          includeTags: ['title', 'meta', 'h1', 'h2', 'h3', 'p', 'li', 'table'],
          excludeTags: ['script', 'style', 'nav', 'footer', 'advertisement'],
          waitFor: 2000,
          timeout: 30000
        }),
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status}`);
      }

      const data: FirecrawlResponse = await response.json();

      if (!data.success || !data.data) {
        console.error('Firecrawl scraping failed:', data.error);
        return null;
      }

      return {
        source: url,
        title: data.data.metadata.title || 'Unknown Title',
        description: data.data.metadata.description || '',
        content: data.data.markdown || data.data.content,
        scrapedAt: new Date(),
        metadata: {
          language: data.data.metadata.language,
          sourceURL: data.data.metadata.sourceURL,
          ...data.data.metadata
        }
      };

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }

  /**
   * Scrape multiple URLs in parallel
   */
  async scrapeMultiple(urls: string[]): Promise<ScrapedElectionData[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.scrapeUrl(url))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<ScrapedElectionData> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * Scrape official state election websites
   */
  async scrapeStateElectionSites(state: string): Promise<ScrapedElectionData[]> {
    const stateUrls = this.getOfficialStateElectionUrls(state);
    return await this.scrapeMultiple(stateUrls);
  }

  /**
   * Scrape candidate information from official sources
   */
  async scrapeCandidateInfo(candidateName: string, office: string, state: string): Promise<CandidateInfo | null> {
    try {
      // Search for official candidate pages
      const searchUrls = [
        `https://ballotpedia.org/wiki/index.php?search=${encodeURIComponent(candidateName)}+${encodeURIComponent(state)}`,
        `https://www.vote411.org/search?name=${encodeURIComponent(candidateName)}&state=${encodeURIComponent(state)}`
      ];

      const scrapedData = await this.scrapeMultiple(searchUrls);
      
      if (scrapedData.length === 0) {
        return null;
      }

      // Extract candidate information from scraped content
      const candidateData = scrapedData[0];
      return this.extractCandidateInfo(candidateData.content, candidateName);

    } catch (error) {
      console.error(`Error scraping candidate info for ${candidateName}:`, error);
      return null;
    }
  }

  /**
   * Scrape real-time election results
   */
  async scrapeElectionResults(state: string, electionDate: string): Promise<ScrapedElectionData[]> {
    const resultsUrls = [
      `https://${state.toLowerCase()}.gov/elections/results/${electionDate}`,
      `https://ballotpedia.org/${state}_elections,_${new Date(electionDate).getFullYear()}`,
      `https://www.politico.com/2024-election/results/${state.toLowerCase()}/`
    ];

    return await this.scrapeMultiple(resultsUrls);
  }

  /**
   * Monitor election news from trusted sources
   */
  async scrapeElectionNews(keywords: string[]): Promise<ScrapedElectionData[]> {
    const newsUrls = [
      `https://apnews.com/hub/election-2024`,
      `https://www.reuters.com/world/us/elections/`,
      `https://www.npr.org/sections/politics/`,
      `https://www.pbs.org/newshour/politics`
    ];

    return await this.scrapeMultiple(newsUrls);
  }

  /**
   * Extract candidate information from scraped content
   */
  private extractCandidateInfo(content: string, candidateName: string): CandidateInfo | null {
    try {
      // Basic extraction using regex patterns
      const partyMatch = content.match(new RegExp(`${candidateName}.*?(Republican|Democratic|Independent|Green|Libertarian)`, 'i'));
      const officeMatch = content.match(new RegExp(`(Senator|Representative|Governor|Mayor|Congress)`, 'i'));
      const websiteMatch = content.match(/https?:\/\/[^\s<>"]+/g);

      return {
        name: candidateName,
        party: partyMatch?.[1] || 'Unknown',
        office: officeMatch?.[1] || 'Unknown',
        website: websiteMatch?.[0] || undefined,
        biography: this.extractBiography(content, candidateName),
        positions: this.extractPositions(content)
      };

    } catch (error) {
      console.error('Error extracting candidate info:', error);
      return null;
    }
  }

  /**
   * Extract candidate biography from content
   */
  private extractBiography(content: string, candidateName: string): string | undefined {
    const sentences = content.split(/[.!?]+/);
    const bioSentences = sentences.filter(sentence => 
      sentence.toLowerCase().includes(candidateName.toLowerCase()) && 
      sentence.length > 50
    );

    return bioSentences.slice(0, 3).join('. ').trim() || undefined;
  }

  /**
   * Extract policy positions from content
   */
  private extractPositions(content: string): string[] {
    const positionKeywords = [
      'healthcare', 'education', 'economy', 'climate', 'immigration', 
      'defense', 'taxes', 'infrastructure', 'jobs', 'energy'
    ];

    const positions: string[] = [];
    const sentences = content.split(/[.!?]+/);

    positionKeywords.forEach(keyword => {
      const relevantSentence = sentences.find(sentence =>
        sentence.toLowerCase().includes(keyword) && sentence.length > 30
      );
      if (relevantSentence) {
        positions.push(relevantSentence.trim());
      }
    });

    return positions.slice(0, 5); // Limit to 5 positions
  }

  /**
   * Get official state election website URLs
   */
  private getOfficialStateElectionUrls(state: string): string[] {
    const stateCode = state.toLowerCase();
    return [
      `https://sos.${stateCode}.gov/elections/`,
      `https://${stateCode}.gov/elections/`,
      `https://www.${stateCode}.gov/elections/`,
      `https://ballotpedia.org/${state}_elections`,
      `https://www.vote411.org/ballot#state=${state}`
    ];
  }

  /**
   * Validate scraped data quality
   */
  private validateScrapedData(data: ScrapedElectionData): boolean {
    return !!(
      data.content &&
      data.content.length > 100 &&
      data.title &&
      data.source
    );
  }

  /**
   * Clean and normalize scraped content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

// Singleton instance
let firecrawlService: FirecrawlService | null = null;

export function getFirecrawlService(): FirecrawlService | null {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.warn('FIRECRAWL_API_KEY not found. Web scraping will not be available.');
    return null;
  }

  if (!firecrawlService) {
    firecrawlService = new FirecrawlService(process.env.FIRECRAWL_API_KEY);
  }

  return firecrawlService;
}

/**
 * High-level functions for common scraping tasks
 */
export async function scrapeOfficialElectionData(state: string, electionType: string = 'general'): Promise<ScrapedElectionData[]> {
  const service = getFirecrawlService();
  if (!service) return [];

  return await service.scrapeStateElectionSites(state);
}

export async function enrichCandidateWithWebData(candidateName: string, office: string, state: string): Promise<CandidateInfo | null> {
  const service = getFirecrawlService();
  if (!service) return null;

  return await service.scrapeCandidateInfo(candidateName, office, state);
}

export async function monitorElectionNews(): Promise<ScrapedElectionData[]> {
  const service = getFirecrawlService();
  if (!service) return [];

  return await service.scrapeElectionNews(['election', 'voting', 'results', 'ballot']);
}