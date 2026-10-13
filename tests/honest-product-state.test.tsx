/**
 * Owner decisions 2026-10-13 ("honest product state"): the Global Observatory is hidden
 * until a verified international source exists, and a race with no candidates recorded
 * yet says so instead of showing nothing. (Portal early-access wording is tested in
 * campaign-portal-exports.test.tsx; the detail-page header in detail-header.test.tsx.)
 * Real components; only fetch is stubbed at the network boundary.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { TooltipProvider } from "../client/src/components/ui/tooltip";
import { NavigationSidebar } from "../client/src/components/navigation-sidebar";
import { ElectionCard } from "../client/src/components/election-card";
import App from "../client/src/App";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
Element.prototype.scrollIntoView ??= () => {};
// jsdom has no matchMedia (every supported browser does); the full app's theme code calls it.
window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as any;

const election = { id: 37, title: "U.S. Senate Special Election - Oklahoma", subtitle: "", location: "OK", state: "OK", type: "special", level: "federal",
  date: "2026-11-03T00:00:00.000Z", offices: ["U.S. Senate"], description: "", pollsOpen: null, pollsClose: null, timezone: null, isActive: true } as any;

const stub = (candidates: unknown[] = []) => vi.stubGlobal("fetch", vi.fn(async (url: string) => {
  if (url === "/api/auth/me") return new Response(JSON.stringify({ user: { id: "a1", email: "ops@example.org", role: "admin" } }));
  if (url.includes("/candidates")) return new Response(JSON.stringify(candidates));
  return new Response("[]");
}));
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("honest product state (owner decisions 2026-10-13)", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.pushState({}, "", "/"); });

  it("the admin navigation lists real admin tools and no Global Observatory", async () => {
    stub();
    const { hook } = memoryLocation({ path: "/" });
    const { container } = render(<QueryClientProvider client={client()}><TooltipProvider><Router hook={hook}><NavigationSidebar /></Router></TooltipProvider></QueryClientProvider>);
    expect(await screen.findByText("Congress Admin")).toBeInTheDocument(); // the admin section is rendered
    expect(screen.queryByText(/Global Observatory/)).toBeNull();
    expect([...container.querySelectorAll("a")].map(a => a.getAttribute("href"))).not.toContain("/global");
  });

  it("/global is not a page any more", { timeout: 40000 }, async () => {
    stub();
    const { hook } = memoryLocation({ path: "/global" });
    render(<Router hook={hook}><App /></Router>);
    // The app lazy-loads pages; a cold start can be slow, hence the generous wait.
    await waitFor(() => expect(document.body.textContent).toMatch(/Page Not Found/), { timeout: 30000 });
    expect(screen.queryByText("Global Election Observatory")).toBeNull();
  });

  it("a race with no candidates recorded says so on its card (never silence, never '0 candidates')", async () => {
    stub([]);
    const { hook } = memoryLocation({ path: "/" });
    render(<QueryClientProvider client={client()}><Router hook={hook}><ElectionCard election={election} viewMode="grid" /></Router></QueryClientProvider>);
    expect(await screen.findByTestId("no-candidates-37")).toHaveTextContent("Candidates not yet recorded for this race.");
    expect(screen.queryByText(/\b0 candidates/)).toBeNull();
  });

  it("a race that has candidates shows them, not the 'not yet recorded' line", async () => {
    stub([{ id: 1, name: "Dan Sullivan", party: "R", electionId: 37, isIncumbent: true }, { id: 2, name: "Mary Peltola", party: "D", electionId: 37 }]);
    const { hook } = memoryLocation({ path: "/" });
    render(<QueryClientProvider client={client()}><Router hook={hook}><ElectionCard election={election} viewMode="grid" /></Router></QueryClientProvider>);
    expect(await screen.findByText(/Dan Sullivan/)).toBeInTheDocument();
    expect(screen.queryByTestId("no-candidates-37")).toBeNull();
  });
});
