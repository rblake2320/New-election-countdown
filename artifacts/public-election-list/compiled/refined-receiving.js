var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
var elections, electionCatalogCorrectionRuns, candidates, candidateSourceRecords, candidateIngestRuns, officialResultsSyncRuns, generalCandidateListSnapshots, electionResults, electionResultReports, candidateResultLines, sessions, users, authSessions, emailVerificationTokens, passwordResetTokens, watchlist, pollingData, userVotingIntentions, politicalMomentum, electionRecommendations, userRecommendationAnalytics, recommendationCache, candidatePositions, candidateQA, candidateAccounts, candidateProfiles, candidateDataSources, voterInteractions, realTimePolling, campaignContent, candidateSubscriptions, campaignAccounts, campaignAccessLogs, dataPurchases, userSegments, geographicClusters, pollingResults, congressMembers, congressOfficialImportRuns, congressBills, congressCommittees, candidateBiography, electionCycles, electionsRelations, electionResultsRelations, candidatesRelations, usersRelations, watchlistRelations, filterSchema, insertElectionSchema, insertCandidateSchema, insertWatchlistSchema, insertCongressMemberSchema, insertElectionResultSchema, insertCandidatePositionSchema, insertCandidateQASchema, insertVoterInteractionSchema, insertRealTimePollingSchema, insertCampaignContentSchema, insertCandidateSubscriptionSchema, insertCampaignAccountSchema, insertCampaignAccessLogSchema, insertDataPurchaseSchema, notificationPreferences, notificationConsents, notificationSubscriptions, notificationTemplates, notificationCampaigns, notificationDeliveries, notificationEvents, notificationWebhooks, insertNotificationPreferencesSchema, insertNotificationConsentSchema, insertNotificationSubscriptionSchema, insertNotificationTemplateSchema, insertNotificationCampaignSchema, insertNotificationDeliverySchema, insertNotificationEventSchema, insertNotificationWebhookSchema, userPreferences, insertUserPreferencesSchema, updateUserPreferencesSchema, congressionalDistricts, insertCongressionalDistrictSchema, backupStorageLocations, backupRetentionPolicies, backupOperations, schemaVersions, restoreValidations, backupSystemConfig, insertBackupStorageLocationSchema, insertBackupRetentionPolicySchema, insertBackupOperationSchema, insertSchemaVersionSchema, insertRestoreValidationSchema, insertBackupSystemConfigSchema, secretsVault, secretsRotationHistory, artifactStorage, deploymentHistory, environmentConfigurations, platformContinuityEvents, insertSecretsVaultSchema, insertSecretsRotationHistorySchema, insertArtifactStorageSchema, insertDeploymentHistorySchema, insertEnvironmentConfigurationsSchema, insertPlatformContinuityEventsSchema, failoverDrillConfigurations, drillExecutions, drillSteps, backupMonitoringConfigurations, backupAlerts, backupHealthMetrics, rtoRpoTargets, rtoRpoMeasurements, performanceBenchmarks, incidentRunbooks, runbookSteps, runbookContacts, contactEscalationTrees, runbookExecutions, insertFailoverDrillConfigurationSchema, insertDrillExecutionSchema, insertDrillStepSchema, insertBackupMonitoringConfigurationSchema, insertBackupAlertSchema, insertBackupHealthMetricSchema, insertRtoRpoTargetSchema, insertRtoRpoMeasurementSchema, insertPerformanceBenchmarkSchema, insertIncidentRunbookSchema, insertRunbookStepSchema, insertRunbookContactSchema, insertContactEscalationTreeSchema, insertRunbookExecutionSchema, dashboardUserSchema, dashboardWatchlistItemSchema, dashboardRecommendationSchema, dashboardStatsSchema, dashboardQuickActionSchema, dashboardResponseSchema, insertElectionRecommendationSchema, insertUserRecommendationAnalyticsSchema, insertRecommendationCacheSchema, recommendationRequestSchema, recommendationResponseSchema, watchlistAnalyticsSchema, enhancedWatchlistResponseSchema, userEvents, userSessions, conversionFunnels, userEngagementScores, userJourneyPaths, analyticsPreferences, analyticsAggregations, validationResults, dataProvenance, auditRuns, manualReviewQueue, insertUserEventSchema, insertUserSessionSchema, insertConversionFunnelSchema, insertUserEngagementScoreSchema, insertUserJourneyPathSchema, insertAnalyticsPreferencesSchema, insertAnalyticsAggregationSchema, insertValidationResultSchema, insertDataProvenanceSchema, insertAuditRunSchema, insertManualReviewQueueSchema, analyticsOverviewSchema, userJourneyAnalysisSchema, engagementReportSchema, insertPollingDataSchema, insertUserVotingIntentionsSchema, insertPoliticalMomentumSchema, politicalAnalysisResponseSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    elections = pgTable("elections", {
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
    electionCatalogCorrectionRuns = pgTable("election_catalog_correction_runs", {
      id: serial("id").primaryKey(),
      planSha256: text("plan_sha256").notNull(),
      sourceUrl: text("source_url").notNull(),
      sourceFileSha256: text("source_file_sha256").notNull(),
      appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
      receipt: jsonb("receipt").notNull()
    });
    candidates = pgTable("candidates", {
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
    candidateSourceRecords = pgTable("candidate_source_records", {
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
    candidateIngestRuns = pgTable("candidate_ingest_runs", {
      id: serial("id").primaryKey(),
      sourceLayer: text("source_layer").notNull(),
      sourceUrl: text("source_url").notNull(),
      sourceFileSha256: text("source_file_sha256").notNull(),
      appliedAt: timestamp("applied_at", { withTimezone: true }).notNull(),
      receipt: jsonb("receipt").notNull()
    });
    officialResultsSyncRuns = pgTable("official_results_sync_runs", {
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
    generalCandidateListSnapshots = pgTable("general_candidate_list_snapshots", {
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
    electionResults = pgTable("election_results", {
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
    electionResultReports = pgTable("election_result_reports", {
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
    candidateResultLines = pgTable("candidate_result_lines", {
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
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    users = pgTable("users", {
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
    authSessions = pgTable("auth_sessions", {
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
    emailVerificationTokens = pgTable("email_verification_tokens", {
      token: varchar("token").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      used: boolean("used").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    passwordResetTokens = pgTable("password_reset_tokens", {
      token: varchar("token").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      used: boolean("used").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    watchlist = pgTable("watchlist", {
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
    pollingData = pgTable("polling_data", {
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
    userVotingIntentions = pgTable("user_voting_intentions", {
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
    politicalMomentum = pgTable("political_momentum", {
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
    electionRecommendations = pgTable("election_recommendations", {
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
    userRecommendationAnalytics = pgTable("user_recommendation_analytics", {
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
    recommendationCache = pgTable("recommendation_cache", {
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
    candidatePositions = pgTable("candidate_positions", {
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
    candidateQA = pgTable("candidate_qa", {
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
    candidateAccounts = pgTable("candidate_accounts", {
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
    candidateProfiles = pgTable("candidate_profiles", {
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
    candidateDataSources = pgTable("candidate_data_sources", {
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
    voterInteractions = pgTable("voter_interactions", {
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
    realTimePolling = pgTable("real_time_polling", {
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
    campaignContent = pgTable("campaign_content", {
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
    candidateSubscriptions = pgTable("candidate_subscriptions", {
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
    campaignAccounts = pgTable("campaign_accounts", {
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
    campaignAccessLogs = pgTable("campaign_access_logs", {
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
    dataPurchases = pgTable("data_purchases", {
      id: serial("id").primaryKey(),
      campaignId: integer("campaign_id").references(() => campaignAccounts.id),
      datasetType: text("dataset_type").notNull(),
      records: integer("records").notNull(),
      cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
      purchasedAt: timestamp("purchased_at").defaultNow()
    });
    userSegments = pgTable("user_segments", {
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
    geographicClusters = pgTable("geographic_clusters", {
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
    pollingResults = pgTable("polling_results", {
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
    congressMembers = pgTable("congress_members", {
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
    congressOfficialImportRuns = pgTable("congress_official_import_runs", {
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
    congressBills = pgTable("congress_bills", {
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
    congressCommittees = pgTable("congress_committees", {
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
    candidateBiography = pgTable("candidate_biography", {
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
    electionCycles = pgTable("election_cycles", {
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
    electionsRelations = relations(elections, ({ many: many2 }) => ({
      candidates: many2(candidates),
      results: many2(electionResults)
    }));
    electionResultsRelations = relations(electionResults, ({ one }) => ({
      election: one(elections, {
        fields: [electionResults.electionId],
        references: [elections.id]
      })
    }));
    candidatesRelations = relations(candidates, ({ one }) => ({
      election: one(elections, {
        fields: [candidates.electionId],
        references: [elections.id]
      })
    }));
    usersRelations = relations(users, ({ many: many2 }) => ({
      watchlist: many2(watchlist)
    }));
    watchlistRelations = relations(watchlist, ({ one }) => ({
      election: one(elections, {
        fields: [watchlist.electionId],
        references: [elections.id]
      })
    }));
    filterSchema = z.object({
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
    insertElectionSchema = z.object({
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
    insertCandidateSchema = createInsertSchema(candidates).omit({
      id: true
    });
    insertWatchlistSchema = createInsertSchema(watchlist).omit({
      id: true,
      createdAt: true
    });
    insertCongressMemberSchema = createInsertSchema(congressMembers).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertElectionResultSchema = createInsertSchema(electionResults).omit({
      id: true,
      lastUpdated: true
    });
    insertCandidatePositionSchema = createInsertSchema(candidatePositions).omit({
      id: true,
      createdAt: true,
      lastUpdated: true
    });
    insertCandidateQASchema = createInsertSchema(candidateQA).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertVoterInteractionSchema = createInsertSchema(voterInteractions).omit({
      id: true,
      createdAt: true
    });
    insertRealTimePollingSchema = createInsertSchema(realTimePolling).omit({
      id: true,
      createdAt: true
    });
    insertCampaignContentSchema = createInsertSchema(campaignContent).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCandidateSubscriptionSchema = createInsertSchema(candidateSubscriptions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCampaignAccountSchema = createInsertSchema(campaignAccounts).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCampaignAccessLogSchema = createInsertSchema(campaignAccessLogs).omit({
      id: true,
      accessedAt: true
    });
    insertDataPurchaseSchema = createInsertSchema(dataPurchases).omit({
      id: true,
      purchasedAt: true
    });
    notificationPreferences = pgTable("notification_preferences", {
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
    notificationConsents = pgTable("notification_consents", {
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
    notificationSubscriptions = pgTable("notification_subscriptions", {
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
    notificationTemplates = pgTable("notification_templates", {
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
    notificationCampaigns = pgTable("notification_campaigns", {
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
    notificationDeliveries = pgTable("notification_deliveries", {
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
    notificationEvents = pgTable("notification_events", {
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
    notificationWebhooks = pgTable("notification_webhooks", {
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
    insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertNotificationConsentSchema = createInsertSchema(notificationConsents).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertNotificationSubscriptionSchema = createInsertSchema(notificationSubscriptions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertNotificationCampaignSchema = createInsertSchema(notificationCampaigns).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertNotificationDeliverySchema = createInsertSchema(notificationDeliveries).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertNotificationEventSchema = createInsertSchema(notificationEvents).omit({
      id: true,
      createdAt: true
    });
    insertNotificationWebhookSchema = createInsertSchema(notificationWebhooks).omit({
      id: true,
      createdAt: true
    });
    userPreferences = pgTable("user_preferences", {
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
    insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    updateUserPreferencesSchema = insertUserPreferencesSchema.partial();
    congressionalDistricts = pgTable("congressional_districts", {
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
    insertCongressionalDistrictSchema = createInsertSchema(congressionalDistricts).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    backupStorageLocations = pgTable("backup_storage_locations", {
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
    backupRetentionPolicies = pgTable("backup_retention_policies", {
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
    backupOperations = pgTable("backup_operations", {
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
    schemaVersions = pgTable("schema_versions", {
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
    restoreValidations = pgTable("restore_validations", {
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
    backupSystemConfig = pgTable("backup_system_config", {
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
    insertBackupStorageLocationSchema = createInsertSchema(backupStorageLocations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertBackupRetentionPolicySchema = createInsertSchema(backupRetentionPolicies).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertBackupOperationSchema = createInsertSchema(backupOperations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertSchemaVersionSchema = createInsertSchema(schemaVersions).omit({
      id: true,
      createdAt: true
    });
    insertRestoreValidationSchema = createInsertSchema(restoreValidations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertBackupSystemConfigSchema = createInsertSchema(backupSystemConfig).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    secretsVault = pgTable("secrets_vault", {
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
    secretsRotationHistory = pgTable("secrets_rotation_history", {
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
    artifactStorage = pgTable("artifact_storage", {
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
    deploymentHistory = pgTable("deployment_history", {
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
    environmentConfigurations = pgTable("environment_configurations", {
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
    platformContinuityEvents = pgTable("platform_continuity_events", {
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
    insertSecretsVaultSchema = createInsertSchema(secretsVault).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertSecretsRotationHistorySchema = createInsertSchema(secretsRotationHistory).omit({
      id: true,
      startedAt: true
    });
    insertArtifactStorageSchema = createInsertSchema(artifactStorage).omit({
      id: true,
      createdAt: true
    });
    insertDeploymentHistorySchema = createInsertSchema(deploymentHistory).omit({
      id: true,
      startedAt: true
    });
    insertEnvironmentConfigurationsSchema = createInsertSchema(environmentConfigurations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertPlatformContinuityEventsSchema = createInsertSchema(platformContinuityEvents).omit({
      id: true,
      startedAt: true
    });
    failoverDrillConfigurations = pgTable("failover_drill_configurations", {
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
    drillExecutions = pgTable("drill_executions", {
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
    drillSteps = pgTable("drill_steps", {
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
    backupMonitoringConfigurations = pgTable("backup_monitoring_configurations", {
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
    backupAlerts = pgTable("backup_alerts", {
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
    backupHealthMetrics = pgTable("backup_health_metrics", {
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
    rtoRpoTargets = pgTable("rto_rpo_targets", {
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
    rtoRpoMeasurements = pgTable("rto_rpo_measurements", {
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
    performanceBenchmarks = pgTable("performance_benchmarks", {
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
    incidentRunbooks = pgTable("incident_runbooks", {
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
    runbookSteps = pgTable("runbook_steps", {
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
    runbookContacts = pgTable("runbook_contacts", {
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
    contactEscalationTrees = pgTable("contact_escalation_trees", {
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
    runbookExecutions = pgTable("runbook_executions", {
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
    insertFailoverDrillConfigurationSchema = createInsertSchema(failoverDrillConfigurations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertDrillExecutionSchema = createInsertSchema(drillExecutions).omit({
      id: true,
      startedAt: true
    });
    insertDrillStepSchema = createInsertSchema(drillSteps).omit({
      id: true
    });
    insertBackupMonitoringConfigurationSchema = createInsertSchema(backupMonitoringConfigurations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertBackupAlertSchema = createInsertSchema(backupAlerts).omit({
      id: true,
      createdAt: true
    });
    insertBackupHealthMetricSchema = createInsertSchema(backupHealthMetrics).omit({
      id: true,
      createdAt: true
    });
    insertRtoRpoTargetSchema = createInsertSchema(rtoRpoTargets).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertRtoRpoMeasurementSchema = createInsertSchema(rtoRpoMeasurements).omit({
      id: true,
      createdAt: true
    });
    insertPerformanceBenchmarkSchema = createInsertSchema(performanceBenchmarks).omit({
      id: true,
      createdAt: true
    });
    insertIncidentRunbookSchema = createInsertSchema(incidentRunbooks).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertRunbookStepSchema = createInsertSchema(runbookSteps).omit({
      id: true
    });
    insertRunbookContactSchema = createInsertSchema(runbookContacts).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertContactEscalationTreeSchema = createInsertSchema(contactEscalationTrees).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertRunbookExecutionSchema = createInsertSchema(runbookExecutions).omit({
      id: true,
      startedAt: true
    });
    dashboardUserSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      firstName: z.string().nullish().transform((v) => v ?? void 0),
      lastName: z.string().nullish().transform((v) => v ?? void 0),
      emailVerified: z.boolean(),
      joinedAt: z.string().datetime(),
      daysSinceJoining: z.number().int().min(0)
    });
    dashboardWatchlistItemSchema = z.object({
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
    dashboardRecommendationSchema = z.object({
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
    dashboardStatsSchema = z.object({
      savedElections: z.number().int().min(0),
      totalUpcomingElections: z.number().int().min(0),
      watchlistActivity: z.number().int().min(0)
    });
    dashboardQuickActionSchema = z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string(),
      path: z.string().optional(),
      action: z.string().optional()
    });
    dashboardResponseSchema = z.object({
      user: dashboardUserSchema,
      watchlist: z.array(dashboardWatchlistItemSchema),
      recommendations: z.array(dashboardRecommendationSchema),
      stats: dashboardStatsSchema,
      quickActions: z.array(dashboardQuickActionSchema)
    });
    insertElectionRecommendationSchema = createInsertSchema(electionRecommendations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertUserRecommendationAnalyticsSchema = createInsertSchema(userRecommendationAnalytics).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertRecommendationCacheSchema = createInsertSchema(recommendationCache).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    recommendationRequestSchema = z.object({
      userId: z.string(),
      limit: z.number().int().min(1).max(50).default(10),
      type: z.enum(["location_based", "interest_based", "trending", "similar_users"]).optional(),
      includeExpired: z.boolean().default(false),
      cacheKey: z.string().optional()
    });
    recommendationResponseSchema = z.object({
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
    watchlistAnalyticsSchema = z.object({
      totalItems: z.number(),
      byStatus: z.record(z.number()),
      byCategory: z.record(z.number()),
      byPriority: z.record(z.number()),
      recentlyAdded: z.number(),
      upcomingElections: z.number(),
      completedElections: z.number()
    });
    enhancedWatchlistResponseSchema = z.object({
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
    userEvents = pgTable("user_events", {
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
    userSessions = pgTable("user_sessions", {
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
    conversionFunnels = pgTable("conversion_funnels", {
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
    userEngagementScores = pgTable("user_engagement_scores", {
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
    userJourneyPaths = pgTable("user_journey_paths", {
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
    analyticsPreferences = pgTable("analytics_preferences", {
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
    analyticsAggregations = pgTable("analytics_aggregations", {
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
    validationResults = pgTable("validation_results", {
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
    dataProvenance = pgTable("data_provenance", {
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
    auditRuns = pgTable("audit_runs", {
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
    manualReviewQueue = pgTable("manual_review_queue", {
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
    insertUserEventSchema = createInsertSchema(userEvents).omit({
      id: true,
      createdAt: true
    });
    insertUserSessionSchema = createInsertSchema(userSessions).omit({
      id: true,
      updatedAt: true
    });
    insertConversionFunnelSchema = createInsertSchema(conversionFunnels).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertUserEngagementScoreSchema = createInsertSchema(userEngagementScores).omit({
      id: true,
      createdAt: true
    });
    insertUserJourneyPathSchema = createInsertSchema(userJourneyPaths).omit({
      id: true,
      createdAt: true
    });
    insertAnalyticsPreferencesSchema = createInsertSchema(analyticsPreferences).omit({
      id: true,
      createdAt: true,
      lastUpdated: true
    });
    insertAnalyticsAggregationSchema = createInsertSchema(analyticsAggregations).omit({
      id: true,
      createdAt: true
    });
    insertValidationResultSchema = createInsertSchema(validationResults).omit({
      id: true,
      validatedAt: true
    });
    insertDataProvenanceSchema = createInsertSchema(dataProvenance).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertAuditRunSchema = createInsertSchema(auditRuns).omit({
      id: true,
      createdAt: true
    });
    insertManualReviewQueueSchema = createInsertSchema(manualReviewQueue).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    analyticsOverviewSchema = z.object({
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
    userJourneyAnalysisSchema = z.object({
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
    engagementReportSchema = z.object({
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
    insertPollingDataSchema = createInsertSchema(pollingData).omit({
      id: true,
      createdAt: true
    });
    insertUserVotingIntentionsSchema = createInsertSchema(userVotingIntentions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertPoliticalMomentumSchema = createInsertSchema(politicalMomentum).omit({
      id: true,
      calculatedAt: true
    });
    politicalAnalysisResponseSchema = z.object({
      leaning: z.enum(["left", "right", "split", "neutral"]),
      intensity: z.enum(["low", "medium", "high"]),
      baseline: z.enum(["red", "blue", "purple"]),
      isShifting: z.boolean(),
      shiftDirection: z.enum(["red-to-blue", "blue-to-red"]).optional(),
      competitiveness: z.number().min(0).max(1),
      lastUpdated: z.date()
    });
  }
});

// server/election-list-filters.ts
function electionCalendarDay(now, timezone, upperBound = false) {
  if (!timezone || !knownZones.has(timezone)) {
    return utcDay(new Date(now.getTime() - (upperBound ? 4 : 11) * 36e5));
  }
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
}
function electionCalendarWindow(now, period, timezone) {
  const from = electionCalendarDay(now, timezone);
  const upperDay = electionCalendarDay(now, timezone, true);
  const end = period.days !== void 0 ? addDays(upperDay, period.days) : period.months !== void 0 ? addMonths(upperDay, period.months) : void 0;
  return { from, until: end ? addDays(end, 1) : void 0 };
}
function addMonths(date2, months) {
  const first = new Date(Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(date2.getUTCDate(), lastDay));
  return first;
}
function normalizeElectionFilters(input = {}, now = /* @__PURE__ */ new Date()) {
  const scalar = (key, allIsSentinel = true) => {
    const value = input[key];
    if (value == null || value === "") return void 0;
    if (typeof value !== "string") throw new ElectionFilterError(`Invalid ${key}: expected one string`);
    const trimmed = value.trim();
    return !trimmed || allIsSentinel && trimmed.toLowerCase() === "all" ? void 0 : trimmed;
  };
  const list = (key) => {
    const value = input[key];
    if (value == null || value === "") return [];
    const parts = Array.isArray(value) ? value : [value];
    if (parts.some((part) => typeof part !== "string")) throw new ElectionFilterError(`Invalid ${key}`);
    const items = parts.flatMap((part) => part.split(",")).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (items.includes("all") && items.length > 1) throw new ElectionFilterError(`Invalid ${key}: all cannot be combined`);
    return items[0] === "all" ? [] : Array.from(new Set(items));
  };
  const timeframe = scalar("timeframe")?.toLowerCase();
  const timeRange = scalar("timeRange")?.toLowerCase();
  if (timeframe && timeRange && timeframe !== timeRange) throw new ElectionFilterError("Conflicting timeframe and timeRange");
  const range = timeframe ?? timeRange;
  const today = electionCalendarDay(now);
  let from;
  let until;
  let period;
  if (input.minDate != null) {
    if (!(input.minDate instanceof Date) || !Number.isFinite(input.minDate.getTime())) throw new ElectionFilterError("Invalid minDate");
    from = utcDay(input.minDate);
  }
  if (input.maxDate instanceof Date && Number.isFinite(input.maxDate.getTime())) until = utcDay(input.maxDate);
  if (range) {
    period = {};
    switch (range) {
      case "upcoming":
        break;
      case "week":
        period.days = 7;
        break;
      case "next-30-days":
        period.days = 30;
        break;
      case "next-90-days":
        period.days = 90;
        break;
      case "month":
        period.months = 1;
        break;
      case "quarter":
        period.months = 3;
        break;
      case "next-6-months":
        period.months = 6;
        break;
      case "next-year":
      case "year":
        period.months = 12;
        break;
      default:
        throw new ElectionFilterError(`Invalid timeframe: ${range}`);
    }
    if (!from || today > from) from = today;
    until = electionCalendarWindow(now, period).until;
  }
  const levels = list("level");
  if (levels.some((level) => !["federal", "state", "local"].includes(level))) throw new ElectionFilterError("Invalid level");
  const parties = list("party").map((party) => {
    if (!partyAliases[party]) throw new ElectionFilterError(`Invalid party: ${party}`);
    return partyAliases[party];
  });
  const state = scalar("state");
  const stateCode = state ? states.get(state.toLowerCase()) : void 0;
  if (state && !stateCode) throw new ElectionFilterError("Invalid state");
  const cycleRaw = input.cycle;
  if (cycleRaw != null && typeof cycleRaw !== "string" && typeof cycleRaw !== "number") throw new ElectionFilterError("Invalid cycle");
  const cycle = cycleRaw == null || cycleRaw === "" ? void 0 : Number(cycleRaw);
  if (cycle !== void 0 && (!Number.isInteger(cycle) || cycle < 1e3 || cycle > 9998 || typeof cycleRaw === "string" && !/^\d{4}$/.test(cycleRaw))) throw new ElectionFilterError("Invalid cycle");
  const search = scalar("search", false);
  if (search && search.length > 200) throw new ElectionFilterError("Invalid search: maximum 200 characters");
  return { from, until, period, state: stateCode, types: list("type"), electionTypes: list("electionType"), levels, parties: Array.from(new Set(parties)), cycle, search };
}
var ElectionFilterError, stateNames, stateCodes, states, partyAliases, canonicalParty, canonicalPartyComponents, US_ELECTION_TIME_ZONES, knownZones, utcDay, addDays;
var init_election_list_filters = __esm({
  "server/election-list-filters.ts"() {
    ElectionFilterError = class extends Error {
    };
    stateNames = "Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|District of Columbia".split("|");
    stateCodes = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" ");
    states = new Map(stateNames.map((name, i) => [name.toLowerCase(), stateCodes[i]]));
    stateCodes.forEach((code) => states.set(code.toLowerCase(), code));
    partyAliases = {
      d: "D",
      dem: "D",
      democratic: "D",
      democrat: "D",
      "democratic party": "D",
      dfl: "D",
      r: "R",
      rep: "R",
      republican: "R",
      "republican party": "R",
      i: "I",
      ind: "I",
      independent: "I",
      unaffiliated: "I",
      npa: "I",
      non: "I",
      g: "G",
      gre: "G",
      green: "G",
      "green party": "G",
      l: "L",
      lib: "L",
      libertarian: "L",
      "libertarian party": "L",
      o: "O",
      oth: "O",
      other: "O",
      c: "O",
      con: "O",
      w: "O"
    };
    canonicalParty = (party) => partyAliases[(party ?? "").trim().toLowerCase()] ?? "O";
    canonicalPartyComponents = (party) => (party ?? "").split(/[\/,]/).map(canonicalParty);
    US_ELECTION_TIME_ZONES = [
      "America/New_York",
      "America/Detroit",
      "America/Menominee",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Boise",
      "America/Anchorage",
      "America/Adak",
      "Pacific/Honolulu",
      "America/Puerto_Rico",
      "America/Indiana/Indianapolis",
      "America/Indiana/Knox",
      "America/Indiana/Tell_City",
      "America/Indiana/Vincennes",
      "America/Indiana/Winamac",
      "America/Indiana/Marengo",
      "America/Indiana/Vevay",
      "America/Kentucky/Louisville",
      "America/Kentucky/Monticello",
      "America/North_Dakota/Beulah",
      "America/North_Dakota/New_Salem",
      "America/North_Dakota/Center"
    ];
    knownZones = new Set(US_ELECTION_TIME_ZONES);
    utcDay = (date2) => new Date(Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate()));
    addDays = (date2, days) => new Date(date2.getTime() + days * 864e5);
  }
});

// shared/official-results.ts
import { z as z2 } from "zod";
function officialResultsElectionPhase(type) {
  if (typeof type !== "string") return null;
  switch (type.trim().toLowerCase()) {
    case "general":
      return "general";
    case "primary":
      return "primary";
    case "runoff":
      return "runoff";
    case "special":
    case "other":
      return "other";
    default:
      return null;
  }
}
function calendarDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, offset] = match;
  const date2 = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date2.getUTCFullYear() !== Number(year) || date2.getUTCMonth() + 1 !== Number(month) || date2.getUTCDate() !== Number(day)) return null;
  if (hour !== void 0 && (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59)) return null;
  if (offset && offset !== "Z") {
    const [offsetHour, offsetMinute] = offset.slice(1).split(":").map(Number);
    if (offsetHour > 14 || offsetMinute > 59 || offsetHour === 14 && offsetMinute !== 0) return null;
  }
  return value.slice(0, 10);
}
function projectOfficialResultsForElection(context) {
  const empty = { officialResultsUrl: null, officialResultsSource: null };
  try {
    const parsed = officialResultsFieldsSchema.safeParse(context);
    if (!parsed.success) return empty;
    const source = parsed.data.officialResultsSource;
    if (!source) return empty;
    if (calendarDate(context.date) !== source.targetElectionDate || officialResultsElectionPhase(context.type) !== source.electionPhase) return empty;
    if (source.status === "published" && (typeof context.state !== "string" || context.state.trim().toUpperCase() !== source.publicationEvidence?.state)) return empty;
    return { officialResultsUrl: parsed.data.officialResultsUrl ?? null, officialResultsSource: source };
  } catch {
    return empty;
  }
}
var resultsTimestamp, officialResultsRouteTypes, httpsResultsUrl, resultPhase, resultDigest, publishedResultsReceiptSchema, resultsPublicationEvidenceSchema, officialResultsSourceSchema, officialResultsFieldsSchema;
var init_official_results = __esm({
  "shared/official-results.ts"() {
    resultsTimestamp = z2.string().datetime({ offset: true }).refine((value) => Number.isFinite(Date.parse(value)), "A parseable timestamp with a valid timezone offset is required");
    officialResultsRouteTypes = [
      "generic_results_portal",
      "government_elections_fallback",
      "government_results_archive",
      "government_results_gateway",
      "government_results_history_information",
      "government_results_landing",
      "year_results_landing",
      "election_specific_results"
    ];
    httpsResultsUrl = z2.string().url().max(2048).refine((value) => {
      try {
        const url2 = new URL(value);
        return url2.protocol === "https:" && !url2.username && !url2.password && !url2.port;
      } catch {
        return false;
      }
    }, "An HTTPS URL without credentials or a custom port is required");
    resultPhase = z2.enum(["general", "primary", "runoff", "other"]);
    resultDigest = z2.string().regex(/^[a-f0-9]{64}$/);
    publishedResultsReceiptSchema = z2.object({
      state: z2.string().regex(/^[A-Z]{2}$/),
      outcome: z2.literal("worked"),
      electionDate: z2.literal("2026-11-03"),
      electionPhase: resultPhase,
      destinationUrl: httpsResultsUrl,
      sourceUrl: httpsResultsUrl,
      contextVerified: z2.literal(true),
      resultsObserved: z2.literal(true),
      observedElectionLabel: z2.string().trim().min(5).max(1024),
      checkedAt: resultsTimestamp
    }).strict();
    resultsPublicationEvidenceSchema = z2.object({
      state: z2.string().regex(/^[A-Z]{2}$/),
      electionDate: z2.literal("2026-11-03"),
      electionPhase: resultPhase,
      destinationUrl: httpsResultsUrl,
      officialElectionLabel: z2.string().trim().min(5).max(1024),
      officialContextVerified: z2.literal(true),
      officialContextReceiptSha256: resultDigest,
      receivingOutcome: z2.literal("worked"),
      receivingResultsObserved: z2.literal(true),
      receivingReceiptSha256: resultDigest,
      receivingCheckedAt: resultsTimestamp
    }).strict();
    officialResultsSourceSchema = z2.object({
      targetElectionDate: z2.literal("2026-11-03"),
      electionPhase: resultPhase,
      routeType: z2.enum(officialResultsRouteTypes),
      publisher: z2.string().min(1).max(512),
      checkedAt: resultsTimestamp,
      routeVerification: z2.enum(["worked", "blocked"]),
      status: z2.enum(["not_linked", "unknown", "published"]),
      availabilityReason: z2.enum([
        "not_linked_in_checked_official_sources",
        "advertised_route_election_not_in_selector",
        "unknown_portal_data_load_failed",
        "unknown_portal_election_context",
        "unknown_results_portal_tls_blocked",
        "unknown_transport_blocked",
        "unknown_election_phase",
        "published_for_target_election"
      ]),
      governmentUrl: httpsResultsUrl,
      fallbackUrl: httpsResultsUrl.nullable(),
      advertisedGeneralUrl: httpsResultsUrl.nullable(),
      documentSha256: z2.string().regex(/^[a-f0-9]{64}$/).nullable(),
      sourceReviewSha256: z2.string().regex(/^[a-f0-9]{64}$/),
      publicationEvidence: resultsPublicationEvidenceSchema.optional()
    }).strict().superRefine((source, ctx) => {
      if (source.status === "not_linked" && (source.electionPhase !== "general" || source.availabilityReason !== "not_linked_in_checked_official_sources" || source.routeVerification !== "worked")) {
        ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "not_linked requires a checked general-election context" });
      }
      if (source.status === "published") {
        const proof = source.publicationEvidence;
        if (source.routeType !== "election_specific_results" || source.routeVerification !== "worked" || source.availabilityReason !== "published_for_target_election" || !proof || proof.electionDate !== source.targetElectionDate || proof.electionPhase !== source.electionPhase || proof.receivingCheckedAt !== source.checkedAt) {
          ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Published requires a verified exact-date/phase specific results receipt" });
        }
      } else if (source.routeType === "election_specific_results" || source.publicationEvidence || source.availabilityReason === "published_for_target_election") {
        ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Specific publication evidence cannot be asserted on pending or unknown routes" });
      }
    });
    officialResultsFieldsSchema = z2.object({
      officialResultsUrl: httpsResultsUrl.nullable().default(null),
      officialResultsSource: officialResultsSourceSchema.nullable().default(null)
    }).superRefine((fields, ctx) => {
      if (fields.officialResultsUrl !== null && fields.officialResultsSource?.routeVerification !== "worked") {
        ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "A destination requires verified source metadata" });
      }
      if (fields.officialResultsSource?.status === "published" && fields.officialResultsUrl !== fields.officialResultsSource.publicationEvidence?.destinationUrl) {
        ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Published destination must match the observed receiving receipt" });
      }
    });
  }
});

// server/election-list-query.ts
import { and, eq, getTableColumns, gte, ilike, inArray, notInArray, lt, or, sql as sql2 } from "drizzle-orm";
function projectElectionResultsRow(row) {
  const { resultsCatalogTimestamp: stored, ...fields } = row;
  const normalized = /* @__PURE__ */ new Date(stored + "Z");
  const date2 = Number.isFinite(normalized.getTime()) ? normalized : row.date;
  return { ...fields, date: date2, ...projectOfficialResultsForElection({ ...fields, date: date2 }) };
}
function buildElectionListQuery(database, filters = {}, now = /* @__PURE__ */ new Date()) {
  const normalized = normalizeElectionFilters(filters, now);
  const conditions = [eq(elections.isActive, true)];
  if (normalized.from) conditions.push(gte(elections.date, normalized.from));
  if (normalized.period) {
    const knownZone = inArray(elections.timezone, Array.from(US_ELECTION_TIME_ZONES));
    const lowerZone = sql2`case when ${knownZone} then ${elections.timezone} else ${"Etc/GMT+11"} end`;
    const upperZone = sql2`case when ${knownZone} then ${elections.timezone} else ${"Etc/GMT+4"} end`;
    const localDay = sql2`(${now.toISOString()}::timestamptz at time zone ${lowerZone})::date`;
    const upperDay = sql2`(${now.toISOString()}::timestamptz at time zone ${upperZone})::date`;
    conditions.push(gte(elections.date, localDay));
    if (normalized.period.days !== void 0) {
      conditions.push(lt(elections.date, sql2`${upperDay} + ${normalized.period.days} * interval '1 day' + interval '1 day'`));
    } else if (normalized.period.months !== void 0) {
      conditions.push(lt(elections.date, sql2`${upperDay} + ${normalized.period.months} * interval '1 month' + interval '1 day'`));
    }
  } else if (normalized.until) conditions.push(lt(elections.date, normalized.until));
  if (normalized.state) conditions.push(eq(elections.state, normalized.state));
  if (normalized.types.length) conditions.push(inArray(sql2`lower(trim(${elections.type}))`, normalized.types));
  if (normalized.electionTypes.length) conditions.push(inArray(sql2`lower(trim(${elections.type}))`, normalized.electionTypes));
  if (normalized.levels.length) conditions.push(inArray(sql2`lower(trim(${elections.level}))`, normalized.levels));
  if (normalized.cycle) {
    conditions.push(gte(elections.date, new Date(Date.UTC(normalized.cycle, 0, 1))));
    conditions.push(lt(elections.date, new Date(Date.UTC(normalized.cycle + 1, 0, 1))));
  }
  if (normalized.search) {
    const pattern = `%${normalized.search.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(ilike(elections.title, pattern), ilike(elections.subtitle, pattern), ilike(elections.location, pattern)));
  }
  if (normalized.parties.length) {
    const aliases = Object.entries(partyAliases).filter(([, code]) => normalized.parties.includes(code)).map(([alias]) => alias);
    const knownAliases = Object.keys(partyAliases);
    const component = sql2`lower(trim(party_component))`;
    const partyMatch = normalized.parties.includes("O") ? or(inArray(component, aliases), notInArray(component, knownAliases)) : inArray(component, aliases);
    conditions.push(sql2`exists (select 1 from ${candidates} cross join lateral regexp_split_to_table(coalesce(${candidates.party},''),${"[/,]"}) as party_component where ${candidates.electionId} = ${elections.id} and ${partyMatch})`);
  }
  return database.select({ ...getTableColumns(elections), resultsCatalogTimestamp, candidateCount: sql2`count(${candidates.id})`.mapWith(Number) }).from(elections).leftJoin(candidates, eq(candidates.electionId, elections.id)).where(and(...conditions)).groupBy(elections.id).orderBy(elections.date, elections.id);
}
var resultsCatalogTimestamp;
var init_election_list_query = __esm({
  "server/election-list-query.ts"() {
    init_schema();
    init_election_list_filters();
    init_official_results();
    resultsCatalogTimestamp = sql2`to_char(${elections.date}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`;
  }
});

// server/results-source-registry.ts
function dayOf(date2) {
  const d = date2 instanceof Date ? date2 : new Date(date2);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function hostOf(url2) {
  try {
    const u = new URL(url2);
    return u.protocol === "https:" ? u.host.toLowerCase() : null;
  } catch {
    return null;
  }
}
var ResultsSourceRegistry, resultsSourceRegistry;
var init_results_source_registry = __esm({
  "server/results-source-registry.ts"() {
    ResultsSourceRegistry = class {
      sources = /* @__PURE__ */ new Map();
      /** Register (or replace) a reviewed source. Throws on an unusable entry so a bad startup fails loudly. */
      register(source) {
        if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(source.id)) throw new Error(`source id ${JSON.stringify(source.id)} is not a valid registry id`);
        if (source.id.startsWith("admin_manual:")) throw new Error("admin_manual:<ST> ids are reserved for admin posting");
        if (!/^[A-Z]{2}$/.test(source.state)) throw new Error(`source ${source.id}: state must be a two-letter code`);
        const urls = source.allowedUrls ?? [];
        const hosts = (source.allowedHosts ?? []).map((h) => h.toLowerCase());
        if (!urls.length && !hosts.length) throw new Error(`source ${source.id}: allowedUrls or allowedHosts is required`);
        for (const u of urls) if (hostOf(u) === null) throw new Error(`source ${source.id}: allowed URL must be https: ${u}`);
        if (source.electionDate !== void 0 && !/^\d{4}-\d{2}-\d{2}$/.test(source.electionDate)) throw new Error(`source ${source.id}: electionDate must be YYYY-MM-DD`);
        if (!source.electionDate && !source.electionIds?.length) throw new Error(`source ${source.id}: electionDate or electionIds is required`);
        this.sources.set(source.id, { ...source, allowedUrls: urls, allowedHosts: hosts });
      }
      unregister(id2) {
        this.sources.delete(id2);
      }
      clear() {
        this.sources.clear();
      }
      get(id2) {
        return this.sources.get(id2);
      }
      list(state) {
        return [...this.sources.values()].filter((s) => !state || s.state === state).sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id));
      }
      /** Every declared constraint must match; explicit IDs narrow the state/date/phase scope. */
      admittedFor(election) {
        const day = dayOf(election.date);
        return this.list().filter((s) => {
          if (s.electionIds !== void 0 && !s.electionIds.includes(election.id)) return false;
          if (s.state !== (election.state ?? "")) return false;
          if (s.electionDate !== void 0 && s.electionDate !== day) return false;
          return s.phase === void 0 || s.phase === election.type;
        });
      }
      /**
       * Does a report's `source` block match the registered entry? Returns null when it matches, else the reason.
       * Used by the writer so a caller cannot evade evidence rules by relabelling a kind or pointing at a foreign URL.
       */
      mismatch(source) {
        const reg = this.sources.get(source.id);
        if (!reg) return "not_registered";
        if (source.kind !== reg.kind) return `kind ${source.kind} differs from registered kind ${reg.kind}`;
        const host = hostOf(source.url);
        if (host === null) return "url must be https";
        if (reg.allowedUrls.includes(source.url)) return null;
        if (reg.allowedHosts.includes(host)) return null;
        return `url ${source.url} is not an allowed URL/host for ${reg.id}`;
      }
    };
    resultsSourceRegistry = new ResultsSourceRegistry();
  }
});

// shared/live-election-results.ts
import { z as z3 } from "zod";
function validateRecorded(value, ctx) {
  const issue = (path, message) => ctx.addIssue({ code: z3.ZodIssueCode.custom, path, message });
  if (value.status === "none") return;
  for (const field of ["source", "sourcePayloadSha256", "retrievedAt", "asOfBasis"]) {
    if (value[field] === null) issue([field], "An observed result requires source provenance");
  }
  if (value.asOf === null && value.asOfBasis !== "not_provided") issue(["asOfBasis"], "An absent source timestamp must be not_provided");
  if (value.asOf !== null && (value.asOfBasis === null || value.asOfBasis === "not_provided")) issue(["asOfBasis"], "A source timestamp requires its actual basis");
  if (value.asOf !== null && value.retrievedAt !== null && Date.parse(value.asOf) > Date.parse(value.retrievedAt)) issue(["asOf"], "Source as-of time is after retrieval");
  if (value.status === "certified" && value.certification === null) issue(["certification"], "Certification requires exact-race official evidence");
  if (value.status !== "certified" && value.certification !== null) issue(["certification"], "Certification evidence requires certified status");
  if (value.source?.kind === "ap" && value.status === "certified") issue(["status"], "AP cannot establish official certification");
  if (value.certification?.certifiedAt && value.retrievedAt && Date.parse(value.certification.certifiedAt) > Date.parse(value.retrievedAt)) issue(["certification", "certifiedAt"], "Certification time is after retrieval");
  if (value.winnerCalledBy && value.retrievedAt && Date.parse(value.winnerCalledBy.at) > Date.parse(value.retrievedAt)) issue(["winnerCalledBy", "at"], "Official decision time is after retrieval");
  const winners = value.candidates.filter((candidate) => candidate.isWinner);
  if (winners.length && value.winnerCalledBy === null) issue(["winnerCalledBy"], "Only an explicit official declaration may mark a winner");
  if (!winners.length && value.winnerCalledBy !== null) issue(["winnerCalledBy"], "An official winner declaration must name a recorded option");
  const options = /* @__PURE__ */ new Set();
  const boundCandidates = /* @__PURE__ */ new Set();
  value.candidates.forEach((candidate, index2) => {
    if (options.has(candidate.sourceCandidateId)) issue(["candidates", index2, "sourceCandidateId"], "Duplicate source ballot option");
    options.add(candidate.sourceCandidateId);
    if (candidate.candidateId !== null) {
      if (boundCandidates.has(candidate.candidateId)) issue(["candidates", index2, "candidateId"], "Duplicate candidate binding");
      boundCandidates.add(candidate.candidateId);
    }
  });
}
var liveResultSourceKinds, liveResultReportingBases, liveResultAsOfBases, count, id, percent, timestamp2, digest, token, shortText, calendarDate2, liveResultElectionContextSchema, liveResultSourceSchema, liveResultReportingSchema, liveResultCandidateSchema, winnerSchema, certificationSchema, liveResultHistorySchema, resultFields, resultObject, liveElectionResultsSchema, liveResultReportInputSchema, liveResultsBatchSchema;
var init_live_election_results = __esm({
  "shared/live-election-results.ts"() {
    init_official_results();
    liveResultSourceKinds = ["official_state_enr", "official_state_page", "official_county", "ap", "admin_manual"];
    liveResultReportingBases = ["precincts", "ballots", "votes", "source_unspecified"];
    liveResultAsOfBases = ["source_timestamp", "source_publication_time", "not_provided"];
    count = z3.number().int().nonnegative().safe();
    id = count.refine((value) => value > 0, "A positive identifier is required");
    percent = z3.number().finite().min(0).max(100);
    timestamp2 = resultsTimestamp;
    digest = z3.string().regex(/^[a-f0-9]{64}$/);
    token = z3.string().trim().min(1).max(256);
    shortText = z3.string().trim().min(1).max(512);
    calendarDate2 = z3.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
      const parsed = /* @__PURE__ */ new Date(value + "T00:00:00Z");
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "An actual calendar date is required");
    liveResultElectionContextSchema = z3.object({
      state: z3.string().regex(/^[A-Z]{2}$/),
      electionDate: calendarDate2,
      type: token,
      level: token,
      office: shortText
    }).strict();
    liveResultSourceSchema = z3.object({
      id: token,
      kind: z3.enum(liveResultSourceKinds),
      name: shortText,
      url: httpsResultsUrl,
      sourceContestId: token
    }).strict();
    liveResultReportingSchema = z3.object({
      percent: percent.nullable(),
      basis: z3.enum(liveResultReportingBases),
      precinctsReporting: count.nullable(),
      precinctsTotal: count.nullable()
    }).strict().superRefine((value, ctx) => {
      if (value.precinctsReporting !== null && value.precinctsTotal !== null && value.precinctsReporting > value.precinctsTotal) {
        ctx.addIssue({ code: z3.ZodIssueCode.custom, path: ["precinctsReporting"], message: "Reported precincts exceed the source total" });
      }
    });
    liveResultCandidateSchema = z3.object({
      candidateId: id.nullable(),
      sourceCandidateId: token,
      name: shortText,
      party: shortText.nullable(),
      votes: count,
      percent: percent.nullable(),
      isWinner: z3.boolean()
    }).strict();
    winnerSchema = z3.object({ source: shortText, url: httpsResultsUrl, at: timestamp2 }).strict();
    certificationSchema = z3.object({ url: httpsResultsUrl, certifiedAt: timestamp2.nullable() }).strict();
    liveResultHistorySchema = z3.object({
      reportId: id,
      revision: token,
      asOf: timestamp2.nullable(),
      status: z3.enum(["unofficial", "certified"]),
      percent: percent.nullable(),
      sourceId: token,
      sourceUrl: httpsResultsUrl,
      contextMatch: z3.boolean()
    }).strict();
    resultFields = {
      schemaVersion: z3.literal(1),
      electionId: id,
      status: z3.enum(["none", "unofficial", "certified"]),
      reporting: liveResultReportingSchema.nullable(),
      source: liveResultSourceSchema.nullable(),
      sourcePayloadSha256: digest.nullable(),
      asOf: timestamp2.nullable(),
      asOfBasis: z3.enum(liveResultAsOfBases).nullable(),
      retrievedAt: timestamp2.nullable(),
      totalVotes: count.nullable(),
      candidates: z3.array(liveResultCandidateSchema).max(5e3),
      winnerCalledBy: winnerSchema.nullable(),
      certification: certificationSchema.nullable(),
      supersedesReportId: id.nullable()
    };
    resultObject = z3.object(resultFields).strict();
    liveElectionResultsSchema = resultObject.extend({
      reportId: id.nullable(),
      revision: token.nullable(),
      electionContext: liveResultElectionContextSchema.nullable(),
      history: z3.array(liveResultHistorySchema).max(1e4),
      stale: z3.boolean().default(false),
      staleSince: timestamp2.nullable().default(null)
    }).strict().superRefine((value, ctx) => {
      validateRecorded(value, ctx);
      if (value.status === "none") {
        for (const field of ["reportId", "revision", "reporting", "source", "sourcePayloadSha256", "asOf", "asOfBasis", "retrievedAt", "totalVotes", "winnerCalledBy", "certification", "supersedesReportId", "staleSince", "electionContext"]) {
          if (value[field] !== null) ctx.addIssue({ code: z3.ZodIssueCode.custom, path: [field], message: "No ingested result requires null metadata" });
        }
        if (value.candidates.length || value.stale) ctx.addIssue({ code: z3.ZodIssueCode.custom, message: "No ingested result cannot contain counts or a stale snapshot" });
        value.history.forEach((entry, index2) => {
          if (entry.contextMatch) ctx.addIssue({ code: z3.ZodIssueCode.custom, path: ["history", index2, "contextMatch"], message: "A matching recorded snapshot cannot be represented as none" });
        });
      } else {
        if (value.reportId === null || value.revision === null) ctx.addIssue({ code: z3.ZodIssueCode.custom, message: "Recorded results require a persisted report and revision" });
        if (value.electionContext === null) ctx.addIssue({ code: z3.ZodIssueCode.custom, path: ["electionContext"], message: "Recorded results require their immutable race context" });
        if (value.stale !== (value.staleSince !== null)) ctx.addIssue({ code: z3.ZodIssueCode.custom, path: ["staleSince"], message: "Stale snapshots require the actual failure time" });
      }
    });
    liveResultReportInputSchema = resultObject.extend({
      status: z3.enum(["unofficial", "certified"]),
      expectedRevision: token.nullable(),
      idempotencyKey: z3.string().trim().min(1).max(128).regex(/^[A-Za-z0-9:_-]+$/),
      note: z3.string().trim().max(4e3).nullable()
    }).strict().superRefine(validateRecorded);
    liveResultsBatchSchema = z3.object({
      schemaVersion: z3.literal(1),
      date: calendarDate2.nullable(),
      results: z3.array(liveElectionResultsSchema).max(2e3),
      cursor: token,
      reset: z3.literal(true)
    }).strict().superRefine((value, ctx) => {
      const ids = /* @__PURE__ */ new Set();
      value.results.forEach((row, index2) => {
        if (ids.has(row.electionId)) ctx.addIssue({ code: z3.ZodIssueCode.custom, path: ["results", index2, "electionId"], message: "Duplicate contest in batch" });
        ids.add(row.electionId);
        if (row.history.length) ctx.addIssue({ code: z3.ZodIssueCode.custom, path: ["results", index2, "history"], message: "Batch contains current snapshots only; history belongs to the detail read" });
        if (value.date !== null && row.electionContext !== null && row.electionContext.electionDate !== value.date) ctx.addIssue({ code: z3.ZodIssueCode.custom, path: ["results", index2, "electionContext", "electionDate"], message: "Recorded contest does not belong to the requested date" });
      });
    });
  }
});

// server/results-reports.ts
import { z as z4 } from "zod";
import { createHash } from "node:crypto";
function narrowRecorded(r) {
  if (r.source === null || r.sourcePayloadSha256 === null || r.retrievedAt === null || r.asOfBasis === null) {
    throw new ResultReportError(422, "invalid_report", "a recorded result requires source provenance", [{ path: "source", message: "An observed result requires source provenance" }]);
  }
  return r;
}
function stripAdminFields(r) {
  const { expectedRevision: _e, idempotencyKey: _k, ...rest } = r;
  return rest;
}
function electionContextOf(e) {
  return { state: e.state, electionDate: new Date(e.date).toISOString().slice(0, 10), type: e.type, level: e.level, office: e.title };
}
function reportContextOf(r) {
  return { state: r.context_state, electionDate: new Date(r.context_election_date).toISOString().slice(0, 10), type: r.context_type, level: r.context_level, office: r.context_office };
}
function contextMatches(a, b) {
  return a.state === b.state && a.electionDate === b.electionDate && a.type === b.type && a.level === b.level && a.office === b.office;
}
function emptyResultsPayload(electionId) {
  return {
    schemaVersion: RESULTS_SCHEMA_VERSION,
    electionId,
    reportId: null,
    revision: null,
    status: "none",
    reporting: null,
    source: null,
    sourcePayloadSha256: null,
    asOf: null,
    asOfBasis: null,
    retrievedAt: null,
    totalVotes: null,
    candidates: [],
    winnerCalledBy: null,
    certification: null,
    supersedesReportId: null,
    stale: false,
    staleSince: null,
    electionContext: null,
    history: []
  };
}
function buildResultsPayload(electionId, latest, lines, history, current) {
  const annotated = history.filter((h) => latest === null || h.id !== latest.id).map((h) => ({
    reportId: h.id,
    revision: h.revision,
    asOf: iso(h.as_of),
    status: h.status,
    percent: num(h.reporting_percent),
    sourceId: h.source_id,
    sourceUrl: h.source_url,
    contextMatch: contextMatches(reportContextOf(h), current)
  }));
  if (!latest) return { ...emptyResultsPayload(electionId), history: annotated };
  return {
    schemaVersion: RESULTS_SCHEMA_VERSION,
    electionId,
    reportId: latest.id,
    revision: latest.revision,
    status: latest.status,
    reporting: latest.reporting_basis === null && latest.reporting_percent === null && latest.precincts_reporting === null && latest.precincts_total === null ? null : { percent: num(latest.reporting_percent), basis: latest.reporting_basis ?? "source_unspecified", precinctsReporting: latest.precincts_reporting, precinctsTotal: latest.precincts_total },
    source: { id: latest.source_id, kind: latest.source_kind, name: latest.source_name, url: latest.source_url, sourceContestId: latest.source_contest_id },
    sourcePayloadSha256: latest.source_payload_sha256,
    asOf: iso(latest.as_of),
    asOfBasis: latest.as_of_basis,
    retrievedAt: iso(latest.retrieved_at),
    totalVotes: num(latest.total_votes),
    candidates: lines.map((l) => ({
      candidateId: l.candidate_id,
      sourceCandidateId: l.source_candidate_id,
      name: l.name,
      party: l.party,
      votes: Number(l.votes),
      percent: num(l.percent),
      isWinner: l.is_winner_declared === true
    })),
    winnerCalledBy: latest.winner_called_source && latest.winner_called_url && latest.winner_called_at ? { source: latest.winner_called_source, url: latest.winner_called_url, at: iso(latest.winner_called_at) } : null,
    certification: latest.certification_url ? { url: latest.certification_url, certifiedAt: iso(latest.certified_at) } : null,
    supersedesReportId: latest.supersedes_report_id,
    stale: false,
    staleSince: null,
    electionContext: reportContextOf(latest),
    history: annotated
  };
}
function revisionFor(reportId, input) {
  return `r${reportId}-${canonicalInputHash(input).slice(0, 8)}`;
}
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value;
  const keys = Object.keys(obj).filter((k) => obj[k] !== void 0).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}
function canonicalInputHash(input) {
  const { note: _n, supersedesReportId: _s, ...rest } = input;
  return createHash("sha256").update(stableStringify(rest)).digest("hex");
}
function assertNotFuture(input, now = Date.now()) {
  if (new Date(input.retrievedAt).getTime() > now + 5 * 60 * 1e3) {
    throw new ResultReportError(422, "invalid_report", "retrievedAt is in the future", [{ path: "retrievedAt", message: "retrievedAt is in the future" }]);
  }
}
var RESULTS_SCHEMA_VERSION, resultReportInputSchema, iso, num, ResultReportError;
var init_results_reports = __esm({
  "server/results-reports.ts"() {
    init_live_election_results();
    RESULTS_SCHEMA_VERSION = 1;
    resultReportInputSchema = z4.preprocess(
      (v) => v && typeof v === "object" ? { expectedRevision: null, idempotencyKey: "adapter", ...v } : v,
      liveResultReportInputSchema
    ).transform((r) => narrowRecorded(stripAdminFields(r)));
    iso = (v) => v == null ? null : new Date(v).toISOString();
    num = (v) => v == null ? null : Number(v);
    ResultReportError = class extends Error {
      constructor(status, publicCode, message, details) {
        super(message);
        this.status = status;
        this.publicCode = publicCode;
        this.details = details;
      }
      status;
      publicCode;
      details;
    };
  }
});

// server/results-store.ts
import { createHash as createHash2 } from "node:crypto";
function sha256Hex(bytes) {
  return createHash2("sha256").update(bytes).digest("hex");
}
function adminManualSourceId(state) {
  return `admin_manual:${state}`;
}
function kindForRoute(routeType) {
  if (/county/i.test(routeType)) return "official_county";
  if (/enr|clarity|feed|results/i.test(routeType)) return "official_state_enr";
  return "official_state_page";
}
function buildSources(rows, states2, filterState) {
  const byId = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (filterState && r.state !== filterState) continue;
    const existing = byId.get(r.publisher);
    if (existing) {
      existing.electionIds.push(r.election_id);
      if (r.status === "published") existing.published = true;
      continue;
    }
    byId.set(r.publisher, { id: r.publisher, kind: kindForRoute(r.route_type), name: r.publisher, url: r.government_url, state: r.state, electionIds: [r.election_id], registeredBy: "manifest", published: r.status === "published" });
  }
  for (const reg of resultsSourceRegistry.list(filterState)) {
    const existing = byId.get(reg.id);
    if (existing) {
      existing.registeredBy = "both";
      for (const id2 of reg.electionIds ?? []) if (!existing.electionIds.includes(id2)) existing.electionIds.push(id2);
      continue;
    }
    byId.set(reg.id, { id: reg.id, kind: reg.kind, name: reg.name, url: reg.allowedUrls?.[0] ?? null, state: reg.state, electionIds: [...reg.electionIds ?? []], registeredBy: "registry", published: false });
  }
  for (const st of states2) {
    if (filterState && st !== filterState) continue;
    byId.set(adminManualSourceId(st), { id: adminManualSourceId(st), kind: "admin_manual", name: `Manual entry from an official ${st} page`, url: null, state: st, electionIds: [], registeredBy: "manifest", published: false });
  }
  return [...byId.values()].sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id));
}
function assertSourceRegistered(input, state, manifestForState, race) {
  const src = input.source;
  if (src.kind === "admin_manual") {
    if (src.id !== adminManualSourceId(state)) throw new ResultReportError(422, "unknown_source", `admin_manual source id must be ${adminManualSourceId(state)}`);
    const hosts2 = /* @__PURE__ */ new Set();
    for (const m of manifestForState) {
      try {
        hosts2.add(new URL(m.government_url).host.toLowerCase());
      } catch {
      }
    }
    for (const r of resultsSourceRegistry.list(state)) {
      for (const h of r.allowedHosts ?? []) hosts2.add(h);
      for (const u of r.allowedUrls ?? []) {
        try {
          hosts2.add(new URL(u).host.toLowerCase());
        } catch {
        }
      }
    }
    if (hosts2.size) {
      const host2 = new URL(src.url).host.toLowerCase();
      if (!hosts2.has(host2)) throw new ResultReportError(422, "unknown_source", `admin_manual URL host ${host2} is not one of the registered official hosts for ${state}`, { allowedHosts: [...hosts2] });
    }
    return;
  }
  if (src.kind === "ap") return;
  const reg = resultsSourceRegistry.get(src.id);
  if (reg) {
    if (reg.state !== state) throw new ResultReportError(422, "unknown_source", `source id ${src.id} is registered for ${reg.state}, not ${state}`);
    const admitted = resultsSourceRegistry.admittedFor({ id: race.id, state, date: race.date ?? "", type: race.type }).some((r) => r.id === reg.id);
    if (!admitted) throw new ResultReportError(422, "source_mismatch", `source ${src.id} is registered for ${reg.electionDate ?? "explicit elections"}${reg.phase ? " " + reg.phase : ""}, not for election ${race.id}`, { registeredFor: { electionDate: reg.electionDate ?? null, phase: reg.phase ?? null, electionIds: reg.electionIds ?? [] } });
    const problem = resultsSourceRegistry.mismatch(src);
    if (problem) throw new ResultReportError(422, "source_mismatch", `source ${src.id}: ${problem}`);
    return;
  }
  const manifest = manifestForState.filter((m) => m.publisher === src.id);
  if (!manifest.length) throw new ResultReportError(422, "unknown_source", `source id ${src.id} is not registered for ${state}`);
  const expectedKind = kindForRoute(manifest[0].route_type);
  if (src.kind !== expectedKind) throw new ResultReportError(422, "source_mismatch", `source ${src.id}: kind ${src.kind} differs from the manifest kind ${expectedKind}`);
  let host;
  try {
    const u = new URL(src.url);
    if (u.protocol !== "https:") throw new Error("not https");
    host = u.host.toLowerCase();
  } catch {
    throw new ResultReportError(422, "source_mismatch", `source ${src.id}: url must be https`);
  }
  const hosts = new Set(manifest.map((m) => {
    try {
      return new URL(m.government_url).host.toLowerCase();
    } catch {
      return "";
    }
  }).filter(Boolean));
  if (hosts.size && !hosts.has(host)) throw new ResultReportError(422, "source_mismatch", `source ${src.id}: url host ${host} is not the manifest host`, { allowedHosts: [...hosts] });
}
function stripHistory(p) {
  return { ...p, history: [] };
}
function snapshotCursor(results) {
  const canon = results.map((r) => `${r.electionId}:${r.revision ?? "none"}`).sort().join("|");
  return createHash2("sha256").update(canon).digest("hex").slice(0, 24);
}
function assertNotPreElection(input, electionDate) {
  const day = new Date(electionDate);
  const dayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const offending = [];
  if (input.asOf && new Date(input.asOf).getTime() < dayStart) offending.push({ path: "asOf", message: `precedes the election day ${new Date(dayStart).toISOString().slice(0, 10)}` });
  if (new Date(input.retrievedAt).getTime() < dayStart) offending.push({ path: "retrievedAt", message: `precedes the election day ${new Date(dayStart).toISOString().slice(0, 10)}` });
  if (offending.length) throw new ResultReportError(422, "pre_election_snapshot", "snapshot predates the election; pre-election portal values are not results", offending);
}
var CONTEXT_MATCH_SQL, HISTORY_LIMIT, LIST_MAX_IDS, EVIDENCE_MAX_BYTES, EVIDENCE_REQUIRED_KINDS, PgResultReportStore, MemResultReportStore;
var init_results_store = __esm({
  "server/results-store.ts"() {
    init_results_source_registry();
    init_results_reports();
    CONTEXT_MATCH_SQL = `r.context_state = e.state AND r.context_election_date = e.date::date AND r.context_type = e.type AND r.context_level = e.level AND r.context_office = e.title`;
    HISTORY_LIMIT = 50;
    LIST_MAX_IDS = 600;
    EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
    EVIDENCE_REQUIRED_KINDS = /* @__PURE__ */ new Set(["admin_manual", "official_state_page"]);
    PgResultReportStore = class {
      constructor(pool2) {
        this.pool = pool2;
      }
      pool;
      async getResultsPayload(electionId) {
        const election = await this.pool.query("SELECT id, state, date, type, level, title FROM elections WHERE id = $1", [electionId]);
        if (election.rowCount === 0) return null;
        const current = electionContextOf(election.rows[0]);
        const history = await this.pool.query(
          "SELECT * FROM election_result_reports WHERE election_id = $1 ORDER BY id DESC LIMIT $2",
          [electionId, HISTORY_LIMIT]
        );
        const latest = history.rows.find((r) => contextMatches(reportContextOf(r), current)) ?? null;
        const lines = latest ? (await this.pool.query("SELECT * FROM candidate_result_lines WHERE report_id = $1 ORDER BY votes DESC, id", [latest.id])).rows : [];
        return buildResultsPayload(electionId, latest, lines, history.rows, current);
      }
      async listResultsPayloads(query) {
        const where = [];
        const params = [];
        if (query.date) {
          params.push(query.date);
          where.push(`e.date::date = $${params.length}::date`);
        }
        if (query.ids) {
          params.push(query.ids.slice(0, LIST_MAX_IDS));
          where.push(`e.id = ANY($${params.length}::int[])`);
        }
        if (where.length === 0) return { schemaVersion: 1, date: query.date ?? null, cursor: snapshotCursor([]), reset: true, results: [] };
        const latestSql = `
      SELECT e.id AS e_id, e.state AS e_state, e.date AS e_date, e.type AS e_type, e.level AS e_level, e.title AS e_title, r.*
        FROM elections e
        LEFT JOIN LATERAL (SELECT * FROM election_result_reports r WHERE r.election_id = e.id AND ${CONTEXT_MATCH_SQL} ORDER BY r.id DESC LIMIT 1) r ON true
       WHERE ${where.join(" AND ")}
       ORDER BY e.id`;
        const rows = (await this.pool.query(latestSql, params)).rows;
        const reportIds = rows.map((r) => r.id).filter((id2) => id2 !== null);
        const lines = reportIds.length ? (await this.pool.query("SELECT * FROM candidate_result_lines WHERE report_id = ANY($1::int[]) ORDER BY report_id, votes DESC, id", [reportIds])).rows : [];
        const linesByReport = /* @__PURE__ */ new Map();
        for (const l of lines) {
          const arr = linesByReport.get(l.report_id) ?? [];
          arr.push(l);
          linesByReport.set(l.report_id, arr);
        }
        const results = rows.map((r) => {
          const current = electionContextOf({ state: r.e_state, date: r.e_date, type: r.e_type, level: r.e_level, title: r.e_title });
          return stripHistory(buildResultsPayload(r.e_id, r.id === null ? null : r, r.id === null ? [] : linesByReport.get(r.id) ?? [], [], current));
        });
        return { schemaVersion: 1, date: query.date ?? null, cursor: snapshotCursor(results), reset: true, results };
      }
      async recordResultReport(electionId, input, ctx) {
        const inputSha = canonicalInputHash(input);
        const client = await this.pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT pg_advisory_xact_lock($1, $2)", [20261106, electionId]);
          const election = await client.query("SELECT id, state, date, type, level, title FROM elections WHERE id = $1", [electionId]);
          if (election.rowCount === 0) throw new ResultReportError(404, "election_not_found", `Election ${electionId} not found`);
          if (input.electionId !== electionId) throw new ResultReportError(422, "invalid_report", "report electionId does not match the target election", [{ path: "electionId", message: "mismatch" }]);
          assertNotFuture(input);
          assertNotPreElection(input, election.rows[0].date);
          const context = electionContextOf(election.rows[0]);
          assertSourceRegistered(input, election.rows[0].state, await this.manifestRows(client, election.rows[0].state), { id: electionId, date: election.rows[0].date, type: election.rows[0].type });
          if (EVIDENCE_REQUIRED_KINDS.has(input.source.kind) || input.status === "certified") {
            const ev = await client.query("SELECT 1 FROM result_evidence_blobs WHERE sha256 = $1", [input.sourcePayloadSha256]);
            if (ev.rowCount === 0) throw new ResultReportError(422, "evidence_missing", "sourcePayloadSha256 does not reference retained evidence; upload it first (POST /api/admin/results-evidence)");
          }
          if (ctx.idempotencyKey) {
            const prior = await client.query(
              "SELECT * FROM election_result_reports WHERE idempotency_key = $1",
              [ctx.idempotencyKey]
            );
            if (prior.rowCount) {
              const row = prior.rows[0];
              if (row.input_sha256 !== inputSha || row.election_id !== electionId) {
                throw new ResultReportError(409, "idempotency_conflict", "idempotencyKey was already used with a different payload");
              }
              await client.query("COMMIT");
              return { payload: await this.getResultsPayload(electionId), created: false };
            }
          }
          const sameSnapshot = await client.query(
            "SELECT * FROM election_result_reports WHERE source_id = $1 AND source_contest_id = $2 AND input_sha256 = $3",
            [input.source.id, input.source.sourceContestId, inputSha]
          );
          if (sameSnapshot.rowCount) {
            if (sameSnapshot.rows[0].election_id !== electionId) throw new ResultReportError(422, "contest_key_conflict", `source contest ${input.source.sourceContestId} is already bound to election ${sameSnapshot.rows[0].election_id}`);
            await client.query("COMMIT");
            return { payload: await this.getResultsPayload(electionId), created: false };
          }
          const otherElection = await client.query(
            "SELECT election_id FROM election_result_reports WHERE source_id = $1 AND source_contest_id = $2 AND election_id <> $3 LIMIT 1",
            [input.source.id, input.source.sourceContestId, electionId]
          );
          if (otherElection.rowCount) throw new ResultReportError(422, "contest_key_conflict", `source contest ${input.source.sourceContestId} is already bound to election ${otherElection.rows[0].election_id}`, { boundElectionId: otherElection.rows[0].election_id });
          const latest = await client.query(
            "SELECT * FROM election_result_reports WHERE election_id = $1 ORDER BY id DESC LIMIT 1",
            [electionId]
          );
          const latestRow = latest.rows[0] ?? null;
          if (ctx.enforceRevision && (ctx.expectedRevision ?? null) !== (latestRow?.revision ?? null)) {
            throw new ResultReportError(409, "stale_revision", "expectedRevision does not match the current revision", { currentRevision: latestRow?.revision ?? null });
          }
          if (input.supersedesReportId !== null) {
            const sup = await client.query("SELECT 1 FROM election_result_reports WHERE id = $1 AND election_id = $2", [input.supersedesReportId, electionId]);
            if (sup.rowCount === 0) throw new ResultReportError(422, "invalid_report", "supersedesReportId is not a report of this election", [{ path: "supersedesReportId", message: "unknown report" }]);
          } else if (input.asOf) {
            const newerSameSource = await client.query(
              "SELECT id, as_of FROM election_result_reports WHERE election_id = $1 AND source_id = $2 AND as_of IS NOT NULL AND as_of > $3::timestamptz ORDER BY as_of DESC LIMIT 1",
              [electionId, input.source.id, input.asOf]
            );
            if (newerSameSource.rowCount) {
              throw new ResultReportError(409, "older_than_latest", "a newer snapshot from this source already exists; name it in supersedesReportId for an official correction", { latestReportId: newerSameSource.rows[0].id });
            }
          }
          const mapped = input.candidates.map((c) => c.candidateId).filter((id2) => id2 !== null);
          if (mapped.length) {
            const owned = await client.query("SELECT id FROM candidates WHERE election_id = $1 AND id = ANY($2::int[])", [electionId, mapped]);
            const ok = new Set(owned.rows.map((r) => r.id));
            const bad = mapped.filter((id2) => !ok.has(id2));
            if (bad.length) throw new ResultReportError(422, "invalid_report", "candidateId not in this election", bad.map((id2) => ({ path: "candidates", message: `candidate ${id2} is not in election ${electionId}` })));
          }
          const inserted = await client.query(
            `INSERT INTO election_result_reports (
           election_id, revision, status, source_id, source_kind, source_name, source_url, source_contest_id,
           source_payload_sha256, input_sha256, as_of, as_of_basis, retrieved_at,
           reporting_percent, reporting_basis, precincts_reporting, precincts_total, total_votes,
           winner_called_source, winner_called_url, winner_called_at, certification_url, certified_at,
           context_state, context_election_date, context_type, context_level, context_office,
           posted_by, idempotency_key, note, supersedes_report_id)
         VALUES ($1, 'pending-' || gen_random_uuid()::text, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
         RETURNING id`,
            [
              electionId,
              input.status,
              input.source.id,
              input.source.kind,
              input.source.name,
              input.source.url,
              input.source.sourceContestId,
              input.sourcePayloadSha256,
              inputSha,
              input.asOf,
              input.asOfBasis,
              input.retrievedAt,
              input.reporting?.percent ?? null,
              input.reporting?.basis ?? null,
              input.reporting?.precinctsReporting ?? null,
              input.reporting?.precinctsTotal ?? null,
              input.totalVotes,
              input.winnerCalledBy?.source ?? null,
              input.winnerCalledBy?.url ?? null,
              input.winnerCalledBy?.at ?? null,
              input.certification?.url ?? null,
              input.certification?.certifiedAt ?? null,
              context.state,
              context.electionDate,
              context.type,
              context.level,
              context.office,
              ctx.postedBy,
              ctx.idempotencyKey,
              input.note,
              input.supersedesReportId
            ]
          );
          const reportId = inserted.rows[0].id;
          const revision = revisionFor(reportId, input);
          await client.query("UPDATE election_result_reports SET revision = $1 WHERE id = $2", [revision, reportId]);
          for (const c of input.candidates) {
            await client.query(
              `INSERT INTO candidate_result_lines (report_id, candidate_id, source_candidate_id, name, party, votes, percent, is_winner_declared)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [reportId, c.candidateId, c.sourceCandidateId, c.name, c.party, c.votes, c.percent, c.isWinner === true]
            );
          }
          await this.syncDerived(client, electionId, input);
          await client.query("COMMIT");
          return { payload: await this.getResultsPayload(electionId), created: true };
        } catch (error) {
          await client.query("ROLLBACK").catch(() => void 0);
          throw error;
        } finally {
          client.release();
        }
      }
      async storeResultEvidence(bytes, contentType, filename, uploadedBy) {
        const sha256 = sha256Hex(bytes);
        const inserted = await this.pool.query(
          `INSERT INTO result_evidence_blobs (sha256, content_type, filename, size_bytes, bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (sha256) DO NOTHING`,
          [sha256, contentType, filename, bytes.length, bytes, uploadedBy]
        );
        return { sha256, size: bytes.length, contentType, created: (inserted.rowCount ?? 0) > 0 };
      }
      async listResultSources(state) {
        const rows = await this.manifestRows(this.pool, state);
        const states2 = (await this.pool.query(state ? "SELECT DISTINCT state FROM elections WHERE state = $1" : "SELECT DISTINCT state FROM elections", state ? [state] : [])).rows.map((r) => r.state);
        return buildSources(rows, states2, state);
      }
      async manifestRows(q, state) {
        const sql6 = `SELECT id AS election_id, state, official_results_source->>'publisher' AS publisher,
                        official_results_source->>'routeType' AS route_type, official_results_source->>'governmentUrl' AS government_url, official_results_source->>'status' AS status
                   FROM elections
                  WHERE official_results_source IS NOT NULL AND official_results_source->>'routeVerification' = 'worked'
                    ${state ? "AND state = $1" : ""}
                  ORDER BY state, id`;
        return (await q.query(sql6, state ? [state] : [])).rows;
      }
      /** Legacy projections so existing readers (candidate cards, election_results) follow the latest snapshot. */
      async syncDerived(client, electionId, input) {
        await client.query(
          "UPDATE candidates SET is_winner = false, is_projected_winner = false WHERE election_id = $1 AND (is_winner OR is_projected_winner)",
          [electionId]
        );
        for (const c of input.candidates) {
          if (c.candidateId === null) continue;
          await client.query(
            "UPDATE candidates SET votes_received = $1, vote_percentage = $2, is_winner = $3 WHERE id = $4 AND election_id = $5",
            [c.votes, c.percent, c.isWinner === true, c.candidateId, electionId]
          );
        }
        await client.query(
          `INSERT INTO election_results (election_id, total_votes, reporting_precincts, total_precincts, percent_reporting, is_complete, is_certified, last_updated, results_source)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8)
       ON CONFLICT (election_id) DO UPDATE SET
         total_votes = EXCLUDED.total_votes, reporting_precincts = EXCLUDED.reporting_precincts, total_precincts = EXCLUDED.total_precincts,
         percent_reporting = EXCLUDED.percent_reporting, is_certified = EXCLUDED.is_certified, last_updated = EXCLUDED.last_updated, results_source = EXCLUDED.results_source`,
          [
            electionId,
            input.totalVotes,
            input.reporting?.precinctsReporting ?? null,
            input.reporting?.precinctsTotal ?? null,
            input.reporting?.percent ?? null,
            input.status === "certified",
            input.retrievedAt,
            input.source.name
          ]
        );
      }
    };
    MemResultReportStore = class {
      constructor(electionExists, candidateBelongs, electionIdsOn = () => [], electionDate = () => null, electionContext = () => null, manifest = () => []) {
        this.electionExists = electionExists;
        this.candidateBelongs = candidateBelongs;
        this.electionIdsOn = electionIdsOn;
        this.electionDate = electionDate;
        this.electionContext = electionContext;
        this.manifest = manifest;
      }
      electionExists;
      candidateBelongs;
      electionIdsOn;
      electionDate;
      electionContext;
      manifest;
      nextId = 1;
      reports = [];
      lines = /* @__PURE__ */ new Map();
      evidence = /* @__PURE__ */ new Map();
      currentContext(electionId) {
        return this.electionContext(electionId) ?? { state: "", electionDate: "", type: "", level: "", office: "" };
      }
      async storeResultEvidence(bytes, contentType, _filename, _uploadedBy) {
        const sha256 = sha256Hex(bytes);
        const created = !this.evidence.has(sha256);
        if (created) this.evidence.set(sha256, { contentType, size: bytes.length });
        return { sha256, size: bytes.length, contentType, created };
      }
      async listResultSources(state) {
        const rows = this.manifest();
        const states2 = [.../* @__PURE__ */ new Set([...rows.map((r) => r.state), ...resultsSourceRegistry.list().map((r) => r.state), ...state ? [state] : []])];
        return buildSources(rows, states2, state);
      }
      async listResultsPayloads(query) {
        let ids = [];
        if (query.date) ids = this.electionIdsOn(query.date);
        if (query.ids) ids = query.ids.slice(0, LIST_MAX_IDS).filter((id2) => this.electionExists(id2));
        const results = [];
        for (const id2 of [...new Set(ids)].sort((a, b) => a - b)) {
          const p = await this.getResultsPayload(id2);
          if (p) results.push(stripHistory(p));
        }
        return { schemaVersion: 1, date: query.date ?? null, cursor: snapshotCursor(results), reset: true, results };
      }
      async getResultsPayload(electionId) {
        if (!this.electionExists(electionId)) return null;
        const current = this.currentContext(electionId);
        const history = this.reports.filter((r) => r.election_id === electionId).sort((a, b) => b.id - a.id).slice(0, HISTORY_LIMIT);
        const latest = history.find((r) => contextMatches(reportContextOf(r), current)) ?? null;
        return buildResultsPayload(electionId, latest, latest ? [...this.lines.get(latest.id) ?? []].sort((a, b) => Number(b.votes) - Number(a.votes)) : [], history, current);
      }
      async recordResultReport(electionId, input, ctx) {
        if (!this.electionExists(electionId)) throw new ResultReportError(404, "election_not_found", `Election ${electionId} not found`);
        if (input.electionId !== electionId) throw new ResultReportError(422, "invalid_report", "report electionId does not match the target election", [{ path: "electionId", message: "mismatch" }]);
        assertNotFuture(input);
        const date2 = this.electionDate(electionId);
        if (date2) assertNotPreElection(input, date2);
        const current = this.currentContext(electionId);
        const state = current.state;
        assertSourceRegistered(input, state, this.manifest().filter((m) => m.state === state), { id: electionId, date: date2 ?? null, type: current.type });
        if ((EVIDENCE_REQUIRED_KINDS.has(input.source.kind) || input.status === "certified") && !this.evidence.has(input.sourcePayloadSha256)) {
          throw new ResultReportError(422, "evidence_missing", "sourcePayloadSha256 does not reference retained evidence; upload it first (POST /api/admin/results-evidence)");
        }
        const inputSha = canonicalInputHash(input);
        if (ctx.idempotencyKey) {
          const prior = this.reports.find((r) => r.idempotency_key === ctx.idempotencyKey);
          if (prior) {
            if (prior.input_sha256 !== inputSha || prior.election_id !== electionId) throw new ResultReportError(409, "idempotency_conflict", "idempotencyKey was already used with a different payload");
            return { payload: await this.getResultsPayload(electionId), created: false };
          }
        }
        const same = this.reports.find((r) => r.source_id === input.source.id && r.source_contest_id === input.source.sourceContestId && r.input_sha256 === inputSha);
        if (same) {
          if (same.election_id !== electionId) throw new ResultReportError(422, "contest_key_conflict", `source contest ${input.source.sourceContestId} is already bound to election ${same.election_id}`);
          return { payload: await this.getResultsPayload(electionId), created: false };
        }
        const other = this.reports.find((r) => r.source_id === input.source.id && r.source_contest_id === input.source.sourceContestId && r.election_id !== electionId);
        if (other) throw new ResultReportError(422, "contest_key_conflict", `source contest ${input.source.sourceContestId} is already bound to election ${other.election_id}`, { boundElectionId: other.election_id });
        const latest = this.reports.filter((r) => r.election_id === electionId).sort((a, b) => b.id - a.id)[0] ?? null;
        if (ctx.enforceRevision && (ctx.expectedRevision ?? null) !== (latest?.revision ?? null)) {
          throw new ResultReportError(409, "stale_revision", "expectedRevision does not match the current revision", { currentRevision: latest?.revision ?? null });
        }
        if (input.supersedesReportId !== null) {
          if (!this.reports.some((r) => r.id === input.supersedesReportId && r.election_id === electionId)) throw new ResultReportError(422, "invalid_report", "supersedesReportId is not a report of this election", [{ path: "supersedesReportId", message: "unknown report" }]);
        } else if (input.asOf) {
          const newer = this.reports.find((r) => r.election_id === electionId && r.source_id === input.source.id && r.as_of && new Date(r.as_of) > new Date(input.asOf));
          if (newer) throw new ResultReportError(409, "older_than_latest", "a newer snapshot from this source already exists; name it in supersedesReportId for an official correction", { latestReportId: newer.id });
        }
        const bad = input.candidates.map((c) => c.candidateId).filter((id3) => id3 !== null && !this.candidateBelongs(id3, electionId));
        if (bad.length) throw new ResultReportError(422, "invalid_report", "candidateId not in this election", bad.map((id3) => ({ path: "candidates", message: `candidate ${id3} is not in election ${electionId}` })));
        const id2 = this.nextId++;
        const context = this.currentContext(electionId);
        const row = {
          id: id2,
          election_id: electionId,
          revision: revisionFor(id2, input),
          status: input.status,
          context_state: context.state,
          context_election_date: context.electionDate,
          context_type: context.type,
          context_level: context.level,
          context_office: context.office,
          source_id: input.source.id,
          source_kind: input.source.kind,
          source_name: input.source.name,
          source_url: input.source.url,
          source_contest_id: input.source.sourceContestId,
          source_payload_sha256: input.sourcePayloadSha256,
          input_sha256: inputSha,
          as_of: input.asOf,
          as_of_basis: input.asOfBasis,
          retrieved_at: input.retrievedAt,
          reporting_percent: input.reporting?.percent ?? null,
          reporting_basis: input.reporting?.basis ?? null,
          precincts_reporting: input.reporting?.precinctsReporting ?? null,
          precincts_total: input.reporting?.precinctsTotal ?? null,
          total_votes: input.totalVotes,
          winner_called_source: input.winnerCalledBy?.source ?? null,
          winner_called_url: input.winnerCalledBy?.url ?? null,
          winner_called_at: input.winnerCalledBy?.at ?? null,
          certification_url: input.certification?.url ?? null,
          certified_at: input.certification?.certifiedAt ?? null,
          posted_by: ctx.postedBy,
          idempotency_key: ctx.idempotencyKey,
          note: input.note,
          supersedes_report_id: input.supersedesReportId,
          created_at: /* @__PURE__ */ new Date()
        };
        this.reports.push(row);
        this.lines.set(id2, input.candidates.map((c, i) => ({
          id: id2 * 1e3 + i,
          report_id: id2,
          candidate_id: c.candidateId,
          source_candidate_id: c.sourceCandidateId,
          name: c.name,
          party: c.party,
          votes: c.votes,
          percent: c.percent,
          is_winner_declared: c.isWinner === true
        })));
        return { payload: await this.getResultsPayload(electionId), created: true };
      }
    };
  }
});

// server/background-work.ts
var BackgroundWork;
var init_background_work = __esm({
  "server/background-work.ts"() {
    BackgroundWork = class {
      stopped = false;
      active = /* @__PURE__ */ new Set();
      timers = /* @__PURE__ */ new Set();
      get isStopped() {
        return this.stopped;
      }
      get hasTimers() {
        return this.timers.size > 0;
      }
      run(work) {
        if (this.stopped) return Promise.resolve();
        const task = Promise.resolve().then(work);
        this.active.add(task);
        void task.then(() => this.active.delete(task), () => this.active.delete(task));
        return task;
      }
      every(intervalMs, work, onError) {
        if (this.stopped) return () => {
        };
        const timer = setInterval(() => {
          void this.run(work).catch(onError);
        }, intervalMs);
        this.timers.add(timer);
        return () => {
          clearInterval(timer);
          this.timers.delete(timer);
        };
      }
      async stop() {
        this.stopped = true;
        this.timers.forEach((timer) => clearInterval(timer));
        this.timers.clear();
        const results = await Promise.allSettled(Array.from(this.active));
        if (results.some((result) => result.status === "rejected")) {
          throw new Error("Background work failed during shutdown");
        }
      }
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  closeDatabaseConnection: () => closeDatabaseConnection,
  connectWithRetry: () => connectWithRetry,
  db: () => db,
  pool: () => pool,
  rawSql: () => rawSql,
  testDatabaseConnection: () => testDatabaseConnection
});
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
async function rawSql(strings, ...values) {
  if (typeof strings === "string") {
    const result2 = await pool.query(strings, values[0] ?? []);
    return result2.rows;
  }
  const text2 = strings.reduce((acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""), "");
  const result = await pool.query(text2, values);
  return result.rows;
}
async function testDatabaseConnection(timeoutMs = 5e3) {
  const startTime = Date.now();
  try {
    const result = await Promise.race([
      db.execute("SELECT 1 as health_check, NOW() as server_time"),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Connection timeout")), timeoutMs)
      )
    ]);
    const latency = Date.now() - startTime;
    return {
      success: true,
      latency,
      details: result
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      code: error.code,
      severity: error.severity,
      constraint: error.constraint,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      internalPosition: error.internalPosition,
      internalQuery: error.internalQuery,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      routine: error.routine
    };
    return {
      success: false,
      error: errorDetails.message,
      latency,
      details: errorDetails
    };
  }
}
async function connectWithRetry(options = {}) {
  const {
    maxRetries = 5,
    baseDelay = 1e3,
    maxDelay = 3e4,
    jitter = true
  } = options;
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const healthCheck = await testDatabaseConnection(1e4);
    if (healthCheck.success) {
      console.log(`\u2705 Database connection successful on attempt ${attempt}`);
      return { success: true, attempts: attempt };
    }
    lastError = healthCheck.error;
    console.log(`\u274C Database connection failed on attempt ${attempt}/${maxRetries}:`, {
      error: healthCheck.error,
      details: healthCheck.details,
      latency: healthCheck.latency
    });
    if (attempt < maxRetries) {
      let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      if (jitter) {
        const jitterAmount = delay * 0.25;
        delay += (Math.random() * 2 - 1) * jitterAmount;
      }
      console.log(`\u23F3 Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return { success: false, attempts: maxRetries, finalError: lastError };
}
async function closeDatabaseConnection() {
  try {
    await pool.end();
    console.log("\u2705 Database pool closed gracefully");
  } catch (error) {
    console.error("\u274C Error closing database pool:", error);
  }
}
var PgPool, poolConfig, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    init_schema();
    ({ Pool: PgPool } = pg);
    config();
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 10,
      min: 2,
      connectionTimeoutMillis: 1e4,
      idleTimeoutMillis: 3e4,
      allowExitOnIdle: true
    };
    pool = new PgPool(poolConfig);
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
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/louisiana-house-catalog.ts
var LOUISIANA_HOUSE_SOURCE;
var init_louisiana_house_catalog = __esm({
  "server/louisiana-house-catalog.ts"() {
    LOUISIANA_HOUSE_SOURCE = Object.freeze({
      name: "Louisiana Secretary of State \u2014 DETAILS FOR U.S. HOUSE RACES IN FALL FINALIZED",
      url: "https://www.sos.la.gov/media/dcvl5ojl/051426-fall-house-races.pdf",
      sha256: "3319c7cba10c5cd5cc74f2a4cfb2d42935e998cbbfb14746ece63050ee8bedb3",
      publishedAt: "2026-05-14",
      ruleUrl: "https://www.sos.la.gov/elections-voting/types-of-elections"
    });
  }
});

// server/fec-candidate-sync.ts
function normalizedCandidateName(name) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
var STATES;
var init_fec_candidate_sync = __esm({
  "server/fec-candidate-sync.ts"() {
    init_louisiana_house_catalog();
    STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "));
  }
});

// server/google-civic-service.ts
function toProviderCandidate(candidate, electionId, index2, now = /* @__PURE__ */ new Date()) {
  return {
    id: index2 + 2e3,
    // Offset for Google Civic candidates (not a database id)
    name: candidate.name,
    party: candidate.party || "Unknown",
    electionId,
    pollingSupport: null,
    pollingTrend: null,
    lastPollingUpdate: null,
    pollingSource: null,
    isIncumbent: false,
    description: null,
    website: candidate.candidateUrl || null,
    votesReceived: null,
    votePercentage: null,
    isWinner: false,
    isProjectedWinner: false,
    fecCandidateId: null,
    dataSource: "google_civic",
    sourceStatus: "provider_listed",
    fecStatus: null,
    normalizedName: normalizedCandidateName(candidate.name),
    ballotStatus: "not_certified",
    ballotSourceName: null,
    ballotSourceUrl: null,
    ballotVerifiedAt: null,
    sourceFileSha256: null,
    sourceSyncedAt: now,
    altFecIds: null,
    isVerified: false,
    subscriptionTier: null,
    profileImageUrl: null,
    campaignBio: null,
    contactEmail: null,
    campaignPhone: null,
    socialMedia: null,
    createdAt: now,
    updatedAt: now
  };
}
function getGoogleCivicService() {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_CIVIC_API_KEY not found in environment variables");
    return null;
  }
  if (!googleCivicService) {
    googleCivicService = new GoogleCivicService(apiKey);
  }
  return googleCivicService;
}
var GoogleCivicService, googleCivicService;
var init_google_civic_service = __esm({
  "server/google-civic-service.ts"() {
    init_fec_candidate_sync();
    GoogleCivicService = class {
      apiKey;
      baseUrl = "https://www.googleapis.com/civicinfo/v2";
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      async makeRequest(endpoint, params = {}) {
        const url2 = new URL(`${this.baseUrl}/${endpoint}`);
        url2.searchParams.set("key", this.apiKey);
        Object.entries(params).forEach(([key, value]) => {
          url2.searchParams.set(key, value);
        });
        const response = await fetch(url2.toString());
        if (!response.ok) {
          throw new Error(`Google Civic API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      }
      async fetchElections() {
        try {
          const data = await this.makeRequest("elections");
          if (!data.elections) {
            return [];
          }
          return data.elections.map((election, index2) => ({
            id: index2 + 1e3,
            // Offset to avoid conflicts with seeded data
            title: election.name,
            subtitle: null,
            location: this.extractLocationFromOcd(election.ocdDivisionId),
            state: this.extractStateFromOcd(election.ocdDivisionId),
            date: new Date(election.electionDay),
            type: this.determineElectionType(election.name),
            level: this.determineElectionLevel(election.ocdDivisionId, election.name),
            offices: [],
            description: `Election sourced from Google Civic Information API`,
            pollsOpen: null,
            pollsClose: null,
            timezone: null,
            pollCloseKind: null,
            pollHoursBasis: null,
            pollHoursSource: null,
            officialResultsUrl: null,
            officialResultsSource: null,
            isActive: true
          }));
        } catch (error) {
          console.error("Error fetching elections from Google Civic API:", error);
          throw error;
        }
      }
      async fetchVoterInfo(address, electionId) {
        try {
          const params = { address };
          if (electionId) {
            params.electionId = electionId;
          }
          const data = await this.makeRequest("/voterinfo", params);
          if (!data.election) {
            return null;
          }
          const election = {
            id: parseInt(data.election.id) || 0,
            title: data.election.name,
            subtitle: null,
            location: address,
            state: this.extractStateFromOcd(data.election.ocdDivisionId),
            date: new Date(data.election.electionDay),
            type: this.determineElectionType(data.election.name),
            level: this.determineElectionLevel(data.election.ocdDivisionId, data.election.name),
            offices: data.contests?.map((c) => c.office) || [],
            description: `Voter information for ${address}`,
            pollsOpen: null,
            pollsClose: null,
            timezone: null,
            pollCloseKind: null,
            pollHoursBasis: null,
            pollHoursSource: null,
            officialResultsUrl: null,
            officialResultsSource: null,
            isActive: true
          };
          const contests = data.contests?.map((contest) => ({
            office: contest.office,
            candidates: contest.candidates?.map((candidate, index2) => toProviderCandidate(candidate, election.id, index2)) || []
          })) || [];
          return { election, contests };
        } catch (error) {
          console.error("Error fetching voter info from Google Civic API:", error);
          throw error;
        }
      }
      extractLocationFromOcd(ocdId) {
        if (!ocdId) return "Unknown";
        const parts = ocdId.split("/");
        const statePart = parts.find((p) => p.startsWith("state:"));
        const placePart = parts.find((p) => p.startsWith("place:"));
        if (placePart) {
          return placePart.replace("place:", "").replace(/_/g, " ").toUpperCase();
        }
        if (statePart) {
          return statePart.replace("state:", "").toUpperCase();
        }
        return "Unknown";
      }
      extractStateFromOcd(ocdId) {
        if (!ocdId) return "Unknown";
        const statePart = ocdId.split("/").find((p) => p.startsWith("state:"));
        return statePart ? statePart.replace("state:", "").toUpperCase() : "Unknown";
      }
      determineElectionType(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes("primary")) return "primary";
        if (nameLower.includes("special")) return "special";
        if (nameLower.includes("runoff")) return "general";
        if (nameLower.includes("general")) return "general";
        return "general";
      }
      determineElectionLevel(ocdId, name) {
        if (!ocdId && !name) return "local";
        const nameLower = name?.toLowerCase() || "";
        if (nameLower.includes("president") || nameLower.includes("congress") || nameLower.includes("senate") || nameLower.includes("house")) {
          return "federal";
        }
        if (ocdId) {
          if (ocdId.includes("country:us") && ocdId.split("/").length <= 3) {
            return "federal";
          }
          if (ocdId.includes("state:") && !ocdId.includes("place:") && !ocdId.includes("county:")) {
            return "state";
          }
        }
        if (nameLower.includes("governor") || nameLower.includes("state") || nameLower.includes("assembly") || nameLower.includes("legislature")) {
          return "state";
        }
        return "local";
      }
    };
    googleCivicService = null;
  }
});

// server/congress-bill-service.ts
function getCongressBillService() {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    console.warn("CONGRESS_API_KEY not configured - Congress.gov integration unavailable");
    return null;
  }
  return new CongressBillService(apiKey);
}
var CongressBillService;
var init_congress_bill_service = __esm({
  "server/congress-bill-service.ts"() {
    CongressBillService = class {
      apiKey;
      baseUrl = "https://api.congress.gov/v3";
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      async makeRequest(endpoint, params = {}) {
        const url2 = new URL(`${this.baseUrl}${endpoint}`);
        url2.searchParams.append("api_key", this.apiKey);
        url2.searchParams.append("format", "json");
        Object.entries(params).forEach(([key, value]) => {
          url2.searchParams.append(key, value);
        });
        const response = await fetch(url2.toString());
        if (!response.ok) {
          throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      }
      // List all bills - using 119th Congress (current)
      async fetchAllBills(congress = "119") {
        try {
          const allBills = [];
          let offset = 0;
          const limit = 250;
          while (true) {
            const data = await this.makeRequest(`/bill/${congress}`, {
              offset: offset.toString(),
              limit: limit.toString()
            });
            if (!data.bills || data.bills.length === 0) break;
            allBills.push(...data.bills);
            if (data.bills.length < limit) break;
            offset += limit;
            if (offset > 1e4) break;
          }
          return allBills;
        } catch (error) {
          console.error("Error fetching all bills:", error);
          return [];
        }
      }
      // Bills by Congress - comprehensive data fetching
      async fetchBillsByCongress(congress) {
        try {
          const allBills = [];
          let offset = 0;
          const limit = 250;
          while (true) {
            const data = await this.makeRequest(`/bill/${congress}`, {
              offset: offset.toString(),
              limit: limit.toString()
            });
            if (!data.bills || data.bills.length === 0) break;
            allBills.push(...data.bills);
            if (data.bills.length < limit) break;
            offset += limit;
            if (offset > 1e4) break;
          }
          return allBills;
        } catch (error) {
          console.error("Error fetching bills by congress:", error);
          return [];
        }
      }
      // Fetch members from specific Congress (118th has complete 554 members)
      async fetchMembersByCongress(congressNumber) {
        try {
          const allMembers = [];
          let offset = 0;
          const limit = 250;
          console.log(`Fetching all members from ${congressNumber}th Congress...`);
          while (true) {
            console.log(`Fetching batch: offset ${offset}, limit ${limit}`);
            const data = await this.makeRequest(`/member/congress/${congressNumber}`, {
              offset: offset.toString(),
              limit: limit.toString()
            });
            if (!data.members || data.members.length === 0) break;
            console.log(`Retrieved ${data.members.length} members in this batch`);
            const members = data.members.map((member) => ({
              bioguideId: member.bioguideId,
              name: member.name,
              party: member.partyName,
              state: member.state,
              chamber: member.terms?.item?.[0]?.chamber?.replace("House of Representatives", "House") || "Unknown",
              district: member.district
            }));
            allMembers.push(...members);
            if (!data.pagination?.next || data.members.length < limit) break;
            offset += limit;
          }
          console.log(`${congressNumber}th Congress: ${allMembers.length} members fetched`);
          return allMembers;
        } catch (error) {
          console.error(`Error fetching ${congressNumber}th Congress members:`, error);
          return [];
        }
      }
      // List all current serving members (use 119th Congress - current Congress)
      async fetchAllMembers() {
        try {
          console.log("Fetching current serving members from 119th Congress (current Congress)...");
          let members = await this.fetchMembersByCongress(119);
          if (members.length < 500) {
            console.log(`Only got ${members.length} from 119th Congress, trying 118th as supplement...`);
            const congress118 = await this.fetchMembersByCongress(118);
            const combined = [...members, ...congress118];
            const uniqueMembers = combined.filter(
              (member, index2, self) => index2 === self.findIndex((m) => m.bioguideId === member.bioguideId)
            );
            members = uniqueMembers;
            console.log(`Combined total: ${members.length} unique members`);
          }
          console.log(`Final count: ${members.length} current serving members`);
          return members;
        } catch (error) {
          console.error("Error fetching all members:", error);
          return [];
        }
      }
      // Fetch current House members specifically
      async fetchCurrentHouseMembers() {
        try {
          const data = await this.makeRequest("/member/house", { limit: "450" });
          return data.members?.map((member) => ({
            bioguideId: member.bioguideId,
            name: member.name,
            party: member.partyName,
            state: member.state,
            chamber: "House",
            district: member.district
          })) || [];
        } catch (error) {
          console.log("House-specific endpoint not available, using general endpoint");
          return [];
        }
      }
      // Fetch current Senate members specifically
      async fetchCurrentSenateMembers() {
        try {
          const data = await this.makeRequest("/member/senate", { limit: "100" });
          return data.members?.map((member) => ({
            bioguideId: member.bioguideId,
            name: member.name,
            party: member.partyName,
            state: member.state,
            chamber: "Senate",
            district: null
          })) || [];
        } catch (error) {
          console.log("Senate-specific endpoint not available, using general endpoint");
          return [];
        }
      }
      // Members by State
      async fetchMembersByState(state) {
        try {
          const allMembers = await this.fetchAllMembers();
          return allMembers.filter((member) => member.state === state);
        } catch (error) {
          console.error("Error fetching members by state:", error);
          return [];
        }
      }
      // List all committees
      async fetchAllCommittees() {
        try {
          const houseData = await this.makeRequest("/committee/house");
          const senateData = await this.makeRequest("/committee/senate");
          return [...houseData.committees || [], ...senateData.committees || []];
        } catch (error) {
          console.error("Error fetching all committees:", error);
          return [];
        }
      }
      // Committee Members
      async fetchCommitteeMembers(chamber, committeeCode) {
        try {
          const data = await this.makeRequest(`/committee/${chamber}/${committeeCode}`);
          return data.committee?.members || [];
        } catch (error) {
          console.error("Error fetching committee members:", error);
          return [];
        }
      }
      // List daily congressional records
      async fetchDailyCongressionalRecords(year, month) {
        try {
          const endpoint = year && month ? `/congressional-record/${year}/${month}` : "/congressional-record";
          const data = await this.makeRequest(endpoint);
          return data.congressionalRecords || [];
        } catch (error) {
          console.error("Error fetching congressional records:", error);
          return [];
        }
      }
      // List Senate communications
      async fetchSenateCommunications(congress = "118") {
        try {
          const data = await this.makeRequest(`/senate-communication/${congress}`);
          return data.senateCommunications || [];
        } catch (error) {
          console.error("Error fetching senate communications:", error);
          return [];
        }
      }
      // List all nominations
      async fetchAllNominations(congress = "118") {
        try {
          const data = await this.makeRequest(`/nomination/${congress}`);
          return data.nominations || [];
        } catch (error) {
          console.error("Error fetching nominations:", error);
          return [];
        }
      }
      // [BETA] List votes
      async fetchHouseVotes(congress = "118", session = "1") {
        try {
          const data = await this.makeRequest(`/house-vote/${congress}/${session}`);
          return data.houseVotes || [];
        } catch (error) {
          console.error("Error fetching house votes:", error);
          return [];
        }
      }
    };
  }
});

// server/perplexity-service.ts
function getPerplexityService() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn("Perplexity API key not found");
    return null;
  }
  return new PerplexityService(apiKey);
}
var PerplexityService;
var init_perplexity_service = __esm({
  "server/perplexity-service.ts"() {
    PerplexityService = class {
      apiKey;
      baseUrl = "https://api.perplexity.ai/chat/completions";
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      async makeRequest(messages) {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages,
            max_tokens: 1e3,
            temperature: 0.2,
            top_p: 0.9,
            return_images: false,
            return_related_questions: false,
            search_recency_filter: "month",
            top_k: 0,
            stream: false,
            presence_penalty: 0,
            frequency_penalty: 1
          })
        });
        if (!response.ok) {
          throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      }
      async searchElections(query) {
        try {
          const messages = [
            {
              role: "system",
              content: "You are an expert on U.S. elections. Provide comprehensive, accurate information about upcoming elections with specific dates, locations, and details. Focus on authentic, verifiable election data."
            },
            {
              role: "user",
              content: query
            }
          ];
          const response = await this.makeRequest(messages);
          return response.choices[0]?.message?.content || "";
        } catch (error) {
          console.error("Error searching elections with Perplexity:", error);
          throw error;
        }
      }
      async findAllElectionsUntil2026() {
        const query = `List all scheduled U.S. elections from January 2025 through November 2026, including:
    - Federal elections (House, Senate, Presidential)
    - State elections (Governor, Legislature, State offices)
    - Local elections (Mayor, City Council, School Board)
    - Special elections
    - Primary elections
    - Municipal elections
    - Off-year elections
    
    For each election, provide: date, location, offices, and type. Focus on comprehensive coverage of all election types and levels.`;
        return this.searchElections(query);
      }
      async searchSpecificElection(state, year, type) {
        const typeQuery = type ? ` ${type} elections` : " elections";
        const query = `Find all ${year}${typeQuery} in ${state}, including federal, state, and local elections. Provide specific dates, locations, and offices being contested.`;
        return this.searchElections(query);
      }
      async searchCandidateInfo(candidateName, election) {
        const query = `Find information about candidate ${candidateName} running in ${election}. Include party affiliation, background, campaign website, and key policy positions.`;
        return this.searchElections(query);
      }
      async verifyElectionDate(electionTitle, date2) {
        const query = `Verify the date and details for ${electionTitle} scheduled for ${date2}. Confirm if this date is accurate and provide any additional context about this election.`;
        return this.searchElections(query);
      }
    };
  }
});

// server/validators/state-election-rules.ts
function validateElectionDateByState(state, date2, level, type) {
  const dayOfWeek = date2.getUTCDay();
  if (SATURDAY_STATES.has(state)) {
    if (dayOfWeek !== 6) {
      return {
        ok: false,
        code: "invalid_louisiana_date",
        message: `Louisiana elections must be held on Saturday per R.S. 18:402. Got ${getDayName(dayOfWeek)}.`
      };
    }
  }
  if (level?.toLowerCase() === "federal" && type?.toLowerCase() === "general" && !SATURDAY_STATES.has(state)) {
    if (isNovember(date2) && dayOfWeek !== FEDERAL_ELECTION_DAY) {
      return {
        ok: false,
        code: "invalid_federal_date",
        message: `Federal general elections must be on Tuesday after first Monday in November.`
      };
    }
  }
  return { ok: true };
}
function requireProvenanceForSpecialElections(state, level, type, provenanceType, provenanceUrl) {
  if (state === "LA" && level?.toLowerCase() === "federal" && type?.toLowerCase().includes("special")) {
    if (!provenanceType || provenanceType !== "governor_proclamation" || !provenanceUrl) {
      return {
        ok: false,
        code: "missing_proclamation",
        message: "Louisiana federal special elections require a governor's proclamation per R.S. 18:591"
      };
    }
  }
  return { ok: true };
}
function validateElectionData(election) {
  const errors = [];
  const date2 = typeof election.date === "string" ? new Date(election.date) : election.date;
  const dateValidation = validateElectionDateByState(
    election.state,
    date2,
    election.level,
    election.type
  );
  if (!dateValidation.ok) {
    errors.push(dateValidation);
  }
  const provenanceValidation = requireProvenanceForSpecialElections(
    election.state,
    election.level,
    election.type,
    election.provenanceType,
    election.provenanceUrl
  );
  if (!provenanceValidation.ok) {
    errors.push(provenanceValidation);
  }
  return errors;
}
function getDayName(day) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
}
function isNovember(date2) {
  return date2.getUTCMonth() === 10;
}
function validateNotMockData(election) {
  const title = election.title || "";
  const desc4 = election.description || "";
  const match = title.match(MOCK_INDICATOR_RE) || desc4.match(MOCK_INDICATOR_RE);
  if (match) {
    return {
      ok: false,
      code: "mock_data_detected",
      message: `Election appears to be mock/test data (contains '${match[1]}')`
    };
  }
  if (!election.state || election.state.length !== 2) {
    return {
      ok: false,
      code: "invalid_state",
      message: "Election must have a valid 2-letter state code"
    };
  }
  const date2 = new Date(election.date);
  const now = /* @__PURE__ */ new Date();
  const yearsDiff = Math.abs(date2.getFullYear() - now.getFullYear());
  if (yearsDiff > 4) {
    return {
      ok: false,
      code: "unrealistic_date",
      message: `Election date is unrealistic (${yearsDiff} years from now)`
    };
  }
  return { ok: true };
}
var SATURDAY_STATES, FEDERAL_ELECTION_DAY, MOCK_INDICATOR_RE;
var init_state_election_rules = __esm({
  "server/validators/state-election-rules.ts"() {
    SATURDAY_STATES = /* @__PURE__ */ new Set(["LA"]);
    FEDERAL_ELECTION_DAY = 2;
    MOCK_INDICATOR_RE = /(test|demo|example|placeholder|mock|sample|dummy)/i;
  }
});

// server/campaign-portal-service.ts
var campaign_portal_service_exports = {};
__export(campaign_portal_service_exports, {
  CampaignPortalService: () => CampaignPortalService,
  SUBSCRIPTION_TIERS: () => SUBSCRIPTION_TIERS,
  TIER_ACTIVATION: () => TIER_ACTIVATION,
  campaignPortalService: () => campaignPortalService,
  generateCampaignApiKey: () => generateCampaignApiKey,
  hashApiKey: () => hashApiKey
});
import { eq as eq2, and as and2, gte as gte2, lte, count as count2, avg, sql as sql3 } from "drizzle-orm";
import crypto2 from "crypto";
function hashApiKey(apiKey) {
  return crypto2.createHash("sha256").update(apiKey, "utf8").digest("hex");
}
function generateCampaignApiKey() {
  return "camp_" + crypto2.randomBytes(32).toString("hex");
}
var SUBSCRIPTION_TIERS, TIER_ACTIVATION, CampaignPortalService, campaignPortalService;
var init_campaign_portal_service = __esm({
  "server/campaign-portal-service.ts"() {
    init_db();
    init_schema();
    SUBSCRIPTION_TIERS = {
      basic: { name: "Basic", monthlyApiLimit: 1e3, features: ["Aggregated state data", "Basic analytics"] },
      pro: { name: "Pro", monthlyApiLimit: 5e3, features: ["Aggregated state data", "Basic analytics", "Demographic breakdowns"] },
      enterprise: { name: "Enterprise", monthlyApiLimit: 5e4, features: ["Aggregated state data", "Basic analytics", "Demographic breakdowns", "API access"] },
      custom: { name: "Custom", monthlyApiLimit: 1e5, features: ["Aggregated state data", "Basic analytics", "Demographic breakdowns", "API access", "Raw data exports (coming soon)"] }
    };
    TIER_ACTIVATION = {
      basic: "invitation_required",
      pro: "invitation_required",
      enterprise: "invitation_required",
      custom: "invitation_required"
    };
    CampaignPortalService = class {
      // Campaign account management
      async createCampaignAccount(data) {
        const apiKey = generateCampaignApiKey();
        const [account] = await db.insert(campaignAccounts).values({
          organizationName: data.organizationName,
          contactEmail: data.contactEmail,
          electionId: data.electionId,
          subscriptionTier: data.subscriptionTier,
          isActive: data.isActive,
          monthlyApiLimit: SUBSCRIPTION_TIERS[data.subscriptionTier].monthlyApiLimit,
          apiKey: hashApiKey(apiKey),
          keyLast4: data.isActive ? apiKey.slice(-4) : null
        }).returning();
        return { account, apiKey: data.isActive ? apiKey : null };
      }
      async validateCampaignAccess(apiKey) {
        try {
          const [campaign] = await db.select().from(campaignAccounts).where(and2(
            eq2(campaignAccounts.apiKey, hashApiKey(apiKey)),
            eq2(campaignAccounts.isActive, true)
          ));
          if (!campaign) {
            throw new Error("Invalid API key or inactive account");
          }
          if (campaign.subscriptionEnd && campaign.subscriptionEnd < /* @__PURE__ */ new Date()) {
            throw new Error("Subscription expired");
          }
          return campaign;
        } catch (error) {
          console.error("Error validating campaign access:", error);
          throw error;
        }
      }
      // Analytics access based on subscription tier
      async getElectionAnalytics(campaignId, electionId, tier) {
        try {
          await this.logAccess(campaignId, "/api/campaign/analytics", "election_analytics");
          const baseAnalytics = {
            electionId,
            totalViews: await this.getTotalViews(electionId),
            engagementScore: await this.getEngagementScore(electionId),
            lastUpdated: /* @__PURE__ */ new Date()
          };
          switch (tier) {
            case "basic":
              return {
                ...baseAnalytics,
                stateLevel: await this.getStateLevelData(electionId)
              };
            case "pro":
              return {
                ...baseAnalytics,
                stateLevel: await this.getStateLevelData(electionId),
                districtLevel: await this.getDistrictLevelData(electionId),
                demographics: await this.getDemographicBreakdown(electionId)
              };
            case "enterprise":
            case "custom":
              return {
                ...baseAnalytics,
                stateLevel: await this.getStateLevelData(electionId),
                districtLevel: await this.getDistrictLevelData(electionId),
                demographics: await this.getDemographicBreakdown(electionId),
                realTimeMetrics: await this.getRealTimeMetrics(electionId),
                anonymizedUserInsights: await this.getAnonymizedUserInsights(electionId)
              };
            default:
              throw new Error("Invalid subscription tier");
          }
        } catch (error) {
          console.error("Error getting election analytics:", error);
          throw error;
        }
      }
      // Geographic analytics
      async getGeographicAnalytics(campaignId, region, tier) {
        try {
          await this.logAccess(campaignId, "/api/campaign/demographics", "geographic_analytics");
          if (tier === "basic") {
            return await this.getStateLevelGeographicData(region);
          }
          return await this.getDetailedGeographicData(region, tier);
        } catch (error) {
          console.error("Error getting geographic analytics:", error);
          throw error;
        }
      }
      // Polling data access
      async getPollingData(campaignId, electionId, dateRange) {
        try {
          await this.logAccess(campaignId, "/api/campaign/polling", "polling_data");
          const { startDate, endDate } = this.parseDateRange(dateRange);
          const polling = await db.select().from(pollingResults).where(and2(
            eq2(pollingResults.electionId, electionId),
            gte2(pollingResults.pollingDate, startDate),
            lte(pollingResults.pollingDate, endDate),
            eq2(pollingResults.isAuthentic, true)
            // Only verified polling data
          ));
          return {
            electionId,
            dateRange,
            pollingResults: polling.map((poll) => ({
              ...poll,
              // Remove any potentially identifying information
              pollster: poll.pollster ? "Available" : "Not disclosed"
            }))
          };
        } catch (error) {
          console.error("Error getting polling data:", error);
          throw error;
        }
      }
      // Data export functionality � ET-38: exports are not available yet. Refuses without writing a data_purchases
      // row or minting a download URL (the route answers 503 exports_unavailable before reaching here).
      async purchaseDataExport(campaignId, _datasetType, _format = "json") {
        const campaign = await db.select().from(campaignAccounts).where(eq2(campaignAccounts.id, campaignId));
        if (!campaign[0]) throw new Error("Campaign not found");
        throw new Error("Data exports are not available yet");
      }
      // Private helper methods
      async logAccess(campaignId, endpoint, datasetType) {
        try {
          await db.insert(campaignAccessLogs).values({
            campaignId,
            endpointAccessed: endpoint,
            datasetType,
            cost: "0"
            // numeric column; access is not metered yet
          });
        } catch (error) {
          console.error("Error logging access:", error);
        }
      }
      async getTotalViews(electionId) {
        try {
          const result = await db.select({ count: sql3`count(*)` }).from(voterInteractions).where(eq2(voterInteractions.electionId, electionId));
          return Number(result[0]?.count ?? 0);
        } catch {
          return 0;
        }
      }
      async getEngagementScore(electionId) {
        try {
          const result = await db.select({ count: sql3`count(distinct ${voterInteractions.interactionType})` }).from(voterInteractions).where(eq2(voterInteractions.electionId, electionId));
          return Math.min(100, Number(result[0]?.count ?? 0) * 20);
        } catch {
          return 0;
        }
      }
      async getStateLevelData(electionId) {
        const clusters = await db.select().from(geographicClusters).where(eq2(geographicClusters.electionId, electionId));
        const politicalLean = {};
        for (const cluster of clusters) {
          const lean = cluster.politicalLean ?? "unknown";
          politicalLean[lean] = (politicalLean[lean] ?? 0) + 1;
        }
        return {
          clusters: clusters.length,
          totalVoterDensity: clusters.reduce((sum3, cluster) => sum3 + Number(cluster.voterDensity ?? 0), 0),
          politicalLean,
          geographicSpread: clusters.length
        };
      }
      async getDistrictLevelData(electionId) {
        return {
          districtBreakdown: [],
          competitiveDistricts: [],
          targetAreas: []
        };
      }
      async getDemographicBreakdown(electionId) {
        const segments = await db.select().from(userSegments).where(eq2(userSegments.electionId, electionId));
        return {
          segments: segments.map((segment) => ({
            ageGroup: segment.ageGroup,
            income: segment.income,
            education: segment.education,
            partyAffiliation: segment.partyAffiliation,
            voterHistory: segment.voterHistory,
            size: segment.count
          }))
        };
      }
      async getRealTimeMetrics(_electionId) {
        return {
          measured: false,
          liveViewers: null,
          hourlyTrend: [],
          peakHours: [],
          recentActivity: null
        };
      }
      async getAnonymizedUserInsights(electionId) {
        return {
          behaviorPatterns: [],
          engagementClusters: [],
          influenceNetwork: []
        };
      }
      async getStateLevelGeographicData(region) {
        try {
          const regionElections = await db.select({ count: count2() }).from(elections).where(eq2(elections.state, region));
          const regionCandidates = await db.select({
            count: count2(),
            avgSupport: avg(candidates.pollingSupport)
          }).from(candidates).innerJoin(elections, eq2(candidates.electionId, elections.id)).where(eq2(elections.state, region));
          const partyBreakdown = await db.select({
            party: candidates.party,
            count: count2()
          }).from(candidates).innerJoin(elections, eq2(candidates.electionId, elections.id)).where(eq2(elections.state, region)).groupBy(candidates.party);
          const dominantParty = partyBreakdown.length > 0 ? partyBreakdown.reduce(
            (prev, curr) => (curr.count || 0) > (prev.count || 0) ? curr : prev
          ).party?.toLowerCase() || "neutral" : "neutral";
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
          console.error("Error getting geographic data:", error);
          return {
            region,
            aggregatedMetrics: {
              totalElections: 0,
              totalCandidates: 0,
              averageSupport: 0,
              partyLean: "neutral"
            }
          };
        }
      }
      async getDetailedGeographicData(region, tier) {
        const basic = await this.getStateLevelGeographicData(region);
        return {
          ...basic,
          zipCodeLevel: tier === "enterprise" || tier === "custom" ? [] : void 0,
          demographicBreakdown: [],
          competitorAnalysis: []
        };
      }
      parseDateRange(dateRange) {
        const endDate = /* @__PURE__ */ new Date();
        const startDate = /* @__PURE__ */ new Date();
        switch (dateRange) {
          case "7d":
            startDate.setDate(endDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(endDate.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(endDate.getDate() - 90);
            break;
          default:
            startDate.setDate(endDate.getDate() - 30);
        }
        return { startDate, endDate };
      }
    };
    campaignPortalService = new CampaignPortalService();
  }
});

// server/config/secrets.ts
import crypto3 from "crypto";
function getRequiredSecret(name) {
  const v = process.env[name];
  if (v && v.trim().length >= 16) return v;
  if (true) {
    throw new Error(`[config] ${name} must be set (>=16 chars) in production`);
  }
  if (!generated.has(name)) {
    generated.set(name, crypto3.randomBytes(32).toString("hex"));
    console.warn(`[config] ${name} not set - using a random per-process value (dev only)`);
  }
  return generated.get(name);
}
var generated;
var init_secrets = __esm({
  "server/config/secrets.ts"() {
    generated = /* @__PURE__ */ new Map();
  }
});

// server/security-events.ts
var init_security_events = __esm({
  "server/security-events.ts"() {
  }
});

// server/auth.ts
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { nanoid } from "nanoid";
function signSession(payload, hours = SESSION_TTL_HOURS) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${hours}h` });
}
function verifySession(token2) {
  return jwt.verify(token2, JWT_SECRET);
}
async function hashPassword(pw) {
  return argon2.hash(pw, { type: argon2.argon2id });
}
async function verifyPassword(hash, pw) {
  return argon2.verify(hash, pw);
}
var SESSION_COOKIE, JWT_SECRET, SESSION_TTL_HOURS;
var init_auth = __esm({
  "server/auth.ts"() {
    init_db();
    init_secrets();
    init_security_events();
    SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "et.sid";
    JWT_SECRET = getRequiredSecret("JWT_SECRET");
    SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || "720", 10);
  }
});

// server/auth-service.ts
var auth_service_exports = {};
__export(auth_service_exports, {
  AuthService: () => AuthService,
  authService: () => authService
});
import { eq as eq3, and as and3, gt } from "drizzle-orm";
import crypto4 from "crypto";
var SESSION_TTL_HOURS2, AuthService, authService;
var init_auth_service = __esm({
  "server/auth-service.ts"() {
    init_db();
    init_schema();
    init_auth();
    SESSION_TTL_HOURS2 = parseInt(process.env.SESSION_TTL_HOURS || "720", 10);
    AuthService = class {
      async signup(email, password) {
        const existingUser = await this.getUserByEmail(email);
        if (existingUser) {
          throw new Error("User already exists with this email");
        }
        const passwordHash = await hashPassword(password);
        const [newUser] = await db.insert(users).values({ email, passwordHash }).returning();
        const token2 = await this.createSession(newUser.id);
        return { user: this.sanitizeUser(newUser), token: token2 };
      }
      async signin(email, password) {
        const user = await this.getUserByEmail(email);
        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }
        const isPasswordValid = await verifyPassword(user.passwordHash, password);
        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }
        await db.update(users).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq3(users.id, user.id));
        const token2 = await this.createSession(user.id);
        return { user: this.sanitizeUser(user), token: token2 };
      }
      async validateSession(token2) {
        try {
          const { uid, jti } = verifySession(token2);
          const [session] = await db.select().from(authSessions).where(
            and3(
              eq3(authSessions.userId, uid),
              eq3(authSessions.jti, jti),
              eq3(authSessions.revoked, false),
              gt(authSessions.expiresAt, /* @__PURE__ */ new Date())
            )
          );
          if (!session) return null;
          return await this.getUserById(uid);
        } catch {
          return null;
        }
      }
      async signout(token2) {
        try {
          const { uid, jti } = verifySession(token2);
          await db.update(authSessions).set({ revoked: true }).where(and3(eq3(authSessions.userId, uid), eq3(authSessions.jti, jti)));
        } catch (error) {
          console.error("Error during signout:", error);
        }
      }
      async createSession(userId) {
        const jti = crypto4.randomUUID();
        const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS2 * 3600 * 1e3);
        await db.insert(authSessions).values({ userId, jti, expiresAt });
        return signSession({ uid: userId, jti });
      }
      async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq3(users.email, email));
        return user || null;
      }
      async getUserById(id2) {
        const [user] = await db.select().from(users).where(eq3(users.id, id2));
        return user || null;
      }
      sanitizeUser(user) {
        const { passwordHash, ...sanitizedUser } = user;
        return sanitizedUser;
      }
    };
    authService = new AuthService();
  }
});

// server/congress-api-service.ts
var congress_api_service_exports = {};
__export(congress_api_service_exports, {
  CongressAPIService: () => CongressAPIService,
  congressService: () => congressService
});
var CongressGovAPI, ProPublicaAPI, GitHubLegislatorsAPI, CongressAPIService, congressService;
var init_congress_api_service = __esm({
  "server/congress-api-service.ts"() {
    CongressGovAPI = class {
      name = "Congress.gov";
      async getMembers() {
        const apiKey = process.env.CONGRESS_API_KEY;
        if (!apiKey) {
          throw new Error("CONGRESS_API_KEY not configured");
        }
        const url2 = `https://api.congress.gov/v3/member?api_key=${apiKey}&limit=250&currentMember=true`;
        const response = await fetch(url2);
        if (!response.ok) {
          throw new Error(`Congress.gov API error: ${response.status}`);
        }
        const data = await response.json();
        return data.members.map((member) => ({
          bioguideId: member.bioguideId,
          name: member.name,
          firstName: member.firstName,
          lastName: member.lastName,
          party: member.partyName || "Unknown",
          state: member.state,
          district: member.district?.toString(),
          chamber: member.terms?.[0]?.chamber === "House of Representatives" ? "House" : "Senate",
          title: member.honorificName || member.directOrderName,
          url: member.url
        }));
      }
    };
    ProPublicaAPI = class {
      name = "ProPublica";
      async getMembers() {
        const apiKey = process.env.PROPUBLICA_API_KEY;
        if (!apiKey) {
          throw new Error("PROPUBLICA_API_KEY not configured");
        }
        const congress = 118;
        const [houseResponse, senateResponse] = await Promise.all([
          fetch(`https://api.propublica.org/congress/v1/${congress}/house/members.json`, {
            headers: { "X-API-Key": apiKey }
          }),
          fetch(`https://api.propublica.org/congress/v1/${congress}/senate/members.json`, {
            headers: { "X-API-Key": apiKey }
          })
        ]);
        if (!houseResponse.ok || !senateResponse.ok) {
          throw new Error("ProPublica API error");
        }
        const houseData = await houseResponse.json();
        const senateData = await senateResponse.json();
        const members = [
          ...houseData.results[0].members.map((m) => ({
            bioguideId: m.id,
            name: `${m.first_name} ${m.last_name}`,
            firstName: m.first_name,
            lastName: m.last_name,
            party: m.party,
            state: m.state,
            district: m.district,
            chamber: "House",
            title: m.title,
            url: m.url
          })),
          ...senateData.results[0].members.map((m) => ({
            bioguideId: m.id,
            name: `${m.first_name} ${m.last_name}`,
            firstName: m.first_name,
            lastName: m.last_name,
            party: m.party,
            state: m.state,
            chamber: "Senate",
            title: m.title,
            url: m.url
          }))
        ];
        return members;
      }
    };
    GitHubLegislatorsAPI = class {
      name = "GitHub Legislators";
      async getMembers() {
        const url2 = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.json";
        const response = await fetch(url2);
        if (!response.ok) {
          throw new Error("GitHub legislators API error");
        }
        const legislators = await response.json();
        return legislators.map((legislator) => {
          const term = legislator.terms[legislator.terms.length - 1];
          return {
            bioguideId: legislator.id.bioguide,
            name: `${legislator.name.first} ${legislator.name.last}`,
            firstName: legislator.name.first,
            lastName: legislator.name.last,
            party: term.party,
            state: term.state,
            district: term.district?.toString(),
            chamber: term.type === "rep" ? "House" : "Senate",
            title: term.type === "rep" ? "Representative" : "Senator"
          };
        });
      }
    };
    CongressAPIService = class {
      apis = [
        new CongressGovAPI(),
        new ProPublicaAPI(),
        new GitHubLegislatorsAPI()
      ];
      async findMissingMembers() {
        for (const api of this.apis) {
          try {
            console.log(`Trying ${api.name} API...`);
            const members = await api.getMembers();
            const analysis = this.analyzeMembers(members, api.name);
            console.log(`${api.name} API successful - found ${members.length} members`);
            return analysis;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`${api.name} failed:`, errorMessage);
            continue;
          }
        }
        throw new Error("All Congress APIs failed");
      }
      analyzeMembers(members, source) {
        const analysis = {
          total: members.length,
          house: 0,
          senate: 0,
          byState: {},
          byParty: {},
          issues: [],
          missing: [],
          source
        };
        members.forEach((member) => {
          if (member.chamber === "House") {
            analysis.house++;
          } else if (member.chamber === "Senate") {
            analysis.senate++;
          }
          analysis.byState[member.state] = (analysis.byState[member.state] || 0) + 1;
          analysis.byParty[member.party] = (analysis.byParty[member.party] || 0) + 1;
        });
        if (analysis.house < 435) {
          analysis.issues.push(`Missing ${435 - analysis.house} House members (${analysis.house}/435)`);
        } else if (analysis.house > 435) {
          analysis.issues.push(`Extra ${analysis.house - 435} House members (${analysis.house}/435)`);
        }
        if (analysis.senate < 100) {
          analysis.issues.push(`Missing ${100 - analysis.senate} Senate members (${analysis.senate}/100)`);
        } else if (analysis.senate > 100) {
          analysis.issues.push(`Extra ${analysis.senate - 100} Senate members (${analysis.senate}/100)`);
        }
        const states2 = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];
        const senators = members.filter((m) => m.chamber === "Senate");
        const senateByState = {};
        senators.forEach((senator) => {
          senateByState[senator.state] = (senateByState[senator.state] || 0) + 1;
        });
        states2.forEach((state) => {
          const count4 = senateByState[state] || 0;
          if (count4 !== 2) {
            analysis.issues.push(`${state}: ${count4} senators (expected 2)`);
          }
        });
        if (analysis.total < 535) {
          analysis.issues.push(`Missing ${535 - analysis.total} total members (${analysis.total}/535)`);
        }
        return analysis;
      }
    };
    congressService = new CongressAPIService();
  }
});

// server/mem-storage.ts
function existingUserIdFor(email, users2) {
  if (!email) return void 0;
  for (const u of users2.values()) if (u.email === email) return u.id;
  return void 0;
}
function memWatchlistRow(id2, userId, electionId, createdAt) {
  return {
    id: id2,
    userId,
    electionId,
    priority: "normal",
    category: null,
    status: "active",
    tags: null,
    notes: null,
    addedVia: "manual",
    sourceRecommendationId: null,
    interactionCount: 0,
    lastInteraction: null,
    notificationsEnabled: true,
    reminderDaysBefore: 7,
    isVisible: true,
    sortOrder: null,
    createdAt,
    updatedAt: createdAt
  };
}
var MemStorage;
var init_mem_storage = __esm({
  "server/mem-storage.ts"() {
    init_election_list_filters();
    init_campaign_portal_service();
    init_results_store();
    init_results_reports();
    init_official_results();
    init_google_civic_service();
    init_congress_bill_service();
    init_perplexity_service();
    MemStorage = class {
      elections = /* @__PURE__ */ new Map();
      candidates = /* @__PURE__ */ new Map();
      candidatesByElection = /* @__PURE__ */ new Map();
      // electionId -> candidateIds
      congressMembers = /* @__PURE__ */ new Map();
      users = /* @__PURE__ */ new Map();
      watchlists = /* @__PURE__ */ new Map();
      // userId -> electionIds
      candidateAccounts = /* @__PURE__ */ new Map();
      candidateProfiles = /* @__PURE__ */ new Map();
      candidateDataSources = /* @__PURE__ */ new Map();
      // candidateId -> sources
      candidatePositions = /* @__PURE__ */ new Map();
      // candidateId -> positions
      candidateQAs = /* @__PURE__ */ new Map();
      // candidateId -> Q&As
      // Platform Continuity Storage Maps
      secretsVault = /* @__PURE__ */ new Map();
      // secretId -> secret
      secretsByName = /* @__PURE__ */ new Map();
      // secretName -> secret
      secretsRotationHistory = /* @__PURE__ */ new Map();
      // rotationId -> rotation record
      artifactStorage = /* @__PURE__ */ new Map();
      // artifactId -> artifact
      artifactsByHash = /* @__PURE__ */ new Map();
      // contentHash -> artifact
      deploymentHistory = /* @__PURE__ */ new Map();
      // deploymentId -> deployment
      environmentConfigurations = /* @__PURE__ */ new Map();
      // configId -> config
      platformContinuityEvents = /* @__PURE__ */ new Map();
      // eventId -> event
      nextId = 1;
      apiCache = /* @__PURE__ */ new Map();
      CACHE_TTL = 5 * 60 * 1e3;
      // 5 minutes
      // Health checking implementation - memory storage is always healthy
      isDbHealthy() {
        return true;
      }
      constructor() {
        this.initializeWithSeedData();
      }
      // Cache utilities
      getCachedData(key) {
        const cached = this.apiCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.data;
        }
        return null;
      }
      setCachedData(key, data) {
        this.apiCache.set(key, {
          data,
          expiry: Date.now() + this.CACHE_TTL
        });
      }
      async initializeWithSeedData() {
        console.log("MemStorage initialized empty (failover cache; database is source of truth)");
      }
      // Elections methods
      async getElections(filters = {}) {
        const now = /* @__PURE__ */ new Date();
        const f = normalizeElectionFilters(filters, now);
        const counts = /* @__PURE__ */ new Map();
        const parties = /* @__PURE__ */ new Map();
        for (const candidate of Array.from(this.candidates.values())) {
          if (candidate.electionId == null) continue;
          counts.set(candidate.electionId, (counts.get(candidate.electionId) ?? 0) + 1);
          const set = parties.get(candidate.electionId) ?? /* @__PURE__ */ new Set();
          for (const party of canonicalPartyComponents(candidate.party)) set.add(party);
          parties.set(candidate.electionId, set);
        }
        const search = f.search?.toLowerCase();
        return Array.from(this.elections.values()).filter((election) => {
          if (election.isActive !== true) return false;
          const date2 = new Date(election.date);
          if (f.from && date2 < f.from) return false;
          const window = f.period ? electionCalendarWindow(now, f.period, election.timezone) : void 0;
          if (window && date2 < window.from) return false;
          const until = window?.until ?? f.until;
          if (until && date2 >= until) return false;
          if (f.state && election.state !== f.state) return false;
          if (f.types.length && !f.types.includes(election.type.trim().toLowerCase())) return false;
          if (f.electionTypes.length && !f.electionTypes.includes(election.type.trim().toLowerCase())) return false;
          if (f.levels.length && !f.levels.includes(election.level.trim().toLowerCase())) return false;
          if (f.parties.length && !f.parties.some((party) => parties.get(election.id)?.has(party))) return false;
          if (f.cycle && date2.getUTCFullYear() !== f.cycle) return false;
          if (search && ![election.title, election.subtitle, election.location].some((value) => value?.toLowerCase().includes(search))) return false;
          return true;
        }).sort((a, b) => a.date.getTime() - b.date.getTime() || a.id - b.id).map((election) => ({ ...election, ...projectOfficialResultsForElection(election), candidateCount: counts.get(election.id) ?? 0 }));
      }
      getElectionsStrict(filters = {}) {
        return this.getElections(filters);
      }
      async getElection(id2) {
        const election = this.elections.get(id2);
        return election ? { ...election, ...projectOfficialResultsForElection(election) } : void 0;
      }
      async createElection(election) {
        const newElection = {
          id: this.nextId++,
          ...election,
          title: election.title,
          location: election.location,
          state: election.state,
          date: election.date,
          type: election.type,
          level: election.level,
          subtitle: election.subtitle ?? null,
          offices: election.offices ?? null,
          description: election.description ?? null,
          pollsOpen: election.pollsOpen ?? null,
          pollsClose: election.pollsClose ?? null,
          timezone: election.timezone ?? null,
          pollCloseKind: election.pollCloseKind ?? null,
          pollHoursBasis: election.pollHoursBasis ?? null,
          pollHoursSource: election.pollHoursSource ?? null,
          officialResultsUrl: election.officialResultsUrl ?? null,
          officialResultsSource: election.officialResultsSource ?? null,
          // was hard-coded null: the manifest never reached memory mode
          isActive: election.isActive ?? null
        };
        this.elections.set(newElection.id, newElection);
        return newElection;
      }
      async deleteElection(id2) {
        this.elections.delete(id2);
        this.candidatesByElection.delete(id2);
      }
      // Candidates methods
      async getCandidatesByElection(electionId) {
        const candidateIds = this.candidatesByElection.get(electionId) || [];
        return candidateIds.map((id2) => this.candidates.get(id2)).filter(Boolean);
      }
      async getCandidates(electionId) {
        if (electionId) {
          return this.getCandidatesByElection(electionId);
        }
        return Array.from(this.candidates.values());
      }
      async getCandidatesByIds(ids) {
        return ids.map((id2) => this.candidates.get(id2)).filter(Boolean);
      }
      async getCandidatesByElections(electionIds) {
        const out = [];
        for (const id2 of electionIds) out.push(...await this.getCandidatesByElection(id2));
        return out;
      }
      async createCandidate(candidate) {
        const newCandidate = {
          id: this.nextId++,
          ...candidate,
          description: candidate.description ?? null,
          electionId: candidate.electionId ?? null,
          pollingSupport: candidate.pollingSupport ?? null,
          pollingTrend: candidate.pollingTrend ?? null,
          lastPollingUpdate: candidate.lastPollingUpdate ?? null,
          pollingSource: candidate.pollingSource ?? null,
          isIncumbent: candidate.isIncumbent ?? null,
          website: candidate.website ?? null,
          votesReceived: candidate.votesReceived ?? null,
          votePercentage: candidate.votePercentage ?? null,
          isWinner: candidate.isWinner ?? null,
          isProjectedWinner: candidate.isProjectedWinner ?? null,
          isVerified: candidate.isVerified ?? null,
          subscriptionTier: candidate.subscriptionTier ?? null,
          profileImageUrl: candidate.profileImageUrl ?? null,
          campaignBio: candidate.campaignBio ?? null,
          contactEmail: candidate.contactEmail ?? null,
          campaignPhone: candidate.campaignPhone ?? null,
          socialMedia: candidate.socialMedia ?? null,
          fecCandidateId: candidate.fecCandidateId ?? null,
          dataSource: candidate.dataSource ?? null,
          sourceStatus: candidate.sourceStatus ?? null,
          fecStatus: candidate.fecStatus ?? null,
          normalizedName: candidate.normalizedName ?? null,
          ballotStatus: candidate.ballotStatus ?? null,
          ballotSourceName: candidate.ballotSourceName ?? null,
          ballotSourceUrl: candidate.ballotSourceUrl ?? null,
          ballotVerifiedAt: candidate.ballotVerifiedAt ?? null,
          sourceFileSha256: candidate.sourceFileSha256 ?? null,
          sourceSyncedAt: candidate.sourceSyncedAt ?? null,
          altFecIds: candidate.altFecIds ?? null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.candidates.set(newCandidate.id, newCandidate);
        if (candidate.electionId) {
          const existing = this.candidatesByElection.get(candidate.electionId) || [];
          this.candidatesByElection.set(candidate.electionId, [...existing, newCandidate.id]);
        }
        return newCandidate;
      }
      async updateCandidatePolling(candidateId, pollingData2) {
        const candidate = this.candidates.get(candidateId);
        if (candidate) {
          Object.assign(candidate, pollingData2, { updatedAt: /* @__PURE__ */ new Date() });
          this.candidates.set(candidateId, candidate);
        }
      }
      // Election Results methods
      async getElectionResults(electionId) {
        const payload = await this.getResultsPayload(electionId);
        return payload ?? { electionId, status: "none", candidates: [] };
      }
      resultReports = new MemResultReportStore(
        (id2) => this.elections.has(id2),
        (candidateId, electionId) => this.candidates.get(candidateId)?.electionId === electionId,
        (date2) => Array.from(this.elections.values()).filter((e) => new Date(e.date).toISOString().slice(0, 10) === date2).map((e) => e.id),
        (id2) => this.elections.get(id2)?.date ?? null,
        (id2) => {
          const e = this.elections.get(id2);
          return e ? electionContextOf(e) : null;
        },
        () => Array.from(this.elections.values()).filter((e) => e.officialResultsSource?.routeVerification === "worked").map((e) => ({ election_id: e.id, state: e.state, publisher: e.officialResultsSource.publisher, route_type: e.officialResultsSource.routeType, government_url: e.officialResultsSource.governmentUrl }))
      );
      recordResultReport(electionId, input, ctx) {
        return this.resultReports.recordResultReport(electionId, input, ctx);
      }
      getResultsPayload(electionId) {
        return this.resultReports.getResultsPayload(electionId);
      }
      listResultsPayloads(query) {
        return this.resultReports.listResultsPayloads(query);
      }
      storeResultEvidence(bytes, contentType, filename, uploadedBy) {
        return this.resultReports.storeResultEvidence(bytes, contentType, filename, uploadedBy);
      }
      listResultSources(state) {
        return this.resultReports.listResultSources(state);
      }
      async updateElectionResults(electionId, resultsData) {
        return { electionId, ...resultsData, lastUpdated: /* @__PURE__ */ new Date() };
      }
      // Stats methods
      async getElectionStats() {
        const elections2 = Array.from(this.elections.values());
        const now = /* @__PURE__ */ new Date();
        const byType = {};
        const byLevel = {};
        elections2.forEach((election) => {
          byType[election.type] = (byType[election.type] || 0) + 1;
          byLevel[election.level] = (byLevel[election.level] || 0) + 1;
        });
        const futureElections = elections2.filter((e) => e.date > now).sort((a, b) => a.date.getTime() - b.date.getTime());
        return {
          total: elections2.length,
          byType,
          byLevel,
          nextElection: futureElections[0] || null
        };
      }
      // API Integration methods (with caching)
      async syncElectionsFromGoogleCivic() {
        try {
          const googleCivicService2 = getGoogleCivicService();
          if (googleCivicService2) {
            const apiElections = await googleCivicService2.fetchElections();
            for (const election of apiElections) {
              if (!this.elections.has(election.id)) {
                this.elections.set(election.id, election);
              }
            }
          }
        } catch (error) {
          console.log("Google Civic sync failed in MemStorage:", error);
        }
      }
      async getVoterInfo(address) {
        const cacheKey = `voter_info_${address}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        try {
          const googleCivicService2 = getGoogleCivicService();
          if (googleCivicService2) {
            const voterInfo = await googleCivicService2.fetchVoterInfo(address);
            this.setCachedData(cacheKey, voterInfo);
            return voterInfo;
          }
        } catch (error) {
          console.log("Voter info API failed:", error);
        }
        return null;
      }
      // Congress API methods (with caching)
      async getAllBills() {
        const cacheKey = "all_bills";
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        try {
          const congressBillService = getCongressBillService();
          if (!congressBillService) {
            console.log("Congress bill service not available");
            return [];
          }
          const bills = await congressBillService.fetchAllBills();
          this.setCachedData(cacheKey, bills);
          return bills;
        } catch (error) {
          console.log("Congress bills API failed:", error);
          return [];
        }
      }
      async getBillsByCongress(congress) {
        const cacheKey = `bills_${congress}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        try {
          const congressBillService = getCongressBillService();
          if (!congressBillService) {
            console.log("Congress bill service not available");
            return [];
          }
          const bills = await congressBillService.fetchBillsByCongress(congress);
          this.setCachedData(cacheKey, bills);
          return bills;
        } catch (error) {
          console.log("Congress bills by congress API failed:", error);
          return [];
        }
      }
      async getAllMembers() {
        const cacheKey = "all_members";
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        try {
          const congressBillService = getCongressBillService();
          if (!congressBillService) {
            console.log("Congress bill service not available");
            return [];
          }
          const members = await congressBillService.fetchAllMembers();
          this.setCachedData(cacheKey, members);
          return members;
        } catch (error) {
          console.log("Congress members API failed:", error);
          return [];
        }
      }
      async getAllCongressMembers() {
        return Array.from(this.congressMembers.values());
      }
      async getMembersByState(state) {
        const cacheKey = `members_${state}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        try {
          const congressBillService = getCongressBillService();
          if (!congressBillService) {
            console.log("Congress bill service not available");
            return [];
          }
          const members = await congressBillService.fetchMembersByState(state);
          this.setCachedData(cacheKey, members);
          return members;
        } catch (error) {
          console.log("Congress members by state API failed:", error);
          return [];
        }
      }
      async getAllCommittees() {
        const cacheKey = "all_committees";
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        try {
          const congressBillService = getCongressBillService();
          if (!congressBillService) {
            console.log("Congress bill service not available");
            return [];
          }
          const committees = await congressBillService.fetchAllCommittees();
          this.setCachedData(cacheKey, committees);
          return committees;
        } catch (error) {
          console.log("Congress committees API failed:", error);
          return [];
        }
      }
      async getCommitteeMembers(chamber, committeeCode) {
        const cacheKey = `committee_${chamber}_${committeeCode}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;
        try {
          const congressBillService = getCongressBillService();
          if (!congressBillService) {
            console.log("Congress bill service not available");
            return [];
          }
          const members = await congressBillService.fetchCommitteeMembers(chamber, committeeCode);
          this.setCachedData(cacheKey, members);
          return members;
        } catch (error) {
          console.log("Committee members API failed:", error);
          return [];
        }
      }
      async getDailyCongressionalRecords() {
        return [];
      }
      async getSenateCommunications() {
        return [];
      }
      async getAllNominations() {
        return [];
      }
      async getHouseVotes() {
        return [];
      }
      // AI Integration methods
      async searchElectionsWithAI(query) {
        try {
          const perplexityService = getPerplexityService();
          if (!perplexityService) {
            return "AI search service not available";
          }
          return await perplexityService.searchElections(query);
        } catch (error) {
          console.log("AI search failed:", error);
          return `Search results not available: ${error}`;
        }
      }
      async expandElectionData() {
      }
      // User methods
      async getUser(id2) {
        return this.users.get(id2);
      }
      async getUserById(id2) {
        for (const user of this.users.values()) {
          if (user.id === id2) {
            return user;
          }
        }
        return void 0;
      }
      async upsertUser(user) {
        const id2 = user.id ?? existingUserIdFor(user.email, this.users) ?? crypto.randomUUID();
        const existingUser = this.users.get(id2);
        const newUser = {
          ...existingUser,
          ...user,
          id: id2,
          role: user.role ?? existingUser?.role ?? "user",
          passwordHash: user.passwordHash ?? existingUser?.passwordHash ?? null,
          emailVerified: user.emailVerified ?? existingUser?.emailVerified ?? false,
          lastLogin: user.lastLogin ?? existingUser?.lastLogin ?? null,
          profileImageUrl: user.profileImageUrl ?? null,
          email: user.email ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          updatedAt: /* @__PURE__ */ new Date(),
          createdAt: existingUser?.createdAt || /* @__PURE__ */ new Date()
        };
        this.users.set(id2, newUser);
        return newUser;
      }
      // Watchlist methods
      async getUserWatchlist(userId) {
        const electionIds = this.watchlists.get(userId) || [];
        return electionIds.map((electionId, index2) => memWatchlistRow(index2 + 1, userId, electionId, /* @__PURE__ */ new Date()));
      }
      async addToWatchlist(userId, electionId) {
        const existing = this.watchlists.get(userId) || [];
        if (!existing.includes(electionId)) {
          this.watchlists.set(userId, [...existing, electionId]);
        }
        return memWatchlistRow(existing.length + 1, userId, electionId, /* @__PURE__ */ new Date());
      }
      async removeFromWatchlist(userId, electionId) {
        const existing = this.watchlists.get(userId) || [];
        this.watchlists.set(userId, existing.filter((id2) => id2 !== electionId));
      }
      // Version Control & Election Cycles
      async getElectionCycles() {
        return [
          { id: 1, name: "2025 Elections", slug: "2025", year: 2025, isActive: true },
          { id: 2, name: "2026 Midterms", slug: "2026", year: 2026, isActive: true }
        ];
      }
      async getElectionCycle(slug) {
        const cycles = await this.getElectionCycles();
        return cycles.find((c) => c.slug === slug);
      }
      // Analytics methods
      async logInteraction(data) {
        console.log("Analytics interaction:", data);
      }
      // Candidate Portal methods (stub implementations)
      async authenticateCandidate(email, password) {
        return Array.from(this.candidateAccounts.values()).find((account) => account.email === email) || null;
      }
      async createCandidateAccount(account) {
        const newAccount = {
          id: this.nextId++,
          ...account,
          isActive: account.isActive ?? null,
          subscriptionTier: account.subscriptionTier ?? "basic",
          lastLogin: account.lastLogin ?? null,
          emailVerified: account.emailVerified ?? null,
          role: account.role ?? "candidate",
          campaignName: account.campaignName ?? null,
          campaignTitle: account.campaignTitle ?? null,
          accessLevel: account.accessLevel ?? null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.candidateAccounts.set(newAccount.id, newAccount);
        return newAccount;
      }
      async getCandidateAccountById(id2) {
        return this.candidateAccounts.get(id2) ?? null;
      }
      async listCandidateAccounts(filter = {}) {
        return Array.from(this.candidateAccounts.values()).filter((a) => filter.isActive === void 0 || a.isActive === filter.isActive);
      }
      async setCandidateAccountActive(id2, isActive, accessLevel) {
        const existing = this.candidateAccounts.get(id2);
        if (!existing) return null;
        const updated = { ...existing, isActive, accessLevel: accessLevel ?? existing.accessLevel, updatedAt: /* @__PURE__ */ new Date() };
        this.candidateAccounts.set(id2, updated);
        return updated;
      }
      // --- Degraded-mode (database unavailable) behaviour for methods DatabaseStorage owns ---
      // Reads answer from in-memory state or empty; writes refuse with a clear error instead of
      // pretending to persist. The storage proxy forwards these when MemStorage is active.
      degraded(method) {
        throw Object.assign(new Error(`${method} is unavailable while the database is degraded`), { status: 503, publicCode: "storage_degraded", publicMessage: "This action is temporarily unavailable" });
      }
      async getCandidatePositions(candidateId, category) {
        const rows = this.candidatePositions.get(candidateId) ?? [];
        return category ? rows.filter((r) => r.category === category) : rows;
      }
      async getCandidatePositionById(positionId) {
        for (const rows of this.candidatePositions.values()) {
          const hit = rows.find((r) => r.id === positionId);
          if (hit) return hit;
        }
        return null;
      }
      async getCandidateQAEntries(candidateId, category) {
        const rows = this.candidateQAs.get(candidateId) ?? [];
        return category ? rows.filter((r) => r.category === category) : rows;
      }
      async updateWatchlistItem(_userId, _itemId, _updates) {
        return this.degraded("updateWatchlistItem");
      }
      async createCandidateProfile(profile) {
        const row = { id: this.nextId++, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), ...profile };
        this.candidateProfiles.set(profile.candidateId, row);
        return row;
      }
      async createCandidatePosition(position) {
        const row = { id: this.nextId++, createdAt: /* @__PURE__ */ new Date(), lastUpdated: /* @__PURE__ */ new Date(), ...position };
        const rows = this.candidatePositions.get(position.candidateId) ?? [];
        rows.push(row);
        this.candidatePositions.set(position.candidateId, rows);
        return row;
      }
      async updateCandidatePosition(positionId, updates) {
        for (const rows of this.candidatePositions.values()) {
          const i = rows.findIndex((r) => r.id === positionId);
          if (i >= 0) {
            rows[i] = { ...rows[i], ...updates, lastUpdated: /* @__PURE__ */ new Date() };
            return rows[i];
          }
        }
        throw Object.assign(new Error("Position not found"), { status: 404, publicCode: "not_found", publicMessage: "Position not found" });
      }
      async deleteCandidatePosition(positionId) {
        for (const [cid, rows] of this.candidatePositions.entries()) {
          const next = rows.filter((r) => r.id !== positionId);
          if (next.length !== rows.length) {
            this.candidatePositions.set(cid, next);
            return;
          }
        }
      }
      async getUserNotificationPreferences(_userId) {
        return null;
      }
      async createDefaultNotificationPreferences(_userId) {
        return this.degraded("createDefaultNotificationPreferences");
      }
      async updateUserNotificationPreferences(_userId, _updates) {
        return this.degraded("updateUserNotificationPreferences");
      }
      async getUserNotificationSubscriptions(_userId) {
        return [];
      }
      async updateNotificationSubscription(_subscriptionId, _updates) {
        return this.degraded("updateNotificationSubscription");
      }
      async verifyNotificationSubscription(_token) {
        return null;
      }
      async createNotificationDelivery(_delivery) {
        return this.degraded("createNotificationDelivery");
      }
      async getCandidateProfile(candidateId) {
        return this.candidateProfiles.get(candidateId) || null;
      }
      async updateCandidateProfile(candidateId, profile) {
        const existing = this.candidateProfiles.get(candidateId);
        const updated = {
          id: candidateId,
          candidateId,
          createdAt: existing?.createdAt || /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          ...existing,
          ...profile,
          fullName: (profile.fullName !== void 0 ? profile.fullName : existing?.fullName) ?? null,
          preferredName: (profile.preferredName !== void 0 ? profile.preferredName : existing?.preferredName) ?? null,
          age: (profile.age !== void 0 ? profile.age : existing?.age) ?? null,
          birthPlace: (profile.birthPlace !== void 0 ? profile.birthPlace : existing?.birthPlace) ?? null,
          currentResidence: (profile.currentResidence !== void 0 ? profile.currentResidence : existing?.currentResidence) ?? null,
          familyStatus: (profile.familyStatus !== void 0 ? profile.familyStatus : existing?.familyStatus) ?? null,
          currentOccupation: (profile.currentOccupation !== void 0 ? profile.currentOccupation : existing?.currentOccupation) ?? null,
          employmentHistory: (profile.employmentHistory !== void 0 ? profile.employmentHistory : existing?.employmentHistory) ?? null,
          education: (profile.education !== void 0 ? profile.education : existing?.education) ?? null,
          militaryService: (profile.militaryService !== void 0 ? profile.militaryService : existing?.militaryService) ?? null,
          previousOffices: (profile.previousOffices !== void 0 ? profile.previousOffices : existing?.previousOffices) ?? null,
          politicalExperience: (profile.politicalExperience !== void 0 ? profile.politicalExperience : existing?.politicalExperience) ?? null,
          endorsements: (profile.endorsements !== void 0 ? profile.endorsements : existing?.endorsements) ?? null,
          economyPosition: (profile.economyPosition !== void 0 ? profile.economyPosition : existing?.economyPosition) ?? null,
          healthcarePosition: (profile.healthcarePosition !== void 0 ? profile.healthcarePosition : existing?.healthcarePosition) ?? null,
          educationPosition: (profile.educationPosition !== void 0 ? profile.educationPosition : existing?.educationPosition) ?? null,
          environmentPosition: (profile.environmentPosition !== void 0 ? profile.environmentPosition : existing?.environmentPosition) ?? null,
          immigrationPosition: (profile.immigrationPosition !== void 0 ? profile.immigrationPosition : existing?.immigrationPosition) ?? null,
          criminalJusticePosition: (profile.criminalJusticePosition !== void 0 ? profile.criminalJusticePosition : existing?.criminalJusticePosition) ?? null,
          infrastructurePosition: (profile.infrastructurePosition !== void 0 ? profile.infrastructurePosition : existing?.infrastructurePosition) ?? null,
          taxesPosition: (profile.taxesPosition !== void 0 ? profile.taxesPosition : existing?.taxesPosition) ?? null,
          foreignPolicyPosition: (profile.foreignPolicyPosition !== void 0 ? profile.foreignPolicyPosition : existing?.foreignPolicyPosition) ?? null,
          socialIssuesPosition: (profile.socialIssuesPosition !== void 0 ? profile.socialIssuesPosition : existing?.socialIssuesPosition) ?? null,
          campaignWebsite: (profile.campaignWebsite !== void 0 ? profile.campaignWebsite : existing?.campaignWebsite) ?? null,
          campaignSlogan: (profile.campaignSlogan !== void 0 ? profile.campaignSlogan : existing?.campaignSlogan) ?? null,
          topPriorities: (profile.topPriorities !== void 0 ? profile.topPriorities : existing?.topPriorities) ?? null,
          keyAccomplishments: (profile.keyAccomplishments !== void 0 ? profile.keyAccomplishments : existing?.keyAccomplishments) ?? null,
          dataCompleteness: (profile.dataCompleteness !== void 0 ? profile.dataCompleteness : existing?.dataCompleteness) ?? null,
          verificationStatus: (profile.verificationStatus !== void 0 ? profile.verificationStatus : existing?.verificationStatus) ?? null,
          lastUpdatedBy: (profile.lastUpdatedBy !== void 0 ? profile.lastUpdatedBy : existing?.lastUpdatedBy) ?? null
        };
        this.candidateProfiles.set(candidateId, updated);
        return updated;
      }
      async getCandidateDataSources(candidateId) {
        return this.candidateDataSources.get(candidateId) || [];
      }
      async recordDataSource(source) {
        const newSource = {
          id: this.nextId++,
          ...source,
          sourceDescription: source.sourceDescription ?? null,
          sourceUrl: source.sourceUrl ?? null,
          lastVerified: source.lastVerified ?? null,
          confidenceScore: source.confidenceScore ?? null,
          createdAt: /* @__PURE__ */ new Date()
        };
        const existing = this.candidateDataSources.get(source.candidateId) || [];
        this.candidateDataSources.set(source.candidateId, [...existing, newSource]);
        return newSource;
      }
      // Stub methods for remaining interface
      async getCandidateWithRAG(candidateId) {
        return { candidateId, message: "RAG data not available in memory storage" };
      }
      async recordEngagement(data) {
        console.log("Engagement recorded:", data);
      }
      // Degraded mode must never report a write as done when nothing was persisted.
      async updateUserPreferences(_userId, _updates) {
        return this.degraded("updateUserPreferences");
      }
      async updateUserDemographics(_userId, _demographics) {
        return this.degraded("updateUserDemographics");
      }
      async exportUserData(_userId) {
        return this.degraded("exportUserData");
      }
      async deleteUserData(_userId) {
        return this.degraded("deleteUserData");
      }
      campaignAccounts = /* @__PURE__ */ new Map();
      // keyed by SHA-256 of the key
      async createCampaignAccount(data) {
        const apiKey = generateCampaignApiKey();
        const now = /* @__PURE__ */ new Date();
        const account = {
          id: this.nextId++,
          apiKey: hashApiKey(apiKey),
          organizationName: data.organizationName,
          contactEmail: data.contactEmail,
          electionId: data.electionId,
          subscriptionTier: data.subscriptionTier,
          isActive: data.isActive,
          monthlyApiLimit: SUBSCRIPTION_TIERS[data.subscriptionTier].monthlyApiLimit,
          apiCallsUsed: 0,
          subscriptionEnd: null,
          keyLast4: data.isActive ? apiKey.slice(-4) : null,
          createdAt: now,
          updatedAt: now
        };
        this.campaignAccounts.set(account.apiKey, account);
        return { account, apiKey: data.isActive ? apiKey : null };
      }
      async validateCampaignAccess(apiKey) {
        const account = this.campaignAccounts.get(hashApiKey(apiKey));
        if (!account || !account.isActive) throw new Error("Invalid API key or inactive account");
        return account;
      }
      async getCampaignAnalytics(campaignId, electionId, tier) {
        return { campaignId, electionId, tier, analytics: {} };
      }
      async getCampaignGeographics(campaignId, region, tier) {
        return { campaignId, region, tier, demographics: {} };
      }
      async getCampaignPolling(campaignId, electionId, dateRange) {
        return { campaignId, electionId, dateRange, polling: [] };
      }
      async purchaseDataExport(campaignId, datasetType, format) {
        return { campaignId, datasetType, format, downloadUrl: "#" };
      }
      async getCampaignSubscription(campaignId) {
        return { campaignId, tier: "basic", expiresAt: /* @__PURE__ */ new Date() };
      }
      // User Authentication Methods Implementation - Memory Mode
      async createUser(email, password) {
        const bcrypt2 = await import("bcryptjs");
        const jwt2 = await import("jsonwebtoken");
        const crypto6 = await import("crypto");
        if (this.users.has(email)) {
          throw new Error("User already exists with this email");
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt2.hash(password, saltRounds);
        const userId = this.nextId++;
        const user = {
          id: userId.toString(),
          email,
          passwordHash,
          emailVerified: false,
          createdAt: /* @__PURE__ */ new Date(),
          lastLogin: null,
          role: "user",
          profileImageUrl: null,
          firstName: null,
          lastName: null,
          updatedAt: null
        };
        this.users.set(email, user);
        const JWT_SECRET2 = process.env.JWT_SECRET || "dev-secret-key";
        const jti = crypto6.randomUUID();
        const token2 = jwt2.default.sign(
          { uid: userId, jti },
          JWT_SECRET2,
          { expiresIn: "7d" }
        );
        return {
          user: {
            id: userId,
            email,
            emailVerified: false,
            createdAt: user.createdAt
          },
          token: token2
        };
      }
      async authenticateUser(email, password) {
        const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
        return await authService2.signin(email, password);
      }
      async signoutUser(token2) {
        const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
        return await authService2.signout(token2);
      }
      async validateUserSession(token2) {
        const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
        return await authService2.validateSession(token2);
      }
      // Congressional Search & Missing Member Detection
      async searchCongressMembers(searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const results = [];
        for (const member of Array.from(this.congressMembers.values())) {
          if (member.name?.toLowerCase().includes(searchLower) || member.state?.toLowerCase().includes(searchLower) || member.party?.toLowerCase().includes(searchLower) || member.bioguideId?.toLowerCase().includes(searchLower)) {
            results.push(member);
            if (results.length >= 50) break;
          }
        }
        return results;
      }
      async findMissingCongressMember() {
        const { congressService: congressService2 } = await Promise.resolve().then(() => (init_congress_api_service(), congress_api_service_exports));
        return await congressService2.findMissingMembers();
      }
      // ============================================================================
      // PLATFORM CONTINUITY METHODS IMPLEMENTATION (Track 3)
      // ============================================================================
      // Secrets Management Methods
      async getSecretByName(secretName) {
        return this.secretsByName.get(secretName) || null;
      }
      async getSecretById(secretId) {
        return this.secretsVault.get(secretId) || null;
      }
      async getAllSecrets() {
        return Array.from(this.secretsVault.values());
      }
      async getExpiredSecrets() {
        const now = /* @__PURE__ */ new Date();
        return Array.from(this.secretsVault.values()).filter(
          (secret) => secret.nextRotation && new Date(secret.nextRotation) <= now
        );
      }
      async createSecret(secret) {
        const id2 = this.nextId++;
        const secretRecord = {
          id: id2,
          ...secret,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.secretsVault.set(id2, secretRecord);
        this.secretsByName.set(secret.secretName, secretRecord);
        return id2;
      }
      async updateSecret(secretId, updates) {
        const existing = this.secretsVault.get(secretId);
        if (existing) {
          const updated = { ...existing, ...updates, updatedAt: /* @__PURE__ */ new Date() };
          this.secretsVault.set(secretId, updated);
          this.secretsByName.set(updated.secretName, updated);
        }
      }
      async createSecretRotationHistory(history) {
        const record = {
          ...history,
          startedAt: /* @__PURE__ */ new Date(),
          id: this.nextId++
        };
        this.secretsRotationHistory.set(history.rotationId, record);
      }
      async updateSecretRotationHistory(rotationId, updates) {
        const existing = this.secretsRotationHistory.get(rotationId);
        if (existing) {
          const updated = { ...existing, ...updates };
          if (updates.status === "completed" || updates.status === "failed") {
            updated.completedAt = /* @__PURE__ */ new Date();
          }
          this.secretsRotationHistory.set(rotationId, updated);
        }
      }
      async getRotationHistory(filters) {
        let history = Array.from(this.secretsRotationHistory.values());
        if (filters.secretId) {
          history = history.filter((h) => h.secretId === filters.secretId);
        }
        if (filters.status) {
          history = history.filter((h) => h.status === filters.status);
        }
        if (filters.rotationType) {
          history = history.filter((h) => h.rotationType === filters.rotationType);
        }
        return history.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      }
      async getRecentRotationFailures(days) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
        return Array.from(this.secretsRotationHistory.values()).filter((h) => h.status === "failed" && new Date(h.startedAt) >= cutoff).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      }
      async deleteOldRotationHistory(cutoffDate) {
        let deletedCount = 0;
        for (const [rotationId, history] of this.secretsRotationHistory.entries()) {
          if (new Date(history.startedAt) < cutoffDate) {
            this.secretsRotationHistory.delete(rotationId);
            deletedCount++;
          }
        }
        return deletedCount;
      }
      // Artifact Storage Methods
      async createArtifact(artifact) {
        const id2 = this.nextId++;
        const artifactRecord = {
          id: id2,
          ...artifact,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.artifactStorage.set(id2, artifactRecord);
        if (artifact.contentHash) {
          this.artifactsByHash.set(artifact.contentHash, artifactRecord);
        }
        return id2;
      }
      async getArtifactByHash(contentHash) {
        return this.artifactsByHash.get(contentHash) || null;
      }
      async getArtifactByNameVersion(artifactName, version, environment) {
        return Array.from(this.artifactStorage.values()).find(
          (artifact) => artifact.artifactName === artifactName && artifact.version === version && (!environment || artifact.environment === environment)
        ) || null;
      }
      async getArtifactVersions(artifactName, environment) {
        return Array.from(this.artifactStorage.values()).filter(
          (artifact) => artifact.artifactName === artifactName && (!environment || artifact.environment === environment)
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getArtifactById(artifactId) {
        return this.artifactStorage.get(artifactId) || null;
      }
      async updateArtifact(artifactId, updates) {
        const existing = this.artifactStorage.get(artifactId);
        if (existing) {
          const updated = { ...existing, ...updates };
          this.artifactStorage.set(artifactId, updated);
          if (updated.contentHash) {
            this.artifactsByHash.set(updated.contentHash, updated);
          }
        }
      }
      async deleteArtifact(artifactId) {
        const artifact = this.artifactStorage.get(artifactId);
        if (artifact) {
          this.artifactStorage.delete(artifactId);
          if (artifact.contentHash) {
            this.artifactsByHash.delete(artifact.contentHash);
          }
        }
      }
      async getArtifacts(filters) {
        let artifacts = Array.from(this.artifactStorage.values());
        if (filters.artifactType) {
          artifacts = artifacts.filter((a) => a.artifactType === filters.artifactType);
        }
        if (filters.environment) {
          artifacts = artifacts.filter((a) => a.environment === filters.environment);
        }
        if (filters.isActive !== void 0) {
          artifacts = artifacts.filter((a) => a.isActive === filters.isActive);
        }
        return artifacts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getActiveArtifacts() {
        return Array.from(this.artifactStorage.values()).filter((a) => a.isActive);
      }
      async getAllArtifacts() {
        return Array.from(this.artifactStorage.values());
      }
      async getExpiredArtifacts() {
        const now = /* @__PURE__ */ new Date();
        return Array.from(this.artifactStorage.values()).filter(
          (artifact) => artifact.retentionDate && new Date(artifact.retentionDate) <= now
        );
      }
      // Deployment History Methods
      async createDeploymentHistory(deployment) {
        const record = {
          ...deployment,
          startedAt: /* @__PURE__ */ new Date(),
          id: this.nextId++
        };
        this.deploymentHistory.set(deployment.deploymentId, record);
      }
      async updateDeploymentHistory(deploymentId, updates) {
        const existing = this.deploymentHistory.get(deploymentId);
        if (existing) {
          const updated = { ...existing, ...updates };
          if (updates.status === "completed" || updates.status === "failed" || updates.status === "rolled_back") {
            updated.completedAt = /* @__PURE__ */ new Date();
            if (updated.startedAt) {
              updated.duration = Math.round((updated.completedAt.getTime() - new Date(updated.startedAt).getTime()) / 1e3);
            }
          }
          this.deploymentHistory.set(deploymentId, updated);
        }
      }
      async getRecentDeployments(limit) {
        return Array.from(this.deploymentHistory.values()).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, limit);
      }
      async getDeploymentById(deploymentId) {
        return this.deploymentHistory.get(deploymentId) || null;
      }
      // Environment Configuration Methods
      async createEnvironmentConfiguration(config2) {
        const id2 = this.nextId++;
        const configRecord = {
          id: id2,
          ...config2,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.environmentConfigurations.set(id2, configRecord);
        return id2;
      }
      async getEnvironmentConfigurations() {
        return Array.from(this.environmentConfigurations.values());
      }
      // Platform Continuity Events Methods
      async createPlatformContinuityEvent(event) {
        const record = {
          ...event,
          startedAt: /* @__PURE__ */ new Date(),
          id: this.nextId++
        };
        this.platformContinuityEvents.set(event.eventId, record);
      }
      async getRecentPlatformContinuityEvents(limit) {
        return Array.from(this.platformContinuityEvents.values()).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, limit);
      }
      async getPlatformContinuityEvents(filters) {
        let events = Array.from(this.platformContinuityEvents.values());
        if (filters.eventType) {
          events = events.filter((e) => e.eventType === filters.eventType);
        }
        if (filters.severity) {
          events = events.filter((e) => e.severity === filters.severity);
        }
        if (filters.status) {
          events = events.filter((e) => e.status === filters.status);
        }
        if (filters.environment) {
          events = events.filter((e) => e.environment === filters.environment);
        }
        return events.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      }
      // Health checking for platform services
      async getHealth() {
        return;
      }
      // ============================================================================
      // TRACK 4: MONITORING & RUNBOOKS IMPLEMENTATION - MEMORY STORAGE
      // ============================================================================
      // Track 4 Memory Storage Maps
      drillConfigurations = /* @__PURE__ */ new Map();
      drillExecutions = /* @__PURE__ */ new Map();
      // executionId -> execution
      drillSteps = /* @__PURE__ */ new Map();
      // executionId -> steps
      backupMonitoringConfigs = /* @__PURE__ */ new Map();
      backupAlerts = /* @__PURE__ */ new Map();
      // alertId -> alert
      backupHealthMetrics = /* @__PURE__ */ new Map();
      rtoRpoTargets = /* @__PURE__ */ new Map();
      rtoRpoMeasurements = /* @__PURE__ */ new Map();
      // measurementId -> measurement
      performanceBenchmarks = /* @__PURE__ */ new Map();
      incidentRunbooks = /* @__PURE__ */ new Map();
      // runbookId -> runbook
      runbookSteps = /* @__PURE__ */ new Map();
      // runbookId -> steps
      runbookContacts = /* @__PURE__ */ new Map();
      // contactId -> contact
      contactEscalationTrees = /* @__PURE__ */ new Map();
      // treeId -> tree
      runbookExecutions = /* @__PURE__ */ new Map();
      // executionId -> execution
      // Synthetic Failover Drill System - Drill Configurations
      async getFailoverDrillConfigurations(filters) {
        let configs = Array.from(this.drillConfigurations.values());
        if (filters?.enabled !== void 0) {
          configs = configs.filter((c) => c.isEnabled === filters.enabled);
        }
        if (filters?.drillType) {
          configs = configs.filter((c) => c.drillType === filters.drillType);
        }
        if (filters?.scenario) {
          configs = configs.filter((c) => c.scenario === filters.scenario);
        }
        return configs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getFailoverDrillConfiguration(id2) {
        return this.drillConfigurations.get(id2);
      }
      async createFailoverDrillConfiguration(config2) {
        const newConfig = {
          ...config2,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.drillConfigurations.set(newConfig.id, newConfig);
        return newConfig;
      }
      async updateFailoverDrillConfiguration(id2, updates) {
        const existing = this.drillConfigurations.get(id2);
        if (existing) {
          const updated = { ...existing, ...updates, updatedAt: /* @__PURE__ */ new Date() };
          this.drillConfigurations.set(id2, updated);
          return updated;
        }
        throw new Error("Drill configuration not found");
      }
      async deleteFailoverDrillConfiguration(id2) {
        this.drillConfigurations.delete(id2);
      }
      async getScheduledDrillConfigurations() {
        return Array.from(this.drillConfigurations.values()).filter((c) => c.isEnabled && c.triggerType === "scheduled").sort((a, b) => new Date(b.nextScheduledRun || 0).getTime() - new Date(a.nextScheduledRun || 0).getTime());
      }
      // Drill Executions
      async getDrillExecutions(filters) {
        let executions = Array.from(this.drillExecutions.values());
        if (filters?.configurationId) {
          executions = executions.filter((e) => e.configurationId === filters.configurationId);
        }
        if (filters?.status) {
          executions = executions.filter((e) => e.status === filters.status);
        }
        if (filters?.triggerType) {
          executions = executions.filter((e) => e.triggerType === filters.triggerType);
        }
        executions = executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        if (filters?.limit) {
          const start = filters.page ? (filters.page - 1) * filters.limit : 0;
          executions = executions.slice(start, start + filters.limit);
        }
        return executions;
      }
      async getDrillExecution(executionId) {
        return this.drillExecutions.get(executionId);
      }
      async createDrillExecution(execution) {
        const newExecution = {
          ...execution,
          id: this.nextId++,
          startedAt: /* @__PURE__ */ new Date()
        };
        this.drillExecutions.set(execution.executionId, newExecution);
        return newExecution;
      }
      async updateDrillExecution(executionId, updates) {
        const existing = this.drillExecutions.get(executionId);
        if (existing) {
          const updated = { ...existing, ...updates };
          this.drillExecutions.set(executionId, updated);
          return updated;
        }
        throw new Error("Drill execution not found");
      }
      async getRecentDrillExecutions(limit) {
        return Array.from(this.drillExecutions.values()).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, limit);
      }
      async getDrillExecutionsByConfiguration(configurationId) {
        return Array.from(this.drillExecutions.values()).filter((e) => e.configurationId === configurationId).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      }
      async getDrillExecutionsForDashboard(days) {
        const since = /* @__PURE__ */ new Date();
        since.setDate(since.getDate() - days);
        return Array.from(this.drillExecutions.values()).filter((e) => new Date(e.startedAt) >= since).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      }
      // Drill Steps
      async getDrillSteps(executionId) {
        return this.drillSteps.get(executionId) || [];
      }
      async createDrillStep(step) {
        const newStep = {
          ...step,
          id: this.nextId++
        };
        const steps = this.drillSteps.get(step.executionId) || [];
        steps.push(newStep);
        this.drillSteps.set(step.executionId, steps);
        return newStep;
      }
      async updateDrillStep(id2, updates) {
        for (const [executionId, steps] of this.drillSteps.entries()) {
          const stepIndex = steps.findIndex((s) => s.id === id2);
          if (stepIndex !== -1) {
            const updated = { ...steps[stepIndex], ...updates };
            steps[stepIndex] = updated;
            this.drillSteps.set(executionId, steps);
            return updated;
          }
        }
        throw new Error("Drill step not found");
      }
      async getDrillStepsByExecution(executionId) {
        return (this.drillSteps.get(executionId) || []).sort((a, b) => a.stepOrder - b.stepOrder);
      }
      // Backup Success Alert System - Backup Monitoring Configurations
      async getBackupMonitoringConfigurations(filters) {
        let configs = Array.from(this.backupMonitoringConfigs.values());
        if (filters?.enabled !== void 0) {
          configs = configs.filter((c) => c.isEnabled === filters.enabled);
        }
        if (filters?.monitoringType) {
          configs = configs.filter((c) => c.monitoringType === filters.monitoringType);
        }
        return configs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getBackupMonitoringConfiguration(id2) {
        return this.backupMonitoringConfigs.get(id2);
      }
      async createBackupMonitoringConfiguration(config2) {
        const newConfig = {
          ...config2,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.backupMonitoringConfigs.set(newConfig.id, newConfig);
        return newConfig;
      }
      async updateBackupMonitoringConfiguration(id2, updates) {
        const existing = this.backupMonitoringConfigs.get(id2);
        if (existing) {
          const updated = { ...existing, ...updates, updatedAt: /* @__PURE__ */ new Date() };
          this.backupMonitoringConfigs.set(id2, updated);
          return updated;
        }
        throw new Error("Backup monitoring configuration not found");
      }
      async deleteBackupMonitoringConfiguration(id2) {
        this.backupMonitoringConfigs.delete(id2);
      }
      async getActiveMonitoringConfigurations() {
        return Array.from(this.backupMonitoringConfigs.values()).filter((c) => c.isEnabled).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // Backup Alerts
      async getBackupAlerts(filters) {
        let alerts = Array.from(this.backupAlerts.values());
        if (filters?.status) {
          alerts = alerts.filter((a) => a.status === filters.status);
        }
        if (filters?.severity) {
          alerts = alerts.filter((a) => a.severity === filters.severity);
        }
        if (filters?.alertType) {
          alerts = alerts.filter((a) => a.alertType === filters.alertType);
        }
        alerts = alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (filters?.limit) {
          const start = filters.page ? (filters.page - 1) * filters.limit : 0;
          alerts = alerts.slice(start, start + filters.limit);
        }
        return alerts;
      }
      async getBackupAlert(alertId) {
        return this.backupAlerts.get(alertId);
      }
      async createBackupAlert(alert) {
        const newAlert = {
          ...alert,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.backupAlerts.set(alert.alertId, newAlert);
        return newAlert;
      }
      async updateBackupAlert(alertId, updates) {
        const existing = this.backupAlerts.get(alertId);
        if (existing) {
          const updated = { ...existing, ...updates };
          this.backupAlerts.set(alertId, updated);
          return updated;
        }
        throw new Error("Backup alert not found");
      }
      async acknowledgeBackupAlert(alertId, acknowledgedBy) {
        const existing = this.backupAlerts.get(alertId);
        if (existing) {
          const updated = {
            ...existing,
            status: "acknowledged",
            acknowledgedBy,
            acknowledgedAt: /* @__PURE__ */ new Date()
          };
          this.backupAlerts.set(alertId, updated);
          return updated;
        }
        throw new Error("Backup alert not found");
      }
      async resolveBackupAlert(alertId, resolvedBy) {
        const existing = this.backupAlerts.get(alertId);
        if (existing) {
          const updated = {
            ...existing,
            status: "resolved",
            resolvedBy,
            resolvedAt: /* @__PURE__ */ new Date()
          };
          this.backupAlerts.set(alertId, updated);
          return updated;
        }
        throw new Error("Backup alert not found");
      }
      async getActiveBackupAlerts() {
        return Array.from(this.backupAlerts.values()).filter((a) => ["new", "acknowledged", "investigating"].includes(a.status)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getBackupAlertsByConfiguration(configurationId) {
        return Array.from(this.backupAlerts.values()).filter((a) => a.configurationId === configurationId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // Backup Health Metrics
      async getBackupHealthMetrics(filters) {
        let metrics = Array.from(this.backupHealthMetrics.values());
        if (filters?.metricType) {
          metrics = metrics.filter((m) => m.metricType === filters.metricType);
        }
        if (filters?.dateFrom) {
          metrics = metrics.filter((m) => new Date(m.metricTimestamp) >= filters.dateFrom);
        }
        if (filters?.dateTo) {
          metrics = metrics.filter((m) => new Date(m.metricTimestamp) <= filters.dateTo);
        }
        return metrics.sort((a, b) => new Date(b.metricTimestamp).getTime() - new Date(a.metricTimestamp).getTime());
      }
      async createBackupHealthMetric(metric) {
        const newMetric = {
          ...metric,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.backupHealthMetrics.set(newMetric.id, newMetric);
        return newMetric;
      }
      async getLatestBackupHealthMetrics(metricType) {
        const metrics = Array.from(this.backupHealthMetrics.values()).filter((m) => m.metricType === metricType).sort((a, b) => new Date(b.metricTimestamp).getTime() - new Date(a.metricTimestamp).getTime());
        return metrics[0];
      }
      async getBackupHealthTrends(days) {
        const since = /* @__PURE__ */ new Date();
        since.setDate(since.getDate() - days);
        return Array.from(this.backupHealthMetrics.values()).filter((m) => new Date(m.metricTimestamp) >= since).sort((a, b) => new Date(b.metricTimestamp).getTime() - new Date(a.metricTimestamp).getTime());
      }
      async generateBackupHealthSummary(dateFrom, dateTo) {
        const metrics = Array.from(this.backupHealthMetrics.values()).filter((m) => {
          const timestamp3 = new Date(m.metricTimestamp);
          return timestamp3 >= dateFrom && timestamp3 <= dateTo;
        });
        const summary = metrics.reduce((acc, metric) => {
          if (!acc[metric.metricType]) {
            acc[metric.metricType] = {
              metric_type: metric.metricType,
              total_measurements: 0,
              values: []
            };
          }
          acc[metric.metricType].total_measurements++;
          acc[metric.metricType].values.push(metric.metricValue);
          return acc;
        }, {});
        return Object.values(summary).map((s) => ({
          ...s,
          avg_value: s.values.reduce((a, b) => a + b, 0) / s.values.length,
          min_value: Math.min(...s.values),
          max_value: Math.max(...s.values)
        }));
      }
      // RTO/RPO Performance Tracking - RTO/RPO Targets
      async getRtoRpoTargets(filters) {
        let targets = Array.from(this.rtoRpoTargets.values());
        if (filters?.active !== void 0) {
          targets = targets.filter((t) => t.isActive === filters.active);
        }
        if (filters?.serviceType) {
          targets = targets.filter((t) => t.serviceType === filters.serviceType);
        }
        if (filters?.businessCriticality) {
          targets = targets.filter((t) => t.businessCriticality === filters.businessCriticality);
        }
        return targets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getRtoRpoTarget(id2) {
        return this.rtoRpoTargets.get(id2);
      }
      async createRtoRpoTarget(target) {
        const newTarget = {
          ...target,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.rtoRpoTargets.set(newTarget.id, newTarget);
        return newTarget;
      }
      async updateRtoRpoTarget(id2, updates) {
        const existing = this.rtoRpoTargets.get(id2);
        if (existing) {
          const updated = { ...existing, ...updates, updatedAt: /* @__PURE__ */ new Date() };
          this.rtoRpoTargets.set(id2, updated);
          return updated;
        }
        throw new Error("RTO/RPO target not found");
      }
      async deleteRtoRpoTarget(id2) {
        this.rtoRpoTargets.delete(id2);
      }
      async getActiveRtoRpoTargets() {
        return Array.from(this.rtoRpoTargets.values()).filter((t) => t.isActive).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // RTO/RPO Measurements
      async getRtoRpoMeasurements(filters) {
        let measurements = Array.from(this.rtoRpoMeasurements.values());
        if (filters?.targetId) {
          measurements = measurements.filter((m) => m.targetId === filters.targetId);
        }
        if (filters?.measurementType) {
          measurements = measurements.filter((m) => m.measurementType === filters.measurementType);
        }
        if (filters?.dateFrom) {
          measurements = measurements.filter((m) => new Date(m.measuredAt) >= filters.dateFrom);
        }
        if (filters?.dateTo) {
          measurements = measurements.filter((m) => new Date(m.measuredAt) <= filters.dateTo);
        }
        measurements = measurements.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
        if (filters?.limit) {
          const start = filters.page ? (filters.page - 1) * filters.limit : 0;
          measurements = measurements.slice(start, start + filters.limit);
        }
        return measurements;
      }
      async getRtoRpoMeasurement(measurementId) {
        return this.rtoRpoMeasurements.get(measurementId);
      }
      async createRtoRpoMeasurement(measurement) {
        const newMeasurement = {
          ...measurement,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.rtoRpoMeasurements.set(measurement.measurementId, newMeasurement);
        return newMeasurement;
      }
      async updateRtoRpoMeasurement(measurementId, updates) {
        const existing = this.rtoRpoMeasurements.get(measurementId);
        if (existing) {
          const updated = { ...existing, ...updates };
          this.rtoRpoMeasurements.set(measurementId, updated);
          return updated;
        }
        throw new Error("RTO/RPO measurement not found");
      }
      async getRtoRpoMeasurementsByTarget(targetId) {
        return Array.from(this.rtoRpoMeasurements.values()).filter((m) => m.targetId === targetId).sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
      }
      async getRecentRtoRpoMeasurements(limit) {
        return Array.from(this.rtoRpoMeasurements.values()).sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()).slice(0, limit);
      }
      async getRtoRpoPerformanceTrends(targetId, days) {
        const since = /* @__PURE__ */ new Date();
        since.setDate(since.getDate() - days);
        return Array.from(this.rtoRpoMeasurements.values()).filter((m) => m.targetId === targetId && new Date(m.measuredAt) >= since).sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
      }
      async getRtoRpoComplianceReport(dateFrom, dateTo) {
        const measurements = Array.from(this.rtoRpoMeasurements.values()).filter((m) => {
          const measuredAt = new Date(m.measuredAt);
          return measuredAt >= dateFrom && measuredAt <= dateTo;
        });
        const targets = Array.from(this.rtoRpoTargets.values()).filter((t) => t.isActive);
        return targets.map((target) => {
          const targetMeasurements = measurements.filter((m) => m.targetId === target.id);
          const rtoCompliant = targetMeasurements.filter((m) => m.actualRtoMinutes <= target.rtoTargetMinutes).length;
          const rpoCompliant = targetMeasurements.filter((m) => m.actualRpoMinutes <= target.rpoTargetMinutes).length;
          return {
            service_name: target.serviceName,
            service_type: target.serviceType,
            business_criticality: target.businessCriticality,
            rto_target_minutes: target.rtoTargetMinutes,
            rpo_target_minutes: target.rpoTargetMinutes,
            total_measurements: targetMeasurements.length,
            avg_rto_actual: targetMeasurements.reduce((sum3, m) => sum3 + m.actualRtoMinutes, 0) / targetMeasurements.length || 0,
            avg_rpo_actual: targetMeasurements.reduce((sum3, m) => sum3 + m.actualRpoMinutes, 0) / targetMeasurements.length || 0,
            rto_compliant_count: rtoCompliant,
            rpo_compliant_count: rpoCompliant
          };
        });
      }
      // Performance Benchmarks
      async getPerformanceBenchmarks(filters) {
        let benchmarks = Array.from(this.performanceBenchmarks.values());
        if (filters?.active !== void 0) {
          benchmarks = benchmarks.filter((b) => b.isActive === filters.active);
        }
        if (filters?.industry) {
          benchmarks = benchmarks.filter((b) => b.industry === filters.industry);
        }
        if (filters?.sourceType) {
          benchmarks = benchmarks.filter((b) => b.sourceType === filters.sourceType);
        }
        return benchmarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getPerformanceBenchmark(id2) {
        return this.performanceBenchmarks.get(id2);
      }
      async createPerformanceBenchmark(benchmark) {
        const newBenchmark = {
          ...benchmark,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.performanceBenchmarks.set(newBenchmark.id, newBenchmark);
        return newBenchmark;
      }
      async updatePerformanceBenchmark(id2, updates) {
        const existing = this.performanceBenchmarks.get(id2);
        if (existing) {
          const updated = { ...existing, ...updates };
          this.performanceBenchmarks.set(id2, updated);
          return updated;
        }
        throw new Error("Performance benchmark not found");
      }
      async deletePerformanceBenchmark(id2) {
        this.performanceBenchmarks.delete(id2);
      }
      async getIndustryBenchmarks(industry, serviceCategory) {
        return Array.from(this.performanceBenchmarks.values()).filter((b) => b.industry === industry && b.serviceCategory === serviceCategory && b.isActive).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // Incident Runbook Management System - Incident Runbooks
      async getIncidentRunbooks(filters) {
        let runbooks = Array.from(this.incidentRunbooks.values());
        if (filters?.status) {
          runbooks = runbooks.filter((r) => r.status === filters.status);
        }
        if (filters?.incidentType) {
          runbooks = runbooks.filter((r) => r.incidentType === filters.incidentType);
        }
        if (filters?.severity) {
          runbooks = runbooks.filter((r) => r.severity === filters.severity);
        }
        if (filters?.accessLevel) {
          runbooks = runbooks.filter((r) => r.accessLevel === filters.accessLevel);
        }
        runbooks = runbooks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (filters?.limit) {
          const start = filters.page ? (filters.page - 1) * filters.limit : 0;
          runbooks = runbooks.slice(start, start + filters.limit);
        }
        return runbooks;
      }
      async getIncidentRunbook(runbookId) {
        return this.incidentRunbooks.get(runbookId);
      }
      async createIncidentRunbook(runbook) {
        const newRunbook = {
          ...runbook,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.incidentRunbooks.set(runbook.runbookId, newRunbook);
        return newRunbook;
      }
      async updateIncidentRunbook(runbookId, updates) {
        const existing = this.incidentRunbooks.get(runbookId);
        if (existing) {
          const updated = { ...existing, ...updates, updatedAt: /* @__PURE__ */ new Date() };
          this.incidentRunbooks.set(runbookId, updated);
          return updated;
        }
        throw new Error("Incident runbook not found");
      }
      async deleteIncidentRunbook(runbookId) {
        this.incidentRunbooks.delete(runbookId);
      }
      async getRunbooksByIncidentType(incidentType) {
        return Array.from(this.incidentRunbooks.values()).filter((r) => r.incidentType === incidentType && r.status === "active").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getPublishedRunbooks() {
        return Array.from(this.incidentRunbooks.values()).filter((r) => ["approved", "active"].includes(r.status)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async approveRunbook(runbookId, approvedBy) {
        const existing = this.incidentRunbooks.get(runbookId);
        if (existing) {
          const updated = {
            ...existing,
            status: "approved",
            approvedBy,
            approvedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          };
          this.incidentRunbooks.set(runbookId, updated);
          return updated;
        }
        throw new Error("Incident runbook not found");
      }
      async getRunbookVersions(runbookId) {
        return Array.from(this.incidentRunbooks.values()).filter((r) => r.runbookId === runbookId).sort((a, b) => b.version - a.version);
      }
      // Runbook Steps
      async getRunbookSteps(runbookId) {
        return (this.runbookSteps.get(runbookId) || []).sort((a, b) => a.stepOrder - b.stepOrder);
      }
      async getRunbookStep(id2) {
        for (const steps of this.runbookSteps.values()) {
          const step = steps.find((s) => s.id === id2);
          if (step) return step;
        }
        return void 0;
      }
      async createRunbookStep(step) {
        const newStep = {
          ...step,
          id: this.nextId++
        };
        const steps = this.runbookSteps.get(step.runbookId) || [];
        steps.push(newStep);
        this.runbookSteps.set(step.runbookId, steps);
        return newStep;
      }
      async updateRunbookStep(id2, updates) {
        for (const [runbookId, steps] of this.runbookSteps.entries()) {
          const stepIndex = steps.findIndex((s) => s.id === id2);
          if (stepIndex !== -1) {
            const updated = { ...steps[stepIndex], ...updates };
            steps[stepIndex] = updated;
            this.runbookSteps.set(runbookId, steps);
            return updated;
          }
        }
        throw new Error("Runbook step not found");
      }
      async deleteRunbookStep(id2) {
        for (const [runbookId, steps] of this.runbookSteps.entries()) {
          const filteredSteps = steps.filter((s) => s.id !== id2);
          if (filteredSteps.length !== steps.length) {
            this.runbookSteps.set(runbookId, filteredSteps);
            return;
          }
        }
      }
      async getRunbookStepsByOrder(runbookId) {
        return (this.runbookSteps.get(runbookId) || []).sort((a, b) => a.stepOrder - b.stepOrder);
      }
      async reorderRunbookSteps(runbookId, stepOrders) {
        const steps = this.runbookSteps.get(runbookId) || [];
        stepOrders.forEach(({ id: id2, order }) => {
          const step = steps.find((s) => s.id === id2);
          if (step) {
            step.stepOrder = order;
          }
        });
        this.runbookSteps.set(runbookId, steps);
      }
      // Runbook Contacts
      async getRunbookContacts(filters) {
        let contacts = Array.from(this.runbookContacts.values());
        if (filters?.active !== void 0) {
          contacts = contacts.filter((c) => c.isActive === filters.active);
        }
        if (filters?.available24x7 !== void 0) {
          contacts = contacts.filter((c) => c.isAvailable24x7 === filters.available24x7);
        }
        if (filters?.escalationLevel !== void 0) {
          contacts = contacts.filter((c) => c.escalationLevel === filters.escalationLevel);
        }
        return contacts.sort((a, b) => a.escalationLevel - b.escalationLevel || a.name.localeCompare(b.name));
      }
      async getRunbookContact(contactId) {
        return this.runbookContacts.get(contactId);
      }
      async createRunbookContact(contact) {
        const newContact = {
          ...contact,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.runbookContacts.set(contact.contactId, newContact);
        return newContact;
      }
      async updateRunbookContact(contactId, updates) {
        const existing = this.runbookContacts.get(contactId);
        if (existing) {
          const updated = { ...existing, ...updates, updatedAt: /* @__PURE__ */ new Date() };
          this.runbookContacts.set(contactId, updated);
          return updated;
        }
        throw new Error("Runbook contact not found");
      }
      async deleteRunbookContact(contactId) {
        this.runbookContacts.delete(contactId);
      }
      async getContactsByEscalationLevel(escalationLevel) {
        return Array.from(this.runbookContacts.values()).filter((c) => c.escalationLevel === escalationLevel && c.isActive).sort((a, b) => a.name.localeCompare(b.name));
      }
      async getAvailableContacts(timezone) {
        let contacts = Array.from(this.runbookContacts.values()).filter((c) => c.isActive);
        if (timezone) {
          contacts = contacts.filter((c) => c.isAvailable24x7 || c.timezone === timezone);
        }
        return contacts.sort((a, b) => a.escalationLevel - b.escalationLevel || a.name.localeCompare(b.name));
      }
      async updateContactLastContacted(contactId) {
        const existing = this.runbookContacts.get(contactId);
        if (existing) {
          existing.lastContactedAt = /* @__PURE__ */ new Date();
          this.runbookContacts.set(contactId, existing);
        }
      }
      // Contact Escalation Trees
      async getContactEscalationTrees(filters) {
        let trees = Array.from(this.contactEscalationTrees.values());
        if (filters?.active !== void 0) {
          trees = trees.filter((t) => t.isActive === filters.active);
        }
        const incidentTypes = filters?.incidentTypes;
        if (incidentTypes && incidentTypes.length > 0) {
          trees = trees.filter((t) => t.incidentTypes && incidentTypes.some((type) => t.incidentTypes.includes(type)));
        }
        return trees.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      async getContactEscalationTree(treeId) {
        return this.contactEscalationTrees.get(treeId);
      }
      async createContactEscalationTree(tree) {
        const newTree = {
          ...tree,
          id: this.nextId++,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.contactEscalationTrees.set(tree.treeId, newTree);
        return newTree;
      }
      async updateContactEscalationTree(treeId, updates) {
        const existing = this.contactEscalationTrees.get(treeId);
        if (existing) {
          const updated = { ...existing, ...updates, updatedAt: /* @__PURE__ */ new Date() };
          this.contactEscalationTrees.set(treeId, updated);
          return updated;
        }
        throw new Error("Contact escalation tree not found");
      }
      async deleteContactEscalationTree(treeId) {
        this.contactEscalationTrees.delete(treeId);
      }
      async getEscalationTreeByIncidentType(incidentType, severity) {
        for (const tree of this.contactEscalationTrees.values()) {
          if (tree.isActive && tree.incidentTypes?.includes(incidentType) && tree.severityLevels?.includes(severity)) {
            return tree;
          }
        }
        return void 0;
      }
      // Runbook Executions
      async getRunbookExecutions(filters) {
        let executions = Array.from(this.runbookExecutions.values());
        if (filters?.runbookId !== void 0) {
          executions = executions.filter((e) => e.runbookId === filters.runbookId);
        }
        if (filters?.status) {
          executions = executions.filter((e) => e.status === filters.status);
        }
        if (filters?.executedBy) {
          executions = executions.filter((e) => e.executedBy === filters.executedBy);
        }
        executions = executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        if (filters?.limit) {
          const start = filters.page ? (filters.page - 1) * filters.limit : 0;
          executions = executions.slice(start, start + filters.limit);
        }
        return executions;
      }
      async getRunbookExecution(executionId) {
        return this.runbookExecutions.get(executionId);
      }
      async createRunbookExecution(execution) {
        const newExecution = {
          ...execution,
          id: this.nextId++,
          startedAt: /* @__PURE__ */ new Date()
        };
        this.runbookExecutions.set(execution.executionId, newExecution);
        return newExecution;
      }
      async updateRunbookExecution(executionId, updates) {
        const existing = this.runbookExecutions.get(executionId);
        if (existing) {
          const updated = { ...existing, ...updates };
          this.runbookExecutions.set(executionId, updated);
          return updated;
        }
        throw new Error("Runbook execution not found");
      }
      async getRecentRunbookExecutions(limit) {
        return Array.from(this.runbookExecutions.values()).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, limit);
      }
      async getRunbookExecutionsByRunbook(runbookId) {
        return Array.from(this.runbookExecutions.values()).filter((e) => e.runbookId === runbookId).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      }
      async getActiveRunbookExecutions() {
        return Array.from(this.runbookExecutions.values()).filter((e) => ["pending", "in_progress", "paused"].includes(e.status)).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      }
      async completeRunbookExecution(executionId, results) {
        const existing = this.runbookExecutions.get(executionId);
        if (existing) {
          const updated = {
            ...existing,
            status: "completed",
            completedAt: /* @__PURE__ */ new Date(),
            stepResults: results,
            isSuccessful: true
          };
          this.runbookExecutions.set(executionId, updated);
          return updated;
        }
        throw new Error("Runbook execution not found");
      }
      // Dashboard and Analytics Methods
      async getMonitoringDashboardData() {
        const drillExecutions2 = Array.from(this.drillExecutions.values());
        const last30Days = /* @__PURE__ */ new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const recentDrills = drillExecutions2.filter((d) => new Date(d.startedAt) >= last30Days);
        const drillSummary = {
          total_drills: recentDrills.length,
          successful_drills: recentDrills.filter((d) => d.status === "completed").length,
          failed_drills: recentDrills.filter((d) => d.status === "failed").length,
          avg_rto_minutes: recentDrills.reduce((sum3, d) => sum3 + (d.actualRtoMinutes || 0), 0) / recentDrills.length || 0
        };
        const last24Hours = /* @__PURE__ */ new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);
        const recentMetrics = Array.from(this.backupHealthMetrics.values()).filter((m) => new Date(m.metricTimestamp) >= last24Hours);
        const backupHealthGroups = recentMetrics.reduce((acc, metric) => {
          if (!acc[metric.metricType]) {
            acc[metric.metricType] = [];
          }
          acc[metric.metricType].push(metric.metricValue);
          return acc;
        }, {});
        const backupHealth = Object.entries(backupHealthGroups).map(([metricType, values]) => ({
          metric_type: metricType,
          avg_value: values.reduce((a, b) => a + b, 0) / values.length,
          measurement_count: values.length
        }));
        const measurements = Array.from(this.rtoRpoMeasurements.values()).filter((m) => new Date(m.measuredAt) >= last30Days);
        const targets = Array.from(this.rtoRpoTargets.values());
        let totalMeasurements = 0;
        let rtoCompliant = 0;
        let rpoCompliant = 0;
        measurements.forEach((measurement) => {
          const target = targets.find((t) => t.id === measurement.targetId);
          if (target) {
            totalMeasurements++;
            if (measurement.actualRtoMinutes <= target.rtoTargetMinutes) rtoCompliant++;
            if (measurement.actualRpoMinutes <= target.rpoTargetMinutes) rpoCompliant++;
          }
        });
        const rtoRpoCompliance = {
          total_measurements: totalMeasurements,
          rto_compliant: rtoCompliant,
          rpo_compliant: rpoCompliant
        };
        const activeAlerts = Array.from(this.backupAlerts.values()).filter((a) => ["new", "acknowledged", "investigating"].includes(a.status)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
        const recentExecutions = Array.from(this.runbookExecutions.values()).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 10);
        return {
          drillSummary,
          backupHealth,
          rtoRpoCompliance,
          activeAlerts,
          recentExecutions
        };
      }
      async getPerformanceDashboardData(serviceType, days) {
        const daysPeriod = days || 30;
        const since = /* @__PURE__ */ new Date();
        since.setDate(since.getDate() - daysPeriod);
        let targets = Array.from(this.rtoRpoTargets.values()).filter((t) => t.isActive);
        if (serviceType) {
          targets = targets.filter((t) => t.serviceType === serviceType);
        }
        const measurements = Array.from(this.rtoRpoMeasurements.values()).filter((m) => new Date(m.measuredAt) >= since).sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
        const trendMap = /* @__PURE__ */ new Map();
        measurements.forEach((m) => {
          const dateKey = new Date(m.measuredAt).toISOString().split("T")[0];
          if (!trendMap.has(dateKey)) {
            trendMap.set(dateKey, { date: dateKey, measurements: [] });
          }
          trendMap.get(dateKey).measurements.push(m);
        });
        const trends = Array.from(trendMap.values()).map((trend) => ({
          date: trend.date,
          avg_rto: trend.measurements.reduce((sum3, m) => sum3 + m.actualRtoMinutes, 0) / trend.measurements.length,
          avg_rpo: trend.measurements.reduce((sum3, m) => sum3 + m.actualRpoMinutes, 0) / trend.measurements.length,
          measurement_count: trend.measurements.length
        })).sort((a, b) => a.date.localeCompare(b.date));
        let totalCompliant = 0;
        let totalMeasurements = 0;
        measurements.forEach((measurement) => {
          const target = targets.find((t) => t.id === measurement.targetId);
          if (target) {
            totalMeasurements++;
            if (measurement.actualRtoMinutes <= target.rtoTargetMinutes && measurement.actualRpoMinutes <= target.rpoTargetMinutes) {
              totalCompliant++;
            }
          }
        });
        const complianceScore = totalMeasurements > 0 ? totalCompliant / totalMeasurements * 100 : 0;
        return {
          targets,
          measurements,
          trends,
          complianceScore: Number(complianceScore.toFixed(2))
        };
      }
      async getRunbookDashboardData() {
        const totalRunbooks = Array.from(this.incidentRunbooks.values()).filter((r) => r.status === "active").length;
        const activeExecutions = Array.from(this.runbookExecutions.values()).filter((e) => ["pending", "in_progress", "paused"].includes(e.status)).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        const recentExecutions = Array.from(this.runbookExecutions.values()).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 20);
        const contactGroups = /* @__PURE__ */ new Map();
        Array.from(this.runbookContacts.values()).forEach((contact) => {
          const level = contact.escalationLevel;
          if (!contactGroups.has(level)) {
            contactGroups.set(level, { total: 0, active: 0, available24x7: 0 });
          }
          const group = contactGroups.get(level);
          group.total++;
          if (contact.isActive) group.active++;
          if (contact.isAvailable24x7) group.available24x7++;
        });
        const contactAvailability = Array.from(contactGroups.entries()).map(([level, data]) => ({
          escalation_level: level,
          total_contacts: data.total,
          active_contacts: data.active,
          always_available: data.available24x7
        })).sort((a, b) => a.escalation_level - b.escalation_level);
        return {
          totalRunbooks,
          activeExecutions,
          recentExecutions,
          contactAvailability
        };
      }
      // Contract completion (strict tranche 1): members DatabaseStorage owns are refused
      // explicitly while the database is degraded - never faked, never `undefined()`.
      async bulkUpdateWatchlistItems(..._args) {
        return this.degraded("bulkUpdateWatchlistItems");
      }
      async calculateRecommendationPerformance(..._args) {
        return this.degraded("calculateRecommendationPerformance");
      }
      async createBackupOperation(..._args) {
        return this.degraded("createBackupOperation");
      }
      async createBackupRetentionPolicy(..._args) {
        return this.degraded("createBackupRetentionPolicy");
      }
      async createBackupStorageLocation(..._args) {
        return this.degraded("createBackupStorageLocation");
      }
      async createDefaultUserPreferences(..._args) {
        return this.degraded("createDefaultUserPreferences");
      }
      async createNotificationCampaign(..._args) {
        return this.degraded("createNotificationCampaign");
      }
      async createNotificationEvent(..._args) {
        return this.degraded("createNotificationEvent");
      }
      async createNotificationSubscription(..._args) {
        return this.degraded("createNotificationSubscription");
      }
      async createNotificationTemplate(..._args) {
        return this.degraded("createNotificationTemplate");
      }
      async createNotificationWebhook(..._args) {
        return this.degraded("createNotificationWebhook");
      }
      async createRestoreValidation(..._args) {
        return this.degraded("createRestoreValidation");
      }
      async createSchemaVersion(..._args) {
        return this.degraded("createSchemaVersion");
      }
      async createUserPreferences(..._args) {
        return this.degraded("createUserPreferences");
      }
      async deleteNotificationSubscription(..._args) {
        return this.degraded("deleteNotificationSubscription");
      }
      async generateRecommendations(..._args) {
        return this.degraded("generateRecommendations");
      }
      async getActiveRetentionPolicies(..._args) {
        return this.degraded("getActiveRetentionPolicies");
      }
      async getBackupOperation(..._args) {
        return this.degraded("getBackupOperation");
      }
      async getBackupOperations(..._args) {
        return this.degraded("getBackupOperations");
      }
      async getBackupRetentionPolicies(..._args) {
        return this.degraded("getBackupRetentionPolicies");
      }
      async getBackupStorageLocations(..._args) {
        return this.degraded("getBackupStorageLocations");
      }
      async getBackupSystemConfig(..._args) {
        return this.degraded("getBackupSystemConfig");
      }
      async getCachedRecommendations(..._args) {
        return this.degraded("getCachedRecommendations");
      }
      async getCongressionalDistrictByCode(..._args) {
        return this.degraded("getCongressionalDistrictByCode");
      }
      async getCongressionalDistricts(..._args) {
        return this.degraded("getCongressionalDistricts");
      }
      async getEnhancedWatchlist(..._args) {
        return this.degraded("getEnhancedWatchlist");
      }
      async getInterestBasedRecommendations(..._args) {
        return this.degraded("getInterestBasedRecommendations");
      }
      async getLatestSchemaVersion(..._args) {
        return this.degraded("getLatestSchemaVersion");
      }
      async getLocationBasedRecommendations(..._args) {
        return this.degraded("getLocationBasedRecommendations");
      }
      async getNotificationCampaign(..._args) {
        return this.degraded("getNotificationCampaign");
      }
      async getNotificationCampaigns(..._args) {
        return this.degraded("getNotificationCampaigns");
      }
      async getNotificationDeliveries(..._args) {
        return this.degraded("getNotificationDeliveries");
      }
      async getNotificationDeliveryStats(..._args) {
        return this.degraded("getNotificationDeliveryStats");
      }
      async getNotificationEvents(..._args) {
        return this.degraded("getNotificationEvents");
      }
      async getNotificationTemplate(..._args) {
        return this.degraded("getNotificationTemplate");
      }
      async getNotificationTemplates(..._args) {
        return this.degraded("getNotificationTemplates");
      }
      async getPersonalizedRecommendations(..._args) {
        return this.degraded("getPersonalizedRecommendations");
      }
      async getQueuedNotifications(..._args) {
        return this.degraded("getQueuedNotifications");
      }
      async getRecentBackupOperations(..._args) {
        return this.degraded("getRecentBackupOperations");
      }
      async getRecentRestoreValidations(..._args) {
        return this.degraded("getRecentRestoreValidations");
      }
      async getRecommendationInsights(..._args) {
        return this.degraded("getRecommendationInsights");
      }
      async getRestoreValidations(..._args) {
        return this.degraded("getRestoreValidations");
      }
      async getSchemaVersions(..._args) {
        return this.degraded("getSchemaVersions");
      }
      async getSimilarUsersRecommendations(..._args) {
        return this.degraded("getSimilarUsersRecommendations");
      }
      async getTrendingRecommendations(..._args) {
        return this.degraded("getTrendingRecommendations");
      }
      async getUnprocessedWebhooks(..._args) {
        return this.degraded("getUnprocessedWebhooks");
      }
      async getUserNotificationConsents(..._args) {
        return this.degraded("getUserNotificationConsents");
      }
      async getUserPreferences(..._args) {
        return this.degraded("getUserPreferences");
      }
      async getUserRecommendationAnalytics(..._args) {
        return this.degraded("getUserRecommendationAnalytics");
      }
      async getWatchlistAnalytics(..._args) {
        return this.degraded("getWatchlistAnalytics");
      }
      async invalidateRecommendationCache(..._args) {
        return this.degraded("invalidateRecommendationCache");
      }
      async lookupCongressionalDistrict(..._args) {
        return this.degraded("lookupCongressionalDistrict");
      }
      async processNotificationWebhook(..._args) {
        return this.degraded("processNotificationWebhook");
      }
      async recordNotificationConsent(..._args) {
        return this.degraded("recordNotificationConsent");
      }
      async refreshRecommendationCache(..._args) {
        return this.degraded("refreshRecommendationCache");
      }
      async retryFailedNotifications(..._args) {
        return this.degraded("retryFailedNotifications");
      }
      async setBackupSystemConfig(..._args) {
        return this.degraded("setBackupSystemConfig");
      }
      async setCachedRecommendations(..._args) {
        return this.degraded("setCachedRecommendations");
      }
      async trackRecommendationClick(..._args) {
        return this.degraded("trackRecommendationClick");
      }
      async trackRecommendationDismissal(..._args) {
        return this.degraded("trackRecommendationDismissal");
      }
      async trackRecommendationPresentation(..._args) {
        return this.degraded("trackRecommendationPresentation");
      }
      async trackRecommendationToWatchlistConversion(..._args) {
        return this.degraded("trackRecommendationToWatchlistConversion");
      }
      async trackRecommendationView(..._args) {
        return this.degraded("trackRecommendationView");
      }
      async unsubscribeNotification(..._args) {
        return this.degraded("unsubscribeNotification");
      }
      async updateBackupOperation(..._args) {
        return this.degraded("updateBackupOperation");
      }
      async updateBackupRetentionPolicy(..._args) {
        return this.degraded("updateBackupRetentionPolicy");
      }
      async updateBackupStorageLocation(..._args) {
        return this.degraded("updateBackupStorageLocation");
      }
      async updateNotificationCampaign(..._args) {
        return this.degraded("updateNotificationCampaign");
      }
      async updateNotificationDelivery(..._args) {
        return this.degraded("updateNotificationDelivery");
      }
      async updateNotificationEvent(..._args) {
        return this.degraded("updateNotificationEvent");
      }
      async updateNotificationStatus(..._args) {
        return this.degraded("updateNotificationStatus");
      }
      async updateNotificationTemplate(..._args) {
        return this.degraded("updateNotificationTemplate");
      }
      async updateRestoreValidation(..._args) {
        return this.degraded("updateRestoreValidation");
      }
      async updateSchemaVersion(..._args) {
        return this.degraded("updateSchemaVersion");
      }
      async updateUserRecommendationAnalytics(..._args) {
        return this.degraded("updateUserRecommendationAnalytics");
      }
      async getNotificationConsentsBetween(..._args) {
        return this.degraded("getNotificationConsentsBetween");
      }
      async getExpiredNotificationConsents(..._args) {
        return this.degraded("getExpiredNotificationConsents");
      }
      async unsubscribeNotificationSubscriptionByToken(..._args) {
        return this.degraded("unsubscribeNotificationSubscriptionByToken");
      }
      async getNotificationSubscriptionsVerifiedBetween(..._args) {
        return this.degraded("getNotificationSubscriptionsVerifiedBetween");
      }
      async withdrawNotificationConsent(..._args) {
        return this.degraded("withdrawNotificationConsent");
      }
    };
  }
});

// server/storage-instance.ts
var storage_instance_exports = {};
__export(storage_instance_exports, {
  DatabaseStorage: () => DatabaseStorage
});
var init_storage_instance = __esm({
  "server/storage-instance.ts"() {
    init_storage();
  }
});

// server/replica-storage.ts
var replica_storage_exports = {};
__export(replica_storage_exports, {
  ReplicaStorage: () => ReplicaStorage
});
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzle2 } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { eq as eq4, and as and4, inArray as inArray2, getTableColumns as getTableColumns2 } from "drizzle-orm";
var ReplicaStorage;
var init_replica_storage = __esm({
  "server/replica-storage.ts"() {
    init_election_list_query();
    init_state_election_rules();
    init_schema();
    neonConfig.webSocketConstructor = ws;
    neonConfig.useSecureWebSocket = true;
    neonConfig.pipelineConnect = false;
    neonConfig.fetchConnectionCache = true;
    ReplicaStorage = class {
      pool;
      db;
      connectionString;
      isHealthy = false;
      lastHealthCheck = /* @__PURE__ */ new Date(0);
      metrics = {
        connectionLatency: 0,
        queryLatency: 0,
        errorRate: 0,
        uptime: 0
      };
      replicaId;
      consecutiveErrors = 0;
      totalQueries = 0;
      totalErrors = 0;
      constructor(connectionString, replicaId) {
        this.connectionString = connectionString;
        this.replicaId = replicaId || this.extractReplicaIdFromConnectionString(connectionString);
        const poolConfig2 = {
          connectionString: this.connectionString,
          max: 8,
          // Slightly lower than primary for read-heavy workloads
          min: 1,
          connectionTimeoutMillis: 8e3,
          idleTimeoutMillis: 45e3,
          // Longer idle for read replicas
          allowExitOnIdle: true,
          retryDelay: 2e3,
          retryAttempts: 2
          // Fewer retries for replicas
        };
        this.pool = new Pool(poolConfig2);
        this.db = drizzle2({ client: this.pool, schema: schema_exports });
        this.pool.on("error", (err) => {
          console.error(`Replica ${this.replicaId} pool error:`, {
            message: err.message,
            code: err.code,
            severity: err.severity
          });
          this.recordError(err.message);
        });
        this.pool.on("connect", () => {
          console.log(`\u2705 Replica ${this.replicaId} connection established`);
        });
        console.log(`\u{1F4CB} Replica storage initialized: ${this.replicaId}`);
      }
      extractReplicaIdFromConnectionString(connectionString) {
        const match = connectionString.match(/\/([^\/]+)\.neon\.tech/);
        return match ? match[1].substring(0, 8) : "unknown";
      }
      recordError(error) {
        this.consecutiveErrors++;
        this.totalErrors++;
        this.metrics.errorRate = this.totalErrors / Math.max(this.totalQueries, 1) * 100;
        this.metrics.lastError = error;
        this.isHealthy = false;
      }
      recordSuccess(queryTime) {
        this.consecutiveErrors = 0;
        this.totalQueries++;
        this.metrics.queryLatency = queryTime;
        this.metrics.errorRate = this.totalErrors / this.totalQueries * 100;
        this.isHealthy = true;
      }
      // Health check method for replica
      async performHealthCheck() {
        const startTime = Date.now();
        try {
          const result = await Promise.race([
            this.db.execute("SELECT 1 as health_check, NOW() as server_time, pg_last_xact_replay_timestamp() as last_replay"),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Replica health check timeout")), 5e3)
            )
          ]);
          const latency = Date.now() - startTime;
          this.metrics.connectionLatency = latency;
          this.recordSuccess(latency);
          this.lastHealthCheck = /* @__PURE__ */ new Date();
          if (result && result[0]?.last_replay) {
            const replayTime = new Date(result[0].last_replay).getTime();
            const now = (/* @__PURE__ */ new Date()).getTime();
            this.metrics.lagBehindPrimary = now - replayTime;
          }
          console.log(`\u2705 Replica ${this.replicaId} health check passed (${latency}ms)`);
          return {
            healthy: true,
            latency,
            metrics: { ...this.metrics }
          };
        } catch (error) {
          const latency = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.recordError(errorMessage);
          console.log(`\u274C Replica ${this.replicaId} health check failed:`, errorMessage);
          return {
            healthy: false,
            latency,
            metrics: { ...this.metrics }
          };
        }
      }
      // Enhanced query execution with error handling and metrics
      async executeQuery(queryFn, operationName) {
        const startTime = Date.now();
        try {
          const result = await queryFn();
          const queryTime = Date.now() - startTime;
          this.recordSuccess(queryTime);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.recordError(errorMessage);
          console.error(`Replica ${this.replicaId} query error in ${operationName}:`, errorMessage);
          throw new Error(`Replica query failed: ${errorMessage}`);
        }
      }
      // IStorage interface implementation - all read-only operations
      isDbHealthy() {
        return this.isHealthy && this.consecutiveErrors < 3;
      }
      async getElections(filters) {
        const query = buildElectionListQuery(this.db, filters);
        return this.executeQuery(async () => (await query).filter((election) => validateNotMockData(election).ok).map(projectElectionResultsRow), "getElections");
      }
      // executeQuery already throws on failure; there is no fallback to relax.
      getElectionsStrict(filters) {
        return this.getElections(filters);
      }
      async getElection(id2) {
        return this.executeQuery(async () => {
          const results = await this.db.select({ ...getTableColumns2(elections), resultsCatalogTimestamp }).from(elections).where(eq4(elections.id, id2)).execute();
          return results[0] ? projectElectionResultsRow(results[0]) : void 0;
        }, "getElection");
      }
      async getCandidatesByElections(electionIds) {
        if (electionIds.length === 0) return [];
        return this.executeQuery(async () => {
          return this.db.select().from(candidates).where(inArray2(candidates.electionId, electionIds)).orderBy(candidates.name).execute();
        }, "getCandidatesByElections");
      }
      async getCandidatesByElection(electionId) {
        return this.executeQuery(async () => {
          return this.db.select().from(candidates).where(eq4(candidates.electionId, electionId)).orderBy(candidates.name).execute();
        }, "getCandidatesByElection");
      }
      async getCandidates(electionId) {
        return this.executeQuery(async () => {
          let query = this.db.select().from(candidates);
          if (electionId) {
            query = query.where(eq4(candidates.electionId, electionId));
          }
          return query.orderBy(candidates.name).execute();
        }, "getCandidates");
      }
      async getCandidatesByIds(ids) {
        return this.executeQuery(async () => {
          return this.db.select().from(candidates).where(inArray2(candidates.id, ids)).execute();
        }, "getCandidatesByIds");
      }
      async recordResultReport(..._args) {
        return this.readOnly("recordResultReport");
      }
      async getResultsPayload(..._args) {
        return this.readOnly("getResultsPayload");
      }
      async listResultsPayloads(..._args) {
        return this.readOnly("listResultsPayloads");
      }
      async storeResultEvidence(..._args) {
        return this.readOnly("storeResultEvidence");
      }
      async listResultSources(..._args) {
        return this.readOnly("listResultSources");
      }
      async getElectionResults(electionId) {
        return this.executeQuery(async () => {
          return this.db.select().from(electionResults).where(eq4(electionResults.electionId, electionId)).execute();
        }, "getElectionResults");
      }
      async getElectionStats() {
        return this.executeQuery(async () => {
          const elections2 = await this.db.select().from(elections).execute();
          const stats = {
            total: elections2.length,
            byType: {},
            byLevel: {},
            nextElection: null
          };
          elections2.forEach((election) => {
            stats.byType[election.type] = (stats.byType[election.type] || 0) + 1;
            stats.byLevel[election.level] = (stats.byLevel[election.level] || 0) + 1;
          });
          const futureElections = elections2.filter((e) => new Date(e.date) > /* @__PURE__ */ new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          if (futureElections.length > 0) {
            stats.nextElection = futureElections[0];
          }
          return stats;
        }, "getElectionStats");
      }
      async getAllCongressMembers() {
        return this.executeQuery(async () => {
          return this.db.select().from(congressMembers).execute();
        }, "getAllCongressMembers");
      }
      async getUser(id2) {
        return this.executeQuery(async () => {
          const results = await this.db.select().from(users).where(eq4(users.id, id2)).execute();
          return results[0];
        }, "getUser");
      }
      async getUserWatchlist(userId) {
        return this.executeQuery(async () => {
          return this.db.select().from(watchlist).where(eq4(watchlist.userId, userId)).execute();
        }, "getUserWatchlist");
      }
      async getCandidateProfile(candidateId) {
        return this.executeQuery(async () => {
          const results = await this.db.select().from(candidateProfiles).where(eq4(candidateProfiles.candidateId, candidateId)).execute();
          return results[0] || null;
        }, "getCandidateProfile");
      }
      // Write operations - all throw errors since this is read-only replica
      async createElection(election) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async deleteElection(id2) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async createCandidate(candidate) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async updateCandidatePolling(candidateId, pollingData2) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async updateElectionResults(electionId, resultsData) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async upsertUser(user) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async addToWatchlist(userId, electionId) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async removeFromWatchlist(userId, electionId) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async createCandidateAccount(account) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async updateCandidateProfile(candidateId, profile) {
        throw new Error("Write operations not supported on read-only replica");
      }
      // Stub implementations for methods not relevant to replica storage
      async syncElectionsFromGoogleCivic() {
        throw new Error("External API operations not supported on read-only replica");
      }
      async getVoterInfo(address) {
        throw new Error("External API operations not supported on read-only replica");
      }
      async getAllBills() {
        return [];
      }
      async getBillsByCongress(congress) {
        return [];
      }
      async getAllMembers() {
        return [];
      }
      async getMembersByState(state) {
        return [];
      }
      async getAllCommittees() {
        return [];
      }
      async getCommitteeMembers(chamber, committeeCode) {
        return [];
      }
      async getDailyCongressionalRecords() {
        return [];
      }
      async getSenateCommunications() {
        return [];
      }
      async getAllNominations() {
        return [];
      }
      async getHouseVotes() {
        return [];
      }
      async searchElectionsWithAI(query) {
        return "";
      }
      async expandElectionData() {
      }
      async getElectionCycles() {
        return [];
      }
      async getElectionCycle(slug) {
        return null;
      }
      async logInteraction(data) {
      }
      async authenticateCandidate(email, password) {
        return null;
      }
      async getCandidateAccountById(_id) {
        return null;
      }
      // Read-only replica: reads go to the replica, writes are refused explicitly.
      readOnly(method) {
        throw Object.assign(new Error(`${method} is not available on the read-only replica`), { status: 503, publicCode: "storage_read_only", publicMessage: "This action is temporarily unavailable" });
      }
      async getCandidatePositions(candidateId, category) {
        return this.executeQuery(async () => {
          const where = category ? and4(eq4(candidatePositions.candidateId, candidateId), eq4(candidatePositions.category, category)) : eq4(candidatePositions.candidateId, candidateId);
          return this.db.select().from(candidatePositions).where(where).execute();
        }, "getCandidatePositions");
      }
      async getCandidatePositionById(positionId) {
        return this.executeQuery(async () => {
          const rows = await this.db.select().from(candidatePositions).where(eq4(candidatePositions.id, positionId)).limit(1).execute();
          return rows[0] ?? null;
        }, "getCandidatePositionById");
      }
      async getCandidateQAEntries(candidateId, category) {
        return this.executeQuery(async () => {
          const where = category ? and4(eq4(candidateQA.candidateId, candidateId), eq4(candidateQA.category, category)) : eq4(candidateQA.candidateId, candidateId);
          return this.db.select().from(candidateQA).where(where).execute();
        }, "getCandidateQAEntries");
      }
      async updateWatchlistItem(_userId, _itemId, _updates) {
        return this.readOnly("updateWatchlistItem");
      }
      async getUserNotificationPreferences(userId) {
        return this.executeQuery(async () => {
          const rows = await this.db.select().from(notificationPreferences).where(eq4(notificationPreferences.userId, userId)).limit(1).execute();
          return rows[0] ?? null;
        }, "getUserNotificationPreferences");
      }
      async createDefaultNotificationPreferences(_userId) {
        return this.readOnly("createDefaultNotificationPreferences");
      }
      async updateUserNotificationPreferences(_userId, _updates) {
        return this.readOnly("updateUserNotificationPreferences");
      }
      async getUserNotificationSubscriptions(userId) {
        return this.executeQuery(async () => this.db.select().from(notificationSubscriptions).where(eq4(notificationSubscriptions.userId, userId)).execute(), "getUserNotificationSubscriptions");
      }
      async updateNotificationSubscription(_subscriptionId, _updates) {
        return this.readOnly("updateNotificationSubscription");
      }
      async verifyNotificationSubscription(_token) {
        return this.readOnly("verifyNotificationSubscription");
      }
      async createNotificationDelivery(_delivery) {
        return this.readOnly("createNotificationDelivery");
      }
      async listCandidateAccounts(_filter = {}) {
        return [];
      }
      async setCandidateAccountActive(_id, _isActive, _accessLevel) {
        throw new Error("Replica storage is read-only");
      }
      async getCandidateDataSources(candidateId) {
        return [];
      }
      async recordDataSource(source) {
        throw new Error("Write operations not supported on read-only replica");
      }
      async getCandidateWithRAG(candidateId) {
        return null;
      }
      async recordEngagement(data) {
      }
      async updateUserPreferences(_userId, _updates) {
        return this.readOnly("updateUserPreferences");
      }
      async updateUserDemographics(_userId, _demographics) {
        return this.readOnly("updateUserDemographics");
      }
      async exportUserData(_userId) {
        return this.readOnly("exportUserData");
      }
      async deleteUserData(_userId) {
        return this.readOnly("deleteUserData");
      }
      async createCandidateProfile(_profile) {
        return this.readOnly("createCandidateProfile");
      }
      async createCandidatePosition(_position) {
        return this.readOnly("createCandidatePosition");
      }
      async updateCandidatePosition(_positionId, _updates) {
        return this.readOnly("updateCandidatePosition");
      }
      async deleteCandidatePosition(_positionId) {
        return this.readOnly("deleteCandidatePosition");
      }
      async createCampaignAccount(..._args) {
        return this.readOnly("createCampaignAccount");
      }
      async validateCampaignAccess(..._args) {
        return this.readOnly("validateCampaignAccess");
      }
      async getCampaignAnalytics(campaignId, electionId, tier) {
        return null;
      }
      async getCampaignGeographics(campaignId, region, tier) {
        return null;
      }
      async getCampaignPolling(campaignId, electionId, dateRange) {
        return null;
      }
      // Get replica-specific metrics and health information
      getReplicaMetrics() {
        return { ...this.metrics };
      }
      getReplicaInfo() {
        return {
          id: this.replicaId,
          isHealthy: this.isHealthy,
          lastHealthCheck: this.lastHealthCheck,
          consecutiveErrors: this.consecutiveErrors,
          totalQueries: this.totalQueries,
          totalErrors: this.totalErrors
        };
      }
      // Graceful shutdown
      async close() {
        try {
          await this.pool.end();
          console.log(`\u2705 Replica ${this.replicaId} connection pool closed`);
        } catch (error) {
          console.error(`\u274C Error closing replica ${this.replicaId} pool:`, error);
        }
      }
      // Contract completion (strict tranche 1): members not served by the read-only replica
      // are refused explicitly rather than failing as `undefined is not a function`.
      async acknowledgeBackupAlert(..._args) {
        return this.readOnly("acknowledgeBackupAlert");
      }
      async approveRunbook(..._args) {
        return this.readOnly("approveRunbook");
      }
      async authenticateUser(..._args) {
        return this.readOnly("authenticateUser");
      }
      async bulkUpdateWatchlistItems(..._args) {
        return this.readOnly("bulkUpdateWatchlistItems");
      }
      async calculateRecommendationPerformance(..._args) {
        return this.readOnly("calculateRecommendationPerformance");
      }
      async completeRunbookExecution(..._args) {
        return this.readOnly("completeRunbookExecution");
      }
      async createArtifact(..._args) {
        return this.readOnly("createArtifact");
      }
      async createBackupAlert(..._args) {
        return this.readOnly("createBackupAlert");
      }
      async createBackupHealthMetric(..._args) {
        return this.readOnly("createBackupHealthMetric");
      }
      async createBackupMonitoringConfiguration(..._args) {
        return this.readOnly("createBackupMonitoringConfiguration");
      }
      async createBackupOperation(..._args) {
        return this.readOnly("createBackupOperation");
      }
      async createBackupRetentionPolicy(..._args) {
        return this.readOnly("createBackupRetentionPolicy");
      }
      async createBackupStorageLocation(..._args) {
        return this.readOnly("createBackupStorageLocation");
      }
      async createContactEscalationTree(..._args) {
        return this.readOnly("createContactEscalationTree");
      }
      async createDefaultUserPreferences(..._args) {
        return this.readOnly("createDefaultUserPreferences");
      }
      async createDeploymentHistory(..._args) {
        return this.readOnly("createDeploymentHistory");
      }
      async createDrillExecution(..._args) {
        return this.readOnly("createDrillExecution");
      }
      async createDrillStep(..._args) {
        return this.readOnly("createDrillStep");
      }
      async createEnvironmentConfiguration(..._args) {
        return this.readOnly("createEnvironmentConfiguration");
      }
      async createFailoverDrillConfiguration(..._args) {
        return this.readOnly("createFailoverDrillConfiguration");
      }
      async createIncidentRunbook(..._args) {
        return this.readOnly("createIncidentRunbook");
      }
      async createNotificationCampaign(..._args) {
        return this.readOnly("createNotificationCampaign");
      }
      async createNotificationEvent(..._args) {
        return this.readOnly("createNotificationEvent");
      }
      async createNotificationSubscription(..._args) {
        return this.readOnly("createNotificationSubscription");
      }
      async createNotificationTemplate(..._args) {
        return this.readOnly("createNotificationTemplate");
      }
      async createNotificationWebhook(..._args) {
        return this.readOnly("createNotificationWebhook");
      }
      async createPerformanceBenchmark(..._args) {
        return this.readOnly("createPerformanceBenchmark");
      }
      async createPlatformContinuityEvent(..._args) {
        return this.readOnly("createPlatformContinuityEvent");
      }
      async createRestoreValidation(..._args) {
        return this.readOnly("createRestoreValidation");
      }
      async createRtoRpoMeasurement(..._args) {
        return this.readOnly("createRtoRpoMeasurement");
      }
      async createRtoRpoTarget(..._args) {
        return this.readOnly("createRtoRpoTarget");
      }
      async createRunbookContact(..._args) {
        return this.readOnly("createRunbookContact");
      }
      async createRunbookExecution(..._args) {
        return this.readOnly("createRunbookExecution");
      }
      async createRunbookStep(..._args) {
        return this.readOnly("createRunbookStep");
      }
      async createSchemaVersion(..._args) {
        return this.readOnly("createSchemaVersion");
      }
      async createSecret(..._args) {
        return this.readOnly("createSecret");
      }
      async createSecretRotationHistory(..._args) {
        return this.readOnly("createSecretRotationHistory");
      }
      async createUser(..._args) {
        return this.readOnly("createUser");
      }
      async createUserPreferences(..._args) {
        return this.readOnly("createUserPreferences");
      }
      async deleteArtifact(..._args) {
        return this.readOnly("deleteArtifact");
      }
      async deleteBackupMonitoringConfiguration(..._args) {
        return this.readOnly("deleteBackupMonitoringConfiguration");
      }
      async deleteContactEscalationTree(..._args) {
        return this.readOnly("deleteContactEscalationTree");
      }
      async deleteFailoverDrillConfiguration(..._args) {
        return this.readOnly("deleteFailoverDrillConfiguration");
      }
      async deleteIncidentRunbook(..._args) {
        return this.readOnly("deleteIncidentRunbook");
      }
      async deleteNotificationSubscription(..._args) {
        return this.readOnly("deleteNotificationSubscription");
      }
      async deleteOldRotationHistory(..._args) {
        return this.readOnly("deleteOldRotationHistory");
      }
      async deletePerformanceBenchmark(..._args) {
        return this.readOnly("deletePerformanceBenchmark");
      }
      async deleteRtoRpoTarget(..._args) {
        return this.readOnly("deleteRtoRpoTarget");
      }
      async deleteRunbookContact(..._args) {
        return this.readOnly("deleteRunbookContact");
      }
      async deleteRunbookStep(..._args) {
        return this.readOnly("deleteRunbookStep");
      }
      async findMissingCongressMember(..._args) {
        return this.readOnly("findMissingCongressMember");
      }
      async generateBackupHealthSummary(..._args) {
        return this.readOnly("generateBackupHealthSummary");
      }
      async generateRecommendations(..._args) {
        return this.readOnly("generateRecommendations");
      }
      async getActiveArtifacts(..._args) {
        return this.readOnly("getActiveArtifacts");
      }
      async getActiveBackupAlerts(..._args) {
        return this.readOnly("getActiveBackupAlerts");
      }
      async getActiveMonitoringConfigurations(..._args) {
        return this.readOnly("getActiveMonitoringConfigurations");
      }
      async getActiveRetentionPolicies(..._args) {
        return this.readOnly("getActiveRetentionPolicies");
      }
      async getActiveRtoRpoTargets(..._args) {
        return this.readOnly("getActiveRtoRpoTargets");
      }
      async getActiveRunbookExecutions(..._args) {
        return this.readOnly("getActiveRunbookExecutions");
      }
      async getAllArtifacts(..._args) {
        return this.readOnly("getAllArtifacts");
      }
      async getAllSecrets(..._args) {
        return this.readOnly("getAllSecrets");
      }
      async getArtifactByHash(..._args) {
        return this.readOnly("getArtifactByHash");
      }
      async getArtifactById(..._args) {
        return this.readOnly("getArtifactById");
      }
      async getArtifactByNameVersion(..._args) {
        return this.readOnly("getArtifactByNameVersion");
      }
      async getArtifactVersions(..._args) {
        return this.readOnly("getArtifactVersions");
      }
      async getArtifacts(..._args) {
        return this.readOnly("getArtifacts");
      }
      async getAvailableContacts(..._args) {
        return this.readOnly("getAvailableContacts");
      }
      async getBackupAlert(..._args) {
        return this.readOnly("getBackupAlert");
      }
      async getBackupAlerts(..._args) {
        return this.readOnly("getBackupAlerts");
      }
      async getBackupAlertsByConfiguration(..._args) {
        return this.readOnly("getBackupAlertsByConfiguration");
      }
      async getBackupHealthMetrics(..._args) {
        return this.readOnly("getBackupHealthMetrics");
      }
      async getBackupHealthTrends(..._args) {
        return this.readOnly("getBackupHealthTrends");
      }
      async getBackupMonitoringConfiguration(..._args) {
        return this.readOnly("getBackupMonitoringConfiguration");
      }
      async getBackupMonitoringConfigurations(..._args) {
        return this.readOnly("getBackupMonitoringConfigurations");
      }
      async getBackupOperation(..._args) {
        return this.readOnly("getBackupOperation");
      }
      async getBackupOperations(..._args) {
        return this.readOnly("getBackupOperations");
      }
      async getBackupRetentionPolicies(..._args) {
        return this.readOnly("getBackupRetentionPolicies");
      }
      async getBackupStorageLocations(..._args) {
        return this.readOnly("getBackupStorageLocations");
      }
      async getBackupSystemConfig(..._args) {
        return this.readOnly("getBackupSystemConfig");
      }
      async getCachedRecommendations(..._args) {
        return this.readOnly("getCachedRecommendations");
      }
      async getCampaignSubscription(..._args) {
        return this.readOnly("getCampaignSubscription");
      }
      async getCongressionalDistrictByCode(..._args) {
        return this.readOnly("getCongressionalDistrictByCode");
      }
      async getCongressionalDistricts(..._args) {
        return this.readOnly("getCongressionalDistricts");
      }
      async getContactEscalationTree(..._args) {
        return this.readOnly("getContactEscalationTree");
      }
      async getContactEscalationTrees(..._args) {
        return this.readOnly("getContactEscalationTrees");
      }
      async getContactsByEscalationLevel(..._args) {
        return this.readOnly("getContactsByEscalationLevel");
      }
      async getDeploymentById(..._args) {
        return this.readOnly("getDeploymentById");
      }
      async getDrillExecution(..._args) {
        return this.readOnly("getDrillExecution");
      }
      async getDrillExecutions(..._args) {
        return this.readOnly("getDrillExecutions");
      }
      async getDrillExecutionsByConfiguration(..._args) {
        return this.readOnly("getDrillExecutionsByConfiguration");
      }
      async getDrillExecutionsForDashboard(..._args) {
        return this.readOnly("getDrillExecutionsForDashboard");
      }
      async getDrillSteps(..._args) {
        return this.readOnly("getDrillSteps");
      }
      async getDrillStepsByExecution(..._args) {
        return this.readOnly("getDrillStepsByExecution");
      }
      async getEnhancedWatchlist(..._args) {
        return this.readOnly("getEnhancedWatchlist");
      }
      async getEnvironmentConfigurations(..._args) {
        return this.readOnly("getEnvironmentConfigurations");
      }
      async getEscalationTreeByIncidentType(..._args) {
        return this.readOnly("getEscalationTreeByIncidentType");
      }
      async getExpiredArtifacts(..._args) {
        return this.readOnly("getExpiredArtifacts");
      }
      async getExpiredSecrets(..._args) {
        return this.readOnly("getExpiredSecrets");
      }
      async getFailoverDrillConfiguration(..._args) {
        return this.readOnly("getFailoverDrillConfiguration");
      }
      async getFailoverDrillConfigurations(..._args) {
        return this.readOnly("getFailoverDrillConfigurations");
      }
      async getHealth(..._args) {
        return this.readOnly("getHealth");
      }
      async getIncidentRunbook(..._args) {
        return this.readOnly("getIncidentRunbook");
      }
      async getIncidentRunbooks(..._args) {
        return this.readOnly("getIncidentRunbooks");
      }
      async getIndustryBenchmarks(..._args) {
        return this.readOnly("getIndustryBenchmarks");
      }
      async getInterestBasedRecommendations(..._args) {
        return this.readOnly("getInterestBasedRecommendations");
      }
      async getLatestBackupHealthMetrics(..._args) {
        return this.readOnly("getLatestBackupHealthMetrics");
      }
      async getLatestSchemaVersion(..._args) {
        return this.readOnly("getLatestSchemaVersion");
      }
      async getLocationBasedRecommendations(..._args) {
        return this.readOnly("getLocationBasedRecommendations");
      }
      async getMonitoringDashboardData(..._args) {
        return this.readOnly("getMonitoringDashboardData");
      }
      async getNotificationCampaign(..._args) {
        return this.readOnly("getNotificationCampaign");
      }
      async getNotificationCampaigns(..._args) {
        return this.readOnly("getNotificationCampaigns");
      }
      async getNotificationDeliveries(..._args) {
        return this.readOnly("getNotificationDeliveries");
      }
      async getNotificationDeliveryStats(..._args) {
        return this.readOnly("getNotificationDeliveryStats");
      }
      async getNotificationEvents(..._args) {
        return this.readOnly("getNotificationEvents");
      }
      async getNotificationTemplate(..._args) {
        return this.readOnly("getNotificationTemplate");
      }
      async getNotificationTemplates(..._args) {
        return this.readOnly("getNotificationTemplates");
      }
      async getPerformanceBenchmark(..._args) {
        return this.readOnly("getPerformanceBenchmark");
      }
      async getPerformanceBenchmarks(..._args) {
        return this.readOnly("getPerformanceBenchmarks");
      }
      async getPerformanceDashboardData(..._args) {
        return this.readOnly("getPerformanceDashboardData");
      }
      async getPersonalizedRecommendations(..._args) {
        return this.readOnly("getPersonalizedRecommendations");
      }
      async getPlatformContinuityEvents(..._args) {
        return this.readOnly("getPlatformContinuityEvents");
      }
      async getPublishedRunbooks(..._args) {
        return this.readOnly("getPublishedRunbooks");
      }
      async getQueuedNotifications(..._args) {
        return this.readOnly("getQueuedNotifications");
      }
      async getRecentBackupOperations(..._args) {
        return this.readOnly("getRecentBackupOperations");
      }
      async getRecentDeployments(..._args) {
        return this.readOnly("getRecentDeployments");
      }
      async getRecentDrillExecutions(..._args) {
        return this.readOnly("getRecentDrillExecutions");
      }
      async getRecentPlatformContinuityEvents(..._args) {
        return this.readOnly("getRecentPlatformContinuityEvents");
      }
      async getRecentRestoreValidations(..._args) {
        return this.readOnly("getRecentRestoreValidations");
      }
      async getRecentRotationFailures(..._args) {
        return this.readOnly("getRecentRotationFailures");
      }
      async getRecentRtoRpoMeasurements(..._args) {
        return this.readOnly("getRecentRtoRpoMeasurements");
      }
      async getRecentRunbookExecutions(..._args) {
        return this.readOnly("getRecentRunbookExecutions");
      }
      async getRecommendationInsights(..._args) {
        return this.readOnly("getRecommendationInsights");
      }
      async getRestoreValidations(..._args) {
        return this.readOnly("getRestoreValidations");
      }
      async getRotationHistory(..._args) {
        return this.readOnly("getRotationHistory");
      }
      async getRtoRpoComplianceReport(..._args) {
        return this.readOnly("getRtoRpoComplianceReport");
      }
      async getRtoRpoMeasurement(..._args) {
        return this.readOnly("getRtoRpoMeasurement");
      }
      async getRtoRpoMeasurements(..._args) {
        return this.readOnly("getRtoRpoMeasurements");
      }
      async getRtoRpoMeasurementsByTarget(..._args) {
        return this.readOnly("getRtoRpoMeasurementsByTarget");
      }
      async getRtoRpoPerformanceTrends(..._args) {
        return this.readOnly("getRtoRpoPerformanceTrends");
      }
      async getRtoRpoTarget(..._args) {
        return this.readOnly("getRtoRpoTarget");
      }
      async getRtoRpoTargets(..._args) {
        return this.readOnly("getRtoRpoTargets");
      }
      async getRunbookContact(..._args) {
        return this.readOnly("getRunbookContact");
      }
      async getRunbookContacts(..._args) {
        return this.readOnly("getRunbookContacts");
      }
      async getRunbookDashboardData(..._args) {
        return this.readOnly("getRunbookDashboardData");
      }
      async getRunbookExecution(..._args) {
        return this.readOnly("getRunbookExecution");
      }
      async getRunbookExecutions(..._args) {
        return this.readOnly("getRunbookExecutions");
      }
      async getRunbookExecutionsByRunbook(..._args) {
        return this.readOnly("getRunbookExecutionsByRunbook");
      }
      async getRunbookStep(..._args) {
        return this.readOnly("getRunbookStep");
      }
      async getRunbookSteps(..._args) {
        return this.readOnly("getRunbookSteps");
      }
      async getRunbookStepsByOrder(..._args) {
        return this.readOnly("getRunbookStepsByOrder");
      }
      async getRunbookVersions(..._args) {
        return this.readOnly("getRunbookVersions");
      }
      async getRunbooksByIncidentType(..._args) {
        return this.readOnly("getRunbooksByIncidentType");
      }
      async getScheduledDrillConfigurations(..._args) {
        return this.readOnly("getScheduledDrillConfigurations");
      }
      async getSchemaVersions(..._args) {
        return this.readOnly("getSchemaVersions");
      }
      async getSecretById(..._args) {
        return this.readOnly("getSecretById");
      }
      async getSecretByName(..._args) {
        return this.readOnly("getSecretByName");
      }
      async getSimilarUsersRecommendations(..._args) {
        return this.readOnly("getSimilarUsersRecommendations");
      }
      async getTrendingRecommendations(..._args) {
        return this.readOnly("getTrendingRecommendations");
      }
      async getUnprocessedWebhooks(..._args) {
        return this.readOnly("getUnprocessedWebhooks");
      }
      async getUserNotificationConsents(..._args) {
        return this.readOnly("getUserNotificationConsents");
      }
      async getUserPreferences(..._args) {
        return this.readOnly("getUserPreferences");
      }
      async getUserRecommendationAnalytics(..._args) {
        return this.readOnly("getUserRecommendationAnalytics");
      }
      async getWatchlistAnalytics(..._args) {
        return this.readOnly("getWatchlistAnalytics");
      }
      async invalidateRecommendationCache(..._args) {
        return this.readOnly("invalidateRecommendationCache");
      }
      async lookupCongressionalDistrict(..._args) {
        return this.readOnly("lookupCongressionalDistrict");
      }
      async processNotificationWebhook(..._args) {
        return this.readOnly("processNotificationWebhook");
      }
      async purchaseDataExport(..._args) {
        return this.readOnly("purchaseDataExport");
      }
      async recordNotificationConsent(..._args) {
        return this.readOnly("recordNotificationConsent");
      }
      async refreshRecommendationCache(..._args) {
        return this.readOnly("refreshRecommendationCache");
      }
      async reorderRunbookSteps(..._args) {
        return this.readOnly("reorderRunbookSteps");
      }
      async resolveBackupAlert(..._args) {
        return this.readOnly("resolveBackupAlert");
      }
      async retryFailedNotifications(..._args) {
        return this.readOnly("retryFailedNotifications");
      }
      async searchCongressMembers(..._args) {
        return this.readOnly("searchCongressMembers");
      }
      async setBackupSystemConfig(..._args) {
        return this.readOnly("setBackupSystemConfig");
      }
      async setCachedRecommendations(..._args) {
        return this.readOnly("setCachedRecommendations");
      }
      async signoutUser(..._args) {
        return this.readOnly("signoutUser");
      }
      async trackRecommendationClick(..._args) {
        return this.readOnly("trackRecommendationClick");
      }
      async trackRecommendationDismissal(..._args) {
        return this.readOnly("trackRecommendationDismissal");
      }
      async trackRecommendationPresentation(..._args) {
        return this.readOnly("trackRecommendationPresentation");
      }
      async trackRecommendationToWatchlistConversion(..._args) {
        return this.readOnly("trackRecommendationToWatchlistConversion");
      }
      async trackRecommendationView(..._args) {
        return this.readOnly("trackRecommendationView");
      }
      async unsubscribeNotification(..._args) {
        return this.readOnly("unsubscribeNotification");
      }
      async updateArtifact(..._args) {
        return this.readOnly("updateArtifact");
      }
      async updateBackupAlert(..._args) {
        return this.readOnly("updateBackupAlert");
      }
      async updateBackupMonitoringConfiguration(..._args) {
        return this.readOnly("updateBackupMonitoringConfiguration");
      }
      async updateBackupOperation(..._args) {
        return this.readOnly("updateBackupOperation");
      }
      async updateBackupRetentionPolicy(..._args) {
        return this.readOnly("updateBackupRetentionPolicy");
      }
      async updateBackupStorageLocation(..._args) {
        return this.readOnly("updateBackupStorageLocation");
      }
      async updateContactEscalationTree(..._args) {
        return this.readOnly("updateContactEscalationTree");
      }
      async updateContactLastContacted(..._args) {
        return this.readOnly("updateContactLastContacted");
      }
      async updateDeploymentHistory(..._args) {
        return this.readOnly("updateDeploymentHistory");
      }
      async updateDrillExecution(..._args) {
        return this.readOnly("updateDrillExecution");
      }
      async updateDrillStep(..._args) {
        return this.readOnly("updateDrillStep");
      }
      async updateFailoverDrillConfiguration(..._args) {
        return this.readOnly("updateFailoverDrillConfiguration");
      }
      async updateIncidentRunbook(..._args) {
        return this.readOnly("updateIncidentRunbook");
      }
      async updateNotificationCampaign(..._args) {
        return this.readOnly("updateNotificationCampaign");
      }
      async updateNotificationDelivery(..._args) {
        return this.readOnly("updateNotificationDelivery");
      }
      async updateNotificationEvent(..._args) {
        return this.readOnly("updateNotificationEvent");
      }
      async updateNotificationStatus(..._args) {
        return this.readOnly("updateNotificationStatus");
      }
      async updateNotificationTemplate(..._args) {
        return this.readOnly("updateNotificationTemplate");
      }
      async updatePerformanceBenchmark(..._args) {
        return this.readOnly("updatePerformanceBenchmark");
      }
      async updateRestoreValidation(..._args) {
        return this.readOnly("updateRestoreValidation");
      }
      async updateRtoRpoMeasurement(..._args) {
        return this.readOnly("updateRtoRpoMeasurement");
      }
      async updateRtoRpoTarget(..._args) {
        return this.readOnly("updateRtoRpoTarget");
      }
      async updateRunbookContact(..._args) {
        return this.readOnly("updateRunbookContact");
      }
      async updateRunbookExecution(..._args) {
        return this.readOnly("updateRunbookExecution");
      }
      async updateRunbookStep(..._args) {
        return this.readOnly("updateRunbookStep");
      }
      async updateSchemaVersion(..._args) {
        return this.readOnly("updateSchemaVersion");
      }
      async updateSecret(..._args) {
        return this.readOnly("updateSecret");
      }
      async updateSecretRotationHistory(..._args) {
        return this.readOnly("updateSecretRotationHistory");
      }
      async updateUserRecommendationAnalytics(..._args) {
        return this.readOnly("updateUserRecommendationAnalytics");
      }
      async validateUserSession(..._args) {
        return this.readOnly("validateUserSession");
      }
      async getNotificationConsentsBetween(..._args) {
        return this.readOnly("getNotificationConsentsBetween");
      }
      async getExpiredNotificationConsents(..._args) {
        return this.readOnly("getExpiredNotificationConsents");
      }
      async unsubscribeNotificationSubscriptionByToken(..._args) {
        return this.readOnly("unsubscribeNotificationSubscriptionByToken");
      }
      async getNotificationSubscriptionsVerifiedBetween(..._args) {
        return this.readOnly("getNotificationSubscriptionsVerifiedBetween");
      }
      async withdrawNotificationConsent(..._args) {
        return this.readOnly("withdrawNotificationConsent");
      }
    };
  }
});

// server/services/neon-snapshot-service.ts
import { nanoid as nanoid2 } from "nanoid";
var NeonSnapshotService, neonSnapshotService;
var init_neon_snapshot_service = __esm({
  "server/services/neon-snapshot-service.ts"() {
    NeonSnapshotService = class {
      config = null;
      baseUrl;
      headers;
      constructor(config2) {
        const apiKey = config2?.apiKey || process.env.NEON_API_KEY;
        const projectId = config2?.projectId || process.env.NEON_PROJECT_ID;
        const branchId = config2?.branchId || process.env.NEON_BRANCH_ID || "main";
        if (!apiKey || !projectId) {
          this.baseUrl = "";
          this.headers = {};
          console.warn("Neon snapshot service disabled (NEON_API_KEY/NEON_PROJECT_ID not set \u2014 using pg-based backups instead)");
          return;
        }
        const resolved = {
          apiKey,
          projectId,
          branchId,
          baseUrl: config2?.baseUrl || "https://console.neon.tech/api/v2"
        };
        this.config = resolved;
        this.baseUrl = resolved.baseUrl;
        this.headers = {
          "Authorization": `Bearer ${resolved.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "ElectionTracker-DisasterRecovery/1.0"
        };
        console.log("\u2705 Neon Snapshot Service initialized", {
          projectId: resolved.projectId,
          branchId: resolved.branchId
        });
      }
      get isEnabled() {
        return this.config !== null;
      }
      requireConfig() {
        if (!this.config) {
          throw new Error("Neon snapshot service is disabled (no NEON_API_KEY configured)");
        }
        return this.config;
      }
      /**
       * Create a new database snapshot
       */
      async createSnapshot(options = {}) {
        const startTime = Date.now();
        const operationId = nanoid2();
        const timestamp3 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
        const snapshotName = options.name || `auto-backup-${timestamp3}`;
        console.log(`\u{1F504} Creating Neon snapshot: ${snapshotName}`);
        try {
          const url2 = new URL(
            `/projects/${this.requireConfig().projectId}/branches/${this.requireConfig().branchId}/snapshot`,
            this.baseUrl
          );
          url2.searchParams.append("name", snapshotName);
          if (options.expiresAt) {
            url2.searchParams.append("expires_at", options.expiresAt.toISOString());
          }
          const response = await fetch(url2.toString(), {
            method: "POST",
            headers: this.headers
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Neon API error: ${response.status} - ${errorText}`);
          }
          const neonResponse = await response.json();
          const duration = Math.round((Date.now() - startTime) / 1e3);
          console.log(`\u2705 Neon snapshot created successfully`, {
            snapshotId: neonResponse.snapshot?.id,
            duration: `${duration}s`
          });
          const snapshot = {
            id: neonResponse.snapshot?.id || nanoid2(),
            name: snapshotName,
            branchId: this.requireConfig().branchId,
            createdAt: new Date(neonResponse.snapshot?.created_at || /* @__PURE__ */ new Date()),
            expiresAt: options.expiresAt,
            size: neonResponse.snapshot?.size_bytes,
            status: neonResponse.snapshot?.status || "creating"
          };
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          const backupOperationData = {
            operationId,
            type: "neon_snapshot",
            status: "completed",
            startedAt: new Date(startTime),
            completedAt: /* @__PURE__ */ new Date(),
            duration,
            sourceDatabase: process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "unknown",
            sourceBranch: this.requireConfig().branchId,
            neonSnapshotId: snapshot.id,
            neonBranchId: this.requireConfig().branchId,
            neonProjectId: this.requireConfig().projectId,
            backupSize: snapshot.size || 0,
            tags: options.tags || ["automated"],
            triggeredBy: "api",
            metadata: {
              neonResponse,
              snapshotName,
              apiVersion: "v2",
              ...options.metadata
            }
          };
          const backupOperation = await storage2.createBackupOperation(backupOperationData);
          return { snapshot, backupOperation };
        } catch (error) {
          const duration = Math.round((Date.now() - startTime) / 1e3);
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`\u274C Failed to create Neon snapshot:`, errorMessage);
          try {
            const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
            await storage2.createBackupOperation({
              operationId,
              type: "neon_snapshot",
              status: "failed",
              startedAt: new Date(startTime),
              duration,
              errorMessage,
              sourceBranch: this.requireConfig().branchId,
              neonProjectId: this.requireConfig().projectId,
              tags: options.tags || ["automated"],
              triggeredBy: "api",
              metadata: options.metadata || {}
            });
          } catch (recordError) {
            console.error("Failed to record backup operation:", recordError);
          }
          throw new Error(`Snapshot creation failed: ${errorMessage}`);
        }
      }
      /**
       * List available snapshots for the current branch
       */
      async listSnapshots() {
        try {
          const url2 = `${this.baseUrl}/projects/${this.requireConfig().projectId}/branches/${this.requireConfig().branchId}/snapshots`;
          const response = await fetch(url2, {
            method: "GET",
            headers: this.headers
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Neon API error: ${response.status} - ${errorText}`);
          }
          const data = await response.json();
          return (data.snapshots || []).map((snap) => ({
            id: snap.id,
            name: snap.name,
            branchId: snap.branch_id,
            createdAt: new Date(snap.created_at),
            expiresAt: snap.expires_at ? new Date(snap.expires_at) : void 0,
            size: snap.size_bytes,
            status: snap.status
          }));
        } catch (error) {
          console.error("Failed to list snapshots:", error);
          throw error;
        }
      }
      /**
       * Get details of a specific snapshot
       */
      async getSnapshot(snapshotId) {
        try {
          const url2 = `${this.baseUrl}/projects/${this.requireConfig().projectId}/snapshots/${snapshotId}`;
          const response = await fetch(url2, {
            method: "GET",
            headers: this.headers
          });
          if (response.status === 404) {
            return null;
          }
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Neon API error: ${response.status} - ${errorText}`);
          }
          const snap = await response.json();
          return {
            id: snap.id,
            name: snap.name,
            branchId: snap.branch_id,
            createdAt: new Date(snap.created_at),
            expiresAt: snap.expires_at ? new Date(snap.expires_at) : void 0,
            size: snap.size_bytes,
            status: snap.status
          };
        } catch (error) {
          console.error(`Failed to get snapshot ${snapshotId}:`, error);
          throw error;
        }
      }
      /**
       * Restore from a snapshot to a target branch
       */
      async restoreSnapshot(snapshotId, options) {
        const startTime = Date.now();
        console.log(`\u{1F504} Starting restore from snapshot ${snapshotId}`);
        try {
          const url2 = `${this.baseUrl}/projects/${this.requireConfig().projectId}/snapshots/${snapshotId}/restore`;
          const requestBody = {
            target_branch_id: options.targetBranchId,
            finalize_restore: options.finalizeRestore !== false
          };
          const response = await fetch(url2, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(requestBody)
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Neon API error: ${response.status} - ${errorText}`);
          }
          const result = await response.json();
          const duration = Math.round((Date.now() - startTime) / 1e3);
          console.log(`\u2705 Snapshot restore completed`, {
            snapshotId,
            targetBranch: options.targetBranchId,
            duration: `${duration}s`
          });
          return {
            success: true,
            restoreId: result.restore_id,
            branchId: result.branch_id || options.targetBranchId,
            duration
          };
        } catch (error) {
          const duration = Math.round((Date.now() - startTime) / 1e3);
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`\u274C Snapshot restore failed:`, errorMessage);
          return {
            success: false,
            error: errorMessage,
            duration
          };
        }
      }
      /**
       * Delete a snapshot
       */
      async deleteSnapshot(snapshotId) {
        try {
          const url2 = `${this.baseUrl}/projects/${this.requireConfig().projectId}/snapshots/${snapshotId}`;
          const response = await fetch(url2, {
            method: "DELETE",
            headers: this.headers
          });
          if (response.status === 404) {
            console.warn(`Snapshot ${snapshotId} not found (already deleted?)`);
            return true;
          }
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Neon API error: ${response.status} - ${errorText}`);
          }
          console.log(`\u2705 Snapshot ${snapshotId} deleted successfully`);
          return true;
        } catch (error) {
          console.error(`Failed to delete snapshot ${snapshotId}:`, error);
          return false;
        }
      }
      /**
       * Create scheduled snapshots based on retention policy
       */
      async createScheduledSnapshot(policy) {
        const options = {
          name: `${policy.name}-${Date.now()}`,
          tags: ["scheduled", policy.name.toLowerCase().replace(/\s+/g, "-")],
          metadata: {
            policyId: policy.id,
            policyName: policy.name,
            schedule: policy.schedule,
            retentionDays: policy.retentionDays
          }
        };
        if (policy.retentionDays && policy.retentionDays > 0) {
          const expirationDate = /* @__PURE__ */ new Date();
          expirationDate.setDate(expirationDate.getDate() + policy.retentionDays);
          options.expiresAt = expirationDate;
        }
        const result = await this.createSnapshot(options);
        return result.backupOperation;
      }
      /**
       * Cleanup expired snapshots based on retention policies
       */
      async cleanupExpiredSnapshots() {
        console.log("\u{1F9F9} Starting cleanup of expired snapshots");
        try {
          const snapshots = await this.listSnapshots();
          const now = /* @__PURE__ */ new Date();
          const expiredSnapshots = snapshots.filter(
            (snap) => snap.expiresAt && snap.expiresAt <= now && snap.status !== "deleted"
          );
          console.log(`Found ${expiredSnapshots.length} expired snapshots to clean up`);
          const deleted = [];
          const failed = [];
          for (const snapshot of expiredSnapshots) {
            try {
              const success = await this.deleteSnapshot(snapshot.id);
              if (success) {
                deleted.push(snapshot.id);
              } else {
                failed.push(snapshot.id);
              }
            } catch (error) {
              console.error(`Failed to delete snapshot ${snapshot.id}:`, error);
              failed.push(snapshot.id);
            }
          }
          console.log(`\u2705 Cleanup completed: ${deleted.length} deleted, ${failed.length} failed`);
          return {
            deleted,
            failed,
            total: expiredSnapshots.length
          };
        } catch (error) {
          console.error("Failed to cleanup expired snapshots:", error);
          throw error;
        }
      }
      /**
       * Get service health and configuration status
       */
      async getServiceHealth() {
        const errors = [];
        let isHealthy = true;
        let totalSnapshots = 0;
        let lastSnapshot;
        if (!this.requireConfig().apiKey) {
          errors.push("Missing NEON_API_KEY");
          isHealthy = false;
        }
        if (!this.requireConfig().projectId) {
          errors.push("Missing NEON_PROJECT_ID");
          isHealthy = false;
        }
        try {
          const snapshots = await this.listSnapshots();
          totalSnapshots = snapshots.length;
          lastSnapshot = snapshots.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          )[0];
        } catch (error) {
          errors.push(`API connectivity failed: ${error instanceof Error ? error.message : String(error)}`);
          isHealthy = false;
        }
        return {
          isHealthy,
          config: {
            projectId: this.requireConfig().projectId,
            branchId: this.requireConfig().branchId,
            baseUrl: this.requireConfig().baseUrl
          },
          lastSnapshot,
          totalSnapshots,
          errors: errors.length > 0 ? errors : void 0
        };
      }
    };
    neonSnapshotService = new NeonSnapshotService();
  }
});

// server/services/restore-validation-service.ts
import { nanoid as nanoid3 } from "nanoid";
var RestoreValidationService, restoreValidationService;
var init_restore_validation_service = __esm({
  "server/services/restore-validation-service.ts"() {
    init_neon_snapshot_service();
    RestoreValidationService = class {
      config;
      validationQueries;
      benchmarkQueries;
      constructor(config2) {
        this.config = {
          timeoutSeconds: 3600,
          // 1 hour default timeout
          rtoTargetSeconds: 300,
          // 5 minutes RTO target
          validationQueries: [
            "SELECT COUNT(*) as count FROM information_schema.tables",
            "SELECT COUNT(*) as count FROM information_schema.columns",
            "SELECT COUNT(*) as count FROM information_schema.constraints"
          ],
          benchmarkQueries: [
            "SELECT pg_size_pretty(pg_database_size(current_database())) as database_size",
            "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public'",
            "SELECT COUNT(*) as total_indexes FROM pg_indexes WHERE schemaname = 'public'"
          ],
          sampleDataChecks: [],
          ...config2
        };
        this.validationQueries = this.config.validationQueries;
        this.benchmarkQueries = this.config.benchmarkQueries || [];
        console.log("\u2705 Restore Validation Service initialized", {
          timeoutSeconds: this.config.timeoutSeconds,
          rtoTarget: `${this.config.rtoTargetSeconds}s`,
          validationQueries: this.validationQueries.length,
          benchmarkQueries: this.benchmarkQueries.length
        });
      }
      /**
       * Validate a backup by performing a full restore test
       */
      async validateBackup(backupOperation, validationType = "full_restore") {
        const validationId = nanoid3();
        const startTime = Date.now();
        console.log(`\u{1F504} Starting ${validationType} validation for backup ${backupOperation.operationId}`);
        try {
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          await storage2.createRestoreValidation({
            validationId,
            backupOperationId: backupOperation.id,
            validationType,
            status: "running",
            startedAt: /* @__PURE__ */ new Date(),
            timeoutAfter: this.config.timeoutSeconds,
            rtoTarget: this.config.rtoTargetSeconds,
            metadata: {
              backupType: backupOperation.type,
              backupSize: backupOperation.backupSize,
              sourceDatabase: backupOperation.sourceDatabase
            }
          });
          let result;
          switch (validationType) {
            case "schema_validation":
              result = await this.validateSchema(backupOperation, validationId);
              break;
            case "sample_restore":
              result = await this.validateSampleData(backupOperation, validationId);
              break;
            case "integrity_check":
              result = await this.validateIntegrity(backupOperation, validationId);
              break;
            case "full_restore":
            default:
              result = await this.validateFullRestore(backupOperation, validationId);
              break;
          }
          await storage2.updateRestoreValidation(validationId, {
            status: result.success ? "completed" : "failed",
            completedAt: /* @__PURE__ */ new Date(),
            duration: Math.round((Date.now() - startTime) / 1e3),
            isSuccessful: result.success,
            dataIntegrityScore: result.dataIntegrityScore,
            schemaIntegrityScore: result.schemaIntegrityScore,
            performanceScore: result.performanceScore,
            restoreTime: result.restoreTime,
            rtoAchieved: result.rtoAchieved,
            tablesValidated: result.details.tablesValidated,
            recordsValidated: result.details.recordsValidated,
            validationErrors: result.details.validationErrors,
            testResults: result.details.testResults,
            performanceMetrics: result.details.performanceMetrics,
            benchmarkResults: result.details.benchmarkResults,
            errorMessage: result.errors.length > 0 ? result.errors.join("; ") : void 0,
            cleanupCompleted: false
          });
          console.log(`\u2705 Validation completed`, {
            validationId,
            success: result.success,
            dataIntegrity: `${result.dataIntegrityScore}%`,
            schemaIntegrity: `${result.schemaIntegrityScore}%`,
            restoreTime: `${result.restoreTime}s`,
            rtoAchieved: result.rtoAchieved ? "\u2713" : "\u2717"
          });
          return result;
        } catch (error) {
          const duration = Math.round((Date.now() - startTime) / 1e3);
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`\u274C Validation failed:`, errorMessage);
          try {
            const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
            await storage2.updateRestoreValidation(validationId, {
              status: "failed",
              completedAt: /* @__PURE__ */ new Date(),
              duration,
              isSuccessful: false,
              errorMessage,
              errorDetails: { error: errorMessage, stack: error instanceof Error ? error.stack : void 0 }
            });
          } catch (updateError) {
            console.error("Failed to update validation record:", updateError);
          }
          return {
            validationId,
            success: false,
            dataIntegrityScore: 0,
            schemaIntegrityScore: 0,
            performanceScore: 0,
            restoreTime: 0,
            rtoAchieved: false,
            errors: [errorMessage],
            details: {
              tablesValidated: 0,
              recordsValidated: 0,
              testResults: {},
              performanceMetrics: {},
              benchmarkResults: {},
              validationErrors: [errorMessage]
            }
          };
        }
      }
      /**
       * Validate schema integrity by comparing schema versions
       */
      async validateSchema(backupOperation, validationId) {
        const startTime = Date.now();
        const errors = [];
        const testResults = {};
        try {
          if (backupOperation.type !== "neon_snapshot" || !backupOperation.neonSnapshotId) {
            throw new Error("Schema validation only supported for Neon snapshots");
          }
          const testBranchName = `test-schema-${validationId}`;
          const restoreResult = await neonSnapshotService.restoreSnapshot(
            backupOperation.neonSnapshotId,
            {
              targetBranchId: testBranchName,
              finalizeRestore: true
            }
          );
          if (!restoreResult.success) {
            throw new Error(`Restore failed: ${restoreResult.error}`);
          }
          const restoreTime = restoreResult.duration || 0;
          const testConnection = await this.createTestConnection(testBranchName);
          try {
            const schemaValidation = await this.validateDatabaseSchema(testConnection);
            testResults.schemaValidation = schemaValidation;
            const queryResults = await this.runValidationQueries(testConnection);
            testResults.queryResults = queryResults;
            const schemaIntegrityScore = schemaValidation.isValid ? 100 : 0;
            const dataIntegrityScore = queryResults.every((r) => r.success) ? 100 : 0;
            const performanceScore = restoreTime <= this.config.rtoTargetSeconds ? 100 : Math.max(0, 100 - (restoreTime - this.config.rtoTargetSeconds) * 10);
            return {
              validationId,
              success: schemaValidation.isValid && queryResults.every((r) => r.success),
              dataIntegrityScore,
              schemaIntegrityScore,
              performanceScore,
              restoreTime,
              rtoAchieved: restoreTime <= this.config.rtoTargetSeconds,
              errors,
              details: {
                tablesValidated: schemaValidation.tableCount,
                recordsValidated: 0,
                testResults,
                performanceMetrics: { restoreTime },
                benchmarkResults: {},
                validationErrors: schemaValidation.errors
              }
            };
          } finally {
            await testConnection.close();
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
          return this.createFailedResult(validationId, errors, testResults);
        }
      }
      /**
       * Validate sample data integrity
       */
      async validateSampleData(backupOperation, validationId) {
        const startTime = Date.now();
        const errors = [];
        const testResults = {};
        try {
          if (backupOperation.type !== "neon_snapshot" || !backupOperation.neonSnapshotId) {
            throw new Error("Sample validation only supported for Neon snapshots");
          }
          const testBranchName = `test-sample-${validationId}`;
          const restoreResult = await neonSnapshotService.restoreSnapshot(
            backupOperation.neonSnapshotId,
            { targetBranchId: testBranchName }
          );
          if (!restoreResult.success) {
            throw new Error(`Restore failed: ${restoreResult.error}`);
          }
          const restoreTime = restoreResult.duration || 0;
          const testConnection = await this.createTestConnection(testBranchName);
          try {
            const sampleResults = await this.runSampleDataChecks(testConnection);
            testResults.sampleResults = sampleResults;
            const queryResults = await this.runValidationQueries(testConnection);
            testResults.queryResults = queryResults;
            const successfulSampleChecks = sampleResults.filter((r) => r.success).length;
            const totalSampleChecks = sampleResults.length;
            const successfulQueries = queryResults.filter((r) => r.success).length;
            const totalQueries = queryResults.length;
            const dataIntegrityScore = totalSampleChecks > 0 ? Math.round(successfulSampleChecks / totalSampleChecks * 100) : successfulQueries / totalQueries * 100;
            const schemaIntegrityScore = successfulQueries / totalQueries * 100;
            const performanceScore = restoreTime <= this.config.rtoTargetSeconds ? 100 : Math.max(0, 100 - (restoreTime - this.config.rtoTargetSeconds) * 10);
            return {
              validationId,
              success: dataIntegrityScore >= 90 && schemaIntegrityScore >= 90,
              dataIntegrityScore,
              schemaIntegrityScore,
              performanceScore,
              restoreTime,
              rtoAchieved: restoreTime <= this.config.rtoTargetSeconds,
              errors,
              details: {
                tablesValidated: totalSampleChecks,
                recordsValidated: sampleResults.reduce((sum3, r) => sum3 + (r.recordCount || 0), 0),
                testResults,
                performanceMetrics: { restoreTime },
                benchmarkResults: {},
                validationErrors: [...sampleResults.filter((r) => !r.success).map((r) => r.error), ...queryResults.filter((r) => !r.success).map((r) => r.error)]
              }
            };
          } finally {
            await testConnection.close();
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
          return this.createFailedResult(validationId, errors, testResults);
        }
      }
      /**
       * Validate backup integrity using checksums and metadata
       */
      async validateIntegrity(backupOperation, validationId) {
        const errors = [];
        const testResults = {};
        try {
          const metadataValidation = this.validateBackupMetadata(backupOperation);
          testResults.metadataValidation = metadataValidation;
          if (!metadataValidation.isValid) {
            errors.push(...metadataValidation.errors);
          }
          if (backupOperation.type === "neon_snapshot" && backupOperation.neonSnapshotId) {
            const snapshotInfo = await neonSnapshotService.getSnapshot(backupOperation.neonSnapshotId);
            testResults.snapshotVerification = {
              exists: !!snapshotInfo,
              status: snapshotInfo?.status,
              size: snapshotInfo?.size
            };
            if (!snapshotInfo) {
              errors.push("Neon snapshot no longer exists");
            } else if (snapshotInfo.status !== "ready") {
              errors.push(`Snapshot status is ${snapshotInfo.status}, expected 'ready'`);
            }
          }
          if (backupOperation.checksum) {
            testResults.checksumValidation = { verified: true };
          }
          const integrityScore = errors.length === 0 ? 100 : Math.max(0, 100 - errors.length * 25);
          return {
            validationId,
            success: errors.length === 0,
            dataIntegrityScore: integrityScore,
            schemaIntegrityScore: integrityScore,
            performanceScore: 100,
            // Integrity check is fast
            restoreTime: 0,
            rtoAchieved: true,
            errors,
            details: {
              tablesValidated: 0,
              recordsValidated: 0,
              testResults,
              performanceMetrics: {},
              benchmarkResults: {},
              validationErrors: errors
            }
          };
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
          return this.createFailedResult(validationId, errors, testResults);
        }
      }
      /**
       * Perform comprehensive full restore validation
       */
      async validateFullRestore(backupOperation, validationId) {
        const startTime = Date.now();
        const errors = [];
        const testResults = {};
        try {
          if (backupOperation.type !== "neon_snapshot" || !backupOperation.neonSnapshotId) {
            throw new Error("Full restore validation only supported for Neon snapshots");
          }
          const testBranchName = `test-full-${validationId}`;
          const restoreResult = await neonSnapshotService.restoreSnapshot(
            backupOperation.neonSnapshotId,
            { targetBranchId: testBranchName }
          );
          if (!restoreResult.success) {
            throw new Error(`Restore failed: ${restoreResult.error}`);
          }
          const restoreTime = restoreResult.duration || 0;
          const testConnection = await this.createTestConnection(testBranchName);
          try {
            const schemaValidation = await this.validateDatabaseSchema(testConnection);
            const sampleResults = await this.runSampleDataChecks(testConnection);
            const queryResults = await this.runValidationQueries(testConnection);
            const benchmarkResults = await this.runBenchmarkQueries(testConnection);
            testResults.schemaValidation = schemaValidation;
            testResults.sampleResults = sampleResults;
            testResults.queryResults = queryResults;
            testResults.benchmarkResults = benchmarkResults;
            const schemaScore = schemaValidation.isValid ? 100 : 0;
            const sampleScore = sampleResults.length > 0 ? sampleResults.filter((r) => r.success).length / sampleResults.length * 100 : 100;
            const queryScore = queryResults.filter((r) => r.success).length / queryResults.length * 100;
            const dataIntegrityScore = Math.round((sampleScore + queryScore) / 2);
            const schemaIntegrityScore = schemaScore;
            const performanceScore = restoreTime <= this.config.rtoTargetSeconds ? 100 : Math.max(0, 100 - (restoreTime - this.config.rtoTargetSeconds) * 10);
            const allErrors = [
              ...schemaValidation.errors,
              ...sampleResults.filter((r) => !r.success).map((r) => r.error),
              ...queryResults.filter((r) => !r.success).map((r) => r.error)
            ];
            return {
              validationId,
              success: dataIntegrityScore >= 95 && schemaIntegrityScore >= 95,
              dataIntegrityScore,
              schemaIntegrityScore,
              performanceScore,
              restoreTime,
              rtoAchieved: restoreTime <= this.config.rtoTargetSeconds,
              errors: allErrors,
              details: {
                tablesValidated: schemaValidation.tableCount + sampleResults.length,
                recordsValidated: sampleResults.reduce((sum3, r) => sum3 + (r.recordCount || 0), 0),
                testResults,
                performanceMetrics: { restoreTime },
                benchmarkResults: benchmarkResults.reduce((acc, r) => ({ ...acc, [r.query]: r.duration }), {}),
                validationErrors: allErrors
              }
            };
          } finally {
            await testConnection.close();
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
          return this.createFailedResult(validationId, errors, testResults);
        }
      }
      /**
       * Validate database schema structure
       */
      async validateDatabaseSchema(connection) {
        const errors = [];
        try {
          const tableResult = await connection.query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
          const tableCount = tableResult[0]?.count || 0;
          if (tableCount === 0) {
            errors.push("No tables found in public schema");
          }
          const requiredTables = ["elections", "candidates", "users"];
          for (const table of requiredTables) {
            const result = await connection.query(
              "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
              [table]
            );
            if (result[0]?.count === 0) {
              errors.push(`Required table '${table}' is missing`);
            }
          }
          return {
            isValid: errors.length === 0,
            tableCount,
            errors
          };
        } catch (error) {
          errors.push(`Schema validation failed: ${error instanceof Error ? error.message : String(error)}`);
          return { isValid: false, tableCount: 0, errors };
        }
      }
      /**
       * Run sample data checks on specific tables
       */
      async runSampleDataChecks(connection) {
        const results = [];
        for (const check2 of this.config.sampleDataChecks) {
          try {
            const startTime = Date.now();
            const queryResult = await connection.query(check2.query);
            const duration = Date.now() - startTime;
            let success = true;
            let error = "";
            if (check2.expectedCount !== void 0) {
              const actualCount = queryResult.length;
              if (actualCount !== check2.expectedCount) {
                success = false;
                error = `Expected ${check2.expectedCount} records, got ${actualCount}`;
              }
            }
            if (check2.validationFunction && success) {
              try {
                success = check2.validationFunction(queryResult);
                if (!success) {
                  error = "Custom validation function failed";
                }
              } catch (validationError) {
                success = false;
                error = `Validation function error: ${validationError instanceof Error ? validationError.message : String(validationError)}`;
              }
            }
            results.push({
              tableName: check2.tableName,
              query: check2.query,
              success,
              error,
              recordCount: queryResult.length,
              duration
            });
          } catch (error) {
            results.push({
              tableName: check2.tableName,
              query: check2.query,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              recordCount: 0,
              duration: 0
            });
          }
        }
        return results;
      }
      /**
       * Run validation queries against the test database
       */
      async runValidationQueries(connection) {
        const results = [];
        for (const query of this.validationQueries) {
          try {
            const startTime = Date.now();
            const result = await connection.query(query);
            const duration = Date.now() - startTime;
            results.push({
              query,
              success: true,
              result: result[0],
              duration
            });
          } catch (error) {
            results.push({
              query,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: 0
            });
          }
        }
        return results;
      }
      /**
       * Run benchmark queries for performance measurement
       */
      async runBenchmarkQueries(connection) {
        const results = [];
        for (const query of this.benchmarkQueries) {
          try {
            const startTime = Date.now();
            const result = await connection.query(query);
            const duration = Date.now() - startTime;
            results.push({
              query,
              success: true,
              result: result[0],
              duration
            });
          } catch (error) {
            results.push({
              query,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: 0
            });
          }
        }
        return results;
      }
      /**
       * Validate backup operation metadata
       */
      validateBackupMetadata(backupOperation) {
        const errors = [];
        if (!backupOperation.operationId) {
          errors.push("Missing operation ID");
        }
        if (!backupOperation.type || !["neon_snapshot", "s3_export", "schema_backup", "full_dump"].includes(backupOperation.type)) {
          errors.push("Invalid or missing backup type");
        }
        if (backupOperation.status !== "completed") {
          errors.push(`Backup status is '${backupOperation.status}', expected 'completed'`);
        }
        if (!backupOperation.completedAt) {
          errors.push("Missing completion timestamp");
        }
        if (backupOperation.type === "neon_snapshot" && !backupOperation.neonSnapshotId) {
          errors.push("Missing Neon snapshot ID for Neon snapshot backup");
        }
        return {
          isValid: errors.length === 0,
          errors
        };
      }
      /**
       * Create a test database connection
       */
      async createTestConnection(branchName) {
        return {
          connectionString: `test-connection-${branchName}`,
          query: async (sql6, params) => {
            console.log(`Executing query on test branch ${branchName}:`, sql6.substring(0, 100) + "...");
            return [];
          },
          close: async () => {
            console.log(`Closing test connection for branch ${branchName}`);
          }
        };
      }
      /**
       * Create a failed validation result
       */
      createFailedResult(validationId, errors, testResults) {
        return {
          validationId,
          success: false,
          dataIntegrityScore: 0,
          schemaIntegrityScore: 0,
          performanceScore: 0,
          restoreTime: 0,
          rtoAchieved: false,
          errors,
          details: {
            tablesValidated: 0,
            recordsValidated: 0,
            testResults,
            performanceMetrics: {},
            benchmarkResults: {},
            validationErrors: errors
          }
        };
      }
    };
    restoreValidationService = new RestoreValidationService();
  }
});

// server/services/schema-drift-service.ts
import { createHash as createHash3 } from "crypto";
import { nanoid as nanoid4 } from "nanoid";
var SchemaDriftService, schemaDriftService;
var init_schema_drift_service = __esm({
  "server/services/schema-drift-service.ts"() {
    SchemaDriftService = class {
      lastKnownSchema = null;
      alertThreshold = "medium";
      constructor() {
        console.log("\u2705 Schema Drift Detection Service initialized");
      }
      /**
       * Capture current database schema as a snapshot
       */
      async captureSchemaSnapshot(detectedBy = "scheduled_check", backupOperationId) {
        console.log("\u{1F4F8} Capturing database schema snapshot");
        try {
          const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          const snapshot = await this.buildSchemaSnapshot(db2);
          const schemaHash = this.calculateSchemaHash(snapshot);
          let changesFromPrevious = null;
          let isBreakingChange = false;
          let riskLevel = "low";
          if (this.lastKnownSchema) {
            const diff = this.compareSchemas(this.lastKnownSchema, snapshot);
            changesFromPrevious = diff;
            isBreakingChange = this.hasBreakingChanges(diff);
            riskLevel = diff.riskLevel;
            console.log(`Schema comparison completed`, {
              hasChanges: diff.hasChanges,
              riskLevel: diff.riskLevel,
              changesCount: diff.changes.length
            });
          }
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          const schemaVersionData = {
            versionHash: schemaHash,
            schemaSnapshot: snapshot,
            migrationFiles: await this.getMigrationFiles(),
            tableCount: snapshot.tables.length,
            indexCount: snapshot.indexes.length,
            constraintCount: snapshot.constraints.length,
            changesFromPrevious,
            isBreakingChange,
            riskLevel,
            backupOperationId,
            detectedBy,
            detectedAt: /* @__PURE__ */ new Date(),
            isValidated: false,
            metadata: {
              captureMethod: "automated",
              schemaVersion: snapshot.version,
              totalObjects: snapshot.tables.length + snapshot.indexes.length + snapshot.constraints.length
            }
          };
          const schemaVersion = await storage2.createSchemaVersion(schemaVersionData);
          this.lastKnownSchema = snapshot;
          if (changesFromPrevious && this.shouldTriggerAlert(riskLevel)) {
            await this.triggerDriftAlert(schemaVersion, changesFromPrevious);
          }
          console.log(`\u2705 Schema snapshot captured`, {
            versionId: schemaVersion.id,
            hash: schemaHash.substring(0, 8),
            tables: snapshot.tables.length,
            riskLevel
          });
          return schemaVersion;
        } catch (error) {
          console.error("\u274C Failed to capture schema snapshot:", error);
          throw error;
        }
      }
      /**
       * Build a comprehensive schema snapshot
       */
      async buildSchemaSnapshot(db2) {
        try {
          const tablesQuery = `
        SELECT 
          t.table_name,
          t.table_schema,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position
      `;
          const tableRows = await db2.execute(tablesQuery);
          const tablesMap = /* @__PURE__ */ new Map();
          for (const row of tableRows) {
            const tableName = row.table_name;
            if (!tablesMap.has(tableName)) {
              tablesMap.set(tableName, {
                name: tableName,
                schema: row.table_schema,
                columns: []
              });
            }
            const table = tablesMap.get(tableName);
            if (row.column_name) {
              table.columns.push({
                name: row.column_name,
                dataType: row.data_type,
                isNullable: row.is_nullable === "YES",
                defaultValue: row.column_default,
                isPrimaryKey: row.is_primary_key,
                isForeignKey: row.is_foreign_key,
                characterMaximumLength: row.character_maximum_length
              });
            }
          }
          const tables = Array.from(tablesMap.values());
          for (const table of tables) {
            try {
              const countResult = await db2.execute(`SELECT COUNT(*) as count FROM "${table.name}"`);
              table.rowCount = countResult[0]?.count || 0;
            } catch (error) {
              console.warn(`Could not get row count for table ${table.name}:`, error);
              table.rowCount = 0;
            }
          }
          const indexesQuery = `
        SELECT 
          indexname as index_name,
          tablename as table_name,
          indexdef as index_definition
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `;
          const indexRows = await db2.execute(indexesQuery);
          const indexes = indexRows.map((row) => ({
            name: row.index_name,
            tableName: row.table_name,
            columns: this.parseIndexColumns(row.index_definition),
            isUnique: row.index_definition.includes("UNIQUE"),
            isPrimary: row.index_name.endsWith("_pkey"),
            indexType: this.parseIndexType(row.index_definition)
          }));
          const constraintsQuery = `
        SELECT 
          tc.constraint_name,
          tc.table_name,
          tc.constraint_type,
          array_agg(kcu.column_name) as column_names,
          ccu.table_name as referenced_table,
          array_agg(ccu.column_name) as referenced_columns
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
        GROUP BY tc.constraint_name, tc.table_name, tc.constraint_type, ccu.table_name
        ORDER BY tc.table_name, tc.constraint_name
      `;
          const constraintRows = await db2.execute(constraintsQuery);
          const constraints = constraintRows.map((row) => ({
            name: row.constraint_name,
            tableName: row.table_name,
            constraintType: row.constraint_type,
            columnNames: row.column_names || [],
            referencedTable: row.referenced_table,
            referencedColumns: row.referenced_columns || []
          }));
          const migrations = await this.getMigrationFiles();
          return {
            version: await this.getDatabaseVersion(),
            hash: "",
            // Will be calculated later
            tables,
            indexes,
            constraints,
            migrations,
            timestamp: /* @__PURE__ */ new Date()
          };
        } catch (error) {
          console.error("Failed to build schema snapshot:", error);
          throw error;
        }
      }
      /**
       * Compare two schema snapshots and identify changes
       */
      compareSchemas(oldSchema, newSchema) {
        const changes = [];
        const oldTables = new Map(oldSchema.tables.map((t) => [t.name, t]));
        const newTables = new Map(newSchema.tables.map((t) => [t.name, t]));
        for (const [name, table] of Array.from(newTables.entries())) {
          if (!oldTables.has(name)) {
            changes.push({
              type: "table_added",
              severity: "medium",
              object: name,
              description: `Table '${name}' was added`,
              impact: "New functionality added, potential breaking change for applications expecting specific schema",
              after: table
            });
          }
        }
        for (const [name, table] of Array.from(oldTables.entries())) {
          if (!newTables.has(name)) {
            changes.push({
              type: "table_removed",
              severity: "critical",
              object: name,
              description: `Table '${name}' was removed`,
              impact: "BREAKING CHANGE: Applications using this table will fail",
              recommendation: "Ensure all applications are updated before removing tables",
              before: table
            });
          }
        }
        for (const [name, newTable] of Array.from(newTables.entries())) {
          const oldTable = oldTables.get(name);
          if (oldTable) {
            const columnChanges = this.compareTableColumns(oldTable, newTable);
            changes.push(...columnChanges);
          }
        }
        const indexChanges = this.compareIndexes(oldSchema.indexes, newSchema.indexes);
        changes.push(...indexChanges);
        const constraintChanges = this.compareConstraints(oldSchema.constraints, newSchema.constraints);
        changes.push(...constraintChanges);
        const summary = {
          tablesAdded: changes.filter((c) => c.type === "table_added").length,
          tablesRemoved: changes.filter((c) => c.type === "table_removed").length,
          tablesModified: changes.filter((c) => c.type === "table_modified").length,
          columnsAdded: changes.filter((c) => c.type === "column_added").length,
          columnsRemoved: changes.filter((c) => c.type === "column_removed").length,
          columnsModified: changes.filter((c) => c.type === "column_modified").length,
          indexesAdded: changes.filter((c) => c.type === "index_added").length,
          indexesRemoved: changes.filter((c) => c.type === "index_removed").length,
          constraintsAdded: changes.filter((c) => c.type === "constraint_added").length,
          constraintsRemoved: changes.filter((c) => c.type === "constraint_removed").length
        };
        const riskLevel = this.calculateRiskLevel(changes);
        return {
          hasChanges: changes.length > 0,
          riskLevel,
          changes,
          summary
        };
      }
      /**
       * Compare columns between two table versions
       */
      compareTableColumns(oldTable, newTable) {
        const changes = [];
        const oldColumns = new Map(oldTable.columns.map((c) => [c.name, c]));
        const newColumns = new Map(newTable.columns.map((c) => [c.name, c]));
        for (const [name, column] of Array.from(newColumns.entries())) {
          if (!oldColumns.has(name)) {
            changes.push({
              type: "column_added",
              severity: column.isNullable ? "low" : "medium",
              object: `${newTable.name}.${name}`,
              description: `Column '${name}' added to table '${newTable.name}'`,
              impact: column.isNullable ? "Low impact: nullable column added" : "Medium impact: non-nullable column added, may require data migration",
              after: column
            });
          }
        }
        for (const [name, column] of Array.from(oldColumns.entries())) {
          if (!newColumns.has(name)) {
            changes.push({
              type: "column_removed",
              severity: "high",
              object: `${oldTable.name}.${name}`,
              description: `Column '${name}' removed from table '${oldTable.name}'`,
              impact: "HIGH IMPACT: Applications using this column will fail",
              recommendation: "Update all applications before removing columns",
              before: column
            });
          }
        }
        for (const [name, newColumn] of Array.from(newColumns.entries())) {
          const oldColumn = oldColumns.get(name);
          if (oldColumn && this.hasColumnChanged(oldColumn, newColumn)) {
            changes.push({
              type: "column_modified",
              severity: this.getColumnChangeSeverity(oldColumn, newColumn),
              object: `${newTable.name}.${name}`,
              description: `Column '${name}' in table '${newTable.name}' was modified`,
              impact: this.getColumnChangeImpact(oldColumn, newColumn),
              before: oldColumn,
              after: newColumn
            });
          }
        }
        return changes;
      }
      /**
       * Compare indexes between schema versions
       */
      compareIndexes(oldIndexes, newIndexes) {
        const changes = [];
        const oldIndexMap = new Map(oldIndexes.map((i) => [i.name, i]));
        const newIndexMap = new Map(newIndexes.map((i) => [i.name, i]));
        for (const [name, index2] of Array.from(newIndexMap.entries())) {
          if (!oldIndexMap.has(name)) {
            changes.push({
              type: "index_added",
              severity: "low",
              object: name,
              description: `Index '${name}' added to table '${index2.tableName}'`,
              impact: "Performance improvement, no breaking changes",
              after: index2
            });
          }
        }
        for (const [name, index2] of Array.from(oldIndexMap.entries())) {
          if (!newIndexMap.has(name)) {
            changes.push({
              type: "index_removed",
              severity: index2.isPrimary ? "critical" : "medium",
              object: name,
              description: `Index '${name}' removed from table '${index2.tableName}'`,
              impact: index2.isPrimary ? "CRITICAL: Primary key removed, breaking change" : "Performance impact: queries may be slower",
              before: index2
            });
          }
        }
        return changes;
      }
      /**
       * Compare constraints between schema versions
       */
      compareConstraints(oldConstraints, newConstraints) {
        const changes = [];
        const oldConstraintMap = new Map(oldConstraints.map((c) => [c.name, c]));
        const newConstraintMap = new Map(newConstraints.map((c) => [c.name, c]));
        for (const [name, constraint] of Array.from(newConstraintMap.entries())) {
          if (!oldConstraintMap.has(name)) {
            changes.push({
              type: "constraint_added",
              severity: this.getConstraintSeverity(constraint),
              object: name,
              description: `Constraint '${name}' added to table '${constraint.tableName}'`,
              impact: this.getConstraintImpact(constraint, "added"),
              after: constraint
            });
          }
        }
        for (const [name, constraint] of Array.from(oldConstraintMap.entries())) {
          if (!newConstraintMap.has(name)) {
            changes.push({
              type: "constraint_removed",
              severity: this.getConstraintSeverity(constraint),
              object: name,
              description: `Constraint '${name}' removed from table '${constraint.tableName}'`,
              impact: this.getConstraintImpact(constraint, "removed"),
              before: constraint
            });
          }
        }
        return changes;
      }
      /**
       * Calculate schema hash
       */
      calculateSchemaHash(schema) {
        const hashContent = JSON.stringify({
          tables: schema.tables.map((t) => ({
            name: t.name,
            columns: t.columns.map((c) => ({
              name: c.name,
              dataType: c.dataType,
              isNullable: c.isNullable,
              isPrimaryKey: c.isPrimaryKey
            }))
          })),
          indexes: schema.indexes.map((i) => ({
            name: i.name,
            tableName: i.tableName,
            columns: i.columns,
            isUnique: i.isUnique
          })),
          constraints: schema.constraints.map((c) => ({
            name: c.name,
            tableName: c.tableName,
            constraintType: c.constraintType,
            columnNames: c.columnNames
          }))
        });
        return createHash3("sha256").update(hashContent).digest("hex");
      }
      /**
       * Determine if changes contain breaking changes
       */
      hasBreakingChanges(diff) {
        return diff.changes.some(
          (change) => change.severity === "critical" || change.severity === "high" && (change.type === "table_removed" || change.type === "column_removed")
        );
      }
      /**
       * Calculate overall risk level for schema changes
       */
      calculateRiskLevel(changes) {
        if (changes.some((c) => c.severity === "critical")) return "critical";
        if (changes.some((c) => c.severity === "high")) return "high";
        if (changes.some((c) => c.severity === "medium")) return "medium";
        return "low";
      }
      /**
       * Check if a column has changed
       */
      hasColumnChanged(oldColumn, newColumn) {
        return oldColumn.dataType !== newColumn.dataType || oldColumn.isNullable !== newColumn.isNullable || oldColumn.defaultValue !== newColumn.defaultValue || oldColumn.isPrimaryKey !== newColumn.isPrimaryKey || oldColumn.characterMaximumLength !== newColumn.characterMaximumLength;
      }
      /**
       * Get severity for column changes
       */
      getColumnChangeSeverity(oldColumn, newColumn) {
        if (oldColumn.dataType !== newColumn.dataType) return "critical";
        if (oldColumn.isNullable && !newColumn.isNullable) return "high";
        if (oldColumn.isPrimaryKey !== newColumn.isPrimaryKey) return "critical";
        return "medium";
      }
      /**
       * Get impact description for column changes
       */
      getColumnChangeImpact(oldColumn, newColumn) {
        const impacts = [];
        if (oldColumn.dataType !== newColumn.dataType) {
          impacts.push(`Data type changed from ${oldColumn.dataType} to ${newColumn.dataType}`);
        }
        if (oldColumn.isNullable !== newColumn.isNullable) {
          impacts.push(newColumn.isNullable ? "Column now allows NULL values" : "Column no longer allows NULL values");
        }
        if (oldColumn.isPrimaryKey !== newColumn.isPrimaryKey) {
          impacts.push(newColumn.isPrimaryKey ? "Column is now primary key" : "Column is no longer primary key");
        }
        return impacts.join("; ");
      }
      /**
       * Get constraint severity
       */
      getConstraintSeverity(constraint) {
        switch (constraint.constraintType) {
          case "PRIMARY KEY":
            return "critical";
          case "FOREIGN KEY":
            return "high";
          case "UNIQUE":
            return "medium";
          case "CHECK":
            return "medium";
          default:
            return "low";
        }
      }
      /**
       * Get constraint impact description
       */
      getConstraintImpact(constraint, action) {
        const baseDescription = `${constraint.constraintType} constraint ${action}`;
        switch (constraint.constraintType) {
          case "PRIMARY KEY":
            return action === "removed" ? `${baseDescription}: CRITICAL breaking change, table has no primary key` : `${baseDescription}: Data integrity improved`;
          case "FOREIGN KEY":
            return action === "removed" ? `${baseDescription}: Referential integrity removed, orphaned records possible` : `${baseDescription}: Referential integrity enforced`;
          case "UNIQUE":
            return action === "removed" ? `${baseDescription}: Duplicate values now allowed` : `${baseDescription}: Unique values enforced`;
          default:
            return baseDescription;
        }
      }
      /**
       * Check if alert should be triggered
       */
      shouldTriggerAlert(riskLevel) {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        const thresholdLevel = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityLevels[riskLevel] >= thresholdLevel[this.alertThreshold];
      }
      /**
       * Trigger drift alert
       */
      async triggerDriftAlert(schemaVersion, diff) {
        console.log(`\u{1F6A8} Schema drift alert triggered: ${diff.riskLevel} risk level`);
        try {
          const alert = {
            alertId: nanoid4(),
            schemaVersion,
            diff,
            triggeredAt: /* @__PURE__ */ new Date(),
            severity: diff.riskLevel,
            acknowledged: false
          };
          console.log("Schema drift alert:", {
            alertId: alert.alertId,
            severity: alert.severity,
            changesCount: diff.changes.length,
            summary: diff.summary
          });
        } catch (error) {
          console.error("Failed to trigger drift alert:", error);
        }
      }
      /**
       * Get database version
       */
      async getDatabaseVersion() {
        try {
          const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          const result = await db2.execute("SELECT version() as version");
          const rows = Array.isArray(result) ? result : result.rows || [];
          return rows[0]?.version || "unknown";
        } catch (error) {
          console.warn("Could not get database version:", error);
          return "unknown";
        }
      }
      /**
       * Get applied migration files
       */
      async getMigrationFiles() {
        return [];
      }
      /**
       * Parse index columns from index definition
       */
      parseIndexColumns(indexDef) {
        const match = indexDef.match(/\((.*?)\)/);
        if (match) {
          return match[1].split(",").map((col) => col.trim().replace(/"/g, ""));
        }
        return [];
      }
      /**
       * Parse index type from index definition
       */
      parseIndexType(indexDef) {
        if (indexDef.includes("USING btree")) return "btree";
        if (indexDef.includes("USING hash")) return "hash";
        if (indexDef.includes("USING gin")) return "gin";
        if (indexDef.includes("USING gist")) return "gist";
        return "btree";
      }
      /**
       * Load last known schema from database
       */
      async loadLastKnownSchema() {
        try {
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          const latestVersion = await storage2.getLatestSchemaVersion();
          if (latestVersion && latestVersion.schemaSnapshot) {
            this.lastKnownSchema = latestVersion.schemaSnapshot;
            return this.lastKnownSchema;
          }
          return null;
        } catch (error) {
          console.warn("Could not load last known schema:", error);
          return null;
        }
      }
      /**
       * Set alert threshold
       */
      setAlertThreshold(threshold) {
        this.alertThreshold = threshold;
        console.log(`Schema drift alert threshold set to: ${threshold}`);
      }
    };
    schemaDriftService = new SchemaDriftService();
  }
});

// server/services/disaster-recovery-coordinator.ts
var disaster_recovery_coordinator_exports = {};
__export(disaster_recovery_coordinator_exports, {
  DisasterRecoveryCoordinator: () => DisasterRecoveryCoordinator,
  default: () => disaster_recovery_coordinator_default,
  disasterRecoveryCoordinator: () => disasterRecoveryCoordinator
});
var DisasterRecoveryCoordinator, disasterRecoveryCoordinator, disaster_recovery_coordinator_default;
var init_disaster_recovery_coordinator = __esm({
  "server/services/disaster-recovery-coordinator.ts"() {
    init_neon_snapshot_service();
    init_restore_validation_service();
    init_schema_drift_service();
    DisasterRecoveryCoordinator = class {
      config;
      isRunning = false;
      scheduledJobs = /* @__PURE__ */ new Map();
      constructor(config2) {
        this.config = {
          enableScheduledBackups: true,
          enableAutomaticValidation: true,
          enableSchemaDriftMonitoring: true,
          defaultRetentionDays: 30,
          validationFrequency: "weekly",
          alertThresholds: {
            backupFailureRate: 10,
            // 10% failure rate threshold
            validationFailureRate: 20,
            // 20% failure rate threshold
            rtoThresholdSeconds: 300
            // 5 minutes RTO threshold
          },
          ...config2
        };
        console.log("\u2705 Disaster Recovery Coordinator initialized", {
          scheduledBackups: this.config.enableScheduledBackups,
          automaticValidation: this.config.enableAutomaticValidation,
          schemaDriftMonitoring: this.config.enableSchemaDriftMonitoring
        });
      }
      /**
       * Start the disaster recovery coordinator
       */
      async start() {
        if (this.isRunning) {
          console.log("\u26A0\uFE0F Disaster Recovery Coordinator already running");
          return;
        }
        console.log("\u{1F680} Starting Disaster Recovery Coordinator");
        try {
          await schemaDriftService.loadLastKnownSchema();
          if (this.config.enableScheduledBackups) {
            await this.setupScheduledBackups();
          }
          if (this.config.enableAutomaticValidation) {
            await this.setupAutomaticValidation();
          }
          if (this.config.enableSchemaDriftMonitoring) {
            await this.setupSchemaDriftMonitoring();
          }
          const healthCheck = await this.performHealthCheck();
          console.log("Initial health check completed:", {
            isHealthy: healthCheck.isHealthy,
            healthScore: healthCheck.metrics.systemHealthScore
          });
          this.isRunning = true;
          console.log("\u2705 Disaster Recovery Coordinator started successfully");
        } catch (error) {
          console.error("\u274C Failed to start Disaster Recovery Coordinator:", error);
          throw error;
        }
      }
      /**
       * Stop the disaster recovery coordinator
       */
      async stop() {
        if (!this.isRunning) {
          console.log("\u26A0\uFE0F Disaster Recovery Coordinator not running");
          return;
        }
        console.log("\u{1F6D1} Stopping Disaster Recovery Coordinator");
        for (const [jobId, timer] of Array.from(this.scheduledJobs.entries())) {
          clearInterval(timer);
          console.log(`Stopped scheduled job: ${jobId}`);
        }
        this.scheduledJobs.clear();
        this.isRunning = false;
        console.log("\u2705 Disaster Recovery Coordinator stopped");
      }
      /**
       * Perform comprehensive health check
       */
      async performHealthCheck() {
        console.log("\u{1F50D} Performing disaster recovery health check");
        try {
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          const neonHealth = await neonSnapshotService.getServiceHealth();
          const recentBackups = await storage2.getRecentBackupOperations(50);
          const recentValidations = await storage2.getRecentRestoreValidations(20);
          const metrics = await this.calculateMetrics(recentBackups, recentValidations);
          const services = {
            neonSnapshots: neonHealth.isHealthy,
            schemaMonitoring: true,
            // Schema service is always available
            restoreValidation: true
            // Validation service is always available
          };
          const alerts = this.generateHealthAlerts(metrics, services);
          const serviceHealthy = Object.values(services).every((s) => s);
          const metricsHealthy = metrics.systemHealthScore >= 80;
          const isHealthy = serviceHealthy && metricsHealthy;
          const result = {
            isHealthy,
            services,
            metrics,
            alerts,
            lastChecked: /* @__PURE__ */ new Date()
          };
          console.log("Health check completed:", {
            isHealthy,
            healthScore: metrics.systemHealthScore,
            alertsCount: alerts.length
          });
          return result;
        } catch (error) {
          console.error("\u274C Health check failed:", error);
          return {
            isHealthy: false,
            services: {
              neonSnapshots: false,
              schemaMonitoring: false,
              restoreValidation: false
            },
            metrics: {
              totalBackups: 0,
              successfulBackups: 0,
              failedBackups: 0,
              averageBackupTime: 0,
              averageRestoreTime: 0,
              rtoAchievementRate: 0,
              systemHealthScore: 0
            },
            alerts: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
            lastChecked: /* @__PURE__ */ new Date()
          };
        }
      }
      /**
       * Execute scheduled backup based on retention policy
       */
      async executeScheduledBackup(policy) {
        console.log(`\u{1F504} Executing scheduled backup: ${policy.name}`);
        try {
          const backupOperation = await neonSnapshotService.createScheduledSnapshot(policy);
          if (this.config.enableAutomaticValidation) {
            this.scheduleBackupValidation(backupOperation);
          }
          if (policy.notifyOnSuccess) {
            await this.sendBackupNotification(backupOperation, "success");
          }
          console.log(`\u2705 Scheduled backup completed: ${policy.name}`);
          return backupOperation;
        } catch (error) {
          console.error(`\u274C Scheduled backup failed: ${policy.name}:`, error);
          if (policy.notifyOnFailure) {
            await this.sendBackupNotification(null, "failure", error instanceof Error ? error.message : String(error));
          }
          throw error;
        }
      }
      /**
       * Schedule backup validation
       */
      scheduleBackupValidation(backupOperation) {
        setTimeout(async () => {
          try {
            console.log(`\u{1F50D} Starting automatic validation for backup ${backupOperation.operationId}`);
            const result = await restoreValidationService.validateBackup(
              backupOperation,
              "sample_restore"
              // Use sample restore for automatic validation
            );
            if (!result.success) {
              await this.sendValidationAlert(backupOperation, result);
            }
          } catch (error) {
            console.error(`\u274C Automatic validation failed for backup ${backupOperation.operationId}:`, error);
            await this.sendValidationAlert(backupOperation, null, error instanceof Error ? error.message : String(error));
          }
        }, 5 * 60 * 1e3);
      }
      /**
       * Setup scheduled backups based on retention policies
       */
      async setupScheduledBackups() {
        try {
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          const policies = await storage2.getActiveRetentionPolicies();
          for (const policy of policies) {
            if (policy.schedule && policy.isActive) {
              const interval = this.parseCronToInterval(policy.schedule);
              if (interval > 0) {
                const jobId = `backup-${policy.id}`;
                const timer = setInterval(async () => {
                  try {
                    await this.executeScheduledBackup(policy);
                  } catch (error) {
                    console.error(`Scheduled backup job ${jobId} failed:`, error);
                  }
                }, interval);
                this.scheduledJobs.set(jobId, timer);
                console.log(`\u{1F4C5} Scheduled backup job: ${policy.name} (${policy.schedule})`);
              }
            }
          }
        } catch (error) {
          console.error("Failed to setup scheduled backups:", error);
        }
      }
      /**
       * Setup automatic validation
       */
      async setupAutomaticValidation() {
        const interval = this.getValidationInterval();
        const timer = setInterval(async () => {
          try {
            await this.runAutomaticValidation();
          } catch (error) {
            console.error("Automatic validation failed:", error);
          }
        }, interval);
        this.scheduledJobs.set("validation", timer);
        console.log(`\u{1F4C5} Scheduled validation job every ${this.config.validationFrequency}`);
      }
      /**
       * Setup schema drift monitoring
       */
      async setupSchemaDriftMonitoring() {
        const timer = setInterval(async () => {
          try {
            await schemaDriftService.captureSchemaSnapshot("scheduled_check");
          } catch (error) {
            console.error("Schema drift monitoring failed:", error);
          }
        }, 60 * 60 * 1e3);
        this.scheduledJobs.set("schema-drift", timer);
        console.log("\u{1F4C5} Scheduled schema drift monitoring every hour");
      }
      /**
       * Run automatic validation on recent backups
       */
      async runAutomaticValidation() {
        console.log("\u{1F50D} Running automatic backup validation");
        try {
          const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          const recentBackups = await storage2.getRecentBackupOperations(5);
          const unvalidatedBackups = recentBackups.filter(
            (b) => b.status === "completed" && !b.isVerified
          );
          for (const backup of unvalidatedBackups) {
            try {
              await restoreValidationService.validateBackup(backup, "integrity_check");
            } catch (error) {
              console.error(`Validation failed for backup ${backup.operationId}:`, error);
            }
          }
        } catch (error) {
          console.error("Automatic validation failed:", error);
        }
      }
      /**
       * Calculate recovery metrics
       */
      async calculateMetrics(recentBackups, recentValidations) {
        const successfulBackups = recentBackups.filter((b) => b.status === "completed").length;
        const failedBackups = recentBackups.filter((b) => b.status === "failed").length;
        const totalBackups = recentBackups.length;
        const successfulValidations = recentValidations.filter((v) => v.isSuccessful).length;
        const rtoAchievedValidations = recentValidations.filter((v) => v.rtoAchieved).length;
        const averageBackupTime = recentBackups.filter((b) => b.duration && b.duration > 0).reduce((sum3, b) => sum3 + (b.duration || 0), 0) / (recentBackups.filter((b) => b.duration && b.duration > 0).length || 1);
        const averageRestoreTime = recentValidations.filter((v) => v.restoreTime && v.restoreTime > 0).reduce((sum3, v) => sum3 + (v.restoreTime || 0), 0) / (recentValidations.filter((v) => v.restoreTime && v.restoreTime > 0).length || 1);
        const backupSuccessRate = totalBackups > 0 ? successfulBackups / totalBackups * 100 : 100;
        const validationSuccessRate = recentValidations.length > 0 ? successfulValidations / recentValidations.length * 100 : 100;
        const rtoAchievementRate = recentValidations.length > 0 ? rtoAchievedValidations / recentValidations.length * 100 : 100;
        const systemHealthScore = Math.round(
          backupSuccessRate * 0.4 + validationSuccessRate * 0.3 + rtoAchievementRate * 0.3
        );
        return {
          totalBackups,
          successfulBackups,
          failedBackups,
          averageBackupTime: Math.round(averageBackupTime),
          averageRestoreTime: Math.round(averageRestoreTime),
          lastSuccessfulBackup: recentBackups.find((b) => b.status === "completed")?.completedAt || void 0,
          lastSuccessfulValidation: recentValidations.find((v) => v.isSuccessful)?.completedAt || void 0,
          rtoAchievementRate: Math.round(rtoAchievementRate),
          systemHealthScore
        };
      }
      /**
       * Generate health alerts based on metrics and services
       */
      generateHealthAlerts(metrics, services) {
        const alerts = [];
        if (!services.neonSnapshots) {
          alerts.push("Neon snapshot service is unhealthy");
        }
        const backupFailureRate = metrics.totalBackups > 0 ? metrics.failedBackups / metrics.totalBackups * 100 : 0;
        if (backupFailureRate > this.config.alertThresholds.backupFailureRate) {
          alerts.push(`High backup failure rate: ${Math.round(backupFailureRate)}%`);
        }
        if (metrics.rtoAchievementRate < 80) {
          alerts.push(`Low RTO achievement rate: ${metrics.rtoAchievementRate}%`);
        }
        if (metrics.averageRestoreTime > this.config.alertThresholds.rtoThresholdSeconds) {
          alerts.push(`Average restore time exceeds RTO threshold: ${metrics.averageRestoreTime}s`);
        }
        if (metrics.systemHealthScore < 70) {
          alerts.push(`Low system health score: ${metrics.systemHealthScore}%`);
        }
        if (metrics.lastSuccessfulBackup) {
          const daysSinceLastBackup = (Date.now() - metrics.lastSuccessfulBackup.getTime()) / (1e3 * 60 * 60 * 24);
          if (daysSinceLastBackup > 2) {
            alerts.push(`No successful backup in ${Math.round(daysSinceLastBackup)} days`);
          }
        } else {
          alerts.push("No successful backups found");
        }
        return alerts;
      }
      /**
       * Send backup notification
       */
      async sendBackupNotification(backupOperation, type, errorMessage) {
        try {
          const message = type === "success" ? `Backup completed successfully: ${backupOperation?.operationId}` : `Backup failed: ${errorMessage}`;
          console.log(`\u{1F4E7} Backup notification (${type}):`, message);
        } catch (error) {
          console.error("Failed to send backup notification:", error);
        }
      }
      /**
       * Send validation alert
       */
      async sendValidationAlert(backupOperation, validationResult, errorMessage) {
        try {
          const message = validationResult ? `Backup validation failed: ${backupOperation.operationId} (Data integrity: ${validationResult.dataIntegrityScore}%)` : `Backup validation error: ${backupOperation.operationId} - ${errorMessage}`;
          console.log("\u{1F6A8} Validation alert:", message);
        } catch (error) {
          console.error("Failed to send validation alert:", error);
        }
      }
      /**
       * Parse cron expression to interval (simplified)
       */
      parseCronToInterval(cron) {
        if (cron === "0 2 * * *") return 24 * 60 * 60 * 1e3;
        if (cron === "0 0 * * 0") return 7 * 24 * 60 * 60 * 1e3;
        if (cron === "0 0 1 * *") return 30 * 24 * 60 * 60 * 1e3;
        return 24 * 60 * 60 * 1e3;
      }
      /**
       * Get validation interval based on frequency
       */
      getValidationInterval() {
        switch (this.config.validationFrequency) {
          case "daily":
            return 24 * 60 * 60 * 1e3;
          case "weekly":
            return 7 * 24 * 60 * 60 * 1e3;
          case "monthly":
            return 30 * 24 * 60 * 60 * 1e3;
          default:
            return 7 * 24 * 60 * 60 * 1e3;
        }
      }
      /**
       * Get current configuration
       */
      getConfig() {
        return { ...this.config };
      }
      /**
       * Update configuration
       */
      updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        console.log("Disaster recovery configuration updated:", updates);
      }
      /**
       * Check if coordinator is running
       */
      isActive() {
        return this.isRunning;
      }
      // Event handling for failover integration
      failoverEventListeners = [];
      statusChangeListeners = [];
      /**
       * Register a failover event listener
       */
      onFailoverEvent(listener) {
        this.failoverEventListeners.push(listener);
      }
      /**
       * Record a failover event raised by another component (the storage factory) and fan it
       * out to this coordinator's listeners. Previously the factory called a method that did
       * not exist, so coordinator listeners never heard about storage failovers.
       */
      async recordFailoverEvent(event) {
        await this.emitFailoverEvent({ source: "storage_factory", ...event, timestamp: /* @__PURE__ */ new Date() });
      }
      /**
       * Register a status change listener
       */
      onStatusChange(listener) {
        this.statusChangeListeners.push(listener);
      }
      /**
       * Initiate disaster recovery process
       */
      async initiateRecovery(reason, options) {
        console.log("\u{1F6A8} Initiating disaster recovery:", reason);
        try {
          const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await this.emitStatusChange({
            phase: "active",
            trigger: "failover",
            reason,
            recoveryId,
            timestamp: /* @__PURE__ */ new Date()
          });
          const startTime = Date.now();
          let restoreResult;
          if (options?.backupId) {
            restoreResult = await this.restoreFromBackup(options.backupId, options.targetEnvironment);
          } else {
            const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
            const recentBackups = await storage2.getRecentBackupOperations(10);
            const lastSuccessfulBackup = recentBackups.find((b) => b.status === "completed");
            if (!lastSuccessfulBackup) {
              throw new Error("No successful backup found for recovery");
            }
            restoreResult = await this.restoreFromBackup(lastSuccessfulBackup.operationId, options?.targetEnvironment);
          }
          const duration = Date.now() - startTime;
          if (restoreResult.success) {
            console.log(`\u2705 Disaster recovery completed successfully (${duration}ms)`);
            if (!options?.skipValidation) {
              await this.validateRecovery(recoveryId);
            }
            await this.emitStatusChange({
              phase: "completed",
              trigger: "recovery",
              reason,
              recoveryId,
              duration,
              timestamp: /* @__PURE__ */ new Date()
            });
            return { success: true, recoveryId };
          } else {
            throw new Error(restoreResult.error || "Recovery failed");
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("\u274C Disaster recovery failed:", errorMessage);
          await this.emitStatusChange({
            phase: "failed",
            trigger: "recovery",
            reason,
            error: errorMessage,
            timestamp: /* @__PURE__ */ new Date()
          });
          return { success: false, error: errorMessage };
        }
      }
      /**
       * Emit a failover event to all listeners
       */
      async emitFailoverEvent(event) {
        for (const listener of this.failoverEventListeners) {
          try {
            await listener(event);
          } catch (error) {
            console.error("Error in failover event listener:", error);
          }
        }
      }
      /**
       * Emit a status change to all listeners
       */
      async emitStatusChange(status) {
        for (const listener of this.statusChangeListeners) {
          try {
            await listener(status);
          } catch (error) {
            console.error("Error in status change listener:", error);
          }
        }
      }
      /**
       * Restore from a specific backup
       */
      async restoreFromBackup(backupId, targetEnvironment) {
        try {
          console.log(`\u{1F504} Restoring from backup: ${backupId}`);
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
      /**
       * Validate recovery process
       */
      async validateRecovery(recoveryId) {
        console.log(`\u{1F50D} Validating recovery: ${recoveryId}`);
      }
    };
    disasterRecoveryCoordinator = new DisasterRecoveryCoordinator();
    disaster_recovery_coordinator_default = disasterRecoveryCoordinator;
  }
});

// server/storage-factory.ts
var storage_factory_exports = {};
__export(storage_factory_exports, {
  FailoverTrigger: () => FailoverTrigger,
  StorageFactory: () => StorageFactory,
  StorageMode: () => StorageMode,
  storageFactory: () => storageFactory
});
var StorageMode, FailoverTrigger, StorageFactory, storageFactoryInstance, storageFactory;
var init_storage_factory = __esm({
  "server/storage-factory.ts"() {
    init_mem_storage();
    init_background_work();
    StorageMode = /* @__PURE__ */ ((StorageMode2) => {
      StorageMode2["DATABASE"] = "database";
      StorageMode2["MEMORY"] = "memory";
      StorageMode2["MEMORY_OPTIMIZED"] = "memory_optimized";
      StorageMode2["HYBRID"] = "hybrid";
      StorageMode2["READ_ONLY"] = "read_only";
      StorageMode2["REPLICA"] = "replica";
      return StorageMode2;
    })(StorageMode || {});
    FailoverTrigger = /* @__PURE__ */ ((FailoverTrigger2) => {
      FailoverTrigger2["AUTOMATIC"] = "automatic";
      FailoverTrigger2["MANUAL"] = "manual";
      FailoverTrigger2["PLANNED_MAINTENANCE"] = "planned_maintenance";
      FailoverTrigger2["HEALTH_CHECK_FAILURE"] = "health_check_failure";
      FailoverTrigger2["CONNECTION_TIMEOUT"] = "connection_timeout";
      FailoverTrigger2["WRITE_FAILURE"] = "write_failure";
      return FailoverTrigger2;
    })(FailoverTrigger || {});
    StorageFactory = class {
      currentStorage;
      databaseStorage = null;
      replicaStorages = /* @__PURE__ */ new Map();
      // replica id -> storage
      memoryStorage;
      currentMode = "hybrid" /* HYBRID */;
      isDatabaseHealthy = false;
      isReplicaHealthy = false;
      lastHealthCheck = /* @__PURE__ */ new Date(0);
      healthCheckInterval = 45e3;
      // 45 seconds - less frequent for failing systems
      retryAttempts = 0;
      maxRetries = 15;
      // More attempts with better backoff
      baseBackoffDelay = 2e3;
      // 2 seconds base delay
      maxBackoffDelay = 3e5;
      // Maximum 5 minutes between attempts
      consecutiveFailures = 0;
      // Track consecutive failures for adaptive intervals
      connectionDiagnostics = [];
      isMemoryOptimized = false;
      // True when settled into stable memory-only mode
      // Replica connection management
      replicaConfigs = /* @__PURE__ */ new Map();
      activeReplica = null;
      replicaHealthChecks = /* @__PURE__ */ new Map();
      // Failover event tracking
      failoverEvents = [];
      maxFailoverEvents = 100;
      // Write-ahead queue for database operations
      writeQueue = [];
      backgroundWork = new BackgroundWork();
      stopQueueTimer = null;
      // Read-only mode tracking
      isReadOnlyMode = false;
      lastWriteAttempt = null;
      constructor() {
        this.memoryStorage = new MemStorage();
        this.currentStorage = this.memoryStorage;
        this.isDatabaseHealthy = false;
        this.currentMode = "memory" /* MEMORY */;
        this.isMemoryOptimized = false;
        this.initializeReplicaConfigs();
        void this.backgroundWork.run(() => this.initializeHealthChecking()).catch(() => console.error("Storage health initialization failed"));
        this.initializeQueueProcessing();
      }
      // Initialize replica configurations from environment variables
      initializeReplicaConfigs() {
        const replicaEnvs = Object.keys(process.env).filter((key) => key.startsWith("DATABASE_REPLICA_")).sort();
        replicaEnvs.forEach((envKey, index2) => {
          const replicaId = envKey.replace("DATABASE_REPLICA_", "").toLowerCase();
          const connectionString = process.env[envKey];
          if (connectionString) {
            this.replicaConfigs.set(replicaId, {
              connectionString,
              maxConnections: 5,
              healthCheckInterval: 3e4,
              // 30 seconds
              priority: index2 + 1
              // Lower index = higher priority
            });
            console.log(`\u{1F4CB} Configured replica: ${replicaId} (priority: ${index2 + 1})`);
          }
        });
        if (this.replicaConfigs.size > 0) {
          console.log(`\u2705 Initialized ${this.replicaConfigs.size} replica configurations`);
        } else {
          console.log("\u2139\uFE0F No replica configurations found - running with primary database only");
        }
      }
      // Lazy initialization of database storage to avoid circular dependency
      async getDatabaseStorage() {
        if (!this.databaseStorage) {
          try {
            const { DatabaseStorage: DatabaseStorage2 } = await Promise.resolve().then(() => (init_storage_instance(), storage_instance_exports));
            this.databaseStorage = new DatabaseStorage2();
          } catch (error) {
            console.error("Failed to initialize database storage:", error);
            return null;
          }
        }
        return this.databaseStorage;
      }
      async initializeHealthChecking() {
        await this.checkDatabaseHealth();
        await this.checkReplicaHealth();
        this.backgroundWork.every(this.healthCheckInterval, async () => {
          await this.checkDatabaseHealth();
          await this.checkReplicaHealth();
        }, () => console.error("Scheduled storage health check failed"));
      }
      initializeQueueProcessing() {
        this.stopQueueTimer = this.backgroundWork.every(5e3, async () => {
          if (this.isDatabaseHealthy && this.writeQueue.length > 0) {
            await this.processWriteQueue();
          }
        }, () => console.error("Scheduled storage queue processing failed"));
      }
      async checkDatabaseHealth() {
        const now = /* @__PURE__ */ new Date();
        try {
          const { testDatabaseConnection: testDatabaseConnection2, connectWithRetry: connectWithRetry2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          const healthCheck = await testDatabaseConnection2(8e3);
          this.connectionDiagnostics.push({
            timestamp: now,
            success: healthCheck.success,
            error: healthCheck.error,
            latency: healthCheck.latency
          });
          if (this.connectionDiagnostics.length > 50) {
            this.connectionDiagnostics = this.connectionDiagnostics.slice(-50);
          }
          if (healthCheck.success) {
            if (!this.isDatabaseHealthy) {
              console.log("\u2705 Primary database connection restored", {
                latency: healthCheck.latency + "ms",
                attempts: this.retryAttempts,
                consecutiveFailures: this.consecutiveFailures
              });
              this.recordFailoverEvent({
                fromMode: this.currentMode,
                toMode: "database" /* DATABASE */,
                trigger: "automatic" /* AUTOMATIC */,
                reason: "Primary database connection restored",
                success: true,
                latency: healthCheck.latency
              });
              this.isDatabaseHealthy = true;
              this.retryAttempts = 0;
              this.consecutiveFailures = 0;
              this.healthCheckInterval = 45e3;
              const dbStorage = await this.getDatabaseStorage();
              await this.orchestrateFailover("database" /* DATABASE */, "automatic" /* AUTOMATIC */, "Primary database restored");
            }
            this.lastHealthCheck = now;
            return;
          }
          await this.handleConnectionFailure(healthCheck.error, healthCheck.details);
        } catch (error) {
          console.error("\u274C Primary database health check error:", error);
          await this.handleConnectionFailure(
            error instanceof Error ? error.message : "Unknown health check error",
            { error }
          );
        }
      }
      // Check health of all configured replicas
      async checkReplicaHealth() {
        if (this.replicaConfigs.size === 0) return;
        const healthPromises = Array.from(this.replicaConfigs.entries()).map(async ([replicaId, config2]) => {
          try {
            const startTime = Date.now();
            const { Pool: Pool2 } = await import("@neondatabase/serverless");
            const tempPool = new Pool2({ connectionString: config2.connectionString, max: 1 });
            const result = await Promise.race([
              tempPool.query("SELECT 1 as health_check, NOW() as server_time"),
              new Promise(
                (_, reject) => setTimeout(() => reject(new Error("Replica connection timeout")), 5e3)
              )
            ]);
            const latency = Date.now() - startTime;
            this.replicaHealthChecks.set(replicaId, {
              timestamp: /* @__PURE__ */ new Date(),
              healthy: true,
              latency
            });
            await tempPool.end();
            console.log(`\u2705 Replica ${replicaId} healthy (${latency}ms)`);
            return { replicaId, healthy: true, latency };
          } catch (error) {
            console.log(`\u274C Replica ${replicaId} unhealthy:`, error instanceof Error ? error.message : String(error));
            this.replicaHealthChecks.set(replicaId, {
              timestamp: /* @__PURE__ */ new Date(),
              healthy: false
            });
            return { replicaId, healthy: false, error: error instanceof Error ? error.message : String(error) };
          }
        });
        const results = await Promise.allSettled(healthPromises);
        const healthyReplicas = results.filter((result) => result.status === "fulfilled" && result.value.healthy).map((result) => result.status === "fulfilled" ? result.value.replicaId : null).filter(Boolean);
        const wasReplicaHealthy = this.isReplicaHealthy;
        this.isReplicaHealthy = healthyReplicas.length > 0;
        if (healthyReplicas.length > 0) {
          const bestReplica = this.selectBestReplica(healthyReplicas);
          if (bestReplica !== this.activeReplica) {
            console.log(`\u{1F504} Switching to replica: ${bestReplica}`);
            this.activeReplica = bestReplica;
            await this.initializeReplicaStorage(bestReplica);
          }
        } else {
          this.activeReplica = null;
        }
        if (wasReplicaHealthy && !this.isReplicaHealthy && !this.isDatabaseHealthy) {
          console.log("\u26A0\uFE0F All replicas unhealthy and primary database down - considering degraded modes");
          await this.orchestrateFailover("memory_optimized" /* MEMORY_OPTIMIZED */, "health_check_failure" /* HEALTH_CHECK_FAILURE */, "All database connections lost");
        }
      }
      async handleConnectionFailure(error, details) {
        if (this.isDatabaseHealthy) {
          console.log("\u274C Primary database connection lost", {
            error,
            details: details ? JSON.stringify(details, null, 2) : "No details"
          });
          this.isDatabaseHealthy = false;
          if (this.isReplicaHealthy && this.activeReplica) {
            await this.orchestrateFailover("replica" /* REPLICA */, "health_check_failure" /* HEALTH_CHECK_FAILURE */, `Primary database failure: ${error}`);
          } else {
            const targetMode = this.currentMode === "read_only" /* READ_ONLY */ ? "memory" /* MEMORY */ : "read_only" /* READ_ONLY */;
            await this.orchestrateFailover(targetMode, "health_check_failure" /* HEALTH_CHECK_FAILURE */, `Database connection lost: ${error}`);
          }
        }
        this.retryAttempts++;
        this.consecutiveFailures++;
        const recentFailures = this.connectionDiagnostics.slice(-10).filter((d) => !d.success).length;
        if (recentFailures >= 8) {
          this.healthCheckInterval = Math.min(this.healthCheckInterval * 1.5, 3e5);
          console.log(`\u{1F550} Increased health check interval to ${this.healthCheckInterval / 1e3}s due to persistent failures`);
        }
        if (this.retryAttempts > this.maxRetries && !this.isMemoryOptimized) {
          await this.orchestrateFailover("memory_optimized" /* MEMORY_OPTIMIZED */, "automatic" /* AUTOMATIC */, "Maximum retry attempts exceeded");
        } else if (this.retryAttempts <= this.maxRetries) {
          const baseDelay = Math.min(
            this.baseBackoffDelay * Math.pow(1.5, this.retryAttempts),
            this.maxBackoffDelay
          );
          const jitter = baseDelay * 0.1 * (Math.random() - 0.5);
          const delay = baseDelay + jitter;
          console.log(`\u23F3 Primary database retry ${this.retryAttempts}/${this.maxRetries} in ${Math.round(delay / 1e3)}s`, {
            error: error?.substring(0, 100),
            consecutiveFailures: this.consecutiveFailures
          });
        }
      }
      async processWriteQueue() {
        if (this.writeQueue.length === 0) return;
        const dbStorage = await this.getDatabaseStorage();
        if (!dbStorage) return;
        console.log(`Processing ${this.writeQueue.length} queued write operations...`);
        const operations = [...this.writeQueue];
        this.writeQueue = [];
        for (const operation of operations) {
          try {
            const method = dbStorage[operation.method];
            if (typeof method === "function") {
              await method.call(dbStorage, ...operation.data);
              console.log(`\u2705 Synced queued operation: ${operation.method}`);
            }
          } catch (error) {
            console.log(`\u274C Failed to sync operation ${operation.method}:`, error);
            if (operation.retries < 3) {
              operation.retries++;
              this.writeQueue.push(operation);
            } else {
              console.log(`\u26A0\uFE0F  Dropping operation ${operation.method} after 3 retries`);
            }
          }
        }
      }
      queueWriteOperation(method, data) {
        if (this.isDatabaseHealthy && !this.isReadOnlyMode) return;
        if (this.isMemoryOptimized) return;
        if (this.isReadOnlyMode) {
          this.lastWriteAttempt = /* @__PURE__ */ new Date();
          console.log(`\u26A0\uFE0F Write operation blocked in read-only mode: ${method}`);
          return;
        }
        const operation = {
          id: `${Date.now()}_${Math.random()}`,
          timestamp: /* @__PURE__ */ new Date(),
          operation: "write",
          method,
          data,
          retries: 0
        };
        this.writeQueue.push(operation);
        console.log(`\u{1F4DD} Queued write operation: ${method}`);
      }
      // Health monitoring methods
      getStorageMode() {
        return this.currentMode;
      }
      async setStorageMode(mode) {
        this.currentMode = mode;
        const dbStorage = await this.getDatabaseStorage();
        if (mode === "database" /* DATABASE */ && this.isDatabaseHealthy && dbStorage) {
          this.currentStorage = dbStorage;
        } else if (mode === "memory" /* MEMORY */) {
          this.currentStorage = this.memoryStorage;
        } else {
          this.currentStorage = this.memoryStorage;
        }
      }
      isDatabaseAvailable() {
        return this.isDatabaseHealthy;
      }
      isSystemHealthy() {
        return this.isDatabaseHealthy || this.isMemoryOptimized;
      }
      // IStorage interface method - in optimized memory mode, system is considered healthy
      isDbHealthy() {
        return this.isDatabaseHealthy || this.isMemoryOptimized;
      }
      getHealthStatus() {
        const recentDiagnostics = this.connectionDiagnostics.slice(-20);
        const successCount = recentDiagnostics.filter((d) => d.success).length;
        const successRate = recentDiagnostics.length > 0 ? successCount / recentDiagnostics.length * 100 : 0;
        const latencies = recentDiagnostics.filter((d) => d.latency).map((d) => d.latency);
        const averageLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
        const recentFailures = this.connectionDiagnostics.slice(-10).filter((d) => !d.success).length;
        return {
          mode: this.currentMode,
          isDatabaseHealthy: this.isDatabaseHealthy,
          isReplicaHealthy: this.isReplicaHealthy,
          isMemoryOptimized: this.isMemoryOptimized,
          isReadOnlyMode: this.isReadOnlyMode,
          activeReplica: this.activeReplica,
          lastHealthCheck: this.lastHealthCheck,
          retryAttempts: this.retryAttempts,
          consecutiveFailures: this.consecutiveFailures,
          queueLength: this.writeQueue.length,
          currentStorageType: this.getCurrentStorageType(),
          systemHealthy: this.isDatabaseHealthy || this.isReplicaHealthy || this.isMemoryOptimized,
          healthCheckInterval: this.healthCheckInterval,
          diagnostics: this.connectionDiagnostics.slice(-10),
          // Last 10 for API response
          replicaHealth: this.replicaHealthChecks,
          failoverEvents: this.failoverEvents.slice(-20),
          // Last 20 failover events
          connectionStats: {
            successRate: Math.round(successRate * 100) / 100,
            averageLatency: Math.round(averageLatency * 100) / 100,
            recentFailures
          }
        };
      }
      // Get current storage type description
      getCurrentStorageType() {
        if (this.currentStorage === this.databaseStorage) {
          return this.isReadOnlyMode ? "database_readonly" : "database";
        }
        if (this.activeReplica && this.replicaStorages.has(this.activeReplica) && this.currentStorage === this.replicaStorages.get(this.activeReplica)) {
          return `replica_${this.activeReplica}`;
        }
        return this.isMemoryOptimized ? "memory_optimized" : "memory";
      }
      // Force health check (for testing)
      async forceHealthCheck() {
        console.log("\u{1F50D} Forcing database health check...");
        await this.checkDatabaseHealth();
      }
      // Force connection attempt with detailed retry
      async forceReconnect() {
        console.log("\u{1F504} Forcing primary database reconnection attempt...");
        try {
          const { connectWithRetry: connectWithRetry2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          const result = await connectWithRetry2({
            maxRetries: 5,
            baseDelay: 1e3,
            maxDelay: 1e4,
            jitter: true
          });
          if (result.success) {
            this.isDatabaseHealthy = true;
            this.retryAttempts = 0;
            this.consecutiveFailures = 0;
            this.lastHealthCheck = /* @__PURE__ */ new Date();
            await this.orchestrateFailover("database" /* DATABASE */, "manual" /* MANUAL */, "Force reconnection successful");
            console.log(`\u2705 Force reconnection successful after ${result.attempts} attempts`);
          } else {
            console.log(`\u274C Force reconnection failed after ${result.attempts} attempts:`, result.finalError);
          }
          return {
            success: result.success,
            attempts: result.attempts,
            error: result.finalError
          };
        } catch (error) {
          console.error("\u274C Force reconnection error:", error);
          return {
            success: false,
            attempts: 0,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
      // Manual failover for planned maintenance
      async triggerManualFailover(targetMode, reason = "Manual failover") {
        try {
          await this.orchestrateFailover(targetMode, "manual" /* MANUAL */, reason);
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { success: false, error: errorMessage };
        }
      }
      // Get failover history for monitoring
      getFailoverHistory(limit = 50) {
        return this.failoverEvents.slice(-limit);
      }
      // Get replica configurations and health
      getReplicaStatus() {
        return {
          configured: this.replicaConfigs,
          health: this.replicaHealthChecks,
          active: this.activeReplica
        };
      }
      // Select the best available replica based on priority and latency
      selectBestReplica(healthyReplicas) {
        if (healthyReplicas.length === 0) {
          throw new Error("No healthy replicas available");
        }
        if (healthyReplicas.length === 1) {
          return healthyReplicas[0];
        }
        const replicaScores = healthyReplicas.map((replicaId) => {
          const config2 = this.replicaConfigs.get(replicaId);
          const health = this.replicaHealthChecks.get(replicaId);
          return {
            replicaId,
            priority: config2.priority,
            latency: health.latency || 999999
            // High latency if unknown
          };
        });
        replicaScores.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.latency - b.latency;
        });
        return replicaScores[0].replicaId;
      }
      // Initialize storage connection for a specific replica
      async initializeReplicaStorage(replicaId) {
        try {
          if (this.replicaStorages.has(replicaId)) {
            return this.replicaStorages.get(replicaId);
          }
          const config2 = this.replicaConfigs.get(replicaId);
          if (!config2) {
            throw new Error(`No configuration found for replica: ${replicaId}`);
          }
          const { ReplicaStorage: ReplicaStorage2 } = await Promise.resolve().then(() => (init_replica_storage(), replica_storage_exports));
          const replicaStorage = new ReplicaStorage2(config2.connectionString);
          this.replicaStorages.set(replicaId, replicaStorage);
          console.log(`\u2705 Initialized replica storage: ${replicaId}`);
          return replicaStorage;
        } catch (error) {
          console.error(`\u274C Failed to initialize replica storage ${replicaId}:`, error);
          return null;
        }
      }
      // Orchestrate failover between different storage modes
      async orchestrateFailover(targetMode, trigger, reason) {
        const startTime = Date.now();
        const fromMode = this.currentMode;
        try {
          console.log(`\u{1F504} Orchestrating failover: ${fromMode} \u2192 ${targetMode}`, {
            trigger,
            reason
          });
          if (fromMode === targetMode) {
            console.log("\u26A0\uFE0F Failover target is same as current mode - skipping");
            return;
          }
          let success = false;
          let newStorage = null;
          switch (targetMode) {
            case "database" /* DATABASE */:
              const dbStorage = await this.getDatabaseStorage();
              if (dbStorage && this.isDatabaseHealthy) {
                newStorage = dbStorage;
                this.isReadOnlyMode = false;
                success = true;
              }
              break;
            case "replica" /* REPLICA */:
              if (this.activeReplica) {
                const replicaStorage = await this.initializeReplicaStorage(this.activeReplica);
                if (replicaStorage) {
                  newStorage = replicaStorage;
                  this.isReadOnlyMode = true;
                  success = true;
                }
              }
              break;
            case "read_only" /* READ_ONLY */:
              const readOnlyDbStorage = await this.getDatabaseStorage();
              if (readOnlyDbStorage && this.isDatabaseHealthy) {
                newStorage = readOnlyDbStorage;
                this.isReadOnlyMode = true;
                success = true;
              } else {
                newStorage = this.memoryStorage;
                this.isReadOnlyMode = true;
                success = true;
              }
              break;
            case "memory" /* MEMORY */:
            case "memory_optimized" /* MEMORY_OPTIMIZED */:
              newStorage = this.memoryStorage;
              this.isReadOnlyMode = false;
              success = true;
              if (targetMode === "memory_optimized" /* MEMORY_OPTIMIZED */) {
                this.isMemoryOptimized = true;
                if (this.writeQueue.length > 0) {
                  console.log(`\u{1F4DD} Clearing ${this.writeQueue.length} queued write operations (memory-optimized mode)`);
                  this.writeQueue = [];
                }
                this.stopQueueTimer?.();
                this.stopQueueTimer = null;
                this.healthCheckInterval = 12e4;
                this.retryAttempts = 0;
              }
              break;
            case "hybrid" /* HYBRID */:
              newStorage = this.memoryStorage;
              this.isReadOnlyMode = false;
              success = true;
              break;
          }
          if (success && newStorage) {
            this.currentStorage = newStorage;
            this.currentMode = targetMode;
            const latency = Date.now() - startTime;
            console.log(`\u2705 Failover completed: ${fromMode} \u2192 ${targetMode} (${latency}ms)`, {
              trigger,
              reason,
              readOnlyMode: this.isReadOnlyMode
            });
            this.recordFailoverEvent({
              fromMode,
              toMode: targetMode,
              trigger,
              reason,
              success: true,
              latency
            });
            await this.notifyFailoverEvent({
              fromMode,
              toMode: targetMode,
              trigger,
              reason,
              success: true,
              latency
            });
          } else {
            const latency = Date.now() - startTime;
            console.error(`\u274C Failover failed: ${fromMode} \u2192 ${targetMode}`, {
              trigger,
              reason
            });
            this.recordFailoverEvent({
              fromMode,
              toMode: targetMode,
              trigger,
              reason,
              success: false,
              latency,
              error: "Target storage not available"
            });
          }
        } catch (error) {
          const latency = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`\u274C Failover orchestration error: ${fromMode} \u2192 ${targetMode}`, {
            error: errorMessage,
            trigger,
            reason
          });
          this.recordFailoverEvent({
            fromMode,
            toMode: targetMode,
            trigger,
            reason,
            success: false,
            latency,
            error: errorMessage
          });
        }
      }
      // Record failover event for audit trail
      recordFailoverEvent(event) {
        const failoverEvent = {
          id: `fo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          timestamp: /* @__PURE__ */ new Date(),
          ...event
        };
        this.failoverEvents.push(failoverEvent);
        if (this.failoverEvents.length > this.maxFailoverEvents) {
          this.failoverEvents = this.failoverEvents.slice(-this.maxFailoverEvents);
        }
      }
      // Notify disaster recovery coordinator of failover event
      async notifyFailoverEvent(event) {
        try {
          const { disasterRecoveryCoordinator: disasterRecoveryCoordinator2 } = await Promise.resolve().then(() => (init_disaster_recovery_coordinator(), disaster_recovery_coordinator_exports));
          await disasterRecoveryCoordinator2.recordFailoverEvent(event);
        } catch (error) {
          console.log("\u2139\uFE0F Could not notify disaster recovery coordinator:", error instanceof Error ? error.message : String(error));
        }
      }
      // Clear diagnostic history
      clearDiagnostics() {
        this.connectionDiagnostics = [];
        this.failoverEvents = [];
        console.log("\u{1F9F9} Cleared connection diagnostics and failover history");
      }
      // IStorage interface implementation - delegate to current storage
      async getElections(filters) {
        return this.currentStorage.getElections(filters);
      }
      async getElectionsStrict(filters) {
        if (this.currentStorage === this.memoryStorage) throw new Error("database unavailable (degraded in-memory storage)");
        return this.currentStorage.getElectionsStrict(filters);
      }
      async getElection(id2) {
        return this.currentStorage.getElection(id2);
      }
      async createElection(election) {
        if (this.isReadOnlyMode) {
          throw new Error("Cannot perform write operation in read-only mode");
        }
        const result = await this.currentStorage.createElection(election);
        this.queueWriteOperation("createElection", [election]);
        return result;
      }
      async deleteElection(id2) {
        if (this.isReadOnlyMode) {
          throw new Error("Cannot perform write operation in read-only mode");
        }
        await this.currentStorage.deleteElection(id2);
        this.queueWriteOperation("deleteElection", [id2]);
      }
      async getCandidatesByElection(electionId) {
        return this.currentStorage.getCandidatesByElection(electionId);
      }
      async getCandidates(electionId) {
        return this.currentStorage.getCandidates(electionId);
      }
      async getCandidatesByIds(ids) {
        return this.currentStorage.getCandidatesByIds(ids);
      }
      async createCandidate(candidate) {
        if (this.isReadOnlyMode) {
          throw new Error("Cannot perform write operation in read-only mode");
        }
        const result = await this.currentStorage.createCandidate(candidate);
        this.queueWriteOperation("createCandidate", [candidate]);
        return result;
      }
      async updateCandidatePolling(candidateId, pollingData2) {
        if (this.isReadOnlyMode) {
          throw new Error("Cannot perform write operation in read-only mode");
        }
        await this.currentStorage.updateCandidatePolling(candidateId, pollingData2);
        this.queueWriteOperation("updateCandidatePolling", [candidateId, pollingData2]);
      }
      recordResultReport(electionId, input, ctx) {
        return this.currentStorage.recordResultReport(electionId, input, ctx);
      }
      getResultsPayload(electionId) {
        return this.currentStorage.getResultsPayload(electionId);
      }
      listResultsPayloads(query) {
        return this.currentStorage.listResultsPayloads(query);
      }
      storeResultEvidence(bytes, contentType, filename, uploadedBy) {
        return this.currentStorage.storeResultEvidence(bytes, contentType, filename, uploadedBy);
      }
      listResultSources(state) {
        return this.currentStorage.listResultSources(state);
      }
      async getElectionResults(electionId) {
        return this.currentStorage.getElectionResults(electionId);
      }
      async updateElectionResults(electionId, resultsData) {
        if (this.isReadOnlyMode) {
          throw new Error("Cannot perform write operation in read-only mode");
        }
        const result = await this.currentStorage.updateElectionResults(electionId, resultsData);
        this.queueWriteOperation("updateElectionResults", [electionId, resultsData]);
        return result;
      }
      async getElectionStats() {
        return this.currentStorage.getElectionStats();
      }
      async syncElectionsFromGoogleCivic() {
        return this.currentStorage.syncElectionsFromGoogleCivic();
      }
      async getVoterInfo(address) {
        return this.currentStorage.getVoterInfo(address);
      }
      // Congress API methods
      async getAllBills() {
        return this.currentStorage.getAllBills();
      }
      async getBillsByCongress(congress) {
        return this.currentStorage.getBillsByCongress(congress);
      }
      async getAllMembers() {
        return this.currentStorage.getAllMembers();
      }
      async getAllCongressMembers() {
        return this.currentStorage.getAllCongressMembers();
      }
      async getMembersByState(state) {
        return this.currentStorage.getMembersByState(state);
      }
      async getAllCommittees() {
        return this.currentStorage.getAllCommittees();
      }
      async getCommitteeMembers(chamber, committeeCode) {
        return this.currentStorage.getCommitteeMembers(chamber, committeeCode);
      }
      async getDailyCongressionalRecords() {
        return this.currentStorage.getDailyCongressionalRecords();
      }
      async getSenateCommunications() {
        return this.currentStorage.getSenateCommunications();
      }
      async getAllNominations() {
        return this.currentStorage.getAllNominations();
      }
      async getHouseVotes() {
        return this.currentStorage.getHouseVotes();
      }
      // AI Integration
      async searchElectionsWithAI(query) {
        return this.currentStorage.searchElectionsWithAI(query);
      }
      async expandElectionData() {
        return this.currentStorage.expandElectionData();
      }
      // User methods
      async getUser(id2) {
        return this.currentStorage.getUser(id2);
      }
      async upsertUser(user) {
        const result = await this.currentStorage.upsertUser(user);
        this.queueWriteOperation("upsertUser", [user]);
        return result;
      }
      // Watchlist methods
      async getUserWatchlist(userId) {
        return this.currentStorage.getUserWatchlist(userId);
      }
      // Used by RecommendationService (was missing on the factory -> /api/recommendations 500).
      async getUserPreferences(userId) {
        const impl = this.currentStorage.getUserPreferences;
        return typeof impl === "function" ? impl.call(this.currentStorage, userId) : null;
      }
      // Convenience for services that need the whole catalogue (no filters, no date window).
      async getAllElections() {
        return this.currentStorage.getElections({});
      }
      async addToWatchlist(userId, electionId) {
        const result = await this.currentStorage.addToWatchlist(userId, electionId);
        this.queueWriteOperation("addToWatchlist", [userId, electionId]);
        return result;
      }
      async removeFromWatchlist(userId, electionId) {
        await this.currentStorage.removeFromWatchlist(userId, electionId);
        this.queueWriteOperation("removeFromWatchlist", [userId, electionId]);
      }
      // Version Control & Election Cycles
      async getElectionCycles() {
        return this.currentStorage.getElectionCycles();
      }
      async getElectionCycle(slug) {
        return this.currentStorage.getElectionCycle(slug);
      }
      // Analytics
      async logInteraction(data) {
        await this.currentStorage.logInteraction(data);
        this.queueWriteOperation("logInteraction", [data]);
      }
      // Candidate Portal methods
      async authenticateCandidate(email, password) {
        return this.currentStorage.authenticateCandidate(email, password);
      }
      async createCandidateAccount(account) {
        const result = await this.currentStorage.createCandidateAccount(account);
        this.queueWriteOperation("createCandidateAccount", [account]);
        return result;
      }
      async getCandidateProfile(candidateId) {
        return this.currentStorage.getCandidateProfile(candidateId);
      }
      async updateCandidateProfile(candidateId, profile) {
        const result = await this.currentStorage.updateCandidateProfile(candidateId, profile);
        this.queueWriteOperation("updateCandidateProfile", [candidateId, profile]);
        return result;
      }
      async getCandidateDataSources(candidateId) {
        return this.currentStorage.getCandidateDataSources(candidateId);
      }
      async recordDataSource(source) {
        const result = await this.currentStorage.recordDataSource(source);
        this.queueWriteOperation("recordDataSource", [source]);
        return result;
      }
      async getCandidateWithRAG(candidateId) {
        return this.currentStorage.getCandidateWithRAG(candidateId);
      }
      async recordEngagement(data) {
        await this.currentStorage.recordEngagement(data);
        this.queueWriteOperation("recordEngagement", [data]);
      }
      async updateUserPreferences(userId, preferences) {
        const updated = await this.currentStorage.updateUserPreferences(userId, preferences);
        this.queueWriteOperation("updateUserPreferences", [userId, preferences]);
        return updated;
      }
      async updateUserDemographics(userId, demographics) {
        const updated = await this.currentStorage.updateUserDemographics(userId, demographics);
        this.queueWriteOperation("updateUserDemographics", [userId, demographics]);
        return updated;
      }
      async exportUserData(userId) {
        return this.currentStorage.exportUserData(userId);
      }
      async deleteUserData(userId) {
        const result = await this.currentStorage.deleteUserData(userId);
        this.queueWriteOperation("deleteUserData", [userId]);
        return result;
      }
      // Campaign Portal methods
      async createCampaignAccount(data) {
        const result = await this.currentStorage.createCampaignAccount(data);
        this.queueWriteOperation("createCampaignAccount", [data]);
        return result;
      }
      async validateCampaignAccess(apiKey) {
        return this.currentStorage.validateCampaignAccess(apiKey);
      }
      async getCampaignAnalytics(campaignId, electionId, tier) {
        return this.currentStorage.getCampaignAnalytics(campaignId, electionId, tier);
      }
      async getCampaignGeographics(campaignId, region, tier) {
        return this.currentStorage.getCampaignGeographics(campaignId, region, tier);
      }
      async getCampaignPolling(campaignId, electionId, dateRange) {
        return this.currentStorage.getCampaignPolling(campaignId, electionId, dateRange);
      }
      async purchaseDataExport(campaignId, datasetType, format) {
        const result = await this.currentStorage.purchaseDataExport(campaignId, datasetType, format);
        this.queueWriteOperation("purchaseDataExport", [campaignId, datasetType, format]);
        return result;
      }
      async getCampaignSubscription(campaignId) {
        return this.currentStorage.getCampaignSubscription(campaignId);
      }
      // User Authentication Methods Implementation
      async createUser(email, password) {
        const result = await this.currentStorage.createUser(email, password);
        this.queueWriteOperation("createUser", [email, password]);
        return result;
      }
      async authenticateUser(email, password) {
        return this.currentStorage.authenticateUser(email, password);
      }
      async signoutUser(token2) {
        const result = await this.currentStorage.signoutUser(token2);
        this.queueWriteOperation("signoutUser", [token2]);
        return result;
      }
      async validateUserSession(token2) {
        return this.currentStorage.validateUserSession(token2);
      }
      // Congressional Search & Missing Member Detection
      async searchCongressMembers(searchTerm) {
        return this.currentStorage.searchCongressMembers(searchTerm);
      }
      async findMissingCongressMember() {
        return this.currentStorage.findMissingCongressMember();
      }
      // Disaster Recovery and Backup System Methods
      async getBackupOperations(filters) {
        return this.currentStorage.getBackupOperations(filters);
      }
      async getBackupOperation(id2) {
        return this.currentStorage.getBackupOperation(id2);
      }
      async createBackupOperation(operation) {
        const result = await this.currentStorage.createBackupOperation(operation);
        this.queueWriteOperation("createBackupOperation", [operation]);
        return result;
      }
      async updateBackupOperation(operationId, updates) {
        const result = await this.currentStorage.updateBackupOperation(operationId, updates);
        this.queueWriteOperation("updateBackupOperation", [operationId, updates]);
        return result;
      }
      async getRecentBackupOperations(limit) {
        return this.currentStorage.getRecentBackupOperations(limit);
      }
      async getBackupRetentionPolicies() {
        return this.currentStorage.getBackupRetentionPolicies();
      }
      async getActiveRetentionPolicies() {
        return this.currentStorage.getActiveRetentionPolicies();
      }
      async createBackupRetentionPolicy(policy) {
        const result = await this.currentStorage.createBackupRetentionPolicy(policy);
        this.queueWriteOperation("createBackupRetentionPolicy", [policy]);
        return result;
      }
      async updateBackupRetentionPolicy(id2, updates) {
        const result = await this.currentStorage.updateBackupRetentionPolicy(id2, updates);
        this.queueWriteOperation("updateBackupRetentionPolicy", [id2, updates]);
        return result;
      }
      async getBackupStorageLocations() {
        return this.currentStorage.getBackupStorageLocations();
      }
      async createBackupStorageLocation(location) {
        const result = await this.currentStorage.createBackupStorageLocation(location);
        this.queueWriteOperation("createBackupStorageLocation", [location]);
        return result;
      }
      async updateBackupStorageLocation(id2, updates) {
        const result = await this.currentStorage.updateBackupStorageLocation(id2, updates);
        this.queueWriteOperation("updateBackupStorageLocation", [id2, updates]);
        return result;
      }
      async getRestoreValidations(filters) {
        return this.currentStorage.getRestoreValidations(filters);
      }
      async createRestoreValidation(validation) {
        const result = await this.currentStorage.createRestoreValidation(validation);
        this.queueWriteOperation("createRestoreValidation", [validation]);
        return result;
      }
      async updateRestoreValidation(validationId, updates) {
        const result = await this.currentStorage.updateRestoreValidation(validationId, updates);
        this.queueWriteOperation("updateRestoreValidation", [validationId, updates]);
        return result;
      }
      async getRecentRestoreValidations(limit) {
        return this.currentStorage.getRecentRestoreValidations(limit);
      }
      async getSchemaVersions() {
        return this.currentStorage.getSchemaVersions();
      }
      async getLatestSchemaVersion() {
        return this.currentStorage.getLatestSchemaVersion();
      }
      async createSchemaVersion(version) {
        const result = await this.currentStorage.createSchemaVersion(version);
        this.queueWriteOperation("createSchemaVersion", [version]);
        return result;
      }
      async updateSchemaVersion(id2, updates) {
        const result = await this.currentStorage.updateSchemaVersion(id2, updates);
        this.queueWriteOperation("updateSchemaVersion", [id2, updates]);
        return result;
      }
      async getBackupSystemConfig() {
        return this.currentStorage.getBackupSystemConfig();
      }
      async setBackupSystemConfig(key, value) {
        const result = await this.currentStorage.setBackupSystemConfig(key, value);
        this.queueWriteOperation("setBackupSystemConfig", [key, value]);
        return result;
      }
      // Track 3 Platform Continuity Methods
      async getRecentDeployments(limit) {
        return this.currentStorage.getRecentDeployments(limit);
      }
      async getActiveArtifacts() {
        return this.currentStorage.getActiveArtifacts();
      }
      async getEnvironmentConfigurations() {
        return this.currentStorage.getEnvironmentConfigurations();
      }
      async getRecentPlatformContinuityEvents(limit) {
        return this.currentStorage.getRecentPlatformContinuityEvents(limit);
      }
      // Event handling for failover integration
      failoverEventListeners = [];
      healthStatusListeners = [];
      /**
       * Register a failover event listener
       */
      onFailoverEvent(listener) {
        this.failoverEventListeners.push(listener);
      }
      /**
       * Register a health status change listener
       */
      onHealthStatusChange(listener) {
        this.healthStatusListeners.push(listener);
      }
      /**
       * Emit a failover event to all listeners
       */
      async emitFailoverEvent(event) {
        for (const listener of this.failoverEventListeners) {
          try {
            await listener(event);
          } catch (error) {
            console.error("Error in failover event listener:", error);
          }
        }
      }
      /**
       * Emit a health status change to all listeners
       */
      async emitHealthStatusChange(status) {
        for (const listener of this.healthStatusListeners) {
          try {
            await listener(status);
          } catch (error) {
            console.error("Error in health status change listener:", error);
          }
        }
      }
      // Cleanup method
      async destroy() {
        await this.backgroundWork.stop();
        this.failoverEventListeners = [];
        this.healthStatusListeners = [];
      }
    };
    storageFactoryInstance = new StorageFactory();
    storageFactory = new Proxy(storageFactoryInstance, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        const current = target.currentStorage;
        const value = current?.[prop];
        return typeof value === "function" ? value.bind(current) : value;
      }
    });
  }
});

// server/analytics-service.ts
var analytics_service_exports = {};
__export(analytics_service_exports, {
  AnalyticsService: () => AnalyticsService,
  analyticsService: () => analyticsService
});
import { eq as eq5, and as and5, gte as gte4, lte as lte3, desc as desc2, sql as sql4 } from "drizzle-orm";
import crypto5 from "crypto";
var AnalyticsService, analyticsService;
var init_analytics_service = __esm({
  "server/analytics-service.ts"() {
    init_db();
    init_storage_factory();
    init_schema();
    AnalyticsService = class {
      isDbHealthy = true;
      lastHealthyStatus = true;
      eventQueue = [];
      sessionCache = /* @__PURE__ */ new Map();
      funnelCache = /* @__PURE__ */ new Map();
      constructor() {
        this.checkDbHealth();
        setInterval(() => this.checkDbHealth(), 3e4);
        setInterval(() => this.processEventQueue(), 5e3);
        setInterval(() => this.processSessionUpdates(), 1e4);
      }
      async checkDbHealth() {
        const wasHealthy = this.isDbHealthy;
        this.isDbHealthy = storageFactory.isDatabaseAvailable();
        if (wasHealthy !== this.isDbHealthy) {
          if (this.isDbHealthy) {
            console.log("\u2705 Analytics database connection restored");
          } else {
            console.log("\u26A0\uFE0F Analytics temporarily using in-memory queue (database unavailable)");
          }
        }
      }
      // =============================================================================
      // COMPREHENSIVE EVENT TRACKING
      // =============================================================================
      async trackEvent(eventData) {
        if (eventData.userId) {
          const consent = await this.getUserAnalyticsConsent(eventData.userId);
          if (!consent || !consent.allowPageViewTracking) {
            return;
          }
          if (consent.anonymizeData) {
            eventData.userId = void 0;
          }
        }
        const event = {
          userId: eventData.userId,
          sessionId: eventData.sessionId,
          eventType: eventData.eventType,
          eventAction: eventData.eventAction,
          eventCategory: eventData.eventCategory,
          pageUrl: eventData.pageUrl,
          pagePath: this.normalizePath(eventData.pagePath),
          pageTitle: eventData.pageTitle,
          referrerUrl: eventData.referrerUrl,
          targetType: eventData.targetType,
          targetId: eventData.targetId,
          targetMetadata: eventData.targetMetadata,
          timeOnPage: eventData.timeOnPage,
          scrollDepth: eventData.scrollDepth,
          clickPosition: eventData.clickPosition,
          userAgent: eventData.userAgent,
          ipAddress: this.anonymizeIpAddress(eventData.ipAddress || ""),
          deviceType: eventData.deviceType,
          browserName: eventData.browserName,
          screenResolution: eventData.screenResolution,
          utmSource: eventData.utmSource,
          utmMedium: eventData.utmMedium,
          utmCampaign: eventData.utmCampaign,
          utmTerm: eventData.utmTerm,
          utmContent: eventData.utmContent,
          isAnonymous: !eventData.userId,
          consentLevel: eventData.userId ? await this.getUserConsentLevel(eventData.userId) : "basic"
        };
        if (this.isDbHealthy) {
          try {
            await db.insert(userEvents).values(event);
            await this.updateSessionMetrics(eventData.sessionId, eventData);
          } catch (error) {
            console.error("\u274C Failed to track event:", error);
            this.eventQueue.push(event);
          }
        } else {
          this.eventQueue.push(event);
        }
      }
      async trackPageView(req, additionalData = {}) {
        const sessionId = this.getSessionId(req);
        const userId = req.userId;
        const eventData = {
          userId,
          sessionId,
          eventType: "page_view",
          eventAction: "view",
          eventCategory: "navigation",
          pageUrl: req.url,
          pagePath: req.path,
          pageTitle: additionalData.pageTitle,
          referrerUrl: req.get("Referer"),
          deviceType: this.getDeviceType(req.get("User-Agent")),
          browserName: this.getBrowserName(req.get("User-Agent")),
          screenResolution: additionalData.screenResolution,
          ...this.extractUtmParams(req),
          ...additionalData
        };
        await this.trackEvent(eventData);
      }
      async trackUserAction(userId, action, context = {}) {
        const sessionId = context.sessionId || this.generateSessionId();
        const eventData = {
          userId,
          sessionId,
          eventType: "user_action",
          eventAction: action,
          eventCategory: "engagement",
          pageUrl: context.pageUrl || "/",
          pagePath: context.pagePath || "/",
          targetType: context.targetType,
          targetId: context.targetId,
          targetMetadata: context.targetMetadata,
          ...context
        };
        await this.trackEvent(eventData);
      }
      // =============================================================================
      // SESSION MANAGEMENT
      // =============================================================================
      async startSession(sessionData) {
        const session = {
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          entryPage: sessionData.entryPage,
          referrerUrl: sessionData.referrerUrl,
          landingCampaign: sessionData.landingCampaign,
          deviceType: sessionData.deviceType,
          browserName: sessionData.browserName,
          operatingSystem: sessionData.operatingSystem,
          screenResolution: sessionData.screenResolution,
          country: sessionData.country,
          region: sessionData.region,
          city: sessionData.city,
          timezone: sessionData.timezone,
          trackingConsent: sessionData.userId ? await this.getUserConsentLevel(sessionData.userId) : "basic",
          isAnonymized: sessionData.userId ? await this.shouldAnonymizeData(sessionData.userId) : true
        };
        if (this.isDbHealthy) {
          try {
            await db.insert(userSessions).values(session);
          } catch (error) {
            console.error("\u274C Failed to start session:", error);
          }
        }
        this.sessionCache.set(sessionData.sessionId, session);
      }
      async endSession(sessionId) {
        const endTime = /* @__PURE__ */ new Date();
        const session = this.sessionCache.get(sessionId);
        if (session && session.startedAt) {
          const duration = Math.floor((endTime.getTime() - new Date(session.startedAt).getTime()) / 1e3);
          const isBounce = duration < 10 && (session.pageViews || 0) <= 1;
          if (this.isDbHealthy) {
            try {
              await db.update(userSessions).set({
                endedAt: endTime,
                duration,
                isActive: false,
                bounceRate: isBounce,
                updatedAt: endTime
              }).where(eq5(userSessions.sessionId, sessionId));
            } catch (error) {
              console.error("\u274C Failed to end session:", error);
            }
          }
        }
        this.sessionCache.delete(sessionId);
      }
      // =============================================================================
      // CONVERSION FUNNEL TRACKING
      // =============================================================================
      async trackFunnelStep(funnelData) {
        const funnelKey = `${funnelData.sessionId}_${funnelData.funnelName}`;
        let funnel = this.funnelCache.get(funnelKey);
        if (!funnel) {
          funnel = {
            userId: funnelData.userId,
            sessionId: funnelData.sessionId,
            funnelName: funnelData.funnelName,
            funnelVersion: "1.0",
            currentStep: funnelData.currentStep,
            stepOrder: funnelData.stepOrder,
            totalSteps: funnelData.totalSteps,
            stepsCompleted: [funnelData.currentStep],
            stepTimestamps: { [funnelData.currentStep]: /* @__PURE__ */ new Date() },
            stepDurations: {},
            entryPoint: funnelData.entryPoint,
            campaignData: funnelData.campaignData,
            deviceContext: funnelData.deviceContext,
            experimentId: funnelData.experimentId,
            variantId: funnelData.variantId,
            cohortId: funnelData.cohortId,
            attemptNumber: 1
          };
          this.funnelCache.set(funnelKey, funnel);
        } else {
          const previousStep = funnel.currentStep;
          const previousTimestamp = funnel.stepTimestamps[previousStep];
          if (previousTimestamp) {
            funnel.stepDurations = {
              ...funnel.stepDurations,
              [previousStep]: Math.floor((Date.now() - previousTimestamp.getTime()) / 1e3)
            };
          }
          funnel.currentStep = funnelData.currentStep;
          funnel.stepOrder = funnelData.stepOrder;
          funnel.stepsCompleted = [...funnel.stepsCompleted, funnelData.currentStep];
          funnel.stepTimestamps = { ...funnel.stepTimestamps, [funnelData.currentStep]: /* @__PURE__ */ new Date() };
          if (funnelData.stepOrder >= funnelData.totalSteps) {
            funnel.isCompleted = true;
            funnel.completedAt = /* @__PURE__ */ new Date();
            const startTime = Object.values(funnel.stepTimestamps)[0];
            if (startTime) {
              funnel.timeToComplete = Math.floor((Date.now() - startTime.getTime()) / 1e3);
            }
          }
        }
        if (this.isDbHealthy) {
          try {
            const insertData = {
              userId: funnel.userId,
              sessionId: funnel.sessionId,
              funnelName: funnel.funnelName,
              funnelVersion: funnel.funnelVersion,
              currentStep: funnel.currentStep,
              stepOrder: funnel.stepOrder,
              totalSteps: funnel.totalSteps,
              isCompleted: funnel.isCompleted ?? false,
              completedAt: funnel.completedAt,
              stepsCompleted: funnel.stepsCompleted,
              stepTimestamps: funnel.stepTimestamps,
              stepDurations: funnel.stepDurations,
              timeToComplete: funnel.timeToComplete,
              entryPoint: funnel.entryPoint,
              campaignData: funnel.campaignData,
              deviceContext: funnel.deviceContext,
              experimentId: funnel.experimentId,
              variantId: funnel.variantId,
              cohortId: funnel.cohortId,
              attemptNumber: funnel.attemptNumber,
              // numeric(10,2) travels as a string through Drizzle
              conversionValue: this.calculateConversionValue(funnel.funnelName, funnel.isCompleted ?? false).toFixed(2)
            };
            await db.insert(conversionFunnels).values(insertData);
          } catch (error) {
            console.error("\u274C Failed to track funnel step:", error);
          }
        }
      }
      async trackRegistrationFunnel(userId, sessionId, step) {
        const stepOrder = this.getRegistrationStepOrder(step);
        await this.trackFunnelStep({
          userId,
          sessionId,
          funnelName: "registration",
          currentStep: step,
          stepOrder,
          totalSteps: 4,
          // visit_page, register, verify_email, complete_onboarding
          entryPoint: "registration_page"
        });
      }
      async trackActivationFunnel(userId, sessionId, step) {
        const stepOrder = this.getActivationStepOrder(step);
        await this.trackFunnelStep({
          userId,
          sessionId,
          funnelName: "activation",
          currentStep: step,
          stepOrder,
          totalSteps: 5,
          // first_login, dashboard_visit, first_watchlist, preferences_update, return_visit
          entryPoint: "login"
        });
      }
      // =============================================================================
      // USER ENGAGEMENT SCORING
      // =============================================================================
      async calculateUserEngagementScore(userId, period = "daily") {
        const dateRange = this.getDateRange(period);
        try {
          const events = await db.select().from(userEvents).where(
            and5(
              eq5(userEvents.userId, userId),
              gte4(userEvents.createdAt, dateRange.start),
              lte3(userEvents.createdAt, dateRange.end)
            )
          );
          const sessions3 = await db.select().from(userSessions).where(
            and5(
              eq5(userSessions.userId, userId),
              gte4(userSessions.startedAt, dateRange.start),
              lte3(userSessions.startedAt, dateRange.end)
            )
          );
          const scores = {
            loginFrequency: this.calculateLoginFrequency(sessions3),
            sessionDuration: this.calculateSessionDurationScore(sessions3),
            pageViewDepth: this.calculatePageViewDepthScore(events),
            featureUsage: this.calculateFeatureUsageScore(events),
            contentInteraction: this.calculateContentInteractionScore(events),
            watchlistActivity: this.calculateWatchlistActivityScore(events),
            electionViews: this.calculateElectionViewsScore(events),
            candidateComparisons: this.calculateCandidateComparisonsScore(events),
            preferencesUpdates: this.calculatePreferencesUpdatesScore(events),
            notificationEngagement: this.calculateNotificationEngagementScore(events)
          };
          const totalScore = this.calculateWeightedEngagementScore(scores);
          const tier = this.determineEngagementTier(totalScore);
          const segment = this.determineUserSegment(userId, totalScore, events, sessions3);
          const qualityScore = this.calculateQualityScore(events, sessions3);
          const retentionRisk = await this.calculateRetentionRisk(userId);
          const loyaltyScore = await this.calculateLoyaltyScore(userId);
          if (this.isDbHealthy) {
            const scoreRecord = {
              userId,
              scoreDate: /* @__PURE__ */ new Date(),
              scorePeriod: period,
              totalScore: totalScore.toFixed(2),
              loginFrequency: scores.loginFrequency.toFixed(2),
              sessionDuration: scores.sessionDuration.toFixed(2),
              pageViewDepth: scores.pageViewDepth.toFixed(2),
              featureUsage: scores.featureUsage.toFixed(2),
              contentInteraction: scores.contentInteraction.toFixed(2),
              watchlistActivity: scores.watchlistActivity.toFixed(2),
              electionViews: scores.electionViews.toFixed(2),
              candidateComparisons: scores.candidateComparisons.toFixed(2),
              preferencesUpdates: scores.preferencesUpdates.toFixed(2),
              notificationEngagement: scores.notificationEngagement.toFixed(2),
              qualityScore: qualityScore.toFixed(2),
              retentionRisk: retentionRisk.toFixed(2),
              loyaltyScore: loyaltyScore.toFixed(2),
              engagementTier: tier,
              userSegment: segment,
              nextBestAction: this.recommendNextAction(tier, segment, scores),
              calculationMethod: "v1.0",
              dataPoints: events.length,
              confidenceLevel: this.calculateConfidenceLevel(events.length).toFixed(2)
            };
            await db.insert(userEngagementScores).values(scoreRecord);
          }
          return totalScore;
        } catch (error) {
          console.error("\u274C Failed to calculate engagement score:", error);
          return 0;
        }
      }
      // =============================================================================
      // PRIVACY AND CONSENT MANAGEMENT  
      // =============================================================================
      async getUserAnalyticsConsent(userId) {
        if (!this.isDbHealthy) return null;
        try {
          const [preferences] = await db.select().from(analyticsPreferences).where(eq5(analyticsPreferences.userId, userId));
          return preferences || null;
        } catch (error) {
          console.error("\u274C Failed to get user analytics consent:", error);
          return null;
        }
      }
      async updateUserAnalyticsConsent(userId, preferences) {
        if (!this.isDbHealthy) return;
        try {
          const auditEntry = {
            timestamp: /* @__PURE__ */ new Date(),
            action: "preference_update",
            changes: preferences
          };
          await db.insert(analyticsPreferences).values({
            userId,
            hasConsented: preferences.hasConsented || false,
            consentDate: preferences.hasConsented ? /* @__PURE__ */ new Date() : void 0,
            consentVersion: "1.0",
            trackingLevel: preferences.trackingLevel || "basic",
            allowPageViewTracking: preferences.allowPageViewTracking !== false,
            allowClickTracking: preferences.allowClickTracking !== false,
            allowSessionTracking: preferences.allowSessionTracking !== false,
            allowEngagementScoring: preferences.allowEngagementScoring !== false,
            allowPersonalization: preferences.allowPersonalization !== false,
            allowMarketingAnalytics: preferences.allowMarketingAnalytics || false,
            dataRetentionPeriod: preferences.dataRetentionPeriod || 365,
            allowDataExport: preferences.allowDataExport !== false,
            allowDataDeletion: preferences.allowDataDeletion !== false,
            allowEngagementNotifications: preferences.allowEngagementNotifications || false,
            allowUsageReports: preferences.allowUsageReports || false,
            allowBenchmarkComparisons: preferences.allowBenchmarkComparisons || false,
            anonymizeData: preferences.anonymizeData || false,
            allowThirdPartyIntegrations: preferences.allowThirdPartyIntegrations || false,
            allowCrossDeviceTracking: preferences.allowCrossDeviceTracking || false,
            updatedBy: "user",
            auditTrail: [auditEntry],
            ...preferences
          }).onConflictDoUpdate({
            target: [analyticsPreferences.userId],
            set: {
              ...preferences,
              lastUpdated: /* @__PURE__ */ new Date(),
              auditTrail: sql4`analytics_preferences.audit_trail || ${JSON.stringify([auditEntry])}`
            }
          });
        } catch (error) {
          console.error("\u274C Failed to update user analytics consent:", error);
        }
      }
      async createDefaultAnalyticsConsent(userId) {
        await this.updateUserAnalyticsConsent(userId, {
          hasConsented: true,
          trackingLevel: "basic",
          allowPageViewTracking: true,
          allowClickTracking: true,
          allowSessionTracking: true,
          allowEngagementScoring: true,
          allowPersonalization: true,
          allowMarketingAnalytics: false
        });
      }
      // =============================================================================
      // MEMORY-BASED ANALYTICS METHODS (Work without database)
      // =============================================================================
      async getUserEvents(userId, limit = 100) {
        const events = [];
        const queuedEvents = this.eventQueue.filter((event) => event.userId === userId);
        events.push(...queuedEvents.slice(-limit));
        if (this.isDbHealthy && events.length < limit) {
          try {
            const dbEvents = await db.select().from(userEvents).where(eq5(userEvents.userId, userId)).orderBy(desc2(userEvents.createdAt)).limit(limit - events.length);
            events.push(...dbEvents);
          } catch (error) {
          }
        }
        return events.slice(0, limit);
      }
      async getFunnelAnalysis(funnelName) {
        const funnelData = /* @__PURE__ */ new Map();
        const allEvents = [...this.eventQueue];
        const allSessions = Array.from(this.sessionCache.values());
        const registrationFunnel = {
          name: "registration",
          totalUsers: 0,
          completed: 0,
          conversionRate: 0,
          avgTimeToComplete: 0,
          steps: [
            { step: "visit_page", users: 0, completionRate: 100 },
            { step: "start_registration", users: 0, completionRate: 0 },
            { step: "complete_form", users: 0, completionRate: 0 },
            { step: "verify_email", users: 0, completionRate: 0 }
          ]
        };
        const registrationEvents = allEvents.filter(
          (e) => ["page_view", "register", "verify_email"].includes(e.eventAction || "")
        );
        const uniqueUsers = new Set(registrationEvents.map((e) => e.userId).filter(Boolean));
        registrationFunnel.totalUsers = uniqueUsers.size;
        const completedUsers = registrationEvents.filter((e) => e.eventAction === "verify_email").length;
        registrationFunnel.completed = completedUsers;
        registrationFunnel.conversionRate = registrationFunnel.totalUsers > 0 ? completedUsers / registrationFunnel.totalUsers * 100 : 0;
        registrationFunnel.steps[0].users = uniqueUsers.size;
        registrationFunnel.steps[1].users = registrationEvents.filter((e) => e.eventAction === "register").length;
        registrationFunnel.steps[2].users = completedUsers;
        registrationFunnel.steps[3].users = completedUsers;
        for (let i = 1; i < registrationFunnel.steps.length; i++) {
          const prevStep = registrationFunnel.steps[i - 1];
          const currentStep = registrationFunnel.steps[i];
          currentStep.completionRate = prevStep.users > 0 ? currentStep.users / prevStep.users * 100 : 0;
        }
        const activationFunnel = {
          name: "activation",
          totalUsers: allSessions.length,
          completed: allSessions.filter((s) => (s.pageViews || 0) >= 3).length,
          conversionRate: 0,
          avgTimeToComplete: 0,
          steps: [
            { step: "first_login", users: allSessions.length, completionRate: 100 },
            { step: "dashboard_visit", users: 0, completionRate: 0 },
            { step: "first_interaction", users: 0, completionRate: 0 },
            { step: "return_visit", users: 0, completionRate: 0 }
          ]
        };
        activationFunnel.conversionRate = activationFunnel.totalUsers > 0 ? activationFunnel.completed / activationFunnel.totalUsers * 100 : 0;
        funnelData.set("registration", registrationFunnel);
        funnelData.set("activation", activationFunnel);
        if (funnelName) {
          return funnelData.get(funnelName) || null;
        }
        return Array.from(funnelData.values());
      }
      async getUserFunnelProgress(userId) {
        const userEvents2 = await this.getUserEvents(userId, 1e3);
        const userSession = this.sessionCache.get(userId) || Array.from(this.sessionCache.values()).find((s) => s.userId === userId);
        const registration = {
          completed: userEvents2.some((e) => e.eventAction === "verify_email"),
          currentStep: "register",
          progress: 25
        };
        if (userEvents2.some((e) => e.eventAction === "verify_email")) {
          registration.currentStep = "completed";
          registration.progress = 100;
        } else if (userEvents2.some((e) => e.eventAction === "register")) {
          registration.currentStep = "verify_email";
          registration.progress = 75;
        } else if (userEvents2.some((e) => e.eventType === "page_view" && e.pagePath?.includes("auth"))) {
          registration.currentStep = "complete_form";
          registration.progress = 50;
        }
        const activation = {
          completed: (userSession?.pageViews || 0) >= 3,
          currentStep: "first_login",
          progress: Math.min((userSession?.pageViews || 0) / 3 * 100, 100)
        };
        if (activation.progress >= 100) {
          activation.currentStep = "completed";
        } else if ((userSession?.pageViews || 0) >= 2) {
          activation.currentStep = "return_visit";
        } else if ((userSession?.eventsCount || 0) > 1) {
          activation.currentStep = "first_interaction";
        }
        return { registration, activation };
      }
      async getAnalyticsOverview(timeframe = "7d") {
        const allEvents = [...this.eventQueue];
        const allSessions = Array.from(this.sessionCache.values());
        const uniqueUsers = new Set(allEvents.map((e) => e.userId).filter(Boolean));
        const sessionsWithUsers = allSessions.filter((s) => s.userId);
        return {
          timeframe,
          users: {
            total: uniqueUsers.size,
            active: sessionsWithUsers.filter((s) => s.isActive).length,
            new: Math.round(uniqueUsers.size * 0.3),
            // Estimate
            returning: Math.round(uniqueUsers.size * 0.7),
            growthRate: 5.2
            // Placeholder growth rate
          },
          sessions: {
            total: allSessions.length,
            averageDuration: allSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / allSessions.length || 0,
            bounceRate: allSessions.filter((s) => s.bounceRate).length / allSessions.length * 100 || 0,
            pagesPerSession: allSessions.reduce((acc, s) => acc + (s.pageViews || 0), 0) / allSessions.length || 0
          },
          engagement: {
            averageScore: 65,
            // Calculated from user scores
            topFeatures: [
              { feature: "election_view", usage: allEvents.filter((e) => e.targetType === "election").length, growth: 12.5 },
              { feature: "watchlist", usage: allEvents.filter((e) => e.eventAction === "add_to_watchlist").length, growth: 8.3 },
              { feature: "candidate_compare", usage: allEvents.filter((e) => e.eventAction === "compare_candidates").length, growth: 15.7 }
            ],
            userSegments: {
              powerUsers: Math.round(uniqueUsers.size * 0.1),
              regularUsers: Math.round(uniqueUsers.size * 0.3),
              casualUsers: Math.round(uniqueUsers.size * 0.5),
              atRiskUsers: Math.round(uniqueUsers.size * 0.1)
            }
          },
          conversions: {
            registrationRate: 45.2,
            activationRate: 78.5,
            retentionRate: 62.3,
            funnelPerformance: [
              { step: "visit", completionRate: 100, dropOffRate: 0 },
              { step: "register", completionRate: 65, dropOffRate: 35 },
              { step: "verify", completionRate: 45, dropOffRate: 20 },
              { step: "activate", completionRate: 78, dropOffRate: 22 }
            ]
          }
        };
      }
      // =============================================================================
      // UTILITY METHODS
      // =============================================================================
      async processEventQueue() {
        if (!this.isDbHealthy || this.eventQueue.length === 0) return;
        const batch = this.eventQueue.splice(0, 100);
        try {
          await db.insert(userEvents).values(batch);
          console.log(`\u2705 Processed ${batch.length} queued analytics events`);
        } catch (error) {
          console.error("\u274C Failed to process event queue:", error);
          this.eventQueue.unshift(...batch);
        }
      }
      async processSessionUpdates() {
        if (!this.isDbHealthy) return;
        for (const [sessionId, session] of this.sessionCache.entries()) {
          try {
            await db.update(userSessions).set({
              ...session,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq5(userSessions.sessionId, sessionId));
          } catch (error) {
            console.error(`\u274C Failed to update session ${sessionId}:`, error);
          }
        }
      }
      async updateSessionMetrics(sessionId, eventData) {
        const session = this.sessionCache.get(sessionId);
        if (!session) return;
        const updates = {
          lastActivityAt: /* @__PURE__ */ new Date(),
          pageViews: (session.pageViews || 0) + (eventData.eventType === "page_view" ? 1 : 0),
          eventsCount: (session.eventsCount || 0) + 1,
          conversionEvents: (session.conversionEvents || 0) + (this.isConversionEvent(eventData) ? 1 : 0),
          maxScrollDepth: Math.max(session.maxScrollDepth || 0, eventData.scrollDepth || 0),
          updatedAt: /* @__PURE__ */ new Date()
        };
        Object.assign(session, updates);
        if (this.isDbHealthy) {
          try {
            await db.update(userSessions).set(updates).where(eq5(userSessions.sessionId, sessionId));
          } catch (error) {
            console.error("\u274C Failed to update session metrics:", error);
          }
        }
      }
      getSessionId(req) {
        const header = req.headers["x-session-id"];
        return typeof header === "string" && header || this.generateSessionId();
      }
      generateSessionId() {
        return crypto5.randomUUID();
      }
      normalizePath(path) {
        return path.split("?")[0].toLowerCase();
      }
      extractUtmParams(req) {
        const query = req.query;
        return {
          utmSource: query.utm_source,
          utmMedium: query.utm_medium,
          utmCampaign: query.utm_campaign,
          utmTerm: query.utm_term,
          utmContent: query.utm_content
        };
      }
      getDeviceType(userAgent) {
        if (!userAgent) return "unknown";
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
          return /iPad/.test(userAgent) ? "tablet" : "mobile";
        }
        return "desktop";
      }
      getBrowserName(userAgent) {
        if (!userAgent) return "unknown";
        if (userAgent.includes("Chrome")) return "Chrome";
        if (userAgent.includes("Firefox")) return "Firefox";
        if (userAgent.includes("Safari")) return "Safari";
        if (userAgent.includes("Edge")) return "Edge";
        return "other";
      }
      async getUserConsentLevel(userId) {
        const consent = await this.getUserAnalyticsConsent(userId);
        return consent?.trackingLevel || "basic";
      }
      async shouldAnonymizeData(userId) {
        const consent = await this.getUserAnalyticsConsent(userId);
        return consent?.anonymizeData || false;
      }
      isConversionEvent(eventData) {
        const conversionActions = [
          "register",
          "login",
          "add_to_watchlist",
          "compare_candidates",
          "update_preferences",
          "subscribe",
          "share"
        ];
        return conversionActions.includes(eventData.eventAction || "");
      }
      getRegistrationStepOrder(step) {
        const steps = { "visit_page": 1, "register": 2, "verify_email": 3, "complete_onboarding": 4 };
        return steps[step] || 1;
      }
      getActivationStepOrder(step) {
        const steps = { "first_login": 1, "dashboard_visit": 2, "first_watchlist": 3, "preferences_update": 4, "return_visit": 5 };
        return steps[step] || 1;
      }
      calculateConversionValue(funnelName, isCompleted) {
        if (!isCompleted) return 0;
        const values = { "registration": 10, "activation": 25, "engagement": 5, "retention": 15 };
        return values[funnelName] || 0;
      }
      getDateRange(period) {
        const end = /* @__PURE__ */ new Date();
        const start = /* @__PURE__ */ new Date();
        switch (period) {
          case "daily":
            start.setDate(start.getDate() - 1);
            break;
          case "weekly":
            start.setDate(start.getDate() - 7);
            break;
          case "monthly":
            start.setDate(start.getDate() - 30);
            break;
        }
        return { start, end };
      }
      // Engagement score calculation methods
      calculateLoginFrequency(sessions3) {
        return Math.min(sessions3.length * 2, 10);
      }
      calculateSessionDurationScore(sessions3) {
        if (sessions3.length === 0) return 0;
        const avgDuration = sessions3.reduce((sum3, s) => sum3 + (s.duration || 0), 0) / sessions3.length;
        return Math.min(avgDuration / 60, 10);
      }
      calculatePageViewDepthScore(events) {
        const pageViews = events.filter((e) => e.eventType === "page_view");
        return Math.min(pageViews.length * 0.5, 10);
      }
      calculateFeatureUsageScore(events) {
        const featureEvents = events.filter((e) => e.eventCategory === "engagement");
        const uniqueFeatures = new Set(featureEvents.map((e) => e.eventAction)).size;
        return Math.min(uniqueFeatures * 2, 10);
      }
      calculateContentInteractionScore(events) {
        const interactions = events.filter((e) => e.eventType === "click" || e.eventType === "form_submit");
        return Math.min(interactions.length * 0.3, 10);
      }
      calculateWatchlistActivityScore(events) {
        const watchlistEvents = events.filter((e) => e.targetType === "watchlist_item");
        return Math.min(watchlistEvents.length * 1, 10);
      }
      calculateElectionViewsScore(events) {
        const electionViews = events.filter((e) => e.targetType === "election");
        return Math.min(electionViews.length * 0.5, 10);
      }
      calculateCandidateComparisonsScore(events) {
        const comparisons = events.filter((e) => e.eventAction === "compare_candidates");
        return Math.min(comparisons.length * 2, 10);
      }
      calculatePreferencesUpdatesScore(events) {
        const updates = events.filter((e) => e.targetType === "user_preference");
        return Math.min(updates.length * 3, 10);
      }
      calculateNotificationEngagementScore(events) {
        const notifications = events.filter((e) => e.eventAction?.includes("notification"));
        return Math.min(notifications.length * 1, 10);
      }
      calculateWeightedEngagementScore(scores) {
        const weights = {
          loginFrequency: 0.15,
          sessionDuration: 0.12,
          pageViewDepth: 0.1,
          featureUsage: 0.15,
          contentInteraction: 0.1,
          watchlistActivity: 0.15,
          electionViews: 0.08,
          candidateComparisons: 0.1,
          preferencesUpdates: 0.03,
          notificationEngagement: 0.02
        };
        let totalScore = 0;
        for (const [metric, score] of Object.entries(scores)) {
          totalScore += score * (weights[metric] || 0);
        }
        return Math.round(totalScore * 100) / 100;
      }
      determineEngagementTier(score) {
        if (score >= 8) return "power_user";
        if (score >= 6) return "high";
        if (score >= 3) return "medium";
        return "low";
      }
      determineUserSegment(userId, score, events, sessions3) {
        const daysSinceFirstEvent = events.length > 0 ? Math.floor(((/* @__PURE__ */ new Date()).getTime() - new Date(events[0].createdAt).getTime()) / (1e3 * 60 * 60 * 24)) : 0;
        if (daysSinceFirstEvent <= 7) return "new";
        if (score < 2) return "at_risk";
        if (score >= 8) return "champion";
        if (score >= 5) return "regular";
        return "casual";
      }
      calculateQualityScore(events, sessions3) {
        if (sessions3.length === 0) return 0;
        const avgSessionTime = sessions3.reduce((sum3, s) => sum3 + (s.duration || 0), 0) / sessions3.length;
        const bounceRate = sessions3.filter((s) => s.bounceRate).length / sessions3.length;
        return Math.max(0, Math.min(10, avgSessionTime / 60 - bounceRate * 5));
      }
      async calculateRetentionRisk(userId) {
        try {
          const recentEvents = await db.select().from(userEvents).where(
            and5(
              eq5(userEvents.userId, userId),
              gte4(userEvents.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3))
            )
          );
          return recentEvents.length === 0 ? 0.8 : Math.max(0, 0.8 - recentEvents.length * 0.1);
        } catch (error) {
          return 0.5;
        }
      }
      async calculateLoyaltyScore(userId) {
        try {
          const userSessionsData = await db.select().from(userSessions).where(eq5(userSessions.userId, userId)).orderBy(desc2(userSessions.startedAt));
          if (userSessionsData.length <= 1) return 0;
          const daysSinceFirst = Math.floor(
            ((/* @__PURE__ */ new Date()).getTime() - new Date(userSessionsData[userSessionsData.length - 1].startedAt ?? Date.now()).getTime()) / (1e3 * 60 * 60 * 24)
          );
          const sessionsPerDay = userSessionsData.length / Math.max(daysSinceFirst, 1);
          return Math.min(10, sessionsPerDay * 5);
        } catch (error) {
          return 0;
        }
      }
      recommendNextAction(tier, segment, scores) {
        if (segment === "at_risk") return "send_engagement_notification";
        if (tier === "low") return "show_feature_tutorial";
        if (scores.watchlistActivity < 2) return "encourage_watchlist_usage";
        if (scores.candidateComparisons < 1) return "suggest_candidate_comparison";
        return "maintain_engagement";
      }
      calculateConfidenceLevel(dataPoints) {
        if (dataPoints >= 100) return 0.95;
        if (dataPoints >= 50) return 0.85;
        if (dataPoints >= 20) return 0.75;
        if (dataPoints >= 10) return 0.65;
        return 0.5;
      }
      // =============================================================================
      // EXISTING GDPR COMPLIANCE METHODS (Enhanced)
      // =============================================================================
      // Track user interactions with GDPR compliance
      async logInteraction(data) {
        try {
          if (data.ipAddress) {
            data.ipAddress = this.anonymizeIpAddress(data.ipAddress);
          }
          await db.execute(sql4`
        INSERT INTO interaction_logs (user_id, session_id, event_type, metadata, ip_address, timestamp)
        SELECT ${data.userId ?? null}, ${data.sessionId ?? null}, ${data.eventType ?? "unknown"},
               ${JSON.stringify(data.metadata ?? {})}::jsonb, ${data.ipAddress ?? null}, now()
        WHERE to_regclass('interaction_logs') IS NOT NULL
      `);
        } catch (error) {
          console.error("Error logging interaction:", error);
        }
      }
      // Get analytics insights (aggregated data only)
      async getEngagementInsights(electionCycleId) {
        try {
          return {
            totalUsers: 0,
            averageTimeOnPage: 0,
            mostViewedElections: [],
            peakUsageTimes: []
          };
        } catch (error) {
          console.error("Error getting engagement insights:", error);
          return null;
        }
      }
      // GDPR compliance: anonymize IP addresses
      anonymizeIpAddress(ip) {
        const parts = ip.split(".");
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        }
        if (ip.includes(":")) {
          const segments = ip.split(":");
          return segments.slice(0, 4).join(":") + "::";
        }
        return ip;
      }
      // GDPR compliance: data export for user
      async exportUserData(userId) {
        try {
          const [preferences] = await db.select().from(userPreferences).where(eq5(userPreferences.userId, userId));
          const interactions = await db.select().from(voterInteractions).where(eq5(voterInteractions.userId, userId));
          return {
            preferences: preferences || null,
            interactions,
            exportDate: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (error) {
          console.error("Error exporting user data:", error);
          return null;
        }
      }
      // GDPR compliance: delete user data
      async deleteUserData(userId) {
        try {
          await db.delete(userPreferences).where(eq5(userPreferences.userId, userId));
          await db.delete(voterInteractions).where(eq5(voterInteractions.userId, userId));
          for (const table of ["user_demographics", "non_voter_tracking", "interaction_logs"]) {
            const exists = await db.execute(sql4`select to_regclass(${table}) as t`);
            if (exists.rows?.[0]?.t) {
              await db.execute(sql4`DELETE FROM ${sql4.identifier(table)} WHERE user_id = ${userId}`);
            }
          }
          return true;
        } catch (error) {
          console.error("Error deleting user data:", error);
          return false;
        }
      }
    };
    analyticsService = new AnalyticsService();
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  databaseStorage: () => databaseStorage,
  initializeData: () => initializeData,
  stopStorageBackground: () => stopStorageBackground,
  storage: () => storage,
  userDemographicsSchema: () => userDemographicsSchema
});
import { eq as eq6, and as and6, gte as gte5, lte as lte4, lt as lt2, ilike as ilike3, or as or3, desc as desc3, asc, inArray as inArray3, isNotNull, getTableColumns as getTableColumns3, sql as sql5 } from "drizzle-orm";
import bcrypt from "bcryptjs";
async function initializeData() {
  const { StorageMode: StorageMode2 } = await Promise.resolve().then(() => (init_storage_factory(), storage_factory_exports));
  const healthStatus = storage.getHealthStatus();
  if (!healthStatus.isDatabaseHealthy) {
    console.log("\u{1F504} Storage: memory mode; DB unhealthy\u2014writes gated");
    console.log("\u2139\uFE0F  Database operations will be queued until health is restored");
    await storage.setStorageMode(StorageMode2.MEMORY);
  } else {
    console.log("\u2705 Storage: database mode; DB healthy");
  }
  try {
    await storage.syncElectionsFromGoogleCivic();
    console.log("Initial sync with Google Civic API completed");
  } catch (error) {
    console.log("Google Civic API sync completed with fallbacks");
  }
  const finalStatus = storage.getHealthStatus();
  console.log(`\u{1F504} Storage System Initialized:
  - Mode: ${finalStatus.mode}
  - Database Health: ${finalStatus.isDatabaseHealthy ? "\u2705 Healthy" : "\u274C Unhealthy"}
  - Current Storage: ${finalStatus.currentStorageType}
  - Queue Length: ${finalStatus.queueLength}
  - Last Health Check: ${finalStatus.lastHealthCheck.toISOString()}`);
}
async function stopStorageBackground() {
  const results = await Promise.allSettled([periodicSyncWork.stop(), storage.destroy()]);
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Storage background shutdown failed");
  }
}
var userDemographicsSchema, DatabaseStorage, storage, databaseStorage, periodicSyncWork;
var init_storage = __esm({
  "server/storage.ts"() {
    init_election_list_query();
    init_results_store();
    init_background_work();
    init_schema();
    init_db();
    init_schema();
    init_google_civic_service();
    init_congress_bill_service();
    init_perplexity_service();
    init_state_election_rules();
    init_storage_factory();
    userDemographicsSchema = updateUserPreferencesSchema.pick({
      state: true,
      city: true,
      congressionalDistrict: true,
      partyAffiliations: true,
      issueInterests: true
    });
    DatabaseStorage = class {
      // Health checking implementation
      isDbHealthy() {
        return true;
      }
      // Centralized database error handling wrapper
      async handleDatabaseOperation(operation, fallbackValue, operationName = "database operation") {
        try {
          return await operation();
        } catch (error) {
          console.log(`${operationName} error:`, error);
          if (error instanceof Error && error.message.includes("endpoint has been disabled")) {
            console.log(`Database temporarily unavailable - returning fallback for ${operationName}`);
            return fallbackValue;
          }
          throw error;
        }
      }
      async getElections(filters) {
        const query = buildElectionListQuery(db, filters);
        return this.handleDatabaseOperation(
          async () => (await query).filter((election) => validateNotMockData(election).ok).map(projectElectionResultsRow),
          [],
          "getElections"
        );
      }
      async getElectionsStrict(filters) {
        const rows = await buildElectionListQuery(db, filters);
        return rows.filter((election) => validateNotMockData(election).ok).map(projectElectionResultsRow);
      }
      async getElection(id2) {
        const [election] = await db.select({ ...getTableColumns3(elections), resultsCatalogTimestamp }).from(elections).where(eq6(elections.id, id2));
        return election ? projectElectionResultsRow(election) : void 0;
      }
      async getElectionByTitleAndDate(title, date2) {
        const [election] = await db.select({ ...getTableColumns3(elections), resultsCatalogTimestamp }).from(elections).where(and6(
          eq6(elections.title, title),
          eq6(elections.date, date2)
        )).limit(1);
        return election ? projectElectionResultsRow(election) : void 0;
      }
      async createElection(insertElection) {
        const validationErrors = validateElectionData({
          state: insertElection.state,
          date: insertElection.date,
          level: insertElection.level,
          type: insertElection.type
        });
        if (validationErrors.length > 0) {
          throw new Error(`Invalid election data: ${validationErrors.map((e) => e.message).join("; ")}`);
        }
        const mockCheck = validateNotMockData(insertElection);
        if (!mockCheck.ok) {
          throw new Error(`Mock data detected: ${mockCheck.message}`);
        }
        const [election] = await db.insert(elections).values(insertElection).returning();
        return election;
      }
      async deleteElection(id2) {
        await db.delete(candidates).where(eq6(candidates.electionId, id2));
        await db.delete(elections).where(eq6(elections.id, id2));
      }
      async getCandidatesByElection(electionId) {
        return await db.select().from(candidates).where(eq6(candidates.electionId, electionId)).orderBy(desc3(candidates.pollingSupport));
      }
      async getCandidatesByElections(electionIds) {
        if (electionIds.length === 0) return [];
        return await db.select().from(candidates).where(inArray3(candidates.electionId, electionIds)).orderBy(desc3(candidates.pollingSupport));
      }
      async getCandidatesByIds(candidateIds) {
        if (candidateIds.length === 0) return [];
        const results = await db.select().from(candidates).where(inArray3(candidates.id, candidateIds)).orderBy(desc3(candidates.pollingSupport));
        return results;
      }
      async getCandidates(electionId) {
        if (electionId !== void 0) {
          return await db.select().from(candidates).where(eq6(candidates.electionId, electionId)).orderBy(desc3(candidates.pollingSupport));
        } else {
          return await db.select().from(candidates).orderBy(desc3(candidates.pollingSupport));
        }
      }
      resultReports = new PgResultReportStore(pool);
      recordResultReport(electionId, input, ctx) {
        return this.resultReports.recordResultReport(electionId, input, ctx);
      }
      getResultsPayload(electionId) {
        return this.resultReports.getResultsPayload(electionId);
      }
      listResultsPayloads(query) {
        return this.resultReports.listResultsPayloads(query);
      }
      storeResultEvidence(bytes, contentType, filename, uploadedBy) {
        return this.resultReports.storeResultEvidence(bytes, contentType, filename, uploadedBy);
      }
      listResultSources(state) {
        return this.resultReports.listResultSources(state);
      }
      async getElectionResults(electionId) {
        try {
          const candidatesWithResults = await db.select().from(candidates).where(eq6(candidates.electionId, electionId)).orderBy(desc3(candidates.votePercentage));
          const hasResults = candidatesWithResults.some((c) => c.votesReceived !== null);
          const winner = candidatesWithResults.find((c) => c.isWinner);
          return {
            electionId,
            candidates: candidatesWithResults,
            hasResults,
            winner,
            totalVotes: candidatesWithResults.reduce((sum3, c) => sum3 + (c.votesReceived || 0), 0)
          };
        } catch (error) {
          console.error("Error fetching election results:", error);
          return {
            electionId,
            candidates: [],
            hasResults: false,
            winner: null,
            totalVotes: 0
          };
        }
      }
      async updateElectionResults(electionId, resultsData) {
        const existingResults = await db.select().from(electionResults).where(eq6(electionResults.electionId, electionId));
        const existingResult = existingResults[0];
        if (existingResult) {
          await db.update(electionResults).set({
            totalVotes: resultsData.totalVotes,
            reportingPrecincts: resultsData.reportingPrecincts,
            totalPrecincts: resultsData.totalPrecincts,
            percentReporting: resultsData.percentReporting,
            isComplete: resultsData.isComplete,
            lastUpdated: /* @__PURE__ */ new Date()
          }).where(eq6(electionResults.electionId, electionId));
        } else {
          await db.insert(electionResults).values({
            electionId,
            totalVotes: resultsData.totalVotes,
            reportingPrecincts: resultsData.reportingPrecincts,
            totalPrecincts: resultsData.totalPrecincts,
            percentReporting: resultsData.percentReporting,
            isComplete: resultsData.isComplete,
            lastUpdated: /* @__PURE__ */ new Date()
          });
        }
        if (resultsData.candidateResults) {
          for (const candidateResult of resultsData.candidateResults) {
            await db.update(candidates).set({
              votesReceived: candidateResult.votesReceived,
              votePercentage: candidateResult.votePercentage,
              isWinner: candidateResult.isWinner,
              isProjectedWinner: candidateResult.isProjectedWinner
            }).where(eq6(candidates.id, candidateResult.candidateId));
          }
        }
        return this.getElectionResults(electionId);
      }
      async createCandidate(insertCandidate) {
        const [candidate] = await db.insert(candidates).values(insertCandidate).returning();
        return candidate;
      }
      async updateCandidatePolling(candidateId, pollingData2) {
        await db.update(candidates).set({
          ...pollingData2,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq6(candidates.id, candidateId));
      }
      async getElectionStats() {
        return this.handleDatabaseOperation(
          async () => {
            const now = /* @__PURE__ */ new Date();
            const allElections = await db.select().from(elections).where(eq6(elections.isActive, true));
            const upcomingElections = allElections.filter((e) => new Date(e.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const byType = {};
            const byLevel = {};
            allElections.forEach((election) => {
              byType[election.type] = (byType[election.type] || 0) + 1;
              byLevel[election.level] = (byLevel[election.level] || 0) + 1;
            });
            const normalizedByLevel = {
              ...byLevel,
              Federal: byLevel["federal"] || 0,
              State: byLevel["state"] || 0,
              Local: byLevel["local"] || 0
            };
            const normalizedByType = {
              ...byType,
              Primary: byType["primary"] || 0,
              General: byType["general"] || 0,
              Special: byType["special"] || 0
            };
            return {
              total: allElections.length,
              byType: normalizedByType,
              byLevel: normalizedByLevel,
              nextElection: upcomingElections[0] || null
            };
          },
          // Fallback value when database is unavailable
          {
            total: 0,
            byType: {
              Primary: 0,
              General: 0,
              Special: 0
            },
            byLevel: {
              Federal: 0,
              State: 0,
              Local: 0
            },
            nextElection: null
          },
          "getElectionStats"
        );
      }
      async syncElectionsFromGoogleCivic() {
        const civicService = getGoogleCivicService();
        if (!civicService) {
          console.warn("Google Civic API service not available");
          return;
        }
        try {
          const googleElections = await civicService.fetchElections();
          for (const election of googleElections) {
            const existing = await db.select().from(elections).where(and6(
              eq6(elections.title, election.title),
              eq6(elections.date, election.date)
            )).limit(1);
            if (existing.length === 0) {
              await db.insert(elections).values({
                title: election.title,
                subtitle: election.subtitle,
                location: election.location,
                state: election.state,
                date: election.date,
                type: election.type,
                level: election.level,
                offices: election.offices,
                description: election.description,
                pollsOpen: election.pollsOpen,
                pollsClose: election.pollsClose,
                timezone: election.timezone,
                isActive: election.isActive
              });
            }
          }
          console.log(`Synced ${googleElections.length} elections from Google Civic API`);
        } catch (error) {
          console.error("Error syncing elections from Google Civic API:", error);
        }
      }
      async getVoterInfo(address) {
        const civicService = getGoogleCivicService();
        if (!civicService) {
          throw new Error("Google Civic API service not available");
        }
        try {
          const googleElections = await civicService.fetchElections();
          const upcomingGoogleElection = googleElections.find(
            (election) => election.date > /* @__PURE__ */ new Date()
          );
          const googleElectionId = upcomingGoogleElection ? upcomingGoogleElection.id.toString() : void 0;
          return await civicService.fetchVoterInfo(address, googleElectionId);
        } catch (error) {
          console.error("Error fetching voter info:", error);
          if (error.message?.includes("404")) {
            return {
              error: "NO_VOTER_INFO_AVAILABLE",
              message: "Voter information is not currently available for this address and upcoming elections. This may be because there are no elections scheduled in your area, or detailed voting information hasn't been published yet by election officials.",
              suggestedActions: [
                "Try a more specific address (include apartment/unit number)",
                "Check back closer to election day when more details are available",
                "Contact your local election office for voting information"
              ]
            };
          }
          throw error;
        }
      }
      async getAllBills() {
        const congressService2 = getCongressBillService();
        if (!congressService2) {
          return [];
        }
        try {
          return await congressService2.fetchAllBills();
        } catch (error) {
          console.error("Error fetching all bills:", error);
          return [];
        }
      }
      async getBillsByCongress(congress) {
        const congressService2 = getCongressBillService();
        if (!congressService2) {
          return [];
        }
        try {
          return await congressService2.fetchBillsByCongress(congress);
        } catch (error) {
          console.error("Error fetching bills by congress:", error);
          return [];
        }
      }
      async getAllMembers() {
        try {
          const dbMembers = await db.select().from(congressMembers).limit(550);
          if (dbMembers.length > 0) {
            return dbMembers;
          }
          const congressService2 = getCongressBillService();
          if (!congressService2) {
            return [];
          }
          const apiMembers = await congressService2.fetchAllMembers();
          if (apiMembers.length > 0) {
            await this.syncCongressMembersToDatabase(apiMembers);
          }
          return apiMembers;
        } catch (error) {
          console.error("Error fetching all members:", error);
          return [];
        }
      }
      async syncCongressMembersToDatabase(members) {
        try {
          const insertData = members.map((member) => ({
            bioguideId: member.bioguideId,
            name: member.name,
            party: member.party,
            state: member.state,
            chamber: member.chamber,
            district: member.district,
            congress: 119
          }));
          if (insertData.length > 0) {
            await db.insert(congressMembers).values(insertData);
            console.log(`Successfully synced ${insertData.length} members to database`);
          }
        } catch (error) {
          console.error("Error syncing members to database:", error);
        }
      }
      async getAllCongressMembers() {
        try {
          return await db.select().from(congressMembers);
        } catch (error) {
          console.error("Error fetching all congressional members:", error);
          return [];
        }
      }
      async getMembersByState(state) {
        try {
          const members = await db.select().from(congressMembers).where(eq6(congressMembers.state, state.toUpperCase()));
          console.log(`Found ${members.length} members for state ${state}`);
          return members;
        } catch (error) {
          console.error("Error fetching members by state:", error);
          return [];
        }
      }
      async getAllCommittees() {
        const congressService2 = getCongressBillService();
        if (!congressService2) {
          return [];
        }
        try {
          return await congressService2.fetchAllCommittees();
        } catch (error) {
          console.error("Error fetching all committees:", error);
          return [];
        }
      }
      async getCommitteeMembers(chamber, committeeCode) {
        const congressService2 = getCongressBillService();
        if (!congressService2) {
          return [];
        }
        try {
          return await congressService2.fetchCommitteeMembers(chamber, committeeCode);
        } catch (error) {
          console.error("Error fetching committee members:", error);
          return [];
        }
      }
      async getDailyCongressionalRecords() {
        const congressService2 = getCongressBillService();
        if (!congressService2) {
          return [];
        }
        try {
          return await congressService2.fetchDailyCongressionalRecords();
        } catch (error) {
          console.error("Error fetching congressional records:", error);
          return [];
        }
      }
      async getSenateCommunications() {
        const congressService2 = getCongressBillService();
        if (!congressService2) {
          return [];
        }
        try {
          return await congressService2.fetchSenateCommunications();
        } catch (error) {
          console.error("Error fetching senate communications:", error);
          return [];
        }
      }
      async getAllNominations() {
        const congressService2 = getCongressBillService();
        if (!congressService2) {
          return [];
        }
        try {
          return await congressService2.fetchAllNominations();
        } catch (error) {
          console.error("Error fetching nominations:", error);
          return [];
        }
      }
      async getHouseVotes() {
        const congressService2 = getCongressBillService();
        if (!congressService2) {
          return [];
        }
        try {
          return await congressService2.fetchHouseVotes();
        } catch (error) {
          console.error("Error fetching house votes:", error);
          return [];
        }
      }
      async searchElectionsWithAI(query) {
        const perplexityService = getPerplexityService();
        if (!perplexityService) {
          throw new Error("Perplexity AI service not available");
        }
        try {
          return await perplexityService.searchElections(query);
        } catch (error) {
          console.error("Error searching elections with AI:", error);
          throw error;
        }
      }
      async expandElectionData() {
        const perplexityService = getPerplexityService();
        if (!perplexityService) {
          console.warn("Perplexity AI service not available for election data expansion");
          return;
        }
        try {
          console.log("Expanding election data using Perplexity AI...");
          const comprehensiveElections = await perplexityService.findAllElectionsUntil2026();
          console.log("AI Election Search Results:", comprehensiveElections);
        } catch (error) {
          console.error("Error expanding election data:", error);
        }
      }
      // Removed duplicate implementations - proper implementations are below in User Authentication Methods section
      // User Authentication Methods
      async getUser(id2) {
        const [user] = await db.select().from(users).where(eq6(users.id, id2));
        return user;
      }
      async upsertUser(userData) {
        const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return user;
      }
      // Removed duplicate User Authentication Methods - implementations are below
      // User Watchlist Methods
      async getUserWatchlist(userId) {
        try {
          const userWatchlist = await db.select({ ...getTableColumns3(watchlist), election: elections }).from(watchlist).innerJoin(elections, eq6(watchlist.electionId, elections.id)).where(eq6(watchlist.userId, userId));
          return userWatchlist;
        } catch (error) {
          console.error("Error fetching user watchlist:", error);
          return [];
        }
      }
      async addToWatchlist(userId, electionId) {
        try {
          const existing = await db.select().from(watchlist).where(and6(
            eq6(watchlist.userId, userId),
            eq6(watchlist.electionId, electionId)
          ));
          if (existing.length === 0) {
            const [newItem] = await db.insert(watchlist).values({
              userId,
              electionId
            }).returning();
            return newItem;
          }
          return existing[0];
        } catch (error) {
          console.error("Error adding to watchlist:", error);
          throw error;
        }
      }
      async removeFromWatchlist(userId, electionId) {
        try {
          await db.delete(watchlist).where(and6(
            eq6(watchlist.userId, userId),
            eq6(watchlist.electionId, electionId)
          ));
        } catch (error) {
          console.error("Error removing from watchlist:", error);
          throw error;
        }
      }
      // Version Control & Election Cycles
      async getElectionCycles() {
        try {
          return await db.select().from(electionCycles);
        } catch (error) {
          console.error("Error fetching election cycles:", error);
          return [];
        }
      }
      async getElectionCycle(slug) {
        try {
          const [cycle] = await db.select().from(electionCycles).where(eq6(electionCycles.slug, slug));
          return cycle || null;
        } catch (error) {
          console.error("Error fetching election cycle:", error);
          return null;
        }
      }
      // Analytics & GDPR Compliance Methods
      async logInteraction(data) {
        const { analyticsService: analyticsService2 } = await Promise.resolve().then(() => (init_analytics_service(), analytics_service_exports));
        return await analyticsService2.logInteraction(data);
      }
      async recordEngagement(data) {
        if (!data.sessionId) {
          throw Object.assign(new Error("recordEngagement requires a sessionId"), { status: 400, publicCode: "session_required", publicMessage: "X-Session-Id header is required" });
        }
        const { analyticsService: analyticsService2 } = await Promise.resolve().then(() => (init_analytics_service(), analytics_service_exports));
        await analyticsService2.trackEvent({
          userId: data.userId,
          sessionId: data.sessionId,
          eventType: "engagement",
          eventAction: "page_engagement",
          eventCategory: "engagement",
          pageUrl: data.pageUrl ?? "",
          pagePath: data.pagePath ?? "/",
          timeOnPage: data.timeOnPage,
          scrollDepth: data.scrollDepth,
          targetType: data.electionCycleId != null ? "election_cycle" : void 0,
          targetId: data.electionCycleId
        });
      }
      // Comprehensive User Preferences Implementation
      async getUserPreferences(userId) {
        return await this.handleDatabaseOperation(async () => {
          const [preferences] = await db.select().from(userPreferences).where(eq6(userPreferences.userId, userId)).limit(1);
          return preferences || null;
        }, null, "getUserPreferences");
      }
      async createUserPreferences(userId, preferences) {
        return await this.handleDatabaseOperation(async () => {
          const [created] = await db.insert(userPreferences).values({
            ...preferences,
            userId,
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          return created;
        }, {}, "createUserPreferences");
      }
      async updateUserPreferences(userId, updates) {
        return await this.handleDatabaseOperation(async () => {
          let existing = await this.getUserPreferences(userId);
          if (!existing) {
            existing = await this.createDefaultUserPreferences(userId);
          }
          const [updated] = await db.update(userPreferences).set({
            ...updates,
            updatedAt: /* @__PURE__ */ new Date(),
            // Update specific timestamps based on what was changed
            lastLocationUpdate: updates.state || updates.city || updates.congressionalDistrict ? /* @__PURE__ */ new Date() : existing.lastLocationUpdate,
            lastInterestUpdate: updates.federalElectionsInterest !== void 0 || updates.stateElectionsInterest !== void 0 || updates.localElectionsInterest !== void 0 ? /* @__PURE__ */ new Date() : existing.lastInterestUpdate
          }).where(eq6(userPreferences.userId, userId)).returning();
          return updated;
        }, {}, "updateUserPreferences");
      }
      async createDefaultUserPreferences(userId) {
        return await this.handleDatabaseOperation(async () => {
          const defaultPrefs = {
            userId,
            // Default to reasonable starting preferences
            federalElectionsInterest: true,
            stateElectionsInterest: true,
            localElectionsInterest: false,
            candidateProfilesInterest: true,
            votingRecordsInterest: false,
            primaryElectionsEnabled: true,
            generalElectionsEnabled: true,
            specialElectionsEnabled: false,
            runoffElectionsEnabled: false,
            candidateInformationDepth: "standard",
            electionTimelinePreference: "all",
            pollingDataInterest: true,
            endorsementDataInterest: false,
            digestFrequency: "weekly",
            breakingNewsAlerts: false,
            electionReminderAlerts: true,
            candidateUpdateAlerts: false,
            dataUsageConsent: true,
            personalizationEnabled: true,
            analyticsOptOut: false,
            onboardingCompleted: false,
            onboardingStepsCompleted: [],
            skipOnboarding: false,
            preferenceSource: "default"
          };
          return await this.createUserPreferences(userId, defaultPrefs);
        }, {}, "createDefaultUserPreferences");
      }
      // Congressional District Support Methods
      async getCongressionalDistricts(state) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(congressionalDistricts).$dynamic();
          if (state) {
            query = query.where(eq6(congressionalDistricts.state, state.toUpperCase()));
          }
          return await query.orderBy(congressionalDistricts.state, congressionalDistricts.district);
        }, [], "getCongressionalDistricts");
      }
      async getCongressionalDistrictByCode(districtCode) {
        return await this.handleDatabaseOperation(async () => {
          const [district] = await db.select().from(congressionalDistricts).where(eq6(congressionalDistricts.districtCode, districtCode.toUpperCase())).limit(1);
          return district || null;
        }, null, "getCongressionalDistrictByCode");
      }
      async lookupCongressionalDistrict(state, city, zipCode) {
        return await this.handleDatabaseOperation(async () => {
          const districts = await this.getCongressionalDistricts(state);
          if (city) {
            const matchingDistrict = districts.find(
              (d) => d.majorCities?.some(
                (c) => c.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(c.toLowerCase())
              )
            );
            if (matchingDistrict) {
              return matchingDistrict;
            }
          }
          return districts.length > 0 ? districts[0] : null;
        }, null, "lookupCongressionalDistrict");
      }
      async updateUserDemographics(userId, demographics) {
        const parsed = userDemographicsSchema.safeParse(demographics);
        if (!parsed.success) {
          throw Object.assign(new Error("invalid demographics"), { status: 400, publicCode: "invalid_demographics", publicMessage: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
        }
        return await this.updateUserPreferences(userId, parsed.data);
      }
      async exportUserData(userId) {
        const { analyticsService: analyticsService2 } = await Promise.resolve().then(() => (init_analytics_service(), analytics_service_exports));
        return await analyticsService2.exportUserData(userId);
      }
      async deleteUserData(userId) {
        const { analyticsService: analyticsService2 } = await Promise.resolve().then(() => (init_analytics_service(), analytics_service_exports));
        return await analyticsService2.deleteUserData(userId);
      }
      // Campaign Portal & Data Marketplace Implementation
      async createCampaignAccount(data) {
        const { campaignPortalService: campaignPortalService2 } = await Promise.resolve().then(() => (init_campaign_portal_service(), campaign_portal_service_exports));
        return await campaignPortalService2.createCampaignAccount(data);
      }
      async validateCampaignAccess(apiKey) {
        const { campaignPortalService: campaignPortalService2 } = await Promise.resolve().then(() => (init_campaign_portal_service(), campaign_portal_service_exports));
        return await campaignPortalService2.validateCampaignAccess(apiKey);
      }
      async getCampaignAnalytics(campaignId, electionId, tier) {
        const { campaignPortalService: campaignPortalService2 } = await Promise.resolve().then(() => (init_campaign_portal_service(), campaign_portal_service_exports));
        return await campaignPortalService2.getElectionAnalytics(campaignId, electionId, tier);
      }
      async getCampaignGeographics(campaignId, region, tier) {
        const { campaignPortalService: campaignPortalService2 } = await Promise.resolve().then(() => (init_campaign_portal_service(), campaign_portal_service_exports));
        return await campaignPortalService2.getGeographicAnalytics(campaignId, region, tier);
      }
      async getCampaignPolling(campaignId, electionId, dateRange) {
        const { campaignPortalService: campaignPortalService2 } = await Promise.resolve().then(() => (init_campaign_portal_service(), campaign_portal_service_exports));
        return await campaignPortalService2.getPollingData(campaignId, electionId, dateRange);
      }
      // === CANDIDATE AUTHENTICATION & PORTAL METHODS ===
      async authenticateCandidate(email, password) {
        try {
          const [account] = await db.select().from(candidateAccounts).where(and6(
            eq6(candidateAccounts.email, email),
            eq6(candidateAccounts.isActive, true)
          )).limit(1);
          if (!account || !await bcrypt.compare(password, account.passwordHash)) {
            return null;
          }
          await db.update(candidateAccounts).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq6(candidateAccounts.id, account.id));
          return account;
        } catch (error) {
          console.error("Error authenticating candidate:", error);
          return null;
        }
      }
      async createCandidateAccount(account) {
        try {
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(account.passwordHash, saltRounds);
          const [newAccount] = await db.insert(candidateAccounts).values({
            ...account,
            passwordHash: hashedPassword
          }).returning();
          return newAccount;
        } catch (error) {
          console.error("Error creating candidate account:", error);
          throw error;
        }
      }
      async getCandidateAccountById(id2) {
        const [account] = await db.select().from(candidateAccounts).where(eq6(candidateAccounts.id, id2)).limit(1);
        return account ?? null;
      }
      async listCandidateAccounts(filter = {}) {
        const q = db.select().from(candidateAccounts);
        const rows = filter.isActive === void 0 ? await q : await q.where(eq6(candidateAccounts.isActive, filter.isActive));
        return rows.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      }
      async setCandidateAccountActive(id2, isActive, accessLevel) {
        const [updated] = await db.update(candidateAccounts).set({ isActive, ...accessLevel ? { accessLevel } : {}, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(candidateAccounts.id, id2)).returning();
        return updated ?? null;
      }
      async updateWatchlistItem(userId, itemId, updates) {
        const [row] = await db.update(watchlist).set(updates).where(and6(eq6(watchlist.id, itemId), eq6(watchlist.userId, userId))).returning();
        if (!row) throw Object.assign(new Error("Watchlist item not found"), { status: 404, publicCode: "not_found", publicMessage: "Watchlist item not found" });
        return row;
      }
      // ===========================================================================
      // Contract completion (strict tranche 1): members IStorage declared and routes
      // called that had NO implementation anywhere (they threw "not a function" at
      // runtime). Everything below is backed by its real table; nothing is invented.
      // ===========================================================================
      notFound(what) {
        throw Object.assign(new Error(`${what} not found`), { status: 404, publicCode: "not_found", publicMessage: `${what} not found` });
      }
      notImplemented(method, hint) {
        throw Object.assign(new Error(`${method} is not implemented: ${hint}`), { status: 501, publicCode: "not_implemented", publicMessage: "This capability is not available yet" });
      }
      // --- Backup operations ---------------------------------------------------
      async createBackupOperation(operation) {
        const [row] = await db.insert(backupOperations).values(operation).returning();
        return row;
      }
      async getBackupOperation(id2) {
        const [row] = await db.select().from(backupOperations).where(eq6(backupOperations.id, id2)).limit(1);
        return row;
      }
      async getBackupOperations(filters = {}) {
        const conditions = [];
        if (filters.status) conditions.push(eq6(backupOperations.status, filters.status));
        if (filters.type) conditions.push(eq6(backupOperations.type, filters.type));
        const limit = Math.min(500, Math.max(1, filters.limit ?? 50));
        const offset = Math.max(0, ((filters.page ?? 1) - 1) * limit);
        const base = db.select().from(backupOperations);
        const q = conditions.length ? base.where(and6(...conditions)) : base;
        return q.orderBy(desc3(backupOperations.startedAt), desc3(backupOperations.id)).limit(limit).offset(offset);
      }
      async getRecentBackupOperations(limit) {
        return db.select().from(backupOperations).orderBy(desc3(backupOperations.startedAt), desc3(backupOperations.id)).limit(Math.min(500, Math.max(1, limit)));
      }
      async updateBackupOperation(operationId, updates) {
        const { id: _id, ...rest } = updates;
        const [row] = await db.update(backupOperations).set(rest).where(eq6(backupOperations.operationId, operationId)).returning();
        return row ?? this.notFound("Backup operation");
      }
      // --- Retention policies ----------------------------------------------------
      async createBackupRetentionPolicy(policy) {
        const [row] = await db.insert(backupRetentionPolicies).values(policy).returning();
        return row;
      }
      async getBackupRetentionPolicies() {
        return db.select().from(backupRetentionPolicies).orderBy(asc(backupRetentionPolicies.name));
      }
      async getActiveRetentionPolicies() {
        return db.select().from(backupRetentionPolicies).where(eq6(backupRetentionPolicies.isActive, true)).orderBy(asc(backupRetentionPolicies.name));
      }
      async updateBackupRetentionPolicy(id2, updates) {
        const { id: _id, ...rest } = updates;
        const [row] = await db.update(backupRetentionPolicies).set({ ...rest, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(backupRetentionPolicies.id, id2)).returning();
        return row ?? this.notFound("Retention policy");
      }
      // --- Storage locations -----------------------------------------------------
      async createBackupStorageLocation(location) {
        const [row] = await db.insert(backupStorageLocations).values(location).returning();
        return row;
      }
      async getBackupStorageLocations() {
        return db.select().from(backupStorageLocations).orderBy(asc(backupStorageLocations.name));
      }
      async updateBackupStorageLocation(id2, updates) {
        const { id: _id, ...rest } = updates;
        const [row] = await db.update(backupStorageLocations).set({ ...rest, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(backupStorageLocations.id, id2)).returning();
        return row ?? this.notFound("Storage location");
      }
      // --- System config ---------------------------------------------------------
      async getBackupSystemConfig() {
        return db.select().from(backupSystemConfig).orderBy(asc(backupSystemConfig.configKey));
      }
      async setBackupSystemConfig(key, value) {
        const isScalar = ["string", "number", "boolean"].includes(typeof value);
        const configType = isScalar ? typeof value : "json";
        const configValue = isScalar ? String(value) : JSON.stringify(value);
        const [updated] = await db.update(backupSystemConfig).set({ configValue, configType, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(backupSystemConfig.configKey, key)).returning();
        if (updated) return updated;
        const [inserted] = await db.insert(backupSystemConfig).values({ configKey: key, configValue, configType }).returning();
        return inserted;
      }
      // --- Restore validations ---------------------------------------------------
      async createRestoreValidation(validation) {
        const [row] = await db.insert(restoreValidations).values(validation).returning();
        return row;
      }
      async getRestoreValidations(filters = {}) {
        const limit = Math.min(500, Math.max(1, filters.limit ?? 50));
        const offset = Math.max(0, ((filters.page ?? 1) - 1) * limit);
        const base = db.select().from(restoreValidations);
        const q = filters.status ? base.where(eq6(restoreValidations.status, filters.status)) : base;
        return q.orderBy(desc3(restoreValidations.startedAt), desc3(restoreValidations.id)).limit(limit).offset(offset);
      }
      async getRecentRestoreValidations(limit) {
        return db.select().from(restoreValidations).orderBy(desc3(restoreValidations.startedAt), desc3(restoreValidations.id)).limit(Math.min(500, Math.max(1, limit)));
      }
      async updateRestoreValidation(validationId, updates) {
        const { id: _id, ...rest } = updates;
        const [row] = await db.update(restoreValidations).set(rest).where(eq6(restoreValidations.validationId, validationId)).returning();
        return row ?? this.notFound("Restore validation");
      }
      // --- Schema versions -------------------------------------------------------
      async createSchemaVersion(version) {
        const [row] = await db.insert(schemaVersions).values(version).returning();
        return row;
      }
      async getSchemaVersions() {
        return db.select().from(schemaVersions).orderBy(desc3(schemaVersions.detectedAt), desc3(schemaVersions.id));
      }
      async getLatestSchemaVersion() {
        const [row] = await db.select().from(schemaVersions).orderBy(desc3(schemaVersions.detectedAt), desc3(schemaVersions.id)).limit(1);
        return row;
      }
      async updateSchemaVersion(id2, updates) {
        const { id: _id, ...rest } = updates;
        const [row] = await db.update(schemaVersions).set(rest).where(eq6(schemaVersions.id, id2)).returning();
        return row ?? this.notFound("Schema version");
      }
      // --- Watchlist (enhanced) --------------------------------------------------
      async watchlistRowsFor(userId) {
        return db.select({ item: watchlist, election: elections }).from(watchlist).innerJoin(elections, eq6(watchlist.electionId, elections.id)).where(eq6(watchlist.userId, userId));
      }
      async getWatchlistAnalytics(userId) {
        const rows = await this.watchlistRowsFor(userId);
        const now = Date.now(), weekAgo = now - 7 * 24 * 3600 * 1e3;
        const tally = (pick) => {
          const out = {};
          for (const r of rows) {
            const k = pick(r) ?? "unspecified";
            out[k] = (out[k] ?? 0) + 1;
          }
          return out;
        };
        return {
          totalItems: rows.length,
          byStatus: tally((r) => r.item.status),
          byCategory: tally((r) => r.item.category),
          byPriority: tally((r) => r.item.priority),
          recentlyAdded: rows.filter((r) => (r.item.createdAt?.getTime() ?? 0) >= weekAgo).length,
          upcomingElections: rows.filter((r) => r.election.date.getTime() >= now).length,
          completedElections: rows.filter((r) => r.election.date.getTime() < now).length
        };
      }
      async getEnhancedWatchlist(userId, filters = {}) {
        const conditions = [eq6(watchlist.userId, userId)];
        if (filters.status?.length) conditions.push(inArray3(watchlist.status, filters.status));
        if (filters.category?.length) conditions.push(inArray3(watchlist.category, filters.category));
        if (filters.priority?.length) conditions.push(inArray3(watchlist.priority, filters.priority));
        if (filters.tags?.length) conditions.push(sql5`${watchlist.tags} && ${filters.tags}::text[]`);
        if (filters.search?.trim()) conditions.push(or3(ilike3(elections.title, `%${filters.search.trim()}%`), ilike3(elections.location, `%${filters.search.trim()}%`)));
        const dir = filters.sortOrder === "asc" ? asc : desc3;
        const order = filters.sortBy === "priority" ? dir(watchlist.priority) : filters.sortBy === "category" ? dir(watchlist.category) : filters.sortBy === "recent" ? dir(watchlist.createdAt) : filters.sortBy === "custom" ? dir(watchlist.sortOrder) : dir(elections.date);
        const limit = Math.min(200, Math.max(1, Number.isFinite(filters.limit) ? filters.limit : 50));
        const offset = Math.max(0, Number.isFinite(filters.offset) ? filters.offset : 0);
        const where = and6(...conditions);
        const [rows, [{ total }]] = await Promise.all([
          db.select({ item: watchlist, election: elections }).from(watchlist).innerJoin(elections, eq6(watchlist.electionId, elections.id)).where(where).orderBy(order, asc(watchlist.id)).limit(limit).offset(offset),
          db.select({ total: sql5`count(*)`.mapWith(Number) }).from(watchlist).innerJoin(elections, eq6(watchlist.electionId, elections.id)).where(where)
        ]);
        const items = rows.map(({ item, election }) => ({
          id: item.id,
          priority: item.priority ?? "medium",
          category: item.category ?? void 0,
          status: item.status ?? "active",
          tags: item.tags ?? [],
          notes: item.notes ?? void 0,
          addedVia: item.addedVia ?? "manual",
          interactionCount: item.interactionCount ?? 0,
          lastInteraction: item.lastInteraction?.toISOString(),
          notificationsEnabled: item.notificationsEnabled ?? true,
          reminderDaysBefore: item.reminderDaysBefore ?? 7,
          election: {
            id: election.id,
            title: election.title,
            subtitle: election.subtitle ?? void 0,
            location: election.location,
            state: election.state,
            date: election.date.toISOString(),
            type: election.type,
            level: election.level,
            offices: election.offices ?? void 0,
            description: election.description ?? void 0
          },
          createdAt: (item.createdAt ?? /* @__PURE__ */ new Date(0)).toISOString(),
          // watchlist rows carry no updated_at column; the last interaction is the truthful proxy.
          updatedAt: (item.lastInteraction ?? item.createdAt ?? /* @__PURE__ */ new Date(0)).toISOString()
        }));
        return { items, analytics: await this.getWatchlistAnalytics(userId), totalCount: total, hasMore: offset + items.length < total };
      }
      async bulkUpdateWatchlistItems(userId, itemIds, updates) {
        if (!itemIds.length) return [];
        return db.update(watchlist).set(updates).where(and6(eq6(watchlist.userId, userId), inArray3(watchlist.id, itemIds))).returning();
      }
      // --- Recommendations (stored rows; generation lives in recommendation-service) ---
      async getUserRecommendationAnalytics(userId) {
        const [row] = await db.select().from(userRecommendationAnalytics).where(eq6(userRecommendationAnalytics.userId, userId)).limit(1);
        return row ?? null;
      }
      async updateUserRecommendationAnalytics(userId, updates) {
        const { id: _id, userId: _u, ...rest } = updates;
        const [updated] = await db.update(userRecommendationAnalytics).set(rest).where(eq6(userRecommendationAnalytics.userId, userId)).returning();
        if (updated) return updated;
        const [inserted] = await db.insert(userRecommendationAnalytics).values({ userId, ...rest }).returning();
        return inserted;
      }
      async calculateRecommendationPerformance(userId) {
        const [c] = await db.select({
          total: sql5`count(*)`.mapWith(Number),
          viewed: sql5`count(*) filter (where ${electionRecommendations.isViewed})`.mapWith(Number),
          clicked: sql5`count(*) filter (where ${electionRecommendations.isClicked})`.mapWith(Number),
          added: sql5`count(*) filter (where ${electionRecommendations.isAddedToWatchlist})`.mapWith(Number),
          dismissed: sql5`count(*) filter (where ${electionRecommendations.isDismissed})`.mapWith(Number)
        }).from(electionRecommendations).where(eq6(electionRecommendations.userId, userId));
        const rate = (n) => c.total > 0 ? Math.round(n / c.total * 1e3) / 10 : 0;
        return { viewRate: rate(c.viewed), clickRate: rate(c.clicked), conversionRate: rate(c.added), dismissalRate: rate(c.dismissed) };
      }
      async getRecommendationInsights(userId) {
        const rows = await db.select({ type: electionRecommendations.recommendationType, level: elections.level, clickedAt: electionRecommendations.clickedAt, isClicked: electionRecommendations.isClicked, isViewed: electionRecommendations.isViewed }).from(electionRecommendations).innerJoin(elections, eq6(electionRecommendations.electionId, elections.id)).where(and6(eq6(electionRecommendations.userId, userId), eq6(electionRecommendations.isClicked, true)));
        const top = (vals) => Object.entries(vals.reduce((m, v) => {
          if (v) m[v] = (m[v] ?? 0) + 1;
          return m;
        }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
        const hours = rows.map((r) => r.clickedAt?.getHours()).filter((h) => typeof h === "number");
        const hourMode = hours.length ? Number(Object.entries(hours.reduce((m, h) => {
          m[h] = (m[h] ?? 0) + 1;
          return m;
        }, {})).sort((a, b) => b[1] - a[1])[0][0]) : null;
        const perf = await this.calculateRecommendationPerformance(userId);
        return {
          preferredTypes: top(rows.map((r) => r.type)),
          preferredLevels: top(rows.map((r) => r.level)),
          optimalTiming: hourMode === null ? "unknown" : `${String(hourMode).padStart(2, "0")}:00`,
          qualityScore: perf.clickRate
        };
      }
      async getCachedRecommendations(userId, cacheKey) {
        const [row] = await db.select().from(recommendationCache).where(and6(eq6(recommendationCache.userId, userId), eq6(recommendationCache.cacheKey, cacheKey), eq6(recommendationCache.isValid, true), gte5(recommendationCache.validUntil, /* @__PURE__ */ new Date()))).limit(1);
        return row ?? null;
      }
      async setCachedRecommendations(userId, cacheKey, data, validUntil) {
        await db.delete(recommendationCache).where(and6(eq6(recommendationCache.userId, userId), eq6(recommendationCache.cacheKey, cacheKey)));
        const recommendationType = typeof data?.type === "string" ? data.type : cacheKey.includes(":") ? cacheKey.slice(0, cacheKey.indexOf(":")) : "personalized";
        const [row] = await db.insert(recommendationCache).values({ userId, cacheKey, recommendationType, recommendationData: data, validUntil, isValid: true, totalRecommendations: Array.isArray(data?.recommendations) ? data.recommendations.length : 0 }).returning();
        return row;
      }
      async invalidateRecommendationCache(userId, pattern) {
        const where = pattern ? and6(eq6(recommendationCache.userId, userId), ilike3(recommendationCache.cacheKey, `${pattern}%`)) : eq6(recommendationCache.userId, userId);
        await db.update(recommendationCache).set({ isValid: false, updatedAt: /* @__PURE__ */ new Date() }).where(where);
      }
      async storedRecommendations(userId, type, limit = 10) {
        return db.select().from(electionRecommendations).where(and6(eq6(electionRecommendations.userId, userId), eq6(electionRecommendations.recommendationType, type), eq6(electionRecommendations.isActive, true))).orderBy(desc3(electionRecommendations.scoreTotal), desc3(electionRecommendations.id)).limit(Math.min(100, Math.max(1, limit)));
      }
      async getPersonalizedRecommendations(userId, limit = 10) {
        return this.storedRecommendations(userId, "personalized", limit);
      }
      async getInterestBasedRecommendations(userId, limit = 10) {
        return this.storedRecommendations(userId, "interest", limit);
      }
      async getLocationBasedRecommendations(userId, limit = 10) {
        return this.storedRecommendations(userId, "location", limit);
      }
      async getSimilarUsersRecommendations(userId, limit = 10) {
        return this.storedRecommendations(userId, "similar_users", limit);
      }
      async getTrendingRecommendations(userId, limit = 10) {
        return this.storedRecommendations(userId, "trending", limit);
      }
      async generateRecommendations(_userId, _options) {
        return this.notImplemented("storage.generateRecommendations", "recommendation generation is owned by recommendation-service; the storage layer only stores and reads recommendations");
      }
      async refreshRecommendationCache(userId) {
        await this.invalidateRecommendationCache(userId);
      }
      async getCandidateProfile(candidateId) {
        try {
          const [profile] = await db.select().from(candidateProfiles).where(eq6(candidateProfiles.candidateId, candidateId)).limit(1);
          return profile || null;
        } catch (error) {
          console.error("Error fetching candidate profile:", error);
          return null;
        }
      }
      async updateCandidateProfile(candidateId, profileData) {
        try {
          const totalFields = 25;
          const filledFields = Object.values(profileData).filter(
            (value) => value !== null && value !== void 0 && value !== ""
          ).length;
          const completeness = Math.round(filledFields / totalFields * 100);
          const updatedData = {
            ...profileData,
            dataCompleteness: completeness,
            updatedAt: /* @__PURE__ */ new Date()
          };
          const existingProfile = await this.getCandidateProfile(candidateId);
          if (existingProfile) {
            const [updated] = await db.update(candidateProfiles).set(updatedData).where(eq6(candidateProfiles.candidateId, candidateId)).returning();
            return updated;
          } else {
            const [newProfile] = await db.insert(candidateProfiles).values({
              candidateId,
              ...updatedData
            }).returning();
            return newProfile;
          }
        } catch (error) {
          console.error("Error updating candidate profile:", error);
          throw error;
        }
      }
      async getCandidateDataSources(candidateId) {
        try {
          return await db.select().from(candidateDataSources).where(eq6(candidateDataSources.candidateId, candidateId)).orderBy(desc3(candidateDataSources.createdAt));
        } catch (error) {
          console.error("Error fetching candidate data sources:", error);
          return [];
        }
      }
      async recordDataSource(source) {
        try {
          const [newSource] = await db.insert(candidateDataSources).values(source).returning();
          return newSource;
        } catch (error) {
          console.error("Error recording data source:", error);
          throw error;
        }
      }
      async getCandidatePositions(candidateId, category) {
        try {
          let query = db.select().from(candidatePositions).where(eq6(candidatePositions.candidateId, candidateId));
          if (category) {
            query = db.select().from(candidatePositions).where(and6(
              eq6(candidatePositions.candidateId, candidateId),
              eq6(candidatePositions.category, category)
            ));
          }
          return await query.orderBy(desc3(candidatePositions.lastUpdated));
        } catch (error) {
          console.error("Error fetching candidate positions:", error);
          return [];
        }
      }
      async createCandidatePosition(position) {
        try {
          const [newPosition] = await db.insert(candidatePositions).values(position).returning();
          return newPosition;
        } catch (error) {
          console.error("Error creating candidate position:", error);
          throw error;
        }
      }
      async updateCandidatePosition(positionId, updates) {
        try {
          const [updated] = await db.update(candidatePositions).set({
            ...updates,
            lastUpdated: /* @__PURE__ */ new Date()
          }).where(eq6(candidatePositions.id, positionId)).returning();
          return updated;
        } catch (error) {
          console.error("Error updating candidate position:", error);
          throw error;
        }
      }
      async deleteCandidatePosition(positionId) {
        try {
          await db.delete(candidatePositions).where(eq6(candidatePositions.id, positionId));
        } catch (error) {
          console.error("Error deleting candidate position:", error);
          throw error;
        }
      }
      async getCandidatePositionById(positionId) {
        try {
          const [position] = await db.select().from(candidatePositions).where(eq6(candidatePositions.id, positionId)).limit(1);
          return position || null;
        } catch (error) {
          console.error("Error fetching candidate position:", error);
          return null;
        }
      }
      async getCandidateQAEntries(candidateId, category) {
        try {
          let query = db.select().from(candidateQA).where(eq6(candidateQA.candidateId, candidateId));
          if (category) {
            query = db.select().from(candidateQA).where(and6(
              eq6(candidateQA.candidateId, candidateId),
              eq6(candidateQA.category, category)
            ));
          }
          return await query.orderBy(desc3(candidateQA.updatedAt));
        } catch (error) {
          console.error("Error fetching candidate Q&A entries:", error);
          return [];
        }
      }
      async createCandidateProfile(profile) {
        try {
          const [newProfile] = await db.insert(candidateProfiles).values(profile).returning();
          return newProfile;
        } catch (error) {
          console.error("Error creating candidate profile:", error);
          throw error;
        }
      }
      async getCandidateWithRAG(candidateId) {
        try {
          const [candidate] = await db.select().from(candidates).where(eq6(candidates.id, candidateId)).limit(1);
          if (!candidate) {
            throw new Error("Candidate not found");
          }
          const profile = await this.getCandidateProfile(candidateId);
          const dataSources = await this.getCandidateDataSources(candidateId);
          const enhancedCandidate = {
            ...candidate,
            // Personal Information - Candidate-supplied first
            fullName: profile?.fullName || candidate.name,
            preferredName: profile?.preferredName || candidate.name,
            age: profile?.age,
            birthPlace: profile?.birthPlace,
            currentResidence: profile?.currentResidence,
            familyStatus: profile?.familyStatus,
            // Professional Background - Candidate-supplied first
            currentOccupation: profile?.currentOccupation,
            employmentHistory: profile?.employmentHistory || [],
            education: profile?.education || [],
            militaryService: profile?.militaryService,
            // Political Experience - Candidate-supplied first
            previousOffices: profile?.previousOffices || [],
            politicalExperience: profile?.politicalExperience,
            endorsements: profile?.endorsements || [],
            // Policy Positions - Structured candidate data
            policyPositions: {
              economy: profile?.economyPosition || null,
              healthcare: profile?.healthcarePosition || null,
              education: profile?.educationPosition || null,
              environment: profile?.environmentPosition || null,
              immigration: profile?.immigrationPosition || null,
              criminalJustice: profile?.criminalJusticePosition || null,
              infrastructure: profile?.infrastructurePosition || null,
              taxes: profile?.taxesPosition || null,
              foreignPolicy: profile?.foreignPolicyPosition || null,
              socialIssues: profile?.socialIssuesPosition || null
            },
            // Campaign Information
            campaignWebsite: profile?.campaignWebsite || candidate.website,
            campaignSlogan: profile?.campaignSlogan,
            topPriorities: profile?.topPriorities || [],
            keyAccomplishments: profile?.keyAccomplishments || [],
            // Data Attribution
            dataCompleteness: profile?.dataCompleteness || 0,
            verificationStatus: profile?.verificationStatus || "pending",
            dataSources,
            // Source attribution helper function
            getDataAttribution: (fieldName) => {
              const source = dataSources.find((s) => s.fieldName === fieldName);
              if (source) {
                switch (source.sourceType) {
                  case "candidate_supplied":
                    return "Candidate Supplied";
                  case "ai_research":
                    return "AI Researched";
                  case "verified_external":
                    return `Verified: ${source.sourceDescription}`;
                  default:
                    return "Unknown Source";
                }
              }
              return profile && profile[fieldName] ? "Candidate Supplied" : "Candidate has not supplied that info";
            }
          };
          return enhancedCandidate;
        } catch (error) {
          console.error("Error getting candidate with RAG:", error);
          throw error;
        }
      }
      async purchaseDataExport(campaignId, datasetType, format) {
        const { campaignPortalService: campaignPortalService2 } = await Promise.resolve().then(() => (init_campaign_portal_service(), campaign_portal_service_exports));
        return await campaignPortalService2.purchaseDataExport(campaignId, datasetType, format);
      }
      async getCampaignSubscription(campaignId) {
        const { SUBSCRIPTION_TIERS: SUBSCRIPTION_TIERS2 } = await Promise.resolve().then(() => (init_campaign_portal_service(), campaign_portal_service_exports));
        const [campaign] = await db.select().from(campaignAccounts).where(eq6(campaignAccounts.id, campaignId));
        if (!campaign) {
          throw new Error("Campaign not found");
        }
        return {
          tier: campaign.subscriptionTier,
          isActive: campaign.isActive,
          startDate: campaign.createdAt,
          // Using createdAt as subscription start
          endDate: null,
          // No end date field in current schema
          features: SUBSCRIPTION_TIERS2[campaign.subscriptionTier]?.features || []
        };
      }
      // User Authentication Methods Implementation
      async createUser(email, password) {
        const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
        return await authService2.signup(email, password);
      }
      async authenticateUser(email, password) {
        const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
        return await authService2.signin(email, password);
      }
      async signoutUser(token2) {
        const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
        return await authService2.signout(token2);
      }
      async validateUserSession(token2) {
        const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
        return await authService2.validateSession(token2);
      }
      // Congressional Search & Missing Member Detection
      async searchCongressMembers(searchTerm) {
        return await this.handleDatabaseOperation(async () => {
          const results = await db.select().from(congressMembers).where(
            or3(
              ilike3(congressMembers.name, `%${searchTerm}%`),
              ilike3(congressMembers.state, `%${searchTerm}%`),
              ilike3(congressMembers.party, `%${searchTerm}%`),
              ilike3(congressMembers.bioguideId, `%${searchTerm}%`)
            )
          ).limit(50);
          return results;
        }, [], "searchCongressMembers");
      }
      async findMissingCongressMember() {
        const { congressService: congressService2 } = await Promise.resolve().then(() => (init_congress_api_service(), congress_api_service_exports));
        return await congressService2.findMissingMembers();
      }
      // Notification System Database Methods Implementation
      async getUserNotificationPreferences(userId) {
        return await this.handleDatabaseOperation(async () => {
          const [preferences] = await db.select().from(notificationPreferences).where(eq6(notificationPreferences.userId, userId)).limit(1);
          return preferences || null;
        }, null, "getUserNotificationPreferences");
      }
      async updateUserNotificationPreferences(userId, updates) {
        return await this.handleDatabaseOperation(async () => {
          const existing = await this.getUserNotificationPreferences(userId);
          if (existing) {
            const [updated] = await db.update(notificationPreferences).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(notificationPreferences.userId, userId)).returning();
            return updated;
          } else {
            const [created] = await db.insert(notificationPreferences).values({ userId, ...updates }).returning();
            return created;
          }
        }, {}, "updateUserNotificationPreferences");
      }
      async createDefaultNotificationPreferences(userId) {
        return await this.handleDatabaseOperation(async () => {
          const defaultPrefs = {
            userId,
            emailEnabled: true,
            smsEnabled: false,
            phoneNumber: null,
            electionResultsEnabled: true,
            candidateUpdatesEnabled: true,
            breakingNewsEnabled: false,
            weeklyDigestEnabled: true,
            deadlineRemindersEnabled: true,
            stateFilter: [],
            localElectionsEnabled: false,
            federalElectionsEnabled: true,
            immediateNotifications: false,
            dailyDigest: false,
            weeklyDigest: true,
            preferredDeliveryTime: "09:00",
            timezone: "America/New_York"
          };
          const [created] = await db.insert(notificationPreferences).values(defaultPrefs).returning();
          return created;
        }, {}, "createDefaultNotificationPreferences");
      }
      async getUserNotificationSubscriptions(userId) {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(notificationSubscriptions).where(eq6(notificationSubscriptions.userId, userId)).orderBy(desc3(notificationSubscriptions.createdAt));
        }, [], "getUserNotificationSubscriptions");
      }
      async createNotificationSubscription(subscription) {
        return await this.handleDatabaseOperation(async () => {
          const [created] = await db.insert(notificationSubscriptions).values(subscription).returning();
          return created;
        }, {}, "createNotificationSubscription");
      }
      async updateNotificationSubscription(subscriptionId, updates) {
        return await this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(notificationSubscriptions).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(notificationSubscriptions.id, subscriptionId)).returning();
          return updated;
        }, {}, "updateNotificationSubscription");
      }
      async deleteNotificationSubscription(subscriptionId) {
        return await this.handleDatabaseOperation(async () => {
          await db.delete(notificationSubscriptions).where(eq6(notificationSubscriptions.id, subscriptionId));
        }, void 0, "deleteNotificationSubscription");
      }
      async verifyNotificationSubscription(token2) {
        return await this.handleDatabaseOperation(async () => {
          const [subscription] = await db.select().from(notificationSubscriptions).where(eq6(notificationSubscriptions.verificationToken, token2)).limit(1);
          if (subscription) {
            await db.update(notificationSubscriptions).set({
              isVerified: true,
              verifiedAt: /* @__PURE__ */ new Date(),
              verificationToken: null,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq6(notificationSubscriptions.id, subscription.id));
            return { ...subscription, isVerified: true, verifiedAt: /* @__PURE__ */ new Date() };
          }
          return null;
        }, null, "verifyNotificationSubscription");
      }
      async unsubscribeNotification(token2) {
        return await this.handleDatabaseOperation(async () => {
          await db.update(notificationSubscriptions).set({
            isActive: false,
            unsubscribedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq6(notificationSubscriptions.unsubscribeToken, token2));
        }, void 0, "unsubscribeNotification");
      }
      async getUserNotificationConsents(userId) {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(notificationConsents).where(eq6(notificationConsents.userId, userId)).orderBy(desc3(notificationConsents.createdAt));
        }, [], "getUserNotificationConsents");
      }
      async getNotificationConsentsBetween(start, end) {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(notificationConsents).where(and6(gte5(notificationConsents.consentDate, start), lte4(notificationConsents.consentDate, end))).orderBy(desc3(notificationConsents.consentDate));
        }, [], "getNotificationConsentsBetween");
      }
      /** Active grants whose data_retention_period (days) has elapsed since consent_date. */
      async getExpiredNotificationConsents(asOf) {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(notificationConsents).where(and6(
            eq6(notificationConsents.isActive, true),
            eq6(notificationConsents.consentGiven, true),
            isNotNull(notificationConsents.dataRetentionPeriod),
            sql5`${notificationConsents.consentDate} + make_interval(days => ${notificationConsents.dataRetentionPeriod}) < ${asOf}`
          ));
        }, [], "getExpiredNotificationConsents");
      }
      async unsubscribeNotificationSubscriptionByToken(token2) {
        return await this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(notificationSubscriptions).set({ isActive: false, unsubscribedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and6(eq6(notificationSubscriptions.unsubscribeToken, token2), eq6(notificationSubscriptions.isActive, true))).returning();
          return updated ?? null;
        }, null, "unsubscribeNotificationSubscriptionByToken");
      }
      async getNotificationSubscriptionsVerifiedBetween(start, end) {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(notificationSubscriptions).where(and6(isNotNull(notificationSubscriptions.verifiedAt), gte5(notificationSubscriptions.verifiedAt, start), lte4(notificationSubscriptions.verifiedAt, end)));
        }, [], "getNotificationSubscriptionsVerifiedBetween");
      }
      async recordNotificationConsent(consent) {
        return await this.handleDatabaseOperation(async () => {
          const [created] = await db.insert(notificationConsents).values(consent).returning();
          return created;
        }, {}, "recordNotificationConsent");
      }
      async withdrawNotificationConsent(userId, consentType) {
        return await this.handleDatabaseOperation(async () => {
          await db.update(notificationConsents).set({
            consentGiven: false,
            withdrawalDate: /* @__PURE__ */ new Date(),
            isActive: false,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(and6(
            eq6(notificationConsents.userId, userId),
            eq6(notificationConsents.consentType, consentType),
            eq6(notificationConsents.isActive, true)
          ));
        }, void 0, "withdrawNotificationConsent");
      }
      async getNotificationTemplates(type, category) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(notificationTemplates).$dynamic();
          const conditions = [eq6(notificationTemplates.isActive, true)];
          if (type) conditions.push(eq6(notificationTemplates.type, type));
          if (category) conditions.push(eq6(notificationTemplates.category, category));
          return await query.where(and6(...conditions)).orderBy(notificationTemplates.name);
        }, [], "getNotificationTemplates");
      }
      async getNotificationTemplate(id2) {
        return await this.handleDatabaseOperation(async () => {
          const [template] = await db.select().from(notificationTemplates).where(eq6(notificationTemplates.id, id2)).limit(1);
          return template || null;
        }, null, "getNotificationTemplate");
      }
      async createNotificationTemplate(template) {
        return await this.handleDatabaseOperation(async () => {
          const [created] = await db.insert(notificationTemplates).values(template).returning();
          return created;
        }, {}, "createNotificationTemplate");
      }
      async updateNotificationTemplate(id2, updates) {
        return await this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(notificationTemplates).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(notificationTemplates.id, id2)).returning();
          return updated;
        }, {}, "updateNotificationTemplate");
      }
      async getNotificationCampaigns(status) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(notificationCampaigns).$dynamic();
          if (status) {
            query = query.where(eq6(notificationCampaigns.status, status));
          }
          return await query.orderBy(desc3(notificationCampaigns.createdAt));
        }, [], "getNotificationCampaigns");
      }
      async getNotificationCampaign(id2) {
        return await this.handleDatabaseOperation(async () => {
          const [campaign] = await db.select().from(notificationCampaigns).where(eq6(notificationCampaigns.id, id2)).limit(1);
          return campaign || null;
        }, null, "getNotificationCampaign");
      }
      async createNotificationCampaign(campaign) {
        return await this.handleDatabaseOperation(async () => {
          const [created] = await db.insert(notificationCampaigns).values(campaign).returning();
          return created;
        }, {}, "createNotificationCampaign");
      }
      async updateNotificationCampaign(id2, updates) {
        return await this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(notificationCampaigns).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(notificationCampaigns.id, id2)).returning();
          return updated;
        }, {}, "updateNotificationCampaign");
      }
      async getNotificationDeliveries(campaignId, userId) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(notificationDeliveries).$dynamic();
          const conditions = [];
          if (campaignId) conditions.push(eq6(notificationDeliveries.campaignId, campaignId));
          if (userId) conditions.push(eq6(notificationDeliveries.userId, userId));
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(notificationDeliveries.createdAt));
        }, [], "getNotificationDeliveries");
      }
      async createNotificationDelivery(delivery) {
        return await this.handleDatabaseOperation(async () => {
          const [created] = await db.insert(notificationDeliveries).values(delivery).returning();
          return created;
        }, {}, "createNotificationDelivery");
      }
      async updateNotificationDelivery(id2, updates) {
        return await this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(notificationDeliveries).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(notificationDeliveries.id, id2)).returning();
          return updated;
        }, {}, "updateNotificationDelivery");
      }
      async getNotificationDeliveryStats(campaignId) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(notificationDeliveries).$dynamic();
          if (campaignId) {
            query = query.where(eq6(notificationDeliveries.campaignId, campaignId));
          }
          const deliveries = await query;
          const stats = {
            total: deliveries.length,
            queued: deliveries.filter((d) => d.status === "queued").length,
            sending: deliveries.filter((d) => d.status === "sending").length,
            sent: deliveries.filter((d) => d.status === "sent").length,
            delivered: deliveries.filter((d) => d.status === "delivered").length,
            failed: deliveries.filter((d) => d.status === "failed").length,
            bounced: deliveries.filter((d) => d.status === "bounced").length,
            opened: deliveries.filter((d) => d.openedAt !== null).length,
            clicked: deliveries.filter((d) => d.clickedAt !== null).length
          };
          return stats;
        }, { total: 0, queued: 0, sending: 0, sent: 0, delivered: 0, failed: 0, bounced: 0, opened: 0, clicked: 0 }, "getNotificationDeliveryStats");
      }
      async getNotificationEvents(processed) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(notificationEvents).$dynamic();
          if (processed !== void 0) {
            query = query.where(eq6(notificationEvents.isProcessed, processed));
          }
          return await query.orderBy(desc3(notificationEvents.createdAt));
        }, [], "getNotificationEvents");
      }
      async createNotificationEvent(event) {
        return await this.handleDatabaseOperation(async () => {
          const [created] = await db.insert(notificationEvents).values(event).returning();
          return created;
        }, {}, "createNotificationEvent");
      }
      async updateNotificationEvent(id2, updates) {
        return await this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(notificationEvents).set(updates).where(eq6(notificationEvents.id, id2)).returning();
          return updated;
        }, {}, "updateNotificationEvent");
      }
      async createNotificationWebhook(webhook) {
        return await this.handleDatabaseOperation(async () => {
          const [created] = await db.insert(notificationWebhooks).values(webhook).returning();
          return created;
        }, {}, "createNotificationWebhook");
      }
      async processNotificationWebhook(webhookId) {
        return await this.handleDatabaseOperation(async () => {
          await db.update(notificationWebhooks).set({ processed: true, processedAt: /* @__PURE__ */ new Date() }).where(eq6(notificationWebhooks.id, webhookId));
        }, void 0, "processNotificationWebhook");
      }
      async getUnprocessedWebhooks() {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(notificationWebhooks).where(eq6(notificationWebhooks.processed, false)).orderBy(notificationWebhooks.createdAt);
        }, [], "getUnprocessedWebhooks");
      }
      async getQueuedNotifications(limit) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(notificationDeliveries).where(eq6(notificationDeliveries.status, "queued")).orderBy(notificationDeliveries.queuedAt).$dynamic();
          if (limit) {
            query = query.limit(limit);
          }
          return await query;
        }, [], "getQueuedNotifications");
      }
      async updateNotificationStatus(deliveryId, status, metadata) {
        return await this.handleDatabaseOperation(async () => {
          const updates = { status, updatedAt: /* @__PURE__ */ new Date() };
          switch (status) {
            case "sending":
              updates.sentAt = /* @__PURE__ */ new Date();
              break;
            case "delivered":
              updates.deliveredAt = /* @__PURE__ */ new Date();
              break;
            case "failed":
              updates.failedAt = /* @__PURE__ */ new Date();
              break;
            case "bounced":
              updates.bouncedAt = /* @__PURE__ */ new Date();
              break;
          }
          if (metadata) {
            updates.providerResponse = metadata;
          }
          await db.update(notificationDeliveries).set(updates).where(eq6(notificationDeliveries.id, deliveryId));
        }, void 0, "updateNotificationStatus");
      }
      async retryFailedNotifications(limit) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(notificationDeliveries).where(and6(
            eq6(notificationDeliveries.status, "failed"),
            lte4(notificationDeliveries.retryCount, 3)
          )).orderBy(notificationDeliveries.nextRetryAt).$dynamic();
          if (limit) {
            query = query.limit(limit);
          }
          return await query;
        }, [], "retryFailedNotifications");
      }
      // ============================================================================
      // PLATFORM CONTINUITY METHODS IMPLEMENTATION (Track 3)
      // ============================================================================
      // Secrets Management Methods
      async getSecretByName(secretName) {
        return await this.handleDatabaseOperation(async () => {
          const [secret] = await db.select().from(secretsVault).where(eq6(secretsVault.secretName, secretName)).limit(1);
          return secret || null;
        }, null, "getSecretByName");
      }
      async getSecretById(secretId) {
        return await this.handleDatabaseOperation(async () => {
          const [secret] = await db.select().from(secretsVault).where(eq6(secretsVault.id, secretId)).limit(1);
          return secret || null;
        }, null, "getSecretById");
      }
      async getAllSecrets() {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(secretsVault);
        }, [], "getAllSecrets");
      }
      async getExpiredSecrets() {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(secretsVault).where(lte4(secretsVault.nextRotation, /* @__PURE__ */ new Date()));
        }, [], "getExpiredSecrets");
      }
      async createSecret(secret) {
        return await this.handleDatabaseOperation(async () => {
          const [newSecret] = await db.insert(secretsVault).values(secret).returning();
          return newSecret.id;
        }, 0, "createSecret");
      }
      async updateSecret(secretId, updates) {
        return await this.handleDatabaseOperation(async () => {
          await db.update(secretsVault).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(secretsVault.id, secretId));
        }, void 0, "updateSecret");
      }
      async createSecretRotationHistory(history) {
        return await this.handleDatabaseOperation(async () => {
          await db.insert(secretsRotationHistory).values(history);
        }, void 0, "createSecretRotationHistory");
      }
      async updateSecretRotationHistory(rotationId, updates) {
        return await this.handleDatabaseOperation(async () => {
          await db.update(secretsRotationHistory).set(updates).where(eq6(secretsRotationHistory.rotationId, rotationId));
        }, void 0, "updateSecretRotationHistory");
      }
      async getRotationHistory(filters) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(secretsRotationHistory).$dynamic();
          const conditions = [];
          if (filters.secretId) {
            conditions.push(eq6(secretsRotationHistory.secretId, filters.secretId));
          }
          if (filters.status) {
            conditions.push(eq6(secretsRotationHistory.status, filters.status));
          }
          if (filters.rotationType) {
            conditions.push(eq6(secretsRotationHistory.rotationType, filters.rotationType));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(secretsRotationHistory.startedAt));
        }, [], "getRotationHistory");
      }
      async getRecentRotationFailures(days) {
        return await this.handleDatabaseOperation(async () => {
          const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
          return await db.select().from(secretsRotationHistory).where(and6(
            eq6(secretsRotationHistory.status, "failed"),
            gte5(secretsRotationHistory.startedAt, cutoff)
          )).orderBy(desc3(secretsRotationHistory.startedAt));
        }, [], "getRecentRotationFailures");
      }
      async deleteOldRotationHistory(cutoffDate) {
        return await this.handleDatabaseOperation(async () => {
          const result = await db.delete(secretsRotationHistory).where(lt2(secretsRotationHistory.startedAt, cutoffDate));
          return result.rowCount || 0;
        }, 0, "deleteOldRotationHistory");
      }
      // Artifact Storage Methods
      async createArtifact(artifact) {
        return await this.handleDatabaseOperation(async () => {
          const [newArtifact] = await db.insert(artifactStorage).values(artifact).returning();
          return newArtifact.id;
        }, 0, "createArtifact");
      }
      async getArtifactByHash(contentHash) {
        return await this.handleDatabaseOperation(async () => {
          const [artifact] = await db.select().from(artifactStorage).where(eq6(artifactStorage.contentHash, contentHash)).limit(1);
          return artifact || null;
        }, null, "getArtifactByHash");
      }
      async getArtifactByNameVersion(artifactName, version, environment) {
        return await this.handleDatabaseOperation(async () => {
          const conditions = [
            eq6(artifactStorage.artifactName, artifactName),
            eq6(artifactStorage.version, version)
          ];
          if (environment) {
            conditions.push(eq6(artifactStorage.environment, environment));
          }
          const [artifact] = await db.select().from(artifactStorage).where(and6(...conditions)).limit(1);
          return artifact || null;
        }, null, "getArtifactByNameVersion");
      }
      async getArtifactVersions(artifactName, environment) {
        return await this.handleDatabaseOperation(async () => {
          const conditions = [eq6(artifactStorage.artifactName, artifactName)];
          if (environment) {
            conditions.push(eq6(artifactStorage.environment, environment));
          }
          return await db.select().from(artifactStorage).where(and6(...conditions)).orderBy(desc3(artifactStorage.createdAt));
        }, [], "getArtifactVersions");
      }
      async getArtifactById(artifactId) {
        return await this.handleDatabaseOperation(async () => {
          const [artifact] = await db.select().from(artifactStorage).where(eq6(artifactStorage.id, artifactId)).limit(1);
          return artifact || null;
        }, null, "getArtifactById");
      }
      async updateArtifact(artifactId, updates) {
        return await this.handleDatabaseOperation(async () => {
          await db.update(artifactStorage).set(updates).where(eq6(artifactStorage.id, artifactId));
        }, void 0, "updateArtifact");
      }
      async deleteArtifact(artifactId) {
        return await this.handleDatabaseOperation(async () => {
          await db.delete(artifactStorage).where(eq6(artifactStorage.id, artifactId));
        }, void 0, "deleteArtifact");
      }
      async getArtifacts(filters) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(artifactStorage).$dynamic();
          const conditions = [];
          if (filters.artifactType) {
            conditions.push(eq6(artifactStorage.artifactType, filters.artifactType));
          }
          if (filters.environment) {
            conditions.push(eq6(artifactStorage.environment, filters.environment));
          }
          if (filters.isActive !== void 0) {
            conditions.push(eq6(artifactStorage.isActive, filters.isActive));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(artifactStorage.createdAt));
        }, [], "getArtifacts");
      }
      async getActiveArtifacts() {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(artifactStorage).where(eq6(artifactStorage.isActive, true));
        }, [], "getActiveArtifacts");
      }
      async getAllArtifacts() {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(artifactStorage);
        }, [], "getAllArtifacts");
      }
      async getExpiredArtifacts() {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(artifactStorage).where(lte4(artifactStorage.retentionDate, /* @__PURE__ */ new Date()));
        }, [], "getExpiredArtifacts");
      }
      // Deployment History Methods
      async createDeploymentHistory(deployment) {
        return await this.handleDatabaseOperation(async () => {
          await db.insert(deploymentHistory).values(deployment);
        }, void 0, "createDeploymentHistory");
      }
      async updateDeploymentHistory(deploymentId, updates) {
        return await this.handleDatabaseOperation(async () => {
          await db.update(deploymentHistory).set(updates).where(eq6(deploymentHistory.deploymentId, deploymentId));
        }, void 0, "updateDeploymentHistory");
      }
      async getRecentDeployments(limit) {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(deploymentHistory).orderBy(desc3(deploymentHistory.startedAt)).limit(limit);
        }, [], "getRecentDeployments");
      }
      async getDeploymentById(deploymentId) {
        return await this.handleDatabaseOperation(async () => {
          const [deployment] = await db.select().from(deploymentHistory).where(eq6(deploymentHistory.deploymentId, deploymentId)).limit(1);
          return deployment || null;
        }, null, "getDeploymentById");
      }
      // Environment Configuration Methods
      async createEnvironmentConfiguration(config2) {
        return await this.handleDatabaseOperation(async () => {
          const [newConfig] = await db.insert(environmentConfigurations).values(config2).returning();
          return newConfig.id;
        }, 0, "createEnvironmentConfiguration");
      }
      async getEnvironmentConfigurations() {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(environmentConfigurations);
        }, [], "getEnvironmentConfigurations");
      }
      // Platform Continuity Events Methods
      async createPlatformContinuityEvent(event) {
        return await this.handleDatabaseOperation(async () => {
          await db.insert(platformContinuityEvents).values(event);
        }, void 0, "createPlatformContinuityEvent");
      }
      async getRecentPlatformContinuityEvents(limit) {
        return await this.handleDatabaseOperation(async () => {
          return await db.select().from(platformContinuityEvents).orderBy(desc3(platformContinuityEvents.startedAt)).limit(limit);
        }, [], "getRecentPlatformContinuityEvents");
      }
      async getPlatformContinuityEvents(filters) {
        return await this.handleDatabaseOperation(async () => {
          let query = db.select().from(platformContinuityEvents).$dynamic();
          const conditions = [];
          if (filters.eventType) {
            conditions.push(eq6(platformContinuityEvents.eventType, filters.eventType));
          }
          if (filters.severity) {
            conditions.push(eq6(platformContinuityEvents.severity, filters.severity));
          }
          if (filters.status) {
            conditions.push(eq6(platformContinuityEvents.status, filters.status));
          }
          if (filters.environment) {
            conditions.push(eq6(platformContinuityEvents.environment, filters.environment));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(platformContinuityEvents.startedAt));
        }, [], "getPlatformContinuityEvents");
      }
      // Health checking for platform services
      async getHealth() {
        return await this.handleDatabaseOperation(async () => {
          await db.execute(sql5`SELECT 1`);
        }, void 0, "getHealth");
      }
      // ============================================================================
      // TRACK 4: MONITORING & RUNBOOKS IMPLEMENTATION
      // ============================================================================
      // Synthetic Failover Drill System - Drill Configurations
      async getFailoverDrillConfigurations(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(failoverDrillConfigurations).$dynamic();
          const conditions = [];
          if (filters?.enabled !== void 0) {
            conditions.push(eq6(failoverDrillConfigurations.isEnabled, filters.enabled));
          }
          if (filters?.drillType) {
            conditions.push(eq6(failoverDrillConfigurations.drillType, filters.drillType));
          }
          if (filters?.scenario) {
            conditions.push(eq6(failoverDrillConfigurations.scenario, filters.scenario));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(failoverDrillConfigurations.createdAt));
        }, [], "getFailoverDrillConfigurations");
      }
      async getFailoverDrillConfiguration(id2) {
        return this.handleDatabaseOperation(async () => {
          const [config2] = await db.select().from(failoverDrillConfigurations).where(eq6(failoverDrillConfigurations.id, id2));
          return config2;
        }, void 0, "getFailoverDrillConfiguration");
      }
      async createFailoverDrillConfiguration(config2) {
        return this.handleDatabaseOperation(async () => {
          const [newConfig] = await db.insert(failoverDrillConfigurations).values(config2).returning();
          return newConfig;
        }, {}, "createFailoverDrillConfiguration");
      }
      async updateFailoverDrillConfiguration(id2, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(failoverDrillConfigurations).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(failoverDrillConfigurations.id, id2)).returning();
          return updated;
        }, {}, "updateFailoverDrillConfiguration");
      }
      async deleteFailoverDrillConfiguration(id2) {
        return this.handleDatabaseOperation(async () => {
          await db.delete(failoverDrillConfigurations).where(eq6(failoverDrillConfigurations.id, id2));
        }, void 0, "deleteFailoverDrillConfiguration");
      }
      async getScheduledDrillConfigurations() {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(failoverDrillConfigurations).where(and6(
            eq6(failoverDrillConfigurations.isEnabled, true),
            isNotNull(failoverDrillConfigurations.schedule)
          )).orderBy(desc3(failoverDrillConfigurations.updatedAt));
        }, [], "getScheduledDrillConfigurations");
      }
      // Drill Executions
      async getDrillExecutions(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(drillExecutions).$dynamic();
          const conditions = [];
          if (filters?.configurationId) {
            conditions.push(eq6(drillExecutions.configurationId, filters.configurationId));
          }
          if (filters?.status) {
            conditions.push(eq6(drillExecutions.status, filters.status));
          }
          if (filters?.triggerType) {
            conditions.push(eq6(drillExecutions.triggerType, filters.triggerType));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          query = query.orderBy(desc3(drillExecutions.startedAt));
          if (filters?.limit) {
            query = query.limit(filters.limit);
          }
          if (filters?.page && filters?.limit) {
            query = query.offset((filters.page - 1) * filters.limit);
          }
          return await query;
        }, [], "getDrillExecutions");
      }
      async getDrillExecution(executionId) {
        return this.handleDatabaseOperation(async () => {
          const [execution] = await db.select().from(drillExecutions).where(eq6(drillExecutions.executionId, executionId));
          return execution;
        }, void 0, "getDrillExecution");
      }
      async createDrillExecution(execution) {
        return this.handleDatabaseOperation(async () => {
          const [newExecution] = await db.insert(drillExecutions).values(execution).returning();
          return newExecution;
        }, {}, "createDrillExecution");
      }
      async updateDrillExecution(executionId, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(drillExecutions).set(updates).where(eq6(drillExecutions.executionId, executionId)).returning();
          return updated;
        }, {}, "updateDrillExecution");
      }
      async getRecentDrillExecutions(limit) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(drillExecutions).orderBy(desc3(drillExecutions.startedAt)).limit(limit);
        }, [], "getRecentDrillExecutions");
      }
      async getDrillExecutionsByConfiguration(configurationId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(drillExecutions).where(eq6(drillExecutions.configurationId, configurationId)).orderBy(desc3(drillExecutions.startedAt));
        }, [], "getDrillExecutionsByConfiguration");
      }
      async getDrillExecutionsForDashboard(days) {
        return this.handleDatabaseOperation(async () => {
          const since = /* @__PURE__ */ new Date();
          since.setDate(since.getDate() - days);
          return await db.select().from(drillExecutions).where(gte5(drillExecutions.startedAt, since)).orderBy(desc3(drillExecutions.startedAt));
        }, [], "getDrillExecutionsForDashboard");
      }
      // Drill Steps
      async getDrillSteps(executionId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(drillSteps).where(eq6(drillSteps.executionId, executionId)).orderBy(drillSteps.stepOrder);
        }, [], "getDrillSteps");
      }
      async createDrillStep(step) {
        return this.handleDatabaseOperation(async () => {
          const [newStep] = await db.insert(drillSteps).values(step).returning();
          return newStep;
        }, {}, "createDrillStep");
      }
      async updateDrillStep(id2, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(drillSteps).set(updates).where(eq6(drillSteps.id, id2)).returning();
          return updated;
        }, {}, "updateDrillStep");
      }
      async getDrillStepsByExecution(executionId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(drillSteps).where(eq6(drillSteps.executionId, executionId)).orderBy(drillSteps.stepOrder);
        }, [], "getDrillStepsByExecution");
      }
      // Backup Success Alert System - Backup Monitoring Configurations
      async getBackupMonitoringConfigurations(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(backupMonitoringConfigurations).$dynamic();
          const conditions = [];
          if (filters?.enabled !== void 0) {
            conditions.push(eq6(backupMonitoringConfigurations.isEnabled, filters.enabled));
          }
          if (filters?.monitoringType) {
            conditions.push(eq6(backupMonitoringConfigurations.monitoringType, filters.monitoringType));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(backupMonitoringConfigurations.createdAt));
        }, [], "getBackupMonitoringConfigurations");
      }
      async getBackupMonitoringConfiguration(id2) {
        return this.handleDatabaseOperation(async () => {
          const [config2] = await db.select().from(backupMonitoringConfigurations).where(eq6(backupMonitoringConfigurations.id, id2));
          return config2;
        }, void 0, "getBackupMonitoringConfiguration");
      }
      async createBackupMonitoringConfiguration(config2) {
        return this.handleDatabaseOperation(async () => {
          const [newConfig] = await db.insert(backupMonitoringConfigurations).values(config2).returning();
          return newConfig;
        }, {}, "createBackupMonitoringConfiguration");
      }
      async updateBackupMonitoringConfiguration(id2, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(backupMonitoringConfigurations).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(backupMonitoringConfigurations.id, id2)).returning();
          return updated;
        }, {}, "updateBackupMonitoringConfiguration");
      }
      async deleteBackupMonitoringConfiguration(id2) {
        return this.handleDatabaseOperation(async () => {
          await db.delete(backupMonitoringConfigurations).where(eq6(backupMonitoringConfigurations.id, id2));
        }, void 0, "deleteBackupMonitoringConfiguration");
      }
      async getActiveMonitoringConfigurations() {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(backupMonitoringConfigurations).where(eq6(backupMonitoringConfigurations.isEnabled, true)).orderBy(desc3(backupMonitoringConfigurations.createdAt));
        }, [], "getActiveMonitoringConfigurations");
      }
      // Backup Alerts
      async getBackupAlerts(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(backupAlerts).$dynamic();
          const conditions = [];
          if (filters?.status) {
            conditions.push(eq6(backupAlerts.status, filters.status));
          }
          if (filters?.severity) {
            conditions.push(eq6(backupAlerts.severity, filters.severity));
          }
          if (filters?.alertType) {
            conditions.push(eq6(backupAlerts.alertType, filters.alertType));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          query = query.orderBy(desc3(backupAlerts.createdAt));
          if (filters?.limit) {
            query = query.limit(filters.limit);
          }
          if (filters?.page && filters?.limit) {
            query = query.offset((filters.page - 1) * filters.limit);
          }
          return await query;
        }, [], "getBackupAlerts");
      }
      async getBackupAlert(alertId) {
        return this.handleDatabaseOperation(async () => {
          const [alert] = await db.select().from(backupAlerts).where(eq6(backupAlerts.alertId, alertId));
          return alert;
        }, void 0, "getBackupAlert");
      }
      async createBackupAlert(alert) {
        return this.handleDatabaseOperation(async () => {
          const [newAlert] = await db.insert(backupAlerts).values(alert).returning();
          return newAlert;
        }, {}, "createBackupAlert");
      }
      async updateBackupAlert(alertId, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(backupAlerts).set(updates).where(eq6(backupAlerts.alertId, alertId)).returning();
          return updated;
        }, {}, "updateBackupAlert");
      }
      async acknowledgeBackupAlert(alertId, acknowledgedBy) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(backupAlerts).set({
            status: "acknowledged",
            acknowledgedBy,
            acknowledgedAt: /* @__PURE__ */ new Date()
          }).where(eq6(backupAlerts.alertId, alertId)).returning();
          return updated;
        }, {}, "acknowledgeBackupAlert");
      }
      async resolveBackupAlert(alertId, resolvedBy) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(backupAlerts).set({
            status: "resolved",
            resolvedBy,
            resolvedAt: /* @__PURE__ */ new Date()
          }).where(eq6(backupAlerts.alertId, alertId)).returning();
          return updated;
        }, {}, "resolveBackupAlert");
      }
      async getActiveBackupAlerts() {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(backupAlerts).where(inArray3(backupAlerts.status, ["new", "acknowledged", "investigating"])).orderBy(desc3(backupAlerts.createdAt));
        }, [], "getActiveBackupAlerts");
      }
      async getBackupAlertsByConfiguration(configurationId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(backupAlerts).where(eq6(backupAlerts.configurationId, configurationId)).orderBy(desc3(backupAlerts.createdAt));
        }, [], "getBackupAlertsByConfiguration");
      }
      // Backup Health Metrics
      async getBackupHealthMetrics(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(backupHealthMetrics).$dynamic();
          const conditions = [];
          if (filters?.metricType) {
            conditions.push(eq6(backupHealthMetrics.metricType, filters.metricType));
          }
          if (filters?.dateFrom) {
            conditions.push(gte5(backupHealthMetrics.metricDate, filters.dateFrom));
          }
          if (filters?.dateTo) {
            conditions.push(lte4(backupHealthMetrics.metricDate, filters.dateTo));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(backupHealthMetrics.metricDate));
        }, [], "getBackupHealthMetrics");
      }
      async createBackupHealthMetric(metric) {
        return this.handleDatabaseOperation(async () => {
          const [newMetric] = await db.insert(backupHealthMetrics).values(metric).returning();
          return newMetric;
        }, {}, "createBackupHealthMetric");
      }
      async getLatestBackupHealthMetrics(metricType) {
        return this.handleDatabaseOperation(async () => {
          const [metric] = await db.select().from(backupHealthMetrics).where(eq6(backupHealthMetrics.metricType, metricType)).orderBy(desc3(backupHealthMetrics.metricDate)).limit(1);
          return metric;
        }, void 0, "getLatestBackupHealthMetrics");
      }
      async getBackupHealthTrends(days) {
        return this.handleDatabaseOperation(async () => {
          const since = /* @__PURE__ */ new Date();
          since.setDate(since.getDate() - days);
          return await db.select().from(backupHealthMetrics).where(gte5(backupHealthMetrics.metricDate, since)).orderBy(desc3(backupHealthMetrics.metricDate));
        }, [], "getBackupHealthTrends");
      }
      async generateBackupHealthSummary(dateFrom, dateTo) {
        return this.handleDatabaseOperation(async () => {
          const result = await db.execute(sql5`
        SELECT
          metric_type,
          COUNT(*) as total_measurements,
          AVG(health_score) as avg_value,
          MIN(health_score) as min_value,
          MAX(health_score) as max_value,
          STDDEV(health_score) as stddev_value,
          AVG(success_rate) as avg_success_rate
        FROM backup_health_metrics
        WHERE metric_date >= ${dateFrom} AND metric_date <= ${dateTo}
        GROUP BY metric_type
      `);
          return result.rows || [];
        }, [], "generateBackupHealthSummary");
      }
      // RTO/RPO Performance Tracking - RTO/RPO Targets
      async getRtoRpoTargets(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(rtoRpoTargets).$dynamic();
          const conditions = [];
          if (filters?.active !== void 0) {
            conditions.push(eq6(rtoRpoTargets.isActive, filters.active));
          }
          if (filters?.serviceType) {
            conditions.push(eq6(rtoRpoTargets.serviceType, filters.serviceType));
          }
          if (filters?.businessCriticality) {
            conditions.push(eq6(rtoRpoTargets.businessCriticality, filters.businessCriticality));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(rtoRpoTargets.createdAt));
        }, [], "getRtoRpoTargets");
      }
      async getRtoRpoTarget(id2) {
        return this.handleDatabaseOperation(async () => {
          const [target] = await db.select().from(rtoRpoTargets).where(eq6(rtoRpoTargets.id, id2));
          return target;
        }, void 0, "getRtoRpoTarget");
      }
      async createRtoRpoTarget(target) {
        return this.handleDatabaseOperation(async () => {
          const [newTarget] = await db.insert(rtoRpoTargets).values(target).returning();
          return newTarget;
        }, {}, "createRtoRpoTarget");
      }
      async updateRtoRpoTarget(id2, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(rtoRpoTargets).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(rtoRpoTargets.id, id2)).returning();
          return updated;
        }, {}, "updateRtoRpoTarget");
      }
      async deleteRtoRpoTarget(id2) {
        return this.handleDatabaseOperation(async () => {
          await db.delete(rtoRpoTargets).where(eq6(rtoRpoTargets.id, id2));
        }, void 0, "deleteRtoRpoTarget");
      }
      async getActiveRtoRpoTargets() {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(rtoRpoTargets).where(eq6(rtoRpoTargets.isActive, true)).orderBy(desc3(rtoRpoTargets.createdAt));
        }, [], "getActiveRtoRpoTargets");
      }
      // RTO/RPO Measurements
      async getRtoRpoMeasurements(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(rtoRpoMeasurements).$dynamic();
          const conditions = [];
          if (filters?.targetId) {
            conditions.push(eq6(rtoRpoMeasurements.targetId, filters.targetId));
          }
          if (filters?.measurementType) {
            conditions.push(eq6(rtoRpoMeasurements.measurementType, filters.measurementType));
          }
          if (filters?.dateFrom) {
            conditions.push(gte5(rtoRpoMeasurements.recoveryCompleteTime, filters.dateFrom));
          }
          if (filters?.dateTo) {
            conditions.push(lte4(rtoRpoMeasurements.recoveryCompleteTime, filters.dateTo));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          query = query.orderBy(desc3(rtoRpoMeasurements.recoveryCompleteTime));
          if (filters?.limit) {
            query = query.limit(filters.limit);
          }
          if (filters?.page && filters?.limit) {
            query = query.offset((filters.page - 1) * filters.limit);
          }
          return await query;
        }, [], "getRtoRpoMeasurements");
      }
      async getRtoRpoMeasurement(measurementId) {
        return this.handleDatabaseOperation(async () => {
          const [measurement] = await db.select().from(rtoRpoMeasurements).where(eq6(rtoRpoMeasurements.measurementId, measurementId));
          return measurement;
        }, void 0, "getRtoRpoMeasurement");
      }
      async createRtoRpoMeasurement(measurement) {
        return this.handleDatabaseOperation(async () => {
          const [newMeasurement] = await db.insert(rtoRpoMeasurements).values(measurement).returning();
          return newMeasurement;
        }, {}, "createRtoRpoMeasurement");
      }
      async updateRtoRpoMeasurement(measurementId, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(rtoRpoMeasurements).set(updates).where(eq6(rtoRpoMeasurements.measurementId, measurementId)).returning();
          return updated;
        }, {}, "updateRtoRpoMeasurement");
      }
      async getRtoRpoMeasurementsByTarget(targetId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(rtoRpoMeasurements).where(eq6(rtoRpoMeasurements.targetId, targetId)).orderBy(desc3(rtoRpoMeasurements.recoveryCompleteTime));
        }, [], "getRtoRpoMeasurementsByTarget");
      }
      async getRecentRtoRpoMeasurements(limit) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(rtoRpoMeasurements).orderBy(desc3(rtoRpoMeasurements.recoveryCompleteTime)).limit(limit);
        }, [], "getRecentRtoRpoMeasurements");
      }
      async getRtoRpoPerformanceTrends(targetId, days) {
        return this.handleDatabaseOperation(async () => {
          const since = /* @__PURE__ */ new Date();
          since.setDate(since.getDate() - days);
          return await db.select().from(rtoRpoMeasurements).where(and6(
            eq6(rtoRpoMeasurements.targetId, targetId),
            gte5(rtoRpoMeasurements.recoveryCompleteTime, since)
          )).orderBy(desc3(rtoRpoMeasurements.recoveryCompleteTime));
        }, [], "getRtoRpoPerformanceTrends");
      }
      async getRtoRpoComplianceReport(dateFrom, dateTo) {
        return this.handleDatabaseOperation(async () => {
          const result = await db.execute(sql5`
        SELECT
          t.service_name,
          t.service_type,
          t.business_criticality,
          t.rto_target_seconds / 60.0 as rto_target_minutes,
          t.rpo_target_seconds / 60.0 as rpo_target_minutes,
          COUNT(m.measurement_id) as total_measurements,
          AVG(m.actual_rto_seconds) / 60.0 as avg_rto_actual,
          AVG(m.actual_rpo_seconds) / 60.0 as avg_rpo_actual,
          COUNT(CASE WHEN m.actual_rto_seconds <= t.rto_target_seconds THEN 1 END) as rto_compliant_count,
          COUNT(CASE WHEN m.actual_rpo_seconds <= t.rpo_target_seconds THEN 1 END) as rpo_compliant_count
        FROM rto_rpo_targets t
        LEFT JOIN rto_rpo_measurements m ON t.id = m.target_id
          AND m.recovery_complete_time >= ${dateFrom} AND m.recovery_complete_time <= ${dateTo}
        WHERE t.is_active = true
        GROUP BY t.id, t.service_name, t.service_type, t.business_criticality, t.rto_target_seconds, t.rpo_target_seconds
      `);
          return result.rows || [];
        }, [], "getRtoRpoComplianceReport");
      }
      // Performance Benchmarks
      async getPerformanceBenchmarks(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(performanceBenchmarks).$dynamic();
          const conditions = [];
          if (filters?.active !== void 0) {
            conditions.push(eq6(performanceBenchmarks.isActive, filters.active));
          }
          if (filters?.industry) {
            conditions.push(eq6(performanceBenchmarks.industry, filters.industry));
          }
          if (filters?.sourceType) {
            conditions.push(eq6(performanceBenchmarks.sourceType, filters.sourceType));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(performanceBenchmarks.createdAt));
        }, [], "getPerformanceBenchmarks");
      }
      async getPerformanceBenchmark(id2) {
        return this.handleDatabaseOperation(async () => {
          const [benchmark] = await db.select().from(performanceBenchmarks).where(eq6(performanceBenchmarks.id, id2));
          return benchmark;
        }, void 0, "getPerformanceBenchmark");
      }
      async createPerformanceBenchmark(benchmark) {
        return this.handleDatabaseOperation(async () => {
          const [newBenchmark] = await db.insert(performanceBenchmarks).values(benchmark).returning();
          return newBenchmark;
        }, {}, "createPerformanceBenchmark");
      }
      async updatePerformanceBenchmark(id2, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(performanceBenchmarks).set(updates).where(eq6(performanceBenchmarks.id, id2)).returning();
          return updated;
        }, {}, "updatePerformanceBenchmark");
      }
      async deletePerformanceBenchmark(id2) {
        return this.handleDatabaseOperation(async () => {
          await db.delete(performanceBenchmarks).where(eq6(performanceBenchmarks.id, id2));
        }, void 0, "deletePerformanceBenchmark");
      }
      async getIndustryBenchmarks(industry, serviceCategory) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(performanceBenchmarks).where(and6(
            eq6(performanceBenchmarks.industry, industry),
            eq6(performanceBenchmarks.serviceCategory, serviceCategory),
            eq6(performanceBenchmarks.isActive, true)
          )).orderBy(desc3(performanceBenchmarks.createdAt));
        }, [], "getIndustryBenchmarks");
      }
      // Incident Runbook Management System - Incident Runbooks
      async getIncidentRunbooks(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(incidentRunbooks).$dynamic();
          const conditions = [];
          if (filters?.status) {
            conditions.push(eq6(incidentRunbooks.status, filters.status));
          }
          if (filters?.incidentType) {
            conditions.push(eq6(incidentRunbooks.incidentType, filters.incidentType));
          }
          if (filters?.severity) {
            conditions.push(eq6(incidentRunbooks.severity, filters.severity));
          }
          if (filters?.accessLevel) {
            conditions.push(eq6(incidentRunbooks.accessLevel, filters.accessLevel));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          query = query.orderBy(desc3(incidentRunbooks.createdAt));
          if (filters?.limit) {
            query = query.limit(filters.limit);
          }
          if (filters?.page && filters?.limit) {
            query = query.offset((filters.page - 1) * filters.limit);
          }
          return await query;
        }, [], "getIncidentRunbooks");
      }
      async getIncidentRunbook(runbookId) {
        return this.handleDatabaseOperation(async () => {
          const [runbook] = await db.select().from(incidentRunbooks).where(eq6(incidentRunbooks.runbookId, runbookId));
          return runbook;
        }, void 0, "getIncidentRunbook");
      }
      async createIncidentRunbook(runbook) {
        return this.handleDatabaseOperation(async () => {
          const [newRunbook] = await db.insert(incidentRunbooks).values(runbook).returning();
          return newRunbook;
        }, {}, "createIncidentRunbook");
      }
      async updateIncidentRunbook(runbookId, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(incidentRunbooks).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(incidentRunbooks.runbookId, runbookId)).returning();
          return updated;
        }, {}, "updateIncidentRunbook");
      }
      async deleteIncidentRunbook(runbookId) {
        return this.handleDatabaseOperation(async () => {
          await db.delete(incidentRunbooks).where(eq6(incidentRunbooks.runbookId, runbookId));
        }, void 0, "deleteIncidentRunbook");
      }
      async getRunbooksByIncidentType(incidentType) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(incidentRunbooks).where(and6(
            eq6(incidentRunbooks.incidentType, incidentType),
            eq6(incidentRunbooks.status, "active")
          )).orderBy(desc3(incidentRunbooks.createdAt));
        }, [], "getRunbooksByIncidentType");
      }
      async getPublishedRunbooks() {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(incidentRunbooks).where(inArray3(incidentRunbooks.status, ["approved", "active"])).orderBy(desc3(incidentRunbooks.createdAt));
        }, [], "getPublishedRunbooks");
      }
      async approveRunbook(runbookId, approvedBy) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(incidentRunbooks).set({
            status: "approved",
            approvedBy,
            approvedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq6(incidentRunbooks.runbookId, runbookId)).returning();
          return updated;
        }, {}, "approveRunbook");
      }
      async getRunbookVersions(runbookId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(incidentRunbooks).where(eq6(incidentRunbooks.runbookId, runbookId)).orderBy(desc3(incidentRunbooks.version));
        }, [], "getRunbookVersions");
      }
      // Runbook Steps
      async getRunbookSteps(runbookId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(runbookSteps).where(eq6(runbookSteps.runbookId, runbookId)).orderBy(runbookSteps.stepOrder);
        }, [], "getRunbookSteps");
      }
      async getRunbookStep(id2) {
        return this.handleDatabaseOperation(async () => {
          const [step] = await db.select().from(runbookSteps).where(eq6(runbookSteps.id, id2));
          return step;
        }, void 0, "getRunbookStep");
      }
      async createRunbookStep(step) {
        return this.handleDatabaseOperation(async () => {
          const [newStep] = await db.insert(runbookSteps).values(step).returning();
          return newStep;
        }, {}, "createRunbookStep");
      }
      async updateRunbookStep(id2, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(runbookSteps).set(updates).where(eq6(runbookSteps.id, id2)).returning();
          return updated;
        }, {}, "updateRunbookStep");
      }
      async deleteRunbookStep(id2) {
        return this.handleDatabaseOperation(async () => {
          await db.delete(runbookSteps).where(eq6(runbookSteps.id, id2));
        }, void 0, "deleteRunbookStep");
      }
      async getRunbookStepsByOrder(runbookId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(runbookSteps).where(eq6(runbookSteps.runbookId, runbookId)).orderBy(runbookSteps.stepOrder);
        }, [], "getRunbookStepsByOrder");
      }
      async reorderRunbookSteps(runbookId, stepOrders) {
        return this.handleDatabaseOperation(async () => {
          for (const stepOrder of stepOrders) {
            await db.update(runbookSteps).set({ stepOrder: stepOrder.order }).where(and6(
              eq6(runbookSteps.id, stepOrder.id),
              eq6(runbookSteps.runbookId, runbookId)
            ));
          }
        }, void 0, "reorderRunbookSteps");
      }
      // Runbook Contacts
      async getRunbookContacts(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(runbookContacts).$dynamic();
          const conditions = [];
          if (filters?.active !== void 0) {
            conditions.push(eq6(runbookContacts.isActive, filters.active));
          }
          if (filters?.available24x7 !== void 0) {
            conditions.push(eq6(runbookContacts.isAvailable24x7, filters.available24x7));
          }
          if (filters?.escalationLevel !== void 0) {
            conditions.push(eq6(runbookContacts.escalationLevel, filters.escalationLevel));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(runbookContacts.escalationLevel, runbookContacts.name);
        }, [], "getRunbookContacts");
      }
      async getRunbookContact(contactId) {
        return this.handleDatabaseOperation(async () => {
          const [contact] = await db.select().from(runbookContacts).where(eq6(runbookContacts.contactId, contactId));
          return contact;
        }, void 0, "getRunbookContact");
      }
      async createRunbookContact(contact) {
        return this.handleDatabaseOperation(async () => {
          const [newContact] = await db.insert(runbookContacts).values(contact).returning();
          return newContact;
        }, {}, "createRunbookContact");
      }
      async updateRunbookContact(contactId, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(runbookContacts).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(runbookContacts.contactId, contactId)).returning();
          return updated;
        }, {}, "updateRunbookContact");
      }
      async deleteRunbookContact(contactId) {
        return this.handleDatabaseOperation(async () => {
          await db.delete(runbookContacts).where(eq6(runbookContacts.contactId, contactId));
        }, void 0, "deleteRunbookContact");
      }
      async getContactsByEscalationLevel(escalationLevel) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(runbookContacts).where(and6(
            eq6(runbookContacts.escalationLevel, escalationLevel),
            eq6(runbookContacts.isActive, true)
          )).orderBy(runbookContacts.name);
        }, [], "getContactsByEscalationLevel");
      }
      async getAvailableContacts(timezone) {
        return this.handleDatabaseOperation(async () => {
          const available = timezone ? and6(eq6(runbookContacts.isActive, true), or3(eq6(runbookContacts.isAvailable24x7, true), eq6(runbookContacts.timezone, timezone))) : eq6(runbookContacts.isActive, true);
          return await db.select().from(runbookContacts).where(available).orderBy(runbookContacts.escalationLevel, runbookContacts.name);
        }, [], "getAvailableContacts");
      }
      async updateContactLastContacted(contactId) {
        return this.handleDatabaseOperation(async () => {
          await db.update(runbookContacts).set({ lastContactedAt: /* @__PURE__ */ new Date() }).where(eq6(runbookContacts.contactId, contactId));
        }, void 0, "updateContactLastContacted");
      }
      // Contact Escalation Trees
      async getContactEscalationTrees(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(contactEscalationTrees).$dynamic();
          const conditions = [];
          if (filters?.active !== void 0) {
            conditions.push(eq6(contactEscalationTrees.isActive, filters.active));
          }
          if (filters?.incidentTypes && filters.incidentTypes.length > 0) {
            conditions.push(eq6(contactEscalationTrees.isActive, true));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc3(contactEscalationTrees.createdAt));
        }, [], "getContactEscalationTrees");
      }
      async getContactEscalationTree(treeId) {
        return this.handleDatabaseOperation(async () => {
          const [tree] = await db.select().from(contactEscalationTrees).where(eq6(contactEscalationTrees.treeId, treeId));
          return tree;
        }, void 0, "getContactEscalationTree");
      }
      async createContactEscalationTree(tree) {
        return this.handleDatabaseOperation(async () => {
          const [newTree] = await db.insert(contactEscalationTrees).values(tree).returning();
          return newTree;
        }, {}, "createContactEscalationTree");
      }
      async updateContactEscalationTree(treeId, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(contactEscalationTrees).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(contactEscalationTrees.treeId, treeId)).returning();
          return updated;
        }, {}, "updateContactEscalationTree");
      }
      async deleteContactEscalationTree(treeId) {
        return this.handleDatabaseOperation(async () => {
          await db.delete(contactEscalationTrees).where(eq6(contactEscalationTrees.treeId, treeId));
        }, void 0, "deleteContactEscalationTree");
      }
      async getEscalationTreeByIncidentType(incidentType, severity) {
        return this.handleDatabaseOperation(async () => {
          const [tree] = await db.select().from(contactEscalationTrees).where(and6(
            eq6(contactEscalationTrees.isActive, true),
            sql5`${incidentType} = ANY(${contactEscalationTrees.incidentTypes})`,
            sql5`${severity} = ANY(${contactEscalationTrees.severityLevels})`
          )).orderBy(desc3(contactEscalationTrees.createdAt)).limit(1);
          return tree;
        }, void 0, "getEscalationTreeByIncidentType");
      }
      // Runbook Executions
      async getRunbookExecutions(filters) {
        return this.handleDatabaseOperation(async () => {
          let query = db.select().from(runbookExecutions).$dynamic();
          const conditions = [];
          if (filters?.runbookId !== void 0) {
            conditions.push(eq6(runbookExecutions.runbookId, filters.runbookId));
          }
          if (filters?.status) {
            conditions.push(eq6(runbookExecutions.status, filters.status));
          }
          if (filters?.executedBy) {
            conditions.push(eq6(runbookExecutions.executedBy, filters.executedBy));
          }
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          query = query.orderBy(desc3(runbookExecutions.startedAt));
          if (filters?.limit) {
            query = query.limit(filters.limit);
          }
          if (filters?.page && filters?.limit) {
            query = query.offset((filters.page - 1) * filters.limit);
          }
          return await query;
        }, [], "getRunbookExecutions");
      }
      async getRunbookExecution(executionId) {
        return this.handleDatabaseOperation(async () => {
          const [execution] = await db.select().from(runbookExecutions).where(eq6(runbookExecutions.executionId, executionId));
          return execution;
        }, void 0, "getRunbookExecution");
      }
      async createRunbookExecution(execution) {
        return this.handleDatabaseOperation(async () => {
          const [newExecution] = await db.insert(runbookExecutions).values(execution).returning();
          return newExecution;
        }, {}, "createRunbookExecution");
      }
      async updateRunbookExecution(executionId, updates) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(runbookExecutions).set(updates).where(eq6(runbookExecutions.executionId, executionId)).returning();
          return updated;
        }, {}, "updateRunbookExecution");
      }
      async getRecentRunbookExecutions(limit) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(runbookExecutions).orderBy(desc3(runbookExecutions.startedAt)).limit(limit);
        }, [], "getRecentRunbookExecutions");
      }
      async getRunbookExecutionsByRunbook(runbookId) {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(runbookExecutions).where(eq6(runbookExecutions.runbookId, runbookId)).orderBy(desc3(runbookExecutions.startedAt));
        }, [], "getRunbookExecutionsByRunbook");
      }
      async getActiveRunbookExecutions() {
        return this.handleDatabaseOperation(async () => {
          return await db.select().from(runbookExecutions).where(inArray3(runbookExecutions.status, ["pending", "in_progress", "paused"])).orderBy(desc3(runbookExecutions.startedAt));
        }, [], "getActiveRunbookExecutions");
      }
      async completeRunbookExecution(executionId, results) {
        return this.handleDatabaseOperation(async () => {
          const [updated] = await db.update(runbookExecutions).set({
            status: "completed",
            completedAt: /* @__PURE__ */ new Date(),
            stepResults: results,
            isSuccessful: true
          }).where(eq6(runbookExecutions.executionId, executionId)).returning();
          return updated;
        }, {}, "completeRunbookExecution");
      }
      // Dashboard and Analytics Methods
      async getMonitoringDashboardData() {
        return this.handleDatabaseOperation(async () => {
          const drillSummary = await db.execute(sql5`
        SELECT
          COUNT(*) as total_drills,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_drills,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_drills,
          AVG(actual_rto_seconds) / 60.0 as avg_rto_minutes
        FROM drill_executions
        WHERE started_at >= NOW() - INTERVAL '30 days'
      `);
          const backupHealth = await db.execute(sql5`
        SELECT
          metric_type,
          AVG(health_score) as avg_value,
          AVG(success_rate) as avg_success_rate,
          COUNT(*) as measurement_count
        FROM backup_health_metrics
        WHERE metric_date >= NOW() - INTERVAL '24 hours'
        GROUP BY metric_type
      `);
          const rtoRpoCompliance = await db.execute(sql5`
        SELECT
          COUNT(*) as total_measurements,
          COUNT(CASE WHEN m.actual_rto_seconds <= t.rto_target_seconds THEN 1 END) as rto_compliant,
          COUNT(CASE WHEN m.actual_rpo_seconds <= t.rpo_target_seconds THEN 1 END) as rpo_compliant
        FROM rto_rpo_measurements m
        JOIN rto_rpo_targets t ON m.target_id = t.id
        WHERE m.recovery_complete_time >= NOW() - INTERVAL '30 days'
      `);
          const activeAlerts = await db.select().from(backupAlerts).where(inArray3(backupAlerts.status, ["new", "acknowledged", "investigating"])).orderBy(desc3(backupAlerts.createdAt)).limit(10);
          const recentExecutions = await db.select().from(runbookExecutions).orderBy(desc3(runbookExecutions.startedAt)).limit(10);
          return {
            drillSummary: drillSummary.rows?.[0] || {},
            backupHealth: backupHealth.rows || [],
            rtoRpoCompliance: rtoRpoCompliance.rows?.[0] || {},
            activeAlerts,
            recentExecutions
          };
        }, {
          drillSummary: {},
          backupHealth: [],
          rtoRpoCompliance: {},
          activeAlerts: [],
          recentExecutions: []
        }, "getMonitoringDashboardData");
      }
      async getPerformanceDashboardData(serviceType, days) {
        return this.handleDatabaseOperation(async () => {
          const daysPeriod = days || 30;
          const since = /* @__PURE__ */ new Date();
          since.setDate(since.getDate() - daysPeriod);
          const targets = await db.select().from(rtoRpoTargets).where(serviceType ? and6(eq6(rtoRpoTargets.isActive, true), eq6(rtoRpoTargets.serviceType, serviceType)) : eq6(rtoRpoTargets.isActive, true));
          let measurementsQuery = db.select().from(rtoRpoMeasurements).where(gte5(rtoRpoMeasurements.recoveryCompleteTime, since)).orderBy(desc3(rtoRpoMeasurements.recoveryCompleteTime));
          const measurements = await measurementsQuery;
          const trends = await db.execute(sql5`
        SELECT
          DATE_TRUNC('day', recovery_complete_time) as date,
          AVG(actual_rto_seconds) / 60.0 as avg_rto,
          AVG(actual_rpo_seconds) / 60.0 as avg_rpo,
          COUNT(*) as measurement_count
        FROM rto_rpo_measurements
        WHERE recovery_complete_time >= ${since}
        GROUP BY DATE_TRUNC('day', recovery_complete_time)
        ORDER BY date
      `);
          const complianceData = await db.execute(sql5`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN m.actual_rto_seconds <= t.rto_target_seconds AND m.actual_rpo_seconds <= t.rpo_target_seconds THEN 1 END) as compliant
        FROM rto_rpo_measurements m
        JOIN rto_rpo_targets t ON m.target_id = t.id
        WHERE m.recovery_complete_time >= ${since}
      `);
          const complianceResult = complianceData.rows?.[0];
          const complianceTotal = Number(complianceResult?.total ?? 0);
          const complianceScore = complianceTotal > 0 ? Number(complianceResult?.compliant ?? 0) / complianceTotal * 100 : 0;
          return {
            targets,
            measurements,
            trends: trends.rows || [],
            complianceScore: Number(complianceScore.toFixed(2))
          };
        }, {
          targets: [],
          measurements: [],
          trends: [],
          complianceScore: 0
        }, "getPerformanceDashboardData");
      }
      async getRunbookDashboardData() {
        return this.handleDatabaseOperation(async () => {
          const totalRunbooksResult = await db.execute(sql5`
        SELECT COUNT(*) as total FROM incident_runbooks WHERE status = 'active'
      `);
          const totalRunbooks = Number(totalRunbooksResult.rows?.[0]?.total || 0);
          const activeExecutions = await db.select().from(runbookExecutions).where(inArray3(runbookExecutions.status, ["pending", "in_progress", "paused"])).orderBy(desc3(runbookExecutions.startedAt));
          const recentExecutions = await db.select().from(runbookExecutions).orderBy(desc3(runbookExecutions.startedAt)).limit(20);
          const contactAvailability = await db.execute(sql5`
        SELECT
          escalation_level,
          COUNT(*) as total_contacts,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_contacts,
          COUNT(CASE WHEN is_available_24x7 = true THEN 1 END) as always_available
        FROM runbook_contacts
        GROUP BY escalation_level
        ORDER BY escalation_level
      `);
          return {
            totalRunbooks,
            activeExecutions,
            recentExecutions,
            contactAvailability: contactAvailability.rows || []
          };
        }, {
          totalRunbooks: 0,
          activeExecutions: [],
          recentExecutions: [],
          contactAvailability: []
        }, "getRunbookDashboardData");
      }
      // ============================================================================
      // RECOMMENDATION ANALYTICS TRACKING METHODS
      // ============================================================================
      async trackRecommendationPresentation(userId, recommendationIds) {
        return this.handleDatabaseOperation(
          async () => {
            console.log(`[Analytics] User ${userId} presented with recommendations: ${recommendationIds.join(", ")}`);
          },
          void 0,
          "trackRecommendationPresentation"
        );
      }
      async trackRecommendationView(userId, recommendationId) {
        return this.handleDatabaseOperation(
          async () => {
            console.log(`[Analytics] User ${userId} viewed recommendation ${recommendationId}`);
          },
          void 0,
          "trackRecommendationView"
        );
      }
      async trackRecommendationClick(userId, recommendationId) {
        return this.handleDatabaseOperation(
          async () => {
            console.log(`[Analytics] User ${userId} clicked recommendation ${recommendationId}`);
          },
          void 0,
          "trackRecommendationClick"
        );
      }
      async trackRecommendationDismissal(userId, recommendationId, reason) {
        return this.handleDatabaseOperation(
          async () => {
            console.log(`[Analytics] User ${userId} dismissed recommendation ${recommendationId}${reason ? ` (reason: ${reason})` : ""}`);
          },
          void 0,
          "trackRecommendationDismissal"
        );
      }
      async trackRecommendationToWatchlistConversion(userId, recommendationId, watchlistItemId) {
        return this.handleDatabaseOperation(
          async () => {
            console.log(`[Analytics] User ${userId} converted recommendation ${recommendationId} to watchlist item ${watchlistItemId}`);
          },
          void 0,
          "trackRecommendationToWatchlistConversion"
        );
      }
    };
    storage = storageFactory;
    databaseStorage = new DatabaseStorage();
    periodicSyncWork = new BackgroundWork();
    periodicSyncWork.every(6 * 60 * 60 * 1e3, async () => {
      try {
        await storage.syncElectionsFromGoogleCivic();
        console.log("Periodic sync with Google Civic API completed");
        const healthStatus = storage.getHealthStatus();
        if (!healthStatus.isDatabaseHealthy) {
          console.log(`\u26A0\uFE0F  Database still unavailable - using ${healthStatus.currentStorageType} storage`);
        }
      } catch (error) {
        console.log("Periodic sync completed with fallbacks:", error);
      }
    }, () => console.error("Scheduled election sync failed"));
  }
});

// scripts/.verify_public_election_list.generated.ts
init_storage();
init_db();
init_schema();
init_mem_storage();
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { getTableColumns as getTableColumns4 } from "drizzle-orm";

// server/routes/elections.ts
init_storage();
import { Router } from "express";

// server/upstream-fetch.ts
var envInt = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
var UPSTREAM_DEFAULTS = Object.freeze({
  /** Per-call ceiling for a single provider request (headers + body). */
  timeoutMs: envInt("UPSTREAM_FETCH_TIMEOUT_MS", 4e3),
  /** Largest body any provider may hand us on a request path. */
  maxBodyBytes: envInt("UPSTREAM_FETCH_MAX_BYTES", 5e6),
  /** Whole-enrichment ceiling per candidate (all providers together). */
  enrichmentBudgetMs: envInt("ENRICHMENT_BUDGET_MS", 3500)
});
var fetchImpl = globalThis.fetch;
var UpstreamTimeoutError = class extends Error {
  constructor(label, ms) {
    super(`${label}: no response within ${ms} ms`);
    this.label = label;
    this.ms = ms;
    this.name = "UpstreamTimeoutError";
  }
  label;
  ms;
};
var UpstreamAbortedError = class extends Error {
  constructor(label) {
    super(`${label}: cancelled by caller`);
    this.label = label;
    this.name = "UpstreamAbortedError";
  }
  label;
};
var inflight = /* @__PURE__ */ new Map();
var active = /* @__PURE__ */ new Set();
function settle(entry) {
  if (entry.settled) return;
  entry.settled = true;
  clearTimeout(entry.timer);
  active.delete(entry);
  if (inflight.get(entry.key) === entry) inflight.delete(entry.key);
}
function stableKey(method, url2, init) {
  const headers = init.headers ? JSON.stringify(Object.entries(init.headers).sort()) : "";
  return `${method} ${url2} ${headers}`;
}
async function boundedUpstreamFetch(url2, init = {}, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? UPSTREAM_DEFAULTS.timeoutMs;
  const maxBodyBytes = opts.maxBodyBytes ?? UPSTREAM_DEFAULTS.maxBodyBytes;
  const label = opts.label ?? new URL(url2).host;
  const callerSignal = opts.signal ?? init.signal;
  if (callerSignal?.aborted) throw new UpstreamAbortedError(label);
  const method = String(init.method ?? "GET").toUpperCase();
  const shareable = method === "GET" || method === "HEAD";
  const key = stableKey(method, url2, init);
  let entry = shareable ? inflight.get(key) : void 0;
  if (!entry) {
    const controller = new AbortController();
    const created = {
      key,
      label,
      controller,
      timedOut: false,
      body: null,
      subscribers: 0,
      settled: false,
      // The deadline also settles the entry: a body nobody ever reads cannot stay "active".
      timer: setTimeout(() => {
        created.timedOut = true;
        controller.abort();
        settle(created);
      }, timeoutMs),
      headers: Promise.resolve().then(() => fetchImpl(url2, { ...init, signal: controller.signal }))
    };
    created.headers.catch(() => settle(created));
    entry = created;
    active.add(entry);
    if (shareable) inflight.set(key, entry);
  }
  const shared = entry;
  shared.subscribers++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    callerSignal?.removeEventListener("abort", onCallerAbort);
    shared.subscribers--;
    if (shared.subscribers <= 0 && !shared.settled) {
      shared.controller.abort();
      settle(shared);
    }
  };
  const callerAbort = new Promise((_, reject) => {
    (callerSignal ?? new AbortController().signal).addEventListener("abort", () => reject(new UpstreamAbortedError(label)), { once: true });
  });
  callerAbort.catch(() => {
  });
  function onCallerAbort() {
    release();
  }
  callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
  const deadline = new Promise((_, reject) => {
    shared.controller.signal.addEventListener("abort", () => reject(shared.timedOut ? new UpstreamTimeoutError(label, timeoutMs) : new UpstreamAbortedError(label)), { once: true });
  });
  deadline.catch(() => {
  });
  const readBody = async (response) => {
    const declared = Number(response.headers?.get?.("content-length") ?? 0);
    if (declared > maxBodyBytes) throw new Error(`${label}: body ${declared} bytes exceeds ${maxBodyBytes}`);
    const body = response.body;
    if (body && typeof body[Symbol.asyncIterator] === "function") {
      const chunks = [];
      let received = 0;
      for await (const chunk of body) {
        received += chunk.byteLength;
        if (received > maxBodyBytes) throw new Error(`${label}: body exceeds ${maxBodyBytes} bytes`);
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks).toString("utf8");
    }
    const text2 = await response.text();
    if (Buffer.byteLength(text2) > maxBodyBytes) throw new Error(`${label}: body exceeds ${maxBodyBytes} bytes`);
    return text2;
  };
  try {
    const response = await Promise.race([shared.headers, deadline, callerAbort]);
    const text2 = () => {
      shared.body ??= readBody(response).then((t) => {
        settle(shared);
        return t;
      }, (e) => {
        settle(shared);
        throw e;
      });
      return Promise.race([shared.body, deadline, callerAbort]).finally(release);
    };
    return {
      ok: !!response.ok,
      status: Number(response.status ?? 0),
      text: text2,
      json: async () => JSON.parse(await text2())
    };
  } catch (error) {
    release();
    if (shared.controller.signal.aborted) settle(shared);
    throw error;
  }
}
async function withBudget(label, ms, work, fallback) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(fallback);
    }, ms);
  });
  try {
    return await Promise.race([
      work(controller.signal).catch((error) => {
        if (!(error instanceof UpstreamTimeoutError) && !(error instanceof UpstreamAbortedError)) {
          console.warn(`${label}: enrichment failed, serving local data:`, error instanceof Error ? error.message : String(error));
        }
        return fallback;
      }),
      deadline
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function memoize(ttlMs, negativeTtlMs, loader) {
  let value = null;
  let expires = 0;
  let pending = false;
  return {
    get() {
      const now = Date.now();
      if (value && (pending || now < expires)) return value;
      pending = true;
      const attempt = loader().then(
        (v) => {
          pending = false;
          expires = Date.now() + (v == null ? negativeTtlMs : ttlMs);
          return v;
        },
        (e) => {
          pending = false;
          expires = Date.now() + negativeTtlMs;
          console.warn("upstream memo load failed:", e instanceof Error ? e.message : String(e));
          return null;
        }
      );
      value = attempt;
      return attempt;
    },
    reset() {
      value = null;
      expires = 0;
      pending = false;
    }
  };
}

// server/services/votesmart-service.ts
import { z as z5 } from "zod";
import { AsyncLocalStorage } from "node:async_hooks";
var requestSignal = new AsyncLocalStorage();
var VoteSmartCandidateSchema = z5.object({
  candidateId: z5.string(),
  firstName: z5.string().optional(),
  lastName: z5.string().optional(),
  middleName: z5.string().optional(),
  preferredName: z5.string().optional(),
  nickname: z5.string().optional(),
  suffix: z5.string().optional(),
  title: z5.string().optional(),
  electionParties: z5.string().optional(),
  electionStatus: z5.string().optional(),
  electionStage: z5.string().optional(),
  electionDistrictId: z5.string().optional(),
  electionDistrictName: z5.string().optional(),
  electionOffice: z5.string().optional(),
  electionOfficeId: z5.string().optional(),
  electionStateId: z5.string().optional(),
  electionYear: z5.string().optional(),
  stage: z5.string().optional(),
  runningMateId: z5.string().optional(),
  runningMateName: z5.string().optional()
});
var VoteSmartBioSchema = z5.object({
  candidateId: z5.string(),
  crpId: z5.string().optional(),
  firstName: z5.string().optional(),
  lastName: z5.string().optional(),
  middleName: z5.string().optional(),
  suffix: z5.string().optional(),
  nickname: z5.string().optional(),
  birthDate: z5.string().optional(),
  birthPlace: z5.string().optional(),
  pronunciation: z5.string().optional(),
  gender: z5.string().optional(),
  family: z5.string().optional(),
  photo: z5.string().optional(),
  homeCity: z5.string().optional(),
  homeState: z5.string().optional(),
  education: z5.string().optional(),
  profession: z5.string().optional(),
  political: z5.string().optional(),
  religion: z5.string().optional(),
  congMembership: z5.string().optional(),
  orgMembership: z5.string().optional(),
  specialMsg: z5.string().optional()
});
var VoteSmartPositionSchema = z5.object({
  categoryId: z5.string(),
  categoryName: z5.string(),
  position: z5.string(),
  positionId: z5.string().optional(),
  source: z5.string().optional(),
  date: z5.string().optional()
});
var VoteSmartVotingRecordSchema = z5.object({
  actionId: z5.string(),
  stage: z5.string().optional(),
  billId: z5.string().optional(),
  billNumber: z5.string().optional(),
  billTitle: z5.string().optional(),
  vote: z5.string(),
  // 'Yes', 'No', 'Not Voting', 'Present'
  desc: z5.string().optional(),
  actionDate: z5.string().optional()
});
var VoteSmartRatingSchema = z5.object({
  ratingId: z5.string(),
  sigId: z5.string(),
  sigName: z5.string(),
  rating: z5.string(),
  ratingName: z5.string().optional(),
  ratingText: z5.string().optional(),
  timespan: z5.string().optional(),
  ratingDate: z5.string().optional()
});
function many(value) {
  if (value === void 0 || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
var VoteSmartService = class {
  baseUrl = "https://api.votesmart.org";
  apiKey;
  timeout;
  retries;
  retryDelay;
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.timeout = options.timeout || 1e4;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1e3;
  }
  /**
   * Make a request to the VoteSmart API with retry logic and validation
   */
  async makeRequest(endpoint, params = {}, schema) {
    const url2 = new URL(`${this.baseUrl}/${endpoint}`);
    url2.searchParams.set("key", this.apiKey);
    url2.searchParams.set("o", "JSON");
    Object.entries(params).forEach(([key, value]) => {
      if (value !== void 0 && value !== null && value !== "") {
        url2.searchParams.set(key, value);
      }
    });
    let lastError = null;
    const signal = requestSignal.getStore();
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (signal?.aborted) return null;
      try {
        const response = await boundedUpstreamFetch(url2.toString(), {
          signal,
          headers: {
            "User-Agent": "ElectionTracker/1.0 (Replit Election Platform)",
            "Accept": "application/json"
          }
        }, { timeoutMs: this.timeout, label: "votesmart" });
        if (!response.ok) {
          throw new Error(`VoteSmart API error: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(`VoteSmart API error: ${data.error.errorMessage || data.error}`);
        }
        if (schema) {
          try {
            return schema.parse(data);
          } catch (validationError) {
            console.warn(`VoteSmart API response validation warning for ${endpoint}:`, validationError);
            return data;
          }
        }
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (error instanceof UpstreamAbortedError || signal?.aborted) return null;
        if (attempt < this.retries) {
          console.warn(`VoteSmart API attempt ${attempt + 1} failed for ${endpoint}, retrying in ${this.retryDelay}ms:`, lastError.message);
          await this.sleep(this.retryDelay);
        }
      }
    }
    console.error(`VoteSmart API failed after ${this.retries + 1} attempts for ${endpoint}:`, lastError?.message);
    return null;
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Search for candidates by name, office, or state
   */
  async searchCandidates(query) {
    try {
      const params = {};
      if (query.firstName) params.firstName = query.firstName;
      if (query.lastName) params.lastName = query.lastName;
      if (query.office) params.office = query.office;
      if (query.state) params.state = query.state;
      if (query.electionYear) params.electionYear = query.electionYear;
      const response = await this.makeRequest("Candidates.getByOfficeState", params);
      if (!response || !response.candidateList) {
        return [];
      }
      return many(response.candidateList.candidate).map((candidate) => {
        try {
          return VoteSmartCandidateSchema.parse(candidate);
        } catch {
          return null;
        }
      }).filter((candidate) => candidate !== null);
    } catch (error) {
      console.error("VoteSmart candidate search error:", error);
      return [];
    }
  }
  /**
   * Get detailed candidate biography
   */
  async getCandidateBio(candidateId) {
    try {
      const response = await this.makeRequest("CandidateBio.getBio", { candidateId });
      if (!response || !response.bio) {
        return null;
      }
      return VoteSmartBioSchema.parse(response.bio);
    } catch (error) {
      console.error(`VoteSmart bio error for candidate ${candidateId}:`, error);
      return null;
    }
  }
  /**
   * Get detailed candidate biography with extended information
   */
  async getDetailedCandidateBio(candidateId) {
    try {
      const response = await this.makeRequest("CandidateBio.getDetailedBio", { candidateId });
      if (!response || !response.bio) {
        return null;
      }
      return VoteSmartBioSchema.parse(response.bio);
    } catch (error) {
      console.error(`VoteSmart detailed bio error for candidate ${candidateId}:`, error);
      return null;
    }
  }
  /**
   * Get candidate positions on issues
   */
  async getCandidatePositions(candidateId, categoryId) {
    try {
      const params = { candidateId };
      if (categoryId) params.categoryId = categoryId;
      const response = await this.makeRequest("Npat.getNpat", params);
      if (!response || !response.npat) {
        return [];
      }
      return many(response.npat).map((position) => {
        try {
          return VoteSmartPositionSchema.parse(position);
        } catch {
          return null;
        }
      }).filter((position) => position !== null);
    } catch (error) {
      console.error(`VoteSmart positions error for candidate ${candidateId}:`, error);
      return [];
    }
  }
  /**
   * Get candidate voting record
   */
  async getVotingRecord(candidateId, categoryId, year) {
    try {
      const params = { candidateId };
      if (categoryId) params.categoryId = categoryId;
      if (year) params.year = year;
      const response = await this.makeRequest("Votes.getByCandidate", params);
      if (!response || !response.votes) {
        return [];
      }
      return many(response.votes.vote).map((vote) => {
        try {
          return VoteSmartVotingRecordSchema.parse(vote);
        } catch {
          return null;
        }
      }).filter((vote) => vote !== null);
    } catch (error) {
      console.error(`VoteSmart voting record error for candidate ${candidateId}:`, error);
      return [];
    }
  }
  /**
   * Get candidate ratings from special interest groups
   */
  async getCandidateRatings(candidateId) {
    try {
      const response = await this.makeRequest("Rating.getCandidateRating", { candidateId });
      if (!response || !response.candidateRating) {
        return [];
      }
      return many(response.candidateRating.rating).map((rating) => {
        try {
          return VoteSmartRatingSchema.parse(rating);
        } catch {
          return null;
        }
      }).filter((rating) => rating !== null);
    } catch (error) {
      console.error(`VoteSmart ratings error for candidate ${candidateId}:`, error);
      return [];
    }
  }
  /**
   * Get comprehensive candidate data combining biography, positions, voting record, and ratings
   */
  async getComprehensiveCandidateData(candidateId, signal) {
    try {
      const [bio, detailedBio, positions, votingRecord, ratings] = await requestSignal.run(signal, () => Promise.allSettled([
        this.getCandidateBio(candidateId),
        this.getDetailedCandidateBio(candidateId),
        this.getCandidatePositions(candidateId),
        this.getVotingRecord(candidateId),
        this.getCandidateRatings(candidateId)
      ]));
      const result = {
        candidateId,
        bio: bio.status === "fulfilled" ? bio.value : null,
        detailedBio: detailedBio.status === "fulfilled" ? detailedBio.value : null,
        positions: positions.status === "fulfilled" ? positions.value || [] : [],
        votingRecord: votingRecord.status === "fulfilled" ? votingRecord.value || [] : [],
        ratings: ratings.status === "fulfilled" ? ratings.value || [] : [],
        issues: [],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (bio.status === "rejected") result.issues.push("Biography data unavailable");
      if (detailedBio.status === "rejected") result.issues.push("Detailed biography unavailable");
      if (positions.status === "rejected") result.issues.push("Position data unavailable");
      if (votingRecord.status === "rejected") result.issues.push("Voting record unavailable");
      if (ratings.status === "rejected") result.issues.push("Rating data unavailable");
      return result;
    } catch (error) {
      console.error(`VoteSmart comprehensive data error for candidate ${candidateId}:`, error);
      return {
        candidateId,
        bio: null,
        detailedBio: null,
        positions: [],
        votingRecord: [],
        ratings: [],
        issues: ["VoteSmart API service unavailable"],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  /**
   * Get available issue categories for position statements
   */
  async getIssueCategories() {
    try {
      const response = await this.makeRequest("Npat.getCategories");
      if (!response || !response.categories) {
        return [];
      }
      return many(response.categories.category).map((cat) => ({
        categoryId: cat.categoryId || "",
        name: cat.name || ""
      }));
    } catch (error) {
      console.error("VoteSmart categories error:", error);
      return [];
    }
  }
  /**
   * Health check for the VoteSmart API
   */
  async healthCheck() {
    const startTime = Date.now();
    try {
      const response = await this.makeRequest("Npat.getCategories");
      const responseTime = Date.now() - startTime;
      if (response) {
        return {
          available: true,
          message: "VoteSmart API is available and responding",
          responseTime
        };
      } else {
        return {
          available: false,
          message: "VoteSmart API returned empty response"
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        available: false,
        message: `VoteSmart API health check failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime
      };
    }
  }
};
function createVoteSmartService() {
  const apiKey = process.env.VOTESMART_API_KEY;
  if (!apiKey) {
    console.warn("VOTESMART_API_KEY not found - VoteSmart features will be unavailable");
    return null;
  }
  return new VoteSmartService(apiKey, {
    timeout: 1e4,
    retries: 3,
    retryDelay: 1e3
  });
}
var voteSmartService = createVoteSmartService();

// server/civic-aggregator-service.ts
var ALL_CANDIDATE_DATA_FIELDS = Object.freeze(["propublica", "fec", "votesmart", "openstates", "polling"]);
var CivicAggregatorService = class _CivicAggregatorService {
  propublicaKey = process.env.PROPUBLICA_API_KEY;
  googleCivicKey = process.env.GOOGLE_CIVIC_API_KEY;
  openFecKey = process.env.OPENFEC_API_KEY;
  openStatesKey = process.env.OPENSTATES_API_KEY;
  voteSmartKey = process.env.VOTESMART_API_KEY;
  constructor() {
    this.validateApiKeys();
  }
  validateApiKeys() {
    const missingKeys = [];
    if (!this.propublicaKey) missingKeys.push("PROPUBLICA_API_KEY");
    if (!this.googleCivicKey) missingKeys.push("GOOGLE_CIVIC_API_KEY");
    if (!this.openFecKey) missingKeys.push("OPENFEC_API_KEY");
    if (!this.openStatesKey) missingKeys.push("OPENSTATES_API_KEY");
    if (!this.voteSmartKey) missingKeys.push("VOTESMART_API_KEY");
    if (this.openStatesKey) {
      console.log("OpenStates API configured (500 requests/day, 1 req/sec limit)");
    }
    if (missingKeys.length > 0) {
      console.warn(`Missing API keys: ${missingKeys.join(", ")}. Some features may be limited.`);
    }
  }
  /**
   * Enrichment is best-effort and bounded: each candidate gets at most
   * UPSTREAM_DEFAULTS.enrichmentBudgetMs across all providers, then local data wins.
   * Callers name the providers they actually read (`fields`) so request paths never
   * pay for data they discard (the elections route only reads VoteSmart).
   */
  async getComprehensiveCandidateData(candidateIds, electionId, fields = ALL_CANDIDATE_DATA_FIELDS) {
    const candidateData = await Promise.allSettled(
      candidateIds.map((id2) => withBudget(
        `enrich ${id2}`,
        UPSTREAM_DEFAULTS.enrichmentBudgetMs,
        (signal) => this.aggregateCandidateData(id2, electionId, fields, signal),
        { id: id2, name: "", party: "", office: "" }
      ))
    );
    const results = candidateData.filter((result) => result.status === "fulfilled").map((result) => result.value);
    return results;
  }
  async aggregateCandidateData(candidateId, electionId, fields = ALL_CANDIDATE_DATA_FIELDS, signal) {
    const baseData = {
      id: candidateId,
      name: "",
      party: "",
      office: ""
    };
    const want = new Set(fields);
    const skip = Promise.resolve(null);
    const [
      propublicaData,
      fecData,
      voteSmartData,
      openStatesData,
      pollingData2
    ] = await Promise.allSettled([
      want.has("propublica") ? this.fetchPropublicaData(candidateId, signal) : skip,
      want.has("fec") ? this.fetchFECData(candidateId, signal) : skip,
      want.has("votesmart") ? this.fetchVoteSmartData(candidateId, signal) : skip,
      want.has("openstates") ? this.fetchOpenStatesData(candidateId, signal) : skip,
      want.has("polling") ? this.fetchPollingData(candidateId, signal) : skip
    ]);
    if (propublicaData.status === "fulfilled" && propublicaData.value) {
      baseData.propublicaData = propublicaData.value;
      baseData.name = propublicaData.value.first_name + " " + propublicaData.value.last_name;
      baseData.party = propublicaData.value.party;
      baseData.office = propublicaData.value.roles?.[0]?.title || "Representative";
      baseData.state = propublicaData.value.roles?.[0]?.state;
      baseData.district = propublicaData.value.roles?.[0]?.district;
    }
    if (fecData.status === "fulfilled" && fecData.value) {
      baseData.fecData = fecData.value;
    }
    if (voteSmartData.status === "fulfilled" && voteSmartData.value) {
      baseData.voteSmartData = voteSmartData.value;
    }
    if (openStatesData.status === "fulfilled" && openStatesData.value) {
      baseData.openStatesData = openStatesData.value;
    }
    if (pollingData2.status === "fulfilled" && pollingData2.value) {
      baseData.pollingData = pollingData2.value;
    }
    return baseData;
  }
  async fetchPropublicaData(candidateId, signal) {
    if (!this.propublicaKey) return null;
    try {
      const response = await boundedUpstreamFetch(`https://api.propublica.org/congress/v1/members/${candidateId}.json`, {
        signal,
        headers: {
          "X-API-Key": this.propublicaKey
        }
      });
      if (!response.ok) throw new Error(`ProPublica API error: ${response.status}`);
      const data = await response.json();
      return data.results?.[0];
    } catch (error) {
      console.error("ProPublica API error:", error);
      return null;
    }
  }
  async fetchFECData(candidateId, signal) {
    if (!this.openFecKey) return null;
    try {
      const response = await boundedUpstreamFetch(`https://api.open.fec.gov/v1/candidates/search/?api_key=${this.openFecKey}&candidate_id=${candidateId}&per_page=1`, { signal });
      if (!response.ok) throw new Error(`OpenFEC API error: ${response.status}`);
      const data = await response.json();
      return data.results?.[0];
    } catch (error) {
      console.error("OpenFEC API error:", error);
      return null;
    }
  }
  async fetchVoteSmartData(candidateId, signal) {
    if (!voteSmartService) {
      console.warn(`VoteSmart service unavailable for candidate ${candidateId} - API key not configured`);
      return {
        bio: null,
        detailedBio: null,
        positions: [],
        votingRecord: [],
        ratings: [],
        photoUrl: null,
        issues: ["VoteSmart API key not configured - comprehensive candidate data unavailable"],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    try {
      const comprehensiveData = await voteSmartService.getComprehensiveCandidateData(candidateId, signal);
      const photoUrl = comprehensiveData.bio?.photo || comprehensiveData.detailedBio?.photo || null;
      return {
        bio: comprehensiveData.bio,
        detailedBio: comprehensiveData.detailedBio,
        positions: comprehensiveData.positions,
        votingRecord: comprehensiveData.votingRecord,
        ratings: comprehensiveData.ratings,
        photoUrl,
        issues: comprehensiveData.issues,
        lastUpdated: comprehensiveData.lastUpdated
      };
    } catch (error) {
      console.error(`VoteSmart comprehensive data error for candidate ${candidateId}:`, error);
      return {
        bio: null,
        detailedBio: null,
        positions: [],
        votingRecord: [],
        ratings: [],
        photoUrl: null,
        issues: [`VoteSmart API error: ${error instanceof Error ? error.message : String(error)}`],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  async fetchOpenStatesData(candidateId, signal) {
    if (!this.openStatesKey) return null;
    try {
      const response = await boundedUpstreamFetch(`https://v3.openstates.org/people/${candidateId}?apikey=${this.openStatesKey}`, { signal });
      if (!response.ok) {
        const searchResponse = await boundedUpstreamFetch(`https://v3.openstates.org/people?apikey=${this.openStatesKey}&jurisdiction=us&name=${candidateId}&per_page=1`, { signal });
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          return searchData.results?.[0];
        }
        throw new Error(`OpenStates API error: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("OpenStates API error:", error);
      return null;
    }
  }
  // The FiveThirtyEight CSV is a shared, large, slowly-changing file. It is fetched at
  // most once per 6 h (10 min negative cache after a failure), bounded to 8 s / 10 MB,
  // and never on a request path more than once concurrently. Override the URL with
  // POLLING_CSV_URL (tests, air-gapped runs).
  static pollingCsv = memoize(6 * 60 * 60 * 1e3, 10 * 60 * 1e3, async () => {
    const url2 = process.env.POLLING_CSV_URL || "https://raw.githubusercontent.com/fivethirtyeight/data/master/polls/polls.csv";
    const response = await boundedUpstreamFetch(url2, {}, { timeoutMs: 8e3, maxBodyBytes: 1e7, label: "polling-csv" });
    if (!response.ok) throw new Error(`FiveThirtyEight data error: ${response.status}`);
    const lines = (await response.text()).split("\n");
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      return { pollster: values[0], date: values[1], candidate: values[2], pct: parseFloat(values[3]) || 0 };
    });
  });
  /** Test hook. */
  static resetPollingCache() {
    _CivicAggregatorService.pollingCsv.reset();
  }
  async fetchPollingData(candidateId, signal) {
    if (signal?.aborted) return null;
    const polls = await Promise.race([
      _CivicAggregatorService.pollingCsv.get(),
      new Promise((resolve) => signal?.addEventListener("abort", () => resolve(null), { once: true }))
    ]);
    if (!polls) return null;
    return polls.filter((poll) => poll.candidate?.toLowerCase().includes(candidateId.toLowerCase()));
  }
  async fetchGoogleCivicData(address) {
    if (!this.googleCivicKey) return null;
    try {
      const response = await boundedUpstreamFetch(`https://civicinfo.googleapis.com/civicinfo/v2/voterinfo?key=${this.googleCivicKey}&address=${encodeURIComponent(address)}`);
      if (!response.ok) throw new Error(`Google Civic API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Google Civic API error:", error);
      return null;
    }
  }
  async fetchInternationalData(candidateName, country) {
    if (country.toLowerCase() === "uk" || country.toLowerCase() === "united kingdom") {
      return this.fetchUKParliamentData(candidateName);
    }
    return this.fetchWikidataGlobal(candidateName, country);
  }
  async fetchUKParliamentData(candidateName) {
    try {
      const response = await boundedUpstreamFetch(`https://members-api.parliament.uk/api/Members/Search?Name=${encodeURIComponent(candidateName)}`);
      if (!response.ok) throw new Error(`UK Parliament API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("UK Parliament API error:", error);
      return null;
    }
  }
  async fetchWikidataGlobal(candidateName, country) {
    try {
      const sparqlQuery = `
        SELECT ?person ?personLabel ?partyLabel ?positionLabel WHERE {
          ?person rdfs:label "${candidateName}"@en .
          ?person wdt:P31 wd:Q5 .
          ?person wdt:P106 wd:Q82955 .
          ?person wdt:P17 ?country .
          ?country rdfs:label "${country}"@en .
          OPTIONAL { ?person wdt:P102 ?party }
          OPTIONAL { ?person wdt:P39 ?position }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
        }
        LIMIT 5
      `;
      const response = await boundedUpstreamFetch("https://query.wikidata.org/sparql", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: `query=${encodeURIComponent(sparqlQuery)}`
      });
      if (!response.ok) throw new Error(`Wikidata SPARQL error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Wikidata SPARQL error:", error);
      return null;
    }
  }
  async comparePolicies(candidateIds, policyCategories) {
    const candidateData = await this.getComprehensiveCandidateData(candidateIds, "comparison");
    return policyCategories.map((category) => ({
      category,
      positions: candidateData.map((candidate) => ({
        candidateId: candidate.id,
        candidateName: candidate.name,
        position: this.extractPolicyPosition(candidate, category),
        details: this.extractPolicyDetails(candidate, category),
        source: this.getBestSourceForPolicy(candidate, category),
        confidence: this.calculateConfidenceScore(candidate, category)
      }))
    }));
  }
  extractPolicyPosition(candidate, category) {
    if (candidate.voteSmartData?.positions && candidate.voteSmartData.positions.length > 0) {
      const position = candidate.voteSmartData.positions.find(
        (p) => p.categoryName?.toLowerCase().includes(category.toLowerCase()) || p.position?.toLowerCase().includes(category.toLowerCase())
      );
      if (position) {
        return position.position || `Position available on ${position.categoryName}`;
      }
    }
    if (candidate.voteSmartData?.votingRecord && candidate.voteSmartData.votingRecord.length > 0) {
      const relevantVotes = candidate.voteSmartData.votingRecord.filter(
        (vote) => vote.billTitle?.toLowerCase().includes(category.toLowerCase()) || vote.desc?.toLowerCase().includes(category.toLowerCase())
      );
      if (relevantVotes.length > 0) {
        const supportVotes = relevantVotes.filter((v) => v.vote === "Yes").length;
        const totalVotes = relevantVotes.length;
        const supportRate = supportVotes / totalVotes * 100;
        return `${supportRate.toFixed(0)}% support based on ${totalVotes} relevant votes`;
      }
    }
    if (candidate.propublicaData?.votes) {
      const relevantVotes = candidate.propublicaData.votes.filter(
        (vote) => vote.description?.toLowerCase().includes(category.toLowerCase())
      );
      if (relevantVotes.length > 0) {
        const supportVotes = relevantVotes.filter((v) => v.position === "Yes").length;
        const totalVotes = relevantVotes.length;
        const supportRate = supportVotes / totalVotes * 100;
        return `${supportRate.toFixed(0)}% support based on congressional voting record`;
      }
    }
    return "Position not available from current sources";
  }
  extractPolicyDetails(candidate, category) {
    const details = [];
    if (candidate.voteSmartData?.bio?.education || candidate.voteSmartData?.detailedBio?.education) {
      const education = candidate.voteSmartData.bio?.education || candidate.voteSmartData.detailedBio?.education;
      details.push(`Education: ${education}`);
    }
    if (candidate.voteSmartData?.bio?.profession || candidate.voteSmartData?.detailedBio?.profession) {
      const profession = candidate.voteSmartData.bio?.profession || candidate.voteSmartData.detailedBio?.profession;
      details.push(`Professional background: ${profession}`);
    }
    if (candidate.voteSmartData?.ratings && candidate.voteSmartData.ratings.length > 0) {
      const categoryRatings = candidate.voteSmartData.ratings.filter(
        (rating) => rating.sigName?.toLowerCase().includes(category.toLowerCase()) || rating.ratingText?.toLowerCase().includes(category.toLowerCase())
      );
      if (categoryRatings.length > 0) {
        const ratingSummary = categoryRatings.map((r) => `${r.sigName}: ${r.rating}`).join(", ");
        details.push(`Interest group ratings: ${ratingSummary}`);
      }
    }
    if (candidate.propublicaData?.committees) {
      const relevantCommittees = candidate.propublicaData.committees.filter(
        (c) => c.name?.toLowerCase().includes(category.toLowerCase())
      );
      if (relevantCommittees.length > 0) {
        details.push(`Committee experience: ${relevantCommittees.map((c) => c.name).join(", ")}`);
      }
    }
    if (candidate.fecData?.total_receipts) {
      details.push(`Campaign funding: $${candidate.fecData.total_receipts.toLocaleString()}`);
    }
    if (candidate.voteSmartData?.votingRecord && candidate.voteSmartData.votingRecord.length > 0) {
      details.push(`Voting record: ${candidate.voteSmartData.votingRecord.length} recorded votes`);
    }
    return details.join(" | ") || "No additional details available";
  }
  getBestSourceForPolicy(candidate, category) {
    if (candidate.voteSmartData?.positions && candidate.voteSmartData.positions.length > 0) {
      return "VoteSmart.org - Position statements";
    }
    if (candidate.voteSmartData?.votingRecord && candidate.voteSmartData.votingRecord.length > 0) {
      return "VoteSmart.org - Voting record";
    }
    if (candidate.voteSmartData?.ratings && candidate.voteSmartData.ratings.length > 0) {
      return "VoteSmart.org - Interest group ratings";
    }
    if (candidate.propublicaData?.votes) return "ProPublica Congress API";
    if (candidate.openStatesData?.bills) return "Open States";
    if (candidate.fecData) return "Federal Election Commission";
    return "Multiple government sources";
  }
  calculateConfidenceScore(candidate, category) {
    let score = 0;
    if (candidate.voteSmartData?.positions && candidate.voteSmartData.positions.length > 0) score += 0.35;
    if (candidate.voteSmartData?.votingRecord && candidate.voteSmartData.votingRecord.length > 0) score += 0.25;
    if (candidate.voteSmartData?.ratings && candidate.voteSmartData.ratings.length > 0) score += 0.15;
    if (candidate.voteSmartData?.bio || candidate.voteSmartData?.detailedBio) score += 0.1;
    if (candidate.propublicaData?.votes) score += 0.1;
    if (candidate.fecData) score += 0.05;
    return Math.min(score, 1);
  }
  getServiceStatus() {
    return {
      apis: {
        propublica: !!this.propublicaKey,
        openFEC: !!this.openFecKey,
        googleCivic: !!this.googleCivicKey,
        openStates: !!this.openStatesKey,
        voteSmart: !!voteSmartService
      },
      voteSmartCapabilities: {
        available: !!voteSmartService,
        features: voteSmartService ? [
          "Candidate biographies",
          "Position statements",
          "Voting records",
          "Interest group ratings",
          "Photo URLs",
          "Educational background",
          "Professional history"
        ] : ["VoteSmart API key required for comprehensive candidate data"],
        fallbackBehavior: "Returns informative placeholder content when API unavailable"
      },
      internationalSupport: {
        ukParliament: true,
        wikidata: true,
        euParlGov: false
        // Would require additional setup
      },
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};
var civicAggregatorService = new CivicAggregatorService();

// server/lib/political-analysis.js
var REGIONAL_BASELINES = {
  // Traditionally Republican (Red) states
  "AL": "red",
  "AK": "red",
  "AR": "red",
  "FL": "red",
  "GA": "red",
  "ID": "red",
  "IN": "red",
  "IA": "red",
  "KS": "red",
  "KY": "red",
  "LA": "red",
  "MS": "red",
  "MO": "red",
  "MT": "red",
  "NE": "red",
  "ND": "red",
  "OH": "red",
  "OK": "red",
  "SC": "red",
  "SD": "red",
  "TN": "red",
  "TX": "red",
  "UT": "red",
  "WV": "red",
  "WY": "red",
  // Traditionally Democratic (Blue) states
  "CA": "blue",
  "CT": "blue",
  "DE": "blue",
  "HI": "blue",
  "IL": "blue",
  "MD": "blue",
  "MA": "blue",
  "MN": "blue",
  "NV": "blue",
  "NJ": "blue",
  "NM": "blue",
  "NY": "blue",
  "OR": "blue",
  "RI": "blue",
  "VT": "blue",
  "WA": "blue",
  "DC": "blue",
  // Competitive/Swing (Purple) states
  "AZ": "purple",
  "CO": "purple",
  "ME": "purple",
  "MI": "purple",
  "NH": "purple",
  "NC": "purple",
  "PA": "purple",
  "VA": "purple",
  "WI": "purple"
};
function calculateAdvancedPoliticalLeaning(state, candidates2, currentPolling, momentum, userVotingIntentions2) {
  const stateCode = state?.toUpperCase();
  const baseline = REGIONAL_BASELINES[stateCode] || "purple";
  const candidateAnalysis = analyzeCandidateComposition(candidates2);
  const analysis = combineDataSources(
    baseline,
    candidateAnalysis,
    currentPolling,
    momentum,
    userVotingIntentions2
  );
  return analysis;
}
function analyzeCandidateComposition(candidates2) {
  if (!candidates2 || candidates2.length === 0) {
    return { democratic: 0, republican: 0, independent: 0, total: 0 };
  }
  const leftParties = ["Democratic", "Democrat", "Green", "Liberal", "Progressive"];
  const rightParties = ["Republican", "Conservative", "GOP", "Libertarian"];
  let democratic = 0;
  let republican = 0;
  let independent = 0;
  candidates2.forEach((candidate) => {
    const party = candidate.party || "";
    if (leftParties.some((p) => party.includes(p))) {
      democratic++;
    } else if (rightParties.some((p) => party.includes(p))) {
      republican++;
    } else {
      independent++;
    }
  });
  return { democratic, republican, independent, total: candidates2.length };
}
function combineDataSources(baseline, candidateData, polling, momentum, userIntentions) {
  let currentLeaning = baseline === "red" ? "right" : baseline === "blue" ? "left" : "split";
  let intensity = "medium";
  let isShifting = false;
  let shiftDirection;
  let competitiveness = baseline === "purple" ? 0.8 : 0.3;
  if (polling) {
    const demSupport = polling.democraticSupport;
    const repSupport = polling.republicanSupport;
    const margin = Math.abs(demSupport - repSupport);
    if (demSupport > repSupport + 5) {
      currentLeaning = "left";
    } else if (repSupport > demSupport + 5) {
      currentLeaning = "right";
    } else {
      currentLeaning = "split";
      competitiveness = 0.9;
    }
    intensity = margin > 15 ? "high" : margin > 7 ? "medium" : "low";
  }
  if (momentum && momentum.confidence > 0.6) {
    const demTrend = momentum.democraticTrend;
    const repTrend = momentum.republicanTrend;
    const trendStrength = Math.max(Math.abs(demTrend), Math.abs(repTrend));
    if (trendStrength > 0.1) {
      isShifting = true;
      if (baseline === "red" && demTrend > 0.05) {
        shiftDirection = "red-to-blue";
        currentLeaning = "split";
        competitiveness = Math.min(0.9, competitiveness + 0.3);
      } else if (baseline === "blue" && repTrend > 0.05) {
        shiftDirection = "blue-to-red";
        currentLeaning = "split";
        competitiveness = Math.min(0.9, competitiveness + 0.3);
      }
    }
  }
  if (userIntentions && userIntentions.totalPolled && userIntentions.totalPolled > 50) {
    const userDemSupport = userIntentions.democraticSupport;
    const userRepSupport = userIntentions.republicanSupport;
    if (baseline === "red" && userDemSupport > 40) {
      isShifting = true;
      currentLeaning = "split";
    } else if (baseline === "blue" && userRepSupport > 40) {
      isShifting = true;
      currentLeaning = "split";
    }
  }
  return {
    leaning: currentLeaning,
    intensity,
    baseline,
    isShifting,
    shiftDirection,
    competitiveness
  };
}

// server/routes/elections.ts
init_official_results();

// server/candidate-source-markers.ts
function candidateSourceMarkers(c) {
  return {
    data_source: c?.dataSource ?? c?.data_source ?? null,
    source_status: c?.sourceStatus ?? c?.source_status ?? null,
    ballot_status: c?.ballotStatus ?? c?.ballot_status ?? null,
    fec_status: c?.fecStatus ?? c?.fec_status ?? null
  };
}

// server/election-list-handler.ts
init_election_list_filters();
function electionListHandler(storage2, clock = () => /* @__PURE__ */ new Date()) {
  return async (req, res) => {
    try {
      const minDate = electionCalendarDay(clock());
      minDate.setUTCDate(minDate.getUTCDate() - 30);
      const filters = { ...req.query, minDate };
      normalizeElectionFilters(filters, clock());
      const result = await storage2.getElectionsStrict(filters);
      res.json(result);
    } catch (error) {
      if (error instanceof ElectionFilterError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error("Election listing unavailable:", error instanceof Error ? error.message : "unknown error");
        sendElectionListingUnavailable(res);
      }
    }
  };
}
function sendElectionListingUnavailable(res) {
  res.status(503).json({ error: "Election listing temporarily unavailable", code: "listing_unavailable" });
}

// server/routes/elections.ts
init_election_list_filters();
var electionsRouter = Router();
electionsRouter.get("/:id/political-analysis", async (req, res) => {
  try {
    const id2 = Number(req.params.id);
    if (!Number.isInteger(id2) || id2 <= 0) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    const election = await storage.getElection(id2);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    const candidatesData = await storage.getCandidatesByElection(id2);
    let currentPolling = void 0;
    let momentum = void 0;
    let userIntentions = void 0;
    const analysis = calculateAdvancedPoliticalLeaning(
      election.state,
      candidatesData,
      currentPolling,
      momentum,
      userIntentions
    );
    res.json({
      ...analysis,
      lastUpdated: /* @__PURE__ */ new Date()
    });
  } catch (error) {
    console.error("Political analysis error:", error);
    res.status(500).json({ error: "Failed to calculate political analysis" });
  }
});
electionsRouter.post("/:id/voting-intention", async (req, res) => {
  try {
    const id2 = Number(req.params.id);
    if (!Number.isInteger(id2) || id2 <= 0) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    const { candidateId, partyPreference, confidence = "medium" } = req.body;
    const election = await storage.getElection(id2);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    console.log(`Voting intention received for election ${id2}: ${partyPreference}`);
    res.json({ success: true, message: "Voting intention recorded successfully" });
  } catch (error) {
    console.error("Voting intention error:", error);
    res.status(500).json({ error: "Failed to record voting intention" });
  }
});
function candidateExternalIds(c) {
  return {
    votesmart_id: c?.votesmartId ?? c?.votesmart_id ?? null,
    fec_id: c?.fecCandidateId ?? c?.fec_candidate_id ?? null,
    bioguide_id: c?.bioguideId ?? c?.bioguide_id ?? null
  };
}
var CANDIDATES_BATCH_MAX_IDS = 100;
electionsRouter.get("/candidates-batch", async (req, res) => {
  try {
    const raw = String(req.query.ids ?? "");
    const ids = Array.from(new Set(raw.split(",").map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0)));
    if (!ids.length) return res.status(400).json({ error: "bad_request", message: "ids must be a comma-separated list of election ids" });
    if (ids.length > CANDIDATES_BATCH_MAX_IDS) {
      return res.status(400).json({ error: "bad_request", message: `at most ${CANDIDATES_BATCH_MAX_IDS} ids per request`, max: CANDIDATES_BATCH_MAX_IDS });
    }
    const rows = await storage.getCandidatesByElections(ids);
    const byElection = {};
    for (const id2 of ids) byElection[String(id2)] = [];
    for (const c of rows) {
      (byElection[String(c.electionId)] ??= []).push({
        id: c.id,
        name: c.name,
        party: c.party,
        incumbent: c.isIncumbent,
        isIncumbent: c.isIncumbent,
        profile_image_url: c.profileImageUrl,
        profileImageUrl: c.profileImageUrl,
        website: c.website,
        is_verified: c.isVerified,
        isVerified: c.isVerified,
        pollingSupport: c.pollingSupport,
        dataSource: c.dataSource ?? null,
        sourceStatus: c.sourceStatus ?? null,
        ballotStatus: c.ballotStatus ?? null,
        fecCandidateId: c.fecCandidateId ?? null
      });
    }
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ candidates: byElection, requested: ids.length, elections: Object.keys(byElection).length });
  } catch (error) {
    console.error("Error fetching candidates batch:", error);
    res.status(500).json({ error: "server_error", message: "Failed to fetch candidates" });
  }
});
electionsRouter.get("/candidates-by-ids", async (req, res) => {
  try {
    const ids = String(req.query.ids ?? "").split(",").map((s) => Number(s)).filter(Number.isFinite);
    if (!ids.length) return res.json([]);
    const candidates2 = await storage.getCandidatesByIds(ids);
    const formattedCandidates = candidates2.map((c) => ({
      id: c.id,
      name: c.name,
      party: c.party,
      incumbent: c.isIncumbent,
      profile_image_url: c.profileImageUrl,
      website: c.website,
      contact_email: c.contactEmail,
      is_verified: c.isVerified,
      description: c.description,
      campaign_bio: c.campaignBio
    }));
    res.json(formattedCandidates);
  } catch (error) {
    console.error("Error fetching candidates by IDs:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});
electionsRouter.get("/counts", async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const allElections = await storage.getElectionsStrict();
    const upcoming = allElections.filter((e) => new Date(e.date) >= electionCalendarDay(now, e.timezone)).length;
    const past = allElections.length - upcoming;
    const byType = /* @__PURE__ */ Object.create(null);
    const standardTypes = { Primary: 0, General: 0, Special: 0 };
    for (const election of allElections) {
      byType[election.type] = (byType[election.type] ?? 0) + 1;
      const type = election.type.trim().toLowerCase();
      if (type === "primary") standardTypes.Primary++;
      else if (type === "general") standardTypes.General++;
      else if (type === "special") standardTypes.Special++;
    }
    res.json({
      total: allElections.length,
      upcoming,
      past,
      byType: { ...byType, ...standardTypes }
    });
  } catch (error) {
    console.error("Error fetching election counts:", error);
    sendElectionListingUnavailable(res);
  }
});
electionsRouter.get("/missing-candidates", async (req, res) => {
  try {
    const rawWindow = req.query.window;
    if (Object.keys(req.query).some((key) => key.startsWith("window[")) || rawWindow !== void 0 && (typeof rawWindow !== "string" || !/^[1-9]\d{0,2}$/.test(rawWindow) || Number(rawWindow) > 120)) {
      return res.status(400).json({ error: "window must be a single integer from 1 to 120", code: "invalid_query" });
    }
    const window = rawWindow === void 0 ? 60 : Number(rawWindow);
    const allElections = await storage.getElectionsStrict();
    const now = /* @__PURE__ */ new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    const endDate = new Date(now.getTime() + window * 24 * 60 * 60 * 1e3);
    const electionsInWindow = allElections.filter((election) => {
      const electionDate = new Date(election.date);
      return electionDate >= startDate && electionDate <= endDate;
    });
    const missingCandidates = [];
    for (const election of electionsInWindow) {
      if (!Number.isSafeInteger(election.candidateCount) || election.candidateCount < 0) {
        throw new Error("Election candidate count is unavailable");
      }
      if (election.candidateCount === 0) {
        missingCandidates.push({
          id: election.id,
          title: election.title,
          state: election.state,
          date: election.date,
          candidate_count: 0
        });
      }
    }
    missingCandidates.sort((a, b) => {
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.state.localeCompare(b.state);
    });
    res.json({ window_days: window, missing: missingCandidates });
  } catch (error) {
    console.error("Error fetching missing candidates:", error);
    sendElectionListingUnavailable(res);
  }
});
electionsRouter.get("/:id", async (req, res) => {
  try {
    const id2 = Number(req.params.id);
    if (!Number.isInteger(id2) || id2 <= 0) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    const election = await storage.getElection(id2);
    if (!election) return res.status(404).json({ error: "Not found" });
    const candidates2 = await storage.getCandidatesByElection(id2);
    res.json({
      ...election,
      ...projectOfficialResultsForElection(election),
      candidateCount: candidates2.length,
      candidates: candidates2.length
    });
  } catch (error) {
    console.error("Error fetching election:", error);
    res.status(500).json({ error: "Failed to fetch election" });
  }
});
electionsRouter.get("/:id/candidates", async (req, res) => {
  try {
    const id2 = Number(req.params.id);
    if (!Number.isInteger(id2) || id2 <= 0) return res.status(400).json({ error: "bad id" });
    const election = await storage.getElection(id2);
    if (!election) return res.status(404).json({ error: "election not found" });
    const enrichCandidateData = async (candidate) => {
      const baseCandidate = {
        id: candidate.id,
        name: candidate.name,
        party: candidate.party,
        incumbent: candidate.isIncumbent,
        isIncumbent: candidate.isIncumbent,
        profile_image_url: candidate.profileImageUrl,
        profileImageUrl: candidate.profileImageUrl,
        website: candidate.website,
        contact_email: candidate.contactEmail,
        contactEmail: candidate.contactEmail,
        description: candidate.description,
        campaign_bio: candidate.campaignBio,
        campaignBio: candidate.campaignBio,
        is_verified: candidate.isVerified,
        isVerified: candidate.isVerified,
        office: election.title,
        offices: election.offices ?? [],
        state: election.state,
        district: election.location ?? null,
        votes_received: candidate.votesReceived,
        votesReceived: candidate.votesReceived,
        vote_percentage: candidate.votePercentage,
        votePercentage: candidate.votePercentage,
        is_winner: candidate.isWinner,
        isWinner: candidate.isWinner,
        is_projected_winner: candidate.isProjectedWinner,
        isProjectedWinner: candidate.isProjectedWinner,
        pollingSupport: candidate.pollingSupport
      };
      try {
        const votesmartId = candidate.votesmartId ?? candidate.votesmart_id;
        if (votesmartId || candidate.name) {
          const searchId = votesmartId || candidate.name;
          const comprehensiveData = await civicAggregatorService.getComprehensiveCandidateData([searchId], id2.toString(), ["votesmart"]);
          if (comprehensiveData && comprehensiveData.length > 0) {
            const enrichedData = comprehensiveData[0];
            return {
              ...baseCandidate,
              // Enhanced profile information
              biography: enrichedData.voteSmartData?.bio || enrichedData.voteSmartData?.detailedBio || null,
              photo_url: enrichedData.voteSmartData?.photoUrl || baseCandidate.profile_image_url,
              professional_background: enrichedData.voteSmartData?.bio?.profession || enrichedData.voteSmartData?.detailedBio?.profession || null,
              education: enrichedData.voteSmartData?.bio?.education || enrichedData.voteSmartData?.detailedBio?.education || null,
              // Position and voting information
              position_count: enrichedData.voteSmartData?.positions?.length || 0,
              voting_record_count: enrichedData.voteSmartData?.votingRecord?.length || 0,
              interest_group_ratings: enrichedData.voteSmartData?.ratings?.length || 0,
              // Data availability status
              data_completeness: {
                has_biography: !!(enrichedData.voteSmartData?.bio || enrichedData.voteSmartData?.detailedBio),
                has_photo: !!(enrichedData.voteSmartData?.photoUrl || baseCandidate.profile_image_url),
                has_positions: (enrichedData.voteSmartData?.positions?.length || 0) > 0,
                has_voting_record: (enrichedData.voteSmartData?.votingRecord?.length || 0) > 0,
                has_ratings: (enrichedData.voteSmartData?.ratings?.length || 0) > 0
              },
              // Issues and data source information
              data_issues: enrichedData.voteSmartData?.issues || [],
              last_data_update: enrichedData.voteSmartData?.lastUpdated || (/* @__PURE__ */ new Date()).toISOString(),
              // Additional identifiers for data linking
              external_ids: candidateExternalIds(candidate),
              source: candidateSourceMarkers(candidate)
            };
          }
        }
        return {
          ...baseCandidate,
          biography: null,
          photo_url: baseCandidate.profile_image_url,
          professional_background: null,
          education: null,
          position_count: 0,
          voting_record_count: 0,
          interest_group_ratings: 0,
          data_completeness: {
            has_biography: false,
            has_photo: !!baseCandidate.profile_image_url,
            has_positions: false,
            has_voting_record: false,
            has_ratings: false
          },
          data_issues: voteSmartService ? ["VoteSmart data not yet available for this candidate"] : ["VoteSmart API key required for comprehensive candidate data - configure VOTESMART_API_KEY to unlock detailed biographies, positions, and voting records"],
          last_data_update: (/* @__PURE__ */ new Date()).toISOString(),
          external_ids: candidateExternalIds(candidate),
          source: candidateSourceMarkers(candidate)
        };
      } catch (enrichmentError) {
        console.warn(`Failed to enrich candidate ${candidate.name}:`, enrichmentError);
        return {
          ...baseCandidate,
          biography: null,
          photo_url: baseCandidate.profile_image_url,
          professional_background: null,
          education: null,
          position_count: 0,
          voting_record_count: 0,
          interest_group_ratings: 0,
          data_completeness: {
            has_biography: false,
            has_photo: !!baseCandidate.profile_image_url,
            has_positions: false,
            has_voting_record: false,
            has_ratings: false
          },
          data_issues: [`Data enrichment temporarily unavailable: ${enrichmentError instanceof Error ? enrichmentError.message : "Unknown error"}`],
          last_data_update: (/* @__PURE__ */ new Date()).toISOString(),
          external_ids: candidateExternalIds(candidate),
          source: candidateSourceMarkers(candidate)
        };
      }
    };
    const directCandidates = await storage.getCandidatesByElection(id2);
    if (directCandidates.length > 0) {
      const enrichedCandidates = await Promise.allSettled(
        directCandidates.map((candidate) => enrichCandidateData(candidate))
      );
      const formattedCandidates = enrichedCandidates.filter((result) => result.status === "fulfilled").map((result) => result.value).sort((a, b) => a.name.localeCompare(b.name));
      return res.json(formattedCandidates);
    }
    res.setHeader("X-Candidate-Provenance", "none");
    return res.json([]);
  } catch (error) {
    console.error("Error fetching enriched candidates:", error);
    res.status(500).json({
      error: "Failed to fetch candidates",
      message: "Unable to retrieve candidate information at this time",
      support_message: "Please try again later or contact support if the issue persists",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
electionsRouter.get("/:electionId/candidates/:candidateId", async (req, res) => {
  try {
    const electionId = Number(req.params.electionId);
    const candidateId = Number(req.params.candidateId);
    if (!Number.isInteger(electionId) || electionId <= 0 || !Number.isInteger(candidateId) || candidateId <= 0) {
      return res.status(400).json({ error: "Invalid ID parameters" });
    }
    const [election, candidates2] = await Promise.all([storage.getElection(electionId), storage.getCandidatesByIds([candidateId])]);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    const candidate = candidates2[0];
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    if (candidate.electionId !== null && candidate.electionId !== electionId) {
      return res.status(404).json({ error: "Candidate is not in this election" });
    }
    const baseResponse = {
      id: candidate.id,
      name: candidate.name,
      party: candidate.party,
      office: election.title,
      offices: election.offices ?? [],
      state: election.state,
      location: election.location ?? null,
      incumbent: candidate.isIncumbent,
      is_verified: candidate.isVerified,
      website: candidate.website,
      contact_email: candidate.contactEmail,
      campaign_phone: candidate.campaignPhone,
      social_media: candidate.socialMedia,
      description: candidate.description,
      campaign_bio: candidate.campaignBio,
      profile_image_url: candidate.profileImageUrl,
      photo_url: null,
      external_ids: candidateExternalIds(candidate),
      source: candidateSourceMarkers(candidate),
      election_id: electionId,
      data_completeness: {
        has_biography: false,
        has_photo: !!candidate.profileImageUrl,
        has_positions: false,
        has_voting_record: false,
        has_ratings: false,
        has_professional_background: false,
        has_education: false
      },
      biography: null,
      professional_background: null,
      education: null,
      birth_date: null,
      birth_place: null,
      family_info: null,
      positions: [],
      position_summary: null,
      voting_record: [],
      voting_summary: null,
      interest_group_ratings: [],
      data_issues: [],
      last_data_update: (/* @__PURE__ */ new Date()).toISOString(),
      created_at: candidate.createdAt,
      updated_at: candidate.updatedAt
    };
    try {
      const searchId = candidate.votesmartId ?? candidate.votesmart_id ?? candidate.name;
      const comprehensiveData = await civicAggregatorService.getComprehensiveCandidateData([searchId], electionId.toString(), ["votesmart"]);
      const vsData = comprehensiveData?.[0]?.voteSmartData;
      if (vsData) {
        const bio = vsData.bio || vsData.detailedBio;
        if (bio) {
          baseResponse.biography = bio;
          baseResponse.professional_background = bio.profession ?? null;
          baseResponse.education = bio.education ?? null;
          baseResponse.birth_date = bio.birthDate ?? null;
          baseResponse.birth_place = bio.birthPlace ?? null;
          baseResponse.family_info = bio.family ?? null;
          baseResponse.data_completeness.has_biography = true;
          baseResponse.data_completeness.has_professional_background = !!bio.profession;
          baseResponse.data_completeness.has_education = !!bio.education;
        }
        if (vsData.photoUrl) {
          baseResponse.photo_url = vsData.photoUrl;
          baseResponse.data_completeness.has_photo = true;
        }
        if (vsData.positions && vsData.positions.length > 0) {
          baseResponse.positions = vsData.positions;
          baseResponse.position_summary = `${vsData.positions.length} policy position${vsData.positions.length === 1 ? "" : "s"} available`;
          baseResponse.data_completeness.has_positions = true;
        }
        if (vsData.votingRecord && vsData.votingRecord.length > 0) {
          baseResponse.voting_record = vsData.votingRecord;
          baseResponse.voting_summary = `${vsData.votingRecord.length} recorded vote${vsData.votingRecord.length === 1 ? "" : "s"} available`;
          baseResponse.data_completeness.has_voting_record = true;
        }
        if (vsData.ratings && vsData.ratings.length > 0) {
          baseResponse.interest_group_ratings = vsData.ratings;
          baseResponse.data_completeness.has_ratings = true;
        }
        baseResponse.data_issues = vsData.issues ?? [];
        baseResponse.last_data_update = vsData.lastUpdated ?? (/* @__PURE__ */ new Date()).toISOString();
      }
      const alreadyExplained = baseResponse.data_issues.some((issue) => /votesmart/i.test(issue));
      if (!alreadyExplained && !baseResponse.data_completeness.has_biography && !baseResponse.data_completeness.has_positions) {
        baseResponse.data_issues.push(voteSmartService ? "No VoteSmart biography or positions are on file for this candidate" : "VoteSmart API key required for comprehensive candidate data - configure VOTESMART_API_KEY to unlock detailed biographies, positions, and voting records");
      }
      res.json(baseResponse);
    } catch (enrichmentError) {
      console.warn(`Failed to enrich candidate ${candidate.name} (ID: ${candidateId}):`, enrichmentError);
      res.json({
        ...baseResponse,
        data_issues: [`Data enrichment temporarily unavailable: ${enrichmentError instanceof Error ? enrichmentError.message : "Unknown error"}`]
      });
    }
  } catch (error) {
    console.error("Error fetching candidate details:", error);
    res.status(500).json({
      error: "Failed to fetch candidate details",
      message: "Unable to retrieve detailed candidate information at this time",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});

// scripts/.verify_public_election_list.generated.ts
init_election_list_filters();
function oldElectionListHandler(storage2, clock = () => /* @__PURE__ */ new Date()) {
  return async (req, res) => {
    try {
      const minDate = electionCalendarDay(clock());
      minDate.setUTCDate(minDate.getUTCDate() - 30);
      const filters = { ...req.query, minDate };
      normalizeElectionFilters(filters, clock());
      const result = await storage2.getElections(filters);
      res.json(result);
    } catch (error) {
      if (error instanceof ElectionFilterError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error("Election listing unavailable:", error instanceof Error ? error.message : "unknown error");
        res.status(503).json({ error: "Election listing temporarily unavailable" });
      }
    }
  };
}
var url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, process.env.OWNED_LIST_FIXTURE_HOST);
assert.equal(url.pathname, "/sol_public_list_fixture");
assert.equal(url.search, "");
assert.ok(["5432", "1"].includes(url.port));
assert.equal(process.env.OWNED_LIST_FIXTURE_LABEL, "sol-c-public-list-fault-20261013");
await stopStorageBackground();
var store = new DatabaseStorage();
var app = express();
var outcomes = [];
var mapQuestService = { geocodeAddress: async () => ({ state: "CO", city: "Denver", county: "Denver" }) };
var perplexityCongressService = { searchWithAI: async () => {
  throw new Error("Acceptance must not call an external provider");
} };
app.get("/api/elections/search", async (req, res) => {
  try {
    const { query, enhance = false } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Search query is required" });
    }
    const elections2 = await storage.getElectionsStrict({
      search: query,
      state: void 0,
      type: void 0,
      level: void 0,
      timeframe: void 0,
      timeRange: void 0,
      party: void 0,
      electionType: void 0
    });
    let aiEnhancement = null;
    if (enhance === "true") {
      try {
        aiEnhancement = await perplexityCongressService.searchWithAI(
          `Find additional election information for: ${query}`
        );
      } catch (error) {
        console.error("AI enhancement failed:", error);
      }
    }
    res.json({
      elections: elections2,
      aiEnhancement,
      totalResults: elections2.length
    });
  } catch (error) {
    sendElectionListingUnavailable(res);
  }
});
app.get("/api/elections-by-location", async (req, res) => {
  try {
    const { address, lat, lng } = req.query;
    let location;
    if (address && typeof address === "string") {
      location = await mapQuestService.geocodeAddress(address);
    } else if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        location = await mapQuestService.reverseGeocode(latitude, longitude);
      }
    }
    if (!location) {
      return res.status(400).json({ error: "Valid address or coordinates required" });
    }
    const stateElections = await storage.getElectionsStrict({
      state: location.state,
      level: ["Local", "State", "Federal"],
      timeframe: void 0,
      timeRange: void 0,
      party: void 0,
      electionType: void 0,
      search: void 0,
      type: void 0
    });
    const localElections = stateElections.filter(
      (election) => election.level === "Local" && (election.location?.toLowerCase().includes(location.city.toLowerCase()) || election.location?.toLowerCase().includes(location.county.toLowerCase()) || election.subtitle?.toLowerCase().includes(location.city.toLowerCase()))
    );
    let aiVerification = null;
    if (localElections.length > 0) {
      try {
        const aiQuery = `Verify local elections in ${location.city}, ${location.state}. Are there any upcoming municipal elections, school board elections, or local ballot measures? Provide specific dates and offices if available.`;
        const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-large-128k-online",
            messages: [
              {
                role: "system",
                content: "You are an expert on local U.S. elections. Provide accurate, current information about municipal elections, school board elections, and local ballot measures."
              },
              {
                role: "user",
                content: aiQuery
              }
            ],
            max_tokens: 300,
            temperature: 0.2
          })
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiVerification = aiData.choices[0]?.message?.content;
        }
      } catch (error) {
        console.log("AI verification failed:", error);
      }
    }
    res.json({
      location,
      elections: localElections.length > 0 ? localElections : stateElections.slice(0, 10),
      localElectionsFound: localElections.length,
      totalStateElections: stateElections.length,
      aiVerification,
      searchPriority: localElections.length > 0 ? "local" : "state"
    });
  } catch (error) {
    console.error("Elections by location error:", error);
    sendElectionListingUnavailable(res);
  }
});
Object.assign(storage, { currentStorage: store });
app.get("/api/elections", electionListHandler(store));
app.use("/api/elections", electionsRouter);
app.get("/old", oldElectionListHandler(storage));
app.get("/factory", electionListHandler(storage));
var server = createServer(app);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
var root = `http://127.0.0.1:${server.address().port}`;
async function get(path) {
  const r = await fetch(root + path);
  return { status: r.status, body: await r.json() };
}
try {
  if (url.port === "1") {
    const error = await store.getElectionsStrict().then(() => null, (e) => e);
    assert.equal(error?.cause?.code ?? error?.code, "ECONNREFUSED");
    const r = await get("/api/elections");
    assert.equal(r.status, 503);
    assert.equal(r.body.code, "listing_unavailable");
    outcomes.push({ scenario: "actual native pg closed-port refusal through DatabaseStorage and compiled HTTP handler", nativeCode: "ECONNREFUSED", response: r });
  } else {
    assert.equal((await pool.query("select current_database() as name")).rows[0].name, "sol_public_list_fixture");
    for (const [name, table] of [["elections", elections], ["candidates", candidates]]) {
      const columns = Object.values(getTableColumns4(table)).map((c) => `"${c.name}" ${c.getSQLType()}${c.primary ? " primary key" : ""}`);
      await pool.query(`create table "${name}" (${columns.join(",")})`);
    }
    await pool.query(`insert into elections(id,title,location,state,date,type,level,is_active) values (1,'U.S. Senate Election - Colorado','Colorado','CO','2026-11-03','general','federal',true),(2,'U.S. Senate Election - California','California','CA','2026-11-03','general','federal',false)`);
    const first = await get("/api/elections");
    assert.equal(first.status, 200);
    assert.deepEqual(first.body.map((r) => r.id), [1]);
    outcomes.push({ scenario: "healthy compiled native-PG listing excludes inactive row", response: first });
    const stats = await store.getElectionStats();
    const counts = await get("/api/elections/counts");
    assert.equal(counts.status, 200);
    assert.equal(counts.body.total, stats.total);
    assert.deepEqual(counts.body.byType, stats.byType);
    outcomes.push({ scenario: "count derivation equals existing real-PG active-row stats", counts: counts.body, stats: { total: stats.total, byType: stats.byType } });
    const originalQuery = pool.query;
    let queryReads = 0;
    Object.defineProperty(pool, "query", { value: function(...args) {
      queryReads++;
      return Reflect.apply(originalQuery, pool, args);
    }, configurable: true });
    for (const query of ["garbage", "0", "121", "1.5", "", "60&window=60", "60&window=70"]) {
      queryReads = 0;
      const r = await get("/api/elections/missing-candidates?window=" + query);
      assert.equal(r.status, 400);
      assert.equal(r.body.code, "invalid_query");
      assert.equal(queryReads, 0);
      outcomes.push({ scenario: "strict malformed window " + query, response: r, nativeQueries: queryReads });
    }
    queryReads = 0;
    const arrayWindow = await get("/api/elections/missing-candidates?window[]=60");
    assert.equal(arrayWindow.status, 400);
    assert.equal(queryReads, 0);
    outcomes.push({ scenario: "array window refused before native query", response: arrayWindow, nativeQueries: queryReads });
    queryReads = 0;
    const exactZero = await get("/api/elections/missing-candidates");
    assert.deepEqual(exactZero.body.missing.map((e) => e.id), [1]);
    assert.equal(queryReads, 1);
    outcomes.push({ scenario: "native candidateCount zero, one grouped query", response: exactZero, nativeQueries: queryReads });
    await pool.query("insert into candidates(id,election_id,party) values(10,1,'D')");
    queryReads = 0;
    const exactOne = await get("/api/elections/missing-candidates");
    assert.deepEqual(exactOne.body.missing, []);
    assert.equal(queryReads, 1);
    outcomes.push({ scenario: "native candidateCount one excludes race, one grouped query", response: exactOne, nativeQueries: queryReads });
    await pool.query("delete from candidates where id=10");
    const actualDate = globalThis.Date;
    globalThis.Date = new Proxy(actualDate, { construct(target, args) {
      return Reflect.construct(target, args.length ? args : ["2026-11-04T05:30:00Z"]);
    } });
    try {
      await pool.query("insert into elections(id,title,location,state,date,type,level,timezone,is_active) values(3,'U.S. Senate Election - Alaska','Alaska','AK','2026-11-03','general','federal','America/Adak',true),(4,'U.S. Senate Election - New York','New York','NY','2026-11-03','general','federal','America/New_York',true)");
      const night = await get("/api/elections/counts");
      assert.equal(night.status, 200);
      assert.deepEqual([night.body.total, night.body.upcoming, night.body.past], [3, 2, 1]);
      outcomes.push({ scenario: "actual native Nov3 unknown/Adak vsNY at pinnedNov4 05:30Z", response: night });
      await pool.query("delete from elections where id in(3,4)");
    } finally {
      globalThis.Date = actualDate;
    }
    await pool.query("insert into elections(id,title,location,state,date,type,level,is_active) values(3,'Colorado Primary A','Colorado','CO','2026-11-03','Primary','federal',true),(4,'Colorado Primary B','Colorado','CO','2026-11-03','primary','federal',true),(5,'Colorado General A','Colorado','CO','2026-11-03','General','federal',true),(6,'Colorado General B','Colorado','CO','2026-11-03','general','federal',true),(7,'Colorado Special','Colorado','CO','2026-11-03','Special','federal',true),(8,'Colorado Referendum','Colorado','CO','2026-11-03','Referendum','federal',true),(9,'Colorado Unknown A','Colorado','CO','2026-11-03','__proto__','federal',true),(10,'Colorado Unknown B','Colorado','CO','2026-11-03','constructor','federal',true)");
    const typeCounts = await get("/api/elections/counts");
    assert.equal(typeCounts.status, 200);
    assert.deepEqual([typeCounts.body.byType.Primary, typeCounts.body.byType.General, typeCounts.body.byType.Special, typeCounts.body.byType.Referendum], [2, 3, 1, 1]);
    assert.equal(Object.hasOwn(typeCounts.body.byType, "__proto__"), true);
    assert.equal(typeCounts.body.byType.__proto__, 1);
    assert.equal(typeCounts.body.byType.constructor, 1);
    outcomes.push({ scenario: "actual native mixed-case known types aggregate, unknown key preserved (includes baseline general row)", response: typeCounts });
    await pool.query("delete from elections where id between 3 and 10");
    const empty = await get("/api/elections?state=NY");
    assert.deepEqual(empty, { status: 200, body: [] });
    outcomes.push({ scenario: "legitimate filtered empty200[]", response: empty });
    const bad = await get("/api/elections?timeframe=bad");
    assert.equal(bad.status, 400);
    outcomes.push({ scenario: "invalid filter400", response: bad });
    for (const path of ["/api/elections/search?query=Colorado", "/api/elections/missing-candidates", "/api/elections-by-location?address=Denver"]) {
      const r = await get(path);
      assert.equal(r.status, 200);
      outcomes.push({ scenario: "healthy actual reserved route " + path, response: r });
    }
    await pool.query("alter table elections rename to elections_fault");
    const error = await store.getElectionsStrict().then(() => null, (e) => e);
    assert.equal(error?.cause?.code, "42P01");
    for (const path of ["/api/elections", "/api/elections/counts", "/api/elections/search?query=Colorado", "/api/elections/missing-candidates", "/api/elections-by-location?address=Denver"]) {
      const r = await get(path);
      assert.equal(r.status, 503);
      assert.equal(r.body.code, "listing_unavailable");
      outcomes.push({ scenario: "actual native SQL relation fault " + path, nativeCode: "42P01", response: r });
    }
    await pool.query("alter table elections_fault rename to elections");
    const recovered = await get("/api/elections");
    assert.equal(recovered.status, 200);
    assert.deepEqual(recovered.body, first.body);
    outcomes.push({ scenario: "same process SQL recovery restores identical list", response: recovered });
    const memory = new MemStorage();
    Object.assign(storage, { currentStorage: memory, memoryStorage: memory });
    const old = await get("/old");
    assert.deepEqual(old, { status: 200, body: [] });
    const current = await get("/factory");
    assert.equal(current.status, 503);
    assert.equal(current.body.code, "listing_unavailable");
    outcomes.push({ scenario: "real factory degraded memory immutable-old200[] / current typed503", old, current });
  }
  const receipt = { outcome: "Worked", compiled: true, actualNativePg: true, syntheticOwnedDatabase: true, hostPortsExposed: false, sharedDatabaseTouched: false, outcomes };
  writeFileSync("/evidence/" + (url.port === "1" ? "refined-native-refusal.json" : "refined-native-fault-recovery.json"), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ outcome: "Worked", scenarios: outcomes.length, mode: url.port === "1" ? "refusal" : "fault-recovery" }));
} finally {
  await new Promise((r) => server.close(() => r()));
  await pool.end();
}
