/**
 * Data Authenticity Service
 * Ensures all percentage values are from verified, authentic sources
 * Prevents displaying placeholder or static data as real polling
 */

export interface AuthenticDataSource {
  source: string;
  timestamp: Date;
  apiEndpoint: string;
  confidence: number;
  isLive: boolean;
}

export interface AuthenticPercentageData {
  value: number;
  source: AuthenticDataSource;
  lastVerified: Date;
  isAuthentic: boolean;
}

export class DataAuthenticityService {
  private verifiedSources = new Set([
    'polling-data-service',
    'google-civic-api',
    'openfec-api', 
    'propublica-congress-api',
    'realclearpolitics-api',
    'polling-averages-api'
  ]);

  /**
   * Validates if polling data comes from authentic sources
   */
  validatePollingData(candidate: any): AuthenticPercentageData | null {
    // Only return polling if it has authentic source markers
    if (!candidate.pollingSource || !candidate.lastPollingUpdate) {
      return null;
    }

    // Check if source is in our verified list
    const isVerifiedSource = this.verifiedSources.has(candidate.pollingSource);
    
    // Check if data is recent (within 7 days for polling)
    const lastUpdate = new Date(candidate.lastPollingUpdate);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    const isRecent = daysSinceUpdate <= 7;

    if (!isVerifiedSource || !isRecent) {
      return null;
    }

    return {
      value: candidate.pollingSupport,
      source: {
        source: candidate.pollingSource,
        timestamp: lastUpdate,
        apiEndpoint: this.getApiEndpointForSource(candidate.pollingSource),
        confidence: this.calculateConfidence(candidate.pollingSource, daysSinceUpdate),
        isLive: daysSinceUpdate <= 1
      },
      lastVerified: lastUpdate,
      isAuthentic: true
    };
  }

  /**
   * Validates if vote percentage comes from official election results
   */
  validateVoteData(candidate: any): AuthenticPercentageData | null {
    // Only show vote percentages if election is completed and results are certified
    if (!candidate.votePercentage || !candidate.votesReceived) {
      return null;
    }

    // Check if this is official election result data
    if (!candidate.resultSource || !candidate.resultCertified) {
      return null;
    }

    return {
      value: candidate.votePercentage,
      source: {
        source: candidate.resultSource || 'official-election-results',
        timestamp: new Date(candidate.updatedAt),
        apiEndpoint: 'official-election-results',
        confidence: 1.0, // Official results have highest confidence
        isLive: false // Election results are final
      },
      lastVerified: new Date(candidate.updatedAt),
      isAuthentic: true
    };
  }

  /**
   * Gets comprehensive data authenticity report for a candidate
   */
  getCandidateDataReport(candidate: any) {
    const polling = this.validatePollingData(candidate);
    const votes = this.validateVoteData(candidate);

    return {
      candidateId: candidate.id,
      name: candidate.name,
      hasAuthenticPolling: !!polling,
      hasAuthenticVotes: !!votes,
      pollingData: polling,
      voteData: votes,
      dataQuality: this.assessDataQuality(polling, votes),
      warnings: this.generateWarnings(candidate, polling, votes)
    };
  }

  /**
   * Removes all percentage data that lacks authentic sources
   */
  sanitizeCandidateData(candidate: any) {
    const polling = this.validatePollingData(candidate);
    const votes = this.validateVoteData(candidate);

    return {
      ...candidate,
      // Only include polling if it's authentic
      pollingSupport: polling ? polling.value : null,
      pollingSource: polling ? polling.source.source : null,
      lastPollingUpdate: polling ? polling.lastVerified : null,
      
      // Only include vote percentage if it's authentic
      votePercentage: votes ? votes.value : null,
      votesReceived: votes ? candidate.votesReceived : null,
      
      // Add authenticity metadata
      dataAuthenticity: {
        hasAuthenticPolling: !!polling,
        hasAuthenticVotes: !!votes,
        lastDataVerification: new Date(),
        pollingConfidence: polling?.source.confidence || 0,
        dataQuality: this.assessDataQuality(polling, votes)
      }
    };
  }

  private getApiEndpointForSource(source: string): string {
    const endpoints: Record<string, string> = {
      'polling-data-service': '/api/polling/authentic',
      'google-civic-api': 'https://www.googleapis.com/civicinfo/v2',
      'openfec-api': 'https://api.open.fec.gov/v1',
      'propublica-congress-api': 'https://api.propublica.org/congress/v1',
      'realclearpolitics-api': '/api/rcp/polling',
      'polling-averages-api': '/api/polling/averages'
    };
    return endpoints[source] || 'unknown';
  }

  private calculateConfidence(source: string, daysSinceUpdate: number): number {
    let baseConfidence = 0.5;
    
    // Higher confidence for established sources
    const sourceConfidence: Record<string, number> = {
      'polling-data-service': 0.9,
      'google-civic-api': 0.95,
      'openfec-api': 1.0,
      'propublica-congress-api': 0.95,
      'realclearpolitics-api': 0.85,
      'polling-averages-api': 0.8
    };

    baseConfidence = sourceConfidence[source] || 0.5;

    // Reduce confidence based on age of data
    const agePenalty = Math.min(daysSinceUpdate * 0.1, 0.4);
    return Math.max(baseConfidence - agePenalty, 0.1);
  }

  private assessDataQuality(polling: AuthenticPercentageData | null, votes: AuthenticPercentageData | null): string {
    if (votes) return 'excellent'; // Official results are best
    if (polling && polling.source.confidence > 0.8) return 'good';
    if (polling && polling.source.confidence > 0.6) return 'fair';
    return 'poor';
  }

  private generateWarnings(candidate: any, polling: AuthenticPercentageData | null, votes: AuthenticPercentageData | null): string[] {
    const warnings: string[] = [];

    // Warn about static/placeholder data
    if (candidate.pollingSupport && !polling) {
      warnings.push('Polling percentage shown is static database value, not from live polling sources');
    }

    if (candidate.votePercentage && !votes) {
      warnings.push('Vote percentage may be preliminary or unverified');
    }

    // Warn about old data
    if (polling && !polling.source.isLive) {
      const days = Math.floor((Date.now() - polling.lastVerified.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 3) {
        warnings.push(`Polling data is ${days} days old`);
      }
    }

    return warnings;
  }
}

export const dataAuthenticityService = new DataAuthenticityService();