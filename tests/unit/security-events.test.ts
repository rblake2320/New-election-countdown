import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildSecurityDecision, recordSecurityDecision, setSecurityEventSink,
  publicErrorBody, internalErrorRecord, requestIdMiddleware,
} from "../../server/security-events";

const ROOT = join(__dirname, "..", "..", "server");

function fakeReq(over: Record<string, unknown> = {}) {
  const headers: Record<string, string> = (over.headers as any) ?? {};
  return { method: "POST", originalUrl: "/api/admin/thing?x=1", ip: "203.0.113.9", get: (h: string) => headers[h.toLowerCase()], ...over } as any;
}

afterEach(() => setSecurityEventSink(null));

describe("BG-3: security decision events", () => {
  it("carry actor, action, resource, result, reason and requestId as one JSON line", () => {
    const lines: string[] = [];
    setSecurityEventSink((l) => lines.push(l));
    const req = fakeReq({ requestId: "rid-12345678" });
    recordSecurityDecision(req, { action: "authz.admin", result: "deny", actor: "u1", reason: "not_admin" });
    expect(lines).toHaveLength(1);
    const ev = JSON.parse(lines[0]);
    expect(ev).toMatchObject({ type: "security_decision", action: "authz.admin", result: "deny", actor: "u1", reason: "not_admin", requestId: "rid-12345678", method: "POST", path: "/api/admin/thing", ip: "203.0.113.9" });
    expect(ev.resource).toBe("/api/admin/thing");
    expect(lines[0]).not.toContain("x=1"); // query strings are not recorded
  });

  it("records a null actor for unauthenticated denials", () => {
    const ev = buildSecurityDecision(fakeReq(), { action: "auth.login", result: "deny", reason: "unknown_account" });
    expect(ev.actor).toBeNull();
    expect(ev.requestId).toBeNull();
  });
});

describe("request id middleware", () => {
  it("propagates a well-formed inbound id and generates one otherwise", () => {
    const headersOut: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => { headersOut[k] = v; } } as any;
    const good = fakeReq({ headers: { "x-request-id": "abc-123_456.789" } });
    requestIdMiddleware(good, res, () => {});
    expect(good.requestId).toBe("abc-123_456.789");
    expect(headersOut["X-Request-Id"]).toBe("abc-123_456.789");

    const bad = fakeReq({ headers: { "x-request-id": "<script>alert(1)</script>" } });
    requestIdMiddleware(bad, res, () => {});
    expect(bad.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("BG-4: public error body", () => {
  it("never forwards internal messages for 5xx and bounds the status", () => {
    const { status, body } = publicErrorBody(new Error("relation users_secret does not exist at 10.0.0.5"), "rid-1");
    expect(status).toBe(500);
    expect(body).toEqual({ error: "server_error", message: "Internal server error", requestId: "rid-1" });
    expect(publicErrorBody({ status: 999, message: "x" }, null).status).toBe(500);
    expect(publicErrorBody({ status: 302, message: "x" }, null).status).toBe(500);
    expect(publicErrorBody({ code: "ECONNREFUSED", message: "x" }, null).status).toBe(500);
    expect(publicErrorBody({ code: 23505, message: "dup" }, null).status).toBe(500); // pg codes are not HTTP statuses
  });

  it("keeps 4xx public with a fixed message unless a publicMessage was set deliberately", () => {
    expect(publicErrorBody({ status: 404, message: "SELECT failed on table X" }, "r").body).toEqual({ error: "request_error", message: "Not found", requestId: "r" });
    expect(publicErrorBody({ status: 400, type: "entity.parse.failed", message: "Unexpected token" }, "r").body.error).toBe("invalid_json");
    expect(publicErrorBody({ status: 413, type: "entity.too.large" }, "r").body.error).toBe("payload_too_large");
    expect(publicErrorBody({ status: 422, publicCode: "bad_state", publicMessage: "State code unknown" }, "r").body).toEqual({ error: "bad_state", message: "State code unknown", requestId: "r" });
    expect(publicErrorBody({ status: 422, publicCode: "DROP TABLE", publicMessage: "x" }, "r").body.error).toBe("request_error");
  });

  it("internal record keeps the message server-side with the request id", () => {
    const rec = JSON.parse(internalErrorRecord(new Error("boom at /srv/app"), fakeReq({ requestId: "rid-9" }), 500));
    expect(rec).toMatchObject({ type: "request_error", requestId: "rid-9", status: 500, message: "boom at /srv/app", path: "/api/admin/thing" });
  });
});

describe("source composition", () => {
  const index = readFileSync(join(ROOT, "index.ts"), "utf8");
  const admin = readFileSync(join(ROOT, "middleware", "require-admin.ts"), "utf8");
  const auth = readFileSync(join(ROOT, "routes", "auth.ts"), "utf8");
  const campaigns = readFileSync(join(ROOT, "routes", "campaigns.ts"), "utf8");

  it("index.ts error boundary uses publicErrorBody and no longer echoes err.message", () => {
    expect(index).toContain("publicErrorBody(err, getRequestId(req))");
    expect(index).not.toMatch(/message: err\?\.message/);
    expect(index).toContain("app.use(requestIdMiddleware)");
  });

  it("requireAdmin emits allow/deny/error decisions", () => {
    expect(admin).toMatch(/result: 'allow'/);
    expect(admin).toMatch(/reason: 'no_identity'/);
    expect(admin).toMatch(/reason: 'not_admin'/);
    expect(admin).toMatch(/result: 'error'/);
  });

  it("login and password reset emit decisions; reset is transactional and revokes sessions", () => {
    expect(auth).toMatch(/action: "auth\.login", result: "deny"/);
    expect(auth).toMatch(/action: "auth\.login", result: "allow"/);
    const start = auth.indexOf('router.post("/reset-password"');
    const body = auth.slice(start, auth.indexOf("export default router", start));
    expect(body.indexOf("hashPassword(password)")).toBeLessThan(body.indexOf('query("BEGIN")'));
    expect(body).toContain('query("BEGIN")');
    expect(body).toContain('query("COMMIT")');
    expect(body).toMatch(/UPDATE auth_sessions SET revoked=TRUE WHERE user_id=\$1/);
    expect(body).toMatch(/ROLLBACK/);
  });

  it("campaign responses never use SELECT * / RETURNING *", () => {
    expect(campaigns).not.toMatch(/SELECT \* FROM campaigns/);
    expect(campaigns).not.toMatch(/RETURNING \*/);
    expect(campaigns).not.toMatch(/CAMPAIGN_PUBLIC_FIELDS = "[^"]*api_key_hash/);
  });
});
