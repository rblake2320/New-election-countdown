import type { Express } from 'express';
import { CandidatePositionUnavailableError, type PositionData } from './candidate-position-api';
import { VerifiedPolicyComparisonError, type VerifiedPolicyComparison } from './verified-policy-comparison';

export interface VerifiedPolicyRoutesDependencies {
  positions: (id: number) => Promise<PositionData[]>;
  compare: (ids: unknown, categories: unknown) => Promise<VerifiedPolicyComparison[]>;
}

/** Public reads of already verified local source rows, never a provider-key gate. */
export function registerVerifiedPolicyRoutes(app: Express, deps: VerifiedPolicyRoutesDependencies): void {
  app.get('/api/candidates/:id/positions', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) > 2147483647) {
      return res.status(400).json({ code: 'INVALID_CANDIDATE_ID', error: 'A complete positive candidate identifier is required' });
    }
    try { return res.json(await deps.positions(Number(req.params.id))); }
    catch (error) {
      if (error instanceof CandidatePositionUnavailableError) return res.status(error.code === 'INVALID_POSITION_SOURCE' ? 422 : error.code === 'INVALID_CANDIDATE_ID' ? 400 : 503).json({ code: error.code, error: error.message });
      return res.status(503).json({ code: 'POSITION_SOURCE_UNAVAILABLE', error: 'Verified candidate position records are unavailable' });
    }
  });
  app.get('/api/civic/compare', async (req, res) => {
    try { return res.json(await deps.compare(req.query.candidateIds, req.query.policyCategories)); }
    catch (error) {
      if (error instanceof VerifiedPolicyComparisonError) return res.status(error.status).json({ code: error.code, error: error.message });
      return res.status(503).json({ code: 'POSITION_SOURCE_UNAVAILABLE', error: 'Verified policy statements are unavailable' });
    }
  });
}
