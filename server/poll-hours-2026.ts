/**
 * Statutory poll hours, IANA time zones and provenance for the 2026-11-03 general election.
 *
 * Sources
 *   - NCSL, "Polling Places" (statute per state): https://www.ncsl.org/elections-and-campaigns/polling-places
 *   - Ballotpedia, "State Poll Opening and Closing Times (2026)": https://ballotpedia.org/State_Poll_Opening_and_Closing_Times_(2026)
 *   - North Dakota actual 2026 polling-place schedule (167 places): https://vip.sos.nd.gov/Precincts.aspx?eid=348
 *   - Cross-check: 270toWin Eastern closing-time table (tests/unit/poll-hours-2026.test.ts)
 *
 * Model (agreed with Lane B/C 2026-10-11)
 *   open/close  LOCAL 24h "HH:MM" in `tz`; null = varies by county/municipality (unknown preserved).
 *   tz          the state's LATEST zone (the WESTERNMOST one: the same wall-clock close happens last there)
 *               where a state spans zones, so `close` is the instant after
 *               which no precinct in the race is still open (a statewide upper bound); exact elsewhere.
 *   kind        "polls" (in-person close) | "ballot_return" (vote-by-mail states: in-person / drop-box
 *               return deadline on election day; MAIL postmark/receipt rules differ by state — e.g. Nevada
 *               accepts postmarked ballots received later — and are NOT represented by this field).
 *   basis       "statewide_latest" (bound as above; exact in single-zone states) |
 *               "district_latest" (House district wholly in one zone) | "local_variable" (no statewide close).
 *   source      primary URL the row's hours were taken from.
 *   DST ends 2026-11-01: every zone is on standard time on election day.
 */
export type PollCloseKind = "polls" | "ballot_return";
export type PollHoursBasis = "statewide_latest" | "district_latest" | "local_variable";
export type PollHours = { open: string | null; close: string | null; tz: string; kind: PollCloseKind; basis: PollHoursBasis; source: string; note: string };

export const STATE_HOURS: Record<string, PollHours> = {
  AL: { open: null, close: "19:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; Ala. Code § 17-9-6; multi-zone; latest zone used (predominant America/Chicago)" },
  AK: { open: null, close: "20:00", tz: "America/Adak", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Alaska Stat. § 15.15.080; multi-zone; latest zone used (predominant America/Anchorage)" },
  AZ: { open: "06:00", close: "19:00", tz: "America/Phoenix", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 7 p.m.; Ariz. Rev. Stat. § 16-565" },
  AR: { open: "07:30", close: "19:30", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7:30 a.m. to 7:30 p.m.; Ark. Code Ann. § 7-5-304" },
  CA: { open: "07:00", close: "20:00", tz: "America/Los_Angeles", kind: "ballot_return", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Cal. Elec. Code § 14212" },
  CO: { open: "07:00", close: "19:00", tz: "America/Denver", kind: "ballot_return", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; Colo. Rev. Stat. § 1-7-101" },
  CT: { open: "06:00", close: "20:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 8 p.m.; Conn. Gen. Stat. § 9-174" },
  DE: { open: "07:00", close: "20:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Del. Code Ann. tit. 15, §§ 4931, 4947" },
  FL: { open: null, close: "19:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; Fla. Stat. § 100.011; multi-zone; latest zone used (predominant America/New_York)" },
  GA: { open: "07:00", close: "19:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m. Until 8 p.m. for cities with a population of 300,000 or more.; Ga. Code Ann. § 21-2-403" },
  HI: { open: "07:00", close: "19:00", tz: "Pacific/Honolulu", kind: "ballot_return", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; Haw. Rev. Stat. §§ 11-1, 11-131" },
  ID: { open: null, close: "20:00", tz: "America/Los_Angeles", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 8 a.m. to 8 p.m. County clerks may opt to open at 7 a.m. during primary or general elections.; Idaho Code § 34-1101; multi-zone; latest zone used (predominant America/Boise)" },
  IL: { open: "06:00", close: "19:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 7 p.m.; 10 Ill. Comp. Stat. 5/17-1" },
  IN: { open: null, close: "18:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 6 p.m.; Ind. Code § 3-11-8-8; multi-zone; latest zone used (predominant America/Indiana/Indianapolis)" },
  IA: { open: "07:00", close: "20:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Iowa Code § 49.73" },
  KS: { open: null, close: null, tz: "America/Chicago", kind: "polls", basis: "local_variable", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m. for counties in central time zone. 6 a.m. to 6 p.m. for counties in mountain time zone.; Kan. Stat. Ann. § 25-106; multi-zone; latest zone used (predominant America/Chicago); statute default 7 p.m. CT / 6 p.m. MT with county extension to 8 p.m. CT / 7 p.m. MT permitted; actual 2026 county schedule not collected -> close null" },
  KY: { open: null, close: "18:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 6 p.m.; Ky. Rev. Stat. § 118.035; multi-zone; latest zone used (predominant America/Kentucky/Louisville)" },
  LA: { open: "06:00", close: "20:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m. (Polls open at 6 a.m. for congressional elections.); La. Rev. Stat. § 18:541" },
  ME: { open: null, close: "20:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6-8 a.m. to 8 p.m. Opening times are flexible and may be as late as 10 a.m. depending on size of the municipality.; Me. Rev. Stat. Ann. tit. 21-A, § 626" },
  MD: { open: "07:00", close: "20:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Md. Election Law Code Ann. § 10-301" },
  MA: { open: null, close: "20:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 5:45-7 a.m. to 8 p.m. Opening times are flexible.; Mass. Gen. Laws Ann. ch. 54, § 64" },
  MI: { open: null, close: "20:00", tz: "America/Menominee", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Mich. Comp. Laws § 168.720; multi-zone; latest zone used (predominant America/Detroit)" },
  MN: { open: null, close: "20:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Minn. Stat. § 204C.05" },
  MS: { open: "07:00", close: "19:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; Miss. Code Ann. § 23-15-541" },
  MO: { open: "06:00", close: "19:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 7 p.m.; Mo. Rev. Stat. § 115.407" },
  MT: { open: null, close: "20:00", tz: "America/Denver", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Mont. Code Ann. § 13-1-106" },
  NE: { open: null, close: "20:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m. in mountain time zone. 8 a.m. to 8 p.m. in central time zone.; Neb. Rev. Stat. § 32-908; multi-zone; latest zone used (predominant America/Chicago)" },
  NV: { open: "07:00", close: "19:00", tz: "America/Los_Angeles", kind: "ballot_return", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; Nev. Rev. Stat. § 293.273" },
  NH: { open: null, close: null, tz: "America/New_York", kind: "polls", basis: "local_variable", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: Municipalities determine opening time, but must open by 11 a.m. and close no earlier than 7 p.m.; N.H. Rev. Stat. Ann. § 659:4" },
  NJ: { open: "06:00", close: "20:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 8 p.m.; N.J. Rev. Stat. § 19:15-2" },
  NM: { open: "07:00", close: "19:00", tz: "America/Denver", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; N.M. Stat. Ann. § 1-12-1" },
  NY: { open: "06:00", close: "21:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 9 p.m.; N.Y. Elec. Law § 8-100" },
  NC: { open: "06:30", close: "19:30", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6:30 a.m. to 7:30 p.m.; N.C. Gen. Stat. § 163-166.01" },
  ND: { open: null, close: "19:00", tz: "America/Denver", kind: "polls", basis: "statewide_latest", source: "https://vip.sos.nd.gov/Precincts.aspx?eid=348", note: "NCSL: Open between 7-9 a.m. and close between 7-9 p.m.; N.D. Cent. Code § 16.1-01-03; multi-zone; latest zone used (predominant America/Chicago); actual 2026: all 167 polling places close 7 p.m. local" },
  OH: { open: "06:30", close: "19:30", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6:30 a.m. to 7:30 p.m.; Ohio Rev. Code § 3501.32" },
  OK: { open: "07:00", close: "19:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; 26 Okla. Stat. § 7-104" },
  OR: { open: null, close: "20:00", tz: "America/Los_Angeles", kind: "ballot_return", basis: "statewide_latest", source: "https://ballotpedia.org/State_Poll_Opening_and_Closing_Times_(2026)", note: "NCSL: Not specified.; statute: see Ballotpedia; multi-zone; latest zone used (predominant America/Los_Angeles)" },
  PA: { open: "07:00", close: "20:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Pa. Stat. tit. 25, § 3045" },
  RI: { open: "07:00", close: "20:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; R.I. Gen. Laws §§ 17-18-10, 17-18-11" },
  SC: { open: "07:00", close: "19:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; S.C. Code Ann. § 7-13-60" },
  SD: { open: null, close: "19:00", tz: "America/Denver", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; S.D. Codified Laws § 12-2-3; multi-zone; latest zone used (predominant America/Chicago)" },
  TN: { open: null, close: "19:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: Opening times vary by county. Polls close at 8 p.m. in eastern time zone and 7 p.m. in central time zone.; Tenn. Code Ann. § 2-3-201; multi-zone; latest zone used (predominant America/Chicago)" },
  TX: { open: null, close: "19:00", tz: "America/Denver", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; Tex. Elec. Code § 41.031; multi-zone; latest zone used (predominant America/Chicago)" },
  UT: { open: "07:00", close: "20:00", tz: "America/Denver", kind: "ballot_return", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Utah Code Ann. § 20A-1-302" },
  VT: { open: null, close: "19:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: Polls open between 5-10 a.m. as determined by towns. Polls close at 7 p.m.; Vt. Stat. Ann. tit. 17, § 2561" },
  VA: { open: "06:00", close: "19:00", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6 a.m. to 7 p.m.; Va. Code Ann. § 24.2-603" },
  WA: { open: null, close: "20:00", tz: "America/Los_Angeles", kind: "ballot_return", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: Opening time is not specified. Polling places close at 8 p.m.; Wash. Rev. Code § 29A.40.160" },
  WV: { open: "06:30", close: "19:30", tz: "America/New_York", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 6:30 a.m. to 7:30 p.m.; W. Va. Code § 3-1-31" },
  WI: { open: "07:00", close: "20:00", tz: "America/Chicago", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 8 p.m.; Wis. Stat. § 6.78" },
  WY: { open: "07:00", close: "19:00", tz: "America/Denver", kind: "polls", basis: "statewide_latest", source: "https://www.ncsl.org/elections-and-campaigns/polling-places", note: "NCSL: 7 a.m. to 7 p.m.; Wyo. Stat. § 22-13-101" },
};

/**
 * Per-district zone overrides are intentionally EMPTY: several candidate districts
 * (FL-02, ID-01, TX-23) span two zones, so no "wholly in one zone" claim is made.
 * Every row in a multi-zone state carries the statewide latest bound.
 */
export const DISTRICT_TZ_OVERRIDES: Record<string, string> = {};

export const ELECTION_DAY_2026 = "2026-11-03";

/** Extract a district code such as "TX-16" or "AK-AL" from an election title. */
export function districtFromTitle(title: string): string | undefined {
  return (title.match(/\b([A-Z]{2}-(?:\d{2}|AL))\b/) || [])[1];
}

/** Resolve hours + provenance for one election row. */
export function pollHoursFor(state: string, title: string): PollHours | undefined {
  const h = STATE_HOURS[state];
  if (!h) return undefined;
  const district = districtFromTitle(title);
  if (district && DISTRICT_TZ_OVERRIDES[district]) {
    return { ...h, tz: DISTRICT_TZ_OVERRIDES[district], basis: "district_latest" };
  }
  return { ...h }; // overrides are empty today: statewide bound for every row
}

/** The instant at which `close` (local wall-clock in `tz`) occurs on `dateISO`. */
export function pollsCloseInstant(dateISO: string, close: string, tz: string): Date {
  const guess = new Date(`${dateISO}T${close}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const parts = Object.fromEntries(fmt.formatToParts(guess).map(p => [p.type, p.value]));
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
  return new Date(guess.getTime() - (wall - guess.getTime()));
}
