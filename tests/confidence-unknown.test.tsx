/**
 * Lane C (2026-10-13, nonce C-confidence-B13): candidate-position-api now returns only
 * stored, verified sources and `confidence: null` when none is recorded (the invented 0.95
 * is gone). The client seam used `confidence * 100`, and `null * 100` is 0 in JavaScript:
 * an unknown confidence must never be drawn as 0%, and a missing source must be stated.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ConfidenceMeter from "../client/src/components/ConfidenceMeter";
import { PolicyComparisonResults, confidencePercent, type PolicyComparison } from "../client/src/components/policy-comparison-results";

const data = (over: Partial<PolicyComparison["positions"][number]>): PolicyComparison[] => [{
  category: "Healthcare",
  positions: [{ candidateId: "S001", candidateName: "Dan Sullivan", position: "Supports a market-based approach", details: "", source: "Candidate website, retrieved 2026-10-01", confidence: 0.82, ...over }],
}];

describe("confidence is unknown, not zero (C null contract)", () => {
  afterEach(cleanup);

  it("the seam: null/undefined/NaN stay unknown; 0 stays a real 0", () => {
    expect(confidencePercent(null)).toBeNull();
    expect(confidencePercent(undefined)).toBeNull();
    expect(confidencePercent(Number.NaN)).toBeNull();
    expect(confidencePercent(0)).toBe(0);
    expect(confidencePercent(0.82)).toBeCloseTo(82);
    expect(null as unknown as number * 100).toBe(0); // the trap the seam used to fall into
  });

  it("the meter says 'not recorded' for null, never 0%", () => {
    render(<ConfidenceMeter value={null} />);
    expect(screen.getByText("Confidence not recorded")).toBeInTheDocument();
    expect(screen.queryByText(/0%/)).toBeNull();
  });

  it("a recorded zero is shown as 0%, and a recorded value as its percent", () => {
    const { rerender } = render(<ConfidenceMeter value={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByText("Confidence not recorded")).toBeNull();
    rerender(<ConfidenceMeter value={82} />);
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Confidence 82%" })).toBeInTheDocument();
  });

  it("a position with null confidence and null source is stated as unrecorded", () => {
    render(<PolicyComparisonResults data={data({ confidence: null, source: null })} isLoading={false} error={null} onRetry={() => {}} />);
    expect(screen.getByText("Confidence not recorded")).toBeInTheDocument();
    expect(screen.getByText(/^Source not recorded/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/Source: null|undefined/)).toBeNull();
  });

  it("a recorded position shows its verified source and confidence", () => {
    render(<PolicyComparisonResults data={data({})} isLoading={false} error={null} onRetry={() => {}} />);
    expect(screen.getByText(/^Source: Candidate website, retrieved 2026-10-01/)).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("a failed request is an error with retry; an empty result says none are recorded", () => {
    const retry = vi.fn();
    const { rerender } = render(<PolicyComparisonResults data={undefined} isLoading={false} error={new Error("HTTP 503")} onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The positions service is temporarily unavailable. This does not mean none are recorded.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(<PolicyComparisonResults data={[]} isLoading={false} error={null} onRetry={retry} />);
    expect(screen.getByText("No positions are recorded for these candidates and categories.")).toBeInTheDocument();
  });
});
