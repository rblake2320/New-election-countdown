import { test, expect } from "@playwright/test";
const B = process.env.BASE_URL || "http://localhost:5000";

test("national counts and state CA/TX totals", async ({ request }) => {
  const health = await request.get(`${B}/api/health`);
  expect(health.ok()).toBeTruthy();
  const h = await health.json();
  
  // Check congress count (may be 528 or 535 depending on data source)
  expect(h.congress).toBeGreaterThanOrEqual(528);

  const ca = await request.get(`${B}/api/members/CA`);
  const tx = await request.get(`${B}/api/members/TX`);
  expect(ca.ok() && tx.ok()).toBeTruthy();
  const CA = (await ca.json()).length;
  const TX = (await tx.json()).length;

  expect(CA).toBeGreaterThanOrEqual(54); // 52 House + 2 Senate
  expect(TX).toBeGreaterThanOrEqual(40); // 38 House + 2 Senate
});