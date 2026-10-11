import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ET-5 strict-type follow-ups owned by Lane A: the Google Civic provider candidate DTO
// carries the full provenance shape, and CacheService exposes the generic get/set that
// PositionAggregator (Lane C) calls.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

vi.mock("../../server/db", () => ({ db: {}, pool: {} }));

const { toProviderCandidate } = await import("../../server/google-civic-service");
const { CacheService } = await import("../../server/cache-service");

describe("toProviderCandidate", () => {
  it("fills every provenance column honestly: provider-listed, not FEC, not certified", () => {
    const c = toProviderCandidate({ name: "Mary  O'Neil", party: "Democratic", candidateUrl: "https://x.example" }, 37, 1, new Date("2026-10-12T00:00:00Z"));
    expect(c).toMatchObject({
      id: 2001, electionId: 37, name: "Mary  O'Neil", party: "Democratic", website: "https://x.example",
      fecCandidateId: null, dataSource: "google_civic", sourceStatus: "provider_listed", fecStatus: null,
      ballotStatus: "not_certified", ballotSourceName: null, ballotSourceUrl: null, ballotVerifiedAt: null,
      sourceFileSha256: null, altFecIds: null, isVerified: false, isIncumbent: false,
    });
    expect(c.normalizedName).toBe(c.normalizedName?.toLowerCase());
    expect(c.normalizedName).toMatch(/^[a-z0-9]+$/);
    expect(c.sourceSyncedAt).toEqual(new Date("2026-10-12T00:00:00Z"));
    expect(JSON.stringify(c)).not.toMatch(/"(ballot_)?certified"/);
  });

  it("defaults party and website when the provider omits them", () => {
    const c = toProviderCandidate({ name: "X" }, 1, 0);
    expect(c.party).toBe("Unknown");
    expect(c.website).toBeNull();
  });

  it("is the only mapper used by the voter-info contest projection", () => {
    const src = readFileSync(join(__dirname, "..", "..", "server", "google-civic-service.ts"), "utf8");
    expect(src).toMatch(/candidates: contest\.candidates\?\.map\(\(candidate, index\) => toProviderCandidate\(candidate, election\.id, index\)\)/);
    expect(src).not.toMatch(/id: index \+ 2000, \/\/ Offset for Google Civic candidates\n\s+name: candidate\.name,/);
  });
});

describe("CacheService generic get/set", () => {
  afterEach(() => vi.useRealTimers());

  it("round-trips values under a namespaced key and honours TTL seconds", async () => {
    vi.useFakeTimers();
    const svc = new CacheService();
    try {
      await svc.set("positions-7", [{ category: "Economy" }], 60);
      expect(await svc.get<any[]>("positions-7")).toEqual([{ category: "Economy" }]);
      vi.advanceTimersByTime(59_000);
      expect(await svc.get("positions-7")).toEqual([{ category: "Economy" }]);
      vi.advanceTimersByTime(2_000);
      expect(await svc.get("positions-7")).toBeNull();
    } finally { svc.destroy(); }
  });

  it("caps TTL at one day, floors bad TTLs to the default, and isolates generic keys from sessions", async () => {
    vi.useFakeTimers();
    const svc = new CacheService();
    try {
      await svc.set("k", 1, 10 * 24 * 60 * 60);
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);
      expect(await svc.get("k")).toBeNull();
      await svc.set("j", 2, Number.NaN);
      vi.advanceTimersByTime(299_000);
      expect(await svc.get("j")).toBe(2);
      await svc.cacheUserSession("tok", { user: 1 });
      expect(await svc.get("session:tok")).toBeNull(); // generic namespace cannot read session entries
      await svc.delete("j");
      expect(await svc.get("j")).toBeNull();
    } finally { svc.destroy(); }
  });
});
