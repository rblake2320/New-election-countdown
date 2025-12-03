
/**
 * Centralized API Key Validation Service
 * Checks for required API keys and provides service availability status
 */

export interface APIKeyStatus {
  key: string;
  service: string;
  required: boolean;
  available: boolean;
  purpose: string;
  setupUrl?: string;
}

export interface ServiceAvailability {
  allRequired: boolean;
  allOptional: boolean;
  missing: APIKeyStatus[];
  available: APIKeyStatus[];
  critical: APIKeyStatus[];
}

export class APIKeyValidationService {
  private readonly apiKeys: APIKeyStatus[] = [
    {
      key: 'VOTESMART_API_KEY',
      service: 'VoteSmart',
      required: false,
      available: false,
      purpose: 'Candidate positions, voting records, biographical information',
      setupUrl: 'https://votesmart.org/api'
    },
    {
      key: 'PROPUBLICA_API_KEY',
      service: 'ProPublica',
      required: false,
      available: false,
      purpose: 'Congressional voting records, member data, bill tracking',
      setupUrl: 'https://www.propublica.org/datastore/api/propublica-congress-api'
    },
    {
      key: 'OPENSTATES_API_KEY',
      service: 'OpenStates',
      required: false,
      available: false,
      purpose: 'State legislature data, state-level political information',
      setupUrl: 'https://openstates.org/api/'
    },
    {
      key: 'CONGRESS_API_KEY',
      service: 'Congress.gov',
      required: false,
      available: false,
      purpose: 'Official congressional data and records'
    },
    {
      key: 'GOOGLE_CIVIC_API_KEY',
      service: 'Google Civic',
      required: true,
      available: false,
      purpose: 'Voter information, polling locations, election data'
    },
    {
      key: 'PERPLEXITY_API_KEY',
      service: 'Perplexity',
      required: false,
      available: false,
      purpose: 'AI-powered election analysis and research'
    },
    {
      key: 'OPENFEC_API_KEY',
      service: 'OpenFEC',
      required: false,
      available: false,
      purpose: 'Campaign finance data and records'
    },
    {
      key: 'FIRECRAWL_API_KEY',
      service: 'Firecrawl',
      required: false,
      available: false,
      purpose: 'Web scraping for candidate data collection'
    },
    {
      key: 'MAPQUEST_API_KEY',
      service: 'MapQuest',
      required: false,
      available: false,
      purpose: 'Geographic data and mapping services'
    },
    {
      key: 'CENSUS_API_KEY',
      service: 'US Census',
      required: false,
      available: false,
      purpose: 'Demographics, population data, and geographic statistics',
      setupUrl: 'https://api.census.gov/data/key_signup.html'
    }
  ];

  /**
   * Check availability of all API keys
   */
  public checkAllKeys(): ServiceAvailability {
    const updated = this.apiKeys.map(apiKey => ({
      ...apiKey,
      available: Boolean(process.env[apiKey.key])
    }));

    const missing = updated.filter(key => !key.available);
    const available = updated.filter(key => key.available);
    const critical = missing.filter(key => key.required);

    return {
      allRequired: critical.length === 0,
      allOptional: missing.filter(key => !key.required).length === 0,
      missing,
      available,
      critical
    };
  }

  /**
   * Check if a specific API key is available
   */
  public isKeyAvailable(keyName: string): boolean {
    return Boolean(process.env[keyName]);
  }

  /**
   * Get service info for a specific API key
   */
  public getServiceInfo(keyName: string): APIKeyStatus | undefined {
    const serviceInfo = this.apiKeys.find(key => key.key === keyName);
    if (!serviceInfo) return undefined;

    return {
      ...serviceInfo,
      available: this.isKeyAvailable(keyName)
    };
  }

  /**
   * Generate structured error response for missing API key
   */
  public generateMissingKeyError(keyName: string): {
    service: string;
    reason: string;
    message: string;
    setupUrl?: string;
    status: number;
  } {
    const serviceInfo = this.getServiceInfo(keyName);
    
    if (!serviceInfo) {
      return {
        service: 'Unknown',
        reason: 'missing_api_key',
        message: `API key '${keyName}' is not configured`,
        status: 503
      };
    }

    return {
      service: serviceInfo.service,
      reason: 'missing_api_key',
      message: `${serviceInfo.service} API key required for this feature. Purpose: ${serviceInfo.purpose}`,
      setupUrl: serviceInfo.setupUrl,
      status: 503
    };
  }

  /**
   * Check if any critical services are unavailable
   */
  public hasCriticalServiceFailures(): boolean {
    const status = this.checkAllKeys();
    return !status.allRequired;
  }

  /**
   * Get summary for frontend notifications
   */
  public getNotificationSummary(): {
    show: boolean;
    critical: number;
    optional: number;
    services: string[];
    message: string;
  } {
    const status = this.checkAllKeys();
    const criticalCount = status.critical.length;
    const optionalCount = status.missing.filter(key => !key.required).length;
    
    if (criticalCount === 0 && optionalCount === 0) {
      return {
        show: false,
        critical: 0,
        optional: 0,
        services: [],
        message: ''
      };
    }

    const criticalServices = status.critical.map(key => key.service);
    const optionalServices = status.missing.filter(key => !key.required).map(key => key.service);
    
    let message = '';
    if (criticalCount > 0) {
      message = `${criticalCount} critical service${criticalCount > 1 ? 's' : ''} unavailable: ${criticalServices.join(', ')}`;
      if (optionalCount > 0) {
        message += `. ${optionalCount} optional service${optionalCount > 1 ? 's' : ''} also unavailable.`;
      }
    } else {
      message = `${optionalCount} optional service${optionalCount > 1 ? 's' : ''} unavailable: ${optionalServices.join(', ')}`;
    }

    return {
      show: true,
      critical: criticalCount,
      optional: optionalCount,
      services: [...criticalServices, ...optionalServices],
      message
    };
  }
}

// Singleton instance
export const apiKeyValidationService = new APIKeyValidationService();