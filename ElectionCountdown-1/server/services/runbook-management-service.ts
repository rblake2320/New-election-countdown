/**
 * Incident Runbook Management System
 * Complete incident response runbooks with versioning, contact management, and automated execution
 * Integrates with authentication system and provides role-based access control
 */

import { nanoid } from 'nanoid';
import { notificationQueueService } from './notification-queue-service';
import {
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

export interface RunbookTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  incidentType: string;
  severity: string;
  estimatedDuration: number;
  steps: RunbookStepTemplate[];
  requiredRoles: string[];
  prerequisites: string[];
}

export interface RunbookStepTemplate {
  id: string;
  title: string;
  description: string;
  stepType: 'manual' | 'automated' | 'decision' | 'parallel' | 'validation';
  instructions: string;
  command?: string;
  expectedOutput?: string;
  estimatedDuration: number;
  isCritical: boolean;
  canSkip: boolean;
  dependsOn: string[];
  validationChecks?: any;
  rollbackInstructions?: string;
}

export interface ContactAvailability {
  contactId: string;
  isAvailable: boolean;
  timezone: string;
  currentTime: Date;
  businessHours: {
    start: string;
    end: string;
    days: string[];
  };
  onCallSchedule?: {
    start: Date;
    end: Date;
    level: 'primary' | 'secondary' | 'backup';
  };
  lastResponse?: Date;
  responseRate: number;
}

export interface EscalationFlow {
  treeId: string;
  incidentType: string;
  severity: string;
  steps: EscalationStep[];
  autoEscalationEnabled: boolean;
  escalationIntervalMinutes: number;
  maxEscalationLevel: number;
}

export interface EscalationStep {
  level: number;
  contacts: string[];
  channels: string[];
  delayMinutes: number;
  condition?: string;
  allowBypass: boolean;
}

export interface RunbookExecutionProgress {
  executionId: string;
  runbookId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'cancelled';
  currentStep?: string;
  progress: {
    totalSteps: number;
    completedSteps: number;
    skippedSteps: number;
    failedSteps: number;
    progressPercent: number;
  };
  timeline: Array<{
    stepId: string;
    stepName: string;
    status: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    executedBy?: string;
    notes?: string;
  }>;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
}

export interface RunbookApprovalWorkflow {
  runbookId: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'published';
  submittedBy: string;
  submittedAt: Date;
  reviewers: string[];
  approvers: string[];
  currentReviewer?: string;
  approvalHistory: Array<{
    action: 'submit' | 'review' | 'approve' | 'reject' | 'publish';
    user: string;
    timestamp: Date;
    comments?: string;
  }>;
  requiredApprovals: number;
  receivedApprovals: number;
}

export class RunbookManagementService {
  private isRunning: boolean = false;
  private runbookTemplates: Map<string, RunbookTemplate> = new Map();
  private activeExecutions: Map<string, RunbookExecutionProgress> = new Map();
  private contactAvailability: Map<string, ContactAvailability> = new Map();
  private escalationFlows: Map<string, EscalationFlow> = new Map();
  private approvalWorkflows: Map<string, RunbookApprovalWorkflow> = new Map();
  private availabilityCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeBuiltInTemplates();
    console.log('✅ Runbook Management Service initialized');
  }

  /**
   * Start the runbook management service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Runbook Management Service already running');
      return;
    }

    console.log('🚀 Starting Runbook Management Service');

    try {
      // Load runbooks and contacts
      await this.loadRunbooksAndContacts();
      
      // Start availability monitoring
      await this.startAvailabilityMonitoring();

      this.isRunning = true;
      console.log('✅ Runbook Management Service started successfully');

    } catch (error) {
      console.error('❌ Failed to start Runbook Management Service:', error);
      throw error;
    }
  }

  /**
   * Stop the runbook management service
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Runbook Management Service');

    if (this.availabilityCheckInterval) {
      clearInterval(this.availabilityCheckInterval);
    }

    // Pause any active executions
    for (const [executionId, execution] of this.activeExecutions) {
      if (execution.status === 'in_progress') {
        await this.pauseRunbookExecution(executionId, 'Service shutdown');
      }
    }

    this.activeExecutions.clear();
    this.contactAvailability.clear();
    this.isRunning = false;
    
    console.log('✅ Runbook Management Service stopped');
  }

  /**
   * Create new runbook from template
   */
  async createRunbookFromTemplate(
    templateId: string,
    customizations: {
      name?: string;
      description?: string;
      createdBy: string;
      customSteps?: RunbookStepTemplate[];
      accessLevel?: string;
      authorizedRoles?: string[];
    }
  ): Promise<IncidentRunbook> {
    console.log(`📋 Creating runbook from template ${templateId}`);

    try {
      const template = this.runbookTemplates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      const { storage } = await import('../storage');
      
      const runbookId = nanoid();
      const runbook: InsertIncidentRunbook = {
        runbookId,
        title: customizations.name || template.name,
        description: customizations.description || template.description,
        incidentType: template.incidentType,
        severity: template.severity,
        category: template.category,
        version: '1.0.0',
        status: 'draft',
        estimatedDuration: template.estimatedDuration,
        automationLevel: 'semi_automated',
        accessLevel: customizations.accessLevel || 'internal',
        authorizedRoles: customizations.authorizedRoles || template.requiredRoles,
        overview: template.description,
        objectives: template.prerequisites,
        triggerConditions: {
          incidentType: template.incidentType,
          severity: template.severity,
          category: template.category
        },
        createdBy: customizations.createdBy,
        approvalRequired: true,
        reviewFrequencyDays: 365
      };

      const createdRunbook = await storage.createIncidentRunbook(runbook);

      // Create runbook steps
      const steps = customizations.customSteps || template.steps;
      for (const [index, stepTemplate] of steps.entries()) {
        const step: InsertRunbookStep = {
          runbookId: createdRunbook.id,
          stepOrder: index + 1,
          stepId: stepTemplate.id,
          title: stepTemplate.title,
          description: stepTemplate.description,
          stepType: stepTemplate.stepType,
          instructions: stepTemplate.instructions,
          command: stepTemplate.command,
          expectedOutput: stepTemplate.expectedOutput,
          estimatedDuration: stepTemplate.estimatedDuration,
          isCritical: stepTemplate.isCritical,
          canSkip: stepTemplate.canSkip,
          dependsOn: stepTemplate.dependsOn,
          validationChecks: stepTemplate.validationChecks,
          rollbackInstructions: stepTemplate.rollbackInstructions
        };

        await storage.createRunbookStep(step);
      }

      // Initialize approval workflow
      await this.initializeApprovalWorkflow(createdRunbook, customizations.createdBy);

      console.log(`✅ Created runbook ${runbookId} from template ${templateId}`);
      return createdRunbook;

    } catch (error) {
      console.error(`Failed to create runbook from template:`, error);
      throw error;
    }
  }

  /**
   * Execute runbook
   */
  async executeRunbook(
    runbookId: string,
    executionContext: {
      executionType: 'emergency' | 'planned' | 'drill' | 'test';
      executedBy: string;
      incidentId?: string;
      triggerReason?: string;
      escalationTreeId?: string;
      overrideSteps?: string[];
    }
  ): Promise<string> {
    console.log(`🚀 Starting runbook execution for ${runbookId}`);

    try {
      const { storage } = await import('../storage');
      
      // Get runbook and validate
      const runbook = await storage.getIncidentRunbook(runbookId);
      if (!runbook) {
        throw new Error(`Runbook ${runbookId} not found`);
      }

      if (runbook.status !== 'published') {
        throw new Error(`Runbook ${runbookId} is not published and cannot be executed`);
      }

      // Create execution record
      const executionId = nanoid();
      const execution: InsertRunbookExecution = {
        executionId,
        runbookId: runbook.id,
        incidentId: executionContext.incidentId,
        executionType: executionContext.executionType,
        triggerReason: executionContext.triggerReason,
        status: 'pending',
        executedBy: executionContext.executedBy,
        escalationTreeUsed: executionContext.escalationTreeId,
        reviewRequired: true,
        metadata: {
          overrideSteps: executionContext.overrideSteps
        }
      };

      const createdExecution = await storage.createRunbookExecution(execution);

      // Get runbook steps
      const steps = await storage.getRunbookStepsByOrder(runbook.id);

      // Initialize execution progress
      const progress: RunbookExecutionProgress = {
        executionId,
        runbookId: runbook.runbookId,
        status: 'pending',
        progress: {
          totalSteps: steps.length,
          completedSteps: 0,
          skippedSteps: 0,
          failedSteps: 0,
          progressPercent: 0
        },
        timeline: [],
        estimatedCompletion: new Date(Date.now() + (runbook.estimatedDuration || 60) * 60 * 1000)
      };

      this.activeExecutions.set(executionId, progress);

      // Notify contacts if escalation tree is specified
      if (executionContext.escalationTreeId) {
        await this.initiateEscalation(executionContext.escalationTreeId, executionId, runbook);
      }

      // Start execution
      await this.startRunbookExecution(executionId, runbook, steps, executionContext);

      return executionId;

    } catch (error) {
      console.error(`Failed to execute runbook:`, error);
      throw error;
    }
  }

  /**
   * Get runbook execution progress
   */
  async getExecutionProgress(executionId: string): Promise<RunbookExecutionProgress | null> {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * Update execution step
   */
  async updateExecutionStep(
    executionId: string,
    stepId: string,
    update: {
      status: 'completed' | 'failed' | 'skipped';
      notes?: string;
      output?: any;
      executedBy?: string;
    }
  ): Promise<void> {
    console.log(`📝 Updating execution step ${stepId} for execution ${executionId}`);

    try {
      const progress = this.activeExecutions.get(executionId);
      if (!progress) {
        throw new Error(`Execution ${executionId} not found`);
      }

      // Update timeline
      const timelineEntry = progress.timeline.find(t => t.stepId === stepId);
      if (timelineEntry) {
        timelineEntry.status = update.status;
        timelineEntry.endTime = new Date();
        timelineEntry.duration = timelineEntry.endTime.getTime() - timelineEntry.startTime.getTime();
        timelineEntry.executedBy = update.executedBy;
        timelineEntry.notes = update.notes;
      }

      // Update progress counters
      switch (update.status) {
        case 'completed':
          progress.progress.completedSteps++;
          break;
        case 'failed':
          progress.progress.failedSteps++;
          break;
        case 'skipped':
          progress.progress.skippedSteps++;
          break;
      }

      progress.progress.progressPercent = 
        ((progress.progress.completedSteps + progress.progress.skippedSteps) / progress.progress.totalSteps) * 100;

      // Check if execution is complete
      const totalProcessed = progress.progress.completedSteps + progress.progress.failedSteps + progress.progress.skippedSteps;
      if (totalProcessed >= progress.progress.totalSteps) {
        progress.status = progress.progress.failedSteps > 0 ? 'failed' : 'completed';
        progress.actualCompletion = new Date();
        
        await this.completeRunbookExecution(executionId, progress);
      }

      // Update database
      const { storage } = await import('../storage');
      await storage.updateRunbookExecution(executionId, {
        currentStep: progress.currentStep,
        completedSteps: progress.timeline.filter(t => t.status === 'completed').map(t => t.stepId),
        skippedSteps: progress.timeline.filter(t => t.status === 'skipped').map(t => t.stepId),
        failedSteps: progress.timeline.filter(t => t.status === 'failed').map(t => t.stepId),
        stepResults: progress.timeline,
        status: progress.status as any
      });

    } catch (error) {
      console.error(`Failed to update execution step:`, error);
      throw error;
    }
  }

  /**
   * Manage contacts
   */
  async createContact(contactData: InsertRunbookContact): Promise<RunbookContact> {
    try {
      const { storage } = await import('../storage');
      const contact = await storage.createRunbookContact({
        ...contactData,
        contactId: nanoid()
      });

      // Update availability tracking
      await this.updateContactAvailability(contact.contactId);

      console.log(`👤 Created contact ${contact.name} (${contact.contactId})`);
      return contact;

    } catch (error) {
      console.error('Failed to create contact:', error);
      throw error;
    }
  }

  /**
   * Create escalation tree
   */
  async createEscalationTree(treeData: InsertContactEscalationTree): Promise<ContactEscalationTree> {
    try {
      const { storage } = await import('../storage');
      const tree = await storage.createContactEscalationTree({
        ...treeData,
        treeId: nanoid()
      });

      // Cache escalation flow
      const escalationFlow: EscalationFlow = {
        treeId: tree.treeId,
        incidentType: tree.incidentTypes?.[0] || 'general',
        severity: tree.severityLevels?.[0] || 'medium',
        steps: this.parseEscalationSteps(tree.escalationSteps),
        autoEscalationEnabled: tree.autoEscalationEnabled || false,
        escalationIntervalMinutes: tree.escalationIntervalMinutes || 30,
        maxEscalationLevel: tree.maxEscalationLevel || 3
      };

      this.escalationFlows.set(tree.treeId, escalationFlow);

      console.log(`🌳 Created escalation tree ${tree.treeId}`);
      return tree;

    } catch (error) {
      console.error('Failed to create escalation tree:', error);
      throw error;
    }
  }

  /**
   * Get available contacts
   */
  async getAvailableContacts(filters?: {
    timezone?: string;
    escalationLevel?: number;
    expertiseAreas?: string[];
    available24x7?: boolean;
  }): Promise<ContactAvailability[]> {
    try {
      const { storage } = await import('../storage');
      const contacts = await storage.getAvailableContacts(filters?.timezone);

      const availabilityList: ContactAvailability[] = [];

      for (const contact of contacts) {
        const availability = await this.calculateContactAvailability(contact);
        
        // Apply filters
        if (filters?.escalationLevel && contact.escalationLevel !== filters.escalationLevel) {
          continue;
        }
        
        if (filters?.expertiseAreas && 
            !filters.expertiseAreas.some(area => contact.expertiseAreas?.includes(area))) {
          continue;
        }
        
        if (filters?.available24x7 && !contact.isAvailable24x7) {
          continue;
        }

        availabilityList.push(availability);
      }

      return availabilityList.sort((a, b) => {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        return b.responseRate - a.responseRate;
      });

    } catch (error) {
      console.error('Failed to get available contacts:', error);
      return [];
    }
  }

  /**
   * Get runbook templates
   */
  getRunbookTemplates(filters?: { category?: string; incidentType?: string; severity?: string }): RunbookTemplate[] {
    let templates = Array.from(this.runbookTemplates.values());

    if (filters?.category) {
      templates = templates.filter(t => t.category === filters.category);
    }
    
    if (filters?.incidentType) {
      templates = templates.filter(t => t.incidentType === filters.incidentType);
    }
    
    if (filters?.severity) {
      templates = templates.filter(t => t.severity === filters.severity);
    }

    return templates;
  }

  /**
   * Pause runbook execution
   */
  async pauseRunbookExecution(executionId: string, reason: string): Promise<void> {
    const progress = this.activeExecutions.get(executionId);
    if (progress && progress.status === 'in_progress') {
      progress.status = 'paused';
      
      const { storage } = await import('../storage');
      await storage.updateRunbookExecution(executionId, {
        status: 'paused',
        executionNotes: `Paused: ${reason}`
      });

      console.log(`⏸️ Paused runbook execution ${executionId}: ${reason}`);
    }
  }

  /**
   * Resume runbook execution
   */
  async resumeRunbookExecution(executionId: string, resumedBy: string): Promise<void> {
    const progress = this.activeExecutions.get(executionId);
    if (progress && progress.status === 'paused') {
      progress.status = 'in_progress';
      
      const { storage } = await import('../storage');
      await storage.updateRunbookExecution(executionId, {
        status: 'in_progress',
        executionNotes: `Resumed by ${resumedBy}`
      });

      console.log(`▶️ Resumed runbook execution ${executionId} by ${resumedBy}`);
    }
  }

  /**
   * Submit runbook for approval
   */
  async submitForApproval(runbookId: string, submittedBy: string, comments?: string): Promise<void> {
    const workflow = this.approvalWorkflows.get(runbookId);
    if (!workflow) {
      throw new Error(`No approval workflow found for runbook ${runbookId}`);
    }

    workflow.status = 'review';
    workflow.submittedBy = submittedBy;
    workflow.submittedAt = new Date();
    workflow.approvalHistory.push({
      action: 'submit',
      user: submittedBy,
      timestamp: new Date(),
      comments
    });

    // Notify reviewers
    await this.notifyReviewers(runbookId, workflow);

    console.log(`📤 Submitted runbook ${runbookId} for approval`);
  }

  /**
   * Approve runbook
   */
  async approveRunbook(runbookId: string, approvedBy: string, comments?: string): Promise<void> {
    const workflow = this.approvalWorkflows.get(runbookId);
    if (!workflow) {
      throw new Error(`No approval workflow found for runbook ${runbookId}`);
    }

    workflow.receivedApprovals++;
    workflow.approvalHistory.push({
      action: 'approve',
      user: approvedBy,
      timestamp: new Date(),
      comments
    });

    if (workflow.receivedApprovals >= workflow.requiredApprovals) {
      workflow.status = 'approved';
      await this.publishRunbook(runbookId);
    }

    const { storage } = await import('../storage');
    await storage.approveRunbook(runbookId, approvedBy);

    console.log(`✅ Approved runbook ${runbookId} by ${approvedBy}`);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Initialize built-in runbook templates
   */
  private initializeBuiltInTemplates(): void {
    const templates: RunbookTemplate[] = [
      {
        id: 'database_outage_response',
        name: 'Database Outage Response',
        description: 'Complete response procedure for database outages',
        category: 'infrastructure',
        incidentType: 'database_failure',
        severity: 'high',
        estimatedDuration: 120,
        requiredRoles: ['dba', 'sre', 'on_call_engineer'],
        prerequisites: ['database_access', 'monitoring_access', 'escalation_contacts'],
        steps: [
          {
            id: 'assess_situation',
            title: 'Assess Database Situation',
            description: 'Initial assessment of database status and impact',
            stepType: 'manual',
            instructions: '1. Check database monitoring dashboards\n2. Verify database connectivity\n3. Assess impact on applications\n4. Document initial findings',
            estimatedDuration: 10,
            isCritical: true,
            canSkip: false,
            dependsOn: [],
            validationChecks: {
              connectivityChecked: true,
              impactAssessed: true,
              findingsDocumented: true
            }
          },
          {
            id: 'notify_stakeholders',
            title: 'Notify Stakeholders',
            description: 'Inform relevant stakeholders about the outage',
            stepType: 'manual',
            instructions: '1. Send initial outage notification\n2. Update status page\n3. Escalate to management if critical\n4. Start incident communication thread',
            estimatedDuration: 5,
            isCritical: true,
            canSkip: false,
            dependsOn: ['assess_situation']
          },
          {
            id: 'attempt_recovery',
            title: 'Attempt Database Recovery',
            description: 'Execute database recovery procedures',
            stepType: 'manual',
            instructions: '1. Check for obvious issues (disk space, connections)\n2. Attempt service restart\n3. Check database logs\n4. Verify data integrity\n5. Test application connectivity',
            estimatedDuration: 30,
            isCritical: true,
            canSkip: false,
            dependsOn: ['notify_stakeholders'],
            rollbackInstructions: 'If recovery fails, proceed to failover procedures'
          },
          {
            id: 'failover_if_needed',
            title: 'Execute Failover if Recovery Fails',
            description: 'Failover to backup database if primary recovery fails',
            stepType: 'manual',
            instructions: '1. Validate backup database status\n2. Update DNS/load balancer\n3. Execute failover procedure\n4. Verify application functionality\n5. Monitor for issues',
            estimatedDuration: 45,
            isCritical: true,
            canSkip: true,
            dependsOn: ['attempt_recovery']
          },
          {
            id: 'verify_service',
            title: 'Verify Service Restoration',
            description: 'Comprehensive verification that service is restored',
            stepType: 'validation',
            instructions: '1. Test all critical application functions\n2. Monitor error rates and performance\n3. Verify data consistency\n4. Check backup processes\n5. Document any remaining issues',
            estimatedDuration: 20,
            isCritical: true,
            canSkip: false,
            dependsOn: ['attempt_recovery', 'failover_if_needed'],
            validationChecks: {
              applicationFunctional: true,
              performanceNormal: true,
              dataConsistent: true,
              backupsWorking: true
            }
          },
          {
            id: 'post_incident',
            title: 'Post-Incident Activities',
            description: 'Complete post-incident documentation and communication',
            stepType: 'manual',
            instructions: '1. Send service restoration notification\n2. Update status page\n3. Document incident timeline\n4. Schedule post-mortem meeting\n5. Update monitoring if needed',
            estimatedDuration: 10,
            isCritical: false,
            canSkip: false,
            dependsOn: ['verify_service']
          }
        ]
      },
      {
        id: 'security_breach_response',
        name: 'Security Breach Response',
        description: 'Incident response for potential security breaches',
        category: 'security',
        incidentType: 'security_breach',
        severity: 'critical',
        estimatedDuration: 240,
        requiredRoles: ['security_analyst', 'incident_commander', 'legal', 'communications'],
        prerequisites: ['security_tools_access', 'legal_contact', 'communication_channels'],
        steps: [
          {
            id: 'initial_containment',
            title: 'Initial Containment',
            description: 'Immediate steps to contain the security breach',
            stepType: 'manual',
            instructions: '1. Isolate affected systems\n2. Preserve evidence\n3. Assess scope of breach\n4. Document all actions taken',
            estimatedDuration: 30,
            isCritical: true,
            canSkip: false,
            dependsOn: []
          },
          {
            id: 'legal_notification',
            title: 'Legal and Regulatory Notification',
            description: 'Notify legal team and assess regulatory requirements',
            stepType: 'manual',
            instructions: '1. Contact legal team immediately\n2. Assess data involved\n3. Determine notification requirements\n4. Begin compliance documentation',
            estimatedDuration: 20,
            isCritical: true,
            canSkip: false,
            dependsOn: ['initial_containment']
          },
          {
            id: 'forensic_analysis',
            title: 'Forensic Analysis',
            description: 'Detailed forensic analysis of the breach',
            stepType: 'manual',
            instructions: '1. Collect system logs\n2. Analyze attack vectors\n3. Determine data accessed\n4. Identify vulnerabilities\n5. Document findings',
            estimatedDuration: 120,
            isCritical: true,
            canSkip: false,
            dependsOn: ['legal_notification']
          },
          {
            id: 'remediation',
            title: 'Remediation and Recovery',
            description: 'Fix vulnerabilities and restore secure operations',
            stepType: 'manual',
            instructions: '1. Patch identified vulnerabilities\n2. Reset compromised credentials\n3. Update security configurations\n4. Restore systems from clean backups\n5. Implement additional monitoring',
            estimatedDuration: 60,
            isCritical: true,
            canSkip: false,
            dependsOn: ['forensic_analysis']
          },
          {
            id: 'communication',
            title: 'Customer and Public Communication',
            description: 'Communicate with affected parties',
            stepType: 'manual',
            instructions: '1. Draft customer notification\n2. Coordinate with legal and PR\n3. Send notifications as required\n4. Update public statements\n5. Handle media inquiries',
            estimatedDuration: 30,
            isCritical: true,
            canSkip: false,
            dependsOn: ['remediation']
          }
        ]
      }
    ];

    for (const template of templates) {
      this.runbookTemplates.set(template.id, template);
    }

    console.log(`📋 Initialized ${templates.length} built-in runbook templates`);
  }

  /**
   * Load runbooks and contacts
   */
  private async loadRunbooksAndContacts(): Promise<void> {
    try {
      const { storage } = await import('../storage');
      
      // Load contacts and update availability
      const contacts = await storage.getRunbookContacts();
      for (const contact of contacts) {
        await this.updateContactAvailability(contact.contactId);
      }

      // Load escalation trees
      const trees = await storage.getContactEscalationTrees();
      for (const tree of trees) {
        const escalationFlow: EscalationFlow = {
          treeId: tree.treeId,
          incidentType: tree.incidentTypes?.[0] || 'general',
          severity: tree.severityLevels?.[0] || 'medium',
          steps: this.parseEscalationSteps(tree.escalationSteps),
          autoEscalationEnabled: tree.autoEscalationEnabled || false,
          escalationIntervalMinutes: tree.escalationIntervalMinutes || 30,
          maxEscalationLevel: tree.maxEscalationLevel || 3
        };
        this.escalationFlows.set(tree.treeId, escalationFlow);
      }

      console.log(`👥 Loaded ${contacts.length} contacts and ${trees.length} escalation trees`);

    } catch (error) {
      console.error('Failed to load runbooks and contacts:', error);
    }
  }

  /**
   * Start availability monitoring
   */
  private async startAvailabilityMonitoring(): Promise<void> {
    // Check contact availability every 15 minutes
    this.availabilityCheckInterval = setInterval(async () => {
      try {
        await this.updateAllContactAvailability();
      } catch (error) {
        console.error('Error in availability check:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    console.log('🔄 Started contact availability monitoring');
  }

  /**
   * Update contact availability
   */
  private async updateContactAvailability(contactId: string): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const contact = await storage.getRunbookContact(contactId);
      
      if (!contact) {
        return;
      }

      const availability: ContactAvailability = await this.calculateContactAvailability(contact);
      this.contactAvailability.set(contactId, availability);

    } catch (error) {
      console.error(`Failed to update availability for contact ${contactId}:`, error);
    }
  }

  /**
   * Calculate contact availability
   */
  private async calculateContactAvailability(contact: RunbookContact): Promise<ContactAvailability> {
    const now = new Date();
    const timezone = contact.timezone || 'UTC';
    
    // Simple availability calculation (in real implementation, would use proper timezone library)
    const isInBusinessHours = this.isInBusinessHours(now, contact.businessHours, timezone);
    const isAvailable = contact.isAvailable24x7 || isInBusinessHours;

    return {
      contactId: contact.contactId,
      isAvailable,
      timezone,
      currentTime: now,
      businessHours: this.parseBusinessHours(contact.businessHours),
      onCallSchedule: this.parseOnCallSchedule(contact.onCallSchedule),
      lastResponse: contact.lastResponseAt,
      responseRate: contact.responseRate || 0
    };
  }

  /**
   * Initialize approval workflow
   */
  private async initializeApprovalWorkflow(runbook: IncidentRunbook, submittedBy: string): Promise<void> {
    const workflow: RunbookApprovalWorkflow = {
      runbookId: runbook.runbookId,
      version: runbook.version,
      status: 'draft',
      submittedBy,
      submittedAt: new Date(),
      reviewers: ['admin', 'lead_engineer'], // Would come from configuration
      approvers: ['manager', 'director'], // Would come from configuration
      approvalHistory: [{
        action: 'submit',
        user: submittedBy,
        timestamp: new Date(),
        comments: 'Initial runbook creation'
      }],
      requiredApprovals: 2,
      receivedApprovals: 0
    };

    this.approvalWorkflows.set(runbook.runbookId, workflow);
  }

  /**
   * Start runbook execution
   */
  private async startRunbookExecution(
    executionId: string,
    runbook: IncidentRunbook,
    steps: RunbookStep[],
    context: any
  ): Promise<void> {
    try {
      const progress = this.activeExecutions.get(executionId);
      if (!progress) {
        return;
      }

      progress.status = 'in_progress';

      // Initialize timeline
      for (const step of steps) {
        progress.timeline.push({
          stepId: step.stepId,
          stepName: step.title,
          status: 'pending',
          startTime: new Date()
        });
      }

      // Set current step to first step
      if (steps.length > 0) {
        progress.currentStep = steps[0].stepId;
        progress.timeline[0].status = 'in_progress';
        progress.timeline[0].startTime = new Date();
      }

      const { storage } = await import('../storage');
      await storage.updateRunbookExecution(executionId, {
        status: 'in_progress',
        currentStep: progress.currentStep
      });

      console.log(`📋 Started execution of runbook ${runbook.title} (${executionId})`);

    } catch (error) {
      console.error('Failed to start runbook execution:', error);
    }
  }

  /**
   * Complete runbook execution
   */
  private async completeRunbookExecution(executionId: string, progress: RunbookExecutionProgress): Promise<void> {
    try {
      const { storage } = await import('../storage');
      
      const successRate = (progress.progress.completedSteps / progress.progress.totalSteps) * 100;
      const isSuccessful = progress.progress.failedSteps === 0;

      await storage.completeRunbookExecution(executionId, {
        isSuccessful,
        successRate,
        objectivesAchieved: progress.timeline.filter(t => t.status === 'completed').map(t => t.stepName),
        objectivesFailed: progress.timeline.filter(t => t.status === 'failed').map(t => t.stepName),
        executionNotes: `Execution completed with ${successRate.toFixed(1)}% success rate`,
        adherenceScore: successRate,
        effectivenessScore: isSuccessful ? 100 : Math.max(0, successRate - 20)
      });

      this.activeExecutions.delete(executionId);

      console.log(`✅ Completed runbook execution ${executionId} with ${successRate.toFixed(1)}% success rate`);

    } catch (error) {
      console.error('Failed to complete runbook execution:', error);
    }
  }

  /**
   * Initiate escalation
   */
  private async initiateEscalation(treeId: string, executionId: string, runbook: IncidentRunbook): Promise<void> {
    const escalationFlow = this.escalationFlows.get(treeId);
    if (!escalationFlow) {
      console.log(`⚠️ Escalation tree ${treeId} not found`);
      return;
    }

    console.log(`📞 Initiating escalation for execution ${executionId} using tree ${treeId}`);

    // Start with first escalation level
    await this.executeEscalationStep(escalationFlow, 0, executionId, runbook);
  }

  /**
   * Execute escalation step
   */
  private async executeEscalationStep(
    escalationFlow: EscalationFlow,
    level: number,
    executionId: string,
    runbook: IncidentRunbook
  ): Promise<void> {
    const step = escalationFlow.steps[level];
    if (!step) {
      return;
    }

    console.log(`📞 Executing escalation level ${level + 1} for execution ${executionId}`);

    // Send notifications to contacts at this level
    for (const contactId of step.contacts) {
      const availability = this.contactAvailability.get(contactId);
      if (availability) {
        await this.notifyContact(contactId, escalationFlow, executionId, runbook, step.channels);
      }
    }

    // Schedule next escalation level if auto-escalation is enabled
    if (escalationFlow.autoEscalationEnabled && level < escalationFlow.maxEscalationLevel - 1) {
      setTimeout(() => {
        this.executeEscalationStep(escalationFlow, level + 1, executionId, runbook);
      }, step.delayMinutes * 60 * 1000);
    }
  }

  /**
   * Notify contact
   */
  private async notifyContact(
    contactId: string,
    escalationFlow: EscalationFlow,
    executionId: string,
    runbook: IncidentRunbook,
    channels: string[]
  ): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const contact = await storage.getRunbookContact(contactId);
      
      if (!contact) {
        return;
      }

      const message = `INCIDENT ALERT: Runbook "${runbook.title}" execution ${executionId} is in progress. Your immediate attention is required. Incident Type: ${runbook.incidentType}, Severity: ${runbook.severity}`;

      for (const channel of channels) {
        switch (channel) {
          case 'email':
            if (contact.primaryEmail) {
              await this.sendEscalationEmail(contact, message, executionId, runbook);
            }
            break;
          case 'sms':
            if (contact.smsNumber) {
              await this.sendEscalationSms(contact, message, executionId);
            }
            break;
          case 'phone':
            // Phone call would be implemented here
            console.log(`📞 Would place phone call to ${contact.name} at ${contact.primaryPhone}`);
            break;
        }
      }

      // Update last contacted time
      await storage.updateContactLastContacted(contactId);

    } catch (error) {
      console.error(`Failed to notify contact ${contactId}:`, error);
    }
  }

  /**
   * Send escalation email
   */
  private async sendEscalationEmail(
    contact: RunbookContact,
    message: string,
    executionId: string,
    runbook: IncidentRunbook
  ): Promise<void> {
    await notificationQueueService.queueNotification({
      type: 'email',
      priority: 'high',
      recipient: contact.primaryEmail!,
      content: {
        subject: `URGENT: Incident Response Required - ${runbook.title}`,
        message,
        html: this.formatEscalationEmailHtml(contact, message, executionId, runbook)
      },
      metadata: {
        contactId: contact.contactId,
        executionId,
        escalationType: 'runbook_execution'
      }
    });
  }

  /**
   * Send escalation SMS
   */
  private async sendEscalationSms(
    contact: RunbookContact,
    message: string,
    executionId: string
  ): Promise<void> {
    await notificationQueueService.queueNotification({
      type: 'sms',
      priority: 'high',
      recipient: contact.smsNumber!,
      content: {
        message: message.substring(0, 160) // SMS length limit
      },
      metadata: {
        contactId: contact.contactId,
        executionId,
        escalationType: 'runbook_execution'
      }
    });
  }

  /**
   * Helper methods
   */
  private parseEscalationSteps(escalationSteps: any): EscalationStep[] {
    // Parse JSON escalation steps into typed structure
    if (!escalationSteps) return [];
    
    try {
      const steps = Array.isArray(escalationSteps) ? escalationSteps : JSON.parse(escalationSteps);
      return steps.map((step: any, index: number) => ({
        level: step.level || index + 1,
        contacts: step.contacts || [],
        channels: step.channels || ['email'],
        delayMinutes: step.delayMinutes || 30,
        condition: step.condition,
        allowBypass: step.allowBypass || false
      }));
    } catch (error) {
      console.error('Failed to parse escalation steps:', error);
      return [];
    }
  }

  private isInBusinessHours(date: Date, businessHours: any, timezone: string): boolean {
    // Simplified business hours check
    const hour = date.getHours();
    return hour >= 9 && hour < 17; // 9 AM to 5 PM
  }

  private parseBusinessHours(businessHours: any): { start: string; end: string; days: string[] } {
    return {
      start: '09:00',
      end: '17:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    };
  }

  private parseOnCallSchedule(onCallSchedule: any): { start: Date; end: Date; level: 'primary' | 'secondary' | 'backup' } | undefined {
    // Parse on-call schedule from JSON
    return undefined; // Simplified implementation
  }

  private async updateAllContactAvailability(): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const contacts = await storage.getRunbookContacts();
      
      for (const contact of contacts) {
        await this.updateContactAvailability(contact.contactId);
      }
    } catch (error) {
      console.error('Failed to update all contact availability:', error);
    }
  }

  private async notifyReviewers(runbookId: string, workflow: RunbookApprovalWorkflow): Promise<void> {
    // Send notifications to reviewers
    for (const reviewer of workflow.reviewers) {
      await notificationQueueService.queueNotification({
        type: 'email',
        priority: 'normal',
        recipient: `${reviewer}@electiontracker.app`,
        content: {
          subject: `Runbook Review Required: ${runbookId}`,
          message: `A runbook has been submitted for review and requires your approval.`
        },
        metadata: {
          runbookId,
          workflowType: 'approval_request'
        }
      });
    }
  }

  private async publishRunbook(runbookId: string): Promise<void> {
    try {
      const { storage } = await import('../storage');
      await storage.updateIncidentRunbook(runbookId, {
        status: 'published',
        approvedAt: new Date()
      });

      const workflow = this.approvalWorkflows.get(runbookId);
      if (workflow) {
        workflow.status = 'published';
        workflow.approvalHistory.push({
          action: 'publish',
          user: 'system',
          timestamp: new Date(),
          comments: 'Runbook published after approval'
        });
      }

      console.log(`📚 Published runbook ${runbookId}`);

    } catch (error) {
      console.error(`Failed to publish runbook:`, error);
    }
  }

  private formatEscalationEmailHtml(
    contact: RunbookContact,
    message: string,
    executionId: string,
    runbook: IncidentRunbook
  ): string {
    return `
      <h2>🚨 URGENT: Incident Response Required</h2>
      <p>Hello ${contact.name},</p>
      <p><strong>Runbook:</strong> ${runbook.title}</p>
      <p><strong>Execution ID:</strong> ${executionId}</p>
      <p><strong>Incident Type:</strong> ${runbook.incidentType}</p>
      <p><strong>Severity:</strong> <span style="color: red">${runbook.severity.toUpperCase()}</span></p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
      <hr>
      <p><small>Contact ID: ${contact.contactId} | Escalation Level: ${contact.escalationLevel}</small></p>
      <p><small>This is an automated notification from the Incident Response System.</small></p>
    `;
  }
}

// Export singleton instance
export const runbookManagementService = new RunbookManagementService();