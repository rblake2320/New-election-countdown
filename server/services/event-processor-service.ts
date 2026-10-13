import { 
  Election,
  Candidate,
  ElectionResult,
  NotificationEvent,
  NotificationSubscription
} from '@shared/schema';
import { alertEngineService } from './alert-engine-service';

export interface ElectionEventData {
  electionId: number;
  eventType: 'status_change' | 'results_update' | 'deadline_approaching' | 'voting_started' | 'voting_ended';
  newStatus?: string;
  previousStatus?: string;
  results?: any[];
  deadline?: {
    type: 'registration' | 'early_voting_start' | 'early_voting_end' | 'election_day' | 'poll_closing';
    date: Date;
    daysUntil: number;
    hoursUntil?: number;
  };
  metadata?: Record<string, any>;
}

export interface CandidateEventData {
  candidateId: number;
  electionId: number;
  eventType: 'position_change' | 'endorsement' | 'controversy' | 'withdrawal' | 'announcement';
  updateType: 'minor' | 'major' | 'critical';
  importance: number; // 1-10 scale
  headline?: string;
  summary?: string;
  details?: string;
  sourceUrl?: string;
  verified: boolean;
  metadata?: Record<string, any>;
}

export interface BreakingNewsEventData {
  headline: string;
  summary: string;
  details?: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  category: 'election_results' | 'candidate_news' | 'voting_issues' | 'policy_change' | 'other';
  relatedElectionIds?: number[];
  relatedCandidateIds?: number[];
  sourceUrl?: string;
  verified: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface SystemEventData {
  eventType: 'maintenance' | 'feature_update' | 'security_alert' | 'service_disruption';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  affectedServices?: string[];
  estimatedDuration?: number; // minutes
  actionRequired?: boolean;
  metadata?: Record<string, any>;
}

export class EventProcessorUnavailableError extends Error {
  constructor(public readonly code: 'SCHEDULER_UNAVAILABLE' | 'INVALID_EVENT_CONTEXT', message: string) {
    super(message); this.name = 'EventProcessorUnavailableError';
  }
}
export class EventProcessorService {
  private processingQueue: Map<string, any> = new Map();
  private eventFilters: Map<string, (event: any) => boolean> = new Map();
  private isProcessing = false;

  constructor() {
    this.initializeEventFilters();
    this.startProcessingLoop();
    console.log('✅ Event Processor Service initialized');
  }

  /**
   * Initialize event filters to prevent spam
   */
  private initializeEventFilters() {
    // Filter for duplicate election status changes
    this.eventFilters.set('election_status_duplicate', (event: ElectionEventData) => {
      if (event.eventType !== 'status_change') return true;
      
      const key = `election_${event.electionId}_status`;
      const lastEvent = this.processingQueue.get(key);
      
      if (lastEvent && lastEvent.newStatus === event.newStatus) {
        return false; // Filter out duplicate
      }
      
      this.processingQueue.set(key, event);
      return true;
    });

    // Filter for candidate update frequency
    this.eventFilters.set('candidate_update_rate_limit', (event: CandidateEventData) => {
      const key = `candidate_${event.candidateId}_updates`;
      const now = Date.now();
      const recentUpdates = this.processingQueue.get(key) || [];
      
      // Remove updates older than 1 hour
      const filteredUpdates = recentUpdates.filter((timestamp: number) => 
        now - timestamp < 60 * 60 * 1000
      );
      
      // Allow max 5 updates per hour for minor updates, unlimited for major/critical
      if (event.updateType === 'minor' && filteredUpdates.length >= 5) {
        return false;
      }
      
      filteredUpdates.push(now);
      this.processingQueue.set(key, filteredUpdates);
      return true;
    });

    // Filter for breaking news verification
    this.eventFilters.set('breaking_news_verification', (event: BreakingNewsEventData) => {
      // Only process verified urgent news immediately
      if (event.urgency === 'urgent' && !event.verified) {
        console.warn('Blocking unverified urgent breaking news:', event.headline);
        return false;
      }
      return true;
    });
  }

  /**
   * Process election-related events
   */
  async processElectionEvent(
    election: Election,
    eventData: ElectionEventData
  ): Promise<NotificationEvent> {
    try {
      if (eventData.electionId !== election.id || !Number.isFinite(new Date(election.date).getTime())) throw new EventProcessorUnavailableError('INVALID_EVENT_CONTEXT', 'Election event does not match a valid stored election context');
      console.log(`🗳️ Processing election event: ${eventData.eventType} for ${election.title}`);

      // Apply event filters
      if (!this.applyFilters('election', eventData)) {
        console.log('Event filtered out:', eventData.eventType);
        throw new Error('Event filtered out');
      }

      // Enhance event data with context
      const enhancedData = {
        ...eventData,
        electionTitle: election.title,
        electionDate: election.date,
        electionLevel: election.level,
        electionType: election.type,
        timestamp: new Date().toISOString()
      };

      // Determine event priority and type
      let alertEventType = 'election_update';
      let priority = 'normal';

      switch (eventData.eventType) {
        case 'results_update':
          alertEventType = 'election_result';
          priority = 'high';
          break;
        case 'deadline_approaching':
          alertEventType = 'deadline_reminder';
          priority = eventData.deadline && eventData.deadline.daysUntil <= 1 ? 'high' : 'normal';
          break;
        case 'voting_started':
        case 'voting_ended':
          alertEventType = 'election_update';
          priority = 'high';
          break;
        case 'status_change':
          alertEventType = 'election_update';
          priority = 'normal';
          break;
      }

      // Process through alert engine
      return await alertEngineService.processEvent(
        alertEventType,
        enhancedData,
        {
          election,
          timestamp: new Date(),
          source: 'election_processor',
          metadata: {
            originalEventType: eventData.eventType,
            processingTime: new Date().toISOString()
          }
        }
      );
    } catch (error) {
      console.error('Failed to process election event:', error);
      throw error;
    }
  }

  /**
   * Process candidate-related events
   */
  async processCandidateEvent(
    candidate: Candidate,
    election: Election,
    eventData: CandidateEventData
  ): Promise<NotificationEvent> {
    try {
      if (eventData.candidateId !== candidate.id || eventData.electionId !== election.id || candidate.electionId === null || candidate.electionId === undefined || candidate.electionId !== election.id || candidate.electionId !== eventData.electionId || !Number.isFinite(new Date(election.date).getTime())) throw new EventProcessorUnavailableError('INVALID_EVENT_CONTEXT', 'Candidate event does not match a valid stored subject and election context');
      console.log(`👤 Processing candidate event: ${eventData.eventType} for ${candidate.name}`);

      // Apply event filters
      if (!this.applyFilters('candidate', eventData)) {
        console.log('Event filtered out:', eventData.eventType);
        throw new Error('Event filtered out');
      }

      // Enhance event data
      const enhancedData = {
        ...eventData,
        candidateName: candidate.name,
        candidateParty: candidate.party,
        electionTitle: election.title,
        electionDate: election.date,
        timestamp: new Date().toISOString()
      };

      // Determine priority based on update type and importance
      let priority = 'normal';
      if (eventData.updateType === 'critical' || eventData.importance >= 9) {
        priority = 'urgent';
      } else if (eventData.updateType === 'major' || eventData.importance >= 7) {
        priority = 'high';
      }

      // Process through alert engine
      return await alertEngineService.processEvent(
        'candidate_update',
        enhancedData,
        {
          candidate,
          election,
          timestamp: new Date(),
          source: 'candidate_processor',
          metadata: {
            originalEventType: eventData.eventType,
            updateType: eventData.updateType,
            importance: eventData.importance,
            verified: eventData.verified
          }
        }
      );
    } catch (error) {
      console.error('Failed to process candidate event:', error);
      throw error;
    }
  }

  /**
   * Process breaking news events
   */
  async processBreakingNewsEvent(
    eventData: BreakingNewsEventData
  ): Promise<NotificationEvent> {
    try {
      console.log(`📢 Processing breaking news: ${eventData.headline}`);

      // Apply event filters
      if (!this.applyFilters('breaking_news', eventData)) {
        console.log('Breaking news filtered out:', eventData.headline);
        throw new Error('Event filtered out');
      }

      // Get related elections and candidates if available
      let relatedElection: Election | undefined;
      let relatedCandidate: Candidate | undefined;

      // In real implementation, fetch from database using IDs
      if (eventData.relatedElectionIds && eventData.relatedElectionIds.length > 0) {
        // relatedElection = await getElectionById(eventData.relatedElectionIds[0]);
      }

      if (eventData.relatedCandidateIds && eventData.relatedCandidateIds.length > 0) {
        // relatedCandidate = await getCandidateById(eventData.relatedCandidateIds[0]);
      }

      // Enhance event data
      const enhancedData = {
        ...eventData,
        timestamp: new Date().toISOString(),
        category: eventData.category,
        verified: eventData.verified
      };

      // Process through alert engine
      return await alertEngineService.processEvent(
        'breaking_news',
        enhancedData,
        {
          election: relatedElection,
          candidate: relatedCandidate,
          timestamp: new Date(),
          source: 'breaking_news_processor',
          metadata: {
            category: eventData.category,
            urgency: eventData.urgency,
            verified: eventData.verified,
            sourceUrl: eventData.sourceUrl,
            expiresAt: eventData.expiresAt?.toISOString()
          }
        }
      );
    } catch (error) {
      console.error('Failed to process breaking news event:', error);
      throw error;
    }
  }

  /**
   * Process system/platform events
   */
  async processSystemEvent(
    eventData: SystemEventData
  ): Promise<NotificationEvent> {
    try {
      console.log(`⚙️ Processing system event: ${eventData.eventType}`);

      // Only process critical system events for notifications
      if (eventData.severity !== 'critical' && eventData.severity !== 'error') {
        console.log('System event not critical enough for notifications');
        throw new Error('Event not critical enough');
      }

      // Enhance event data
      const enhancedData = {
        ...eventData,
        timestamp: new Date().toISOString()
      };

      const priority = eventData.severity === 'critical' ? 'urgent' : 'high';

      // Process through alert engine
      return await alertEngineService.processEvent(
        'system_alert',
        enhancedData,
        {
          timestamp: new Date(),
          source: 'system_processor',
          metadata: {
            severity: eventData.severity,
            actionRequired: eventData.actionRequired,
            affectedServices: eventData.affectedServices,
            estimatedDuration: eventData.estimatedDuration
          }
        }
      );
    } catch (error) {
      console.error('Failed to process system event:', error);
      throw error;
    }
  }

  /**
   * Schedule deadline reminders
   */
  async scheduleDeadlineReminders(_election: Election): Promise<never> {
    // No persisted scheduler or verified registration/early-voting deadline
    // source is configured here. Never guess deadlines or claim queued work.
    throw new EventProcessorUnavailableError('SCHEDULER_UNAVAILABLE', 'Deadline reminders require a configured durable scheduler and reviewed jurisdiction-specific deadlines');
  }

  /**
   * Apply event filters
   */
  private applyFilters(eventType: string, eventData: any): boolean {
    for (const [filterName, filterFn] of this.eventFilters.entries()) {
      if (filterName.includes(eventType.toLowerCase())) {
        if (!filterFn(eventData)) {
          console.log(`Event filtered by ${filterName}`);
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Start background processing loop
   */
  private startProcessingLoop() {
    const timer = setInterval(async () => {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      try {
        await this.cleanupExpiredEvents();
      } catch (error) {
        console.error('Processing loop error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 30000); // Cache maintenance only; no durable deadline scheduler.
    timer.unref?.();
  }

  /**
   * Clean up expired events
   */
  private async cleanupExpiredEvents(): Promise<void> {
    const now = Date.now();
    const cutoff = now - 2 * 60 * 60 * 1000; // 2 hours ago

    for (const [key, value] of this.processingQueue.entries()) {
      if (Array.isArray(value)) {
        // Clean up timestamp arrays
        const filtered = value.filter((timestamp: number) => timestamp > cutoff);
        if (filtered.length === 0) {
          this.processingQueue.delete(key);
        } else {
          this.processingQueue.set(key, filtered);
        }
      }
    }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): any {
    return {
      queueSize: this.processingQueue.size,
      filtersActive: this.eventFilters.size,
      isProcessing: this.isProcessing,
      // No durable processing timestamp is recorded by this cache service.
      lastProcessingTime: null
    };
  }

  /**
   * Add custom event filter
   */
  addEventFilter(name: string, filterFn: (event: any) => boolean): void {
    this.eventFilters.set(name, filterFn);
    console.log(`✅ Added event filter: ${name}`);
  }

  /**
   * Remove event filter
   */
  removeEventFilter(name: string): boolean {
    const removed = this.eventFilters.delete(name);
    if (removed) {
      console.log(`❌ Removed event filter: ${name}`);
    }
    return removed;
  }
}

// Export singleton instance
export const eventProcessorService = new EventProcessorService();
export default eventProcessorService;