import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, numeric, bigint, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const elections = pgTable("elections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  location: text("location").notNull(),
  state: text("state").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // 'primary', 'general', 'special'
  level: text("level").notNull(), // 'federal', 'state', 'local'
  offices: text("offices").array(),
  description: text("description"),
  pollsOpen: text("polls_open"),
  pollsClose: text("polls_close"),
  timezone: text("timezone"),
  isActive: boolean("is_active").default(true),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(), // 'D', 'R', 'I', 'G', etc.
  electionId: integer("election_id").references(() => elections.id),
  pollingSupport: integer("polling_support"), // percentage
  pollingTrend: text("polling_trend"), // 'up', 'down', 'stable'
  lastPollingUpdate: timestamp("last_polling_update"),
  pollingSource: text("polling_source"), // Source of polling data
  isIncumbent: boolean("is_incumbent").default(false),
  description: text("description"),
  website: text("website"),
  votesReceived: integer("votes_received"), // actual vote count
  votePercentage: numeric("vote_percentage", { precision: 5, scale: 2 }), // percentage of total votes
  isWinner: boolean("is_winner").default(false), // election winner
  isProjectedWinner: boolean("is_projected_winner").default(false), // early projection
  // Candidate Management Fields
  isVerified: boolean("is_verified").default(false), // platform verified candidate
  subscriptionTier: text("subscription_tier"), // 'basic', 'premium', 'enterprise'
  profileImageUrl: text("profile_image_url"),
  campaignBio: text("campaign_bio"),
  contactEmail: text("contact_email"),
  campaignPhone: text("campaign_phone"),
  socialMedia: jsonb("social_media"), // {twitter, facebook, instagram, tiktok, youtube}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const electionResults = pgTable("election_results", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id),
  totalVotes: integer("total_votes"),
  reportingPrecincts: integer("reporting_precincts"),
  totalPrecincts: integer("total_precincts"),
  percentReporting: numeric("percent_reporting", { precision: 5, scale: 2 }),
  isComplete: boolean("is_complete").default(false),
  isCertified: boolean("is_certified").default(false),
  lastUpdated: timestamp("last_updated").defaultNow(),
  resultsSource: text("results_source"), // 'Associated Press', 'Secretary of State', etc.
});

// Session storage table for auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Watchlist with Organization Features
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  
  // Organization Features
  priority: text("priority").default('normal'), // 'high', 'normal', 'low'
  category: text("category"), // 'federal', 'state', 'local', 'custom'
  status: text("status").default('active'), // 'active', 'completed', 'archived'
  tags: text("tags").array(), // ['midterm', 'competitive', 'incumbent']
  notes: text("notes"), // User notes about this election
  
  // Personalization & Analytics
  addedVia: text("added_via").default('manual'), // 'manual', 'recommendation', 'import'
  sourceRecommendationId: integer("source_recommendation_id"), // Track recommendation source
  interactionCount: integer("interaction_count").default(0), // How many times user viewed/clicked
  lastInteraction: timestamp("last_interaction"),
  
  // Notification Settings (per election)
  notificationsEnabled: boolean("notifications_enabled").default(true),
  reminderDaysBefore: integer("reminder_days_before").default(7), // Days before election to remind
  
  // Metadata
  isVisible: boolean("is_visible").default(true), // Hide without deleting
  sortOrder: integer("sort_order"), // Custom user ordering
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("watchlist_user_id_idx").on(table.userId),
  index("watchlist_status_idx").on(table.status),
  index("watchlist_priority_idx").on(table.priority),
]);

// =============================================================================
// POLITICAL ANALYSIS & MOMENTUM TRACKING SCHEMA
// =============================================================================

// Real-time polling data aggregated from multiple sources
export const pollingData = pgTable("polling_data", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  
  // Support percentages
  democraticSupport: numeric("democratic_support", { precision: 5, scale: 2 }).notNull(),
  republicanSupport: numeric("republican_support", { precision: 5, scale: 2 }).notNull(),
  independentSupport: numeric("independent_support", { precision: 5, scale: 2 }).notNull(),
  undecided: numeric("undecided", { precision: 5, scale: 2 }).notNull(),
  
  // Poll metadata
  pollsterName: text("pollster_name").notNull(),
  sampleSize: integer("sample_size"),
  marginOfError: numeric("margin_of_error", { precision: 3, scale: 1 }),
  fieldDates: text("field_dates"), // "Oct 1-5, 2024"
  
  // Data source tracking
  sourceUrl: text("source_url"),
  aggregatedFrom: text("aggregated_from").array(), // ['FiveThirtyEight', 'RealClearPolitics']
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("polling_data_election_id_idx").on(table.electionId),
  index("polling_data_created_at_idx").on(table.createdAt),
]);

// User voting intentions collected through the platform
export const userVotingIntentions = pgTable("user_voting_intentions", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  
  // Anonymous session tracking
  sessionId: text("session_id").notNull(), // Anonymous identifier
  
  // Voting intentions
  candidateId: integer("candidate_id").references(() => candidates.id),
  partyPreference: text("party_preference"), // 'Democratic', 'Republican', 'Independent', 'Undecided'
  
  // Geographic context
  userState: text("user_state"),
  userCounty: text("user_county"),
  
  // Engagement tracking
  confidence: text("confidence").default('medium'), // 'high', 'medium', 'low'
  isLikelyVoter: boolean("is_likely_voter").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_voting_intentions_election_id_idx").on(table.electionId),
  index("user_voting_intentions_session_id_idx").on(table.sessionId),
]);

// Momentum tracking - calculated political shifts over time
export const politicalMomentum = pgTable("political_momentum", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  
  // Trend calculations (positive = gaining, negative = losing)
  democraticTrend: numeric("democratic_trend", { precision: 5, scale: 3 }).notNull(), // -1.0 to 1.0
  republicanTrend: numeric("republican_trend", { precision: 5, scale: 3 }).notNull(),
  
  // Momentum metadata
  timeWindow: integer("time_window").notNull(), // Days of data analyzed
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(), // 0-1
  
  // Shift detection
  isShifting: boolean("is_shifting").default(false),
  shiftDirection: text("shift_direction"), // 'red-to-blue', 'blue-to-red'
  shiftMagnitude: numeric("shift_magnitude", { precision: 5, scale: 3 }), // 0-1
  
  // Data sources used
  basedOnPolling: boolean("based_on_polling").default(false),
  basedOnUserIntentions: boolean("based_on_user_intentions").default(false),
  basedOnSocialSentiment: boolean("based_on_social_sentiment").default(false),
  
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
}, (table) => [
  index("political_momentum_election_id_idx").on(table.electionId),
  index("political_momentum_calculated_at_idx").on(table.calculatedAt),
]);

// =============================================================================
// RECOMMENDATION SYSTEM SCHEMA
// =============================================================================

// Election Recommendations generated for users
export const electionRecommendations = pgTable("election_recommendations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  
  // Recommendation Scoring
  scoreTotal: numeric("score_total", { precision: 8, scale: 4 }).notNull(), // Overall recommendation score
  scoreLocation: numeric("score_location", { precision: 5, scale: 4 }), // Location match score
  scoreInterests: numeric("score_interests", { precision: 5, scale: 4 }), // Interest match score
  scoreElectionType: numeric("score_election_type", { precision: 5, scale: 4 }), // Election type preference score
  scoreEngagement: numeric("score_engagement", { precision: 5, scale: 4 }), // Trending/engagement score
  scoreFreshness: numeric("score_freshness", { precision: 5, scale: 4 }), // Recency/freshness score
  
  // Recommendation Context
  recommendationType: text("recommendation_type").notNull(), // 'location_based', 'interest_based', 'trending', 'similar_users'
  reasonSummary: text("reason_summary"), // Human-readable explanation
  reasonDetails: jsonb("reason_details"), // Detailed scoring breakdown
  
  // User Interaction Tracking
  isPresented: boolean("is_presented").default(false), // Was shown to user
  presentedAt: timestamp("presented_at"),
  isViewed: boolean("is_viewed").default(false), // User viewed details
  viewedAt: timestamp("viewed_at"),
  isClicked: boolean("is_clicked").default(false), // User clicked through
  clickedAt: timestamp("clicked_at"),
  isAddedToWatchlist: boolean("is_added_to_watchlist").default(false), // User added to watchlist
  addedToWatchlistAt: timestamp("added_to_watchlist_at"),
  isDismissed: boolean("is_dismissed").default(false), // User dismissed recommendation
  dismissedAt: timestamp("dismissed_at"),
  dismissalReason: text("dismissal_reason"), // 'not_interested', 'already_following', 'wrong_location', etc.
  
  // Performance & Analytics
  displayPosition: integer("display_position"), // Position in recommendation list
  sessionId: text("session_id"), // Track user session
  abTestVariant: text("ab_test_variant"), // A/B testing support
  
  // Expiration & Cleanup
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"), // When recommendation becomes stale
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("election_recommendations_user_id_idx").on(table.userId),
  index("election_recommendations_election_id_idx").on(table.electionId),
  index("election_recommendations_score_idx").on(table.scoreTotal),
  index("election_recommendations_type_idx").on(table.recommendationType),
  index("election_recommendations_active_idx").on(table.isActive),
  index("election_recommendations_expires_idx").on(table.expiresAt),
]);

// User Recommendation Preferences & Behavior Analytics
export const userRecommendationAnalytics = pgTable("user_recommendation_analytics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Engagement Metrics
  totalRecommendationsReceived: integer("total_recommendations_received").default(0),
  totalRecommendationsViewed: integer("total_recommendations_viewed").default(0),
  totalRecommendationsClicked: integer("total_recommendations_clicked").default(0),
  totalRecommendationsAdded: integer("total_recommendations_added").default(0),
  totalRecommendationsDismissed: integer("total_recommendations_dismissed").default(0),
  
  // Conversion Rates (calculated periodically)
  viewRate: numeric("view_rate", { precision: 5, scale: 4 }), // viewed / received
  clickRate: numeric("click_rate", { precision: 5, scale: 4 }), // clicked / viewed
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 4 }), // added / clicked
  dismissalRate: numeric("dismissal_rate", { precision: 5, scale: 4 }), // dismissed / received
  
  // Preference Learning
  preferredRecommendationTypes: text("preferred_recommendation_types").array(), // Types user engages with most
  preferredElectionLevels: text("preferred_election_levels").array(), // Federal, state, local preferences
  preferredElectionTypes: text("preferred_election_types").array(), // Primary, general, special preferences
  
  // Behavioral Insights
  avgTimeToClick: integer("avg_time_to_click"), // Average seconds from view to click
  avgTimeToAdd: integer("avg_time_to_add"), // Average seconds from click to add
  peakEngagementTime: text("peak_engagement_time"), // Hour of day user is most active
  preferredDisplayPosition: integer("preferred_display_position"), // Position user clicks most
  
  // Recommendation Algorithm Tuning
  locationWeight: numeric("location_weight", { precision: 3, scale: 2 }).default('1.0'), // Personalized scoring weights
  interestWeight: numeric("interest_weight", { precision: 3, scale: 2 }).default('1.0'),
  electionTypeWeight: numeric("election_type_weight", { precision: 3, scale: 2 }).default('1.0'),
  engagementWeight: numeric("engagement_weight", { precision: 3, scale: 2 }).default('1.0'),
  freshnessWeight: numeric("freshness_weight", { precision: 3, scale: 2 }).default('1.0'),
  
  // Quality Metrics
  lastRecommendationQualityScore: numeric("last_recommendation_quality_score", { precision: 5, scale: 4 }),
  recommendationSatisfactionScore: numeric("recommendation_satisfaction_score", { precision: 5, scale: 4 }),
  
  // Update Tracking
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  lastRecommendationGeneratedAt: timestamp("last_recommendation_generated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_recommendation_analytics_user_id_idx").on(table.userId),
  index("user_recommendation_analytics_updated_idx").on(table.updatedAt),
]);

// Recommendation Performance Cache for optimization
export const recommendationCache = pgTable("recommendation_cache", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Cache Metadata
  cacheKey: text("cache_key").notNull().unique(), // Hash of user preferences + context
  recommendationType: text("recommendation_type").notNull(),
  
  // Cached Data
  recommendationData: jsonb("recommendation_data").notNull(), // Serialized recommendations
  totalRecommendations: integer("total_recommendations"),
  
  // Cache Validity
  isValid: boolean("is_valid").default(true),
  validUntil: timestamp("valid_until").notNull(),
  refreshNeeded: boolean("refresh_needed").default(false),
  
  // Performance Metrics
  generateTimeMs: integer("generate_time_ms"), // Time to generate these recommendations
  hitCount: integer("hit_count").default(0), // How many times this cache was used
  lastHitAt: timestamp("last_hit_at"),
  
  // Dependencies for invalidation
  dependsOnUserPreferences: boolean("depends_on_user_preferences").default(true),
  dependsOnElectionData: boolean("depends_on_election_data").default(true),
  dependsOnUserBehavior: boolean("depends_on_user_behavior").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("recommendation_cache_user_id_idx").on(table.userId),
  index("recommendation_cache_key_idx").on(table.cacheKey),
  index("recommendation_cache_valid_until_idx").on(table.validUntil),
  index("recommendation_cache_type_idx").on(table.recommendationType),
]);

// Candidate Q&A and Position Management
export const candidatePositions = pgTable("candidate_positions", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  category: text("category").notNull(), // Economy, Healthcare, Education, etc.
  position: text("position").notNull(),
  detailedStatement: text("detailed_statement"),
  isVerified: boolean("is_verified").default(false), // candidate verified this position
  sourceUrl: text("source_url"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const candidateQA = pgTable("candidate_qa", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"), // topic categorization
  isPublic: boolean("is_public").default(true),
  isPriority: boolean("is_priority").default(false), // featured Q&A
  isVerified: boolean("is_verified").default(false), // candidate approved
  upvotes: integer("upvotes").default(0),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidate Authentication and Campaign Portal Management
export const candidateAccounts = pgTable("candidate_accounts", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  role: text("role").notNull().default('campaign_manager'), // 'candidate', 'campaign_manager', 'staff'
  subscriptionTier: text("subscription_tier").notNull().default('basic'), // 'basic', 'premium', 'enterprise'
  isActive: boolean("is_active").default(true),
  emailVerified: boolean("email_verified").default(false),
  lastLogin: timestamp("last_login"),
  campaignName: text("campaign_name"),
  campaignTitle: text("campaign_title"), // "Campaign Manager for John Smith"
  accessLevel: text("access_level").default('full'), // 'full', 'limited', 'view_only'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidate-Supplied Information (RAG Source)
export const candidateProfiles = pgTable("candidate_profiles", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  // Personal Information
  fullName: text("full_name"),
  preferredName: text("preferred_name"),
  age: integer("age"),
  birthPlace: text("birth_place"),
  currentResidence: text("current_residence"),
  familyStatus: text("family_status"),
  // Professional Background
  currentOccupation: text("current_occupation"),
  employmentHistory: jsonb("employment_history"), // Array of {company, position, years, description}
  education: jsonb("education"), // Array of {institution, degree, year, field}
  militaryService: text("military_service"),
  // Political Experience
  previousOffices: jsonb("previous_offices"), // Array of {office, years, achievements}
  politicalExperience: text("political_experience"),
  endorsements: jsonb("endorsements"), // Array of {organization, description, date}
  // Policy Positions (Structured)
  economyPosition: text("economy_position"),
  healthcarePosition: text("healthcare_position"),
  educationPosition: text("education_position"),
  environmentPosition: text("environment_position"),
  immigrationPosition: text("immigration_position"),
  criminalJusticePosition: text("criminal_justice_position"),
  infrastructurePosition: text("infrastructure_position"),
  taxesPosition: text("taxes_position"),
  foreignPolicyPosition: text("foreign_policy_position"),
  socialIssuesPosition: text("social_issues_position"),
  // Campaign Information
  campaignWebsite: text("campaign_website"),
  campaignSlogan: text("campaign_slogan"),
  topPriorities: jsonb("top_priorities"), // Array of {priority, description}
  keyAccomplishments: jsonb("key_accomplishments"),
  // Data Source Tracking
  lastUpdatedBy: integer("last_updated_by").references(() => candidateAccounts.id),
  dataCompleteness: integer("data_completeness").default(0), // percentage 0-100
  verificationStatus: text("verification_status").default('pending'), // 'pending', 'verified', 'needs_review'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Track data sources and attributions for transparency
export const candidateDataSources = pgTable("candidate_data_sources", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  fieldName: text("field_name").notNull(), // which field this source applies to
  sourceType: text("source_type").notNull(), // 'candidate_supplied', 'ai_research', 'verified_external'
  sourceDescription: text("source_description"), // e.g., "Candidate Campaign Portal", "Perplexity AI Research", "Ballotpedia"
  sourceUrl: text("source_url"),
  lastVerified: timestamp("last_verified"),
  confidenceScore: integer("confidence_score"), // 1-100
  createdAt: timestamp("created_at").defaultNow(),
});

// Real-time voter engagement and polling
export const voterInteractions = pgTable("voter_interactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // can be anonymous
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  interactionType: text("interaction_type").notNull(), // 'view', 'like', 'share', 'question_ask', 'poll_response'
  electionId: integer("election_id").references(() => elections.id),
  contentId: integer("content_id"), // references to QA, position, etc.
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative'
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"), // additional interaction data
  createdAt: timestamp("created_at").defaultNow(),
});

export const realTimePolling = pgTable("real_time_polling", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  pollDate: timestamp("poll_date").defaultNow(),
  supportLevel: numeric("support_level", { precision: 5, scale: 2 }), // percentage
  confidence: numeric("confidence", { precision: 5, scale: 2 }), // confidence interval
  sampleSize: integer("sample_size"),
  methodology: text("methodology"), // 'user_interactions', 'direct_poll', 'engagement_analysis'
  demographics: jsonb("demographics"), // age, location, party affiliation breakdown
  trendDirection: text("trend_direction"), // 'up', 'down', 'stable'
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaign content management
export const campaignContent = pgTable("campaign_content", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  contentType: text("content_type").notNull(), // 'announcement', 'policy', 'event', 'media'
  title: text("title").notNull(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array(), // images, videos, documents
  isPublished: boolean("is_published").default(false),
  publishDate: timestamp("publish_date"),
  views: integer("views").default(0),
  engagementScore: numeric("engagement_score", { precision: 5, scale: 2 }).default('0'),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidate subscription and payment tracking
export const candidateSubscriptions = pgTable("candidate_subscriptions", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  subscriptionTier: text("subscription_tier").notNull(), // 'basic', 'premium', 'enterprise'
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  paymentStatus: text("payment_status").default('pending'), // 'pending', 'paid', 'overdue', 'cancelled'
  features: jsonb("features"), // tier-specific feature access
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }),
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 }).default('0'),
  lastPaymentDate: timestamp("last_payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign Portal Analytics Tables
export const campaignAccounts = pgTable("campaign_accounts", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key").notNull().unique(),
  organizationName: text("organization_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  electionId: integer("election_id").references(() => elections.id),
  subscriptionTier: text("subscription_tier").default("basic"), // 'basic', 'pro', 'enterprise', 'custom'
  isActive: boolean("is_active").default(true),
  monthlyApiLimit: integer("monthly_api_limit").default(1000),
  apiCallsUsed: integer("api_calls_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaignAccessLogs = pgTable("campaign_access_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaignAccounts.id),
  endpointAccessed: text("endpoint_accessed").notNull(),
  datasetType: text("dataset_type").notNull(), // 'demographics', 'polling', 'voter_behavior'
  cost: numeric("cost", { precision: 10, scale: 2 }).default("0"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  accessedAt: timestamp("accessed_at").defaultNow(),
});

export const dataPurchases = pgTable("data_purchases", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaignAccounts.id),
  datasetType: text("dataset_type").notNull(),
  records: integer("records").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const userSegments = pgTable("user_segments", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id),
  ageGroup: text("age_group"), // '18-25', '26-35', etc.
  income: text("income"), // 'low', 'middle', 'high'
  education: text("education"), // 'high_school', 'college', 'graduate'
  partyAffiliation: text("party_affiliation"), // 'D', 'R', 'I', 'U'
  voterHistory: text("voter_history"), // 'frequent', 'occasional', 'rare'
  count: integer("count").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const geographicClusters = pgTable("geographic_clusters", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id),
  state: text("state").notNull(),
  county: text("county"),
  zipCode: text("zip_code"),
  precinct: text("precinct"),
  voterDensity: integer("voter_density"), // voters per square mile
  demographicProfile: jsonb("demographic_profile"), // age, income, education breakdown
  politicalLean: text("political_lean"), // 'strong_d', 'lean_d', 'competitive', 'lean_r', 'strong_r'
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const pollingResults = pgTable("polling_results", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id),
  candidateId: integer("candidate_id").references(() => candidates.id),
  demographicGroup: text("demographic_group"), // age group, income level, etc.
  geographicArea: text("geographic_area"), // state, county, zip
  pollingPercentage: numeric("polling_percentage", { precision: 5, scale: 2 }),
  sampleSize: integer("sample_size"),
  marginOfError: numeric("margin_of_error", { precision: 4, scale: 2 }),
  pollingDate: timestamp("polling_date").notNull(),
  pollster: text("pollster").notNull(),
  isAuthentic: boolean("is_authentic").default(true), // verified polling data
  createdAt: timestamp("created_at").defaultNow(),
});

export const congressMembers = pgTable("congress_members", {
  id: serial("id").primaryKey(),
  bioguideId: varchar("bioguide_id", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  party: varchar("party", { length: 50 }),
  state: varchar("state", { length: 10 }).notNull(),
  district: varchar("district", { length: 10 }),
  chamber: varchar("chamber", { length: 20 }).notNull(), // 'House' or 'Senate'
  congress: integer("congress").default(119), // Current Congress number (119th)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const congressBills = pgTable("congress_bills", {
  id: serial("id").primaryKey(),
  congress: integer("congress").notNull(),
  billNumber: varchar("bill_number", { length: 50 }).notNull(),
  title: text("title").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  introducedDate: timestamp("introduced_date"),
  latestActionDate: timestamp("latest_action_date"),
  latestActionText: text("latest_action_text"),
  sponsors: jsonb("sponsors").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const congressCommittees = pgTable("congress_committees", {
  id: serial("id").primaryKey(),
  systemCode: varchar("system_code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  chamber: varchar("chamber", { length: 20 }).notNull(),
  type: varchar("type", { length: 50 }),
  subcommittees: jsonb("subcommittees").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidate biographical data storage for scraped/researched information
export const candidateBiography = pgTable("candidate_biography", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  state: text("state"),
  currentPosition: text("current_position"),
  district: text("district"),
  party: text("party"),
  imageUrl: text("image_url"),
  sources: jsonb("sources").default([]),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Election cycles for version control
export const electionCycles = pgTable("election_cycles", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  year: integer("year").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Removed duplicate - using the one defined earlier in Campaign Portal Analytics Tables section



// Relations
export const electionsRelations = relations(elections, ({ many }) => ({
  candidates: many(candidates),
  results: many(electionResults),
}));

export const electionResultsRelations = relations(electionResults, ({ one }) => ({
  election: one(elections, {
    fields: [electionResults.electionId],
    references: [elections.id],
  }),
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  election: one(elections, {
    fields: [candidates.electionId],
    references: [elections.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  watchlist: many(watchlist),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  election: one(elections, {
    fields: [watchlist.electionId],
    references: [elections.id],
  }),
}));

// Filter schema
export const filterSchema = z.object({
  state: z.string().optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  level: z.union([z.string(), z.array(z.string())]).optional(),
  timeframe: z.string().optional(),
  timeRange: z.string().optional(),
  search: z.string().optional(),
  party: z.union([z.string(), z.array(z.string())]).optional(),
  electionType: z.union([z.string(), z.array(z.string())]).optional(),
  cycle: z.number().optional(),
}).transform((data) => {
  // Handle query string arrays being passed as comma-separated strings
  return {
    ...data,
    state: data.state === 'all' ? undefined : data.state,
    type: data.type === 'all' ? undefined : data.type,
    level: data.level === 'all' ? undefined : data.level,
    timeframe: data.timeframe === 'all' ? undefined : data.timeframe,
    timeRange: data.timeRange === 'all' ? undefined : data.timeRange,
    party: data.party === 'all' ? undefined : data.party,
    electionType: data.electionType === 'all' ? undefined : data.electionType,
  };
});

// Insert schemas
export const insertElectionSchema = createInsertSchema(elections).omit({
  id: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  createdAt: true,
});

export const insertCongressMemberSchema = createInsertSchema(congressMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertElectionResultSchema = createInsertSchema(electionResults).omit({
  id: true,
  lastUpdated: true,
});

// Candidate engagement schemas
export const insertCandidatePositionSchema = createInsertSchema(candidatePositions).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertCandidateQASchema = createInsertSchema(candidateQA).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoterInteractionSchema = createInsertSchema(voterInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertRealTimePollingSchema = createInsertSchema(realTimePolling).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignContentSchema = createInsertSchema(campaignContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateSubscriptionSchema = createInsertSchema(candidateSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Campaign portal schemas
export const insertCampaignAccountSchema = createInsertSchema(campaignAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignAccessLogSchema = createInsertSchema(campaignAccessLogs).omit({
  id: true,
  accessedAt: true,
});

export const insertDataPurchaseSchema = createInsertSchema(dataPurchases).omit({
  id: true,
  purchasedAt: true,
});

// Types
export type Election = typeof elections.$inferSelect;
export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type ElectionResult = typeof electionResults.$inferSelect;
export type InsertElectionResult = z.infer<typeof insertElectionResultSchema>;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type ElectionFilters = z.infer<typeof filterSchema>;
export type User = typeof users.$inferSelect;

// Data authenticity interfaces
export interface DataAuthenticity {
  hasAuthenticPolling: boolean;
  hasAuthenticVotes: boolean;
  lastDataVerification: string;
  pollingConfidence: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// Enhanced candidate type with authenticity data
export interface CandidateWithAuthenticity extends Candidate {
  dataAuthenticity?: DataAuthenticity;
}
export type UpsertUser = typeof users.$inferInsert;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
export type CongressMember = typeof congressMembers.$inferSelect;
export type InsertCongressMember = z.infer<typeof insertCongressMemberSchema>;

// Candidate Authentication Types
export type CandidateAccount = typeof candidateAccounts.$inferSelect;
export type InsertCandidateAccount = typeof candidateAccounts.$inferInsert;

export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type InsertCandidateProfile = typeof candidateProfiles.$inferInsert;

export type CandidateDataSource = typeof candidateDataSources.$inferSelect;
export type InsertCandidateDataSource = typeof candidateDataSources.$inferInsert;

// Candidate engagement types
export type CandidatePosition = typeof candidatePositions.$inferSelect;
export type InsertCandidatePosition = z.infer<typeof insertCandidatePositionSchema>;
export type CandidateQA = typeof candidateQA.$inferSelect;
export type InsertCandidateQA = z.infer<typeof insertCandidateQASchema>;
export type VoterInteraction = typeof voterInteractions.$inferSelect;
export type InsertVoterInteraction = z.infer<typeof insertVoterInteractionSchema>;
export type RealTimePolling = typeof realTimePolling.$inferSelect;
export type InsertRealTimePolling = z.infer<typeof insertRealTimePollingSchema>;
export type CampaignContent = typeof campaignContent.$inferSelect;
export type InsertCampaignContent = z.infer<typeof insertCampaignContentSchema>;
export type CandidateSubscription = typeof candidateSubscriptions.$inferSelect;
export type InsertCandidateSubscription = z.infer<typeof insertCandidateSubscriptionSchema>;

// Notification System Tables
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  emailEnabled: boolean("email_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  phoneNumber: varchar("phone_number"),
  // Granular notification types
  electionResultsEnabled: boolean("election_results_enabled").default(true),
  candidateUpdatesEnabled: boolean("candidate_updates_enabled").default(true),
  breakingNewsEnabled: boolean("breaking_news_enabled").default(false),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true),
  deadlineRemindersEnabled: boolean("deadline_reminders_enabled").default(true),
  // Geographic preferences
  stateFilter: text("state_filter").array(), // States user wants to follow
  localElectionsEnabled: boolean("local_elections_enabled").default(false),
  federalElectionsEnabled: boolean("federal_elections_enabled").default(true),
  // Frequency controls
  immediateNotifications: boolean("immediate_notifications").default(false),
  dailyDigest: boolean("daily_digest").default(false),
  weeklyDigest: boolean("weekly_digest").default(true),
  // Timing preferences
  preferredDeliveryTime: text("preferred_delivery_time").default("09:00"), // HH:MM format
  timezone: text("timezone").default("America/New_York"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationConsents = pgTable("notification_consents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  consentType: text("consent_type").notNull(), // 'email', 'sms', 'marketing', 'analytics'
  consentGiven: boolean("consent_given").notNull(),
  consentDate: timestamp("consent_date").notNull(),
  withdrawalDate: timestamp("withdrawal_date"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  consentMethod: text("consent_method"), // 'signup', 'preferences_page', 'double_opt_in'
  legalBasis: text("legal_basis"), // 'consent', 'legitimate_interest', 'contract'
  dataRetentionPeriod: integer("data_retention_period"), // Days
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationSubscriptions = pgTable("notification_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subscriptionType: text("subscription_type").notNull(), // 'election_alerts', 'candidate_updates', 'breaking_news'
  channel: text("channel").notNull(), // 'email', 'sms', 'push'
  targetValue: text("target_value"), // email address or phone number
  isVerified: boolean("is_verified").default(false),
  verificationToken: varchar("verification_token"),
  verificationSentAt: timestamp("verification_sent_at"),
  verifiedAt: timestamp("verified_at"),
  // Subscription filters
  electionTypes: text("election_types").array(), // ['primary', 'general', 'special']
  electionLevels: text("election_levels").array(), // ['federal', 'state', 'local']
  states: text("states").array(), // Geographic filter
  parties: text("parties").array(), // Party filter
  isActive: boolean("is_active").default(true),
  unsubscribedAt: timestamp("unsubscribed_at"),
  unsubscribeToken: varchar("unsubscribe_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // 'email', 'sms'
  category: text("category").notNull(), // 'election_results', 'candidate_update', 'breaking_news'
  subject: text("subject"), // For email templates
  textContent: text("text_content").notNull(),
  htmlContent: text("html_content"), // For email templates
  variables: jsonb("variables"), // Template variables {name, description, example}
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  version: integer("version").default(1),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationCampaigns = pgTable("notification_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateId: integer("template_id").references(() => notificationTemplates.id),
  campaignType: text("campaign_type").notNull(), // 'immediate', 'scheduled', 'triggered'
  status: text("status").notNull().default('draft'), // 'draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled'
  // Targeting
  targetAudience: jsonb("target_audience"), // Complex audience targeting rules
  estimatedRecipients: integer("estimated_recipients"),
  // Scheduling
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Content overrides
  customSubject: text("custom_subject"),
  customContent: text("custom_content"),
  // Campaign settings
  priority: text("priority").default('normal'), // 'low', 'normal', 'high', 'urgent'
  rateLimit: integer("rate_limit").default(100), // Messages per minute
  retryAttempts: integer("retry_attempts").default(3),
  // Analytics
  totalSent: integer("total_sent").default(0),
  totalDelivered: integer("total_delivered").default(0),
  totalFailed: integer("total_failed").default(0),
  totalBounced: integer("total_bounced").default(0),
  totalClicked: integer("total_clicked").default(0),
  totalOpened: integer("total_opened").default(0),
  totalUnsubscribed: integer("total_unsubscribed").default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => notificationCampaigns.id),
  userId: varchar("user_id").references(() => users.id),
  subscriptionId: integer("subscription_id").references(() => notificationSubscriptions.id),
  templateId: integer("template_id").references(() => notificationTemplates.id),
  channel: text("channel").notNull(), // 'email', 'sms'
  recipient: text("recipient").notNull(), // email address or phone number
  status: text("status").notNull().default('queued'), // 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced'
  externalId: varchar("external_id"), // Provider message ID (SendGrid/Twilio)
  subject: text("subject"),
  content: text("content").notNull(),
  // Delivery tracking
  queuedAt: timestamp("queued_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  failedAt: timestamp("failed_at"),
  // Error tracking
  errorCode: varchar("error_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  nextRetryAt: timestamp("next_retry_at"),
  // Provider response
  providerResponse: jsonb("provider_response"),
  cost: numeric("cost", { precision: 10, scale: 4 }), // Cost in dollars
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationEvents = pgTable("notification_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'election_result', 'candidate_update', 'breaking_news', 'deadline_reminder'
  eventData: jsonb("event_data").notNull(), // Event-specific data
  triggerConditions: jsonb("trigger_conditions"), // Conditions that triggered this event
  relatedElectionId: integer("related_election_id").references(() => elections.id),
  relatedCandidateId: integer("related_candidate_id").references(() => candidates.id),
  priority: text("priority").default('normal'), // 'low', 'normal', 'high', 'urgent'
  isProcessed: boolean("is_processed").default(false),
  processedAt: timestamp("processed_at"),
  campaignId: integer("campaign_id").references(() => notificationCampaigns.id),
  // Event metadata
  source: text("source"), // Source system that created this event
  sourceId: varchar("source_id"), // ID in source system
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationWebhooks = pgTable("notification_webhooks", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // 'sendgrid', 'twilio'
  eventType: text("event_type").notNull(), // 'delivered', 'bounced', 'opened', 'clicked', 'failed'
  deliveryId: integer("delivery_id").references(() => notificationDeliveries.id),
  externalId: varchar("external_id"), // Provider message ID
  webhookData: jsonb("webhook_data").notNull(), // Full webhook payload
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for notification system
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationConsentSchema = createInsertSchema(notificationConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSubscriptionSchema = createInsertSchema(notificationSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationCampaignSchema = createInsertSchema(notificationCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationDeliverySchema = createInsertSchema(notificationDeliveries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationEventSchema = createInsertSchema(notificationEvents).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationWebhookSchema = createInsertSchema(notificationWebhooks).omit({
  id: true,
  createdAt: true,
});

// Notification system types
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationConsent = typeof notificationConsents.$inferSelect;
export type InsertNotificationConsent = z.infer<typeof insertNotificationConsentSchema>;
export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;
export type InsertNotificationSubscription = z.infer<typeof insertNotificationSubscriptionSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type NotificationCampaign = typeof notificationCampaigns.$inferSelect;
export type InsertNotificationCampaign = z.infer<typeof insertNotificationCampaignSchema>;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type InsertNotificationDelivery = z.infer<typeof insertNotificationDeliverySchema>;
export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type InsertNotificationEvent = z.infer<typeof insertNotificationEventSchema>;
export type NotificationWebhook = typeof notificationWebhooks.$inferSelect;
export type InsertNotificationWebhook = z.infer<typeof insertNotificationWebhookSchema>;

// =============================================================================
// USER PREFERENCES SYSTEM SCHEMA
// =============================================================================

// Comprehensive User Preferences for Onboarding & Personalization
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Location Preferences
  state: text("state"), // Two-letter state code (e.g., "CA", "NY")
  city: text("city"),
  congressionalDistrict: text("congressional_district"), // Format: "CA-12"
  locationConfidenceLevel: text("location_confidence_level").default('medium'), // 'high', 'medium', 'low'
  locationSource: text("location_source"), // 'user_input', 'ip_detection', 'zip_lookup'
  
  // Political Interest Categories
  federalElectionsInterest: boolean("federal_elections_interest").default(true),
  stateElectionsInterest: boolean("state_elections_interest").default(true),
  localElectionsInterest: boolean("local_elections_interest").default(false),
  candidateProfilesInterest: boolean("candidate_profiles_interest").default(true),
  votingRecordsInterest: boolean("voting_records_interest").default(false),
  
  // Election Type Preferences
  primaryElectionsEnabled: boolean("primary_elections_enabled").default(true),
  generalElectionsEnabled: boolean("general_elections_enabled").default(true),
  specialElectionsEnabled: boolean("special_elections_enabled").default(false),
  runoffElectionsEnabled: boolean("runoff_elections_enabled").default(false),
  
  // Content Personalization Preferences
  candidateInformationDepth: text("candidate_information_depth").default('standard'), // 'minimal', 'standard', 'detailed'
  electionTimelinePreference: text("election_timeline_preference").default('all'), // 'upcoming_only', 'current_cycle', 'all'
  pollingDataInterest: boolean("polling_data_interest").default(true),
  endorsementDataInterest: boolean("endorsement_data_interest").default(false),
  
  // Communication Preferences (extends notification preferences)
  digestFrequency: text("digest_frequency").default('weekly'), // 'daily', 'weekly', 'monthly', 'never'
  breakingNewsAlerts: boolean("breaking_news_alerts").default(false),
  electionReminderAlerts: boolean("election_reminder_alerts").default(true),
  candidateUpdateAlerts: boolean("candidate_update_alerts").default(false),
  
  // Advanced Filtering Preferences
  partyAffiliations: text("party_affiliations").array(), // ['Democratic', 'Republican', 'Independent', etc.]
  issueInterests: text("issue_interests").array(), // ['Economy', 'Healthcare', 'Environment', etc.]
  
  // Privacy & Data Preferences
  dataUsageConsent: boolean("data_usage_consent").default(true),
  personalizationEnabled: boolean("personalization_enabled").default(true),
  analyticsOptOut: boolean("analytics_opt_out").default(false),
  
  // Onboarding Completion Tracking
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStepsCompleted: text("onboarding_steps_completed").array(), // ['location', 'interests', 'notifications']
  skipOnboarding: boolean("skip_onboarding").default(false),
  
  // Metadata
  preferenceSource: text("preference_source").default('onboarding'), // 'onboarding', 'settings_page', 'import'
  lastLocationUpdate: timestamp("last_location_update"),
  lastInterestUpdate: timestamp("last_interest_update"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema for user preferences
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User preferences types
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

// Preference update schema for partial updates
export const updateUserPreferencesSchema = insertUserPreferencesSchema.partial();
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;

// Congressional District Mapping (for location-based filtering)
export const congressionalDistricts = pgTable("congressional_districts", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(), // Two-letter state code
  district: text("district").notNull(), // District number (e.g., "01", "02", "at-large")
  districtCode: text("district_code").notNull().unique(), // Format: "CA-12"
  representativeName: text("representative_name"),
  representativeParty: text("representative_party"),
  
  // Geographic boundaries (simplified)
  majorCities: text("major_cities").array(),
  counties: text("counties").array(),
  zipCodes: text("zip_codes").array(),
  
  // Census data for better matching
  population: integer("population"),
  lastElectionYear: integer("last_election_year"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCongressionalDistrictSchema = createInsertSchema(congressionalDistricts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CongressionalDistrict = typeof congressionalDistricts.$inferSelect;
export type InsertCongressionalDistrict = z.infer<typeof insertCongressionalDistrictSchema>;

// =============================================================================
// DISASTER RECOVERY AND BACKUP SYSTEM SCHEMA
// =============================================================================

// Backup Storage Locations (S3, etc.)
export const backupStorageLocations = pgTable("backup_storage_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Primary S3", "Secondary Backup", etc.
  type: text("type").notNull(), // 's3', 'neon_snapshot', 'local', 'azure_blob'
  endpoint: text("endpoint"), // S3 endpoint URL
  bucket: text("bucket"), // S3 bucket name or container
  region: text("region"), // AWS region
  accessKeyId: text("access_key_id"), // Encrypted access key
  isEncrypted: boolean("is_encrypted").default(true),
  encryptionMethod: text("encryption_method"), // 'AES256', 'aws:kms'
  isActive: boolean("is_active").default(true),
  maxRetentionDays: integer("max_retention_days").default(365),
  costPerGb: numeric("cost_per_gb", { precision: 10, scale: 6 }), // Cost tracking
  metadata: jsonb("metadata"), // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Backup Retention Policies
export const backupRetentionPolicies = pgTable("backup_retention_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Production Daily", "Weekly Archive", etc.
  backupType: text("backup_type").notNull(), // 'neon_snapshot', 's3_export', 'full_dump'
  schedule: text("schedule").notNull(), // Cron expression: "0 2 * * *"
  retentionDays: integer("retention_days").notNull(),
  storageLocationId: integer("storage_location_id").references(() => backupStorageLocations.id),
  isActive: boolean("is_active").default(true),
  autoCleanup: boolean("auto_cleanup").default(true),
  compressionEnabled: boolean("compression_enabled").default(true),
  encryptionEnabled: boolean("encryption_enabled").default(true),
  // Backup scope configuration
  includeSchema: boolean("include_schema").default(true),
  includeData: boolean("include_data").default(true),
  includedTables: text("included_tables").array(), // Specific tables if not all
  excludedTables: text("excluded_tables").array(), // Tables to exclude
  // Notification settings
  notifyOnSuccess: boolean("notify_on_success").default(false),
  notifyOnFailure: boolean("notify_on_failure").default(true),
  alertEmails: text("alert_emails").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Backup Operations Log
export const backupOperations = pgTable("backup_operations", {
  id: serial("id").primaryKey(),
  operationId: varchar("operation_id").notNull().unique(), // UUID for tracking
  type: text("type").notNull(), // 'neon_snapshot', 's3_export', 'schema_backup', 'full_dump'
  status: text("status").notNull(), // 'queued', 'in_progress', 'completed', 'failed', 'cancelled'
  policyId: integer("policy_id").references(() => backupRetentionPolicies.id),
  storageLocationId: integer("storage_location_id").references(() => backupStorageLocations.id),
  
  // Backup Details
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // seconds
  backupSize: bigint("backup_size", { mode: "number" }), // bytes
  compressedSize: bigint("compressed_size", { mode: "number" }), // bytes after compression
  compressionRatio: numeric("compression_ratio", { precision: 5, scale: 2 }), // percentage
  
  // Source Information
  sourceDatabase: text("source_database"),
  sourceBranch: text("source_branch"), // Neon branch
  schemaVersion: text("schema_version"),
  tableCount: integer("table_count"),
  recordCount: bigint("record_count", { mode: "number" }),
  
  // Storage Information
  backupPath: text("backup_path"), // S3 key or file path
  backupUrl: text("backup_url"), // Access URL if applicable
  checksum: text("checksum"), // SHA256 or MD5 hash
  encryptionKey: text("encryption_key"), // Encrypted key reference
  
  // Neon-specific fields
  neonSnapshotId: text("neon_snapshot_id"), // Neon snapshot ID
  neonBranchId: text("neon_branch_id"), // Neon branch ID
  neonProjectId: text("neon_project_id"), // Neon project ID
  
  // Error tracking
  errorMessage: text("error_message"),
  errorCode: varchar("error_code"),
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  
  // Verification
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verificationChecksum: text("verification_checksum"),
  
  // Metadata and tags
  tags: text("tags").array(), // ["production", "pre-migration", etc.]
  metadata: jsonb("metadata"),
  triggeredBy: text("triggered_by"), // 'schedule', 'manual', 'pre_migration', 'alert'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("backup_operations_status_idx").on(table.status),
  index("backup_operations_type_idx").on(table.type),
  index("backup_operations_created_at_idx").on(table.createdAt),
]);

// Schema Version Tracking for Drift Detection
export const schemaVersions = pgTable("schema_versions", {
  id: serial("id").primaryKey(),
  versionHash: varchar("version_hash").notNull().unique(), // SHA256 of schema
  schemaSnapshot: jsonb("schema_snapshot").notNull(), // Complete schema definition
  migrationFiles: text("migration_files").array(), // Applied migration files
  tableCount: integer("table_count"),
  indexCount: integer("index_count"),
  constraintCount: integer("constraint_count"),
  
  // Change tracking
  changesFromPrevious: jsonb("changes_from_previous"), // Diff from previous version
  isBreakingChange: boolean("is_breaking_change").default(false),
  riskLevel: text("risk_level"), // 'low', 'medium', 'high', 'critical'
  
  // Backup association
  backupOperationId: integer("backup_operation_id").references(() => backupOperations.id),
  
  // Detection metadata
  detectedBy: text("detected_by"), // 'scheduled_check', 'migration', 'manual'
  detectedAt: timestamp("detected_at").defaultNow(),
  
  // Validation
  isValidated: boolean("is_validated").default(false),
  validatedAt: timestamp("validated_at"),
  validationErrors: jsonb("validation_errors"),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("schema_versions_hash_idx").on(table.versionHash),
  index("schema_versions_detected_at_idx").on(table.detectedAt),
]);

// Restore Validation and Testing
export const restoreValidations = pgTable("restore_validations", {
  id: serial("id").primaryKey(),
  validationId: varchar("validation_id").notNull().unique(), // UUID for tracking
  backupOperationId: integer("backup_operation_id").references(() => backupOperations.id).notNull(),
  
  // Validation setup
  validationType: text("validation_type").notNull(), // 'integrity_check', 'full_restore', 'sample_restore', 'schema_validation'
  testEnvironment: text("test_environment"), // 'staging', 'test', 'isolated'
  
  // Test database information
  testDatabaseUrl: text("test_database_url"), // Connection to test database
  testBranchId: text("test_branch_id"), // Neon test branch
  
  // Execution tracking
  status: text("status").notNull(), // 'queued', 'running', 'completed', 'failed', 'timeout'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // seconds
  timeoutAfter: integer("timeout_after").default(3600), // seconds
  
  // Results
  isSuccessful: boolean("is_successful").default(false),
  dataIntegrityScore: numeric("data_integrity_score", { precision: 5, scale: 2 }), // 0-100%
  schemaIntegrityScore: numeric("schema_integrity_score", { precision: 5, scale: 2 }), // 0-100%
  performanceScore: numeric("performance_score", { precision: 5, scale: 2 }), // 0-100%
  
  // Recovery Time Objective (RTO) tracking
  restoreTime: integer("restore_time"), // seconds to complete restore
  rtoTarget: integer("rto_target"), // target RTO in seconds
  rtoAchieved: boolean("rto_achieved").default(false),
  
  // Detailed results
  tablesValidated: integer("tables_validated"),
  recordsValidated: bigint("records_validated", { mode: "number" }),
  validationErrors: jsonb("validation_errors"),
  performanceMetrics: jsonb("performance_metrics"), // Query times, etc.
  
  // Error tracking
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  
  // Test artifacts
  testResults: jsonb("test_results"), // Detailed test results
  testQueries: jsonb("test_queries"), // Queries used for validation
  benchmarkResults: jsonb("benchmark_results"), // Performance benchmarks
  
  // Cleanup tracking
  cleanupCompleted: boolean("cleanup_completed").default(false),
  cleanupAt: timestamp("cleanup_at"),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("restore_validations_backup_id_idx").on(table.backupOperationId),
  index("restore_validations_status_idx").on(table.status),
  index("restore_validations_created_at_idx").on(table.createdAt),
]);

// Backup System Configuration
export const backupSystemConfig = pgTable("backup_system_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key").notNull().unique(),
  configValue: text("config_value").notNull(),
  configType: text("config_type").notNull(), // 'string', 'number', 'boolean', 'json'
  description: text("description"),
  isEncrypted: boolean("is_encrypted").default(false),
  lastModifiedBy: varchar("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for backup system
export const insertBackupStorageLocationSchema = createInsertSchema(backupStorageLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBackupRetentionPolicySchema = createInsertSchema(backupRetentionPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBackupOperationSchema = createInsertSchema(backupOperations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchemaVersionSchema = createInsertSchema(schemaVersions).omit({
  id: true,
  createdAt: true,
});

export const insertRestoreValidationSchema = createInsertSchema(restoreValidations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBackupSystemConfigSchema = createInsertSchema(backupSystemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Backup system types
export type BackupStorageLocation = typeof backupStorageLocations.$inferSelect;
export type InsertBackupStorageLocation = z.infer<typeof insertBackupStorageLocationSchema>;
export type BackupRetentionPolicy = typeof backupRetentionPolicies.$inferSelect;
export type InsertBackupRetentionPolicy = z.infer<typeof insertBackupRetentionPolicySchema>;
export type BackupOperation = typeof backupOperations.$inferSelect;
export type InsertBackupOperation = z.infer<typeof insertBackupOperationSchema>;
export type SchemaVersion = typeof schemaVersions.$inferSelect;
export type InsertSchemaVersion = z.infer<typeof insertSchemaVersionSchema>;
export type RestoreValidation = typeof restoreValidations.$inferSelect;
export type InsertRestoreValidation = z.infer<typeof insertRestoreValidationSchema>;
export type BackupSystemConfig = typeof backupSystemConfig.$inferSelect;
export type InsertBackupSystemConfig = z.infer<typeof insertBackupSystemConfigSchema>;

// ============================================================================
// PLATFORM CONTINUITY TABLES (Track 3)
// ============================================================================

/**
 * Secrets Management for API Key Rotation
 */
export const secretsVault = pgTable("secrets_vault", {
  id: serial("id").primaryKey(),
  secretName: text("secret_name").notNull().unique(),
  secretType: text("secret_type").notNull(), // 'api_key', 'database_url', 'encryption_key', etc.
  serviceName: text("service_name").notNull(), // 'google_civic', 'propublica', 'votesmart', etc.
  currentValue: text("current_value").notNull(), // Encrypted
  previousValue: text("previous_value"), // Encrypted
  nextRotation: timestamp("next_rotation").notNull(),
  lastRotated: timestamp("last_rotated"),
  rotationFrequencyDays: integer("rotation_frequency_days").default(90),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"), // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("secrets_vault_secret_name_idx").on(table.secretName),
  index("secrets_vault_service_name_idx").on(table.serviceName),
  index("secrets_vault_next_rotation_idx").on(table.nextRotation)
]);

/**
 * Secrets Rotation History
 */
export const secretsRotationHistory = pgTable("secrets_rotation_history", {
  id: serial("id").primaryKey(),
  secretId: integer("secret_id").references(() => secretsVault.id),
  rotationId: text("rotation_id").notNull(),
  rotationType: text("rotation_type").notNull(), // 'scheduled', 'manual', 'emergency'
  status: text("status").notNull(), // 'initiated', 'in_progress', 'completed', 'failed', 'rolled_back'
  oldValueHash: text("old_value_hash"), // Hash of previous value for verification
  newValueHash: text("new_value_hash"), // Hash of new value for verification
  initiatedBy: text("initiated_by"), // User or system
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  validationResults: jsonb("validation_results"), // Results of post-rotation validation
  rollbackRequired: boolean("rollback_required").default(false),
  metadata: jsonb("metadata")
}, (table) => [
  index("secrets_rotation_secret_id_idx").on(table.secretId),
  index("secrets_rotation_status_idx").on(table.status),
  index("secrets_rotation_started_at_idx").on(table.startedAt)
]);

/**
 * Artifact Storage and Versioning
 */
export const artifactStorage = pgTable("artifact_storage", {
  id: serial("id").primaryKey(),
  artifactName: text("artifact_name").notNull(),
  artifactType: text("artifact_type").notNull(), // 'deployment', 'configuration', 'dependency', 'backup'
  version: text("version").notNull(),
  environment: text("environment").notNull(), // 'development', 'staging', 'production'
  storageLocation: text("storage_location").notNull(), // S3 path, file path, etc.
  contentHash: text("content_hash").notNull(), // SHA-256 hash for integrity
  size: bigint("size", { mode: "number" }), // Size in bytes
  compressionType: text("compression_type"), // 'gzip', 'brotli', 'none'
  encryptionType: text("encryption_type"), // 'aes-256', 'none'
  tags: text("tags").array(), // Searchable tags
  isActive: boolean("is_active").default(true),
  retentionDate: timestamp("retention_date"), // When artifact can be deleted
  metadata: jsonb("metadata"), // Additional artifact information
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by")
}, (table) => [
  index("artifact_storage_name_version_idx").on(table.artifactName, table.version),
  index("artifact_storage_type_idx").on(table.artifactType),
  index("artifact_storage_environment_idx").on(table.environment),
  index("artifact_storage_content_hash_idx").on(table.contentHash)
]);

/**
 * Deployment Tracking
 */
export const deploymentHistory = pgTable("deployment_history", {
  id: serial("id").primaryKey(),
  deploymentId: text("deployment_id").notNull().unique(),
  manifestName: text("manifest_name").notNull(),
  environment: text("environment").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(), // 'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
  deploymentType: text("deployment_type").notNull(), // 'fresh', 'update', 'rollback', 'disaster_recovery'
  triggerType: text("trigger_type").notNull(), // 'manual', 'scheduled', 'automated', 'disaster_recovery'
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in seconds
  servicesDeployed: jsonb("services_deployed"), // Array of service deployment details
  artifactsUsed: text("artifacts_used").array(), // Artifact IDs used in deployment
  configurationSnapshot: jsonb("configuration_snapshot"), // Environment variables at time of deployment
  healthCheckResults: jsonb("health_check_results"),
  rollbackDeploymentId: text("rollback_deployment_id"), // Reference to rollback deployment
  error: text("error"),
  logs: text("logs").array(), // Deployment logs
  deployedBy: text("deployed_by"),
  metadata: jsonb("metadata")
}, (table) => [
  index("deployment_history_deployment_id_idx").on(table.deploymentId),
  index("deployment_history_status_idx").on(table.status),
  index("deployment_history_environment_idx").on(table.environment),
  index("deployment_history_started_at_idx").on(table.startedAt)
]);

/**
 * Environment Configuration Templates
 */
export const environmentConfigurations = pgTable("environment_configurations", {
  id: serial("id").primaryKey(),
  configurationName: text("configuration_name").notNull(),
  environment: text("environment").notNull(),
  serviceType: text("service_type"), // 'backend', 'frontend', 'database', 'worker'
  configurationData: jsonb("configuration_data").notNull(), // Environment variables and settings
  templateVersion: text("template_version").notNull(),
  isActive: boolean("is_active").default(true),
  validationRules: jsonb("validation_rules"), // Rules for validating configuration
  dependencies: text("dependencies").array(), // Other configurations this depends on
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by")
}, (table) => [
  index("environment_config_name_env_idx").on(table.configurationName, table.environment),
  index("environment_config_service_type_idx").on(table.serviceType),
  index("environment_config_active_idx").on(table.isActive)
]);

/**
 * Platform Continuity Events
 */
export const platformContinuityEvents = pgTable("platform_continuity_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(), // 'deployment', 'rollback', 'secret_rotation', 'artifact_cleanup', 'environment_bootstrap'
  category: text("category").notNull(), // 'infrastructure', 'security', 'artifacts', 'monitoring'
  severity: text("severity").notNull(), // 'info', 'warning', 'error', 'critical'
  status: text("status").notNull(), // 'initiated', 'in_progress', 'completed', 'failed'
  title: text("title").notNull(),
  description: text("description"),
  affectedServices: text("affected_services").array(),
  environment: text("environment"),
  initiatedBy: text("initiated_by"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in seconds
  outcome: text("outcome"), // 'success', 'failure', 'partial_success'
  errorDetails: text("error_details"),
  relatedEventIds: text("related_event_ids").array(), // Related events
  metadata: jsonb("metadata"),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at")
}, (table) => [
  index("platform_continuity_event_type_idx").on(table.eventType),
  index("platform_continuity_severity_idx").on(table.severity),
  index("platform_continuity_status_idx").on(table.status),
  index("platform_continuity_started_at_idx").on(table.startedAt)
]);

// Insert schemas for Platform Continuity tables
export const insertSecretsVaultSchema = createInsertSchema(secretsVault).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSecretsRotationHistorySchema = createInsertSchema(secretsRotationHistory).omit({
  id: true,
  startedAt: true,
});

export const insertArtifactStorageSchema = createInsertSchema(artifactStorage).omit({
  id: true,
  createdAt: true,
});

export const insertDeploymentHistorySchema = createInsertSchema(deploymentHistory).omit({
  id: true,
  startedAt: true,
});

export const insertEnvironmentConfigurationsSchema = createInsertSchema(environmentConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformContinuityEventsSchema = createInsertSchema(platformContinuityEvents).omit({
  id: true,
  startedAt: true,
});

// Type definitions for Platform Continuity
export type InsertSecretsVault = z.infer<typeof insertSecretsVaultSchema>;
export type SecretsVault = typeof secretsVault.$inferSelect;
export type InsertSecretsRotationHistory = z.infer<typeof insertSecretsRotationHistorySchema>;
export type SecretsRotationHistory = typeof secretsRotationHistory.$inferSelect;
export type InsertArtifactStorage = z.infer<typeof insertArtifactStorageSchema>;
export type ArtifactStorage = typeof artifactStorage.$inferSelect;
export type InsertDeploymentHistory = z.infer<typeof insertDeploymentHistorySchema>;
export type DeploymentHistory = typeof deploymentHistory.$inferSelect;
export type InsertEnvironmentConfigurations = z.infer<typeof insertEnvironmentConfigurationsSchema>;
export type EnvironmentConfigurations = typeof environmentConfigurations.$inferSelect;
export type InsertPlatformContinuityEvents = z.infer<typeof insertPlatformContinuityEventsSchema>;
export type PlatformContinuityEvents = typeof platformContinuityEvents.$inferSelect;

// ============================================================================
// TRACK 4: MONITORING & RUNBOOKS SCHEMA
// ============================================================================

/**
 * Synthetic Failover Drill System
 */
export const failoverDrillConfigurations = pgTable("failover_drill_configurations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  drillType: text("drill_type").notNull(), // 'database_failover', 'backup_restore', 'full_disaster_recovery', 'service_connectivity'
  scenario: text("scenario").notNull(), // 'primary_db_failure', 'backup_corruption', 'complete_outage', 'partial_outage'
  schedule: text("schedule"), // Cron expression for automated scheduling
  isEnabled: boolean("is_enabled").default(true),
  
  // Target metrics
  expectedRtoSeconds: integer("expected_rto_seconds").notNull(),
  expectedRpoSeconds: integer("expected_rpo_seconds").notNull(),
  successCriteria: jsonb("success_criteria"), // JSON criteria for success
  
  // Test configuration
  testEnvironment: text("test_environment").notNull(), // 'staging', 'test', 'isolated'
  affectedServices: text("affected_services").array(),
  testDataSizeLimit: bigint("test_data_size_limit", { mode: "number" }), // Max data size for test
  timeoutMinutes: integer("timeout_minutes").default(60),
  
  // Notification settings
  notifyOnStart: boolean("notify_on_start").default(true),
  notifyOnSuccess: boolean("notify_on_success").default(true),
  notifyOnFailure: boolean("notify_on_failure").default(true),
  notificationChannels: text("notification_channels").array(), // ['email', 'sms', 'webhook']
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("drill_config_type_idx").on(table.drillType),
  index("drill_config_enabled_idx").on(table.isEnabled),
  index("drill_config_scenario_idx").on(table.scenario),
]);

export const drillExecutions = pgTable("drill_executions", {
  id: serial("id").primaryKey(),
  executionId: varchar("execution_id").notNull().unique(),
  configurationId: integer("configuration_id").references(() => failoverDrillConfigurations.id).notNull(),
  
  // Execution details
  status: text("status").notNull(), // 'queued', 'running', 'completed', 'failed', 'timeout', 'cancelled'
  triggerType: text("trigger_type").notNull(), // 'scheduled', 'manual', 'automated'
  triggeredBy: text("triggered_by"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in seconds
  
  // Performance metrics
  actualRtoSeconds: integer("actual_rto_seconds"),
  actualRpoSeconds: integer("actual_rpo_seconds"),
  rtoAchieved: boolean("rto_achieved").default(false),
  rpoAchieved: boolean("rpo_achieved").default(false),
  successScore: numeric("success_score", { precision: 5, scale: 2 }), // 0-100%
  
  // Detailed results
  stepResults: jsonb("step_results"), // Array of step execution results
  performanceMetrics: jsonb("performance_metrics"), // Detailed performance data
  validationResults: jsonb("validation_results"), // Data integrity validation
  logs: text("logs").array(),
  
  // Error tracking
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  failureReason: text("failure_reason"),
  
  // Environment details
  testEnvironmentId: text("test_environment_id"),
  testDatabaseUrl: text("test_database_url"),
  testBranchId: text("test_branch_id"),
  
  // Cleanup tracking
  cleanupCompleted: boolean("cleanup_completed").default(false),
  cleanupAt: timestamp("cleanup_at"),
  
  metadata: jsonb("metadata"),
}, (table) => [
  index("drill_exec_config_id_idx").on(table.configurationId),
  index("drill_exec_status_idx").on(table.status),
  index("drill_exec_started_at_idx").on(table.startedAt),
  index("drill_exec_trigger_type_idx").on(table.triggerType),
]);

export const drillSteps = pgTable("drill_steps", {
  id: serial("id").primaryKey(),
  executionId: varchar("execution_id").references(() => drillExecutions.executionId).notNull(),
  stepOrder: integer("step_order").notNull(),
  stepName: text("step_name").notNull(),
  stepType: text("step_type").notNull(), // 'failover', 'restore', 'validate', 'health_check', 'cleanup'
  description: text("description"),
  
  // Execution tracking
  status: text("status").notNull(), // 'pending', 'running', 'completed', 'failed', 'skipped'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in seconds
  
  // Results
  isSuccessful: boolean("is_successful").default(false),
  output: jsonb("output"), // Step output data
  metrics: jsonb("metrics"), // Step-specific metrics
  
  // Error tracking
  errorMessage: text("error_message"),
  errorCode: varchar("error_code"),
  retryCount: integer("retry_count").default(0),
  
  metadata: jsonb("metadata"),
}, (table) => [
  index("drill_steps_execution_id_idx").on(table.executionId),
  index("drill_steps_status_idx").on(table.status),
  index("drill_steps_step_type_idx").on(table.stepType),
]);

/**
 * Backup Success Alert System
 */
export const backupMonitoringConfigurations = pgTable("backup_monitoring_configurations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Monitoring scope
  monitoringType: text("monitoring_type").notNull(), // 'all_backups', 'policy_specific', 'storage_location', 'backup_type'
  backupTypes: text("backup_types").array(), // ['neon_snapshot', 's3_export', 'schema_backup']
  storageLocationIds: integer("storage_location_ids").array(),
  policyIds: integer("policy_ids").array(),
  
  // Alert thresholds
  failureRateThreshold: numeric("failure_rate_threshold", { precision: 5, scale: 2 }), // Percentage
  missingBackupThresholdHours: integer("missing_backup_threshold_hours").default(25), // Hours
  backupSizeVarianceThreshold: numeric("backup_size_variance_threshold", { precision: 5, scale: 2 }), // Percentage
  
  // Integrity checking
  enableIntegrityChecks: boolean("enable_integrity_checks").default(true),
  integrityCheckFrequency: text("integrity_check_frequency"), // 'daily', 'weekly', 'monthly'
  corruptionDetectionEnabled: boolean("corruption_detection_enabled").default(true),
  
  // Alert configuration
  isEnabled: boolean("is_enabled").default(true),
  alertChannels: text("alert_channels").array(), // ['email', 'sms', 'webhook', 'dashboard']
  escalationRules: jsonb("escalation_rules"), // Escalation configuration
  suppressionDuration: integer("suppression_duration").default(3600), // Seconds
  
  // Notification targets
  alertEmails: text("alert_emails").array(),
  webhookUrls: text("webhook_urls").array(),
  alertSeverity: text("alert_severity").default('high'), // 'low', 'medium', 'high', 'critical'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("backup_monitoring_type_idx").on(table.monitoringType),
  index("backup_monitoring_enabled_idx").on(table.isEnabled),
]);

export const backupAlerts = pgTable("backup_alerts", {
  id: serial("id").primaryKey(),
  alertId: varchar("alert_id").notNull().unique(),
  configurationId: integer("configuration_id").references(() => backupMonitoringConfigurations.id),
  
  // Alert details
  alertType: text("alert_type").notNull(), // 'backup_failure', 'missing_backup', 'corruption_detected', 'threshold_exceeded'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Related entities
  backupOperationId: integer("backup_operation_id").references(() => backupOperations.id),
  affectedBackupTypes: text("affected_backup_types").array(),
  affectedStorageLocations: text("affected_storage_locations").array(),
  
  // Alert status
  status: text("status").notNull(), // 'active', 'acknowledged', 'resolved', 'suppressed'
  createdAt: timestamp("created_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  
  // Delivery tracking
  notificationsSent: integer("notifications_sent").default(0),
  lastNotificationAt: timestamp("last_notification_at"),
  escalationLevel: integer("escalation_level").default(0),
  
  // Details
  alertData: jsonb("alert_data"), // Additional alert context
  thresholdValues: jsonb("threshold_values"), // Threshold breach details
  affectedMetrics: jsonb("affected_metrics"),
  
  metadata: jsonb("metadata"),
}, (table) => [
  index("backup_alerts_type_idx").on(table.alertType),
  index("backup_alerts_severity_idx").on(table.severity),
  index("backup_alerts_status_idx").on(table.status),
  index("backup_alerts_created_at_idx").on(table.createdAt),
]);

export const backupHealthMetrics = pgTable("backup_health_metrics", {
  id: serial("id").primaryKey(),
  metricDate: timestamp("metric_date").notNull(),
  metricType: text("metric_type").notNull(), // 'daily', 'weekly', 'monthly'
  
  // Success rate metrics
  totalBackups: integer("total_backups").default(0),
  successfulBackups: integer("successful_backups").default(0),
  failedBackups: integer("failed_backups").default(0),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }), // Percentage
  
  // Performance metrics
  averageBackupDuration: integer("average_backup_duration"), // Seconds
  averageBackupSize: bigint("average_backup_size", { mode: "number" }), // Bytes
  totalStorageUsed: bigint("total_storage_used", { mode: "number" }), // Bytes
  
  // Retention compliance
  retentionCompliance: numeric("retention_compliance", { precision: 5, scale: 2 }), // Percentage
  expiredBackupsCount: integer("expired_backups_count").default(0),
  
  // Breakdown by type
  metricsByType: jsonb("metrics_by_type"), // Breakdown by backup type
  metricsByLocation: jsonb("metrics_by_location"), // Breakdown by storage location
  
  // Health indicators
  healthScore: numeric("health_score", { precision: 5, scale: 2 }), // 0-100%
  riskLevel: text("risk_level"), // 'low', 'medium', 'high', 'critical'
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("backup_health_metrics_date_idx").on(table.metricDate),
  index("backup_health_metrics_type_idx").on(table.metricType),
  index("backup_health_metrics_created_at_idx").on(table.createdAt),
]);

/**
 * RTO/RPO Performance Tracking
 */
export const rtoRpoTargets = pgTable("rto_rpo_targets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Service/Component identification
  serviceType: text("service_type").notNull(), // 'database', 'application', 'storage', 'full_system'
  serviceName: text("service_name"),
  component: text("component"), // Specific component within service
  
  // Target objectives
  rtoTargetSeconds: integer("rto_target_seconds").notNull(), // Recovery Time Objective
  rpoTargetSeconds: integer("rpo_target_seconds").notNull(), // Recovery Point Objective
  
  // SLA requirements
  availabilityTarget: numeric("availability_target", { precision: 5, scale: 2 }), // 99.9%
  businessCriticality: text("business_criticality").notNull(), // 'low', 'medium', 'high', 'critical'
  
  // Compliance requirements
  regulatoryRequirements: text("regulatory_requirements").array(),
  complianceFrameworks: text("compliance_frameworks").array(), // ['SOC2', 'GDPR', 'HIPAA']
  
  // Measurement configuration
  measurementFrequency: text("measurement_frequency").default('hourly'), // 'hourly', 'daily', 'weekly'
  alertThresholds: jsonb("alert_thresholds"), // When to alert on RTO/RPO misses
  
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("rto_rpo_targets_service_type_idx").on(table.serviceType),
  index("rto_rpo_targets_criticality_idx").on(table.businessCriticality),
  index("rto_rpo_targets_active_idx").on(table.isActive),
]);

export const rtoRpoMeasurements = pgTable("rto_rpo_measurements", {
  id: serial("id").primaryKey(),
  measurementId: varchar("measurement_id").notNull().unique(),
  targetId: integer("target_id").references(() => rtoRpoTargets.id).notNull(),
  
  // Measurement details
  measurementType: text("measurement_type").notNull(), // 'drill', 'real_incident', 'automated_test'
  incidentType: text("incident_type"), // 'planned_maintenance', 'unplanned_outage', 'disaster_recovery'
  
  // Actual measurements
  actualRtoSeconds: integer("actual_rto_seconds"),
  actualRpoSeconds: integer("actual_rpo_seconds"),
  
  // Target achievement
  rtoAchieved: boolean("rto_achieved"),
  rpoAchieved: boolean("rpo_achieved"),
  rtoVariance: integer("rto_variance"), // Seconds above/below target
  rpoVariance: integer("rpo_variance"), // Seconds above/below target
  
  // Context
  outageStartTime: timestamp("outage_start_time"),
  recoveryStartTime: timestamp("recovery_start_time"),
  recoveryCompleteTime: timestamp("recovery_complete_time"),
  dataLossWindowStart: timestamp("data_loss_window_start"),
  dataLossWindowEnd: timestamp("data_loss_window_end"),
  
  // Related entities
  drillExecutionId: integer("drill_execution_id").references(() => drillExecutions.id),
  backupOperationId: integer("backup_operation_id").references(() => backupOperations.id),
  restoreValidationId: integer("restore_validation_id").references(() => restoreValidations.id),
  
  // Performance details
  performanceMetrics: jsonb("performance_metrics"),
  recoverySteps: jsonb("recovery_steps"), // Steps taken during recovery
  
  // Quality indicators
  dataIntegrityScore: numeric("data_integrity_score", { precision: 5, scale: 2 }),
  performanceScore: numeric("performance_score", { precision: 5, scale: 2 }),
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
  
  notes: text("notes"),
  measuredBy: text("measured_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("rto_rpo_measurements_target_id_idx").on(table.targetId),
  index("rto_rpo_measurements_type_idx").on(table.measurementType),
  index("rto_rpo_measurements_achieved_idx").on(table.rtoAchieved, table.rpoAchieved),
  index("rto_rpo_measurements_created_at_idx").on(table.createdAt),
]);

export const performanceBenchmarks = pgTable("performance_benchmarks", {
  id: serial("id").primaryKey(),
  benchmarkName: text("benchmark_name").notNull(),
  description: text("description"),
  
  // Benchmark source
  sourceType: text("source_type").notNull(), // 'industry_standard', 'regulatory', 'internal', 'competitor'
  sourceOrganization: text("source_organization"), // 'NIST', 'ISO', 'internal'
  sourceDocument: text("source_document"),
  version: text("version"),
  
  // Industry/domain context
  industry: text("industry"), // 'financial_services', 'healthcare', 'government', 'general'
  serviceCategory: text("service_category"), // 'database', 'web_application', 'api_service'
  organizationSize: text("organization_size"), // 'startup', 'small', 'medium', 'enterprise'
  
  // Benchmark values
  rtoSecondsMin: integer("rto_seconds_min"),
  rtoSecondsMax: integer("rto_seconds_max"),
  rtoSecondsMedian: integer("rto_seconds_median"),
  rpoSecondsMin: integer("rpo_seconds_min"),
  rpoSecondsMax: integer("rpo_seconds_max"),
  rpoSecondsMedian: integer("rpo_seconds_median"),
  
  // Availability benchmarks
  availabilityMin: numeric("availability_min", { precision: 5, scale: 2 }),
  availabilityMax: numeric("availability_max", { precision: 5, scale: 2 }),
  availabilityMedian: numeric("availability_median", { precision: 5, scale: 2 }),
  
  // Additional metrics
  additionalMetrics: jsonb("additional_metrics"),
  
  isActive: boolean("is_active").default(true),
  publishedDate: timestamp("published_date"),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("benchmarks_source_type_idx").on(table.sourceType),
  index("benchmarks_industry_idx").on(table.industry),
  index("benchmarks_active_idx").on(table.isActive),
]);

/**
 * Incident Runbook Management System
 */
export const incidentRunbooks = pgTable("incident_runbooks", {
  id: serial("id").primaryKey(),
  runbookId: varchar("runbook_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  
  // Runbook classification
  incidentType: text("incident_type").notNull(), // 'database_failure', 'complete_outage', 'security_breach', 'data_corruption'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  category: text("category").notNull(), // 'infrastructure', 'application', 'security', 'data'
  
  // Scope and triggers
  triggerConditions: jsonb("trigger_conditions"), // When this runbook should be used
  affectedServices: text("affected_services").array(),
  prerequisites: text("prerequisites").array(),
  
  // Runbook content
  overview: text("overview"),
  objectives: text("objectives").array(),
  assumptions: text("assumptions").array(),
  
  // Version control
  version: text("version").notNull(),
  previousVersionId: integer("previous_version_id").references(() => incidentRunbooks.id),
  status: text("status").notNull(), // 'draft', 'review', 'approved', 'published', 'archived'
  
  // Approval workflow
  approvalRequired: boolean("approval_required").default(true),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  reviewedBy: text("reviewed_by").array(),
  
  // Execution configuration
  estimatedDuration: integer("estimated_duration"), // Minutes
  automationLevel: text("automation_level").notNull(), // 'manual', 'semi_automated', 'fully_automated'
  requiresEscalation: boolean("requires_escalation").default(false),
  
  // Access control
  accessLevel: text("access_level").notNull(), // 'public', 'internal', 'restricted', 'confidential'
  authorizedRoles: text("authorized_roles").array(),
  authorizedUsers: text("authorized_users").array(),
  
  // Maintenance
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date"),
  reviewFrequencyDays: integer("review_frequency_days").default(365),
  
  // Metrics
  executionCount: integer("execution_count").default(0),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }),
  averageExecutionTime: integer("average_execution_time"), // Minutes
  
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("runbooks_incident_type_idx").on(table.incidentType),
  index("runbooks_severity_idx").on(table.severity),
  index("runbooks_status_idx").on(table.status),
  index("runbooks_access_level_idx").on(table.accessLevel),
]);

export const runbookSteps = pgTable("runbook_steps", {
  id: serial("id").primaryKey(),
  runbookId: varchar("runbook_id").references(() => incidentRunbooks.runbookId).notNull(),
  stepOrder: integer("step_order").notNull(),
  stepId: varchar("step_id").notNull(), // Unique within runbook
  
  // Step details
  title: text("title").notNull(),
  description: text("description"),
  stepType: text("step_type").notNull(), // 'manual', 'automated', 'decision', 'parallel', 'validation'
  
  // Execution details
  instructions: text("instructions"),
  command: text("command"), // For automated steps
  expectedOutput: text("expected_output"),
  estimatedDuration: integer("estimated_duration"), // Minutes
  
  // Dependencies and flow control
  dependsOn: text("depends_on").array(), // Step IDs this depends on
  canRunInParallel: boolean("can_run_in_parallel").default(false),
  isCritical: boolean("is_critical").default(false),
  canSkip: boolean("can_skip").default(false),
  
  // Decision logic (for decision steps)
  decisionCriteria: jsonb("decision_criteria"),
  nextStepConditions: jsonb("next_step_conditions"), // Conditional next steps
  
  // Validation (for validation steps)
  validationChecks: jsonb("validation_checks"),
  successCriteria: jsonb("success_criteria"),
  
  // Rollback
  rollbackInstructions: text("rollback_instructions"),
  rollbackCommand: text("rollback_command"),
  
  // Documentation
  notes: text("notes"),
  references: text("references").array(), // Links to docs, tools, etc.
  troubleshooting: text("troubleshooting"),
  
  metadata: jsonb("metadata"),
}, (table) => [
  index("runbook_steps_runbook_id_idx").on(table.runbookId),
  index("runbook_steps_order_idx").on(table.runbookId, table.stepOrder),
  index("runbook_steps_type_idx").on(table.stepType),
]);

export const runbookContacts = pgTable("runbook_contacts", {
  id: serial("id").primaryKey(),
  contactId: varchar("contact_id").notNull().unique(),
  
  // Contact information
  name: text("name").notNull(),
  title: text("title"),
  department: text("department"),
  organization: text("organization"),
  
  // Contact methods
  primaryEmail: text("primary_email"),
  secondaryEmail: text("secondary_email"),
  primaryPhone: text("primary_phone"),
  secondaryPhone: text("secondary_phone"),
  smsNumber: text("sms_number"),
  slackUserId: text("slack_user_id"),
  
  // Availability
  isAvailable24x7: boolean("is_available_24x7").default(false),
  timezone: text("timezone"),
  businessHours: jsonb("business_hours"), // Daily availability windows
  onCallSchedule: jsonb("on_call_schedule"), // Scheduled on-call periods
  
  // Escalation
  escalationLevel: integer("escalation_level").default(1), // 1=primary, 2=secondary, etc.
  managerContactId: varchar("manager_contact_id").references(() => runbookContacts.contactId),
  backupContactIds: text("backup_contact_ids").array(),
  
  // Specialization
  expertiseAreas: text("expertise_areas").array(), // 'database', 'network', 'security', etc.
  certifications: text("certifications").array(),
  accessLevels: text("access_levels").array(), // What systems they can access
  
  // Contact preferences
  preferredContactMethod: text("preferred_contact_method"), // 'email', 'phone', 'sms', 'slack'
  maxResponseTimeMinutes: integer("max_response_time_minutes"),
  
  // Status tracking
  isActive: boolean("is_active").default(true),
  lastContactedAt: timestamp("last_contacted_at"),
  lastResponseAt: timestamp("last_response_at"),
  responseRate: numeric("response_rate", { precision: 5, scale: 2 }),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("runbook_contacts_name_idx").on(table.name),
  index("runbook_contacts_escalation_idx").on(table.escalationLevel),
  index("runbook_contacts_active_idx").on(table.isActive),
  index("runbook_contacts_24x7_idx").on(table.isAvailable24x7),
]);

export const contactEscalationTrees = pgTable("contact_escalation_trees", {
  id: serial("id").primaryKey(),
  treeId: varchar("tree_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Tree scope
  incidentTypes: text("incident_types").array(), // When this tree applies
  severityLevels: text("severity_levels").array(), // 'low', 'medium', 'high', 'critical'
  affectedServices: text("affected_services").array(),
  
  // Escalation configuration
  escalationSteps: jsonb("escalation_steps"), // Structured escalation flow
  autoEscalationEnabled: boolean("auto_escalation_enabled").default(true),
  escalationIntervalMinutes: integer("escalation_interval_minutes").default(30),
  maxEscalationLevel: integer("max_escalation_level").default(5),
  
  // Notification settings
  simultaneousNotification: boolean("simultaneous_notification").default(false),
  notificationChannels: text("notification_channels").array(),
  
  // Bypass options
  allowBypass: boolean("allow_bypass").default(true),
  bypassAuthorizedRoles: text("bypass_authorized_roles").array(),
  
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("escalation_trees_name_idx").on(table.name),
  index("escalation_trees_active_idx").on(table.isActive),
]);

export const runbookExecutions = pgTable("runbook_executions", {
  id: serial("id").primaryKey(),
  executionId: varchar("execution_id").notNull().unique(),
  runbookId: integer("runbook_id").references(() => incidentRunbooks.id).notNull(),
  
  // Execution context
  incidentId: varchar("incident_id"), // Reference to incident management system
  executionType: text("execution_type").notNull(), // 'emergency', 'planned', 'drill', 'test'
  triggerReason: text("trigger_reason"),
  
  // Execution tracking
  status: text("status").notNull(), // 'pending', 'in_progress', 'completed', 'failed', 'paused', 'cancelled'
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Minutes
  
  // Personnel
  executedBy: text("executed_by").notNull(),
  supervisedBy: text("supervised_by"),
  contactsNotified: text("contacts_notified").array(),
  escalationTreeUsed: varchar("escalation_tree_used").references(() => contactEscalationTrees.treeId),
  
  // Progress tracking
  currentStep: varchar("current_step"), // Current step ID
  completedSteps: text("completed_steps").array(),
  skippedSteps: text("skipped_steps").array(),
  failedSteps: text("failed_steps").array(),
  
  // Results
  isSuccessful: boolean("is_successful"),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }), // Percentage of steps completed successfully
  objectives_achieved: text("objectives_achieved").array(),
  objectives_failed: text("objectives_failed").array(),
  
  // Execution details
  stepResults: jsonb("step_results"), // Results for each step
  decisions: jsonb("decisions"), // Decision points and choices made
  deviations: jsonb("deviations"), // Deviations from standard procedure
  
  // Quality metrics
  adherenceScore: numeric("adherence_score", { precision: 5, scale: 2 }), // How well procedure was followed
  effectivenessScore: numeric("effectiveness_score", { precision: 5, scale: 2 }), // How effective the execution was
  
  // Documentation
  executionNotes: text("execution_notes"),
  lessonsLearned: text("lessons_learned"),
  improvementSuggestions: text("improvement_suggestions"),
  
  // Post-execution
  reviewRequired: boolean("review_required").default(true),
  reviewCompletedAt: timestamp("review_completed_at"),
  reviewedBy: text("reviewed_by"),
  
  metadata: jsonb("metadata"),
}, (table) => [
  index("runbook_exec_runbook_id_idx").on(table.runbookId),
  index("runbook_exec_status_idx").on(table.status),
  index("runbook_exec_started_at_idx").on(table.startedAt),
  index("runbook_exec_executed_by_idx").on(table.executedBy),
]);

// Insert schemas for Track 4 tables
export const insertFailoverDrillConfigurationSchema = createInsertSchema(failoverDrillConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDrillExecutionSchema = createInsertSchema(drillExecutions).omit({
  id: true,
  startedAt: true,
});

export const insertDrillStepSchema = createInsertSchema(drillSteps).omit({
  id: true,
});

export const insertBackupMonitoringConfigurationSchema = createInsertSchema(backupMonitoringConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBackupAlertSchema = createInsertSchema(backupAlerts).omit({
  id: true,
  createdAt: true,
});

export const insertBackupHealthMetricSchema = createInsertSchema(backupHealthMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertRtoRpoTargetSchema = createInsertSchema(rtoRpoTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRtoRpoMeasurementSchema = createInsertSchema(rtoRpoMeasurements).omit({
  id: true,
  createdAt: true,
});

export const insertPerformanceBenchmarkSchema = createInsertSchema(performanceBenchmarks).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentRunbookSchema = createInsertSchema(incidentRunbooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRunbookStepSchema = createInsertSchema(runbookSteps).omit({
  id: true,
});

export const insertRunbookContactSchema = createInsertSchema(runbookContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactEscalationTreeSchema = createInsertSchema(contactEscalationTrees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRunbookExecutionSchema = createInsertSchema(runbookExecutions).omit({
  id: true,
  startedAt: true,
});

// Track 4 type definitions
export type FailoverDrillConfiguration = typeof failoverDrillConfigurations.$inferSelect;
export type InsertFailoverDrillConfiguration = z.infer<typeof insertFailoverDrillConfigurationSchema>;
export type DrillExecution = typeof drillExecutions.$inferSelect;
export type InsertDrillExecution = z.infer<typeof insertDrillExecutionSchema>;
export type DrillStep = typeof drillSteps.$inferSelect;
export type InsertDrillStep = z.infer<typeof insertDrillStepSchema>;

export type BackupMonitoringConfiguration = typeof backupMonitoringConfigurations.$inferSelect;
export type InsertBackupMonitoringConfiguration = z.infer<typeof insertBackupMonitoringConfigurationSchema>;
export type BackupAlert = typeof backupAlerts.$inferSelect;
export type InsertBackupAlert = z.infer<typeof insertBackupAlertSchema>;
export type BackupHealthMetric = typeof backupHealthMetrics.$inferSelect;
export type InsertBackupHealthMetric = z.infer<typeof insertBackupHealthMetricSchema>;

export type RtoRpoTarget = typeof rtoRpoTargets.$inferSelect;
export type InsertRtoRpoTarget = z.infer<typeof insertRtoRpoTargetSchema>;
export type RtoRpoMeasurement = typeof rtoRpoMeasurements.$inferSelect;
export type InsertRtoRpoMeasurement = z.infer<typeof insertRtoRpoMeasurementSchema>;
export type PerformanceBenchmark = typeof performanceBenchmarks.$inferSelect;
export type InsertPerformanceBenchmark = z.infer<typeof insertPerformanceBenchmarkSchema>;

export type IncidentRunbook = typeof incidentRunbooks.$inferSelect;
export type InsertIncidentRunbook = z.infer<typeof insertIncidentRunbookSchema>;
export type RunbookStep = typeof runbookSteps.$inferSelect;
export type InsertRunbookStep = z.infer<typeof insertRunbookStepSchema>;
export type RunbookContact = typeof runbookContacts.$inferSelect;
export type InsertRunbookContact = z.infer<typeof insertRunbookContactSchema>;
export type ContactEscalationTree = typeof contactEscalationTrees.$inferSelect;
export type InsertContactEscalationTree = z.infer<typeof insertContactEscalationTreeSchema>;
export type RunbookExecution = typeof runbookExecutions.$inferSelect;
export type InsertRunbookExecution = z.infer<typeof insertRunbookExecutionSchema>;

// Track 4 Monitoring & Runbooks Filter Interfaces
export interface DrillFilters {
  status?: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  drillType?: string;
  scenario?: string;
  triggerType?: 'manual' | 'scheduled' | 'event_driven';
  dateRange?: { start: Date; end: Date };
}

export interface BackupAlertFilters {
  alertType?: 'backup_failure' | 'missing_backup' | 'corruption_detected' | 'threshold_exceeded';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  dateRange?: { start: Date; end: Date };
}

export interface RunbookFilters {
  category?: 'database' | 'network' | 'security' | 'application';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'draft' | 'review' | 'approved' | 'active' | 'deprecated';
  accessLevel?: 'public' | 'internal' | 'restricted' | 'confidential';
}

// Dashboard API Types and Schemas
export const dashboardUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  emailVerified: z.boolean(),
  joinedAt: z.string().datetime(),
  daysSinceJoining: z.number().int().min(0),
});

export const dashboardWatchlistItemSchema = z.object({
  id: z.number().int().positive(),
  created_at: z.string().datetime(),
  title: z.string(),
  location: z.string(),
  date: z.string().datetime(),
  type: z.string(),
  level: z.string(),
  subtitle: z.string().optional(),
  state: z.string(),
  offices: z.array(z.string()).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const dashboardRecommendationSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  location: z.string(),
  date: z.string().datetime(),
  type: z.string(),
  level: z.string(),
  candidate_count: z.number().int().min(0),
  subtitle: z.string().optional(),
  state: z.string(),
  offices: z.array(z.string()).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const dashboardStatsSchema = z.object({
  savedElections: z.number().int().min(0),
  totalUpcomingElections: z.number().int().min(0),
  watchlistActivity: z.number().int().min(0),
});

export const dashboardQuickActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  path: z.string().optional(),
  action: z.string().optional(),
});

export const dashboardResponseSchema = z.object({
  user: dashboardUserSchema,
  watchlist: z.array(dashboardWatchlistItemSchema),
  recommendations: z.array(dashboardRecommendationSchema),
  stats: dashboardStatsSchema,
  quickActions: z.array(dashboardQuickActionSchema),
});

// Dashboard Types
export type DashboardUser = z.infer<typeof dashboardUserSchema>;
export type DashboardWatchlistItem = z.infer<typeof dashboardWatchlistItemSchema>;
export type DashboardRecommendation = z.infer<typeof dashboardRecommendationSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type DashboardQuickAction = z.infer<typeof dashboardQuickActionSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;

// =============================================================================
// RECOMMENDATION SYSTEM INSERT SCHEMAS AND TYPES
// =============================================================================

// Insert schemas for recommendation tables
export const insertElectionRecommendationSchema = createInsertSchema(electionRecommendations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRecommendationAnalyticsSchema = createInsertSchema(userRecommendationAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecommendationCacheSchema = createInsertSchema(recommendationCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Recommendation system types
export type ElectionRecommendation = typeof electionRecommendations.$inferSelect;
export type InsertElectionRecommendation = z.infer<typeof insertElectionRecommendationSchema>;

export type UserRecommendationAnalytics = typeof userRecommendationAnalytics.$inferSelect;
export type InsertUserRecommendationAnalytics = z.infer<typeof insertUserRecommendationAnalyticsSchema>;

export type RecommendationCache = typeof recommendationCache.$inferSelect;
export type InsertRecommendationCache = z.infer<typeof insertRecommendationCacheSchema>;

// Note: Enhanced watchlist types (WatchlistItem, InsertWatchlistItem) 
// are already defined earlier in this file and now include enhanced fields

// Recommendation API types for frontend
export const recommendationRequestSchema = z.object({
  userId: z.string(),
  limit: z.number().int().min(1).max(50).default(10),
  type: z.enum(['location_based', 'interest_based', 'trending', 'similar_users']).optional(),
  includeExpired: z.boolean().default(false),
  cacheKey: z.string().optional(),
});

export const recommendationResponseSchema = z.object({
  recommendations: z.array(z.object({
    id: z.number(),
    election: z.object({
      id: z.number(),
      title: z.string(),
      subtitle: z.string().optional(),
      location: z.string(),
      state: z.string(),
      date: z.string(),
      type: z.string(),
      level: z.string(),
      offices: z.array(z.string()).optional(),
      description: z.string().optional(),
    }),
    score: z.number(),
    type: z.string(),
    reason: z.string(),
    isPresented: z.boolean().default(false),
    isViewed: z.boolean().default(false),
    isClicked: z.boolean().default(false),
    isAddedToWatchlist: z.boolean().default(false),
    isDismissed: z.boolean().default(false),
  })),
  totalCount: z.number(),
  cacheKey: z.string().optional(),
  generatedAt: z.string(),
});

export const watchlistAnalyticsSchema = z.object({
  totalItems: z.number(),
  byStatus: z.record(z.number()),
  byCategory: z.record(z.number()),
  byPriority: z.record(z.number()),
  recentlyAdded: z.number(),
  upcomingElections: z.number(),
  completedElections: z.number(),
});

export const enhancedWatchlistResponseSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    priority: z.string(),
    category: z.string().optional(),
    status: z.string(),
    tags: z.array(z.string()),
    notes: z.string().optional(),
    addedVia: z.string(),
    interactionCount: z.number(),
    lastInteraction: z.string().optional(),
    notificationsEnabled: z.boolean(),
    reminderDaysBefore: z.number(),
    election: z.object({
      id: z.number(),
      title: z.string(),
      subtitle: z.string().optional(),
      location: z.string(),
      state: z.string(),
      date: z.string(),
      type: z.string(),
      level: z.string(),
      offices: z.array(z.string()).optional(),
      description: z.string().optional(),
    }),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  analytics: watchlistAnalyticsSchema,
  totalCount: z.number(),
  hasMore: z.boolean(),
});

// API request/response types
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type WatchlistAnalytics = z.infer<typeof watchlistAnalyticsSchema>;
export type EnhancedWatchlistResponse = z.infer<typeof enhancedWatchlistResponseSchema>;

// =============================================================================
// COMPREHENSIVE USER ENGAGEMENT TRACKING AND ANALYTICS SCHEMA
// =============================================================================

// User Events - Track all user interactions for engagement analytics
export const userEvents = pgTable("user_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id), // Can be null for anonymous events
  sessionId: varchar("session_id").notNull(), // Track anonymous sessions
  
  // Event Details
  eventType: text("event_type").notNull(), // 'page_view', 'click', 'form_submit', 'search', 'api_call'
  eventAction: text("event_action"), // 'login', 'register', 'add_to_watchlist', 'view_election', 'compare_candidates'
  eventCategory: text("event_category"), // 'authentication', 'navigation', 'engagement', 'conversion'
  
  // Page/Context Information
  pageUrl: text("page_url").notNull(),
  pagePath: text("page_path").notNull(), // Normalized path for grouping
  pageTitle: text("page_title"),
  referrerUrl: text("referrer_url"),
  
  // Target/Content Information
  targetType: text("target_type"), // 'election', 'candidate', 'watchlist_item', 'user_preference'
  targetId: integer("target_id"), // ID of the target object
  targetMetadata: jsonb("target_metadata"), // Additional context about the target
  
  // User Experience Metrics
  timeOnPage: integer("time_on_page"), // seconds spent on page
  scrollDepth: integer("scroll_depth"), // percentage scrolled
  clickPosition: jsonb("click_position"), // {x, y} coordinates for click events
  
  // Technical Context
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"), // Anonymized for privacy
  deviceType: text("device_type"), // 'desktop', 'mobile', 'tablet'
  browserName: text("browser_name"),
  screenResolution: text("screen_resolution"),
  
  // UTM and Campaign Tracking
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"), 
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  
  // Privacy and Consent
  isAnonymous: boolean("is_anonymous").default(false), // User opted for anonymous tracking
  consentLevel: text("consent_level").default('basic'), // 'none', 'basic', 'analytics', 'full'
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_events_user_id_idx").on(table.userId),
  index("user_events_session_id_idx").on(table.sessionId),
  index("user_events_type_idx").on(table.eventType),
  index("user_events_action_idx").on(table.eventAction),
  index("user_events_created_at_idx").on(table.createdAt),
  index("user_events_page_path_idx").on(table.pagePath),
  index("user_events_target_idx").on(table.targetType, table.targetId),
]);

// Enhanced User Sessions for Analytics
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id), // Can be null for anonymous sessions
  
  // Session Lifecycle
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  duration: integer("duration"), // Total session duration in seconds
  isActive: boolean("is_active").default(true),
  
  // Session Context
  entryPage: text("entry_page").notNull(), // First page visited
  exitPage: text("exit_page"), // Last page visited
  referrerUrl: text("referrer_url"),
  landingCampaign: jsonb("landing_campaign"), // UTM parameters at session start
  
  // Session Metrics
  pageViews: integer("page_views").default(0),
  uniquePageViews: integer("unique_page_views").default(0),
  eventsCount: integer("events_count").default(0),
  conversionEvents: integer("conversion_events").default(0), // High-value actions
  
  // User Experience
  bounceRate: boolean("is_bounce").default(false), // Single page session < 10 seconds
  avgPageLoadTime: integer("avg_page_load_time"), // milliseconds
  avgTimeOnPage: integer("avg_time_on_page"), // seconds
  maxScrollDepth: integer("max_scroll_depth"), // highest scroll percentage
  
  // Technical Information
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"), // Anonymized
  deviceType: text("device_type"),
  browserName: text("browser_name"),
  operatingSystem: text("operating_system"),
  screenResolution: text("screen_resolution"),
  
  // Geo Information (anonymized to city level for privacy)
  country: text("country"),
  region: text("region"),
  city: text("city"),
  timezone: text("timezone"),
  
  // Privacy Controls
  trackingConsent: text("tracking_consent").default('basic'), // Level of tracking consent
  isAnonymized: boolean("is_anonymized").default(false),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_sessions_user_id_idx").on(table.userId),
  index("user_sessions_started_at_idx").on(table.startedAt),
  index("user_sessions_active_idx").on(table.isActive),
  index("user_sessions_duration_idx").on(table.duration),
  index("user_sessions_entry_page_idx").on(table.entryPage),
]);

// Conversion Funnel Tracking
export const conversionFunnels = pgTable("conversion_funnels", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  
  // Funnel Definition
  funnelName: text("funnel_name").notNull(), // 'registration', 'activation', 'engagement', 'retention'
  funnelVersion: text("funnel_version").default('1.0'), // For A/B testing different funnel flows
  
  // Funnel Progress
  currentStep: text("current_step").notNull(), // Current step in the funnel
  stepOrder: integer("step_order").notNull(), // Numeric order of current step
  totalSteps: integer("total_steps").notNull(), // Total steps in this funnel
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  
  // Step Progression Tracking
  stepsCompleted: text("steps_completed").array(), // Array of completed step names
  stepTimestamps: jsonb("step_timestamps"), // {step_name: timestamp} mapping
  stepDurations: jsonb("step_durations"), // Time spent on each step in seconds
  dropOffStep: text("drop_off_step"), // Step where user dropped off
  dropOffReason: text("drop_off_reason"), // 'abandoned', 'error', 'redirect'
  
  // Performance Metrics
  timeToComplete: integer("time_to_complete"), // Total time from start to completion in seconds
  attemptNumber: integer("attempt_number").default(1), // How many times user attempted this funnel
  conversionValue: numeric("conversion_value", { precision: 10, scale: 2 }), // Business value of conversion
  
  // Context and Attribution
  entryPoint: text("entry_point"), // How user entered this funnel
  campaignData: jsonb("campaign_data"), // UTM and campaign attribution
  deviceContext: jsonb("device_context"), // Device/browser info at funnel start
  
  // A/B Testing Support
  experimentId: text("experiment_id"), // A/B test experiment identifier
  variantId: text("variant_id"), // A/B test variant
  cohortId: text("cohort_id"), // User cohort for analysis
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("conversion_funnels_user_id_idx").on(table.userId),
  index("conversion_funnels_session_id_idx").on(table.sessionId),
  index("conversion_funnels_name_idx").on(table.funnelName),
  index("conversion_funnels_step_idx").on(table.currentStep),
  index("conversion_funnels_completed_idx").on(table.isCompleted),
  index("conversion_funnels_created_at_idx").on(table.createdAt),
  index("conversion_funnels_cohort_idx").on(table.cohortId),
]);

// User Engagement Scoring
export const userEngagementScores = pgTable("user_engagement_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Time Periods for Scoring
  scoreDate: timestamp("score_date").notNull(), // Date this score represents
  scorePeriod: text("score_period").notNull(), // 'daily', 'weekly', 'monthly'
  
  // Core Engagement Metrics
  totalScore: numeric("total_score", { precision: 8, scale: 2 }).notNull(),
  loginFrequency: numeric("login_frequency", { precision: 5, scale: 2 }).default('0'),
  sessionDuration: numeric("session_duration", { precision: 5, scale: 2 }).default('0'),
  pageViewDepth: numeric("page_view_depth", { precision: 5, scale: 2 }).default('0'),
  featureUsage: numeric("feature_usage", { precision: 5, scale: 2 }).default('0'),
  contentInteraction: numeric("content_interaction", { precision: 5, scale: 2 }).default('0'),
  
  // Specific Platform Engagement
  watchlistActivity: numeric("watchlist_activity", { precision: 5, scale: 2 }).default('0'),
  electionViews: numeric("election_views", { precision: 5, scale: 2 }).default('0'),
  candidateComparisons: numeric("candidate_comparisons", { precision: 5, scale: 2 }).default('0'),
  preferencesUpdates: numeric("preferences_updates", { precision: 5, scale: 2 }).default('0'),
  notificationEngagement: numeric("notification_engagement", { precision: 5, scale: 2 }).default('0'),
  
  // Social and Sharing Behavior
  shareActivity: numeric("share_activity", { precision: 5, scale: 2 }).default('0'),
  referralActivity: numeric("referral_activity", { precision: 5, scale: 2 }).default('0'),
  
  // Quality Indicators
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }), // Based on time spent, repeat visits
  retentionRisk: numeric("retention_risk", { precision: 5, scale: 2 }), // Churn prediction score
  loyaltyScore: numeric("loyalty_score", { precision: 5, scale: 2 }), // Long-term engagement
  
  // Calculated Segments
  engagementTier: text("engagement_tier"), // 'low', 'medium', 'high', 'power_user'
  userSegment: text("user_segment"), // 'new', 'casual', 'regular', 'champion', 'at_risk'
  nextBestAction: text("next_best_action"), // Recommended action to increase engagement
  
  // Score Calculation Metadata
  calculationMethod: text("calculation_method").default('v1.0'), // Algorithm version
  dataPoints: integer("data_points"), // Number of events used in calculation
  confidenceLevel: numeric("confidence_level", { precision: 3, scale: 2 }), // Statistical confidence
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_engagement_scores_user_id_idx").on(table.userId),
  index("user_engagement_scores_date_idx").on(table.scoreDate),
  index("user_engagement_scores_period_idx").on(table.scorePeriod),
  index("user_engagement_scores_total_idx").on(table.totalScore),
  index("user_engagement_scores_tier_idx").on(table.engagementTier),
  index("user_engagement_scores_segment_idx").on(table.userSegment),
]);

// User Journey Paths for Flow Analysis
export const userJourneyPaths = pgTable("user_journey_paths", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  
  // Path Information
  pathName: text("path_name"), // Named common paths like 'registration_flow', 'election_discovery'
  pathSequence: text("path_sequence").array().notNull(), // Array of page/action sequences
  pathLength: integer("path_length").notNull(), // Number of steps in path
  
  // Path Timing
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  totalDuration: integer("total_duration"), // Total time for entire path in seconds
  stepDurations: integer("step_durations").array(), // Time spent on each step
  
  // Path Outcome
  isCompleted: boolean("is_completed").default(false),
  conversionValue: numeric("conversion_value", { precision: 10, scale: 2 }), // Business value
  exitPoint: text("exit_point"), // Where user left the path
  exitReason: text("exit_reason"), // 'completed', 'abandoned', 'error', 'redirect'
  
  // Path Context
  entryPoint: text("entry_point").notNull(), // How user entered this path
  deviceType: text("device_type"),
  campaignAttribution: jsonb("campaign_attribution"), // UTM data
  
  // Common Path Patterns (for analysis)
  isCommonPath: boolean("is_common_path").default(false), // Identified as common user flow
  pathVariant: text("path_variant"), // Different versions of same logical path
  pathEfficiency: numeric("path_efficiency", { precision: 5, scale: 2 }), // Completion rate for this path type
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_journey_paths_user_id_idx").on(table.userId),
  index("user_journey_paths_session_id_idx").on(table.sessionId),
  index("user_journey_paths_name_idx").on(table.pathName),
  index("user_journey_paths_completed_idx").on(table.isCompleted),
  index("user_journey_paths_entry_idx").on(table.entryPoint),
  index("user_journey_paths_common_idx").on(table.isCommonPath),
]);

// Analytics Preferences and Privacy Controls
export const analyticsPreferences = pgTable("analytics_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  
  // Consent and Privacy Settings
  hasConsented: boolean("has_consented").default(false),
  consentDate: timestamp("consent_date"),
  consentVersion: text("consent_version"), // Track which privacy policy version
  trackingLevel: text("tracking_level").default('basic'), // 'none', 'basic', 'analytics', 'full'
  
  // Granular Consent Controls
  allowPageViewTracking: boolean("allow_page_view_tracking").default(true),
  allowClickTracking: boolean("allow_click_tracking").default(true),
  allowSessionTracking: boolean("allow_session_tracking").default(true),
  allowEngagementScoring: boolean("allow_engagement_scoring").default(true),
  allowPersonalization: boolean("allow_personalization").default(true),
  allowMarketingAnalytics: boolean("allow_marketing_analytics").default(false),
  
  // Data Retention Preferences
  dataRetentionPeriod: integer("data_retention_period").default(365), // Days to retain data
  allowDataExport: boolean("allow_data_export").default(true),
  allowDataDeletion: boolean("allow_data_deletion").default(true),
  
  // Analytics Features Opt-in/out
  allowEngagementNotifications: boolean("allow_engagement_notifications").default(false),
  allowUsageReports: boolean("allow_usage_reports").default(false),
  allowBenchmarkComparisons: boolean("allow_benchmark_comparisons").default(false),
  
  // Privacy Controls
  anonymizeData: boolean("anonymize_data").default(false), // Remove PII from analytics
  allowThirdPartyIntegrations: boolean("allow_third_party_integrations").default(false),
  allowCrossDeviceTracking: boolean("allow_cross_device_tracking").default(false),
  
  // Preference Management
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: text("updated_by"), // 'user', 'admin', 'system'
  auditTrail: jsonb("audit_trail"), // Track changes to preferences
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("analytics_preferences_user_id_idx").on(table.userId),
  index("analytics_preferences_consent_idx").on(table.hasConsented),
  index("analytics_preferences_tracking_level_idx").on(table.trackingLevel),
]);

// Daily/Weekly/Monthly Analytics Aggregations for Performance
export const analyticsAggregations = pgTable("analytics_aggregations", {
  id: serial("id").primaryKey(),
  
  // Aggregation Metadata
  aggregationType: text("aggregation_type").notNull(), // 'daily', 'weekly', 'monthly'
  aggregationDate: timestamp("aggregation_date").notNull(), // Date being aggregated
  
  // User Metrics
  totalUsers: integer("total_users").default(0),
  activeUsers: integer("active_users").default(0),
  newUsers: integer("new_users").default(0),
  returningUsers: integer("returning_users").default(0),
  
  // Session Metrics
  totalSessions: integer("total_sessions").default(0),
  averageSessionDuration: numeric("average_session_duration", { precision: 8, scale: 2 }).default('0'),
  bounceRate: numeric("bounce_rate", { precision: 5, scale: 2 }).default('0'),
  pagesPerSession: numeric("pages_per_session", { precision: 5, scale: 2 }).default('0'),
  
  // Engagement Metrics
  totalPageViews: integer("total_page_views").default(0),
  totalEvents: integer("total_events").default(0),
  averageEngagementScore: numeric("average_engagement_score", { precision: 8, scale: 2 }).default('0'),
  
  // Conversion Metrics
  conversionEvents: integer("conversion_events").default(0),
  funnelCompletions: integer("funnel_completions").default(0),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }).default('0'),
  
  // Platform-Specific Metrics
  watchlistAdditions: integer("watchlist_additions").default(0),
  electionViews: integer("election_views").default(0),
  candidateComparisons: integer("candidate_comparisons").default(0),
  
  // User Segments
  powerUsers: integer("power_users").default(0),
  regularUsers: integer("regular_users").default(0),
  casualUsers: integer("casual_users").default(0),
  atRiskUsers: integer("at_risk_users").default(0),
  
  // Technical Performance
  averagePageLoadTime: numeric("average_page_load_time", { precision: 8, scale: 2 }).default('0'),
  errorRate: numeric("error_rate", { precision: 5, scale: 2 }).default('0'),
  
  // Data Quality
  recordsProcessed: integer("records_processed").default(0),
  dataCompleteness: numeric("data_completeness", { precision: 5, scale: 2 }).default('100'),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("analytics_aggregations_type_idx").on(table.aggregationType),
  index("analytics_aggregations_date_idx").on(table.aggregationDate),
  index("analytics_aggregations_created_at_idx").on(table.createdAt),
]);

// =============================================================================
// DATA VALIDATION & QUALITY ASSURANCE SCHEMA
// =============================================================================

// Validation Results - Track all validation checks performed on data
export const validationResults = pgTable("validation_results", {
  id: serial("id").primaryKey(),
  
  // What was validated
  entityType: text("entity_type").notNull(), // 'election', 'candidate', 'congress_member', 'polling_data'
  entityId: integer("entity_id").notNull(), // ID of the entity validated
  
  // Validation details
  validationType: text("validation_type").notNull(), // 'date_rules', 'ai_verification', 'official_source', 'manual_review'
  validationLayer: integer("validation_layer").notNull(), // 1=rules, 2=AI, 3=official sources, 4=manual
  
  // Results
  isValid: boolean("is_valid").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }), // 0-100
  validationStatus: text("validation_status").notNull(), // 'passed', 'failed', 'warning', 'flagged'
  
  // Issues found
  issuesFound: jsonb("issues_found"), // Array of {code, message, severity}
  errorDetails: jsonb("error_details"),
  warnings: text("warnings").array(),
  
  // Source verification
  sourcesChecked: text("sources_checked").array(), // URLs or API names checked
  sourceAgreement: numeric("source_agreement", { precision: 5, scale: 2 }), // % of sources agreeing
  
  // Fix tracking
  autoFixApplied: boolean("auto_fix_applied").default(false),
  fixDetails: jsonb("fix_details"),
  requiresManualReview: boolean("requires_manual_review").default(false),
  
  // Metadata
  validatedBy: text("validated_by"), // 'system', 'ai', 'user_id'
  validatedAt: timestamp("validated_at").defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("validation_results_entity_idx").on(table.entityType, table.entityId),
  index("validation_results_type_idx").on(table.validationType),
  index("validation_results_status_idx").on(table.validationStatus),
  index("validation_results_manual_review_idx").on(table.requiresManualReview),
  index("validation_results_validated_at_idx").on(table.validatedAt),
]);

// Data Provenance - Track where data came from and verification timestamps
export const dataProvenance = pgTable("data_provenance", {
  id: serial("id").primaryKey(),
  
  // What this provenance record is for
  entityType: text("entity_type").notNull(), // 'election', 'candidate', 'congress_member', 'polling_data'
  entityId: integer("entity_id").notNull(),
  fieldName: text("field_name"), // Specific field if applicable (e.g., 'date', 'party')
  
  // Source information
  sourceType: text("source_type").notNull(), // 'google_civic_api', 'manual_entry', 'bulk_import', 'perplexity_ai', 'sos_website'
  sourceUrl: text("source_url"), // Original source URL
  sourceApiEndpoint: text("source_api_endpoint"), // API endpoint used
  sourceDocumentation: text("source_documentation"), // Link to source docs
  
  // Data quality
  dataQualityRating: text("data_quality_rating"), // 'excellent', 'good', 'fair', 'poor', 'unverified'
  isOfficialSource: boolean("is_official_source").default(false), // .gov or official
  isVerified: boolean("is_verified").default(false),
  verificationMethod: text("verification_method"), // How it was verified
  
  // Timestamps
  dataCollectedAt: timestamp("data_collected_at"),
  lastVerifiedAt: timestamp("last_verified_at"),
  expiresAt: timestamp("expires_at"), // When data should be re-verified
  
  // Import/Entry metadata
  importBatchId: text("import_batch_id"), // Group related imports
  enteredBy: text("entered_by"), // user_id or 'system'
  importMethod: text("import_method"), // 'api_sync', 'bulk_import', 'manual', 'ai_enrichment'
  
  // Change tracking
  previousValue: text("previous_value"),
  currentValue: text("current_value"),
  changeReason: text("change_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("data_provenance_entity_idx").on(table.entityType, table.entityId),
  index("data_provenance_source_type_idx").on(table.sourceType),
  index("data_provenance_official_idx").on(table.isOfficialSource),
  index("data_provenance_verified_idx").on(table.isVerified),
  index("data_provenance_batch_idx").on(table.importBatchId),
]);

// Audit Runs - Track automated data quality audits
export const auditRuns = pgTable("audit_runs", {
  id: serial("id").primaryKey(),
  auditId: varchar("audit_id").notNull().unique(), // UUID for tracking
  
  // Audit configuration
  auditType: text("audit_type").notNull(), // 'daily_validation', 'weekly_deep_scan', 'on_demand', 'import_validation'
  auditScope: text("audit_scope").notNull(), // 'all_elections', 'recent_updates', 'specific_state', 'all_candidates'
  scopeFilters: jsonb("scope_filters"), // Additional filters applied
  
  // Execution tracking
  status: text("status").notNull(), // 'queued', 'running', 'completed', 'failed', 'partial'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // seconds
  
  // Results summary
  totalEntitiesChecked: integer("total_entities_checked").default(0),
  issuesFound: integer("issues_found").default(0),
  criticalIssues: integer("critical_issues").default(0),
  warningsFound: integer("warnings_found").default(0),
  autoFixesApplied: integer("auto_fixes_applied").default(0),
  manualReviewsQueued: integer("manual_reviews_queued").default(0),
  
  // Detailed results
  issueBreakdown: jsonb("issue_breakdown"), // {type: count} mapping
  affectedEntities: jsonb("affected_entities"), // Array of {type, id, issues}
  validationSummary: jsonb("validation_summary"),
  
  // Performance metrics
  avgValidationTime: numeric("avg_validation_time", { precision: 8, scale: 2 }), // ms per entity
  apiCallsMade: integer("api_calls_made").default(0),
  cacheHitRate: numeric("cache_hit_rate", { precision: 5, scale: 2 }),
  
  // Error tracking
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  
  // Audit metadata
  triggeredBy: text("triggered_by"), // 'scheduler', 'user_id', 'api_import', 'manual'
  auditVersion: text("audit_version").default('1.0'), // Audit rules version
  
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("audit_runs_audit_id_idx").on(table.auditId),
  index("audit_runs_type_idx").on(table.auditType),
  index("audit_runs_status_idx").on(table.status),
  index("audit_runs_started_at_idx").on(table.startedAt),
  index("audit_runs_issues_found_idx").on(table.issuesFound),
]);

// Manual Review Queue - Issues flagged for human verification
export const manualReviewQueue = pgTable("manual_review_queue", {
  id: serial("id").primaryKey(),
  reviewId: varchar("review_id").notNull().unique(), // UUID for tracking
  
  // What needs review
  entityType: text("entity_type").notNull(), // 'election', 'candidate', 'congress_member'
  entityId: integer("entity_id").notNull(),
  fieldName: text("field_name"), // Specific field with issue
  
  // Issue details
  issueType: text("issue_type").notNull(), // 'incorrect_date', 'missing_data', 'conflicting_sources', 'suspicious_data'
  issueSeverity: text("issue_severity").notNull(), // 'critical', 'high', 'medium', 'low'
  issueDescription: text("issue_description").notNull(),
  issueDetails: jsonb("issue_details"),
  
  // Current vs Expected
  currentValue: text("current_value"),
  suggestedValue: text("suggested_value"),
  suggestedFix: jsonb("suggested_fix"), // Auto-generated fix suggestion
  conflictingSources: jsonb("conflicting_sources"), // Sources that disagree
  
  // Review status
  reviewStatus: text("review_status").notNull().default('pending'), // 'pending', 'in_review', 'resolved', 'dismissed', 'escalated'
  priority: integer("priority").default(50), // 0-100, higher = more urgent
  
  // Assignment
  assignedTo: varchar("assigned_to"), // user_id of reviewer
  assignedAt: timestamp("assigned_at"),
  
  // Resolution tracking
  resolvedBy: varchar("resolved_by"), // user_id
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"), // 'fixed', 'dismissed_incorrect', 'dismissed_duplicate', 'escalated'
  resolutionNotes: text("resolution_notes"),
  fixApplied: jsonb("fix_applied"), // What fix was applied
  
  // Related validation
  validationResultId: integer("validation_result_id").references(() => validationResults.id),
  auditRunId: integer("audit_run_id").references(() => auditRuns.id),
  
  // Auto-review attempt
  autoReviewAttempted: boolean("auto_review_attempted").default(false),
  autoReviewConfidence: numeric("auto_review_confidence", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("manual_review_queue_entity_idx").on(table.entityType, table.entityId),
  index("manual_review_queue_status_idx").on(table.reviewStatus),
  index("manual_review_queue_severity_idx").on(table.issueSeverity),
  index("manual_review_queue_priority_idx").on(table.priority),
  index("manual_review_queue_assigned_idx").on(table.assignedTo),
  index("manual_review_queue_created_at_idx").on(table.createdAt),
]);

// Insert Schemas for Analytics Tables
export const insertUserEventSchema = createInsertSchema(userEvents).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  updatedAt: true,
});

export const insertConversionFunnelSchema = createInsertSchema(conversionFunnels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserEngagementScoreSchema = createInsertSchema(userEngagementScores).omit({
  id: true,
  createdAt: true,
});

export const insertUserJourneyPathSchema = createInsertSchema(userJourneyPaths).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsPreferencesSchema = createInsertSchema(analyticsPreferences).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertAnalyticsAggregationSchema = createInsertSchema(analyticsAggregations).omit({
  id: true,
  createdAt: true,
});

// Insert Schemas for Validation Tables
export const insertValidationResultSchema = createInsertSchema(validationResults).omit({
  id: true,
  validatedAt: true,
});

export const insertDataProvenanceSchema = createInsertSchema(dataProvenance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditRunSchema = createInsertSchema(auditRuns).omit({
  id: true,
  createdAt: true,
});

export const insertManualReviewQueueSchema = createInsertSchema(manualReviewQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Validation Types
export type ValidationResult = typeof validationResults.$inferSelect;
export type InsertValidationResult = z.infer<typeof insertValidationResultSchema>;

export type DataProvenance = typeof dataProvenance.$inferSelect;
export type InsertDataProvenance = z.infer<typeof insertDataProvenanceSchema>;

export type AuditRun = typeof auditRuns.$inferSelect;
export type InsertAuditRun = z.infer<typeof insertAuditRunSchema>;

export type ManualReviewQueue = typeof manualReviewQueue.$inferSelect;
export type InsertManualReviewQueue = z.infer<typeof insertManualReviewQueueSchema>;

// Analytics Types
export type UserEvent = typeof userEvents.$inferSelect;
export type InsertUserEvent = z.infer<typeof insertUserEventSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type ConversionFunnel = typeof conversionFunnels.$inferSelect;
export type InsertConversionFunnel = z.infer<typeof insertConversionFunnelSchema>;

export type UserEngagementScore = typeof userEngagementScores.$inferSelect;
export type InsertUserEngagementScore = z.infer<typeof insertUserEngagementScoreSchema>;

export type UserJourneyPath = typeof userJourneyPaths.$inferSelect;
export type InsertUserJourneyPath = z.infer<typeof insertUserJourneyPathSchema>;

export type AnalyticsPreferences = typeof analyticsPreferences.$inferSelect;
export type InsertAnalyticsPreferences = z.infer<typeof insertAnalyticsPreferencesSchema>;

export type AnalyticsAggregation = typeof analyticsAggregations.$inferSelect;
export type InsertAnalyticsAggregation = z.infer<typeof insertAnalyticsAggregationSchema>;

// Analytics API Response Schemas
export const analyticsOverviewSchema = z.object({
  timeframe: z.string(),
  users: z.object({
    total: z.number(),
    active: z.number(),
    new: z.number(),
    returning: z.number(),
    growthRate: z.number(),
  }),
  sessions: z.object({
    total: z.number(),
    averageDuration: z.number(),
    bounceRate: z.number(),
    pagesPerSession: z.number(),
  }),
  engagement: z.object({
    averageScore: z.number(),
    topFeatures: z.array(z.object({
      feature: z.string(),
      usage: z.number(),
      growth: z.number(),
    })),
    userSegments: z.object({
      powerUsers: z.number(),
      regularUsers: z.number(),
      casualUsers: z.number(),
      atRiskUsers: z.number(),
    }),
  }),
  conversions: z.object({
    registrationRate: z.number(),
    activationRate: z.number(),
    retentionRate: z.number(),
    funnelPerformance: z.array(z.object({
      step: z.string(),
      completionRate: z.number(),
      dropOffRate: z.number(),
    })),
  }),
});

export const userJourneyAnalysisSchema = z.object({
  commonPaths: z.array(z.object({
    path: z.array(z.string()),
    frequency: z.number(),
    averageDuration: z.number(),
    completionRate: z.number(),
  })),
  entryPoints: z.array(z.object({
    page: z.string(),
    visits: z.number(),
    conversionRate: z.number(),
  })),
  exitPoints: z.array(z.object({
    page: z.string(),
    exitRate: z.number(),
    reason: z.string(),
  })),
  conversionPaths: z.array(z.object({
    path: z.array(z.string()),
    value: z.number(),
    timeToConvert: z.number(),
  })),
});

export const engagementReportSchema = z.object({
  period: z.string(),
  overallScore: z.number(),
  trendDirection: z.string(),
  keyMetrics: z.object({
    dailyActiveUsers: z.number(),
    weeklyActiveUsers: z.number(),
    monthlyActiveUsers: z.number(),
    averageSessionTime: z.number(),
    featureAdoptionRate: z.number(),
  }),
  segmentAnalysis: z.array(z.object({
    segment: z.string(),
    users: z.number(),
    score: z.number(),
    trend: z.string(),
    recommendations: z.array(z.string()),
  })),
  featureUsage: z.array(z.object({
    feature: z.string(),
    usage: z.number(),
    growth: z.number(),
    satisfaction: z.number(),
  })),
});

// API Response Types
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type UserJourneyAnalysis = z.infer<typeof userJourneyAnalysisSchema>;
export type EngagementReport = z.infer<typeof engagementReportSchema>;

// =============================================================================
// POLITICAL ANALYSIS TYPES AND SCHEMAS
// =============================================================================

// Insert Schemas for Political Analysis Tables
export const insertPollingDataSchema = createInsertSchema(pollingData).omit({
  id: true,
  createdAt: true,
});

export const insertUserVotingIntentionsSchema = createInsertSchema(userVotingIntentions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPoliticalMomentumSchema = createInsertSchema(politicalMomentum).omit({
  id: true,
  calculatedAt: true,
});

// Political Analysis Types
export type PollingData = typeof pollingData.$inferSelect;
export type InsertPollingData = z.infer<typeof insertPollingDataSchema>;

export type UserVotingIntention = typeof userVotingIntentions.$inferSelect;
export type InsertUserVotingIntention = z.infer<typeof insertUserVotingIntentionsSchema>;

export type PoliticalMomentum = typeof politicalMomentum.$inferSelect;
export type InsertPoliticalMomentum = z.infer<typeof insertPoliticalMomentumSchema>;

// Political Analysis API Schemas
export const politicalAnalysisResponseSchema = z.object({
  leaning: z.enum(['left', 'right', 'split', 'neutral']),
  intensity: z.enum(['low', 'medium', 'high']),
  baseline: z.enum(['red', 'blue', 'purple']),
  isShifting: z.boolean(),
  shiftDirection: z.enum(['red-to-blue', 'blue-to-red']).optional(),
  competitiveness: z.number().min(0).max(1),
  lastUpdated: z.date(),
});

export type PoliticalAnalysisResponse = z.infer<typeof politicalAnalysisResponseSchema>;

