/**
 * Unified Health Check Service
 * Tests actual API connectivity for all external services
 */

import { apiKeyValidationService, type APIKeyStatus } from '../api-key-validation-service';

export interface ServiceHealthStatus {
  key: string;
  service: string;
  status: 'available' | 'unavailable' | 'degraded';
  required: boolean;
  responseTime?: number;
  error?: string;
  lastChecked: string;
  details?: string;
}

export interface ComprehensiveHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealthStatus[];
  summary: {
    available: number;
    degraded: number;
    unavailable: number;
    critical_failures: number;
  };
  timestamp: string;
}

export class HealthCheckService {
  private readonly timeoutMs = 5000; // 5 second timeout for health checks

  /**
   * Test Google Civic API connectivity
   */
  private async testGoogleCivicAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const url = `https://www.googleapis.com/civicinfo/v2/elections?key=${apiKey}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'User-Agent': 'ElectionTracker/1.0' }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 403) {
          return { status: 'unavailable', responseTime, error: 'API key invalid or quota exceeded', details: `HTTP ${response.status}` };
        }
        if (response.status === 429) {
          return { status: 'degraded', responseTime, error: 'Rate limited', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      const data = await response.json();
      return { 
        status: 'available', 
        responseTime, 
        details: `Elections endpoint accessible, ${data.elections?.length || 0} elections found` 
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test ProPublica API connectivity
   */
  private async testProPublicaAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const url = 'https://api.propublica.org/congress/v1/118/house/members.json';
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 
          'X-API-Key': apiKey,
          'User-Agent': 'ElectionTracker/1.0'
        }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 403) {
          return { status: 'unavailable', responseTime, error: 'API key invalid', details: `HTTP ${response.status}` };
        }
        if (response.status === 429) {
          return { status: 'degraded', responseTime, error: 'Rate limited', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      const data = await response.json();
      return { 
        status: 'available', 
        responseTime,
        details: `Congressional data accessible, ${data.results?.[0]?.members?.length || 0} members found`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test Disaster Recovery System health
   */
  private async testDisasterRecoverySystem(): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      // Import disaster recovery coordinator
      const { disasterRecoveryCoordinator } = await import('./disaster-recovery-coordinator');
      
      // Perform health check
      const healthCheck = await disasterRecoveryCoordinator.performHealthCheck();
      const responseTime = Date.now() - startTime;

      if (healthCheck.isHealthy) {
        return {
          status: 'available',
          responseTime,
          details: `System healthy (${healthCheck.metrics.systemHealthScore}% score), ${healthCheck.metrics.successfulBackups}/${healthCheck.metrics.totalBackups} backups successful`
        };
      } else {
        return {
          status: healthCheck.alerts.some(alert => alert.includes('CRITICAL')) ? 'unavailable' : 'degraded',
          responseTime,
          error: healthCheck.alerts.join('; '),
          details: `Health score: ${healthCheck.metrics.systemHealthScore}%`
        };
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unavailable',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        details: 'Disaster recovery system unavailable'
      };
    }
  }

  /**
   * Test Neon Snapshot Service health
   */
  private async testNeonSnapshotService(): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      // Import Neon snapshot service
      const { neonSnapshotService } = await import('./neon-snapshot-service');
      
      // Get service health
      const health = await neonSnapshotService.getServiceHealth();
      const responseTime = Date.now() - startTime;

      if (health.isHealthy) {
        return {
          status: 'available',
          responseTime,
          details: `${health.totalSnapshots} snapshots available, last: ${health.lastSnapshot?.name || 'none'}`
        };
      } else {
        return {
          status: 'degraded',
          responseTime,
          error: health.errors?.join('; '),
          details: 'Neon snapshot service has issues'
        };
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unavailable',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        details: 'Neon snapshot service unavailable'
      };
    }
  }

  /**
   * Test OpenStates API connectivity
   */
  private async testOpenStatesAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const url = `https://v3.openstates.org/people?apikey=${apiKey}&jurisdiction=us&per_page=1`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'User-Agent': 'ElectionTracker/1.0' }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 403) {
          return { status: 'unavailable', responseTime, error: 'API key invalid', details: `HTTP ${response.status}` };
        }
        if (response.status === 429) {
          return { status: 'degraded', responseTime, error: 'Rate limited', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      const data = await response.json();
      return { 
        status: 'available', 
        responseTime,
        details: `Legislative data accessible, ${data.results?.length || 0} records found`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test VoteSmart API connectivity
   */
  private async testVoteSmartAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const url = `https://api.votesmart.org/State.getStateIDs?key=${apiKey}&o=JSON`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'User-Agent': 'ElectionTracker/1.0' }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 403) {
          return { status: 'unavailable', responseTime, error: 'API key invalid', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      const data = await response.json();
      return { 
        status: 'available', 
        responseTime,
        details: `VoteSmart API accessible, ${data.stateList?.state?.length || 0} states found`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test Perplexity API connectivity
   */
  private async testPerplexityAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const url = 'https://api.perplexity.ai/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ElectionTracker/1.0'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'What is the current date?' }],
          max_tokens: 50,
          temperature: 0.1
        })
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 401) {
          return { status: 'unavailable', responseTime, error: 'API key invalid', details: `HTTP ${response.status}` };
        }
        if (response.status === 429) {
          return { status: 'degraded', responseTime, error: 'Rate limited', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      return { 
        status: 'available', 
        responseTime,
        details: 'AI analysis service accessible'
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test OpenFEC API connectivity
   */
  private async testOpenFECAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const url = `https://api.open.fec.gov/v1/candidates/?api_key=${apiKey}&per_page=1`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'User-Agent': 'ElectionTracker/1.0' }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 403) {
          return { status: 'unavailable', responseTime, error: 'API key invalid', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      const data = await response.json();
      return { 
        status: 'available', 
        responseTime,
        details: `Campaign finance data accessible, ${data.results?.length || 0} records found`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test Census API connectivity
   */
  private async testCensusAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const url = `https://api.census.gov/data/2021/acs/acs1?get=NAME,B01003_001E&for=state:*&key=${apiKey}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'User-Agent': 'ElectionTracker/1.0' }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 403) {
          return { status: 'unavailable', responseTime, error: 'API key invalid', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      const data = await response.json();
      return { 
        status: 'available', 
        responseTime,
        details: `Demographics data accessible, ${Array.isArray(data) ? data.length - 1 : 0} records found`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test MapQuest API connectivity
   */
  private async testMapQuestAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const url = `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}&location=Washington,DC`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'User-Agent': 'ElectionTracker/1.0' }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 403) {
          return { status: 'unavailable', responseTime, error: 'API key invalid', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      const data = await response.json();
      return { 
        status: 'available', 
        responseTime,
        details: `Geocoding service accessible, ${data.results?.length || 0} results found`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test Firecrawl API connectivity
   */
  private async testFirecrawlAPI(apiKey: string): Promise<{ status: ServiceHealthStatus['status']; responseTime?: number; error?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      // Simple health check - get account info
      const url = 'https://api.firecrawl.dev/v0/crawl';
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ElectionTracker/1.0'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          crawlerOptions: { limit: 1 }
        })
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 401) {
          return { status: 'unavailable', responseTime, error: 'API key invalid', details: `HTTP ${response.status}` };
        }
        if (response.status === 429) {
          return { status: 'degraded', responseTime, error: 'Rate limited', details: `HTTP ${response.status}` };
        }
        return { status: 'unavailable', responseTime, error: `API error: ${response.status}`, details: response.statusText };
      }

      return { 
        status: 'available', 
        responseTime,
        details: 'Web scraping service accessible'
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        return { status: 'degraded', responseTime, error: 'Request timeout', details: `Timeout after ${this.timeoutMs}ms` };
      }
      return { status: 'unavailable', responseTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test individual service connectivity
   */
  private async testServiceConnectivity(keyInfo: APIKeyStatus): Promise<ServiceHealthStatus> {
    const timestamp = new Date().toISOString();
    
    // If key is not available, mark as unavailable
    if (!keyInfo.available) {
      return {
        key: keyInfo.key,
        service: keyInfo.service,
        status: 'unavailable',
        required: keyInfo.required,
        error: 'API key not configured',
        lastChecked: timestamp,
        details: `Environment variable ${keyInfo.key} not set`
      };
    }

    const apiKey = process.env[keyInfo.key]!;

    try {
      let testResult;
      
      switch (keyInfo.key) {
        case 'GOOGLE_CIVIC_API_KEY':
          testResult = await this.testGoogleCivicAPI(apiKey);
          break;
        case 'PROPUBLICA_API_KEY':
          testResult = await this.testProPublicaAPI(apiKey);
          break;
        case 'OPENSTATES_API_KEY':
          testResult = await this.testOpenStatesAPI(apiKey);
          break;
        case 'VOTESMART_API_KEY':
          testResult = await this.testVoteSmartAPI(apiKey);
          break;
        case 'PERPLEXITY_API_KEY':
          testResult = await this.testPerplexityAPI(apiKey);
          break;
        case 'OPENFEC_API_KEY':
          testResult = await this.testOpenFECAPI(apiKey);
          break;
        case 'CENSUS_API_KEY':
          testResult = await this.testCensusAPI(apiKey);
          break;
        case 'MAPQUEST_API_KEY':
          testResult = await this.testMapQuestAPI(apiKey);
          break;
        case 'FIRECRAWL_API_KEY':
          testResult = await this.testFirecrawlAPI(apiKey);
          break;
        default:
          // For any unhandled API keys, just mark as available if key exists
          testResult = { status: 'available' as const, details: 'API key present but connectivity test not implemented' };
      }

      return {
        key: keyInfo.key,
        service: keyInfo.service,
        status: testResult.status,
        required: keyInfo.required,
        responseTime: testResult.responseTime,
        error: testResult.error,
        details: testResult.details,
        lastChecked: timestamp
      };
    } catch (error) {
      return {
        key: keyInfo.key,
        service: keyInfo.service,
        status: 'unavailable',
        required: keyInfo.required,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: timestamp,
        details: 'Connectivity test failed'
      };
    }
  }

  /**
   * Perform comprehensive health check of all services
   */
  public async checkAllServices(): Promise<ComprehensiveHealthStatus> {
    console.log('🔍 Starting comprehensive API health check...');
    
    const keyStatus = apiKeyValidationService.checkAllKeys();
    const allKeys = [...keyStatus.available, ...keyStatus.missing];

    // Test all services in parallel for better performance
    const serviceTests = await Promise.allSettled(
      allKeys.map(keyInfo => this.testServiceConnectivity(keyInfo))
    );

    const services: ServiceHealthStatus[] = serviceTests.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Handle any unexpected errors during testing
        const keyInfo = allKeys[index];
        return {
          key: keyInfo.key,
          service: keyInfo.service,
          status: 'unavailable' as const,
          required: keyInfo.required,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          lastChecked: new Date().toISOString(),
          details: 'Health check failed unexpectedly'
        };
      }
    });

    // Calculate summary statistics
    const available = services.filter(s => s.status === 'available').length;
    const degraded = services.filter(s => s.status === 'degraded').length;
    const unavailable = services.filter(s => s.status === 'unavailable').length;
    const critical_failures = services.filter(s => s.status === 'unavailable' && s.required).length;

    // Determine overall health
    let overall: ComprehensiveHealthStatus['overall'];
    if (critical_failures > 0) {
      overall = 'critical';
    } else if (degraded > 0 || unavailable > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const healthStatus: ComprehensiveHealthStatus = {
      overall,
      services,
      summary: {
        available,
        degraded,
        unavailable,
        critical_failures
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Health check completed: ${available} available, ${degraded} degraded, ${unavailable} unavailable (${critical_failures} critical failures)`);
    
    return healthStatus;
  }

  /**
   * Get health status for a specific service
   */
  public async checkService(keyName: string): Promise<ServiceHealthStatus | null> {
    const keyInfo = apiKeyValidationService.getServiceInfo(keyName);
    if (!keyInfo) {
      return null;
    }

    return this.testServiceConnectivity(keyInfo);
  }

  /**
   * Perform comprehensive health check (alias for checkAllServices)
   * This method is called by failover routes for enhanced health monitoring
   */
  public async performComprehensiveHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    services: ServiceHealthStatus[];
    summary: {
      available: number;
      degraded: number;
      unavailable: number;
      critical_failures: number;
    };
    timestamp: string;
    database?: {
      healthy: boolean;
      mode?: string;
      latency?: number;
      errors?: string[];
    };
  }> {
    // Get the standard comprehensive health check
    const healthStatus = await this.checkAllServices();
    
    // Add database-specific health information for failover integration
    let databaseHealth = null;
    try {
      // Try to get storage health if available
      const { storage } = await import('../storage');
      const storageHealth = storage.getHealthStatus?.();
      
      if (storageHealth) {
        databaseHealth = {
          healthy: storageHealth.isDatabaseHealthy || false,
          mode: storageHealth.mode || 'unknown',
          latency: storageHealth.connectionStats?.averageLatency,
          errors: storageHealth.diagnostics?.errors || []
        };
      }
    } catch (error) {
      console.log('Database health info not available for comprehensive check:', error);
    }
    
    return {
      ...healthStatus,
      database: databaseHealth
    };
  }
  // Event handling for failover integration
  private failoverEventListeners: Array<(event: any) => Promise<void>> = [];

  /**
   * Register a failover event listener
   */
  public onFailoverEvent(listener: (event: any) => Promise<void>): void {
    this.failoverEventListeners.push(listener);
  }

  /**
   * Emit a failover event to all listeners
   */
  private async emitFailoverEvent(event: any): Promise<void> {
    for (const listener of this.failoverEventListeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error('Error in failover event listener:', error);
      }
    }
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();