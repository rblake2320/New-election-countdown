// What a candidate record actually establishes (owner rule: FEC registration is never ballot access).
// Built only from fields the real payloads carry (retained from D's post-apply copy, 2026-10-13):
//  - /api/elections/:id/candidates rows nest provenance under `source`
//    { data_source, source_status: "fec_registered", ballot_status: "not_certified", fec_status }
//  - /api/elections/:id/general-candidates is the official-list roster (lane C): its rows carry the same ids.
// A race can have more profiles than official-list rows (CA-01: 6 FEC profiles, 2 printed-ballot list rows),
// so the count and each row say which is which. Nothing here promotes registration into nomination.
import type { GeneralRosterResponse } from "@/lib/general-roster";

type AnyCandidate = Record<string, any>;

/** First non-empty string among the top-level keys, then the same keys inside the nested `source` block. */
export function pickProvenance(c: AnyCandidate, ...keys: string[]): string | undefined {
  for (const holder of [c, c?.source]) {
    if (!holder || typeof holder !== "object") continue;
    for (const k of keys) {
      const v = holder[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return undefined;
}

export const isFecRegistrationOnly = (c: AnyCandidate): boolean =>
  pickProvenance(c, "sourceStatus", "source_status") === "fec_registered"
  && !["certified", "withdrawn", "disqualified"].includes(pickProvenance(c, "ballotStatus", "ballot_status") ?? "");

const FEC_ROW = "FEC registration · ballot status not confirmed";

/** Ids on the race's official candidate list; empty unless the roster is a sourced list. */
export function officialListIds(roster: GeneralRosterResponse | null | undefined): Set<number> {
  return new Set(roster?.status === "sourced" ? roster.candidates.map(r => r.id) : []);
}

/** One short label per row, or null when there is nothing honest to add beyond the existing label. */
export function rowQualification(c: AnyCandidate, roster: GeneralRosterResponse | null | undefined): string | null {
  const ballot = pickProvenance(c, "ballotStatus", "ballot_status");
  if (ballot === "certified") return "On certified ballot";
  if (ballot === "withdrawn") return "Withdrawn";
  if (ballot === "disqualified") return "Disqualified";
  if (officialListIds(roster).has(c.id)) return "On the official candidate list";
  if (isFecRegistrationOnly(c)) return FEC_ROW;
  return null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The race-page count. Plain "N candidates" when no record says otherwise; with an official list,
 * how many are on it and how many more are FEC registrations; with only FEC registrations, say so.
 */
export function candidateCountText(candidates: AnyCandidate[], roster: GeneralRosterResponse | null | undefined): string {
  const n = candidates.length;
  if (n === 0) return "Candidates not yet recorded";
  const listedIds = officialListIds(roster);
  const listed = candidates.filter(c => listedIds.has(c.id)).length;
  const fecOnly = candidates.filter(c => !listedIds.has(c.id) && isFecRegistrationOnly(c)).length;
  const otherRows = n - listed - fecOnly;
  if (listed > 0) {
    const parts = [`${listed} on the official candidate list`];
    if (fecOnly > 0) parts.push(`${plural(fecOnly, "FEC registration", "FEC registrations")}, ballot status not confirmed`);
    if (otherRows > 0) parts.push(plural(otherRows, "other record", "other records"));
    return parts.join(" · ");
  }
  if (fecOnly === n) return `${plural(n, "FEC registration", "FEC registrations")} · ballot status not confirmed`;
  return plural(n, "candidate", "candidates");
}

/** Card heading note: shown when any row is FEC registration only (cards do not load the roster). */
export const cardQualificationNote = (candidates: AnyCandidate[]): string | null =>
  candidates.some(isFecRegistrationOnly) ? "Includes FEC registrations; ballot status not confirmed." : null;
