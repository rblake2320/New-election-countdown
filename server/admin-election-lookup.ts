import type { RequestHandler } from 'express';
import type { ElectionListing, ElectionQueryFilters } from './election-list-filters';

export const ADMIN_LOOKUP_MAX_DAYS = 400;
export const ADMIN_LOOKUP_MAX_ROWS = 600;
const DAY_MS = 86_400_000;
const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/;
const stateCode = /^[A-Za-z]{2}$/;

function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const m = isoDay.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  // Reject rollovers such as 2026-02-31.
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}

/**
 * Admin-only race lookup for corrections and late certification of races outside the public list's
 * 30-day window. Inclusive election dates; no past/future cutoff. Guards (isAuthenticated, requireAdmin)
 * are applied where the route is mounted. A storage failure is a 503, never an empty list.
 */
export function adminElectionLookupHandler(storage: { getElectionsStrict(filters: ElectionQueryFilters): Promise<ElectionListing[]> }): RequestHandler {
  return async (req, res) => {
    const invalid = (error: string) => res.status(400).json({ error, code: 'invalid_query' });
    const { from: fromRaw, to: toRaw, q, state } = req.query;
    const from = parseDay(fromRaw);
    const to = parseDay(toRaw);
    if (!from || !to) return invalid('from and to are required as YYYY-MM-DD');
    if (to < from) return invalid('to must not be before from');
    if (q !== undefined && (typeof q !== 'string' || q.length > 200)) return invalid('q must be one string of at most 200 characters');
    if (state !== undefined && (typeof state !== 'string' || !stateCode.test(state))) return invalid('state must be a two-letter code');
    if ((to.getTime() - from.getTime()) / DAY_MS > ADMIN_LOOKUP_MAX_DAYS) {
      return res.status(422).json({ error: `Range is longer than ${ADMIN_LOOKUP_MAX_DAYS} days`, code: 'range_too_large' });
    }
    try {
      const rows = await storage.getElectionsStrict({
        minDate: from,
        maxDate: new Date(to.getTime() + DAY_MS),
        ...(state ? { state: state.toUpperCase() } : {}),
        ...(q ? { search: q } : {}),
      } as ElectionQueryFilters);
      if (rows.length > ADMIN_LOOKUP_MAX_ROWS) {
        return res.status(422).json({ error: `More than ${ADMIN_LOOKUP_MAX_ROWS} races match; narrow the range`, code: 'range_too_large' });
      }
      res.json(rows);
    } catch (error) {
      console.error('Admin election lookup unavailable:', error instanceof Error ? error.message : 'unknown error');
      res.status(503).json({ error: 'Election lookup temporarily unavailable', code: 'lookup_unavailable' });
    }
  };
}
