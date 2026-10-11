import type { Express, Request, Response } from 'express';
import { isAuthenticated } from './auth';
import { requireAdmin } from './middleware/require-admin';
import { recordSecurityDecision } from './security-events';

/**
 * Admin Congress import routes (Lane A, ET-2 / Congress importer coordination).
 *
 * The HTTP layer makes no claim the importer did not make: it returns the importer's own
 * result and validation, never "complete" or "authenticated dataset" prose. Refusals from
 * the importer (unverified source snapshot, duplicates, empty input) are mapped to 4xx with
 * a machine-readable code and no partial-success body; unknown failures are a fixed 500.
 * The importer is injected so the route contract can be tested without a database and so
 * Lane C's source-bound importer can replace the legacy one without touching this file.
 */
export interface CongressImporter {
  importFromCompleteDataset(): Promise<unknown>;
  validateImport?(): Promise<unknown>;
}

export const CONGRESS_IMPORT_REFUSALS: Record<string, { status: number; error: string; message: string }> = {
  E_UNVERIFIED: { status: 422, error: 'source_unverified', message: 'Congress source snapshot could not be verified against the reviewed digests; nothing was imported' },
  E_DUPLICATES: { status: 409, error: 'import_refused', message: 'Congress source contains duplicate members; nothing was imported' },
  E_EMPTY: { status: 409, error: 'import_refused', message: 'Congress source resolved to no members; nothing was imported' },
  E_INCOMPLETE: { status: 409, error: 'import_refused', message: 'Congress source does not cover both chambers; nothing was imported' },
};

export function congressImportFailure(error: unknown): { status: number; body: Record<string, unknown> } {
  const e = (error ?? {}) as { code?: unknown; details?: unknown };
  const refusal = typeof e.code === 'string' ? CONGRESS_IMPORT_REFUSALS[e.code] : undefined;
  if (refusal) {
    return { status: refusal.status, body: { error: refusal.error, code: e.code, message: refusal.message, details: scalarDetails(e.details) } };
  }
  return { status: 500, body: { error: 'import_failed', message: 'Congress import failed; no partial result is reported' } };
}

/** Only small scalar context is echoed back (counts, digests); never raw rows or messages. */
function scalarDetails(details: unknown): Record<string, string | number | boolean | null> | null {
  if (!details || typeof details !== 'object') return null;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(details as Record<string, unknown>)) {
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = (typeof v === 'string' ? v.slice(0, 200) : v) as any;
  }
  return out;
}

export function registerCongressImportRoutes(app: Express, getImporter: () => Promise<CongressImporter>): void {
  const run = async (req: Request, res: Response, withValidation: boolean) => {
    const actor = String((req as any).userId ?? 'unknown');
    try {
      const importer = await getImporter();
      const result = await importer.importFromCompleteDataset();
      const validation = withValidation && importer.validateImport ? await importer.validateImport() : undefined;
      recordSecurityDecision(req, { action: 'admin.congress_import', result: 'allow', actor });
      res.json({ status: 'importer_result', result, validation: validation ?? null });
    } catch (error) {
      const { status, body } = congressImportFailure(error);
      recordSecurityDecision(req, { action: 'admin.congress_import', result: 'error', actor, reason: String(body.error) });
      console.error('Congress import failed:', error instanceof Error ? error.message : String(error));
      res.status(status).json(body);
    }
  };

  app.post('/api/congress/sync-all', isAuthenticated, requireAdmin, (req, res) => run(req, res, true));
  app.post('/api/congress/import', isAuthenticated, requireAdmin, (req, res) => run(req, res, false));
}
