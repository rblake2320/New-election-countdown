// Election-day timing: when the countdown should end and what state a race is in.
//
// `election.date` is stored as a calendar date (midnight UTC). The moment that
// matters to a voter is polls closing in the election's own time zone, so the
// countdown targets that instead of midnight UTC (which fired "Election Day!"
// at 7 pm ET the evening before).

export type ElectionPhase = "upcoming" | "election-day" | "polls-open" | "polls-closed" | "completed";

export interface ElectionTimingInput {
  date: string | Date;
  pollsOpen?: string | null;
  pollsClose?: string | null;
  timezone?: string | null;
  /** What the close time is (proposed C3 contract): polls closing, or a mail-ballot return deadline. */
  pollCloseKind?: "polls" | "ballot_return" | null;
  /** How the close was derived; only a latest-close basis makes a countdown exact. */
  pollHoursBasis?: "statewide_latest" | "district_latest" | "local_variable" | null;
  pollHoursSource?: string | null;
}

/**
 * exact: verified latest close in a known zone. unverified: hours present but
 * no basis recorded. local_variable: closes vary locally. unpublished: no
 * close or no zone. Anything but exact is shown with a qualifier.
 */
export type TimingPrecision = "exact" | "unverified" | "local_variable" | "unpublished";

export interface ElectionTiming {
  phase: ElectionPhase;
  /** Moment the countdown runs to; null once there is nothing left to count down to. */
  target: Date | null;
  /** What the countdown is counting to, e.g. "until polls close". */
  targetLabel: string;
  /** Short status text for non-countdown phases. */
  statusLabel: string;
  /** True unless precision is "exact". */
  approximate: boolean;
  precision: TimingPrecision;
}

/** Days after polls close that a race reads "polls closed" before "completed". */
export const POLLS_CLOSED_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse "19:00", "7:00 PM", "7 pm", "8:30pm" into minutes after midnight. */
export function parseClockTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?$/i) ?? value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = m[2] ? Number(m[2]) : 0;
  const meridiem = m[3]?.toLowerCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "p" && hours !== 12) hours += 12;
    if (meridiem === "a" && hours === 12) hours = 0;
  }
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const zoneValidity = new Map<string, boolean>();

function isValidZone(zone: string | null | undefined): zone is string {
  if (!zone) return false;
  let ok = zoneValidity.get(zone);
  if (ok === undefined) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: zone });
      ok = true;
    } catch {
      ok = false;
    }
    zoneValidity.set(zone, ok);
  }
  return ok;
}

/** Offset (ms) of `zone` from UTC at instant `utcMs`. */
const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function zoneOffsetMs(utcMs: number, zone: string): number {
  let fmt = dateTimeFormats.get(zone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    dateTimeFormats.set(zone, fmt);
  }
  const parts = fmt.formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The UTC instant of wall-clock `minutes` after midnight on y-m-d in `zone` (viewer's zone if null). */
export function zonedTimeToUtc(y: number, m: number, d: number, minutes: number, zone: string | null): Date {
  if (!zone) return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  // Two passes settle DST boundaries.
  let utc = guess - zoneOffsetMs(guess, zone);
  utc = guess - zoneOffsetMs(utc, zone);
  return new Date(utc);
}

/** Calendar date (y, m, d) of an election; stored values are midnight UTC. */
export function electionCalendarDate(date: string | Date): [number, number, number] {
  if (typeof date === "string") {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  const dt = new Date(date);
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
}

/** The fixed instants for one election; depends only on the record, so compute once and reuse every tick. */
export interface ElectionSchedule {
  dayStart: Date;
  /** Null when the opening time is not published. */
  opens: Date | null;
  /** Polls close, or the end of the calendar day when closing time is not published. */
  closes: Date;
  closeKnown: boolean;
  closeKind: "polls" | "ballot_return";
  precision: TimingPrecision;
}

export function getElectionSchedule(election: ElectionTimingInput): ElectionSchedule {
  const [y, m, d] = electionCalendarDate(election.date);
  const zone = isValidZone(election.timezone) ? election.timezone : null;
  const openMin = parseClockTime(election.pollsOpen);
  const closeMin = parseClockTime(election.pollsClose);
  const dayStart = zonedTimeToUtc(y, m, d, 0, zone);
  return {
    dayStart,
    opens: openMin != null ? zonedTimeToUtc(y, m, d, openMin, zone) : null,
    closes: closeMin != null ? zonedTimeToUtc(y, m, d, closeMin, zone) : zonedTimeToUtc(y, m, d, 24 * 60, zone),
    closeKnown: closeMin != null,
    closeKind: election.pollCloseKind === "ballot_return" ? "ballot_return" : "polls",
    precision: !zone || closeMin == null ? "unpublished"
      : election.pollHoursBasis === "local_variable" ? "local_variable"
      : election.pollHoursBasis === "statewide_latest" || election.pollHoursBasis === "district_latest" ? "exact"
      : "unverified",
  };
}

/** Phase at `now`: plain comparisons, cheap enough for every card every second. */
export function phaseAt(s: ElectionSchedule, now: Date): ElectionTiming {
  const t = now.getTime();
  const precision = s.precision;
  const out = (phase: ElectionPhase, target: Date | null, targetLabel: string, statusLabel: string, p: TimingPrecision = precision): ElectionTiming =>
    ({ phase, target, targetLabel, statusLabel, precision: p, approximate: p !== "exact" });
  const ballots = s.closeKind === "ballot_return";
  if (s.opens && t < s.opens.getTime() && !ballots) return out("upcoming", s.opens, "until polls open", "Upcoming");
  if ((!s.opens || ballots) && t < s.dayStart.getTime()) return out("upcoming", s.dayStart, "until Election Day", "Upcoming");
  if (t < s.closes.getTime()) {
    // A mail-ballot state's deadline is not a polls close.
    if (ballots) return out("election-day", s.closes, "until ballot return deadline", "Ballots due today");
    // "Polls open" only when both ends are published; an unknown opening time
    // (e.g. towns that set their own hours) must not be reported as open at 00:30.
    if (s.opens && s.closeKnown) return out("polls-open", s.closes, "until polls close", "Polls open");
    return s.closeKnown
      ? out("election-day", s.closes, "until polls close", "Election Day · opening times vary", precision === "exact" ? "unverified" : precision)
      : out("election-day", s.closes, "left on Election Day", "Election Day");
  }
  if (t < s.closes.getTime() + POLLS_CLOSED_WINDOW_DAYS * DAY_MS) {
    return out("polls-closed", null, "", ballots ? "Ballot deadline passed · results pending" : "Polls closed · results pending");
  }
  return out("completed", null, "", "Election held");
}

export function getElectionTiming(election: ElectionTimingInput, now: Date = new Date()): ElectionTiming {
  return phaseAt(getElectionSchedule(election), now);
}

export interface TimeParts { days: number; hours: number; minutes: number; seconds: number }

export function splitDuration(ms: number): TimeParts {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** Fallback when a race has no known zone: UTC-11 keeps a date "today" until every US poll has closed. */
const WESTERNMOST_OFFSET_MS = 11 * 60 * 60 * 1000;

/** Today's calendar date as yyyymmdd in `zone` (or the UTC-11 fallback). */
function calendarKeyNow(now: Date, zone: string | null): number {
  if (zone) {
    let fmt = dateFormats.get(zone);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
      dateFormats.set(zone, fmt);
    }
    const parts = fmt.formatToParts(now);
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
    return get("year") * 10000 + get("month") * 100 + get("day");
  }
  const shifted = new Date(now.getTime() - WESTERNMOST_OFFSET_MS);
  return shifted.getUTCFullYear() * 10000 + (shifted.getUTCMonth() + 1) * 100 + shifted.getUTCDate();
}

/**
 * True while the election's date has not passed in its own time zone. Same rule
 * as the server's upcoming filter (lane C): a Nov 3 Hawaii race stays upcoming
 * after midnight UTC and after midnight Eastern.
 */
export function isUpcomingElection(election: ElectionTimingInput, now: Date = new Date()): boolean {
  const [y, m, d] = electionCalendarDate(election.date);
  const zone = isValidZone(election.timezone) ? election.timezone : null;
  return y * 10000 + m * 100 + d >= calendarKeyNow(now, zone);
}
