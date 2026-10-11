import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Strict tranche 3 pins: GDPR routes pass the real (uuid) user id, the failover routes await
// the orchestration facade (a Promise used to be serialised as {}), and the analytics service
// has one engagement-score implementation that writes numeric columns as strings.
const SERVER = join(__dirname, "..", "..", "server");
const read = (...p: string[]) => readFileSync(join(SERVER, ...p), "utf8");

describe("GDPR export/delete use the string user id end to end", () => {
  it("routes no longer parseInt a uuid", () => {
    const routes = read("routes.ts");
    expect(routes).not.toMatch(/parseInt\(user\.id\)/);
    expect(routes).toContain("storage.exportUserData(user.id)");
    expect(routes).toContain("storage.deleteUserData(user.id)");
    expect(routes).toContain("error: 'export_unavailable'");
  });
  it("the contract is string-typed on every storage implementation and the analytics service", () => {
    expect(read("storage.ts")).toMatch(/exportUserData\(userId: string\): Promise<any>;\s*deleteUserData\(userId: string\): Promise<boolean>;/);
    for (const f of ["storage.ts", "storage-factory.ts"]) expect(read(f), f).toMatch(/async deleteUserData\(userId: string\)/);
    for (const f of ["mem-storage.ts", "replica-storage.ts"]) expect(read(f), f).toMatch(/deleteUserData\(_userId: string\)/);
    const analytics = read("analytics-service.ts");
    expect(analytics).toMatch(/async exportUserData\(userId: string\)/);
    expect(analytics).toMatch(/async deleteUserData\(userId: string\)/);
    // parameterised legacy deletes, not string interpolation into SQL
    expect(analytics).not.toContain("sql.raw(");
    expect(analytics).toContain("DELETE FROM ${sql.identifier(table)} WHERE user_id = ${userId}");
  });
});

describe("failover routes await the orchestration facade", () => {
  const routes = read("routes", "failover.ts");
  it("every facade call is awaited and the facade exposes what the routes call", () => {
    expect(routes).not.toMatch(/[^t] failoverOrchestrationService\.(getStatus|getFailoverRules|getExecutionHistory|getActiveExecutions|updateFailoverRule)\(/);
    for (const m of ["getStatus", "getFailoverRules", "getExecutionHistory", "getActiveExecutions", "updateFailoverRule"]) {
      expect(routes, m).toContain(`await failoverOrchestrationService.${m}(`);
    }
    const facade = read("services", "failover-orchestration-service.ts");
    for (const m of ["getActiveExecutions", "updateFailoverRule", "triggerManualFailover"]) expect(facade, m).toMatch(new RegExp(`\\n  async ${m}\\(`));
    expect(facade).toMatch(/updateFailoverRule\(ruleId: string, updates: Partial<FailoverRule>\): boolean/);
    expect(routes).toContain("error: 'rule_not_found'");
  });
});

describe("analytics service", () => {
  const analytics = read("analytics-service.ts");
  it("has exactly one engagement-score implementation (the database-backed one) with numeric columns as strings", () => {
    expect(analytics.match(/async calculateUserEngagementScore\(/g)).toHaveLength(1);
    expect(analytics).toContain("totalScore: (totalScore).toFixed(2)");
    expect(analytics).toContain("confidenceLevel: (this.calculateConfidenceLevel(events.length)).toFixed(2)");
  });
  it("reads the session from the X-Session-Id header (no session middleware is mounted)", () => {
    expect(analytics).not.toContain("req.sessionID");
    expect(analytics).toContain("req.headers['x-session-id']");
  });
  it("tracks the request's user agent and ip on the event contract", () => {
    expect(analytics).toMatch(/export interface EventTrackingData \{[\s\S]*userAgent\?: string;\s*ipAddress\?: string;/);
  });
});

describe("candidate detail route (tranche 4)", () => {
  const elections = read("routes", "elections.ts");
  it("builds race context from the election row and refuses a candidate from another race", () => {
    expect(elections).toContain("office: election.title,");
    expect(elections).toContain("state: election.state,");
    expect(elections).not.toMatch(/office: candidate\.office|state: candidate\.state|district: candidate\.district/);
    expect(elections).toContain("error: 'Candidate is not in this election'");
    // baseResponse exists before enrichment so a provider failure still returns the row (it used to be a ReferenceError)
    expect(elections.indexOf("const baseResponse: CandidateDetailResponse = {")).toBeLessThan(elections.lastIndexOf("civicAggregatorService.getComprehensiveCandidateData([searchId]"));
    // the list route also takes race context from the election row
    expect(elections).toContain("const election = await storage.getElection(id);\r\n    if (!election) return res.status(404).json({ error: 'election not found' });\r\n\r\n    // Helper function".replace(/\r\n/g, elections.includes("\r\n") ? "\r\n" : "\n"));
  });
  it("VoteSmart responses are typed at the transport, not read off {}", () => {
    const vs = read("services", "votesmart-service.ts");
    for (const t of ["CandidatesResponse", "BioResponse", "NpatResponse", "VotesResponse", "RatingsResponse", "CategoriesResponse"]) {
      expect(vs, t).toMatch(new RegExp(`makeRequest<${t}>`));
    }
    expect(vs).not.toMatch(/Array\.isArray\(response\./);
  });
});

describe("notification queue processor", () => {
  it("drives delivery rows and never the removed in-memory maps", () => {
    const queue = read("services", "notification-queue-service.ts");
    expect(queue).toContain("await this.processNotificationDelivery(delivery);");
    expect(queue).toContain("errorCode: 'provider_not_configured'");
    expect(queue).not.toMatch(/this\.(queue|completed|failed|processing)\./);
  });
});
