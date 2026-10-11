import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GeneralRoster } from "../client/src/components/general-roster";

// Real HTTP 200 bodies from lane C's private Postgres + Express run of
// GET /api/elections/:id/general-candidates (receipts inside each file;
// copied from lane-c/artifacts/lane-c/real-roster-payloads).
const load = (f: string) => JSON.parse(readFileSync(join(__dirname, "fixtures/real-roster", f), "utf-8"));

function mount(body: unknown, electionId: number) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><GeneralRoster electionId={electionId} /></QueryClientProvider>);
}

const rows = () => within(screen.getByRole("list", { name: /official general-election list/i })).getAllByRole("listitem");

describe("GeneralRoster with real lane C payloads", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  for (const file of ["TX-32.json", "NE-55.json", "WA-329.json", "NV-475.json"]) {
    it(`${file}: every candidate rendered, no candidate promoted to certified, sources linked`, async () => {
      const { receipt, body } = load(file);
      expect(receipt).toBeTruthy();
      mount(body, body.electionId);
      await screen.findByText(body.candidates[0].name);
      expect(rows()).toHaveLength(body.candidates.length);
      for (const r of rows()) expect(r.textContent).not.toMatch(/certif/i); // the publisher's own title may say "Certified"; candidate rows never do
      for (const a of within(screen.getByTestId("general-roster-sources")).getAllByRole("link")) {
        expect(a.getAttribute("href")).toMatch(/^https:\/\/[^/]*\.(gov|us)\//);
      }
    });
  }

  it("TX: write-ins with empty party show no party; party codes become labels", async () => {
    const { body } = load("TX-32.json");
    mount(body, body.electionId);
    const writeIn = (await screen.findByText("Avery Ayers")).closest("li")!;
    expect(writeIn.textContent).toContain("Write-in");
    expect(writeIn.textContent).not.toMatch(/Democratic|Republican|Libertarian|Independent|Other/);
    const lib = body.candidates.find((c: any) => c.party === "L");
    expect(screen.getByText(lib.name).closest("li")!.textContent).toContain("Libertarian");
  });

  it("WA: top-two party is shown as a stated preference, not as nomination", async () => {
    const { body } = load("WA-329.json");
    mount(body, body.electionId);
    const li = (await screen.findByText("Mary Silva")).closest("li")!;
    expect(li.textContent).toContain("Prefers Republican Party");
    expect(li.textContent).not.toMatch(/\bRepublican$/);
  });

  it("NE: incumbent flagged only where the list says true; minor parties kept verbatim", async () => {
    const { body } = load("NE-55.json");
    mount(body, body.electionId);
    expect((await screen.findByText("Jim Pillen")).closest("li")!.textContent).toContain("Incumbent");
    expect(screen.getByText("Lynne Walz").closest("li")!.textContent).not.toContain("Incumbent");
    expect(screen.getByText("Brett Lindstrom").closest("li")!.textContent).toContain("America First");
  });

  it("NV: incumbency unknown (null) shows no badge; source published date shown as the calendar date", async () => {
    const { body } = load("NV-475.json");
    mount(body, body.electionId);
    await screen.findByText("Susie Lee");
    expect(screen.queryByText("Incumbent")).toBeNull();
    const pub = body.candidates[0].generalListSource.publishedAt as string;
    const [y, m, d] = pub.split("-").map(Number);
    const expected = new Date(y, m - 1, d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    expect(screen.getByTestId("general-roster-sources").textContent).toContain(`published ${expected}`);
  });
});
