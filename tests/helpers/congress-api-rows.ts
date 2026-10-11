import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadOfficialCongressSnapshot } from '../../server/congress-official-import';
import { filterMembers as serverScope } from '../../server/congress-members-routes';

// Vitest runs from the repository root (import.meta.url is not a file path under jsdom).
const fixture = (name: string) => readFileSync(resolve(process.cwd(), 'tests/fixtures/congress-members', name));

/**
 * Exact bytes of a real GET /api/members response, captured by lane D inside the
 * production image after the guarded 539-member official apply (see
 * fixtures/congress-members/README.md). 541 rows: the 539 official members plus two
 * labelled preservation controls the import kept (one current, one 118th Congress).
 */
export const ACTUAL_MEMBERS_SHA256 = '4e2b8e72e1e56dc114f055e9e704bde76dd9fcda4ee0ee764e5c1ae9d8d1ebb0';

export function actualMembersResponseBytes(): Buffer {
  const bytes = fixture('members-response.json');
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== ACTUAL_MEMBERS_SHA256) throw new Error(`members-response.json changed: ${sha}`);
  return bytes;
}

export type ApiMemberRow = {
  id: number; bioguideId: string; name: string; party: string; state: string;
  district: string | null; chamber: string; congress: number; createdAt: string; updatedAt: string;
};

export const actualMemberRows = (): ApiMemberRow[] => JSON.parse(actualMembersResponseBytes().toString('utf8'));

/**
 * GET /api/members after PR #34: the server's own default-scope filter ('current')
 * applied to the same actual rows, serialized as res.json does. 539 rows.
 */
export const defaultScopeMemberRows = (): ApiMemberRow[] => serverScope(actualMemberRows(), 'current');

/** Actual admin-route responses recorded in the same run (legacy 422 refusals, 401/403). */
export function actualReceipt(): {
  legacy: Array<{ path: string; status: number; body: Record<string, unknown> }>;
  [k: string]: unknown;
} {
  return JSON.parse(fixture('receipt.json').toString('utf8'));
}

/** Vacancies the reviewed official source names explicitly (not rows in /api/members). */
export function officialVacancies() {
  return loadOfficialCongressSnapshot().snapshot.vacancies;
}
