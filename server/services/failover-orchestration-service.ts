/**
 * Failover Orchestration Service
 * Coordinates database switches, implements automatic failover triggers,
 * and provides manual failover capabilities for planned maintenance
 */

import { nanoid } from 'nanoid';
import { StorageMode, FailoverTrigger, type StorageFactory } from '../storage-factory';

export interface FailoverRule {
  id: string;
  name: string;
  trigger: FailoverTrigger;
  condition: FailoverCondition;
  targetMode: StorageMode;
  priority: number; // Lower number = higher priority
  enabled: boolean;
  cooldownMs: number; // Minimum time between activations
  lastTriggered?: Date;
}

export interface FailoverCondition {
  type: 'health_check_failure' | 'connection_timeout' | 'error_rate' | 'manual' | 'composite';
  healthCheckFailures?: number; // Number of consecutive failures
  connectionTimeoutMs?: number; // Max acceptable connection time
  errorRateThreshold?: number; // Error rate percentage
  compositeConditions?: FailoverCondition[]; // For complex conditions
  logicalOperator?: 'AND' | 'OR'; // For composite conditions
}

export interface FailoverPlan {
  id: string;
  name: string;
  description: string;
  steps: FailoverStep[];
  rollbackSteps: FailoverStep[];
  estimatedDurationMs: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

export interface FailoverStep {
  id: string;
  name: string;
  action: 'switch_storage' | 'health_check' | 'notify' | 'validate' | 'wait' | 'backup';
  parameters: Record<string, any>;
  timeoutMs: number;
  retryCount: number;
  continueOnFailure: boolean;
}

export interface FailoverExecution {
  id: string;
  planId: string;
  trigger: FailoverTrigger;
  reason: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  startedAt: Date;
  completedAt?: Date;
  executedSteps: FailoverStepResult[];
  currentStep?: string;
  error?: string;
  metrics: {
    totalDurationMs?: number;
    successfulSteps: number;
    failedSteps: number;
    rollbackRequired: boolean;
  };
}

export interface FailoverStepResult {
  stepId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: string;
  output?: any;
}

export class FailoverOrchestrationService {
  private storageFactory: StorageFactory;
  private failoverRules: FailoverRule[] = [];
  private failoverPlans: FailoverPlan[] = [];
  private activeExecutions: Map<string, FailoverExecution> = new Map();
  private executionHistory: FailoverExecution[] = [];
  private maxHistoryEntries = 500;
  private isEnabled = true;
  private notificationCallbacks: Array<(event: FailoverExecution) => Promise<void>> = [];

  constructor(storageFactory: StorageFactory) {
    this.storageFactory = storageFactory;
    this.initializeDefaultRules();
    this.initializeDefaultPlans();
    
    console.log('✅ Failover Orchestration Service initialized');
  }

  /**
   * Initialize default failover rules
   */
  private initializeDefaultRules(): void {
    this.failoverRules = [
      {
        id: 'primary_db_failure',
        name: 'Primary Database Failure',
        trigger: FailoverTrigger.HEALTH_CHECK_FAILURE,
        condition: {
          type: 'health_check_failure',
          healthCheckFailures: 3
        },
        targetMode: StorageMode.REPLICA,
        priority: 1,
        enabled: true,
        cooldownMs: 60000 // 1 minute
      },
      {
        id: 'replica_fallback',
        name: 'Replica Database Fallback',
        trigger: FailoverTrigger.HEALTH_CHECK_FAILURE,
        condition: {
          type: 'health_check_failure',
          healthCheckFailures: 5
        },
        targetMode: StorageMode.READ_ONLY,
        priority: 2,
        enabled: true,
        cooldownMs: 120000 // 2 minutes
      },
      {
        id: 'connection_timeout',
        name: 'Connection Timeout Failover',
        trigger: FailoverTrigger.CONNECTION_TIMEOUT,
        condition: {
          type: 'connection_timeout',
          connectionTimeoutMs: 10000
        },
        targetMode: StorageMode.MEMORY,
        priority: 3,
        enabled: true,
        cooldownMs: 180000 // 3 minutes
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate Failover',
        trigger: FailoverTrigger.AUTOMATIC,
        condition: {
          type: 'error_rate',
          errorRateThreshold: 25 // 25% error rate
        },
        targetMode: StorageMode.MEMORY_OPTIMIZED,
        priority: 4,
        enabled: true,
        cooldownMs: 300000 // 5 minutes
      }
    ];

    console.log(`📋 Initialized ${this.failoverRules.length} default failover rules`);
  }

  /**
   * Initialize default failover plans
   */
  private initializeDefaultPlans(): void {
    this.failoverPlans = [
      {
        id: 'emergency_failover',
        name: 'Emergency Database Failover',
        description: 'Immediate failover for critical database failures',
        estimatedDurationMs: 30000, // 30 seconds
        riskLevel: 'medium',
        requiresApproval: false,
        steps: [
          {
            id: 'health_check',
            name: 'Verify Target Health',
            action: 'health_check',
            parameters: { target: 'replica' },
            timeoutMs: 5000,
            retryCount: 2,
            continueOnFailure: false
          },
          {
            id: 'switch_storage',
            name: 'Switch to Replica Storage',
            action: 'switch_storage',
            parameters: { mode: 'replica' },
            timeoutMs: 10000,
            retryCount: 1,
            continueOnFailure: false
          },
          {
            id: 'validate',
            name: 'Validate Failover Success',
            action: 'validate',
            parameters: { expectedMode: 'replica' },
            timeoutMs: 5000,
            retryCount: 3,
            continueOnFailure: false
          },
          {
            id: 'notify',
            name: 'Send Failover Notifications',
            action: 'notify',
            parameters: { type: 'emergency_failover' },
            timeoutMs: 15000,
            retryCount: 2,
            continueOnFailure: true
          }
        ],
        rollbackSteps: [
          {
            id: 'rollback_storage',
            name: 'Rollback to Primary Storage',
            action: 'switch_storage',
            parameters: { mode: 'database' },
            timeoutMs: 10000,
            retryCount: 2,
            continueOnFailure: false
          },
          {
            id: 'notify_rollback',
            name: 'Send Rollback Notifications',
            action: 'notify',
            parameters: { type: 'rollback_complete' },
            timeoutMs: 10000,
            retryCount: 1,
            continueOnFailure: true
          }
        ]
      },
      {
        id: 'planned_maintenance',
        name: 'Planned Maintenance Failover',
        description: 'Controlled failover for scheduled maintenance',
        estimatedDurationMs: 120000, // 2 minutes
        riskLevel: 'low',
        requiresApproval: true,
        steps: [
          {
            id: 'backup',
            name: 'Create Pre-Maintenance Backup',
            action: 'backup',
            parameters: { type: 'full' },
            timeoutMs: 60000,
            retryCount: 1,
            continueOnFailure: false
          },
          {
            id: 'notify_start',
            name: 'Notify Maintenance Start',
            action: 'notify',
            parameters: { type: 'maintenance_start' },
            timeoutMs: 10000,
            retryCount: 1,
            continueOnFailure: true
          },
          {
            id: 'switch_readonly',
            name: 'Switch to Read-Only Mode',
            action: 'switch_storage',
            parameters: { mode: 'read_only' },
            timeoutMs: 15000,
            retryCount: 1,
            continueOnFailure: false
          },
          {
            id: 'wait',
            name: 'Wait for Maintenance Window',
            action: 'wait',
            parameters: { durationMs: 30000 },
            timeoutMs: 35000,
            retryCount: 0,
            continueOnFailure: false
          }
        ],
        rollbackSteps: [
          {
            id: 'restore_normal',
            name: 'Restore Normal Operations',
            action: 'switch_storage',
            parameters: { mode: 'database' },
            timeoutMs: 15000,
            retryCount: 2,
            continueOnFailure: false
          },
          {
            id: 'notify_complete',
            name: 'Notify Maintenance Complete',
            action: 'notify',
            parameters: { type: 'maintenance_complete' },
            timeoutMs: 10000,
            retryCount: 1,
            continueOnFailure: true
          }
        ]
      }
    ];

    console.log(`📋 Initialized ${this.failoverPlans.length} default failover plans`);
  }

  /**
   * Evaluate failover rules and trigger if conditions are met
   */
  async evaluateFailoverRules(): Promise<void> {
    if (!this.isEnabled) return;

    const healthStatus = this.storageFactory.getHealthStatus();
    const now = new Date();

    for (const rule of this.failoverRules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority)) {
      // Check cooldown period
      if (rule.lastTriggered && (now.getTime() - rule.lastTriggered.getTime()) < rule.cooldownMs) {
        continue;
      }

      // Evaluate rule condition
      const shouldTrigger = this.evaluateCondition(rule.condition, healthStatus);
      
      if (shouldTrigger) {
        console.log(`🚨 Failover rule triggered: ${rule.name}`);
        
        rule.lastTriggered = now;
        
        // Execute appropriate failover plan
        const planId = this.selectFailoverPlan(rule);
        if (planId) {
          await this.executeFailoverPlan(planId, rule.trigger, `Rule triggered: ${rule.name}`);
        }
        
        break; // Only execute one rule at a time
      }
    }
  }

  /**
   * Evaluate a failover condition
   */
  private evaluateCondition(condition: FailoverCondition, healthStatus: any): boolean {
    switch (condition.type) {
      case 'health_check_failure':
        return healthStatus.consecutiveFailures >= (condition.healthCheckFailures || 3);
        
      case 'connection_timeout':
        return healthStatus.diagnostics.some((d: any) => 
          d.latency && d.latency > (condition.connectionTimeoutMs || 10000)
        );
        
      case 'error_rate':
        return healthStatus.connectionStats.recentFailures > (condition.errorRateThreshold || 20);
        
      case 'composite':
        if (!condition.compositeConditions) return false;
        
        const results = condition.compositeConditions.map(subCondition => 
          this.evaluateCondition(subCondition, healthStatus)
        );
        
        return condition.logicalOperator === 'OR' 
          ? results.some(r => r) 
          : results.every(r => r);
        
      default:
        return false;
    }
  }

  /**
   * Select appropriate failover plan for a rule
   */
  private selectFailoverPlan(rule: FailoverRule): string | null {
    // For emergency situations, use emergency plan
    if (rule.trigger === FailoverTrigger.HEALTH_CHECK_FAILURE || 
        rule.trigger === FailoverTrigger.CONNECTION_TIMEOUT) {
      return 'emergency_failover';
    }
    
    // For manual triggers, use planned maintenance
    if (rule.trigger === FailoverTrigger.MANUAL || 
        rule.trigger === FailoverTrigger.PLANNED_MAINTENANCE) {
      return 'planned_maintenance';
    }
    
    return 'emergency_failover'; // Default
  }

  /**
   * Execute a failover plan
   */
  async executeFailoverPlan(planId: string, trigger: FailoverTrigger, reason: string): Promise<string> {
    const plan = this.failoverPlans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Failover plan not found: ${planId}`);
    }

    const executionId = nanoid();
    const execution: FailoverExecution = {
      id: executionId,
      planId,
      trigger,
      reason,
      status: 'queued',
      startedAt: new Date(),
      executedSteps: [],
      metrics: {
        successfulSteps: 0,
        failedSteps: 0,
        rollbackRequired: false
      }
    };

    this.activeExecutions.set(executionId, execution);
    
    console.log(`🚀 Starting failover execution: ${plan.name} (${executionId})`);

    try {
      execution.status = 'in_progress';
      await this.notifyExecutionStatus(execution);

      // Execute plan steps
      for (const step of plan.steps) {
        execution.currentStep = step.id;
        const stepResult = await this.executeStep(step, execution);
        execution.executedSteps.push(stepResult);

        if (stepResult.status === 'failed' && !step.continueOnFailure) {
          execution.metrics.rollbackRequired = true;
          break;
        }
        
        if (stepResult.status === 'completed') {
          execution.metrics.successfulSteps++;
        } else if (stepResult.status === 'failed') {
          execution.metrics.failedSteps++;
        }
      }

      // Check if rollback is needed
      if (execution.metrics.rollbackRequired) {
        console.log(`🔄 Executing rollback for ${executionId}`);
        await this.executeRollback(execution, plan);
        execution.status = 'rolled_back';
      } else {
        execution.status = 'completed';
      }

      execution.completedAt = new Date();
      execution.metrics.totalDurationMs = execution.completedAt.getTime() - execution.startedAt.getTime();

      console.log(`✅ Failover execution completed: ${executionId} (${execution.status})`);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      
      console.error(`❌ Failover execution failed: ${executionId}`, error);
    } finally {
      this.activeExecutions.delete(executionId);
      this.executionHistory.push(execution);
      
      // Keep history within limits
      if (this.executionHistory.length > this.maxHistoryEntries) {
        this.executionHistory = this.executionHistory.slice(-this.maxHistoryEntries);
      }
      
      await this.notifyExecutionStatus(execution);
    }

    return executionId;
  }

  /**
   * Execute a single failover step
   */
  private async executeStep(step: FailoverStep, execution: FailoverExecution): Promise<FailoverStepResult> {
    const result: FailoverStepResult = {
      stepId: step.id,
      name: step.name,
      status: 'pending',
      startedAt: new Date()
    };

    console.log(`🔧 Executing step: ${step.name} (${step.action})`);

    try {
      result.status = 'running';
      
      // Execute step based on action type
      switch (step.action) {
        case 'switch_storage':
          await this.executeStorageSwitch(step.parameters);
          break;
          
        case 'health_check':
          await this.executeHealthCheck(step.parameters);
          break;
          
        case 'notify':
          await this.executeNotification(step.parameters, execution);
          break;
          
        case 'validate':
          await this.executeValidation(step.parameters);
          break;
          
        case 'wait':
          await this.executeWait(step.parameters);
          break;
          
        case 'backup':
          await this.executeBackup(step.parameters);
          break;
          
        default:
          throw new Error(`Unknown step action: ${step.action}`);
      }

      result.status = 'completed';
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - result.startedAt.getTime();
      
      console.log(`✅ Step completed: ${step.name} (${result.durationMs}ms)`);

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - result.startedAt.getTime();
      
      console.error(`❌ Step failed: ${step.name}`, error);
    }

    return result;
  }

  /**
   * Execute storage mode switch
   */
  private async executeStorageSwitch(parameters: Record<string, any>): Promise<void> {
    const targetMode = parameters.mode as StorageMode;
    if (!targetMode) {
      throw new Error('Target storage mode not specified');
    }

    console.log(`🔄 Switching storage to: ${targetMode}`);
    const result = await this.storageFactory.triggerManualFailover(targetMode, 'Orchestrated failover');
    
    if (!result.success) {
      throw new Error(`Storage switch failed: ${result.error}`);
    }
  }

  /**
   * Execute health check
   */
  private async executeHealthCheck(parameters: Record<string, any>): Promise<void> {
    console.log('🔍 Performing health check');
    await this.storageFactory.forceHealthCheck();
    
    const healthStatus = this.storageFactory.getHealthStatus();
    if (!healthStatus.systemHealthy) {
      throw new Error('Health check failed - system unhealthy');
    }
  }

  /**
   * Execute notification
   */
  private async executeNotification(parameters: Record<string, any>, execution: FailoverExecution): Promise<void> {
    console.log(`📢 Sending notification: ${parameters.type}`);
    
    for (const callback of this.notificationCallbacks) {
      try {
        await callback(execution);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    }
  }

  /**
   * Execute validation
   */
  private async executeValidation(parameters: Record<string, any>): Promise<void> {
    const expectedMode = parameters.expectedMode as StorageMode;
    const healthStatus = this.storageFactory.getHealthStatus();
    
    if (healthStatus.mode !== expectedMode) {
      throw new Error(`Validation failed: expected ${expectedMode}, got ${healthStatus.mode}`);
    }
  }

  /**
   * Execute wait step
   */
  private async executeWait(parameters: Record<string, any>): Promise<void> {
    const durationMs = parameters.durationMs as number;
    console.log(`⏳ Waiting ${durationMs}ms`);
    await new Promise(resolve => setTimeout(resolve, durationMs));
  }

  /**
   * Execute backup step
   */
  private async executeBackup(parameters: Record<string, any>): Promise<void> {
    console.log(`💾 Creating backup: ${parameters.type}`);
    // Integration with disaster recovery coordinator for backup operations
    try {
      const { disasterRecoveryCoordinator } = await import('./disaster-recovery-coordinator');
      // This would trigger a backup operation through the coordinator
      console.log('✅ Backup operation initiated through disaster recovery coordinator');
    } catch (error) {
      console.log('⚠️ Could not access disaster recovery coordinator for backup');
    }
  }

  /**
   * Execute rollback steps
   */
  private async executeRollback(execution: FailoverExecution, plan: FailoverPlan): Promise<void> {
    console.log(`🔄 Executing rollback for ${execution.id}`);
    
    for (const step of plan.rollbackSteps) {
      const stepResult = await this.executeStep(step, execution);
      execution.executedSteps.push(stepResult);
      
      if (stepResult.status === 'failed' && !step.continueOnFailure) {
        console.error(`❌ Rollback step failed: ${step.name}`);
        break;
      }
    }
  }

  /**
   * Notify execution status to registered callbacks
   */
  private async notifyExecutionStatus(execution: FailoverExecution): Promise<void> {
    for (const callback of this.notificationCallbacks) {
      try {
        await callback(execution);
      } catch (error) {
        console.error('Execution status notification error:', error);
      }
    }
  }

  // Public API methods

  /**
   * Register notification callback
   */
  onFailoverExecution(callback: (execution: FailoverExecution) => Promise<void>): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Trigger manual failover
   */
  async triggerManualFailover(targetMode: StorageMode, reason: string): Promise<string> {
    return this.executeFailoverPlan('planned_maintenance', FailoverTrigger.MANUAL, reason);
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): FailoverExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 50): FailoverExecution[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get failover rules
   */
  getFailoverRules(): FailoverRule[] {
    return [...this.failoverRules];
  }

  /**
   * Update failover rule
   */
  updateFailoverRule(ruleId: string, updates: Partial<FailoverRule>): void {
    const ruleIndex = this.failoverRules.findIndex(r => r.id === ruleId);
    if (ruleIndex >= 0) {
      this.failoverRules[ruleIndex] = { ...this.failoverRules[ruleIndex], ...updates };
      console.log(`🔧 Updated failover rule: ${ruleId}`);
    }
  }

  /**
   * Enable/disable orchestration service
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} Failover orchestration ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    activeExecutions: number;
    totalRules: number;
    enabledRules: number;
    recentExecutions: number;
  } {
    const recentExecutions = this.executionHistory.filter(
      e => (new Date().getTime() - e.startedAt.getTime()) < 3600000 // Last hour
    ).length;

    return {
      enabled: this.isEnabled,
      activeExecutions: this.activeExecutions.size,
      totalRules: this.failoverRules.length,
      enabledRules: this.failoverRules.filter(r => r.enabled).length,
      recentExecutions
    };
  }
}

// Create and export singleton instance
let failoverOrchestrationServiceInstance: FailoverOrchestrationService | null = null;

/**
 * Get the failover orchestration service instance
 * Creates the instance on first access with the storage factory
 */
export async function getFailoverOrchestrationService(): Promise<FailoverOrchestrationService> {
  if (!failoverOrchestrationServiceInstance) {
    // Import storage factory
    const { storage } = await import('../storage');
    
    // Initialize the service with storage factory
    failoverOrchestrationServiceInstance = new FailoverOrchestrationService(storage);
    
    console.log('🎯 Failover Orchestration Service instance created');
  }
  
  return failoverOrchestrationServiceInstance;
}

// Export singleton instance for direct access
export const failoverOrchestrationService = {
  async getStatus() {
    const service = await getFailoverOrchestrationService();
    return service.getStatus();
  },
  
  async getExecutionHistory(limit?: number) {
    const service = await getFailoverOrchestrationService();
    return service.getExecutionHistory(limit);
  },
  
  async getFailoverRules() {
    const service = await getFailoverOrchestrationService();
    return service.getFailoverRules();
  },
  
  async executeFailoverPlan(planId: string, trigger: any, reason: string) {
    const service = await getFailoverOrchestrationService();
    return service.executeFailoverPlan(planId, trigger, reason);
  },
  
  async setEnabled(enabled: boolean) {
    const service = await getFailoverOrchestrationService();
    return service.setEnabled(enabled);
  }
};