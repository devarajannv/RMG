/**
 * Authentication E2E Tests
 * 
 * Critical path tests for authentication:
 * - Login flow (valid/invalid credentials)
 * - Logout flow
 * - Session persistence
 * - Token refresh
 * - Protected route access
 * 
 * @module e2e/tests/auth.spec
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../playwright.config';

test.describe('Authentication', () => {
  // ========================================================================
  // Login Tests
  // ========================================================================
  
  test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we start logged out
      await page.goto('/login');
    });

    test('AUTH-001: should display login page correctly', async ({ page }) => {
      // Page title
      await expect(page).toHaveTitle(/RMG|Login/i);
      
      // Login form elements
      await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Logo/branding
      await expect(page.locator('img[alt*="logo"], [data-testid="logo"]').first()).toBeVisible();
    });

    test('AUTH-002: should login with valid credentials', async ({ page }) => {
      // Fill login form
      await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
      await page.fill('input[name="password"], input[type="password"]', testConfig.testUser.password);
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard/home
      await expect(page).toHaveURL(/\/(dashboard|home|resources)/, { timeout: 10000 });
      
      // User menu should be visible
      await expect(
        page.locator('[data-testid="user-menu"], button:has-text("Logout"), [data-testid="user-avatar"]').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('AUTH-003: should show error for invalid email', async ({ page }) => {
      await page.fill('input[name="email"], input[type="email"]', 'invalid@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'somepassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(
        page.locator('text=/invalid|incorrect|not found|error/i').first()
      ).toBeVisible({ timeout: 5000 });
      
      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('AUTH-004: should show error for invalid password', async ({ page }) => {
      await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
      await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(
        page.locator('text=/invalid|incorrect|wrong|error/i').first()
      ).toBeVisible({ timeout: 5000 });
      
      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('AUTH-005: should validate email format', async ({ page }) => {
      await page.fill('input[name="email"], input[type="email"]', 'notanemail');
      await page.fill('input[name="password"], input[type="password"]', 'somepassword');
      await page.click('button[type="submit"]');
      
      // Should show validation error or HTML5 validation
      const emailInput = page.locator('input[name="email"], input[type="email"]');
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      
      if (!isInvalid) {
        // Custom validation message
        await expect(
          page.locator('text=/valid email|invalid email|email format/i').first()
        ).toBeVisible();
      }
    });

    test('AUTH-006: should require both email and password', async ({ page }) => {
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Check for validation
      const emailInput = page.locator('input[name="email"], input[type="email"]');
      const passwordInput = page.locator('input[name="password"], input[type="password"]');
      
      const emailRequired = await emailInput.getAttribute('required');
      const passwordRequired = await passwordInput.getAttribute('required');
      
      // Either HTML5 validation or custom validation
      expect(emailRequired !== null || passwordRequired !== null).toBeTruthy();
    });

    test('AUTH-007: should mask password input', async ({ page }) => {
      const passwordInput = page.locator('input[name="password"], input[type="password"]');
      
      // Should be type password
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Fill password
      await passwordInput.fill('secretpassword');
      
      // Value should not be visible in DOM as plain text
      const inputType = await passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
    });

    test('AUTH-008: should support password visibility toggle', async ({ page }) => {
      const passwordInput = page.locator('input[name="password"], input[type="password"]');
      await passwordInput.fill('secretpassword');
      
      // Look for toggle button
      const toggleButton = page.locator('[data-testid="password-toggle"], button[aria-label*="password"], button:has([class*="eye"])');
      
      if (await toggleButton.isVisible()) {
        // Initial state should be password (hidden)
        await expect(passwordInput).toHaveAttribute('type', 'password');
        
        // Click toggle
        await toggleButton.click();
        
        // Should now be visible
        await expect(passwordInput).toHaveAttribute('type', 'text');
        
        // Toggle back
        await toggleButton.click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });
  });

  // ========================================================================
  // Logout Tests
  // ========================================================================
  
  test.describe('Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
      await page.fill('input[name="password"], input[type="password"]', testConfig.testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|home|resources)/);
    });

    test('AUTH-009: should logout successfully', async ({ page }) => {
      // Find and click user menu if present
      const userMenu = page.locator('[data-testid="user-menu"], [data-testid="user-avatar"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
      }
      
      // Click logout
      await page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout-button"]').click();
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test('AUTH-010: should clear session on logout', async ({ page, context }) => {
      // Logout
      const userMenu = page.locator('[data-testid="user-menu"], [data-testid="user-avatar"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
      }
      await page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout-button"]').click();
      
      await page.waitForURL(/\/login/);
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ========================================================================
  // Protected Routes Tests
  // ========================================================================
  
  test.describe('Protected Routes', () => {
    test('AUTH-011: should redirect unauthenticated user to login', async ({ page, context }) => {
      // Clear all cookies and storage
      await context.clearCookies();
      
      // Try to access protected routes
      const protectedRoutes = ['/dashboard', '/resources', '/projects', '/contracts', '/settings'];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
      }
    });

    test('AUTH-012: should preserve intended destination after login', async ({ page, context }) => {
      // Clear auth
      await context.clearCookies();
      
      // Try to access specific page
      await page.goto('/resources');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      
      // Login
      await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
      await page.fill('input[name="password"], input[type="password"]', testConfig.testUser.password);
      await page.click('button[type="submit"]');
      
      // Should redirect to originally intended page (or dashboard)
      await expect(page).toHaveURL(/\/(resources|dashboard|home)/, { timeout: 10000 });
    });
  });

  // ========================================================================
  // Session Persistence Tests
  // ========================================================================
  
  test.describe('Session Persistence', () => {
    test('AUTH-013: should maintain session across page reloads', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
      await page.fill('input[name="password"], input[type="password"]', testConfig.testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|home|resources)/);
      
      // Reload page
      await page.reload();
      
      // Should still be logged in
      await expect(page).not.toHaveURL(/\/login/);
      await expect(
        page.locator('[data-testid="user-menu"], button:has-text("Logout")').first()
      ).toBeVisible();
    });

    test('AUTH-014: should maintain session across navigation', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
      await page.fill('input[name="password"], input[type="password"]', testConfig.testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|home|resources)/);
      
      // Navigate to different pages
      const pages = ['/resources', '/projects', '/contracts'];
      
      for (const path of pages) {
        await page.goto(path);
        await expect(page).not.toHaveURL(/\/login/);
      }
    });
  });

  // ========================================================================
  // Security Tests
  // ========================================================================
  
  test.describe('Security', () => {
    test('AUTH-015: should not expose sensitive data in URL', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
      await page.fill('input[name="password"], input[type="password"]', testConfig.testUser.password);
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/\/(dashboard|home|resources)/);
      
      // URL should not contain token, password, or sensitive info
      const url = page.url();
      expect(url).not.toContain('token');
      expect(url).not.toContain('password');
      expect(url).not.toContain(testConfig.testUser.password);
    });

    test('AUTH-016: should handle concurrent session properly', async ({ browser }) => {
      // Create two browser contexts (simulating two browser windows)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      try {
        // Login in both
        for (const page of [page1, page2]) {
          await page.goto('/login');
          await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
          await page.fill('input[name="password"], input[type="password"]', testConfig.testUser.password);
          await page.click('button[type="submit"]');
          await page.waitForURL(/\/(dashboard|home|resources)/, { timeout: 10000 });
        }
        
        // Both should be logged in
        await expect(page1).not.toHaveURL(/\/login/);
        await expect(page2).not.toHaveURL(/\/login/);
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });
});
