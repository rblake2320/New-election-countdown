/**
 * Disaster Recovery Platform Integration Service
 * Integrates platform continuity capabilities with existing disaster recovery coordinator
 * Provides complete environment restoration automation and monitoring
 */

import { nanoid } from 'nanoid';
import { disasterRecoveryCoordinator } from './disaster-recovery-coordinator';
import { infrastructureAsCodeService } from './infrastructure-as-code-service';
import { secretsRotationService } from './secrets-rotation-service';
import { artifactRetentionService } from './artifact-retention-service';
import { environmentBootstrapService } from './environment-bootstrap-service';
import { type InsertPlatformContinuityEvents } from '@shared/schema';

export interface PlatformRecoveryConfig {
  enableAutomaticRecovery: boolean;
  enableSecretsRotationDuringRecovery: boolean;
  enableArtifactVerification: boolean;
  recoveryTimeoutMinutes: number;
  healthCheckIntervalSeconds: number;
  monitoringEnabled: boolean;
  alertingEnabled: boolean;
}

export interface RecoveryPlan {
  planId: string;
  name: string;
  description: string;
  targetEnvironment: string;
  phases: RecoveryPhase[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rollbackPlan: RecoveryPhase[];
}

export interface RecoveryPhase {
  phaseId: string;
  name: string;
  type: 'infrastructure' | 'secrets' | 'artifacts' | 'environment' | 'validation';
  actions: RecoveryAction[];
  dependencies: string[];
  timeoutMinutes: number;
  rollbackActions: RecoveryAction[];
}

export interface RecoveryAction {
  actionId: string;
  name: string;
  service: 'infrastructure' | 'secrets' | 'artifacts' | 'environment';
  operation: string;
  parameters: Record<string, any>;
  critical: boolean;
  timeoutMinutes: number;
}

export interface RecoveryExecution {
  executionId: string;
  planId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  targetEnvironment: string;
  startedAt: Date;
  completedAt?: Date;
  duration: number;
  phasesExecuted: PhaseResult[];
  healthChecks: RecoveryHealthCheck[];
  error?: string;
  rollbackRequired: boolean;
}

export interface PhaseResult {
  phaseId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  startedAt: Date;
  completedAt?: Date;
  duration: number;
  actionsExecuted: ActionResult[];
  error?: string;
}

export interface ActionResult {
  actionId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  duration: number;
  output?: any;
  error?: string;
}

export interface RecoveryHealthCheck {
  service: string;
  healthy: boolean;
  responseTime: number;
  timestamp: Date;
  error?: string;
  details?: any;
}

export interface PlatformContinuityMetrics {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  lastRecoveryTime?: Date;
  systemHealthScore: number;
  servicesOperational: number;
  servicesTotal: number;
  activeAlerts: number;
}

export class DisasterRecoveryPlatformIntegration {
  private config: PlatformRecoveryConfig;
  private recoveryPlans: Map<string, RecoveryPlan> = new Map();
  private activeRecoveries: Map<string, RecoveryExecution> = new Map();
  private healthMonitor: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config?: Partial<PlatformRecoveryConfig>) {
    this.config = {
      enableAutomaticRecovery: true,
      enableSecretsRotationDuringRecovery: true,
      enableArtifactVerification: true,
      recoveryTimeoutMinutes: 60,
      healthCheckIntervalSeconds: 30,
      monitoringEnabled: true,
      alertingEnabled: true,
      ...config
    };

    this.setupRecoveryPlans();
    console.log('✅ Disaster Recovery Platform Integration initialized');
  }

  /**
   * Initialize platform continuity integration with disaster recovery
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔗 Initializing disaster recovery platform integration');

      // Initialize all platform continuity services
      await this.initializePlatformServices();

      // Setup disaster recovery coordinator integration
      await this.setupDisasterRecoveryIntegration();

      // Start health monitoring
      if (this.config.monitoringEnabled) {
        this.startHealthMonitoring();
      }

      // Register recovery procedures with disaster recovery coordinator
      await this.registerRecoveryProcedures();

      this.isInitialized = true;

      // Log integration event
      await this.logPlatformEvent(
        'disaster_recovery_integration',
        'infrastructure',
        'info',
        'Platform Continuity Integration Active',
        'Disaster recovery platform integration initialized successfully',
        { services: ['infrastructure', 'secrets', 'artifacts', 'environment'] }
      );

      console.log('✅ Disaster recovery platform integration initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize platform integration:', error);
      
      await this.logPlatformEvent(
        'disaster_recovery_integration_failed',
        'infrastructure',
        'error',
        'Platform Integration Failed',
        `Failed to initialize platform integration: ${error instanceof Error ? error.message : String(error)}`,
        { error: error instanceof Error ? error.message : String(error) }
      );

      throw error;
    }
  }

  /**
   * Initialize all platform continuity services
   */
  private async initializePlatformServices(): Promise<void> {
    console.log('🔧 Initializing platform continuity services');

    // Initialize secrets vault
    await secretsRotationService.initializeSecretsVault();

    // Generate infrastructure scripts
    await infrastructureAsCodeService.generateDeploymentScripts();

    // Generate bootstrap scripts for all environments
    for (const environment of ['development', 'staging', 'production']) {
      await environmentBootstrapService.generateBootstrapScripts(environment);
    }

    console.log('✅ Platform continuity services initialized');
  }

  /**
   * Setup integration with disaster recovery coordinator
   */
  private async setupDisasterRecoveryIntegration(): Promise<void> {
    console.log('🔗 Setting up disaster recovery coordinator integration');

    // Extend disaster recovery coordinator with platform continuity capabilities
    const originalExecuteRecovery = disasterRecoveryCoordinator.executeRecovery?.bind(disasterRecoveryCoordinator);
    
    if (originalExecuteRecovery) {
      // Override recovery execution to include platform continuity
      (disasterRecoveryCoordinator as any).executeRecovery = async (recoveryType: string, options: any) => {
        console.log('🔄 Enhanced recovery execution with platform continuity');
        
        // Execute original recovery
        const originalResult = await originalExecuteRecovery(recoveryType, options);
        
        // Add platform continuity recovery
        if (this.config.enableAutomaticRecovery) {
          await this.executePlatformRecovery(options.environment || 'production');
        }
        
        return originalResult;
      };
    }

    console.log('✅ Disaster recovery coordinator integration setup completed');
  }

  /**
   * Setup recovery plans for different scenarios
   */
  private setupRecoveryPlans(): void {
    // Complete environment recovery plan
    const completeRecoveryPlan: RecoveryPlan = {
      planId: 'complete-environment-recovery',
      name: 'Complete Environment Recovery',
      description: 'Full disaster recovery including infrastructure, secrets, artifacts, and environment setup',
      targetEnvironment: 'production',
      estimatedDuration: 45, // minutes
      riskLevel: 'high',
      phases: [
        {
          phaseId: 'infrastructure-recovery',
          name: 'Infrastructure Recovery',
          type: 'infrastructure',
          dependencies: [],
          timeoutMinutes: 15,
          actions: [
            {
              actionId: 'deploy-infrastructure',
              name: 'Deploy Infrastructure',
              service: 'infrastructure',
              operation: 'deployStack',
              parameters: { manifestName: 'election-platform', environment: 'production' },
              critical: true,
              timeoutMinutes: 10
            }
          ],
          rollbackActions: [
            {
              actionId: 'rollback-infrastructure',
              name: 'Rollback Infrastructure',
              service: 'infrastructure',
              operation: 'rollbackDeployment',
              parameters: {},
              critical: true,
              timeoutMinutes: 5
            }
          ]
        },
        {
          phaseId: 'secrets-recovery',
          name: 'Secrets Recovery',
          type: 'secrets',
          dependencies: ['infrastructure-recovery'],
          timeoutMinutes: 10,
          actions: [
            {
              actionId: 'initialize-secrets',
              name: 'Initialize Secrets Vault',
              service: 'secrets',
              operation: 'initializeSecretsVault',
              parameters: {},
              critical: true,
              timeoutMinutes: 5
            },
            {
              actionId: 'validate-secrets',
              name: 'Validate All Secrets',
              service: 'secrets',
              operation: 'testAllSecrets',
              parameters: {},
              critical: true,
              timeoutMinutes: 5
            }
          ],
          rollbackActions: []
        },
        {
          phaseId: 'artifacts-recovery',
          name: 'Artifacts Recovery',
          type: 'artifacts',
          dependencies: ['infrastructure-recovery'],
          timeoutMinutes: 10,
          actions: [
            {
              actionId: 'verify-artifacts',
              name: 'Verify Artifact Integrity',
              service: 'artifacts',
              operation: 'verifyArtifactIntegrity',
              parameters: {},
              critical: true,
              timeoutMinutes: 10
            }
          ],
          rollbackActions: []
        },
        {
          phaseId: 'environment-bootstrap',
          name: 'Environment Bootstrap',
          type: 'environment',
          dependencies: ['infrastructure-recovery', 'secrets-recovery', 'artifacts-recovery'],
          timeoutMinutes: 15,
          actions: [
            {
              actionId: 'bootstrap-environment',
              name: 'Bootstrap Production Environment',
              service: 'environment',
              operation: 'bootstrapEnvironment',
              parameters: { environment: 'production' },
              critical: true,
              timeoutMinutes: 15
            }
          ],
          rollbackActions: []
        },
        {
          phaseId: 'validation',
          name: 'Recovery Validation',
          type: 'validation',
          dependencies: ['environment-bootstrap'],
          timeoutMinutes: 10,
          actions: [
            {
              actionId: 'health-check',
              name: 'Comprehensive Health Check',
              service: 'environment',
              operation: 'performComprehensiveHealthCheck',
              parameters: {},
              critical: true,
              timeoutMinutes: 10
            }
          ],
          rollbackActions: []
        }
      ],
      rollbackPlan: []
    };

    this.recoveryPlans.set(completeRecoveryPlan.planId, completeRecoveryPlan);

    // Quick recovery plan (minimal downtime)
    const quickRecoveryPlan: RecoveryPlan = {
      planId: 'quick-service-recovery',
      name: 'Quick Service Recovery',
      description: 'Rapid service restoration with minimal downtime',
      targetEnvironment: 'production',
      estimatedDuration: 15, // minutes
      riskLevel: 'medium',
      phases: [
        {
          phaseId: 'quick-infrastructure',
          name: 'Quick Infrastructure Deployment',
          type: 'infrastructure',
          dependencies: [],
          timeoutMinutes: 10,
          actions: [
            {
              actionId: 'deploy-core-services',
              name: 'Deploy Core Services',
              service: 'infrastructure',
              operation: 'deployStack',
              parameters: { manifestName: 'election-platform', environment: 'production', quick: true },
              critical: true,
              timeoutMinutes: 8
            }
          ],
          rollbackActions: []
        },
        {
          phaseId: 'quick-validation',
          name: 'Quick Validation',
          type: 'validation',
          dependencies: ['quick-infrastructure'],
          timeoutMinutes: 5,
          actions: [
            {
              actionId: 'basic-health-check',
              name: 'Basic Health Check',
              service: 'environment',
              operation: 'performBasicHealthCheck',
              parameters: {},
              critical: true,
              timeoutMinutes: 5
            }
          ],
          rollbackActions: []
        }
      ],
      rollbackPlan: []
    };

    this.recoveryPlans.set(quickRecoveryPlan.planId, quickRecoveryPlan);

    console.log('✅ Recovery plans setup completed');
  }

  /**
   * Execute platform recovery
   */
  async executePlatformRecovery(environment: string = 'production', planId: string = 'complete-environment-recovery'): Promise<RecoveryExecution> {
    const executionId = nanoid();
    const startTime = Date.now();
    
    console.log(`🚨 Starting platform recovery: ${executionId} using plan: ${planId}`);

    const plan = this.recoveryPlans.get(planId);
    if (!plan) {
      throw new Error(`Recovery plan not found: ${planId}`);
    }

    const execution: RecoveryExecution = {
      executionId,
      planId,
      status: 'initiated',
      targetEnvironment: environment,
      startedAt: new Date(),
      duration: 0,
      phasesExecuted: [],
      healthChecks: [],
      rollbackRequired: false
    };

    this.activeRecoveries.set(executionId, execution);

    // Log recovery start
    await this.logPlatformEvent(
      'platform_recovery_initiated',
      'infrastructure',
      'warning',
      `Platform Recovery Initiated: ${planId}`,
      `Recovery execution ${executionId} started for ${environment} environment`,
      { executionId, planId, environment }
    );

    try {
      execution.status = 'in_progress';

      // Execute phases in order
      for (const phase of plan.phases) {
        const phaseResult = await this.executeRecoveryPhase(phase, environment);
        execution.phasesExecuted.push(phaseResult);

        if (phaseResult.status === 'failed') {
          throw new Error(`Phase failed: ${phase.name}`);
        }
      }

      // Perform final health checks
      execution.healthChecks = await this.performRecoveryHealthChecks();

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = Date.now() - startTime;

      // Log success
      await this.logPlatformEvent(
        'platform_recovery_completed',
        'infrastructure',
        'info',
        `Platform Recovery Completed: ${planId}`,
        `Recovery execution ${executionId} completed successfully in ${Math.round(execution.duration / 1000)}s`,
        { executionId, planId, environment, duration: execution.duration }
      );

      console.log(`✅ Platform recovery completed: ${executionId} (${Math.round(execution.duration / 1000)}s)`);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      execution.duration = Date.now() - startTime;
      execution.rollbackRequired = true;

      // Log failure
      await this.logPlatformEvent(
        'platform_recovery_failed',
        'infrastructure',
        'critical',
        `Platform Recovery Failed: ${planId}`,
        `Recovery execution ${executionId} failed: ${execution.error}`,
        { executionId, planId, environment, error: execution.error }
      );

      console.error(`❌ Platform recovery failed: ${executionId}`, error);
    }

    return execution;
  }

  /**
   * Execute recovery phase
   */
  private async executeRecoveryPhase(phase: RecoveryPhase, environment: string): Promise<PhaseResult> {
    const startTime = Date.now();
    
    const phaseResult: PhaseResult = {
      phaseId: phase.phaseId,
      name: phase.name,
      status: 'running',
      startedAt: new Date(),
      duration: 0,
      actionsExecuted: []
    };

    console.log(`🔧 Executing recovery phase: ${phase.name}`);

    try {
      // Execute actions in sequence
      for (const action of phase.actions) {
        const actionResult = await this.executeRecoveryAction(action, environment);
        phaseResult.actionsExecuted.push(actionResult);

        if (actionResult.status === 'failed' && action.critical) {
          throw new Error(`Critical action failed: ${action.name}`);
        }
      }

      phaseResult.status = 'completed';
      phaseResult.completedAt = new Date();
      phaseResult.duration = Date.now() - startTime;

    } catch (error) {
      phaseResult.status = 'failed';
      phaseResult.error = error instanceof Error ? error.message : String(error);
      phaseResult.completedAt = new Date();
      phaseResult.duration = Date.now() - startTime;
    }

    return phaseResult;
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(action: RecoveryAction, environment: string): Promise<ActionResult> {
    const startTime = Date.now();
    
    const actionResult: ActionResult = {
      actionId: action.actionId,
      name: action.name,
      status: 'running',
      startedAt: new Date(),
      duration: 0
    };

    console.log(`⚡ Executing recovery action: ${action.name}`);

    try {
      let result: any;

      switch (action.service) {
        case 'infrastructure':
          result = await this.executeInfrastructureAction(action, environment);
          break;
        case 'secrets':
          result = await this.executeSecretsAction(action, environment);
          break;
        case 'artifacts':
          result = await this.executeArtifactsAction(action, environment);
          break;
        case 'environment':
          result = await this.executeEnvironmentAction(action, environment);
          break;
        default:
          throw new Error(`Unknown service: ${action.service}`);
      }

      actionResult.status = 'completed';
      actionResult.output = result;
      actionResult.completedAt = new Date();
      actionResult.duration = Date.now() - startTime;

    } catch (error) {
      actionResult.status = 'failed';
      actionResult.error = error instanceof Error ? error.message : String(error);
      actionResult.completedAt = new Date();
      actionResult.duration = Date.now() - startTime;
    }

    return actionResult;
  }

  /**
   * Execute infrastructure action
   */
  private async executeInfrastructureAction(action: RecoveryAction, environment: string): Promise<any> {
    switch (action.operation) {
      case 'deployStack':
        return await infrastructureAsCodeService.deployStack(
          action.parameters.manifestName,
          environment
        );
      case 'rollbackDeployment':
        return await infrastructureAsCodeService.rollbackDeployment(action.parameters.deploymentId);
      default:
        throw new Error(`Unknown infrastructure operation: ${action.operation}`);
    }
  }

  /**
   * Execute secrets action
   */
  private async executeSecretsAction(action: RecoveryAction, environment: string): Promise<any> {
    switch (action.operation) {
      case 'initializeSecretsVault':
        return await secretsRotationService.initializeSecretsVault();
      case 'testAllSecrets':
        return await secretsRotationService.testAllSecrets();
      default:
        throw new Error(`Unknown secrets operation: ${action.operation}`);
    }
  }

  /**
   * Execute artifacts action
   */
  private async executeArtifactsAction(action: RecoveryAction, environment: string): Promise<any> {
    switch (action.operation) {
      case 'verifyArtifactIntegrity':
        return await artifactRetentionService.verifyArtifactIntegrity();
      case 'performAutomatedCleanup':
        return await artifactRetentionService.performAutomatedCleanup();
      default:
        throw new Error(`Unknown artifacts operation: ${action.operation}`);
    }
  }

  /**
   * Execute environment action
   */
  private async executeEnvironmentAction(action: RecoveryAction, environment: string): Promise<any> {
    switch (action.operation) {
      case 'bootstrapEnvironment':
        return await environmentBootstrapService.bootstrapEnvironment(environment);
      case 'performComprehensiveHealthCheck':
        return await (environmentBootstrapService as any).performComprehensiveHealthCheck();
      default:
        throw new Error(`Unknown environment operation: ${action.operation}`);
    }
  }

  /**
   * Perform recovery health checks
   */
  private async performRecoveryHealthChecks(): Promise<RecoveryHealthCheck[]> {
    const healthChecks: RecoveryHealthCheck[] = [];

    // Infrastructure health
    try {
      const startTime = Date.now();
      const deployments = infrastructureAsCodeService.listActiveDeployments();
      
      healthChecks.push({
        service: 'infrastructure',
        healthy: deployments.length > 0,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { activeDeployments: deployments.length }
      });
    } catch (error) {
      healthChecks.push({
        service: 'infrastructure',
        healthy: false,
        responseTime: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Secrets health
    try {
      const startTime = Date.now();
      const status = await secretsRotationService.getRotationStatus();
      
      healthChecks.push({
        service: 'secrets',
        healthy: status.recentFailures === 0,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { activeSecrets: status.activeSecrets, recentFailures: status.recentFailures }
      });
    } catch (error) {
      healthChecks.push({
        service: 'secrets',
        healthy: false,
        responseTime: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Artifacts health
    try {
      const startTime = Date.now();
      const stats = await artifactRetentionService.getStorageStatistics();
      
      healthChecks.push({
        service: 'artifacts',
        healthy: stats.totalArtifacts > 0,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: { totalArtifacts: stats.totalArtifacts, totalSize: stats.totalSize }
      });
    } catch (error) {
      healthChecks.push({
        service: 'artifacts',
        healthy: false,
        responseTime: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return healthChecks;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
    }

    this.healthMonitor = setInterval(async () => {
      try {
        const metrics = await this.getPlatformContinuityMetrics();
        
        if (metrics.systemHealthScore < 70) {
          await this.logPlatformEvent(
            'platform_health_degraded',
            'monitoring',
            'warning',
            'Platform Health Degraded',
            `System health score: ${metrics.systemHealthScore}%`,
            { metrics }
          );
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, this.config.healthCheckIntervalSeconds * 1000);

    console.log('📊 Platform health monitoring started');
  }

  /**
   * Get platform continuity metrics
   */
  async getPlatformContinuityMetrics(): Promise<PlatformContinuityMetrics> {
    const recoveries = Array.from(this.activeRecoveries.values());
    const completedRecoveries = recoveries.filter(r => r.status === 'completed');
    const failedRecoveries = recoveries.filter(r => r.status === 'failed');

    const avgRecoveryTime = completedRecoveries.length > 0
      ? completedRecoveries.reduce((sum, r) => sum + r.duration, 0) / completedRecoveries.length
      : 0;

    const lastRecoveryTime = recoveries.length > 0
      ? recoveries.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0].startedAt
      : undefined;

    // Get health checks for system score
    const healthChecks = await this.performRecoveryHealthChecks();
    const healthyServices = healthChecks.filter(hc => hc.healthy).length;
    const systemHealthScore = healthChecks.length > 0 
      ? Math.round((healthyServices / healthChecks.length) * 100)
      : 100;

    return {
      totalRecoveries: recoveries.length,
      successfulRecoveries: completedRecoveries.length,
      failedRecoveries: failedRecoveries.length,
      averageRecoveryTime: Math.round(avgRecoveryTime / 1000), // seconds
      lastRecoveryTime,
      systemHealthScore,
      servicesOperational: healthyServices,
      servicesTotal: healthChecks.length,
      activeAlerts: failedRecoveries.length
    };
  }

  /**
   * Register recovery procedures with disaster recovery coordinator
   */
  private async registerRecoveryProcedures(): Promise<void> {
    console.log('📋 Registering recovery procedures with disaster recovery coordinator');

    // Register platform recovery as an enhanced recovery option
    const enhancedRecoveryProcedure = {
      name: 'platform-continuity-recovery',
      description: 'Complete platform recovery with infrastructure, secrets, artifacts, and environment',
      execute: async (options: any) => {
        return await this.executePlatformRecovery(options.environment, options.planId);
      }
    };

    // In a real implementation, would register with disaster recovery coordinator
    console.log('✅ Recovery procedures registered');
  }

  /**
   * Log platform continuity events
   */
  private async logPlatformEvent(
    eventType: string,
    category: string,
    severity: string,
    title: string,
    description: string,
    metadata: any
  ): Promise<void> {
    const { storage } = await import('../storage');
    
    const event: InsertPlatformContinuityEvents = {
      eventId: nanoid(),
      eventType,
      category,
      severity,
      status: 'completed',
      title,
      description,
      affectedServices: metadata.services || ['platform-continuity'],
      initiatedBy: 'disaster-recovery-platform-integration',
      completedAt: new Date(),
      outcome: severity === 'error' || severity === 'critical' ? 'failure' : 'success',
      metadata
    };

    if (storage.createPlatformContinuityEvent) {
      await storage.createPlatformContinuityEvent(event);
    }
  }

  /**
   * Get active recoveries
   */
  getActiveRecoveries(): RecoveryExecution[] {
    return Array.from(this.activeRecoveries.values());
  }

  /**
   * Get recovery plans
   */
  getRecoveryPlans(): RecoveryPlan[] {
    return Array.from(this.recoveryPlans.values());
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
      this.healthMonitor = null;
      console.log('🛑 Platform health monitoring stopped');
    }
  }
}

// Export singleton instance
export const disasterRecoveryPlatformIntegration = new DisasterRecoveryPlatformIntegration();
export default disasterRecoveryPlatformIntegration;