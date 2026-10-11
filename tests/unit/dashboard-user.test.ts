import { describe, it, expect } from "vitest";
import { buildDashboardUser } from "../../server/dashboard-user";
import type { User } from "@shared/schema";

// Regression for /api/auth/dashboard 500 (2026-10-11): a freshly registered
// account has NULL first/last name and email_verified=false; the dashboard
// response schema rejected `null` for optional string fields.
const base: User = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "new.user@example.com",
  passwordHash: "x",
  emailVerified: false,
  role: "user",
  lastLogin: null,
  firstName: null,
  lastName: null,
  profileImageUrl: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  updatedAt: new Date("2026-10-01T00:00:00Z"),
} as unknown as User;

describe("buildDashboardUser", () => {
  it("accepts a new account with null names and unverified email", () => {
    const out = buildDashboardUser(base, new Date("2026-10-11T00:00:00Z"));
    expect(out.firstName).toBeUndefined();
    expect(out.lastName).toBeUndefined();
    expect(out.emailVerified).toBe(false);
    expect(out.daysSinceJoining).toBe(10);
    expect(out.joinedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("passes names through when present and reports verified email", () => {
    const out = buildDashboardUser({ ...base, firstName: "Ada", lastName: "Lovelace", emailVerified: true } as User);
    expect(out.firstName).toBe("Ada");
    expect(out.lastName).toBe("Lovelace");
    expect(out.emailVerified).toBe(true);
  });

  it("never reports negative days when createdAt is in the future (clock skew)", () => {
    const out = buildDashboardUser({ ...base, createdAt: new Date("2026-12-01T00:00:00Z") } as User, new Date("2026-10-11T00:00:00Z"));
    expect(out.daysSinceJoining).toBe(0);
  });
});
