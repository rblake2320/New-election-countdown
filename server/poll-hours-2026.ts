/**
 * Statutory poll hours and IANA time zones for the 2026-11-03 general election.
 *
 * Source of record: Ballotpedia, "State Poll Opening and Closing Times (2026)"
 *   https://ballotpedia.org/State_Poll_Opening_and_Closing_Times_(2026)
 *   (statute-cited per state; retrieved 2026-10-11). Bracketed numbers in `note`
 *   are that page's footnotes. Closing times cross-checked against 270toWin's
 *   Eastern-time table (https://www.270towin.com/poll-closing-times); the
 *   cross-check lives in tests/unit/poll-hours-2026.test.ts.
 *
 * Conventions
 *   - Times are LOCAL 24h "HH:MM" strings in the row's `timezone` (IANA).
 *   - `tz` is the state's predominant zone; House districts lying in a state's
 *     minority zone get a per-district override (same local hours).
 *   - open = latest statutory opening time (polls are guaranteed open from
 *     then); null where the statute leaves it to the municipality.
 *   - close = statewide statutory close; where counties may close later (ND)
 *     the statutory minimum is used so the app never says "polls are open"
 *     after a place may have closed.
 *   - DST ends 2026-11-01: every zone is on standard time on election day.
 */
export type PollHours = { open: string | null; close: string; tz: string; note: string };

export const STATE_HOURS: Record<string, PollHours> = {
  AL: { open: "07:00", close: "19:00", tz: "America/Chicago", note: "[1]; ET-zone counties close 7 p.m. CT per AP" },
  AK: { open: "07:00", close: "20:00", tz: "America/Anchorage", note: "[3]; Aleutians west of 169°30′W are Hawaii-Aleutian" },
  AZ: { open: "06:00", close: "19:00", tz: "America/Phoenix", note: "[4]; Navajo Nation observes DST" },
  AR: { open: "07:30", close: "19:30", tz: "America/Chicago", note: "[5]" },
  CA: { open: "07:00", close: "20:00", tz: "America/Los_Angeles", note: "[6]; mostly vote-by-mail" },
  CO: { open: "07:00", close: "19:00", tz: "America/Denver", note: "[7]; mostly vote-by-mail" },
  CT: { open: "06:00", close: "20:00", tz: "America/New_York", note: "[8]" },
  DE: { open: "07:00", close: "20:00", tz: "America/New_York", note: "[9]" },
  FL: { open: "07:00", close: "19:00", tz: "America/New_York", note: "[11]; panhandle Central — FL-01/02 override" },
  GA: { open: "07:00", close: "19:00", tz: "America/New_York", note: "[12]" },
  HI: { open: "07:00", close: "19:00", tz: "Pacific/Honolulu", note: "[14]; mostly vote-by-mail" },
  ID: { open: "08:00", close: "20:00", tz: "America/Boise", note: "[15]; clerks may open 7 a.m.; ID-01 Pacific override" },
  IL: { open: "06:00", close: "19:00", tz: "America/Chicago", note: "[17]" },
  IN: { open: "06:00", close: "18:00", tz: "America/Indiana/Indianapolis", note: "[18]; IN-01/08 Central override" },
  IA: { open: "07:00", close: "20:00", tz: "America/Chicago", note: "[19]" },
  KS: { open: "07:00", close: "19:00", tz: "America/Chicago", note: "[20][21]; whole state closes 7 p.m. local per AP" },
  KY: { open: "06:00", close: "18:00", tz: "America/Kentucky/Louisville", note: "[22]; KY-01/02 Central override" },
  LA: { open: "06:00", close: "20:00", tz: "America/Chicago", note: "[23] Tuesday elections" },
  ME: { open: "10:00", close: "20:00", tz: "America/New_York", note: "[24]; towns <500 may open as late as 10 a.m." },
  MD: { open: "07:00", close: "20:00", tz: "America/New_York", note: "[25]" },
  MA: { open: "07:00", close: "20:00", tz: "America/New_York", note: "[26][27]" },
  MI: { open: "07:00", close: "20:00", tz: "America/Detroit", note: "[28]; 4 Upper Peninsula counties Central" },
  MN: { open: "10:00", close: "20:00", tz: "America/Chicago", note: "[29]; small towns may open as late as 10 a.m." },
  MS: { open: "07:00", close: "19:00", tz: "America/Chicago", note: "[30]" },
  MO: { open: "06:00", close: "19:00", tz: "America/Chicago", note: "[31]" },
  MT: { open: "12:00", close: "20:00", tz: "America/Denver", note: "[32]; precincts <400 voters open from noon" },
  NE: { open: "08:00", close: "20:00", tz: "America/Chicago", note: "[33]; Mountain-zone counties 7–7 (same instant)" },
  NV: { open: "07:00", close: "19:00", tz: "America/Los_Angeles", note: "[34]; mostly vote-by-mail" },
  NH: { open: "11:00", close: "19:00", tz: "America/New_York", note: "[35][36]; must open by 11 a.m., may not close before 7 p.m. (many towns 8 p.m.)" },
  NJ: { open: "06:00", close: "20:00", tz: "America/New_York", note: "[37]" },
  NM: { open: "07:00", close: "19:00", tz: "America/Denver", note: "[38]" },
  NY: { open: "06:00", close: "21:00", tz: "America/New_York", note: "[39]" },
  NC: { open: "06:30", close: "19:30", tz: "America/New_York", note: "[40][41]" },
  ND: { open: "09:00", close: "19:00", tz: "America/Chicago", note: "[42]; open 7–9 a.m., close 7–9 p.m. by county; statutory minimum close used" },
  OH: { open: "06:30", close: "19:30", tz: "America/New_York", note: "[43]" },
  OK: { open: "07:00", close: "19:00", tz: "America/Chicago", note: "[44]" },
  OR: { open: "07:00", close: "20:00", tz: "America/Los_Angeles", note: "[45]; vote-by-mail; Malheur County Mountain" },
  PA: { open: "07:00", close: "20:00", tz: "America/New_York", note: "[46]" },
  RI: { open: "07:00", close: "20:00", tz: "America/New_York", note: "[47]" },
  SC: { open: "07:00", close: "19:00", tz: "America/New_York", note: "[48]" },
  SD: { open: "07:00", close: "19:00", tz: "America/Chicago", note: "[49]; western counties Mountain" },
  TN: { open: null, close: "19:00", tz: "America/Chicago", note: "[50]; opening set per county; ET counties close 8 p.m. ET = same instant" },
  TX: { open: "07:00", close: "19:00", tz: "America/Chicago", note: "[51]; TX-16/23 Mountain override" },
  UT: { open: "07:00", close: "20:00", tz: "America/Denver", note: "[52]; mostly vote-by-mail" },
  VT: { open: "10:00", close: "19:00", tz: "America/New_York", note: "[53]; towns open 5–10 a.m." },
  VA: { open: "06:00", close: "19:00", tz: "America/New_York", note: "[54]" },
  WA: { open: null, close: "20:00", tz: "America/Los_Angeles", note: "vote-by-mail; drop boxes/centers close 8 p.m." },
  WV: { open: "06:30", close: "19:30", tz: "America/New_York", note: "[55]" },
  WI: { open: "07:00", close: "20:00", tz: "America/Chicago", note: "[56]" },
  WY: { open: "07:00", close: "19:00", tz: "America/Denver", note: "[57]" },
};

/** House districts lying wholly (or overwhelmingly) in the state's minority zone. */
export const DISTRICT_TZ_OVERRIDES: Record<string, string> = {
  "FL-01": "America/Chicago",
  "FL-02": "America/Chicago",
  "ID-01": "America/Los_Angeles",
  "IN-01": "America/Chicago",
  "IN-08": "America/Chicago",
  "KY-01": "America/Chicago",
  "KY-02": "America/Chicago",
  "TX-16": "America/Denver",
  "TX-23": "America/Denver",
};

export const ELECTION_DAY_2026 = "2026-11-03";

/** Extract a district code such as "TX-16" or "AK-AL" from an election title. */
export function districtFromTitle(title: string): string | undefined {
  return (title.match(/\b([A-Z]{2}-(?:\d{2}|AL))\b/) || [])[1];
}

/** Resolve the hours + zone for one election row. */
export function pollHoursFor(state: string, title: string): PollHours | undefined {
  const h = STATE_HOURS[state];
  if (!h) return undefined;
  const district = districtFromTitle(title);
  const tz = (district && DISTRICT_TZ_OVERRIDES[district]) || h.tz;
  return { ...h, tz };
}

/** Build the instant at which polls close for a row (local close in its zone). */
export function pollsCloseInstant(dateISO: string, close: string, tz: string): Date {
  const [h, m] = close.split(":").map(Number);
  // Find the UTC instant whose wall-clock in `tz` equals dateISO close.
  const guess = new Date(`${dateISO}T${close}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const parts = Object.fromEntries(fmt.formatToParts(guess).map(p => [p.type, p.value]));
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
  const offset = wall - guess.getTime();
  return new Date(guess.getTime() - offset + (0 * h + 0 * m));
}
