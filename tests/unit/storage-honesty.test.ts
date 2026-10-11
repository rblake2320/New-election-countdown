import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Strict-type tranche 1 surfaced real behaviour defects, not just types. These tests pin
// the honest behaviour: degraded storage never fakes a write, the watchlist update exists,
// results ingestion refuses explicitly until ET-6, and DR queries use real columns.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const ROOT = join(__dirname, "..", "..", "server");
const { MemStorage } = await import("../../server/mem-storage");

describe("MemStorage (database degraded) never fakes persistence", () => {
  const mem = new MemStorage();
  it.each([
    ["deleteUserData", () => mem.deleteUserData(1)],
    ["updateUserPreferences", () => mem.updateUserPreferences("u1", {} as any)],
    ["updateUserDemographics", () => mem.updateUserDemographics(1, {})],
    ["exportUserData", () => mem.exportUserData(1)],
    ["updateWatchlistItem", () => mem.updateWatchlistItem("u1", 1, { status: "done" })],
    ["createNotificationDelivery", () => mem.createNotificationDelivery({} as any)],
    ["updateUserNotificationPreferences", () => mem.updateUserNotificationPreferences("u1", {})],
  ])("%s refuses with a 503 storage_degraded error", async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ status: 503, publicCode: "storage_degraded" });
  });

  it("serves in-memory candidate positions and Q&A honestly (empty, then what was written)", async () => {
    expect(await mem.getCandidatePositions(42)).toEqual([]);
    expect(await mem.getCandidateQAEntries(42)).toEqual([]);
    const created = await mem.createCandidatePosition({ candidateId: 42, category: "economy", position: "x" } as any);
    expect((await mem.getCandidatePositions(42)).map((p) => p.id)).toEqual([created.id]);
    expect(await mem.getCandidatePositionById(created.id)).toMatchObject({ candidateId: 42 });
    await mem.updateCandidatePosition(created.id, { position: "y" } as any);
    expect((await mem.getCandidatePositionById(created.id)) as any).toMatchObject({ position: "y" });
    await mem.deleteCandidatePosition(created.id);
    expect(await mem.getCandidatePositions(42)).toEqual([]);
    expect(await mem.getUserNotificationSubscriptions("u1")).toEqual([]);
    expect(await mem.getUserNotificationPreferences("u1")).toBeNull();
  });
});

describe("analytics members the live routes call", () => {
  it("recordEngagement refuses without a session id instead of inserting a NOT NULL violation", async () => {
    const { DatabaseStorage } = await import("../../server/storage");
    const s = new DatabaseStorage();
    await expect(s.recordEngagement({ userId: "u1", timeOnPage: 3 })).rejects.toMatchObject({ status: 400, publicCode: "session_required" });
  });

  it("updateUserDemographics validates and only accepts the self-reported subset", async () => {
    const { DatabaseStorage, userDemographicsSchema } = await import("../../server/storage");
    const s = new DatabaseStorage();
    await expect(s.updateUserDemographics("u1", { state: 42 } as any)).rejects.toMatchObject({ status: 400, publicCode: "invalid_demographics" });
    expect(Object.keys(userDemographicsSchema.shape).sort()).toEqual(["city", "congressionalDistrict", "issueInterests", "partyAffiliations", "state"]);
    expect(userDemographicsSchema.safeParse({ state: "VA", userId: "someone-else" }).success).toBe(true);
    expect("userId" in (userDemographicsSchema.parse({ state: "VA", userId: "someone-else" }) as object)).toBe(false);
  });
});

describe("Track 4 runbook routes validate against the table contract", () => {
  const routes = readFileSync(join(ROOT, "routes", "track4-runbook-routes.ts"), "utf8");
  it("uses the shared insert schemas, not hand-written field names the tables lack", () => {
    expect(routes).toMatch(/const createRunbookSchema = insertIncidentRunbookSchema\.extend\(/);
    expect(routes).toMatch(/const createRunbookStepSchema = insertRunbookStepSchema;/);
    expect(routes).toMatch(/const createEscalationTreeSchema = insertContactEscalationTreeSchema\.extend\(/);
    for (const bad of ["runbookTitle", "stepTitle", "treeName", "stepDescription"]) expect(routes, bad).not.toContain(bad);
  });
  it("reads runbook steps by the runbook's string id and executions by the integer pk", () => {
    expect(routes).toMatch(/const runbookId = String\(req\.params\.runbookId\);\s*const steps = await storage\.getRunbookStepsByOrder\(runbookId\)/);
    expect(routes).toContain("error: 'invalid_runbook_id'");
  });
});

describe("storage contract and real columns", () => {
  const storage = readFileSync(join(ROOT, "storage.ts"), "utf8");
  const factory = readFileSync(join(ROOT, "storage-factory.ts"), "utf8");
  const eps = readFileSync(join(ROOT, "event-processing-service.ts"), "utf8");

  it("updateWatchlistItem is implemented on DatabaseStorage (it is called by PATCH /api/watchlist/:itemId)", () => {
    expect(storage).toMatch(/async updateWatchlistItem\(userId: string, itemId: number/);
    expect(storage).toMatch(/\.update\(watchlist\)/);
  });

  it("DR queries reference columns that exist", () => {
    for (const bad of ["rtoRpoMeasurements.measuredAt", "backupHealthMetrics.metricTimestamp", "failoverDrillConfigurations.triggerType", "failoverDrillConfigurations.nextScheduledRun"]) {
      expect(storage, bad).not.toContain(bad);
    }
  });

  it("the storage export is typed as the declared contract, still forwarded by a Proxy", () => {
    expect(factory).toMatch(/export const storageFactory: StorageFactory & IStorage = new Proxy\(/);
  });

  it("recommendation cache writes always carry the NOT NULL recommendation_type", () => {
    expect(storage).toMatch(/const recommendationType = /);
    expect(storage).toMatch(/values\(\{ userId, cacheKey, recommendationType, recommendationData/);
  });

  it("raw SQL uses columns that exist (seconds, recovery_complete_time, metric_date, health_score)", () => {
    for (const bad of ["m.measured_at", "measured_at >=", "m.actual_rto_minutes", "m.actual_rpo_minutes", "t.rto_target_minutes,", "t.rpo_target_minutes,", "metric_value", "metric_timestamp"]) {
      expect(storage, bad).not.toContain(bad);
    }
    expect(storage).toContain("m.actual_rto_seconds <= t.rto_target_seconds");
  });

  it("escalation-tree lookup reads the QueryResult rows instead of destructuring it as an array", () => {
    expect(storage).not.toMatch(/const \[tree\] = await db\.execute/);
    expect(storage).toMatch(/const result = await db\.execute\(sql`\s*SELECT \* FROM contact_escalation_trees/);
  });

  it("no Drizzle table is re-imported dynamically (that erased the query types)", () => {
    expect(storage).not.toMatch(/await import\('@shared\/schema'\)/);
    expect(storage).not.toMatch(/await import\('drizzle-orm'\)/);
  });

  it("the storage factory notifies a coordinator method that exists", () => {
    const coordinator = readFileSync(join(ROOT, "services", "disaster-recovery-coordinator.ts"), "utf8");
    expect(factory).toContain("disasterRecoveryCoordinator.recordFailoverEvent(event)");
    expect(coordinator).toMatch(/public async recordFailoverEvent\(event: Record<string, unknown>\)/);
  });

  it("event processing no longer subscribes to a monitor event API that does not exist", () => {
    expect(eps).not.toContain("realTimeMonitor.on(");
    expect(eps).not.toContain("connectToRealTimeMonitor");
  });

  it("results ingestion fails closed until ET-6 instead of calling missing methods", () => {
    expect(eps).toContain("requireIngest('updateCandidateResults')");
    expect(eps).toContain("requireIngest('updateElection')");
    expect(eps).toContain("requireIngest('updateCandidate')");
    expect(eps).not.toMatch(/storage\.(updateCandidateResults|updateElection|updateCandidate)\(/);
    expect(eps).toMatch(/publicCode: 'not_implemented'/);
  });
});
