import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Sol's retake of 83138cc: HTTP responses were bounded but provider requests kept running
// (450 active at response time, 285 still active 5.5 s later) because the caller's budget
// signal was overwritten and identical requests were not shared. These tests assert the
// three repairs: signal linkage, single-flight dedup with refcounted cancel, settling to 0.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const uf = await import("../../server/upstream-fetch");
const { boundedUpstreamFetch, withBudget, setUpstreamFetch, upstreamInFlight, UpstreamAbortedError, UpstreamTimeoutError } = uf;
const { CivicAggregatorService } = await import("../../server/civic-aggregator-service");

/** A transport that honours AbortSignal like undici does: rejects when aborted, else hangs or answers. */
function transport(opts: { hang?: boolean; body?: string; onCall?: (url: string, init: any) => void } = {}) {
  const calls: { url: string; init: any }[] = [];
  const fn = (url: string, init: any) => {
    calls.push({ url, init }); opts.onCall?.(url, init);
    return new Promise<any>((resolve, reject) => {
      const sig: AbortSignal | undefined = init?.signal;
      const onAbort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      if (sig?.aborted) return onAbort();
      sig?.addEventListener("abort", onAbort, { once: true });
      if (!opts.hang) {
        const bytes = Buffer.from(opts.body ?? "{}");
        resolve({ ok: true, status: 200, headers: new Map([["content-length", String(bytes.length)]]), body: (async function* () { yield new Uint8Array(bytes); })(), text: async () => opts.body ?? "{}" });
      }
    });
  };
  return { fn, calls };
}
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => expect(upstreamInFlight()).toBe(0));
// Keyed providers only issue requests when a key is present; test values never leave the fake transport.
const TEST_KEYS = { PROPUBLICA_API_KEY: "test-only", OPENFEC_API_KEY: "test-only", OPENSTATES_API_KEY: "test-only" } as const;
beforeEach(() => { for (const [k, v] of Object.entries(TEST_KEYS)) process.env[k] = v; });
afterEach(() => { setUpstreamFetch(null); delete process.env.POLLING_CSV_URL; for (const k of Object.keys(TEST_KEYS)) delete process.env[k]; CivicAggregatorService.resetPollingCache(); });

describe("signal linkage", () => {
  it("forwards the caller's abort to the transport and rejects with UpstreamAbortedError", async () => {
    const t = transport({ hang: true }); setUpstreamFetch(t.fn);
    const ac = new AbortController();
    const p = boundedUpstreamFetch("https://p.invalid/a", { signal: ac.signal }, { timeoutMs: 10_000 });
    await tick(); expect(upstreamInFlight()).toBe(1);
    ac.abort();
    await expect(p).rejects.toBeInstanceOf(UpstreamAbortedError);
    expect(t.calls[0].init.signal.aborted).toBe(true);
    await tick(); expect(upstreamInFlight()).toBe(0);
  });

  it("still times out on its own deadline when the caller never aborts", async () => {
    const t = transport({ hang: true }); setUpstreamFetch(t.fn);
    await expect(boundedUpstreamFetch("https://p.invalid/b", {}, { timeoutMs: 80 })).rejects.toBeInstanceOf(UpstreamTimeoutError);
    expect(t.calls[0].init.signal.aborted).toBe(true);
    await tick(); expect(upstreamInFlight()).toBe(0);
  });
});

describe("single-flight dedup with refcounted cancel", () => {
  it("shares one transport call across concurrent identical GETs", async () => {
    const t = transport({ body: '{"v":1}' }); setUpstreamFetch(t.fn);
    const rs = await Promise.all(Array.from({ length: 10 }, () => boundedUpstreamFetch("https://p.invalid/shared").then((r) => r.json())));
    expect(rs).toEqual(Array(10).fill({ v: 1 }));
    expect(t.calls).toHaveLength(1);
    await tick(); expect(upstreamInFlight()).toBe(0);
  });

  it("one subscriber leaving does not cancel; the last one does", async () => {
    const t = transport({ hang: true }); setUpstreamFetch(t.fn);
    const a = new AbortController(), b = new AbortController();
    const pa = boundedUpstreamFetch("https://p.invalid/dup", { signal: a.signal }, { timeoutMs: 10_000 });
    const pb = boundedUpstreamFetch("https://p.invalid/dup", { signal: b.signal }, { timeoutMs: 10_000 });
    await tick(); expect(t.calls).toHaveLength(1); expect(upstreamInFlight()).toBe(1);
    a.abort(); await expect(pa).rejects.toBeInstanceOf(UpstreamAbortedError);
    await tick(); expect(t.calls[0].init.signal.aborted).toBe(false); expect(upstreamInFlight()).toBe(1);
    b.abort(); await expect(pb).rejects.toBeInstanceOf(UpstreamAbortedError);
    await tick(); expect(t.calls[0].init.signal.aborted).toBe(true); expect(upstreamInFlight()).toBe(0);
  });

  it("does not share non-idempotent requests", async () => {
    const t = transport({ body: "{}" }); setUpstreamFetch(t.fn);
    const rs = await Promise.all([boundedUpstreamFetch("https://p.invalid/post", { method: "POST", body: "a" }), boundedUpstreamFetch("https://p.invalid/post", { method: "POST", body: "b" })]);
    await Promise.all(rs.map((r) => r.text()));
    expect(t.calls).toHaveLength(2);
    await tick(); expect(upstreamInFlight()).toBe(0);
  });
});

describe("enrichment settles its upstream work when the budget expires", () => {
  it("aggregator: every provider request is aborted and in-flight returns to 0 right after the fallback", async () => {
    process.env.POLLING_CSV_URL = "https://polls.invalid/polls.csv";
    const t = transport({ hang: true }); setUpstreamFetch(t.fn);
    const svc = new CivicAggregatorService();
    const started = Date.now();
    const out = await withBudget("enrich", 150, (signal) => (svc as any).aggregateCandidateData("Jane Doe", "37", ["propublica", "fec", "openstates"], signal), { id: "Jane Doe", name: "", party: "", office: "" });
    expect(Date.now() - started).toBeLessThan(1500);
    expect(out.id).toBe("Jane Doe");
    expect(t.calls.length).toBeGreaterThan(0);
    for (const c of t.calls) expect(c.init.signal?.aborted, c.url).toBe(true);
    await tick(50);
    expect(upstreamInFlight()).toBe(0);
  });

  it("30 concurrent enrichments of the same candidate open one request per provider, not 30", async () => {
    const t = transport({ hang: true }); setUpstreamFetch(t.fn);
    const svc = new CivicAggregatorService();
    await Promise.all(Array.from({ length: 30 }, () => withBudget("enrich", 120, (signal) => (svc as any).aggregateCandidateData("Jane Doe", "37", ["fec", "openstates"], signal), null)));
    const distinct = new Set(t.calls.map((c) => c.url));
    expect(distinct.size).toBeGreaterThanOrEqual(2); // fec + openstates actually requested
    expect(t.calls.length).toBe(distinct.size); // one transport call per distinct URL
    await tick(50);
    expect(upstreamInFlight()).toBe(0);
  });
});

describe("source composition", () => {
  it("votesmart-service uses the bounded transport inside a per-call signal scope and never retries after abort", () => {
    const src = readFileSync(join(__dirname, "..", "..", "server", "services", "votesmart-service.ts"), "utf8");
    expect(src).not.toMatch(/await fetch\(/);
    expect(src).toContain("requestSignal.run(signal");
    expect(src).toContain("if (signal?.aborted) return null;");
    expect(src).toContain("boundedUpstreamFetch(url.toString(), {");
  });
  it("aggregator threads the budget signal into every provider call", () => {
    const src = readFileSync(join(__dirname, "..", "..", "server", "civic-aggregator-service.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(src).toContain("(signal) => this.aggregateCandidateData(id, electionId, fields, signal)");
    expect((src.match(/\{ signal \}\)|signal,\n\s+headers:|getComprehensiveCandidateData\(candidateId, signal\)/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
