import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// UX review P1 (2026-10-11): list mode issued one /api/elections/:id/candidates call per
// card (506 requests -> 429s) and an empty race borrowed another race's candidates.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const rows = [
  { id: 1, electionId: 2, name: "Dan Sullivan", party: "R", isIncumbent: true, profileImageUrl: null, website: null, isVerified: false, pollingSupport: 48, dataSource: "fec_bulk", sourceStatus: "fec_registered", ballotStatus: "not_certified", fecCandidateId: "S4AK00214", fecStatus: "C" },
  { id: 2, electionId: 2, name: "Mary Peltola", party: "D", isIncumbent: false, profileImageUrl: null, website: null, isVerified: false, pollingSupport: 46, dataSource: "fec_bulk", sourceStatus: "fec_registered", ballotStatus: "not_certified" },
];
const getCandidatesByElections = vi.fn(async (ids: number[]) => rows.filter(r => ids.includes(r.electionId)));
const getCandidatesByElection = vi.fn(async (id: number) => rows.filter(r => r.electionId === id));
const getElection = vi.fn(async (id: number) => (id === 37 ? { id: 37, title: "Alaska Gubernatorial Election", state: "AK" } : id === 2 ? { id: 2, state: "AK" } : null));

vi.mock("../../server/storage", () => ({
  storage: { getCandidatesByElections, getCandidatesByElection, getElection, getElections: vi.fn(async () => []) },
  storageFactory: {},
}));

const { electionsRouter, CANDIDATES_BATCH_MAX_IDS } = await import("../../server/routes/elections");

function findHandler(method: string, path: string) {
  const layer = (electionsRouter as any).stack.find((l: any) => l.route?.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`${method.toUpperCase()} ${path} not registered`);
  return layer.route.stack[layer.route.stack.length - 1].handle as (req: any, res: any) => Promise<void>;
}
function res() {
  const r: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined,
    status(c: number) { r.statusCode = c; return r; }, json(b: any) { r.body = b; return r; }, setHeader(k: string, v: string) { r.headers[k] = v; } };
  return r;
}

describe("GET /api/elections/candidates-batch", () => {
  const handler = findHandler("get", "/candidates-batch");

  it("returns candidates grouped by election in one storage call, empty arrays for races without rows", async () => {
    const r = res();
    await handler({ query: { ids: "2,37,506,2" } }, r);
    expect(r.statusCode).toBe(200);
    expect(getCandidatesByElections).toHaveBeenLastCalledWith([2, 37, 506]);
    expect(Object.keys(r.body.candidates).sort()).toEqual(["2", "37", "506"]);
    expect(r.body.candidates["2"].map((c: any) => c.name)).toEqual(["Dan Sullivan", "Mary Peltola"]);
    expect(r.body.candidates["37"]).toEqual([]);      // governor race stays empty, no Senate bios
    expect(r.body.candidates["506"]).toEqual([]);
    expect(r.body.candidates["2"][0]).toMatchObject({ sourceStatus: "fec_registered", ballotStatus: "not_certified", fecCandidateId: "S4AK00214" });
    expect(r.headers["Cache-Control"]).toMatch(/max-age=300/);
  });

  it("rejects empty, non-numeric and oversized id lists", async () => {
    for (const ids of ["", "a,b", "0,-1"]) {
      const r = res(); await handler({ query: { ids } }, r); expect(r.statusCode).toBe(400);
    }
    const many = Array.from({ length: CANDIDATES_BATCH_MAX_IDS + 1 }, (_, i) => i + 1).join(",");
    const r = res(); await handler({ query: { ids: many } }, r);
    expect(r.statusCode).toBe(400);
    expect(r.body.max).toBe(CANDIDATES_BATCH_MAX_IDS);
  });

  it("is registered ahead of the /:id routes", () => {
    const stack = (electionsRouter as any).stack;
    const batchIdx = stack.findIndex((l: any) => l.route?.path === "/candidates-batch");
    // Only the single-segment /:id route can shadow /candidates-batch; two-segment /:id/* routes cannot.
    const idIdx = stack.findIndex((l: any) => l.route?.path === "/:id");
    expect(batchIdx).toBeGreaterThanOrEqual(0);
    expect(idIdx).toBeGreaterThan(batchIdx);
  });
});

describe("GET /api/elections/:id/candidates never substitutes another race", () => {
  const handler = findHandler("get", "/:id/candidates");

  it("returns [] with provenance none for an existing race with no candidates", async () => {
    const r = res();
    await handler({ params: { id: "37" }, query: {} }, r);
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual([]);
    expect(r.headers["X-Candidate-Provenance"]).toBe("none");
  });

  it("rejects fractional and non-positive ids with 400 instead of a downstream 500", async () => {
    for (const id of ["2.5", "0", "-3", "abc", "1e3x"]) {
      const r = res(); await handler({ params: { id }, query: {} }, r);
      expect(r.statusCode, id).toBe(400);
    }
  });

  it("projects FEC identity and source markers from camelCase Drizzle rows", async () => {
    const r = res();
    await handler({ params: { id: "2" }, query: {} }, r);
    expect(r.statusCode).toBe(200);
    const sullivan = r.body.find((c: any) => c.name === "Dan Sullivan");
    expect(sullivan.external_ids.fec_id).toBe("S4AK00214");
    expect(sullivan.source).toMatchObject({ data_source: "fec_bulk", source_status: "fec_registered", ballot_status: "not_certified", fec_status: "C" });
  });

  it("404s only when the election does not exist", async () => {
    const r = res();
    await handler({ params: { id: "99999" }, query: {} }, r);
    expect(r.statusCode).toBe(404);
  });

  it("source no longer contains the same-state fallback", () => {
    const src = readFileSync(join(__dirname, "..", "..", "server", "routes", "elections.ts"), "utf8");
    expect(src).not.toContain("similarElections");
    expect(src).not.toContain("source_election_id");
  });
});
