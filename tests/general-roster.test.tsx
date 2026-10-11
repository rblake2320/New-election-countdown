import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GeneralRoster } from "../client/src/components/general-roster";
import { rosterParty, safeSourceUrl, isWriteIn } from "../client/src/lib/general-roster";

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

describe("party preference labelling (top-two states)", () => {
  const row = (partyRaw: string | null, party: string | null = "D") =>
    ({ party, generalListSource: { partyBasis: "preference", partyRaw } }) as any;
  it("CA-style raw label without 'prefer' gets an explicit 'Party preference:' prefix", () => {
    expect(rosterParty(row("Democratic"))).toBe("Party preference: Democratic");
    expect(rosterParty(row("Republican", "R"))).toBe("Party preference: Republican");
  });
  it("WA-style raw text that already states the preference stays verbatim", () => {
    expect(rosterParty(row("(Prefers Republican Party)", "R"))).toBe("(Prefers Republican Party)");
    expect(rosterParty(row("Party Preference: None"))).toBe("Party Preference: None");
  });
  it("non-preference rows are unchanged", () => {
    expect(rosterParty({ party: "D", generalListSource: { partyBasis: "source_label", partyRaw: "Democratic" } } as any)).toBe("Democratic");
  });
});

describe("other partyBasis values from lane C phase 2 (AK registration, VT fusion, FL filing method)", () => {
  const row = (partyBasis: string, partyRaw: string | null, party: string | null, ballotAccessType: string | null = null) =>
    ({ party, generalListSource: { partyBasis, partyRaw, ballotAccessType } }) as any;
  it("AK registration: raw verbatim, never shown as a nomination label", () => {
    expect(rosterParty(row("registration", "(Registered Republican)", "R"))).toBe("(Registered Republican)");
    expect(rosterParty(row("registration", "", "R"))).toBeNull();
  });
  it("VT fusion: combined raw value kept as-is", () => {
    expect(rosterParty(row("source_label", "DEM/PROG", "DEM/PROG"))).toBe("DEM/PROG");
  });
  it("FL filing method WRI: no party shown, counted as write-in", () => {
    const c = row("filing_method", "WRI", "");
    expect(rosterParty(c)).toBeNull();
    expect(isWriteIn(c)).toBe(true);
    expect(isWriteIn(row("filing_method", "NPA", ""))).toBe(false);
  });
});

describe("multiple party lines (CT cross-endorsement, partyLabels[])", () => {
  const row = (partyLabels: string[] | null, partyRaw: string, party = "D") =>
    ({ party, generalListSource: { partyBasis: "source_label", partyRaw, partyLabels } }) as any;
  it("more than one printed label: each shown verbatim, joined with ' / '", () => {
    expect(rosterParty(row(["Democratic", "Working Families", "Independent Party"], "Democratic"))).toBe("Democratic / Working Families / Independent Party");
  });
  it("a single label or a scalar fusion value stays as the source prints it", () => {
    expect(rosterParty(row(["Democratic"], "Democratic"))).toBe("Democratic");
    expect(rosterParty(row(null, "DEM/PROG", "DEM/PROG"))).toBe("DEM/PROG");
    expect(rosterParty(row(null, "Democratic, Working Families", "D"))).toBe("Democratic, Working Families");
  });
  it("blank entries are ignored; filing method still never shows a party", () => {
    expect(rosterParty(row(["Republican", " ", ""], "Republican", "R"))).toBe("Republican");
    expect(rosterParty({ party: "", generalListSource: { partyBasis: "filing_method", partyRaw: "WRI", partyLabels: ["WRI", "X"] } } as any)).toBeNull();
  });
});

describe("supporting evidence links (partyEvidence / identityEvidence)", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  const ev = (url: string, title: string, sourcePage?: number) => ({ url, sha256: "cd".repeat(32), title, ...(sourcePage ? { sourcePage } : {}) });
  const cand = (id: number, name: string, extra: any) => ({ id, name, party: "L", isIncumbent: null, generalListSourceUrl: "https://sos.wyo.gov/list.csv", generalListCheckedAt: "2026-10-11T15:00:00Z",
    generalListSource: { sourceName: "Wyoming SOS General Candidate List (CSV)", partyRaw: "LBR", ...extra } });

  it("party label source and name identity source render as separate, labelled, deduplicated lines", async () => {
    const party = ev("https://sos.wyo.gov/Elections/Docs/2026/Gov-companion.pdf", "2026 General Election Candidates (Governor)", 2);
    const id = ev("https://www.sec.state.ma.us/primary-2026.pdf", "2026 State Primary Official Results");
    mount({ status: 200, body: { status: "sourced", electionId: 505, coverage: "complete", candidates: [
      cand(1, "A One", { partyEvidence: party }), cand(2, "B Two", { partyEvidence: party }), cand(3, "C Three", { identityEvidence: id }),
    ] } });
    await screen.findByText("A One");
    const text = screen.getByTestId("general-roster-evidence").textContent!;
    expect(text).toContain("Party label source: 2026 General Election Candidates (Governor) (p. 2)");
    expect(text).toContain("Name identity source: 2026 State Primary Official Results");
    expect(text.match(/Party label source/g)).toHaveLength(1); // deduplicated across candidates
    expect(text).not.toMatch(/nominat|certif/i);
    expect(screen.getByRole("link", { name: "2026 General Election Candidates (Governor)" }).getAttribute("href")).toBe("https://sos.wyo.gov/Elections/Docs/2026/Gov-companion.pdf");
  });

  it("non-http(s) evidence URLs are shown as text, not links; no evidence -> no section", async () => {
    mount({ status: 200, body: { status: "sourced", electionId: 1, coverage: "complete", candidates: [cand(1, "A One", { partyEvidence: ev("file:///c:/x.pdf", "Local Copy") })] } });
    await screen.findByText("A One");
    expect(screen.queryByRole("link", { name: "Local Copy" })).toBeNull();
    expect(screen.getByTestId("general-roster-evidence").textContent).toContain("Party label source: Local Copy");
    cleanup(); vi.unstubAllGlobals();
    mount({ status: 200, body: { status: "sourced", electionId: 1, coverage: "complete", candidates: [cand(1, "A One", {})] } });
    await screen.findByText("A One");
    expect(screen.queryByTestId("general-roster-evidence")).toBeNull();
  });
});

describe("canonical codes without a display name", () => {
  it("shows the official printed text, not the internal code or an invented name", () => {
    expect(rosterParty({ party: "CON", generalListSource: { partyBasis: "source_label", partyRaw: "CT" } } as any)).toBe("CT");
    expect(rosterParty({ party: "CON", generalListSource: { partyBasis: "source_label", partyRaw: null } } as any)).toBe("CON");
    expect(rosterParty({ party: "L", generalListSource: { partyBasis: "source_label", partyRaw: "LBR" } } as any)).toBe("Libertarian");
  });
});

describe("not_applicable (lane C: primaries, runoffs, LA Nov 3 House open primary)", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it("renders nothing at all - no card, no 'not recorded' message", async () => {
    const { container } = mount({ status: 200, body: { status: "not_applicable", reason: "not_a_general_election", electionId: 530, candidates: [] } });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 20));
    expect(container.textContent).toBe("");
    expect(screen.queryByTestId("general-roster")).toBeNull();
    expect(screen.queryByTestId("general-roster-empty")).toBeNull();
  });
});
