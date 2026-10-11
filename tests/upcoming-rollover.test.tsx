import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useNow } from "../client/src/hooks/use-now";
import { isUpcomingElection } from "../client/src/lib/election-timing";

// Lane C review of PR #4: home/Featured membership was memoized without a clock,
// so a race stayed "upcoming" past midnight until something refetched.
function UpcomingList({ elections }: { elections: { id: number; date: string; timezone: string }[] }) {
  const now = new Date(useNow(60_000));
  const shown = elections.filter(e => isUpcomingElection(e, now));
  return <ul>{shown.map(e => <li key={e.id}>race-{e.id}</li>)}</ul>;
}

describe("upcoming membership rolls over on the shared minute clock", () => {
  afterEach(() => vi.useRealTimers());

  it("drops a New York Nov 3 race one minute after midnight Eastern, keeps Hawaii", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T04:59:30Z")); // 23:59:30 ET Nov 3
    render(<UpcomingList elections={[
      { id: 1, date: "2026-11-03T00:00:00.000Z", timezone: "America/New_York" },
      { id: 2, date: "2026-11-03T00:00:00.000Z", timezone: "Pacific/Honolulu" },
    ]} />);
    expect(screen.queryByText("race-1")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(60_000); }); // 00:00:30 ET Nov 4
    expect(screen.queryByText("race-1")).toBeNull();
    expect(screen.queryByText("race-2")).not.toBeNull();
  });
});
