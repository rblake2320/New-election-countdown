import fetch from 'node-fetch';
import { db } from './db';
import { candidates, candidatePositions } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { cacheService } from './cache-service';

interface PositionSource {
  source: string;
  confidence: number;
  position: string;
  details?: string;
  dateRecorded: Date;
  url?: string;
}

interface CandidatePosition {
  candidateId: number;
  candidateName: string;
  category: string;
  positions: PositionSource[];
  aggregatedPosition?: string;
  confidence: number;
}

export class PositionAggregatorService {
  private readonly DATA_SOURCES = {
    CONGRESS_VOTES: 'congress.gov',
    PROPUBLICA: 'propublica.org',
    OPENSECRETS: 'opensecrets.org',
    VOTESMART: 'votesmart.org',
    BALLOTPEDIA: 'ballotpedia.org',
    CANDIDATE_PORTAL: 'candidate_upload',
    OFFICIAL_WEBSITE: 'candidate_website',
    NEWS_ANALYSIS: 'news_analysis',
    VOTING_RECORD: 'voting_record'
  };

  private readonly POSITION_CATEGORIES = [
    'Infrastructure',
    'Healthcare',
    'Education',
    'Economy',
    'Environment',
    'Immigration',
    'Social Issues',
    'Defense',
    'Taxes',
    'Technology',
    'Criminal Justice',
    'Foreign Policy'
  ];

  async aggregatePositionsForCandidate(candidateId: number): Promise<CandidatePosition[]> {
    const cacheKey = `positions-${candidateId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const candidate = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    if (!candidate.length) {
      throw new Error('Candidate not found');
    }

    const candidateData = candidate[0];
    const positions: CandidatePosition[] = [];

    for (const category of this.POSITION_CATEGORIES) {
      const categoryPositions = await this.aggregatePositionsByCategory(candidateData, category);
      if (categoryPositions.positions.length > 0) {
        positions.push(categoryPositions);
      }
    }

    await cacheService.set(cacheKey, positions, 60 * 60); // Cache for 1 hour
    return positions;
  }

  private async aggregatePositionsByCategory(candidate: any, category: string): Promise<CandidatePosition> {
    const sources: PositionSource[] = [];

    // 1. Check candidate portal uploads first (highest priority if verified)
    const portalPosition = await this.getCandidatePortalPosition(candidate.id, category);
    if (portalPosition) {
      sources.push(portalPosition);
    }

    // 2. Fetch from voting record analysis
    const votingRecord = await this.getVotingRecordPosition(candidate, category);
    if (votingRecord) {
      sources.push(votingRecord);
    }

    // 3. ProPublica Congress API for voting patterns
    const propublicaPosition = await this.getPropublicaPosition(candidate, category);
    if (propublicaPosition) {
      sources.push(propublicaPosition);
    }

    // 4. OpenSecrets funding analysis
    const fundingAnalysis = await this.getFundingBasedPosition(candidate, category);
    if (fundingAnalysis) {
      sources.push(fundingAnalysis);
    }

    // 5. Official website and press releases
    const officialPosition = await this.getOfficialWebsitePosition(candidate, category);
    if (officialPosition) {
      sources.push(officialPosition);
    }

    // 6. Ballotpedia candidate information
    const ballotpediaPosition = await this.getBallotpediaPosition(candidate, category);
    if (ballotpediaPosition) {
      sources.push(ballotpediaPosition);
    }

    // 7. News analysis and fact-checking sites
    const newsAnalysis = await this.getNewsAnalysisPosition(candidate, category);
    if (newsAnalysis) {
      sources.push(newsAnalysis);
    }

    const aggregatedPosition = this.synthesizePositions(sources);
    const confidence = this.calculateConfidence(sources);

    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      category,
      positions: sources,
      aggregatedPosition,
      confidence
    };
  }

  private async getCandidatePortalPosition(candidateId: number, category: string): Promise<PositionSource | null> {
    try {
      const position = await db
        .select()
        .from(candidatePositions)
        .where(and(
          eq(candidatePositions.candidateId, candidateId),
          eq(candidatePositions.category, category),
          eq(candidatePositions.isVerified, true)
        ))
        .orderBy(sql`${candidatePositions.lastUpdated} DESC`)
        .limit(1);

      if (position.length > 0) {
        return {
          source: this.DATA_SOURCES.CANDIDATE_PORTAL,
          confidence: 0.95, // High confidence for verified candidate uploads
          position: position[0].position,
          details: position[0].detailedStatement || undefined,
          dateRecorded: position[0].lastUpdated || position[0].createdAt || new Date(),
          url: position[0].sourceUrl || undefined
        };
      }
    } catch (error) {
      console.error('Error fetching candidate portal position:', error);
    }
    return null;
  }

  private async getVotingRecordPosition(candidate: any, category: string): Promise<PositionSource | null> {
    // Analyze actual voting record from congress.gov
    if (!candidate.propublicaId && !candidate.congressBioguideId) return null;

    try {
      const votingPattern = await this.analyzeVotingPattern(candidate, category);
      if (votingPattern) {
        return {
          source: this.DATA_SOURCES.VOTING_RECORD,
          confidence: 0.9, // High confidence for actual voting behavior
          position: votingPattern.position,
          details: votingPattern.details,
          dateRecorded: new Date(),
          url: votingPattern.sourceUrl
        };
      }
    } catch (error) {
      console.error('Error analyzing voting record:', error);
    }
    return null;
  }

  private async getPropublicaPosition(candidate: any, category: string): Promise<PositionSource | null> {
    if (!process.env.PROPUBLICA_API_KEY || !candidate.propublicaId) return null;

    try {
      const response = await fetch(
        `https://api.propublica.org/congress/v1/members/${candidate.propublicaId}/votes.json`,
        {
          headers: {
            'X-API-Key': process.env.PROPUBLICA_API_KEY
          }
        }
      );

      if (response.ok) {
        const data = await response.json() as any;
        const categoryVotes = this.filterVotesByCategory(data.results?.[0]?.votes || [], category);
        
        if (categoryVotes.length > 0) {
          const analysis = this.analyzeVotePattern(categoryVotes, category);
          return {
            source: this.DATA_SOURCES.PROPUBLICA,
            confidence: 0.85,
            position: analysis.position,
            details: analysis.summary,
            dateRecorded: new Date(),
            url: `https://projects.propublica.org/represent/members/${candidate.propublicaId}`
          };
        }
      }
    } catch (error) {
      console.error('ProPublica API error:', error);
    }
    return null;
  }

  private async getFundingBasedPosition(candidate: any, category: string): Promise<PositionSource | null> {
    if (!process.env.OPENSECRETS_API_KEY || !candidate.fecId) return null;

    try {
      // Analyze campaign contributions to infer positions
      const fundingAnalysis = await this.analyzeCampaignFunding(candidate.fecId, category);
      if (fundingAnalysis) {
        return {
          source: this.DATA_SOURCES.OPENSECRETS,
          confidence: 0.6, // Lower confidence for inferred positions
          position: fundingAnalysis.inferredPosition,
          details: fundingAnalysis.analysis,
          dateRecorded: new Date(),
          url: `https://www.opensecrets.org/members-of-congress/summary?cid=${candidate.fecId}`
        };
      }
    } catch (error) {
      console.error('OpenSecrets API error:', error);
    }
    return null;
  }

  private async getOfficialWebsitePosition(candidate: any, category: string): Promise<PositionSource | null> {
    if (!candidate.officialWebsite) return null;

    try {
      // Scrape official website for position statements
      const websiteAnalysis = await this.scrapeOfficialWebsite(candidate.officialWebsite, category);
      if (websiteAnalysis) {
        return {
          source: this.DATA_SOURCES.OFFICIAL_WEBSITE,
          confidence: 0.8,
          position: websiteAnalysis.position,
          details: websiteAnalysis.context,
          dateRecorded: new Date(),
          url: websiteAnalysis.sourceUrl
        };
      }
    } catch (error) {
      console.error('Website scraping error:', error);
    }
    return null;
  }

  private async getBallotpediaPosition(candidate: any, category: string): Promise<PositionSource | null> {
    try {
      const ballotpediaData = await this.fetchBallotpediaData(candidate.name, candidate.state);
      if (ballotpediaData && ballotpediaData[category]) {
        return {
          source: this.DATA_SOURCES.BALLOTPEDIA,
          confidence: 0.75,
          position: ballotpediaData[category].position,
          details: ballotpediaData[category].details,
          dateRecorded: new Date(),
          url: ballotpediaData.profileUrl
        };
      }
    } catch (error) {
      console.error('Ballotpedia API error:', error);
    }
    return null;
  }

  private async getNewsAnalysisPosition(candidate: any, category: string): Promise<PositionSource | null> {
    try {
      // Use news APIs to gather position information
      const newsAnalysis = await this.analyzeNewsReports(candidate.name, category);
      if (newsAnalysis && newsAnalysis.confidence > 0.5) {
        return {
          source: this.DATA_SOURCES.NEWS_ANALYSIS,
          confidence: newsAnalysis.confidence,
          position: newsAnalysis.position,
          details: newsAnalysis.summary,
          dateRecorded: new Date(),
          url: newsAnalysis.primarySource
        };
      }
    } catch (error) {
      console.error('News analysis error:', error);
    }
    return null;
  }

  private synthesizePositions(sources: PositionSource[]): string {
    if (sources.length === 0) return 'Position not available from current sources';

    // Prioritize by confidence and source reliability
    const sortedSources = sources.sort((a, b) => b.confidence - a.confidence);
    
    // If we have a high-confidence candidate portal position, use it primarily
    const candidatePortal = sources.find(s => s.source === this.DATA_SOURCES.CANDIDATE_PORTAL);
    if (candidatePortal && candidatePortal.confidence > 0.9) {
      return candidatePortal.position;
    }

    // Otherwise, synthesize based on voting record and multiple sources
    const votingRecord = sources.find(s => s.source === this.DATA_SOURCES.VOTING_RECORD);
    if (votingRecord && votingRecord.confidence > 0.8) {
      return votingRecord.position;
    }

    // Fallback to highest confidence source
    return sortedSources[0].position;
  }

  private calculateConfidence(sources: PositionSource[]): number {
    if (sources.length === 0) return 0;

    // Weight confidence based on number of agreeing sources
    const avgConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
    const sourceCountBonus = Math.min(sources.length * 0.1, 0.3); // Max 30% bonus
    
    return Math.min(avgConfidence + sourceCountBonus, 1.0);
  }

  // Helper methods for specific analyses
  private async analyzeVotingPattern(candidate: any, category: string): Promise<any> {
    // Implementation for analyzing voting patterns
    return null; // Placeholder for complex voting analysis
  }

  private filterVotesByCategory(votes: any[], category: string): any[] {
    // Implementation for filtering votes by policy category
    return []; // Placeholder
  }

  private analyzeVotePattern(votes: any[], category: string): any {
    // Implementation for analyzing vote patterns
    return { position: '', summary: '' }; // Placeholder
  }

  private async analyzeCampaignFunding(fecId: string, category: string): Promise<any> {
    // Implementation for funding analysis
    return null; // Placeholder
  }

  private async scrapeOfficialWebsite(url: string, category: string): Promise<any> {
    // Implementation for website scraping
    return null; // Placeholder
  }

  private async fetchBallotpediaData(name: string, state: string): Promise<any> {
    // Implementation for Ballotpedia API
    return null; // Placeholder
  }

  private async analyzeNewsReports(name: string, category: string): Promise<any> {
    // Implementation for news analysis
    return null; // Placeholder
  }

  async updateCandidatePositions(candidateId: number): Promise<void> {
    const positions = await this.aggregatePositionsForCandidate(candidateId);
    
    for (const categoryData of positions) {
      // Update or insert aggregated positions
      await this.saveAggregatedPosition(categoryData);
    }
  }

  private async saveAggregatedPosition(positionData: CandidatePosition): Promise<void> {
    // Save the aggregated position data to the database
    // This will be used by the frontend for display
  }
}

export const positionAggregatorService = new PositionAggregatorService();