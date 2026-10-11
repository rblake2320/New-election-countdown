import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCandidates } from "../client/src/hooks/use-elections";

// ET-32: GET /api/elections/37/candidates (AK governor) returned the AK Senate
// candidates via the server's similar-election fallback (rows carry source_election_id).
describe("useCandidates keeps only the requested race", () => {
  afterEach(() => vi.unstubAllGlobals());
  const wrap = () => { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>; };

  it("drops fallback rows from another election", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
      { id: 1, name: "Dan Sullivan", party: "R", source_election_id: 2 },
      { id: 2, name: "Mary Peltola", party: "D", source_election_id: 2 },
    ]))));
    const { result } = renderHook(() => useCandidates(37), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("keeps direct rows (no source_election_id) and rows sourced from this race", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
      { id: 3, name: "Direct", party: "D" }, { id: 4, name: "Same race", party: "R", source_election_id: 37 },
    ]))));
    const { result } = renderHook(() => useCandidates(37), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(c => c.name)).toEqual(["Direct", "Same race"]);
  });
});
