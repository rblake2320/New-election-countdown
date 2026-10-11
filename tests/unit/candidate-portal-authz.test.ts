import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// OR-01 acceptance (security-orange.md): pending and deactivated accounts must be denied
// with no write path reached; approved accounts proceed; a credential change revokes tokens.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const mod = await import("../../server/routes-candidate-portal");
const { evaluateCandidateSession, canWriteCandidateData, candidateTokenVersion, buildCandidateClaims } = mod;

const base = {
  id: 7, candidateId: 101, email: "c@example.org", passwordHash: "$2b$12$hash-one", role: "campaign_manager",
  subscriptionTier: "basic", isActive: true, emailVerified: true, lastLogin: null, campaignName: "X", campaignTitle: null,
  accessLevel: "full", createdAt: new Date(), updatedAt: new Date(),
} as any;

const claimsFor = (a: any) => ({ ...buildCandidateClaims(a), candidateId: a.candidateId });

describe("evaluateCandidateSession", () => {
  it("denies when no account exists for the token subject", () => {
    expect(evaluateCandidateSession(claimsFor(base), null)).toEqual({ ok: false, reason: "no_account" });
  });

  it("denies a pending (never approved) registration even with a valid-looking token", () => {
    const pending = { ...base, isActive: false, accessLevel: "pending" };
    expect(evaluateCandidateSession(claimsFor(pending), pending)).toEqual({ ok: false, reason: "pending" });
  });

  it("denies a deactivated account on the next request (no request-time grace)", () => {
    const token = claimsFor(base);
    const deactivated = { ...base, isActive: false };
    expect(evaluateCandidateSession(token, deactivated)).toEqual({ ok: false, reason: "inactive" });
  });

  it("denies a token whose candidate does not match the account's candidate", () => {
    const token = { ...claimsFor(base), candidateId: 999 };
    expect(evaluateCandidateSession(token, base)).toEqual({ ok: false, reason: "candidate_mismatch" });
  });

  it("revokes outstanding tokens when the password hash changes", () => {
    const token = claimsFor(base);
    const rotated = { ...base, passwordHash: "$2b$12$hash-two" };
    expect(candidateTokenVersion(rotated)).not.toBe(candidateTokenVersion(base));
    expect(evaluateCandidateSession(token, rotated)).toEqual({ ok: false, reason: "credential_changed" });
  });

  it("allows an approved, active, matching account with a current credential", () => {
    expect(evaluateCandidateSession(claimsFor(base), base)).toEqual({ ok: true });
  });
});

describe("canWriteCandidateData", () => {
  it("allows candidate and campaign_manager on full/limited accounts", () => {
    expect(canWriteCandidateData(base)).toBe(true);
    expect(canWriteCandidateData({ ...base, role: "candidate", accessLevel: "limited" })).toBe(true);
  });
  it("denies staff, view_only, pending and inactive accounts", () => {
    expect(canWriteCandidateData({ ...base, role: "staff" })).toBe(false);
    expect(canWriteCandidateData({ ...base, accessLevel: "view_only" })).toBe(false);
    expect(canWriteCandidateData({ ...base, accessLevel: "pending", isActive: false })).toBe(false);
    expect(canWriteCandidateData({ ...base, isActive: false })).toBe(false);
  });
});

describe("portal route composition", () => {
  const src = readFileSync(join(__dirname, "..", "..", "server", "routes-candidate-portal.ts"), "utf8");

  it("signup never issues a token and creates the account inactive/pending", () => {
    const start = src.indexOf("app.post('/api/candidate/signup'");
    const body = src.slice(start, src.indexOf("\n  app.", start + 1));
    expect(body).not.toMatch(/jwt\.sign|signCandidateToken/);
    expect(body).toContain("isActive: false");
    expect(body).toContain("accessLevel: 'pending'");
    expect(body).toContain("res.status(202)");
  });

  it("every mutating portal route requires write authority", () => {
    const mutating = src.match(/app\.(put|post|delete)\('\/api\/candidate(-portal)?\/[^']+', authenticateCandidate[^\n]*/g) ?? [];
    expect(mutating.length).toBeGreaterThanOrEqual(5);
    for (const line of mutating) expect(line).toContain("requireCandidateWrite");
  });

  it("tokens are audience- and issuer-scoped and verified with the same scope", () => {
    expect(src).toMatch(/jwt\.sign\(buildCandidateClaims\(account\), JWT_SECRET, \{ expiresIn: '7d', audience: CANDIDATE_TOKEN_AUDIENCE, issuer: CANDIDATE_TOKEN_ISSUER \}\)/);
    expect((src.match(/jwt\.sign\(/g) ?? []).length).toBe(1);
    expect(src).toMatch(/jwt\.verify\(token, JWT_SECRET, \{ audience: CANDIDATE_TOKEN_AUDIENCE, issuer: CANDIDATE_TOKEN_ISSUER \}\)/);
  });

  it("admin approval routes are behind the central admin gate", () => {
    for (const path of ["/api/admin/candidate-accounts", "/api/admin/candidate-accounts/:id/approve", "/api/admin/candidate-accounts/:id/deactivate"]) {
      const re = new RegExp(`app\\.(get|post)\\('${path.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}', \\.\\.\\.adminOnly`);
      expect(src).toMatch(re);
    }
  });
});
