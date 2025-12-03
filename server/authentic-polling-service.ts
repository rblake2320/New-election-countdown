/**
 * Authentic Polling Data Service
 * Provides real polling data from verified sources with clear data freshness indicators
 */

interface PollingDataPoint {
  candidateName: string;
  percentage: number;
  pollster: string;
  date: string;
  sampleSize: number;
  marginOfError: number;
  isAuthentic: boolean;
  sourceUrl: string;
}

interface ElectionPollingData {
  electionId: number;
  lastUpdated: Date;
  dataFreshness: 'live' | 'recent' | 'outdated' | 'none';
  sourcesChecked: string[];
  polls: PollingDataPoint[];
  averages: {
    candidateName: string;
    averagePercentage: number;
    confidence: 'high' | 'medium' | 'low';
    lastPolled: string;
  }[];
}

export class AuthenticPollingService {
  
  /**
   * Get authentic polling data for an election with clear data source indicators
   */
  async getAuthenticPollingData(electionId: number, candidateNames: string[]): Promise<ElectionPollingData> {
    const sourcesChecked: string[] = [];
    const polls: PollingDataPoint[] = [];

    try {
      // Check Ballotpedia for official election pages
      const ballotpediaData = await this.fetchBallotpediaPolls(candidateNames);
      if (ballotpediaData.length > 0) {
        polls.push(...ballotpediaData);
        sourcesChecked.push('Ballotpedia');
      }

      // Check news sources for recent polling reports
      const newsPollingData = await this.fetchNewsPollingData(candidateNames);
      if (newsPollingData.length > 0) {
        polls.push(...newsPollingData);
        sourcesChecked.push('News Sources');
      }

      // Check government sources
      const govData = await this.fetchGovernmentPollingData(candidateNames);
      if (govData.length > 0) {
        polls.push(...govData);
        sourcesChecked.push('Government Sources');
      }

    } catch (error) {
      console.error('Error fetching authentic polling data:', error);
    }

    // Calculate data freshness
    const dataFreshness = this.calculateDataFreshness(polls);
    
    // Calculate weighted averages from authentic sources only
    const averages = this.calculateAuthenticAverages(polls, candidateNames);

    return {
      electionId,
      lastUpdated: new Date(),
      dataFreshness,
      sourcesChecked,
      polls: polls.filter(p => p.isAuthentic), // Only return verified data
      averages
    };
  }

  /**
   * Fetch polling data from Ballotpedia (official election information)
   */
  private async fetchBallotpediaPolls(candidateNames: string[]): Promise<PollingDataPoint[]> {
    try {
      const { getFirecrawlService } = await import('./firecrawl-service');
      const firecrawl = getFirecrawlService();
      
      if (!firecrawl) {
        return [];
      }

      const polls: PollingDataPoint[] = [];
      
      for (const candidateName of candidateNames) {
        const searchUrl = `https://ballotpedia.org/wiki/index.php?search=${encodeURIComponent(candidateName + ' election 2024')}`;
        
        const scrapedData = await firecrawl.scrapeUrl(searchUrl);
        if (scrapedData && scrapedData.content) {
          const candidatePolls = this.extractPollingFromContent(scrapedData.content, candidateName, 'Ballotpedia', searchUrl);
          polls.push(...candidatePolls);
        }
      }

      return polls;

    } catch (error) {
      console.error('Error fetching Ballotpedia polls:', error);
      return [];
    }
  }

  /**
   * Fetch polling data from recent news sources
   */
  private async fetchNewsPollingData(candidateNames: string[]): Promise<PollingDataPoint[]> {
    try {
      const { getFirecrawlService } = await import('./firecrawl-service');
      const firecrawl = getFirecrawlService();
      
      if (!firecrawl) {
        return [];
      }

      const polls: PollingDataPoint[] = [];
      const searchQuery = candidateNames.join(' ') + ' poll results 2024';
      
      // Search trusted news sources
      const newsUrls = [
        `https://www.reuters.com/search?q=${encodeURIComponent(searchQuery)}`,
        `https://apnews.com/search?q=${encodeURIComponent(searchQuery)}`,
        `https://www.npr.org/search?query=${encodeURIComponent(searchQuery)}`
      ];

      for (const url of newsUrls) {
        try {
          const scrapedData = await firecrawl.scrapeUrl(url);
          if (scrapedData && scrapedData.content) {
            for (const candidateName of candidateNames) {
              const candidatePolls = this.extractPollingFromContent(scrapedData.content, candidateName, 'News Source', url);
              polls.push(...candidatePolls);
            }
          }
        } catch (error) {
          console.error(`Error scraping ${url}:`, error);
        }
      }

      return polls;

    } catch (error) {
      console.error('Error fetching news polling data:', error);
      return [];
    }
  }

  /**
   * Fetch polling data from government sources
   */
  private async fetchGovernmentPollingData(candidateNames: string[]): Promise<PollingDataPoint[]> {
    try {
      // Government sources typically don't publish polling data directly
      // But we can check official election websites for any polling information
      return [];

    } catch (error) {
      console.error('Error fetching government polling data:', error);
      return [];
    }
  }

  /**
   * Extract polling percentages from scraped content
   */
  private extractPollingFromContent(content: string, candidateName: string, source: string, sourceUrl: string): PollingDataPoint[] {
    const polls: PollingDataPoint[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Look for polling patterns with the candidate's name
      const patterns = [
        new RegExp(`${candidateName}[^\\d]*([0-9]+(?:\\.[0-9]+)?)%`, 'i'),
        new RegExp(`([0-9]+(?:\\.[0-9]+)?)%[^\\w]*${candidateName}`, 'i'),
        new RegExp(`${candidateName}[^\\d]*:?\\s*([0-9]+(?:\\.[0-9]+)?)%`, 'i')
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const percentage = parseFloat(match[1]);
          if (percentage > 0 && percentage <= 100) {
            // Verify this looks like authentic polling data
            const isAuthentic = this.verifyPollingAuthenticity(line, percentage);
            
            if (isAuthentic) {
              polls.push({
                candidateName,
                percentage,
                pollster: this.extractPollster(line) || 'Unknown',
                date: this.extractDate(line) || new Date().toISOString().split('T')[0],
                sampleSize: this.extractSampleSize(line) || 0,
                marginOfError: this.extractMarginOfError(line) || 0,
                isAuthentic: true,
                sourceUrl
              });
            }
          }
        }
      }
    }

    return polls;
  }

  /**
   * Verify if polling data appears authentic
   */
  private verifyPollingAuthenticity(text: string, percentage: number): boolean {
    const authenticityIndicators = [
      /poll/i,
      /survey/i,
      /quinnipiac/i,
      /cnn/i,
      /fox news/i,
      /abc/i,
      /cbs/i,
      /nbc/i,
      /gallup/i,
      /rasmussen/i,
      /ipsos/i,
      /yougov/i,
      /marist/i,
      /monmouth/i,
      /suffolk/i,
      /margin of error/i,
      /sample size/i,
      /conducted/i
    ];

    // Must have at least one polling indicator
    const hasPollingIndicator = authenticityIndicators.some(pattern => pattern.test(text));
    
    // Reasonable percentage range
    const reasonableRange = percentage >= 5 && percentage <= 95;
    
    return hasPollingIndicator && reasonableRange;
  }

  /**
   * Calculate data freshness based on polling dates
   */
  private calculateDataFreshness(polls: PollingDataPoint[]): 'live' | 'recent' | 'outdated' | 'none' {
    if (polls.length === 0) return 'none';

    const now = new Date();
    const mostRecentPoll = polls.reduce((latest, poll) => {
      const pollDate = new Date(poll.date);
      const latestDate = new Date(latest.date);
      return pollDate > latestDate ? poll : latest;
    });

    const daysSinceLatest = Math.floor((now.getTime() - new Date(mostRecentPoll.date).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLatest <= 7) return 'live';
    if (daysSinceLatest <= 30) return 'recent';
    if (daysSinceLatest <= 90) return 'outdated';
    return 'none';
  }

  /**
   * Calculate weighted averages from authentic sources only
   */
  private calculateAuthenticAverages(polls: PollingDataPoint[], candidateNames: string[]): any[] {
    const averages: any[] = [];

    for (const candidateName of candidateNames) {
      const candidatePolls = polls.filter(poll => 
        poll.candidateName.toLowerCase().includes(candidateName.toLowerCase()) && poll.isAuthentic
      );

      if (candidatePolls.length === 0) {
        // No authentic polling data available
        averages.push({
          candidateName,
          averagePercentage: null,
          confidence: 'low',
          lastPolled: 'No recent polls'
        });
        continue;
      }

      // Weight recent polls more heavily
      const weightedSum = candidatePolls.reduce((sum, poll) => {
        const daysOld = this.getDaysOld(poll.date);
        const recencyWeight = Math.max(0.1, 1 - (daysOld / 30));
        const sampleWeight = poll.sampleSize > 0 ? Math.min(1, poll.sampleSize / 1000) : 0.5;
        const weight = recencyWeight * sampleWeight;
        return sum + (poll.percentage * weight);
      }, 0);

      const totalWeight = candidatePolls.reduce((sum, poll) => {
        const daysOld = this.getDaysOld(poll.date);
        const recencyWeight = Math.max(0.1, 1 - (daysOld / 30));
        const sampleWeight = poll.sampleSize > 0 ? Math.min(1, poll.sampleSize / 1000) : 0.5;
        return sum + (recencyWeight * sampleWeight);
      }, 0);

      const averagePercentage = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
      
      // Determine confidence based on number of polls and recency
      const mostRecentPoll = candidatePolls.reduce((latest, poll) => 
        new Date(poll.date) > new Date(latest.date) ? poll : latest
      );
      
      const confidence = this.calculateConfidence(candidatePolls.length, this.getDaysOld(mostRecentPoll.date));

      averages.push({
        candidateName,
        averagePercentage,
        confidence,
        lastPolled: mostRecentPoll.date
      });
    }

    return averages;
  }

  /**
   * Calculate confidence level based on poll quantity and recency
   */
  private calculateConfidence(pollCount: number, daysSinceLatest: number): 'high' | 'medium' | 'low' {
    if (pollCount >= 3 && daysSinceLatest <= 14) return 'high';
    if (pollCount >= 2 && daysSinceLatest <= 30) return 'medium';
    return 'low';
  }

  /**
   * Extract pollster name from text
   */
  private extractPollster(text: string): string | null {
    const pollsters = [
      'Quinnipiac', 'CNN', 'Fox News', 'ABC', 'CBS', 'NBC', 'Gallup', 
      'Rasmussen', 'Ipsos', 'YouGov', 'Marist', 'Monmouth', 'Suffolk',
      'Reuters', 'Associated Press', 'NPR', 'Wall Street Journal'
    ];

    for (const pollster of pollsters) {
      if (text.toLowerCase().includes(pollster.toLowerCase())) {
        return pollster;
      }
    }

    return null;
  }

  /**
   * Extract date from text
   */
  private extractDate(text: string): string | null {
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{1,2}-\d{1,2})/,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return new Date(match[1]).toISOString().split('T')[0];
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Extract sample size from text
   */
  private extractSampleSize(text: string): number {
    const match = text.match(/sample[^0-9]*([0-9,]+)/i);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
  }

  /**
   * Extract margin of error from text
   */
  private extractMarginOfError(text: string): number {
    const match = text.match(/margin.*error[^0-9]*([0-9.]+)/i);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Calculate days since poll date
   */
  private getDaysOld(dateString: string): number {
    try {
      const pollDate = new Date(dateString);
      const now = new Date();
      return Math.floor((now.getTime() - pollDate.getTime()) / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 999; // Very old if date parsing fails
    }
  }
}

// Singleton instance
let authenticPollingService: AuthenticPollingService | null = null;

export function getAuthenticPollingService(): AuthenticPollingService {
  if (!authenticPollingService) {
    authenticPollingService = new AuthenticPollingService();
  }
  return authenticPollingService;
}