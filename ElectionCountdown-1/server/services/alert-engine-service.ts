import { 
  NotificationEvent, 
  InsertNotificationEvent,
  NotificationSubscription,
  NotificationPreferences,
  Election,
  Candidate,
  ElectionResult
} from '@shared/schema';
import { notificationQueueService } from './notification-queue-service';
import { notificationPreferencesService } from './notification-preferences-service';

export interface AlertTrigger {
  id: string;
  name: string;
  description: string;
  eventType: string;
  conditions: AlertCondition[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  cooldownMinutes: number; // Prevent spam
  isActive: boolean;
}

export interface AlertCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'changed' | 'not_null';
  value: any;
  previous?: any; // For change detection
}

export interface EventContext {
  election?: Election;
  candidate?: Candidate;
  result?: ElectionResult;
  metadata?: Record<string, any>;
  timestamp: Date;
  source: string;
}

export interface AlertEvaluation {
  triggered: boolean;
  trigger: AlertTrigger;
  context: EventContext;
  affectedUsers: string[];
  message: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
}

export class AlertEngineService {
  private triggers: Map<string, AlertTrigger> = new Map();
  private eventHistory: Map<string, any[]> = new Map();
  private cooldownTracker: Map<string, Date> = new Map();
  private isProcessing = false;

  constructor() {
    this.initializeDefaultTriggers();
    this.startEventProcessor();
    console.log('✅ Alert Engine Service initialized');
  }

  /**
   * Initialize default alert triggers
   */
  private initializeDefaultTriggers() {
    const defaultTriggers: AlertTrigger[] = [
      {
        id: 'election_result_available',
        name: 'Election Results Available',
        description: 'Triggered when election results are published',
        eventType: 'election_result',
        conditions: [
          { field: 'status', operator: 'equals', value: 'results_available' },
          { field: 'results_count', operator: 'greater_than', value: 0 }
        ],
        priority: 'high',
        cooldownMinutes: 5,
        isActive: true
      },
      {
        id: 'election_result_final',
        name: 'Final Election Results',
        description: 'Triggered when election results are finalized',
        eventType: 'election_result',
        conditions: [
          { field: 'status', operator: 'equals', value: 'final' }
        ],
        priority: 'urgent',
        cooldownMinutes: 0,
        isActive: true
      },
      {
        id: 'candidate_major_update',
        name: 'Major Candidate Update',
        description: 'Triggered for significant candidate news',
        eventType: 'candidate_update',
        conditions: [
          { field: 'update_type', operator: 'equals', value: 'major' },
          { field: 'importance', operator: 'greater_than', value: 7 }
        ],
        priority: 'high',
        cooldownMinutes: 30,
        isActive: true
      },
      {
        id: 'breaking_news_urgent',
        name: 'Breaking News Alert',
        description: 'Triggered for urgent breaking news',
        eventType: 'breaking_news',
        conditions: [
          { field: 'urgency', operator: 'equals', value: 'urgent' },
          { field: 'verified', operator: 'equals', value: true }
        ],
        priority: 'urgent',
        cooldownMinutes: 15,
        isActive: true
      },
      {
        id: 'registration_deadline_7days',
        name: 'Registration Deadline - 7 Days',
        description: 'Triggered 7 days before registration deadline',
        eventType: 'deadline_reminder',
        conditions: [
          { field: 'deadline_type', operator: 'equals', value: 'registration' },
          { field: 'days_until', operator: 'equals', value: 7 }
        ],
        priority: 'normal',
        cooldownMinutes: 1440, // 24 hours
        isActive: true
      },
      {
        id: 'registration_deadline_1day',
        name: 'Registration Deadline - 1 Day',
        description: 'Triggered 1 day before registration deadline',
        eventType: 'deadline_reminder',
        conditions: [
          { field: 'deadline_type', operator: 'equals', value: 'registration' },
          { field: 'days_until', operator: 'equals', value: 1 }
        ],
        priority: 'high',
        cooldownMinutes: 360, // 6 hours
        isActive: true
      },
      {
        id: 'early_voting_starts',
        name: 'Early Voting Begins',
        description: 'Triggered when early voting starts',
        eventType: 'deadline_reminder',
        conditions: [
          { field: 'deadline_type', operator: 'equals', value: 'early_voting_start' },
          { field: 'days_until', operator: 'equals', value: 0 }
        ],
        priority: 'normal',
        cooldownMinutes: 0,
        isActive: true
      },
      {
        id: 'election_day_reminder',
        name: 'Election Day Reminder',
        description: 'Triggered on election day',
        eventType: 'deadline_reminder',
        conditions: [
          { field: 'deadline_type', operator: 'equals', value: 'election_day' },
          { field: 'days_until', operator: 'equals', value: 0 }
        ],
        priority: 'high',
        cooldownMinutes: 0,
        isActive: true
      },
      {
        id: 'poll_closing_soon',
        name: 'Polls Closing Soon',
        description: 'Triggered 2 hours before polls close',
        eventType: 'deadline_reminder',
        conditions: [
          { field: 'deadline_type', operator: 'equals', value: 'poll_closing' },
          { field: 'hours_until', operator: 'equals', value: 2 }
        ],
        priority: 'urgent',
        cooldownMinutes: 0,
        isActive: true
      }
    ];

    defaultTriggers.forEach(trigger => {
      this.triggers.set(trigger.id, trigger);
    });

    console.log(`📋 Loaded ${defaultTriggers.length} default alert triggers`);
  }

  /**
   * Process incoming event and evaluate triggers
   */
  async processEvent(
    eventType: string,
    eventData: any,
    context: EventContext
  ): Promise<NotificationEvent> {
    try {
      // Create notification event record
      const event: InsertNotificationEvent = {
        eventType,
        eventData,
        triggerConditions: null,
        relatedElectionId: context.election?.id,
        relatedCandidateId: context.candidate?.id,
        priority: 'normal',
        isProcessed: false,
        source: context.source,
        sourceId: eventData.id?.toString(),
        metadata: context.metadata
      };

      console.log(`🔔 Processing event: ${eventType}`);

      // Store event in history for analysis
      const historyKey = `${eventType}_${context.election?.id || 'global'}`;
      if (!this.eventHistory.has(historyKey)) {
        this.eventHistory.set(historyKey, []);
      }
      this.eventHistory.get(historyKey)!.push({
        ...eventData,
        timestamp: context.timestamp
      });

      // Evaluate all triggers for this event type
      const triggeredAlerts = await this.evaluateTriggers(eventType, eventData, context);

      // Process triggered alerts
      if (triggeredAlerts.length > 0) {
        await this.processTriggeredAlerts(triggeredAlerts);
        
        // Update event priority based on highest triggered alert
        const maxPriority = this.getMaxPriority(triggeredAlerts.map(a => a.urgency));
        event.priority = maxPriority;
        event.isProcessed = true;
      }

      // Return mock event for now (in real implementation, save to database)
      return {
        id: Date.now(),
        ...event,
        processedAt: event.isProcessed ? new Date() : null,
        campaignId: null,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Failed to process event:', error);
      throw new Error('Event processing failed');
    }
  }

  /**
   * Evaluate triggers against event data
   */
  private async evaluateTriggers(
    eventType: string,
    eventData: any,
    context: EventContext
  ): Promise<AlertEvaluation[]> {
    const evaluations: AlertEvaluation[] = [];

    for (const trigger of this.triggers.values()) {
      if (!trigger.isActive || trigger.eventType !== eventType) {
        continue;
      }

      // Check cooldown
      const cooldownKey = `${trigger.id}_${context.election?.id || 'global'}`;
      const lastTriggered = this.cooldownTracker.get(cooldownKey);
      const now = new Date();
      
      if (lastTriggered) {
        const cooldownEnd = new Date(lastTriggered.getTime() + trigger.cooldownMinutes * 60 * 1000);
        if (now < cooldownEnd) {
          continue; // Still in cooldown
        }
      }

      // Evaluate trigger conditions
      const triggered = this.evaluateConditions(trigger.conditions, eventData, context);

      if (triggered) {
        // Get affected users based on event context
        const affectedUsers = await this.getAffectedUsers(trigger, context);
        
        if (affectedUsers.length > 0) {
          evaluations.push({
            triggered: true,
            trigger,
            context,
            affectedUsers,
            message: this.generateAlertMessage(trigger, eventData, context),
            urgency: trigger.priority
          });

          // Set cooldown
          this.cooldownTracker.set(cooldownKey, now);
        }
      }
    }

    return evaluations;
  }

  /**
   * Evaluate individual trigger conditions
   */
  private evaluateConditions(
    conditions: AlertCondition[],
    eventData: any,
    context: EventContext
  ): boolean {
    return conditions.every(condition => {
      const value = this.getValueFromPath(eventData, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return typeof value === 'string' && value.includes(condition.value);
        case 'greater_than':
          return typeof value === 'number' && value > condition.value;
        case 'less_than':
          return typeof value === 'number' && value < condition.value;
        case 'not_null':
          return value != null;
        case 'changed':
          // Compare with previous value if available
          return condition.previous !== undefined && value !== condition.previous;
        default:
          return false;
      }
    });
  }

  /**
   * Get affected users for a trigger
   */
  private async getAffectedUsers(
    trigger: AlertTrigger,
    context: EventContext
  ): Promise<string[]> {
    try {
      // In real implementation, query database for users with matching preferences
      // For now, return mock user IDs
      const mockUsers = ['user1', 'user2', 'user3'];
      
      console.log(`👥 Found ${mockUsers.length} affected users for trigger: ${trigger.name}`);
      return mockUsers;
    } catch (error) {
      console.error('Failed to get affected users:', error);
      return [];
    }
  }

  /**
   * Process triggered alerts by creating notifications
   */
  private async processTriggeredAlerts(evaluations: AlertEvaluation[]): Promise<void> {
    for (const evaluation of evaluations) {
      try {
        // Create notifications for affected users
        const notifications = evaluation.affectedUsers.map(userId => ({
          type: this.getPreferredChannel(evaluation.urgency) as 'email' | 'sms',
          priority: evaluation.urgency,
          recipient: this.getUserContactInfo(userId, evaluation.urgency),
          content: {
            subject: this.generateSubject(evaluation),
            message: evaluation.message,
            html: this.generateHtmlContent(evaluation),
            templateData: {
              trigger: evaluation.trigger.name,
              urgency: evaluation.urgency,
              election: evaluation.context.election?.title,
              candidate: evaluation.context.candidate?.name,
              ...evaluation.context.metadata
            }
          },
          metadata: {
            userId,
            triggerId: evaluation.trigger.id,
            eventType: evaluation.trigger.eventType,
            electionId: evaluation.context.election?.id,
            candidateId: evaluation.context.candidate?.id
          },
          maxRetries: evaluation.urgency === 'urgent' ? 5 : 3,
          scheduledAt: this.calculateDeliveryTime(evaluation.urgency)
        }));

        // Queue notifications
        const queuedIds = await notificationQueueService.queueBulkNotifications(notifications);
        
        console.log(`📤 Queued ${queuedIds.length} notifications for trigger: ${evaluation.trigger.name}`);
      } catch (error) {
        console.error(`Failed to process alert: ${evaluation.trigger.name}`, error);
      }
    }
  }

  /**
   * Generate alert message based on trigger and context
   */
  private generateAlertMessage(
    trigger: AlertTrigger,
    eventData: any,
    context: EventContext
  ): string {
    switch (trigger.eventType) {
      case 'election_result':
        if (trigger.id === 'election_result_final') {
          return `Final results are now available for ${context.election?.title}. Check the latest winner and vote tallies.`;
        }
        return `Preliminary results are available for ${context.election?.title}. Stay tuned for updates as more precincts report.`;
        
      case 'candidate_update':
        return `${context.candidate?.name} has a major update in the ${context.election?.title} race. ${eventData.summary || 'View the latest news and developments.'}`;
        
      case 'breaking_news':
        return `Breaking: ${eventData.headline || 'Important election news'}. ${eventData.summary || 'Get the details on this developing story.'}`;
        
      case 'deadline_reminder':
        if (trigger.id.includes('registration')) {
          const days = eventData.days_until || 0;
          if (days === 0) {
            return `Today is the last day to register to vote for ${context.election?.title}! Don't miss your chance to participate.`;
          }
          return `Only ${days} day${days !== 1 ? 's' : ''} left to register to vote for ${context.election?.title}. Register now to make your voice heard.`;
        } else if (trigger.id === 'early_voting_starts') {
          return `Early voting begins today for ${context.election?.title}! Find your early voting location and cast your ballot.`;
        } else if (trigger.id === 'election_day_reminder') {
          return `Today is Election Day for ${context.election?.title}! Polls are open - go vote and make your voice heard.`;
        } else if (trigger.id === 'poll_closing_soon') {
          return `Polls close in 2 hours for ${context.election?.title}! If you haven't voted yet, head to your polling location now.`;
        }
        return `Important deadline reminder for ${context.election?.title}.`;
        
      default:
        return `New update available for ${context.election?.title || 'election tracking'}.`;
    }
  }

  /**
   * Get preferred notification channel based on urgency
   */
  private getPreferredChannel(urgency: string): string {
    switch (urgency) {
      case 'urgent':
        return 'sms'; // SMS for urgent alerts
      case 'high':
        return Math.random() > 0.7 ? 'sms' : 'email'; // Mostly email, some SMS
      default:
        return 'email'; // Email for normal/low priority
    }
  }

  /**
   * Calculate optimal delivery time based on urgency
   */
  private calculateDeliveryTime(urgency: string): Date {
    const now = new Date();
    
    switch (urgency) {
      case 'urgent':
        return now; // Immediate
      case 'high':
        return new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes
      case 'normal':
        return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      default:
        return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    }
  }

  /**
   * Utility methods
   */
  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getMaxPriority(priorities: string[]): string {
    const order = ['urgent', 'high', 'normal', 'low'];
    for (const priority of order) {
      if (priorities.includes(priority)) {
        return priority;
      }
    }
    return 'normal';
  }

  private generateSubject(evaluation: AlertEvaluation): string {
    const emoji = evaluation.urgency === 'urgent' ? '🚨' : 
                  evaluation.urgency === 'high' ? '📢' : '📊';
    return `${emoji} ${evaluation.trigger.name}: ${evaluation.context.election?.title || 'Election Update'}`;
  }

  private generateHtmlContent(evaluation: AlertEvaluation): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>${evaluation.trigger.name}</h2>
        <p>${evaluation.message}</p>
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
          <strong>Priority:</strong> ${evaluation.urgency.toUpperCase()}<br>
          <strong>Election:</strong> ${evaluation.context.election?.title || 'N/A'}<br>
          <strong>Time:</strong> ${new Date().toLocaleString()}
        </div>
      </div>
    `;
  }

  private getUserContactInfo(userId: string, urgency: string): string {
    // In real implementation, get from user preferences
    return urgency === 'urgent' ? '+15551234567' : 'user@example.com';
  }

  /**
   * Start background event processor
   */
  private startEventProcessor() {
    setInterval(async () => {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      try {
        await this.processScheduledTriggers();
        await this.cleanupOldEvents();
      } catch (error) {
        console.error('Event processor error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 60000); // Every minute
  }

  /**
   * Process scheduled triggers (like deadline reminders)
   */
  private async processScheduledTriggers(): Promise<void> {
    const now = new Date();
    
    // Example: Check for deadline reminders
    // In real implementation, query database for upcoming deadlines
    // and create events for them
  }

  /**
   * Clean up old events from memory
   */
  private async cleanupOldEvents(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [key, events] of this.eventHistory.entries()) {
      const filtered = events.filter(event => 
        new Date(event.timestamp) > cutoff
      );
      this.eventHistory.set(key, filtered);
    }
  }

  /**
   * Add custom trigger
   */
  addTrigger(trigger: AlertTrigger): void {
    this.triggers.set(trigger.id, trigger);
    console.log(`✅ Added custom trigger: ${trigger.name}`);
  }

  /**
   * Remove trigger
   */
  removeTrigger(triggerId: string): boolean {
    const removed = this.triggers.delete(triggerId);
    if (removed) {
      console.log(`❌ Removed trigger: ${triggerId}`);
    }
    return removed;
  }

  /**
   * Get trigger statistics
   */
  getTriggerStats(): any {
    return {
      totalTriggers: this.triggers.size,
      activeTriggers: Array.from(this.triggers.values()).filter(t => t.isActive).length,
      triggersInCooldown: this.cooldownTracker.size,
      eventHistorySize: Array.from(this.eventHistory.values())
        .reduce((sum, events) => sum + events.length, 0)
    };
  }
}

// Export singleton instance
export const alertEngineService = new AlertEngineService();
export default alertEngineService;