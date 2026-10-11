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
