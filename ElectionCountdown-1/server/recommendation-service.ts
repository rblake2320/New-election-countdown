import { 
  Election, 
  UserPreferences, 
  WatchlistItem, 
  ElectionRecommendation,
  RecommendationResponse 
} from '@shared/schema';

export interface RecommendationOptions {
  limit?: number;
  types?: ('location_based' | 'interest_based' | 'trending' | 'similar_users')[];
  includeExpired?: boolean;
  forceRefresh?: boolean;
}

export interface ScoredElection {
  election: Election;
  score: number;
  reasons: string[];
  type: string;
}

export class RecommendationService {
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
  }

  /**
   * Generate comprehensive personalized recommendations for a user
   */
  async generateRecommendations(
    userId: string, 
    options: RecommendationOptions = {}
  ): Promise<RecommendationResponse> {
    const { limit = 10, types, includeExpired = false, forceRefresh = false } = options;

    // Get user preferences and current watchlist
    const [userPreferences, currentWatchlist, allElections] = await Promise.all([
      this.storage.getUserPreferences(userId),
      this.storage.getUserWatchlist(userId),
      this.storage.getAllElections()
    ]);

    if (!userPreferences) {
      // Return basic recommendations for users without preferences
      return this.generateBasicRecommendations(allElections, limit, includeExpired);
    }

    // Filter out expired elections if not requested
    const availableElections = allElections.filter(election => {
      if (includeExpired) return true;
      return new Date(election.date) > new Date();
    });

    // Filter out already watched elections
    const watchedElectionIds = new Set(currentWatchlist.map(item => item.electionId));
    const candidateElections = availableElections.filter(
      election => !watchedElectionIds.has(election.id)
    );

    // Generate different types of recommendations
    const recommendationGenerators = {
      location_based: () => this.generateLocationBasedRecommendations(candidateElections, userPreferences),
      interest_based: () => this.generateInterestBasedRecommendations(candidateElections, userPreferences),
      trending: () => this.generateTrendingRecommendations(candidateElections, userPreferences),
      similar_users: () => this.generateSimilarUsersRecommendations(candidateElections, userPreferences, userId)
    };

    // Generate recommendations based on requested types
    const requestedTypes = types || ['location_based', 'interest_based', 'trending', 'similar_users'];
    let allRecommendations: ScoredElection[] = [];

    for (const type of requestedTypes) {
      if (recommendationGenerators[type]) {
        const typeRecommendations = await recommendationGenerators[type]();
        allRecommendations.push(...typeRecommendations);
      }
    }

    // Combine and deduplicate recommendations
    const uniqueRecommendations = this.deduplicateAndRank(allRecommendations, limit);

    // Format response
    const recommendations = uniqueRecommendations.map((scored, index) => ({
      id: Date.now() + index, // Temporary ID for tracking
      election: scored.election,
      score: scored.score,
      type: scored.type,
      reason: scored.reasons.join('; '),
      isPresented: false,
      isViewed: false,
      isClicked: false,
      isAddedToWatchlist: false,
      isDismissed: false,
    }));

    return {
      recommendations,
      totalCount: recommendations.length,
      cacheKey: this.generateCacheKey(userId, options),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate location-based recommendations using user's geographic preferences
   */
  private async generateLocationBasedRecommendations(
    elections: Election[], 
    userPreferences: UserPreferences
  ): Promise<ScoredElection[]> {
    const recommendations: ScoredElection[] = [];
    const { state, city, congressionalDistrict } = userPreferences.location || {};

    for (const election of elections) {
      let score = 0;
      const reasons: string[] = [];

      // Exact state match (highest priority)
      if (state && election.state === state) {
        score += 50;
        reasons.push(`Election in your state (${state})`);
      }

      // City/location match
      if (city && election.location.toLowerCase().includes(city.toLowerCase())) {
        score += 30;
        reasons.push(`Election in your city (${city})`);
      }

      // Congressional district match
      if (congressionalDistrict && election.offices?.some(office => 
        office.toLowerCase().includes('congress') && 
        election.location.includes(congressionalDistrict)
      )) {
        score += 40;
        reasons.push(`Election in your congressional district`);
      }

      // Federal elections are relevant to all users
      if (election.level === 'federal') {
        score += 20;
        reasons.push('Federal election relevant to all voters');
      }

      // Boost for upcoming elections
      const daysUntilElection = Math.floor(
        (new Date(election.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilElection <= 30 && daysUntilElection > 0) {
        score += 15;
        reasons.push('Election coming soon');
      }

      if (score > 0) {
        recommendations.push({
          election,
          score,
          reasons,
          type: 'location_based'
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate interest-based recommendations using user's political preferences
   */
  private async generateInterestBasedRecommendations(
    elections: Election[], 
    userPreferences: UserPreferences
  ): Promise<ScoredElection[]> {
    const recommendations: ScoredElection[] = [];
    const { 
      politicalInterests = [], 
      partyAffiliations = [], 
      issueInterests = [],
      electionTypes = []
    } = userPreferences.politics || {};

    for (const election of elections) {
      let score = 0;
      const reasons: string[] = [];

      // Match election level with user interests
      if (politicalInterests.includes('federal') && election.level === 'federal') {
        score += 25;
        reasons.push('Matches your interest in federal politics');
      }
      if (politicalInterests.includes('state') && election.level === 'state') {
        score += 25;
        reasons.push('Matches your interest in state politics');
      }
      if (politicalInterests.includes('local') && election.level === 'local') {
        score += 25;
        reasons.push('Matches your interest in local politics');
      }

      // Match election type preferences
      if (electionTypes.includes(election.type)) {
        score += 20;
        reasons.push(`Matches your preference for ${election.type} elections`);
      }

      // Match office types with interests
      if (election.offices) {
        const officeTypes = election.offices.join(' ').toLowerCase();
        
        // Check for specific office interests
        if (issueInterests.includes('education') && 
           (officeTypes.includes('school') || officeTypes.includes('education'))) {
          score += 15;
          reasons.push('Involves education positions you\'re interested in');
        }

        if (issueInterests.includes('healthcare') && 
           officeTypes.includes('health')) {
          score += 15;
          reasons.push('Involves health-related positions');
        }

        // Governor, Senate, House preferences
        if (politicalInterests.includes('executive') && 
           officeTypes.includes('governor')) {
          score += 20;
          reasons.push('Executive office election');
        }

        if (politicalInterests.includes('legislative') && 
           (officeTypes.includes('senate') || officeTypes.includes('house'))) {
          score += 20;
          reasons.push('Legislative office election');
        }
      }

      // Boost for high-profile elections
      if (election.title.toLowerCase().includes('governor') || 
          election.title.toLowerCase().includes('senate') ||
          election.title.toLowerCase().includes('president')) {
        score += 10;
        reasons.push('High-profile election');
      }

      if (score > 0) {
        recommendations.push({
          election,
          score,
          reasons,
          type: 'interest_based'
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate trending recommendations based on popular elections
   */
  private async generateTrendingRecommendations(
    elections: Election[], 
    userPreferences: UserPreferences
  ): Promise<ScoredElection[]> {
    const recommendations: ScoredElection[] = [];

    // Get engagement data for elections (simulated for now)
    const engagementData = await this.getElectionEngagementData(elections.map(e => e.id));

    for (const election of elections) {
      let score = 0;
      const reasons: string[] = [];
      const engagement = engagementData[election.id] || { views: 0, watchlistAdds: 0 };

      // High engagement score
      if (engagement.watchlistAdds > 50) {
        score += 30;
        reasons.push('Popular among users');
      } else if (engagement.watchlistAdds > 20) {
        score += 15;
        reasons.push('Growing interest among users');
      }

      // Recent high activity
      if (engagement.views > 1000) {
        score += 20;
        reasons.push('Trending this week');
      }

      // Competitive races (simulated detection)
      if (election.title.toLowerCase().includes('competitive') || 
          election.description?.toLowerCase().includes('close race')) {
        score += 25;
        reasons.push('Competitive race to watch');
      }

      // Time-sensitive boost for imminent elections
      const daysUntilElection = Math.floor(
        (new Date(election.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilElection <= 7 && daysUntilElection > 0) {
        score += 20;
        reasons.push('Election happening very soon');
      }

      if (score > 0) {
        recommendations.push({
          election,
          score,
          reasons,
          type: 'trending'
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate recommendations based on similar users' preferences
   */
  private async generateSimilarUsersRecommendations(
    elections: Election[], 
    userPreferences: UserPreferences,
    userId: string
  ): Promise<ScoredElection[]> {
    const recommendations: ScoredElection[] = [];

    // Find similar users based on preferences (simplified algorithm)
    const similarUsers = await this.findSimilarUsers(userId, userPreferences);
    
    if (similarUsers.length === 0) {
      return recommendations;
    }

    // Get watchlists of similar users
    const similarUsersWatchlists = await Promise.all(
      similarUsers.map(user => this.storage.getUserWatchlist(user.id))
    );

    // Count election popularity among similar users
    const electionPopularity: { [electionId: number]: number } = {};
    for (const watchlist of similarUsersWatchlists) {
      for (const item of watchlist) {
        electionPopularity[item.electionId] = (electionPopularity[item.electionId] || 0) + 1;
      }
    }

    // Generate recommendations based on similar users' choices
    for (const election of elections) {
      const popularity = electionPopularity[election.id] || 0;
      
      if (popularity > 0) {
        let score = popularity * 10; // Base score from similar user interest
        const reasons: string[] = [];

        if (popularity >= 3) {
          reasons.push('Popular among users with similar interests');
          score += 15;
        } else if (popularity >= 2) {
          reasons.push('Watched by users with similar preferences');
          score += 10;
        } else {
          reasons.push('Recommended by similar users');
          score += 5;
        }

        recommendations.push({
          election,
          score,
          reasons,
          type: 'similar_users'
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Deduplicate and rank final recommendations
   */
  private deduplicateAndRank(recommendations: ScoredElection[], limit: number): ScoredElection[] {
    // Group by election ID and combine scores
    const electionMap = new Map<number, ScoredElection>();

    for (const rec of recommendations) {
      const existing = electionMap.get(rec.election.id);
      if (existing) {
        // Combine scores and reasons
        existing.score += rec.score * 0.5; // Diminishing returns for multiple recommendation types
        existing.reasons.push(...rec.reasons);
        // Keep the highest priority type
        if (this.getTypePriority(rec.type) > this.getTypePriority(existing.type)) {
          existing.type = rec.type;
        }
      } else {
        electionMap.set(rec.election.id, { ...rec });
      }
    }

    // Sort by score and take top recommendations
    return Array.from(electionMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get type priority for recommendation ranking
   */
  private getTypePriority(type: string): number {
    const priorities = {
      location_based: 4,
      interest_based: 3,
      trending: 2,
      similar_users: 1
    };
    return priorities[type] || 0;
  }

  /**
   * Generate basic recommendations for users without preferences
   */
  private generateBasicRecommendations(
    elections: Election[], 
    limit: number, 
    includeExpired: boolean
  ): RecommendationResponse {
    let availableElections = elections;
    
    if (!includeExpired) {
      availableElections = elections.filter(election => new Date(election.date) > new Date());
    }

    // Sort by date and take most recent
    const recommendations = availableElections
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit)
      .map((election, index) => ({
        id: Date.now() + index,
        election,
        score: 50, // Base score
        type: 'general',
        reason: 'Upcoming election',
        isPresented: false,
        isViewed: false,
        isClicked: false,
        isAddedToWatchlist: false,
        isDismissed: false,
      }));

    return {
      recommendations,
      totalCount: recommendations.length,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate cache key for recommendations
   */
  private generateCacheKey(userId: string, options: RecommendationOptions): string {
    const keyParts = [
      userId,
      options.limit || 10,
      (options.types || []).sort().join(','),
      options.includeExpired || false
    ];
    return `rec_${keyParts.join('_')}_${new Date().toDateString()}`;
  }

  /**
   * Get election engagement data (simulated for now)
   */
  private async getElectionEngagementData(electionIds: number[]): Promise<{[id: number]: {views: number, watchlistAdds: number}}> {
    // Simulate engagement data - in production this would come from analytics
    const data: {[id: number]: {views: number, watchlistAdds: number}} = {};
    
    for (const id of electionIds) {
      data[id] = {
        views: Math.floor(Math.random() * 2000),
        watchlistAdds: Math.floor(Math.random() * 100)
      };
    }
    
    return data;
  }

  /**
   * Find users with similar preferences (simplified algorithm)
   */
  private async findSimilarUsers(userId: string, userPreferences: UserPreferences): Promise<{id: string}[]> {
    // Simplified similarity algorithm - in production this would be more sophisticated
    // For now, return a mock list of similar users
    return [
      { id: 'user_1' },
      { id: 'user_2' },
      { id: 'user_3' }
    ];
  }
}