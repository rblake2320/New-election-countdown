import { EventEmitter } from 'events';
import { storage } from './storage';
import { aiValidationService } from './ai-validation-service';
import { realTimeMonitor } from './real-time-monitor';

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
    
    // Update candidate results
    if (data.candidates) {
      for (const candidate of data.candidates) {
        await storage.updateCandidateResults(candidate.id, {
          votes: candidate.votes,
          percentage: candidate.percentage,
          lastUpdated: event.timestamp
        });
      }
    }

    // Trigger real-time notifications
    this.emit('results_updated', {
      electionId,
      timestamp: event.timestamp,
      candidates: data.candidates
    });
  }

  private async processCandidateChange(event: ElectionEvent): Promise<void> {
    const { electionId, data } = event;
    
    // Validate candidate change
    if (event.validated && event.confidence > 0.7) {
      await storage.updateCandidate(data.candidateId, {
        name: data.name,
        party: data.party,
        lastUpdated: event.timestamp
      });

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
    await storage.updateElectionResults(event.electionId, {
      districtWinners: Array.from(this.districtCalls.values())
        .filter(call => call.electionId === event.electionId)
    });

    this.emit('district_called', districtCall);
  }

  private async processRecountDeclaration(event: ElectionEvent): Promise<void> {
    const { electionId, data } = event;
    
    // Flag election for recount
    await storage.updateElection(electionId, {
      status: 'recount_declared',
      recountReason: data.reason,
      recountDeadline: data.deadline,
      lastUpdated: event.timestamp
    });

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

  // Integration with existing real-time monitor
  async connectToRealTimeMonitor(): Promise<void> {
    realTimeMonitor.on('election_data_scraped', async (data) => {
      await this.ingestEvent({
        type: 'result_update',
        electionId: data.electionId,
        data: data.results,
        timestamp: data.scrapedAt
      }, 'real_time_monitor');
    });
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