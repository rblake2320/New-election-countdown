import { db } from './db';
import { candidates, candidatePositions, congressMembers } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface PositionData {
  category: string;
  position: string;
  confidence: number;
  sources: Array<{
    type: string;
    description: string;
    confidence: number;
    url?: string;
    date: Date;
  }>;
}

export class CandidatePositionAPI {
  private readonly POLICY_CATEGORIES = [
    'Infrastructure',
    'Healthcare', 
    'Education',
    'Economy',
    'Environment',
    'Taxes',
    'Immigration',
    'Criminal Justice',
    'Social Issues',
    'Foreign Policy'
  ];

  async getPositionsForCandidate(candidateId: number): Promise<PositionData[]> {
    const candidate = await this.getCandidateWithCongressData(candidateId);
    if (!candidate) {
      return [];
    }

    const positions: PositionData[] = [];

    for (const category of this.POLICY_CATEGORIES) {
      const positionData = await this.analyzePositionForCategory(candidate, category);
      if (positionData) {
        positions.push(positionData);
      }
    }

    return positions;
  }

  private async getCandidateWithCongressData(candidateId: number) {
    try {
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

  private async analyzePositionForCategory(candidate: any, category: string): Promise<PositionData | null> {
    const sources = [];
    let finalPosition = '';
    let confidence = 0;

    // 1. Check candidate portal uploads (highest priority)
    const portalPosition = await this.getCandidatePortalPosition(candidate.candidate.id, category);
    if (portalPosition) {
      sources.push(portalPosition);
      finalPosition = portalPosition.description;
      confidence = Math.max(confidence, portalPosition.confidence);
    }

    // 2. Analyze congressional membership and general positions
    if (candidate.congressMember) {
      const congressionalPosition = await this.getCongressionalPosition(candidate, category);
      if (congressionalPosition) {
        sources.push(congressionalPosition);
        if (!portalPosition) {
          finalPosition = congressionalPosition.description;
        }
        confidence = Math.max(confidence, congressionalPosition.confidence);
      }
    }

    // 3. Get party-based policy positions
    const partyPosition = await this.getPartyBasedPosition(candidate.candidate, category);
    if (partyPosition) {
      sources.push(partyPosition);
      if (!finalPosition) {
        finalPosition = partyPosition.description;
      }
      confidence = Math.max(confidence, partyPosition.confidence);
    }

    // 4. Official website and statements
    const officialPosition = await this.getOfficialWebsitePosition(candidate.candidate, category);
    if (officialPosition) {
      sources.push(officialPosition);
      if (!finalPosition) {
        finalPosition = officialPosition.description;
      }
      confidence = Math.max(confidence, officialPosition.confidence);
    }

    if (sources.length === 0) {
      return null;
    }

    return {
      category,
      position: finalPosition || `Position analysis available from ${sources.length} source${sources.length > 1 ? 's' : ''}`,
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
          type: 'Candidate Portal',
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

  private async getCongressionalPosition(candidate: any, category: string) {
    const member = candidate.congressMember;
    if (!member) return null;

    // Analyze based on committee memberships and leadership roles
    const committeeFocus = this.analyzeCommitteeAlignment(member, category);
    if (committeeFocus) {
      return {
        type: 'Congressional Service',
        description: committeeFocus.description,
        confidence: committeeFocus.confidence,
        url: `https://www.congress.gov/member/${member.bioguideId}`,
        date: new Date()
      };
    }

    // General congressional experience analysis
    const experience = this.analyzeCongressionalExperience(member, category);
    if (experience) {
      return {
        type: 'Congressional Experience',
        description: experience.description,
        confidence: experience.confidence,
        url: `https://www.congress.gov/member/${member.bioguideId}`,
        date: new Date()
      };
    }

    return null;
  }

  private analyzeCommitteeAlignment(member: any, category: string) {
    const categoryCommitteeMap: Record<string, string[]> = {
      'Infrastructure': ['Transportation', 'Public Works', 'Commerce'],
      'Healthcare': ['Health', 'Ways and Means', 'Energy'],
      'Education': ['Education', 'Labor', 'Workforce'],
      'Economy': ['Financial Services', 'Ways and Means', 'Small Business'],
      'Environment': ['Natural Resources', 'Environment', 'Energy'],
      'Taxes': ['Ways and Means', 'Budget', 'Finance'],
      'Immigration': ['Judiciary', 'Homeland Security', 'Foreign Affairs'],
      'Criminal Justice': ['Judiciary', 'Oversight', 'Homeland Security'],
      'Social Issues': ['Judiciary', 'Oversight', 'Education'],
      'Foreign Policy': ['Foreign Affairs', 'Armed Services', 'Intelligence']
    };

    const relevantCommittees = categoryCommitteeMap[category] || [];
    const memberCommittees = member.committees || [];

    for (const committee of memberCommittees) {
      for (const relevantCommittee of relevantCommittees) {
        if (committee.toLowerCase().includes(relevantCommittee.toLowerCase())) {
          return {
            description: `Serves on ${committee} committee, demonstrating focus on ${category.toLowerCase()} policy`,
            confidence: 0.8
          };
        }
      }
    }

    return null;
  }

  private analyzeCongressionalExperience(member: any, category: string) {
    const chamber = member.chamber;
    const yearsInCongress = member.yearsInOffice || 0;

    if (yearsInCongress > 10) {
      return {
        description: `Senior ${chamber} member with extensive legislative experience in ${category.toLowerCase()} matters`,
        confidence: 0.7
      };
    } else if (yearsInCongress > 4) {
      return {
        description: `Experienced ${chamber} member with growing expertise in ${category.toLowerCase()} policy`,
        confidence: 0.6
      };
    } else if (yearsInCongress > 0) {
      return {
        description: `${chamber} member developing positions on ${category.toLowerCase()} issues`,
        confidence: 0.5
      };
    }

    return null;
  }

  private async getPartyBasedPosition(candidate: any, category: string) {
    const party = candidate.party;
    const partyPositions = this.getTypicalPartyPositions(party, category);
    
    if (partyPositions) {
      return {
        type: 'Party Platform',
        description: partyPositions.description,
        confidence: partyPositions.confidence,
        date: new Date()
      };
    }

    return null;
  }

  private getTypicalPartyPositions(party: string, category: string) {
    const democraticPositions: Record<string, string> = {
      'Infrastructure': 'Generally supports increased federal investment in infrastructure including broadband, transportation, and green energy projects',
      'Healthcare': 'Supports expanding healthcare access, protecting ACA, and allowing Medicare to negotiate prescription drug prices',
      'Education': 'Advocates for increased education funding, student loan relief, and making college more affordable',
      'Economy': 'Supports progressive taxation, minimum wage increases, and worker protection measures',
      'Environment': 'Strong supporter of climate action, renewable energy transition, and environmental protection regulations',
      'Taxes': 'Supports progressive tax system with higher taxes on wealthy individuals and corporations'
    };

    const republicanPositions: Record<string, string> = {
      'Infrastructure': 'Supports infrastructure investment through public-private partnerships and reduced regulatory barriers',
      'Healthcare': 'Advocates for market-based healthcare solutions, price transparency, and reducing healthcare costs',
      'Education': 'Supports school choice, local control of education, and reducing federal education bureaucracy',
      'Economy': 'Promotes free market policies, tax cuts, deregulation, and business-friendly economic measures',
      'Environment': 'Supports balanced approach to energy including domestic oil/gas production alongside emerging technologies',
      'Taxes': 'Advocates for lower taxes, simplified tax code, and pro-business tax policies'
    };

    if (party === 'D' || party === 'Democratic') {
      return democraticPositions[category] ? {
        description: democraticPositions[category],
        confidence: 0.6
      } : null;
    } else if (party === 'R' || party === 'Republican') {
      return republicanPositions[category] ? {
        description: republicanPositions[category],
        confidence: 0.6
      } : null;
    }

    return null;
  }

  private async getOfficialWebsitePosition(candidate: any, category: string) {
    if (candidate.website) {
      return {
        type: 'Official Website',
        description: `Visit candidate's official website for detailed ${category.toLowerCase()} policy positions`,
        confidence: 0.7,
        url: candidate.website,
        date: new Date()
      };
    }
    return null;
  }
}

export const candidatePositionAPI = new CandidatePositionAPI();