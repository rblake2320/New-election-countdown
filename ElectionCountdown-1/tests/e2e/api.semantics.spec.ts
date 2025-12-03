import { test, expect } from "@playwright/test";

const B = process.env.BASE_URL || "http://localhost:5000";

test("invalid api path → 404", async ({ request }) => {
  const r = await request.get(`${B}/api/does-not-exist`);
  expect(r.status()).toBe(404);
  const j = await r.json();
  expect(j.error).toBe("not_found");
});

test("invalid state → 400", async ({ request }) => {
  const r = await request.get(`${B}/api/members/XX`);
  expect(r.status()).toBe(400);
  const j = await r.json();
  expect(j.error).toBe("invalid_state");
});