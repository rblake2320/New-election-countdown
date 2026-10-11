import { describe, it, expect } from "vitest";

// OR-03 outcome tests for the upstream trust boundary. Network is never touched:
// boundedCatalogFetch takes an injected fetch implementation.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const mod = await import("../../server/real-time-monitor");
const { isAllowedTargetUrl, boundedCatalogFetch, MONITORING_TARGET_CATALOG, MONITOR_FETCH_LIMITS, RealTimeElectionMonitor } = mod;

describe("isAllowedTargetUrl", () => {
  it("accepts exact catalog hosts over https", () => {
    for (const entry of MONITORING_TARGET_CATALOG) expect(isAllowedTargetUrl(entry.url)).toBe(true);
    expect(isAllowedTargetUrl("https://results.sos.state.tx.us/some/path?x=1")).toBe(true);
  });

  it("rejects http, other hosts, lookalike subdomains, credentials and garbage", () => {
    expect(isAllowedTargetUrl("http://results.sos.state.tx.us")).toBe(false);
    expect(isAllowedTargetUrl("https://evil.example/results.sos.state.tx.us")).toBe(false);
    expect(isAllowedTargetUrl("https://results.sos.state.tx.us.evil.example")).toBe(false);
    expect(isAllowedTargetUrl("https://attacker.results.sos.state.tx.us")).toBe(false);
    expect(isAllowedTargetUrl("https://user:pw@results.sos.state.tx.us")).toBe(false);
    expect(isAllowedTargetUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedTargetUrl("not a url")).toBe(false);
  });
});

function fakeResponse(body: string, init: { status?: number; contentLength?: number } = {}) {
  const bytes = Buffer.from(body);
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: new Map([["content-length", String(init.contentLength ?? bytes.length)]]) as unknown as Headers,
    body: (async function* () { yield new Uint8Array(bytes); })(),
    text: async () => body,
  } as unknown as Response;
}

describe("boundedCatalogFetch", () => {
  it("refuses non-catalog destinations before any network call", async () => {
    let called = false;
    const f = (async () => { called = true; return fakeResponse("[]"); }) as unknown as typeof fetch;
    await expect(boundedCatalogFetch("https://evil.example/", f)).rejects.toThrow(/not in monitoring catalog/);
    expect(called).toBe(false);
  });

  it("passes redirect:'error' and an abort signal to fetch", async () => {
    let seen: RequestInit | undefined;
    const f = (async (_u: string, init?: RequestInit) => { seen = init; return fakeResponse("[]"); }) as unknown as typeof fetch;
    await boundedCatalogFetch(MONITORING_TARGET_CATALOG[0].url, f);
    expect(seen?.redirect).toBe("error");
    expect(seen?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects oversized bodies by declared length and by actual bytes", async () => {
    const declared = (async () => fakeResponse("[]", { contentLength: MONITOR_FETCH_LIMITS.maxBodyBytes + 1 })) as unknown as typeof fetch;
    await expect(boundedCatalogFetch(MONITORING_TARGET_CATALOG[0].url, declared)).rejects.toThrow(/size limit/);
    const big = "x".repeat(MONITOR_FETCH_LIMITS.maxBodyBytes + 10);
    const actual = (async () => fakeResponse(big, { contentLength: 0 })) as unknown as typeof fetch;
    await expect(boundedCatalogFetch(MONITORING_TARGET_CATALOG[0].url, actual)).rejects.toThrow(/size limit/);
  });

  it("rejects non-2xx upstreams", async () => {
    const f = (async () => fakeResponse("nope", { status: 503 })) as unknown as typeof fetch;
    await expect(boundedCatalogFetch(MONITORING_TARGET_CATALOG[0].url, f)).rejects.toThrow(/upstream 503/);
  });
});

describe("RealTimeElectionMonitor target policy", () => {
  it("enables catalog ids only and refuses arbitrary targets", () => {
    const m = new RealTimeElectionMonitor();
    expect(m.enableCatalogTarget("nope")).toBeNull();
    expect(m.enableCatalogTarget("tx-results")?.state).toBe("TX");
    expect(() => m.addMonitoringTarget({ url: "https://evil.example/api", type: "api", priority: "high" })).toThrow(/catalog/);
    expect(m.getEnabledTargetIds()).toEqual(MONITORING_TARGET_CATALOG.map(e => e.id));
  });
});
