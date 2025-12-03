import { db } from "./db";
import { 
  candidates, 
  candidateSubscriptions, 
  candidatePositions, 
  candidateQA, 
  campaignContent, 
  voterInteractions,
  realTimePolling 
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte, count, avg } from "drizzle-orm";
import type { 
  InsertCandidatePosition, 
  InsertCandidateQA, 
  InsertCampaignContent,
  InsertVoterInteraction,
  InsertRealTimePolling
} from "@shared/schema";
import { civicAggregatorService } from "./civic-aggregator-service";
import { voteSmartService } from "./services/votesmart-service";

export class CandidateManagementService {
  
  // Candidate Profile Management with VoteSmart enrichment
  async getCandidateProfile(candidateId: number, includeVoteSmartData = true) {
    const [profile] = await db
      .select({
        candidate: candidates,
        subscription: candidateSubscriptions
      })
      .from(candidates)
      .leftJoin(candidateSubscriptions, eq(candidates.id, candidateSubscriptions.candidateId))
      .where(eq(candidates.id, candidateId));

    if (!profile) {
      throw new Error('Candidate not found');
    }

    // Base profile response
    const baseProfile = {
      ...profile,
      enriched_data: {
        has_votesmart_data: false,
        biography: null,
        photo_url: profile.candidate.profileImageUrl,
        professional_background: null,
        education: null,
        positions: [],
        voting_record: [],
        interest_group_ratings: [],
        data_issues: [],
        last_updated: new Date().toISOString()
      }
    };

    // If VoteSmart enrichment is requested and available, add it
    if (includeVoteSmartData) {
      try {
        const searchId = profile.candidate.votesmart_id || profile.candidate.name;
        const comprehensiveData = await civicAggregatorService.getComprehensiveCandidateData([searchId], 'profile');
        
        if (comprehensiveData && comprehensiveData.length > 0) {
          const enrichedData = comprehensiveData[0];
          
          if (enrichedData.voteSmartData) {
            const vsData = enrichedData.voteSmartData;
            
            baseProfile.enriched_data = {
              has_votesmart_data: true,
              biography: vsData.bio || vsData.detailedBio || null,
              photo_url: vsData.photoUrl || profile.candidate.profileImageUrl,
              professional_background: vsData.bio?.profession || vsData.detailedBio?.profession || null,
              education: vsData.bio?.education || vsData.detailedBio?.education || null,
              positions: vsData.positions || [],
              voting_record: vsData.votingRecord || [],
              interest_group_ratings: vsData.ratings || [],
              data_issues: vsData.issues || [],
              last_updated: vsData.lastUpdated || new Date().toISOString()
            };
          }
        } else {
          // Add helpful messaging when data is not available
          if (!voteSmartService) {
            baseProfile.enriched_data.data_issues = [
              'VoteSmart API key required for comprehensive candidate data - configure VOTESMART_API_KEY to unlock detailed biographies, positions, and voting records'
            ];
          } else {
            baseProfile.enriched_data.data_issues = [
              'VoteSmart data not yet available for this candidate - comprehensive information will be added as it becomes available'
            ];
          }
        }
        
      } catch (enrichmentError) {
        console.warn(`Failed to enrich candidate profile ${candidateId}:`, enrichmentError);
        
        baseProfile.enriched_data.data_issues = [
          `Data enrichment temporarily unavailable: ${enrichmentError instanceof Error ? enrichmentError.message : 'Unknown error'}`
        ];
      }
    }

    return baseProfile;
  }

  // Bulk enrichment method for multiple candidates
  async getEnrichedCandidates(candidateIds: number[], includeVoteSmartData = true) {
    try {
      const profiles = await Promise.allSettled(
        candidateIds.map(id => this.getCandidateProfile(id, includeVoteSmartData))
      );
      
      return profiles
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
        
    } catch (error) {
      console.error('Error getting enriched candidates:', error);
      return [];
    }
  }

  // Get candidate summary with key VoteSmart data points
  async getCandidateSummary(candidateId: number) {
    try {
      const profile = await this.getCandidateProfile(candidateId, true);
      
      return {
        id: profile.candidate.id,
        name: profile.candidate.name,
        party: profile.candidate.party,
        office: profile.candidate.office,
        photo_url: profile.enriched_data.photo_url,
        has_biography: !!profile.enriched_data.biography,
        has_positions: profile.enriched_data.positions.length > 0,
        has_voting_record: profile.enriched_data.voting_record.length > 0,
        has_ratings: profile.enriched_data.interest_group_ratings.length > 0,
        data_completeness_score: this.calculateDataCompletenessScore(profile.enriched_data),
        data_issues: profile.enriched_data.data_issues,
        last_updated: profile.enriched_data.last_updated
      };
      
    } catch (error) {
      console.error(`Error getting candidate summary for ${candidateId}:`, error);
      return null;
    }
  }

  private calculateDataCompletenessScore(enrichedData: any): number {
    let score = 0;
    const maxScore = 5;
    
    if (enrichedData.biography) score += 1;
    if (enrichedData.photo_url) score += 1;  
    if (enrichedData.positions.length > 0) score += 1;
    if (enrichedData.voting_record.length > 0) score += 1;
    if (enrichedData.interest_group_ratings.length > 0) score += 1;
    
    return (score / maxScore) * 100; // Return as percentage
  }

  async updateCandidateProfile(candidateId: number, updates: Partial<typeof candidates.$inferInsert>) {
    const [updated] = await db
      .update(candidates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(candidates.id, candidateId))
      .returning();

    return updated;
  }

  // Position Management
  async createPosition(candidateId: number, position: InsertCandidatePosition) {
    const [created] = await db
      .insert(candidatePositions)
      .values({ ...position, candidateId })
      .returning();

    return created;
  }

  async updatePosition(candidateId: number, positionId: number, updates: Partial<InsertCandidatePosition>) {
    const [updated] = await db
      .update(candidatePositions)
      .set({ ...updates, lastUpdated: new Date() })
      .where(and(
        eq(candidatePositions.id, positionId),
        eq(candidatePositions.candidateId, candidateId)
      ))
      .returning();

    return updated;
  }

  async getPositions(candidateId: number, category?: string) {
    const conditions = [eq(candidatePositions.candidateId, candidateId)];
    
    if (category) {
      conditions.push(eq(candidatePositions.category, category));
    }

    return await db
      .select()
      .from(candidatePositions)
      .where(and(...conditions))
      .orderBy(desc(candidatePositions.lastUpdated));
  }

  async deletePosition(candidateId: number, positionId: number) {
    const [deleted] = await db
      .delete(candidatePositions)
      .where(and(
        eq(candidatePositions.id, positionId),
        eq(candidatePositions.candidateId, candidateId)
      ))
      .returning();

    return deleted;
  }

  // Q&A Management
  async createQA(candidateId: number, qa: InsertCandidateQA) {
    const [created] = await db
      .insert(candidateQA)
      .values({ ...qa, candidateId })
      .returning();

    return created;
  }

  async updateQA(candidateId: number, qaId: number, updates: Partial<InsertCandidateQA>) {
    const [updated] = await db
      .update(candidateQA)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(candidateQA.id, qaId),
        eq(candidateQA.candidateId, candidateId)
      ))
      .returning();

    return updated;
  }

  async getQAs(candidateId: number, filters?: { category?: string; isPublic?: boolean; isPriority?: boolean }) {
    const conditions = [eq(candidateQA.candidateId, candidateId)];
    
    if (filters?.category) {
      conditions.push(eq(candidateQA.category, filters.category));
    }
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(candidateQA.isPublic, filters.isPublic));
    }
    if (filters?.isPriority !== undefined) {
      conditions.push(eq(candidateQA.isPriority, filters.isPriority));
    }

    return await db
      .select()
      .from(candidateQA)
      .where(and(...conditions))
      .orderBy(desc(candidateQA.updatedAt));
  }

  async deleteQA(candidateId: number, qaId: number) {
    const [deleted] = await db
      .delete(candidateQA)
      .where(and(
        eq(candidateQA.id, qaId),
        eq(candidateQA.candidateId, candidateId)
      ))
      .returning();

    return deleted;
  }

  // Campaign Content Management
  async createContent(candidateId: number, content: InsertCampaignContent) {
    const [created] = await db
      .insert(campaignContent)
      .values({ ...content, candidateId })
      .returning();

    return created;
  }

  async updateContent(candidateId: number, contentId: number, updates: Partial<InsertCampaignContent>) {
    const [updated] = await db
      .update(campaignContent)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(campaignContent.id, contentId),
        eq(campaignContent.candidateId, candidateId)
      ))
      .returning();

    return updated;
  }

  async getContent(candidateId: number, filters?: { contentType?: string; isPublished?: boolean }) {
    const conditions = [eq(campaignContent.candidateId, candidateId)];
    
    if (filters?.contentType) {
      conditions.push(eq(campaignContent.contentType, filters.contentType));
    }
    if (filters?.isPublished !== undefined) {
      conditions.push(eq(campaignContent.isPublished, filters.isPublished));
    }

    return await db
      .select()
      .from(campaignContent)
      .where(and(...conditions))
      .orderBy(desc(campaignContent.updatedAt));
  }

  async publishContent(candidateId: number, contentId: number) {
    const [published] = await db
      .update(campaignContent)
      .set({ 
        isPublished: true, 
        publishDate: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(campaignContent.id, contentId),
        eq(campaignContent.candidateId, candidateId)
      ))
      .returning();

    return published;
  }

  async deleteContent(candidateId: number, contentId: number) {
    const [deleted] = await db
      .delete(campaignContent)
      .where(and(
        eq(campaignContent.id, contentId),
        eq(campaignContent.candidateId, candidateId)
      ))
      .returning();

    return deleted;
  }

  // Analytics and Insights
  async getCandidateAnalytics(candidateId: number, timeframe: '24h' | '7d' | '30d' | '90d' = '7d') {
    const timeframeDays = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const startDate = new Date(Date.now() - timeframeDays[timeframe] * 24 * 60 * 60 * 1000);

    // Get interaction metrics
    const interactions = await db
      .select({
        interactionType: voterInteractions.interactionType,
        count: count()
      })
      .from(voterInteractions)
      .where(and(
        eq(voterInteractions.candidateId, candidateId),
        gte(voterInteractions.createdAt, startDate)
      ))
      .groupBy(voterInteractions.interactionType);

    // Get content performance
    const contentMetrics = await db
      .select({
        contentType: campaignContent.contentType,
        totalViews: sql<number>`sum(${campaignContent.views})`,
        avgEngagement: avg(campaignContent.engagementScore),
        publishedCount: count()
      })
      .from(campaignContent)
      .where(and(
        eq(campaignContent.candidateId, candidateId),
        eq(campaignContent.isPublished, true),
        gte(campaignContent.createdAt, startDate)
      ))
      .groupBy(campaignContent.contentType);

    // Get Q&A performance
    const qaMetrics = await db
      .select({
        totalQuestions: count(),
        totalViews: sql<number>`sum(${candidateQA.views})`,
        totalUpvotes: sql<number>`sum(${candidateQA.upvotes})`,
        avgUpvotes: avg(candidateQA.upvotes)
      })
      .from(candidateQA)
      .where(and(
        eq(candidateQA.candidateId, candidateId),
        gte(candidateQA.createdAt, startDate)
      ));

    return {
      timeframe,
      interactions: interactions.reduce((acc, curr) => {
        acc[curr.interactionType] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      contentMetrics,
      qaMetrics: qaMetrics[0] || {
        totalQuestions: 0,
        totalViews: 0,
        totalUpvotes: 0,
        avgUpvotes: 0
      }
    };
  }

  // Real-time polling data
  async getPollingTrends(candidateId: number, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trends = await db
      .select()
      .from(realTimePolling)
      .where(and(
        eq(realTimePolling.candidateId, candidateId),
        gte(realTimePolling.pollDate, startDate)
      ))
      .orderBy(desc(realTimePolling.pollDate));

    return trends;
  }

  async createPollingData(candidateId: number, pollingData: InsertRealTimePolling) {
    const [created] = await db
      .insert(realTimePolling)
      .values({ ...pollingData, candidateId })
      .returning();

    return created;
  }

  // Engagement tracking
  async trackInteraction(interaction: InsertVoterInteraction) {
    const [tracked] = await db
      .insert(voterInteractions)
      .values(interaction)
      .returning();

    // Update content views if applicable
    if (interaction.contentId && interaction.interactionType === 'view') {
      await db
        .update(campaignContent)
        .set({ 
          views: sql`${campaignContent.views} + 1`,
          updatedAt: new Date()
        })
        .where(eq(campaignContent.id, interaction.contentId));
    }

    return tracked;
  }

  // Subscription management
  async getSubscriptionStatus(candidateId: number) {
    const [subscription] = await db
      .select()
      .from(candidateSubscriptions)
      .where(and(
        eq(candidateSubscriptions.candidateId, candidateId),
        eq(candidateSubscriptions.isActive, true)
      ))
      .orderBy(desc(candidateSubscriptions.createdAt));

    return subscription;
  }

  // Dashboard summary
  async getDashboardSummary(candidateId: number) {
    const [profile] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId));

    const analytics = await this.getCandidateAnalytics(candidateId, '7d');
    const subscription = await this.getSubscriptionStatus(candidateId);
    const recentPolling = await this.getPollingTrends(candidateId, 7);
    
    // Get latest Q&A metrics
    const [qaStats] = await db
      .select({
        totalQAs: count(),
        publicQAs: sql<number>`sum(case when ${candidateQA.isPublic} then 1 else 0 end)`,
        priorityQAs: sql<number>`sum(case when ${candidateQA.isPriority} then 1 else 0 end)`
      })
      .from(candidateQA)
      .where(eq(candidateQA.candidateId, candidateId));

    // Get position coverage
    const positionCategories = await db
      .select({
        category: candidatePositions.category,
        count: count()
      })
      .from(candidatePositions)
      .where(eq(candidatePositions.candidateId, candidateId))
      .groupBy(candidatePositions.category);

    return {
      profile,
      subscription,
      analytics,
      qaStats,
      positionCategories,
      recentPolling: recentPolling.slice(0, 5), // Last 5 polling entries
      lastUpdated: new Date()
    };
  }

  // Search and discovery helpers
  async searchContent(candidateId: number, query: string, contentType?: string) {
    const conditions = [
      eq(campaignContent.candidateId, candidateId),
      sql`(${campaignContent.title} ILIKE ${'%' + query + '%'} OR ${campaignContent.content} ILIKE ${'%' + query + '%'})`
    ];

    if (contentType) {
      conditions.push(eq(campaignContent.contentType, contentType));
    }

    return await db
      .select()
      .from(campaignContent)
      .where(and(...conditions))
      .orderBy(desc(campaignContent.updatedAt));
  }

  async searchQAs(candidateId: number, query: string) {
    return await db
      .select()
      .from(candidateQA)
      .where(and(
        eq(candidateQA.candidateId, candidateId),
        sql`(${candidateQA.question} ILIKE ${'%' + query + '%'} OR ${candidateQA.answer} ILIKE ${'%' + query + '%'})`
      ))
      .orderBy(desc(candidateQA.updatedAt));
  }
}

export const candidateManagementService = new CandidateManagementService();