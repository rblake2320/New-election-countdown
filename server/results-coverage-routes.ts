/**
 * ET-6: GET /api/results/coverage?date=YYYY-MM-DD — which races on that date will be fed automatically
 * (published manifest + registered adapter) and which are manual-only. Public, read-only; the client
 * derives its "automatic vs manual" wording from this instead of a hand-maintained list.
 */
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import type { ResultsCoverage } from './results-ingestion-service';

const querySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional() });

export function registerResultsCoverageRoute(app: Express, deps: { coverage: (date?: string) => Promise<ResultsCoverage> }): void {
  app.get('/api/results/coverage', async (req: Request, res: Response) => {
    const q = querySchema.safeParse(req.query);
    if (!q.success) {
      return res.status(400).json({ error: 'invalid query', code: 'invalid_query', details: q.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    }
    try {
      res.set('Cache-Control', 'no-store');
      res.json(await deps.coverage(q.data.date));
    } catch (error) {
      console.error('[results coverage] failed', error instanceof Error ? error.message : error);
      res.status(503).json({ error: 'results coverage unavailable', code: 'results_unavailable' });
    }
  });
}
