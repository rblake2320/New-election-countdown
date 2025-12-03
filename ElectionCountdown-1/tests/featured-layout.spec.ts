import { test, expect } from '@playwright/test';

test.describe('Featured vs Upcoming layout', () => {
  test('Featured cards render with equal heights & CTAs', async ({ page }) => {
    await page.goto('/');

    // Wait for Featured section
    const featuredSection = page.getByRole('heading', { name: /featured elections/i }).locator('..');
    await expect(featuredSection).toBeVisible();

    // Prefer stable data-testid if available; fall back to semantic selector
    const featuredCards = page.locator('[data-testid="featured-card"], section:has(h2:has-text("Featured Elections")) article, section:has-text("Featured Elections") article');
    await expect(featuredCards).toHaveCountGreaterThan(0);

    // Check each card has the Details button (Compare is on details page)
    const cardCount = await featuredCards.count();
    for (let i = 0; i < cardCount; i++) {
      const card = featuredCards.nth(i);
      // Look for Details link/button
      const detailsLink = card.locator('a:has-text("Details"), button:has-text("Details")');
      await expect(detailsLink).toBeVisible();
    }

    // Ensure equal heights (allow minor 1-4px variance for subpixel rounding)
    const heights = await featuredCards.evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    expect(max - min, `heights=${JSON.stringify(heights)}`).toBeLessThanOrEqual(4);
  });

  test('Upcoming grid exists & cards are stretched to equal heights', async ({ page }) => {
    await page.goto('/');

    const upcomingSection = page.getByRole('heading', { name: /upcoming elections/i }).locator('..');
    await expect(upcomingSection).toBeVisible();

    const upcomingCards = page.locator('[data-testid="election-card"], .et-grid-eq article, [role="list"] article'); // supports Virtuoso grid
    await expect(upcomingCards.first()).toBeVisible();

    // sample a handful on the first screen
    const sampleCount = Math.min(6, await upcomingCards.count());
    const heights = [];
    for (let i = 0; i < sampleCount; i++) {
      const h = await upcomingCards.nth(i).evaluate(el => el.getBoundingClientRect().height);
      heights.push(h);
    }
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    expect(max - min, `heights=${JSON.stringify(heights)}`).toBeLessThanOrEqual(6);
  });

  test('Featured and Upcoming cards use same component structure', async ({ page }) => {
    await page.goto('/');
    
    // Wait for both sections to load
    await page.waitForSelector('h2:has-text("Featured Elections")');
    await page.waitForSelector('h2:has-text("Upcoming Elections")');
    
    // Get featured cards
    const featuredCards = page.locator('section:has(h2:has-text("Featured Elections")) article');
    const featuredCount = await featuredCards.count();
    expect(featuredCount).toBeGreaterThan(0);
    
    // Get upcoming cards (from Virtuoso grid)
    const upcomingCards = page.locator('[data-test-id="virtuoso-item-list"] article, .et-grid-eq article').first();
    await expect(upcomingCards).toBeVisible();
    
    // Both should have the et-card class
    const featuredHasEtCard = await featuredCards.first().evaluate(el => el.classList.contains('et-card'));
    const upcomingHasEtCard = await upcomingCards.evaluate(el => el.classList.contains('et-card'));
    
    expect(featuredHasEtCard).toBe(true);
    expect(upcomingHasEtCard).toBe(true);
  });
});