import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
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

  // Schema-valid future positives from lane C review (Sol, sol-b421e-c6-review): synthetic
  // offline controls, NOT real posted returns. Each carries publicationEvidence bound by
  // SHA-256 to typed receipt files kept alongside.
  it("schema-valid published sources (general + primary) say posted, bound to their receipts", () => {
    const dir = join(__dirname, "fixtures", "official-results", "future-positive");
    const fut = JSON.parse(readFileSync(join(dir, "schema-valid-future-sources.json"), "utf-8"));
    expect(fut.kind).toMatch(/SYNTHETIC OFFLINE/);
    const cases = [["general", "Posted for the Nov 3, 2026 general election.", "Official general election results"],
                   ["primary", "Posted for the Nov 3, 2026 primary election.", "Official primary election results"]] as const;
    for (const [phase, note, label] of cases) {
      const e = fut[phase];
      const proof = e.officialResultsSource.publicationEvidence;
      for (const [kind, digest] of [["official-context", proof.officialContextReceiptSha256], ["receiving", proof.receivingReceiptSha256]]) {
        const bytes = readFileSync(join(dir, `GA-${phase}-${kind}.json`));
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(digest);
        const receipt = JSON.parse(bytes.toString("utf-8"));
        expect([receipt.electionPhase, receipt.destinationUrl, receipt.checkedAt]).toEqual([phase, e.officialResultsUrl, e.officialResultsSource.checkedAt]);
      }
      expect(officialResultsLink(e)).toMatchObject({ href: "https://results.sos.ga.gov/", note, label });
      render(<OfficialResultsLink election={e} />);
      const text = screen.getByTestId("official-results-link").textContent!;
      expect(text).toContain(note);
      expect(text).not.toMatch(/certif|votes?\b|SYNTHETIC/i);
      cleanup();
    }
  });

  it("client defense in depth: published without the specific route or reason stays generic", () => {
    // These objects are invalid under the lane C schema (server refuses them); the client
    // must still never upgrade them to a 'posted' claim.
    const mi = fx.states.MI;
    for (const over of [{ status: "published" }, { status: "published", routeType: "election_specific_results" },
                        { status: "published", availabilityReason: "published_for_target_election" }]) {
      expect(officialResultsLink({ officialResultsUrl: mi.officialResultsUrl, officialResultsSource: { ...mi.source, ...over } })?.note).not.toMatch(/Posted/);
    }
  });

  it("non-https or unverified destinations are not linked", () => {
    expect(officialResultsLink({ officialResultsUrl: "http://example.gov/r", officialResultsSource: fx.states.MI.source })).toBeNull();
    expect(officialResultsLink({ officialResultsUrl: "javascript:alert(1)", officialResultsSource: fx.states.MI.source })).toBeNull();
    expect(officialResultsLink({ officialResultsUrl: fx.states.MI.officialResultsUrl, officialResultsSource: { ...fx.states.MI.source, routeVerification: "blocked" } })).toBeNull();
    expect(officialResultsLink({})).toBeNull();
  });
});
