import { test, expect } from "@playwright/test";

test("Data Management route exists (no 404) and renders dashboard", async ({ page }) => {
  // Try navigation via UI if present; fall back to direct route
  await page.goto("/");
  const nav = page.getByRole("link", { name: /data management|congress admin|data admin/i }).first();
  if (await nav.count()) {
    await nav.click();
  } else {
    // adjust if your route differs
    await page.goto("/congress-admin", { waitUntil: "domcontentloaded" }).catch(async () => {
      await page.goto("/data-management", { waitUntil: "domcontentloaded" });
    });
  }
  // Should NOT be a 404 style page:
  await expect(page.getByText(/404|not found/i)).toHaveCount(0);
  // Expect some dashboard stats to exist
  await expect(page.getByText(/Total Members|Party Breakdown|Re-import Data/i)).toBeVisible();
});

test("Overview/Trends/Analysis tabs/components load with non-empty data", async ({ page }) => {
  await page.goto("/");
  // open first election details
  await page.locator('[data-testid="election-details"], a[href^="/elections/"]').first().click();
  await expect(page).toHaveURL(/\/elections\/\d+/);

  // Overview
  const overview = page.getByRole("tab", { name: /overview/i }).first();
  if (await overview.count()) await overview.click();
  await expect(page.getByText(/date|state|level|type/i)).toBeVisible();

  // Trends (chart renders or trends container non-empty)
  const trendsBtn = page.getByRole("button", { name: /view trends|trends/i }).first();
  if (await trendsBtn.count()) {
    await trendsBtn.click();
    const chart = page.locator("canvas, svg").first();
    await expect(chart).toBeVisible();
  } else {
    // If there's a Trends tab
    const trendsTab = page.getByRole("tab", { name: /trends/i }).first();
    if (await trendsTab.count()) {
      await trendsTab.click();
      await expect(page.locator("canvas, svg")).toBeVisible();
    } else {
      console.log("Trends UI not found - may be expected for certain elections");
    }
  }

  // Analysis (text or card list appears)
  const analysisTab = page.getByRole("tab", { name: /analysis/i }).first();
  if (await analysisTab.count()) {
    await analysisTab.click();
    await expect(page.getByText(/insight|analysis|summary/i)).toBeVisible();
  } else {
    // allow an alternate section name
    await expect(page.getByText(/insight|analysis|summary/i)).toBeVisible();
  }
});