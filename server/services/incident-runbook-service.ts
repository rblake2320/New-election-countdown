import { nanoid } from 'nanoid';
import type { IStorage } from '../storage';
import type {
  IncidentRunbook,
  RunbookStep,
  RunbookContact,
  ContactEscalationTree,
  RunbookExecution,
  InsertIncidentRunbook,
  InsertRunbookContact,
  InsertContactEscalationTree
} from '@shared/schema';

/**
 * Incident Runbook Service (Track 4) — runbook execution with contact escalation.
 *
 * Honest execution model (strict tranche 2): there is no step executor, validator or
 * telephony behind this service, so nothing here simulates a step or reports a result it
 * did not obtain.
 *  - manual / automated / validation steps stop the execution as `awaiting_operator`;
 *    the operator completes them and calls resume, which records who confirmed and continues.
 *  - notification and escalation steps queue real deliveries through the notification
 *    queue (notification_deliveries rows; SendGrid/Twilio send them when configured) and
 *    record exactly what was queued, and for whom no channel existed.
 *  - every outcome is persisted on runbook_executions in the columns that exist
 *    (step_results, current_step, completed/skipped/failed_steps, contacts_notified,
 *    escalation_tree_used, is_successful, success_rate, duration, execution_notes, metadata).
 */

export interface IncidentContext {
  incidentId: string;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedSystems: string[];
  detectedAt: Date;
  reportedBy: string;
  environment: string;
  metadata?: Record<string, unknown>;
}

export type ExecutionStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
export type StepOutcome = 'completed' | 'failed' | 'skipped' | 'awaiting_operator';

export interface StepExecutionResult {
  stepId: number;
  stepKey: string;
  title: string;
  stepType: string;
  status: StepOutcome;
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
  executedBy: string;
  detail: Record<string, unknown>;
  error?: string;
}

export interface RunbookExecutionContext {
  executionId: string;
  runbookId: number;
  runbookKey: string;
  incidentContext: IncidentContext;
  executedBy: string;
  escalationLevel: number;
  currentStepIndex: number;
  startTime: Date;
  status: ExecutionStatus;
  steps: RunbookStep[];
  results: StepExecutionResult[];
  contactsNotified: string[];
  escalationTreeUsed?: string;
}

export interface ContactNotification {
  contactId: string;
  name: string;
  channel: 'email' | 'sms' | 'none';
  status: 'queued' | 'no_channel' | 'failed';
  deliveryId?: string;
  error?: string;
}

export interface EscalationResult {
  escalated: boolean;
  escalationLevel: number;
  contactsNotified: ContactNotification[];
  nextEscalationTime?: Date;
  reason: string;
}

/** What the notification queue needs from us; the real queue service satisfies it. */
export interface QueuedDelivery {
  type: 'email' | 'sms';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recipient: string;
  content: { subject?: string; message: string };
  metadata: Record<string, never>;
  maxRetries: number;
  scheduledAt: Date;
}
export type NotificationQueue = (delivery: QueuedDelivery) => Promise<string>;

export interface IncidentRunbookServiceOptions {
  /** Defaults to the database-backed notification queue. Tests inject a recorder. */
  queue?: NotificationQueue;
  /** Defaults to setTimeout; tests inject a recorder so no timers hang. */
  schedule?: (fn: () => void, ms: number) => NodeJS.Timeout;
}

class ServiceError extends Error {
  constructor(message: string, readonly status: number, readonly publicCode: string) {
    super(message);
    this.publicMessage = message;
  }
  readonly publicMessage: string;
}

const OPERATOR_STEP_TYPES = new Set(['manual', 'automated', 'validation']);

export class IncidentRunbookService {
  private storage: IStorage;
  private activeExecutions = new Map<string, RunbookExecutionContext>();
  private escalationTimers = new Map<string, NodeJS.Timeout>();
  private readonly queue: NotificationQueue;
  private readonly schedule: (fn: () => void, ms: number) => NodeJS.Timeout;

  constructor(storage: IStorage, options: IncidentRunbookServiceOptions = {}) {
    this.storage = storage;
    this.queue = options.queue ?? (async (delivery) => {
      const { notificationQueueService } = await import('./notification-queue-service');
      return notificationQueueService.queueNotification(delivery);
    });
    this.schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  }

  // ---------------------------------------------------------------- runbooks / contacts

  async createRunbook(runbook: InsertIncidentRunbook): Promise<IncidentRunbook> {
    this.validateRunbook(runbook);
    const created = await this.storage.createIncidentRunbook(runbook);
    console.log(`[RunbookService] Created runbook ${created.runbookId}: ${created.title} (${created.incidentType}/${created.severity})`);
    return created;
  }

  async createContact(contact: InsertRunbookContact): Promise<RunbookContact> {
    this.validateContact(contact);
    const created = await this.storage.createRunbookContact(contact);
    console.log(`[RunbookService] Created contact ${created.contactId}: ${created.name} (level ${created.escalationLevel})`);
    return created;
  }

  async createEscalationTree(tree: InsertContactEscalationTree): Promise<ContactEscalationTree> {
    this.validateEscalationTree(tree);
    const created = await this.storage.createContactEscalationTree(tree);
    console.log(`[RunbookService] Created escalation tree ${created.treeId}: ${created.name} for ${(created.incidentTypes ?? []).join(', ')}`);
    return created;
  }

  async getRunbooksByIncidentType(incidentType: string): Promise<IncidentRunbook[]> {
    return this.storage.getRunbooksByIncidentType(incidentType);
  }

  async getActiveExecutions(): Promise<RunbookExecution[]> {
    return this.storage.getActiveRunbookExecutions();
  }

  async getExecutionStatus(executionId: string): Promise<RunbookExecution | undefined> {
    return this.storage.getRunbookExecution(executionId);
  }

  /** In-memory view of an execution this process is driving (undefined after completion). */
  getExecutionContext(executionId: string): RunbookExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  // ---------------------------------------------------------------- execution

  async executeRunbookForIncident(
    incidentContext: IncidentContext,
    executedBy: string,
    runbookId?: string
  ): Promise<RunbookExecutionContext> {
    console.log(`[RunbookService] Executing runbook for incident ${incidentContext.incidentId}: ${incidentContext.incidentType} (${incidentContext.severity})`);

    let runbook: IncidentRunbook | undefined;
    if (runbookId) {
      runbook = await this.storage.getIncidentRunbook(runbookId);
    } else {
      const candidates = await this.storage.getRunbooksByIncidentType(incidentContext.incidentType);
      runbook = candidates.find((r) =>
        r.severity === incidentContext.severity ||
        (r.severity === 'high' && incidentContext.severity === 'critical')
      );
    }
    if (!runbook) {
      throw new ServiceError(
        `No suitable runbook found for incident type ${incidentContext.incidentType}, severity ${incidentContext.severity}`,
        404, 'runbook_not_found'
      );
    }

    const steps = await this.storage.getRunbookStepsByOrder(runbook.runbookId);
    const executionId = nanoid();
    const context: RunbookExecutionContext = {
      executionId,
      runbookId: runbook.id,
      runbookKey: runbook.runbookId,
      incidentContext,
      executedBy,
      escalationLevel: 1,
      currentStepIndex: 0,
      startTime: new Date(),
      status: 'in_progress',
      steps,
      results: [],
      contactsNotified: [],
    };
    this.activeExecutions.set(executionId, context);

    await this.storage.createRunbookExecution({
      executionId,
      runbookId: runbook.id,
      incidentId: incidentContext.incidentId,
      executionType: incidentContext.severity === 'critical' || incidentContext.severity === 'high' ? 'emergency' : 'planned',
      triggerReason: incidentContext.description,
      status: 'in_progress',
      executedBy,
      currentStep: steps[0]?.stepId ?? null,
      stepResults: [],
      contactsNotified: [],
      metadata: {
        incidentContext: { ...incidentContext, detectedAt: incidentContext.detectedAt.toISOString() },
        runbookKey: runbook.runbookId,
        runbookTitle: runbook.title,
        escalationLevel: 1,
        escalations: [],
      },
    });

    console.log(`[RunbookService] Started execution ${executionId} of ${runbook.runbookId} (${steps.length} steps)`);
    // Steps run after the caller gets the context; failures land on the execution row.
    void this.runSteps(context).catch(async (error) => {
      console.error(`[RunbookService] Execution ${executionId} errored:`, error);
      await this.failExecution(context, error instanceof Error ? error.message : String(error)).catch(() => undefined);
    });
    return context;
  }

  /** Drive steps from the context's current index until one needs an operator, fails critically, or all are done. */
  private async runSteps(context: RunbookExecutionContext): Promise<void> {
    if (context.steps.length === 0) {
      await this.completeExecution(context, 'Runbook has no steps');
      return;
    }
    for (let i = context.currentStepIndex; i < context.steps.length; i++) {
      if (context.status !== 'in_progress') return; // paused or terminated by another call
      context.currentStepIndex = i;
      const step = context.steps[i];
      const result = await this.executeStep(step, context);
      context.results = [...context.results.filter((r) => r.stepId !== step.id), result];
      await this.persistProgress(context, step);

      if (result.status === 'awaiting_operator') {
        await this.pauseExecution(context.executionId, `Step ${step.stepOrder} "${step.title}" (${step.stepType}) requires an operator`);
        return;
      }
      if (result.status === 'failed' && step.isCritical) {
        await this.escalateIncident(context, `Critical step failed: ${step.title}`);
        await this.failExecution(context, `Critical step failed: ${step.title}: ${result.error ?? 'unknown error'}`);
        return;
      }
    }
    const failed = context.results.filter((r) => r.status === 'failed').length;
    await this.completeExecution(context, failed === 0 ? 'All steps completed' : `Completed with ${failed} non-critical step failure(s)`);
  }

  private async executeStep(step: RunbookStep, context: RunbookExecutionContext): Promise<StepExecutionResult> {
    const startedAt = new Date();
    const result: StepExecutionResult = {
      stepId: step.id,
      stepKey: step.stepId,
      title: step.title,
      stepType: step.stepType,
      status: 'awaiting_operator',
      startedAt,
      executedBy: context.executedBy,
      detail: {},
    };
    try {
      if (OPERATOR_STEP_TYPES.has(step.stepType)) {
        // No executor / validator exists: the operator performs the step and resumes.
        result.status = 'awaiting_operator';
        result.detail = {
          instructions: step.instructions ?? step.description ?? null,
          command: step.command ?? null,
          expectedOutput: step.expectedOutput ?? null,
          validationChecks: step.validationChecks ?? null,
          successCriteria: step.successCriteria ?? null,
          reason: step.stepType === 'automated'
            ? 'No automation executor is configured; run the command manually and resume'
            : step.stepType === 'validation'
              ? 'No validator is configured; perform the checks and resume'
              : 'Manual step',
        };
        return result;
      }
      if (step.stepType === 'notification') {
        const notifications = await this.notifyLevel(context, context.escalationLevel,
          `Incident ${context.incidentContext.incidentId}: step ${step.stepOrder} ${step.title}`,
          this.formatIncidentNotification(step, context));
        result.status = notifications.some((n) => n.status === 'queued') || notifications.length === 0 ? 'completed' : 'failed';
        result.detail = { notifications };
        if (result.status === 'failed') result.error = 'No notification could be queued';
        return result;
      }
      if (step.stepType === 'escalation') {
        const escalation = await this.escalateIncident(context, `Escalation step: ${step.title}`);
        result.status = escalation.escalated ? 'completed' : 'skipped';
        result.detail = { escalation };
        if (!escalation.escalated) result.error = escalation.reason;
        return result;
      }
      throw new Error(`Unknown step type: ${step.stepType}`);
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    } finally {
      result.endedAt = new Date();
      result.durationMs = result.endedAt.getTime() - startedAt.getTime();
    }
  }

  private async persistProgress(context: RunbookExecutionContext, step?: RunbookStep): Promise<void> {
    const byStatus = (s: StepOutcome) => context.results.filter((r) => r.status === s).map((r) => r.stepKey);
    await this.storage.updateRunbookExecution(context.executionId, {
      status: context.status,
      currentStep: step?.stepId ?? null,
      stepResults: context.results,
      completedSteps: byStatus('completed'),
      skippedSteps: byStatus('skipped'),
      failedSteps: byStatus('failed'),
      contactsNotified: context.contactsNotified,
      escalationTreeUsed: context.escalationTreeUsed ?? null,
    });
  }

  private async mergeMetadata(executionId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const existing = await this.storage.getRunbookExecution(executionId);
    const current = (existing?.metadata && typeof existing.metadata === 'object') ? (existing.metadata as Record<string, unknown>) : {};
    return { ...current, ...patch };
  }

  async pauseExecution(executionId: string, reason: string): Promise<void> {
    const context = this.requireActive(executionId);
    await this.storage.updateRunbookExecution(executionId, {
      status: 'paused',
      metadata: await this.mergeMetadata(executionId, { pausedAt: new Date().toISOString(), pauseReason: reason }),
    });
    context.status = 'paused'; // after the row: a paused context always has a paused row
    console.log(`[RunbookService] Paused execution ${executionId}: ${reason}`);
  }

  /**
   * The operator confirms the step that was waiting (recorded as completed by them) and
   * execution continues with the next step.
   */
  async resumeExecution(executionId: string, confirmedBy?: string): Promise<void> {
    const context = this.requireActive(executionId);
    if (context.status !== 'paused') {
      throw new ServiceError(`Execution ${executionId} is ${context.status}, not paused`, 409, 'execution_not_paused');
    }
    const waiting = context.results.find((r) => r.status === 'awaiting_operator');
    if (waiting) {
      waiting.status = 'completed';
      waiting.endedAt = new Date();
      waiting.durationMs = waiting.endedAt.getTime() - waiting.startedAt.getTime();
      waiting.detail = { ...waiting.detail, confirmedBy: confirmedBy ?? context.executedBy, confirmedAt: waiting.endedAt.toISOString() };
      context.currentStepIndex = Math.min(context.currentStepIndex + 1, context.steps.length);
    }
    context.status = 'in_progress';
    await this.storage.updateRunbookExecution(executionId, {
      status: 'in_progress',
      stepResults: context.results,
      metadata: await this.mergeMetadata(executionId, { resumedAt: new Date().toISOString(), resumedBy: confirmedBy ?? context.executedBy }),
    });
    console.log(`[RunbookService] Resumed execution ${executionId}`);
    await this.runSteps(context);
  }

  private async completeExecution(context: RunbookExecutionContext, reason: string): Promise<void> {
    const completedAt = new Date();
    const total = context.results.length;
    const completed = context.results.filter((r) => r.status === 'completed').length;
    const failed = context.results.filter((r) => r.status === 'failed').length;
    await this.storage.updateRunbookExecution(context.executionId, {
      status: 'completed',
      completedAt,
      duration: Math.round((completedAt.getTime() - context.startTime.getTime()) / 60000),
      currentStep: null,
      stepResults: context.results,
      completedSteps: context.results.filter((r) => r.status === 'completed').map((r) => r.stepKey),
      skippedSteps: context.results.filter((r) => r.status === 'skipped').map((r) => r.stepKey),
      failedSteps: context.results.filter((r) => r.status === 'failed').map((r) => r.stepKey),
      isSuccessful: failed === 0,
      successRate: total === 0 ? '100.00' : ((completed / total) * 100).toFixed(2),
      executionNotes: reason,
      contactsNotified: context.contactsNotified,
      escalationTreeUsed: context.escalationTreeUsed ?? null,
    });
    context.status = 'completed';
    console.log(`[RunbookService] Completed execution ${context.executionId}: ${reason}`);
    this.cleanupExecution(context.executionId);
  }

  private async failExecution(context: RunbookExecutionContext, reason: string): Promise<void> {
    const completedAt = new Date();
    await this.storage.updateRunbookExecution(context.executionId, {
      status: 'failed',
      completedAt,
      duration: Math.round((completedAt.getTime() - context.startTime.getTime()) / 60000),
      stepResults: context.results,
      failedSteps: context.results.filter((r) => r.status === 'failed').map((r) => r.stepKey),
      isSuccessful: false,
      executionNotes: reason,
      contactsNotified: context.contactsNotified,
      escalationTreeUsed: context.escalationTreeUsed ?? null,
    });
    context.status = 'failed';
    console.log(`[RunbookService] Failed execution ${context.executionId}: ${reason}`);
    this.cleanupExecution(context.executionId);
  }

  // ---------------------------------------------------------------- escalation / contacts

  private async escalateIncident(context: RunbookExecutionContext, reason: string): Promise<EscalationResult> {
    const tree = await this.storage.getEscalationTreeByIncidentType(
      context.incidentContext.incidentType,
      context.incidentContext.severity
    );
    if (!tree) {
      console.warn(`[RunbookService] No escalation tree for ${context.incidentContext.incidentType}/${context.incidentContext.severity}`);
      return { escalated: false, escalationLevel: context.escalationLevel, contactsNotified: [], reason: 'No escalation tree configured' };
    }
    const maxLevel = tree.maxEscalationLevel ?? Number.MAX_SAFE_INTEGER;
    if (context.escalationLevel >= maxLevel) {
      return { escalated: false, escalationLevel: context.escalationLevel, contactsNotified: [], reason: `Already at the tree's maximum escalation level (${maxLevel})` };
    }
    context.escalationLevel += 1;
    context.escalationTreeUsed = tree.treeId;
    console.log(`[RunbookService] Escalating ${context.incidentContext.incidentId} to level ${context.escalationLevel}: ${reason}`);

    const contactsNotified = await this.notifyLevel(context, context.escalationLevel,
      `ESCALATION level ${context.escalationLevel}: incident ${context.incidentContext.incidentId}`,
      this.formatEscalationNotification(context, reason));

    const escalations = ((await this.mergeMetadata(context.executionId, {})).escalations as unknown[] | undefined) ?? [];
    await this.storage.updateRunbookExecution(context.executionId, {
      contactsNotified: context.contactsNotified,
      escalationTreeUsed: tree.treeId,
      metadata: await this.mergeMetadata(context.executionId, {
        escalationLevel: context.escalationLevel,
        escalations: [...escalations, { level: context.escalationLevel, reason, at: new Date().toISOString(), contacts: contactsNotified }],
      }),
    });

    const nextEscalationTime = this.scheduleNextEscalation(context, tree);
    return { escalated: true, escalationLevel: context.escalationLevel, contactsNotified, nextEscalationTime, reason };
  }

  /** Queue a delivery for every active contact at the level; record who could not be reached. */
  private async notifyLevel(context: RunbookExecutionContext, level: number, subject: string, message: string): Promise<ContactNotification[]> {
    const contacts = await this.storage.getContactsByEscalationLevel(level);
    const out: ContactNotification[] = [];
    for (const contact of contacts) {
      const target = this.selectChannel(contact);
      if (!target) {
        out.push({ contactId: contact.contactId, name: contact.name, channel: 'none', status: 'no_channel', error: 'Contact has no email or SMS number on file' });
        continue;
      }
      try {
        const deliveryId = await this.queue({
          type: target.channel,
          priority: context.incidentContext.severity === 'critical' ? 'urgent' : context.incidentContext.severity === 'high' ? 'high' : 'normal',
          recipient: target.recipient,
          content: { subject, message },
          metadata: {},
          maxRetries: 3,
          scheduledAt: new Date(),
        });
        await this.storage.updateContactLastContacted(contact.contactId);
        if (!context.contactsNotified.includes(contact.contactId)) context.contactsNotified.push(contact.contactId);
        out.push({ contactId: contact.contactId, name: contact.name, channel: target.channel, status: 'queued', deliveryId });
      } catch (error) {
        out.push({ contactId: contact.contactId, name: contact.name, channel: target.channel, status: 'failed', error: error instanceof Error ? error.message : String(error) });
      }
    }
    return out;
  }

  /** The queue delivers email and SMS; a phone-only or Slack-only contact has no channel here. */
  private selectChannel(contact: RunbookContact): { channel: 'email' | 'sms'; recipient: string } | null {
    const preferSms = contact.preferredContactMethod === 'sms';
    if (preferSms && contact.smsNumber) return { channel: 'sms', recipient: contact.smsNumber };
    if (contact.primaryEmail) return { channel: 'email', recipient: contact.primaryEmail };
    if (contact.smsNumber) return { channel: 'sms', recipient: contact.smsNumber };
    if (contact.secondaryEmail) return { channel: 'email', recipient: contact.secondaryEmail };
    return null;
  }

  private scheduleNextEscalation(context: RunbookExecutionContext, tree: ContactEscalationTree): Date | undefined {
    if (!tree.autoEscalationEnabled || !tree.escalationIntervalMinutes || tree.escalationIntervalMinutes <= 0) return undefined;
    if (tree.maxEscalationLevel != null && context.escalationLevel >= tree.maxEscalationLevel) return undefined;
    const ms = tree.escalationIntervalMinutes * 60 * 1000;
    const existing = this.escalationTimers.get(context.executionId);
    if (existing) clearTimeout(existing);
    const timer = this.schedule(() => {
      if (!this.activeExecutions.has(context.executionId)) return;
      void this.escalateIncident(context, 'Automatic escalation: interval elapsed without resolution').catch((error) => {
        console.error(`[RunbookService] Automatic escalation failed for ${context.executionId}:`, error);
      });
    }, ms);
    this.escalationTimers.set(context.executionId, timer);
    return new Date(Date.now() + ms);
  }

  private formatIncidentNotification(step: RunbookStep, context: RunbookExecutionContext): string {
    const { incidentContext } = context;
    return [
      'INCIDENT NOTIFICATION',
      '',
      `Incident ID: ${incidentContext.incidentId}`,
      `Type: ${incidentContext.incidentType}`,
      `Severity: ${incidentContext.severity.toUpperCase()}`,
      `Environment: ${incidentContext.environment}`,
      '',
      `Description: ${incidentContext.description}`,
      '',
      `Current step: ${step.stepOrder}. ${step.title}`,
      `Execution ID: ${context.executionId}`,
    ].join('\n');
  }

  private formatEscalationNotification(context: RunbookExecutionContext, reason: string): string {
    const { incidentContext } = context;
    return [
      `INCIDENT ESCALATION - LEVEL ${context.escalationLevel}`,
      '',
      `Incident ID: ${incidentContext.incidentId}`,
      `Type: ${incidentContext.incidentType}`,
      `Severity: ${incidentContext.severity.toUpperCase()}`,
      `Environment: ${incidentContext.environment}`,
      '',
      `Escalation reason: ${reason}`,
      `Description: ${incidentContext.description}`,
      '',
      `Execution ID: ${context.executionId}`,
      `Started: ${context.startTime.toISOString()}`,
    ].join('\n');
  }

  // ---------------------------------------------------------------- validation / lifecycle

  private requireActive(executionId: string): RunbookExecutionContext {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new ServiceError(`Execution ${executionId} is not active in this process`, 404, 'execution_not_active');
    }
    return context;
  }

  private validateRunbook(runbook: InsertIncidentRunbook): void {
    if (!runbook.title || runbook.title.trim().length === 0) throw new ServiceError('Runbook title is required', 400, 'invalid_runbook');
    if (!runbook.incidentType) throw new ServiceError('Incident type is required', 400, 'invalid_runbook');
    if (!runbook.severity) throw new ServiceError('Severity is required', 400, 'invalid_runbook');
  }

  private validateContact(contact: InsertRunbookContact): void {
    if (!contact.name || contact.name.trim().length === 0) throw new ServiceError('Contact name is required', 400, 'invalid_contact');
    if (typeof contact.escalationLevel !== 'number' || contact.escalationLevel < 1) throw new ServiceError('Valid escalation level is required', 400, 'invalid_contact');
    if (!contact.primaryEmail && !contact.secondaryEmail && !contact.smsNumber) {
      throw new ServiceError('Contact needs an email address or SMS number to be reachable', 400, 'invalid_contact');
    }
  }

  private validateEscalationTree(tree: InsertContactEscalationTree): void {
    if (!tree.name || tree.name.trim().length === 0) throw new ServiceError('Tree name is required', 400, 'invalid_escalation_tree');
    if (!tree.incidentTypes || tree.incidentTypes.length === 0) throw new ServiceError('At least one incident type is required', 400, 'invalid_escalation_tree');
    if (!tree.severityLevels || tree.severityLevels.length === 0) throw new ServiceError('At least one severity level is required', 400, 'invalid_escalation_tree');
  }

  private cleanupExecution(executionId: string): void {
    this.activeExecutions.delete(executionId);
    const timer = this.escalationTimers.get(executionId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(executionId);
    }
  }

  destroy(): void {
    for (const timer of this.escalationTimers.values()) clearTimeout(timer);
    this.escalationTimers.clear();
    this.activeExecutions.clear();
  }
}
