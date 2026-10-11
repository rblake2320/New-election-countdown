import type { Express, Request, Response } from 'express';

/**
 * Truthful Congress member reads (Lane A, ET-37 follow-up from Sol's actual API gap).
 *
 * - Jurisdictions: the official 119th Congress source has 56 — 50 states, DC, and the
 *   five territories with delegates / a resident commissioner (PR, GU, AS, MP, VI). The
 *   old regex admitted 51 and 400'd on real members.
 * - Scope: congress_members also holds preserved history (other Congresses) and
 *   unreviewed legacy rows (119th rows without a real Bioguide id, kept until a reviewed
 *   removal plan). The default read is the CURRENT official roster only; callers ask for
 *   history or legacy explicitly, and the response says which scope it served.
 */

export const CURRENT_CONGRESS = 119;
export const BIOGUIDE_RE = /^[A-Z]\d{6}$/;

export const US_STATES = Object.freeze(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']);
export const FEDERAL_DISTRICT = Object.freeze(['DC']);
export const TERRITORIES = Object.freeze(['PR', 'GU', 'AS', 'MP', 'VI']);
export const CONGRESS_JURISDICTIONS: readonly string[] = Object.freeze([...US_STATES, ...FEDERAL_DISTRICT, ...TERRITORIES]);
const JURISDICTION_SET = new Set(CONGRESS_JURISDICTIONS);

export type MemberScope = 'current' | 'history' | 'legacy' | 'all';
const SCOPES: readonly MemberScope[] = ['current', 'history', 'legacy', 'all'];

export interface CongressMemberRow {
  id?: number;
  bioguideId: string | null;
  name: string;
  party: string | null;
  state: string | null;
  district: string | null;
  chamber: string | null;
  congress: number | null;
}

/** Classifies a stored row the same way the source-bound importer does. */
export function memberScope(row: CongressMemberRow): Exclude<MemberScope, 'all'> {
  if (row.congress !== CURRENT_CONGRESS) return 'history';
  return BIOGUIDE_RE.test(String(row.bioguideId ?? '')) ? 'current' : 'legacy';
}

export function filterMembers<T extends CongressMemberRow>(rows: T[], scope: MemberScope): T[] {
  if (scope === 'all') return rows;
  return rows.filter((r) => memberScope(r) === scope);
}

export function parseScope(raw: unknown): MemberScope | null {
  if (raw === undefined || raw === null || raw === '') return 'current';
  const s = String(raw).toLowerCase();
  return (SCOPES as readonly string[]).includes(s) ? (s as MemberScope) : null;
}

export function isCongressJurisdiction(code: string): boolean {
  return JURISDICTION_SET.has(code);
}

/** Party is stored as a code (R / D / I); callers search by label or code. */
export const PARTY_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  d: 'D', dem: 'D', democrat: 'D', democratic: 'D', democrats: 'D',
  r: 'R', rep: 'R', gop: 'R', republican: 'R', republicans: 'R',
  i: 'I', ind: 'I', independent: 'I', independents: 'I',
});
export const SEARCH_LIMIT = 50;

function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Search the given rows for a free-text term. Each clause is exact where the column is a
 * code (party, state, Bioguide id) and a diacritic-insensitive substring where it is a
 * name; the clauses are OR'd, like the search box promises.
 */
export function searchMembers<T extends CongressMemberRow>(rows: T[], term: string): T[] {
  const q = fold(term);
  if (!q) return [];
  const party = PARTY_ALIASES[q] ?? null;
  const upper = term.trim().toUpperCase();
  const state = isCongressJurisdiction(upper) ? upper : null;
  const bioguide = BIOGUIDE_RE.test(upper) ? upper : null;
  // A one- or two-letter term is a code (party / state), not a name fragment: "d" must
  // not return every member whose name contains a d.
  const nameQ = q.length >= 3 ? q : null;
  const out: T[] = [];
  for (const r of rows) {
    const hit =
      (party !== null && (r.party ?? '').toUpperCase() === party) ||
      (state !== null && (r.state ?? '').toUpperCase() === state) ||
      (bioguide !== null && (r.bioguideId ?? '').toUpperCase() === bioguide) ||
      (nameQ !== null && fold(r.name ?? '').includes(nameQ));
    if (hit) {
      out.push(r);
      if (out.length >= SEARCH_LIMIT) break;
    }
  }
  return out;
}

function unavailable(res: Response, context: string, error: unknown): void {
  console.error(`Error ${context}:`, error instanceof Error ? error.message : String(error));
  // 503, not 200 []: an empty list would claim the roster has nobody.
  res.status(503).json({ error: 'members_unavailable', message: 'Congress members could not be read' });
}

function send(res: Response, scope: MemberScope, rows: CongressMemberRow[]): void {
  res.setHeader('X-Congress-Scope', scope);
  res.setHeader('X-Congress-Number', String(CURRENT_CONGRESS));
  res.setHeader('X-Congress-Count', String(rows.length));
  res.json(rows);
}

export function registerCongressMembersRoutes(app: Express, listMembers: () => Promise<CongressMemberRow[]>): void {
  // Default = current official roster; ?scope=history|legacy|all is explicit.
  app.get('/api/members', async (req: Request, res: Response) => {
    try {
      const scope = parseScope(req.query.scope);
      if (!scope) return res.status(400).json({ error: 'invalid_scope', allowed: SCOPES });
      send(res, scope, filterMembers(await listMembers(), scope));
    } catch (error) {
      unavailable(res, 'fetching members', error);
    }
  });

  // Registered before /api/members/:state so "search" is never read as a jurisdiction.
  app.get('/api/members/search', async (req: Request, res: Response) => {
    try {
      const raw = req.query.q ?? req.query.searchTerm;
      const term = typeof raw === 'string' ? raw.trim() : '';
      if (!term) return res.status(400).json({ error: 'search_term_required', message: 'Search query is required' });
      const scope = parseScope(req.query.scope);
      if (!scope) return res.status(400).json({ error: 'invalid_scope', allowed: SCOPES });
      send(res, scope, searchMembers(filterMembers(await listMembers(), scope), term));
    } catch (error) {
      unavailable(res, 'searching members', error);
    }
  });

  app.get('/api/members/:state', async (req: Request, res: Response) => {
    try {
      const code = String(req.params.state || '').toUpperCase();
      if (!isCongressJurisdiction(code)) {
        return res.status(400).json({ error: 'invalid_jurisdiction', state: code, allowed: CONGRESS_JURISDICTIONS });
      }
      const scope = parseScope(req.query.scope);
      if (!scope) return res.status(400).json({ error: 'invalid_scope', allowed: SCOPES });
      const rows = filterMembers(await listMembers(), scope).filter((r) => String(r.state ?? '').toUpperCase() === code);
      send(res, scope, rows);
    } catch (error) {
      unavailable(res, 'fetching members by jurisdiction', error);
    }
  });
}
