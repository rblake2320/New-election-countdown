import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import ElectionDetails from "../client/src/pages/election-details";

// ET-36: /elections/:id header on phones. Real page and hooks; /api/elections/2 and
// its /candidates are the bytes the server returned (tests/fixtures/election-2).
// Layout itself (no clipping at 320–390px) is measured in real browsers; jsdom
// checks the semantics that layout depends on.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

const dir = resolve(process.cwd(), "tests/fixtures/election-2");
const electionBody = readFileSync(resolve(dir, "election.body.json"));
const candidateRows = JSON.parse(readFileSync(resolve(dir, "candidates.body.json"), "utf8"));

function mount(candidates: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/elections/2") return new Response(electionBody, { status: 200 });
    if (url === "/api/elections/2/candidates") return new Response(JSON.stringify(candidates), { status: 200 });
    return new Response("{}", { status: 404 });
  }));
  const { hook } = memoryLocation({ path: "/elections/2" });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <Router hook={hook}><Route path="/elections/:id"><ElectionDetails /></Route></Router>
  </QueryClientProvider>);
}

describe("election detail header (ET-36)", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("Back is one link (no button inside a link) and the stats row can wrap", async () => {
    mount(candidateRows);
    const title = await screen.findByRole("heading", { level: 1, name: "U.S. Senate Election - Alaska" });
    const header = title.parentElement!.parentElement!;
    const back = within(header).getByRole("link", { name: /back/i });
    expect(back.getAttribute("href")).toBe("/");
    expect(back.querySelector("button")).toBeNull();
    expect(back.closest("button")).toBeNull();
    expect(await within(header).findByText("2 candidates")).toBeTruthy();
    expect(title.nextElementSibling!.className).toMatch(/\bflex-wrap\b/);
  });

  it("a single candidate is not labelled \"1 candidates\"", async () => {
    mount(candidateRows.slice(0, 1));
    expect(await screen.findByText("1 candidate")).toBeTruthy();
    expect(screen.queryByText("1 candidates")).toBeNull();
  });
});
