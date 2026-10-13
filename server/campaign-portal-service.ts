import { db } from './db';
import { 
  campaignAccounts, 
  campaignAccessLogs,
  dataPurchases,
  userSegments,
  geographicClusters,
  pollingResults,
  elections,
  voterInteractions,
  candidates
} from '@shared/schema';
import { eq, and, gte, lte, count, avg, sum, sql } from 'drizzle-orm';
import crypto from 'crypto';

export type CampaignTier = 'basic' | 'pro' | 'enterprise' | 'custom';

// Campaign portal tiers. OWNER DECISION 2026-10-13: access is by invitation / early access - no dollar
// pricing and no plan-purchase wording anywhere on the server. Features list only what the API serves today.
export const SUBSCRIPTION_TIERS: Record<CampaignTier, { name: string; monthlyApiLimit: number; features: string[] }> = {
  basic: { name: 'Basic', monthlyApiLimit: 1000, features: ['Aggregated state data', 'Basic analytics'] },
  pro: { name: 'Pro', monthlyApiLimit: 5000, features: ['Aggregated state data', 'Basic analytics', 'Demographic breakdowns'] },
  enterprise: { name: 'Enterprise', monthlyApiLimit: 50000, features: ['Aggregated state data', 'Basic analytics', 'Demographic breakdowns', 'API access'] },
  custom: { name: 'Custom', monthlyApiLimit: 100000, features: ['Aggregated state data', 'Basic analytics', 'Demographic breakdowns', 'API access', 'Raw data exports (coming soon)'] }
};

// ET-40 activation policy. There is no purchase path and the portal is invitation-only (owner, 2026-10-13):
// a tier marked 'free' activates immediately and issues a key; 'invitation_required' persists the request
// inactive with no key. Owner/B decide which tiers (if any) are free at launch - change it HERE only.
export const TIER_ACTIVATION: Record<CampaignTier, 'free' | 'invitation_required'> = {
  basic: 'invitation_required',
  pro: 'invitation_required',
  enterprise: 'invitation_required',
  custom: 'invitation_required',
};

export interface NewCampaignAccountInput {
  organizationName: string;
  contactEmail: string;
  electionId: number;
  subscriptionTier: CampaignTier;
  /** true = issue a key now; false = persisted as a pending request, no key */
  isActive: boolean;
}

export interface CreatedCampaignAccount {
  account: typeof campaignAccounts.$inferSelect;
  /** plaintext key, present only when the account was activated; shown once, never stored */
  apiKey: string | null;
}

/** Keys are stored as SHA-256 hex; the plaintext never reaches the database. */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey, 'utf8').digest('hex');
}

export function generateCampaignApiKey(): string {
  return 'camp_' + crypto.randomBytes(32).toString('hex');
}

export class CampaignPortalService {
  // Campaign account management
  async createCampaignAccount(data: NewCampaignAccountInput): Promise<CreatedCampaignAccount> {
    // A key is generated for every row (api_key is NOT NULL UNIQUE) but only returned when
    // the account is active; a pending account gets a fresh key when it is activated.
    const apiKey = generateCampaignApiKey();
    const [account] = await db
      .insert(campaignAccounts)
      .values({
        organizationName: data.organizationName,
        contactEmail: data.contactEmail,
        electionId: data.electionId,
        subscriptionTier: data.subscriptionTier,
        isActive: data.isActive,
        monthlyApiLimit: SUBSCRIPTION_TIERS[data.subscriptionTier].monthlyApiLimit,
        apiKey: hashApiKey(apiKey),
        keyLast4: data.isActive ? apiKey.slice(-4) : null,
      })
      .returning();
    return { account, apiKey: data.isActive ? apiKey : null };
  }

  async validateCampaignAccess(apiKey: string): Promise<typeof campaignAccounts.$inferSelect> {
    try {
      const [campaign] = await db
        .select()
        .from(campaignAccounts)
        .where(and(
          eq(campaignAccounts.apiKey, hashApiKey(apiKey)),
          eq(campaignAccounts.isActive, true)
        ));

      if (!campaign) {
        throw new Error('Invalid API key or inactive account');
      }

      // Check subscription status
      if (campaign.subscriptionEnd && campaign.subscriptionEnd < new Date()) {
        throw new Error('Subscription expired');
      }

      return campaign;
    } catch (error) {
      console.error('Error validating campaign access:', error);
      throw error;
    }
  }

  // Analytics access based on subscription tier
  async getElectionAnalytics(campaignId: number, electionId: number, tier: string): Promise<any> {
    try {
      await this.logAccess(campaignId, '/api/campaign/analytics', 'election_analytics');

      const baseAnalytics = {
        electionId,
        totalViews: await this.getTotalViews(electionId),
        engagementScore: await this.getEngagementScore(electionId),
        lastUpdated: new Date()
      };

      switch (tier) {
        case 'basic':
          return {
            ...baseAnalytics,
            stateLevel: await this.getStateLevelData(electionId)
          };

        case 'pro':
          return {
            ...baseAnalytics,
            stateLevel: await this.getStateLevelData(electionId),
            districtLevel: await this.getDistrictLevelData(electionId),
            demographics: await this.getDemographicBreakdown(electionId)
          };

        case 'enterprise':
        case 'custom':
          return {
            ...baseAnalytics,
            stateLevel: await this.getStateLevelData(electionId),
            districtLevel: await this.getDistrictLevelData(electionId),
            demographics: await this.getDemographicBreakdown(electionId),
            realTimeMetrics: await this.getRealTimeMetrics(electionId),
            anonymizedUserInsights: await this.getAnonymizedUserInsights(electionId)
          };

        default:
          throw new Error('Invalid subscription tier');
      }
    } catch (error) {
      console.error('Error getting election analytics:', error);
      throw error;
    }
  }

  // Geographic analytics
  async getGeographicAnalytics(campaignId: number, region: string, tier: string): Promise<any> {
    try {
      await this.logAccess(campaignId, '/api/campaign/demographics', 'geographic_analytics');

      if (tier === 'basic') {
        // Basic tier gets aggregated state data only
        return await this.getStateLevelGeographicData(region);
      }

      return await this.getDetailedGeographicData(region, tier);
    } catch (error) {
      console.error('Error getting geographic analytics:', error);
      throw error;
    }
  }

  // Polling data access
  async getPollingData(campaignId: number, electionId: number, dateRange: string): Promise<any> {
    try {
      await this.logAccess(campaignId, '/api/campaign/polling', 'polling_data');

      const { startDate, endDate } = this.parseDateRange(dateRange);

      const polling = await db
        .select()
        .from(pollingResults)
        .where(and(
          eq(pollingResults.electionId, electionId),
          gte(pollingResults.pollingDate, startDate),
          lte(pollingResults.pollingDate, endDate),
          eq(pollingResults.isAuthentic, true) // Only verified polling data
        ));

      return {
        electionId,
        dateRange,
        pollingResults: polling.map(poll => ({
          ...poll,
          // Remove any potentially identifying information
          pollster: poll.pollster ? 'Available' : 'Not disclosed'
        }))
      };
    } catch (error) {
      console.error('Error getting polling data:', error);
      throw error;
    }
  }

  // Data export functionality — ET-38: exports are not available yet. Refuses without writing a data_purchases
  // row or minting a download URL (the route answers 503 exports_unavailable before reaching here).
  async purchaseDataExport(campaignId: number, _datasetType: string, _format: string = 'json'): Promise<never> {
    const campaign = await db.select().from(campaignAccounts).where(eq(campaignAccounts.id, campaignId));
    if (!campaign[0]) throw new Error('Campaign not found');
    throw new Error('Data exports are not available yet');
  }

  // Private helper methods
  private async logAccess(campaignId: number, endpoint: string, datasetType: string): Promise<void> {
    try {
      await db
        .insert(campaignAccessLogs)
        .values({
          campaignId,
          endpointAccessed: endpoint,
          datasetType,
          cost: '0' // numeric column; access is not metered yet
        });
    } catch (error) {
      console.error('Error logging access:', error);
    }
  }

  private async getTotalViews(electionId: number): Promise<number> {
    // Aggregate real interaction counts; 0 until tracking accumulates data
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(voterInteractions)
        .where(eq(voterInteractions.electionId, electionId));
      return Number(result[0]?.count ?? 0);
    } catch {
      return 0;
    }
  }

  private async getEngagementScore(electionId: number): Promise<number> {
    // Engagement = distinct real interaction types, scaled 0-100.
    // Returns 0 until real interaction data accumulates.
    try {
      const result = await db
        .select({ count: sql<number>`count(distinct ${voterInteractions.interactionType})` })
        .from(voterInteractions)
        .where(eq(voterInteractions.electionId, electionId));
      return Math.min(100, Number(result[0]?.count ?? 0) * 20);
    } catch {
      return 0;
    }
  }

  private async getStateLevelData(electionId: number): Promise<any> {
    const clusters = await db
      .select()
      .from(geographicClusters)
      .where(eq(geographicClusters.electionId, electionId));

    const politicalLean: Record<string, number> = {};
    for (const cluster of clusters) {
      const lean = cluster.politicalLean ?? 'unknown';
      politicalLean[lean] = (politicalLean[lean] ?? 0) + 1;
    }
    return {
      clusters: clusters.length,
      totalVoterDensity: clusters.reduce((sum, cluster) => sum + Number(cluster.voterDensity ?? 0), 0),
      politicalLean,
      geographicSpread: clusters.length
    };
  }

  private async getDistrictLevelData(electionId: number): Promise<any> {
    // Would return district-specific data for pro+ tiers
    return {
      districtBreakdown: [],
      competitiveDistricts: [],
      targetAreas: []
    };
  }

  private async getDemographicBreakdown(electionId: number): Promise<any> {
    const segments = await db
      .select()
      .from(userSegments)
      .where(eq(userSegments.electionId, electionId));

    return {
      segments: segments.map(segment => ({
        ageGroup: segment.ageGroup,
        income: segment.income,
        education: segment.education,
        partyAffiliation: segment.partyAffiliation,
        voterHistory: segment.voterHistory,
        size: segment.count
      }))
    };
  }

  private async getRealTimeMetrics(_electionId: number): Promise<any> {
    // Not measured: there is no viewer/session telemetry in this deployment. Returning nulls is the honest
    // answer; the previous implementation reported database connection counts as 'live viewers'.
    return {
      measured: false,
      liveViewers: null,
      hourlyTrend: [],
      peakHours: [],
      recentActivity: null
    };
  }

  private async getAnonymizedUserInsights(electionId: number): Promise<any> {
    return {
      behaviorPatterns: [],
      engagementClusters: [],
      influenceNetwork: []
    };
  }

  private async getStateLevelGeographicData(region: string): Promise<any> {
    try {
      // Get real election data for the region
      const regionElections = await db
        .select({ count: count() })
        .from(elections)
        .where(eq(elections.state, region));

      // Get candidate data for the region  
      const regionCandidates = await db
        .select({ 
          count: count(),
          avgSupport: avg(candidates.pollingSupport)
        })
        .from(candidates)
        .innerJoin(elections, eq(candidates.electionId, elections.id))
        .where(eq(elections.state, region));

      // Get party breakdown from candidates in the region
      const partyBreakdown = await db
        .select({
          party: candidates.party,
          count: count()
        })
        .from(candidates)
        .innerJoin(elections, eq(candidates.electionId, elections.id))
        .where(eq(elections.state, region))
        .groupBy(candidates.party);

      const dominantParty = partyBreakdown.length > 0 
        ? partyBreakdown.reduce((prev, curr) => 
            (curr.count || 0) > (prev.count || 0) ? curr : prev
          ).party?.toLowerCase() || 'neutral'
        : 'neutral';

      return {
        region,
        aggregatedMetrics: {
          totalElections: regionElections[0]?.count || 0,
          totalCandidates: regionCandidates[0]?.count || 0,
          averageSupport: regionCandidates[0]?.avgSupport || 0,
          partyLean: dominantParty
        }
      };
    } catch (error) {
      console.error('Error getting geographic data:', error);
      return {
        region,
        aggregatedMetrics: {
          totalElections: 0,
          totalCandidates: 0,
          averageSupport: 0,
          partyLean: 'neutral'
        }
      };
    }
  }

  private async getDetailedGeographicData(region: string, tier: string): Promise<any> {
    const basic = await this.getStateLevelGeographicData(region);
    
    return {
      ...basic,
      zipCodeLevel: tier === 'enterprise' || tier === 'custom' ? [] : undefined,
      demographicBreakdown: [],
      competitorAnalysis: []
    };
  }

  private parseDateRange(dateRange: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

}

export const campaignPortalService = new CampaignPortalService();