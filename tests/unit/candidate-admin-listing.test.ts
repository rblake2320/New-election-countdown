import { describe, it, expect, vi } from "vitest";

// Runtime regression (Astra, ET-22): the admin listing handler declared
// `const accounts = await accounts.listCandidateAccounts(...)`, shadowing the module-level
// storage alias -> TDZ ReferenceError on every GET /api/admin/candidate-accounts.
// This test invokes the real handler with a storage double, so a shadowing bug surfaces.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const pending = { id: 1, candidateId: 10, email: "p@example.org", passwordHash: "$2b$12$secret", role: "campaign_manager", isActive: false, accessLevel: "pending", createdAt: new Date() };
const active = { id: 2, candidateId: 11, email: "a@example.org", passwordHash: "$2b$12$secret2", role: "candidate", isActive: true, accessLevel: "full", createdAt: new Date() };
const listCandidateAccounts = vi.fn(async (filter: { isActive?: boolean } = {}) =>
  [pending, active].filter(a => filter.isActive === undefined || a.isActive === filter.isActive));
const setCandidateAccountActive = vi.fn(async (id: number, isActive: boolean, accessLevel?: string) =>
  id === 1 ? { ...pending, isActive, accessLevel: accessLevel ?? pending.accessLevel } : null);

vi.mock("../../server/storage", () => ({
  storage: { listCandidateAccounts, setCandidateAccountActive, getCandidateAccountById: vi.fn(async () => null) },
  storageFactory: {},
}));
vi.mock("../../server/auth", () => ({ isAuthenticated: (_req: any, _res: any, next: any) => next() }));
vi.mock("../../server/middleware/require-admin", () => ({ requireAdmin: (_req: any, _res: any, next: any) => next() }));

const { registerCandidatePortalRoutes } = await import("../../server/routes-candidate-portal");

type Handler = (req: any, res: any) => any;
const routes = new Map<string, Handler[]>();
const app: any = {};
for (const m of ["get", "post", "put", "delete"]) {
  app[m] = (path: string, ...handlers: Handler[]) => routes.set(`${m.toUpperCase()} ${path}`, handlers);
}
registerCandidatePortalRoutes(app);

async function invoke(key: string, req: any) {
  const handlers = routes.get(key);
  if (!handlers) throw new Error(`route ${key} not registered`);
  const res: any = { statusCode: 200, body: undefined, status(c: number) { this.statusCode = c; return this; }, json(b: any) { this.body = b; return this; } };
  for (const h of handlers) {
    let nextCalled = false;
    await h(req, res, () => { nextCalled = true; });
    if (!nextCalled) break;
  }
  return res;
}

describe("GET /api/admin/candidate-accounts", () => {
  it("lists pending accounts by default without password hashes", async () => {
    const res = await invoke("GET /api/admin/candidate-accounts", { query: {}, userId: "admin-1" });
    expect(res.statusCode).toBe(200);
    expect(res.body.accounts.map((a: any) => a.id)).toEqual([1]);
    for (const a of res.body.accounts) expect(a).not.toHaveProperty("passwordHash");
    expect(listCandidateAccounts).toHaveBeenLastCalledWith({ isActive: false });
  });

  it("supports status=active and status=all", async () => {
    expect((await invoke("GET /api/admin/candidate-accounts", { query: { status: "active" }, userId: "admin-1" })).body.accounts.map((a: any) => a.id)).toEqual([2]);
    expect((await invoke("GET /api/admin/candidate-accounts", { query: { status: "all" }, userId: "admin-1" })).body.accounts.map((a: any) => a.id)).toEqual([1, 2]);
  });
});

describe("POST /api/admin/candidate-accounts/:id/approve", () => {
  it("activates with the requested access level and omits the hash", async () => {
    const res = await invoke("POST /api/admin/candidate-accounts/:id/approve", { params: { id: "1" }, body: { accessLevel: "limited" }, userId: "admin-1" });
    expect(res.statusCode).toBe(200);
    expect(res.body.account).toMatchObject({ id: 1, isActive: true, accessLevel: "limited" });
    expect(res.body.account).not.toHaveProperty("passwordHash");
    expect(setCandidateAccountActive).toHaveBeenLastCalledWith(1, true, "limited");
  });

  it("404s on an unknown account and 400s on a bad access level", async () => {
    expect((await invoke("POST /api/admin/candidate-accounts/:id/approve", { params: { id: "99" }, body: {}, userId: "admin-1" })).statusCode).toBe(404);
    expect((await invoke("POST /api/admin/candidate-accounts/:id/approve", { params: { id: "1" }, body: { accessLevel: "root" }, userId: "admin-1" })).statusCode).toBe(400);
  });
});
