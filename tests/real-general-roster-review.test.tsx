import React from "react";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { GeneralRoster } from "../client/src/components/general-roster";

const boundary = vi.hoisted(() => ({ data: undefined as any, isLoading: false, error: null as Error | null }));
vi.mock("../client/src/hooks/use-general-roster", () => ({ useGeneralRoster: () => boundary }));

// Actual retained PostgreSQL + Express responses; no invented candidate data.
const payloadDirectory = process.env.ROSTER_PAYLOAD_DIR ?? join(__dirname, "fixtures", "real-roster");
const payloads = Object.fromEntries(["TX-32", "NE-55", "WA-329", "NV-475"].map(key => {
  const bytes = readFileSync(`${payloadDirectory}/${key}.json`);
  const captured = JSON.parse(bytes.toString("utf8"));
  if (captured.receipt.httpStatus !== 200 || captured.body.status !== "sourced") throw new Error(`Invalid real payload ${key}`);
  return [key, { ...captured, payloadSha256: createHash("sha256").update(bytes).digest("hex") }];
}));

function mountReal(key: keyof typeof payloads) {
  const payload = payloads[key];
  boundary.data = payload.body;
  const view = render(<GeneralRoster electionId={payload.body.electionId} />);
  console.log(JSON.stringify({ payload: key, sha256: payload.payloadSha256, candidateCount: payload.body.candidates.length, renderedText: view.container.textContent, links: Array.from(view.container.querySelectorAll("a")).map(a => ({ text: a.textContent, href: a.getAttribute("href") })) }));
  return view;
}

describe("actual GeneralRoster receiving component with retained real API payloads", () => {
  beforeEach(() => {
    Object.assign(boundary, { data: undefined, isLoading: false, error: null });
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Network forbidden in isolated roster review"))));
  });
  afterEach(() => {
    expect(fetch).not.toHaveBeenCalled();
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each(["TX-32", "NE-55", "WA-329", "NV-475"])("%s names, write-in/incumbent counts and source URL/check date match retained payload", key => {
    mountReal(key);
    const candidates = payloads[key].body.candidates;
    const list = screen.getByRole("list", { name: "Candidates on the official general-election list" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.length).toBe(candidates.length);
    expect(rows.map(row => row.querySelector("span.font-medium")?.textContent)).toEqual(candidates.map((c: any) => c.name));
    expect(within(list).queryAllByText("Write-in").length).toBe(candidates.filter((c: any) => c.generalListSource?.ballotAccessType === "write_in").length);
    expect(within(list).queryAllByText("Incumbent").length).toBe(candidates.filter((c: any) => c.isIncumbent === true).length);
    const distinctSources = new Map<string, any>();
    for (const c of candidates) distinctSources.set(`${c.generalListSource.sourceName}|${c.generalListSourceUrl}`, c);
    const sources = screen.getByTestId("general-roster-sources");
    expect(within(sources).getAllByRole("link").length).toBe(distinctSources.size);
    for (const c of distinctSources.values()) {
      const link = within(sources).getByRole("link", { name: c.generalListSource.sourceName });
      expect(link.getAttribute("href")).toBe(c.generalListSourceUrl);
      expect(link.parentElement?.textContent).toContain("checked Oct 11, 2026");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("TX write-ins with empty official party do not become Independent or Other", () => {
    mountReal("TX-32");
    const candidates = payloads["TX-32"].body.candidates;
    const rows = screen.getAllByRole("listitem");
    const unknown = candidates.filter((c: any) => c.party === "" && c.generalListSource.partyRaw === "");
    expect(unknown.length).toBe(4);
    for (const c of unknown) {
      const row = rows.find(row => row.querySelector("span.font-medium")?.textContent === c.name)!;
      expect(row.textContent).toBe(`${c.name}Write-in`);
    }
  });

  it("WA official party preference remains visible rather than being asserted as party membership", () => {
    mountReal("WA-329");
    const rows = screen.getAllByRole("listitem");
    for (const c of payloads["WA-329"].body.candidates) {
      expect(c.generalListSource.partyBasis).toBe("preference");
      const row = rows.find(row => row.querySelector("span.font-medium")?.textContent === c.name)!;
      expect(row.textContent).toContain(c.generalListSource.partyRaw);
    }
  });

  it("loading has no premature sourced or not-recorded claim", () => {
    boundary.isLoading = true;
    const { container } = render(<GeneralRoster electionId={32} />);
    expect(container.textContent).toBe("");
  });

  it("route404 null response remains hidden on servers without endpoint", () => {
    boundary.data = null;
    const { container } = render(<GeneralRoster electionId={32} />);
    expect(container.textContent).toBe("");
  });

  it("election_not_found404 response remains hidden", () => {
    boundary.data = { status: "election_not_found", electionId: 32, candidates: [] };
    const { container } = render(<GeneralRoster electionId={32} />);
    expect(container.textContent).toBe("");
  });

  it("not_recorded displays honest unavailable-roster message", () => {
    boundary.data = { status: "not_recorded", electionId: 32, candidates: [] };
    render(<GeneralRoster electionId={32} />);
    expect(screen.getByTestId("general-roster-empty").textContent).toContain("has not been recorded yet");
  });

  it("first-load error with undefined data displays honest error rather than silently disappearing", () => {
    boundary.error = new Error("General candidate list unavailable (503)");
    const { container } = render(<GeneralRoster electionId={32} />);
    console.log(JSON.stringify({ boundary: "undefined-data + error", renderedText: container.textContent, rosterPresent: Boolean(screen.queryByTestId("general-roster")) }));
    expect(screen.getByText("The official list could not be loaded right now.")).not.toBeNull();
  });

  it("error with previous real data displays honest error", () => {
    boundary.data = payloads["TX-32"].body;
    boundary.error = new Error("General candidate list unavailable (503)");
    render(<GeneralRoster electionId={32} />);
    expect(screen.getByText("The official list could not be loaded right now.")).not.toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
