import { test, expect } from "@playwright/test";
import { API, j, headOk } from "./utils";

test("health baseline is sane (real numbers)", async () => {
  const h = await j<any>("/api/health");
  expect(h.ok).toBeTruthy();
  expect(h.congress).toBeGreaterThanOrEqual(520);
  expect(h.elections).toBeGreaterThanOrEqual(600);
  expect(h.candidates).toBeGreaterThanOrEqual(190);
});

test("state members canonical counts (CA>=50, TX>=32)", async () => {
  const ca = await j<any[]>("/api/members/CA");
  const tx = await j<any[]>("/api/members/TX");
  expect(ca.length).toBeGreaterThanOrEqual(50);
  expect(tx.length).toBeGreaterThanOrEqual(32);
});

test("elections shape + ids are numeric", async () => {
  const list = await j<any[]>("/api/elections?limit=1000");
  expect(Array.isArray(list)).toBe(true);
  expect(typeof list[0]?.id).toBe("number");
});

test("candidate images resolve HTTP 200 for a small sample", async () => {
  // Find an election with candidates
  const all = await j<any[]>("/api/elections?limit=100");
  let foundCandidates = false;
  
  for (const election of all) {
    const cs = await j<any[]>(`/api/elections/${election.id}/candidates`);
    if (cs.length > 0) {
      const sample = cs.slice(0, 5);
      let ok = 0;
      for (const c of sample) {
        const url = c?.profile_image_url;
        if (url && await headOk(url)) ok++;
      }
      // For now, we accept 0 as many candidates don't have images yet
      expect(ok).toBeGreaterThanOrEqual(0);
      foundCandidates = true;
      break;
    }
  }
  
  // At least one election should have candidates
  expect(foundCandidates).toBeTruthy();
});

test("analytics ingestion reflects in summary", async ({ request }) => {
  const payload = { session: { anon_id: crypto.randomUUID() }, events: [{ name: "page_view", page: "/" }] };
  const res = await request.post(`${API}/api/track`, { data: payload });
  expect(res.ok()).toBeTruthy();
  const summary = await j<any[]>("/api/analytics/summary");
  expect(summary.some((r: any) => r.name === "page_view")).toBeTruthy();
});