import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import ElectionDetails from "../client/src/pages/election-details";

// Synthetic isolated timing fixture at the data boundary only. The receiving
// page, real CountdownTimer, timing hook, Radix UI and router are unmodified.
const fixture = vi.hoisted(() => ({
  id: 900,
  title: "Texas election timing acceptance fixture",
  date: "2026-11-03T00:00:00.000Z",
  state: "Texas",
  level: "federal",
  type: "General",
  pollsOpen: "07:00",
  pollsClose: "19:00",
  timezone: "America/Chicago",
  pollCloseKind: "polls",
  pollHoursBasis: "statewide_latest",
  pollHoursSource: "https://www.sos.state.tx.us/elections/",
}));

vi.mock("../client/src/hooks/use-elections", () => ({
  useElection: () => ({ data: fixture, isLoading: false }),
  useCandidates: () => ({ data: [], isLoading: false }),
}));
// Added by lane B with the general-roster card: same data-boundary mock, so the
// page renders without network (the card renders nothing for null data).
vi.mock("../client/src/hooks/use-general-roster", () => ({
  useGeneralRoster: () => ({ data: null, isLoading: false, error: null }),
}));
// Added by lane B with the ET-6 results card: same data-boundary rule; no result
// has been ingested, which is what the timing scenarios assume.
vi.mock("../client/src/lib/live-results", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../client/src/lib/live-results")>()),
  useLiveElectionResults: (electionId: number) => ({
    data: { etag: null, data: { schemaVersion: 1, electionId, reportId: null, revision: null, status: "none", reporting: null, source: null,
      sourcePayloadSha256: null, asOf: null, asOfBasis: null, retrievedAt: null, totalVotes: null, candidates: [], winnerCalledBy: null,
      certification: null, supersedesReportId: null, history: [], stale: false, staleSince: null } },
    isLoading: false, error: null, refetch: () => {},
  }),
}));
vi.mock("../client/src/hooks/use-polling-trends", () => ({
  usePollingTrends: () => ({ data: { pollingData: [] }, isLoading: false }),
}));

function renderActualDetail(at: string) {
  vi.setSystemTime(new Date(at));
  const { hook } = memoryLocation({ path: "/elections/900" });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const view = render(
    <QueryClientProvider client={client}>
      <Router hook={hook}>
        <Route path="/elections/:id"><ElectionDetails /></Route>
      </Router>
    </QueryClientProvider>,
  );
  console.log(JSON.stringify({
    scenario: at,
    browserZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localClock: new Date().toString(),
    electionZone: fixture.timezone,
    closeKind: fixture.pollCloseKind,
    pastBadge: Boolean(screen.queryByText("Past Election")),
    upcomingBadge: Boolean(screen.queryByText("Upcoming")),
    timerCount: screen.queryAllByRole("timer").length,
    timerLabel: screen.queryByRole("timer")?.getAttribute("aria-label") ?? null,
    text: view.container.textContent,
  }));
  return view;
}

describe("actual election detail preserves active election-day timing", () => {
  beforeEach(() => {
    Object.assign(fixture, { title: "Texas election timing acceptance fixture", state: "Texas", pollsOpen: "07:00", pollsClose: "19:00", timezone: "America/Chicago", pollCloseKind: "polls" });
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Network forbidden in isolated review"))));
  });
  afterEach(() => {
    expect(fetch).not.toHaveBeenCalled();
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("control: day before election shows real countdown to Texas poll opening", () => {
    renderActualDetail("2026-11-02T11:30:00Z");
    expect(screen.queryByText("Past Election")).toBeNull();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("until polls open");
  });

  it("06:30 Eastern on election day: Texas polls have not opened, so keep countdown", () => {
    renderActualDetail("2026-11-03T11:30:00Z");
    expect(screen.queryByText("Past Election")).toBeNull();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("until polls open");
  });

  it("during Texas voting: retain actual countdown to poll closing", () => {
    renderActualDetail("2026-11-03T15:00:00Z");
    expect(screen.queryByText("Past Election")).toBeNull();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("until polls close");
  });

  it("mounted detail changes Upcoming to Election Day when Texas polls open", () => {
    const view = renderActualDetail("2026-11-03T12:59:30Z");
    const originalHeading = view.container.querySelector("h1");
    expect(screen.queryByText("Upcoming")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(view.container.querySelector("h1")).toBe(originalHeading);
    expect(screen.queryByText("Upcoming")).toBeNull();
    expect(screen.queryByText("Election Day")).not.toBeNull();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("until polls close");
    console.log(JSON.stringify({ rollover: "Texas opening", at: new Date().toISOString(), badge: "Election Day", timer: screen.getByRole("timer").getAttribute("aria-label"), sameMountedHeading: true }));
  });

  it("mounted detail changes Election Day to Polls closed after Texas closes", () => {
    const view = renderActualDetail("2026-11-04T00:59:30Z");
    const originalHeading = view.container.querySelector("h1");
    expect(screen.queryByText("Election Day")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(view.container.querySelector("h1")).toBe(originalHeading);
    expect(screen.queryByText("Election Day")).toBeNull();
    expect(screen.queryByText("Polls closed")).not.toBeNull();
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Polls closed · results pending");
    console.log(JSON.stringify({ rollover: "Texas closing", at: new Date().toISOString(), badge: "Polls closed", status: screen.getByRole("status").textContent, sameMountedHeading: true }));
  });

  it("unknown opening on a ballot-return election says deadline pending", () => {
    Object.assign(fixture, { title: "Oregon ballot deadline acceptance fixture", state: "Oregon", pollsOpen: null, pollsClose: "20:00", timezone: "America/Los_Angeles", pollCloseKind: "ballot_return" });
    renderActualDetail("2026-11-03T08:30:00Z");
    expect(screen.queryByText(/ballot drop-off open/)).toBeNull();
    expect(screen.queryByText("Election Day · ballot drop-off deadline pending")).not.toBeNull();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("until ballot drop-off deadline");
  });

  it("ballot-return deadline passed must not call mail-election polls closed", () => {
    Object.assign(fixture, { title: "Oregon ballot deadline acceptance fixture", state: "Oregon", pollsOpen: null, pollsClose: "20:00", timezone: "America/Los_Angeles", pollCloseKind: "ballot_return" });
    renderActualDetail("2026-11-04T04:01:00Z");
    expect(screen.getByRole("status").textContent).toContain("Ballot drop-off closed · results pending");
    expect(screen.queryByText("Polls closed")).toBeNull();
  });
});
