import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OfficialResultsLink } from "../client/src/components/official-results-link";
import { officialResultsLink } from "../client/src/lib/official-results";

// Real entries from lane C's reviewed manifest (data/official-results/2026-11-03.json @ 554ab902).
const fx = JSON.parse(readFileSync(join(__dirname, "fixtures", "official-results", "c6-554ab902-sample.json"), "utf-8"));
const election = (st: string) => ({ officialResultsUrl: fx.states[st].officialResultsUrl, officialResultsSource: fx.states[st].source });

describe("official results link (C6 receiving)", () => {
  afterEach(() => cleanup());

  it("NH: blocked route with no destination -> nothing rendered", () => {
    const { container } = render(<OfficialResultsLink election={election("NH")} />);
    expect(container.textContent).toBe("");
  });

  it("MI: gateway, status unknown -> generic portal label, no claim that Nov 3 returns are there", () => {
    render(<OfficialResultsLink election={election("MI")} />);
    const a = screen.getByRole("link", { name: /Official election results portal/ });
    expect(a.getAttribute("href")).toBe("https://www.michigan.gov/sos/elections/election-results-and-data");
    expect(screen.getByTestId("official-results-link").textContent).toContain("couldn't confirm whether this page will carry Nov 3, 2026 results");
  });

  it("not_linked (LA, AL, and MT/ND/OK whose pages already show Nov 3 headings) -> no results link yet, never 'not listed'", () => {
    for (const st of ["LA", "AL", "MT", "ND", "OK"]) {
      expect(fx.states[st].source.status).toBe("not_linked");
      render(<OfficialResultsLink election={election(st)} />);
      const text = screen.getByTestId("official-results-link").textContent!;
      expect(text).toContain("When checked, this page did not yet provide a Nov 3, 2026 results link.");
      expect(text).not.toMatch(/did not yet list/);
      cleanup();
    }
  });

  it("no sample ever claims certification, votes, or posted general returns", () => {
    for (const st of Object.keys(fx.states)) {
      const { container } = render(<OfficialResultsLink election={election(st)} />);
      expect(container.textContent).not.toMatch(/certif|votes?\b|Posted for/i);
      cleanup();
    }
  });

  it("only a verified election_specific_results + published source may say it is posted", () => {
    const base = { ...fx.states.MI.source, routeType: "election_specific_results", status: "published", availabilityReason: "published_for_target_election" };
    expect(officialResultsLink({ officialResultsUrl: fx.states.MI.officialResultsUrl, officialResultsSource: base })?.note).toBe("Posted for the Nov 3, 2026 general election.");
    // primary phase never claims general returns
    expect(officialResultsLink({ officialResultsUrl: fx.states.MI.officialResultsUrl, officialResultsSource: { ...base, electionPhase: "primary" } })?.label).toBe("Official primary election results");
    // published status without the specific route type is treated as generic
    expect(officialResultsLink({ officialResultsUrl: fx.states.MI.officialResultsUrl, officialResultsSource: { ...fx.states.MI.source, status: "published" } })?.note).not.toMatch(/Posted/);
  });

  it("non-https or unverified destinations are not linked", () => {
    expect(officialResultsLink({ officialResultsUrl: "http://example.gov/r", officialResultsSource: fx.states.MI.source })).toBeNull();
    expect(officialResultsLink({ officialResultsUrl: "javascript:alert(1)", officialResultsSource: fx.states.MI.source })).toBeNull();
    expect(officialResultsLink({ officialResultsUrl: fx.states.MI.officialResultsUrl, officialResultsSource: { ...fx.states.MI.source, routeVerification: "blocked" } })).toBeNull();
    expect(officialResultsLink({})).toBeNull();
  });
});
