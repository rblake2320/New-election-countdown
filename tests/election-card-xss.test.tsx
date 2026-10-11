import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ElectionCard } from "../client/src/components/election-card";

// ET-23: the details dialog rendered external AI output with dangerouslySetInnerHTML
// and linked AI-provided sources without a protocol check.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

const HOSTILE = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script>Line one\nLine two';

describe("ElectionCard details dialog with hostile AI content", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete (window as any).__pwned; });

  it("renders AI analysis as text and never links non-http(s) sources", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.startsWith("/api/election-details/")) {
        return new Response(JSON.stringify({ aiAnalysis: HOSTILE, sources: ["javascript:window.__pwned=3", "https://www.sos.state.tx.us/elections/"] }));
      }
      if (url === "/api/auth/me") return new Response("{}", { status: 401 });
      return new Response("[]");
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { hook } = memoryLocation({ path: "/" });
    const election = { id: 32, title: "U.S. Senate Election - Texas", subtitle: "", location: "TX", state: "TX", type: "general", level: "federal",
      date: "2026-11-03T00:00:00.000Z", offices: ["U.S. Senate"], description: "", pollsOpen: null, pollsClose: null, timezone: null, isActive: true } as any;
    render(<QueryClientProvider client={qc}><Router hook={hook}><ElectionCard election={election} viewMode="grid" /></Router></QueryClientProvider>);

    fireEvent.click(screen.getByRole("button", { name: /details/i }));
    await screen.findByText("AI Analysis");               // dialog content loaded (old and new code alike)
    await waitFor(() => expect(document.body.textContent).toContain("Line one"));
    // The hostile markup must not become elements (old code injected <img onerror>).
    expect(document.querySelector('img[src="x"], img[onerror], [role="dialog"] script')).toBeNull();
    expect(document.body.textContent).toContain('<img src=x onerror="window.__pwned=1">'); // shown literally
    expect((window as any).__pwned).toBeUndefined();

    await waitFor(() => expect(screen.getByText("javascript:window.__pwned=3")).toBeTruthy());
    expect(screen.getByText("javascript:window.__pwned=3").closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: "https://www.sos.state.tx.us/elections/" }).getAttribute("href")).toBe("https://www.sos.state.tx.us/elections/");
  });
});
