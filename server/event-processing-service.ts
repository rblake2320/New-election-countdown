import { EventEmitter } from 'events';
import { storage } from './storage';

import { resultReportInputSchema } from './results-reports';

/**
 * ET-6 (owner decision 2026-10-11): results reach the database only as a full v1.2 snapshot from a
 * registered official source, through storage.recordResultReport. An event that carries anything
 * less (AI-derived claims, partial candidate counts, a "district call", a recount flag) is refused
 * here - it is not an official result and must never become one.
 */
class UnsupportedEventError extends Error {
  status = 422; publicCode = 'unsupported_result_event';
  constructor(message: string) { super(message); }
}
import { aiValidationService } from './ai-validation-service';

interface ElectionEvent {
  id: string;
  type: 'result_update' | 'candidate_change' | 'precinct_report' | 'district_call' | 'recount_declared';
  electionId: number;
  timestamp: Date;
  source: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  validated: boolean;
  confidence: number;
}

interface PrecinctUpdate {
  precinctId: string;
  electionId: number;
  candidates: Array<{
    name: string;
    party: string;
    votes: number;
    percentage: number;
  }>;
  totalVotes: number;
  reportingComplete: boolean;
  lastUpdated: Date;
}

interface DistrictCall {
  districtId: string;
  electionId: number;
  winner: string;
  margin: number;
  confidence: number;
  calledBy: string;
  timestamp: Date;
}

export class EventProcessingService extends EventEmitter {
  private eventQueue: ElectionEvent[] = [];
  private isProcessing = false;
  private processors: Map<string, (event: ElectionEvent) => Promise<void>> = new Map();
  private precinctData: Map<string, PrecinctUpdate> = new Map();
  private districtCalls: Map<string, DistrictCall> = new Map();

  constructor() {
    super();
    this.initializeProcessors();
    this.startEventProcessor();
  }

  private initializeProcessors(): void {
    this.processors.set('result_update', this.processResultUpdate.bind(this));
    this.processors.set('candidate_change', this.processCandidateChange.bind(this));
    this.processors.set('precinct_report', this.processPrecinctReport.bind(this));
    this.processors.set('district_call', this.processDistrictCall.bind(this));
    this.processors.set('recount_declared', this.processRecountDeclaration.bind(this));
  }

  // Main event ingestion endpoint
  async ingestEvent(rawEvent: any, source: string): Promise<string> {
    const event: ElectionEvent = {
      id: this.generateEventId(),
      type: rawEvent.type || 'result_update',
      electionId: rawEvent.electionId,
      timestamp: new Date(rawEvent.timestamp || Date.now()),
      source,
      data: rawEvent.data,
      priority: this.calculatePriority(rawEvent),
      validated: false,
      confidence: 0
    };

    // Validate event data
    const validation = await this.validateEvent(event);
    event.validated = validation.verified;
    event.confidence = validation.confidence;

    // Add to processing queue
    this.eventQueue.push(event);
    this.sortQueueByPriority();

    this.emit('event_ingested', event);
    return event.id;
  }

  // Event validation using AI service
  private async validateEvent(event: ElectionEvent): Promise<{ verified: boolean; confidence: number }> {
    try {
      const claim = this.eventToClaim(event);
      const validation = await aiValidationService.validateElectionClaim(claim);
      
      return {
        verified: validation.verified,
        confidence: validation.confidence
      };
    } catch (error) {
      console.error('Event validation failed:', error);
      return { verified: false, confidence: 0 };
    }
  }

  // Convert event to verifiable claim
  private eventToClaim(event: ElectionEvent): string {
    switch (event.type) {
      case 'result_update':
        return `Election ${event.electionId} has updated results: ${JSON.stringify(event.data)}`;
      case 'candidate_change':
        return `Candidate information changed for election ${event.electionId}: ${event.data.candidateName}`;
      case 'precinct_report':
        return `Precinct ${event.data.precinctId} reported results for election ${event.electionId}`;
      case 'district_call':
        return `District ${event.data.districtId} called for ${event.data.winner} in election ${event.electionId}`;
      default:
        return `Election event for election ${event.electionId}`;
    }
  }

  // Priority calculation
  private calculatePriority(rawEvent: any): 'low' | 'medium' | 'high' | 'critical' {
    if (rawEvent.type === 'district_call') return 'critical';
    if (rawEvent.type === 'recount_declared') return 'critical';
    if (rawEvent.data?.margin && rawEvent.data.margin < 0.5) return 'high';
    if (rawEvent.data?.reportingComplete) return 'high';
    return 'medium';
  }

  // Event processing loop
  private startEventProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.eventQueue.length > 0) {
        this.isProcessing = true;
        await this.processNextEvent();
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  private async processNextEvent(): Promise<void> {
    const event = this.eventQueue.shift();
    if (!event) return;

    try {
      const processor = this.processors.get(event.type);
      if (processor) {
        await processor(event);
        this.emit('event_processed', event);
      } else {
        console.warn(`No processor found for event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Event processing failed:', error);
      this.emit('event_error', { event, error });
    }
  }

  // Specific event processors
  private async processResultUpdate(event: ElectionEvent): Promise<void> {
    const { electionId, data } = event;
    const parsed = resultReportInputSchema.safeParse(data?.report);
    if (!parsed.success) {
      throw new UnsupportedEventError('result_update events must carry a full v1.2 snapshot in data.report from a registered official source');
    }
    const outcome = await storage.recordResultReport(electionId, parsed.data, { postedBy: `event:${event.source}`, idempotencyKey: null });
    this.emit('results_updated', { electionId, timestamp: event.timestamp, reportId: outcome.payload.reportId, revision: outcome.payload.revision, created: outcome.created });
  }

  private async processCandidateChange(event: ElectionEvent): Promise<void> {
    const { electionId, data } = event;
    
    // Candidate records change only through the source-bound candidate pipeline, never from an
    // event (there is no storage member for it and there must not be one here).
    if (event.validated && event.confidence > 0.7) {
      throw new UnsupportedEventError(`candidate_change for candidate ${data.candidateId} is not applied from events`);

      this.emit('candidate_updated', {
        electionId,
        candidateId: data.candidateId,
        changes: data
      });
    }
  }

  private async processPrecinctReport(event: ElectionEvent): Promise<void> {
    const precinctUpdate: PrecinctUpdate = {
      precinctId: event.data.precinctId,
      electionId: event.electionId,
      candidates: event.data.candidates,
      totalVotes: event.data.totalVotes,
      reportingComplete: event.data.reportingComplete,
      lastUpdated: event.timestamp
    };

    this.precinctData.set(event.data.precinctId, precinctUpdate);

    // Check if this completes district reporting
    await this.checkDistrictCompletion(event.electionId, event.data.districtId);

    this.emit('precinct_reported', precinctUpdate);
  }

  private async processDistrictCall(event: ElectionEvent): Promise<void> {
    const districtCall: DistrictCall = {
      districtId: event.data.districtId,
      electionId: event.electionId,
      winner: event.data.winner,
      margin: event.data.margin,
      confidence: event.confidence,
      calledBy: event.source,
      timestamp: event.timestamp
    };

    this.districtCalls.set(event.data.districtId, districtCall);

    // Update election with district winner
    // A "district call" is a projection. Under the owner's no-projections decision it is kept as an
    // in-memory note for operators and NEVER written to results.
    this.emit('district_call_noted', districtCall);
    throw new UnsupportedEventError(`district_call for election ${event.electionId} is a projection and is not recorded as a result`);
  }

  private async processRecountDeclaration(event: ElectionEvent): Promise<void> {
    const { electionId, data } = event;
    
    // There is no election status column for recounts; an official recount arrives as a new
    // snapshot (supersedesReportId) from the official source, not as an event flag.
    throw new UnsupportedEventError(`recount_declared for election ${electionId} is not applied from events (reason: ${String(data?.reason ?? 'unspecified')})`);

    this.emit('recount_declared', {
      electionId,
      reason: data.reason,
      deadline: data.deadline
    });
  }

  // District completion checker
  private async checkDistrictCompletion(electionId: number, districtId: string): Promise<void> {
    const precincts = Array.from(this.precinctData.values())
      .filter(p => p.electionId === electionId && p.precinctId.startsWith(districtId));
    
    const totalPrecincts = precincts.length;
    const reportedPrecincts = precincts.filter(p => p.reportingComplete).length;
    
    if (totalPrecincts > 0 && reportedPrecincts === totalPrecincts) {
      this.emit('district_complete', {
        electionId,
        districtId,
        reportingPercentage: 100,
        totalVotes: precincts.reduce((sum, p) => sum + p.totalVotes, 0)
      });
    }
  }

  // Queue management
  private sortQueueByPriority(): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    this.eventQueue.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  // External API integration points
  async connectToOpenStatesAPI(): Promise<void> {
    // Integration point for Open States API events
    // This would typically use webhooks or polling
    console.log('Open States API integration ready');
  }

  async connectToVoteSmartAPI(): Promise<void> {
    // Integration point for VoteSmart candidate updates
    console.log('VoteSmart API integration ready');
  }

  // Utility methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Status and metrics
  getEventProcessingStatus(): {
    queueLength: number;
    isProcessing: boolean;
    eventsProcessedToday: number;
    precinctCount: number;
    districtCallCount: number;
  } {
    return {
      queueLength: this.eventQueue.length,
      isProcessing: this.isProcessing,
      eventsProcessedToday: this.getEventsProcessedToday(),
      precinctCount: this.precinctData.size,
      districtCallCount: this.districtCalls.size
    };
  }

  private getEventsProcessedToday(): number {
    // This would be tracked in a proper database
    return 0;
  }

  // Manual event injection for testing
  async injectTestEvent(type: string, electionId: number, data: any): Promise<string> {
    return this.ingestEvent({
      type,
      electionId,
      data,
      timestamp: new Date()
    }, 'manual_test');
  }
}

export const eventProcessingService = new EventProcessingService();