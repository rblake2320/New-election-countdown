import { Request, Response, NextFunction } from 'express';
import { apiKeyValidationService } from '../api-key-validation-service';

/**
 * Middleware to check if required API keys are available before processing requests
 * Returns 503 with structured error response if keys are missing
 */

export interface APIKeyGuardOptions {
  requiredKeys: string[];
  optional?: boolean; // If true, logs warning but doesn't block request
}

/**
 * Creates middleware that checks for specific API keys
 * @param requiredKeys Array of environment variable names to check
 * @param optional If true, warns but doesn't block when keys are missing
 */
export function requireAPIKeys(requiredKeys: string[], optional = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingKeys: string[] = [];
    
    for (const keyName of requiredKeys) {
      if (!apiKeyValidationService.isKeyAvailable(keyName)) {
        missingKeys.push(keyName);
      }
    }

    if (missingKeys.length > 0) {
      // Log the missing keys
      const keysList = missingKeys.join(', ');
      console.log(`🔑 API key check for ${req.method} ${req.path}: Missing keys [${keysList}]${optional ? ' (optional)' : ''}`);

      if (!optional) {
        // Generate structured error response for the first missing key
        const primaryMissingKey = missingKeys[0];
        const errorResponse = apiKeyValidationService.generateMissingKeyError(primaryMissingKey);
        
        // Add additional context for multiple missing keys
        if (missingKeys.length > 1) {
          errorResponse.message += ` (${missingKeys.length - 1} other required keys also missing)`;
        }

        return res.status(errorResponse.status).json({
          ...errorResponse,
          path: req.path,
          method: req.method,
          missingKeys,
          timestamp: new Date().toISOString()
        });
      }
    }

    // All required keys are available (or this is optional), proceed
    next();
  };
}

/**
 * Middleware specifically for VoteSmart API endpoints
 */
export const requireVoteSmartAPI = requireAPIKeys(['VOTESMART_API_KEY']);

/**
 * Middleware for ProPublica API endpoints
 */
export const requireProPublicaAPI = requireAPIKeys(['PROPUBLICA_API_KEY']);

/**
 * Middleware for Google Civic API endpoints
 */
export const requireGoogleCivicAPI = requireAPIKeys(['GOOGLE_CIVIC_API_KEY']);

/**
 * Middleware for multiple congressional data APIs (with fallbacks)
 */
export const requireCongressionalAPI = (req: Request, res: Response, next: NextFunction) => {
  const congressionalKeys = ['PROPUBLICA_API_KEY', 'CONGRESS_API_KEY', 'OPENSTATES_API_KEY'];
  const availableKeys = congressionalKeys.filter(key => apiKeyValidationService.isKeyAvailable(key));

  if (availableKeys.length === 0) {
    console.log(`🏛️  Congressional API check for ${req.method} ${req.path}: No congressional APIs available`);
    
    return res.status(503).json({
      service: 'Congressional Data',
      reason: 'missing_api_key',
      message: 'At least one congressional data API key is required (ProPublica, Congress.gov, or OpenStates)',
      path: req.path,
      method: req.method,
      availableServices: [],
      requiredServices: ['ProPublica', 'Congress.gov', 'OpenStates'],
      timestamp: new Date().toISOString()
    });
  }

  // At least one congressional API is available
  console.log(`🏛️  Congressional API check for ${req.method} ${req.path}: Using ${availableKeys.length} available API(s)`);
  next();
};

/**
 * Middleware for optional services - logs but doesn't block
 */
export function requireOptionalService(keyName: string) {
  return requireAPIKeys([keyName], true);
}

/**
 * Check if any critical services are missing (for health endpoints)
 */
export function getCriticalServiceStatus() {
  const status = apiKeyValidationService.checkAllKeys();
  return {
    healthy: status.allRequired,
    critical: status.critical.length,
    optional: status.missing.filter(key => !key.required).length,
    summary: apiKeyValidationService.getNotificationSummary()
  };
}