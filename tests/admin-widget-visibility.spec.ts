import { test, expect } from '@playwright/test';

test.describe('Admin features visibility', () => {
  test('Data Integrity / Run Auto-fix is hidden for public users', async ({ page }) => {
    await page.goto('/');

    // It should not be visible to normal users
    const adminWidget = page.locator('[data-testid="data-integrity-widget"], [data-testid="data-steward-status-card"]');
    await expect(adminWidget).toHaveCount(0);

    // Also ensure "Run Auto-fix" isn't accidentally present
    await expect(page.getByRole('button', { name: /run auto-fix/i })).toHaveCount(0);
    await expect(page.getByText(/data integrity/i)).toHaveCount(0);
    
    // Check that Data Steward Status Card is not visible
    await expect(page.getByText(/Data Steward Status/i)).toHaveCount(0);
    await expect(page.getByText(/issues detected/i)).toHaveCount(0);
  });

  test('Admin features visible with VITE_ADMIN_FEATURES flag', async ({ page }) => {
    // This test would only pass if VITE_ADMIN_FEATURES=1 is set
    // Skip if not in admin mode
    const isAdminMode = process.env.VITE_ADMIN_FEATURES === '1';
    test.skip(!isAdminMode, 'Skipping admin test - VITE_ADMIN_FEATURES not set');
    
    await page.goto('/');
    
    // Admin widget should be visible
    const adminWidget = page.locator('[data-testid="data-steward-status-card"], text=/Data Steward Status/i');
    await expect(adminWidget).toBeVisible();
  });

  test('No console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for any async operations

    // Filter out expected/acceptable errors
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404') &&
      !err.includes('unauthorized') // Expected when not logged in
    );

    expect(criticalErrors).toHaveLength(0);
  });
});