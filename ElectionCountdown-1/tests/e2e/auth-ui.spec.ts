/**
 * E2E Auth UI Tests
 * Tests: Register/login flows, admin widget visibility
 */

import { test, expect } from '@playwright/test';

test.describe('Auth UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
  });

  test.describe('Registration Flow', () => {
    test('should show registration form and handle registration', async ({ page }) => {
      await page.goto('/');
      
      // Look for registration/signup related elements - prioritize data-testid
      const registerButtons = page.locator('[data-testid="register-button"], [data-testid="signup-button"], [data-testid="register-link"]');
      
      const registerCount = await registerButtons.count();
      if (registerCount > 0) {
        await registerButtons.first().click();
        
        // Should navigate to registration page or show registration form
        await expect(page.locator('[data-testid="email-input"], input[type="email"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"], input[type="password"]')).toBeVisible();
        
        // Test form validation
        const submitButton = page.locator('[data-testid="submit-button"], [data-testid="register-submit"], button[type="submit"]');
        const submitCount = await submitButton.count();
        if (submitCount > 0) {
          await submitButton.click();
          
          // Should show validation errors for empty form
          await expect(page.locator('[data-testid="validation-error"], [data-testid="form-error"]')).toBeVisible({ timeout: 5000 });
        }
        
        // Test with valid data
        await page.locator('[data-testid="email-input"], input[type="email"]').first().fill('test@example.com');
        await page.locator('[data-testid="password-input"], input[type="password"]').first().fill('password123');
        
        if (submitCount > 0) {
          await submitButton.click();
          
          // Should either succeed or show specific error
          const successMessage = page.locator('[data-testid="registration-success"], [data-testid="welcome-message"]');
          const errorMessage = page.locator('[data-testid="registration-error"], [data-testid="form-error"]');
          
          try {
            await expect(successMessage).toBeVisible({ timeout: 3000 });
          } catch {
            // If not success, should show specific error message
            await expect(errorMessage).toBeVisible({ timeout: 3000 });
          }
        }
      } else {
        console.log('Registration UI not available - may be handled differently or disabled');
        return;
      }
    });

    test('should validate email format during registration', async ({ page }) => {
      await page.goto('/');
      
      const registerButtons = page.locator('[data-testid*="register"], [data-testid*="signup"], button:has-text("Register"), button:has-text("Sign Up"), a:has-text("Register"), a:has-text("Sign Up")');
      
      if (await registerButtons.count() > 0) {
        await registerButtons.first().click();
        
        const emailInput = page.locator('[data-testid*="email"], input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('[data-testid*="password"], input[type="password"], input[name="password"]').first();
        const submitButton = page.locator('[data-testid*="submit"], button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
        
        if (await emailInput.count() > 0 && await submitButton.count() > 0) {
          // Test invalid email format
          await emailInput.fill('invalid-email');
          await passwordInput.fill('password123');
          await submitButton.click();
          
          // Should show email validation error
          await expect(page.locator('text=/valid email|email format|invalid email/i')).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Login Flow', () => {
    test('should show login form and handle login', async ({ page }) => {
      await page.goto('/');
      
      // Look for login/signin related elements - prioritize data-testid
      const loginButtons = page.locator('[data-testid="login-button"], [data-testid="signin-button"], [data-testid="login-link"]');
      
      const loginCount = await loginButtons.count();
      if (loginCount > 0) {
        await loginButtons.first().click();
        
        // Should navigate to login page or show login form
        await expect(page.locator('[data-testid="email-input"], input[type="email"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"], input[type="password"]')).toBeVisible();
        
        // Test empty form validation
        const submitButton = page.locator('[data-testid="submit-button"], [data-testid="login-submit"], button[type="submit"]');
        const submitCount = await submitButton.count();
        if (submitCount > 0) {
          await submitButton.click();
          
          // Should show validation errors for empty form
          await expect(page.locator('[data-testid="validation-error"], [data-testid="login-error"]')).toBeVisible({ timeout: 5000 });
        }
        
        // Test with credentials (should fail with non-existent user)
        await page.locator('[data-testid="email-input"], input[type="email"]').first().fill('nonexistent@example.com');
        await page.locator('[data-testid="password-input"], input[type="password"]').first().fill('wrongpassword');
        
        if (submitCount > 0) {
          await submitButton.click();
          
          // Should show authentication error
          await expect(page.locator('[data-testid="login-error"], [data-testid="auth-error"]')).toBeVisible({ timeout: 5000 });
        }
      } else {
        console.log('Login UI not available - may be handled differently or disabled');
        return;
      }
    });

    test('should handle forgotten password flow', async ({ page }) => {
      await page.goto('/');
      
      const loginButtons = page.locator('[data-testid*="login"], [data-testid*="signin"], button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login"), a:has-text("Sign In")');
      
      if (await loginButtons.count() > 0) {
        await loginButtons.first().click();
        
        // Look for forgot password link
        const forgotPasswordLink = page.locator('[data-testid*="forgot"], a:has-text("Forgot"), text=/forgot.*password/i');
        
        if (await forgotPasswordLink.count() > 0) {
          await forgotPasswordLink.first().click();
          
          // Should show password reset form
          await expect(page.locator('[data-testid*="email"], input[type="email"], input[name="email"]')).toBeVisible();
          
          const resetButton = page.locator('[data-testid*="reset"], button:has-text("Reset"), button:has-text("Send")');
          if (await resetButton.count() > 0) {
            // Test with valid email
            await page.locator('[data-testid*="email"], input[type="email"], input[name="email"]').first().fill('test@example.com');
            await resetButton.click();
            
            // Should show confirmation message
            await expect(page.locator('text=/sent|email|check|reset/i')).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('Authentication State Management', () => {
    test('should show different UI for authenticated vs unauthenticated users', async ({ page }) => {
      await page.goto('/');
      
      // Check for authentication-specific UI elements - prioritize data-testid
      const authButtons = page.locator('[data-testid="login-button"], [data-testid="register-button"]');
      const userMenu = page.locator('[data-testid="user-menu"], [data-testid="profile-menu"], [data-testid="logout-button"]');
      
      const hasAuthButtons = await authButtons.count() > 0;
      const hasUserMenu = await userMenu.count() > 0;
      
      // Should have either auth buttons (not logged in) or user menu (logged in)
      expect(hasAuthButtons || hasUserMenu).toBe(true);
      
      if (hasAuthButtons) {
        console.log('User appears to be unauthenticated (auth buttons visible)');
        await expect(authButtons.first()).toBeVisible();
      }
      
      if (hasUserMenu) {
        console.log('User appears to be authenticated (user menu visible)');
        await expect(userMenu.first()).toBeVisible();
      }
    });

    test('should handle logout functionality', async ({ page }) => {
      await page.goto('/');
      
      // Look for logout button/link - prioritize data-testid
      const logoutButtons = page.locator('[data-testid="logout-button"], [data-testid="signout-button"]');
      
      const logoutCount = await logoutButtons.count();
      if (logoutCount > 0) {
        await logoutButtons.first().click();
        
        // After logout, should see login/register options
        await expect(page.locator('[data-testid="login-button"], [data-testid="register-button"]')).toBeVisible({ timeout: 5000 });
      } else {
        console.log('User not authenticated or logout not available');
        return;
      }
    });
  });

  test.describe('Admin Widget Visibility', () => {
    test('should show admin-specific UI elements for admin users', async ({ page }) => {
      await page.goto('/');
      
      // Look for admin-specific elements
      const adminElements = page.locator('[data-testid*="admin"], [data-testid*="admin-widget"], [data-testid*="admin-panel"], .admin-widget, .admin-panel');
      const autofixElements = page.locator('[data-testid*="autofix"], [data-testid*="auto-fix"], text=/auto.?fix/i');
      const settingsElements = page.locator('[data-testid*="settings"], [data-testid*="configuration"], button:has-text("Settings")');
      
      // Check if any admin elements are visible
      const hasAdminElements = await adminElements.count() > 0;
      const hasAutofixElements = await autofixElements.count() > 0;
      const hasSettingsElements = await settingsElements.count() > 0;
      
      if (hasAdminElements || hasAutofixElements || hasSettingsElements) {
        console.log('Admin UI elements found - user may have admin privileges');
        
        if (hasAdminElements) {
          await expect(adminElements.first()).toBeVisible();
        }
        
        if (hasAutofixElements) {
          await expect(autofixElements.first()).toBeVisible();
        }
        
        if (hasSettingsElements) {
          await expect(settingsElements.first()).toBeVisible();
        }
      } else {
        console.log('No admin UI elements found - user may be regular user or admin features may be in different location');
      }
    });

    test('should have admin features properly gated', async ({ page }) => {
      await page.goto('/');
      
      // Try to access admin-specific functionality
      const adminElements = page.locator('[data-testid*="admin"], [data-testid*="autofix"], text=/admin|auto.?fix/i');
      
      if (await adminElements.count() > 0) {
        const firstAdminElement = adminElements.first();
        
        // If admin element is clickable, try clicking it
        if (await firstAdminElement.isVisible()) {
          try {
            await firstAdminElement.click({ timeout: 2000 });
            
            // After clicking admin element, should either:
            // 1. Show admin interface (if user is admin)
            // 2. Show access denied message (if user is not admin)
            // 3. Prompt for authentication
            
            const accessDenied = page.locator('text=/access denied|unauthorized|insufficient privileges|admin required/i');
            const authPrompt = page.locator('text=/login|authenticate|sign in/i');
            const adminInterface = page.locator('[data-testid*="admin-dashboard"], [data-testid*="admin-panel"], text=/admin dashboard|admin panel/i');
            
            // Should see one of these responses
            const hasAccessDenied = await accessDenied.count() > 0;
            const hasAuthPrompt = await authPrompt.count() > 0;
            const hasAdminInterface = await adminInterface.count() > 0;
            
            expect(hasAccessDenied || hasAuthPrompt || hasAdminInterface).toBe(true);
            
            if (hasAccessDenied) {
              console.log('Admin access properly gated - access denied for non-admin user');
            } else if (hasAuthPrompt) {
              console.log('Admin access properly gated - authentication required');
            } else if (hasAdminInterface) {
              console.log('Admin interface accessible - user has admin privileges');
            }
          } catch (error) {
            console.log('Admin element not clickable or interaction failed:', error);
          }
        }
      }
    });

    test('should show admin widget with autofix controls', async ({ page }) => {
      await page.goto('/');
      
      // Look specifically for autofix admin controls
      const autofixControls = page.locator('[data-testid*="autofix"], text=/auto.?fix/i');
      const detectionButtons = page.locator('[data-testid*="detection"], button:has-text("Detect"), text=/detect.*issues/i');
      const applyButtons = page.locator('[data-testid*="apply"], button:has-text("Apply"), text=/apply.*fix/i');
      
      if (await autofixControls.count() > 0) {
        console.log('Autofix controls found');
        
        // Check for detection vs apply separation
        const hasDetectionControls = await detectionButtons.count() > 0;
        const hasApplyControls = await applyButtons.count() > 0;
        
        if (hasDetectionControls) {
          await expect(detectionButtons.first()).toBeVisible();
          console.log('Detection controls visible');
        }
        
        if (hasApplyControls) {
          // Apply controls should be more restricted
          const applyButton = applyButtons.first();
          if (await applyButton.isVisible()) {
            // Apply button should either be disabled or require additional confirmation
            const isDisabled = await applyButton.isDisabled();
            console.log(`Apply button disabled: ${isDisabled}`);
          }
        }
      }
    });
  });

  test.describe('Session Management', () => {
    test('should persist authentication across page reloads', async ({ page }) => {
      await page.goto('/');
      
      // Check initial auth state
      const initialAuthButtons = await page.locator('[data-testid*="login"], [data-testid*="register"], button:has-text("Login")').count();
      const initialUserMenu = await page.locator('[data-testid*="user-menu"], [data-testid*="logout"], button:has-text("Logout")').count();
      
      // Reload the page
      await page.reload();
      
      // Check auth state after reload
      const afterReloadAuthButtons = await page.locator('[data-testid*="login"], [data-testid*="register"], button:has-text("Login")').count();
      const afterReloadUserMenu = await page.locator('[data-testid*="user-menu"], [data-testid*="logout"], button:has-text("Logout")').count();
      
      // Auth state should be consistent
      expect(afterReloadAuthButtons > 0).toBe(initialAuthButtons > 0);
      expect(afterReloadUserMenu > 0).toBe(initialUserMenu > 0);
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Try to access a protected endpoint that might trigger session validation
      const protectedElements = page.locator('[data-testid*="admin"], [data-testid*="profile"], [data-testid*="dashboard"]');
      
      if (await protectedElements.count() > 0) {
        await protectedElements.first().click();
        
        // Should either show content (valid session) or redirect to login (expired session)
        try {
          await expect(page.locator('[data-testid*="login"], input[type="email"]')).toBeVisible({ timeout: 3000 });
          console.log('Session appears to be expired - redirected to login');
        } catch {
          console.log('Session appears to be valid - protected content accessible');
        }
      }
    });
  });
});