import { test, expect } from "@playwright/test";
import { assertNoMSW } from "./utils";

test("grid renders, dropdown -> compare renders real tiles", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await assertNoMSW(page);

  // At least 12 visible cards
  const cards = page.locator('[data-testid="election-card"]');
  await expect(cards.first()).toBeVisible();
  await expect(cards).toHaveCount(12);

  // Open candidates dropdown on first card
  const toggle = page.locator('[data-testid="candidates-toggle"]').first();
  await toggle.click();
  const rows = page.locator('[data-testid="candidate-row"]');
  await expect(rows.first()).toBeVisible();
  // pick 2
  await rows.locator('input[type="checkbox"]').nth(0).check();
  await rows.locator('input[type="checkbox"]').nth(1).check();

  // Click a visible Compare link/button (case-insensitive)
  await page.getByRole("link", { name: /compare/i }).first().click();
  await expect(page).toHaveURL(/\/compare\?c=/);

  // Tiles visible with candidate names or images
  const anyTile = page.locator('img, [data-testid="candidate-tile"], [data-testid="candidate-name"]');
  await expect(anyTile.first()).toBeVisible();
});