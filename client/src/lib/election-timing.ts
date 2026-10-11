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
}

export interface ElectionTiming {
  phase: ElectionPhase;
  /** Moment the countdown runs to; null once there is nothing left to count down to. */
  target: Date | null;
  /** What the countdown is counting to, e.g. "until polls close". */
  targetLabel: string;
  /** Short status text for non-countdown phases. */
  statusLabel: string;
  /** True when poll hours / zone were missing and we fell back to calendar dates. */
  approximate: boolean;
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

function isValidZone(zone: string | null | undefined): zone is string {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) of `zone` from UTC at instant `utcMs`. */
function zoneOffsetMs(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
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

export function getElectionTiming(election: ElectionTimingInput, now: Date = new Date()): ElectionTiming {
  const [y, m, d] = electionCalendarDate(election.date);
  const zone = isValidZone(election.timezone) ? election.timezone : null;
  const openMin = parseClockTime(election.pollsOpen);
  const closeMin = parseClockTime(election.pollsClose);

  const dayStart = zonedTimeToUtc(y, m, d, 0, zone);
  const opens = openMin != null ? zonedTimeToUtc(y, m, d, openMin, zone) : null;
  // No poll hours: treat the whole calendar day as election day.
  const closes = closeMin != null ? zonedTimeToUtc(y, m, d, closeMin, zone) : new Date(zonedTimeToUtc(y, m, d, 0, zone).getTime() + DAY_MS);
  const approximate = !zone || closeMin == null;
  const t = now.getTime();

  if (opens && t < opens.getTime()) {
    return { phase: "upcoming", target: opens, targetLabel: "until polls open", statusLabel: "Upcoming", approximate };
  }
  if (!opens && t < dayStart.getTime()) {
    return { phase: "upcoming", target: dayStart, targetLabel: "until Election Day", statusLabel: "Upcoming", approximate };
  }
  if (t < closes.getTime()) {
    return opens || closeMin != null
      ? { phase: "polls-open", target: closes, targetLabel: "until polls close", statusLabel: "Polls open", approximate }
      : { phase: "election-day", target: closes, targetLabel: "left on Election Day", statusLabel: "Election Day", approximate };
  }
  if (t < closes.getTime() + POLLS_CLOSED_WINDOW_DAYS * DAY_MS) {
    return { phase: "polls-closed", target: null, targetLabel: "", statusLabel: "Polls closed · results pending", approximate };
  }
  return { phase: "completed", target: null, targetLabel: "", statusLabel: "Election held", approximate };
}

export interface TimeParts { days: number; hours: number; minutes: number; seconds: number }

export function splitDuration(ms: number): TimeParts {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
