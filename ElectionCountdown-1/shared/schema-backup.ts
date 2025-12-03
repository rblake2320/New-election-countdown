import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, numeric, index } from "drizzle-orm/pg-core";
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
  isIncumbent: boolean("is_incumbent").default(false),
  description: text("description"),
  website: text("website"),
});

// Define relations
export const electionsRelations = relations(elections, ({ many }) => ({
  candidates: many(candidates),
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  election: one(elections, {
    fields: [candidates.electionId],
    references: [elections.id],
  }),
}));

export const insertElectionSchema = createInsertSchema(elections).omit({
  id: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
});

export type Election = typeof elections.$inferSelect;
export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

// Filter types for the frontend
export const filterSchema = z.object({
  timeRange: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional(),
  electionType: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().transform(val =>
    Array.isArray(val) ? val : val ? [val] : undefined
  ),
  level: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().transform(val =>
    Array.isArray(val) ? val : val ? [val] : undefined
  ),
  party: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().transform(val =>
    Array.isArray(val) ? val : val ? [val] : undefined
  ),
  state: z.string().optional(),
  search: z.string().optional(),
});

export type ElectionFilters = z.infer<typeof filterSchema>;

// User tables are defined later for Replit Auth compatibility

export const watchlists = pgTable("watchlists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAnalytics = pgTable("user_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  pageViewed: varchar("page_viewed", { length: 255 }).notNull(),
  timeSpent: integer("time_spent"), // in seconds
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  sessionId: varchar("session_id", { length: 255 }),
});

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  searchQuery: varchar("search_query", { length: 500 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  resultCount: integer("result_count"),
});

// Watchlist relations
export const watchlistRelations = relations(watchlists, ({ one }) => ({
  election: one(elections, {
    fields: [watchlists.electionId],
    references: [elections.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const watchlistsRelations = relations(watchlists, ({ one }) => ({
  user: one(users, {
    fields: [watchlists.userId],
    references: [users.id],
  }),
  election: one(elections, {
    fields: [watchlists.electionId],
    references: [elections.id],
  }),
}));

export const userAnalyticsRelations = relations(userAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [userAnalytics.userId],
    references: [users.id],
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
}));

// User insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlists).omit({
  id: true,
  createdAt: true,
});

export const insertUserAnalyticsSchema = createInsertSchema(userAnalytics).omit({
  id: true,
  timestamp: true,
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  timestamp: true,
});

// User types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type Watchlist = typeof watchlists.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type UserAnalytics = typeof userAnalytics.$inferSelect;
export type InsertUserAnalytics = z.infer<typeof insertUserAnalyticsSchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;

// Election Cycles for Version Control
export const electionCycles = pgTable("election_cycles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'midterm', 'presidential', 'special'
  description: text("description"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced User Analytics
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  politicalAffiliation: varchar("political_affiliation", { length: 50 }),
  interests: text("interests").array(),
  notificationSettings: jsonb("notification_settings"),
  privacyLevel: varchar("privacy_level", { length: 20 }).default('standard'), // 'minimal', 'standard', 'full'
  consentGiven: boolean("consent_given").default(false),
  consentDate: timestamp("consent_date"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userDemographics = pgTable("user_demographics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ageRange: varchar("age_range", { length: 20 }),
  state: varchar("state", { length: 2 }),
  district: varchar("district", { length: 10 }),
  voterRegistrationStatus: varchar("voter_registration_status", { length: 20 }),
  lastVoted: timestamp("last_voted"),
  isFirstTimeVoter: boolean("is_first_time_voter"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interactionLogs = pgTable("interaction_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'click', 'hover', 'scroll', 'view'
  targetType: varchar("target_type", { length: 50 }), // 'election', 'candidate', 'filter'
  targetId: integer("target_id"),
  metadata: jsonb("metadata"), // additional event data
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // anonymized
});

export const engagementMetrics = pgTable("engagement_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  timeOnPage: integer("time_on_page"), // seconds
  scrollDepth: integer("scroll_depth"), // percentage
  sharesCount: integer("shares_count").default(0),
  electionCycleId: integer("election_cycle_id").references(() => electionCycles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nonVoterTracking = pgTable("non_voter_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  reasonNotVoting: text("reason_not_voting"),
  barriers: text("barriers").array(),
  interestLevel: integer("interest_level"), // 1-10 scale
  lastVotedYear: integer("last_voted_year"),
  willingnessToRegister: integer("willingness_to_register"), // 1-10 scale
  preferredOutreach: varchar("preferred_outreach", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for new tables
export const electionCyclesRelations = relations(electionCycles, ({ many }) => ({
  elections: many(elections),
  engagementMetrics: many(engagementMetrics),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const userDemographicsRelations = relations(userDemographics, ({ one }) => ({
  user: one(users, {
    fields: [userDemographics.userId],
    references: [users.id],
  }),
}));

export const interactionLogsRelations = relations(interactionLogs, ({ one }) => ({
  user: one(users, {
    fields: [interactionLogs.userId],
    references: [users.id],
  }),
}));

export const engagementMetricsRelations = relations(engagementMetrics, ({ one }) => ({
  user: one(users, {
    fields: [engagementMetrics.userId],
    references: [users.id],
  }),
  electionCycle: one(electionCycles, {
    fields: [engagementMetrics.electionCycleId],
    references: [electionCycles.id],
  }),
}));

export const nonVoterTrackingRelations = relations(nonVoterTracking, ({ one }) => ({
  user: one(users, {
    fields: [nonVoterTracking.userId],
    references: [users.id],
  }),
}));

// Update elections table to link with cycles
export const electionsWithCycleRelations = relations(elections, ({ many, one }) => ({
  candidates: many(candidates),
  electionCycle: one(electionCycles, {
    fields: [elections.id], // Will need to add electionCycleId to elections table
    references: [electionCycles.id],
  }),
}));

// Insert schemas for new tables
export const insertElectionCycleSchema = createInsertSchema(electionCycles).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  updatedAt: true,
});

export const insertUserDemographicsSchema = createInsertSchema(userDemographics).omit({
  id: true,
  updatedAt: true,
});

export const insertInteractionLogSchema = createInsertSchema(interactionLogs).omit({
  id: true,
  timestamp: true,
});

export const insertEngagementMetricsSchema = createInsertSchema(engagementMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertNonVoterTrackingSchema = createInsertSchema(nonVoterTracking).omit({
  id: true,
  updatedAt: true,
});

// Types for new tables
export type ElectionCycle = typeof electionCycles.$inferSelect;
export type InsertElectionCycle = z.infer<typeof insertElectionCycleSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserDemographics = typeof userDemographics.$inferSelect;
export type InsertUserDemographics = z.infer<typeof insertUserDemographicsSchema>;
export type InteractionLog = typeof interactionLogs.$inferSelect;
export type InsertInteractionLog = z.infer<typeof insertInteractionLogSchema>;
export type EngagementMetrics = typeof engagementMetrics.$inferSelect;
export type InsertEngagementMetrics = z.infer<typeof insertEngagementMetricsSchema>;
export type NonVoterTracking = typeof nonVoterTracking.$inferSelect;
export type InsertNonVoterTracking = z.infer<typeof insertNonVoterTrackingSchema>;

// Campaign Data Marketplace Tables
export const campaignAccounts = pgTable("campaign_accounts", {
  id: serial("id").primaryKey(),
  campaignName: varchar("campaign_name", { length: 255 }).notNull(),
  candidateName: varchar("candidate_name", { length: 255 }).notNull(),
  officeSeeking: varchar("office_seeking", { length: 255 }).notNull(),
  electionId: integer("election_id").references(() => elections.id),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  verifiedStatus: boolean("verified_status").default(false),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default('basic'), // 'basic', 'pro', 'enterprise', 'custom'
  subscriptionStart: timestamp("subscription_start"),
  subscriptionEnd: timestamp("subscription_end"),
  apiKey: varchar("api_key", { length: 255 }).unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaignAccessLogs = pgTable("campaign_access_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaignAccounts.id).notNull(),
  endpointAccessed: varchar("endpoint_accessed", { length: 255 }).notNull(),
  datasetType: varchar("dataset_type", { length: 100 }),
  cost: integer("cost"), // in cents
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const dataPurchases = pgTable("data_purchases", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaignAccounts.id).notNull(),
  datasetType: varchar("dataset_type", { length: 100 }).notNull(),
  price: integer("price").notNull(), // in cents
  downloadDate: timestamp("download_date").defaultNow().notNull(),
  dataRange: varchar("data_range", { length: 100 }), // '30_days', '90_days', etc.
  format: varchar("format", { length: 20 }).default('json'), // 'json', 'csv', 'xlsx'
});

export const pollingResults = pgTable("polling_results", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  demographic: jsonb("demographic"), // age, gender, party, etc.
  candidatePreferences: jsonb("candidate_preferences"),
  sampleSize: integer("sample_size"),
  marginOfError: integer("margin_of_error"), // in basis points (e.g., 350 = 3.5%)
  conductedDate: timestamp("conducted_date").notNull(),
  pollingOrganization: varchar("polling_organization", { length: 255 }),
  isPublic: boolean("is_public").default(false),
});

// Anonymized Data Aggregation Tables
export const userSegments = pgTable("user_segments", {
  id: serial("id").primaryKey(),
  segmentName: varchar("segment_name", { length: 255 }).notNull(),
  criteria: jsonb("criteria"), // anonymized criteria
  userCount: integer("user_count").notNull(),
  electionId: integer("election_id").references(() => elections.id),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const geographicClusters = pgTable("geographic_clusters", {
  id: serial("id").primaryKey(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  interestLevel: integer("interest_level"), // 1-10 scale
  partyLean: varchar("party_lean", { length: 20 }),
  viewCount: integer("view_count").default(0),
  engagementScore: integer("engagement_score"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const userInfluenceScores = pgTable("user_influence_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  influenceScore: integer("influence_score"), // calculated metric
  referralCount: integer("referral_count").default(0),
  engagementLevel: varchar("engagement_level", { length: 20 }), // 'low', 'medium', 'high'
  networkSize: integer("network_size"),
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
});

// Relations for campaign marketplace
export const campaignAccountsRelations = relations(campaignAccounts, ({ many, one }) => ({
  accessLogs: many(campaignAccessLogs),
  purchases: many(dataPurchases),
  election: one(elections, {
    fields: [campaignAccounts.electionId],
    references: [elections.id],
  }),
}));

export const campaignAccessLogsRelations = relations(campaignAccessLogs, ({ one }) => ({
  campaign: one(campaignAccounts, {
    fields: [campaignAccessLogs.campaignId],
    references: [campaignAccounts.id],
  }),
}));

export const dataPurchasesRelations = relations(dataPurchases, ({ one }) => ({
  campaign: one(campaignAccounts, {
    fields: [dataPurchases.campaignId],
    references: [campaignAccounts.id],
  }),
}));

export const pollingResultsRelations = relations(pollingResults, ({ one }) => ({
  election: one(elections, {
    fields: [pollingResults.electionId],
    references: [elections.id],
  }),
}));

export const userSegmentsRelations = relations(userSegments, ({ one }) => ({
  election: one(elections, {
    fields: [userSegments.electionId],
    references: [elections.id],
  }),
}));

export const geographicClustersRelations = relations(geographicClusters, ({ one }) => ({
  election: one(elections, {
    fields: [geographicClusters.electionId],
    references: [elections.id],
  }),
}));

export const userInfluenceScoresRelations = relations(userInfluenceScores, ({ one }) => ({
  user: one(users, {
    fields: [userInfluenceScores.userId],
    references: [users.id],
  }),
}));

// Insert schemas for campaign marketplace
export const insertCampaignAccountSchema = createInsertSchema(campaignAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignAccessLogSchema = createInsertSchema(campaignAccessLogs).omit({
  id: true,
  timestamp: true,
});

export const insertDataPurchaseSchema = createInsertSchema(dataPurchases).omit({
  id: true,
  downloadDate: true,
});

export const insertPollingResultSchema = createInsertSchema(pollingResults).omit({
  id: true,
});

export const insertUserSegmentSchema = createInsertSchema(userSegments).omit({
  id: true,
  lastUpdated: true,
});

export const insertGeographicClusterSchema = createInsertSchema(geographicClusters).omit({
  id: true,
  lastUpdated: true,
});

export const insertUserInfluenceScoreSchema = createInsertSchema(userInfluenceScores).omit({
  id: true,
  lastCalculated: true,
});

// Types for campaign marketplace
export type CampaignAccount = typeof campaignAccounts.$inferSelect;
export type InsertCampaignAccount = z.infer<typeof insertCampaignAccountSchema>;
export type CampaignAccessLog = typeof campaignAccessLogs.$inferSelect;
export type InsertCampaignAccessLog = z.infer<typeof insertCampaignAccessLogSchema>;
export type DataPurchase = typeof dataPurchases.$inferSelect;
export type InsertDataPurchase = z.infer<typeof insertDataPurchaseSchema>;
export type PollingResult = typeof pollingResults.$inferSelect;
export type InsertPollingResult = z.infer<typeof insertPollingResultSchema>;
export type UserSegment = typeof userSegments.$inferSelect;
export type InsertUserSegment = z.infer<typeof insertUserSegmentSchema>;
export type GeographicCluster = typeof geographicClusters.$inferSelect;
export type InsertGeographicCluster = z.infer<typeof insertGeographicClusterSchema>;
export type UserInfluenceScore = typeof userInfluenceScores.$inferSelect;
export type InsertUserInfluenceScore = z.infer<typeof insertUserInfluenceScoreSchema>;

// Bot Prevention & Human Verification Tables
export const userVerification = pgTable("user_verification", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  phoneNumber: varchar("phone_number", { length: 20 }),
  verificationLevel: integer("verification_level").default(0), // 0-4 trust levels
  lastVerified: timestamp("last_verified"),
  riskScore: varchar("risk_score", { length: 5 }).default('0.00'), // 0.00 to 1.00
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const botDetectionLogs = pgTable("bot_detection_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  detectionType: varchar("detection_type", { length: 50 }).notNull(),
  confidenceScore: varchar("confidence_score", { length: 5 }).notNull(),
  actionTaken: varchar("action_taken", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  behaviorData: jsonb("behavior_data"), // Mouse patterns, scroll behavior, etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const userBehaviorMetrics = pgTable("user_behavior_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  mouseMovements: jsonb("mouse_movements"), // Movement patterns
  scrollBehavior: jsonb("scroll_behavior"), // Scroll patterns and speed
  clickPatterns: jsonb("click_patterns"), // Time between clicks, click coordinates
  formFillSpeed: integer("form_fill_speed"), // WPM for form fields
  sessionDuration: integer("session_duration"), // Total session time in seconds
  pageViews: integer("page_views").default(0),
  isHumanLike: boolean("is_human_like").default(true),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const verificationChallenges = pgTable("verification_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  challengeType: varchar("challenge_type", { length: 50 }).notNull(), // 'email', 'sms', 'captcha', 'id'
  challenge: varchar("challenge", { length: 255 }).notNull(), // Code or challenge data
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for verification system
export const userVerificationRelations = relations(userVerification, ({ one }) => ({
  user: one(users, {
    fields: [userVerification.userId],
    references: [users.id],
  }),
}));

export const botDetectionLogsRelations = relations(botDetectionLogs, ({ one }) => ({
  user: one(users, {
    fields: [botDetectionLogs.userId],
    references: [users.id],
  }),
}));

export const userBehaviorMetricsRelations = relations(userBehaviorMetrics, ({ one }) => ({
  user: one(users, {
    fields: [userBehaviorMetrics.userId],
    references: [users.id],
  }),
}));

export const verificationChallengesRelations = relations(verificationChallenges, ({ one }) => ({
  user: one(users, {
    fields: [verificationChallenges.userId],
    references: [users.id],
  }),
}));

// Insert schemas for verification system
export const insertUserVerificationSchema = createInsertSchema(userVerification).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBotDetectionLogSchema = createInsertSchema(botDetectionLogs).omit({
  id: true,
  timestamp: true,
});

export const insertUserBehaviorMetricsSchema = createInsertSchema(userBehaviorMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertVerificationChallengeSchema = createInsertSchema(verificationChallenges).omit({
  id: true,
  createdAt: true,
});

// Types for verification system
export type UserVerification = typeof userVerification.$inferSelect;
export type InsertUserVerification = z.infer<typeof insertUserVerificationSchema>;
export type BotDetectionLog = typeof botDetectionLogs.$inferSelect;
export type InsertBotDetectionLog = z.infer<typeof insertBotDetectionLogSchema>;
export type UserBehaviorMetrics = typeof userBehaviorMetrics.$inferSelect;
export type InsertUserBehaviorMetrics = z.infer<typeof insertUserBehaviorMetricsSchema>;
export type VerificationChallenge = typeof verificationChallenges.$inferSelect;
export type InsertVerificationChallenge = z.infer<typeof insertVerificationChallengeSchema>;

// Verification levels enum
export const VERIFICATION_LEVELS = {
  UNVERIFIED: 0,
  EMAIL_VERIFIED: 1,
  PHONE_VERIFIED: 2,
  BEHAVIOR_VERIFIED: 3,
  ID_VERIFIED: 4
} as const;

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const authUsers = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof authUsers.$inferInsert;
export type AuthUser = typeof authUsers.$inferSelect;

// Congressional data tables
export const congressMembers = pgTable("congress_members", {
  id: serial("id").primaryKey(),
  bioguideId: varchar("bioguide_id", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  party: varchar("party", { length: 50 }),
  state: varchar("state", { length: 2 }),
  chamber: varchar("chamber", { length: 10 }), // 'House' or 'Senate'
  district: varchar("district", { length: 10 }),
  congress: integer("congress"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const congressBills = pgTable("congress_bills", {
  id: serial("id").primaryKey(),
  congress: integer("congress").notNull(),
  billType: varchar("bill_type", { length: 10 }).notNull(),
  billNumber: varchar("bill_number", { length: 20 }).notNull(),
  title: text("title").notNull(),
  introducedDate: timestamp("introduced_date"),
  latestAction: jsonb("latest_action"),
  sponsors: jsonb("sponsors"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const congressCommittees = pgTable("congress_committees", {
  id: serial("id").primaryKey(),
  systemCode: varchar("system_code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  chamber: varchar("chamber", { length: 10 }),
  committeeTypeCode: varchar("committee_type_code", { length: 10 }),
  subcommittees: jsonb("subcommittees"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for congressional data
export const insertCongressMemberSchema = createInsertSchema(congressMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCongressBillSchema = createInsertSchema(congressBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCongressCommitteeSchema = createInsertSchema(congressCommittees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for congressional data
export type CongressMember = typeof congressMembers.$inferSelect;
export type InsertCongressMember = z.infer<typeof insertCongressMemberSchema>;
export type CongressBill = typeof congressBills.$inferSelect;
export type InsertCongressBill = z.infer<typeof insertCongressBillSchema>;
export type CongressCommittee = typeof congressCommittees.$inferSelect;
export type InsertCongressCommittee = z.infer<typeof insertCongressCommitteeSchema>;
