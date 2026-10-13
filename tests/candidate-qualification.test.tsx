/**
 * Lane C's qualification seam (2026-10-13, nonce C-qualification-B13), on the ACTUAL payloads retained from
 * D's post-apply copy (tests/fixtures/qualification, each file checked against its capture proof):
 *  - CA-01 (election 72): 6 FEC profiles, an official roster of 2 printed-ballot rows. The page said "6 candidates".
 *  - LA-01 (election 429): 2 FEC registrations, roster not_applicable (not a general election).
 *  - provenance is NESTED under `source` on the candidates endpoint; provenanceLabel read flat fields only.
 * FEC registration is never presented as ballot access, and nothing here invents a field.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import ElectionDetails from "../client/src/pages/election-details";
import { ElectionCard } from "../client/src/components/election-card";
import { provenanceLabel } from "../client/src/lib/candidate-profile";
import { candidateCountText, cardQualificationNote, rowQualification } from "../client/src/lib/candidate-qualification";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
const dir = resolve(process.cwd(), "tests/fixtures/qualification");
const load = (name: string) => JSON.parse(readFileSync(resolve(dir, name), "utf8"));
const profiles72 = load("72-profiles.json"), roster72 = load("72-roster.json");
const profiles429 = load("429-profiles.json"), roster429 = load("429-roster.json");
const detail755 = load("72-registration-only-detail.json");
const election72 = JSON.parse(readFileSync(resolve(process.cwd(), "tests/fixtures/results-current/elections.body.json"), "utf8")).find((e: { id: number }) => e.id === 72);
const LISTED = new Set([757, 756]); // Gallagher and McGuire: the two printed-ballot rows of the official roster

describe("the real payloads are the captured bytes", () => {
  it("every fixture matches its capture proof", () => {
    const proofs = readdirSync(dir).filter(f => f.endsWith("-proof.json"));
    expect(proofs).toHaveLength(6);
    for (const proof of proofs) {
      const body = proof.replace("-proof.json", ".json");
      expect(createHash("sha256").update(readFileSync(resolve(dir, body))).digest("hex"), body).toBe(load(proof).sha256);
    }
  });
});

describe("labels and counts from the actual CA-01 and LA-01 payloads", () => {
  it("provenanceLabel reads the nested source block (it said 'Source not yet recorded')", () => {
    expect(profiles72).toHaveLength(6);
    for (const c of profiles72) expect(provenanceLabel(c)).toBe("FEC-registered (not ballot certification)");
  });

  it("CA-01 says 2 are on the official list and 4 are FEC registrations, never '6 candidates'", () => {
    expect(roster72.status).toBe("sourced");
    expect(candidateCountText(profiles72, roster72)).toBe("2 on the official candidate list · 4 FEC registrations, ballot status not confirmed");
    for (const c of profiles72) {
      expect(rowQualification(c, roster72)).toBe(LISTED.has(c.id) ? "On the official candidate list" : "FEC registration · ballot status not confirmed");
    }
  });

  it("LA-01 (roster not_applicable) says 2 FEC registrations, and no row claims the list or the ballot", () => {
    expect(roster429.status).toBe("not_applicable");
    expect(candidateCountText(profiles429, roster429)).toBe("2 FEC registrations · ballot status not confirmed");
    for (const c of profiles429) expect(rowQualification(c, roster429)).toBe("FEC registration · ballot status not confirmed");
  });

  it("no roster loaded yet: FEC-only rows are still not called candidates on the ballot", () => {
    expect(candidateCountText(profiles72, undefined)).toBe("6 FEC registrations · ballot status not confirmed");
    expect(candidateCountText(profiles72, null)).toBe("6 FEC registrations · ballot status not confirmed");
  });

  it("records without provenance markers keep plain wording; a certified ballot row is labelled certified", () => {
    expect(candidateCountText([{ id: 1 }, { id: 2 }], null)).toBe("2 candidates");
    expect(candidateCountText([{ id: 1 }], null)).toBe("1 candidate");
    expect(candidateCountText([], null)).toBe("Candidates not yet recorded");
    expect(rowQualification({ id: 3, source: { ballot_status: "certified", source_status: "fec_registered" } }, null)).toBe("On certified ballot");
    expect(cardQualificationNote(profiles72)).toBe("Includes FEC registrations; ballot status not confirmed.");
    expect(cardQualificationNote([{ id: 1 }])).toBeNull();
  });

  it("the actual /api/candidates/:id payload (markers dropped, A DTO repair pending) is never over-claimed", () => {
    expect(Object.keys(detail755)).not.toContain("source");
    expect(provenanceLabel(detail755)).not.toMatch(/certified|official/i);
  });
});

describe("the race page and card on the actual payloads", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  const stub = () => vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/elections/72") return new Response(JSON.stringify(election72));
    if (url === "/api/elections/72/candidates") return new Response(JSON.stringify(profiles72));
    if (url === "/api/elections/72/general-candidates") return new Response(JSON.stringify(roster72));
    if (url.includes("polling")) return new Response(JSON.stringify({ pollingData: [] }));
    return new Response("[]");
  }));
  const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

  it("CA-01 race page: the count and every row say what the record establishes", async () => {
    stub();
    const { hook } = memoryLocation({ path: "/elections/72" });
    render(<QueryClientProvider client={client()}><Router hook={hook}><Route path="/elections/:id"><ElectionDetails /></Route></Router></QueryClientProvider>);
    expect(await screen.findByText("2 on the official candidate list · 4 FEC registrations, ballot status not confirmed")).toBeInTheDocument();
    expect(screen.queryByText(/^6 candidates$/)).toBeNull();
    for (const c of profiles72) {
      const label = await screen.findAllByTestId(`qualification-${c.id}`);
      expect(label[0]).toHaveTextContent(LISTED.has(c.id) ? "On the official candidate list" : "FEC registration · ballot status not confirmed");
    }
  });

  it("CA-01 election card notes that FEC registrations are included", async () => {
    stub();
    const { hook } = memoryLocation({ path: "/" });
    render(<QueryClientProvider client={client()}><Router hook={hook}><ElectionCard election={{ ...election72, date: "2026-11-03T00:00:00.000Z" } as any} viewMode="grid" /></Router></QueryClientProvider>);
    expect(await screen.findByTestId("card-qualification-72")).toHaveTextContent("Includes FEC registrations; ballot status not confirmed.");
  });
});
