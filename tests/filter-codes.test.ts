import { describe, it, expect } from "vitest";
import { normalizeFilters, isUpcomingTimeframe, partyLabel, levelLabel } from "../client/src/lib/filter-codes";

describe("normalizeFilters", () => {
  it("maps labels saved by older builds onto API codes", () => {
    const f = normalizeFilters({ level: ["Federal", "State"], party: ["Democratic", "Republican", "Other"] } as any);
    expect(f.level).toEqual(["federal", "state"]);
    expect(f.party).toEqual(["D", "R", "O"]);
  });
  it("keeps codes as-is, dedupes, and drops empty lists", () => {
    const f = normalizeFilters({ level: ["federal", "Federal"], party: [], timeframe: "all" } as any);
    expect(f.level).toEqual(["federal"]);
    expect(f.party).toBeUndefined();
    expect(f.timeframe).toBeUndefined();
  });
  it("accepts a single string value", () => {
    expect(normalizeFilters({ party: "democrat" } as any).party).toEqual(["D"]);
  });
});

describe("labels and timeframes", () => {
  it("labels codes for chips", () => {
    expect(partyLabel("D")).toBe("Democratic");
    expect(levelLabel("local")).toBe("Local");
  });
  it("treats next-* as upcoming-only", () => {
    expect(isUpcomingTimeframe("next-30-days")).toBe(true);
    expect(isUpcomingTimeframe(undefined)).toBe(false);
    expect(isUpcomingTimeframe("all")).toBe(false);
  });
});
