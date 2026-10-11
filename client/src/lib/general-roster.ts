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

export interface GeneralRosterResponse {
  status: "sourced" | "not_recorded" | "election_not_found";
  electionId: number;
  candidates: GeneralRosterCandidate[];
}

/**
 * Party as the official list gives it. A stated preference (top-two states such
 * as WA: "(Prefers Republican Party)") is shown verbatim as the preference, not as party
 * nomination. Unknown stays empty (e.g. write-ins), never guessed.
 */
export function rosterParty(c: GeneralRosterCandidate): string | null {
  const raw = c.generalListSource?.partyRaw?.trim();
  if (c.generalListSource?.partyBasis === "preference" && raw) {
    return raw; // the official wording verbatim, e.g. "(Prefers Republican Party)"
  }
  if (c.party && c.party.trim()) {
    const code = c.party.trim();
    const label = partyLabel(code);
    return label !== code ? label : code;
  }
  return raw ? raw : null;
}

export function isWriteIn(c: GeneralRosterCandidate): boolean {
  return /write[-_ ]?in/i.test(c.generalListSource?.ballotAccessType ?? "");
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
