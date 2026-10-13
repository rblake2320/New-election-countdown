import type { RequestHandler, Router } from 'express';
import { VotingIntentionError, type VotingIntentionsService } from './voting-intentions';

export function registerElectionIntegrityRoutes(router: Router, deps: {
  getElection: (id: number) => Promise<unknown>;
  authenticate: RequestHandler;
  actor: (request: import('express').Request) => string | null;
  intentions: Pick<VotingIntentionsService, 'record'>;
}): void {
  router.get('/:id/political-analysis', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > 2147483647) return res.status(400).json({ code: 'invalid_election_id', error: 'Invalid election ID' });
    try {
      if (!await deps.getElection(Number(req.params.id))) return res.status(404).json({ code: 'election_not_found', error: 'Election not found' });
      // No recorded source supplies the old leaning/intensity/competitiveness
      // score. State party history or candidate party counts cannot create one.
      return res.status(503).json({ code: 'political_analysis_unavailable', error: 'A sourced political analysis has not been recorded for this election', electionId: Number(req.params.id), source: null, asOf: null });
    } catch { return res.status(503).json({ code: 'election_store_unavailable', error: 'Election records are unavailable' }); }
  });
  router.post('/:id/voting-intention', deps.authenticate, async (req, res) => {
    const actor = deps.actor(req);
    if (!actor) return res.status(401).json({ code: 'unauthenticated', error: 'Authentication required' });
    // Browser cookie credentials must not let another origin submit a political
    // preference. Origin-less authenticated operator requests remain supported.
    const origin = req.get('origin');
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.host !== req.get('host') || parsed.protocol !== req.protocol + ':' || parsed.username || parsed.password) throw new Error('Foreign origin');
      } catch { return res.status(403).json({ code: 'foreign_origin', error: 'Voting preferences must be submitted from this application' }); }
    }
    const fetchSite = req.get('sec-fetch-site');
    if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return res.status(403).json({ code: 'foreign_origin', error: 'Voting preferences must be submitted from this application' });
    if (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > 2147483647) return res.status(400).json({ code: 'invalid_election_id', error: 'Invalid election ID' });
    try {
      const recorded = await deps.intentions.record(Number(req.params.id), actor, req.body);
      return res.status(recorded.created ? 201 : 200).json({ success: true, intention: recorded.intention });
    } catch (error) {
      if (error instanceof VotingIntentionError) return res.status(error.status).json({ code: error.code, error: error.message });
      return res.status(503).json({ code: 'intention_store_unavailable', error: 'Voting preference storage is unavailable' });
    }
  });
}
