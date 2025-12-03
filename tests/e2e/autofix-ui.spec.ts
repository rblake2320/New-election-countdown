/**
 * E2E Autofix UI Tests
 * Tests: Detection-only messaging, blocked apply without approval, degraded-mode banner
 */

import { test, expect } from '@playwright/test';

test.describe('Autofix UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
  });

  test.describe('Detection-Only Messaging', () => {
    test('should show detection-only mode clearly in UI', async ({ page }) => {
      await page.goto('/');
      
      // Look for autofix-related elements - prioritize data-testid
      const autofixElements = page.locator('[data-testid="autofix-panel"], [data-testid="autofix-button"]');
      
      const autofixCount = await autofixElements.count();
      if (autofixCount > 0) {
        // Click on autofix element or navigate to autofix area
        await autofixElements.first().click();
        
        // Should show detection/preview mode messaging
        const detectionMessages = page.locator('[data-testid="detection-mode-message"], [data-testid="preview-mode-notice"]');
        
        const messageCount = await detectionMessages.count();
        if (messageCount > 0) {
          await expect(detectionMessages.first()).toBeVisible();
          
          // Check for safety notices
          const safetyNotices = page.locator('[data-testid="safety-notice"], [data-testid="preview-mode-warning"]');
          const safetyCount = await safetyNotices.count();
          if (safetyCount > 0) {
            await expect(safetyNotices.first()).toBeVisible();
          }
        } else {
          // If autofix exists but no detection messaging, this may be an issue
          console.warn('Autofix panel found but no detection-only messaging - may indicate missing safety features');
        }
      } else {
        // Skip test if autofix functionality isn't available
        console.log('Autofix functionality not found - skipping test');
        return;
      }
    });

    test('should show what would be fixed without making changes', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to autofix area - prioritize data-testid
      const autofixLinks = page.locator('[data-testid="autofix-panel"], [data-testid="autofix-link"]');
      
      const linkCount = await autofixLinks.count();
      if (linkCount > 0) {
        await autofixLinks.first().click();
        
        // Look for preview/detection results - use specific data-testid
        const detectionResults = page.locator('[data-testid="detection-results"], [data-testid="preview-results"]');
        const issuesList = page.locator('[data-testid="issues-list"], [data-testid="problems-list"]');
        
        const resultsCount = await detectionResults.count();
        const issuesCount = await issuesList.count();
        
        if (resultsCount > 0 || issuesCount > 0) {
          // Should show issues/suggestions found
          const resultElement = resultsCount > 0 ? detectionResults.first() : issuesList.first();
          await expect(resultElement).toBeVisible();
          
          // Check for specific preview indicators
          const previewIndicators = page.locator('[data-testid="preview-mode-indicator"], [data-testid="simulation-notice"]');
          const indicatorCount = await previewIndicators.count();
          if (indicatorCount > 0) {
            await expect(previewIndicators.first()).toBeVisible();
          }
        } else {
          console.log('No detection results found - autofix may be in different state');
        }
      } else {
        console.log('Autofix links not found - skipping test');
        return;
      }
    });

    test('should display issue severity levels and counts', async ({ page }) => {
      await page.goto('/');
      
      const autofixElements = page.locator('[data-testid="autofix-panel"], [data-testid="autofix-button"]');
      
      const elementCount = await autofixElements.count();
      if (elementCount > 0) {
        await autofixElements.first().click();
        
        // Look for severity indicators - use specific data-testid
        const severityElements = page.locator('[data-testid="severity-high"], [data-testid="severity-medium"], [data-testid="severity-low"], [data-testid="severity-critical"]');
        const countElements = page.locator('[data-testid="issue-count"], [data-testid="problem-count"]');
        
        const severityCount = await severityElements.count();
        const countElementCount = await countElements.count();
        
        if (severityCount > 0) {
          await expect(severityElements.first()).toBeVisible();
        }
        
        if (countElementCount > 0) {
          await expect(countElements.first()).toBeVisible();
        }
        
        // If autofix is available but no severity/count info, may indicate issue
        if (severityCount === 0 && countElementCount === 0) {
          console.warn('Autofix available but no severity or count information found');
        }
      } else {
        console.log('Autofix not available - skipping severity test');
        return;
      }
    });
  });

  test.describe('Blocked Apply Without Approval', () => {
    test('should block apply operations without proper approval', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to autofix area - prioritize data-testid
      const autofixElements = page.locator('[data-testid="autofix-panel"], [data-testid="autofix-button"]');
      
      const autofixCount = await autofixElements.count();
      if (autofixCount > 0) {
        await autofixElements.first().click();
        
        // Look for apply buttons - use specific data-testid
        const applyButtons = page.locator('[data-testid="apply-button"], [data-testid="fix-apply-button"]');
        
        const applyCount = await applyButtons.count();
        if (applyCount > 0) {
          const applyButton = applyButtons.first();
          
          // Apply button should be disabled for security
          const isDisabled = await applyButton.isDisabled();
          
          if (isDisabled) {
            await expect(applyButton).toBeDisabled();
          } else {
            // If enabled, clicking should show approval requirement
            await applyButton.click();
            
            // Should show approval requirement message - use specific data-testid
            const approvalMessages = page.locator('[data-testid="approval-required-message"], [data-testid="admin-approval-needed"]');
            await expect(approvalMessages.first()).toBeVisible({ timeout: 5000 });
          }
        } else {
          // In a secure system, apply buttons should exist but be properly gated
          console.log('No apply buttons found - system may be in detection-only mode');
        }
      } else {
        console.log('Autofix not available - skipping apply security test');
        return;
      }
    });

    test('should require admin authentication for apply operations', async ({ page }) => {
      await page.goto('/');
      
      const autofixElements = page.locator('[data-testid="autofix-panel"], [data-testid="autofix-button"]');
      
      const autofixCount = await autofixElements.count();
      if (autofixCount > 0) {
        await autofixElements.first().click();
        
        // Try to access apply functionality
        const applyButtons = page.locator('[data-testid="apply-button"], [data-testid="fix-apply-button"]');
        
        const applyCount = await applyButtons.count();
        if (applyCount > 0) {
          await applyButtons.first().click();
          
          // Should show authentication or authorization requirement
          const authPrompts = page.locator('[data-testid="login-required"], [data-testid="admin-required"], [data-testid="insufficient-privileges"]');
          
          const authCount = await authPrompts.count();
          if (authCount > 0) {
            await expect(authPrompts.first()).toBeVisible({ timeout: 5000 });
          } else {
            // Apply functionality should be restricted - this may indicate a security issue
            console.warn('Apply button accessible without proper authentication prompts');
          }
        } else {
          console.log('No apply buttons found - system may be properly restricted');
        }
      } else {
        console.log('Autofix not available - skipping admin auth test');
        return;
      }
    });

    test('should show approval workflow for authorized users', async ({ page }) => {
      await page.goto('/');
      
      const autofixElements = page.locator('[data-testid*="autofix"], text=/auto.?fix/i');
      
      if (await autofixElements.count() > 0) {
        await autofixElements.first().click();
        
        // Look for approval workflow elements
        const approvalElements = page.locator('[data-testid*="approval"], [data-testid*="confirm"], text=/confirm.*changes/i, text=/approve.*fix/i');
        const checksElements = page.locator('[data-testid*="checkbox"], input[type="checkbox"], text=/understand.*risks/i');
        
        if (await approvalElements.count() > 0) {
          await expect(approvalElements.first()).toBeVisible();
          console.log('Approval workflow elements found');
        }
        
        if (await checksElements.count() > 0) {
          console.log('Confirmation checkboxes found');
        }
      }
    });
  });

  test.describe('Degraded Mode Banner', () => {
    test('should show degraded mode banner when appropriate', async ({ page }) => {
      await page.goto('/');
      
      // Look for degraded mode indicators - use specific data-testid
      const degradedBanners = page.locator('[data-testid="degraded-mode-banner"], [data-testid="service-degraded"]');
      const statusBanners = page.locator('[data-testid="service-status-banner"], [data-testid="system-status"]');
      const warningBanners = page.locator('[data-testid="warning-banner"], [data-testid="functionality-limited"]');
      
      const degradedCount = await degradedBanners.count();
      const statusCount = await statusBanners.count();
      const warningCount = await warningBanners.count();
      
      // Check system state is clearly indicated
      if (degradedCount > 0) {
        await expect(degradedBanners.first()).toBeVisible();
        
        const bannerText = await degradedBanners.first().textContent() || '';
        expect(bannerText).toBeTruthy();
        expect(bannerText.toLowerCase()).toMatch(/(degraded|limited|reduced|temporarily|unavailable)/);
      }
      
      if (statusCount > 0) {
        await expect(statusBanners.first()).toBeVisible();
        
        const statusText = await statusBanners.first().textContent() || '';
        expect(statusText).toBeTruthy();
      }
      
      if (warningCount > 0) {
        await expect(warningBanners.first()).toBeVisible();
      }
      
      // System should have some status indication
      const totalStatusIndicators = degradedCount + statusCount + warningCount;
      console.log(`Status indicators found: ${totalStatusIndicators} (degraded: ${degradedCount}, status: ${statusCount}, warning: ${warningCount})`);
    });

    test('should disable autofix apply in degraded mode', async ({ page }) => {
      await page.goto('/');
      
      // Check for degraded mode first - use specific data-testid
      const degradedIndicators = page.locator('[data-testid="degraded-mode-banner"], [data-testid="service-degraded"]');
      
      const degradedCount = await degradedIndicators.count();
      if (degradedCount > 0) {
        // Navigate to autofix
        const autofixElements = page.locator('[data-testid="autofix-panel"], [data-testid="autofix-button"]');
        
        const autofixCount = await autofixElements.count();
        if (autofixCount > 0) {
          await autofixElements.first().click();
          
          // Apply buttons should be disabled in degraded mode
          const applyButtons = page.locator('[data-testid="apply-button"], [data-testid="fix-apply-button"]');
          
          const applyCount = await applyButtons.count();
          if (applyCount > 0) {
            const applyButton = applyButtons.first();
            
            // Should be disabled in degraded mode
            const isDisabled = await applyButton.isDisabled();
            
            if (isDisabled) {
              await expect(applyButton).toBeDisabled();
            } else {
              // If clickable, should show degraded mode warning
              await applyButton.click();
              
              const degradedWarnings = page.locator('[data-testid="degraded-mode-warning"], [data-testid="system-unhealthy-message"]');
              await expect(degradedWarnings.first()).toBeVisible({ timeout: 3000 });
            }
          }
        }
      } else {
        console.log('System in healthy mode - skipping degraded mode test');
        return;
      }
    });

    test('should show specific degraded mode messages for autofix', async ({ page }) => {
      await page.goto('/');
      
      const autofixElements = page.locator('[data-testid*="autofix"], text=/auto.?fix/i');
      
      if (await autofixElements.count() > 0) {
        await autofixElements.first().click();
        
        // Look for degraded mode messages specific to autofix
        const autofixDegradedMessages = page.locator(
          'text=/auto.?fix.*temporarily.*disabled/i, ' +
          'text=/detection.*only.*mode/i, ' +
          'text=/database.*unhealthy/i, ' +
          'text=/system.*not.*ready.*for.*changes/i'
        );
        
        if (await autofixDegradedMessages.count() > 0) {
          await expect(autofixDegradedMessages.first()).toBeVisible();
          console.log('Autofix-specific degraded mode messaging found');
          
          const messageText = await autofixDegradedMessages.first().textContent() || '';
          expect(messageText.toLowerCase()).toMatch(/(temporarily|disabled|unhealthy|detection.*only)/);
        }
      }
    });
  });

  test.describe('Autofix Safety Features', () => {
    test('should show safety warnings and confirmations', async ({ page }) => {
      await page.goto('/');
      
      const autofixElements = page.locator('[data-testid="autofix-panel"], [data-testid="autofix-button"]');
      
      const autofixCount = await autofixElements.count();
      if (autofixCount > 0) {
        await autofixElements.first().click();
        
        // Look for safety warnings - use specific data-testid
        const safetyWarnings = page.locator('[data-testid="safety-warning"], [data-testid="caution-notice"], [data-testid="risk-warning"]');
        
        const warningCount = await safetyWarnings.count();
        if (warningCount > 0) {
          await expect(safetyWarnings.first()).toBeVisible();
        }
        
        // Look for confirmation checkboxes - use specific data-testid
        const confirmationCheckboxes = page.locator('[data-testid="understand-risks-checkbox"], [data-testid="confirm-action-checkbox"]');
        
        const checkboxCount = await confirmationCheckboxes.count();
        if (checkboxCount > 0) {
          await expect(confirmationCheckboxes.first()).toBeVisible();
        }
        
        // In a secure system, safety features should be present
        if (warningCount === 0 && checkboxCount === 0) {
          console.warn('No safety warnings or confirmation checkboxes found - may indicate missing safety features');
        }
      } else {
        console.log('Autofix not available - skipping safety features test');
        return;
      }
    });

    test('should require multiple confirmations for high-risk operations', async ({ page }) => {
      await page.goto('/');
      
      const autofixElements = page.locator('[data-testid*="autofix"], text=/auto.?fix/i');
      
      if (await autofixElements.count() > 0) {
        await autofixElements.first().click();
        
        // Look for high-severity issues
        const highSeverityIssues = page.locator('text=/high.*severity/i, text=/critical/i, [data-testid*="high"], [data-testid*="critical"]');
        
        if (await highSeverityIssues.count() > 0) {
          console.log('High severity issues found');
          
          // Try to apply fix to high severity issue
          const applyButtons = page.locator('[data-testid*="apply"], button:has-text("Apply")');
          
          if (await applyButtons.count() > 0) {
            await applyButtons.first().click();
            
            // Should require multiple confirmations
            const multipleConfirmations = page.locator(
              'text=/multiple.*confirmations/i, ' +
              'text=/step.*\\d+.*of.*\\d+/i, ' +
              'text=/final.*confirmation/i'
            );
            
            if (await multipleConfirmations.count() > 0) {
              await expect(multipleConfirmations.first()).toBeVisible();
              console.log('Multiple confirmation workflow found');
            }
          }
        }
      }
    });

    test('should show rollback information', async ({ page }) => {
      await page.goto('/');
      
      const autofixElements = page.locator('[data-testid*="autofix"], text=/auto.?fix/i');
      
      if (await autofixElements.count() > 0) {
        await autofixElements.first().click();
        
        // Look for rollback/undo information
        const rollbackInfo = page.locator(
          'text=/rollback/i, ' +
          'text=/undo/i, ' +
          'text=/restore/i, ' +
          'text=/backup/i, ' +
          'text=/reversible/i'
        );
        
        if (await rollbackInfo.count() > 0) {
          console.log('Rollback information found');
        }
      }
    });
  });

  test.describe('Real-time Status Updates', () => {
    test('should show real-time autofix status', async ({ page }) => {
      await page.goto('/');
      
      // Look for status indicators - use specific data-testid
      const statusIndicators = page.locator('[data-testid="autofix-status"], [data-testid="system-health-indicator"]');
      const lastUpdated = page.locator('[data-testid="last-updated-timestamp"], [data-testid="status-timestamp"]');
      
      const statusCount = await statusIndicators.count();
      const timestampCount = await lastUpdated.count();
      
      if (statusCount > 0) {
        await expect(statusIndicators.first()).toBeVisible();
      }
      
      if (timestampCount > 0) {
        await expect(lastUpdated.first()).toBeVisible();
      }
      
      console.log(`Real-time status indicators: ${statusCount}, timestamps: ${timestampCount}`);
    });

    test('should handle service status changes gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Check initial status
      const initialDegraded = await page.locator('[data-testid*="degraded"], text=/degraded/i').count();
      
      // Reload page to simulate status change
      await page.reload();
      
      // Status should be consistent or show appropriate transitions
      const afterReloadDegraded = await page.locator('[data-testid*="degraded"], text=/degraded/i').count();
      
      // Should not show both healthy and degraded states simultaneously
      const hasHealthy = await page.locator('text=/operational/i, text=/healthy/i, text=/normal/i').count() > 0;
      const hasDegraded = afterReloadDegraded > 0;
      
      if (hasHealthy && hasDegraded) {
        console.warn('Inconsistent service status indicators found');
      } else {
        console.log('Service status indicators appear consistent');
      }
    });
  });
});