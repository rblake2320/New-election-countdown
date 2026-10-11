import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
});
