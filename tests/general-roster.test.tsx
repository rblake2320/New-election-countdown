import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GeneralRoster } from "../client/src/components/general-roster";
import { rosterParty, safeSourceUrl } from "../client/src/lib/general-roster";

// Response shapes mirror lane C's GET /api/elections/:id/general-candidates
// (server/general-candidate-list.ts on lane-c/nominee-refresh).
const sourced = {
  status: "sourced", electionId: 32,
  candidates: [
    { id: 1, name: "Jane Roe", party: "D", isIncumbent: true, generalListSourceUrl: "https://www.sos.state.tx.us/elections/candidates/", generalListCheckedAt: "2026-10-11T15:00:00Z",
      generalListSource: { sourceName: "Texas Secretary of State", partyRaw: "Democratic", ballotAccessType: "party_nominee" } },
    { id: 2, name: "Sam Writein", party: null, isIncumbent: null, generalListSourceUrl: "https://www.sos.state.tx.us/elections/candidates/", generalListCheckedAt: "2026-10-11T15:00:00Z",
      generalListSource: { sourceName: "Texas Secretary of State", partyRaw: null, ballotAccessType: "write_in" } },
    { id: 3, name: "Evil Link", party: "R", isIncumbent: false, generalListSourceUrl: "javascript:alert(1)", generalListCheckedAt: null,
      generalListSource: { sourceName: "Bad Source" } },
  ],
};

function mount(response: { status: number; body: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response.body), { status: response.status })));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><GeneralRoster electionId={32} /></QueryClientProvider>);
}

describe("GeneralRoster", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("renders the official list with party labels, incumbency, write-in and source attribution", async () => {
    mount({ status: 200, body: sourced });
    await screen.findByText("Jane Roe");
    const roster = screen.getByTestId("general-roster");
    expect(roster.textContent).toContain("Democratic");
    expect(roster.textContent).toContain("Incumbent");
    expect(roster.textContent).toContain("Write-in");
    for (const r of within(screen.getByRole("list")).getAllByRole("listitem")) expect(r.textContent).not.toMatch(/certif/i);
    const link = screen.getByRole("link", { name: "Texas Secretary of State" });
    expect(link.getAttribute("href")).toBe("https://www.sos.state.tx.us/elections/candidates/");
    expect(screen.queryByRole("link", { name: "Bad Source" })).toBeNull(); // javascript: never linked
    expect(screen.getByText(/Bad Source/)).toBeTruthy();
  });

  it("not_recorded says so instead of showing an empty list", async () => {
    mount({ status: 200, body: { status: "not_recorded", electionId: 32, candidates: [] } });
    expect(await screen.findByTestId("general-roster-empty")).toBeTruthy();
  });

  it("renders nothing on a server without the endpoint (route 404)", async () => {
    const { container } = mount({ status: 404, body: { error: "Not found" } });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 20));
    expect(container.textContent).toBe("");
  });
});

describe("roster helpers", () => {
  it("party: code -> label, raw text kept, unknown stays empty", () => {
    expect(rosterParty({ party: "R" } as any)).toBe("Republican");
    expect(rosterParty({ party: null, generalListSource: { partyRaw: "Working Families" } } as any)).toBe("Working Families");
    expect(rosterParty({ party: null, generalListSource: { partyRaw: null } } as any)).toBeNull();
  });
  it("only http(s) source links", () => {
    expect(safeSourceUrl("https://x.gov/a")).toBe("https://x.gov/a");
    expect(safeSourceUrl("javascript:alert(1)")).toBeNull();
    expect(safeSourceUrl("not a url")).toBeNull();
  });
});

describe("GeneralRoster known-empty official lists (lane C sources[].scope)", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  const snap = (scope: any) => ({ url: "https://sos.example.gov/2026/general-list.pdf", name: "Example SOS General Candidate List", checkedAt: "2026-10-11T15:00:00Z", publishedAt: "2026-09-11", snapshotSha256: "ab".repeat(32), scope });

  it("sourced + no candidates + unqualified expectedCount 0: says the official list has none, with its source", async () => {
    mount({ status: 200, body: { status: "sourced", electionId: 32, candidates: [], sources: [snap({ expectedCount: 0 })] } });
    expect(await screen.findByTestId("general-roster-known-empty")).toBeTruthy();
    expect(screen.queryByTestId("general-roster-empty")).toBeNull();
    expect(screen.getByRole("link", { name: "Example SOS General Candidate List" }).getAttribute("href")).toBe("https://sos.example.gov/2026/general-list.pdf");
    expect(screen.getByTestId("general-roster-sources").textContent).toMatch(/published .*2026/);
  });

  it("a qualified zero (e.g. write-ins: 0) never claims the whole race is empty; names the scopes", async () => {
    mount({ status: 200, body: { status: "sourced", electionId: 32, candidates: [], sources: [snap({ expectedCount: 0, ballotAccessType: "write_in" }), snap({ expectedCount: 0, partyRaw: "Green" })] } });
    const msg = await screen.findByTestId("general-roster-scoped-empty");
    expect(msg.textContent).toContain("write-in candidates");
    expect(msg.textContent).toContain("Green candidates");
    expect(msg.textContent).toContain("do not establish that the race has no candidates");
    expect(screen.queryByTestId("general-roster-known-empty")).toBeNull();
  });

  it("sourced but no snapshots and no candidates falls back to not-recorded", async () => {
    mount({ status: 200, body: { status: "sourced", electionId: 32, candidates: [] } });
    expect(await screen.findByTestId("general-roster-empty")).toBeTruthy();
  });
});

describe("GeneralRoster coverage field (complete | scoped | unspecified)", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  const src = (scope: any) => ({ url: "https://sos.example.gov/list.pdf", name: "Example SOS List", checkedAt: "2026-10-11T15:00:00Z", publishedAt: "2026-09-11", scope });
  const cand = { id: 9, name: "Pat Green", party: "G", isIncumbent: null, generalListSourceUrl: "https://sos.example.gov/list.pdf", generalListCheckedAt: "2026-10-11T15:00:00Z", generalListSource: { sourceName: "Example SOS List", partyRaw: "Green" } };

  it("complete + empty: 'records no candidates' with sources", async () => {
    mount({ status: 200, body: { status: "sourced", electionId: 1, candidates: [], sources: [src({ expectedCount: 0 })], coverage: "complete" } });
    expect((await screen.findByTestId("general-roster-known-empty")).textContent).toContain("records no candidates for this race");
    expect(screen.getByRole("link", { name: "Example SOS List" })).toBeTruthy();
  });

  it("server coverage wins: scoped + empty never says the race has none even if a scope looks unqualified", async () => {
    mount({ status: 200, body: { status: "sourced", electionId: 1, candidates: [], sources: [src({ expectedCount: 0, partyRaw: "Green" })], coverage: "scoped" } });
    expect(await screen.findByTestId("general-roster-scoped-empty")).toBeTruthy();
    expect(screen.queryByTestId("general-roster-known-empty")).toBeNull();
  });

  it("scoped + candidates: lists them with a 'Covers only' qualification", async () => {
    mount({ status: 200, body: { status: "sourced", electionId: 1, candidates: [cand], sources: [src({ expectedCount: 1, partyRaw: "Green" })], coverage: "scoped" } });
    await screen.findByText("Pat Green");
    expect(screen.getByTestId("general-roster-scope-note").textContent).toContain("Covers only: Green candidates");
  });

  it("complete + candidates: no scope note", async () => {
    mount({ status: 200, body: { status: "sourced", electionId: 1, candidates: [cand], sources: [src({ expectedCount: 1 })], coverage: "complete" } });
    await screen.findByText("Pat Green");
    expect(screen.queryByTestId("general-roster-scope-note")).toBeNull();
  });

  it("unspecified + empty: not recorded", async () => {
    mount({ status: 200, body: { status: "not_recorded", electionId: 1, candidates: [], sources: [], coverage: "unspecified" } });
    expect(await screen.findByTestId("general-roster-empty")).toBeTruthy();
  });
});
