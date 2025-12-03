import { DateTime } from "luxon";

export function parseUTC(input?: string | number | Date) {
  if (!input) return null;
  const dt = typeof input === "string"
    ? DateTime.fromISO(input, { zone: "utc" })
    : DateTime.fromJSDate(new Date(input), { zone: "utc" });
  return dt.isValid ? dt : null;
}

export function formatDateLocal(iso?: string, zone = "utc") {
  // Always use UTC to avoid timezone issues with election dates
  const dt = parseUTC(iso)?.setZone("utc");
  return dt ? dt.toFormat("EEE, LLL d, yyyy") : "Date TBD";
}

/** Status-aware countdown with 2-unit format */
export function formatCountdown(iso?: string, zone = "local") {
  const t = parseUTC(iso)?.setZone(zone);
  if (!t) return { label: "TBD", urgent: false, live: false, severity: "neutral" as const };
  
  const now = DateTime.now().setZone(zone);
  if (now.hasSame(t, "day")) return { label: "Today", urgent: true, live: false, severity: "urgent" as const };
  if (now > t) return { label: "Completed", urgent: false, live: false, severity: "neutral" as const };
  
  const diff = t.diffNow(["days", "hours", "minutes", "seconds"]);
  const d = Math.floor(diff.days);
  const h = Math.floor(diff.hours);
  const m = Math.floor(diff.minutes);
  const s = Math.max(0, Math.floor(diff.seconds));

  if (d === 0 && h === 0) return { label: `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`, urgent: true,  live: true, severity: "urgent" as const  };
  if (d === 0)             return { label: `${h}h ${m}m`,                                        urgent: true,  live: false, severity: "urgent" as const };
  return                           { label: `${d}d ${h}h`,                                        urgent: false, live: false, severity: "normal" as const };
}