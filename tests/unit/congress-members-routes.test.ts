import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Sol's actual API gap on main: /api/members/:state admitted 50 states + DC and rejected
// the real 539-member source's PR/GU/AS/MP/VI; /api/members returned preserved history and
// unreviewed legacy rows mixed with the current roster.
const { registerCongressMembersRoutes, CONGRESS_JURISDICTIONS, memberScope, filterMembers, parseScope } = await import("../../server/congress-members-routes");

const rows = [
  { id: 1, bioguideId: "G000582", name: "Jenniffer González-Colón", party: "R", state: "PR", district: "00", chamber: "House", congress: 119 },
  { id: 2, bioguideId: "R000600", name: "Amata Radewagen", party: "R", state: "AS", district: "00", chamber: "House", congress: 119 },
  { id: 3, bioguideId: "S001198", name: "Dan Sullivan", party: "R", state: "AK", district: null, chamber: "Senate", congress: 119 },
  { id: 4, bioguideId: "IMPORT_17", name: "Legacy Row", party: "D", state: "AK", district: "00", chamber: "House", congress: 119 },
  { id: 5, bioguideId: "P000197", name: "Nancy Pelosi", party: "D", state: "CA", district: "11", chamber: "House", congress: 118 },
];

type Handler = (req: any, res: any) => any;
function build() {
  const routes = new Map<string, Handler>();
  const app: any = { get: (path: string, h: Handler) => routes.set(path, h) };
  registerCongressMembersRoutes(app, async () => rows as any);
  return async (path: string, params: any = {}, query: any = {}) => {
    const res: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined, status(c: number) { res.statusCode = c; return res; }, json(b: any) { res.body = b; return res; }, setHeader(k: string, v: string) { res.headers[k] = v; } };
    await routes.get(path)!({ params, query }, res);
    return res;
  };
}

describe("jurisdictions", () => {
  it("covers the official 119th source: 50 states + DC + PR GU AS MP VI (56)", () => {
    expect(CONGRESS_JURISDICTIONS).toHaveLength(56);
    for (const t of ["PR", "GU", "AS", "MP", "VI", "DC", "WY"]) expect(CONGRESS_JURISDICTIONS).toContain(t);
    const official = JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "congress", "119", "official-current-members.json"), "utf8"));
    const sourceStates = new Set<string>(official.members.map((m: any) => m.state));
    for (const s of sourceStates) expect(CONGRESS_JURISDICTIONS, s).toContain(s);
  });
});

describe("scope classification", () => {
  it("separates current official rows from unreviewed legacy and history exactly like the importer", () => {
    expect(rows.map(memberScope)).toEqual(["current", "current", "current", "legacy", "history"]);
    expect(filterMembers(rows, "current").map((r) => r.id)).toEqual([1, 2, 3]);
    expect(filterMembers(rows, "legacy").map((r) => r.id)).toEqual([4]);
    expect(filterMembers(rows, "history").map((r) => r.id)).toEqual([5]);
    expect(filterMembers(rows, "all")).toHaveLength(5);
    expect(parseScope(undefined)).toBe("current");
    expect(parseScope("ALL")).toBe("all");
    expect(parseScope("everything")).toBeNull();
  });
});

describe("GET /api/members and /api/members/:state", () => {
  it("defaults to the current roster and says so in headers; history/legacy only when asked", async () => {
    const call = build();
    const d = await call("/api/members");
    expect(d.statusCode).toBe(200);
    expect(d.body.map((r: any) => r.id)).toEqual([1, 2, 3]);
    expect(d.headers["X-Congress-Scope"]).toBe("current");
    expect(d.headers["X-Congress-Count"]).toBe("3");
    expect((await call("/api/members", {}, { scope: "all" })).body).toHaveLength(5);
    expect((await call("/api/members", {}, { scope: "history" })).body.map((r: any) => r.id)).toEqual([5]);
    expect((await call("/api/members", {}, { scope: "bogus" })).statusCode).toBe(400);
  });

  it("accepts territories and rejects unknown codes with the allowed list", async () => {
    const call = build();
    const pr = await call("/api/members/:state", { state: "pr" });
    expect(pr.statusCode).toBe(200);
    expect(pr.body.map((r: any) => r.name)).toEqual(["Jenniffer González-Colón"]);
    expect((await call("/api/members/:state", { state: "AS" })).body).toHaveLength(1);
    const ak = await call("/api/members/:state", { state: "AK" });
    expect(ak.body.map((r: any) => r.id)).toEqual([3]); // legacy AK row excluded by default
    expect((await call("/api/members/:state", { state: "AK" }, { scope: "all" })).body.map((r: any) => r.id)).toEqual([3, 4]);
    const bad = await call("/api/members/:state", { state: "XX" });
    expect(bad.statusCode).toBe(400);
    expect(bad.body).toMatchObject({ error: "invalid_jurisdiction", state: "XX" });
    expect(bad.body.allowed).toHaveLength(56);
  });
});

describe("routes.ts composition", () => {
  it("uses the extracted module after the search route and carries no inline state regex", () => {
    const routes = readFileSync(join(__dirname, "..", "..", "server", "routes.ts"), "utf8");
    expect(routes).toContain("registerCongressMembersRoutes(app");
    expect(routes).not.toMatch(/app\.get\('\/api\/members'/);
    expect(routes).not.toMatch(/app\.get\('\/api\/members\/:state'/);
    expect(routes).not.toMatch(/const STATE_RE\s*=/);
    expect(routes.indexOf("app.get('/api/members/search'")).toBeLessThan(routes.indexOf("registerCongressMembersRoutes(app"));
  });
});
