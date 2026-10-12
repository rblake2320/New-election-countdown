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
  type InsertCampaignAccessLog,
  type InsertDataPurchase
} from '@shared/schema';
import { eq, and, gte, lte, count, avg, sum, sql } from 'drizzle-orm';
import crypto from 'crypto';

export type CampaignTier = 'basic' | 'pro' | 'enterprise' | 'custom';

// Subscription tier pricing (in cents). Single source of truth for advertised features.
export const SUBSCRIPTION_TIERS: Record<CampaignTier, { price: number; name: string; monthlyApiLimit: number; features: string[] }> = {
  basic: { price: 9900, name: 'Basic', monthlyApiLimit: 1000, features: ['Aggregated state data', 'Basic analytics', 'Weekly reports'] },
  pro: { price: 49900, name: 'Pro', monthlyApiLimit: 5000, features: ['District-level analytics', 'Demographic breakdowns', 'Trend analysis', 'Daily reports', 'Email alerts'] },
  enterprise: { price: 249900, name: 'Enterprise', monthlyApiLimit: 50000, features: ['Individual user insights (anonymized)', 'Real-time analytics', 'Custom reports', 'API access', 'Phone support'] },
  custom: { price: 0, name: 'Custom', monthlyApiLimit: 100000, features: ['Raw data exports (coming soon)', 'Custom integrations', 'Dedicated support', 'White-label options'] }
};

// ET-40 activation policy. No payment path exists today, so no paid tier may be activated
// on registration (the old route activated every tier for free). A tier marked 'free'
// activates immediately and issues a key; 'payment_required' persists the request inactive
// with no key. Owner/B decide which tiers (if any) are free at launch - change it HERE only.
export const TIER_ACTIVATION: Record<CampaignTier, 'free' | 'payment_required'> = {
  basic: 'payment_required',
  pro: 'payment_required',
  enterprise: 'payment_required',
  custom: 'payment_required',
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
          gte(pollingResults.conductedDate, startDate),
          lte(pollingResults.conductedDate, endDate),
          eq(pollingResults.isPublic, true) // Only public polling data
        ));

      return {
        electionId,
        dateRange,
        pollingResults: polling.map(poll => ({
          ...poll,
          // Remove any potentially identifying information
          pollingOrganization: poll.pollingOrganization ? 'Available' : 'Not disclosed'
        }))
      };
    } catch (error) {
      console.error('Error getting polling data:', error);
      throw error;
    }
  }

  // Data export functionality
  async purchaseDataExport(campaignId: number, datasetType: string, format: string = 'json'): Promise<any> {
    try {
      const campaign = await db
        .select()
        .from(campaignAccounts)
        .where(eq(campaignAccounts.id, campaignId));

      if (!campaign[0]) {
        throw new Error('Campaign not found');
      }

      // Calculate price based on dataset type and subscription tier
      const price = this.calculateExportPrice(datasetType, campaign[0].subscriptionTier ?? 'basic');

      const [purchase] = await db
        .insert(dataPurchases)
        .values({
          campaignId,
          datasetType,
          price,
          format
        })
        .returning();

      // Generate download link (would integrate with cloud storage)
      const downloadUrl = await this.generateDownloadUrl(purchase.id, datasetType, format);

      return {
        purchaseId: purchase.id,
        downloadUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        price: price / 100 // Convert to dollars
      };
    } catch (error) {
      console.error('Error purchasing data export:', error);
      throw error;
    }
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
          cost: 0 // Would calculate based on usage
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

    return {
      totalEngagement: clusters.reduce((sum, cluster) => sum + (cluster.engagementScore || 0), 0),
      averageInterest: clusters.length > 0 
        ? clusters.reduce((sum, cluster) => sum + (cluster.interestLevel || 0), 0) / clusters.length 
        : 0,
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
        name: segment.segmentName,
        size: segment.userCount,
        criteria: segment.criteria
      }))
    };
  }

  private async getRealTimeMetrics(electionId: number): Promise<any> {
    // Calculate real metrics based on actual user sessions and requests
    try {
      // Get session count from web server logs (simulated through actual API calls)
      const recentSessions = await db.execute(`
        SELECT COUNT(*) as active_sessions 
        FROM pg_stat_activity 
        WHERE state = 'active' AND query_start > NOW() - INTERVAL '5 minutes'
      `);

      // Get API call patterns for this election from audit logs
      const apiActivity = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(
          and(
            gte(auditLogs.timestamp, new Date(Date.now() - 5 * 60 * 1000)),
            eq(auditLogs.action, 'view_election')
          )
        );

      return {
        liveViewers: recentSessions.rows[0]?.active_sessions || 0,
        hourlyTrend: [], // Real trend data would come from analytics
        peakHours: [], // Real peak hour analysis
        recentActivity: apiActivity[0]?.count || 0
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return {
        liveViewers: 0,
        hourlyTrend: [],
        peakHours: [],
        recentActivity: 0
      };
    }
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

  private calculateExportPrice(datasetType: string, tier: string): number {
    const basePrices: Record<string, number> = {
      'basic_analytics': 2500, // $25
      'demographic_data': 5000, // $50
      'engagement_metrics': 7500, // $75
      'geographic_clusters': 10000, // $100
      'custom_export': 15000 // $150
    };

    const tierMultiplier: Record<string, number> = {
      'basic': 1.0,
      'pro': 0.8,
      'enterprise': 0.6,
      'custom': 0.4
    };

    const basePrice = basePrices[datasetType] || 5000;
    const multiplier = tierMultiplier[tier] || 1.0;

    return Math.floor(basePrice * multiplier);
  }

  private async generateDownloadUrl(purchaseId: number, datasetType: string, format: string): Promise<string> {
    // Would generate secure download URL with cloud storage
    return `https://downloads.electiontracker.com/${purchaseId}/${datasetType}.${format}?expires=${Date.now() + 86400000}`;
  }
}

export const campaignPortalService = new CampaignPortalService();