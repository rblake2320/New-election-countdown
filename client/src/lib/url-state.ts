import type { ElectionFilters } from "@shared/schema";

// Home page state in the URL, so Back from an election returns to the same
// search, filters and view (owner UX review: Back reset an Alaska search to all
// 506 races). Only non-default values are written; the URL stays readable:
//   /?q=alaska&level=federal&party=D,R&view=list

export interface HomeUrlState {
  q?: string;
  filters: Partial<ElectionFilters>;
  view?: "grid" | "list";
}

const LIST_KEYS = ["level", "party", "electionType", "type"] as const;
const SCALAR_KEYS = ["state", "timeframe"] as const;

export function readHomeUrl(search: string): HomeUrlState & { present: boolean } {
  const p = new URLSearchParams(search);
  const filters: Partial<ElectionFilters> = {};
  for (const k of SCALAR_KEYS) { const v = p.get(k); if (v) (filters as any)[k] = v; }
  for (const k of LIST_KEYS) { const v = p.get(k); if (v) (filters as any)[k] = v.split(",").filter(Boolean); }
  const view = p.get("view");
  const present = ["q", "view", ...SCALAR_KEYS, ...LIST_KEYS].some(k => p.has(k));
  return { q: p.get("q") || undefined, filters, view: view === "list" ? "list" : view === "grid" ? "grid" : undefined, present };
}

export function writeHomeUrl(s: HomeUrlState): string {
  const p = new URLSearchParams();
  if (s.q?.trim()) p.set("q", s.q.trim());
  for (const k of SCALAR_KEYS) { const v = (s.filters as any)[k]; if (typeof v === "string" && v && v !== "all") p.set(k, v); }
  for (const k of LIST_KEYS) { const v = [(s.filters as any)[k] ?? []].flat().filter(Boolean); if (v.length) p.set(k, v.join(",")); }
  if (s.view === "list") p.set("view", "list");
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
