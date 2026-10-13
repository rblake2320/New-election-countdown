var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// scripts/parent-route-private-env.mjs
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { randomBytes } from "node:crypto";
var env = parse(readFileSync("D:/projects/New-election-countdown/.env"));
if (!env.DATABASE_URL) throw new Error("Owner database reference missing");
var url = new URL(env.DATABASE_URL);
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname) || Number(url.port || 5432) !== 5432) throw new Error("Owner database reference is not approved local5432");
url.hostname = "127.0.0.1";
url.pathname = "/et_sol_data_6c78a3148c6b";
if (url.pathname != "/et_sol_data_6c78a3148c6b" || url.pathname === "/elections") throw new Error("Private clone target guard refused");
process.env.DATABASE_URL = url.toString();
process.env.JWT_SECRET = env.JWT_SECRET?.length >= 16 ? env.JWT_SECRET : process.env.JWT_SECRET?.length >= 16 ? process.env.JWT_SECRET : randomBytes(32).toString("hex");
process.env.NODE_ENV = "production";
process.env.SESSION_COOKIE_NAME = "et.parent.review";
delete process.env.VOTESMART_API_KEY;

// scripts/verify_parent_route_private.mjs
import express from "express";
import cookieParser from "cookie-parser";
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, readFileSync as readFileSync2 } from "node:fs";

// server/db.ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analyticsAggregations: () => analyticsAggregations,
  analyticsOverviewSchema: () => analyticsOverviewSchema,
  analyticsPreferences: () => analyticsPreferences,
  artifactStorage: () => artifactStorage,
  auditRuns: () => auditRuns,
  authSessions: () => authSessions,
  backupAlerts: () => backupAlerts,
  backupHealthMetrics: () => backupHealthMetrics,
  backupMonitoringConfigurations: () => backupMonitoringConfigurations,
  backupOperations: () => backupOperations,
  backupRetentionPolicies: () => backupRetentionPolicies,
  backupStorageLocations: () => backupStorageLocations,
  backupSystemConfig: () => backupSystemConfig,
  campaignAccessLogs: () => campaignAccessLogs,
  campaignAccounts: () => campaignAccounts,
  campaignContent: () => campaignContent,
  candidateAccounts: () => candidateAccounts,
  candidateBiography: () => candidateBiography,
  candidateDataSources: () => candidateDataSources,
  candidateIngestRuns: () => candidateIngestRuns,
  candidatePositions: () => candidatePositions,
  candidateProfiles: () => candidateProfiles,
  candidateQA: () => candidateQA,
  candidateResultLines: () => candidateResultLines,
  candidateSourceRecords: () => candidateSourceRecords,
  candidateSubscriptions: () => candidateSubscriptions,
  candidates: () => candidates,
  candidatesRelations: () => candidatesRelations,
  congressBills: () => congressBills,
  congressCommittees: () => congressCommittees,
  congressMembers: () => congressMembers,
  congressOfficialImportRuns: () => congressOfficialImportRuns,
  congressionalDistricts: () => congressionalDistricts,
  contactEscalationTrees: () => contactEscalationTrees,
  conversionFunnels: () => conversionFunnels,
  dashboardQuickActionSchema: () => dashboardQuickActionSchema,
  dashboardRecommendationSchema: () => dashboardRecommendationSchema,
  dashboardResponseSchema: () => dashboardResponseSchema,
  dashboardStatsSchema: () => dashboardStatsSchema,
  dashboardUserSchema: () => dashboardUserSchema,
  dashboardWatchlistItemSchema: () => dashboardWatchlistItemSchema,
  dataProvenance: () => dataProvenance,
  dataPurchases: () => dataPurchases,
  deploymentHistory: () => deploymentHistory,
  drillExecutions: () => drillExecutions,
  drillSteps: () => drillSteps,
  electionCatalogCorrectionRuns: () => electionCatalogCorrectionRuns,
  electionCycles: () => electionCycles,
  electionRecommendations: () => electionRecommendations,
  electionResultReports: () => electionResultReports,
  electionResults: () => electionResults,
  electionResultsRelations: () => electionResultsRelations,
  elections: () => elections,
  electionsRelations: () => electionsRelations,
  emailVerificationTokens: () => emailVerificationTokens,
  engagementReportSchema: () => engagementReportSchema,
  enhancedWatchlistResponseSchema: () => enhancedWatchlistResponseSchema,
  environmentConfigurations: () => environmentConfigurations,
  failoverDrillConfigurations: () => failoverDrillConfigurations,
  filterSchema: () => filterSchema,
  generalCandidateListSnapshots: () => generalCandidateListSnapshots,
  geographicClusters: () => geographicClusters,
  incidentRunbooks: () => incidentRunbooks,
  insertAnalyticsAggregationSchema: () => insertAnalyticsAggregationSchema,
  insertAnalyticsPreferencesSchema: () => insertAnalyticsPreferencesSchema,
  insertArtifactStorageSchema: () => insertArtifactStorageSchema,
  insertAuditRunSchema: () => insertAuditRunSchema,
  insertBackupAlertSchema: () => insertBackupAlertSchema,
  insertBackupHealthMetricSchema: () => insertBackupHealthMetricSchema,
  insertBackupMonitoringConfigurationSchema: () => insertBackupMonitoringConfigurationSchema,
  insertBackupOperationSchema: () => insertBackupOperationSchema,
  insertBackupRetentionPolicySchema: () => insertBackupRetentionPolicySchema,
  insertBackupStorageLocationSchema: () => insertBackupStorageLocationSchema,
  insertBackupSystemConfigSchema: () => insertBackupSystemConfigSchema,
  insertCampaignAccessLogSchema: () => insertCampaignAccessLogSchema,
  insertCampaignAccountSchema: () => insertCampaignAccountSchema,
  insertCampaignContentSchema: () => insertCampaignContentSchema,
  insertCandidatePositionSchema: () => insertCandidatePositionSchema,
  insertCandidateQASchema: () => insertCandidateQASchema,
  insertCandidateSchema: () => insertCandidateSchema,
  insertCandidateSubscriptionSchema: () => insertCandidateSubscriptionSchema,
  insertCongressMemberSchema: () => insertCongressMemberSchema,
  insertCongressionalDistrictSchema: () => insertCongressionalDistrictSchema,
  insertContactEscalationTreeSchema: () => insertContactEscalationTreeSchema,
  insertConversionFunnelSchema: () => insertConversionFunnelSchema,
  insertDataProvenanceSchema: () => insertDataProvenanceSchema,
  insertDataPurchaseSchema: () => insertDataPurchaseSchema,
  insertDeploymentHistorySchema: () => insertDeploymentHistorySchema,
  insertDrillExecutionSchema: () => insertDrillExecutionSchema,
  insertDrillStepSchema: () => insertDrillStepSchema,
  insertElectionRecommendationSchema: () => insertElectionRecommendationSchema,
  insertElectionResultSchema: () => insertElectionResultSchema,
  insertElectionSchema: () => insertElectionSchema,
  insertEnvironmentConfigurationsSchema: () => insertEnvironmentConfigurationsSchema,
  insertFailoverDrillConfigurationSchema: () => insertFailoverDrillConfigurationSchema,
  insertIncidentRunbookSchema: () => insertIncidentRunbookSchema,
  insertManualReviewQueueSchema: () => insertManualReviewQueueSchema,
  insertNotificationCampaignSchema: () => insertNotificationCampaignSchema,
  insertNotificationConsentSchema: () => insertNotificationConsentSchema,
  insertNotificationDeliverySchema: () => insertNotificationDeliverySchema,
  insertNotificationEventSchema: () => insertNotificationEventSchema,
  insertNotificationPreferencesSchema: () => insertNotificationPreferencesSchema,
  insertNotificationSubscriptionSchema: () => insertNotificationSubscriptionSchema,
  insertNotificationTemplateSchema: () => insertNotificationTemplateSchema,
  insertNotificationWebhookSchema: () => insertNotificationWebhookSchema,
  insertPerformanceBenchmarkSchema: () => insertPerformanceBenchmarkSchema,
  insertPlatformContinuityEventsSchema: () => insertPlatformContinuityEventsSchema,
  insertPoliticalMomentumSchema: () => insertPoliticalMomentumSchema,
  insertPollingDataSchema: () => insertPollingDataSchema,
  insertRealTimePollingSchema: () => insertRealTimePollingSchema,
  insertRecommendationCacheSchema: () => insertRecommendationCacheSchema,
  insertRestoreValidationSchema: () => insertRestoreValidationSchema,
  insertRtoRpoMeasurementSchema: () => insertRtoRpoMeasurementSchema,
  insertRtoRpoTargetSchema: () => insertRtoRpoTargetSchema,
  insertRunbookContactSchema: () => insertRunbookContactSchema,
  insertRunbookExecutionSchema: () => insertRunbookExecutionSchema,
  insertRunbookStepSchema: () => insertRunbookStepSchema,
  insertSchemaVersionSchema: () => insertSchemaVersionSchema,
  insertSecretsRotationHistorySchema: () => insertSecretsRotationHistorySchema,
  insertSecretsVaultSchema: () => insertSecretsVaultSchema,
  insertUserEngagementScoreSchema: () => insertUserEngagementScoreSchema,
  insertUserEventSchema: () => insertUserEventSchema,
  insertUserJourneyPathSchema: () => insertUserJourneyPathSchema,
  insertUserPreferencesSchema: () => insertUserPreferencesSchema,
  insertUserRecommendationAnalyticsSchema: () => insertUserRecommendationAnalyticsSchema,
  insertUserSessionSchema: () => insertUserSessionSchema,
  insertUserVotingIntentionsSchema: () => insertUserVotingIntentionsSchema,
  insertValidationResultSchema: () => insertValidationResultSchema,
  insertVoterInteractionSchema: () => insertVoterInteractionSchema,
  insertWatchlistSchema: () => insertWatchlistSchema,
  manualReviewQueue: () => manualReviewQueue,
  notificationCampaigns: () => notificationCampaigns,
  notificationConsents: () => notificationConsents,
  notificationDeliveries: () => notificationDeliveries,
  notificationEvents: () => notificationEvents,
  notificationPreferences: () => notificationPreferences,
  notificationSubscriptions: () => notificationSubscriptions,
  notificationTemplates: () => notificationTemplates,
  notificationWebhooks: () => notificationWebhooks,
  officialResultsSyncRuns: () => officialResultsSyncRuns,
  passwordResetTokens: () => passwordResetTokens,
  performanceBenchmarks: () => performanceBenchmarks,
  platformContinuityEvents: () => platformContinuityEvents,
  politicalAnalysisResponseSchema: () => politicalAnalysisResponseSchema,
  politicalMomentum: () => politicalMomentum,
  pollingData: () => pollingData,
  pollingResults: () => pollingResults,
  realTimePolling: () => realTimePolling,
  recommendationCache: () => recommendationCache,
  recommendationRequestSchema: () => recommendationRequestSchema,
  recommendationResponseSchema: () => recommendationResponseSchema,
  restoreValidations: () => restoreValidations,
  rtoRpoMeasurements: () => rtoRpoMeasurements,
  rtoRpoTargets: () => rtoRpoTargets,
  runbookContacts: () => runbookContacts,
  runbookExecutions: () => runbookExecutions,
  runbookSteps: () => runbookSteps,
  schemaVersions: () => schemaVersions,
  secretsRotationHistory: () => secretsRotationHistory,
  secretsVault: () => secretsVault,
  sessions: () => sessions,
  updateUserPreferencesSchema: () => updateUserPreferencesSchema,
  userEngagementScores: () => userEngagementScores,
  userEvents: () => userEvents,
  userJourneyAnalysisSchema: () => userJourneyAnalysisSchema,
  userJourneyPaths: () => userJourneyPaths,
  userPreferences: () => userPreferences,
  userRecommendationAnalytics: () => userRecommendationAnalytics,
  userSegments: () => userSegments,
  userSessions: () => userSessions,
  userVotingIntentions: () => userVotingIntentions,
  users: () => users,
  usersRelations: () => usersRelations,
  validationResults: () => validationResults,
  voterInteractions: () => voterInteractions,
  watchlist: () => watchlist,
  watchlistAnalyticsSchema: () => watchlistAnalyticsSchema,
  watchlistRelations: () => watchlistRelations
});
import { date, pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, numeric, bigint, index, uniqueIndex, uuid, check, foreignKey } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var elections = pgTable("elections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  location: text("location").notNull(),
  state: text("state").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(),
  // 'primary', 'general', 'special'
  level: text("level").notNull(),
  // 'federal', 'state', 'local'
  offices: text("offices").array(),
  description: text("description"),
  pollsOpen: text("polls_open"),
  pollsClose: text("polls_close"),
  timezone: text("timezone"),
  // Poll-hours provenance (2026-10-11): see server/poll-hours-2026.ts
  pollCloseKind: text("poll_close_kind"),
  // 'polls' | 'ballot_return'
  pollHoursBasis: text("poll_hours_basis"),
  // 'statewide_latest' | 'district_latest' | 'local_variable'
  pollHoursSource: text("poll_hours_source"),
  // primary URL
  officialResultsUrl: text("official_results_url"),
  officialResultsSource: jsonb("official_results_source").$type(),
  isActive: boolean("is_active").default(true)
});
var electionCatalogCorrectionRuns = pgTable("election_catalog_correction_runs", {
  id: serial("id").primaryKey(),
  planSha256: text("plan_sha256").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceFileSha256: text("source_file_sha256").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  receipt: jsonb("receipt").notNull()
});
var candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(),
  // 'D', 'R', 'I', 'G', etc.
  electionId: integer("election_id").references(() => elections.id),
  pollingSupport: integer("polling_support"),
  // percentage
  pollingTrend: text("polling_trend"),
  // 'up', 'down', 'stable'
  lastPollingUpdate: timestamp("last_polling_update"),
  pollingSource: text("polling_source"),
  // Source of polling data
  isIncumbent: boolean("is_incumbent").default(false),
  description: text("description"),
  website: text("website"),
  votesReceived: integer("votes_received"),
  // actual vote count
  votePercentage: numeric("vote_percentage", { precision: 5, scale: 2 }),
  // percentage of total votes
  isWinner: boolean("is_winner").default(false),
  // election winner
  isProjectedWinner: boolean("is_projected_winner").default(false),
  // early projection
  // Data provenance — where this candidate record came from
  fecCandidateId: text("fec_candidate_id"),
  // e.g. 'H6TX21301' — unique FEC ID
  dataSource: text("data_source"),
  // 'fec_bulk' | 'fec_api' | 'editorial_verified' | 'state_ballot'
  sourceStatus: text("source_status"),
  // 'fec_registered' | 'ballot_certified' | 'editorial_verified'
  fecStatus: text("fec_status"),
  // raw FEC CAND_STATUS: C=statutory candidate, F=future, N=not yet, P=prior
  normalizedName: text("normalized_name"),
  // lowercase a-z0-9 for dedupe/collision checks
  // Ballot certification layer — FEC registration is NOT ballot access.
  // Only state SOS / board-of-elections ingestion may set 'certified'.
  ballotStatus: text("ballot_status").default("not_certified"),
  // 'not_certified' | 'certified' | 'withdrawn' | 'disqualified'
  ballotSourceName: text("ballot_source_name"),
  // e.g. 'Texas Secretary of State'
  ballotSourceUrl: text("ballot_source_url"),
  ballotVerifiedAt: timestamp("ballot_verified_at"),
  sourceFileSha256: text("source_file_sha256"),
  // hash of the bulk file this row came from
  sourceSyncedAt: timestamp("source_synced_at"),
  altFecIds: text("alt_fec_ids"),
  // comma-separated duplicate FEC registrations merged into this row
  // Candidate Management Fields
  isVerified: boolean("is_verified").default(false),
  // platform verified candidate
  subscriptionTier: text("subscription_tier"),
  // 'basic', 'premium', 'enterprise'
  profileImageUrl: text("profile_image_url"),
  campaignBio: text("campaign_bio"),
  contactEmail: text("contact_email"),
  campaignPhone: text("campaign_phone"),
  socialMedia: jsonb("social_media"),
  // {twitter, facebook, instagram, tiktok, youtube}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_candidates_fec_candidate_id").on(table.fecCandidateId),
  index("idx_candidates_ballot_status").on(table.ballotStatus),
  index("idx_candidates_election_normalized").on(table.electionId, table.normalizedName)
]);
var candidateSourceRecords = pgTable("candidate_source_records", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  sourceLayer: text("source_layer").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceFileSha256: text("source_file_sha256").notNull(),
  sourceSyncedAt: timestamp("source_synced_at", { withTimezone: true }).notNull(),
  firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull().defaultNow(),
  isCurrent: boolean("is_current").notNull().default(true),
  metadata: jsonb("metadata").notNull()
}, (table) => [
  uniqueIndex("idx_candidate_source_version").on(table.candidateId, table.sourceLayer, table.sourceUrl, table.sourceFileSha256),
  uniqueIndex("idx_candidate_source_current").on(table.candidateId, table.sourceLayer, table.sourceUrl).where(sql`${table.isCurrent} = true`)
]);
var candidateIngestRuns = pgTable("candidate_ingest_runs", {
  id: serial("id").primaryKey(),
  sourceLayer: text("source_layer").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceFileSha256: text("source_file_sha256").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull(),
  receipt: jsonb("receipt").notNull()
});
var officialResultsSyncRuns = pgTable("official_results_sync_runs", {
  id: text("id").primaryKey(),
  operation: text("operation").notNull(),
  manifestSha256: text("manifest_sha256").notNull(),
  preimageSha256: text("preimage_sha256").notNull(),
  postimageSha256: text("postimage_sha256").notNull(),
  targetCount: integer("target_count").notNull(),
  changedCount: integer("changed_count").notNull(),
  changes: jsonb("changes").$type().notNull(),
  rollbackOf: text("rollback_of"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  check("official_results_sync_runs_operation_check", sql`${table.operation} IN ('apply', 'rollback')`),
  check("official_results_sync_runs_manifest_sha256_check", sql`${table.manifestSha256} ~ '^[a-f0-9]{64}$'`),
  check("official_results_sync_runs_preimage_sha256_check", sql`${table.preimageSha256} ~ '^[a-f0-9]{64}$'`),
  check("official_results_sync_runs_postimage_sha256_check", sql`${table.postimageSha256} ~ '^[a-f0-9]{64}$'`),
  check("official_results_sync_runs_target_count_check", sql`${table.targetCount} > 0`),
  check("official_results_sync_runs_changed_count_check", sql`${table.changedCount} >= 0`),
  check("official_results_sync_runs_changes_check", sql`jsonb_typeof(${table.changes}) = 'array'`),
  foreignKey({ columns: [table.rollbackOf], foreignColumns: [table.id], name: "official_results_sync_runs_rollback_of_fkey" }),
  uniqueIndex("official_results_one_rollback").on(table.rollbackOf).where(sql`${table.rollbackOf} IS NOT NULL`)
]);
var generalCandidateListSnapshots = pgTable("general_candidate_list_snapshots", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull().references(() => elections.id),
  scopeKey: text("scope_key").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceFileSha256: text("source_file_sha256").notNull(),
  sourceSyncedAt: timestamp("source_synced_at", { withTimezone: true }).notNull(),
  firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull().defaultNow(),
  isCurrent: boolean("is_current").notNull().default(true),
  metadata: jsonb("metadata").notNull()
}, (table) => [
  uniqueIndex("idx_general_list_snapshot_version").on(table.electionId, table.scopeKey, table.sourceUrl, table.sourceFileSha256),
  uniqueIndex("idx_general_list_snapshot_current").on(table.electionId, table.scopeKey).where(sql`${table.isCurrent} = true`)
]);
var electionResults = pgTable("election_results", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id),
  totalVotes: integer("total_votes"),
  reportingPrecincts: integer("reporting_precincts"),
  totalPrecincts: integer("total_precincts"),
  percentReporting: numeric("percent_reporting", { precision: 5, scale: 2 }),
  isComplete: boolean("is_complete").default(false),
  isCertified: boolean("is_certified").default(false),
  lastUpdated: timestamp("last_updated").defaultNow(),
  resultsSource: text("results_source")
  // 'Associated Press', 'Secretary of State', etc.
});
var electionResultReports = pgTable("election_result_reports", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull().references(() => elections.id),
  revision: text("revision").notNull().unique(),
  status: text("status").notNull(),
  // 'unofficial' | 'certified' — never 'projected'
  sourceId: text("source_id").notNull(),
  sourceKind: text("source_kind").notNull(),
  // official_state_enr | official_state_page | official_county | ap | admin_manual
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceContestId: text("source_contest_id").notNull(),
  sourcePayloadSha256: text("source_payload_sha256").notNull(),
  inputSha256: text("input_sha256").notNull(),
  asOf: timestamp("as_of", { withTimezone: true }),
  asOfBasis: text("as_of_basis").notNull(),
  // source_timestamp | source_publication_time | not_provided
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
  reportingPercent: numeric("reporting_percent", { precision: 5, scale: 2 }),
  reportingBasis: text("reporting_basis"),
  // precincts | ballots | votes | source_unspecified
  precinctsReporting: integer("precincts_reporting"),
  precinctsTotal: integer("precincts_total"),
  totalVotes: bigint("total_votes", { mode: "number" }),
  winnerCalledSource: text("winner_called_source"),
  winnerCalledUrl: text("winner_called_url"),
  winnerCalledAt: timestamp("winner_called_at", { withTimezone: true }),
  certificationUrl: text("certification_url"),
  certifiedAt: timestamp("certified_at", { withTimezone: true }),
  // race context the snapshot was recorded under (immutable; reads require it to equal the live row)
  contextState: text("context_state").notNull(),
  contextElectionDate: date("context_election_date").notNull(),
  contextType: text("context_type").notNull(),
  contextLevel: text("context_level").notNull(),
  contextOffice: text("context_office").notNull(),
  postedBy: text("posted_by").notNull(),
  idempotencyKey: text("idempotency_key").unique(),
  note: text("note"),
  supersedesReportId: integer("supersedes_report_id").references(() => electionResultReports.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var candidateResultLines = pgTable("candidate_result_lines", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => electionResultReports.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id").references(() => candidates.id),
  sourceCandidateId: text("source_candidate_id").notNull(),
  name: text("name").notNull(),
  party: text("party"),
  votes: bigint("votes", { mode: "number" }).notNull(),
  percent: numeric("percent", { precision: 5, scale: 2 }),
  isWinnerDeclared: boolean("is_winner_declared").notNull().default(false)
});
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  // varchar id (kept for legacy FK compatibility) — now auto-generated
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: text("password_hash"),
  emailVerified: boolean("email_verified").default(false),
  role: varchar("role").default("user"),
  // 'user' | 'admin'
  lastLogin: timestamp("last_login"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  jti: varchar("jti").notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
  revoked: boolean("revoked").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_auth_sessions_user_jti").on(table.userId, table.jti)
]);
var emailVerificationTokens = pgTable("email_verification_tokens", {
  token: varchar("token").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var passwordResetTokens = pgTable("password_reset_tokens", {
  token: varchar("token").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  // Organization Features
  priority: text("priority").default("normal"),
  // 'high', 'normal', 'low'
  category: text("category"),
  // 'federal', 'state', 'local', 'custom'
  status: text("status").default("active"),
  // 'active', 'completed', 'archived'
  tags: text("tags").array(),
  // ['midterm', 'competitive', 'incumbent']
  notes: text("notes"),
  // User notes about this election
  // Personalization & Analytics
  addedVia: text("added_via").default("manual"),
  // 'manual', 'recommendation', 'import'
  sourceRecommendationId: integer("source_recommendation_id"),
  // Track recommendation source
  interactionCount: integer("interaction_count").default(0),
  // How many times user viewed/clicked
  lastInteraction: timestamp("last_interaction"),
  // Notification Settings (per election)
  notificationsEnabled: boolean("notifications_enabled").default(true),
  reminderDaysBefore: integer("reminder_days_before").default(7),
  // Days before election to remind
  // Metadata
  isVisible: boolean("is_visible").default(true),
  // Hide without deleting
  sortOrder: integer("sort_order"),
  // Custom user ordering
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("watchlist_user_id_idx").on(table.userId),
  index("watchlist_status_idx").on(table.status),
  index("watchlist_priority_idx").on(table.priority)
]);
var pollingData = pgTable("polling_data", {
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
  fieldDates: text("field_dates"),
  // "Oct 1-5, 2024"
  // Data source tracking
  sourceUrl: text("source_url"),
  aggregatedFrom: text("aggregated_from").array(),
  // ['FiveThirtyEight', 'RealClearPolitics']
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("polling_data_election_id_idx").on(table.electionId),
  index("polling_data_created_at_idx").on(table.createdAt)
]);
var userVotingIntentions = pgTable("user_voting_intentions", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  // Anonymous session tracking
  sessionId: text("session_id").notNull(),
  // Anonymous identifier
  // Voting intentions
  candidateId: integer("candidate_id").references(() => candidates.id),
  partyPreference: text("party_preference"),
  // 'Democratic', 'Republican', 'Independent', 'Undecided'
  // Geographic context
  userState: text("user_state"),
  userCounty: text("user_county"),
  // Engagement tracking
  confidence: text("confidence").default("medium"),
  // 'high', 'medium', 'low'
  isLikelyVoter: boolean("is_likely_voter").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("user_voting_intentions_election_id_idx").on(table.electionId),
  index("user_voting_intentions_session_id_idx").on(table.sessionId)
]);
var politicalMomentum = pgTable("political_momentum", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  // Trend calculations (positive = gaining, negative = losing)
  democraticTrend: numeric("democratic_trend", { precision: 5, scale: 3 }).notNull(),
  // -1.0 to 1.0
  republicanTrend: numeric("republican_trend", { precision: 5, scale: 3 }).notNull(),
  // Momentum metadata
  timeWindow: integer("time_window").notNull(),
  // Days of data analyzed
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(),
  // 0-1
  // Shift detection
  isShifting: boolean("is_shifting").default(false),
  shiftDirection: text("shift_direction"),
  // 'red-to-blue', 'blue-to-red'
  shiftMagnitude: numeric("shift_magnitude", { precision: 5, scale: 3 }),
  // 0-1
  // Data sources used
  basedOnPolling: boolean("based_on_polling").default(false),
  basedOnUserIntentions: boolean("based_on_user_intentions").default(false),
  basedOnSocialSentiment: boolean("based_on_social_sentiment").default(false),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull()
}, (table) => [
  index("political_momentum_election_id_idx").on(table.electionId),
  index("political_momentum_calculated_at_idx").on(table.calculatedAt)
]);
var electionRecommendations = pgTable("election_recommendations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  // Recommendation Scoring
  scoreTotal: numeric("score_total", { precision: 8, scale: 4 }).notNull(),
  // Overall recommendation score
  scoreLocation: numeric("score_location", { precision: 5, scale: 4 }),
  // Location match score
  scoreInterests: numeric("score_interests", { precision: 5, scale: 4 }),
  // Interest match score
  scoreElectionType: numeric("score_election_type", { precision: 5, scale: 4 }),
  // Election type preference score
  scoreEngagement: numeric("score_engagement", { precision: 5, scale: 4 }),
  // Trending/engagement score
  scoreFreshness: numeric("score_freshness", { precision: 5, scale: 4 }),
  // Recency/freshness score
  // Recommendation Context
  recommendationType: text("recommendation_type").notNull(),
  // 'location_based', 'interest_based', 'trending', 'similar_users'
  reasonSummary: text("reason_summary"),
  // Human-readable explanation
  reasonDetails: jsonb("reason_details"),
  // Detailed scoring breakdown
  // User Interaction Tracking
  isPresented: boolean("is_presented").default(false),
  // Was shown to user
  presentedAt: timestamp("presented_at"),
  isViewed: boolean("is_viewed").default(false),
  // User viewed details
  viewedAt: timestamp("viewed_at"),
  isClicked: boolean("is_clicked").default(false),
  // User clicked through
  clickedAt: timestamp("clicked_at"),
  isAddedToWatchlist: boolean("is_added_to_watchlist").default(false),
  // User added to watchlist
  addedToWatchlistAt: timestamp("added_to_watchlist_at"),
  isDismissed: boolean("is_dismissed").default(false),
  // User dismissed recommendation
  dismissedAt: timestamp("dismissed_at"),
  dismissalReason: text("dismissal_reason"),
  // 'not_interested', 'already_following', 'wrong_location', etc.
  // Performance & Analytics
  displayPosition: integer("display_position"),
  // Position in recommendation list
  sessionId: text("session_id"),
  // Track user session
  abTestVariant: text("ab_test_variant"),
  // A/B testing support
  // Expiration & Cleanup
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  // When recommendation becomes stale
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("election_recommendations_user_id_idx").on(table.userId),
  index("election_recommendations_election_id_idx").on(table.electionId),
  index("election_recommendations_score_idx").on(table.scoreTotal),
  index("election_recommendations_type_idx").on(table.recommendationType),
  index("election_recommendations_active_idx").on(table.isActive),
  index("election_recommendations_expires_idx").on(table.expiresAt)
]);
var userRecommendationAnalytics = pgTable("user_recommendation_analytics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  // Engagement Metrics
  totalRecommendationsReceived: integer("total_recommendations_received").default(0),
  totalRecommendationsViewed: integer("total_recommendations_viewed").default(0),
  totalRecommendationsClicked: integer("total_recommendations_clicked").default(0),
  totalRecommendationsAdded: integer("total_recommendations_added").default(0),
  totalRecommendationsDismissed: integer("total_recommendations_dismissed").default(0),
  // Conversion Rates (calculated periodically)
  viewRate: numeric("view_rate", { precision: 5, scale: 4 }),
  // viewed / received
  clickRate: numeric("click_rate", { precision: 5, scale: 4 }),
  // clicked / viewed
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 4 }),
  // added / clicked
  dismissalRate: numeric("dismissal_rate", { precision: 5, scale: 4 }),
  // dismissed / received
  // Preference Learning
  preferredRecommendationTypes: text("preferred_recommendation_types").array(),
  // Types user engages with most
  preferredElectionLevels: text("preferred_election_levels").array(),
  // Federal, state, local preferences
  preferredElectionTypes: text("preferred_election_types").array(),
  // Primary, general, special preferences
  // Behavioral Insights
  avgTimeToClick: integer("avg_time_to_click"),
  // Average seconds from view to click
  avgTimeToAdd: integer("avg_time_to_add"),
  // Average seconds from click to add
  peakEngagementTime: text("peak_engagement_time"),
  // Hour of day user is most active
  preferredDisplayPosition: integer("preferred_display_position"),
  // Position user clicks most
  // Recommendation Algorithm Tuning
  locationWeight: numeric("location_weight", { precision: 3, scale: 2 }).default("1.0"),
  // Personalized scoring weights
  interestWeight: numeric("interest_weight", { precision: 3, scale: 2 }).default("1.0"),
  electionTypeWeight: numeric("election_type_weight", { precision: 3, scale: 2 }).default("1.0"),
  engagementWeight: numeric("engagement_weight", { precision: 3, scale: 2 }).default("1.0"),
  freshnessWeight: numeric("freshness_weight", { precision: 3, scale: 2 }).default("1.0"),
  // Quality Metrics
  lastRecommendationQualityScore: numeric("last_recommendation_quality_score", { precision: 5, scale: 4 }),
  recommendationSatisfactionScore: numeric("recommendation_satisfaction_score", { precision: 5, scale: 4 }),
  // Update Tracking
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  lastRecommendationGeneratedAt: timestamp("last_recommendation_generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("user_recommendation_analytics_user_id_idx").on(table.userId),
  index("user_recommendation_analytics_updated_idx").on(table.updatedAt)
]);
var recommendationCache = pgTable("recommendation_cache", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  // Cache Metadata
  cacheKey: text("cache_key").notNull().unique(),
  // Hash of user preferences + context
  recommendationType: text("recommendation_type").notNull(),
  // Cached Data
  recommendationData: jsonb("recommendation_data").notNull(),
  // Serialized recommendations
  totalRecommendations: integer("total_recommendations"),
  // Cache Validity
  isValid: boolean("is_valid").default(true),
  validUntil: timestamp("valid_until").notNull(),
  refreshNeeded: boolean("refresh_needed").default(false),
  // Performance Metrics
  generateTimeMs: integer("generate_time_ms"),
  // Time to generate these recommendations
  hitCount: integer("hit_count").default(0),
  // How many times this cache was used
  lastHitAt: timestamp("last_hit_at"),
  // Dependencies for invalidation
  dependsOnUserPreferences: boolean("depends_on_user_preferences").default(true),
  dependsOnElectionData: boolean("depends_on_election_data").default(true),
  dependsOnUserBehavior: boolean("depends_on_user_behavior").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("recommendation_cache_user_id_idx").on(table.userId),
  index("recommendation_cache_key_idx").on(table.cacheKey),
  index("recommendation_cache_valid_until_idx").on(table.validUntil),
  index("recommendation_cache_type_idx").on(table.recommendationType)
]);
var candidatePositions = pgTable("candidate_positions", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  category: text("category").notNull(),
  // Economy, Healthcare, Education, etc.
  position: text("position").notNull(),
  detailedStatement: text("detailed_statement"),
  isVerified: boolean("is_verified").default(false),
  // candidate verified this position
  sourceUrl: text("source_url"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});
var candidateQA = pgTable("candidate_qa", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  // topic categorization
  isPublic: boolean("is_public").default(true),
  isPriority: boolean("is_priority").default(false),
  // featured Q&A
  isVerified: boolean("is_verified").default(false),
  // candidate approved
  upvotes: integer("upvotes").default(0),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var candidateAccounts = pgTable("candidate_accounts", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  role: text("role").notNull().default("campaign_manager"),
  // 'candidate', 'campaign_manager', 'staff'
  subscriptionTier: text("subscription_tier").notNull().default("basic"),
  // 'basic', 'premium', 'enterprise'
  isActive: boolean("is_active").default(true),
  emailVerified: boolean("email_verified").default(false),
  lastLogin: timestamp("last_login"),
  campaignName: text("campaign_name"),
  campaignTitle: text("campaign_title"),
  // "Campaign Manager for John Smith"
  accessLevel: text("access_level").default("full"),
  // 'full', 'limited', 'view_only'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var candidateProfiles = pgTable("candidate_profiles", {
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
  employmentHistory: jsonb("employment_history"),
  // Array of {company, position, years, description}
  education: jsonb("education"),
  // Array of {institution, degree, year, field}
  militaryService: text("military_service"),
  // Political Experience
  previousOffices: jsonb("previous_offices"),
  // Array of {office, years, achievements}
  politicalExperience: text("political_experience"),
  endorsements: jsonb("endorsements"),
  // Array of {organization, description, date}
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
  topPriorities: jsonb("top_priorities"),
  // Array of {priority, description}
  keyAccomplishments: jsonb("key_accomplishments"),
  // Data Source Tracking
  lastUpdatedBy: integer("last_updated_by").references(() => candidateAccounts.id),
  dataCompleteness: integer("data_completeness").default(0),
  // percentage 0-100
  verificationStatus: text("verification_status").default("pending"),
  // 'pending', 'verified', 'needs_review'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var candidateDataSources = pgTable("candidate_data_sources", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  fieldName: text("field_name").notNull(),
  // which field this source applies to
  sourceType: text("source_type").notNull(),
  // 'candidate_supplied', 'ai_research', 'verified_external'
  sourceDescription: text("source_description"),
  // e.g., "Candidate Campaign Portal", "Perplexity AI Research", "Ballotpedia"
  sourceUrl: text("source_url"),
  lastVerified: timestamp("last_verified"),
  confidenceScore: integer("confidence_score"),
  // 1-100
  createdAt: timestamp("created_at").defaultNow()
});
var voterInteractions = pgTable("voter_interactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  // can be anonymous
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  interactionType: text("interaction_type").notNull(),
  // 'view', 'like', 'share', 'question_ask', 'poll_response'
  electionId: integer("election_id").references(() => elections.id),
  contentId: integer("content_id"),
  // references to QA, position, etc.
  sentiment: text("sentiment"),
  // 'positive', 'neutral', 'negative'
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  // additional interaction data
  createdAt: timestamp("created_at").defaultNow()
});
var realTimePolling = pgTable("real_time_polling", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  electionId: integer("election_id").references(() => elections.id).notNull(),
  pollDate: timestamp("poll_date").defaultNow(),
  supportLevel: numeric("support_level", { precision: 5, scale: 2 }),
  // percentage
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  // confidence interval
  sampleSize: integer("sample_size"),
  methodology: text("methodology"),
  // 'user_interactions', 'direct_poll', 'engagement_analysis'
  demographics: jsonb("demographics"),
  // age, location, party affiliation breakdown
  trendDirection: text("trend_direction"),
  // 'up', 'down', 'stable'
  createdAt: timestamp("created_at").defaultNow()
});
var campaignContent = pgTable("campaign_content", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  contentType: text("content_type").notNull(),
  // 'announcement', 'policy', 'event', 'media'
  title: text("title").notNull(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array(),
  // images, videos, documents
  isPublished: boolean("is_published").default(false),
  publishDate: timestamp("publish_date"),
  views: integer("views").default(0),
  engagementScore: numeric("engagement_score", { precision: 5, scale: 2 }).default("0"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var candidateSubscriptions = pgTable("candidate_subscriptions", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  subscriptionTier: text("subscription_tier").notNull(),
  // 'basic', 'premium', 'enterprise'
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  paymentStatus: text("payment_status").default("pending"),
  // 'pending', 'paid', 'overdue', 'cancelled'
  features: jsonb("features"),
  // tier-specific feature access
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }),
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 }).default("0"),
  lastPaymentDate: timestamp("last_payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var campaignAccounts = pgTable("campaign_accounts", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key").notNull().unique(),
  organizationName: text("organization_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  electionId: integer("election_id").references(() => elections.id),
  subscriptionTier: text("subscription_tier").default("basic"),
  // 'basic', 'pro', 'enterprise', 'custom'
  isActive: boolean("is_active").default(true),
  monthlyApiLimit: integer("monthly_api_limit").default(1e3),
  apiCallsUsed: integer("api_calls_used").default(0),
  subscriptionEnd: timestamp("subscription_end"),
  keyLast4: text("key_last4"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var campaignAccessLogs = pgTable("campaign_access_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaignAccounts.id),
  endpointAccessed: text("endpoint_accessed").notNull(),
  datasetType: text("dataset_type").notNull(),
  // 'demographics', 'polling', 'voter_behavior'
  cost: numeric("cost", { precision: 10, scale: 2 }).default("0"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  accessedAt: timestamp("accessed_at").defaultNow()
});
var dataPurchases = pgTable("data_purchases", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaignAccounts.id),
  datasetType: text("dataset_type").notNull(),
  records: integer("records").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow()
});
var userSegments = pgTable("user_segments", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id),
  ageGroup: text("age_group"),
  // '18-25', '26-35', etc.
  income: text("income"),
  // 'low', 'middle', 'high'
  education: text("education"),
  // 'high_school', 'college', 'graduate'
  partyAffiliation: text("party_affiliation"),
  // 'D', 'R', 'I', 'U'
  voterHistory: text("voter_history"),
  // 'frequent', 'occasional', 'rare'
  count: integer("count").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow()
});
var geographicClusters = pgTable("geographic_clusters", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id),
  state: text("state").notNull(),
  county: text("county"),
  zipCode: text("zip_code"),
  precinct: text("precinct"),
  voterDensity: integer("voter_density"),
  // voters per square mile
  demographicProfile: jsonb("demographic_profile"),
  // age, income, education breakdown
  politicalLean: text("political_lean"),
  // 'strong_d', 'lean_d', 'competitive', 'lean_r', 'strong_r'
  lastUpdated: timestamp("last_updated").defaultNow()
});
var pollingResults = pgTable("polling_results", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").references(() => elections.id),
  candidateId: integer("candidate_id").references(() => candidates.id),
  demographicGroup: text("demographic_group"),
  // age group, income level, etc.
  geographicArea: text("geographic_area"),
  // state, county, zip
  pollingPercentage: numeric("polling_percentage", { precision: 5, scale: 2 }),
  sampleSize: integer("sample_size"),
  marginOfError: numeric("margin_of_error", { precision: 4, scale: 2 }),
  pollingDate: timestamp("polling_date").notNull(),
  pollster: text("pollster").notNull(),
  isAuthentic: boolean("is_authentic").default(true),
  // verified polling data
  createdAt: timestamp("created_at").defaultNow()
});
var congressMembers = pgTable("congress_members", {
  id: serial("id").primaryKey(),
  bioguideId: varchar("bioguide_id", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  party: varchar("party", { length: 50 }),
  state: varchar("state", { length: 10 }).notNull(),
  district: varchar("district", { length: 10 }),
  chamber: varchar("chamber", { length: 20 }).notNull(),
  // 'House' or 'Senate'
  congress: integer("congress").default(119),
  // Current Congress number (119th)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var congressOfficialImportRuns = pgTable("congress_official_import_runs", {
  id: uuid("id").primaryKey(),
  manifestSha256: text("manifest_sha256").notNull(),
  preimageSha256: text("preimage_sha256").notNull(),
  postimageSha256: text("postimage_sha256").notNull(),
  removalPlanSha256: text("removal_plan_sha256"),
  receipt: jsonb("receipt").notNull(),
  preimage: jsonb("preimage").notNull(),
  postimage: jsonb("postimage").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  manifestHash: check("congress_official_import_runs_manifest_sha256_check", sql`${table.manifestSha256} ~ '^[a-f0-9]{64}$'`),
  preimageHash: check("congress_official_import_runs_preimage_sha256_check", sql`${table.preimageSha256} ~ '^[a-f0-9]{64}$'`),
  postimageHash: check("congress_official_import_runs_postimage_sha256_check", sql`${table.postimageSha256} ~ '^[a-f0-9]{64}$'`),
  removalHash: check("congress_official_import_runs_removal_plan_sha256_check", sql`${table.removalPlanSha256} IS NULL OR ${table.removalPlanSha256} ~ '^[a-f0-9]{64}$'`)
}));
var congressBills = pgTable("congress_bills", {
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
  updatedAt: timestamp("updated_at").defaultNow()
});
var congressCommittees = pgTable("congress_committees", {
  id: serial("id").primaryKey(),
  systemCode: varchar("system_code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  chamber: varchar("chamber", { length: 20 }).notNull(),
  type: varchar("type", { length: 50 }),
  subcommittees: jsonb("subcommittees").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var candidateBiography = pgTable("candidate_biography", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  state: text("state"),
  currentPosition: text("current_position"),
  district: text("district"),
  party: text("party"),
  imageUrl: text("image_url"),
  sources: jsonb("sources").default([]),
  lastUpdated: timestamp("last_updated").defaultNow()
});
var electionCycles = pgTable("election_cycles", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  year: integer("year").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var electionsRelations = relations(elections, ({ many }) => ({
  candidates: many(candidates),
  results: many(electionResults)
}));
var electionResultsRelations = relations(electionResults, ({ one }) => ({
  election: one(elections, {
    fields: [electionResults.electionId],
    references: [elections.id]
  })
}));
var candidatesRelations = relations(candidates, ({ one }) => ({
  election: one(elections, {
    fields: [candidates.electionId],
    references: [elections.id]
  })
}));
var usersRelations = relations(users, ({ many }) => ({
  watchlist: many(watchlist)
}));
var watchlistRelations = relations(watchlist, ({ one }) => ({
  election: one(elections, {
    fields: [watchlist.electionId],
    references: [elections.id]
  })
}));
var filterSchema = z.object({
  state: z.string().optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  level: z.union([z.string(), z.array(z.string())]).optional(),
  timeframe: z.string().optional(),
  timeRange: z.string().optional(),
  search: z.string().optional(),
  party: z.union([z.string(), z.array(z.string())]).optional(),
  electionType: z.union([z.string(), z.array(z.string())]).optional(),
  cycle: z.number().optional()
}).transform((data) => {
  return {
    ...data,
    state: data.state === "all" ? void 0 : data.state,
    type: data.type === "all" ? void 0 : data.type,
    level: data.level === "all" ? void 0 : data.level,
    timeframe: data.timeframe === "all" ? void 0 : data.timeframe,
    timeRange: data.timeRange === "all" ? void 0 : data.timeRange,
    party: data.party === "all" ? void 0 : data.party,
    electionType: data.electionType === "all" ? void 0 : data.electionType
  };
});
var insertElectionSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  location: z.string(),
  state: z.string(),
  date: z.date(),
  type: z.string(),
  level: z.string(),
  offices: z.array(z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
  pollsOpen: z.string().nullable().optional(),
  pollsClose: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  pollCloseKind: z.string().nullable().optional(),
  pollHoursBasis: z.string().nullable().optional(),
  pollHoursSource: z.string().nullable().optional(),
  isActive: z.boolean().nullable().optional()
});
var insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true
});
var insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  createdAt: true
});
var insertCongressMemberSchema = createInsertSchema(congressMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertElectionResultSchema = createInsertSchema(electionResults).omit({
  id: true,
  lastUpdated: true
});
var insertCandidatePositionSchema = createInsertSchema(candidatePositions).omit({
  id: true,
  createdAt: true,
  lastUpdated: true
});
var insertCandidateQASchema = createInsertSchema(candidateQA).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertVoterInteractionSchema = createInsertSchema(voterInteractions).omit({
  id: true,
  createdAt: true
});
var insertRealTimePollingSchema = createInsertSchema(realTimePolling).omit({
  id: true,
  createdAt: true
});
var insertCampaignContentSchema = createInsertSchema(campaignContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCandidateSubscriptionSchema = createInsertSchema(candidateSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCampaignAccountSchema = createInsertSchema(campaignAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCampaignAccessLogSchema = createInsertSchema(campaignAccessLogs).omit({
  id: true,
  accessedAt: true
});
var insertDataPurchaseSchema = createInsertSchema(dataPurchases).omit({
  id: true,
  purchasedAt: true
});
var notificationPreferences = pgTable("notification_preferences", {
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
  stateFilter: text("state_filter").array(),
  // States user wants to follow
  localElectionsEnabled: boolean("local_elections_enabled").default(false),
  federalElectionsEnabled: boolean("federal_elections_enabled").default(true),
  // Frequency controls
  immediateNotifications: boolean("immediate_notifications").default(false),
  dailyDigest: boolean("daily_digest").default(false),
  weeklyDigest: boolean("weekly_digest").default(true),
  // Timing preferences
  preferredDeliveryTime: text("preferred_delivery_time").default("09:00"),
  // HH:MM format
  timezone: text("timezone").default("America/New_York"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var notificationConsents = pgTable("notification_consents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  consentType: text("consent_type").notNull(),
  // 'email', 'sms', 'marketing', 'analytics'
  consentGiven: boolean("consent_given").notNull(),
  consentDate: timestamp("consent_date").notNull(),
  withdrawalDate: timestamp("withdrawal_date"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  consentMethod: text("consent_method"),
  // 'signup', 'preferences_page', 'double_opt_in'
  legalBasis: text("legal_basis"),
  // 'consent', 'legitimate_interest', 'contract'
  dataRetentionPeriod: integer("data_retention_period"),
  // Days
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var notificationSubscriptions = pgTable("notification_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subscriptionType: text("subscription_type").notNull(),
  // 'election_alerts', 'candidate_updates', 'breaking_news'
  channel: text("channel").notNull(),
  // 'email', 'sms', 'push'
  targetValue: text("target_value"),
  // email address or phone number
  isVerified: boolean("is_verified").default(false),
  verificationToken: varchar("verification_token"),
  verificationSentAt: timestamp("verification_sent_at"),
  verifiedAt: timestamp("verified_at"),
  // Subscription filters
  electionTypes: text("election_types").array(),
  // ['primary', 'general', 'special']
  electionLevels: text("election_levels").array(),
  // ['federal', 'state', 'local']
  states: text("states").array(),
  // Geographic filter
  parties: text("parties").array(),
  // Party filter
  isActive: boolean("is_active").default(true),
  unsubscribedAt: timestamp("unsubscribed_at"),
  unsubscribeToken: varchar("unsubscribe_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  // 'email', 'sms'
  category: text("category").notNull(),
  // 'election_results', 'candidate_update', 'breaking_news'
  subject: text("subject"),
  // For email templates
  textContent: text("text_content").notNull(),
  htmlContent: text("html_content"),
  // For email templates
  variables: jsonb("variables"),
  // Template variables {name, description, example}
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  version: integer("version").default(1),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var notificationCampaigns = pgTable("notification_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateId: integer("template_id").references(() => notificationTemplates.id),
  campaignType: text("campaign_type").notNull(),
  // 'immediate', 'scheduled', 'triggered'
  status: text("status").notNull().default("draft"),
  // 'draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled'
  // Targeting
  targetAudience: jsonb("target_audience"),
  // Complex audience targeting rules
  estimatedRecipients: integer("estimated_recipients"),
  // Scheduling
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Content overrides
  customSubject: text("custom_subject"),
  customContent: text("custom_content"),
  // Campaign settings
  priority: text("priority").default("normal"),
  // 'low', 'normal', 'high', 'urgent'
  rateLimit: integer("rate_limit").default(100),
  // Messages per minute
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
  updatedAt: timestamp("updated_at").defaultNow()
});
var notificationDeliveries = pgTable("notification_deliveries", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => notificationCampaigns.id),
  userId: varchar("user_id").references(() => users.id),
  subscriptionId: integer("subscription_id").references(() => notificationSubscriptions.id),
  templateId: integer("template_id").references(() => notificationTemplates.id),
  channel: text("channel").notNull(),
  // 'email', 'sms'
  recipient: text("recipient").notNull(),
  // email address or phone number
  status: text("status").notNull().default("queued"),
  // 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced'
  externalId: varchar("external_id"),
  // Provider message ID (SendGrid/Twilio)
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
  cost: numeric("cost", { precision: 10, scale: 4 }),
  // Cost in dollars
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var notificationEvents = pgTable("notification_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  // 'election_result', 'candidate_update', 'breaking_news', 'deadline_reminder'
  eventData: jsonb("event_data").notNull(),
  // Event-specific data
  triggerConditions: jsonb("trigger_conditions"),
  // Conditions that triggered this event
  relatedElectionId: integer("related_election_id").references(() => elections.id),
  relatedCandidateId: integer("related_candidate_id").references(() => candidates.id),
  priority: text("priority").default("normal"),
  // 'low', 'normal', 'high', 'urgent'
  isProcessed: boolean("is_processed").default(false),
  processedAt: timestamp("processed_at"),
  campaignId: integer("campaign_id").references(() => notificationCampaigns.id),
  // Event metadata
  source: text("source"),
  // Source system that created this event
  sourceId: varchar("source_id"),
  // ID in source system
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});
var notificationWebhooks = pgTable("notification_webhooks", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  // 'sendgrid', 'twilio'
  eventType: text("event_type").notNull(),
  // 'delivered', 'bounced', 'opened', 'clicked', 'failed'
  deliveryId: integer("delivery_id").references(() => notificationDeliveries.id),
  externalId: varchar("external_id"),
  // Provider message ID
  webhookData: jsonb("webhook_data").notNull(),
  // Full webhook payload
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertNotificationConsentSchema = createInsertSchema(notificationConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertNotificationSubscriptionSchema = createInsertSchema(notificationSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertNotificationCampaignSchema = createInsertSchema(notificationCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertNotificationDeliverySchema = createInsertSchema(notificationDeliveries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertNotificationEventSchema = createInsertSchema(notificationEvents).omit({
  id: true,
  createdAt: true
});
var insertNotificationWebhookSchema = createInsertSchema(notificationWebhooks).omit({
  id: true,
  createdAt: true
});
var userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  // Location Preferences
  state: text("state"),
  // Two-letter state code (e.g., "CA", "NY")
  city: text("city"),
  congressionalDistrict: text("congressional_district"),
  // Format: "CA-12"
  locationConfidenceLevel: text("location_confidence_level").default("medium"),
  // 'high', 'medium', 'low'
  locationSource: text("location_source"),
  // 'user_input', 'ip_detection', 'zip_lookup'
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
  candidateInformationDepth: text("candidate_information_depth").default("standard"),
  // 'minimal', 'standard', 'detailed'
  electionTimelinePreference: text("election_timeline_preference").default("all"),
  // 'upcoming_only', 'current_cycle', 'all'
  pollingDataInterest: boolean("polling_data_interest").default(true),
  endorsementDataInterest: boolean("endorsement_data_interest").default(false),
  // Communication Preferences (extends notification preferences)
  digestFrequency: text("digest_frequency").default("weekly"),
  // 'daily', 'weekly', 'monthly', 'never'
  breakingNewsAlerts: boolean("breaking_news_alerts").default(false),
  electionReminderAlerts: boolean("election_reminder_alerts").default(true),
  candidateUpdateAlerts: boolean("candidate_update_alerts").default(false),
  // Advanced Filtering Preferences
  partyAffiliations: text("party_affiliations").array(),
  // ['Democratic', 'Republican', 'Independent', etc.]
  issueInterests: text("issue_interests").array(),
  // ['Economy', 'Healthcare', 'Environment', etc.]
  // Privacy & Data Preferences
  dataUsageConsent: boolean("data_usage_consent").default(true),
  personalizationEnabled: boolean("personalization_enabled").default(true),
  analyticsOptOut: boolean("analytics_opt_out").default(false),
  // Onboarding Completion Tracking
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStepsCompleted: text("onboarding_steps_completed").array(),
  // ['location', 'interests', 'notifications']
  skipOnboarding: boolean("skip_onboarding").default(false),
  // Metadata
  preferenceSource: text("preference_source").default("onboarding"),
  // 'onboarding', 'settings_page', 'import'
  lastLocationUpdate: timestamp("last_location_update"),
  lastInterestUpdate: timestamp("last_interest_update"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var updateUserPreferencesSchema = insertUserPreferencesSchema.partial();
var congressionalDistricts = pgTable("congressional_districts", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  // Two-letter state code
  district: text("district").notNull(),
  // District number (e.g., "01", "02", "at-large")
  districtCode: text("district_code").notNull().unique(),
  // Format: "CA-12"
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
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertCongressionalDistrictSchema = createInsertSchema(congressionalDistricts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var backupStorageLocations = pgTable("backup_storage_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // "Primary S3", "Secondary Backup", etc.
  type: text("type").notNull(),
  // 's3', 'neon_snapshot', 'local', 'azure_blob'
  endpoint: text("endpoint"),
  // S3 endpoint URL
  bucket: text("bucket"),
  // S3 bucket name or container
  region: text("region"),
  // AWS region
  accessKeyId: text("access_key_id"),
  // Encrypted access key
  isEncrypted: boolean("is_encrypted").default(true),
  encryptionMethod: text("encryption_method"),
  // 'AES256', 'aws:kms'
  isActive: boolean("is_active").default(true),
  maxRetentionDays: integer("max_retention_days").default(365),
  costPerGb: numeric("cost_per_gb", { precision: 10, scale: 6 }),
  // Cost tracking
  metadata: jsonb("metadata"),
  // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var backupRetentionPolicies = pgTable("backup_retention_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // "Production Daily", "Weekly Archive", etc.
  backupType: text("backup_type").notNull(),
  // 'neon_snapshot', 's3_export', 'full_dump'
  schedule: text("schedule").notNull(),
  // Cron expression: "0 2 * * *"
  retentionDays: integer("retention_days").notNull(),
  storageLocationId: integer("storage_location_id").references(() => backupStorageLocations.id),
  isActive: boolean("is_active").default(true),
  autoCleanup: boolean("auto_cleanup").default(true),
  compressionEnabled: boolean("compression_enabled").default(true),
  encryptionEnabled: boolean("encryption_enabled").default(true),
  // Backup scope configuration
  includeSchema: boolean("include_schema").default(true),
  includeData: boolean("include_data").default(true),
  includedTables: text("included_tables").array(),
  // Specific tables if not all
  excludedTables: text("excluded_tables").array(),
  // Tables to exclude
  // Notification settings
  notifyOnSuccess: boolean("notify_on_success").default(false),
  notifyOnFailure: boolean("notify_on_failure").default(true),
  alertEmails: text("alert_emails").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var backupOperations = pgTable("backup_operations", {
  id: serial("id").primaryKey(),
  operationId: varchar("operation_id").notNull().unique(),
  // UUID for tracking
  type: text("type").notNull(),
  // 'neon_snapshot', 's3_export', 'schema_backup', 'full_dump'
  status: text("status").notNull(),
  // 'queued', 'in_progress', 'completed', 'failed', 'cancelled'
  policyId: integer("policy_id").references(() => backupRetentionPolicies.id),
  storageLocationId: integer("storage_location_id").references(() => backupStorageLocations.id),
  // Backup Details
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  // seconds
  backupSize: bigint("backup_size", { mode: "number" }),
  // bytes
  compressedSize: bigint("compressed_size", { mode: "number" }),
  // bytes after compression
  compressionRatio: numeric("compression_ratio", { precision: 5, scale: 2 }),
  // percentage
  // Source Information
  sourceDatabase: text("source_database"),
  sourceBranch: text("source_branch"),
  // Neon branch
  schemaVersion: text("schema_version"),
  tableCount: integer("table_count"),
  recordCount: bigint("record_count", { mode: "number" }),
  // Storage Information
  backupPath: text("backup_path"),
  // S3 key or file path
  backupUrl: text("backup_url"),
  // Access URL if applicable
  checksum: text("checksum"),
  // SHA256 or MD5 hash
  encryptionKey: text("encryption_key"),
  // Encrypted key reference
  // Neon-specific fields
  neonSnapshotId: text("neon_snapshot_id"),
  // Neon snapshot ID
  neonBranchId: text("neon_branch_id"),
  // Neon branch ID
  neonProjectId: text("neon_project_id"),
  // Neon project ID
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
  tags: text("tags").array(),
  // ["production", "pre-migration", etc.]
  metadata: jsonb("metadata"),
  triggeredBy: text("triggered_by"),
  // 'schedule', 'manual', 'pre_migration', 'alert'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("backup_operations_status_idx").on(table.status),
  index("backup_operations_type_idx").on(table.type),
  index("backup_operations_created_at_idx").on(table.createdAt)
]);
var schemaVersions = pgTable("schema_versions", {
  id: serial("id").primaryKey(),
  versionHash: varchar("version_hash").notNull().unique(),
  // SHA256 of schema
  schemaSnapshot: jsonb("schema_snapshot").notNull(),
  // Complete schema definition
  migrationFiles: text("migration_files").array(),
  // Applied migration files
  tableCount: integer("table_count"),
  indexCount: integer("index_count"),
  constraintCount: integer("constraint_count"),
  // Change tracking
  changesFromPrevious: jsonb("changes_from_previous"),
  // Diff from previous version
  isBreakingChange: boolean("is_breaking_change").default(false),
  riskLevel: text("risk_level"),
  // 'low', 'medium', 'high', 'critical'
  // Backup association
  backupOperationId: integer("backup_operation_id").references(() => backupOperations.id),
  // Detection metadata
  detectedBy: text("detected_by"),
  // 'scheduled_check', 'migration', 'manual'
  detectedAt: timestamp("detected_at").defaultNow(),
  // Validation
  isValidated: boolean("is_validated").default(false),
  validatedAt: timestamp("validated_at"),
  validationErrors: jsonb("validation_errors"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("schema_versions_hash_idx").on(table.versionHash),
  index("schema_versions_detected_at_idx").on(table.detectedAt)
]);
var restoreValidations = pgTable("restore_validations", {
  id: serial("id").primaryKey(),
  validationId: varchar("validation_id").notNull().unique(),
  // UUID for tracking
  backupOperationId: integer("backup_operation_id").references(() => backupOperations.id).notNull(),
  // Validation setup
  validationType: text("validation_type").notNull(),
  // 'integrity_check', 'full_restore', 'sample_restore', 'schema_validation'
  testEnvironment: text("test_environment"),
  // 'staging', 'test', 'isolated'
  // Test database information
  testDatabaseUrl: text("test_database_url"),
  // Connection to test database
  testBranchId: text("test_branch_id"),
  // Neon test branch
  // Execution tracking
  status: text("status").notNull(),
  // 'queued', 'running', 'completed', 'failed', 'timeout'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  // seconds
  timeoutAfter: integer("timeout_after").default(3600),
  // seconds
  // Results
  isSuccessful: boolean("is_successful").default(false),
  dataIntegrityScore: numeric("data_integrity_score", { precision: 5, scale: 2 }),
  // 0-100%
  schemaIntegrityScore: numeric("schema_integrity_score", { precision: 5, scale: 2 }),
  // 0-100%
  performanceScore: numeric("performance_score", { precision: 5, scale: 2 }),
  // 0-100%
  // Recovery Time Objective (RTO) tracking
  restoreTime: integer("restore_time"),
  // seconds to complete restore
  rtoTarget: integer("rto_target"),
  // target RTO in seconds
  rtoAchieved: boolean("rto_achieved").default(false),
  // Detailed results
  tablesValidated: integer("tables_validated"),
  recordsValidated: bigint("records_validated", { mode: "number" }),
  validationErrors: jsonb("validation_errors"),
  performanceMetrics: jsonb("performance_metrics"),
  // Query times, etc.
  // Error tracking
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  // Test artifacts
  testResults: jsonb("test_results"),
  // Detailed test results
  testQueries: jsonb("test_queries"),
  // Queries used for validation
  benchmarkResults: jsonb("benchmark_results"),
  // Performance benchmarks
  // Cleanup tracking
  cleanupCompleted: boolean("cleanup_completed").default(false),
  cleanupAt: timestamp("cleanup_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("restore_validations_backup_id_idx").on(table.backupOperationId),
  index("restore_validations_status_idx").on(table.status),
  index("restore_validations_created_at_idx").on(table.createdAt)
]);
var backupSystemConfig = pgTable("backup_system_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key").notNull().unique(),
  configValue: text("config_value").notNull(),
  configType: text("config_type").notNull(),
  // 'string', 'number', 'boolean', 'json'
  description: text("description"),
  isEncrypted: boolean("is_encrypted").default(false),
  lastModifiedBy: varchar("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertBackupStorageLocationSchema = createInsertSchema(backupStorageLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertBackupRetentionPolicySchema = createInsertSchema(backupRetentionPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertBackupOperationSchema = createInsertSchema(backupOperations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertSchemaVersionSchema = createInsertSchema(schemaVersions).omit({
  id: true,
  createdAt: true
});
var insertRestoreValidationSchema = createInsertSchema(restoreValidations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertBackupSystemConfigSchema = createInsertSchema(backupSystemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var secretsVault = pgTable("secrets_vault", {
  id: serial("id").primaryKey(),
  secretName: text("secret_name").notNull().unique(),
  secretType: text("secret_type").notNull(),
  // 'api_key', 'database_url', 'encryption_key', etc.
  serviceName: text("service_name").notNull(),
  // 'google_civic', 'propublica', 'votesmart', etc.
  currentValue: text("current_value").notNull(),
  // Encrypted
  previousValue: text("previous_value"),
  // Encrypted
  nextRotation: timestamp("next_rotation").notNull(),
  lastRotated: timestamp("last_rotated"),
  rotationFrequencyDays: integer("rotation_frequency_days").default(90),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("secrets_vault_secret_name_idx").on(table.secretName),
  index("secrets_vault_service_name_idx").on(table.serviceName),
  index("secrets_vault_next_rotation_idx").on(table.nextRotation)
]);
var secretsRotationHistory = pgTable("secrets_rotation_history", {
  id: serial("id").primaryKey(),
  secretId: integer("secret_id").references(() => secretsVault.id),
  rotationId: text("rotation_id").notNull(),
  rotationType: text("rotation_type").notNull(),
  // 'scheduled', 'manual', 'emergency'
  status: text("status").notNull(),
  // 'initiated', 'in_progress', 'completed', 'failed', 'rolled_back'
  oldValueHash: text("old_value_hash"),
  // Hash of previous value for verification
  newValueHash: text("new_value_hash"),
  // Hash of new value for verification
  initiatedBy: text("initiated_by"),
  // User or system
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  validationResults: jsonb("validation_results"),
  // Results of post-rotation validation
  rollbackRequired: boolean("rollback_required").default(false),
  metadata: jsonb("metadata")
}, (table) => [
  index("secrets_rotation_secret_id_idx").on(table.secretId),
  index("secrets_rotation_status_idx").on(table.status),
  index("secrets_rotation_started_at_idx").on(table.startedAt)
]);
var artifactStorage = pgTable("artifact_storage", {
  id: serial("id").primaryKey(),
  artifactName: text("artifact_name").notNull(),
  artifactType: text("artifact_type").notNull(),
  // 'deployment', 'configuration', 'dependency', 'backup'
  version: text("version").notNull(),
  environment: text("environment").notNull(),
  // 'development', 'staging', 'production'
  storageLocation: text("storage_location").notNull(),
  // S3 path, file path, etc.
  contentHash: text("content_hash").notNull(),
  // SHA-256 hash for integrity
  size: bigint("size", { mode: "number" }),
  // Size in bytes
  compressionType: text("compression_type"),
  // 'gzip', 'brotli', 'none'
  encryptionType: text("encryption_type"),
  // 'aes-256', 'none'
  tags: text("tags").array(),
  // Searchable tags
  isActive: boolean("is_active").default(true),
  retentionDate: timestamp("retention_date"),
  // When artifact can be deleted
  metadata: jsonb("metadata"),
  // Additional artifact information
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by")
}, (table) => [
  index("artifact_storage_name_version_idx").on(table.artifactName, table.version),
  index("artifact_storage_type_idx").on(table.artifactType),
  index("artifact_storage_environment_idx").on(table.environment),
  index("artifact_storage_content_hash_idx").on(table.contentHash)
]);
var deploymentHistory = pgTable("deployment_history", {
  id: serial("id").primaryKey(),
  deploymentId: text("deployment_id").notNull().unique(),
  manifestName: text("manifest_name").notNull(),
  environment: text("environment").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  // 'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
  deploymentType: text("deployment_type").notNull(),
  // 'fresh', 'update', 'rollback', 'disaster_recovery'
  triggerType: text("trigger_type").notNull(),
  // 'manual', 'scheduled', 'automated', 'disaster_recovery'
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  // Duration in seconds
  servicesDeployed: jsonb("services_deployed"),
  // Array of service deployment details
  artifactsUsed: text("artifacts_used").array(),
  // Artifact IDs used in deployment
  configurationSnapshot: jsonb("configuration_snapshot"),
  // Environment variables at time of deployment
  healthCheckResults: jsonb("health_check_results"),
  rollbackDeploymentId: text("rollback_deployment_id"),
  // Reference to rollback deployment
  error: text("error"),
  logs: text("logs").array(),
  // Deployment logs
  deployedBy: text("deployed_by"),
  metadata: jsonb("metadata")
}, (table) => [
  index("deployment_history_deployment_id_idx").on(table.deploymentId),
  index("deployment_history_status_idx").on(table.status),
  index("deployment_history_environment_idx").on(table.environment),
  index("deployment_history_started_at_idx").on(table.startedAt)
]);
var environmentConfigurations = pgTable("environment_configurations", {
  id: serial("id").primaryKey(),
  configurationName: text("configuration_name").notNull(),
  environment: text("environment").notNull(),
  serviceType: text("service_type"),
  // 'backend', 'frontend', 'database', 'worker'
  configurationData: jsonb("configuration_data").notNull(),
  // Environment variables and settings
  templateVersion: text("template_version").notNull(),
  isActive: boolean("is_active").default(true),
  validationRules: jsonb("validation_rules"),
  // Rules for validating configuration
  dependencies: text("dependencies").array(),
  // Other configurations this depends on
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by")
}, (table) => [
  index("environment_config_name_env_idx").on(table.configurationName, table.environment),
  index("environment_config_service_type_idx").on(table.serviceType),
  index("environment_config_active_idx").on(table.isActive)
]);
var platformContinuityEvents = pgTable("platform_continuity_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  // 'deployment', 'rollback', 'secret_rotation', 'artifact_cleanup', 'environment_bootstrap'
  category: text("category").notNull(),
  // 'infrastructure', 'security', 'artifacts', 'monitoring'
  severity: text("severity").notNull(),
  // 'info', 'warning', 'error', 'critical'
  status: text("status").notNull(),
  // 'initiated', 'in_progress', 'completed', 'failed'
  title: text("title").notNull(),
  description: text("description"),
  affectedServices: text("affected_services").array(),
  environment: text("environment"),
  initiatedBy: text("initiated_by"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  // Duration in seconds
  outcome: text("outcome"),
  // 'success', 'failure', 'partial_success'
  errorDetails: text("error_details"),
  relatedEventIds: text("related_event_ids").array(),
  // Related events
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
var insertSecretsVaultSchema = createInsertSchema(secretsVault).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertSecretsRotationHistorySchema = createInsertSchema(secretsRotationHistory).omit({
  id: true,
  startedAt: true
});
var insertArtifactStorageSchema = createInsertSchema(artifactStorage).omit({
  id: true,
  createdAt: true
});
var insertDeploymentHistorySchema = createInsertSchema(deploymentHistory).omit({
  id: true,
  startedAt: true
});
var insertEnvironmentConfigurationsSchema = createInsertSchema(environmentConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPlatformContinuityEventsSchema = createInsertSchema(platformContinuityEvents).omit({
  id: true,
  startedAt: true
});
var failoverDrillConfigurations = pgTable("failover_drill_configurations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  drillType: text("drill_type").notNull(),
  // 'database_failover', 'backup_restore', 'full_disaster_recovery', 'service_connectivity'
  scenario: text("scenario").notNull(),
  // 'primary_db_failure', 'backup_corruption', 'complete_outage', 'partial_outage'
  schedule: text("schedule"),
  // Cron expression for automated scheduling
  isEnabled: boolean("is_enabled").default(true),
  // Target metrics
  expectedRtoSeconds: integer("expected_rto_seconds").notNull(),
  expectedRpoSeconds: integer("expected_rpo_seconds").notNull(),
  successCriteria: jsonb("success_criteria"),
  // JSON criteria for success
  // Test configuration
  testEnvironment: text("test_environment").notNull(),
  // 'staging', 'test', 'isolated'
  affectedServices: text("affected_services").array(),
  testDataSizeLimit: bigint("test_data_size_limit", { mode: "number" }),
  // Max data size for test
  timeoutMinutes: integer("timeout_minutes").default(60),
  // Notification settings
  notifyOnStart: boolean("notify_on_start").default(true),
  notifyOnSuccess: boolean("notify_on_success").default(true),
  notifyOnFailure: boolean("notify_on_failure").default(true),
  notificationChannels: text("notification_channels").array(),
  // ['email', 'sms', 'webhook']
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("drill_config_type_idx").on(table.drillType),
  index("drill_config_enabled_idx").on(table.isEnabled),
  index("drill_config_scenario_idx").on(table.scenario)
]);
var drillExecutions = pgTable("drill_executions", {
  id: serial("id").primaryKey(),
  executionId: varchar("execution_id").notNull().unique(),
  configurationId: integer("configuration_id").references(() => failoverDrillConfigurations.id).notNull(),
  // Execution details
  status: text("status").notNull(),
  // 'queued', 'running', 'completed', 'failed', 'timeout', 'cancelled'
  triggerType: text("trigger_type").notNull(),
  // 'scheduled', 'manual', 'automated'
  triggeredBy: text("triggered_by"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  // Duration in seconds
  // Performance metrics
  actualRtoSeconds: integer("actual_rto_seconds"),
  actualRpoSeconds: integer("actual_rpo_seconds"),
  rtoAchieved: boolean("rto_achieved").default(false),
  rpoAchieved: boolean("rpo_achieved").default(false),
  successScore: numeric("success_score", { precision: 5, scale: 2 }),
  // 0-100%
  // Detailed results
  stepResults: jsonb("step_results"),
  // Array of step execution results
  performanceMetrics: jsonb("performance_metrics"),
  // Detailed performance data
  validationResults: jsonb("validation_results"),
  // Data integrity validation
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
  metadata: jsonb("metadata")
}, (table) => [
  index("drill_exec_config_id_idx").on(table.configurationId),
  index("drill_exec_status_idx").on(table.status),
  index("drill_exec_started_at_idx").on(table.startedAt),
  index("drill_exec_trigger_type_idx").on(table.triggerType)
]);
var drillSteps = pgTable("drill_steps", {
  id: serial("id").primaryKey(),
  executionId: varchar("execution_id").references(() => drillExecutions.executionId).notNull(),
  stepOrder: integer("step_order").notNull(),
  stepName: text("step_name").notNull(),
  stepType: text("step_type").notNull(),
  // 'failover', 'restore', 'validate', 'health_check', 'cleanup'
  description: text("description"),
  // Execution tracking
  status: text("status").notNull(),
  // 'pending', 'running', 'completed', 'failed', 'skipped'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  // Duration in seconds
  // Results
  isSuccessful: boolean("is_successful").default(false),
  output: jsonb("output"),
  // Step output data
  metrics: jsonb("metrics"),
  // Step-specific metrics
  // Error tracking
  errorMessage: text("error_message"),
  errorCode: varchar("error_code"),
  retryCount: integer("retry_count").default(0),
  metadata: jsonb("metadata")
}, (table) => [
  index("drill_steps_execution_id_idx").on(table.executionId),
  index("drill_steps_status_idx").on(table.status),
  index("drill_steps_step_type_idx").on(table.stepType)
]);
var backupMonitoringConfigurations = pgTable("backup_monitoring_configurations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // Monitoring scope
  monitoringType: text("monitoring_type").notNull(),
  // 'all_backups', 'policy_specific', 'storage_location', 'backup_type'
  backupTypes: text("backup_types").array(),
  // ['neon_snapshot', 's3_export', 'schema_backup']
  storageLocationIds: integer("storage_location_ids").array(),
  policyIds: integer("policy_ids").array(),
  // Alert thresholds
  failureRateThreshold: numeric("failure_rate_threshold", { precision: 5, scale: 2 }),
  // Percentage
  missingBackupThresholdHours: integer("missing_backup_threshold_hours").default(25),
  // Hours
  backupSizeVarianceThreshold: numeric("backup_size_variance_threshold", { precision: 5, scale: 2 }),
  // Percentage
  // Integrity checking
  enableIntegrityChecks: boolean("enable_integrity_checks").default(true),
  integrityCheckFrequency: text("integrity_check_frequency"),
  // 'daily', 'weekly', 'monthly'
  corruptionDetectionEnabled: boolean("corruption_detection_enabled").default(true),
  // Alert configuration
  isEnabled: boolean("is_enabled").default(true),
  alertChannels: text("alert_channels").array(),
  // ['email', 'sms', 'webhook', 'dashboard']
  escalationRules: jsonb("escalation_rules"),
  // Escalation configuration
  suppressionDuration: integer("suppression_duration").default(3600),
  // Seconds
  // Notification targets
  alertEmails: text("alert_emails").array(),
  webhookUrls: text("webhook_urls").array(),
  alertSeverity: text("alert_severity").default("high"),
  // 'low', 'medium', 'high', 'critical'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("backup_monitoring_type_idx").on(table.monitoringType),
  index("backup_monitoring_enabled_idx").on(table.isEnabled)
]);
var backupAlerts = pgTable("backup_alerts", {
  id: serial("id").primaryKey(),
  alertId: varchar("alert_id").notNull().unique(),
  configurationId: integer("configuration_id").references(() => backupMonitoringConfigurations.id),
  // Alert details
  alertType: text("alert_type").notNull(),
  // 'backup_failure', 'missing_backup', 'corruption_detected', 'threshold_exceeded'
  severity: text("severity").notNull(),
  // 'low', 'medium', 'high', 'critical'
  title: text("title").notNull(),
  message: text("message").notNull(),
  // Related entities
  backupOperationId: integer("backup_operation_id").references(() => backupOperations.id),
  affectedBackupTypes: text("affected_backup_types").array(),
  affectedStorageLocations: text("affected_storage_locations").array(),
  // Alert status
  status: text("status").notNull(),
  // 'active', 'acknowledged', 'resolved', 'suppressed'
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
  alertData: jsonb("alert_data"),
  // Additional alert context
  thresholdValues: jsonb("threshold_values"),
  // Threshold breach details
  affectedMetrics: jsonb("affected_metrics"),
  metadata: jsonb("metadata")
}, (table) => [
  index("backup_alerts_type_idx").on(table.alertType),
  index("backup_alerts_severity_idx").on(table.severity),
  index("backup_alerts_status_idx").on(table.status),
  index("backup_alerts_created_at_idx").on(table.createdAt)
]);
var backupHealthMetrics = pgTable("backup_health_metrics", {
  id: serial("id").primaryKey(),
  metricDate: timestamp("metric_date").notNull(),
  metricType: text("metric_type").notNull(),
  // 'daily', 'weekly', 'monthly'
  // Success rate metrics
  totalBackups: integer("total_backups").default(0),
  successfulBackups: integer("successful_backups").default(0),
  failedBackups: integer("failed_backups").default(0),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }),
  // Percentage
  // Performance metrics
  averageBackupDuration: integer("average_backup_duration"),
  // Seconds
  averageBackupSize: bigint("average_backup_size", { mode: "number" }),
  // Bytes
  totalStorageUsed: bigint("total_storage_used", { mode: "number" }),
  // Bytes
  // Retention compliance
  retentionCompliance: numeric("retention_compliance", { precision: 5, scale: 2 }),
  // Percentage
  expiredBackupsCount: integer("expired_backups_count").default(0),
  // Breakdown by type
  metricsByType: jsonb("metrics_by_type"),
  // Breakdown by backup type
  metricsByLocation: jsonb("metrics_by_location"),
  // Breakdown by storage location
  // Health indicators
  healthScore: numeric("health_score", { precision: 5, scale: 2 }),
  // 0-100%
  riskLevel: text("risk_level"),
  // 'low', 'medium', 'high', 'critical'
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("backup_health_metrics_date_idx").on(table.metricDate),
  index("backup_health_metrics_type_idx").on(table.metricType),
  index("backup_health_metrics_created_at_idx").on(table.createdAt)
]);
var rtoRpoTargets = pgTable("rto_rpo_targets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // Service/Component identification
  serviceType: text("service_type").notNull(),
  // 'database', 'application', 'storage', 'full_system'
  serviceName: text("service_name"),
  component: text("component"),
  // Specific component within service
  // Target objectives
  rtoTargetSeconds: integer("rto_target_seconds").notNull(),
  // Recovery Time Objective
  rpoTargetSeconds: integer("rpo_target_seconds").notNull(),
  // Recovery Point Objective
  // SLA requirements
  availabilityTarget: numeric("availability_target", { precision: 5, scale: 2 }),
  // 99.9%
  businessCriticality: text("business_criticality").notNull(),
  // 'low', 'medium', 'high', 'critical'
  // Compliance requirements
  regulatoryRequirements: text("regulatory_requirements").array(),
  complianceFrameworks: text("compliance_frameworks").array(),
  // ['SOC2', 'GDPR', 'HIPAA']
  // Measurement configuration
  measurementFrequency: text("measurement_frequency").default("hourly"),
  // 'hourly', 'daily', 'weekly'
  alertThresholds: jsonb("alert_thresholds"),
  // When to alert on RTO/RPO misses
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("rto_rpo_targets_service_type_idx").on(table.serviceType),
  index("rto_rpo_targets_criticality_idx").on(table.businessCriticality),
  index("rto_rpo_targets_active_idx").on(table.isActive)
]);
var rtoRpoMeasurements = pgTable("rto_rpo_measurements", {
  id: serial("id").primaryKey(),
  measurementId: varchar("measurement_id").notNull().unique(),
  targetId: integer("target_id").references(() => rtoRpoTargets.id).notNull(),
  // Measurement details
  measurementType: text("measurement_type").notNull(),
  // 'drill', 'real_incident', 'automated_test'
  incidentType: text("incident_type"),
  // 'planned_maintenance', 'unplanned_outage', 'disaster_recovery'
  // Actual measurements
  actualRtoSeconds: integer("actual_rto_seconds"),
  actualRpoSeconds: integer("actual_rpo_seconds"),
  // Target achievement
  rtoAchieved: boolean("rto_achieved"),
  rpoAchieved: boolean("rpo_achieved"),
  rtoVariance: integer("rto_variance"),
  // Seconds above/below target
  rpoVariance: integer("rpo_variance"),
  // Seconds above/below target
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
  recoverySteps: jsonb("recovery_steps"),
  // Steps taken during recovery
  // Quality indicators
  dataIntegrityScore: numeric("data_integrity_score", { precision: 5, scale: 2 }),
  performanceScore: numeric("performance_score", { precision: 5, scale: 2 }),
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
  notes: text("notes"),
  measuredBy: text("measured_by"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("rto_rpo_measurements_target_id_idx").on(table.targetId),
  index("rto_rpo_measurements_type_idx").on(table.measurementType),
  index("rto_rpo_measurements_achieved_idx").on(table.rtoAchieved, table.rpoAchieved),
  index("rto_rpo_measurements_created_at_idx").on(table.createdAt)
]);
var performanceBenchmarks = pgTable("performance_benchmarks", {
  id: serial("id").primaryKey(),
  benchmarkName: text("benchmark_name").notNull(),
  description: text("description"),
  // Benchmark source
  sourceType: text("source_type").notNull(),
  // 'industry_standard', 'regulatory', 'internal', 'competitor'
  sourceOrganization: text("source_organization"),
  // 'NIST', 'ISO', 'internal'
  sourceDocument: text("source_document"),
  version: text("version"),
  // Industry/domain context
  industry: text("industry"),
  // 'financial_services', 'healthcare', 'government', 'general'
  serviceCategory: text("service_category"),
  // 'database', 'web_application', 'api_service'
  organizationSize: text("organization_size"),
  // 'startup', 'small', 'medium', 'enterprise'
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
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("benchmarks_source_type_idx").on(table.sourceType),
  index("benchmarks_industry_idx").on(table.industry),
  index("benchmarks_active_idx").on(table.isActive)
]);
var incidentRunbooks = pgTable("incident_runbooks", {
  id: serial("id").primaryKey(),
  runbookId: varchar("runbook_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  // Runbook classification
  incidentType: text("incident_type").notNull(),
  // 'database_failure', 'complete_outage', 'security_breach', 'data_corruption'
  severity: text("severity").notNull(),
  // 'low', 'medium', 'high', 'critical'
  category: text("category").notNull(),
  // 'infrastructure', 'application', 'security', 'data'
  // Scope and triggers
  triggerConditions: jsonb("trigger_conditions"),
  // When this runbook should be used
  affectedServices: text("affected_services").array(),
  prerequisites: text("prerequisites").array(),
  // Runbook content
  overview: text("overview"),
  objectives: text("objectives").array(),
  assumptions: text("assumptions").array(),
  // Version control
  version: text("version").notNull(),
  previousVersionId: integer("previous_version_id").references(() => incidentRunbooks.id),
  status: text("status").notNull(),
  // 'draft', 'review', 'approved', 'published', 'archived'
  // Approval workflow
  approvalRequired: boolean("approval_required").default(true),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  reviewedBy: text("reviewed_by").array(),
  // Execution configuration
  estimatedDuration: integer("estimated_duration"),
  // Minutes
  automationLevel: text("automation_level").notNull(),
  // 'manual', 'semi_automated', 'fully_automated'
  requiresEscalation: boolean("requires_escalation").default(false),
  // Access control
  accessLevel: text("access_level").notNull(),
  // 'public', 'internal', 'restricted', 'confidential'
  authorizedRoles: text("authorized_roles").array(),
  authorizedUsers: text("authorized_users").array(),
  // Maintenance
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date"),
  reviewFrequencyDays: integer("review_frequency_days").default(365),
  // Metrics
  executionCount: integer("execution_count").default(0),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }),
  averageExecutionTime: integer("average_execution_time"),
  // Minutes
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("runbooks_incident_type_idx").on(table.incidentType),
  index("runbooks_severity_idx").on(table.severity),
  index("runbooks_status_idx").on(table.status),
  index("runbooks_access_level_idx").on(table.accessLevel)
]);
var runbookSteps = pgTable("runbook_steps", {
  id: serial("id").primaryKey(),
  runbookId: varchar("runbook_id").references(() => incidentRunbooks.runbookId).notNull(),
  stepOrder: integer("step_order").notNull(),
  stepId: varchar("step_id").notNull(),
  // Unique within runbook
  // Step details
  title: text("title").notNull(),
  description: text("description"),
  stepType: text("step_type").notNull(),
  // 'manual', 'automated', 'decision', 'parallel', 'validation'
  // Execution details
  instructions: text("instructions"),
  command: text("command"),
  // For automated steps
  expectedOutput: text("expected_output"),
  estimatedDuration: integer("estimated_duration"),
  // Minutes
  // Dependencies and flow control
  dependsOn: text("depends_on").array(),
  // Step IDs this depends on
  canRunInParallel: boolean("can_run_in_parallel").default(false),
  isCritical: boolean("is_critical").default(false),
  canSkip: boolean("can_skip").default(false),
  // Decision logic (for decision steps)
  decisionCriteria: jsonb("decision_criteria"),
  nextStepConditions: jsonb("next_step_conditions"),
  // Conditional next steps
  // Validation (for validation steps)
  validationChecks: jsonb("validation_checks"),
  successCriteria: jsonb("success_criteria"),
  // Rollback
  rollbackInstructions: text("rollback_instructions"),
  rollbackCommand: text("rollback_command"),
  // Documentation
  notes: text("notes"),
  references: text("references").array(),
  // Links to docs, tools, etc.
  troubleshooting: text("troubleshooting"),
  metadata: jsonb("metadata")
}, (table) => [
  index("runbook_steps_runbook_id_idx").on(table.runbookId),
  index("runbook_steps_order_idx").on(table.runbookId, table.stepOrder),
  index("runbook_steps_type_idx").on(table.stepType)
]);
var runbookContacts = pgTable("runbook_contacts", {
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
  businessHours: jsonb("business_hours"),
  // Daily availability windows
  onCallSchedule: jsonb("on_call_schedule"),
  // Scheduled on-call periods
  // Escalation
  escalationLevel: integer("escalation_level").default(1),
  // 1=primary, 2=secondary, etc.
  managerContactId: varchar("manager_contact_id").references(() => runbookContacts.contactId),
  backupContactIds: text("backup_contact_ids").array(),
  // Specialization
  expertiseAreas: text("expertise_areas").array(),
  // 'database', 'network', 'security', etc.
  certifications: text("certifications").array(),
  accessLevels: text("access_levels").array(),
  // What systems they can access
  // Contact preferences
  preferredContactMethod: text("preferred_contact_method"),
  // 'email', 'phone', 'sms', 'slack'
  maxResponseTimeMinutes: integer("max_response_time_minutes"),
  // Status tracking
  isActive: boolean("is_active").default(true),
  lastContactedAt: timestamp("last_contacted_at"),
  lastResponseAt: timestamp("last_response_at"),
  responseRate: numeric("response_rate", { precision: 5, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("runbook_contacts_name_idx").on(table.name),
  index("runbook_contacts_escalation_idx").on(table.escalationLevel),
  index("runbook_contacts_active_idx").on(table.isActive),
  index("runbook_contacts_24x7_idx").on(table.isAvailable24x7)
]);
var contactEscalationTrees = pgTable("contact_escalation_trees", {
  id: serial("id").primaryKey(),
  treeId: varchar("tree_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  // Tree scope
  incidentTypes: text("incident_types").array(),
  // When this tree applies
  severityLevels: text("severity_levels").array(),
  // 'low', 'medium', 'high', 'critical'
  affectedServices: text("affected_services").array(),
  // Escalation configuration
  escalationSteps: jsonb("escalation_steps"),
  // Structured escalation flow
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
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("escalation_trees_name_idx").on(table.name),
  index("escalation_trees_active_idx").on(table.isActive)
]);
var runbookExecutions = pgTable("runbook_executions", {
  id: serial("id").primaryKey(),
  executionId: varchar("execution_id").notNull().unique(),
  runbookId: integer("runbook_id").references(() => incidentRunbooks.id).notNull(),
  // Execution context
  incidentId: varchar("incident_id"),
  // Reference to incident management system
  executionType: text("execution_type").notNull(),
  // 'emergency', 'planned', 'drill', 'test'
  triggerReason: text("trigger_reason"),
  // Execution tracking
  status: text("status").notNull(),
  // 'pending', 'in_progress', 'completed', 'failed', 'paused', 'cancelled'
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  // Minutes
  // Personnel
  executedBy: text("executed_by").notNull(),
  supervisedBy: text("supervised_by"),
  contactsNotified: text("contacts_notified").array(),
  escalationTreeUsed: varchar("escalation_tree_used").references(() => contactEscalationTrees.treeId),
  // Progress tracking
  currentStep: varchar("current_step"),
  // Current step ID
  completedSteps: text("completed_steps").array(),
  skippedSteps: text("skipped_steps").array(),
  failedSteps: text("failed_steps").array(),
  // Results
  isSuccessful: boolean("is_successful"),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }),
  // Percentage of steps completed successfully
  objectives_achieved: text("objectives_achieved").array(),
  objectives_failed: text("objectives_failed").array(),
  // Execution details
  stepResults: jsonb("step_results"),
  // Results for each step
  decisions: jsonb("decisions"),
  // Decision points and choices made
  deviations: jsonb("deviations"),
  // Deviations from standard procedure
  // Quality metrics
  adherenceScore: numeric("adherence_score", { precision: 5, scale: 2 }),
  // How well procedure was followed
  effectivenessScore: numeric("effectiveness_score", { precision: 5, scale: 2 }),
  // How effective the execution was
  // Documentation
  executionNotes: text("execution_notes"),
  lessonsLearned: text("lessons_learned"),
  improvementSuggestions: text("improvement_suggestions"),
  // Post-execution
  reviewRequired: boolean("review_required").default(true),
  reviewCompletedAt: timestamp("review_completed_at"),
  reviewedBy: text("reviewed_by"),
  metadata: jsonb("metadata")
}, (table) => [
  index("runbook_exec_runbook_id_idx").on(table.runbookId),
  index("runbook_exec_status_idx").on(table.status),
  index("runbook_exec_started_at_idx").on(table.startedAt),
  index("runbook_exec_executed_by_idx").on(table.executedBy)
]);
var insertFailoverDrillConfigurationSchema = createInsertSchema(failoverDrillConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertDrillExecutionSchema = createInsertSchema(drillExecutions).omit({
  id: true,
  startedAt: true
});
var insertDrillStepSchema = createInsertSchema(drillSteps).omit({
  id: true
});
var insertBackupMonitoringConfigurationSchema = createInsertSchema(backupMonitoringConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertBackupAlertSchema = createInsertSchema(backupAlerts).omit({
  id: true,
  createdAt: true
});
var insertBackupHealthMetricSchema = createInsertSchema(backupHealthMetrics).omit({
  id: true,
  createdAt: true
});
var insertRtoRpoTargetSchema = createInsertSchema(rtoRpoTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertRtoRpoMeasurementSchema = createInsertSchema(rtoRpoMeasurements).omit({
  id: true,
  createdAt: true
});
var insertPerformanceBenchmarkSchema = createInsertSchema(performanceBenchmarks).omit({
  id: true,
  createdAt: true
});
var insertIncidentRunbookSchema = createInsertSchema(incidentRunbooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertRunbookStepSchema = createInsertSchema(runbookSteps).omit({
  id: true
});
var insertRunbookContactSchema = createInsertSchema(runbookContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertContactEscalationTreeSchema = createInsertSchema(contactEscalationTrees).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertRunbookExecutionSchema = createInsertSchema(runbookExecutions).omit({
  id: true,
  startedAt: true
});
var dashboardUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().nullish().transform((v) => v ?? void 0),
  lastName: z.string().nullish().transform((v) => v ?? void 0),
  emailVerified: z.boolean(),
  joinedAt: z.string().datetime(),
  daysSinceJoining: z.number().int().min(0)
});
var dashboardWatchlistItemSchema = z.object({
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
  isActive: z.boolean().optional()
});
var dashboardRecommendationSchema = z.object({
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
  isActive: z.boolean().optional()
});
var dashboardStatsSchema = z.object({
  savedElections: z.number().int().min(0),
  totalUpcomingElections: z.number().int().min(0),
  watchlistActivity: z.number().int().min(0)
});
var dashboardQuickActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  path: z.string().optional(),
  action: z.string().optional()
});
var dashboardResponseSchema = z.object({
  user: dashboardUserSchema,
  watchlist: z.array(dashboardWatchlistItemSchema),
  recommendations: z.array(dashboardRecommendationSchema),
  stats: dashboardStatsSchema,
  quickActions: z.array(dashboardQuickActionSchema)
});
var insertElectionRecommendationSchema = createInsertSchema(electionRecommendations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUserRecommendationAnalyticsSchema = createInsertSchema(userRecommendationAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertRecommendationCacheSchema = createInsertSchema(recommendationCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var recommendationRequestSchema = z.object({
  userId: z.string(),
  limit: z.number().int().min(1).max(50).default(10),
  type: z.enum(["location_based", "interest_based", "trending", "similar_users"]).optional(),
  includeExpired: z.boolean().default(false),
  cacheKey: z.string().optional()
});
var recommendationResponseSchema = z.object({
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
      description: z.string().optional()
    }),
    score: z.number(),
    type: z.string(),
    reason: z.string(),
    isPresented: z.boolean().default(false),
    isViewed: z.boolean().default(false),
    isClicked: z.boolean().default(false),
    isAddedToWatchlist: z.boolean().default(false),
    isDismissed: z.boolean().default(false)
  })),
  totalCount: z.number(),
  cacheKey: z.string().optional(),
  generatedAt: z.string()
});
var watchlistAnalyticsSchema = z.object({
  totalItems: z.number(),
  byStatus: z.record(z.number()),
  byCategory: z.record(z.number()),
  byPriority: z.record(z.number()),
  recentlyAdded: z.number(),
  upcomingElections: z.number(),
  completedElections: z.number()
});
var enhancedWatchlistResponseSchema = z.object({
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
      description: z.string().optional()
    }),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  analytics: watchlistAnalyticsSchema,
  totalCount: z.number(),
  hasMore: z.boolean()
});
var userEvents = pgTable("user_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  // Can be null for anonymous events
  sessionId: varchar("session_id").notNull(),
  // Track anonymous sessions
  // Event Details
  eventType: text("event_type").notNull(),
  // 'page_view', 'click', 'form_submit', 'search', 'api_call'
  eventAction: text("event_action"),
  // 'login', 'register', 'add_to_watchlist', 'view_election', 'compare_candidates'
  eventCategory: text("event_category"),
  // 'authentication', 'navigation', 'engagement', 'conversion'
  // Page/Context Information
  pageUrl: text("page_url").notNull(),
  pagePath: text("page_path").notNull(),
  // Normalized path for grouping
  pageTitle: text("page_title"),
  referrerUrl: text("referrer_url"),
  // Target/Content Information
  targetType: text("target_type"),
  // 'election', 'candidate', 'watchlist_item', 'user_preference'
  targetId: integer("target_id"),
  // ID of the target object
  targetMetadata: jsonb("target_metadata"),
  // Additional context about the target
  // User Experience Metrics
  timeOnPage: integer("time_on_page"),
  // seconds spent on page
  scrollDepth: integer("scroll_depth"),
  // percentage scrolled
  clickPosition: jsonb("click_position"),
  // {x, y} coordinates for click events
  // Technical Context
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  // Anonymized for privacy
  deviceType: text("device_type"),
  // 'desktop', 'mobile', 'tablet'
  browserName: text("browser_name"),
  screenResolution: text("screen_resolution"),
  // UTM and Campaign Tracking
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  // Privacy and Consent
  isAnonymous: boolean("is_anonymous").default(false),
  // User opted for anonymous tracking
  consentLevel: text("consent_level").default("basic"),
  // 'none', 'basic', 'analytics', 'full'
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("user_events_user_id_idx").on(table.userId),
  index("user_events_session_id_idx").on(table.sessionId),
  index("user_events_type_idx").on(table.eventType),
  index("user_events_action_idx").on(table.eventAction),
  index("user_events_created_at_idx").on(table.createdAt),
  index("user_events_page_path_idx").on(table.pagePath),
  index("user_events_target_idx").on(table.targetType, table.targetId)
]);
var userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  // Can be null for anonymous sessions
  // Session Lifecycle
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  duration: integer("duration"),
  // Total session duration in seconds
  isActive: boolean("is_active").default(true),
  // Session Context
  entryPage: text("entry_page").notNull(),
  // First page visited
  exitPage: text("exit_page"),
  // Last page visited
  referrerUrl: text("referrer_url"),
  landingCampaign: jsonb("landing_campaign"),
  // UTM parameters at session start
  // Session Metrics
  pageViews: integer("page_views").default(0),
  uniquePageViews: integer("unique_page_views").default(0),
  eventsCount: integer("events_count").default(0),
  conversionEvents: integer("conversion_events").default(0),
  // High-value actions
  // User Experience
  bounceRate: boolean("is_bounce").default(false),
  // Single page session < 10 seconds
  avgPageLoadTime: integer("avg_page_load_time"),
  // milliseconds
  avgTimeOnPage: integer("avg_time_on_page"),
  // seconds
  maxScrollDepth: integer("max_scroll_depth"),
  // highest scroll percentage
  // Technical Information
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  // Anonymized
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
  trackingConsent: text("tracking_consent").default("basic"),
  // Level of tracking consent
  isAnonymized: boolean("is_anonymized").default(false),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("user_sessions_user_id_idx").on(table.userId),
  index("user_sessions_started_at_idx").on(table.startedAt),
  index("user_sessions_active_idx").on(table.isActive),
  index("user_sessions_duration_idx").on(table.duration),
  index("user_sessions_entry_page_idx").on(table.entryPage)
]);
var conversionFunnels = pgTable("conversion_funnels", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  // Funnel Definition
  funnelName: text("funnel_name").notNull(),
  // 'registration', 'activation', 'engagement', 'retention'
  funnelVersion: text("funnel_version").default("1.0"),
  // For A/B testing different funnel flows
  // Funnel Progress
  currentStep: text("current_step").notNull(),
  // Current step in the funnel
  stepOrder: integer("step_order").notNull(),
  // Numeric order of current step
  totalSteps: integer("total_steps").notNull(),
  // Total steps in this funnel
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  // Step Progression Tracking
  stepsCompleted: text("steps_completed").array(),
  // Array of completed step names
  stepTimestamps: jsonb("step_timestamps"),
  // {step_name: timestamp} mapping
  stepDurations: jsonb("step_durations"),
  // Time spent on each step in seconds
  dropOffStep: text("drop_off_step"),
  // Step where user dropped off
  dropOffReason: text("drop_off_reason"),
  // 'abandoned', 'error', 'redirect'
  // Performance Metrics
  timeToComplete: integer("time_to_complete"),
  // Total time from start to completion in seconds
  attemptNumber: integer("attempt_number").default(1),
  // How many times user attempted this funnel
  conversionValue: numeric("conversion_value", { precision: 10, scale: 2 }),
  // Business value of conversion
  // Context and Attribution
  entryPoint: text("entry_point"),
  // How user entered this funnel
  campaignData: jsonb("campaign_data"),
  // UTM and campaign attribution
  deviceContext: jsonb("device_context"),
  // Device/browser info at funnel start
  // A/B Testing Support
  experimentId: text("experiment_id"),
  // A/B test experiment identifier
  variantId: text("variant_id"),
  // A/B test variant
  cohortId: text("cohort_id"),
  // User cohort for analysis
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("conversion_funnels_user_id_idx").on(table.userId),
  index("conversion_funnels_session_id_idx").on(table.sessionId),
  index("conversion_funnels_name_idx").on(table.funnelName),
  index("conversion_funnels_step_idx").on(table.currentStep),
  index("conversion_funnels_completed_idx").on(table.isCompleted),
  index("conversion_funnels_created_at_idx").on(table.createdAt),
  index("conversion_funnels_cohort_idx").on(table.cohortId)
]);
var userEngagementScores = pgTable("user_engagement_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  // Time Periods for Scoring
  scoreDate: timestamp("score_date").notNull(),
  // Date this score represents
  scorePeriod: text("score_period").notNull(),
  // 'daily', 'weekly', 'monthly'
  // Core Engagement Metrics
  totalScore: numeric("total_score", { precision: 8, scale: 2 }).notNull(),
  loginFrequency: numeric("login_frequency", { precision: 5, scale: 2 }).default("0"),
  sessionDuration: numeric("session_duration", { precision: 5, scale: 2 }).default("0"),
  pageViewDepth: numeric("page_view_depth", { precision: 5, scale: 2 }).default("0"),
  featureUsage: numeric("feature_usage", { precision: 5, scale: 2 }).default("0"),
  contentInteraction: numeric("content_interaction", { precision: 5, scale: 2 }).default("0"),
  // Specific Platform Engagement
  watchlistActivity: numeric("watchlist_activity", { precision: 5, scale: 2 }).default("0"),
  electionViews: numeric("election_views", { precision: 5, scale: 2 }).default("0"),
  candidateComparisons: numeric("candidate_comparisons", { precision: 5, scale: 2 }).default("0"),
  preferencesUpdates: numeric("preferences_updates", { precision: 5, scale: 2 }).default("0"),
  notificationEngagement: numeric("notification_engagement", { precision: 5, scale: 2 }).default("0"),
  // Social and Sharing Behavior
  shareActivity: numeric("share_activity", { precision: 5, scale: 2 }).default("0"),
  referralActivity: numeric("referral_activity", { precision: 5, scale: 2 }).default("0"),
  // Quality Indicators
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }),
  // Based on time spent, repeat visits
  retentionRisk: numeric("retention_risk", { precision: 5, scale: 2 }),
  // Churn prediction score
  loyaltyScore: numeric("loyalty_score", { precision: 5, scale: 2 }),
  // Long-term engagement
  // Calculated Segments
  engagementTier: text("engagement_tier"),
  // 'low', 'medium', 'high', 'power_user'
  userSegment: text("user_segment"),
  // 'new', 'casual', 'regular', 'champion', 'at_risk'
  nextBestAction: text("next_best_action"),
  // Recommended action to increase engagement
  // Score Calculation Metadata
  calculationMethod: text("calculation_method").default("v1.0"),
  // Algorithm version
  dataPoints: integer("data_points"),
  // Number of events used in calculation
  confidenceLevel: numeric("confidence_level", { precision: 3, scale: 2 }),
  // Statistical confidence
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("user_engagement_scores_user_id_idx").on(table.userId),
  index("user_engagement_scores_date_idx").on(table.scoreDate),
  index("user_engagement_scores_period_idx").on(table.scorePeriod),
  index("user_engagement_scores_total_idx").on(table.totalScore),
  index("user_engagement_scores_tier_idx").on(table.engagementTier),
  index("user_engagement_scores_segment_idx").on(table.userSegment)
]);
var userJourneyPaths = pgTable("user_journey_paths", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  // Path Information
  pathName: text("path_name"),
  // Named common paths like 'registration_flow', 'election_discovery'
  pathSequence: text("path_sequence").array().notNull(),
  // Array of page/action sequences
  pathLength: integer("path_length").notNull(),
  // Number of steps in path
  // Path Timing
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  totalDuration: integer("total_duration"),
  // Total time for entire path in seconds
  stepDurations: integer("step_durations").array(),
  // Time spent on each step
  // Path Outcome
  isCompleted: boolean("is_completed").default(false),
  conversionValue: numeric("conversion_value", { precision: 10, scale: 2 }),
  // Business value
  exitPoint: text("exit_point"),
  // Where user left the path
  exitReason: text("exit_reason"),
  // 'completed', 'abandoned', 'error', 'redirect'
  // Path Context
  entryPoint: text("entry_point").notNull(),
  // How user entered this path
  deviceType: text("device_type"),
  campaignAttribution: jsonb("campaign_attribution"),
  // UTM data
  // Common Path Patterns (for analysis)
  isCommonPath: boolean("is_common_path").default(false),
  // Identified as common user flow
  pathVariant: text("path_variant"),
  // Different versions of same logical path
  pathEfficiency: numeric("path_efficiency", { precision: 5, scale: 2 }),
  // Completion rate for this path type
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("user_journey_paths_user_id_idx").on(table.userId),
  index("user_journey_paths_session_id_idx").on(table.sessionId),
  index("user_journey_paths_name_idx").on(table.pathName),
  index("user_journey_paths_completed_idx").on(table.isCompleted),
  index("user_journey_paths_entry_idx").on(table.entryPoint),
  index("user_journey_paths_common_idx").on(table.isCommonPath)
]);
var analyticsPreferences = pgTable("analytics_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  // Consent and Privacy Settings
  hasConsented: boolean("has_consented").default(false),
  consentDate: timestamp("consent_date"),
  consentVersion: text("consent_version"),
  // Track which privacy policy version
  trackingLevel: text("tracking_level").default("basic"),
  // 'none', 'basic', 'analytics', 'full'
  // Granular Consent Controls
  allowPageViewTracking: boolean("allow_page_view_tracking").default(true),
  allowClickTracking: boolean("allow_click_tracking").default(true),
  allowSessionTracking: boolean("allow_session_tracking").default(true),
  allowEngagementScoring: boolean("allow_engagement_scoring").default(true),
  allowPersonalization: boolean("allow_personalization").default(true),
  allowMarketingAnalytics: boolean("allow_marketing_analytics").default(false),
  // Data Retention Preferences
  dataRetentionPeriod: integer("data_retention_period").default(365),
  // Days to retain data
  allowDataExport: boolean("allow_data_export").default(true),
  allowDataDeletion: boolean("allow_data_deletion").default(true),
  // Analytics Features Opt-in/out
  allowEngagementNotifications: boolean("allow_engagement_notifications").default(false),
  allowUsageReports: boolean("allow_usage_reports").default(false),
  allowBenchmarkComparisons: boolean("allow_benchmark_comparisons").default(false),
  // Privacy Controls
  anonymizeData: boolean("anonymize_data").default(false),
  // Remove PII from analytics
  allowThirdPartyIntegrations: boolean("allow_third_party_integrations").default(false),
  allowCrossDeviceTracking: boolean("allow_cross_device_tracking").default(false),
  // Preference Management
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: text("updated_by"),
  // 'user', 'admin', 'system'
  auditTrail: jsonb("audit_trail"),
  // Track changes to preferences
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("analytics_preferences_user_id_idx").on(table.userId),
  index("analytics_preferences_consent_idx").on(table.hasConsented),
  index("analytics_preferences_tracking_level_idx").on(table.trackingLevel)
]);
var analyticsAggregations = pgTable("analytics_aggregations", {
  id: serial("id").primaryKey(),
  // Aggregation Metadata
  aggregationType: text("aggregation_type").notNull(),
  // 'daily', 'weekly', 'monthly'
  aggregationDate: timestamp("aggregation_date").notNull(),
  // Date being aggregated
  // User Metrics
  totalUsers: integer("total_users").default(0),
  activeUsers: integer("active_users").default(0),
  newUsers: integer("new_users").default(0),
  returningUsers: integer("returning_users").default(0),
  // Session Metrics
  totalSessions: integer("total_sessions").default(0),
  averageSessionDuration: numeric("average_session_duration", { precision: 8, scale: 2 }).default("0"),
  bounceRate: numeric("bounce_rate", { precision: 5, scale: 2 }).default("0"),
  pagesPerSession: numeric("pages_per_session", { precision: 5, scale: 2 }).default("0"),
  // Engagement Metrics
  totalPageViews: integer("total_page_views").default(0),
  totalEvents: integer("total_events").default(0),
  averageEngagementScore: numeric("average_engagement_score", { precision: 8, scale: 2 }).default("0"),
  // Conversion Metrics
  conversionEvents: integer("conversion_events").default(0),
  funnelCompletions: integer("funnel_completions").default(0),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }).default("0"),
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
  averagePageLoadTime: numeric("average_page_load_time", { precision: 8, scale: 2 }).default("0"),
  errorRate: numeric("error_rate", { precision: 5, scale: 2 }).default("0"),
  // Data Quality
  recordsProcessed: integer("records_processed").default(0),
  dataCompleteness: numeric("data_completeness", { precision: 5, scale: 2 }).default("100"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("analytics_aggregations_type_idx").on(table.aggregationType),
  index("analytics_aggregations_date_idx").on(table.aggregationDate),
  index("analytics_aggregations_created_at_idx").on(table.createdAt)
]);
var validationResults = pgTable("validation_results", {
  id: serial("id").primaryKey(),
  // What was validated
  entityType: text("entity_type").notNull(),
  // 'election', 'candidate', 'congress_member', 'polling_data'
  entityId: integer("entity_id").notNull(),
  // ID of the entity validated
  // Validation details
  validationType: text("validation_type").notNull(),
  // 'date_rules', 'ai_verification', 'official_source', 'manual_review'
  validationLayer: integer("validation_layer").notNull(),
  // 1=rules, 2=AI, 3=official sources, 4=manual
  // Results
  isValid: boolean("is_valid").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
  // 0-100
  validationStatus: text("validation_status").notNull(),
  // 'passed', 'failed', 'warning', 'flagged'
  // Issues found
  issuesFound: jsonb("issues_found"),
  // Array of {code, message, severity}
  errorDetails: jsonb("error_details"),
  warnings: text("warnings").array(),
  // Source verification
  sourcesChecked: text("sources_checked").array(),
  // URLs or API names checked
  sourceAgreement: numeric("source_agreement", { precision: 5, scale: 2 }),
  // % of sources agreeing
  // Fix tracking
  autoFixApplied: boolean("auto_fix_applied").default(false),
  fixDetails: jsonb("fix_details"),
  requiresManualReview: boolean("requires_manual_review").default(false),
  // Metadata
  validatedBy: text("validated_by"),
  // 'system', 'ai', 'user_id'
  validatedAt: timestamp("validated_at").defaultNow(),
  metadata: jsonb("metadata")
}, (table) => [
  index("validation_results_entity_idx").on(table.entityType, table.entityId),
  index("validation_results_type_idx").on(table.validationType),
  index("validation_results_status_idx").on(table.validationStatus),
  index("validation_results_manual_review_idx").on(table.requiresManualReview),
  index("validation_results_validated_at_idx").on(table.validatedAt)
]);
var dataProvenance = pgTable("data_provenance", {
  id: serial("id").primaryKey(),
  // What this provenance record is for
  entityType: text("entity_type").notNull(),
  // 'election', 'candidate', 'congress_member', 'polling_data'
  entityId: integer("entity_id").notNull(),
  fieldName: text("field_name"),
  // Specific field if applicable (e.g., 'date', 'party')
  // Source information
  sourceType: text("source_type").notNull(),
  // 'google_civic_api', 'manual_entry', 'bulk_import', 'perplexity_ai', 'sos_website'
  sourceUrl: text("source_url"),
  // Original source URL
  sourceApiEndpoint: text("source_api_endpoint"),
  // API endpoint used
  sourceDocumentation: text("source_documentation"),
  // Link to source docs
  // Data quality
  dataQualityRating: text("data_quality_rating"),
  // 'excellent', 'good', 'fair', 'poor', 'unverified'
  isOfficialSource: boolean("is_official_source").default(false),
  // .gov or official
  isVerified: boolean("is_verified").default(false),
  verificationMethod: text("verification_method"),
  // How it was verified
  // Timestamps
  dataCollectedAt: timestamp("data_collected_at"),
  lastVerifiedAt: timestamp("last_verified_at"),
  expiresAt: timestamp("expires_at"),
  // When data should be re-verified
  // Import/Entry metadata
  importBatchId: text("import_batch_id"),
  // Group related imports
  enteredBy: text("entered_by"),
  // user_id or 'system'
  importMethod: text("import_method"),
  // 'api_sync', 'bulk_import', 'manual', 'ai_enrichment'
  // Change tracking
  previousValue: text("previous_value"),
  currentValue: text("current_value"),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata")
}, (table) => [
  index("data_provenance_entity_idx").on(table.entityType, table.entityId),
  index("data_provenance_source_type_idx").on(table.sourceType),
  index("data_provenance_official_idx").on(table.isOfficialSource),
  index("data_provenance_verified_idx").on(table.isVerified),
  index("data_provenance_batch_idx").on(table.importBatchId)
]);
var auditRuns = pgTable("audit_runs", {
  id: serial("id").primaryKey(),
  auditId: varchar("audit_id").notNull().unique(),
  // UUID for tracking
  // Audit configuration
  auditType: text("audit_type").notNull(),
  // 'daily_validation', 'weekly_deep_scan', 'on_demand', 'import_validation'
  auditScope: text("audit_scope").notNull(),
  // 'all_elections', 'recent_updates', 'specific_state', 'all_candidates'
  scopeFilters: jsonb("scope_filters"),
  // Additional filters applied
  // Execution tracking
  status: text("status").notNull(),
  // 'queued', 'running', 'completed', 'failed', 'partial'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  // seconds
  // Results summary
  totalEntitiesChecked: integer("total_entities_checked").default(0),
  issuesFound: integer("issues_found").default(0),
  criticalIssues: integer("critical_issues").default(0),
  warningsFound: integer("warnings_found").default(0),
  autoFixesApplied: integer("auto_fixes_applied").default(0),
  manualReviewsQueued: integer("manual_reviews_queued").default(0),
  // Detailed results
  issueBreakdown: jsonb("issue_breakdown"),
  // {type: count} mapping
  affectedEntities: jsonb("affected_entities"),
  // Array of {type, id, issues}
  validationSummary: jsonb("validation_summary"),
  // Performance metrics
  avgValidationTime: numeric("avg_validation_time", { precision: 8, scale: 2 }),
  // ms per entity
  apiCallsMade: integer("api_calls_made").default(0),
  cacheHitRate: numeric("cache_hit_rate", { precision: 5, scale: 2 }),
  // Error tracking
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  // Audit metadata
  triggeredBy: text("triggered_by"),
  // 'scheduler', 'user_id', 'api_import', 'manual'
  auditVersion: text("audit_version").default("1.0"),
  // Audit rules version
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata")
}, (table) => [
  index("audit_runs_audit_id_idx").on(table.auditId),
  index("audit_runs_type_idx").on(table.auditType),
  index("audit_runs_status_idx").on(table.status),
  index("audit_runs_started_at_idx").on(table.startedAt),
  index("audit_runs_issues_found_idx").on(table.issuesFound)
]);
var manualReviewQueue = pgTable("manual_review_queue", {
  id: serial("id").primaryKey(),
  reviewId: varchar("review_id").notNull().unique(),
  // UUID for tracking
  // What needs review
  entityType: text("entity_type").notNull(),
  // 'election', 'candidate', 'congress_member'
  entityId: integer("entity_id").notNull(),
  fieldName: text("field_name"),
  // Specific field with issue
  // Issue details
  issueType: text("issue_type").notNull(),
  // 'incorrect_date', 'missing_data', 'conflicting_sources', 'suspicious_data'
  issueSeverity: text("issue_severity").notNull(),
  // 'critical', 'high', 'medium', 'low'
  issueDescription: text("issue_description").notNull(),
  issueDetails: jsonb("issue_details"),
  // Current vs Expected
  currentValue: text("current_value"),
  suggestedValue: text("suggested_value"),
  suggestedFix: jsonb("suggested_fix"),
  // Auto-generated fix suggestion
  conflictingSources: jsonb("conflicting_sources"),
  // Sources that disagree
  // Review status
  reviewStatus: text("review_status").notNull().default("pending"),
  // 'pending', 'in_review', 'resolved', 'dismissed', 'escalated'
  priority: integer("priority").default(50),
  // 0-100, higher = more urgent
  // Assignment
  assignedTo: varchar("assigned_to"),
  // user_id of reviewer
  assignedAt: timestamp("assigned_at"),
  // Resolution tracking
  resolvedBy: varchar("resolved_by"),
  // user_id
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  // 'fixed', 'dismissed_incorrect', 'dismissed_duplicate', 'escalated'
  resolutionNotes: text("resolution_notes"),
  fixApplied: jsonb("fix_applied"),
  // What fix was applied
  // Related validation
  validationResultId: integer("validation_result_id").references(() => validationResults.id),
  auditRunId: integer("audit_run_id").references(() => auditRuns.id),
  // Auto-review attempt
  autoReviewAttempted: boolean("auto_review_attempted").default(false),
  autoReviewConfidence: numeric("auto_review_confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata")
}, (table) => [
  index("manual_review_queue_entity_idx").on(table.entityType, table.entityId),
  index("manual_review_queue_status_idx").on(table.reviewStatus),
  index("manual_review_queue_severity_idx").on(table.issueSeverity),
  index("manual_review_queue_priority_idx").on(table.priority),
  index("manual_review_queue_assigned_idx").on(table.assignedTo),
  index("manual_review_queue_created_at_idx").on(table.createdAt)
]);
var insertUserEventSchema = createInsertSchema(userEvents).omit({
  id: true,
  createdAt: true
});
var insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  updatedAt: true
});
var insertConversionFunnelSchema = createInsertSchema(conversionFunnels).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUserEngagementScoreSchema = createInsertSchema(userEngagementScores).omit({
  id: true,
  createdAt: true
});
var insertUserJourneyPathSchema = createInsertSchema(userJourneyPaths).omit({
  id: true,
  createdAt: true
});
var insertAnalyticsPreferencesSchema = createInsertSchema(analyticsPreferences).omit({
  id: true,
  createdAt: true,
  lastUpdated: true
});
var insertAnalyticsAggregationSchema = createInsertSchema(analyticsAggregations).omit({
  id: true,
  createdAt: true
});
var insertValidationResultSchema = createInsertSchema(validationResults).omit({
  id: true,
  validatedAt: true
});
var insertDataProvenanceSchema = createInsertSchema(dataProvenance).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAuditRunSchema = createInsertSchema(auditRuns).omit({
  id: true,
  createdAt: true
});
var insertManualReviewQueueSchema = createInsertSchema(manualReviewQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var analyticsOverviewSchema = z.object({
  timeframe: z.string(),
  users: z.object({
    total: z.number(),
    active: z.number(),
    new: z.number(),
    returning: z.number(),
    growthRate: z.number()
  }),
  sessions: z.object({
    total: z.number(),
    averageDuration: z.number(),
    bounceRate: z.number(),
    pagesPerSession: z.number()
  }),
  engagement: z.object({
    averageScore: z.number(),
    topFeatures: z.array(z.object({
      feature: z.string(),
      usage: z.number(),
      growth: z.number()
    })),
    userSegments: z.object({
      powerUsers: z.number(),
      regularUsers: z.number(),
      casualUsers: z.number(),
      atRiskUsers: z.number()
    })
  }),
  conversions: z.object({
    registrationRate: z.number(),
    activationRate: z.number(),
    retentionRate: z.number(),
    funnelPerformance: z.array(z.object({
      step: z.string(),
      completionRate: z.number(),
      dropOffRate: z.number()
    }))
  })
});
var userJourneyAnalysisSchema = z.object({
  commonPaths: z.array(z.object({
    path: z.array(z.string()),
    frequency: z.number(),
    averageDuration: z.number(),
    completionRate: z.number()
  })),
  entryPoints: z.array(z.object({
    page: z.string(),
    visits: z.number(),
    conversionRate: z.number()
  })),
  exitPoints: z.array(z.object({
    page: z.string(),
    exitRate: z.number(),
    reason: z.string()
  })),
  conversionPaths: z.array(z.object({
    path: z.array(z.string()),
    value: z.number(),
    timeToConvert: z.number()
  }))
});
var engagementReportSchema = z.object({
  period: z.string(),
  overallScore: z.number(),
  trendDirection: z.string(),
  keyMetrics: z.object({
    dailyActiveUsers: z.number(),
    weeklyActiveUsers: z.number(),
    monthlyActiveUsers: z.number(),
    averageSessionTime: z.number(),
    featureAdoptionRate: z.number()
  }),
  segmentAnalysis: z.array(z.object({
    segment: z.string(),
    users: z.number(),
    score: z.number(),
    trend: z.string(),
    recommendations: z.array(z.string())
  })),
  featureUsage: z.array(z.object({
    feature: z.string(),
    usage: z.number(),
    growth: z.number(),
    satisfaction: z.number()
  }))
});
var insertPollingDataSchema = createInsertSchema(pollingData).omit({
  id: true,
  createdAt: true
});
var insertUserVotingIntentionsSchema = createInsertSchema(userVotingIntentions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPoliticalMomentumSchema = createInsertSchema(politicalMomentum).omit({
  id: true,
  calculatedAt: true
});
var politicalAnalysisResponseSchema = z.object({
  leaning: z.enum(["left", "right", "split", "neutral"]),
  intensity: z.enum(["low", "medium", "high"]),
  baseline: z.enum(["red", "blue", "purple"]),
  isShifting: z.boolean(),
  shiftDirection: z.enum(["red-to-blue", "blue-to-red"]).optional(),
  competitiveness: z.number().min(0).max(1),
  lastUpdated: z.date()
});

// server/db.ts
import { config } from "dotenv";
var { Pool: PgPool } = pg;
config();
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
  connectionTimeoutMillis: 1e4,
  idleTimeoutMillis: 3e4,
  allowExitOnIdle: true
};
var pool = new PgPool(poolConfig);
pool.on("error", (err) => {
  console.error("Database pool error:", {
    message: err.message,
    code: err.code,
    severity: err.severity,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
pool.on("connect", () => {
  console.log("\u2705 Database connection established");
});
pool.on("remove", () => {
  console.log("\u{1F50C} Database connection removed from pool");
});
var db = drizzle({ client: pool, schema: schema_exports });

// server/auth.ts
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { nanoid } from "nanoid";
import crypto2 from "crypto";

// server/config/secrets.ts
import crypto from "crypto";
var generated = /* @__PURE__ */ new Map();
function getRequiredSecret(name) {
  const v = process.env[name];
  if (v && v.trim().length >= 16) return v;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`[config] ${name} must be set (>=16 chars) in production`);
  }
  if (!generated.has(name)) {
    generated.set(name, crypto.randomBytes(32).toString("hex"));
    console.warn(`[config] ${name} not set - using a random per-process value (dev only)`);
  }
  return generated.get(name);
}

// server/security-events.ts
import { randomUUID } from "crypto";
var REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;
function requestIdMiddleware(req, res, next) {
  const incoming = req.get("x-request-id");
  const id = incoming && REQUEST_ID_RE.test(incoming) ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
function getRequestId(req) {
  return req?.requestId ?? null;
}
function buildSecurityDecision(req, input) {
  const path = req?.originalUrl ? req.originalUrl.split("?")[0] : null;
  return {
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    type: "security_decision",
    action: input.action,
    result: input.result,
    actor: input.actor ?? null,
    resource: input.resource ?? path ?? void 0,
    reason: input.reason,
    details: input.details,
    requestId: getRequestId(req),
    ip: req?.ip ?? null,
    method: req?.method ?? null,
    path
  };
}
var sink = (line) => console.log(line);
function setSecurityEventSink(fn) {
  sink = fn ?? ((line) => console.log(line));
}
function recordSecurityDecision(req, input) {
  const event = buildSecurityDecision(req, input);
  sink(JSON.stringify(event));
  return event;
}

// server/auth.ts
var SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "et.sid";
var JWT_SECRET = getRequiredSecret("JWT_SECRET");
var SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || "720", 10);
var SECURE = process.env.NODE_ENV === "production";
function signSession(payload, hours = SESSION_TTL_HOURS) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${hours}h` });
}
function verifySession(token) {
  return jwt.verify(token, JWT_SECRET);
}
async function createSession(userId, ua, ip) {
  const jti = crypto2.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1e3);
  await pool.query(
    `INSERT INTO auth_sessions(user_id, jti, user_agent, ip, expires_at) VALUES($1,$2,$3,$4,$5)`,
    [userId, jti, ua, ip, expiresAt]
  );
  const token = signSession({ uid: userId, jti });
  return token;
}
async function revokeSession(userId, jti) {
  await pool.query(`UPDATE auth_sessions SET revoked = TRUE WHERE user_id=$1 AND jti=$2`, [userId, jti]);
}
function authRequired() {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.[SESSION_COOKIE];
      if (!token) {
        recordSecurityDecision(req, { action: "auth.session", result: "deny", actor: null, reason: "no_session_cookie" });
        return res.status(401).json({ error: "unauthorized" });
      }
      const { uid, jti } = verifySession(token);
      try {
        const q = await pool.query(
          `SELECT 1 FROM auth_sessions WHERE user_id=$1 AND jti=$2 AND revoked=FALSE AND now() < expires_at`,
          [uid, jti]
        );
        if (q.rowCount) {
          req.userId = uid;
          req.jti = jti;
          return next();
        }
      } catch (dbError) {
        console.error("Session store unavailable; refusing authenticated request");
        recordSecurityDecision(req, { action: "auth.session", result: "error", actor: String(uid), reason: "session_store_unavailable" });
        return res.status(503).json({ error: "session_store_unavailable" });
      }
      recordSecurityDecision(req, { action: "auth.session", result: "deny", actor: String(uid), reason: "session_revoked_or_expired" });
      return res.status(401).json({ error: "unauthorized" });
    } catch (jwtError) {
      recordSecurityDecision(req, { action: "auth.session", result: "deny", actor: null, reason: "invalid_session_token" });
      return res.status(401).json({ error: "unauthorized" });
    }
  };
}
var isAuthenticated = async (req, res, next) => {
  const middleware = authRequired();
  return middleware(req, res, (err) => {
    if (err) return next(err);
    req.user = { claims: { sub: String(req.userId) } };
    next();
  });
};

// server/candidate-position-api.ts
import { eq, and, desc } from "drizzle-orm";
var CandidatePositionUnavailableError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "CandidatePositionUnavailableError";
  }
};
var CandidatePositionAPI = class {
  async getPositionsForCandidate(candidateId) {
    if (!Number.isSafeInteger(candidateId) || candidateId < 1) throw new CandidatePositionUnavailableError("INVALID_CANDIDATE_ID", "A positive candidate identifier is required");
    let rows;
    try {
      rows = await db.select().from(candidatePositions).where(and(
        eq(candidatePositions.candidateId, candidateId),
        eq(candidatePositions.isVerified, true)
      )).orderBy(desc(candidatePositions.lastUpdated), desc(candidatePositions.id));
    } catch {
      throw new CandidatePositionUnavailableError("POSITION_SOURCE_UNAVAILABLE", "Verified candidate position records are unavailable");
    }
    if (!Array.isArray(rows)) throw new CandidatePositionUnavailableError("POSITION_SOURCE_UNAVAILABLE", "Verified candidate position records are unavailable");
    const positions = [];
    const categories = /* @__PURE__ */ new Set();
    for (const row of rows) {
      if (row.candidateId !== candidateId || row.isVerified !== true) continue;
      if (!Number.isSafeInteger(row.id) || row.id < 1 || !row.category?.trim() || !row.position?.trim()) throw new CandidatePositionUnavailableError("INVALID_POSITION_SOURCE", "Verified position has invalid source identity or text");
      if (categories.has(row.category)) continue;
      let sourceUrl = null;
      if (row.sourceUrl !== null) {
        try {
          const url2 = new URL(row.sourceUrl);
          if (url2.protocol !== "https:" || url2.username || url2.password) throw new Error("Unsafe source URL");
          sourceUrl = row.sourceUrl;
        } catch {
          throw new CandidatePositionUnavailableError("INVALID_POSITION_SOURCE", "Verified position has an invalid source URL");
        }
      }
      const date2 = row.lastUpdated ?? row.createdAt ?? null;
      if (date2 !== null && (!(date2 instanceof Date) || !Number.isFinite(date2.getTime()))) throw new CandidatePositionUnavailableError("INVALID_POSITION_SOURCE", "Verified position has an invalid recorded date");
      categories.add(row.category);
      positions.push({ category: row.category, position: row.position, confidence: null, sources: [{
        type: "Candidate Portal",
        sourcePositionId: row.id,
        description: row.position,
        confidence: null,
        url: sourceUrl,
        date: date2
      }] });
    }
    return positions;
  }
};
var candidatePositionAPI = new CandidatePositionAPI();

// server/verified-policy-comparison.ts
import { inArray } from "drizzle-orm";
var VERIFIED_COMPARE_MAX_CANDIDATES = 20;
var VERIFIED_COMPARE_MAX_CATEGORIES = 20;
var VerifiedPolicyComparisonError = class extends Error {
  constructor(code, status, message) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "VerifiedPolicyComparisonError";
  }
};
function refuse(condition, code, status, message) {
  if (!condition) throw new VerifiedPolicyComparisonError(code, status, message);
}
function verifiedComparisonInputs(candidateIds, categories) {
  const rawIds = typeof candidateIds === "string" ? candidateIds.split(",") : candidateIds;
  refuse(Array.isArray(rawIds) && rawIds.length > 0 && rawIds.length <= VERIFIED_COMPARE_MAX_CANDIDATES, "INVALID_CANDIDATE_IDS", 400, "Use between one and twenty candidate identifiers");
  const ids = [];
  for (const value of rawIds) {
    refuse(typeof value === "number" || typeof value === "string" && /^[1-9]\d*$/.test(value.trim()), "INVALID_CANDIDATE_IDS", 400, "Candidate identifiers must be complete positive integers");
    const id = typeof value === "number" ? value : Number(value.trim());
    refuse(Number.isSafeInteger(id) && id > 0 && id <= 2147483647, "INVALID_CANDIDATE_IDS", 400, "Candidate identifier is outside the stored integer range");
    if (!ids.includes(id)) ids.push(id);
  }
  const rawCategories = typeof categories === "string" ? categories.split(",") : categories;
  refuse(Array.isArray(rawCategories) && rawCategories.length > 0 && rawCategories.length <= VERIFIED_COMPARE_MAX_CATEGORIES, "INVALID_POLICY_CATEGORIES", 400, "Use between one and twenty policy categories");
  const requested = [], keys = /* @__PURE__ */ new Set();
  for (const value of rawCategories) {
    refuse(typeof value === "string" && value.trim().length > 0 && value.trim().length <= 100 && !/[\u0000-\u001f\u007f]/.test(value), "INVALID_POLICY_CATEGORIES", 400, "Policy categories must be nonempty bounded text");
    const category = value.trim(), key = category.toLowerCase();
    if (!keys.has(key)) {
      requested.push(category);
      keys.add(key);
    }
  }
  return { ids, categories: requested };
}
async function compareVerifiedCandidatePolicies(candidateIds, policyCategories) {
  const input = verifiedComparisonInputs(candidateIds, policyCategories);
  let identities;
  try {
    identities = await db.select({ id: candidates.id, name: candidates.name }).from(candidates).where(inArray(candidates.id, input.ids));
  } catch {
    throw new VerifiedPolicyComparisonError("CANDIDATE_SOURCE_UNAVAILABLE", 503, "Candidate identity records are unavailable");
  }
  refuse(Array.isArray(identities), "CANDIDATE_SOURCE_UNAVAILABLE", 503, "Candidate identity records are unavailable");
  const names = /* @__PURE__ */ new Map();
  for (const row of identities) {
    refuse(input.ids.includes(row.id) && typeof row.name === "string" && row.name.trim().length > 0 && row.name.length <= 512 && !names.has(row.id), "INVALID_POSITION_SOURCE", 422, "Candidate identity is not uniquely bound to the requested stored subject");
    names.set(row.id, row.name);
  }
  refuse(input.ids.every((id) => names.has(id)), "CANDIDATE_NOT_FOUND", 404, "A requested candidate profile was not found");
  const output = input.categories.map((category) => ({ category, positions: [] }));
  const byCategory = new Map(output.map((row) => [row.category.toLowerCase(), row]));
  const read = async (id) => {
    try {
      return await candidatePositionAPI.getPositionsForCandidate(id);
    } catch (error) {
      if (error instanceof CandidatePositionUnavailableError) throw new VerifiedPolicyComparisonError(error.code === "INVALID_CANDIDATE_ID" ? "INVALID_CANDIDATE_IDS" : error.code, error.code === "INVALID_POSITION_SOURCE" ? 422 : error.code === "INVALID_CANDIDATE_ID" ? 400 : 503, error.message);
      throw new VerifiedPolicyComparisonError("POSITION_SOURCE_UNAVAILABLE", 503, "Verified candidate position records are unavailable");
    }
  };
  const records = await Promise.all(input.ids.map(read));
  input.ids.forEach((id, index2) => {
    const selected = /* @__PURE__ */ new Set();
    for (const position of records[index2]) {
      const key = position.category.trim().toLowerCase();
      const category = byCategory.get(key);
      if (!category) continue;
      if (selected.has(key)) continue;
      selected.add(key);
      refuse(position.sources.length === 1, "INVALID_POSITION_SOURCE", 422, "A comparison statement requires one exact verified source row");
      const source = position.sources[0];
      refuse(Number.isSafeInteger(source.sourcePositionId) && source.sourcePositionId > 0, "INVALID_POSITION_SOURCE", 422, "Verified source row identifier is missing");
      category.positions.push({ candidateId: String(id), candidateName: names.get(id), position: position.position, details: source.description, source: source.type, confidence: null, sourcePositionId: source.sourcePositionId, sourceUrl: source.url, recordedDate: source.date === null ? null : source.date.toISOString() });
    }
  });
  return output;
}

// server/verified-policy-routes.ts
function registerVerifiedPolicyRoutes(app, deps) {
  app.get("/api/candidates/:id/positions", async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) > 2147483647) {
      return res.status(400).json({ code: "INVALID_CANDIDATE_ID", error: "A complete positive candidate identifier is required" });
    }
    try {
      return res.json(await deps.positions(Number(req.params.id)));
    } catch (error) {
      if (error instanceof CandidatePositionUnavailableError) return res.status(error.code === "INVALID_POSITION_SOURCE" ? 422 : error.code === "INVALID_CANDIDATE_ID" ? 400 : 503).json({ code: error.code, error: error.message });
      return res.status(503).json({ code: "POSITION_SOURCE_UNAVAILABLE", error: "Verified candidate position records are unavailable" });
    }
  });
  app.get("/api/civic/compare", async (req, res) => {
    try {
      return res.json(await deps.compare(req.query.candidateIds, req.query.policyCategories));
    } catch (error) {
      if (error instanceof VerifiedPolicyComparisonError) return res.status(error.status).json({ code: error.code, error: error.message });
      return res.status(503).json({ code: "POSITION_SOURCE_UNAVAILABLE", error: "Verified policy statements are unavailable" });
    }
  });
}

// server/voting-intentions.ts
import { createHash } from "node:crypto";
import { z as z2 } from "zod";
var votingIntentionInputSchema = z2.object({
  candidateId: z2.number().int().positive().max(2147483647).nullable().optional(),
  partyPreference: z2.enum(["Democratic", "Republican", "Independent", "Green", "Libertarian", "Other", "Undecided", "D", "R", "I", "G", "L", "O"]).nullable().optional(),
  confidence: z2.enum(["high", "medium", "low"]).nullable().optional()
}).strict().refine((input) => input.candidateId != null || input.partyPreference != null, "Choose a candidate or party preference");
var VotingIntentionError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "VotingIntentionError";
  }
};
function publicRecord(row) {
  return { id: row.id, electionId: row.election_id, candidateId: row.candidate_id, partyPreference: row.party_preference, confidence: row.confidence, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at?.toISOString() ?? null };
}
var VotingIntentionsService = class {
  constructor(pool2) {
    this.pool = pool2;
  }
  async record(electionId, actor, raw) {
    if (!Number.isSafeInteger(electionId) || electionId < 1 || electionId > 2147483647) throw new VotingIntentionError(400, "invalid_election_id", "A complete election identifier is required");
    if (!actor || actor.length > 200) throw new VotingIntentionError(400, "invalid_actor", "Authenticated subject is required");
    const parsed = votingIntentionInputSchema.safeParse(raw);
    if (!parsed.success) throw new VotingIntentionError(422, "invalid_intention", "Choose a valid candidate or party preference and confidence");
    const input = parsed.data;
    const subject = createHash("sha256").update("voting-intention\0" + actor).digest("hex");
    const client = await this.pool.connect().catch(() => {
      throw new VotingIntentionError(503, "intention_store_unavailable", "Voting preference storage is unavailable");
    });
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout='10s'");
      await client.query("SET LOCAL lock_timeout='2s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`intention:${subject}:${electionId}`]);
      const election = await client.query("SELECT id FROM elections WHERE id=$1 FOR KEY SHARE", [electionId]);
      if (!election.rowCount) throw new VotingIntentionError(404, "election_not_found", "Election not found");
      if (input.candidateId != null) {
        const candidate = await client.query("SELECT election_id FROM candidates WHERE id=$1 FOR KEY SHARE", [input.candidateId]);
        if (!candidate.rowCount || candidate.rows[0].election_id !== electionId) throw new VotingIntentionError(422, "candidate_not_in_election", "The candidate is not recorded for this election");
      }
      const existing = await client.query("SELECT id,election_id,candidate_id,party_preference,confidence,created_at,updated_at FROM user_voting_intentions WHERE election_id=$1 AND session_id=$2 ORDER BY updated_at DESC NULLS LAST,id DESC LIMIT 1 FOR UPDATE", [electionId, subject]);
      const old = existing.rows[0];
      const values = [input.candidateId ?? null, input.partyPreference ?? null, input.confidence ?? null];
      let row;
      if (old && old.candidate_id === values[0] && old.party_preference === values[1] && old.confidence === values[2]) row = old;
      else if (old) row = (await client.query("UPDATE user_voting_intentions SET candidate_id=$1,party_preference=$2,confidence=$3,updated_at=now() WHERE id=$4 RETURNING id,election_id,candidate_id,party_preference,confidence,created_at,updated_at", [...values, old.id])).rows[0];
      else row = (await client.query("INSERT INTO user_voting_intentions(election_id,session_id,candidate_id,party_preference,confidence,is_likely_voter) VALUES($1,$2,$3,$4,$5,NULL) RETURNING id,election_id,candidate_id,party_preference,confidence,created_at,updated_at", [electionId, subject, ...values])).rows[0];
      const intention = publicRecord(row);
      await client.query("COMMIT");
      return { created: !old, intention };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => void 0);
      if (error instanceof VotingIntentionError) throw error;
      throw new VotingIntentionError(503, "intention_store_unavailable", "Voting preference storage is unavailable");
    } finally {
      client.release();
    }
  }
};

// server/election-integrity-routes.ts
function registerElectionIntegrityRoutes(router, deps) {
  router.get("/:id/political-analysis", async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > 2147483647) return res.status(400).json({ code: "invalid_election_id", error: "Invalid election ID" });
    try {
      if (!await deps.getElection(Number(req.params.id))) return res.status(404).json({ code: "election_not_found", error: "Election not found" });
      return res.status(503).json({ code: "political_analysis_unavailable", error: "A sourced political analysis has not been recorded for this election", electionId: Number(req.params.id), source: null, asOf: null });
    } catch {
      return res.status(503).json({ code: "election_store_unavailable", error: "Election records are unavailable" });
    }
  });
  router.post("/:id/voting-intention", deps.authenticate, async (req, res) => {
    const actor = deps.actor(req);
    if (!actor) return res.status(401).json({ code: "unauthenticated", error: "Authentication required" });
    const origin = req.get("origin");
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.host !== req.get("host") || parsed.protocol !== req.protocol + ":" || parsed.username || parsed.password) throw new Error("Foreign origin");
      } catch {
        return res.status(403).json({ code: "foreign_origin", error: "Voting preferences must be submitted from this application" });
      }
    }
    const fetchSite = req.get("sec-fetch-site");
    if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return res.status(403).json({ code: "foreign_origin", error: "Voting preferences must be submitted from this application" });
    if (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > 2147483647) return res.status(400).json({ code: "invalid_election_id", error: "Invalid election ID" });
    try {
      const recorded = await deps.intentions.record(Number(req.params.id), actor, req.body);
      return res.status(recorded.created ? 201 : 200).json({ success: true, intention: recorded.intention });
    } catch (error) {
      if (error instanceof VotingIntentionError) return res.status(error.status).json({ code: error.code, error: error.message });
      return res.status(503).json({ code: "intention_store_unavailable", error: "Voting preference storage is unavailable" });
    }
  });
}

// scripts/verify_parent_route_private.mjs
var sourceSha = "aa77c48a1792266c179f72dcdf2ba47ab7e42a65";
var artifact = "artifacts/parent-route-private";
mkdirSync(artifact, { recursive: true });
var subjectHash = (actor) => createHash2("sha256").update("voting-intention\0" + actor).digest("hex");
var identity = async () => {
  const r = (await pool.query("SELECT current_database() AS database,inet_server_port() AS port")).rows[0];
  if (r.database !== "et_sol_data_6c78a3148c6b" || r.port !== 5432) throw new Error("Private database identity guard refused");
  return r;
};
if (process.argv.includes("--worker")) {
  await identity();
  const decisions = [];
  setSecurityEventSink((line) => decisions.push(JSON.parse(line)));
  let outboundCalls = 0;
  globalThis.fetch = () => {
    outboundCalls++;
    throw new Error("External provider calls forbidden in this private receiving review");
  };
  const app = express();
  app.use(requestIdMiddleware, express.json({ limit: "64kb" }), cookieParser());
  registerVerifiedPolicyRoutes(app, { positions: (id) => candidatePositionAPI.getPositionsForCandidate(id), compare: compareVerifiedCandidatePolicies });
  const router = express.Router();
  registerElectionIntegrityRoutes(router, {
    getElection: async (id) => (await pool.query("SELECT id FROM elections WHERE id=$1", [id])).rows[0],
    authenticate: isAuthenticated,
    actor: (req) => typeof Reflect.get(req, "userId") === "string" ? Reflect.get(req, "userId") : null,
    intentions: new VotingIntentionsService(pool)
  });
  app.use("/api/elections", router);
  const server = app.listen(0, "127.0.0.1", () => process.send?.({ ready: true, port: server.address().port, sourceSha }));
  process.on("message", async (m) => {
    if (m?.stop) {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
      process.send?.({ stopped: true, decisions, outboundCalls });
      process.exit(0);
    }
  });
} else {
  const privateIdentity = await identity();
  const nonce = randomUUID2();
  const actors = ["A", "B", "C", "legacy"].map((k) => "private-unit-parent-" + k + "-" + nonce);
  const hashes = actors.map(subjectHash), electionIds = [190010001, 190010002], candidateIds = [190010011, 190010012, 190010021];
  const originalTables = ["users", "auth_sessions", "candidate_profiles", "candidates", "candidate_positions", "elections", "user_voting_intentions"];
  const snapshot = async () => {
    const out = {};
    for (const name of originalTables) out[name] = (await pool.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(md5(to_jsonb(t)::text)||':'||xmin::text,',' ORDER BY id::text),'')) AS rowAndXminDigest FROM ${name} t`)).rows[0];
    return out;
  };
  const before = await snapshot();
  const checks = [], responses = [], workers = [], workerLogs = [];
  let originalPreserved = false, cleanupWorked = false;
  const check2 = (scenario, condition, details = {}) => {
    const r = { scenario, outcome: condition ? "Worked" : "Failed", ...details };
    checks.push(r);
    if (!condition) console.log(JSON.stringify({ critical: r }));
    return r;
  };
  const startWorker = async () => {
    const child = fork(fileURLToPath(import.meta.url), ["--worker"], { silent: true, windowsHide: true, env: { ...process.env } });
    let stdout = "", stderr = "";
    child.stdout.on("data", (b) => {
      stdout += b;
    });
    child.stderr.on("data", (b) => {
      stderr += b;
    });
    const info = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Compiled private worker startup timeout")), 1e4);
      child.on("message", (m) => {
        if (m?.ready) {
          clearTimeout(timer);
          resolve(m);
        }
      });
      child.once("exit", (code) => {
        if (code !== 0) reject(new Error("Compiled private worker startup refused"));
      });
    });
    workers.push({ child, ...info });
    workerLogs.push({ pid: child.pid, get stdout() {
      return stdout;
    }, get stderr() {
      return stderr;
    } });
    return "http://127.0.0.1:" + info.port;
  };
  const cookies = [];
  const request = async (base, path, { cookie, body, headers = {}, method = body === void 0 ? "GET" : "POST" } = {}) => {
    const h = { ...headers };
    if (body !== void 0) h["content-type"] = "application/json";
    if (cookie) h.cookie = cookie;
    const res = await fetch(base + path, { method, headers: h, body: body === void 0 ? void 0 : JSON.stringify(body), signal: AbortSignal.timeout(15e3) });
    const value = await res.json();
    responses.push({ path, method, status: res.status, body: value });
    return { status: res.status, body: value };
  };
  const readIntention = async (actor) => (await pool.query("SELECT id,election_id,candidate_id,session_id,party_preference,confidence,is_likely_voter,created_at,updated_at,xmin::text AS xmin FROM user_voting_intentions WHERE session_id=$1 ORDER BY id", [subjectHash(actor)])).rows;
  try {
    const collision = (await pool.query("SELECT id FROM elections WHERE id=ANY($1)", [electionIds])).rowCount + (await pool.query("SELECT id FROM candidates WHERE id=ANY($1)", [candidateIds])).rowCount;
    if (collision) throw new Error("Private fixture identifier collision; refusing mutation");
    for (const actor of actors) await pool.query("INSERT INTO users(id,email,role,first_name) VALUES($1,$2,'user','PRIVATE UNIT ACTOR - NOT A VOTER')", [actor, actor + "@example.invalid"]);
    for (const id of electionIds) await pool.query("INSERT INTO elections(id,title,location,state,date,type,level) VALUES($1,'PRIVATE UNIT ROUTE FIXTURE - NOT AN OFFICIAL ELECTION','PRIVATE TEST','ZZ','2030-01-01','general','federal')", [id]);
    for (const [i, id] of candidateIds.entries()) await pool.query("INSERT INTO candidates(id,name,party,election_id) VALUES($1,$2,'O',$3)", [id, "PRIVATE UNIT CANDIDATE " + (i + 1) + " - NOT A REAL PERSON", i === 2 ? electionIds[1] : electionIds[0]]);
    for (const actor of actors) cookies.push(SESSION_COOKIE + "=" + await createSession(actor, "PRIVATE UNIT ACCEPTANCE", "127.0.0.1"));
    const [base, other] = [await startWorker(), await startWorker()];
    const path = "/api/elections/" + electionIds[0] + "/voting-intention";
    let r = await request(base, "/api/civic/compare?candidateIds=" + candidateIds.slice(0, 2).join(",") + "&policyCategories=healthcare,economy");
    check2("actual verified-source zero comparison is truthful empty", r.status === 200 && r.body.length === 2 && r.body.every((x) => x.positions.length === 0), { status: r.status, verifiedSourceRows: 0 });
    r = await request(base, "/api/candidates/" + candidateIds[0] + "/positions");
    check2("local positions without VoteSmart key empty", r.status === 200 && Array.isArray(r.body) && r.body.length === 0, { status: r.status });
    for (const malformed of ["1.5", "1abc", "0", "2147483648"]) {
      r = await request(base, "/api/candidates/" + malformed + "/positions");
      check2("strict positions identifier " + malformed, r.status === 400, { status: r.status });
    }
    r = await request(base, "/api/civic/compare?candidateIds=1.5&policyCategories=healthcare");
    check2("strict comparison identifier", r.status === 400, { status: r.status });
    r = await request(base, "/api/elections/" + electionIds[0] + "/political-analysis");
    check2("political analysis typed503 no invented score", r.status === 503 && r.body.code === "political_analysis_unavailable" && r.body.source === null && r.body.asOf === null && !["leaning", "intensity", "competitiveness", "baseline", "lastUpdated"].some((k) => k in r.body), { status: r.status });
    r = await request(base, path, { body: { candidateId: candidateIds[0] } });
    check2("no cookie401", r.status === 401, { status: r.status });
    r = await request(base, path, { cookie: cookies[0], headers: { origin: "https://foreign.invalid" }, body: { candidateId: candidateIds[0] } });
    check2("foreign origin403", r.status === 403, { status: r.status });
    r = await request(base, path, { cookie: cookies[0], headers: { "sec-fetch-site": "same-site" }, body: { candidateId: candidateIds[0] } });
    check2("foreign same-site fetch metadata403", r.status === 403, { status: r.status });
    r = await request(base, path, { cookie: cookies[0], body: { candidateId: candidateIds[2] } });
    check2("foreign candidate422", r.status === 422 && r.body.code === "candidate_not_in_election", { status: r.status });
    r = await request(base, path, { cookie: cookies[0], body: { candidateId: candidateIds[0], actor: actors[1], sessionId: "forged-unit-session" } });
    check2("forged actor/session body422", r.status === 422 && r.body.code === "invalid_intention", { status: r.status });
    const invalidCookie = cookies[0].slice(0, -1) + (cookies[0].endsWith("a") ? "b" : "a");
    r = await request(base, path, { cookie: invalidCookie, body: { candidateId: candidateIds[0] } });
    check2("bad JWT signature401", r.status === 401, { status: r.status });
    r = await request(base, path, { cookie: SESSION_COOKIE + "=" + signSession({ uid: actors[0], jti: randomUUID2() }), body: { candidateId: candidateIds[0] } });
    check2("signed JWT without auth_sessions row401", r.status === 401, { status: r.status });
    check2("all pre-write refusals preserve zero preference rows", (await readIntention(actors[0])).length === 0);
    r = await request(base, path, { cookie: cookies[0], body: { candidateId: candidateIds[0] } });
    const first = (await readIntention(actors[0]))[0];
    check2("actual201 committed row unknown valuesNULL", r.status === 201 && r.body.success === true && first?.confidence === null && first?.is_likely_voter === null && first?.session_id === hashes[0] && first?.session_id !== actors[0], { status: r.status, storedConfidence: first?.confidence, storedLikelyVoter: first?.is_likely_voter });
    r = await request(other, path, { cookie: cookies[0], body: { candidateId: candidateIds[0] } });
    const repeat = (await readIntention(actors[0]))[0];
    check2("actual200 cross-process repeat stable id xmin bytes", r.status === 200 && first.id === repeat.id && first.xmin === repeat.xmin && JSON.stringify(first) === JSON.stringify(repeat), { status: r.status, firstXmin: first.xmin, repeatXmin: repeat.xmin });
    r = await request(base, path, { cookie: cookies[0], body: { candidateId: candidateIds[1], partyPreference: "R", confidence: "high" } });
    const changed = (await readIntention(actors[0]))[0];
    check2("actual200 changed preference updates same row", r.status === 200 && changed.id === first.id && changed.xmin !== first.xmin && changed.candidate_id === candidateIds[1] && changed.confidence === "high" && (await readIntention(actors[0])).length === 1, { status: r.status, beforeXmin: first.xmin, afterXmin: changed.xmin });
    const concurrently = await Promise.all(Array.from({ length: 12 }, (_, i) => request(i % 2 ? base : other, path, { cookie: cookies[2], body: { candidateId: candidateIds[0] } })));
    const current = await readIntention(actors[2]);
    check2("twelve retries across two real processes create one current row", current.length === 1 && concurrently.filter((x) => x.status === 201).length === 1 && concurrently.filter((x) => x.status === 200).length === 11, { statuses: concurrently.map((x) => x.status), rows: current.length });
    r = await request(base, path, { cookie: cookies[1], body: { partyPreference: "Undecided" } });
    check2("different authenticated subject gets own single row", r.status === 201 && (await readIntention(actors[1])).length === 1 && (await readIntention(actors[0])).length === 1, { status: r.status });
    const lock = await pool.connect();
    await lock.query("BEGIN");
    await lock.query("LOCK TABLE user_voting_intentions IN ACCESS EXCLUSIVE MODE");
    try {
      r = await request(base, path, { cookie: cookies[0], body: { candidateId: candidateIds[0] } });
      check2("native PostgreSQL lock failure typed503 no acknowledgement", r.status === 503 && r.body.code === "intention_store_unavailable" && !("success" in r.body), { status: r.status, actualFault: "private access-exclusive lock triggers service2s lock_timeout" });
    } finally {
      await lock.query("ROLLBACK");
      lock.release();
    }
    check2("native PostgreSQL failure preserves previous row", JSON.stringify(changed) === JSON.stringify((await readIntention(actors[0]))[0]));
    await pool.query("UPDATE auth_sessions SET expires_at=now()-interval '1 minute' WHERE user_id=$1", [actors[1]]);
    r = await request(base, path, { cookie: cookies[1], body: { partyPreference: "Other" } });
    check2("signed JWT expired database session401", r.status === 401, { status: r.status });
    const tokenC = cookies[2].slice(SESSION_COOKIE.length + 1);
    const payload = JSON.parse(Buffer.from(tokenC.split(".")[1], "base64url").toString());
    await revokeSession(actors[2], payload.jti);
    r = await request(base, path, { cookie: cookies[2], body: { partyPreference: "Other" } });
    check2("revoked auth_sessions JWT401", r.status === 401, { status: r.status });
    await pool.query("INSERT INTO user_voting_intentions(election_id,session_id,candidate_id) VALUES($1,$2,$3)", [electionIds[0], hashes[3], candidateIds[0]]);
    r = await request(base, path, { cookie: cookies[3], body: { candidateId: candidateIds[1] } });
    const legacy = (await readIntention(actors[3]))[0];
    check2("unknown likelihood on legacy-default current row remains honestNULL", r.status === 200 && legacy.confidence === null && legacy.is_likely_voter === null, { status: r.status, storedConfidence: legacy.confidence, storedLikelyVoter: legacy.is_likely_voter });
  } catch (error) {
    checks.push({ scenario: "harness execution", outcome: "Failed", reason: error instanceof Error ? error.message : "Unknown exception" });
  } finally {
    for (const worker of workers) {
      const stopped = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ stopped: false }), 1e4);
        worker.child.on("message", (m) => {
          if (m?.stopped) {
            clearTimeout(timer);
            resolve(m);
          }
        });
        worker.child.send({ stop: true });
      });
      check2("compiled worker stopped with no provider calls", stopped.stopped && stopped.outboundCalls === 0, { pid: worker.child.pid, outboundCalls: stopped.outboundCalls ?? null });
    }
    await pool.query("DELETE FROM user_voting_intentions WHERE session_id=ANY($1)", [hashes]);
    await pool.query("DELETE FROM candidate_positions WHERE candidate_id=ANY($1)", [candidateIds]);
    await pool.query("DELETE FROM auth_sessions WHERE user_id=ANY($1)", [actors]);
    await pool.query("DELETE FROM candidates WHERE id=ANY($1)", [candidateIds]);
    await pool.query("DELETE FROM elections WHERE id=ANY($1)", [electionIds]);
    await pool.query("DELETE FROM users WHERE id=ANY($1)", [actors]);
    const after = await snapshot();
    originalPreserved = JSON.stringify(before) === JSON.stringify(after);
    check2("original complete rows and xmin preserved after fixture cleanup", originalPreserved, { before, after });
    cleanupWorked = originalPreserved;
    const receipt = { outcome: checks.every((c) => c.outcome === "Worked") ? "Worked" : "Failed", sourceSha, privateIdentity, compiledSha256: createHash2("sha256").update(readFileSync2(fileURLToPath(import.meta.url))).digest("hex"), mockCount: 0, realHttp: true, realAuthSessionValidation: true, realPg: true, checks, responses, fixtureScope: "Private labelled unit actors and synthetic races/candidates only; never real voter intentions or official results", originalPreserved, cleanupWorked };
    writeFileSync(artifact + "/receipt.json", JSON.stringify(receipt, null, 2) + "\n");
    for (const [i, log] of workerLogs.entries()) writeFileSync(artifact + "/worker-" + i + ".log", log.stdout + log.stderr);
    console.log(JSON.stringify({ outcome: receipt.outcome, checks: checks.length, failed: checks.filter((c) => c.outcome === "Failed"), originalPreserved, cleanupWorked }));
    await pool.end();
    if (receipt.outcome !== "Worked") process.exitCode = 1;
  }
}
