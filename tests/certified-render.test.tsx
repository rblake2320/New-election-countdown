/**
 * D's WA acceptance (2026-10-13): C's parsed payload is status "certified" with
 * certification.certifiedAt = null (the publisher gave no certification time), no source
 * as-of time, no percent reporting, no winner. It must read "Certified results", never
 * "Unofficial", must not invent a time or a percent, and must not declare a winner.
 * Built and validated with C's own schema (shared/live-election-results.ts).
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { liveElectionResultsSchema, noLiveElectionResults } from "../shared/live-election-results";
import { LiveResultView } from "../client/src/components/live-result-view";

const wa = liveElectionResultsSchema.parse({
  ...noLiveElectionResults(900), reportId: 5, revision: "r5-wa2024aa", status: "certified",
  electionContext: { state: "WA", electionDate: "2024-08-06", type: "primary", level: "state", office: "Commissioner of Public Lands" },
  reporting: null,
  source: { id: "wa-sos-2024-primary-lands", kind: "official_state_page", name: "Washington Secretary of State", url: "https://results.vote.wa.gov/results/20240806/", sourceContestId: "WA:2024-08-06:primary:state:Commissioner of Public Lands" },
  sourcePayloadSha256: "f".repeat(64), asOf: null, asOfBasis: "not_provided", retrievedAt: "2026-10-12T04:27:30Z", totalVotes: 1903115,
  certification: { url: "https://results.vote.wa.gov/results/20240806/certificate.pdf", certifiedAt: null },
  candidates: [
    { candidateId: null, sourceCandidateId: "Option A", name: "Option A", party: "Prefers Democratic Party", votes: 800000, percent: null, isWinner: false },
    { candidateId: null, sourceCandidateId: "Option B", name: "Option B", party: "Prefers Republican Party", votes: 700000, percent: null, isWinner: false },
    { candidateId: null, sourceCandidateId: "Write-in", name: "Write-in", party: null, votes: 1658, percent: null, isWinner: false },
  ],
});

describe("a certified record with no certification time", () => {
  afterEach(cleanup);

  it("reads Certified, links the certificate, invents no time, percent or winner", () => {
    render(<LiveResultView result={wa} />);
    expect(screen.getByText("Certified results")).toBeInTheDocument();
    expect(screen.queryByText("Unofficial results")).toBeNull();
    expect(screen.getByRole("link", { name: "Official certification" })).toHaveAttribute("href", "https://results.vote.wa.gov/results/20240806/certificate.pdf");
    expect(screen.getByText("Official certification", { selector: "a" }).parentElement).toHaveTextContent(/^Official certification\.$/); // no "(date)" invented
    expect(screen.getByText("Percent reporting: not stated by the source")).toBeInTheDocument();
    expect(screen.getByText(/^The source gave no time for these counts; retrieved /)).toBeInTheDocument();
    expect(screen.queryByText("Winner")).toBeNull();
    expect(screen.queryByText(/Unofficial counts can change/)).toBeNull();
    expect(screen.getByText("Recorded for Commissioner of Public Lands, WA, election of 2024-08-06")).toBeInTheDocument();
    expect(screen.getByText("1,658 votes")).toBeInTheDocument(); // aggregate write-in shown as published
  });
});
