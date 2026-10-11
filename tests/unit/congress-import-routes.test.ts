import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Congress importer coordination (Sol's 9/9 diagnosis): the HTTP layer must never claim
// success the importer did not report, must map importer refusals to 4xx with no partial
// body, and must not leak internal error text. Importer is injected; no database.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

vi.mock("../../server/auth", () => ({ isAuthenticated: (_req: any, _res: any, next: any) => next() }));
vi.mock("../../server/middleware/require-admin", () => ({ requireAdmin: (_req: any, _res: any, next: any) => next() }));
vi.mock("../../server/db", () => ({ db: {}, pool: {} }));

const { registerCongressImportRoutes, congressImportFailure } = await import("../../server/congress-import-routes");
const { setSecurityEventSink } = await import("../../server/security-events");
setSecurityEventSink(() => {});

type Handler = (req: any, res: any, next?: any) => any;
function build(importer: any) {
  const routes = new Map<string, Handler[]>();
  const app: any = { post: (path: string, ...h: Handler[]) => routes.set(path, h) };
  registerCongressImportRoutes(app, async () => importer);
  return async (path: string) => {
    const res: any = { statusCode: 200, body: undefined, status(c: number) { res.statusCode = c; return res; }, json(b: any) { res.body = b; return res; } };
    for (const h of routes.get(path)!) { let n = false; await h({ userId: "admin-1", method: "POST", originalUrl: path, get: () => undefined }, res, () => { n = true; }); if (!n) break; }
    return res;
  };
}

describe("congressImportFailure", () => {
  it("maps importer refusal codes to 4xx with a machine-readable code and scalar details only", () => {
    const r = congressImportFailure({ code: "E_UNVERIFIED", details: { sourceSha256: "ab".repeat(32), rows: [1, 2, 3], expected: 535 } });
    expect(r.status).toBe(422);
    expect(r.body).toMatchObject({ error: "source_unverified", code: "E_UNVERIFIED" });
    expect(r.body.details).toEqual({ sourceSha256: "ab".repeat(32), expected: 535 }); // array dropped
    expect(congressImportFailure({ code: "E_DUPLICATES" }).status).toBe(409);
    expect(congressImportFailure({ code: "E_EMPTY" }).status).toBe(409);
  });
  it("maps Lane C's source-bound importer codes (db607265) and the *_UNVERIFIED / *_REFUSED families", () => {
    expect(congressImportFailure({ code: "LEGACY_CONGRESS_SOURCE_UNVERIFIED", details: { reason: "no reviewed digest" } })).toMatchObject({ status: 422, body: { error: "source_unverified", code: "LEGACY_CONGRESS_SOURCE_UNVERIFIED", details: { reason: "no reviewed digest" } } });
    expect(congressImportFailure({ code: "OFFICIAL_CONGRESS_IMPORT_REFUSED", details: { duplicates: 535, senate: 0 } })).toMatchObject({ status: 409, body: { error: "import_refused", code: "OFFICIAL_CONGRESS_IMPORT_REFUSED", details: { duplicates: 535, senate: 0 } } });
    expect(congressImportFailure({ code: "SOME_FUTURE_SOURCE_UNVERIFIED" }).status).toBe(422);
    expect(congressImportFailure({ code: "SOME_FUTURE_IMPORT_REFUSED" }).status).toBe(409);
    expect(congressImportFailure({ code: "UNRELATED_CODE" }).status).toBe(500);
  });

  it("hides internal text for unknown failures", () => {
    const r = congressImportFailure(new Error("relation congress_members does not exist at 10.0.0.5"));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/relation|10\.0\.0\.5/);
  });
});

describe("POST /api/congress/sync-all and /import", () => {
  it("returns the importer's own result without success prose, plus validation only on sync-all", async () => {
    const importer = { importFromCompleteDataset: vi.fn(async () => ({ count: 2, breakdown: { house: 1, senate: 1 } })), validateImport: vi.fn(async () => ({ ok: true })) };
    const call = build(importer);
    const a = await call("/api/congress/sync-all");
    expect(a.statusCode).toBe(200);
    expect(a.body).toEqual({ status: "importer_result", result: { count: 2, breakdown: { house: 1, senate: 1 } }, validation: { ok: true } });
    expect(JSON.stringify(a.body)).not.toMatch(/authenticated dataset|Successfully|complete/i);
    const b = await call("/api/congress/import");
    expect(b.body.validation).toBeNull();
    expect(importer.validateImport).toHaveBeenCalledTimes(1);
  });

  it("refuses with 422 source_unverified on E_UNVERIFIED and does not run validation", async () => {
    const importer = { importFromCompleteDataset: vi.fn(async () => { throw Object.assign(new Error("unverified"), { code: "E_UNVERIFIED", details: { sourceSha256: "x".repeat(64) } }); }), validateImport: vi.fn() };
    const r = await build(importer)("/api/congress/sync-all");
    expect(r.statusCode).toBe(422);
    expect(r.body).toMatchObject({ error: "source_unverified", code: "E_UNVERIFIED" });
    expect(importer.validateImport).not.toHaveBeenCalled();
  });

  it("legacy import through the real route: LEGACY_CONGRESS_SOURCE_UNVERIFIED -> 422, not 500", async () => {
    const importer = { importFromCompleteDataset: vi.fn(async () => { throw Object.assign(new Error("legacy"), { code: "LEGACY_CONGRESS_SOURCE_UNVERIFIED" }); }), validateImport: vi.fn() };
    const r = await build(importer)("/api/congress/import");
    expect(r.statusCode).toBe(422);
    expect(r.body).toMatchObject({ error: "source_unverified", code: "LEGACY_CONGRESS_SOURCE_UNVERIFIED" });
    expect(importer.validateImport).not.toHaveBeenCalled();
  });

  it("returns a fixed 500 for unexpected importer failures", async () => {
    const r = await build({ importFromCompleteDataset: async () => { throw new Error("ECONNREFUSED 127.0.0.1:5432"); } })("/api/congress/import");
    expect(r.statusCode).toBe(500);
    expect(r.body).toEqual({ error: "import_failed", message: "Congress import failed; no partial result is reported" });
  });
});

describe("routes.ts composition", () => {
  const routes = readFileSync(join(__dirname, "..", "..", "server", "routes.ts"), "utf8");
  it("uses the extracted module and carries no dataset/success claims", () => {
    expect(routes).toContain("registerCongressImportRoutes(app");
    expect(routes).not.toMatch(/Complete authenticated dataset|Successfully imported|from authenticated dataset/);
    expect(routes).not.toMatch(/app\.post\('\/api\/congress\/(sync-all|import)'/);
  });
});
