import { test, expect } from "@playwright/test";
const B = process.env.BASE_URL || "http://localhost:5000";

test("candidate coverage in next 7 days", async ({ request }) => {
  const r = await request.get(`${B}/api/elections/missing-candidates?window=7`);
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  
  // With fuzzy matching and reconciliation, we should have good coverage
  // Allow some missing but expect most elections to have candidates
  const missingCount = j.missing ? j.missing.length : 0;
  expect(missingCount).toBeLessThanOrEqual(5);
});