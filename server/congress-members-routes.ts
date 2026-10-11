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
      console.error('Error fetching members:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'members_unavailable', message: 'Congress members could not be read' });
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
      console.error('Error fetching members by jurisdiction:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'members_unavailable', message: 'Congress members could not be read' });
    }
  });
}
