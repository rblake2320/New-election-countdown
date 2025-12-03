import { test, expect } from "@playwright/test";

test("candidate drawer never stays skeleton", async ({ page }) => {
  await page.goto(process.env.BASE_URL || "http://localhost:5000");
  
  // Wait for elections to load
  await page.waitForSelector('[data-testid="election-card"]', { timeout: 10000 });
  
  // Find Los Banos election card and click candidates button
  const losbanosCard = page.locator('[data-testid="election-card"]', { hasText: /Los Banos/i });
  await losbanosCard.locator('[data-testid="candidates-toggle"]').click();
  
  // Should see either candidates or "no candidates" message, not stuck skeleton
  await expect(losbanosCard.locator('text=/No verified candidates|Virriy|Mitzy/i')).toBeVisible({ timeout: 4000 });
});

test("AD-63 shows candidates properly", async ({ page }) => {
  await page.goto(process.env.BASE_URL || "http://localhost:5000");
  
  // Wait for elections to load
  await page.waitForSelector('[data-testid="election-card"]', { timeout: 10000 });
  
  // Find AD-63 election card and click candidates button
  const ad63Card = page.locator('[data-testid="election-card"]', { hasText: /Assembly District 63/i });
  await ad63Card.locator('[data-testid="candidates-toggle"]').click();
  
  // Should see candidates
  await expect(ad63Card.locator('text=/Chris Shoults|Natasha Johnson/i')).toBeVisible({ timeout: 4000 });
});