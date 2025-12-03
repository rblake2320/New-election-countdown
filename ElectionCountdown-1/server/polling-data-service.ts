/**
 * Authentic Polling Data Service
 * Aggregates real polling data from reliable sources
 */

interface PollingResult {
  candidateName: string;
  percentage: number;
  pollster: string;
  date: string;
  sampleSize: number;
  marginOfError: number;
  source: string;
}

interface ElectionPolling {
  electionId: number;
  lastUpdated: Date;
  polls: PollingResult[];
  averages: {
    candidateName: string;
    averagePercentage: number;
    trendDirection: 'up' | 'down' | 'stable';
  }[];
}

export class PollingDataService {
  private readonly sources = {
    realClearPolitics: 'https://www.realclearpolitics.com',
    ballotpedia: 'https://ballotpedia.org/api',
    cookPolitical: 'https://cookpolitical.com/api',
    pollster: 'https://projects.fivethirtyeight.com/polls/data'
  };

  /**
   * Get authentic polling data for an election
   */
  async getElectionPolling(electionId: number, candidateNames: string[]): Promise<ElectionPolling | null> {
    try {
      // Try multiple sources for authentic polling data
      const pollingResults = await Promise.allSettled([
        this.fetchBallotpediaPolls(electionId, candidateNames),
        this.fetchRealClearPoliticsPolls(candidateNames),
        this.fetchCookPoliticalPolls(candidateNames),
        this.fetchGenericPollingData(candidateNames)
      ]);

      const validPolls = pollingResults
        .filter((result): result is PromiseFulfilledResult<PollingResult[]> => 
          result.status === 'fulfilled' && result.value.length > 0
        )
        .flatMap(result => result.value);

      if (validPolls.length === 0) {
        console.log(`No authentic polling data found for election ${electionId}`);
        return null;
      }

      // Calculate weighted averages from multiple sources
      const averages = this.calculatePollingAverages(validPolls, candidateNames);

      return {
        electionId,
        lastUpdated: new Date(),
        polls: validPolls,
        averages
      };

    } catch (error) {
      console.error('Error fetching authentic polling data:', error);
      return null;
    }
  }

  /**
   * Fetch polling data from Ballotpedia API
   */
  private async fetchBallotpediaPolls(electionId: number, candidateNames: string[]): Promise<PollingResult[]> {
    try {
      // Ballotpedia doesn't have a public API, but we can scrape structured data
      const { getFirecrawlService } = await import('./firecrawl-service');
      const firecrawl = getFirecrawlService();
      
      if (!firecrawl) {
        return [];
      }

      // Search for election-specific polling data on Ballotpedia
      const searchQuery = candidateNames.join(' vs ') + ' polls';
      const ballotpediaUrl = `https://ballotpedia.org/wiki/index.php?search=${encodeURIComponent(searchQuery)}`;
      
      const scrapedData = await firecrawl.scrapeUrl(ballotpediaUrl);
      if (!scrapedData) {
        return [];
      }

      return this.parsePollingFromContent(scrapedData.content, candidateNames);

    } catch (error) {
      console.error('Error fetching Ballotpedia polls:', error);
      return [];
    }
  }

  /**
   * Fetch polling data from RealClearPolitics
   */
  private async fetchRealClearPoliticsPolls(candidateNames: string[]): Promise<PollingResult[]> {
    try {
      const { getFirecrawlService } = await import('./firecrawl-service');
      const firecrawl = getFirecrawlService();
      
      if (!firecrawl) {
        return [];
      }

      // RealClearPolitics race pages contain polling averages
      const rcpUrl = `https://www.realclearpolitics.com/epolls/latest_polls/`;
      const scrapedData = await firecrawl.scrapeUrl(rcpUrl);
      
      if (!scrapedData) {
        return [];
      }

      return this.parsePollingFromContent(scrapedData.content, candidateNames);

    } catch (error) {
      console.error('Error fetching RealClearPolitics polls:', error);
      return [];
    }
  }

  /**
   * Fetch polling data from Cook Political Report
   */
  private async fetchCookPoliticalPolls(candidateNames: string[]): Promise<PollingResult[]> {
    try {
      const { getFirecrawlService } = await import('./firecrawl-service');
      const firecrawl = getFirecrawlService();
      
      if (!firecrawl) {
        return [];
      }

      const cookUrl = `https://cookpolitical.com/ratings/house-race-ratings`;
      const scrapedData = await firecrawl.scrapeUrl(cookUrl);
      
      if (!scrapedData) {
        return [];
      }

      return this.parsePollingFromContent(scrapedData.content, candidateNames);

    } catch (error) {
      console.error('Error fetching Cook Political polls:', error);
      return [];
    }
  }

  /**
   * Fetch generic polling data from multiple aggregators
   */
  private async fetchGenericPollingData(candidateNames: string[]): Promise<PollingResult[]> {
    try {
      // Use Google News or similar to find recent polling reports
      const { getFirecrawlService } = await import('./firecrawl-service');
      const firecrawl = getFirecrawlService();
      
      if (!firecrawl) {
        return [];
      }

      const searchQuery = candidateNames.join(' ') + ' poll results';
      const newsUrls = [
        `https://news.google.com/search?q=${encodeURIComponent(searchQuery)}`,
        `https://www.politico.com/search/?q=${encodeURIComponent(searchQuery)}`,
        `https://thehill.com/search/?q=${encodeURIComponent(searchQuery)}`
      ];

      const results = await Promise.allSettled(
        newsUrls.map(url => firecrawl.scrapeUrl(url))
      );

      const allContent = results
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value
        )
        .map(result => result.value.content)
        .join('\n');

      return this.parsePollingFromContent(allContent, candidateNames);

    } catch (error) {
      console.error('Error fetching generic polling data:', error);
      return [];
    }
  }

  /**
   * Parse polling data from scraped content
   */
  private parsePollingFromContent(content: string, candidateNames: string[]): PollingResult[] {
    const polls: PollingResult[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      for (const candidateName of candidateNames) {
        // Look for patterns like "Candidate Name 45%" or "Candidate: 45%"
        const patterns = [
          new RegExp(`${candidateName}[^\\d]*([0-9]+(?:\\.[0-9]+)?)%`, 'i'),
          new RegExp(`${candidateName}[^\\d]*:?\\s*([0-9]+(?:\\.[0-9]+)?)%`, 'i'),
          new RegExp(`([0-9]+(?:\\.[0-9]+)?)%[^\\w]*${candidateName}`, 'i')
        ];

        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            const percentage = parseFloat(match[1]);
            if (percentage > 0 && percentage <= 100) {
              polls.push({
                candidateName,
                percentage,
                pollster: this.extractPollster(line) || 'Unknown',
                date: this.extractDate(line) || new Date().toISOString().split('T')[0],
                sampleSize: this.extractSampleSize(line) || 0,
                marginOfError: this.extractMarginOfError(line) || 0,
                source: 'Web Scraping'
              });
            }
          }
        }
      }
    }

    return polls;
  }

  /**
   * Calculate weighted polling averages
   */
  private calculatePollingAverages(polls: PollingResult[], candidateNames: string[]): any[] {
    const averages: any[] = [];

    for (const candidateName of candidateNames) {
      const candidatePolls = polls.filter(poll => 
        poll.candidateName.toLowerCase().includes(candidateName.toLowerCase())
      );

      if (candidatePolls.length === 0) {
        continue;
      }

      // Weight recent polls more heavily
      const weightedSum = candidatePolls.reduce((sum, poll) => {
        const daysOld = this.getDaysOld(poll.date);
        const weight = Math.max(0.1, 1 - (daysOld / 30)); // Decay over 30 days
        return sum + (poll.percentage * weight);
      }, 0);

      const totalWeight = candidatePolls.reduce((sum, poll) => {
        const daysOld = this.getDaysOld(poll.date);
        return sum + Math.max(0.1, 1 - (daysOld / 30));
      }, 0);

      const averagePercentage = Math.round((weightedSum / totalWeight) * 10) / 10;

      averages.push({
        candidateName,
        averagePercentage,
        trendDirection: this.calculateTrend(candidatePolls)
      });
    }

    return averages;
  }

  /**
   * Extract pollster name from content
   */
  private extractPollster(text: string): string | null {
    const pollsters = [
      'Quinnipiac', 'CNN', 'Fox News', 'ABC', 'CBS', 'NBC', 'Gallup', 
      'Rasmussen', 'Ipsos', 'YouGov', 'Marist', 'Monmouth', 'Suffolk'
    ];

    for (const pollster of pollsters) {
      if (text.toLowerCase().includes(pollster.toLowerCase())) {
        return pollster;
      }
    }

    return null;
  }

  /**
   * Extract date from content
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
        return new Date(match[1]).toISOString().split('T')[0];
      }
    }

    return null;
  }

  /**
   * Extract sample size from content
   */
  private extractSampleSize(text: string): number {
    const match = text.match(/sample[^0-9]*([0-9,]+)/i);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
  }

  /**
   * Extract margin of error from content
   */
  private extractMarginOfError(text: string): number {
    const match = text.match(/margin.*error[^0-9]*([0-9.]+)/i);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Calculate how many days old a poll is
   */
  private getDaysOld(dateString: string): number {
    const pollDate = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - pollDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate polling trend direction
   */
  private calculateTrend(polls: PollingResult[]): 'up' | 'down' | 'stable' {
    if (polls.length < 2) return 'stable';

    const sortedPolls = polls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recent = sortedPolls.slice(0, 2);
    
    if (recent.length < 2) return 'stable';

    const difference = recent[0].percentage - recent[1].percentage;
    
    if (difference > 1) return 'up';
    if (difference < -1) return 'down';
    return 'stable';
  }
}

// Singleton instance
let pollingService: PollingDataService | null = null;

export function getPollingDataService(): PollingDataService {
  if (!pollingService) {
    pollingService = new PollingDataService();
  }
  return pollingService;
}

/**
 * Update polling data for specific election
 */
export async function updateElectionPolling(electionId: number, candidateNames: string[]): Promise<ElectionPolling | null> {
  const service = getPollingDataService();
  return await service.getElectionPolling(electionId, candidateNames);
}