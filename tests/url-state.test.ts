import { describe, it, expect } from "vitest";
import { readHomeUrl, writeHomeUrl } from "../client/src/lib/url-state";

describe("home URL state (ET-29)", () => {
  it("round-trips search, filters and view", () => {
    const qs = writeHomeUrl({ q: "Alaska", filters: { level: ["federal"], party: ["D", "R"], state: "AK", timeframe: "next-30-days" } as any, view: "list" });
    expect(qs).toBe("?q=Alaska&state=AK&timeframe=next-30-days&level=federal&party=D%2CR&view=list");
    const back = readHomeUrl(qs);
    expect(back).toMatchObject({ q: "Alaska", view: "list", present: true, filters: { state: "AK", timeframe: "next-30-days", level: ["federal"], party: ["D", "R"] } });
  });
  it("defaults stay out of the URL; empty URL is 'not present'", () => {
    expect(writeHomeUrl({ q: "  ", filters: { timeframe: "all", level: [] } as any, view: "grid" })).toBe("");
    expect(readHomeUrl("").present).toBe(false);
  });
});
