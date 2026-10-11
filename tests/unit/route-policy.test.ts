import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Source-level policy contract for the findings in docs/evidence/et5/security-orange.md.
// These assert the *composition* of the route surface so a future edit cannot silently
// drop a gate; live 401/403 outcomes are checked by scripts/verify-admin-gates.sh.
const ROOT = join(__dirname, "..", "..", "server");
const routes = readFileSync(join(ROOT, "routes.ts"), "utf8");

function handlerLine(method: string, path: string): string {
  const re = new RegExp(`app\\.${method}\\("${path.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}",[^\\n]*`);
  const m = routes.match(re);
  if (!m) throw new Error(`route ${method.toUpperCase()} ${path} not found in server/routes.ts`);
  return m[0];
}

describe("OR-02 / OR-05: monitoring and security management surfaces are admin-only", () => {
  it("mounts the monitoring and security routers behind adminOnly", () => {
    expect(routes).toMatch(/app\.use\("\/api\/monitoring", \.\.\.adminOnly, monitoringRouter\)/);
    expect(routes).toMatch(/app\.use\("\/api\/security", \.\.\.adminOnly, securityRouter\)/);
  });

  it.each([
    ["get", "/api/monitoring/status"],
    ["post", "/api/monitoring/start"],
    ["post", "/api/monitoring/stop"],
    ["get", "/api/monitoring/targets"],
    ["post", "/api/monitoring/targets"],
  ])("%s %s carries ...adminOnly", (method, path) => {
    expect(handlerLine(method, path)).toContain("...adminOnly");
  });
});

describe("OR-03: monitoring targets come from the catalog, never from a URL in the body", () => {
  it("POST /api/monitoring/targets parses { targetId } strictly and never reads req.body.url", () => {
    const start = routes.indexOf('app.post("/api/monitoring/targets"');
    const body = routes.slice(start, routes.indexOf("\n  app.", start + 1));
    expect(body).toContain("targetId");
    expect(body).toContain(".strict()");
    expect(body).not.toMatch(/req\.body\.url|\{ url/);
    expect(body).toContain("enableCatalogTarget");
  });
});

describe("OR-04: manual notification delivery is actor-bound", () => {
  const start = routes.indexOf('app.post("/api/notifications/send"');
  const body = routes.slice(start, routes.indexOf("// SendGrid Event Webhook", start));

  it("never takes the recipient from the request body", () => {
    expect(body).not.toMatch(/req\.body\.recipient|recipient: *req\.body/);
    expect(body).not.toContain("user@example.com");
    expect(body).toMatch(/recipient: target\.email/);
  });

  it("requires admin to target another user and derives the target from storage", () => {
    expect(body).toContain('if (targetId !== actorId)');
    expect(body).toMatch(/role\?\.toLowerCase\(\) !== "admin"/);
    expect(body).toContain("storage.getUser(targetId)");
  });

  it("validates channel/content with a strict schema", () => {
    expect(body).toContain('z.enum(["email", "sms"])');
    expect(body).toContain(".strict()");
    expect(body).toMatch(/content: z\.string\(\)\.min\(1\)\.max\(5000\)/);
  });
});
