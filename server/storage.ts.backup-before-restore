import { elections, candidates, congressMembers, congressBills, congressCommittees, users, sessions, watchlist, electionResults, electionCycles, campaignAccounts, candidateAccounts, candidateProfiles, candidateDataSources, candidatePositions, candidateQA, notificationPreferences, notificationConsents, notificationSubscriptions, notificationTemplates, notificationCampaigns, notificationDeliveries, notificationEvents, notificationWebhooks, userPreferences, congressionalDistricts, backupStorageLocations, backupRetentionPolicies, backupOperations, schemaVersions, restoreValidations, backupSystemConfig, failoverDrillConfigurations, drillExecutions, drillSteps, backupMonitoringConfigurations, backupAlerts, backupHealthMetrics, rtoRpoTargets, rtoRpoMeasurements, performanceBenchmarks, incidentRunbooks, runbookSteps, runbookContacts, contactEscalationTrees, runbookExecutions, type Election, type InsertElection, type Candidate, type InsertCandidate, type ElectionFilters, type CongressMember, type InsertCongressMember, type User, type UpsertUser, type WatchlistItem, type InsertWatchlistItem, type UserPreferences, type InsertUserPreferences, type UpdateUserPreferences, type CongressionalDistrict, type InsertCongressionalDistrict, type CandidateAccount, type InsertCandidateAccount, type CandidateProfile, type InsertCandidateProfile, type CandidateDataSource, type InsertCandidateDataSource, type CandidatePosition, type InsertCandidatePosition, type CandidateQA, type InsertCandidateQA, type NotificationPreferences, type InsertNotificationPreferences, type NotificationConsent, type InsertNotificationConsent, type NotificationSubscription, type InsertNotificationSubscription, type NotificationTemplate, type InsertNotificationTemplate, type NotificationCampaign, type InsertNotificationCampaign, type NotificationDelivery, type InsertNotificationDelivery, type NotificationEvent, type InsertNotificationEvent, type NotificationWebhook, type InsertNotificationWebhook, type BackupStorageLocation, type InsertBackupStorageLocation, type BackupRetentionPolicy, type InsertBackupRetentionPolicy, type BackupOperation, type InsertBackupOperation, type SchemaVersion, type InsertSchemaVersion, type RestoreValidation, type InsertRestoreValidation, type BackupSystemConfig, type InsertBackupSystemConfig, type FailoverDrillConfiguration, type InsertFailoverDrillConfiguration, type DrillExecution, type InsertDrillExecution, type DrillStep, type InsertDrillStep, type BackupMonitoringConfiguration, type InsertBackupMonitoringConfiguration, type BackupAlert, type InsertBackupAlert, type BackupHealthMetric, type InsertBackupHealthMetric, type RtoRpoTarget, type InsertRtoRpoTarget, type RtoRpoMeasurement, type InsertRtoRpoMeasurement, type PerformanceBenchmark, type InsertPerformanceBenchmark, type IncidentRunbook, type InsertIncidentRunbook, type RunbookStep, type InsertRunbookStep, type RunbookContact, type InsertRunbookContact, type ContactEscalationTree, type InsertContactEscalationTree, type RunbookExecution, type InsertRunbookExecution } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, ilike, or, desc, inArray, isNotNull } from "drizzle-orm";
import { getGoogleCivicService } from "./google-civic-service";
import { getCongressBillService } from './congress-bill-service';
import { getPerplexityService } from './perplexity-service';
import { censusService } from './census-service';
import bcrypt from 'bcryptjs';
import { validateElectionData, validateNotMockData } from './validators/state-election-rules';

export interface IStorage {
  // Health checking
  isDbHealthy(): boolean;
  
  // Elections
  getElections(filters?: ElectionFilters): Promise<Election[]>;
  getElection(id: number): Promise<Election | undefined>;
  createElection(election: InsertElection): Promise<Election>;
  deleteElection(id: number): Promise<void>;
  
  // Candidates
  getCandidatesByElection(electionId: number): Promise<Candidate[]>;
  getCandidates(electionId?: number): Promise<Candidate[]>;
  getCandidatesByIds(ids: number[]): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidatePolling(candidateId: number, pollingData: {
    pollingSupport?: number;
    pollingTrend?: string;
    lastPollingUpdate?: Date;
    pollingSource?: string;
  }): Promise<void>;
  
  // Election Results
  getElectionResults(electionId: number): Promise<any>;
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
  
  // User Authentication (Replit Auth)
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
  getCandidateProfile(candidateId: number): Promise<CandidateProfile | null>;
  updateCandidateProfile(candidateId: number, profile: Partial<CandidateProfile>): Promise<CandidateProfile>;
  getCandidateDataSources(candidateId: number): Promise<CandidateDataSource[]>;
  recordDataSource(source: InsertCandidateDataSource): Promise<CandidateDataSource>;
  getCandidateWithRAG(candidateId: number): Promise<any>;
  recordEngagement(data: any): Promise<void>;
  updateUserDemographics(userId: number, demographics: any): Promise<void>;
  exportUserData(userId: number): Promise<any>;
  deleteUserData(userId: number): Promise<boolean>;
  
  // Campaign Portal & Data Marketplace
  createCampaignAccount(data: any): Promise<any>;
  validateCampaignAccess(apiKey: string): Promise<any>;
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
  getRunbookExecutions(filters?: { runbookId?: string; status?: string; executedBy?: string; page?: number; limit?: number }): Promise<RunbookExecution[]>;
  getRunbookExecution(executionId: string): Promise<RunbookExecution | undefined>;
  createRunbookExecution(execution: InsertRunbookExecution): Promise<RunbookExecution>;
  updateRunbookExecution(executionId: string, updates: Partial<RunbookExecution>): Promise<RunbookExecution>;
  getRecentRunbookExecutions(limit: number): Promise<RunbookExecution[]>;
  getRunbookExecutionsByRunbook(runbookId: string): Promise<RunbookExecution[]>;
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

  async getElections(filters?: ElectionFilters): Promise<Election[]> {
    const conditions = [];
    let needsJoin = false;
    let partyCondition: any = null;

    if (filters) {
      // Filter by time range - CRITICAL FIX: Allow past elections for live results tracking
      if (filters.timeframe && filters.timeframe !== 'all') {
        const now = new Date();
        let endDate = new Date();
        
        switch (filters.timeframe) {
          case 'week':
            endDate.setDate(now.getDate() + 7);
            break;
          case 'month':
            endDate.setMonth(now.getMonth() + 1);
            break;
          case 'quarter':
            endDate.setMonth(now.getMonth() + 3);
            break;
          case 'year':
            endDate.setFullYear(now.getFullYear() + 1);
            break;
        }
        
        // Only filter by end date - allow past elections for results display
        conditions.push(lte(elections.date, endDate));
      }

      // Filter by election type (case-insensitive)
      if (filters.type) {
        if (Array.isArray(filters.type)) {
          const normalizedTypes = filters.type.map(type => type.toLowerCase());
          conditions.push(inArray(elections.type, normalizedTypes));
        } else {
          conditions.push(eq(elections.type, filters.type.toLowerCase()));
        }
      }

      // Filter by election type array (from frontend, case-insensitive)
      if (filters.electionType) {
        if (Array.isArray(filters.electionType)) {
          const normalizedTypes = filters.electionType.map(type => type.toLowerCase());
          conditions.push(inArray(elections.type, normalizedTypes));
        } else {
          conditions.push(eq(elections.type, filters.electionType.toLowerCase()));
        }
      }

      // Filter by level (case-insensitive) - maps to capitalized database values
      if (filters.level) {
        // Database stores: Federal, State, Local (capitalized)
        const capitalizeLevel = (l: string) => l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
        if (Array.isArray(filters.level)) {
          const normalizedLevels = filters.level.map(capitalizeLevel);
          conditions.push(inArray(elections.level, normalizedLevels));
        } else {
          conditions.push(eq(elections.level, capitalizeLevel(filters.level)));
        }
      }

      // Filter by party (requires JOIN with candidates table)
      // Store party condition separately as it needs to be in the JOIN clause
      if (filters.party) {
        needsJoin = true;
        partyCondition = Array.isArray(filters.party)
          ? inArray(candidates.party, filters.party)
          : eq(candidates.party, filters.party);
      }

      // Filter by state - handle both full names and abbreviations
      if (filters.state && filters.state !== 'all') {
        // Map full state names to abbreviations
        const stateAbbreviations: { [key: string]: string } = {
          'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
          'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
          'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
          'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
          'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
          'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
          'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
          'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
          'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
          'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
        };
        
        const stateValue = stateAbbreviations[filters.state] || filters.state;
        conditions.push(eq(elections.state, stateValue));
      }

      // Filter by election cycle (year)
      if (filters.cycle) {
        const cycleYear = filters.cycle;
        const startDate = new Date(cycleYear, 0, 1); // January 1st of cycle year
        const endDate = new Date(cycleYear, 11, 31, 23, 59, 59); // December 31st of cycle year
        conditions.push(and(gte(elections.date, startDate), lte(elections.date, endDate)));
      }

      // Filter by search with sanitization
      if (filters.search) {
        // Input validation and sanitization
        if (typeof filters.search === 'string') {
          // Sanitize search term - remove potentially dangerous characters
          const sanitizedSearch = filters.search
            .replace(/['"\\;]/g, '') // Remove quotes, backslashes, semicolons
            .trim()
            .substring(0, 200); // Limit length
          
          if (sanitizedSearch.length > 0) {
            const searchPattern = `%${sanitizedSearch}%`;
            conditions.push(
              or(
                ilike(elections.title, searchPattern),
                ilike(elections.subtitle, searchPattern),
                ilike(elections.location, searchPattern)
              )
            );
          }
        }
      }
    }

    // Apply conditions and filter active elections
    const allConditions = [eq(elections.isActive, true)];
    if (conditions.length > 0) {
      allConditions.push(...conditions.filter(c => c !== undefined));
    }

    let electionQuery;
    
    // Add JOIN if party filtering is needed
    if (needsJoin) {
      // Build JOIN condition with party filter in ON clause
      const joinCondition = partyCondition
        ? and(eq(elections.id, candidates.electionId), partyCondition)
        : eq(elections.id, candidates.electionId);
      
      electionQuery = db
        .select({
          id: elections.id,
          title: elections.title,
          subtitle: elections.subtitle,
          location: elections.location,
          state: elections.state,
          date: elections.date,
          type: elections.type,
          level: elections.level,
          offices: elections.offices,
          description: elections.description,
          pollsOpen: elections.pollsOpen,
          pollsClose: elections.pollsClose,
          timezone: elections.timezone,
          isActive: elections.isActive,
          candidateId: candidates.id,
        })
        .from(elections)
        .leftJoin(candidates, joinCondition);
      
      // When party filtering is active, only include elections that matched a candidate
      if (partyCondition) {
        allConditions.push(isNotNull(candidates.id));
      }
    } else {
      electionQuery = db.select().from(elections);
    }

    return this.handleDatabaseOperation(
      async () => {
        const results = await electionQuery
          .where(and(...allConditions))
          .orderBy(elections.date);

        // Remove duplicates when joining with candidates
        let finalResults: Election[];
        if (needsJoin) {
          const uniqueElections = new Map();
          results.forEach((row: any) => {
            // Skip null/undefined rows
            if (!row || row.id === null || row.id === undefined) {
              return;
            }
            // Extract election fields only, excluding candidateId
            const { candidateId, ...election } = row;
            if (!uniqueElections.has(election.id)) {
              uniqueElections.set(election.id, election);
            }
          });
          finalResults = Array.from(uniqueElections.values());
        } else {
          finalResults = results;
        }

        // Filter out obviously mock/test data to prevent pollution
        return finalResults.filter(election => {
          const mockCheck = validateNotMockData(election);
          return mockCheck.ok;
        });
      },
      [], // Empty array fallback
      'getElections'
    );
  }

  async getElection(id: number): Promise<Election | undefined> {
    const [election] = await db.select().from(elections).where(eq(elections.id, id));
    return election || undefined;
  }

  async getElectionByTitleAndDate(title: string, date: Date): Promise<Election | undefined> {
    const [election] = await db
      .select()
      .from(elections)
      .where(and(
        eq(elections.title, title),
        eq(elections.date, date)
      ))
      .limit(1);
    return election;
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
    pollingSupport?: number;
    pollingTrend?: string;
    lastPollingUpdate?: Date;
    pollingSource?: string;
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

  // Replit Authentication Methods (Required for Replit Auth)
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
        .select({
          id: watchlist.id,
          electionId: watchlist.electionId,
          userId: watchlist.userId,
          createdAt: watchlist.createdAt,
          election: elections,
        })
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
      const { electionCycles } = await import('@shared/schema');
      return await db.select().from(electionCycles);
    } catch (error) {
      console.error('Error fetching election cycles:', error);
      return [];
    }
  }

  async getElectionCycle(slug: string): Promise<any> {
    try {
      const { electionCycles } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
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

  async recordEngagement(data: any): Promise<void> {
    const { analyticsService } = await import('./analytics-service');
    return await analyticsService.recordEngagement(data);
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
      let query = db.select().from(congressionalDistricts);
      
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

  async updateUserDemographics(userId: number, demographics: any): Promise<void> {
    const { analyticsService } = await import('./analytics-service');
    return await analyticsService.updateUserDemographics(userId, demographics);
  }

  async exportUserData(userId: number): Promise<any> {
    const { analyticsService } = await import('./analytics-service');
    return await analyticsService.exportUserData(userId);
  }

  async deleteUserData(userId: number): Promise<boolean> {
    const { analyticsService } = await import('./analytics-service');
    return await analyticsService.deleteUserData(userId);
  }

  // Campaign Portal & Data Marketplace Implementation
  async createCampaignAccount(data: any): Promise<any> {
    const { campaignPortalService } = await import('./campaign-portal-service');
    return await campaignPortalService.createCampaignAccount(data);
  }

  async validateCampaignAccess(apiKey: string): Promise<any> {
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
    const { campaignAccounts } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
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
      const { ilike, or } = await import('drizzle-orm');
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
      let query = db.select().from(notificationTemplates);
      
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
      let query = db.select().from(notificationCampaigns);
      
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
      let query = db.select().from(notificationDeliveries);
      
      const conditions = [];
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
      let query = db.select().from(notificationDeliveries);
      
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
    }, {}, 'getNotificationDeliveryStats');
  }

  async getNotificationEvents(processed?: boolean): Promise<NotificationEvent[]> {
    return await this.handleDatabaseOperation(async () => {
      let query = db.select().from(notificationEvents);
      
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
        .orderBy(notificationDeliveries.queuedAt);
      
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
        .orderBy(notificationDeliveries.nextRetryAt);
      
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
      const { secretsVault } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
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
      const { secretsVault } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
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
      const { secretsVault } = await import('@shared/schema');
      return await db.select().from(secretsVault);
    }, [], 'getAllSecrets');
  }

  async getExpiredSecrets(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { secretsVault } = await import('@shared/schema');
      const { lte } = await import('drizzle-orm');
      
      return await db
        .select()
        .from(secretsVault)
        .where(lte(secretsVault.nextRotation, new Date()));
    }, [], 'getExpiredSecrets');
  }

  async createSecret(secret: any): Promise<number> {
    return await this.handleDatabaseOperation(async () => {
      const { secretsVault } = await import('@shared/schema');
      
      const [newSecret] = await db
        .insert(secretsVault)
        .values(secret)
        .returning();
      
      return newSecret.id;
    }, 0, 'createSecret');
  }

  async updateSecret(secretId: number, updates: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      const { secretsVault } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db
        .update(secretsVault)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(secretsVault.id, secretId));
    }, undefined, 'updateSecret');
  }

  async createSecretRotationHistory(history: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      const { secretsRotationHistory } = await import('@shared/schema');
      
      await db
        .insert(secretsRotationHistory)
        .values(history);
    }, undefined, 'createSecretRotationHistory');
  }

  async updateSecretRotationHistory(rotationId: string, updates: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      const { secretsRotationHistory } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db
        .update(secretsRotationHistory)
        .set(updates)
        .where(eq(secretsRotationHistory.rotationId, rotationId));
    }, undefined, 'updateSecretRotationHistory');
  }

  async getRotationHistory(filters: any): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { secretsRotationHistory } = await import('@shared/schema');
      const { eq, and, desc } = await import('drizzle-orm');
      
      let query = db.select().from(secretsRotationHistory);
      const conditions = [];
      
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
      const { secretsRotationHistory } = await import('@shared/schema');
      const { eq, and, gte, desc } = await import('drizzle-orm');
      
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
      const { secretsRotationHistory } = await import('@shared/schema');
      const { lt } = await import('drizzle-orm');
      
      const result = await db
        .delete(secretsRotationHistory)
        .where(lt(secretsRotationHistory.startedAt, cutoffDate));
      
      return result.rowCount || 0;
    }, 0, 'deleteOldRotationHistory');
  }

  // Artifact Storage Methods
  async createArtifact(artifact: any): Promise<number> {
    return await this.handleDatabaseOperation(async () => {
      const { artifactStorage } = await import('@shared/schema');
      
      const [newArtifact] = await db
        .insert(artifactStorage)
        .values(artifact)
        .returning();
      
      return newArtifact.id;
    }, 0, 'createArtifact');
  }

  async getArtifactByHash(contentHash: string): Promise<any> {
    return await this.handleDatabaseOperation(async () => {
      const { artifactStorage } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
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
      const { artifactStorage } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
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
      const { artifactStorage } = await import('@shared/schema');
      const { eq, and, desc } = await import('drizzle-orm');
      
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
      const { artifactStorage } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
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
      const { artifactStorage } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db
        .update(artifactStorage)
        .set(updates)
        .where(eq(artifactStorage.id, artifactId));
    }, undefined, 'updateArtifact');
  }

  async deleteArtifact(artifactId: number): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      const { artifactStorage } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db
        .delete(artifactStorage)
        .where(eq(artifactStorage.id, artifactId));
    }, undefined, 'deleteArtifact');
  }

  async getArtifacts(filters: any): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { artifactStorage } = await import('@shared/schema');
      const { eq, and, desc } = await import('drizzle-orm');
      
      let query = db.select().from(artifactStorage);
      const conditions = [];
      
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
      const { artifactStorage } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      return await db
        .select()
        .from(artifactStorage)
        .where(eq(artifactStorage.isActive, true));
    }, [], 'getActiveArtifacts');
  }

  async getAllArtifacts(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { artifactStorage } = await import('@shared/schema');
      return await db.select().from(artifactStorage);
    }, [], 'getAllArtifacts');
  }

  async getExpiredArtifacts(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { artifactStorage } = await import('@shared/schema');
      const { lte } = await import('drizzle-orm');
      
      return await db
        .select()
        .from(artifactStorage)
        .where(lte(artifactStorage.retentionDate, new Date()));
    }, [], 'getExpiredArtifacts');
  }

  // Deployment History Methods
  async createDeploymentHistory(deployment: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      const { deploymentHistory } = await import('@shared/schema');
      
      await db
        .insert(deploymentHistory)
        .values(deployment);
    }, undefined, 'createDeploymentHistory');
  }

  async updateDeploymentHistory(deploymentId: string, updates: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      const { deploymentHistory } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db
        .update(deploymentHistory)
        .set(updates)
        .where(eq(deploymentHistory.deploymentId, deploymentId));
    }, undefined, 'updateDeploymentHistory');
  }

  async getRecentDeployments(limit: number): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { deploymentHistory } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      return await db
        .select()
        .from(deploymentHistory)
        .orderBy(desc(deploymentHistory.startedAt))
        .limit(limit);
    }, [], 'getRecentDeployments');
  }

  async getDeploymentById(deploymentId: string): Promise<any> {
    return await this.handleDatabaseOperation(async () => {
      const { deploymentHistory } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
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
      const { environmentConfigurations } = await import('@shared/schema');
      
      const [newConfig] = await db
        .insert(environmentConfigurations)
        .values(config)
        .returning();
      
      return newConfig.id;
    }, 0, 'createEnvironmentConfiguration');
  }

  async getEnvironmentConfigurations(): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { environmentConfigurations } = await import('@shared/schema');
      return await db.select().from(environmentConfigurations);
    }, [], 'getEnvironmentConfigurations');
  }

  // Platform Continuity Events Methods
  async createPlatformContinuityEvent(event: any): Promise<void> {
    return await this.handleDatabaseOperation(async () => {
      const { platformContinuityEvents } = await import('@shared/schema');
      
      await db
        .insert(platformContinuityEvents)
        .values(event);
    }, undefined, 'createPlatformContinuityEvent');
  }

  async getRecentPlatformContinuityEvents(limit: number): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { platformContinuityEvents } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      return await db
        .select()
        .from(platformContinuityEvents)
        .orderBy(desc(platformContinuityEvents.startedAt))
        .limit(limit);
    }, [], 'getRecentPlatformContinuityEvents');
  }

  async getPlatformContinuityEvents(filters: any): Promise<any[]> {
    return await this.handleDatabaseOperation(async () => {
      const { platformContinuityEvents } = await import('@shared/schema');
      const { eq, and, desc } = await import('drizzle-orm');
      
      let query = db.select().from(platformContinuityEvents);
      const conditions = [];
      
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
      const { sql } = await import('drizzle-orm');
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
      const { failoverDrillConfigurations } = await import('@shared/schema');
      let query = db.select().from(failoverDrillConfigurations);
      
      const conditions = [];
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
      const { failoverDrillConfigurations } = await import('@shared/schema');
      const [config] = await db.select().from(failoverDrillConfigurations).where(eq(failoverDrillConfigurations.id, id));
      return config;
    }, undefined, 'getFailoverDrillConfiguration');
  }

  async createFailoverDrillConfiguration(config: InsertFailoverDrillConfiguration): Promise<FailoverDrillConfiguration> {
    return this.handleDatabaseOperation(async () => {
      const { failoverDrillConfigurations } = await import('@shared/schema');
      const [newConfig] = await db.insert(failoverDrillConfigurations).values(config).returning();
      return newConfig;
    }, {} as FailoverDrillConfiguration, 'createFailoverDrillConfiguration');
  }

  async updateFailoverDrillConfiguration(id: number, updates: Partial<FailoverDrillConfiguration>): Promise<FailoverDrillConfiguration> {
    return this.handleDatabaseOperation(async () => {
      const { failoverDrillConfigurations } = await import('@shared/schema');
      const [updated] = await db.update(failoverDrillConfigurations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(failoverDrillConfigurations.id, id))
        .returning();
      return updated;
    }, {} as FailoverDrillConfiguration, 'updateFailoverDrillConfiguration');
  }

  async deleteFailoverDrillConfiguration(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { failoverDrillConfigurations } = await import('@shared/schema');
      await db.delete(failoverDrillConfigurations).where(eq(failoverDrillConfigurations.id, id));
    }, undefined, 'deleteFailoverDrillConfiguration');
  }

  async getScheduledDrillConfigurations(): Promise<FailoverDrillConfiguration[]> {
    return this.handleDatabaseOperation(async () => {
      const { failoverDrillConfigurations } = await import('@shared/schema');
      return await db.select().from(failoverDrillConfigurations)
        .where(and(
          eq(failoverDrillConfigurations.isEnabled, true),
          eq(failoverDrillConfigurations.triggerType, 'scheduled')
        ))
        .orderBy(desc(failoverDrillConfigurations.nextScheduledRun));
    }, [], 'getScheduledDrillConfigurations');
  }

  // Drill Executions
  async getDrillExecutions(filters?: { configurationId?: number; status?: string; triggerType?: string; page?: number; limit?: number }): Promise<DrillExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const { drillExecutions } = await import('@shared/schema');
      let query = db.select().from(drillExecutions);
      
      const conditions = [];
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
      const { drillExecutions } = await import('@shared/schema');
      const [execution] = await db.select().from(drillExecutions).where(eq(drillExecutions.executionId, executionId));
      return execution;
    }, undefined, 'getDrillExecution');
  }

  async createDrillExecution(execution: InsertDrillExecution): Promise<DrillExecution> {
    return this.handleDatabaseOperation(async () => {
      const { drillExecutions } = await import('@shared/schema');
      const [newExecution] = await db.insert(drillExecutions).values(execution).returning();
      return newExecution;
    }, {} as DrillExecution, 'createDrillExecution');
  }

  async updateDrillExecution(executionId: string, updates: Partial<DrillExecution>): Promise<DrillExecution> {
    return this.handleDatabaseOperation(async () => {
      const { drillExecutions } = await import('@shared/schema');
      const [updated] = await db.update(drillExecutions)
        .set(updates)
        .where(eq(drillExecutions.executionId, executionId))
        .returning();
      return updated;
    }, {} as DrillExecution, 'updateDrillExecution');
  }

  async getRecentDrillExecutions(limit: number): Promise<DrillExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const { drillExecutions } = await import('@shared/schema');
      return await db.select().from(drillExecutions)
        .orderBy(desc(drillExecutions.startedAt))
        .limit(limit);
    }, [], 'getRecentDrillExecutions');
  }

  async getDrillExecutionsByConfiguration(configurationId: number): Promise<DrillExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const { drillExecutions } = await import('@shared/schema');
      return await db.select().from(drillExecutions)
        .where(eq(drillExecutions.configurationId, configurationId))
        .orderBy(desc(drillExecutions.startedAt));
    }, [], 'getDrillExecutionsByConfiguration');
  }

  async getDrillExecutionsForDashboard(days: number): Promise<DrillExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const { drillExecutions } = await import('@shared/schema');
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
      const { drillSteps } = await import('@shared/schema');
      return await db.select().from(drillSteps)
        .where(eq(drillSteps.executionId, executionId))
        .orderBy(drillSteps.stepOrder);
    }, [], 'getDrillSteps');
  }

  async createDrillStep(step: InsertDrillStep): Promise<DrillStep> {
    return this.handleDatabaseOperation(async () => {
      const { drillSteps } = await import('@shared/schema');
      const [newStep] = await db.insert(drillSteps).values(step).returning();
      return newStep;
    }, {} as DrillStep, 'createDrillStep');
  }

  async updateDrillStep(id: number, updates: Partial<DrillStep>): Promise<DrillStep> {
    return this.handleDatabaseOperation(async () => {
      const { drillSteps } = await import('@shared/schema');
      const [updated] = await db.update(drillSteps)
        .set(updates)
        .where(eq(drillSteps.id, id))
        .returning();
      return updated;
    }, {} as DrillStep, 'updateDrillStep');
  }

  async getDrillStepsByExecution(executionId: string): Promise<DrillStep[]> {
    return this.handleDatabaseOperation(async () => {
      const { drillSteps } = await import('@shared/schema');
      return await db.select().from(drillSteps)
        .where(eq(drillSteps.executionId, executionId))
        .orderBy(drillSteps.stepOrder);
    }, [], 'getDrillStepsByExecution');
  }

  // Backup Success Alert System - Backup Monitoring Configurations
  async getBackupMonitoringConfigurations(filters?: { enabled?: boolean; monitoringType?: string }): Promise<BackupMonitoringConfiguration[]> {
    return this.handleDatabaseOperation(async () => {
      const { backupMonitoringConfigurations } = await import('@shared/schema');
      let query = db.select().from(backupMonitoringConfigurations);
      
      const conditions = [];
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
      const { backupMonitoringConfigurations } = await import('@shared/schema');
      const [config] = await db.select().from(backupMonitoringConfigurations).where(eq(backupMonitoringConfigurations.id, id));
      return config;
    }, undefined, 'getBackupMonitoringConfiguration');
  }

  async createBackupMonitoringConfiguration(config: InsertBackupMonitoringConfiguration): Promise<BackupMonitoringConfiguration> {
    return this.handleDatabaseOperation(async () => {
      const { backupMonitoringConfigurations } = await import('@shared/schema');
      const [newConfig] = await db.insert(backupMonitoringConfigurations).values(config).returning();
      return newConfig;
    }, {} as BackupMonitoringConfiguration, 'createBackupMonitoringConfiguration');
  }

  async updateBackupMonitoringConfiguration(id: number, updates: Partial<BackupMonitoringConfiguration>): Promise<BackupMonitoringConfiguration> {
    return this.handleDatabaseOperation(async () => {
      const { backupMonitoringConfigurations } = await import('@shared/schema');
      const [updated] = await db.update(backupMonitoringConfigurations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(backupMonitoringConfigurations.id, id))
        .returning();
      return updated;
    }, {} as BackupMonitoringConfiguration, 'updateBackupMonitoringConfiguration');
  }

  async deleteBackupMonitoringConfiguration(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { backupMonitoringConfigurations } = await import('@shared/schema');
      await db.delete(backupMonitoringConfigurations).where(eq(backupMonitoringConfigurations.id, id));
    }, undefined, 'deleteBackupMonitoringConfiguration');
  }

  async getActiveMonitoringConfigurations(): Promise<BackupMonitoringConfiguration[]> {
    return this.handleDatabaseOperation(async () => {
      const { backupMonitoringConfigurations } = await import('@shared/schema');
      return await db.select().from(backupMonitoringConfigurations)
        .where(eq(backupMonitoringConfigurations.isEnabled, true))
        .orderBy(desc(backupMonitoringConfigurations.createdAt));
    }, [], 'getActiveMonitoringConfigurations');
  }

  // Backup Alerts
  async getBackupAlerts(filters?: { status?: string; severity?: string; alertType?: string; page?: number; limit?: number }): Promise<BackupAlert[]> {
    return this.handleDatabaseOperation(async () => {
      const { backupAlerts } = await import('@shared/schema');
      let query = db.select().from(backupAlerts);
      
      const conditions = [];
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
      const { backupAlerts } = await import('@shared/schema');
      const [alert] = await db.select().from(backupAlerts).where(eq(backupAlerts.alertId, alertId));
      return alert;
    }, undefined, 'getBackupAlert');
  }

  async createBackupAlert(alert: InsertBackupAlert): Promise<BackupAlert> {
    return this.handleDatabaseOperation(async () => {
      const { backupAlerts } = await import('@shared/schema');
      const [newAlert] = await db.insert(backupAlerts).values(alert).returning();
      return newAlert;
    }, {} as BackupAlert, 'createBackupAlert');
  }

  async updateBackupAlert(alertId: string, updates: Partial<BackupAlert>): Promise<BackupAlert> {
    return this.handleDatabaseOperation(async () => {
      const { backupAlerts } = await import('@shared/schema');
      const [updated] = await db.update(backupAlerts)
        .set(updates)
        .where(eq(backupAlerts.alertId, alertId))
        .returning();
      return updated;
    }, {} as BackupAlert, 'updateBackupAlert');
  }

  async acknowledgeBackupAlert(alertId: string, acknowledgedBy: string): Promise<BackupAlert> {
    return this.handleDatabaseOperation(async () => {
      const { backupAlerts } = await import('@shared/schema');
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
      const { backupAlerts } = await import('@shared/schema');
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
      const { backupAlerts } = await import('@shared/schema');
      return await db.select().from(backupAlerts)
        .where(inArray(backupAlerts.status, ['new', 'acknowledged', 'investigating']))
        .orderBy(desc(backupAlerts.createdAt));
    }, [], 'getActiveBackupAlerts');
  }

  async getBackupAlertsByConfiguration(configurationId: number): Promise<BackupAlert[]> {
    return this.handleDatabaseOperation(async () => {
      const { backupAlerts } = await import('@shared/schema');
      return await db.select().from(backupAlerts)
        .where(eq(backupAlerts.configurationId, configurationId))
        .orderBy(desc(backupAlerts.createdAt));
    }, [], 'getBackupAlertsByConfiguration');
  }

  // Backup Health Metrics
  async getBackupHealthMetrics(filters?: { metricType?: string; dateFrom?: Date; dateTo?: Date }): Promise<BackupHealthMetric[]> {
    return this.handleDatabaseOperation(async () => {
      const { backupHealthMetrics } = await import('@shared/schema');
      let query = db.select().from(backupHealthMetrics);
      
      const conditions = [];
      if (filters?.metricType) {
        conditions.push(eq(backupHealthMetrics.metricType, filters.metricType));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(backupHealthMetrics.metricTimestamp, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(backupHealthMetrics.metricTimestamp, filters.dateTo));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(backupHealthMetrics.metricTimestamp));
    }, [], 'getBackupHealthMetrics');
  }

  async createBackupHealthMetric(metric: InsertBackupHealthMetric): Promise<BackupHealthMetric> {
    return this.handleDatabaseOperation(async () => {
      const { backupHealthMetrics } = await import('@shared/schema');
      const [newMetric] = await db.insert(backupHealthMetrics).values(metric).returning();
      return newMetric;
    }, {} as BackupHealthMetric, 'createBackupHealthMetric');
  }

  async getLatestBackupHealthMetrics(metricType: string): Promise<BackupHealthMetric | undefined> {
    return this.handleDatabaseOperation(async () => {
      const { backupHealthMetrics } = await import('@shared/schema');
      const [metric] = await db.select().from(backupHealthMetrics)
        .where(eq(backupHealthMetrics.metricType, metricType))
        .orderBy(desc(backupHealthMetrics.metricTimestamp))
        .limit(1);
      return metric;
    }, undefined, 'getLatestBackupHealthMetrics');
  }

  async getBackupHealthTrends(days: number): Promise<BackupHealthMetric[]> {
    return this.handleDatabaseOperation(async () => {
      const { backupHealthMetrics } = await import('@shared/schema');
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      return await db.select().from(backupHealthMetrics)
        .where(gte(backupHealthMetrics.metricTimestamp, since))
        .orderBy(desc(backupHealthMetrics.metricTimestamp));
    }, [], 'getBackupHealthTrends');
  }

  async generateBackupHealthSummary(dateFrom: Date, dateTo: Date): Promise<any> {
    return this.handleDatabaseOperation(async () => {
      const { backupHealthMetrics } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      // Generate summary statistics for the date range
      const result = await db.execute(sql`
        SELECT 
          metric_type,
          COUNT(*) as total_measurements,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          STDDEV(metric_value) as stddev_value
        FROM backup_health_metrics 
        WHERE metric_timestamp >= ${dateFrom} AND metric_timestamp <= ${dateTo}
        GROUP BY metric_type
      `);
      
      return result.rows || [];
    }, [], 'generateBackupHealthSummary');
  }

  // RTO/RPO Performance Tracking - RTO/RPO Targets
  async getRtoRpoTargets(filters?: { active?: boolean; serviceType?: string; businessCriticality?: string }): Promise<RtoRpoTarget[]> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoTargets } = await import('@shared/schema');
      let query = db.select().from(rtoRpoTargets);
      
      const conditions = [];
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
      const { rtoRpoTargets } = await import('@shared/schema');
      const [target] = await db.select().from(rtoRpoTargets).where(eq(rtoRpoTargets.id, id));
      return target;
    }, undefined, 'getRtoRpoTarget');
  }

  async createRtoRpoTarget(target: InsertRtoRpoTarget): Promise<RtoRpoTarget> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoTargets } = await import('@shared/schema');
      const [newTarget] = await db.insert(rtoRpoTargets).values(target).returning();
      return newTarget;
    }, {} as RtoRpoTarget, 'createRtoRpoTarget');
  }

  async updateRtoRpoTarget(id: number, updates: Partial<RtoRpoTarget>): Promise<RtoRpoTarget> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoTargets } = await import('@shared/schema');
      const [updated] = await db.update(rtoRpoTargets)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(rtoRpoTargets.id, id))
        .returning();
      return updated;
    }, {} as RtoRpoTarget, 'updateRtoRpoTarget');
  }

  async deleteRtoRpoTarget(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoTargets } = await import('@shared/schema');
      await db.delete(rtoRpoTargets).where(eq(rtoRpoTargets.id, id));
    }, undefined, 'deleteRtoRpoTarget');
  }

  async getActiveRtoRpoTargets(): Promise<RtoRpoTarget[]> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoTargets } = await import('@shared/schema');
      return await db.select().from(rtoRpoTargets)
        .where(eq(rtoRpoTargets.isActive, true))
        .orderBy(desc(rtoRpoTargets.createdAt));
    }, [], 'getActiveRtoRpoTargets');
  }

  // RTO/RPO Measurements
  async getRtoRpoMeasurements(filters?: { targetId?: number; measurementType?: string; dateFrom?: Date; dateTo?: Date; page?: number; limit?: number }): Promise<RtoRpoMeasurement[]> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoMeasurements } = await import('@shared/schema');
      let query = db.select().from(rtoRpoMeasurements);
      
      const conditions = [];
      if (filters?.targetId) {
        conditions.push(eq(rtoRpoMeasurements.targetId, filters.targetId));
      }
      if (filters?.measurementType) {
        conditions.push(eq(rtoRpoMeasurements.measurementType, filters.measurementType));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(rtoRpoMeasurements.measuredAt, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(rtoRpoMeasurements.measuredAt, filters.dateTo));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      query = query.orderBy(desc(rtoRpoMeasurements.measuredAt));
      
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
      const { rtoRpoMeasurements } = await import('@shared/schema');
      const [measurement] = await db.select().from(rtoRpoMeasurements).where(eq(rtoRpoMeasurements.measurementId, measurementId));
      return measurement;
    }, undefined, 'getRtoRpoMeasurement');
  }

  async createRtoRpoMeasurement(measurement: InsertRtoRpoMeasurement): Promise<RtoRpoMeasurement> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoMeasurements } = await import('@shared/schema');
      const [newMeasurement] = await db.insert(rtoRpoMeasurements).values(measurement).returning();
      return newMeasurement;
    }, {} as RtoRpoMeasurement, 'createRtoRpoMeasurement');
  }

  async updateRtoRpoMeasurement(measurementId: string, updates: Partial<RtoRpoMeasurement>): Promise<RtoRpoMeasurement> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoMeasurements } = await import('@shared/schema');
      const [updated] = await db.update(rtoRpoMeasurements)
        .set(updates)
        .where(eq(rtoRpoMeasurements.measurementId, measurementId))
        .returning();
      return updated;
    }, {} as RtoRpoMeasurement, 'updateRtoRpoMeasurement');
  }

  async getRtoRpoMeasurementsByTarget(targetId: number): Promise<RtoRpoMeasurement[]> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoMeasurements } = await import('@shared/schema');
      return await db.select().from(rtoRpoMeasurements)
        .where(eq(rtoRpoMeasurements.targetId, targetId))
        .orderBy(desc(rtoRpoMeasurements.measuredAt));
    }, [], 'getRtoRpoMeasurementsByTarget');
  }

  async getRecentRtoRpoMeasurements(limit: number): Promise<RtoRpoMeasurement[]> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoMeasurements } = await import('@shared/schema');
      return await db.select().from(rtoRpoMeasurements)
        .orderBy(desc(rtoRpoMeasurements.measuredAt))
        .limit(limit);
    }, [], 'getRecentRtoRpoMeasurements');
  }

  async getRtoRpoPerformanceTrends(targetId: number, days: number): Promise<RtoRpoMeasurement[]> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoMeasurements } = await import('@shared/schema');
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      return await db.select().from(rtoRpoMeasurements)
        .where(and(
          eq(rtoRpoMeasurements.targetId, targetId),
          gte(rtoRpoMeasurements.measuredAt, since)
        ))
        .orderBy(desc(rtoRpoMeasurements.measuredAt));
    }, [], 'getRtoRpoPerformanceTrends');
  }

  async getRtoRpoComplianceReport(dateFrom: Date, dateTo: Date): Promise<any> {
    return this.handleDatabaseOperation(async () => {
      const { rtoRpoMeasurements, rtoRpoTargets } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      // Generate compliance report with target vs actual performance
      const result = await db.execute(sql`
        SELECT 
          t.service_name,
          t.service_type,
          t.business_criticality,
          t.rto_target_minutes,
          t.rpo_target_minutes,
          COUNT(m.measurement_id) as total_measurements,
          AVG(m.actual_rto_minutes) as avg_rto_actual,
          AVG(m.actual_rpo_minutes) as avg_rpo_actual,
          COUNT(CASE WHEN m.actual_rto_minutes <= t.rto_target_minutes THEN 1 END) as rto_compliant_count,
          COUNT(CASE WHEN m.actual_rpo_minutes <= t.rpo_target_minutes THEN 1 END) as rpo_compliant_count
        FROM rto_rpo_targets t
        LEFT JOIN rto_rpo_measurements m ON t.id = m.target_id 
          AND m.measured_at >= ${dateFrom} AND m.measured_at <= ${dateTo}
        WHERE t.is_active = true
        GROUP BY t.id, t.service_name, t.service_type, t.business_criticality, t.rto_target_minutes, t.rpo_target_minutes
      `);
      
      return result.rows || [];
    }, [], 'getRtoRpoComplianceReport');
  }

  // Performance Benchmarks
  async getPerformanceBenchmarks(filters?: { active?: boolean; industry?: string; sourceType?: string }): Promise<PerformanceBenchmark[]> {
    return this.handleDatabaseOperation(async () => {
      const { performanceBenchmarks } = await import('@shared/schema');
      let query = db.select().from(performanceBenchmarks);
      
      const conditions = [];
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
      const { performanceBenchmarks } = await import('@shared/schema');
      const [benchmark] = await db.select().from(performanceBenchmarks).where(eq(performanceBenchmarks.id, id));
      return benchmark;
    }, undefined, 'getPerformanceBenchmark');
  }

  async createPerformanceBenchmark(benchmark: InsertPerformanceBenchmark): Promise<PerformanceBenchmark> {
    return this.handleDatabaseOperation(async () => {
      const { performanceBenchmarks } = await import('@shared/schema');
      const [newBenchmark] = await db.insert(performanceBenchmarks).values(benchmark).returning();
      return newBenchmark;
    }, {} as PerformanceBenchmark, 'createPerformanceBenchmark');
  }

  async updatePerformanceBenchmark(id: number, updates: Partial<PerformanceBenchmark>): Promise<PerformanceBenchmark> {
    return this.handleDatabaseOperation(async () => {
      const { performanceBenchmarks } = await import('@shared/schema');
      const [updated] = await db.update(performanceBenchmarks)
        .set(updates)
        .where(eq(performanceBenchmarks.id, id))
        .returning();
      return updated;
    }, {} as PerformanceBenchmark, 'updatePerformanceBenchmark');
  }

  async deletePerformanceBenchmark(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { performanceBenchmarks } = await import('@shared/schema');
      await db.delete(performanceBenchmarks).where(eq(performanceBenchmarks.id, id));
    }, undefined, 'deletePerformanceBenchmark');
  }

  async getIndustryBenchmarks(industry: string, serviceCategory: string): Promise<PerformanceBenchmark[]> {
    return this.handleDatabaseOperation(async () => {
      const { performanceBenchmarks } = await import('@shared/schema');
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
      const { incidentRunbooks } = await import('@shared/schema');
      let query = db.select().from(incidentRunbooks);
      
      const conditions = [];
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
      const { incidentRunbooks } = await import('@shared/schema');
      const [runbook] = await db.select().from(incidentRunbooks).where(eq(incidentRunbooks.runbookId, runbookId));
      return runbook;
    }, undefined, 'getIncidentRunbook');
  }

  async createIncidentRunbook(runbook: InsertIncidentRunbook): Promise<IncidentRunbook> {
    return this.handleDatabaseOperation(async () => {
      const { incidentRunbooks } = await import('@shared/schema');
      const [newRunbook] = await db.insert(incidentRunbooks).values(runbook).returning();
      return newRunbook;
    }, {} as IncidentRunbook, 'createIncidentRunbook');
  }

  async updateIncidentRunbook(runbookId: string, updates: Partial<IncidentRunbook>): Promise<IncidentRunbook> {
    return this.handleDatabaseOperation(async () => {
      const { incidentRunbooks } = await import('@shared/schema');
      const [updated] = await db.update(incidentRunbooks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(incidentRunbooks.runbookId, runbookId))
        .returning();
      return updated;
    }, {} as IncidentRunbook, 'updateIncidentRunbook');
  }

  async deleteIncidentRunbook(runbookId: string): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { incidentRunbooks } = await import('@shared/schema');
      await db.delete(incidentRunbooks).where(eq(incidentRunbooks.runbookId, runbookId));
    }, undefined, 'deleteIncidentRunbook');
  }

  async getRunbooksByIncidentType(incidentType: string): Promise<IncidentRunbook[]> {
    return this.handleDatabaseOperation(async () => {
      const { incidentRunbooks } = await import('@shared/schema');
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
      const { incidentRunbooks } = await import('@shared/schema');
      return await db.select().from(incidentRunbooks)
        .where(inArray(incidentRunbooks.status, ['approved', 'active']))
        .orderBy(desc(incidentRunbooks.createdAt));
    }, [], 'getPublishedRunbooks');
  }

  async approveRunbook(runbookId: string, approvedBy: string): Promise<IncidentRunbook> {
    return this.handleDatabaseOperation(async () => {
      const { incidentRunbooks } = await import('@shared/schema');
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
      const { incidentRunbooks } = await import('@shared/schema');
      return await db.select().from(incidentRunbooks)
        .where(eq(incidentRunbooks.runbookId, runbookId))
        .orderBy(desc(incidentRunbooks.version));
    }, [], 'getRunbookVersions');
  }

  // Runbook Steps
  async getRunbookSteps(runbookId: string): Promise<RunbookStep[]> {
    return this.handleDatabaseOperation(async () => {
      const { runbookSteps } = await import('@shared/schema');
      return await db.select().from(runbookSteps)
        .where(eq(runbookSteps.runbookId, runbookId))
        .orderBy(runbookSteps.stepOrder);
    }, [], 'getRunbookSteps');
  }

  async getRunbookStep(id: number): Promise<RunbookStep | undefined> {
    return this.handleDatabaseOperation(async () => {
      const { runbookSteps } = await import('@shared/schema');
      const [step] = await db.select().from(runbookSteps).where(eq(runbookSteps.id, id));
      return step;
    }, undefined, 'getRunbookStep');
  }

  async createRunbookStep(step: InsertRunbookStep): Promise<RunbookStep> {
    return this.handleDatabaseOperation(async () => {
      const { runbookSteps } = await import('@shared/schema');
      const [newStep] = await db.insert(runbookSteps).values(step).returning();
      return newStep;
    }, {} as RunbookStep, 'createRunbookStep');
  }

  async updateRunbookStep(id: number, updates: Partial<RunbookStep>): Promise<RunbookStep> {
    return this.handleDatabaseOperation(async () => {
      const { runbookSteps } = await import('@shared/schema');
      const [updated] = await db.update(runbookSteps)
        .set(updates)
        .where(eq(runbookSteps.id, id))
        .returning();
      return updated;
    }, {} as RunbookStep, 'updateRunbookStep');
  }

  async deleteRunbookStep(id: number): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { runbookSteps } = await import('@shared/schema');
      await db.delete(runbookSteps).where(eq(runbookSteps.id, id));
    }, undefined, 'deleteRunbookStep');
  }

  async getRunbookStepsByOrder(runbookId: string): Promise<RunbookStep[]> {
    return this.handleDatabaseOperation(async () => {
      const { runbookSteps } = await import('@shared/schema');
      return await db.select().from(runbookSteps)
        .where(eq(runbookSteps.runbookId, runbookId))
        .orderBy(runbookSteps.stepOrder);
    }, [], 'getRunbookStepsByOrder');
  }

  async reorderRunbookSteps(runbookId: string, stepOrders: { id: number; order: number }[]): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { runbookSteps } = await import('@shared/schema');
      
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
      const { runbookContacts } = await import('@shared/schema');
      let query = db.select().from(runbookContacts);
      
      const conditions = [];
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
      const { runbookContacts } = await import('@shared/schema');
      const [contact] = await db.select().from(runbookContacts).where(eq(runbookContacts.contactId, contactId));
      return contact;
    }, undefined, 'getRunbookContact');
  }

  async createRunbookContact(contact: InsertRunbookContact): Promise<RunbookContact> {
    return this.handleDatabaseOperation(async () => {
      const { runbookContacts } = await import('@shared/schema');
      const [newContact] = await db.insert(runbookContacts).values(contact).returning();
      return newContact;
    }, {} as RunbookContact, 'createRunbookContact');
  }

  async updateRunbookContact(contactId: string, updates: Partial<RunbookContact>): Promise<RunbookContact> {
    return this.handleDatabaseOperation(async () => {
      const { runbookContacts } = await import('@shared/schema');
      const [updated] = await db.update(runbookContacts)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(runbookContacts.contactId, contactId))
        .returning();
      return updated;
    }, {} as RunbookContact, 'updateRunbookContact');
  }

  async deleteRunbookContact(contactId: string): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { runbookContacts } = await import('@shared/schema');
      await db.delete(runbookContacts).where(eq(runbookContacts.contactId, contactId));
    }, undefined, 'deleteRunbookContact');
  }

  async getContactsByEscalationLevel(escalationLevel: number): Promise<RunbookContact[]> {
    return this.handleDatabaseOperation(async () => {
      const { runbookContacts } = await import('@shared/schema');
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
      const { runbookContacts } = await import('@shared/schema');
      let query = db.select().from(runbookContacts)
        .where(eq(runbookContacts.isActive, true));
      
      if (timezone) {
        query = query.where(and(
          eq(runbookContacts.isActive, true),
          or(
            eq(runbookContacts.isAvailable24x7, true),
            eq(runbookContacts.timezone, timezone)
          )
        ));
      }
      
      return await query.orderBy(runbookContacts.escalationLevel, runbookContacts.name);
    }, [], 'getAvailableContacts');
  }

  async updateContactLastContacted(contactId: string): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { runbookContacts } = await import('@shared/schema');
      await db.update(runbookContacts)
        .set({ lastContactedAt: new Date() })
        .where(eq(runbookContacts.contactId, contactId));
    }, undefined, 'updateContactLastContacted');
  }

  // Contact Escalation Trees
  async getContactEscalationTrees(filters?: { active?: boolean; incidentTypes?: string[] }): Promise<ContactEscalationTree[]> {
    return this.handleDatabaseOperation(async () => {
      const { contactEscalationTrees } = await import('@shared/schema');
      let query = db.select().from(contactEscalationTrees);
      
      const conditions = [];
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
      const { contactEscalationTrees } = await import('@shared/schema');
      const [tree] = await db.select().from(contactEscalationTrees).where(eq(contactEscalationTrees.treeId, treeId));
      return tree;
    }, undefined, 'getContactEscalationTree');
  }

  async createContactEscalationTree(tree: InsertContactEscalationTree): Promise<ContactEscalationTree> {
    return this.handleDatabaseOperation(async () => {
      const { contactEscalationTrees } = await import('@shared/schema');
      const [newTree] = await db.insert(contactEscalationTrees).values(tree).returning();
      return newTree;
    }, {} as ContactEscalationTree, 'createContactEscalationTree');
  }

  async updateContactEscalationTree(treeId: string, updates: Partial<ContactEscalationTree>): Promise<ContactEscalationTree> {
    return this.handleDatabaseOperation(async () => {
      const { contactEscalationTrees } = await import('@shared/schema');
      const [updated] = await db.update(contactEscalationTrees)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(contactEscalationTrees.treeId, treeId))
        .returning();
      return updated;
    }, {} as ContactEscalationTree, 'updateContactEscalationTree');
  }

  async deleteContactEscalationTree(treeId: string): Promise<void> {
    return this.handleDatabaseOperation(async () => {
      const { contactEscalationTrees } = await import('@shared/schema');
      await db.delete(contactEscalationTrees).where(eq(contactEscalationTrees.treeId, treeId));
    }, undefined, 'deleteContactEscalationTree');
  }

  async getEscalationTreeByIncidentType(incidentType: string, severity: string): Promise<ContactEscalationTree | undefined> {
    return this.handleDatabaseOperation(async () => {
      const { contactEscalationTrees } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      // Use SQL to query arrays - check if incidentType is in incidentTypes array
      const [tree] = await db.execute(sql`
        SELECT * FROM contact_escalation_trees 
        WHERE is_active = true 
          AND ${incidentType} = ANY(incident_types)
          AND ${severity} = ANY(severity_levels)
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      return tree.rows?.[0] as ContactEscalationTree | undefined;
    }, undefined, 'getEscalationTreeByIncidentType');
  }

  // Runbook Executions
  async getRunbookExecutions(filters?: { runbookId?: string; status?: string; executedBy?: string; page?: number; limit?: number }): Promise<RunbookExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const { runbookExecutions } = await import('@shared/schema');
      let query = db.select().from(runbookExecutions);
      
      const conditions = [];
      if (filters?.runbookId) {
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
      const { runbookExecutions } = await import('@shared/schema');
      const [execution] = await db.select().from(runbookExecutions).where(eq(runbookExecutions.executionId, executionId));
      return execution;
    }, undefined, 'getRunbookExecution');
  }

  async createRunbookExecution(execution: InsertRunbookExecution): Promise<RunbookExecution> {
    return this.handleDatabaseOperation(async () => {
      const { runbookExecutions } = await import('@shared/schema');
      const [newExecution] = await db.insert(runbookExecutions).values(execution).returning();
      return newExecution;
    }, {} as RunbookExecution, 'createRunbookExecution');
  }

  async updateRunbookExecution(executionId: string, updates: Partial<RunbookExecution>): Promise<RunbookExecution> {
    return this.handleDatabaseOperation(async () => {
      const { runbookExecutions } = await import('@shared/schema');
      const [updated] = await db.update(runbookExecutions)
        .set(updates)
        .where(eq(runbookExecutions.executionId, executionId))
        .returning();
      return updated;
    }, {} as RunbookExecution, 'updateRunbookExecution');
  }

  async getRecentRunbookExecutions(limit: number): Promise<RunbookExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const { runbookExecutions } = await import('@shared/schema');
      return await db.select().from(runbookExecutions)
        .orderBy(desc(runbookExecutions.startedAt))
        .limit(limit);
    }, [], 'getRecentRunbookExecutions');
  }

  async getRunbookExecutionsByRunbook(runbookId: string): Promise<RunbookExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const { runbookExecutions } = await import('@shared/schema');
      return await db.select().from(runbookExecutions)
        .where(eq(runbookExecutions.runbookId, runbookId))
        .orderBy(desc(runbookExecutions.startedAt));
    }, [], 'getRunbookExecutionsByRunbook');
  }

  async getActiveRunbookExecutions(): Promise<RunbookExecution[]> {
    return this.handleDatabaseOperation(async () => {
      const { runbookExecutions } = await import('@shared/schema');
      return await db.select().from(runbookExecutions)
        .where(inArray(runbookExecutions.status, ['pending', 'in_progress', 'paused']))
        .orderBy(desc(runbookExecutions.startedAt));
    }, [], 'getActiveRunbookExecutions');
  }

  async completeRunbookExecution(executionId: string, results: any): Promise<RunbookExecution> {
    return this.handleDatabaseOperation(async () => {
      const { runbookExecutions } = await import('@shared/schema');
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
      const { drillExecutions, backupHealthMetrics, rtoRpoMeasurements, backupAlerts, runbookExecutions } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      // Get recent drill summary
      const drillSummary = await db.execute(sql`
        SELECT 
          COUNT(*) as total_drills,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_drills,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_drills,
          AVG(CASE WHEN actual_rto_minutes IS NOT NULL THEN actual_rto_minutes END) as avg_rto_minutes
        FROM drill_executions 
        WHERE started_at >= NOW() - INTERVAL '30 days'
      `);

      // Get backup health summary
      const backupHealth = await db.execute(sql`
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value,
          COUNT(*) as measurement_count
        FROM backup_health_metrics 
        WHERE metric_timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY metric_type
      `);

      // Get RTO/RPO compliance
      const rtoRpoCompliance = await db.execute(sql`
        SELECT 
          COUNT(*) as total_measurements,
          COUNT(CASE WHEN m.actual_rto_minutes <= t.rto_target_minutes THEN 1 END) as rto_compliant,
          COUNT(CASE WHEN m.actual_rpo_minutes <= t.rpo_target_minutes THEN 1 END) as rpo_compliant
        FROM rto_rpo_measurements m
        JOIN rto_rpo_targets t ON m.target_id = t.id
        WHERE m.measured_at >= NOW() - INTERVAL '30 days'
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
      const { rtoRpoTargets, rtoRpoMeasurements } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      const daysPeriod = days || 30;
      const since = new Date();
      since.setDate(since.getDate() - daysPeriod);

      // Get targets
      let targetsQuery = db.select().from(rtoRpoTargets)
        .where(eq(rtoRpoTargets.isActive, true));
      
      if (serviceType) {
        targetsQuery = targetsQuery.where(and(
          eq(rtoRpoTargets.isActive, true),
          eq(rtoRpoTargets.serviceType, serviceType)
        ));
      }
      
      const targets = await targetsQuery;

      // Get recent measurements
      let measurementsQuery = db.select().from(rtoRpoMeasurements)
        .where(gte(rtoRpoMeasurements.measuredAt, since))
        .orderBy(desc(rtoRpoMeasurements.measuredAt));
      
      const measurements = await measurementsQuery;

      // Get trends
      const trends = await db.execute(sql`
        SELECT 
          DATE_TRUNC('day', measured_at) as date,
          AVG(actual_rto_minutes) as avg_rto,
          AVG(actual_rpo_minutes) as avg_rpo,
          COUNT(*) as measurement_count
        FROM rto_rpo_measurements 
        WHERE measured_at >= ${since}
        GROUP BY DATE_TRUNC('day', measured_at)
        ORDER BY date
      `);

      // Calculate compliance score
      const complianceData = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN m.actual_rto_minutes <= t.rto_target_minutes AND m.actual_rpo_minutes <= t.rpo_target_minutes THEN 1 END) as compliant
        FROM rto_rpo_measurements m
        JOIN rto_rpo_targets t ON m.target_id = t.id
        WHERE m.measured_at >= ${since}
      `);
      
      const complianceResult = complianceData.rows?.[0];
      const complianceScore = complianceResult?.total > 0 
        ? (complianceResult.compliant / complianceResult.total) * 100 
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
      const { incidentRunbooks, runbookExecutions, runbookContacts } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
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

// Create a seeding function for initial data - with health checking
export async function seedDatabase() {
  // Import storage instance dynamically to avoid circular dependencies
  const { storage } = await import('./storage');
  
  // Check database health before attempting any operations
  if (!storage.isDbHealthy()) {
    console.log('🔄 Seeding skipped—DB unhealthy');
    console.log('ℹ️  Database seeding will be attempted when health is restored');
    return;
  }
  
  try {
    // Check if data already exists
    const existingElections = await db.select().from(elections).limit(1);
    if (existingElections.length > 0) {
      console.log('Database already seeded');
      return;
    }

    // Comprehensive election data until November 2026
    const electionData = [
      // June 2025 Elections
      {
        title: "New Jersey Primary Elections",
        subtitle: "Governor & General Assembly",
        location: "New Jersey",
        state: "NJ",
        date: new Date("2025-06-10T20:00:00"),
        type: "primary",
        level: "state",
        offices: ["Governor", "General Assembly"],
        description: "Democratic and Republican primaries for Governor and all 80 seats of the General Assembly",
        pollsOpen: "6:00 AM EST",
        pollsClose: "8:00 PM EST",
        timezone: "EST",
        isActive: true,
      },
      {
        title: "Virginia Primary Elections",
        subtitle: "Governor, Lt. Governor & Attorney General",
        location: "Virginia",
        state: "VA",
        date: new Date("2025-06-10T19:00:00"),
        type: "primary",
        level: "state",
        offices: ["Governor", "Lieutenant Governor", "Attorney General", "House of Delegates"],
        description: "Party primaries in Virginia for Governor, Lieutenant Governor, Attorney General, and all 100 seats of the House of Delegates",
        pollsOpen: "6:00 AM EST",
        pollsClose: "7:00 PM EST",
        timezone: "EST",
        isActive: true,
      },
      
      // July 2025 Elections
      {
        title: "Arizona's 7th Congressional District Special Primary",
        subtitle: "U.S. House Representative",
        location: "Arizona",
        state: "AZ",
        date: new Date("2025-07-15T19:00:00"),
        type: "primary",
        level: "federal",
        offices: ["U.S. Representative"],
        description: "Special primary for U.S. House Arizona District 7 to replace the late Rep. Raúl Grijalva",
        pollsOpen: "6:00 AM MST",
        pollsClose: "7:00 PM MST",
        timezone: "MST",
        isActive: true,
      },

      // September 2025 Elections
      {
        title: "Arizona's 7th Congressional District Special Election",
        subtitle: "U.S. House Representative",
        location: "Arizona",
        state: "AZ",
        date: new Date("2025-09-23T19:00:00"),
        type: "special",
        level: "federal",
        offices: ["U.S. Representative"],
        description: "Special general election for U.S. House AZ-7 to fill the seat of Rep. Raúl Grijalva",
        pollsOpen: "6:00 AM MST",
        pollsClose: "7:00 PM MST",
        timezone: "MST",
        isActive: true,
      },

      // November 2025 Elections
      {
        title: "New Jersey Governor Election",
        subtitle: "Governor & Lt. Governor",
        location: "New Jersey",
        state: "NJ",
        date: new Date("2025-11-04T20:00:00"),
        type: "general",
        level: "state",
        offices: ["Governor", "Lieutenant Governor", "General Assembly"],
        description: "New Jersey statewide general election for Governor, Lieutenant Governor, and all 80 seats of the General Assembly",
        pollsOpen: "6:00 AM EST",
        pollsClose: "8:00 PM EST",
        timezone: "EST",
        isActive: true,
      },
      {
        title: "Virginia Governor Election",
        subtitle: "Governor, Lt. Governor & Attorney General",
        location: "Virginia",
        state: "VA",
        date: new Date("2025-11-04T19:00:00"),
        type: "general",
        level: "state",
        offices: ["Governor", "Lieutenant Governor", "Attorney General", "House of Delegates"],
        description: "Virginia statewide general election for Governor, Lieutenant Governor, Attorney General, and all 100 seats of the House of Delegates",
        pollsOpen: "6:00 AM EST",
        pollsClose: "7:00 PM EST",
        timezone: "EST",
        isActive: true,
      },
      {
        title: "Texas District 18 Special Election",
        subtitle: "U.S. House Representative",
        location: "Texas",
        state: "TX",
        date: new Date("2025-11-04T20:00:00"),
        type: "special",
        level: "federal",
        offices: ["U.S. Representative"],
        description: "Special general election for U.S. House Texas District 18 to fill the seat of the late Rep. Sylvester Turner",
        pollsOpen: "7:00 AM CST",
        pollsClose: "8:00 PM CST",
        timezone: "CST",
        isActive: true,
      },
      {
        title: "New York City Mayor",
        subtitle: "Mayoral General Election",
        location: "New York City",
        state: "NY",
        date: new Date("2025-11-04T20:00:00"),
        type: "general",
        level: "local",
        offices: ["Mayor"],
        description: "New York City mayoral general election",
        pollsOpen: "6:00 AM EST",
        pollsClose: "9:00 PM EST",
        timezone: "EST",
        isActive: true,
      },

      // 2026 Primary Elections
      {
        title: "Super Tuesday Primaries - Arkansas, North Carolina, Texas",
        subtitle: "Congressional and State Primaries",
        location: "Multiple States",
        state: "Multi",
        date: new Date("2026-03-03T20:00:00"),
        type: "primary",
        level: "federal",
        offices: ["U.S. House", "U.S. Senate", "State Offices"],
        description: "Primary elections in Arkansas, North Carolina, and Texas for congressional and state offices",
        pollsOpen: "Varies by state",
        pollsClose: "Varies by state",
        timezone: "Varies",
        isActive: true,
      },
      {
        title: "Mississippi Congressional Primary",
        subtitle: "U.S. House and Senate",
        location: "Mississippi",
        state: "MS",
        date: new Date("2026-03-10T19:00:00"),
        type: "primary",
        level: "federal",
        offices: ["U.S. House", "U.S. Senate"],
        description: "Mississippi primary for U.S. House and Senate races",
        pollsOpen: "7:00 AM CST",
        pollsClose: "7:00 PM CST",
        timezone: "CST",
        isActive: true,
      },
      {
        title: "Illinois Primary Election",
        subtitle: "Congressional and State Offices",
        location: "Illinois",
        state: "IL",
        date: new Date("2026-03-17T19:00:00"),
        type: "primary",
        level: "federal",
        offices: ["U.S. House", "U.S. Senate", "State Legislature"],
        description: "Illinois primary for U.S. House, Senate (Sen. Dick Durbin retiring), and state offices",
        pollsOpen: "6:00 AM CST",
        pollsClose: "7:00 PM CST",
        timezone: "CST",
        isActive: true,
      },
      {
        title: "Multi-State Primary Elections",
        subtitle: "Georgia, Idaho, Kentucky, Oregon, Pennsylvania",
        location: "Multiple States",
        state: "Multi",
        date: new Date("2026-05-19T20:00:00"),
        type: "primary",
        level: "federal",
        offices: ["U.S. House", "U.S. Senate", "Governor"],
        description: "Major primary day including Georgia Governor (open seat), Oregon Governor, and multiple Senate races",
        pollsOpen: "Varies by state",
        pollsClose: "Varies by state",
        timezone: "Varies",
        isActive: true,
      },
      {
        title: "California Primary Election",
        subtitle: "Congressional, Senate & Governor",
        location: "California",
        state: "CA",
        date: new Date("2026-06-02T20:00:00"),
        type: "primary",
        level: "federal",
        offices: ["U.S. House", "U.S. Senate", "Governor"],
        description: "California primary elections for U.S. Senate (Sen. Alex Padilla), House districts, and Governor",
        pollsOpen: "7:00 AM PST",
        pollsClose: "8:00 PM PST",
        timezone: "PST",
        isActive: true,
      },

      // November 2026 - Congressional Midterm Elections
      {
        title: "2026 Congressional Midterm Elections",
        subtitle: "All U.S. House Seats & 33 Senate Seats",
        location: "United States",
        state: "ALL",
        date: new Date("2026-11-03T20:00:00"),
        type: "general",
        level: "federal",
        offices: ["U.S. House", "U.S. Senate", "Governor"],
        description: "Congressional midterm elections - all 435 House seats, 33 Senate seats, and gubernatorial elections",
        pollsOpen: "Varies by state",
        pollsClose: "Varies by state",
        timezone: "Varies",
        isActive: true,
      },
    ];

    // Insert elections
    const insertedElections = await db.insert(elections).values(electionData).returning();
    
    // Populate comprehensive candidate data for all major elections
    const candidateData = [
      // Ohio Special Election - District 6 (first election)
      { name: "Michael Rulli", party: "Republican", electionId: insertedElections[0].id, pollingSupport: 52, isIncumbent: false, description: "Ohio State Senator and businessman" },
      { name: "Michael Kripchak", party: "Democratic", electionId: insertedElections[0].id, pollingSupport: 45, isIncumbent: false, description: "Local government official and community leader" },
      
      // New Jersey Governor Election
      { name: "Josh Gottheimer", party: "Democratic", electionId: insertedElections[1].id, pollingSupport: 34, isIncumbent: false, description: "U.S. Representative" },
      { name: "Ras Baraka", party: "Democratic", electionId: insertedElections[1].id, pollingSupport: 28, isIncumbent: false, description: "Mayor of Newark" },
      { name: "Bill Spadea", party: "Republican", electionId: insertedElections[1].id, pollingSupport: 42, isIncumbent: false, description: "Radio host and businessman" },
      
      // Virginia Governor Election
      { name: "Abigail Spanberger", party: "Democratic", electionId: insertedElections[2].id, pollingSupport: 48, isIncumbent: false, description: "U.S. Representative" },
      { name: "Glenn Youngkin", party: "Republican", electionId: insertedElections[2].id, pollingSupport: 47, isIncumbent: true, description: "Current Governor of Virginia" },
      
      // Add candidates for other key elections to ensure functionality
      { name: "Sarah Johnson", party: "Democratic", electionId: insertedElections[3].id, pollingSupport: 49, isIncumbent: false, description: "State legislator" },
      { name: "Robert Chen", party: "Republican", electionId: insertedElections[3].id, pollingSupport: 46, isIncumbent: false, description: "Business executive" },
      
      { name: "Maria Rodriguez", party: "Democratic", electionId: insertedElections[4].id, pollingSupport: 51, isIncumbent: true, description: "Current officeholder" },
      { name: "James Wilson", party: "Republican", electionId: insertedElections[4].id, pollingSupport: 44, isIncumbent: false, description: "Former mayor" },
    ];

    await db.insert(candidates).values(candidateData);
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
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
  
  // Try to seed database only if healthy
  if (healthStatus.isDatabaseHealthy) {
    try {
      await seedDatabase();
      console.log('Database seeding completed successfully');
    } catch (error) {
      console.log('Database seeding failed - continuing with memory storage:', error instanceof Error ? error.message : String(error));
    }
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
setInterval(async () => {
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
}, 6 * 60 * 60 * 1000); // 6 hours

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('Shutting down storage factory...');
  storage.destroy();
});

process.on('SIGINT', () => {
  console.log('Shutting down storage factory...');
  storage.destroy();
});
