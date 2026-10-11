import { describe, it, expect } from "vitest";

// Strict tranche 5: the consent service used to log and return made-up records (no consent
// stored, every check true, every token verified, invented email/phone in the GDPR export).
// These tests drive the real class over a table-shaped consent store (the storage methods
// it uses, kept in memory because CI has no PostgreSQL; the live probe covers the real
// storage). Providers are unconfigured here, so verification is honestly NOT sent.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const { ConsentManagementService } = await import("../../server/services/consent-management-service");

function tableStore() {
  const consents: any[] = []; const subs: any[] = []; let id = 1;
  const now = () => new Date();
  return {
    consents, subs,
    async getUser(uid: string) { return uid === "u1" ? { id: "u1", email: "u1@example.test" } as any : undefined; },
    async recordNotificationConsent(c: any) { const row = { id: id++, withdrawalDate: null, createdAt: now(), updatedAt: now(), ...c }; consents.push(row); return row; },
    async withdrawNotificationConsent(userId: string, type: string) { for (const c of consents) if (c.userId === userId && c.consentType === type && c.isActive) { c.isActive = false; c.consentGiven = false; c.withdrawalDate = now(); } },
    async getUserNotificationConsents(userId: string) { return consents.filter((c) => c.userId === userId).sort((a, b) => b.createdAt - a.createdAt); },
    async createNotificationSubscription(s: any) { const row = { id: id++, verifiedAt: null, unsubscribedAt: null, createdAt: now(), updatedAt: now(), ...s }; subs.push(row); return row; },
    async verifyNotificationSubscription(token: string) { const s = subs.find((x) => x.verificationToken === token); if (!s) return null; Object.assign(s, { isVerified: true, verifiedAt: now(), verificationToken: null }); return s; },
    async unsubscribeNotificationSubscriptionByToken(token: string) { const s = subs.find((x) => x.unsubscribeToken === token && x.isActive); if (!s) return null; Object.assign(s, { isActive: false, unsubscribedAt: now() }); return s; },
    async updateNotificationSubscription(sid: number, u: any) { const s = subs.find((x) => x.id === sid)!; Object.assign(s, u); return s; },
    async getUserNotificationSubscriptions(userId: string) { return subs.filter((s) => s.userId === userId); },
    async getUserNotificationPreferences(userId: string) { return userId === "u1" ? { phoneNumber: "+15555550123", timezone: "America/New_York" } as any : null; },
    async getNotificationDeliveries(_c?: number, userId?: string) { return userId === "u1" ? [{ id: 9, recipient: "u1@example.test", status: "sent" }] as any : []; },
    async getNotificationConsentsBetween(a: Date, b: Date) { return consents.filter((c) => c.consentDate >= a && c.consentDate <= b); },
    async getNotificationSubscriptionsVerifiedBetween(a: Date, b: Date) { return subs.filter((s) => s.verifiedAt && s.verifiedAt >= a && s.verifiedAt <= b); },
    async getExpiredNotificationConsents(asOf: Date) { return consents.filter((c) => c.isActive && c.consentGiven && c.dataRetentionPeriod && new Date(c.consentDate.getTime() + c.dataRetentionPeriod * 864e5) < asOf); },
  };
}

describe("ConsentManagementService stores and checks real consent rows", () => {
  it("records a grant, reports it valid, withdraws it and deactivates that channel's subscriptions", async () => {
    const store = tableStore();
    const svc = new ConsentManagementService({ store: store as any });
    expect(await svc.hasValidConsent("u1", "email")).toBe(false);
    const grant = await svc.recordConsent({ userId: "u1", consentType: "email", consentGiven: true, timestamp: new Date(), method: "preferences_page", legalBasis: "consent" });
    expect(grant.id).toBeGreaterThan(0);
    expect(store.consents).toHaveLength(1);
    expect(await svc.hasValidConsent("u1", "email")).toBe(true);

    const created = await svc.createSubscription({ userId: "u1", subscriptionType: "election_alerts", channel: "email", targetValue: "u1@example.test" });
    expect(created.verificationRequired).toBe(true);
    expect(created.verificationSent).toBe(false); // no provider configured: not pretended
    expect(created.subscription.isVerified).toBe(false);
    expect(store.subs[0].verificationToken).toMatch(/^verify_/);

    await svc.withdrawConsent("u1", "email");
    expect(await svc.hasValidConsent("u1", "email")).toBe(false);
    expect(store.consents.map((c) => [c.consentGiven, c.isActive])).toEqual([[false, false], [false, false]]);
    expect(store.subs[0]).toMatchObject({ isActive: false });
    expect(store.subs[0].unsubscribedAt).toBeInstanceOf(Date);
  });

  it("verifies and unsubscribes only with a real token", async () => {
    const store = tableStore();
    const svc = new ConsentManagementService({ store: store as any });
    const { subscription } = await svc.createSubscription({ userId: "u1", subscriptionType: "weekly_digest", channel: "sms", targetValue: "+15555550100" });
    expect(await svc.verifySubscription("nope")).toMatchObject({ success: false });
    expect(await svc.verifySubscription(store.subs[0].verificationToken)).toMatchObject({ success: true, subscriptionId: subscription.id });
    expect(store.subs[0].isVerified).toBe(true);
    expect(await svc.unsubscribeWithToken("nope")).toMatchObject({ success: false });
    expect(await svc.unsubscribeWithToken(store.subs[0].unsubscribeToken)).toMatchObject({ success: true });
    expect(store.subs[0].isActive).toBe(false);
  });

  it("exports the user's own data and refuses an unknown user; erasure deactivates and clears targets", async () => {
    const store = tableStore();
    const svc = new ConsentManagementService({ store: store as any });
    await svc.createSubscription({ userId: "u1", subscriptionType: "election_alerts", channel: "email", targetValue: "u1@example.test" });
    const out = await svc.exportUserData("u1");
    expect(out.personalData).toEqual({ email: "u1@example.test", phoneNumber: "+15555550123", timezone: "America/New_York" });
    expect(out.consents).toHaveLength(1);
    expect(out.subscriptions).toHaveLength(1);
    expect(out.deliveryHistory).toHaveLength(1);
    await expect(svc.exportUserData("ghost")).rejects.toMatchObject({ status: 404, publicCode: "user_not_found" });

    const erased = await svc.deleteUserData("u1");
    expect(erased.deleted).toBe(true);
    expect(store.subs[0]).toMatchObject({ isActive: false, targetValue: null });
    expect(store.consents.every((c) => !c.isActive)).toBe(true);
  });

  it("rejects malformed targets before anything is stored", async () => {
    const store = tableStore();
    const svc = new ConsentManagementService({ store: store as any });
    await expect(svc.createSubscription({ userId: "u1", subscriptionType: "election_alerts", channel: "email", targetValue: "not-an-email" })).rejects.toMatchObject({ status: 400, publicCode: "invalid_email" });
    expect(store.subs).toHaveLength(0);
  });

  it("retention and the audit report come from rows, not constants", async () => {
    const store = tableStore();
    const svc = new ConsentManagementService({ store: store as any });
    const old = new Date(Date.now() - 10 * 864e5);
    await svc.recordConsent({ userId: "u1", consentType: "sms", consentGiven: true, timestamp: old, method: "api", legalBasis: "consent", dataRetentionPeriod: 7 });
    await svc.recordConsent({ userId: "u1", consentType: "email", consentGiven: true, timestamp: new Date(), method: "signup", legalBasis: "consent", dataRetentionPeriod: 3650 });
    expect(await svc.processDataRetention()).toEqual({ processed: 1, deleted: 1, errors: 0 });
    expect(await svc.hasValidConsent("u1", "sms")).toBe(false);
    const report = await svc.generateConsentAuditReport(new Date(Date.now() - 30 * 864e5), new Date());
    expect(report.totalConsents).toBe(2);
    expect(report.consentsByType).toEqual({ email: 1 });
    expect(report.withdrawalsByType).toEqual({ sms: 1 });
    expect(report.complianceScore).toBe(100);
  });

  it("the mock responses are gone from the source", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const src = readFileSync(join(__dirname, "..", "..", "server", "services", "consent-management-service.ts"), "utf8");
    for (const gone of ["Return mock", "Mock implementation", "In a real implementation", "user@example.com", "+1234567890", "return true; // Mock"]) {
      expect(src, gone).not.toContain(gone);
    }
  });
});
