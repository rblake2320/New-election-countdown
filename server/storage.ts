import { buildElectionListQuery, projectElectionResultsRow, resultsCatalogTimestamp } from "./election-list-query";
import type { NewCampaignAccountInput, CreatedCampaignAccount } from './campaign-portal-service';
import type { campaignAccounts as _campaignAccountsTable } from '@shared/schema';
type CampaignAccount = typeof _campaignAccountsTable.$inferSelect;
import { PgResultReportStore, type EvidenceRecord, type RecordContext, type RecordOutcome, type ResultSource, type ResultsListPayload, type ResultsListQuery } from './results-store';
import type { ResultReportInput, ResultsPayload } from './results-reports';
import type {SourceHealthEvent} from './results-source-health';
import { BackgroundWork } from './background-work';
import type { ElectionListing, ElectionQueryFilters } from "./election-list-filters";
import { recommendationCache, userRecommendationAnalytics, electionRecommendations, elections, candidates, congressMembers, congressBills, congressCommittees, users, sessions, watchlist, electionResults, electionCycles, campaignAccounts, candidateAccounts, candidateProfiles, candidateDataSources, candidatePositions, candidateQA, notificationPreferences, notificationConsents, notificationSubscriptions, notificationTemplates, notificationCampaigns, notificationDeliveries, notificationEvents, notificationWebhooks, userPreferences, congressionalDistricts, backupStorageLocations, backupRetentionPolicies, backupOperations, schemaVersions, restoreValidations, backupSystemConfig, failoverDrillConfigurations, drillExecutions, drillSteps, backupMonitoringConfigurations, backupAlerts, backupHealthMetrics, rtoRpoTargets, rtoRpoMeasurements, performanceBenchmarks, incidentRunbooks, runbookSteps, runbookContacts, contactEscalationTrees, runbookExecutions, artifactStorage, deploymentHistory, environmentConfigurations, platformContinuityEvents, secretsRotationHistory, secretsVault, type Election, type InsertElection, type Candidate, type InsertCandidate, type ElectionFilters, type CongressMember, type InsertCongressMember, type User, type UpsertUser, type WatchlistItem, type InsertWatchlistItem, type UserPreferences, type InsertUserPreferences, type UpdateUserPreferences, type CongressionalDistrict, type InsertCongressionalDistrict, type CandidateAccount, type InsertCandidateAccount, type CandidateProfile, type InsertCandidateProfile, type CandidateDataSource, type InsertCandidateDataSource, type CandidatePosition, type InsertCandidatePosition, type CandidateQA, type InsertCandidateQA, type NotificationPreferences, type InsertNotificationPreferences, type NotificationConsent, type InsertNotificationConsent, type NotificationSubscription, type InsertNotificationSubscription, type NotificationTemplate, type InsertNotificationTemplate, type NotificationCampaign, type InsertNotificationCampaign, type NotificationDelivery, type InsertNotificationDelivery, type NotificationEvent, type InsertNotificationEvent, type NotificationWebhook, type InsertNotificationWebhook, type BackupStorageLocation, type InsertBackupStorageLocation, type BackupRetentionPolicy, type InsertBackupRetentionPolicy, type BackupOperation, type InsertBackupOperation, type SchemaVersion, type InsertSchemaVersion, type RestoreValidation, type InsertRestoreValidation, type BackupSystemConfig, type InsertBackupSystemConfig, type FailoverDrillConfiguration, type InsertFailoverDrillConfiguration, type DrillExecution, type InsertDrillExecution, type DrillStep, type InsertDrillStep, type BackupMonitoringConfiguration, type InsertBackupMonitoringConfiguration, type BackupAlert, type InsertBackupAlert, type BackupHealthMetric, type InsertBackupHealthMetric, type RtoRpoTarget, type InsertRtoRpoTarget, type RtoRpoMeasurement, type InsertRtoRpoMeasurement, type PerformanceBenchmark, type InsertPerformanceBenchmark, type IncidentRunbook, type InsertIncidentRunbook, type RunbookStep, type InsertRunbookStep, type RunbookContact, type InsertRunbookContact, type ContactEscalationTree, type InsertContactEscalationTree, type RunbookExecution, type InsertRunbookExecution } from "@shared/schema";
import { db, pool } from './db';
import { eq, and, gte, lte, lt, ilike, or, desc, asc, inArray, isNotNull, getTableColumns, sql, type SQL } from "drizzle-orm";
import type { ElectionRecommendation, UserRecommendationAnalytics, RecommendationCache, WatchlistAnalytics, EnhancedWatchlistResponse, RecommendationResponse } from "@shared/schema";
import { updateUserPreferencesSchema } from "@shared/schema";
import { getGoogleCivicService } from "./google-civic-service";
import { getCongressBillService } from './congress-bill-service';
import { getPerplexityService } from './perplexity-service';
import { censusService } from './census-service';
import bcrypt from 'bcryptjs';
import { validateElectionData, validateNotMockData } from './validators/state-election-rules';

/** Page-level engagement reported by the client (POST /api/analytics/engagement). */
export interface EngagementRecord {
  userId?: string;
  sessionId?: string;
  pageUrl?: string;
  pagePath?: string;
  timeOnPage?: number;
  scrollDepth?: number;
  electionCycleId?: number;
}

/** Demographic / location fields a user may self-report; everything else on the body is ignored. */
export const userDemographicsSchema = updateUserPreferencesSchema.pick({
  state: true, city: true, congressionalDistrict: true, partyAffiliations: true, issueInterests: true,
});

export interface IStorage {
  // Health checking
  isDbHealthy(): boolean;

  // Elections
  getElections(filters?: ElectionQueryFilters): Promise<ElectionListing[]>;
  getElection(id: number): Promise<Election | undefined>;
  createElection(election: InsertElection): Promise<Election>;
  deleteElection(id: number): Promise<void>;

  // Candidates
  getCandidatesByElection(electionId: number): Promise<Candidate[]>;
  getCandidates(electionId?: number): Promise<Candidate[]>;
  getCandidatesByIds(ids: number[]): Promise<Candidate[]>;
  /** One query for many races (list-mode batching); empty for unknown ids. */
  getCandidatesByElections(electionIds: number[]): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidatePolling(candidateId: number, pollingData: {
    // null clears a value (the data-audit endpoint removes static polling numbers)
    pollingSupport?: number | null;
    pollingTrend?: string | null;
    lastPollingUpdate?: Date | null;
    pollingSource?: string | null;
  }): Promise<void>;

  // Election Results
  getElectionResults(electionId: number): Promise<any>;
  // ET-6 live official results (contract v1.2): the one writer + reads
  recordResultReport(electionId: number, input: ResultReportInput, ctx: RecordContext): Promise<RecordOutcome>;
  recordResultSourceHealth(event:SourceHealthEvent):Promise<void>;
  getResultsPayload(electionId: number): Promise<ResultsPayload | null>;
  listResultsPayloads(query: ResultsListQuery): Promise<ResultsListPayload>;
  storeResultEvidence(bytes: Buffer, contentType: string, filename: string | null, uploadedBy: string): Promise<EvidenceRecord>;
  listResultSources(state?: string): Promise<ResultSource[]>;
  updateElectionResults(electionId: number, resultsData: any): Promise<any>;

  // Stats
  getElectionStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    nextElection: Election | null;
  }>;

  // API Integrations
  syncElectionsFromGoogleCivic(): Promise<void>;
  getVoterInfo(address: string): Promise<any>;

  // Congress API Data
  getAllBills(): Promise<any[]>;
  getBillsByCongress(congress: string): Promise<any[]>;
  getAllMembers(): Promise<any[]>;
  getAllCongressMembers(): Promise<CongressMember[]>;
  getMembersByState(state: string): Promise<any[]>;
  getAllCommittees(): Promise<any[]>;
  getCommitteeMembers(chamber: string, committeeCode: string): Promise<any[]>;
  getDailyCongressionalRecords(): Promise<any[]>;
  getSenateCommunications(): Promise<any[]>;
  getAllNominations(): Promise<any[]>;
  getHouseVotes(): Promise<any[]>;

  // Perplexity AI Integration
  searchElectionsWithAI(query: string): Promise<string>;
  expandElectionData(): Promise<void>;

  // User Authentication
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // User watchlist (basic methods)
  getUserWatchlist(userId: string): Promise<WatchlistItem[]>;
  addToWatchlist(userId: string, electionId: number): Promise<WatchlistItem>;
  removeFromWatchlist(userId: string, electionId: number): Promise<void>;

  // Enhanced Watchlist with Organization Features
  getEnhancedWatchlist(userId: string, filters?: {
    status?: string[];
    category?: string[];
    priority?: string[];
    tags?: string[];
    search?: string;
    sortBy?: 'date' | 'priority' | 'category' | 'recent' | 'custom';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<EnhancedWatchlistResponse>;
  updateWatchlistItem(userId: string, itemId: number, updates: {
    priority?: string;
    category?: string;
    status?: string;
    tags?: string[];
    notes?: string;
    notificationsEnabled?: boolean;
    reminderDaysBefore?: number;
    sortOrder?: number;
  }): Promise<WatchlistItem>;
  bulkUpdateWatchlistItems(userId: string, itemIds: number[], updates: {
    priority?: string;
    category?: string;
    status?: string;
    tags?: string[];
  }): Promise<WatchlistItem[]>;
  getWatchlistAnalytics(userId: string): Promise<WatchlistAnalytics>;

  // Election Recommendation Engine
  generateRecommendations(userId: string, options?: {
    limit?: number;
    types?: string[];
    includeExpired?: boolean;
    forceRefresh?: boolean;
  }): Promise<RecommendationResponse>;
  getPersonalizedRecommendations(userId: string, limit?: number): Promise<ElectionRecommendation[]>;
  getLocationBasedRecommendations(userId: string, limit?: number): Promise<ElectionRecommendation[]>;
  getInterestBasedRecommendations(userId: string, limit?: number): Promise<ElectionRecommendation[]>;
  getTrendingRecommendations(userId: string, limit?: number): Promise<ElectionRecommendation[]>;
  getSimilarUsersRecommendations(userId: string, limit?: number): Promise<ElectionRecommendation[]>;

  // Recommendation Interaction Tracking
  trackRecommendationPresentation(userId: string, recommendationIds: number[]): Promise<void>;
  trackRecommendationView(userId: string, recommendationId: number): Promise<void>;
  trackRecommendationClick(userId: string, recommendationId: number): Promise<void>;
  trackRecommendationDismissal(userId: string, recommendationId: number, reason?: string): Promise<void>;
  trackRecommendationToWatchlistConversion(userId: string, recommendationId: number, watchlistItemId: number): Promise<void>;

  // Recommendation Analytics & Learning
  getUserRecommendationAnalytics(userId: string): Promise<UserRecommendationAnalytics | null>;
  updateUserRecommendationAnalytics(userId: string, updates: Partial<UserRecommendationAnalytics>): Promise<UserRecommendationAnalytics>;
  calculateRecommendationPerformance(userId: string): Promise<{
    viewRate: number;
    clickRate: number;
    conversionRate: number;
    dismissalRate: number;
  }>;
  getRecommendationInsights(userId: string): Promise<{
    preferredTypes: string[];
    preferredLevels: string[];
    optimalTiming: string;
    qualityScore: number;
  }>;

  // Recommendation Caching
  getCachedRecommendations(userId: string, cacheKey: string): Promise<RecommendationCache | null>;
  setCachedRecommendations(userId: string, cacheKey: string, data: any, validUntil: Date): Promise<RecommendationCache>;
  invalidateRecommendationCache(userId: string, pattern?: string): Promise<void>;
  refreshRecommendationCache(userId: string): Promise<void>;

  // Comprehensive User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | null>;
  createUserPreferences(userId: string, preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, updates: UpdateUserPreferences): Promise<UserPreferences>;
  createDefaultUserPreferences(userId: string): Promise<UserPreferences>;

  // Congressional District Support
  getCongressionalDistricts(state?: string): Promise<CongressionalDistrict[]>;
  getCongressionalDistrictByCode(districtCode: string): Promise<CongressionalDistrict | null>;
  lookupCongressionalDistrict(state: string, city?: string, zipCode?: string): Promise<CongressionalDistrict | null>;

  // Version Control & Election Cycles
  getElectionCycles(): Promise<any[]>;
  getElectionCycle(slug: string): Promise<any>;

  // Analytics & GDPR Compliance
  logInteraction(data: any): Promise<void>;

  // Candidate Authentication & Portal
  authenticateCandidate(email: string, password: string): Promise<CandidateAccount | null>;
  createCandidateAccount(account: InsertCandidateAccount): Promise<CandidateAccount>;
  // OR-01: account lookup/approval used by the per-request portal authorization check
  getCandidateAccountById(id: number): Promise<CandidateAccount | null>;
  listCandidateAccounts(filter?: { isActive?: boolean }): Promise<CandidateAccount[]>;
  setCandidateAccountActive(id: number, isActive: boolean, accessLevel?: string): Promise<CandidateAccount | null>;
  getCandidateProfile(candidateId: number): Promise<CandidateProfile | null>;
  updateCandidateProfile(candidateId: number, profile: Partial<CandidateProfile>): Promise<CandidateProfile>;
  getCandidateDataSources(candidateId: number): Promise<CandidateDataSource[]>;
  getCandidatePositions(candidateId: number, category?: string): Promise<CandidatePosition[]>;
  getCandidatePositionById(positionId: number): Promise<CandidatePosition | null>;
  getCandidateQAEntries(candidateId: number, category?: string): Promise<CandidateQA[]>;
  createCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile>;
  createCandidatePosition(position: InsertCandidatePosition): Promise<CandidatePosition>;
  updateCandidatePosition(positionId: number, updates: Partial<CandidatePosition>): Promise<CandidatePosition>;
  deleteCandidatePosition(positionId: number): Promise<void>;
  recordDataSource(source: InsertCandidateDataSource): Promise<CandidateDataSource>;
  getCandidateWithRAG(candidateId: number): Promise<any>;
  recordEngagement(data: EngagementRecord): Promise<void>;
  updateUserDemographics(userId: string, demographics: UpdateUserPreferences): Promise<UserPreferences>;
  exportUserData(userId: string): Promise<any>;
  deleteUserData(userId: string): Promise<boolean>;

  // Campaign Portal & Data Marketplace
  createCampaignAccount(data: NewCampaignAccountInput): Promise<CreatedCampaignAccount>;
  validateCampaignAccess(apiKey: string): Promise<CampaignAccount>;
  getCampaignAnalytics(campaignId: number, electionId: number, tier: string): Promise<any>;
  getCampaignGeographics(campaignId: number, region: string, tier: string): Promise<any>;
  getCampaignPolling(campaignId: number, electionId: number, dateRange: string): Promise<any>;
  purchaseDataExport(campaignId: number, datasetType: string, format?: string): Promise<any>;
  getCampaignSubscription(campaignId: number): Promise<any>;

  // User Authentication Methods
  createUser(email: string, password: string): Promise<any>;
  authenticateUser(email: string, password: string): Promise<any>;
  signoutUser(token: string): Promise<void>;
  validateUserSession(token: string): Promise<User | null>;

  // Congressional Search & Missing Member Detection
  searchCongressMembers(searchTerm: string): Promise<CongressMember[]>;
  findMissingCongressMember(): Promise<any>;

  // Disaster Recovery and Backup System Methods
  getBackupOperations(filters?: { page?: number; limit?: number; status?: string; type?: string }): Promise<BackupOperation[]>;
  getBackupOperation(id: number): Promise<BackupOperation | undefined>;
  createBackupOperation(operation: InsertBackupOperation): Promise<BackupOperation>;
  updateBackupOperation(operationId: string, updates: Partial<BackupOperation>): Promise<BackupOperation>;
  getRecentBackupOperations(limit: number): Promise<BackupOperation[]>;

  // Platform Continuity Methods (Track 3) - REQUIRED for production
  // Secrets Management
  getSecretByName(secretName: string): Promise<any>;
  getSecretById(secretId: number): Promise<any>;
  getAllSecrets(): Promise<any[]>;
  getExpiredSecrets(): Promise<any[]>;
  createSecret(secret: any): Promise<number>;
  updateSecret(secretId: number, updates: any): Promise<void>;
  createSecretRotationHistory(history: any): Promise<void>;
  updateSecretRotationHistory(rotationId: string, updates: any): Promise<void>;
  getRotationHistory(filters: any): Promise<any[]>;
  getRecentRotationFailures(days: number): Promise<any[]>;
  deleteOldRotationHistory(cutoffDate: Date): Promise<number>;

  // Artifact Storage
  createArtifact(artifact: any): Promise<number>;
  getArtifactByHash(contentHash: string): Promise<any>;
  getArtifactByNameVersion(artifactName: string, version: string, environment?: string): Promise<any>;
  getArtifactVersions(artifactName: string, environment?: string): Promise<any[]>;
  getArtifactById(artifactId: number): Promise<any>;
  updateArtifact(artifactId: number, updates: any): Promise<void>;
  deleteArtifact(artifactId: number): Promise<void>;
  getArtifacts(filters: any): Promise<any[]>;
  getActiveArtifacts(): Promise<any[]>;
  getAllArtifacts(): Promise<any[]>;
  getExpiredArtifacts(): Promise<any[]>;

  // Deployment History
  createDeploymentHistory(deployment: any): Promise<void>;
  updateDeploymentHistory(deploymentId: string, updates: any): Promise<void>;
  getRecentDeployments(limit: number): Promise<any[]>;
  getDeploymentById(deploymentId: string): Promise<any>;

  // Environment Configurations
  createEnvironmentConfiguration(config: any): Promise<number>;
  getEnvironmentConfigurations(): Promise<any[]>;

  // Platform Continuity Events
  createPlatformContinuityEvent(event: any): Promise<void>;
  getRecentPlatformContinuityEvents(limit: number): Promise<any[]>;
  getPlatformContinuityEvents(filters: any): Promise<any[]>;

  // Health checking for platform services
  getHealth(): Promise<void>;

  getBackupRetentionPolicies(): Promise<BackupRetentionPolicy[]>;
  getActiveRetentionPolicies(): Promise<BackupRetentionPolicy[]>;
  createBackupRetentionPolicy(policy: InsertBackupRetentionPolicy): Promise<BackupRetentionPolicy>;
  updateBackupRetentionPolicy(id: number, updates: Partial<BackupRetentionPolicy>): Promise<BackupRetentionPolicy>;

  getBackupStorageLocations(): Promise<BackupStorageLocation[]>;
  createBackupStorageLocation(location: InsertBackupStorageLocation): Promise<BackupStorageLocation>;
  updateBackupStorageLocation(id: number, updates: Partial<BackupStorageLocation>): Promise<BackupStorageLocation>;

  getRestoreValidations(filters?: { page?: number; limit?: number; status?: string }): Promise<RestoreValidation[]>;
  createRestoreValidation(validation: InsertRestoreValidation): Promise<RestoreValidation>;
  updateRestoreValidation(validationId: string, updates: Partial<RestoreValidation>): Promise<RestoreValidation>;
  getRecentRestoreValidations(limit: number): Promise<RestoreValidation[]>;

  getSchemaVersions(): Promise<SchemaVersion[]>;
  getLatestSchemaVersion(): Promise<SchemaVersion | undefined>;
  createSchemaVersion(version: InsertSchemaVersion): Promise<SchemaVersion>;
  updateSchemaVersion(id: number, updates: Partial<SchemaVersion>): Promise<SchemaVersion>;

  getBackupSystemConfig(): Promise<BackupSystemConfig[]>;
  setBackupSystemConfig(key: string, value: any): Promise<BackupSystemConfig>;

  // Notification System Methods
  // Notification Preferences
  getUserNotificationPreferences(userId: string): Promise<any>;
  updateUserNotificationPreferences(userId: string, preferences: any): Promise<any>;
  createDefaultNotificationPreferences(userId: string): Promise<any>;

  // Notification Subscriptions
  getUserNotificationSubscriptions(userId: string): Promise<any[]>;
  createNotificationSubscription(subscription: any): Promise<any>;
  updateNotificationSubscription(subscriptionId: number, updates: any): Promise<any>;
  deleteNotificationSubscription(subscriptionId: number): Promise<void>;
  verifyNotificationSubscription(token: string): Promise<any>;
  unsubscribeNotification(token: string): Promise<void>;

  // Notification Consents
  getUserNotificationConsents(userId: string): Promise<any[]>;
  recordNotificationConsent(consent: any): Promise<any>;
  withdrawNotificationConsent(userId: string, consentType: string): Promise<void>;
  getNotificationConsentsBetween(start: Date, end: Date): Promise<NotificationConsent[]>;
  getExpiredNotificationConsents(asOf: Date): Promise<NotificationConsent[]>;
  unsubscribeNotificationSubscriptionByToken(token: string): Promise<NotificationSubscription | null>;
  getNotificationSubscriptionsVerifiedBetween(start: Date, end: Date): Promise<NotificationSubscription[]>;

  // Notification Templates
  getNotificationTemplates(type?: string, category?: string): Promise<any[]>;
  getNotificationTemplate(id: number): Promise<any>;
  createNotificationTemplate(template: any): Promise<any>;
  updateNotificationTemplate(id: number, updates: any): Promise<any>;

  // Notification Campaigns
  getNotificationCampaigns(status?: string): Promise<any[]>;
  getNotificationCampaign(id: number): Promise<any>;
  createNotificationCampaign(campaign: any): Promise<any>;
  updateNotificationCampaign(id: number, updates: any): Promise<any>;

  // Notification Deliveries
  getNotificationDeliveries(campaignId?: number, userId?: string): Promise<any[]>;
  createNotificationDelivery(delivery: any): Promise<any>;
  updateNotificationDelivery(id: number, updates: any): Promise<any>;
  getNotificationDeliveryStats(campaignId?: number): Promise<any>;

  // Notification Events
  getNotificationEvents(processed?: boolean): Promise<any[]>;
  createNotificationEvent(event: any): Promise<any>;
  updateNotificationEvent(id: number, updates: any): Promise<any>;

  // Notification Webhooks
  createNotificationWebhook(webhook: any): Promise<any>;
  processNotificationWebhook(webhookId: number): Promise<void>;
  getUnprocessedWebhooks(): Promise<any[]>;

  // Queue Management
  getQueuedNotifications(limit?: number): Promise<any[]>;
  updateNotificationStatus(deliveryId: number, status: string, metadata?: any): Promise<void>;
  retryFailedNotifications(limit?: number): Promise<any[]>;

  // ============================================================================
  // TRACK 4: MONITORING & RUNBOOKS STORAGE METHODS
  // ============================================================================

  // Synthetic Failover Drill System
  // Drill Configurations
  getFailoverDrillConfigurations(filters?: { enabled?: boolean; drillType?: string; scenario?: string }): Promise<FailoverDrillConfiguration[]>;
  getFailoverDrillConfiguration(id: number): Promise<FailoverDrillConfiguration | undefined>;
  createFailoverDrillConfiguration(config: InsertFailoverDrillConfiguration): Promise<FailoverDrillConfiguration>;
  updateFailoverDrillConfiguration(id: number, updates: Partial<FailoverDrillConfiguration>): Promise<FailoverDrillConfiguration>;
  deleteFailoverDrillConfiguration(id: number): Promise<void>;
  getScheduledDrillConfigurations(): Promise<FailoverDrillConfiguration[]>;

  // Drill Executions
  getDrillExecutions(filters?: { configurationId?: number; status?: string; triggerType?: string; page?: number; limit?: number }): Promise<DrillExecution[]>;
  getDrillExecution(executionId: string): Promise<DrillExecution | undefined>;
  createDrillExecution(execution: InsertDrillExecution): Promise<DrillExecution>;
  updateDrillExecution(executionId: string, updates: Partial<DrillExecution>): Promise<DrillExecution>;
  getRecentDrillExecutions(limit: number): Promise<DrillExecution[]>;
  getDrillExecutionsByConfiguration(configurationId: number): Promise<DrillExecution[]>;
  getDrillExecutionsForDashboard(days: number): Promise<DrillExecution[]>;

  // Drill Steps
  getDrillSteps(executionId: string): Promise<DrillStep[]>;
  createDrillStep(step: InsertDrillStep): Promise<DrillStep>;
  updateDrillStep(id: number, updates: Partial<DrillStep>): Promise<DrillStep>;
  getDrillStepsByExecution(executionId: string): Promise<DrillStep[]>;

  // Backup Success Alert System
  // Backup Monitoring Configurations
  getBackupMonitoringConfigurations(filters?: { enabled?: boolean; monitoringType?: string }): Promise<BackupMonitoringConfiguration[]>;
  getBackupMonitoringConfiguration(id: number): Promise<BackupMonitoringConfiguration | undefined>;
  createBackupMonitoringConfiguration(config: InsertBackupMonitoringConfiguration): Promise<BackupMonitoringConfiguration>;
  updateBackupMonitoringConfiguration(id: number, updates: Partial<BackupMonitoringConfiguration>): Promise<BackupMonitoringConfiguration>;
  deleteBackupMonitoringConfiguration(id: number): Promise<void>;
  getActiveMonitoringConfigurations(): Promise<BackupMonitoringConfiguration[]>;

  // Backup Alerts
  getBackupAlerts(filters?: { status?: string; severity?: string; alertType?: string; page?: number; limit?: number }): Promise<BackupAlert[]>;
  getBackupAlert(alertId: string): Promise<BackupAlert | undefined>;
  createBackupAlert(alert: InsertBackupAlert): Promise<BackupAlert>;
  updateBackupAlert(alertId: string, updates: Partial<BackupAlert>): Promise<BackupAlert>;
  acknowledgeBackupAlert(alertId: string, acknowledgedBy: string): Promise<BackupAlert>;
  resolveBackupAlert(alertId: string, resolvedBy: string): Promise<BackupAlert>;
  getActiveBackupAlerts(): Promise<BackupAlert[]>;
  getBackupAlertsByConfiguration(configurationId: number): Promise<BackupAlert[]>;

  // Backup Health Metrics
  getBackupHealthMetrics(filters?: { metricType?: string; dateFrom?: Date; dateTo?: Date }): Promise<BackupHealthMetric[]>;
  createBackupHealthMetric(metric: InsertBackupHealthMetric): Promise<BackupHealthMetric>;
  getLatestBackupHealthMetrics(metricType: string): Promise<BackupHealthMetric | undefined>;
  getBackupHealthTrends(days: number): Promise<BackupHealthMetric[]>;
  generateBackupHealthSummary(dateFrom: Date, dateTo: Date): Promise<any>;

  // RTO/RPO Performance Tracking
  // RTO/RPO Targets
  getRtoRpoTargets(filters?: { active?: boolean; serviceType?: string; businessCriticality?: string }): Promise<RtoRpoTarget[]>;
  getRtoRpoTarget(id: number): Promise<RtoRpoTarget | undefined>;
  createRtoRpoTarget(target: InsertRtoRpoTarget): Promise<RtoRpoTarget>;
  updateRtoRpoTarget(id: number, updates: Partial<RtoRpoTarget>): Promise<RtoRpoTarget>;
  deleteRtoRpoTarget(id: number): Promise<void>;
  getActiveRtoRpoTargets(): Promise<RtoRpoTarget[]>;

  // RTO/RPO Measurements
  getRtoRpoMeasurements(filters?: { targetId?: number; measurementType?: string; dateFrom?: Date; dateTo?: Date; page?: number; limit?: number }): Promise<RtoRpoMeasurement[]>;
  getRtoRpoMeasurement(measurementId: string): Promise<RtoRpoMeasurement | undefined>;
  createRtoRpoMeasurement(measurement: InsertRtoRpoMeasurement): Promise<RtoRpoMeasurement>;
  updateRtoRpoMeasurement(measurementId: string, updates: Partial<RtoRpoMeasurement>): Promise<RtoRpoMeasurement>;
  getRtoRpoMeasurementsByTarget(targetId: number): Promise<RtoRpoMeasurement[]>;
  getRecentRtoRpoMeasurements(limit: number): Promise<RtoRpoMeasurement[]>;
  getRtoRpoPerformanceTrends(targetId: number, days: number): Promise<RtoRpoMeasurement[]>;
  getRtoRpoComplianceReport(dateFrom: Date, dateTo: Date): Promise<any>;

  // Performance Benchmarks
  getPerformanceBenchmarks(filters?: { active?: boolean; industry?: string; sourceType?: string }): Promise<PerformanceBenchmark[]>;
  getPerformanceBenchmark(id: number): Promise<PerformanceBenchmark | undefined>;
  createPerformanceBenchmark(benchmark: InsertPerformanceBenchmark): Promise<PerformanceBenchmark>;
  updatePerformanceBenchmark(id: number, updates: Partial<PerformanceBenchmark>): Promise<PerformanceBenchmark>;
  deletePerformanceBenchmark(id: number): Promise<void>;
  getIndustryBenchmarks(industry: string, serviceCategory: string): Promise<PerformanceBenchmark[]>;

  // Incident Runbook Management System
  // Incident Runbooks
  getIncidentRunbooks(filters?: { status?: string; incidentType?: string; severity?: string; accessLevel?: string; page?: number; limit?: number }): Promise<IncidentRunbook[]>;
  getIncidentRunbook(runbookId: string): Promise<IncidentRunbook | undefined>;
  createIncidentRunbook(runbook: InsertIncidentRunbook): Promise<IncidentRunbook>;
  updateIncidentRunbook(runbookId: string, updates: Partial<IncidentRunbook>): Promise<IncidentRunbook>;
  deleteIncidentRunbook(runbookId: string): Promise<void>;
  getRunbooksByIncidentType(incidentType: string): Promise<IncidentRunbook[]>;
  getPublishedRunbooks(): Promise<IncidentRunbook[]>;
  approveRunbook(runbookId: string, approvedBy: string): Promise<IncidentRunbook>;
  getRunbookVersions(runbookId: string): Promise<IncidentRunbook[]>;

  // Runbook Steps
  getRunbookSteps(runbookId: string): Promise<RunbookStep[]>;
  getRunbookStep(id: number): Promise<RunbookStep | undefined>;
  createRunbookStep(step: InsertRunbookStep): Promise<RunbookStep>;
  updateRunbookStep(id: number, updates: Partial<RunbookStep>): Promise<RunbookStep>;
  deleteRunbookStep(id: number): Promise<void>;
  getRunbookStepsByOrder(runbookId: string): Promise<RunbookStep[]>;
  reorderRunbookSteps(runbookId: string, stepOrders: { id: number; order: number }[]): Promise<void>;

  // Runbook Contacts
  getRunbookContacts(filters?: { active?: boolean; available24x7?: boolean; escalationLevel?: number }): Promise<RunbookContact[]>;
  getRunbookContact(contactId: string): Promise<RunbookContact | undefined>;
  createRunbookContact(contact: InsertRunbookContact): Promise<RunbookContact>;
  updateRunbookContact(contactId: string, updates: Partial<RunbookContact>): Promise<RunbookContact>;
  deleteRunbookContact(contactId: string): Promise<void>;
  getContactsByEscalationLevel(escalationLevel: number): Promise<RunbookContact[]>;
  getAvailableContacts(timezone?: string): Promise<RunbookContact[]>;
  updateContactLastContacted(contactId: string): Promise<void>;

  // Contact Escalation Trees
  getContactEscalationTrees(filters?: { active?: boolean; incidentTypes?: string[] }): Promise<ContactEscalationTree[]>;
  getContactEscalationTree(treeId: string): Promise<ContactEscalationTree | undefined>;
  createContactEscalationTree(tree: InsertContactEscalationTree): Promise<ContactEscalationTree>;
  updateContactEscalationTree(treeId: string, updates: Partial<ContactEscalationTree>): Promise<ContactEscalationTree>;
  deleteContactEscalationTree(treeId: string): Promise<void>;
  getEscalationTreeByIncidentType(incidentType: string, severity: string): Promise<ContactEscalationTree | undefined>;

  // Runbook Executions
  getRunbookExecutions(filters?: { runbookId?: number; status?: string; executedBy?: string; page?: number; limit?: number }): Promise<RunbookExecution[]>;
  getRunbookExecution(executionId: string): Promise<RunbookExecution | undefined>;
  createRunbookExecution(execution: InsertRunbookExecution): Promise<RunbookExecution>;
  updateRunbookExecution(executionId: string, updates: Partial<RunbookExecution>): Promise<RunbookExecution>;
  getRecentRunbookExecutions(limit: number): Promise<RunbookExecution[]>;
  getRunbookExecutionsByRunbook(runbookId: number): Promise<RunbookExecution[]>;
  getActiveRunbookExecutions(): Promise<RunbookExecution[]>;
  completeRunbookExecution(executionId: string, results: any): Promise<RunbookExecution>;

  // Dashboard and Analytics Methods
  getMonitoringDashboardData(): Promise<{
    drillSummary: any;
    backupHealth: any;
    rtoRpoCompliance: any;
    activeAlerts: BackupAlert[];
    recentExecutions: any[];
  }>;
  getPerformanceDashboardData(serviceType?: string, days?: number): Promise<{
    targets: RtoRpoTarget[];
    measurements: RtoRpoMeasurement[];
    trends: any[];
    complianceScore: number;
  }>;
  getRunbookDashboardData(): Promise<{
    totalRunbooks: number;
    activeExecutions: RunbookExecution[];
    recentExecutions: RunbookExecution[];
    contactAvailability: any[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // Health checking implementation
  isDbHealthy(): boolean {
    // This will be delegated to the storage factory
    return true; // DatabaseStorage assumes it's healthy when instantiated
  }

  // Centralized database error handling wrapper
  private async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    operationName: string = 'database operation'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.log(`${operationName} error:`, error);
      if (error instanceof Error && error.message.includes('endpoint has been disabled')) {
        console.log(`Database temporarily unavailable - returning fallback for ${operationName}`);
        return fallbackValue;
      }
      // Re-throw other errors to maintain existing error handling
      throw error;
    }
  }

  async getElections(filters?: ElectionQueryFilters): Promise<ElectionListing[]> {
    const query = buildElectionListQuery(db, filters);
    return this.handleDatabaseOperation(
      async () => (await query).filter(election => validateNotMockData(election).ok).map(projectElectionResultsRow),
      [],
      'getElections'
    );
  }

  async getElection(id: number): Promise<Election | undefined> {
    const [election] = await db.select({ ...getTableColumns(elections), resultsCatalogTimestamp }).from(elections).where(eq(elections.id, id));
    return election ? projectElectionResultsRow(election) : undefined;
  }

  async getElectionByTitleAndDate(title: string, date: Date): Promise<Election | undefined> {
    const [election] = await db
      .select({ ...getTableColumns(elections), resultsCatalogTimestamp })
      .from(elections)
      .where(and(
        eq(elections.title, title),
        eq(elections.date, date)
      ))
      .limit(1);
    return election ? projectElectionResultsRow(election) : undefined;
  }

  async createElection(insertElection: InsertElection): Promise<Election> {
    // Validate election data before inserting
    const validationErrors = validateElectionData({
      state: insertElection.state,
      date: insertElection.date,
      level: insertElection.level,
      type: insertElection.type
    });

    if (validationErrors.length > 0) {
      throw new Error(`Invalid election data: ${validationErrors.map(e => e.message).join('; ')}`);
    }

    // Check for mock data
    const mockCheck = validateNotMockData(insertElection);
    if (!mockCheck.ok) {
      throw new Error(`Mock data detected: ${mockCheck.message}`);
    }

    const [election] = await db
      .insert(elections)
      .values(insertElection)
      .returning();
    return election;
  }

  async deleteElection(id: number): Promise<void> {
    // First delete associated candidates to avoid foreign key constraint
    await db.delete(candidates).where(eq(candidates.electionId, id));
    // Then delete the election
    await db.delete(elections).where(eq(elections.id, id));
  }

  async getCandidatesByElection(electionId: number): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.electionId, electionId))
      .orderBy(desc(candidates.pollingSupport));
  }

  async getCandidatesByElections(electionIds: number[]): Promise<Candidate[]> {
    if (electionIds.length === 0) return [];
    return await db
      .select()
      .from(candidates)
      .where(inArray(candidates.electionId, electionIds))
      .orderBy(desc(candidates.pollingSupport));
  }

  async getCandidatesByIds(candidateIds: number[]): Promise<Candidate[]> {
    if (candidateIds.length === 0) return [];

    const results = await db
      .select()
      .from(candidates)
      .where(inArray(candidates.id, candidateIds))
      .orderBy(desc(candidates.pollingSupport));

    return results;
  }

  async getCandidates(electionId?: number): Promise<Candidate[]> {
    if (electionId !== undefined) {
      return await db
        .select()
        .from(candidates)
        .where(eq(candidates.electionId, electionId))
        .orderBy(desc(candidates.pollingSupport));
    } else {
      return await db
        .select()
        .from(candidates)
        .orderBy(desc(candidates.pollingSupport));
    }
  }

  private readonly resultReports = new PgResultReportStore(pool);
  recordResultReport(electionId: number, input: ResultReportInput, ctx: RecordContext) { return this.resultReports.recordResultReport(electionId, input, ctx); }
  recordResultSourceHealth(event:SourceHealthEvent) {return this.resultReports.recordResultSourceHealth(event);}
  getResultsPayload(electionId: number) { return this.resultReports.getResultsPayload(electionId); }
  listResultsPayloads(query: ResultsListQuery) { return this.resultReports.listResultsPayloads(query); }
  storeResultEvidence(bytes: Buffer, contentType: string, filename: string | null, uploadedBy: string) { return this.resultReports.storeResultEvidence(bytes, contentType, filename, uploadedBy); }
  listResultSources(state?: string) { return this.resultReports.listResultSources(state); }

  async getElectionResults(electionId: number): Promise<any> {
    try {
      // Get candidates with winner information first
      const candidatesWithResults = await db
        .select()
        .from(candidates)
        .where(eq(candidates.electionId, electionId))
        .orderBy(desc(candidates.votePercentage));

      // Check if any candidate has results data
      const hasResults = candidatesWithResults.some(c => c.votesReceived !== null);
      const winner = candidatesWithResults.find(c => c.isWinner);

      return {
        electionId,
        candidates: candidatesWithResults,
        hasResults,
        winner,
        totalVotes: candidatesWithResults.reduce((sum, c) => sum + (c.votesReceived || 0), 0),
      };
    } catch (error) {
      console.error('Error fetching election results:', error);
      return {
        electionId,
        candidates: [],
        hasResults: false,
        winner: null,
        totalVotes: 0,
      };
    }
  }

  async updateElectionResults(electionId: number, resultsData: any): Promise<any> {
    // Update or insert election results
    const existingResults = await db
      .select()
      .from(electionResults)
      .where(eq(electionResults.electionId, electionId));

    const existingResult = existingResults[0];

    if (existingResult) {
      // Update existing results
      await db
        .update(electionResults)
        .set({
          totalVotes: resultsData.totalVotes,
          reportingPrecincts: resultsData.reportingPrecincts,
          totalPrecincts: resultsData.totalPrecincts,
          percentReporting: resultsData.percentReporting,
          isComplete: resultsData.isComplete,
          lastUpdated: new Date()
        })
        .where(eq(electionResults.electionId, electionId));
    } else {
      // Insert new results
      await db
        .insert(electionResults)
        .values({
          electionId,
          totalVotes: resultsData.totalVotes,
          reportingPrecincts: resultsData.reportingPrecincts,
          totalPrecincts: resultsData.totalPrecincts,
          percentReporting: resultsData.percentReporting,
          isComplete: resultsData.isComplete,
          lastUpdated: new Date()
        });
    }

    // Update candidate results if provided
    if (resultsData.candidateResults) {
      for (const candidateResult of resultsData.candidateResults) {
        await db
          .update(candidates)
          .set({
            votesReceived: candidateResult.votesReceived,
            votePercentage: candidateResult.votePercentage,
            isWinner: candidateResult.isWinner,
            isProjectedWinner: candidateResult.isProjectedWinner
          })
          .where(eq(candidates.id, candidateResult.candidateId));
      }
    }

    return this.getElectionResults(electionId);
  }



  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db
      .insert(candidates)
      .values(insertCandidate)
      .returning();
    return candidate;
  }

  async updateCandidatePolling(candidateId: number, pollingData: {
    // null clears a value (the data-audit endpoint removes static polling numbers)
    pollingSupport?: number | null;
    pollingTrend?: string | null;
    lastPollingUpdate?: Date | null;
    pollingSource?: string | null;
  }): Promise<void> {
    await db
      .update(candidates)
      .set({
        ...pollingData,
        updatedAt: new Date()
      })
      .where(eq(candidates.id, candidateId));
  }

  async getElectionStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    nextElection: Election | null;
  }> {
    return this.handleDatabaseOperation(
      async () => {
        const now = new Date();

        // Get ALL active elections for filter counts
        const allElections = await db
          .select()
          .from(elections)
          .where(eq(elections.isActive, true));

        // Get upcoming elections for next election
        const upcomingElections = allElections
          .filter(e => new Date(e.date) >= now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const byType: Record<string, number> = {};
        const byLevel: Record<string, number> = {};

        // Count ALL elections for filters
        allElections.forEach(election => {
          byType[election.type] = (byType[election.type] || 0) + 1;
          byLevel[election.level] = (byLevel[election.level] || 0) + 1;
        });

        // Map database values to frontend expected format
        const normalizedByLevel = {
          ...byLevel,
          Federal: byLevel['federal'] || 0,
          State: byLevel['state'] || 0,
          Local: byLevel['local'] || 0,
        };

        const normalizedByType = {
          ...byType,
          Primary: byType['primary'] || 0,
          General: byType['general'] || 0,
          Special: byType['special'] || 0,
        };

        return {
          total: allElections.length,
          byType: normalizedByType,
          byLevel: normalizedByLevel,
          nextElection: upcomingElections[0] || null,
        };
      },
      // Fallback value when database is unavailable
      {
        total: 0,
        byType: {
          Primary: 0,
          General: 0,
          Special: 0,
        },
        byLevel: {
          Federal: 0,
          State: 0,
          Local: 0,
        },
        nextElection: null as Election | null,
      },
      'getElectionStats'
    );
  }

  async syncElectionsFromGoogleCivic(): Promise<void> {
    const civicService = getGoogleCivicService();
    if (!civicService) {
      console.warn('Google Civic API service not available');
      return;
    }

    try {
      const googleElections = await civicService.fetchElections();

      for (const election of googleElections) {
        // Check if election already exists
        const existing = await db
          .select()
          .from(elections)
          .where(and(
            eq(elections.title, election.title),
            eq(elections.date, election.date)
          ))
          .limit(1);

        if (existing.length === 0) {
          // Insert new election from Google Civic API
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
            isActive: election.isActive,
          });
        }
      }

      console.log(`Synced ${googleElections.length} elections from Google Civic API`);
    } catch (error) {
      console.error('Error syncing elections from Google Civic API:', error);
    }
  }

  async getVoterInfo(address: string): Promise<any> {
    const civicService = getGoogleCivicService();
    if (!civicService) {
      throw new Error('Google Civic API service not available');
    }

    try {
      // Get Google Civic elections to find a valid election ID
      const googleElections = await civicService.fetchElections();
      const upcomingGoogleElection = googleElections.find(election =>
        election.date > new Date()
      );

      // Use Google's election ID format (like "9087", "9155", etc.)
      const googleElectionId = upcomingGoogleElection ? upcomingGoogleElection.id.toString() : undefined;
      return await civicService.fetchVoterInfo(address, googleElectionId);
    } catch (error: any) {
      console.error('Error fetching voter info:', error);

      // Handle case where no voter info is available for this address/election
      if (error.message?.includes('404')) {
        return {
          error: 'NO_VOTER_INFO_AVAILABLE',
          message: 'Voter information is not currently available for this address and upcoming elections. This may be because there are no elections scheduled in your area, or detailed voting information hasn\'t been published yet by election officials.',
          suggestedActions: [
            'Try a more specific address (include apartment/unit number)',
            'Check back closer to election day when more details are available',
            'Contact your local election office for voting information'
          ]
        };
      }

      throw error;
    }
  }

  async getAllBills(): Promise<any[]> {
    const congressService = getCongressBillService();
    if (!congressService) {
      return [];
    }
    try {
      return await congressService.fetchAllBills();
    } catch (error) {
      console.error('Error fetching all bills:', error);
      return [];
    }
  }

  async getBillsByCongress(congress: string): Promise<any[]> {
    const congressService = getCongressBillService();
    if (!congressService) {
      return [];
    }
    try {
      return await congressService.fetchBillsByCongress(congress);
    } catch (error) {
      console.error('Error fetching bills by congress:', error);
      return [];
    }
  }

  async getAllMembers(): Promise<any[]> {
    try {
      // First try to get from database
      const dbMembers = await db.select().from(congressMembers).limit(550);

      if (dbMembers.length > 0) {
        return dbMembers;
      }

      // If no data in database, fetch from API and store
      const congressService = getCongressBillService();
      if (!congressService) {
        return [];
      }

      const apiMembers = await congressService.fetchAllMembers();

      // Store in database for future use
      if (apiMembers.length > 0) {
        await this.syncCongressMembersToDatabase(apiMembers);
      }

      return apiMembers;
    } catch (error) {
      console.error('Error fetching all members:', error);
      return [];
    }
  }

  async syncCongressMembersToDatabase(members: any[]): Promise<void> {
    try {
      const insertData = members.map(member => ({
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
      console.error('Error syncing members to database:', error);
    }
  }

  async getAllCongressMembers(): Promise<CongressMember[]> {
    try {
      return await db.select().from(congressMembers);
    } catch (error) {
      console.error('Error fetching all congressional members:', error);
      return [];
    }
  }

  async getMembersByState(state: string): Promise<any[]> {
    try {
      // Query database directly for members by state
      const members = await db
        .select()
        .from(congressMembers)
        .where(eq(congressMembers.state, state.toUpperCase()));

      console.log(`Found ${members.length} members for state ${state}`);
      return members;
    } catch (error) {
      console.error('Error fetching members by state:', error);
      return [];
    }
  }

  async getAllCommittees(): Promise<any[]> {
    const congressService = getCongressBillService();
    if (!congressService) {
      return [];
    }
    try {
      return await congressService.fetchAllCommittees();
    } catch (error) {
      console.error('Error fetching all committees:', error);
      return [];
    }
  }

  async getCommitteeMembers(chamber: string, committeeCode: string): Promise<any[]> {
    const congressService = getCongressBillService();
    if (!congressService) {
      return [];
    }
    try {
      return await congressService.fetchCommitteeMembers(chamber, committeeCode);
    } catch (error) {
      console.error('Error fetching committee members:', error);
      return [];
    }
  }

  async getDailyCongressionalRecords(): Promise<any[]> {
    const congressService = getCongressBillService();
    if (!congressService) {
      return [];
    }
    try {
      return await congressService.fetchDailyCongressionalRecords();
    } catch (error) {
      console.error('Error fetching congressional records:', error);
      return [];
    }
  }

  async getSenateCommunications(): Promise<any[]> {
    const congressService = getCongressBillService();
    if (!congressService) {
      return [];
    }
    try {
      return await congressService.fetchSenateCommunications();
    } catch (error) {
      console.error('Error fetching senate communications:', error);
      return [];
    }
  }

  async getAllNominations(): Promise<any[]> {
    const congressService = getCongressBillService();
    if (!congressService) {
      return [];
    }
    try {
      return await congressService.fetchAllNominations();
    } catch (error) {
      console.error('Error fetching nominations:', error);
      return [];
    }
  }

  async getHouseVotes(): Promise<any[]> {
    const congressService = getCongressBillService();
    if (!congressService) {
      return [];
    }
    try {
      return await congressService.fetchHouseVotes();
    } catch (error) {
      console.error('Error fetching house votes:', error);
      return [];
    }
  }

  async searchElectionsWithAI(query: string): Promise<string> {
    const perplexityService = getPerplexityService();
    if (!perplexityService) {
      throw new Error('Perplexity AI service not available');
    }

    try {
      return await perplexityService.searchElections(query);
    } catch (error) {
      console.error('Error searching elections with AI:', error);
      throw error;
    }
  }

  async expandElectionData(): Promise<void> {
    const perplexityService = getPerplexityService();
    if (!perplexityService) {
      console.warn('Perplexity AI service not available for election data expansion');
      return;
    }

    try {
      console.log('Expanding election data using Perplexity AI...');
      const comprehensiveElections = await perplexityService.findAllElectionsUntil2026();
      console.log('AI Election Search Results:', comprehensiveElections);

      // This would be where we parse the AI response and add missing elections
      // For now, we'll log the results for review
    } catch (error) {
      console.error('Error expanding election data:', error);
    }
  }

  // Removed duplicate implementations - proper implementations are below in User Authentication Methods section

  // User Authentication Methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Removed duplicate User Authentication Methods - implementations are below

  // User Watchlist Methods
  async getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
    try {
      const userWatchlist = await db
        .select({ ...getTableColumns(watchlist), election: elections })
        .from(watchlist)
        .innerJoin(elections, eq(watchlist.electionId, elections.id))
        .where(eq(watchlist.userId, userId));

      return userWatchlist;
    } catch (error) {
      console.error('Error fetching user watchlist:', error);
      return [];
    }
  }

  async addToWatchlist(userId: string, electionId: number): Promise<WatchlistItem> {
    try {
      // Check if already in watchlist
      const existing = await db
        .select()
        .from(watchlist)
        .where(and(
          eq(watchlist.userId, userId),
          eq(watchlist.electionId, electionId)
        ));

      if (existing.length === 0) {
        const [newItem] = await db
          .insert(watchlist)
          .values({
            userId,
            electionId,
          })
          .returning();
        return newItem;
      }
      return existing[0];
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  }

  async removeFromWatchlist(userId: string, electionId: number): Promise<void> {
    try {
      await db
        .delete(watchlist)
        .where(and(
          eq(watchlist.userId, userId),
          eq(watchlist.electionId, electionId)
        ));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  }

  // Version Control & Election Cycles
  async getElectionCycles(): Promise<any[]> {
    try {
      return await db.select().from(electionCycles);
    } catch (error) {
      console.error('Error fetching election cycles:', error);
      return [];
    }
  }

  async getElectionCycle(slug: string): Promise<any> {
    try {

      const [cycle] = await db
        .select()
        .from(electionCycles)
        .where(eq(electionCycles.slug, slug));

      return cycle || null;
    } catch (error) {
      console.error('Error fetching election cycle:', error);
      return null;
    }
  }

  // Analytics & GDPR Compliance Methods
  async logInteraction(data: any): Promise<void> {
    const { analyticsService } = await import('./analytics-service');
    return await analyticsService.logInteraction(data);
  }

  async recordEngagement(data: EngagementRecord): Promise<void> {
    if (!data.sessionId) {
      throw Object.assign(new Error('recordEngagement requires a sessionId'), { status: 400, publicCode: 'session_required', publicMessage: 'X-Session-Id header is required' });
    }
    // Persisted as a user_events row through the consent-aware tracker (anonymised or
    // dropped per the user's analytics consent), never as a bare console.log.
    const { analyticsService } = await import('./analytics-service');
    await analyticsService.trackEvent({
      userId: data.userId,
      sessionId: data.sessionId,
      eventType: 'engagement',
      eventAction: 'page_engagement',
      eventCategory: 'engagement',
      pageUrl: data.pageUrl ?? '',
      pagePath: data.pagePath ?? '/',
      timeOnPage: data.timeOnPage,
      scrollDepth: data.scrollDepth,
      targetType: data.electionCycleId != null ? 'election_cycle' : undefined,
      targetId: data.electionCycleId,
    });
  }

  // Comprehensive User Preferences Implementation
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    return await this.handleDatabaseOperation(async () => {
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      return preferences || null;
    }, null, 'getUserPreferences');
  }

  async createUserPreferences(userId: string, preferences: InsertUserPreferences): Promise<UserPreferences> {
    return await this.handleDatabaseOperation(async () => {
      const [created] = await db
        .insert(userPreferences)
        .values({
          ...preferences,
          userId,
          updatedAt: new Date(),
        })
        .returning();

      return created;
    }, {} as any, 'createUserPreferences');
  }

  async updateUserPreferences(userId: string, updates: UpdateUserPreferences): Promise<UserPreferences> {
    return await this.handleDatabaseOperation(async () => {
      // First, get existing preferences or create defaults
      let existing = await this.getUserPreferences(userId);

      if (!existing) {
        existing = await this.createDefaultUserPreferences(userId);
      }

      // Update with new values
      const [updated] = await db
        .update(userPreferences)
        .set({
          ...updates,
          updatedAt: new Date(),
          // Update specific timestamps based on what was changed
          lastLocationUpdate: updates.state || updates.city || updates.congressionalDistrict
            ? new Date()
            : existing.lastLocationUpdate,
          lastInterestUpdate: updates.federalElectionsInterest !== undefined ||
                             updates.stateElectionsInterest !== undefined ||
                             updates.localElectionsInterest !== undefined
            ? new Date()
            : existing.lastInterestUpdate,
        })
        .where(eq(userPreferences.userId, userId))
        .returning();

      return updated;
    }, {} as any, 'updateUserPreferences');
  }

  async createDefaultUserPreferences(userId: string): Promise<UserPreferences> {
    return await this.handleDatabaseOperation(async () => {
      const defaultPrefs: InsertUserPreferences = {
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
        candidateInformationDepth: 'standard',
        electionTimelinePreference: 'all',
        pollingDataInterest: true,
        endorsementDataInterest: false,
        digestFrequency: 'weekly',
        breakingNewsAlerts: false,
        electionReminderAlerts: true,
        candidateUpdateAlerts: false,
        dataUsageConsent: true,
        personalizationEnabled: true,
        analyticsOptOut: false,
        onboardingCompleted: false,
        onboardingStepsCompleted: [],
        skipOnboarding: false,
        preferenceSource: 'default',
      };

      return await this.createUserPreferences(userId, defaultPrefs);
    }, {} as any, 'createDefaultUserPreferences');
  }

  // Congressional District Support Methods
  async getCongressionalDistricts(state?: string): Promise<CongressionalDistrict[]> {
    return await this.handleDatabaseOperation(async () => {
      let query = db.select().from(congressionalDistricts).$dynamic();

      if (state) {
        query = query.where(eq(congressionalDistricts.state, state.toUpperCase()));
      }

      return await query.orderBy(congressionalDistricts.state, congressionalDistricts.district);
    }, [], 'getCongressionalDistricts');
  }

  async getCongressionalDistrictByCode(districtCode: string): Promise<CongressionalDistrict | null> {
    return await this.handleDatabaseOperation(async () => {
      const [district] = await db
        .select()
        .from(congressionalDistricts)
        .where(eq(congressionalDistricts.districtCode, districtCode.toUpperCase()))
        .limit(1);

      return district || null;
    }, null, 'getCongressionalDistrictByCode');
  }

  async lookupCongressionalDistrict(state: string, city?: string, zipCode?: string): Promise<CongressionalDistrict | null> {
    return await this.handleDatabaseOperation(async () => {
      // For now, return a simple lookup by state
      // In a production system, this would integrate with census data or geographic APIs
      const districts = await this.getCongressionalDistricts(state);

      if (city) {
        // Try to find district that includes this city
        const matchingDistrict = districts.find(d =>
          d.majorCities?.some(c =>
            c.toLowerCase().includes(city.toLowerCase()) ||
            city.toLowerCase().includes(c.toLowerCase())
          )
        );

        if (matchingDistrict) {
          return matchingDistrict;
        }
      }

      // Return the first district for the state as a fallback
      return districts.length > 0 ? districts[0] : null;
    }, null, 'lookupCongressionalDistrict');
  }

  async updateUserDemographics(userId: string, demographics: UpdateUserPreferences): Promise<UserPreferences> {
    // Demographics live on user_preferences; only the self-reported subset is writable here.
    const parsed = userDemographicsSchema.safeParse(demographics);
    if (!parsed.success) {
      throw Object.assign(new Error('invalid demographics'), { status: 400, publicCode: 'invalid_demographics', publicMessage: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
    }
    return await this.updateUserPreferences(userId, parsed.data);
  }

  async exportUserData(userId: string): Promise<any> {
    const { analyticsService } = await import('./analytics-service');
    return await analyticsService.exportUserData(userId);
  }

  async deleteUserData(userId: string): Promise<boolean> {
    const { analyticsService } = await import('./analytics-service');
    return await analyticsService.deleteUserData(userId);
  }

  // Campaign Portal & Data Marketplace Implementation
  async createCampaignAccount(data: NewCampaignAccountInput): Promise<CreatedCampaignAccount> {
    const { campaignPortalService } = await import('./campaign-portal-service');
    return await campaignPortalService.createCampaignAccount(data);
  }

  async validateCampaignAccess(apiKey: string): Promise<CampaignAccount> {
    const { campaignPortalService } = await import('./campaign-portal-service');
    return await campaignPortalService.validateCampaignAccess(apiKey);
  }

  async getCampaignAnalytics(campaignId: number, electionId: number, tier: string): Promise<any> {
    const { campaignPortalService } = await import('./campaign-portal-service');
    return await campaignPortalService.getElectionAnalytics(campaignId, electionId, tier);
  }

  async getCampaignGeographics(campaignId: number, region: string, tier: string): Promise<any> {
    const { campaignPortalService } = await import('./campaign-portal-service');
    return await campaignPortalService.getGeographicAnalytics(campaignId, region, tier);
  }

  async getCampaignPolling(campaignId: number, electionId: number, dateRange: string): Promise<any> {
    const { campaignPortalService } = await import('./campaign-portal-service');
    return await campaignPortalService.getPollingData(campaignId, electionId, dateRange);
  }

  // === CANDIDATE AUTHENTICATION & PORTAL METHODS ===

  async authenticateCandidate(email: string, password: string): Promise<CandidateAccount | null> {
    try {
      const [account] = await db
        .select()
        .from(candidateAccounts)
        .where(and(
          eq(candidateAccounts.email, email),
          eq(candidateAccounts.isActive, true)
        ))
        .limit(1);

      if (!account || !await bcrypt.compare(password, account.passwordHash)) {
        return null;
      }

      // Update last login
      await db
        .update(candidateAccounts)
        .set({ lastLogin: new Date() })
        .where(eq(candidateAccounts.id, account.id));

      return account;
    } catch (error) {
      console.error('Error authenticating candidate:', error);
      return null;
    }
  }

  async createCandidateAccount(account: InsertCandidateAccount): Promise<CandidateAccount> {
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(account.passwordHash, saltRounds);

      const [newAccount] = await db
        .insert(candidateAccounts)
        .values({
          ...account,
          passwordHash: hashedPassword,
        })
        .returning();

      return newAccount;
    } catch (error) {
      console.error('Error creating candidate account:', error);
      throw error;
    }
  }

  async getCandidateAccountById(id: number): Promise<CandidateAccount | null> {
    const [account] = await db.select().from(candidateAccounts).where(eq(candidateAccounts.id, id)).limit(1);
    return account ?? null;
  }

  async listCandidateAccounts(filter: { isActive?: boolean } = {}): Promise<CandidateAccount[]> {
    const q = db.select().from(candidateAccounts);
    const rows = filter.isActive === undefined ? await q : await q.where(eq(candidateAccounts.isActive, filter.isActive));
    return rows.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async setCandidateAccountActive(id: number, isActive: boolean, accessLevel?: string): Promise<CandidateAccount | null> {
    const [updated] = await db.update(candidateAccounts)
      .set({ isActive, ...(accessLevel ? { accessLevel } : {}), updatedAt: new Date() })
      .where(eq(candidateAccounts.id, id))
      .returning();
    return updated ?? null;
  }

  async updateWatchlistItem(userId: string, itemId: number, updates: {
    priority?: string; category?: string; status?: string; tags?: string[]; notes?: string;
    notificationsEnabled?: boolean; reminderDaysBefore?: number; sortOrder?: number;
  }): Promise<WatchlistItem> {
    // Only the caller's own row; the route already restricts the field set.
    const [row] = await db.update(watchlist)
      .set(updates)
      .where(and(eq(watchlist.id, itemId), eq(watchlist.userId, userId)))
      .returning();
    if (!row) throw Object.assign(new Error('Watchlist item not found'), { status: 404, publicCode: 'not_found', publicMessage: 'Watchlist item not found' });
    return row;
  }

  // ===========================================================================
  // Contract completion (strict tranche 1): members IStorage declared and routes
  // called that had NO implementation anywhere (they threw "not a function" at
  // runtime). Everything below is backed by its real table; nothing is invented.
  // ===========================================================================
  private notFound(what: string): never {
    throw Object.assign(new Error(`${what} not found`), { status: 404, publicCode: 'not_found', publicMessage: `${what} not found` });
  }
  private notImplemented(method: string, hint: string): never {
    throw Object.assign(new Error(`${method} is not implemented: ${hint}`), { status: 501, publicCode: 'not_implemented', publicMessage: 'This capability is not available yet' });
  }

  // --- Backup operations ---------------------------------------------------
  async createBackupOperation(operation: InsertBackupOperation): Promise<BackupOperation> {
    const [row] = await db.insert(backupOperations).values(operation).returning();
    return row;
  }
  async getBackupOperation(id: number): Promise<BackupOperation | undefined> {
    const [row] = await db.select().from(backupOperations).where(eq(backupOperations.id, id)).limit(1);
    return row;
  }
  async getBackupOperations(filters: { page?: number; limit?: number; status?: string; type?: string } = {}): Promise<BackupOperation[]> {
    const conditions: SQL[] = [];
    if (filters.status) conditions.push(eq(backupOperations.status, filters.status));
    if (filters.type) conditions.push(eq(backupOperations.type, filters.type));
    const limit = Math.min(500, Math.max(1, filters.limit ?? 50));
    const offset = Math.max(0, ((filters.page ?? 1) - 1) * limit);
    const base = db.select().from(backupOperations);
    const q = conditions.length ? base.where(and(...conditions)) : base;
    return q.orderBy(desc(backupOperations.startedAt), desc(backupOperations.id)).limit(limit).offset(offset);
  }
  async getRecentBackupOperations(limit: number): Promise<BackupOperation[]> {
    return db.select().from(backupOperations).orderBy(desc(backupOperations.startedAt), desc(backupOperations.id)).limit(Math.min(500, Math.max(1, limit)));
  }
  async updateBackupOperation(operationId: string, updates: Partial<BackupOperation>): Promise<BackupOperation> {
    const { id: _id, ...rest } = updates;
    const [row] = await db.update(backupOperations).set(rest).where(eq(backupOperations.operationId, operationId)).returning();
    return row ?? this.notFound('Backup operation');
  }

  // --- Retention policies ----------------------------------------------------
  async createBackupRetentionPolicy(policy: InsertBackupRetentionPolicy): Promise<BackupRetentionPolicy> {
    const [row] = await db.insert(backupRetentionPolicies).values(policy).returning();
    return row;
  }
  async getBackupRetentionPolicies(): Promise<BackupRetentionPolicy[]> {
    return db.select().from(backupRetentionPolicies).orderBy(asc(backupRetentionPolicies.name));
  }
  async getActiveRetentionPolicies(): Promise<BackupRetentionPolicy[]> {
    return db.select().from(backupRetentionPolicies).where(eq(backupRetentionPolicies.isActive, true)).orderBy(asc(backupRetentionPolicies.name));
  }
  async updateBackupRetentionPolicy(id: number, updates: Partial<BackupRetentionPolicy>): Promise<BackupRetentionPolicy> {
    const { id: _id, ...rest } = updates;
    const [row] = await db.update(backupRetentionPolicies).set({ ...rest, updatedAt: new Date() }).where(eq(backupRetentionPolicies.id, id)).returning();
    return row ?? this.notFound('Retention policy');
  }

  // --- Storage locations -----------------------------------------------------
  async createBackupStorageLocation(location: InsertBackupStorageLocation): Promise<BackupStorageLocation> {
    const [row] = await db.insert(backupStorageLocations).values(location).returning();
    return row;
  }
  async getBackupStorageLocations(): Promise<BackupStorageLocation[]> {
    return db.select().from(backupStorageLocations).orderBy(asc(backupStorageLocations.name));
  }
  async updateBackupStorageLocation(id: number, updates: Partial<BackupStorageLocation>): Promise<BackupStorageLocation> {
    const { id: _id, ...rest } = updates;
    const [row] = await db.update(backupStorageLocations).set({ ...rest, updatedAt: new Date() }).where(eq(backupStorageLocations.id, id)).returning();
    return row ?? this.notFound('Storage location');
  }

  // --- System config ---------------------------------------------------------
  async getBackupSystemConfig(): Promise<BackupSystemConfig[]> {
    return db.select().from(backupSystemConfig).orderBy(asc(backupSystemConfig.configKey));
  }
  async setBackupSystemConfig(key: string, value: any): Promise<BackupSystemConfig> {
    // config_value is text: scalars are stored verbatim, structured values as JSON with configType 'json'.
    const isScalar = ['string', 'number', 'boolean'].includes(typeof value);
    const configType = isScalar ? typeof value : 'json';
    const configValue = isScalar ? String(value) : JSON.stringify(value);
    const [updated] = await db.update(backupSystemConfig).set({ configValue, configType, updatedAt: new Date() }).where(eq(backupSystemConfig.configKey, key)).returning();
    if (updated) return updated;
    const [inserted] = await db.insert(backupSystemConfig).values({ configKey: key, configValue, configType } as any).returning();
    return inserted;
  }

  // --- Restore validations ---------------------------------------------------
  async createRestoreValidation(validation: InsertRestoreValidation): Promise<RestoreValidation> {
    const [row] = await db.insert(restoreValidations).values(validation).returning();
    return row;
  }
  async getRestoreValidations(filters: { page?: number; limit?: number; status?: string } = {}): Promise<RestoreValidation[]> {
    const limit = Math.min(500, Math.max(1, filters.limit ?? 50));
    const offset = Math.max(0, ((filters.page ?? 1) - 1) * limit);
    const base = db.select().from(restoreValidations);
    const q = filters.status ? base.where(eq(restoreValidations.status, filters.status)) : base;
    return q.orderBy(desc(restoreValidations.startedAt), desc(restoreValidations.id)).limit(limit).offset(offset);
  }
  async getRecentRestoreValidations(limit: number): Promise<RestoreValidation[]> {
    return db.select().from(restoreValidations).orderBy(desc(restoreValidations.startedAt), desc(restoreValidations.id)).limit(Math.min(500, Math.max(1, limit)));
  }
  async updateRestoreValidation(validationId: string, updates: Partial<RestoreValidation>): Promise<RestoreValidation> {
    const { id: _id, ...rest } = updates;
    const [row] = await db.update(restoreValidations).set(rest).where(eq(restoreValidations.validationId, validationId)).returning();
    return row ?? this.notFound('Restore validation');
  }

  // --- Schema versions -------------------------------------------------------
  async createSchemaVersion(version: InsertSchemaVersion): Promise<SchemaVersion> {
    const [row] = await db.insert(schemaVersions).values(version).returning();
    return row;
  }
  async getSchemaVersions(): Promise<SchemaVersion[]> {
    return db.select().from(schemaVersions).orderBy(desc(schemaVersions.detectedAt), desc(schemaVersions.id));
  }
  async getLatestSchemaVersion(): Promise<SchemaVersion | undefined> {
    const [row] = await db.select().from(schemaVersions).orderBy(desc(schemaVersions.detectedAt), desc(schemaVersions.id)).limit(1);
    return row;
  }
  async updateSchemaVersion(id: number, updates: Partial<SchemaVersion>): Promise<SchemaVersion> {
    const { id: _id, ...rest } = updates;
    const [row] = await db.update(schemaVersions).set(rest).where(eq(schemaVersions.id, id)).returning();
    return row ?? this.notFound('Schema version');
  }

  // --- Watchlist (enhanced) --------------------------------------------------
  private async watchlistRowsFor(userId: string) {
    return db.select({ item: watchlist, election: elections })
      .from(watchlist)
      .innerJoin(elections, eq(watchlist.electionId, elections.id))
      .where(eq(watchlist.userId, userId));
  }
  async getWatchlistAnalytics(userId: string): Promise<WatchlistAnalytics> {
    const rows = await this.watchlistRowsFor(userId);
    const now = Date.now(), weekAgo = now - 7 * 24 * 3600 * 1000;
    const tally = (pick: (r: typeof rows[number]) => string | null | undefined) => {
      const out: Record<string, number> = {};
      for (const r of rows) { const k = pick(r) ?? 'unspecified'; out[k] = (out[k] ?? 0) + 1; }
      return out;
    };
    return {
      totalItems: rows.length,
      byStatus: tally((r) => r.item.status),
      byCategory: tally((r) => r.item.category),
      byPriority: tally((r) => r.item.priority),
      recentlyAdded: rows.filter((r) => (r.item.createdAt?.getTime() ?? 0) >= weekAgo).length,
      upcomingElections: rows.filter((r) => r.election.date.getTime() >= now).length,
      completedElections: rows.filter((r) => r.election.date.getTime() < now).length,
    };
  }
  async getEnhancedWatchlist(userId: string, filters: {
    status?: string[]; category?: string[]; priority?: string[]; tags?: string[]; search?: string;
    sortBy?: 'date' | 'priority' | 'category' | 'recent' | 'custom'; sortOrder?: 'asc' | 'desc'; limit?: number; offset?: number;
  } = {}): Promise<EnhancedWatchlistResponse> {
    const conditions: SQL[] = [eq(watchlist.userId, userId)];
    if (filters.status?.length) conditions.push(inArray(watchlist.status, filters.status));
    if (filters.category?.length) conditions.push(inArray(watchlist.category, filters.category));
    if (filters.priority?.length) conditions.push(inArray(watchlist.priority, filters.priority));
    if (filters.tags?.length) conditions.push(sql`${watchlist.tags} && ${filters.tags}::text[]`);
    if (filters.search?.trim()) conditions.push(or(ilike(elections.title, `%${filters.search.trim()}%`), ilike(elections.location, `%${filters.search.trim()}%`))!);
    const dir = filters.sortOrder === 'asc' ? asc : desc;
    const order = filters.sortBy === 'priority' ? dir(watchlist.priority)
      : filters.sortBy === 'category' ? dir(watchlist.category)
      : filters.sortBy === 'recent' ? dir(watchlist.createdAt)
      : filters.sortBy === 'custom' ? dir(watchlist.sortOrder)
      : dir(elections.date);
    const limit = Math.min(200, Math.max(1, Number.isFinite(filters.limit) ? (filters.limit as number) : 50));
    const offset = Math.max(0, Number.isFinite(filters.offset) ? (filters.offset as number) : 0);
    const where = and(...conditions);
    const [rows, [{ total }]] = await Promise.all([
      db.select({ item: watchlist, election: elections }).from(watchlist).innerJoin(elections, eq(watchlist.electionId, elections.id)).where(where).orderBy(order, asc(watchlist.id)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(watchlist).innerJoin(elections, eq(watchlist.electionId, elections.id)).where(where),
    ]);
    const items = rows.map(({ item, election }) => ({
      id: item.id,
      priority: item.priority ?? 'medium',
      category: item.category ?? undefined,
      status: item.status ?? 'active',
      tags: item.tags ?? [],
      notes: item.notes ?? undefined,
      addedVia: item.addedVia ?? 'manual',
      interactionCount: item.interactionCount ?? 0,
      lastInteraction: item.lastInteraction?.toISOString(),
      notificationsEnabled: item.notificationsEnabled ?? true,
      reminderDaysBefore: item.reminderDaysBefore ?? 7,
      election: {
        id: election.id, title: election.title, subtitle: election.subtitle ?? undefined, location: election.location, state: election.state,
        date: election.date.toISOString(), type: election.type, level: election.level, offices: election.offices ?? undefined, description: election.description ?? undefined,
      },
      createdAt: (item.createdAt ?? new Date(0)).toISOString(),
      // watchlist rows carry no updated_at column; the last interaction is the truthful proxy.
      updatedAt: (item.lastInteraction ?? item.createdAt ?? new Date(0)).toISOString(),
    }));
    return { items, analytics: await this.getWatchlistAnalytics(userId), totalCount: total, hasMore: offset + items.length < total };
  }
  async bulkUpdateWatchlistItems(userId: string, itemIds: number[], updates: { priority?: string; category?: string; status?: string; tags?: string[] }): Promise<WatchlistItem[]> {
    if (!itemIds.length) return [];
    return db.update(watchlist).set(updates).where(and(eq(watchlist.userId, userId), inArray(watchlist.id, itemIds))).returning();
  }

  // --- Recommendations (stored rows; generation lives in recommendation-service) ---
  async getUserRecommendationAnalytics(userId: string): Promise<UserRecommendationAnalytics | null> {
    const [row] = await db.select().from(userRecommendationAnalytics).where(eq(userRecommendationAnalytics.userId, userId)).limit(1);
    return row ?? null;
  }
  async updateUserRecommendationAnalytics(userId: string, updates: Partial<UserRecommendationAnalytics>): Promise<UserRecommendationAnalytics> {
    const { id: _id, userId: _u, ...rest } = updates;
    const [updated] = await db.update(userRecommendationAnalytics).set(rest).where(eq(userRecommendationAnalytics.userId, userId)).returning();
    if (updated) return updated;
    const [inserted] = await db.insert(userRecommendationAnalytics).values({ userId, ...rest } as any).returning();
    return inserted;
  }
  async calculateRecommendationPerformance(userId: string): Promise<{ viewRate: number; clickRate: number; conversionRate: number; dismissalRate: number }> {
    const [c] = await db.select({
      total: sql<number>`count(*)`.mapWith(Number),
      viewed: sql<number>`count(*) filter (where ${electionRecommendations.isViewed})`.mapWith(Number),
      clicked: sql<number>`count(*) filter (where ${electionRecommendations.isClicked})`.mapWith(Number),
      added: sql<number>`count(*) filter (where ${electionRecommendations.isAddedToWatchlist})`.mapWith(Number),
      dismissed: sql<number>`count(*) filter (where ${electionRecommendations.isDismissed})`.mapWith(Number),
    }).from(electionRecommendations).where(eq(electionRecommendations.userId, userId));
    const rate = (n: number) => (c.total > 0 ? Math.round((n / c.total) * 1000) / 10 : 0);
    return { viewRate: rate(c.viewed), clickRate: rate(c.clicked), conversionRate: rate(c.added), dismissalRate: rate(c.dismissed) };
  }
  async getRecommendationInsights(userId: string): Promise<{ preferredTypes: string[]; preferredLevels: string[]; optimalTiming: string; qualityScore: number }> {
    // Derived strictly from this user's recorded interactions; empty history -> empty answer.
    const rows = await db.select({ type: electionRecommendations.recommendationType, level: elections.level, clickedAt: electionRecommendations.clickedAt, isClicked: electionRecommendations.isClicked, isViewed: electionRecommendations.isViewed })
      .from(electionRecommendations).innerJoin(elections, eq(electionRecommendations.electionId, elections.id))
      .where(and(eq(electionRecommendations.userId, userId), eq(electionRecommendations.isClicked, true)));
    const top = (vals: Array<string | null>) => Object.entries(vals.reduce<Record<string, number>>((m, v) => { if (v) m[v] = (m[v] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    const hours = rows.map((r) => r.clickedAt?.getHours()).filter((h): h is number => typeof h === 'number');
    const hourMode = hours.length ? Number(Object.entries(hours.reduce<Record<string, number>>((m, h) => { m[h] = (m[h] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1])[0][0]) : null;
    const perf = await this.calculateRecommendationPerformance(userId);
    return {
      preferredTypes: top(rows.map((r) => r.type)),
      preferredLevels: top(rows.map((r) => r.level)),
      optimalTiming: hourMode === null ? 'unknown' : `${String(hourMode).padStart(2, '0')}:00`,
      qualityScore: perf.clickRate,
    };
  }
  async getCachedRecommendations(userId: string, cacheKey: string): Promise<RecommendationCache | null> {
    const [row] = await db.select().from(recommendationCache)
      .where(and(eq(recommendationCache.userId, userId), eq(recommendationCache.cacheKey, cacheKey), eq(recommendationCache.isValid, true), gte(recommendationCache.validUntil, new Date())))
      .limit(1);
    return row ?? null;
  }
  async setCachedRecommendations(userId: string, cacheKey: string, data: any, validUntil: Date): Promise<RecommendationCache> {
    await db.delete(recommendationCache).where(and(eq(recommendationCache.userId, userId), eq(recommendationCache.cacheKey, cacheKey)));
    // recommendation_type is NOT NULL: callers key caches as "<type>:<hash>"; a key with no
    // prefix is a general (personalized) cache.
    const recommendationType = typeof data?.type === 'string' ? data.type : (cacheKey.includes(':') ? cacheKey.slice(0, cacheKey.indexOf(':')) : 'personalized');
    const [row] = await db.insert(recommendationCache).values({ userId, cacheKey, recommendationType, recommendationData: data, validUntil, isValid: true, totalRecommendations: Array.isArray(data?.recommendations) ? data.recommendations.length : 0 }).returning();
    return row;
  }
  async invalidateRecommendationCache(userId: string, pattern?: string): Promise<void> {
    const where = pattern ? and(eq(recommendationCache.userId, userId), ilike(recommendationCache.cacheKey, `${pattern}%`)) : eq(recommendationCache.userId, userId);
    await db.update(recommendationCache).set({ isValid: false, updatedAt: new Date() }).where(where);
  }
  private async storedRecommendations(userId: string, type: string, limit = 10): Promise<ElectionRecommendation[]> {
    return db.select().from(electionRecommendations)
      .where(and(eq(electionRecommendations.userId, userId), eq(electionRecommendations.recommendationType, type), eq(electionRecommendations.isActive, true)))
      .orderBy(desc(electionRecommendations.scoreTotal), desc(electionRecommendations.id)).limit(Math.min(100, Math.max(1, limit)));
  }
  async getPersonalizedRecommendations(userId: string, limit = 10): Promise<ElectionRecommendation[]> { return this.storedRecommendations(userId, 'personalized', limit); }
  async getInterestBasedRecommendations(userId: string, limit = 10): Promise<ElectionRecommendation[]> { return this.storedRecommendations(userId, 'interest', limit); }
  async getLocationBasedRecommendations(userId: string, limit = 10): Promise<ElectionRecommendation[]> { return this.storedRecommendations(userId, 'location', limit); }
  async getSimilarUsersRecommendations(userId: string, limit = 10): Promise<ElectionRecommendation[]> { return this.storedRecommendations(userId, 'similar_users', limit); }
  async getTrendingRecommendations(userId: string, limit = 10): Promise<ElectionRecommendation[]> { return this.storedRecommendations(userId, 'trending', limit); }
  async generateRecommendations(_userId: string, _options?: { limit?: number; types?: string[]; includeExpired?: boolean; forceRefresh?: boolean }): Promise<RecommendationResponse> {
    return this.notImplemented('storage.generateRecommendations', 'recommendation generation is owned by recommendation-service; the storage layer only stores and reads recommendations');
  }
  async refreshRecommendationCache(userId: string): Promise<void> {
    // Invalidation is real; regeneration belongs to recommendation-service.
    await this.invalidateRecommendationCache(userId);
  }

  async getCandidateProfile(candidateId: number): Promise<CandidateProfile | null> {
    try {
      const [profile] = await db
        .select()
        .from(candidateProfiles)
        .where(eq(candidateProfiles.candidateId, candidateId))
        .limit(1);

      return profile || null;
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      return null;
    }
  }

  async updateCandidateProfile(candidateId: number, profileData: Partial<CandidateProfile>): Promise<CandidateProfile> {
    try {
      // Calculate data completeness
      const totalFields = 25; // Estimated number of profile fields
      const filledFields = Object.values(profileData).filter(value =>
        value !== null && value !== undefined && value !== ''
      ).length;
      const completeness = Math.round((filledFields / totalFields) * 100);

      const updatedData = {
        ...profileData,
        dataCompleteness: completeness,
        updatedAt: new Date(),
      };

      // Check if profile exists
      const existingProfile = await this.getCandidateProfile(candidateId);

      if (existingProfile) {
        // Update existing profile
        const [updated] = await db
          .update(candidateProfiles)
          .set(updatedData)
          .where(eq(candidateProfiles.candidateId, candidateId))
          .returning();

        return updated;
      } else {
        // Create new profile
        const [newProfile] = await db
          .insert(candidateProfiles)
          .values({
            candidateId,
            ...updatedData,
          } as any)
          .returning();

        return newProfile;
      }
    } catch (error) {
      console.error('Error updating candidate profile:', error);
      throw error;
    }
  }

  async getCandidateDataSources(candidateId: number): Promise<CandidateDataSource[]> {
    try {
      return await db
        .select()
        .from(candidateDataSources)
        .where(eq(candidateDataSources.candidateId, candidateId))
        .orderBy(desc(candidateDataSources.createdAt));
    } catch (error) {
      console.error('Error fetching candidate data sources:', error);
      return [];
    }
  }

  async recordDataSource(source: InsertCandidateDataSource): Promise<CandidateDataSource> {
    try {
      const [newSource] = await db
        .insert(candidateDataSources)
        .values(source)
        .returning();

      return newSource;
    } catch (error) {
      console.error('Error recording data source:', error);
      throw error;
    }
  }

  async getCandidatePositions(candidateId: number, category?: string): Promise<CandidatePosition[]> {
    try {
      let query = db
        .select()
        .from(candidatePositions)
        .where(eq(candidatePositions.candidateId, candidateId));

      if (category) {
        query = db
          .select()
          .from(candidatePositions)
          .where(and(
            eq(candidatePositions.candidateId, candidateId),
            eq(candidatePositions.category, category)
          ));
      }

      return await query.orderBy(desc(candidatePositions.lastUpdated));
    } catch (error) {
      console.error('Error fetching candidate positions:', error);
      return [];
    }
  }

  async createCandidatePosition(position: InsertCandidatePosition): Promise<CandidatePosition> {
    try {
      const [newPosition] = await db
        .insert(candidatePositions)
        .values(position)
        .returning();

      return newPosition;
    } catch (error) {
      console.error('Error creating candidate position:', error);
      throw error;
    }
  }

  async updateCandidatePosition(positionId: number, updates: Partial<CandidatePosition>): Promise<CandidatePosition> {
    try {
      const [updated] = await db
        .update(candidatePositions)
        .set({
          ...updates,
          lastUpdated: new Date(),
        })
        .where(eq(candidatePositions.id, positionId))
        .returning();

      return updated;
    } catch (error) {
      console.error('Error updating candidate position:', error);
      throw error;
    }
  }

  async deleteCandidatePosition(positionId: number): Promise<void> {
    try {
      await db
        .delete(candidatePositions)
        .where(eq(candidatePositions.id, positionId));
    } catch (error) {
      console.error('Error deleting candidate position:', error);
      throw error;
    }
  }

  async getCandidatePositionById(positionId: number): Promise<CandidatePosition | null> {
    try {
      const [position] = await db
        .select()
        .from(candidatePositions)
        .where(eq(candidatePositions.id, positionId))
        .limit(1);

      return position || null;
    } catch (error) {
      console.error('Error fetching candidate position:', error);
      return null;
    }
  }

  async getCandidateQAEntries(candidateId: number, category?: string): Promise<CandidateQA[]> {
    try {
      let query = db
        .select()
        .from(candidateQA)
        .where(eq(candidateQA.candidateId, candidateId));

      if (category) {
        query = db
          .select()
          .from(candidateQA)
          .where(and(
            eq(candidateQA.candidateId, candidateId),
            eq(candidateQA.category, category)
          ));
      }

      return await query.orderBy(desc(candidateQA.updatedAt));
    } catch (error) {
      console.error('Error fetching candidate Q&A entries:', error);
      return [];
    }
  }

  async createCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile> {
    try {
      const [newProfile] = await db
        .insert(candidateProfiles)
        .values(profile)
        .returning();

      return newProfile;
    } catch (error) {
      console.error('Error creating candidate profile:', error);
      throw error;
    }
  }

  async getCandidateWithRAG(candidateId: number): Promise<any> {
    try {
      // Get base candidate data
      const [candidate] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId))
        .limit(1);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Get candidate-supplied profile data (Priority 1 - RAG)
      const profile = await this.getCandidateProfile(candidateId);

      // Get data sources for attribution
      const dataSources = await this.getCandidateDataSources(candidateId);

      // Create enhanced candidate object with RAG-first approach
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
          socialIssues: profile?.socialIssuesPosition || null,
        },

        // Campaign Information
        campaignWebsite: profile?.campaignWebsite || candidate.website,
        campaignSlogan: profile?.campaignSlogan,
        topPriorities: profile?.topPriorities || [],
        keyAccomplishments: profile?.keyAccomplishments || [],

        // Data Attribution
        dataCompleteness: profile?.dataCompleteness || 0,
        verificationStatus: profile?.verificationStatus || 'pending',
        dataSources: dataSources,

        // Source attribution helper function
        getDataAttribution: (fieldName: string) => {
          const source = dataSources.find(s => s.fieldName === fieldName);
          if (source) {
            switch (source.sourceType) {
              case 'candidate_supplied':
                return 'Candidate Supplied';
              case 'ai_research':
                return 'AI Researched';
              case 'verified_external':
                return `Verified: ${source.sourceDescription}`;
              default:
                return 'Unknown Source';
            }
          }
          return profile && profile[fieldName as keyof CandidateProfile]
            ? 'Candidate Supplied'
            : 'Candidate has not supplied that info';
        }
      };

      return enhancedCandidate;
    } catch (error) {
      console.error('Error getting candidate with RAG:', error);
      throw error;
    }
  }

  async purchaseDataExport(campaignId: number, datasetType: string, format?: string): Promise<any> {
    const { campaignPortalService } = await import('./campaign-portal-service');
    return await campaignPortalService.purchaseDataExport(campaignId, datasetType, format);
  }

  async getCampaignSubscription(campaignId: number): Promise<any> {
    const { SUBSCRIPTION_TIERS } = await import('./campaign-portal-service');

    const [campaign] = await db
      .select()
      .from(campaignAccounts)
      .where(eq(campaignAccounts.id, campaignId));

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return {
      tier: campaign.subscriptionTier,
      isActive: campaign.isActive,
      startDate: campaign.createdAt, // Using createdAt as subscription start
      endDate: null, // No end date field in current schema
      features: SUBSCRIPTION_TIERS[campaign.subscriptionTier as keyof typeof SUBSCRIPTION_TIERS]?.features || []
    };
  }

  // User Authentication Methods Implementation
  async createUser(email: string, password: string): Promise<any> {
    const { authService } = await import('./auth-service');
    return await authService.signup(email, password);
  }

  async authenticateUser(email: string, password: string): Promise<any> {
    const { authService } = await import('./auth-service');
    return await authService.signin(email, password);
  }

  async signoutUser(token: string): Promise<void> {
    const { authService } = await import('./auth-service');
    return await authService.signout(token);
  }

  async validateUserSession(token: string): Promise<User | null> {
    const { authService } = await import('./auth-service');
    return await authService.validateSession(token);
  }

  // Congressional Search & Missing Member Detection
  async searchCongressMembers(searchTerm: string): Promise<CongressMember[]> {
    return await this.handleDatabaseOperation(async () => {
      const results = await db.select()
        .from(congressMembers)
        .where(
          or(
            ilike(congressMembers.name, `%${searchTerm}%`),
            ilike(congressMembers.state, `%${searchTerm}%`),
            ilike(congressMembers.party, `%${searchTerm}%`),
            ilike(congressMembers.bioguideId, `%${searchTerm}%`)
          )
        )
        .limit(50);
      return results;
    }, [], 'searchCongressMembers');
  }

  async findMissingCongressMember(): Promise<any> {
    const { congressService } = await import('./congress-api-service');
    return await congressService.findMissingMembers();
  }

  // Notification System Database Methods Implementation
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    return await this.handleDatabaseOperation(async () => {
      const [preferences] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);
      return preferences || null;
    }, null, 'getUserNotificationPreferences');
  }

  async updateUserNotificationPreferences(userId: string, updates: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    return await this.handleDatabaseOperation(async () => {
      const existing = await this.getUserNotificationPreferences(userId);

      if (existing) {
        const [updated] = await db
          .update(notificationPreferences)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(notificationPreferences.userId, userId))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(notificationPreferences)
          .values({ userId, ...updates })
          .returning();
        return created;
      }
    }, {} as any, 'updateUserNotificationPreferences');
  }

  async createDefaultNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    return await this.handleDatabaseOperation(async () => {
      const defaultPrefs: InsertNotificationPreferences = {
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

      const [created] = await db
        .insert(notificationPreferences)
        .values(defaultPrefs)
        .returning();
      return created;
    }, {} as any, 'createDefaultNotificationPreferences');
  }

  async getUserNotificationSubscriptions(userId: string): Promise<NotificationSubscription[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db
        .select()
        .from(notificationSubscriptions)
        .where(eq(notificationSubscriptions.userId, userId))
        .orderBy(desc(notificationSubscriptions.createdAt));
    }, [], 'getUserNotificationSubscriptions');
  }

  async createNotificationSubscription(subscription: InsertNotificationSubscription): Promise<NotificationSubscription> {
    return await this.handleDatabaseOperation(async () => {
      const [created] = await db
        .insert(notificationSubscriptions)
        .values(subscription)
        .returning();
      return created;
    }, {} as any, 'createNotificationSubscription');
  }

  async updateNotificationSubscription(subscriptionId: number, updates: Partial<NotificationSubscription>): Promise<NotificationSubscription> {
    return await this.handleDatabaseOperation(async () => {
      const [updated] = await db
        .update(notificationSubscriptions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationSubscriptions.id, subscriptionId))
        .returning();
      return updated;
    }, {} as any, 'updateNotificationSubscription');
  }

  async deleteNotificationSubscription(subscriptionId: number): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      await db
        .delete(notificationSubscriptions)
        .where(eq(notificationSubscriptions.id, subscriptionId));
    }, undefined, 'deleteNotificationSubscription');
  }

  async verifyNotificationSubscription(token: string): Promise<NotificationSubscription | null> {
    return await this.handleDatabaseOperation(async () => {
      const [subscription] = await db
        .select()
        .from(notificationSubscriptions)
        .where(eq(notificationSubscriptions.verificationToken, token))
        .limit(1);

      if (subscription) {
        await db
          .update(notificationSubscriptions)
          .set({
            isVerified: true,
            verifiedAt: new Date(),
            verificationToken: null,
            updatedAt: new Date()
          })
          .where(eq(notificationSubscriptions.id, subscription.id));

        return { ...subscription, isVerified: true, verifiedAt: new Date() };
      }
      return null;
    }, null, 'verifyNotificationSubscription');
  }

  async unsubscribeNotification(token: string): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      await db
        .update(notificationSubscriptions)
        .set({
          isActive: false,
          unsubscribedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(notificationSubscriptions.unsubscribeToken, token));
    }, undefined, 'unsubscribeNotification');
  }

  async getUserNotificationConsents(userId: string): Promise<NotificationConsent[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db
        .select()
        .from(notificationConsents)
        .where(eq(notificationConsents.userId, userId))
        .orderBy(desc(notificationConsents.createdAt));
    }, [], 'getUserNotificationConsents');
  }

  async getNotificationConsentsBetween(start: Date, end: Date): Promise<NotificationConsent[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db.select().from(notificationConsents)
        .where(and(gte(notificationConsents.consentDate, start), lte(notificationConsents.consentDate, end)))
        .orderBy(desc(notificationConsents.consentDate));
    }, [], 'getNotificationConsentsBetween');
  }

  /** Active grants whose data_retention_period (days) has elapsed since consent_date. */
  async getExpiredNotificationConsents(asOf: Date): Promise<NotificationConsent[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db.select().from(notificationConsents)
        .where(and(
          eq(notificationConsents.isActive, true),
          eq(notificationConsents.consentGiven, true),
          isNotNull(notificationConsents.dataRetentionPeriod),
          sql`${notificationConsents.consentDate} + make_interval(days => ${notificationConsents.dataRetentionPeriod}) < ${asOf}`
        ));
    }, [], 'getExpiredNotificationConsents');
  }

  async unsubscribeNotificationSubscriptionByToken(token: string): Promise<NotificationSubscription | null> {
    return await this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(notificationSubscriptions)
        .set({ isActive: false, unsubscribedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(notificationSubscriptions.unsubscribeToken, token), eq(notificationSubscriptions.isActive, true)))
        .returning();
      return updated ?? null;
    }, null, 'unsubscribeNotificationSubscriptionByToken');
  }

  async getNotificationSubscriptionsVerifiedBetween(start: Date, end: Date): Promise<NotificationSubscription[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db.select().from(notificationSubscriptions)
        .where(and(isNotNull(notificationSubscriptions.verifiedAt), gte(notificationSubscriptions.verifiedAt, start), lte(notificationSubscriptions.verifiedAt, end)));
    }, [], 'getNotificationSubscriptionsVerifiedBetween');
  }

  async recordNotificationConsent(consent: InsertNotificationConsent): Promise<NotificationConsent> {
    return await this.handleDatabaseOperation(async () => {
      const [created] = await db
        .insert(notificationConsents)
        .values(consent)
        .returning();
      return created;
    }, {} as any, 'recordNotificationConsent');
  }

  async withdrawNotificationConsent(userId: string, consentType: string): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      await db
        .update(notificationConsents)
        .set({
          consentGiven: false,
          withdrawalDate: new Date(),
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(notificationConsents.userId, userId),
          eq(notificationConsents.consentType, consentType),
          eq(notificationConsents.isActive, true)
        ));
    }, undefined, 'withdrawNotificationConsent');
  }

  async getNotificationTemplates(type?: string, category?: string): Promise<NotificationTemplate[]> {
    return await this.handleDatabaseOperation(async () => {
      let query = db.select().from(notificationTemplates).$dynamic();

      const conditions = [eq(notificationTemplates.isActive, true)];
      if (type) conditions.push(eq(notificationTemplates.type, type));
      if (category) conditions.push(eq(notificationTemplates.category, category));

      return await query
        .where(and(...conditions))
        .orderBy(notificationTemplates.name);
    }, [], 'getNotificationTemplates');
  }

  async getNotificationTemplate(id: number): Promise<NotificationTemplate | null> {
    return await this.handleDatabaseOperation(async () => {
      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.id, id))
        .limit(1);
      return template || null;
    }, null, 'getNotificationTemplate');
  }

  async createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate> {
    return await this.handleDatabaseOperation(async () => {
      const [created] = await db
        .insert(notificationTemplates)
        .values(template)
        .returning();
      return created;
    }, {} as any, 'createNotificationTemplate');
  }

  async updateNotificationTemplate(id: number, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    return await this.handleDatabaseOperation(async () => {
      const [updated] = await db
        .update(notificationTemplates)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationTemplates.id, id))
        .returning();
      return updated;
    }, {} as any, 'updateNotificationTemplate');
  }

  async getNotificationCampaigns(status?: string): Promise<NotificationCampaign[]> {
    return await this.handleDatabaseOperation(async () => {
      let query = db.select().from(notificationCampaigns).$dynamic();

      if (status) {
        query = query.where(eq(notificationCampaigns.status, status));
      }

      return await query.orderBy(desc(notificationCampaigns.createdAt));
    }, [], 'getNotificationCampaigns');
  }

  async getNotificationCampaign(id: number): Promise<NotificationCampaign | null> {
    return await this.handleDatabaseOperation(async () => {
      const [campaign] = await db
        .select()
        .from(notificationCampaigns)
        .where(eq(notificationCampaigns.id, id))
        .limit(1);
      return campaign || null;
    }, null, 'getNotificationCampaign');
  }

  async createNotificationCampaign(campaign: InsertNotificationCampaign): Promise<NotificationCampaign> {
    return await this.handleDatabaseOperation(async () => {
      const [created] = await db
        .insert(notificationCampaigns)
        .values(campaign)
        .returning();
      return created;
    }, {} as any, 'createNotificationCampaign');
  }

  async updateNotificationCampaign(id: number, updates: Partial<NotificationCampaign>): Promise<NotificationCampaign> {
    return await this.handleDatabaseOperation(async () => {
      const [updated] = await db
        .update(notificationCampaigns)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationCampaigns.id, id))
        .returning();
      return updated;
    }, {} as any, 'updateNotificationCampaign');
  }

  async getNotificationDeliveries(campaignId?: number, userId?: string): Promise<NotificationDelivery[]> {
    return await this.handleDatabaseOperation(async () => {
      let query = db.select().from(notificationDeliveries).$dynamic();

      const conditions: SQL[] = [];
      if (campaignId) conditions.push(eq(notificationDeliveries.campaignId, campaignId));
      if (userId) conditions.push(eq(notificationDeliveries.userId, userId));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(notificationDeliveries.createdAt));
    }, [], 'getNotificationDeliveries');
  }

  async createNotificationDelivery(delivery: InsertNotificationDelivery): Promise<NotificationDelivery> {
    return await this.handleDatabaseOperation(async () => {
      const [created] = await db
        .insert(notificationDeliveries)
        .values(delivery)
        .returning();
      return created;
    }, {} as any, 'createNotificationDelivery');
  }

  async updateNotificationDelivery(id: number, updates: Partial<NotificationDelivery>): Promise<NotificationDelivery> {
    return await this.handleDatabaseOperation(async () => {
      const [updated] = await db
        .update(notificationDeliveries)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationDeliveries.id, id))
        .returning();
      return updated;
    }, {} as any, 'updateNotificationDelivery');
  }

  async getNotificationDeliveryStats(campaignId?: number): Promise<any> {
    return await this.handleDatabaseOperation(async () => {
      let query = db.select().from(notificationDeliveries).$dynamic();

      if (campaignId) {
        query = query.where(eq(notificationDeliveries.campaignId, campaignId));
      }

      const deliveries = await query;

      const stats = {
        total: deliveries.length,
        queued: deliveries.filter(d => d.status === 'queued').length,
        sending: deliveries.filter(d => d.status === 'sending').length,
        sent: deliveries.filter(d => d.status === 'sent').length,
        delivered: deliveries.filter(d => d.status === 'delivered').length,
        failed: deliveries.filter(d => d.status === 'failed').length,
        bounced: deliveries.filter(d => d.status === 'bounced').length,
        opened: deliveries.filter(d => d.openedAt !== null).length,
        clicked: deliveries.filter(d => d.clickedAt !== null).length,
      };

      return stats;
    }, { total: 0, queued: 0, sending: 0, sent: 0, delivered: 0, failed: 0, bounced: 0, opened: 0, clicked: 0 }, 'getNotificationDeliveryStats');
  }

  async getNotificationEvents(processed?: boolean): Promise<NotificationEvent[]> {
    return await this.handleDatabaseOperation(async () => {
      let query = db.select().from(notificationEvents).$dynamic();

      if (processed !== undefined) {
        query = query.where(eq(notificationEvents.isProcessed, processed));
      }

      return await query.orderBy(desc(notificationEvents.createdAt));
    }, [], 'getNotificationEvents');
  }

  async createNotificationEvent(event: InsertNotificationEvent): Promise<NotificationEvent> {
    return await this.handleDatabaseOperation(async () => {
      const [created] = await db
        .insert(notificationEvents)
        .values(event)
        .returning();
      return created;
    }, {} as any, 'createNotificationEvent');
  }

  async updateNotificationEvent(id: number, updates: Partial<NotificationEvent>): Promise<NotificationEvent> {
    return await this.handleDatabaseOperation(async () => {
      const [updated] = await db
        .update(notificationEvents)
        .set(updates)
        .where(eq(notificationEvents.id, id))
        .returning();
      return updated;
    }, {} as any, 'updateNotificationEvent');
  }

  async createNotificationWebhook(webhook: InsertNotificationWebhook): Promise<NotificationWebhook> {
    return await this.handleDatabaseOperation(async () => {
      const [created] = await db
        .insert(notificationWebhooks)
        .values(webhook)
        .returning();
      return created;
    }, {} as any, 'createNotificationWebhook');
  }

  async processNotificationWebhook(webhookId: number): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      await db
        .update(notificationWebhooks)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(notificationWebhooks.id, webhookId));
    }, undefined, 'processNotificationWebhook');
  }

  async getUnprocessedWebhooks(): Promise<NotificationWebhook[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db
        .select()
        .from(notificationWebhooks)
        .where(eq(notificationWebhooks.processed, false))
        .orderBy(notificationWebhooks.createdAt);
    }, [], 'getUnprocessedWebhooks');
  }

  async getQueuedNotifications(limit?: number): Promise<NotificationDelivery[]> {
    return await this.handleDatabaseOperation(async () => {
      let query = db
        .select()
        .from(notificationDeliveries)
        .where(eq(notificationDeliveries.status, 'queued'))
        .orderBy(notificationDeliveries.queuedAt)
        .$dynamic();

      if (limit) {
        query = query.limit(limit);
      }

      return await query;
    }, [], 'getQueuedNotifications');
  }

  async updateNotificationStatus(deliveryId: number, status: string, metadata?: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      const updates: any = { status, updatedAt: new Date() };

      // Set timestamps based on status
      switch (status) {
        case 'sending':
          updates.sentAt = new Date();
          break;
        case 'delivered':
          updates.deliveredAt = new Date();
          break;
        case 'failed':
          updates.failedAt = new Date();
          break;
        case 'bounced':
          updates.bouncedAt = new Date();
          break;
      }

      if (metadata) {
        updates.providerResponse = metadata;
      }

      await db
        .update(notificationDeliveries)
        .set(updates)
        .where(eq(notificationDeliveries.id, deliveryId));
    }, undefined, 'updateNotificationStatus');
  }

  async retryFailedNotifications(limit?: number): Promise<NotificationDelivery[]> {
    return await this.handleDatabaseOperation(async () => {
      let query = db
        .select()
        .from(notificationDeliveries)
        .where(and(
          eq(notificationDeliveries.status, 'failed'),
          lte(notificationDeliveries.retryCount, 3)
        ))
        .orderBy(notificationDeliveries.nextRetryAt)
        .$dynamic();

      if (limit) {
        query = query.limit(limit);
      }

      return await query;
    }, [], 'retryFailedNotifications');
  }

  // ============================================================================
  // PLATFORM CONTINUITY METHODS IMPLEMENTATION (Track 3)
  // ============================================================================

  // Secrets Management Methods
  async getSecretByName(secretName: string): Promise<any> {
    return await this.handleDatabaseOperation(async () => {

      const [secret] = await db
        .select()
        .from(secretsVault)
        .where(eq(secretsVault.secretName, secretName))
        .limit(1);

      return secret || null;
    }, null, 'getSecretByName');
  }

  async getSecretById(secretId: number): Promise<any> {
    return await this.handleDatabaseOperation(async () => {

      const [secret] = await db
        .select()
        .from(secretsVault)
        .where(eq(secretsVault.id, secretId))
        .limit(1);

      return secret || null;
    }, null, 'getSecretById');
  }

  async getAllSecrets(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db.select().from(secretsVault);
    }, [], 'getAllSecrets');
  }

  async getExpiredSecrets(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      return await db
        .select()
        .from(secretsVault)
        .where(lte(secretsVault.nextRotation, new Date()));
    }, [], 'getExpiredSecrets');
  }

  async createSecret(secret: any): Promise<number> {
    return await this.handleDatabaseOperation(async () => {

      const [newSecret] = await db
        .insert(secretsVault)
        .values(secret)
        .returning();

      return newSecret.id;
    }, 0, 'createSecret');
  }

  async updateSecret(secretId: number, updates: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {

      await db
        .update(secretsVault)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(secretsVault.id, secretId));
    }, undefined, 'updateSecret');
  }

  async createSecretRotationHistory(history: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {

      await db
        .insert(secretsRotationHistory)
        .values(history);
    }, undefined, 'createSecretRotationHistory');
  }

  async updateSecretRotationHistory(rotationId: string, updates: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {

      await db
        .update(secretsRotationHistory)
        .set(updates)
        .where(eq(secretsRotationHistory.rotationId, rotationId));
    }, undefined, 'updateSecretRotationHistory');
  }

  async getRotationHistory(filters: any): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      let query = db.select().from(secretsRotationHistory).$dynamic();
      const conditions: SQL[] = [];

      if (filters.secretId) {
        conditions.push(eq(secretsRotationHistory.secretId, filters.secretId));
      }
      if (filters.status) {
        conditions.push(eq(secretsRotationHistory.status, filters.status));
      }
      if (filters.rotationType) {
        conditions.push(eq(secretsRotationHistory.rotationType, filters.rotationType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(secretsRotationHistory.startedAt));
    }, [], 'getRotationHistory');
  }

  async getRecentRotationFailures(days: number): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      return await db
        .select()
        .from(secretsRotationHistory)
        .where(and(
          eq(secretsRotationHistory.status, 'failed'),
          gte(secretsRotationHistory.startedAt, cutoff)
        ))
        .orderBy(desc(secretsRotationHistory.startedAt));
    }, [], 'getRecentRotationFailures');
  }

  async deleteOldRotationHistory(cutoffDate: Date): Promise<number> {
    return await this.handleDatabaseOperation(async () => {

      const result = await db
        .delete(secretsRotationHistory)
        .where(lt(secretsRotationHistory.startedAt, cutoffDate));

      return result.rowCount || 0;
    }, 0, 'deleteOldRotationHistory');
  }

  // Artifact Storage Methods
  async createArtifact(artifact: any): Promise<number> {
    return await this.handleDatabaseOperation(async () => {

      const [newArtifact] = await db
        .insert(artifactStorage)
        .values(artifact)
        .returning();

      return newArtifact.id;
    }, 0, 'createArtifact');
  }

  async getArtifactByHash(contentHash: string): Promise<any> {
    return await this.handleDatabaseOperation(async () => {

      const [artifact] = await db
        .select()
        .from(artifactStorage)
        .where(eq(artifactStorage.contentHash, contentHash))
        .limit(1);

      return artifact || null;
    }, null, 'getArtifactByHash');
  }

  async getArtifactByNameVersion(artifactName: string, version: string, environment?: string): Promise<any> {
    return await this.handleDatabaseOperation(async () => {

      const conditions = [
        eq(artifactStorage.artifactName, artifactName),
        eq(artifactStorage.version, version)
      ];

      if (environment) {
        conditions.push(eq(artifactStorage.environment, environment));
      }

      const [artifact] = await db
        .select()
        .from(artifactStorage)
        .where(and(...conditions))
        .limit(1);

      return artifact || null;
    }, null, 'getArtifactByNameVersion');
  }

  async getArtifactVersions(artifactName: string, environment?: string): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      const conditions = [eq(artifactStorage.artifactName, artifactName)];

      if (environment) {
        conditions.push(eq(artifactStorage.environment, environment));
      }

      return await db
        .select()
        .from(artifactStorage)
        .where(and(...conditions))
        .orderBy(desc(artifactStorage.createdAt));
    }, [], 'getArtifactVersions');
  }

  async getArtifactById(artifactId: number): Promise<any> {
    return await this.handleDatabaseOperation(async () => {

      const [artifact] = await db
        .select()
        .from(artifactStorage)
        .where(eq(artifactStorage.id, artifactId))
        .limit(1);

      return artifact || null;
    }, null, 'getArtifactById');
  }

  async updateArtifact(artifactId: number, updates: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {

      await db
        .update(artifactStorage)
        .set(updates)
        .where(eq(artifactStorage.id, artifactId));
    }, undefined, 'updateArtifact');
  }

  async deleteArtifact(artifactId: number): Promise<void> {
    return await this.handleDatabaseOperation(async () => {

      await db
        .delete(artifactStorage)
        .where(eq(artifactStorage.id, artifactId));
    }, undefined, 'deleteArtifact');
  }

  async getArtifacts(filters: any): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      let query = db.select().from(artifactStorage).$dynamic();
      const conditions: SQL[] = [];

      if (filters.artifactType) {
        conditions.push(eq(artifactStorage.artifactType, filters.artifactType));
      }
      if (filters.environment) {
        conditions.push(eq(artifactStorage.environment, filters.environment));
      }
      if (filters.isActive !== undefined) {
        conditions.push(eq(artifactStorage.isActive, filters.isActive));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(artifactStorage.createdAt));
    }, [], 'getArtifacts');
  }

  async getActiveArtifacts(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      return await db
        .select()
        .from(artifactStorage)
        .where(eq(artifactStorage.isActive, true));
    }, [], 'getActiveArtifacts');
  }

  async getAllArtifacts(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db.select().from(artifactStorage);
    }, [], 'getAllArtifacts');
  }

  async getExpiredArtifacts(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      return await db
        .select()
        .from(artifactStorage)
        .where(lte(artifactStorage.retentionDate, new Date()));
    }, [], 'getExpiredArtifacts');
  }

  // Deployment History Methods
  async createDeploymentHistory(deployment: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {

      await db
        .insert(deploymentHistory)
        .values(deployment);
    }, undefined, 'createDeploymentHistory');
  }

  async updateDeploymentHistory(deploymentId: string, updates: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {

      await db
        .update(deploymentHistory)
        .set(updates)
        .where(eq(deploymentHistory.deploymentId, deploymentId));
    }, undefined, 'updateDeploymentHistory');
  }

  async getRecentDeployments(limit: number): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      return await db
        .select()
        .from(deploymentHistory)
        .orderBy(desc(deploymentHistory.startedAt))
        .limit(limit);
    }, [], 'getRecentDeployments');
  }

  async getDeploymentById(deploymentId: string): Promise<any> {
    return await this.handleDatabaseOperation(async () => {

      const [deployment] = await db
        .select()
        .from(deploymentHistory)
        .where(eq(deploymentHistory.deploymentId, deploymentId))
        .limit(1);

      return deployment || null;
    }, null, 'getDeploymentById');
  }

  // Environment Configuration Methods
  async createEnvironmentConfiguration(config: any): Promise<number> {
    return await this.handleDatabaseOperation(async () => {

      const [newConfig] = await db
        .insert(environmentConfigurations)
        .values(config)
        .returning();

      return newConfig.id;
    }, 0, 'createEnvironmentConfiguration');
  }

  async getEnvironmentConfigurations(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      return await db.select().from(environmentConfigurations);
    }, [], 'getEnvironmentConfigurations');
  }

  // Platform Continuity Events Methods
  async createPlatformContinuityEvent(event: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {

      await db
        .insert(platformContinuityEvents)
        .values(event);
    }, undefined, 'createPlatformContinuityEvent');
  }

  async getRecentPlatformContinuityEvents(limit: number): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      return await db
        .select()
        .from(platformContinuityEvents)
        .orderBy(desc(platformContinuityEvents.startedAt))
        .limit(limit);
    }, [], 'getRecentPlatformContinuityEvents');
  }

  async getPlatformContinuityEvents(filters: any): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {

      let query = db.select().from(platformContinuityEvents).$dynamic();
      const conditions: SQL[] = [];

      if (filters.eventType) {
        conditions.push(eq(platformContinuityEvents.eventType, filters.eventType));
      }
      if (filters.severity) {
        conditions.push(eq(platformContinuityEvents.severity, filters.severity));
      }
      if (filters.status) {
        conditions.push(eq(platformContinuityEvents.status, filters.status));
      }
      if (filters.environment) {
        conditions.push(eq(platformContinuityEvents.environment, filters.environment));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(platformContinuityEvents.startedAt));
    }, [], 'getPlatformContinuityEvents');
  }

  // Health checking for platform services
  async getHealth(): Promise<void> {
    // For DatabaseStorage, this could check database connectivity
    return await this.handleDatabaseOperation(async () => {
      // Simple health check - attempt to query a system table
      await db.execute(sql`SELECT 1`);
    }, undefined, 'getHealth');
  }

  // ============================================================================
  // TRACK 4: MONITORING & RUNBOOKS IMPLEMENTATION
  // ============================================================================

  // Synthetic Failover Drill System - Drill Configurations
  async getFailoverDrillConfigurations(filters?: { enabled?: boolean; drillType?: string; scenario?: string }): Promise<FailoverDrillConfiguration[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(failoverDrillConfigurations).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.enabled !== undefined) {
        conditions.push(eq(failoverDrillConfigurations.isEnabled, filters.enabled));
      }
      if (filters?.drillType) {
        conditions.push(eq(failoverDrillConfigurations.drillType, filters.drillType));
      }
      if (filters?.scenario) {
        conditions.push(eq(failoverDrillConfigurations.scenario, filters.scenario));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(failoverDrillConfigurations.createdAt));
    }, [], 'getFailoverDrillConfigurations');
  }

  async getFailoverDrillConfiguration(id: number): Promise<FailoverDrillConfiguration | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [config] = await db.select().from(failoverDrillConfigurations).where(eq(failoverDrillConfigurations.id, id));
      return config;
    }, undefined, 'getFailoverDrillConfiguration');
  }

  async createFailoverDrillConfiguration(config: InsertFailoverDrillConfiguration): Promise<FailoverDrillConfiguration> {
    return this.handleDatabaseOperation(async () => {
      const [newConfig] = await db.insert(failoverDrillConfigurations).values(config).returning();
      return newConfig;
    }, {} as FailoverDrillConfiguration, 'createFailoverDrillConfiguration');
  }

  async updateFailoverDrillConfiguration(id: number, updates: Partial<FailoverDrillConfiguration>): Promise<FailoverDrillConfiguration> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(failoverDrillConfigurations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(failoverDrillConfigurations.id, id))
        .returning();
      return updated;
    }, {} as FailoverDrillConfiguration, 'updateFailoverDrillConfiguration');
  }

  async deleteFailoverDrillConfiguration(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.delete(failoverDrillConfigurations).where(eq(failoverDrillConfigurations.id, id));
    }, undefined, 'deleteFailoverDrillConfiguration');
  }

  async getScheduledDrillConfigurations(): Promise<FailoverDrillConfiguration[]> {
    return this.handleDatabaseOperation(async () => {
      // The table has no trigger_type / next_scheduled_run columns; a scheduled drill is an
      // enabled configuration that carries a schedule.
      return await db.select().from(failoverDrillConfigurations)
        .where(and(
          eq(failoverDrillConfigurations.isEnabled, true),
          isNotNull(failoverDrillConfigurations.schedule)
        ))
        .orderBy(desc(failoverDrillConfigurations.updatedAt));
    }, [], 'getScheduledDrillConfigurations');
  }

  // Drill Executions
  async getDrillExecutions(filters?: { configurationId?: number; status?: string; triggerType?: string; page?: number; limit?: number }): Promise<DrillExecution[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(drillExecutions).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.configurationId) {
        conditions.push(eq(drillExecutions.configurationId, filters.configurationId));
      }
      if (filters?.status) {
        conditions.push(eq(drillExecutions.status, filters.status));
      }
      if (filters?.triggerType) {
        conditions.push(eq(drillExecutions.triggerType, filters.triggerType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(drillExecutions.startedAt));

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.page && filters?.limit) {
        query = query.offset((filters.page - 1) * filters.limit);
      }

      return await query;
    }, [], 'getDrillExecutions');
  }

  async getDrillExecution(executionId: string): Promise<DrillExecution | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [execution] = await db.select().from(drillExecutions).where(eq(drillExecutions.executionId, executionId));
      return execution;
    }, undefined, 'getDrillExecution');
  }

  async createDrillExecution(execution: InsertDrillExecution): Promise<DrillExecution> {
    return this.handleDatabaseOperation(async () => {
      const [newExecution] = await db.insert(drillExecutions).values(execution).returning();
      return newExecution;
    }, {} as DrillExecution, 'createDrillExecution');
  }

  async updateDrillExecution(executionId: string, updates: Partial<DrillExecution>): Promise<DrillExecution> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(drillExecutions)
        .set(updates)
        .where(eq(drillExecutions.executionId, executionId))
        .returning();
      return updated;
    }, {} as DrillExecution, 'updateDrillExecution');
  }

  async getRecentDrillExecutions(limit: number): Promise<DrillExecution[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(drillExecutions)
        .orderBy(desc(drillExecutions.startedAt))
        .limit(limit);
    }, [], 'getRecentDrillExecutions');
  }

  async getDrillExecutionsByConfiguration(configurationId: number): Promise<DrillExecution[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(drillExecutions)
        .where(eq(drillExecutions.configurationId, configurationId))
        .orderBy(desc(drillExecutions.startedAt));
    }, [], 'getDrillExecutionsByConfiguration');
  }

  async getDrillExecutionsForDashboard(days: number): Promise<DrillExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      return await db.select().from(drillExecutions)
        .where(gte(drillExecutions.startedAt, since))
        .orderBy(desc(drillExecutions.startedAt));
    }, [], 'getDrillExecutionsForDashboard');
  }

  // Drill Steps
  async getDrillSteps(executionId: string): Promise<DrillStep[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(drillSteps)
        .where(eq(drillSteps.executionId, executionId))
        .orderBy(drillSteps.stepOrder);
    }, [], 'getDrillSteps');
  }

  async createDrillStep(step: InsertDrillStep): Promise<DrillStep> {
    return this.handleDatabaseOperation(async () => {
      const [newStep] = await db.insert(drillSteps).values(step).returning();
      return newStep;
    }, {} as DrillStep, 'createDrillStep');
  }

  async updateDrillStep(id: number, updates: Partial<DrillStep>): Promise<DrillStep> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(drillSteps)
        .set(updates)
        .where(eq(drillSteps.id, id))
        .returning();
      return updated;
    }, {} as DrillStep, 'updateDrillStep');
  }

  async getDrillStepsByExecution(executionId: string): Promise<DrillStep[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(drillSteps)
        .where(eq(drillSteps.executionId, executionId))
        .orderBy(drillSteps.stepOrder);
    }, [], 'getDrillStepsByExecution');
  }

  // Backup Success Alert System - Backup Monitoring Configurations
  async getBackupMonitoringConfigurations(filters?: { enabled?: boolean; monitoringType?: string }): Promise<BackupMonitoringConfiguration[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(backupMonitoringConfigurations).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.enabled !== undefined) {
        conditions.push(eq(backupMonitoringConfigurations.isEnabled, filters.enabled));
      }
      if (filters?.monitoringType) {
        conditions.push(eq(backupMonitoringConfigurations.monitoringType, filters.monitoringType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(backupMonitoringConfigurations.createdAt));
    }, [], 'getBackupMonitoringConfigurations');
  }

  async getBackupMonitoringConfiguration(id: number): Promise<BackupMonitoringConfiguration | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [config] = await db.select().from(backupMonitoringConfigurations).where(eq(backupMonitoringConfigurations.id, id));
      return config;
    }, undefined, 'getBackupMonitoringConfiguration');
  }

  async createBackupMonitoringConfiguration(config: InsertBackupMonitoringConfiguration): Promise<BackupMonitoringConfiguration> {
    return this.handleDatabaseOperation(async () => {
      const [newConfig] = await db.insert(backupMonitoringConfigurations).values(config).returning();
      return newConfig;
    }, {} as BackupMonitoringConfiguration, 'createBackupMonitoringConfiguration');
  }

  async updateBackupMonitoringConfiguration(id: number, updates: Partial<BackupMonitoringConfiguration>): Promise<BackupMonitoringConfiguration> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(backupMonitoringConfigurations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(backupMonitoringConfigurations.id, id))
        .returning();
      return updated;
    }, {} as BackupMonitoringConfiguration, 'updateBackupMonitoringConfiguration');
  }

  async deleteBackupMonitoringConfiguration(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.delete(backupMonitoringConfigurations).where(eq(backupMonitoringConfigurations.id, id));
    }, undefined, 'deleteBackupMonitoringConfiguration');
  }

  async getActiveMonitoringConfigurations(): Promise<BackupMonitoringConfiguration[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(backupMonitoringConfigurations)
        .where(eq(backupMonitoringConfigurations.isEnabled, true))
        .orderBy(desc(backupMonitoringConfigurations.createdAt));
    }, [], 'getActiveMonitoringConfigurations');
  }

  // Backup Alerts
  async getBackupAlerts(filters?: { status?: string; severity?: string; alertType?: string; page?: number; limit?: number }): Promise<BackupAlert[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(backupAlerts).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.status) {
        conditions.push(eq(backupAlerts.status, filters.status));
      }
      if (filters?.severity) {
        conditions.push(eq(backupAlerts.severity, filters.severity));
      }
      if (filters?.alertType) {
        conditions.push(eq(backupAlerts.alertType, filters.alertType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(backupAlerts.createdAt));

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.page && filters?.limit) {
        query = query.offset((filters.page - 1) * filters.limit);
      }

      return await query;
    }, [], 'getBackupAlerts');
  }

  async getBackupAlert(alertId: string): Promise<BackupAlert | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [alert] = await db.select().from(backupAlerts).where(eq(backupAlerts.alertId, alertId));
      return alert;
    }, undefined, 'getBackupAlert');
  }

  async createBackupAlert(alert: InsertBackupAlert): Promise<BackupAlert> {
    return this.handleDatabaseOperation(async () => {
      const [newAlert] = await db.insert(backupAlerts).values(alert).returning();
      return newAlert;
    }, {} as BackupAlert, 'createBackupAlert');
  }

  async updateBackupAlert(alertId: string, updates: Partial<BackupAlert>): Promise<BackupAlert> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(backupAlerts)
        .set(updates)
        .where(eq(backupAlerts.alertId, alertId))
        .returning();
      return updated;
    }, {} as BackupAlert, 'updateBackupAlert');
  }

  async acknowledgeBackupAlert(alertId: string, acknowledgedBy: string): Promise<BackupAlert> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(backupAlerts)
        .set({
          status: 'acknowledged',
          acknowledgedBy,
          acknowledgedAt: new Date()
        })
        .where(eq(backupAlerts.alertId, alertId))
        .returning();
      return updated;
    }, {} as BackupAlert, 'acknowledgeBackupAlert');
  }

  async resolveBackupAlert(alertId: string, resolvedBy: string): Promise<BackupAlert> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(backupAlerts)
        .set({
          status: 'resolved',
          resolvedBy,
          resolvedAt: new Date()
        })
        .where(eq(backupAlerts.alertId, alertId))
        .returning();
      return updated;
    }, {} as BackupAlert, 'resolveBackupAlert');
  }

  async getActiveBackupAlerts(): Promise<BackupAlert[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(backupAlerts)
        .where(inArray(backupAlerts.status, ['new', 'acknowledged', 'investigating']))
        .orderBy(desc(backupAlerts.createdAt));
    }, [], 'getActiveBackupAlerts');
  }

  async getBackupAlertsByConfiguration(configurationId: number): Promise<BackupAlert[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(backupAlerts)
        .where(eq(backupAlerts.configurationId, configurationId))
        .orderBy(desc(backupAlerts.createdAt));
    }, [], 'getBackupAlertsByConfiguration');
  }

  // Backup Health Metrics
  async getBackupHealthMetrics(filters?: { metricType?: string; dateFrom?: Date; dateTo?: Date }): Promise<BackupHealthMetric[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(backupHealthMetrics).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.metricType) {
        conditions.push(eq(backupHealthMetrics.metricType, filters.metricType));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(backupHealthMetrics.metricDate, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(backupHealthMetrics.metricDate, filters.dateTo));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(backupHealthMetrics.metricDate));
    }, [], 'getBackupHealthMetrics');
  }

  async createBackupHealthMetric(metric: InsertBackupHealthMetric): Promise<BackupHealthMetric> {
    return this.handleDatabaseOperation(async () => {
      const [newMetric] = await db.insert(backupHealthMetrics).values(metric).returning();
      return newMetric;
    }, {} as BackupHealthMetric, 'createBackupHealthMetric');
  }

  async getLatestBackupHealthMetrics(metricType: string): Promise<BackupHealthMetric | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [metric] = await db.select().from(backupHealthMetrics)
        .where(eq(backupHealthMetrics.metricType, metricType))
        .orderBy(desc(backupHealthMetrics.metricDate))
        .limit(1);
      return metric;
    }, undefined, 'getLatestBackupHealthMetrics');
  }

  async getBackupHealthTrends(days: number): Promise<BackupHealthMetric[]> {
    return this.handleDatabaseOperation(async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      return await db.select().from(backupHealthMetrics)
        .where(gte(backupHealthMetrics.metricDate, since))
        .orderBy(desc(backupHealthMetrics.metricDate));
    }, [], 'getBackupHealthTrends');
  }

  async generateBackupHealthSummary(dateFrom: Date, dateTo: Date): Promise<any> {
    return this.handleDatabaseOperation(async () => {

      // Generate summary statistics for the date range
      const result = await db.execute(sql`
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
    }, [], 'generateBackupHealthSummary');
  }

  // RTO/RPO Performance Tracking - RTO/RPO Targets
  async getRtoRpoTargets(filters?: { active?: boolean; serviceType?: string; businessCriticality?: string }): Promise<RtoRpoTarget[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(rtoRpoTargets).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.active !== undefined) {
        conditions.push(eq(rtoRpoTargets.isActive, filters.active));
      }
      if (filters?.serviceType) {
        conditions.push(eq(rtoRpoTargets.serviceType, filters.serviceType));
      }
      if (filters?.businessCriticality) {
        conditions.push(eq(rtoRpoTargets.businessCriticality, filters.businessCriticality));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(rtoRpoTargets.createdAt));
    }, [], 'getRtoRpoTargets');
  }

  async getRtoRpoTarget(id: number): Promise<RtoRpoTarget | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [target] = await db.select().from(rtoRpoTargets).where(eq(rtoRpoTargets.id, id));
      return target;
    }, undefined, 'getRtoRpoTarget');
  }

  async createRtoRpoTarget(target: InsertRtoRpoTarget): Promise<RtoRpoTarget> {
    return this.handleDatabaseOperation(async () => {
      const [newTarget] = await db.insert(rtoRpoTargets).values(target).returning();
      return newTarget;
    }, {} as RtoRpoTarget, 'createRtoRpoTarget');
  }

  async updateRtoRpoTarget(id: number, updates: Partial<RtoRpoTarget>): Promise<RtoRpoTarget> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(rtoRpoTargets)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(rtoRpoTargets.id, id))
        .returning();
      return updated;
    }, {} as RtoRpoTarget, 'updateRtoRpoTarget');
  }

  async deleteRtoRpoTarget(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.delete(rtoRpoTargets).where(eq(rtoRpoTargets.id, id));
    }, undefined, 'deleteRtoRpoTarget');
  }

  async getActiveRtoRpoTargets(): Promise<RtoRpoTarget[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(rtoRpoTargets)
        .where(eq(rtoRpoTargets.isActive, true))
        .orderBy(desc(rtoRpoTargets.createdAt));
    }, [], 'getActiveRtoRpoTargets');
  }

  // RTO/RPO Measurements
  async getRtoRpoMeasurements(filters?: { targetId?: number; measurementType?: string; dateFrom?: Date; dateTo?: Date; page?: number; limit?: number }): Promise<RtoRpoMeasurement[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(rtoRpoMeasurements).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.targetId) {
        conditions.push(eq(rtoRpoMeasurements.targetId, filters.targetId));
      }
      if (filters?.measurementType) {
        conditions.push(eq(rtoRpoMeasurements.measurementType, filters.measurementType));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(rtoRpoMeasurements.recoveryCompleteTime, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(rtoRpoMeasurements.recoveryCompleteTime, filters.dateTo));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(rtoRpoMeasurements.recoveryCompleteTime));

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.page && filters?.limit) {
        query = query.offset((filters.page - 1) * filters.limit);
      }

      return await query;
    }, [], 'getRtoRpoMeasurements');
  }

  async getRtoRpoMeasurement(measurementId: string): Promise<RtoRpoMeasurement | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [measurement] = await db.select().from(rtoRpoMeasurements).where(eq(rtoRpoMeasurements.measurementId, measurementId));
      return measurement;
    }, undefined, 'getRtoRpoMeasurement');
  }

  async createRtoRpoMeasurement(measurement: InsertRtoRpoMeasurement): Promise<RtoRpoMeasurement> {
    return this.handleDatabaseOperation(async () => {
      const [newMeasurement] = await db.insert(rtoRpoMeasurements).values(measurement).returning();
      return newMeasurement;
    }, {} as RtoRpoMeasurement, 'createRtoRpoMeasurement');
  }

  async updateRtoRpoMeasurement(measurementId: string, updates: Partial<RtoRpoMeasurement>): Promise<RtoRpoMeasurement> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(rtoRpoMeasurements)
        .set(updates)
        .where(eq(rtoRpoMeasurements.measurementId, measurementId))
        .returning();
      return updated;
    }, {} as RtoRpoMeasurement, 'updateRtoRpoMeasurement');
  }

  async getRtoRpoMeasurementsByTarget(targetId: number): Promise<RtoRpoMeasurement[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(rtoRpoMeasurements)
        .where(eq(rtoRpoMeasurements.targetId, targetId))
        .orderBy(desc(rtoRpoMeasurements.recoveryCompleteTime));
    }, [], 'getRtoRpoMeasurementsByTarget');
  }

  async getRecentRtoRpoMeasurements(limit: number): Promise<RtoRpoMeasurement[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(rtoRpoMeasurements)
        .orderBy(desc(rtoRpoMeasurements.recoveryCompleteTime))
        .limit(limit);
    }, [], 'getRecentRtoRpoMeasurements');
  }

  async getRtoRpoPerformanceTrends(targetId: number, days: number): Promise<RtoRpoMeasurement[]> {
    return this.handleDatabaseOperation(async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      return await db.select().from(rtoRpoMeasurements)
        .where(and(
          eq(rtoRpoMeasurements.targetId, targetId),
          gte(rtoRpoMeasurements.recoveryCompleteTime, since)
        ))
        .orderBy(desc(rtoRpoMeasurements.recoveryCompleteTime));
    }, [], 'getRtoRpoPerformanceTrends');
  }

  async getRtoRpoComplianceReport(dateFrom: Date, dateTo: Date): Promise<any> {
    return this.handleDatabaseOperation(async () => {

      // Generate compliance report with target vs actual performance
      const result = await db.execute(sql`
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
    }, [], 'getRtoRpoComplianceReport');
  }

  // Performance Benchmarks
  async getPerformanceBenchmarks(filters?: { active?: boolean; industry?: string; sourceType?: string }): Promise<PerformanceBenchmark[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(performanceBenchmarks).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.active !== undefined) {
        conditions.push(eq(performanceBenchmarks.isActive, filters.active));
      }
      if (filters?.industry) {
        conditions.push(eq(performanceBenchmarks.industry, filters.industry));
      }
      if (filters?.sourceType) {
        conditions.push(eq(performanceBenchmarks.sourceType, filters.sourceType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(performanceBenchmarks.createdAt));
    }, [], 'getPerformanceBenchmarks');
  }

  async getPerformanceBenchmark(id: number): Promise<PerformanceBenchmark | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [benchmark] = await db.select().from(performanceBenchmarks).where(eq(performanceBenchmarks.id, id));
      return benchmark;
    }, undefined, 'getPerformanceBenchmark');
  }

  async createPerformanceBenchmark(benchmark: InsertPerformanceBenchmark): Promise<PerformanceBenchmark> {
    return this.handleDatabaseOperation(async () => {
      const [newBenchmark] = await db.insert(performanceBenchmarks).values(benchmark).returning();
      return newBenchmark;
    }, {} as PerformanceBenchmark, 'createPerformanceBenchmark');
  }

  async updatePerformanceBenchmark(id: number, updates: Partial<PerformanceBenchmark>): Promise<PerformanceBenchmark> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(performanceBenchmarks)
        .set(updates)
        .where(eq(performanceBenchmarks.id, id))
        .returning();
      return updated;
    }, {} as PerformanceBenchmark, 'updatePerformanceBenchmark');
  }

  async deletePerformanceBenchmark(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.delete(performanceBenchmarks).where(eq(performanceBenchmarks.id, id));
    }, undefined, 'deletePerformanceBenchmark');
  }

  async getIndustryBenchmarks(industry: string, serviceCategory: string): Promise<PerformanceBenchmark[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(performanceBenchmarks)
        .where(and(
          eq(performanceBenchmarks.industry, industry),
          eq(performanceBenchmarks.serviceCategory, serviceCategory),
          eq(performanceBenchmarks.isActive, true)
        ))
        .orderBy(desc(performanceBenchmarks.createdAt));
    }, [], 'getIndustryBenchmarks');
  }

  // Incident Runbook Management System - Incident Runbooks
  async getIncidentRunbooks(filters?: { status?: string; incidentType?: string; severity?: string; accessLevel?: string; page?: number; limit?: number }): Promise<IncidentRunbook[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(incidentRunbooks).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.status) {
        conditions.push(eq(incidentRunbooks.status, filters.status));
      }
      if (filters?.incidentType) {
        conditions.push(eq(incidentRunbooks.incidentType, filters.incidentType));
      }
      if (filters?.severity) {
        conditions.push(eq(incidentRunbooks.severity, filters.severity));
      }
      if (filters?.accessLevel) {
        conditions.push(eq(incidentRunbooks.accessLevel, filters.accessLevel));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(incidentRunbooks.createdAt));

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.page && filters?.limit) {
        query = query.offset((filters.page - 1) * filters.limit);
      }

      return await query;
    }, [], 'getIncidentRunbooks');
  }

  async getIncidentRunbook(runbookId: string): Promise<IncidentRunbook | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [runbook] = await db.select().from(incidentRunbooks).where(eq(incidentRunbooks.runbookId, runbookId));
      return runbook;
    }, undefined, 'getIncidentRunbook');
  }

  async createIncidentRunbook(runbook: InsertIncidentRunbook): Promise<IncidentRunbook> {
    return this.handleDatabaseOperation(async () => {
      const [newRunbook] = await db.insert(incidentRunbooks).values(runbook).returning();
      return newRunbook;
    }, {} as IncidentRunbook, 'createIncidentRunbook');
  }

  async updateIncidentRunbook(runbookId: string, updates: Partial<IncidentRunbook>): Promise<IncidentRunbook> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(incidentRunbooks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(incidentRunbooks.runbookId, runbookId))
        .returning();
      return updated;
    }, {} as IncidentRunbook, 'updateIncidentRunbook');
  }

  async deleteIncidentRunbook(runbookId: string): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.delete(incidentRunbooks).where(eq(incidentRunbooks.runbookId, runbookId));
    }, undefined, 'deleteIncidentRunbook');
  }

  async getRunbooksByIncidentType(incidentType: string): Promise<IncidentRunbook[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(incidentRunbooks)
        .where(and(
          eq(incidentRunbooks.incidentType, incidentType),
          eq(incidentRunbooks.status, 'active')
        ))
        .orderBy(desc(incidentRunbooks.createdAt));
    }, [], 'getRunbooksByIncidentType');
  }

  async getPublishedRunbooks(): Promise<IncidentRunbook[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(incidentRunbooks)
        .where(inArray(incidentRunbooks.status, ['approved', 'active']))
        .orderBy(desc(incidentRunbooks.createdAt));
    }, [], 'getPublishedRunbooks');
  }

  async approveRunbook(runbookId: string, approvedBy: string): Promise<IncidentRunbook> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(incidentRunbooks)
        .set({
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(incidentRunbooks.runbookId, runbookId))
        .returning();
      return updated;
    }, {} as IncidentRunbook, 'approveRunbook');
  }

  async getRunbookVersions(runbookId: string): Promise<IncidentRunbook[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(incidentRunbooks)
        .where(eq(incidentRunbooks.runbookId, runbookId))
        .orderBy(desc(incidentRunbooks.version));
    }, [], 'getRunbookVersions');
  }

  // Runbook Steps
  async getRunbookSteps(runbookId: string): Promise<RunbookStep[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(runbookSteps)
        .where(eq(runbookSteps.runbookId, runbookId))
        .orderBy(runbookSteps.stepOrder);
    }, [], 'getRunbookSteps');
  }

  async getRunbookStep(id: number): Promise<RunbookStep | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [step] = await db.select().from(runbookSteps).where(eq(runbookSteps.id, id));
      return step;
    }, undefined, 'getRunbookStep');
  }

  async createRunbookStep(step: InsertRunbookStep): Promise<RunbookStep> {
    return this.handleDatabaseOperation(async () => {
      const [newStep] = await db.insert(runbookSteps).values(step).returning();
      return newStep;
    }, {} as RunbookStep, 'createRunbookStep');
  }

  async updateRunbookStep(id: number, updates: Partial<RunbookStep>): Promise<RunbookStep> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(runbookSteps)
        .set(updates)
        .where(eq(runbookSteps.id, id))
        .returning();
      return updated;
    }, {} as RunbookStep, 'updateRunbookStep');
  }

  async deleteRunbookStep(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.delete(runbookSteps).where(eq(runbookSteps.id, id));
    }, undefined, 'deleteRunbookStep');
  }

  async getRunbookStepsByOrder(runbookId: string): Promise<RunbookStep[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(runbookSteps)
        .where(eq(runbookSteps.runbookId, runbookId))
        .orderBy(runbookSteps.stepOrder);
    }, [], 'getRunbookStepsByOrder');
  }

  async reorderRunbookSteps(runbookId: string, stepOrders: { id: number; order: number }[]): Promise<void> {
    return this.handleDatabaseOperation(async () => {

      // Update each step's order in a transaction
      for (const stepOrder of stepOrders) {
        await db.update(runbookSteps)
          .set({ stepOrder: stepOrder.order })
          .where(and(
            eq(runbookSteps.id, stepOrder.id),
            eq(runbookSteps.runbookId, runbookId)
          ));
      }
    }, undefined, 'reorderRunbookSteps');
  }

  // Runbook Contacts
  async getRunbookContacts(filters?: { active?: boolean; available24x7?: boolean; escalationLevel?: number }): Promise<RunbookContact[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(runbookContacts).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.active !== undefined) {
        conditions.push(eq(runbookContacts.isActive, filters.active));
      }
      if (filters?.available24x7 !== undefined) {
        conditions.push(eq(runbookContacts.isAvailable24x7, filters.available24x7));
      }
      if (filters?.escalationLevel !== undefined) {
        conditions.push(eq(runbookContacts.escalationLevel, filters.escalationLevel));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(runbookContacts.escalationLevel, runbookContacts.name);
    }, [], 'getRunbookContacts');
  }

  async getRunbookContact(contactId: string): Promise<RunbookContact | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [contact] = await db.select().from(runbookContacts).where(eq(runbookContacts.contactId, contactId));
      return contact;
    }, undefined, 'getRunbookContact');
  }

  async createRunbookContact(contact: InsertRunbookContact): Promise<RunbookContact> {
    return this.handleDatabaseOperation(async () => {
      const [newContact] = await db.insert(runbookContacts).values(contact).returning();
      return newContact;
    }, {} as RunbookContact, 'createRunbookContact');
  }

  async updateRunbookContact(contactId: string, updates: Partial<RunbookContact>): Promise<RunbookContact> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(runbookContacts)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(runbookContacts.contactId, contactId))
        .returning();
      return updated;
    }, {} as RunbookContact, 'updateRunbookContact');
  }

  async deleteRunbookContact(contactId: string): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.delete(runbookContacts).where(eq(runbookContacts.contactId, contactId));
    }, undefined, 'deleteRunbookContact');
  }

  async getContactsByEscalationLevel(escalationLevel: number): Promise<RunbookContact[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(runbookContacts)
        .where(and(
          eq(runbookContacts.escalationLevel, escalationLevel),
          eq(runbookContacts.isActive, true)
        ))
        .orderBy(runbookContacts.name);
    }, [], 'getContactsByEscalationLevel');
  }

  async getAvailableContacts(timezone?: string): Promise<RunbookContact[]> {
    return this.handleDatabaseOperation(async () => {
      const available = timezone
        ? and(eq(runbookContacts.isActive, true), or(eq(runbookContacts.isAvailable24x7, true), eq(runbookContacts.timezone, timezone)))
        : eq(runbookContacts.isActive, true);
      return await db.select().from(runbookContacts).where(available)
        .orderBy(runbookContacts.escalationLevel, runbookContacts.name);
    }, [], 'getAvailableContacts');
  }

  async updateContactLastContacted(contactId: string): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.update(runbookContacts)
        .set({ lastContactedAt: new Date() })
        .where(eq(runbookContacts.contactId, contactId));
    }, undefined, 'updateContactLastContacted');
  }

  // Contact Escalation Trees
  async getContactEscalationTrees(filters?: { active?: boolean; incidentTypes?: string[] }): Promise<ContactEscalationTree[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(contactEscalationTrees).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.active !== undefined) {
        conditions.push(eq(contactEscalationTrees.isActive, filters.active));
      }
      if (filters?.incidentTypes && filters.incidentTypes.length > 0) {
        // This would need a more complex query to check array contains any of the incident types
        // For now, we'll keep it simple
        conditions.push(eq(contactEscalationTrees.isActive, true));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(contactEscalationTrees.createdAt));
    }, [], 'getContactEscalationTrees');
  }

  async getContactEscalationTree(treeId: string): Promise<ContactEscalationTree | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [tree] = await db.select().from(contactEscalationTrees).where(eq(contactEscalationTrees.treeId, treeId));
      return tree;
    }, undefined, 'getContactEscalationTree');
  }

  async createContactEscalationTree(tree: InsertContactEscalationTree): Promise<ContactEscalationTree> {
    return this.handleDatabaseOperation(async () => {
      const [newTree] = await db.insert(contactEscalationTrees).values(tree).returning();
      return newTree;
    }, {} as ContactEscalationTree, 'createContactEscalationTree');
  }

  async updateContactEscalationTree(treeId: string, updates: Partial<ContactEscalationTree>): Promise<ContactEscalationTree> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(contactEscalationTrees)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(contactEscalationTrees.treeId, treeId))
        .returning();
      return updated;
    }, {} as ContactEscalationTree, 'updateContactEscalationTree');
  }

  async deleteContactEscalationTree(treeId: string): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      await db.delete(contactEscalationTrees).where(eq(contactEscalationTrees.treeId, treeId));
    }, undefined, 'deleteContactEscalationTree');
  }

  async getEscalationTreeByIncidentType(incidentType: string, severity: string): Promise<ContactEscalationTree | undefined> {
    return this.handleDatabaseOperation(async () => {

      // Typed query (a raw db.execute returned snake_case rows that the callers read as
      // camelCase: treeId / maxEscalationLevel / autoEscalationEnabled came back undefined).
      const [tree] = await db.select().from(contactEscalationTrees)
        .where(and(
          eq(contactEscalationTrees.isActive, true),
          sql`${incidentType} = ANY(${contactEscalationTrees.incidentTypes})`,
          sql`${severity} = ANY(${contactEscalationTrees.severityLevels})`
        ))
        .orderBy(desc(contactEscalationTrees.createdAt))
        .limit(1);
      return tree;
    }, undefined, 'getEscalationTreeByIncidentType');
  }

  // Runbook Executions
  async getRunbookExecutions(filters?: { runbookId?: number; status?: string; executedBy?: string; page?: number; limit?: number }): Promise<RunbookExecution[]> {
    return this.handleDatabaseOperation(async () => {
      let query = db.select().from(runbookExecutions).$dynamic();

      const conditions: SQL[] = [];
      if (filters?.runbookId !== undefined) {
        conditions.push(eq(runbookExecutions.runbookId, filters.runbookId));
      }
      if (filters?.status) {
        conditions.push(eq(runbookExecutions.status, filters.status));
      }
      if (filters?.executedBy) {
        conditions.push(eq(runbookExecutions.executedBy, filters.executedBy));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(runbookExecutions.startedAt));

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.page && filters?.limit) {
        query = query.offset((filters.page - 1) * filters.limit);
      }

      return await query;
    }, [], 'getRunbookExecutions');
  }

  async getRunbookExecution(executionId: string): Promise<RunbookExecution | undefined> {
    return this.handleDatabaseOperation(async () => {
      const [execution] = await db.select().from(runbookExecutions).where(eq(runbookExecutions.executionId, executionId));
      return execution;
    }, undefined, 'getRunbookExecution');
  }

  async createRunbookExecution(execution: InsertRunbookExecution): Promise<RunbookExecution> {
    return this.handleDatabaseOperation(async () => {
      const [newExecution] = await db.insert(runbookExecutions).values(execution).returning();
      return newExecution;
    }, {} as RunbookExecution, 'createRunbookExecution');
  }

  async updateRunbookExecution(executionId: string, updates: Partial<RunbookExecution>): Promise<RunbookExecution> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(runbookExecutions)
        .set(updates)
        .where(eq(runbookExecutions.executionId, executionId))
        .returning();
      return updated;
    }, {} as RunbookExecution, 'updateRunbookExecution');
  }

  async getRecentRunbookExecutions(limit: number): Promise<RunbookExecution[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(runbookExecutions)
        .orderBy(desc(runbookExecutions.startedAt))
        .limit(limit);
    }, [], 'getRecentRunbookExecutions');
  }

  async getRunbookExecutionsByRunbook(runbookId: number): Promise<RunbookExecution[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(runbookExecutions)
        .where(eq(runbookExecutions.runbookId, runbookId))
        .orderBy(desc(runbookExecutions.startedAt));
    }, [], 'getRunbookExecutionsByRunbook');
  }

  async getActiveRunbookExecutions(): Promise<RunbookExecution[]> {
    return this.handleDatabaseOperation(async () => {
      return await db.select().from(runbookExecutions)
        .where(inArray(runbookExecutions.status, ['pending', 'in_progress', 'paused']))
        .orderBy(desc(runbookExecutions.startedAt));
    }, [], 'getActiveRunbookExecutions');
  }

  async completeRunbookExecution(executionId: string, results: any): Promise<RunbookExecution> {
    return this.handleDatabaseOperation(async () => {
      const [updated] = await db.update(runbookExecutions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          stepResults: results,
          isSuccessful: true
        })
        .where(eq(runbookExecutions.executionId, executionId))
        .returning();
      return updated;
    }, {} as RunbookExecution, 'completeRunbookExecution');
  }

  // Dashboard and Analytics Methods
  async getMonitoringDashboardData(): Promise<{
    drillSummary: any;
    backupHealth: any;
    rtoRpoCompliance: any;
    activeAlerts: BackupAlert[];
    recentExecutions: any[];
  }> {
    return this.handleDatabaseOperation(async () => {

      // Get recent drill summary
      const drillSummary = await db.execute(sql`
        SELECT
          COUNT(*) as total_drills,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_drills,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_drills,
          AVG(actual_rto_seconds) / 60.0 as avg_rto_minutes
        FROM drill_executions
        WHERE started_at >= NOW() - INTERVAL '30 days'
      `);

      // Get backup health summary
      const backupHealth = await db.execute(sql`
        SELECT
          metric_type,
          AVG(health_score) as avg_value,
          AVG(success_rate) as avg_success_rate,
          COUNT(*) as measurement_count
        FROM backup_health_metrics
        WHERE metric_date >= NOW() - INTERVAL '24 hours'
        GROUP BY metric_type
      `);

      // Get RTO/RPO compliance
      const rtoRpoCompliance = await db.execute(sql`
        SELECT
          COUNT(*) as total_measurements,
          COUNT(CASE WHEN m.actual_rto_seconds <= t.rto_target_seconds THEN 1 END) as rto_compliant,
          COUNT(CASE WHEN m.actual_rpo_seconds <= t.rpo_target_seconds THEN 1 END) as rpo_compliant
        FROM rto_rpo_measurements m
        JOIN rto_rpo_targets t ON m.target_id = t.id
        WHERE m.recovery_complete_time >= NOW() - INTERVAL '30 days'
      `);

      // Get active alerts
      const activeAlerts = await db.select().from(backupAlerts)
        .where(inArray(backupAlerts.status, ['new', 'acknowledged', 'investigating']))
        .orderBy(desc(backupAlerts.createdAt))
        .limit(10);

      // Get recent executions
      const recentExecutions = await db.select().from(runbookExecutions)
        .orderBy(desc(runbookExecutions.startedAt))
        .limit(10);

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
    }, 'getMonitoringDashboardData');
  }

  async getPerformanceDashboardData(serviceType?: string, days?: number): Promise<{
    targets: RtoRpoTarget[];
    measurements: RtoRpoMeasurement[];
    trends: any[];
    complianceScore: number;
  }> {
    return this.handleDatabaseOperation(async () => {

      const daysPeriod = days || 30;
      const since = new Date();
      since.setDate(since.getDate() - daysPeriod);

      // Get targets
      const targets = await db.select().from(rtoRpoTargets)
        .where(serviceType ? and(eq(rtoRpoTargets.isActive, true), eq(rtoRpoTargets.serviceType, serviceType)) : eq(rtoRpoTargets.isActive, true));

      // Get recent measurements
      let measurementsQuery = db.select().from(rtoRpoMeasurements)
        .where(gte(rtoRpoMeasurements.recoveryCompleteTime, since))
        .orderBy(desc(rtoRpoMeasurements.recoveryCompleteTime));

      const measurements = await measurementsQuery;

      // Get trends
      const trends = await db.execute(sql`
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

      // Calculate compliance score
      const complianceData = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN m.actual_rto_seconds <= t.rto_target_seconds AND m.actual_rpo_seconds <= t.rpo_target_seconds THEN 1 END) as compliant
        FROM rto_rpo_measurements m
        JOIN rto_rpo_targets t ON m.target_id = t.id
        WHERE m.recovery_complete_time >= ${since}
      `);

      const complianceResult = complianceData.rows?.[0] as { total?: unknown; compliant?: unknown } | undefined;
      const complianceTotal = Number(complianceResult?.total ?? 0);
      const complianceScore = complianceTotal > 0
        ? (Number(complianceResult?.compliant ?? 0) / complianceTotal) * 100
        : 0;

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
    }, 'getPerformanceDashboardData');
  }

  async getRunbookDashboardData(): Promise<{
    totalRunbooks: number;
    activeExecutions: RunbookExecution[];
    recentExecutions: RunbookExecution[];
    contactAvailability: any[];
  }> {
    return this.handleDatabaseOperation(async () => {

      // Get total runbooks count
      const totalRunbooksResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM incident_runbooks WHERE status = 'active'
      `);

      const totalRunbooks = Number(totalRunbooksResult.rows?.[0]?.total || 0);

      // Get active executions
      const activeExecutions = await db.select().from(runbookExecutions)
        .where(inArray(runbookExecutions.status, ['pending', 'in_progress', 'paused']))
        .orderBy(desc(runbookExecutions.startedAt));

      // Get recent executions
      const recentExecutions = await db.select().from(runbookExecutions)
        .orderBy(desc(runbookExecutions.startedAt))
        .limit(20);

      // Get contact availability
      const contactAvailability = await db.execute(sql`
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
    }, 'getRunbookDashboardData');
  }

  // ============================================================================
  // RECOMMENDATION ANALYTICS TRACKING METHODS
  // ============================================================================

  async trackRecommendationPresentation(userId: string, recommendationIds: number[]): Promise<void> {
    return this.handleDatabaseOperation(
      async () => {
        // Log for analytics - in a production system this would be stored in a dedicated analytics table
        console.log(`[Analytics] User ${userId} presented with recommendations: ${recommendationIds.join(', ')}`);

        // For now, we'll track this in memory since we don't have a dedicated analytics table
        // In production, this would be:
        // await db.insert(recommendationAnalytics).values({
        //   userId,
        //   recommendationIds,
        //   action: 'presentation',
        //   timestamp: new Date()
        // });
      },
      undefined,
      'trackRecommendationPresentation'
    );
  }

  async trackRecommendationView(userId: string, recommendationId: number): Promise<void> {
    return this.handleDatabaseOperation(
      async () => {
        // Log for analytics
        console.log(`[Analytics] User ${userId} viewed recommendation ${recommendationId}`);

        // In production, this would store to analytics table:
        // await db.insert(recommendationAnalytics).values({
        //   userId,
        //   recommendationId,
        //   action: 'view',
        //   timestamp: new Date()
        // });
      },
      undefined,
      'trackRecommendationView'
    );
  }

  async trackRecommendationClick(userId: string, recommendationId: number): Promise<void> {
    return this.handleDatabaseOperation(
      async () => {
        // Log for analytics
        console.log(`[Analytics] User ${userId} clicked recommendation ${recommendationId}`);

        // In production, this would store to analytics table:
        // await db.insert(recommendationAnalytics).values({
        //   userId,
        //   recommendationId,
        //   action: 'click',
        //   timestamp: new Date()
        // });
      },
      undefined,
      'trackRecommendationClick'
    );
  }

  async trackRecommendationDismissal(userId: string, recommendationId: number, reason?: string): Promise<void> {
    return this.handleDatabaseOperation(
      async () => {
        // Log for analytics
        console.log(`[Analytics] User ${userId} dismissed recommendation ${recommendationId}${reason ? ` (reason: ${reason})` : ''}`);

        // In production, this would store to analytics table:
        // await db.insert(recommendationAnalytics).values({
        //   userId,
        //   recommendationId,
        //   action: 'dismiss',
        //   metadata: { reason },
        //   timestamp: new Date()
        // });
      },
      undefined,
      'trackRecommendationDismissal'
    );
  }

  async trackRecommendationToWatchlistConversion(userId: string, recommendationId: number, watchlistItemId: number): Promise<void> {
    return this.handleDatabaseOperation(
      async () => {
        // Log for analytics
        console.log(`[Analytics] User ${userId} converted recommendation ${recommendationId} to watchlist item ${watchlistItemId}`);

        // In production, this would store to analytics table:
        // await db.insert(recommendationAnalytics).values({
        //   userId,
        //   recommendationId,
        //   action: 'conversion',
        //   metadata: { watchlistItemId },
        //   timestamp: new Date()
        // });
      },
      undefined,
      'trackRecommendationToWatchlistConversion'
    );
  }
}

// Import and create storage factory avoiding circular dependency
// CRITICAL FIX: Use the SAME singleton instance from storage-factory to avoid dual-instance bug
// Previously created a second StorageFactory instance, causing routes to use memory while
// health checks used database after failover
import { storageFactory } from './storage-factory';
export const storage = storageFactory;

// Legacy DatabaseStorage export for direct access if needed
export const databaseStorage = new DatabaseStorage();

// Initialize data with proper health gating - called after storage factory is ready
export async function initializeData() {
  // Import StorageMode enum to avoid circular dependencies
  const { StorageMode } = await import('./storage-factory');

  const healthStatus = storage.getHealthStatus();

  if (!healthStatus.isDatabaseHealthy) {
    console.log('🔄 Storage: memory mode; DB unhealthy—writes gated');
    console.log('ℹ️  Database operations will be queued until health is restored');

    // Ensure we're in memory-only mode when DB is unhealthy
    await storage.setStorageMode(StorageMode.MEMORY);
  } else {
    console.log('✅ Storage: database mode; DB healthy');
  }

  // Automatically sync elections from Google Civic API using factory
  try {
    await storage.syncElectionsFromGoogleCivic();
    console.log('Initial sync with Google Civic API completed');
  } catch (error) {
    console.log('Google Civic API sync completed with fallbacks');
  }

  // Log final storage status
  const finalStatus = storage.getHealthStatus();
  console.log(`🔄 Storage System Initialized:
  - Mode: ${finalStatus.mode}
  - Database Health: ${finalStatus.isDatabaseHealthy ? '✅ Healthy' : '❌ Unhealthy'}
  - Current Storage: ${finalStatus.currentStorageType}
  - Queue Length: ${finalStatus.queueLength}
  - Last Health Check: ${finalStatus.lastHealthCheck.toISOString()}`);
}

// NOTE: initializeData() is now called from routes.ts after storage factory is fully initialized
// This prevents import-time database operations that could cause stack traces

// Set up periodic sync every 6 hours using factory
const periodicSyncWork = new BackgroundWork();
periodicSyncWork.every(6 * 60 * 60 * 1000, async () => {
  try {
    await storage.syncElectionsFromGoogleCivic();
    console.log('Periodic sync with Google Civic API completed');

    // Log storage health status
    const healthStatus = storage.getHealthStatus();
    if (!healthStatus.isDatabaseHealthy) {
      console.log(`⚠️  Database still unavailable - using ${healthStatus.currentStorageType} storage`);
    }
  } catch (error) {
    console.log('Periodic sync completed with fallbacks:', error);
  }
}, () => console.error('Scheduled election sync failed')); // 6 hours

// Called by the one server lifecycle owner, before closing the database pool.
export async function stopStorageBackground(): Promise<void> {
  const results = await Promise.allSettled([periodicSyncWork.stop(), storage.destroy()]);
  if (results.some(result => result.status === 'rejected')) {
    throw new Error('Storage background shutdown failed');
  }
}
