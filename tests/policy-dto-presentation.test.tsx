/**
 * Lane C's verified-comparison DTO (2d437f0, artifacts/verified-policy-comparison/README.md):
 *   { category, positions: [{ candidateId, candidateName, position, details,
 *       source: string|null, confidence: null, sourcePositionId: number|null,
 *       sourceUrl: string|null, recordedDate: ISO|null }] }
 * C has 0 verified statements in the real database, so these are CONTRACT EXAMPLES built from that
 * shape, not real records. The page renders only what the DTO carries: null stays "not recorded"
 * (never today's date, never a made-up source), only http(s) is ever linked, empty categories say so.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PolicyComparisonResults, recordedDateLabel, safeHttpUrl, type PolicyComparison } from "../client/src/components/policy-comparison-results";

const row = (over: Record<string, unknown> = {}) => ({
  candidateId: "101", candidateName: "Dan Sullivan", position: "Supports a market-based approach", details: "",
  source: "Candidate website", confidence: null, sourcePositionId: 42, sourceUrl: "https://example.org/issues/health",
  recordedDate: "2026-10-01T14:30:00.000Z", ...over,
});
const dto = (positions: object[]): PolicyComparison[] => [{ category: "Healthcare", positions: positions as PolicyComparison["positions"] }];
const show = (data: PolicyComparison[]) => render(<PolicyComparisonResults data={data} isLoading={false} error={null} onRetry={() => {}} />);

describe("verified policy comparison presentation (C DTO 2d437f0)", () => {
  afterEach(cleanup);

  it("a fully recorded statement shows its source link, recorded date, record id, and 'confidence not recorded'", () => {
    show(dto([row()]));
    const link = screen.getByRole("link", { name: "Source: Candidate website" });
    expect(link).toHaveAttribute("href", "https://example.org/issues/health");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.parentElement).toHaveTextContent("Recorded Oct 1, 2026");
    expect(link.parentElement).toHaveTextContent("Record #42");
    expect(screen.getByText("Confidence not recorded")).toBeInTheDocument();
    expect(screen.queryByText(/\d+%/)).toBeNull(); // C's confidence is always null: no percent is ever drawn
  });

  it("every nullable field null: stated as not recorded; no link, no record id, no date invented", () => {
    show(dto([row({ source: null, sourceUrl: null, sourcePositionId: null, recordedDate: null })]));
    expect(screen.getByText(/^Source not recorded/)).toHaveTextContent("Source not recorded · Recorded date not stated");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText(/Record #/)).toBeNull();
  });

  it("a source URL without a source name is linked as 'Source'; a name without a URL is plain text", () => {
    const { unmount } = show(dto([row({ source: null })]));
    expect(screen.getByRole("link", { name: "Source" })).toHaveAttribute("href", "https://example.org/issues/health");
    unmount();
    show(dto([row({ sourceUrl: null })]));
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(/^Source: Candidate website/)).toBeInTheDocument();
  });

  it("only http(s) is linked: javascript:, data: and garbage are shown as text, never as links", () => {
    for (const hostile of ["javascript:alert(1)", "data:text/html,<script>1</script>", "not a url", "  "]) {
      const { unmount } = show(dto([row({ source: "Candidate website", sourceUrl: hostile })]));
      expect(screen.queryByRole("link"), hostile).toBeNull();
      unmount();
    }
    expect(safeHttpUrl("https://example.org/a")).toBe("https://example.org/a");
    expect(safeHttpUrl("http://example.org/a")).toBe("http://example.org/a");
    expect(safeHttpUrl("ftp://example.org/a")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });

  it("dates are read in UTC (a date-only value never shifts a day) and a bad value is 'not stated'", () => {
    expect(recordedDateLabel("2026-10-01")).toBe("Recorded Oct 1, 2026");
    expect(recordedDateLabel("2026-10-01T23:59:59.000Z")).toBe("Recorded Oct 1, 2026");
    expect(recordedDateLabel("2026-01-01T00:00:00.000Z")).toBe("Recorded Jan 1, 2026");
    expect(recordedDateLabel("garbage")).toBe("Recorded date not stated");
    expect(recordedDateLabel(null)).toBe("Recorded date not stated");
    expect(recordedDateLabel(undefined)).toBe("Recorded date not stated");
  });

  it("an empty category (positions: []) says no verified statements are recorded, with no placeholder row", () => {
    show(dto([]));
    expect(screen.getByText("No verified statements are recorded for this category.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4 })).toBeNull();
  });

  it("typed service errors: 400/404/422 name the cause; 503 and unknown say it does not mean none are recorded", () => {
    const retry = vi.fn();
    const errorText = (message: string) => {
      const { unmount } = render(<PolicyComparisonResults data={undefined} isLoading={false} error={new Error(message)} onRetry={retry} />);
      const text = screen.getByRole("alert").textContent ?? "";
      unmount();
      return text;
    };
    expect(errorText("HTTP 400")).toContain("The candidates or categories could not be read.");
    expect(errorText("HTTP 404")).toContain("One of the selected candidates was not found.");
    expect(errorText("HTTP 422")).toContain("A recorded source did not pass validation");
    expect(errorText("HTTP 503")).toContain("The positions service is temporarily unavailable. This does not mean none are recorded.");
    expect(errorText("HTTP 404")).not.toContain("does not mean none are recorded");
    expect(errorText("socket hang up")).toContain("This does not mean none are recorded.");
    render(<PolicyComparisonResults data={undefined} isLoading={false} error={new Error("HTTP 503")} onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
