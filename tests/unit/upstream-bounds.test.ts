import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ET-5 concurrency finding: enrichment must never pin a request on an unreachable
// provider. Local data is served within a fixed budget; providers are cancelled.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const { boundedUpstreamFetch, withBudget, memoize, setUpstreamFetch, UpstreamTimeoutError } = await import("../../server/upstream-fetch");
const { CivicAggregatorService } = await import("../../server/civic-aggregator-service");

const hanging = (() => new Promise<never>(() => {})) as any;
function response(body: string, init: { status?: number; contentLength?: number } = {}) {
  const bytes = Buffer.from(body);
  return {
    ok: (init.status ?? 200) < 400, status: init.status ?? 200,
    headers: new Map([["content-length", String(init.contentLength ?? bytes.length)]]),
    body: (async function* () { yield new Uint8Array(bytes); })(),
    text: async () => body,
  };
}

afterEach(() => { setUpstreamFetch(null); delete process.env.POLLING_CSV_URL; CivicAggregatorService.resetPollingCache(); });

describe("boundedUpstreamFetch", () => {
  it("aborts a hanging provider at the deadline and passes the signal to the transport", async () => {
    let seenSignal: AbortSignal | undefined;
    setUpstreamFetch((_u, init) => { seenSignal = init?.signal; return hanging(); });
    const t = Date.now();
    await expect(boundedUpstreamFetch("https://example.invalid/x", {}, { timeoutMs: 150, label: "p" })).rejects.toBeInstanceOf(UpstreamTimeoutError);
    expect(Date.now() - t).toBeLessThan(1500);
    expect(seenSignal?.aborted).toBe(true);
  });

  it("caps oversized bodies by declared length and by bytes received", async () => {
    setUpstreamFetch(async () => response("x", { contentLength: 99 }));
    await expect((await boundedUpstreamFetch("https://example.invalid/a", {}, { maxBodyBytes: 10 })).text()).rejects.toThrow(/exceeds/);
    setUpstreamFetch(async () => response("y".repeat(50), { contentLength: 0 }));
    await expect((await boundedUpstreamFetch("https://example.invalid/b", {}, { maxBodyBytes: 10 })).text()).rejects.toThrow(/exceeds/);
  });

  it("returns ok/status/json for a normal response", async () => {
    setUpstreamFetch(async () => response(JSON.stringify({ results: [1] })));
    const r = await boundedUpstreamFetch("https://example.invalid/c");
    expect(r.ok).toBe(true);
    expect(await r.json()).toEqual({ results: [1] });
  });
});

describe("withBudget", () => {
  it("serves the fallback at the ceiling and signals the work to stop", async () => {
    let aborted = false;
    const t = Date.now();
    const v = await withBudget("slow", 120, (signal) => new Promise<string>((resolve) => { signal.addEventListener("abort", () => { aborted = true; }); setTimeout(() => resolve("late"), 5000); }), "local");
    expect(v).toBe("local");
    expect(aborted).toBe(true);
    expect(Date.now() - t).toBeLessThan(1500);
  });
  it("returns the fallback on error without throwing", async () => {
    expect(await withBudget("boom", 1000, async () => { throw new Error("provider down"); }, 7)).toBe(7);
  });
});

describe("memoize", () => {
  it("loads once within the TTL and caches a failure for the negative TTL", async () => {
    let calls = 0;
    const m = memoize<number>(10_000, 10_000, async () => { calls++; if (calls === 1) throw new Error("first fails"); return 42; });
    expect(await m.get()).toBeNull();
    expect(await m.get()).toBeNull(); // negative cache, no second call
    expect(calls).toBe(1);
    m.reset();
    expect(await m.get()).toBe(42);
    expect(await m.get()).toBe(42);
    expect(calls).toBe(2);
  });
});

describe("CivicAggregatorService under an unreachable provider", () => {
  let svc: InstanceType<typeof CivicAggregatorService>;
  beforeEach(() => { svc = new CivicAggregatorService(); CivicAggregatorService.resetPollingCache(); });

  it("returns local base data within the enrichment budget when every provider hangs", async () => {
    process.env.POLLING_CSV_URL = "https://polls.invalid/polls.csv";
    setUpstreamFetch(() => hanging());
    const t = Date.now();
    const out = await svc.getComprehensiveCandidateData(["Jane Doe"], "37");
    expect(Date.now() - t).toBeLessThan(5000); // ENRICHMENT_BUDGET_MS default 3.5 s, not 15 s
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "Jane Doe" });
    expect(out[0].pollingData).toBeUndefined();
  });

  it("does not touch the polling CSV when the caller only asks for votesmart", async () => {
    const urls: string[] = [];
    setUpstreamFetch(async (url: string) => { urls.push(url); return response(""); });
    await svc.getComprehensiveCandidateData(["Jane Doe"], "37", ["votesmart"]);
    expect(urls.some(u => u.includes("polls.csv"))).toBe(false);
  });

  it("downloads the polling CSV at most once across candidates and requests", async () => {
    let csvFetches = 0;
    setUpstreamFetch(async (url: string) => { if (url.includes("polls.csv")) { csvFetches++; return response("pollster,date,candidate,pct\nA,2026-10-01,Jane Doe,51\n"); } return response(""); });
    await svc.getComprehensiveCandidateData(["Jane Doe", "John Roe"], "37", ["polling"]);
    await svc.getComprehensiveCandidateData(["Jane Doe"], "37", ["polling"]);
    expect(csvFetches).toBe(1);
  });
});

describe("route composition", () => {
  it("elections enrichment asks only for votesmart and the aggregator has no raw fetch left", () => {
    const routes = readFileSync(join(__dirname, "..", "..", "server", "routes", "elections.ts"), "utf8");
    expect((routes.match(/getComprehensiveCandidateData\(\[searchId\], [^\n]*\['votesmart'\]\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    const svc = readFileSync(join(__dirname, "..", "..", "server", "civic-aggregator-service.ts"), "utf8");
    expect(svc).not.toMatch(/await fetch\(/);
    expect(svc).not.toMatch(/from 'node-fetch'/);
  });
});
