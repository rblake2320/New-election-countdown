import { test, expect } from "@playwright/test";

test("candidate drawer never stalls", async ({ page }) => {
  await page.goto(process.env.BASE_URL || "http://localhost:5000");
  
  // Wait for elections to load
  await page.waitForSelector('[data-testid="election-card"]', { timeout: 10000 });
  
  // Open first 3 visible election drawers and assert we either see names or explicit 'No verified candidates'
  const cards = await page.locator('[data-testid="election-card"]').all();
  for (let i = 0; i < Math.min(cards.length, 3); i++) {
    const card = cards[i];
    const candidatesBtn = card.locator('[data-testid="candidates-toggle"]');
    
    // Skip if button doesn't exist
    if (await candidatesBtn.count() === 0) continue;
    
    await candidatesBtn.click();
    
    // Should see either candidate names or the explicit empty state message
    await expect(
      card.locator('text=/No verified candidates|Incumbent|Democratic|Republican|Nonpartisan|Independent/i')
    ).toBeVisible({ timeout: 4000 });
  }
});