import { describe, it, expect } from "vitest";
import { STATE_HOURS, DISTRICT_TZ_OVERRIDES, pollHoursFor, pollsCloseInstant, ELECTION_DAY_2026 } from "../../server/poll-hours-2026";

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// Independent cross-check: 270toWin "Poll Closing Times" (Eastern). For multi-zone states the
// LATEST listed zone is used because our tz is the latest-zone statewide bound.
// NH (municipal) and KS (county extension permitted, actual schedule not collected) have null close and are skipped.
const EASTERN_CLOSE_270: Record<string, string> = {
  IN:"19:00", KY:"19:00", FL:"20:00", GA:"19:00", SC:"19:00", VT:"19:00", VA:"19:00",
  NC:"19:30", OH:"19:30", WV:"19:30",
  AL:"20:00", CT:"20:00", DE:"20:00", IL:"20:00", ME:"20:00", MD:"20:00", MA:"20:00",
  MS:"20:00", MO:"20:00", NJ:"20:00", OK:"20:00", PA:"20:00", RI:"20:00", TN:"20:00",
  AR:"20:30",
  AZ:"21:00", CO:"21:00", IA:"21:00", LA:"21:00", MI:"21:00", MN:"21:00", NE:"21:00", NM:"21:00", NY:"21:00",
  ND:"21:00", SD:"21:00", TX:"21:00", WI:"21:00", WY:"21:00",
  MT:"22:00", NV:"22:00", UT:"22:00",
  CA:"23:00", ID:"23:00", OR:"23:00", WA:"23:00",
  HI:"24:00", AK:"25:00",
};

function easternWallClock(d: Date): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit", day: "2-digit" }).formatToParts(d).map(p => [p.type, p.value]));
  const hour = Number(parts.hour) % 24;
  const isNextDay = parts.day === "04";
  return `${String(isNextDay ? hour + 24 : hour).padStart(2, "0")}:${parts.minute}`;
}

describe("poll hours 2026 - table integrity", () => {
  it("covers all 50 states exactly", () => {
    expect(Object.keys(STATE_HOURS).sort()).toEqual([...STATES].sort());
  });
  it("valid zones, HH:MM times, close after open, provenance on every row", () => {
    for (const [st, h] of Object.entries(STATE_HOURS)) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: h.tz })).not.toThrow();
      if (h.close) expect(h.close).toMatch(/^\d{2}:\d{2}$/);
      if (h.open) expect(h.open).toMatch(/^\d{2}:\d{2}$/);
      if (h.open && h.close) expect(h.close > h.open, `${st} close must be after open`).toBe(true);
      expect(h.source).toMatch(/^https:\/\//);
      expect(["polls", "ballot_return"]).toContain(h.kind);
      expect(["statewide_latest", "district_latest", "local_variable"]).toContain(h.basis);
      if (h.close === null) expect(h.basis).toBe("local_variable"); else expect(h.basis).toBe("statewide_latest");
    }
    for (const tz of Object.values(DISTRICT_TZ_OVERRIDES)) expect(() => new Intl.DateTimeFormat("en-US", { timeZone: tz })).not.toThrow();
  });
  it("every state's latest close, converted to Eastern, matches the 270toWin table", () => {
    const mismatches: string[] = [];
    for (const st of STATES) {
      const h = STATE_HOURS[st];
      if (!h.close) { expect(["NH", "KS"]).toContain(st); continue; }
      const et = easternWallClock(pollsCloseInstant(ELECTION_DAY_2026, h.close, h.tz));
      if (et !== EASTERN_CLOSE_270[st]) mismatches.push(`${st}: ours ${h.close} ${h.tz} -> ${et} ET, 270toWin ${EASTERN_CLOSE_270[st]}`);
    }
    expect(mismatches).toEqual([]);
  });
  it("vote-by-mail states are marked ballot_return", () => {
    for (const st of ["CA", "CO", "HI", "NV", "OR", "UT", "WA"]) expect(STATE_HOURS[st].kind).toBe("ballot_return");
    expect(STATE_HOURS["TX"].kind).toBe("polls");
  });
});

describe("pollHoursFor", () => {
  it("every row in a multi-zone state carries the statewide latest bound (no district exactness claims)", () => {
    expect(Object.keys(DISTRICT_TZ_OVERRIDES)).toEqual([]);
    expect(pollHoursFor("TX", "U.S. House Election - TX-16")).toMatchObject({ tz: "America/Denver", basis: "statewide_latest", open: null });
    expect(pollHoursFor("TX", "U.S. Senate Election - Texas")).toMatchObject({ tz: "America/Denver", basis: "statewide_latest" });
    expect(pollHoursFor("FL", "U.S. House Election - FL-02")).toMatchObject({ tz: "America/Chicago", basis: "statewide_latest", open: null });
    expect(pollHoursFor("AK", "U.S. House Election - AK-AL")).toMatchObject({ tz: "America/Adak", basis: "statewide_latest", open: null });
    expect(pollHoursFor("KS", "Kansas Gubernatorial Election")).toMatchObject({ close: null, open: null, basis: "local_variable" });
    expect(pollHoursFor("OR", "U.S. Senate Election - Oregon")).toMatchObject({ tz: "America/Los_Angeles", close: "20:00" });
  });
  it("preserves unknowns: NH has no statewide close; ND uses the sourced actual 19:00 Mountain bound", () => {
    expect(pollHoursFor("NH", "U.S. Senate Election - New Hampshire")).toMatchObject({ close: null, basis: "local_variable" });
    expect(pollHoursFor("KS", "U.S. Senate Election - Kansas")).toMatchObject({ close: null, basis: "local_variable" });
    expect(pollHoursFor("ND", "U.S. House Election - ND-AL")).toMatchObject({ close: "19:00", tz: "America/Denver", source: expect.stringContaining("vip.sos.nd.gov") });
    for (const st of ["ME", "MA", "MN", "MT", "VT", "ID", "OR", "TN", "WA", "NE", "ND", "NH", "AL", "AK", "FL", "IN", "KS", "KY", "MI", "SD", "TX", "RI"]) expect(STATE_HOURS[st].open, st).toBeNull();
  });
  it("returns undefined for unknown states (script reports them instead of guessing)", () => {
    expect(pollHoursFor("DC", "Mayor")).toBeUndefined();
  });
});
