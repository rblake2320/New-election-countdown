import type { ElectionFilters } from "@shared/schema";

// Filter values the client sends to /api/elections (agreed with lane C on the
// team board). Labels are display-only; earlier builds sent the labels
// ("Federal", "Democratic"), which the server never matched.

export const LEVEL_OPTIONS = [
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "local", label: "Local" },
] as const;

export const PARTY_OPTIONS = [
  { value: "D", label: "Democratic" },
  { value: "R", label: "Republican" },
  { value: "I", label: "Independent" },
  { value: "G", label: "Green" },
  { value: "L", label: "Libertarian" },
  { value: "O", label: "Other" },
] as const;

export const TIMEFRAME_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "next-30-days", label: "Next 30 Days" },
  { value: "next-90-days", label: "Next 90 Days" },
  { value: "next-6-months", label: "Next 6 Months" },
  { value: "next-year", label: "Next Year" },
] as const;

const LEGACY_PARTY: Record<string, string> = {
  democratic: "D", democrat: "D", republican: "R", independent: "I", green: "G", libertarian: "L", other: "O",
};

function toList(v: string | string[] | undefined): string[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

const label = (opts: readonly { value: string; label: string }[], v: string) =>
  opts.find(o => o.value === v)?.label ?? v;

export const levelLabel = (v: string) => label(LEVEL_OPTIONS, v);
export const partyLabel = (v: string) => label(PARTY_OPTIONS, v);
export const timeframeLabel = (v: string) => label(TIMEFRAME_OPTIONS, v);

/** Map labels saved by older builds (e.g. in localStorage) onto codes. */
export function normalizeFilters(filters: ElectionFilters): ElectionFilters {
  const level = toList(filters.level).map(v => v.toLowerCase());
  const party = toList(filters.party).map(v => LEGACY_PARTY[v.toLowerCase()] ?? v.toUpperCase());
  return {
    ...filters,
    level: level.length ? Array.from(new Set(level)) : undefined,
    party: party.length ? Array.from(new Set(party)) : undefined,
    timeframe: filters.timeframe === "all" ? undefined : filters.timeframe,
  };
}

/** Upcoming-only timeframes never include races whose calendar date has passed. */
export function isUpcomingTimeframe(timeframe: string | undefined): boolean {
  return !!timeframe && timeframe.startsWith("next-");
}
