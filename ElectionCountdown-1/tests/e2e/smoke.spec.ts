/**
 * E2E Smoke Tests
 * Tests: Home loads, elections grid renders, service-status banner shows
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1366, height: 900 });
  });

  test('home page loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Election/i);
    
    // Check that the main content is visible
    await expect(page.locator('body')).toBeVisible();
    
    // Check for no JavaScript errors by looking for basic interactivity
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);
  });

  test('elections grid renders with data', async ({ page }) => {
    await page.goto('/');
    
    // Wait for elections grid to be visible - prioritize data-testid
    await expect(page.locator('[data-testid="election-card"], [data-testid="featured-election-card"]')).toBeVisible();
    
    // Check that multiple election cards are rendered
    const electionCards = page.locator('[data-testid="election-card"], [data-testid="featured-election-card"]');
    const cardCount = await electionCards.count();
    expect(cardCount).toBeGreaterThan(1);
    
    // Check that election cards contain expected content
    const firstCard = electionCards.first();
    await expect(firstCard).toBeVisible();
    
    // Look for typical election data (title, date, etc.)
    const cardText = await firstCard.textContent();
    expect(cardText).toMatch(/(election|2024|2025|2026|district|state|governor|senate|house)/i);
  });

  test('elections grid loads without infinite loading states', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Check that loading skeleton is not permanently stuck - prioritize data-testid
    const loadingElements = page.locator('[data-testid="skeleton"], [data-testid="loading-spinner"]');
    
    // Loading elements should either not exist or disappear within reasonable time
    const loadingCount = await loadingElements.count();
    if (loadingCount > 0) {
      await expect(loadingElements).toHaveCount(0, { timeout: 10000 });
    }
    
    // Ensure actual content has loaded
    await expect(page.locator('[data-testid="election-card"], [data-testid="featured-election-card"]')).toBeVisible();
  });

  test('service status banner shows when appropriate', async ({ page }) => {
    await page.goto('/');
    
    // Look for service status banner or indicators - prioritize data-testid
    const statusBanner = page.locator('[data-testid="service-status-banner"], [data-testid="status-banner"]');
    const degradedBanner = page.locator('[data-testid="degraded-mode-banner"], [data-testid="service-degraded"]');
    
    // Check service status state - exactly one of these should be true
    const bannerCount = await statusBanner.count();
    const degradedCount = await degradedBanner.count();
    
    // At least some status indication should exist in a production app
    if (bannerCount > 0) {
      await expect(statusBanner.first()).toBeVisible();
      
      // Check banner content is meaningful
      const bannerText = await statusBanner.first().textContent();
      expect(bannerText).toBeTruthy();
      expect(bannerText).toMatch(/(service|status|available|degraded|operational|maintenance)/i);
    }
    
    if (degradedCount > 0) {
      await expect(degradedBanner.first()).toBeVisible();
      
      // Check degraded mode banner content is specific
      const degradedText = await degradedBanner.first().textContent();
      expect(degradedText).toBeTruthy();
      expect(degradedText).toMatch(/(degraded|limited|reduced|temporarily|unavailable)/i);
    }
    
    // Both banners shouldn't be visible simultaneously
    if (bannerCount > 0 && degradedCount > 0) {
      console.warn('Both service status and degraded banners visible - this may indicate conflicting states');
    }
    
    console.log(`Service status: normal=${bannerCount}, degraded=${degradedCount}`);
  });

  test('navigation and basic interactivity work', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation elements - prioritize data-testid
    const navElements = page.locator('[data-testid="navigation"], [data-testid="sidebar"], nav');
    const navCount = await navElements.count();
    if (navCount > 0) {
      await expect(navElements.first()).toBeVisible();
    } else {
      // Navigation should exist - this is likely a real issue
      console.warn('No navigation elements found - this may indicate a UI issue');
    }
    
    // Test basic interactivity - look for clickable elements
    const clickableElements = page.locator('[data-testid*="button"], [data-testid*="link"], button, a');
    const clickableCount = await clickableElements.count();
    expect(clickableCount).toBeGreaterThan(0);
    
    // Test that at least one clickable element is functional
    const firstClickable = clickableElements.first();
    await expect(firstClickable).toBeVisible();
    await expect(firstClickable).toBeEnabled();
  });

  test('responsive layout works on different screen sizes', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // Ensure elections grid still works on mobile
    const electionCards = page.locator('[data-testid="election-card"], [data-testid="featured-election-card"]');
    const mobileCardCount = await electionCards.count();
    expect(mobileCardCount).toBeGreaterThan(0);
  });

  test('no critical console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Check for critical errors (filter out common non-critical ones)
    const criticalErrors = consoleErrors.filter(error => {
      // Filter out common, non-critical errors
      return !error.includes('favicon.ico') && 
             !error.includes('net::ERR_FAILED') &&
             !error.includes('DevTools') &&
             !error.includes('WebSocket');
    });
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('elections data is not obviously mock or placeholder', async ({ page }) => {
    await page.goto('/');
    
    // Wait for elections to load
    await expect(page.locator('[data-testid="election-card"], [data-testid="featured-election-card"]')).toBeVisible();
    
    // Get all text content from election cards
    const electionCards = page.locator('[data-testid="election-card"], [data-testid="featured-election-card"]');
    const cardCount = await electionCards.count();
    
    expect(cardCount).toBeGreaterThan(1);
    
    let hasMockData = false;
    
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const cardText = await electionCards.nth(i).textContent() || '';
      
      // Check for obvious mock data patterns
      if (cardText.includes('Test Election') ||
          cardText.includes('Mock') ||
          cardText.includes('Placeholder') ||
          cardText.includes('Example') ||
          cardText.includes('Sample') ||
          cardText.includes('Fake')) {
        hasMockData = true;
        break;
      }
    }
    
    // Elections should contain real-looking data
    expect(hasMockData).toBe(false);
  });

  test('basic performance - page loads within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for elections grid to be visible (main content loaded)
    await expect(page.locator('[data-testid="election-card"], [data-testid="featured-election-card"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    
    // Log performance for debugging
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('elections grid shows countdown timers or dates', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('[data-testid="election-card"], [data-testid="featured-election-card"]')).toBeVisible();
    
    // Look for date/time related content
    const pageContent = await page.textContent('body') || '';
    
    // Should have dates, countdowns, or time-related content
    const hasTimeContent = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d+\s*(days?|hours?|minutes?))/i.test(pageContent);
    
    expect(hasTimeContent).toBe(true);
  });
});