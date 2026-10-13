import express, { type Express, type Request, type RequestHandler, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z, ZodError } from 'zod';
import { adminResultPostSchema, etagFor, narrowRecorded, ResultReportError, stripAdminFields, type ResultsPayload } from './results-reports';
import { EVIDENCE_CONTENT_TYPES, evidenceSignatureProblem, EVIDENCE_MAX_BYTES, LIST_MAX_IDS, type RecordContext, type ResultReportStore } from './results-store';

const resultsListQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ids: z.string().transform((s) => s.split(',').map((x) => Number(x.trim())))
    .pipe(z.array(z.number().int().positive()).min(1).max(LIST_MAX_IDS)).optional(),
  /** opaque cursor from a previous batch; equal to the current one → 304 */
  cursor: z.string().max(64).optional(),
}).strict().refine((q) => (q.date !== undefined) !== (q.ids !== undefined), { message: 'exactly one of date or ids is required' });

// ET-6 live official results — HTTP surface of contract v1.2 (§1 read, §2 admin posting).

export interface ResultsRoutesDeps {
  store: ResultReportStore;
  isAuthenticated: RequestHandler;
  requireAdmin: RequestHandler;
  /** who is posting — taken from the session, never from the body */
  adminIdentity: (req: Request) => string | null;
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof ResultReportError) {
    res.status(error.status).json({ error: error.message, code: error.publicCode, ...(error.details !== undefined ? { details: error.details } : {}) });
    return;
  }
  if (error instanceof ZodError) {
    res.status(422).json({ error: 'Invalid result report', code: 'invalid_report', details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    return;
  }
  console.error('[results] storage failure:', error);
  res.status(503).json({ error: 'Results are temporarily unavailable', code: 'results_unavailable' });
}

function sendPayload(req: Request, res: Response, payload: ResultsPayload, status = 200): void {
  const etag = etagFor(payload);
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'no-cache');
  if (status === 200 && req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }
  res.status(status).json(payload);
}

function parseElectionId(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function registerResultsRoutes(app: Express, deps: ResultsRoutesDeps): void {
  const read: RequestHandler = async (req, res) => {
    const electionId = parseElectionId(req);
    if (electionId === null) return res.status(404).json({ error: 'Election not found', code: 'election_not_found' });
    try {
      const payload = await deps.store.getResultsPayload(electionId);
      if (!payload) return res.status(404).json({ error: 'Election not found', code: 'election_not_found' });
      sendPayload(req, res, payload);
    } catch (error) {
      sendError(res, error);
    }
  };
  app.get('/api/elections/:id/results', read);
  // Alias until the UI switches to /results (the old handler invented isLive/lastUpdated from the clock).
  app.get('/api/elections/:id/live-results', read);

  // Batched read (v1.2 amendment): one call per viewer per interval for every race on a date.
  app.get('/api/results', async (req, res) => {
    const parsed = resultsListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid results query', code: 'invalid_query', details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    }
    const q = parsed.data;
    try {
      const list = await deps.store.listResultsPayloads({ date: q.date, ids: q.ids });
      const scope = q.date ?? `ids-${createHash('sha256').update(q.ids!.join(',')).digest('hex').slice(0, 12)}`;
      const etag = `W/"results-${scope}-${list.cursor}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'no-cache');
      // Same committed snapshot set (by header or by cursor param) → nothing to send.
      if (req.headers['if-none-match'] === etag || (q.cursor !== undefined && q.cursor === list.cursor)) return res.status(304).end();
      res.json(list);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Source picker for the posting form (lane C's manifest + one admin_manual entry per state).
  app.get('/api/results/sources', async (req, res) => {
    const state = typeof req.query.state === 'string' && /^[A-Z]{2}$/.test(req.query.state) ? req.query.state : undefined;
    if (req.query.state !== undefined && !state) return res.status(400).json({ error: 'state must be a two-letter code', code: 'invalid_query' });
    try {
      res.json({ sources: await deps.store.listResultSources(state) });
    } catch (error) {
      sendError(res, error);
    }
  });

  // Evidence upload: raw body (no multipart parser in this project), server hashes and retains the bytes.
  app.post('/api/admin/results-evidence', deps.isAuthenticated, deps.requireAdmin,
    express.raw({ type: () => true, limit: EVIDENCE_MAX_BYTES }),
    async (req, res) => {
      const postedBy = deps.adminIdentity(req);
      if (!postedBy) return res.status(401).json({ error: 'Authentication required', code: 'unauthenticated' });
      const contentType = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!(EVIDENCE_CONTENT_TYPES as readonly string[]).includes(contentType)) {
        return res.status(415).json({ error: 'Unsupported evidence type', code: 'unsupported_evidence_type', allowed: EVIDENCE_CONTENT_TYPES });
      }
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) return res.status(400).json({ error: 'Empty evidence body', code: 'empty_evidence' });
      const signature = evidenceSignatureProblem(contentType, body);
      if (signature) return res.status(400).json({ error: `Evidence bytes do not match ${contentType}: ${signature}`, code: 'evidence_signature_mismatch' });
      const filenameHeader = req.headers['x-evidence-filename'];
      const filename = typeof filenameHeader === 'string' ? filenameHeader.slice(0, 255) : null;
      try {
        const rec = await deps.store.storeResultEvidence(body, contentType, filename, `admin:${postedBy}`);
        res.status(rec.created ? 201 : 200).json({ sha256: rec.sha256, size: rec.size, contentType: rec.contentType });
      } catch (error) {
        sendError(res, error);
      }
    });
  // express.raw's size rejection arrives as an error with status 413 — map it to the contract code.
  app.use('/api/admin/results-evidence', (err: any, _req: Request, res: Response, next: (e?: unknown) => void) => {
    if (err?.type === 'entity.too.large' || err?.status === 413) return res.status(413).json({ error: 'Evidence exceeds 10 MB', code: 'evidence_too_large' });
    next(err);
  });

  app.post('/api/elections/:id/results', deps.isAuthenticated, deps.requireAdmin, async (req, res) => {
    const electionId = parseElectionId(req);
    if (electionId === null) return res.status(404).json({ error: 'Election not found', code: 'election_not_found' });
    const postedBy = deps.adminIdentity(req);
    if (!postedBy) return res.status(401).json({ error: 'Authentication required', code: 'unauthenticated' });
    try {
      const body = adminResultPostSchema.parse(req.body ?? {});
      if (body.electionId !== electionId) {
        return res.status(422).json({ error: 'Invalid result report', code: 'invalid_report', details: [{ path: 'electionId', message: `body electionId ${body.electionId} does not match the route election ${electionId}` }] });
      }
      const ctx: RecordContext = {
        postedBy: `admin:${postedBy}`,
        idempotencyKey: body.idempotencyKey,
        expectedRevision: body.expectedRevision,
        enforceRevision: body.expectedRevision !== null,
      };
      const outcome = await deps.store.recordResultReport(electionId, narrowRecorded(stripAdminFields(body)), ctx);
      sendPayload(req, res, outcome.payload, outcome.created ? 201 : 200);
    } catch (error) {
      sendError(res, error);
    }
  });
}
