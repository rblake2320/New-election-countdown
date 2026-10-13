import { db } from './db';
import { candidates, candidatePositions, congressMembers } from '@shared/schema';
import { eq, and, sql, like, desc } from 'drizzle-orm';
import fetch from 'node-fetch';

interface EnhancedPosition {
  category: string;
  position: string;
  confidence: number;
  sources: Array<{
    type: 'voting_record' | 'official_statement' | 'candidate_portal' | 'news_analysis' | 'legislative_sponsorship';
    description: string;
    confidence: number;
    url?: string;
    date: Date;
  }>;
  votingPattern?: {
    supportVotes: number;
    totalVotes: number;
    percentage: number;
    recentVotes: Array<{
      bill: string;
      position: string;
      date: Date;
      description: string;
    }>;
  };
}

export class EnhancedPositionService {
  private readonly POLICY_KEYWORDS = {
    'Infrastructure': ['infrastructure', 'transportation', 'broadband', 'roads', 'bridges', 'airports', 'ports', 'transit'],
    'Healthcare': ['healthcare', 'health care', 'medicaid', 'medicare', 'insurance', 'aca', 'affordable care', 'prescription', 'drug prices'],
    'Education': ['education', 'student', 'school', 'teacher', 'university', 'college', 'scholarship', 'student loans'],
    'Economy': ['economy', 'jobs', 'employment', 'unemployment', 'minimum wage', 'labor', 'business', 'trade'],
    'Environment': ['environment', 'climate', 'energy', 'renewable', 'carbon', 'pollution', 'clean air', 'green'],
    'Taxes': ['tax', 'taxes', 'taxation', 'revenue', 'budget', 'deficit', 'spending', 'fiscal'],
    'Immigration': ['immigration', 'border', 'visa', 'citizenship', 'refugee', 'asylum', 'deportation'],
    'Criminal Justice': ['criminal', 'justice', 'police', 'prison', 'crime', 'law enforcement', 'reform'],
    'Social Issues': ['abortion', 'marriage', 'civil rights', 'voting rights', 'discrimination', 'equality'],
    'Foreign Policy': ['foreign', 'defense', 'military', 'war', 'peace', 'diplomacy', 'security', 'nato'],
    'Technology': ['technology', 'internet', 'privacy', 'cybersecurity', 'artificial intelligence', 'data'],
    'Agriculture': ['agriculture', 'farming', 'food', 'rural', 'crop', 'livestock', 'farm bill']
  };

  async getEnhancedPositions(candidateId: number): Promise<EnhancedPosition[]> {
    const candidate = await this.getCandidateWithCongressData(candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const positions: EnhancedPosition[] = [];

    for (const [category, keywords] of Object.entries(this.POLICY_KEYWORDS)) {
      const position = await this.analyzePositionForCategory(candidate, category, keywords);
      if (position) {
        positions.push(position);
      }
    }

    return positions;
  }

  private async getCandidateWithCongressData(candidateId: number) {
    try {
      // Get candidate with associated congress member data
      const result = await db
        .select({
          candidate: candidates,
          congressMember: congressMembers
        })
        .from(candidates)
        .leftJoin(congressMembers, eq(candidates.name, congressMembers.name))
        .where(eq(candidates.id, candidateId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error fetching candidate data:', error);
      return null;
    }
  }

  private async analyzePositionForCategory(candidate: any, category: string, keywords: string[]): Promise<EnhancedPosition | null> {
    const sources = [];
    let finalPosition = "Position not available from current sources";
    let confidence = 0;

    // 1. Check candidate portal first (verified candidate uploads)
    const portalPosition = await this.getCandidatePortalPosition(candidate.candidate.id, category);
    if (portalPosition) {
      sources.push(portalPosition);
      finalPosition = portalPosition.description;
      confidence = Math.max(confidence, portalPosition.confidence);
    }

    // 2. Analyze congressional voting record if member of Congress
    if (candidate.congressMember && candidate.congressMember.bioguideId) {
      const votingAnalysis = await this.analyzeVotingRecord(candidate.congressMember.bioguideId, category, keywords);
      if (votingAnalysis) {
        sources.push(...votingAnalysis.sources);
        
        if (!portalPosition || votingAnalysis.confidence > 0.8) {
          finalPosition = votingAnalysis.position;
        }
        confidence = Math.max(confidence, votingAnalysis.confidence);
      }
    }

    // 3. Check for legislative sponsorships and co-sponsorships
    if (candidate.congressMember) {
      const sponsorshipAnalysis = await this.analyzeSponsorships(candidate.congressMember.bioguideId, keywords);
      if (sponsorshipAnalysis) {
        sources.push(...sponsorshipAnalysis.sources);
        confidence = Math.max(confidence, sponsorshipAnalysis.confidence);
      }
    }

    // 4. Official statements and press releases
    const officialStatements = await this.getOfficialStatements(candidate.candidate, category);
    if (officialStatements) {
      sources.push(officialStatements);
      if (sources.length === 1) {
        finalPosition = officialStatements.description;
      }
      confidence = Math.max(confidence, officialStatements.confidence);
    }

    if (sources.length === 0) {
      return null;
    }

    return {
      category,
      position: finalPosition,
      confidence: Math.min(confidence, 1.0),
      sources: sources.sort((a, b) => b.confidence - a.confidence)
    };
  }

  private async getCandidatePortalPosition(candidateId: number, category: string) {
    try {
      const position = await db
        .select()
        .from(candidatePositions)
        .where(and(
          eq(candidatePositions.candidateId, candidateId),
          eq(candidatePositions.category, category),
          eq(candidatePositions.isVerified, true)
        ))
        .orderBy(desc(candidatePositions.lastUpdated))
        .limit(1);

      if (position.length > 0) {
        return {
          type: 'candidate_portal' as const,
          description: position[0].position,
          confidence: 0.95,
          url: position[0].sourceUrl || undefined,
          date: position[0].lastUpdated || position[0].createdAt || new Date()
        };
      }
    } catch (error) {
      console.error('Error fetching candidate portal position:', error);
    }
    return null;
  }

  private async analyzeVotingRecord(bioguideId: string, category: string, keywords: string[]) {
    try {
      // Build dynamic SQL query for keyword matching
      const keywordConditions = keywords.map(() => `LOWER(cb.title) LIKE ? OR LOWER(cb.summary) LIKE ?`).join(' OR ');
      const keywordParams = keywords.flatMap(k => [`%${k.toLowerCase()}%`, `%${k.toLowerCase()}%`]);

      const query = `
        SELECT cv.position, cb.title, cb.summary, cv.voteDate, cb.billType, cb.billNumber
        FROM congress_votes cv
        JOIN congress_bills cb ON cv.billId = cb.billId
        WHERE cv.bioguideId = ? 
        AND (${keywordConditions})
        ORDER BY cv.voteDate DESC
        LIMIT 20
      `;

      // For now, simulate voting analysis with congressional data
      const votes = [];

      if (votes.length === 0) {
        return null;
      }

      const supportVotes = votes.filter(v => v.position === 'Yes' || v.position === 'Yea').length;
      const opposeVotes = votes.filter(v => v.position === 'No' || v.position === 'Nay').length;
      const totalVotes = supportVotes + opposeVotes;
      
      if (totalVotes === 0) {
        return null;
      }

      const supportPercentage = supportVotes / totalVotes;
      
      let position = `Mixed voting record on ${category.toLowerCase()}`;
      let confidence = 0.6;

      if (supportPercentage >= 0.8) {
        position = `Strong supporter of ${category.toLowerCase()} initiatives`;
        confidence = 0.9;
      } else if (supportPercentage >= 0.6) {
        position = `Generally supports ${category.toLowerCase()} measures`;
        confidence = 0.8;
      } else if (supportPercentage <= 0.2) {
        position = `Generally opposes ${category.toLowerCase()} initiatives`;
        confidence = 0.85;
      } else if (supportPercentage <= 0.4) {
        position = `Often votes against ${category.toLowerCase()} measures`;
        confidence = 0.75;
      }

      const recentVotes = votes.slice(0, 5).map(v => ({
        bill: `${v.billType} ${v.billNumber}`,
        position: v.position,
        date: new Date(v.voteDate),
        description: v.title || v.summary || 'No description available'
      }));

      return {
        position,
        confidence,
        sources: [{
          type: 'voting_record' as const,
          description: `Based on ${totalVotes} votes: ${supportVotes} in favor, ${opposeVotes} opposed (${Math.round(supportPercentage * 100)}% support rate)`,
          confidence,
          url: `https://www.congress.gov/member/${bioguideId}`,
          date: new Date(votes[0].voteDate)
        }],
        votingPattern: {
          supportVotes,
          totalVotes,
          percentage: Math.round(supportPercentage * 100),
          recentVotes
        }
      };
    } catch (error) {
      console.error('Error analyzing voting record:', error);
      return null;
    }
  }

  private async analyzeSponsorships(bioguideId: string, keywords: string[]) {
    try {
      // Analyze bill sponsorships and co-sponsorships
      const keywordConditions = keywords.map(() => `LOWER(cb.title) LIKE ? OR LOWER(cb.summary) LIKE ?`).join(' OR ');
      const keywordParams = keywords.flatMap(k => [`%${k.toLowerCase()}%`, `%${k.toLowerCase()}%`]);

      const query = `
        SELECT cb.title, cb.summary, cb.introducedDate, cb.billType, cb.billNumber, 'sponsor' as role
        FROM congress_bills cb
        WHERE cb.sponsorBioguideId = ? 
        AND (${keywordConditions})
        ORDER BY cb.introducedDate DESC
        LIMIT 10
      `;

      // For now, return null until voting tables are properly set up
      const bills = [];

      if (bills.length === 0) {
        return null;
      }

      return {
        confidence: 0.8,
        sources: [{
          type: 'legislative_sponsorship' as const,
          description: `Sponsored ${bills.length} bills related to this category`,
          confidence: 0.8,
          url: `https://www.congress.gov/member/${bioguideId}?q=%7B%22sponsorship%22%3A%22sponsored%22%7D`,
          date: new Date(bills[0].introducedDate)
        }]
      };
    } catch (error) {
      console.error('Error analyzing sponsorships:', error);
      return null;
    }
  }

  private async getOfficialStatements(candidate: any, category: string) {
    // Check if candidate has official website or social media
    if (candidate.officialWebsite) {
      return {
        type: 'official_statement' as const,
        description: `Official position statements available on candidate website`,
        confidence: 0.75,
        url: candidate.officialWebsite,
        date: new Date()
      };
    }
    return null;
  }

  async enrichCandidateWithPositions(candidate: any): Promise<any> {
    try {
      const positions = await this.getEnhancedPositions(candidate.id);
      
      return {
        ...candidate,
        enhancedPositions: positions,
        positionSummary: {
          totalCategories: positions.length,
          averageConfidence: positions.length > 0 
            ? positions.reduce((sum, p) => sum + p.confidence, 0) / positions.length 
            : 0,
          dataQuality: this.assessDataQuality(positions),
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Error enriching candidate positions:', error);
      return {
        ...candidate,
        enhancedPositions: [],
        positionSummary: {
          totalCategories: 0,
          averageConfidence: 0,
          dataQuality: 'limited',
          lastUpdated: new Date()
        }
      };
    }
  }

  private assessDataQuality(positions: EnhancedPosition[]): string {
    if (positions.length === 0) return 'limited';
    
    const avgConfidence = positions.reduce((sum, p) => sum + p.confidence, 0) / positions.length;
    const hasVotingData = positions.some(p => p.sources.some(s => s.type === 'voting_record'));
    const hasCandidateData = positions.some(p => p.sources.some(s => s.type === 'candidate_portal'));
    
    if (avgConfidence > 0.8 && hasVotingData) return 'excellent';
    if (avgConfidence > 0.6 && (hasVotingData || hasCandidateData)) return 'good';
    if (avgConfidence > 0.4) return 'moderate';
    return 'limited';
  }
}

export const enhancedPositionService = new EnhancedPositionService();