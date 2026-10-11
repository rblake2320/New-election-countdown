import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "../client/src/hooks/use-auth";

// Regression for lane D's browser finding: after logout the cards still showed the
// previous user's "Watching" state from the query cache.
describe("useAuth user switch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resets user-scoped queries when the signed-in user changes, keeps the auth query", async () => {
    let me: unknown = { user: { id: "u1", email: "a@x.test" } };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/auth/me") return new Response(JSON.stringify(me), { status: me ? 200 : 401 });
      return new Response("{}", { status: 200 });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe("u1"));

    qc.setQueryData(["/api/watchlist"], [{ electionId: 32 }]); // u1's watchlist cached
    me = null; // u1 signs out
    await qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    await waitFor(() => expect(qc.getQueryData(["/api/watchlist"])).toBeUndefined());
  });
});
