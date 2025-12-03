import { nanoid } from 'nanoid';
import type { IStorage } from '../storage';
import type { 
  IncidentRunbook,
  RunbookStep,
  RunbookContact,
  ContactEscalationTree,
  RunbookExecution,
  InsertIncidentRunbook,
  InsertRunbookStep,
  InsertRunbookContact,
  InsertContactEscalationTree,
  InsertRunbookExecution
} from '@shared/schema';

export interface IncidentContext {
  incidentId: string;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedSystems: string[];
  detectedAt: Date;
  reportedBy: string;
  environment: string;
  metadata?: any;
}

export interface RunbookExecutionContext {
  executionId: string;
  runbookId: number;
  incidentContext: IncidentContext;
  executedBy: string;
  escalationLevel: number;
  currentStepIndex: number;
  startTime: Date;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
}

export interface StepExecutionResult {
  stepId: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  executedBy?: string;
  result?: any;
  notes?: string;
  error?: string;
  attachments?: string[];
}

export interface ContactNotification {
  contactId: string;
  contact: RunbookContact;
  channel: 'email' | 'sms' | 'phone' | 'slack';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  retryCount: number;
  message: string;
}

export interface EscalationResult {
  escalated: boolean;
  escalationLevel: number;
  contactsNotified: ContactNotification[];
  nextEscalationTime?: Date;
  reason?: string;
}

/**
 * Incident Runbook Management Service - Complete incident response with contact/escalation trees
 * 
 * This service provides complete incident response capabilities including runbook execution,
 * contact management, and automated escalation during incident response.
 */
export class IncidentRunbookService {
  private storage: IStorage;
  private activeExecutions = new Map<string, RunbookExecutionContext>();
  private escalationTimers = new Map<string, NodeJS.Timeout>();
  
  // Integration services (would be injected in real implementation)
  private notificationService?: any; // BackupAlertService integration
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Create a new incident runbook
   */
  async createRunbook(runbook: Omit<InsertIncidentRunbook, 'id'>): Promise<IncidentRunbook> {
    this.validateRunbook(runbook);
    
    const newRunbook = await this.storage.createIncidentRunbook({
      ...runbook,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`[RunbookService] Created runbook: ${newRunbook.runbookTitle} for ${newRunbook.incidentType}`);
    
    return newRunbook;
  }

  /**
   * Find and execute appropriate runbook for an incident
   */
  async executeRunbookForIncident(
    incidentContext: IncidentContext,
    executedBy: string,
    runbookId?: string
  ): Promise<RunbookExecutionContext> {
    console.log(`[RunbookService] Executing runbook for incident: ${incidentContext.incidentType} (${incidentContext.severity})`);
    
    let runbook: IncidentRunbook | undefined;
    
    if (runbookId) {
      // Use specific runbook
      runbook = await this.storage.getIncidentRunbook(runbookId);
    } else {
      // Find appropriate runbook
      const runbooks = await this.storage.getRunbooksByIncidentType(incidentContext.incidentType);
      runbook = runbooks.find(r => 
        r.severity === incidentContext.severity ||
        (r.severity === 'high' && incidentContext.severity === 'critical') // Allow high severity runbooks for critical incidents
      );
    }
    
    if (!runbook) {
      throw new Error(`No suitable runbook found for incident type: ${incidentContext.incidentType}, severity: ${incidentContext.severity}`);
    }
    
    // Create execution context
    const executionId = nanoid();
    const executionContext: RunbookExecutionContext = {
      executionId,
      runbookId: runbook.id,
      incidentContext,
      executedBy,
      escalationLevel: 1,
      currentStepIndex: 0,
      startTime: new Date(),
      status: 'in_progress'
    };
    
    this.activeExecutions.set(executionId, executionContext);
    
    // Create execution record
    await this.storage.createRunbookExecution({
      executionId,
      runbookId: runbook.id,
      incidentId: incidentContext.incidentId,
      incidentType: incidentContext.incidentType,
      severity: incidentContext.severity,
      executedBy,
      status: 'in_progress',
      startedAt: new Date(),
      escalationLevel: 1,
      stepResults: [],
      metadata: {
        incidentContext,
        runbookTitle: runbook.runbookTitle
      }
    });
    
    // Start automatic execution
    this.startRunbookExecution(executionContext);
    
    console.log(`[RunbookService] Started runbook execution: ${executionId} using runbook ${runbook.runbookTitle}`);
    
    return executionContext;
  }

  /**
   * Start executing runbook steps
   */
  private async startRunbookExecution(context: RunbookExecutionContext): Promise<void> {
    try {
      const steps = await this.storage.getRunbookStepsByOrder(context.runbookId);
      
      if (steps.length === 0) {
        await this.completeExecution(context, 'No steps to execute');
        return;
      }
      
      // Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        context.currentStepIndex = i;
        const step = steps[i];
        
        console.log(`[RunbookService] Executing step ${i + 1}/${steps.length}: ${step.stepTitle}`);
        
        const stepResult = await this.executeStep(step, context);
        
        // Update execution with step result
        await this.updateExecutionStepResult(context.executionId, stepResult);
        
        // Check if step failed and handle accordingly
        if (stepResult.status === 'failed' && step.isRequired) {
          if (step.escalateOnFailure) {
            await this.escalateIncident(context, `Required step failed: ${step.stepTitle}`);
          } else {
            await this.failExecution(context, `Required step failed: ${step.stepTitle}`);
            return;
          }
        }
        
        // Check for escalation triggers
        if (step.escalateOnDelay && stepResult.duration && stepResult.duration > (step.estimatedDuration || 0) * 2) {
          await this.escalateIncident(context, `Step exceeded expected duration: ${step.stepTitle}`);
        }
        
        // Handle step-specific actions
        if (step.stepType === 'notification') {
          await this.handleNotificationStep(step, context);
        } else if (step.stepType === 'escalation') {
          await this.handleEscalationStep(step, context);
        }
      }
      
      // Complete execution
      await this.completeExecution(context, 'All steps completed successfully');
      
    } catch (error) {
      console.error(`[RunbookService] Execution error for ${context.executionId}:`, error);
      await this.failExecution(context, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Execute an individual runbook step
   */
  private async executeStep(step: RunbookStep, context: RunbookExecutionContext): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    const result: StepExecutionResult = {
      stepId: step.id,
      status: 'running',
      startTime,
      executedBy: context.executedBy
    };
    
    try {
      console.log(`[RunbookService] Executing step: ${step.stepTitle} (${step.stepType})`);
      
      // Execute step based on type
      switch (step.stepType) {
        case 'manual':
          result.result = await this.executeManualStep(step, context);
          break;
        case 'automated':
          result.result = await this.executeAutomatedStep(step, context);
          break;
        case 'validation':
          result.result = await this.executeValidationStep(step, context);
          break;
        case 'notification':
          result.result = await this.executeNotificationStep(step, context);
          break;
        case 'escalation':
          result.result = await this.executeEscalationStep(step, context);
          break;
        default:
          throw new Error(`Unknown step type: ${step.stepType}`);
      }
      
      result.status = 'completed';
      result.notes = `Step completed successfully`;
      
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.notes = `Step failed: ${result.error}`;
      
      console.error(`[RunbookService] Step failed: ${step.stepTitle}`, error);
    }
    
    const endTime = new Date();
    result.endTime = endTime;
    result.duration = endTime.getTime() - startTime.getTime();
    
    return result;
  }

  /**
   * Execute a manual step (requires human intervention)
   */
  private async executeManualStep(step: RunbookStep, context: RunbookExecutionContext): Promise<any> {
    // For manual steps, we typically wait for user confirmation or input
    console.log(`[RunbookService] Manual step requires intervention: ${step.stepTitle}`);
    
    // In a real implementation, this would:
    // 1. Send notification to responsible person
    // 2. Create a task/ticket for manual execution
    // 3. Wait for confirmation of completion
    
    // For now, simulate manual execution
    await this.simulateStepExecution(2000);
    
    return {
      type: 'manual',
      description: step.stepDescription,
      instructions: step.stepInstructions,
      timestamp: new Date(),
      status: 'awaiting_confirmation'
    };
  }

  /**
   * Execute an automated step
   */
  private async executeAutomatedStep(step: RunbookStep, context: RunbookExecutionContext): Promise<any> {
    console.log(`[RunbookService] Executing automated step: ${step.stepTitle}`);
    
    // In a real implementation, this would execute the automation script
    // For now, simulate automation execution
    const executionTime = Math.random() * 3000 + 1000;
    await this.simulateStepExecution(executionTime);
    
    return {
      type: 'automated',
      script: step.automationScript || 'default_script.sh',
      executionTime: Math.round(executionTime),
      result: 'success',
      output: 'Automated action completed successfully',
      timestamp: new Date()
    };
  }

  /**
   * Execute a validation step
   */
  private async executeValidationStep(step: RunbookStep, context: RunbookExecutionContext): Promise<any> {
    console.log(`[RunbookService] Executing validation step: ${step.stepTitle}`);
    
    await this.simulateStepExecution(1000);
    
    return {
      type: 'validation',
      checks: step.validationCriteria || ['System health', 'Service availability'],
      passed: true,
      timestamp: new Date()
    };
  }

  /**
   * Execute a notification step
   */
  private async executeNotificationStep(step: RunbookStep, context: RunbookExecutionContext): Promise<any> {
    console.log(`[RunbookService] Executing notification step: ${step.stepTitle}`);
    
    const notifications = await this.sendStepNotifications(step, context);
    
    return {
      type: 'notification',
      notifications,
      timestamp: new Date()
    };
  }

  /**
   * Execute an escalation step
   */
  private async executeEscalationStep(step: RunbookStep, context: RunbookExecutionContext): Promise<any> {
    console.log(`[RunbookService] Executing escalation step: ${step.stepTitle}`);
    
    const escalationResult = await this.escalateIncident(context, `Escalation step: ${step.stepTitle}`);
    
    return {
      type: 'escalation',
      escalationResult,
      timestamp: new Date()
    };
  }

  /**
   * Handle notification step
   */
  private async handleNotificationStep(step: RunbookStep, context: RunbookExecutionContext): Promise<void> {
    // Additional notification handling logic
    console.log(`[RunbookService] Handling notification step: ${step.stepTitle}`);
  }

  /**
   * Handle escalation step
   */
  private async handleEscalationStep(step: RunbookStep, context: RunbookExecutionContext): Promise<void> {
    // Additional escalation handling logic
    console.log(`[RunbookService] Handling escalation step: ${step.stepTitle}`);
  }

  /**
   * Send notifications for a step
   */
  private async sendStepNotifications(step: RunbookStep, context: RunbookExecutionContext): Promise<ContactNotification[]> {
    const notifications: ContactNotification[] = [];
    
    // Get contacts for this escalation level
    const contacts = await this.storage.getContactsByEscalationLevel(context.escalationLevel);
    
    for (const contact of contacts) {
      const notification: ContactNotification = {
        contactId: contact.contactId,
        contact,
        channel: this.selectNotificationChannel(contact),
        status: 'pending',
        retryCount: 0,
        message: this.formatIncidentNotification(step, context)
      };
      
      try {
        await this.sendNotification(notification);
        notification.status = 'sent';
        notification.sentAt = new Date();
      } catch (error) {
        notification.status = 'failed';
        console.error(`[RunbookService] Failed to notify ${contact.name}:`, error);
      }
      
      notifications.push(notification);
    }
    
    return notifications;
  }

  /**
   * Escalate incident to next level
   */
  private async escalateIncident(context: RunbookExecutionContext, reason: string): Promise<EscalationResult> {
    console.log(`[RunbookService] Escalating incident ${context.incidentContext.incidentId}: ${reason}`);
    
    context.escalationLevel++;
    
    // Get escalation tree for this incident type
    const escalationTree = await this.storage.getEscalationTreeByIncidentType(
      context.incidentContext.incidentType,
      context.incidentContext.severity
    );
    
    if (!escalationTree) {
      console.warn(`[RunbookService] No escalation tree found for ${context.incidentContext.incidentType}`);
      return {
        escalated: false,
        escalationLevel: context.escalationLevel,
        contactsNotified: [],
        reason: 'No escalation tree configured'
      };
    }
    
    // Get contacts for new escalation level
    const contacts = await this.storage.getContactsByEscalationLevel(context.escalationLevel);
    const contactsNotified: ContactNotification[] = [];
    
    for (const contact of contacts) {
      const notification: ContactNotification = {
        contactId: contact.contactId,
        contact,
        channel: this.selectEscalationChannel(contact, context.escalationLevel),
        status: 'pending',
        retryCount: 0,
        message: this.formatEscalationNotification(context, reason)
      };
      
      try {
        await this.sendNotification(notification);
        notification.status = 'sent';
        notification.sentAt = new Date();
      } catch (error) {
        notification.status = 'failed';
        console.error(`[RunbookService] Failed to escalate to ${contact.name}:`, error);
      }
      
      contactsNotified.push(notification);
    }
    
    // Update execution record
    await this.storage.updateRunbookExecution(context.executionId, {
      escalationLevel: context.escalationLevel,
      escalationReason: reason,
      escalatedAt: new Date()
    });
    
    // Schedule next escalation if configured
    const nextEscalationTime = this.scheduleNextEscalation(context, escalationTree);
    
    return {
      escalated: true,
      escalationLevel: context.escalationLevel,
      contactsNotified,
      nextEscalationTime,
      reason
    };
  }

  /**
   * Select appropriate notification channel for contact
   */
  private selectNotificationChannel(contact: RunbookContact): 'email' | 'sms' | 'phone' | 'slack' {
    // Simple logic - in real implementation this would be more sophisticated
    if (contact.isAvailable24x7) {
      return contact.phoneNumber ? 'phone' : 'email';
    }
    return 'email';
  }

  /**
   * Select escalation channel (typically more urgent)
   */
  private selectEscalationChannel(contact: RunbookContact, escalationLevel: number): 'email' | 'sms' | 'phone' | 'slack' {
    if (escalationLevel >= 3) {
      return 'phone'; // Highest urgency
    } else if (escalationLevel >= 2) {
      return contact.phoneNumber ? 'sms' : 'email';
    }
    return 'email';
  }

  /**
   * Send notification to contact
   */
  private async sendNotification(notification: ContactNotification): Promise<void> {
    console.log(`[RunbookService] Sending ${notification.channel} notification to ${notification.contact.name}`);
    
    // In real implementation, this would integrate with notification services
    // For now, simulate sending
    await this.simulateStepExecution(100);
    
    // Update contact's last contacted time
    await this.storage.updateContactLastContacted(notification.contactId);
  }

  /**
   * Format incident notification message
   */
  private formatIncidentNotification(step: RunbookStep, context: RunbookExecutionContext): string {
    const { incidentContext } = context;
    
    return `
INCIDENT NOTIFICATION

Incident ID: ${incidentContext.incidentId}
Type: ${incidentContext.incidentType}
Severity: ${incidentContext.severity.toUpperCase()}
Environment: ${incidentContext.environment}

Description: ${incidentContext.description}

Current Step: ${step.stepTitle}
Execution ID: ${context.executionId}

Please follow the incident response procedures.
    `.trim();
  }

  /**
   * Format escalation notification message
   */
  private formatEscalationNotification(context: RunbookExecutionContext, reason: string): string {
    const { incidentContext } = context;
    
    return `
INCIDENT ESCALATION - LEVEL ${context.escalationLevel}

Incident ID: ${incidentContext.incidentId}
Type: ${incidentContext.incidentType}
Severity: ${incidentContext.severity.toUpperCase()}
Environment: ${incidentContext.environment}

Escalation Reason: ${reason}

Description: ${incidentContext.description}

Execution ID: ${context.executionId}
Started: ${context.startTime.toISOString()}

IMMEDIATE ATTENTION REQUIRED
    `.trim();
  }

  /**
   * Schedule next escalation
   */
  private scheduleNextEscalation(context: RunbookExecutionContext, escalationTree: ContactEscalationTree): Date | undefined {
    if (!escalationTree.escalationIntervalMinutes) {
      return undefined;
    }
    
    const nextTime = new Date(Date.now() + escalationTree.escalationIntervalMinutes * 60 * 1000);
    
    const timer = setTimeout(async () => {
      if (this.activeExecutions.has(context.executionId)) {
        await this.escalateIncident(context, 'Automatic escalation - time interval exceeded');
      }
    }, escalationTree.escalationIntervalMinutes * 60 * 1000);
    
    this.escalationTimers.set(context.executionId, timer);
    
    return nextTime;
  }

  /**
   * Complete execution successfully
   */
  private async completeExecution(context: RunbookExecutionContext, reason: string): Promise<void> {
    console.log(`[RunbookService] Completing execution ${context.executionId}: ${reason}`);
    
    context.status = 'completed';
    
    await this.storage.completeRunbookExecution(context.executionId, {
      completionReason: reason,
      finalStatus: 'completed'
    });
    
    this.cleanupExecution(context.executionId);
  }

  /**
   * Fail execution
   */
  private async failExecution(context: RunbookExecutionContext, reason: string): Promise<void> {
    console.log(`[RunbookService] Failing execution ${context.executionId}: ${reason}`);
    
    context.status = 'failed';
    
    await this.storage.updateRunbookExecution(context.executionId, {
      status: 'failed',
      completedAt: new Date(),
      error: reason
    });
    
    this.cleanupExecution(context.executionId);
  }

  /**
   * Update execution with step result
   */
  private async updateExecutionStepResult(executionId: string, stepResult: StepExecutionResult): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) return;
    
    // In real implementation, this would update the execution record with step results
    console.log(`[RunbookService] Updated step result for execution ${executionId}: ${stepResult.status}`);
  }

  /**
   * Cleanup execution resources
   */
  private cleanupExecution(executionId: string): void {
    this.activeExecutions.delete(executionId);
    
    const timer = this.escalationTimers.get(executionId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(executionId);
    }
  }

  /**
   * Get active executions
   */
  async getActiveExecutions(): Promise<RunbookExecution[]> {
    return await this.storage.getActiveRunbookExecutions();
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<RunbookExecution | undefined> {
    return await this.storage.getRunbookExecution(executionId);
  }

  /**
   * Get runbooks by incident type
   */
  async getRunbooksByIncidentType(incidentType: string): Promise<IncidentRunbook[]> {
    return await this.storage.getRunbooksByIncidentType(incidentType);
  }

  /**
   * Create runbook contact
   */
  async createContact(contact: Omit<InsertRunbookContact, 'id'>): Promise<RunbookContact> {
    this.validateContact(contact);
    
    const newContact = await this.storage.createRunbookContact({
      ...contact,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`[RunbookService] Created contact: ${newContact.name} (Level ${newContact.escalationLevel})`);
    
    return newContact;
  }

  /**
   * Create escalation tree
   */
  async createEscalationTree(tree: Omit<InsertContactEscalationTree, 'id'>): Promise<ContactEscalationTree> {
    this.validateEscalationTree(tree);
    
    const newTree = await this.storage.createContactEscalationTree({
      ...tree,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`[RunbookService] Created escalation tree: ${newTree.treeName} for ${newTree.incidentTypes?.join(', ')}`);
    
    return newTree;
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string, reason: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      context.status = 'paused';
      await this.storage.updateRunbookExecution(executionId, {
        status: 'paused',
        pauseReason: reason,
        pausedAt: new Date()
      });
      
      console.log(`[RunbookService] Paused execution ${executionId}: ${reason}`);
    }
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      context.status = 'in_progress';
      await this.storage.updateRunbookExecution(executionId, {
        status: 'in_progress',
        resumedAt: new Date()
      });
      
      console.log(`[RunbookService] Resumed execution ${executionId}`);
    }
  }

  /**
   * Validate runbook
   */
  private validateRunbook(runbook: any): void {
    if (!runbook.runbookTitle || runbook.runbookTitle.trim().length === 0) {
      throw new Error('Runbook title is required');
    }

    if (!runbook.incidentType) {
      throw new Error('Incident type is required');
    }

    if (!runbook.severity) {
      throw new Error('Severity is required');
    }
  }

  /**
   * Validate contact
   */
  private validateContact(contact: any): void {
    if (!contact.name || contact.name.trim().length === 0) {
      throw new Error('Contact name is required');
    }

    if (!contact.role) {
      throw new Error('Contact role is required');
    }

    if (typeof contact.escalationLevel !== 'number' || contact.escalationLevel < 1) {
      throw new Error('Valid escalation level is required');
    }
  }

  /**
   * Validate escalation tree
   */
  private validateEscalationTree(tree: any): void {
    if (!tree.treeName || tree.treeName.trim().length === 0) {
      throw new Error('Tree name is required');
    }

    if (!tree.incidentTypes || tree.incidentTypes.length === 0) {
      throw new Error('At least one incident type is required');
    }

    if (!tree.severityLevels || tree.severityLevels.length === 0) {
      throw new Error('At least one severity level is required');
    }
  }

  /**
   * Simulate step execution (replace with real logic)
   */
  private async simulateStepExecution(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all escalation timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
    this.activeExecutions.clear();
  }
}