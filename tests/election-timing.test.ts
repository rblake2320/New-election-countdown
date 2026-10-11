import { describe, it, expect } from "vitest";
import { getElectionTiming, getElectionSchedule, phaseAt, parseClockTime, zonedTimeToUtc, splitDuration, isUpcomingElection } from "../client/src/lib/election-timing";

const NOV3 = "2026-11-03T00:00:00.000Z"; // how the API stores election dates

describe("parseClockTime", () => {
  it("reads 24h and 12h forms", () => {
    expect(parseClockTime("19:00")).toBe(19 * 60);
    expect(parseClockTime("7:00 PM")).toBe(19 * 60);
    expect(parseClockTime("8:30pm")).toBe(20 * 60 + 30);
    expect(parseClockTime("7 am")).toBe(7 * 60);
    expect(parseClockTime("12:00 AM")).toBe(0);
    expect(parseClockTime("12 pm")).toBe(12 * 60);
  });
  it("rejects junk", () => {
    expect(parseClockTime(null)).toBeNull();
    expect(parseClockTime("")).toBeNull();
    expect(parseClockTime("25:00")).toBeNull();
    expect(parseClockTime("13 pm")).toBeNull();
    expect(parseClockTime("soon")).toBeNull();
  });
});

describe("zonedTimeToUtc", () => {
  it("handles EST after the DST change (Nov 3 2026 is UTC-5)", () => {
    expect(zonedTimeToUtc(2026, 11, 3, 19 * 60, "America/New_York").toISOString()).toBe("2026-11-04T00:00:00.000Z");
  });
  it("handles EDT before the change (Sept 15 2026 is UTC-4)", () => {
    expect(zonedTimeToUtc(2026, 9, 15, 20 * 60, "America/New_York").toISOString()).toBe("2026-09-16T00:00:00.000Z");
  });
  it("handles Hawaii (no DST, UTC-10)", () => {
    expect(zonedTimeToUtc(2026, 11, 3, 19 * 60, "Pacific/Honolulu").toISOString()).toBe("2026-11-04T05:00:00.000Z");
  });
});

describe("getElectionTiming", () => {
  const ga = { date: NOV3, pollsOpen: "7:00 AM", pollsClose: "7:00 PM", timezone: "America/New_York" };

  it("old bug: does NOT read Election Day at 7 pm ET the evening before", () => {
    const t = getElectionTiming(ga, new Date("2026-11-03T00:30:00Z")); // 7:30 pm ET Nov 2
    expect(t.phase).toBe("upcoming");
    expect(t.target?.toISOString()).toBe("2026-11-03T12:00:00.000Z"); // 7 am EST
  });

  it("counts to polls close while polls are open", () => {
    const t = getElectionTiming(ga, new Date("2026-11-03T15:00:00Z"));
    expect(t.phase).toBe("polls-open");
    expect(t.target?.toISOString()).toBe("2026-11-04T00:00:00.000Z");
    expect(t.approximate).toBe(false);
  });

  it("stops counting once polls close, then reads completed after the window", () => {
    expect(getElectionTiming(ga, new Date("2026-11-04T01:00:00Z")).phase).toBe("polls-closed");
    expect(getElectionTiming(ga, new Date("2026-11-04T01:00:00Z")).target).toBeNull();
    expect(getElectionTiming(ga, new Date("2026-12-01T00:00:00Z")).phase).toBe("completed");
  });

  it("past Delaware primary (Sept 15) is not shown as Election Day on Oct 11", () => {
    const t = getElectionTiming({ date: "2026-09-15T00:00:00.000Z", timezone: "America/New_York" }, new Date("2026-10-11T12:00:00Z"));
    expect(t.phase).toBe("completed");
  });

  it("without poll hours, the whole calendar day is election day and the result is flagged approximate", () => {
    const e = { date: NOV3, timezone: "America/Chicago" };
    expect(getElectionTiming(e, new Date("2026-11-03T04:00:00Z")).phase).toBe("upcoming"); // 10 pm CST Nov 2
    const t = getElectionTiming(e, new Date("2026-11-03T18:00:00Z"));
    expect(t.phase).toBe("election-day");
    expect(t.target?.toISOString()).toBe("2026-11-04T06:00:00.000Z"); // midnight CST
    expect(t.approximate).toBe(true);
  });

  it("ignores an invalid zone instead of throwing", () => {
    expect(() => getElectionTiming({ date: NOV3, timezone: "Mars/Olympus" })).not.toThrow();
  });
});

describe("splitDuration", () => {
  it("splits and clamps", () => {
    expect(splitDuration(90061000)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(splitDuration(-5)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});

describe("isUpcomingElection (matches lane C server rule)", () => {
  const nov3 = (timezone?: string) => ({ date: "2026-11-03T00:00:00.000Z", timezone });
  const at = (iso: string) => new Date(iso);
  it("keeps a Nov 3 Hawaii race at 05:30 UTC Nov 4 (7:30 pm HST)", () => {
    expect(isUpcomingElection(nov3("Pacific/Honolulu"), at("2026-11-04T05:30:00Z"))).toBe(true);
  });
  it("keeps Aleutian Nov 3 but drops New York Nov 3 once it is Nov 4 there", () => {
    expect(isUpcomingElection(nov3("America/Adak"), at("2026-11-04T06:30:00Z"))).toBe(true);
    expect(isUpcomingElection(nov3("America/New_York"), at("2026-11-04T06:30:00Z"))).toBe(false);
  });
  it("unknown zone falls back to UTC-11, never UTC midnight", () => {
    expect(isUpcomingElection(nov3(), at("2026-11-04T05:30:00Z"))).toBe(true);
    expect(isUpcomingElection(nov3(), at("2026-11-04T11:30:00Z"))).toBe(false);
  });
  it("drops the past Sept 15 primary", () => {
    expect(isUpcomingElection({ date: "2026-09-15T00:00:00.000Z", timezone: "America/New_York" }, at("2026-10-11T12:00:00Z"))).toBe(false);
  });
});

describe("lane C review probes (PR #4)", () => {
  it("known close + unknown open is not reported as 'Polls open' (Maine-style local hours)", () => {
    const e = { date: "2026-11-03", timezone: "America/New_York", pollsClose: "20:00", pollsOpen: null };
    const t = getElectionTiming(e, new Date("2026-11-03T05:30:00Z")); // 00:30 ET on election day
    expect(t.phase).toBe("election-day");
    expect(t.statusLabel).not.toMatch(/Polls open/);
    expect(t.target?.toISOString()).toBe("2026-11-04T01:00:00.000Z"); // still counts to the known close
    expect(t.approximate).toBe(true);
  });
  it("schedule is computed once; 500 phase checks stay cheap", () => {
    const s = getElectionSchedule({ date: "2026-11-03", timezone: "America/Chicago", pollsOpen: "7:00 AM", pollsClose: "7:00 PM" });
    const t0 = performance.now();
    for (let i = 0; i < 500; i++) phaseAt(s, new Date(Date.UTC(2026, 10, 3, 15, i % 60)));
    expect(performance.now() - t0).toBeLessThan(20);
    const t1 = performance.now();
    for (let i = 0; i < 500; i++) getElectionTiming({ date: "2026-11-03", timezone: "America/Chicago", pollsClose: "19:00" }, new Date(Date.UTC(2026, 10, 3, 15, i % 60)));
    expect(performance.now() - t1).toBeLessThan(100); // cached Intl formatters (was ~217 ms per Sol's probe)
  });
});
