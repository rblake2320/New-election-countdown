import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import ElectionDetails from "../client/src/pages/election-details";

// ET-27 (owner UX review P1): /elections/2 showed "Election Not Found" while the
// server had answered 429. Real page, real hooks; only fetch is stubbed.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

const election = { id: 2, title: "U.S. Senate Election - Alaska", subtitle: "", location: "AK", state: "AK", type: "general", level: "federal",
  date: "2026-11-03T00:00:00.000Z", offices: ["U.S. Senate"], description: "", pollsOpen: null, pollsClose: null, timezone: null, isActive: true };

function mount(electionResponses: Array<() => Response>) {
  let n = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/elections/2") return electionResponses[Math.min(n++, electionResponses.length - 1)]();
    if (url.includes("general-candidates")) return new Response("{}", { status: 404 });
    if (url.includes("polling")) return new Response(JSON.stringify({ pollingData: [] }));
    return new Response("[]");
  }));
  const qc = new QueryClient();
  const { hook } = memoryLocation({ path: "/elections/2" });
  render(<QueryClientProvider client={qc}><Router hook={hook}><Route path="/elections/:id"><ElectionDetails /></Route></Router></QueryClientProvider>);
}
const status = (s: number) => () => new Response("{}", { status: s, headers: { "Retry-After": "0" } });
const ok = () => new Response(JSON.stringify(election), { status: 200 });

describe("election detail load failures", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("404 is the only case that says Not Found", async () => {
    mount([status(404)]);
    expect(await screen.findByText("Election Not Found")).toBeTruthy();
  });

  it("429 says busy with a retry, never Not Found", async () => {
    mount([status(429)]);
    expect(await screen.findByText("Election Tracker is busy right now")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Too many requests at the moment/)).toBeTruthy());
    expect(screen.queryByText("Election Not Found")).toBeNull();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("5xx says it could not load, never Not Found", async () => {
    mount([status(503)]);
    expect(await screen.findByText("We couldn't load this election")).toBeTruthy();
    expect(screen.queryByText("Election Not Found")).toBeNull();
  });

  it("Try again recovers the election once the server answers", async () => {
    mount([status(429), status(429), status(429), status(429), ok]);
    const btn = await screen.findByRole("button", { name: /try again/i });
    await waitFor(() => expect(screen.getByText(/Too many requests at the moment/)).toBeTruthy());
    fireEvent.click(btn);
    expect(await screen.findByText("U.S. Senate Election - Alaska")).toBeTruthy();
  });
});
