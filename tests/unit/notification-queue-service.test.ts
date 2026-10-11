import { describe, it, expect } from "vitest";

// The queue processor called a method that did not exist (processNotificationDelivery) and the
// stats read undeclared in-memory maps, so no queued notification was ever sent. These tests
// drive the real service class over a table-shaped in-memory delivery store (the four storage
// methods the queue uses, kept because CI has no PostgreSQL; the live probe covers the real
// storage) and recording providers at the external boundary.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const { NotificationQueueService, MAX_RETRIES } = await import("../../server/services/notification-queue-service");

type Row = Record<string, any> & { id: number; status: string; channel: string; retryCount: number | null; nextRetryAt: Date | null; queuedAt: Date };

function tableStore() {
  const rows: Row[] = [];
  let nextId = 1;
  return {
    rows,
    async createNotificationDelivery(d: any) { const row = { id: nextId++, retryCount: 0, nextRetryAt: null, queuedAt: new Date(), ...d }; rows.push(row); return row; },
    async getQueuedNotifications(limit = 50) { return rows.filter((r) => r.status === "queued").sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime()).slice(0, limit); },
    async updateNotificationDelivery(id: number, updates: any) { const row = rows.find((r) => r.id === id)!; Object.assign(row, updates); return row; },
    async getNotificationDeliveryStats() {
      const by = (s: string) => rows.filter((r) => r.status === s).length;
      return { total: rows.length, queued: by("queued"), sending: by("sending"), sent: by("sent"), delivered: by("delivered"), failed: by("failed"), bounced: by("bounced"), opened: 0, clicked: 0 };
    },
  };
}

function provider(ready: boolean, outcome: (d: any) => { success: boolean; messageId?: string; error?: string }) {
  const sent: any[] = [];
  return {
    sent,
    isReady: () => ready,
    getStatus: () => ({ configured: ready, error: ready ? undefined : "Missing TEST_API_KEY environment variable" }),
    async send(d: any) { sent.push(d); return outcome(d); },
  };
}

function build(opts: { emailReady?: boolean; smsReady?: boolean; emailOutcome?: (d: any) => any } = {}) {
  let t = 1_000_000;
  const store = tableStore();
  const email = provider(opts.emailReady ?? true, opts.emailOutcome ?? (() => ({ success: true, messageId: "sg-1" })));
  const sms = provider(opts.smsReady ?? true, () => ({ success: true, messageId: "tw-1" }));
  const q = new NotificationQueueService({ store: store as any, providers: { email, sms }, timers: false, now: () => t });
  return { q, store, email, sms, advance: (ms: number) => { t += ms; } };
}

const base = { priority: "normal" as const, metadata: {}, maxRetries: MAX_RETRIES, scheduledAt: new Date(0) };

describe("NotificationQueueService processes the delivery rows for real", () => {
  it("sends due queued rows through the provider and records sent + externalId on the row", async () => {
    const { q, store, email } = build();
    await q.queueNotification({ ...base, type: "email", recipient: "a@example.test", content: { subject: "Hi", message: "body" } });
    expect(await q.processQueue()).toBe(1);
    expect(email.sent).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ status: "sent", externalId: "sg-1", errorCode: null });
    expect(store.rows[0].sentAt).toBeInstanceOf(Date);
    const stats = await q.getQueueStats();
    expect(stats).toMatchObject({ queued: 0, completed: 1, failed: 0, totalProcessed: 1, successRate: 100 });
  });

  it("a channel with no configured provider fails its rows with provider_not_configured instead of pretending", async () => {
    const { q, store, sms } = build({ smsReady: false });
    await q.queueNotification({ ...base, type: "sms", recipient: "+15555550100", content: { message: "txt" } });
    await q.processQueue();
    expect(sms.sent).toHaveLength(0);
    expect(store.rows[0]).toMatchObject({ status: "failed", errorCode: "provider_not_configured" });
    expect(store.rows[0].errorMessage).toContain("TEST_API_KEY");
  });

  it("provider failures retry with backoff and fail permanently after MAX_RETRIES", async () => {
    const { q, store, email, advance } = build({ emailOutcome: () => ({ success: false, error: "550 mailbox unavailable" }) });
    await q.queueNotification({ ...base, type: "email", recipient: "b@example.test", content: { message: "body" } });
    await q.processQueue();
    expect(store.rows[0]).toMatchObject({ status: "queued", retryCount: 1, errorCode: "provider_error", errorMessage: "550 mailbox unavailable" });
    expect(store.rows[0].nextRetryAt.getTime()).toBe(1_000_000 + 10 * 60 * 1000);
    // not due yet: nothing attempted
    expect(await q.processQueue()).toBe(0);
    advance(10 * 60 * 1000);
    await q.processQueue();
    expect(store.rows[0]).toMatchObject({ status: "queued", retryCount: 2 });
    advance(20 * 60 * 1000);
    await q.processQueue();
    expect(store.rows[0]).toMatchObject({ status: "failed", retryCount: 3, errorCode: "provider_error" });
    expect(email.sent).toHaveLength(3);
    expect((await q.getQueueStats()).failed).toBe(1);
  });

  it("a scheduled delivery is not sent before its time", async () => {
    const { q, store, advance } = build();
    await q.queueNotification({ ...base, type: "email", recipient: "c@example.test", content: { message: "later" }, scheduledAt: new Date(1_000_000 + 60_000) });
    expect(store.rows[0].nextRetryAt.getTime()).toBe(1_060_000);
    expect(await q.processQueue()).toBe(0);
    advance(60_000);
    expect(await q.processQueue()).toBe(1);
    expect(store.rows[0].status).toBe("sent");
  });

  it("respects the per-minute rate limit per channel", async () => {
    const { q, store, advance } = build();
    q.updateRateLimits(2, 60);
    for (let i = 0; i < 3; i++) await q.queueNotification({ ...base, type: "email", recipient: `r${i}@example.test`, content: { message: "m" } });
    expect(await q.processQueue()).toBe(2);
    expect(store.rows.filter((r) => r.status === "sent")).toHaveLength(2);
    expect(await q.processQueue()).toBe(0); // window exhausted
    advance(60_000);
    expect(await q.processQueue()).toBe(1);
  });

  it("turns an election event into one queued row per active, verified email/sms subscription", async () => {
    const { q, store } = build();
    const event: any = { id: 7, eventType: "election_result", eventData: { electionTitle: "Governor", message: "Results are in" }, priority: "urgent" };
    const subs: any[] = [
      { id: 1, userId: "u1", channel: "email", targetValue: "v@example.test", isActive: true, isVerified: true },
      { id: 2, userId: "u2", channel: "sms", targetValue: "+15555550101", isActive: true, isVerified: true },
      { id: 3, userId: "u3", channel: "email", targetValue: "x@example.test", isActive: true, isVerified: false },
      { id: 4, userId: "u4", channel: "push", targetValue: "token", isActive: true, isVerified: true },
    ];
    const ids = await q.processElectionEvent(event, subs);
    expect(ids).toHaveLength(2);
    expect(store.rows.map((r) => [r.channel, r.recipient, r.subject])).toEqual([
      ["email", "v@example.test", "🗳️ Election Results: Governor"],
      ["sms", "+15555550101", null],
    ]);
    expect(store.rows[1].content).toContain("Reply STOP to unsubscribe");
  });

  it("the old in-memory processor is gone from the source", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const src = readFileSync(join(__dirname, "..", "..", "server", "services", "notification-queue-service.ts"), "utf8");
    for (const gone of ["this.queue.", "this.completed.", "this.failed.", "this.processing.", "processNotification(notification"]) {
      expect(src, gone).not.toContain(gone);
    }
    expect(src).toContain("async processNotificationDelivery(delivery: NotificationDelivery)");
  });
});
