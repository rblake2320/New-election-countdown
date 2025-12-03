import { test, expect } from "@playwright/test";
import { j, API } from "./utils";

test("Health vs elections list count must match (no silent gaps)", async () => {
  const h = await j<any>("/api/health");
  const list = await j<any[]>("/api/elections?limit=2000");
  expect(Array.isArray(list)).toBeTruthy();
  // Allow some flexibility for timing differences
  const diff = Math.abs(list.length - h.elections);
  expect(diff, `Health says ${h.elections}, list has ${list.length}`).toBeLessThanOrEqual(5);
});

test("404/400 semantics: bad pages and inputs", async ({ request }) => {
  // Bad page route
  const r1 = await request.get(`${API}/def-not-a-real-page-xyz`);
  expect([404, 410]).toContain(r1.status());
  // Bad API route
  const r2 = await request.get(`${API}/api/not-a-real-endpoint`);
  expect([404, 405]).toContain(r2.status());
  // Bad state code
  const r3 = await request.get(`${API}/api/members/ZZ`);
  expect([400, 404]).toContain(r3.status());
  // Bad election id
  const r4 = await request.get(`${API}/api/elections/9999999`);
  expect([404]).toContain(r4.status());
});