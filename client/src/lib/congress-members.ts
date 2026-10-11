import { PARTY_OPTIONS } from "@/lib/filter-codes";

// Rows from /api/members are raw congress_members rows for every Congress the table
// holds. The source-bound importer (server/congress-official-import.ts) stores the
// official single-letter party (D/R/I) and the source district: "00" for at-large
// seats, "01".."53" for numbered districts, null for Senators and for the six nonvoting
// House members. Rows it preserves from earlier imports may carry other Congress
// numbers, party labels ("Democratic"), "UNKNOWN", or unpadded districts.

export interface CongressMemberRow {
  id?: number;
  bioguideId?: string | null;
  name?: string | null;
  party?: string | null;
  state?: string | null;
  district?: string | null;
  chamber?: string | null;
  congress?: number | null;
}

// Seats fixed by law, not by whatever rows happen to be loaded: 435 voting
// representatives (2 U.S.C. 2), 100 senators, and six nonvoting House seats
// (delegates for AS, DC, GU, MP, VI and the Resident Commissioner of Puerto Rico).
export const SEATS = { senate: 100, houseVoting: 435, houseNonVoting: 6 } as const;

/** Jurisdictions with a nonvoting House seat. */
export const NONVOTING_HOUSE_STATES = ["AS", "DC", "GU", "MP", "PR", "VI"] as const;

/**
 * Congress in session on a date: the 1st began in 1789 and each runs two years from
 * January 3 of an odd year (20th Amendment), so Jan 1-2 of an odd year is the old one.
 */
export function currentCongress(now: Date = new Date()): number {
  const y = now.getUTCFullYear();
  const beforeTurnover = y % 2 === 1 && now.getUTCMonth() === 0 && now.getUTCDate() < 3;
  return Math.floor((y - 1789) / 2) + 1 - (beforeTurnover ? 1 : 0);
}

const LEGACY_PARTY: Record<string, string> = {
  democratic: "D", democrat: "D", republican: "R", independent: "I",
};

/** "D" / "R" / "I" for recognized parties, the trimmed raw value otherwise, "" when unrecorded. */
export function partyCode(party: string | null | undefined): string {
  const raw = (party ?? "").trim();
  if (!raw) return "";
  if (/^[DRI]$/i.test(raw)) return raw.toUpperCase();
  if (/^unknown$/i.test(raw)) return "";
  return LEGACY_PARTY[raw.toLowerCase()] ?? raw;
}

export function memberPartyLabel(party: string | null | undefined): string {
  const code = partyCode(party);
  if (!code) return "Party not recorded";
  return PARTY_OPTIONS.find(o => o.value === code)?.label ?? code;
}

const isHouse = (m: CongressMemberRow) => m.chamber?.toLowerCase() === "house";
const isSenate = (m: CongressMemberRow) => m.chamber?.toLowerCase() === "senate";

const noDistrict = (m: CongressMemberRow) => (m.district ?? "").trim() === "";
const nonVotingState = (m: CongressMemberRow) =>
  (NONVOTING_HOUSE_STATES as readonly string[]).includes((m.state ?? "").toUpperCase());

/** Delegate or resident commissioner: a House row with no district for a jurisdiction that has such a seat. */
export const isNonVotingHouse = (m: CongressMemberRow) => isHouse(m) && noDistrict(m) && nonVotingState(m);

export function seatLabel(m: CongressMemberRow): string {
  if (isSenate(m)) return "Senator";
  if (!isHouse(m)) return m.chamber || "Chamber not recorded";
  if (isNonVotingHouse(m)) {
    return m.state === "PR" ? "Resident Commissioner (nonvoting)" : "Delegate (nonvoting)";
  }
  if (noDistrict(m)) return "Seat not recorded";
  const d = String(m.district).trim();
  if (!/^\d+$/.test(d)) return `District ${d}`;
  const n = Number(d);
  return n === 0 ? "At-large district" : `District ${n}`;
}

export interface Composition {
  congress: number;
  /** Rows for the current Congress; everything below counts only these. */
  total: number;
  /** Rows for any other Congress, excluded from every count. */
  otherCongress: number;
  senate: number;
  houseVoting: number;
  houseNonVoting: number;
  /** House rows whose state/district is not a real seat (e.g. no district outside the six nonvoting jurisdictions). */
  unrecognizedHouseSeat: number;
  otherChamber: number;
  byParty: Record<string, number>;
  /** States whose senator rows are not exactly two. */
  senateStateIssues: string[];
  /** House voting seats claimed by more than one row. */
  duplicateHouseSeats: string[];
}

/**
 * The roster's Congress: the latest Congress number present in the rows (the server's
 * default scope is its current roster). Falls back to the calendar when no row says,
 * so a roster not yet re-imported after January 3 is shown as what it is, not hidden.
 */
export function latestCongress(rows: CongressMemberRow[], now: Date = new Date()): number {
  const ns = rows.map(r => r.congress).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return ns.length ? Math.max(...ns) : currentCongress(now);
}

export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** Rows that belong to the given Congress (rows with no Congress recorded are kept). */
export const inCongress = <T extends CongressMemberRow>(members: T[], congress: number): T[] =>
  members.filter(m => m.congress == null || m.congress === congress);

export function composition(rows: CongressMemberRow[], congress: number = latestCongress(rows)): Composition {
  const members = inCongress(rows, congress);
  const out: Composition = {
    congress, total: members.length, otherCongress: rows.length - members.length,
    senate: 0, houseVoting: 0, houseNonVoting: 0, unrecognizedHouseSeat: 0, otherChamber: 0,
    byParty: {}, senateStateIssues: [], duplicateHouseSeats: [],
  };
  const senators: Record<string, number> = {};
  const houseSeats: Record<string, number> = {};
  for (const m of members) {
    const label = memberPartyLabel(m.party);
    out.byParty[label] = (out.byParty[label] ?? 0) + 1;
    if (isSenate(m)) {
      out.senate++;
      const s = m.state || "?";
      senators[s] = (senators[s] ?? 0) + 1;
    } else if (isNonVotingHouse(m)) {
      out.houseNonVoting++;
    } else if (isHouse(m) && noDistrict(m)) {
      out.unrecognizedHouseSeat++;
    } else if (isHouse(m)) {
      out.houseVoting++;
      const d = String(m.district).trim();
      const seat = `${m.state || "?"}-${/^\d+$/.test(d) ? Number(d) : d}`;
      houseSeats[seat] = (houseSeats[seat] ?? 0) + 1;
    } else {
      out.otherChamber++;
    }
  }
  for (const [state, n] of Object.entries(senators).sort()) {
    if (n !== 2) out.senateStateIssues.push(`${state}: ${n} senator record${n === 1 ? "" : "s"} for 2 seats`);
  }
  for (const [seat, n] of Object.entries(houseSeats).sort()) {
    if (n > 1) out.duplicateHouseSeats.push(`${seat}: ${n} records for one seat`);
  }
  return out;
}

/** Human-readable data-quality notes for a composition; empty when the rows are clean. */
export function compositionIssues(c: Composition): string[] {
  const issues = [...c.senateStateIssues, ...c.duplicateHouseSeats];
  if (c.unrecognizedHouseSeat > 0) issues.push(`${c.unrecognizedHouseSeat} House record(s) with no recognized seat`);
  if (c.otherChamber > 0) issues.push(`${c.otherChamber} record(s) with no House/Senate chamber`);
  return issues;
}

export interface MemberFilters {
  search: string;
  /** "all" or a party code from PARTY_OPTIONS. */
  party: string;
  state: string;
  /** "all" | "House" | "Senate". */
  chamber: string;
}

export function filterMembers<T extends CongressMemberRow>(members: T[], f: MemberFilters): T[] {
  const q = f.search.trim().toLowerCase();
  const state = f.state.trim().toUpperCase();
  return members.filter(m =>
    (!q || !!m.name?.toLowerCase().includes(q) || !!m.bioguideId?.toLowerCase().includes(q)) &&
    (!f.party || f.party === "all" || partyCode(m.party) === f.party) &&
    (!state || m.state?.toUpperCase() === state) &&
    (!f.chamber || f.chamber === "all" || m.chamber?.toLowerCase() === f.chamber.toLowerCase()),
  );
}

/** Fetch a member list; a non-2xx response or a non-array body is an error, never an empty list. */
export async function fetchMembers(url: string, signal?: AbortSignal): Promise<CongressMemberRow[]> {
  const res = await fetch(url, { credentials: "include", signal });
  if (!res.ok) throw new Error(`Member data request failed (${res.status})`);
  const body: unknown = await res.json().catch(() => {
    throw new Error("Member data response was not valid JSON");
  });
  if (!Array.isArray(body)) throw new Error("Member data response was not a list");
  return body as CongressMemberRow[];
}
