// Official general-election candidate list (lane C: GET /api/elections/:id/general-candidates).
// Membership on a state's official general list, with its own source. This is
// deliberately separate from FEC registration and ballot certification: being
// on the list is never presented as "certified".

import { partyLabel } from "@/lib/filter-codes";

export interface GeneralListSource {
  sourceName?: string | null;
  sourceKind?: string | null;
  partyRaw?: string | null;
  partyBasis?: string | null;
  publishedAt?: string | null;
  ballotAccessType?: string | null;
  legalName?: string | null;
  ballotName?: string | null;
  ticketText?: string | null;
}

export interface GeneralRosterCandidate {
  id: number;
  name: string;
  party: string | null;
  isIncumbent: boolean | null;
  generalListSourceUrl: string | null;
  generalListCheckedAt: string | null;
  generalListSource: GeneralListSource | null;
}

/** A reviewed official-list snapshot for this race (lane C, general_candidate_list_snapshots). */
export interface RosterSnapshot {
  url: string | null;
  name: string | null;
  checkedAt: string | null;
  publishedAt: string | null;
  snapshotSha256?: string | null;
  scope?: { expectedCount?: number; partyRaw?: string | null; ballotAccessType?: string | null } | null;
}

export interface GeneralRosterResponse {
  status: "sourced" | "not_recorded" | "election_not_found";
  electionId: number;
  candidates: GeneralRosterCandidate[];
  sources?: RosterSnapshot[];
  /**
   * complete: a current unqualified office/district list exists.
   * scoped: only lists limited to a party or ballot-access type.
   * unspecified: no reviewed list snapshot.
   */
  coverage?: "complete" | "scoped" | "unspecified";
}

export type RosterCoverage = "complete" | "scoped" | "unspecified";

/** Server coverage when present; older servers without it fall back to the knownEmpty rule. */
export function rosterCoverage(data: GeneralRosterResponse): RosterCoverage {
  if (data.coverage) return data.coverage;
  if (knownEmptySources(data).length > 0) return "complete";
  return (data.sources?.length ?? 0) > 0 ? "scoped" : "unspecified";
}

/** Human description of what a scoped list covers, e.g. "Green Party write-in candidates". */
export function scopeLabel(scope: RosterSnapshot["scope"]): string | null {
  if (!scope) return null;
  const party = scope.partyRaw?.trim();
  const access = scope.ballotAccessType?.trim();
  const accessText = !access ? null
    : /write[-_ ]?in/i.test(access) ? "write-in"
    : access === "printed" ? "printed-ballot"
    : access.replace(/_/g, " ");
  if (!party && !accessText) return null;
  return [party, accessText, "candidates"].filter(Boolean).join(" ");
}

/** Distinct scope qualifications across the recorded lists. */
export function scopeLabels(data: GeneralRosterResponse): string[] {
  return Array.from(new Set((data.sources ?? []).map(s => scopeLabel(s.scope)).filter((x): x is string => !!x)));
}

/**
 * Snapshots that establish "the official list has no candidates for this race":
 * expected count 0 with no party or ballot-access qualifier (same rule as the
 * server's knownEmpty). A scope like "write-ins: 0" says nothing about the rest.
 */
export function knownEmptySources(data: GeneralRosterResponse): RosterSnapshot[] {
  return (data.sources ?? []).filter(s => s.scope?.expectedCount === 0 && !s.scope.partyRaw && !s.scope.ballotAccessType);
}

/**
 * Party as the official list gives it. A stated preference (top-two states such
 * as WA "(Prefers Republican Party)", CA "PARTY PREFERENCE: Democratic") is shown as a
 * preference, not as party
 * nomination. Unknown stays empty (e.g. write-ins), never guessed.
 */
export function rosterParty(c: GeneralRosterCandidate): string | null {
  const raw = c.generalListSource?.partyRaw?.trim();
  const basis = c.generalListSource?.partyBasis;
  // A filing method (FL "WRI" = write-in) is not a party: never shown as one.
  if (basis === "filing_method") return null;
  // Voter registration (AK "(Registered Republican)") is not nomination: verbatim.
  if (basis === "registration") return raw || null;
  if (basis === "preference" && raw) {
    // Official wording verbatim when it already says so (WA: "(Prefers Republican
    // Party)"); otherwise label it (CA's PARTY PREFERENCE column: "Democratic").
    return /prefer/i.test(raw) ? raw : `Party preference: ${raw}`;
  }
  if (c.party && c.party.trim()) {
    const code = c.party.trim();
    const label = partyLabel(code);
    return label !== code ? label : code;
  }
  return raw ? raw : null;
}

export function isWriteIn(c: GeneralRosterCandidate): boolean {
  const src = c.generalListSource;
  if (/write[-_ ]?in/i.test(src?.ballotAccessType ?? "")) return true;
  // FL lists write-ins via the filing-method code "WRI" in the party column.
  return src?.partyBasis === "filing_method" && /^(WRI|write[-_ ]?in)$/i.test(src?.partyRaw?.trim() ?? "");
}

export interface SourceLine { name: string; url: string | null; checkedAt: string | null; publishedAt: string | null }

export function snapshotLines(snaps: RosterSnapshot[]): SourceLine[] {
  return snaps.map(s => ({ name: s.name?.trim() || "Official state list", url: s.url ?? null, checkedAt: s.checkedAt ?? null, publishedAt: s.publishedAt ?? null }));
}

/** Distinct sources across the list, for one attribution line per source. */
export function rosterSources(cands: GeneralRosterCandidate[]) {
  const seen = new Map<string, { name: string; url: string | null; checkedAt: string | null; publishedAt: string | null }>();
  for (const c of cands) {
    const name = c.generalListSource?.sourceName?.trim() || "Official state list";
    const key = `${name}|${c.generalListSourceUrl ?? ""}`;
    const prev = seen.get(key);
    const checked = c.generalListCheckedAt ?? null;
    if (!prev || (checked && (!prev.checkedAt || checked > prev.checkedAt))) {
      seen.set(key, { name, url: c.generalListSourceUrl ?? null, checkedAt: checked, publishedAt: c.generalListSource?.publishedAt ?? null });
    }
  }
  return Array.from(seen.values());
}

/** Only http(s) links are rendered; anything else is shown as text. */
export function safeSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
