/**
 * Visual Regression E2E Tests
 * 
 * Screenshot-based tests to catch unintended visual changes:
 * - Page layouts at different breakpoints
 * - Component states (hover, focus, active)
 * - Theme variations (light/dark)
 * - Critical UI elements
 * 
 * @module e2e/tests/visual.spec
 */

import { test, expect } from '../fixtures';
import {
  visualSnapshot,
  componentSnapshot,
  responsiveSnapshots,
  themeSnapshots,
  stateSnapshots,
  getCommonMasks,
  VIEWPORTS,
} from '../utils/visual';

// ============================================================================
// Configuration
// ============================================================================

const COMMON_OPTIONS = {
  mask: getCommonMasks(),
  animations: 'disabled' as const,
};

// ============================================================================
// Page Layout Tests
// ============================================================================

test.describe('Page Layouts', () => {
  test.describe('Dashboard', () => {
    test('VIS-001: should match dashboard baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'dashboard-layout',
      });
    });

    test('VIS-002: should match dashboard at mobile breakpoint', async ({ appPage, page }, testInfo) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await appPage.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'dashboard-mobile',
      });
    });

    test('VIS-003: should match dashboard at tablet breakpoint', async ({ appPage, page }, testInfo) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await appPage.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'dashboard-tablet',
      });
    });
  });

  test.describe('Resources', () => {
    test('VIS-004: should match resources list baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/resources');
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'resources-list',
      });
    });

    test('VIS-005: should match resource detail baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/resources');
      await page.waitForLoadState('networkidle');
      
      // Click first resource
      await page.locator('tbody tr, [data-testid="resource-card"]').first().click();
      await page.waitForURL(/\/resources\/[\w-]+/);
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'resource-detail',
      });
    });

    test('VIS-006: should match resources responsive', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/resources');
      await page.waitForLoadState('networkidle');
      
      await responsiveSnapshots(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'resources-list',
      });
    });
  });

  test.describe('Projects', () => {
    test('VIS-007: should match projects list baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/projects');
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'projects-list',
      });
    });

    test('VIS-008: should match project detail baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/projects');
      await page.waitForLoadState('networkidle');
      
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'project-detail',
      });
    });
  });

  test.describe('Contracts', () => {
    test('VIS-009: should match contracts list baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/contracts');
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'contracts-list',
      });
    });

    test('VIS-010: should match contract detail baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/contracts');
      await page.waitForLoadState('networkidle');
      
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'contract-detail',
      });
    });
  });

  test.describe('Requests', () => {
    test('VIS-011: should match requests list baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/requests');
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'requests-list',
      });
    });

    test('VIS-012: should match request detail baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/requests');
      await page.waitForLoadState('networkidle');
      
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      await page.waitForLoadState('networkidle');
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'request-detail',
      });
    });
  });
});

// ============================================================================
// Component Tests
// ============================================================================

test.describe('Components', () => {
  test.describe('Navigation', () => {
    test('VIS-013: should match sidebar baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await componentSnapshot(page, testInfo, '[data-testid="sidebar"], aside, nav', {
        ...COMMON_OPTIONS,
        name: 'sidebar',
      });
    });

    test('VIS-014: should match header baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await componentSnapshot(page, testInfo, 'header, [data-testid="header"]', {
        ...COMMON_OPTIONS,
        name: 'header',
      });
    });
  });

  test.describe('Forms', () => {
    test('VIS-015: should match login form baseline', async ({ page }, testInfo) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await componentSnapshot(page, testInfo, 'form, [data-testid="login-form"]', {
        ...COMMON_OPTIONS,
        name: 'login-form',
      });
    });

    test('VIS-016: should match create resource form', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/resources');
      await page.locator('button:has-text("New Resource"), button:has-text("Create")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      await componentSnapshot(page, testInfo, '[role="dialog"], [data-testid="resource-form"]', {
        ...COMMON_OPTIONS,
        name: 'create-resource-form',
      });
    });
  });

  test.describe('Tables', () => {
    test('VIS-017: should match data table baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/resources');
      await page.waitForLoadState('networkidle');
      
      await componentSnapshot(page, testInfo, 'table, [data-testid="data-table"]', {
        ...COMMON_OPTIONS,
        name: 'data-table',
      });
    });

    test('VIS-018: should match table pagination', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/resources');
      await page.waitForLoadState('networkidle');
      
      const pagination = page.locator('[data-testid="pagination"], nav:has(button:has-text("Next"))');
      if (await pagination.isVisible()) {
        await componentSnapshot(page, testInfo, '[data-testid="pagination"]', {
          ...COMMON_OPTIONS,
          name: 'table-pagination',
        });
      }
    });
  });

  test.describe('Cards', () => {
    test('VIS-019: should match stat card baseline', async ({ appPage, page }, testInfo) => {
      await appPage.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const statCard = page.locator('[data-testid="stat-card"], [data-testid="kpi-card"]').first();
      if (await statCard.isVisible()) {
        await componentSnapshot(page, testInfo, '[data-testid="stat-card"]', {
          ...COMMON_OPTIONS,
          name: 'stat-card',
        });
      }
    });
  });
});

// ============================================================================
// Interactive State Tests
// ============================================================================

test.describe('Interactive States', () => {
  test('VIS-020: should match button states', async ({ appPage, page }, testInfo) => {
    await appPage.goto('/resources');
    await page.waitForLoadState('networkidle');
    
    const button = page.locator('button:has-text("New Resource"), button:has-text("Create")').first();
    if (await button.isVisible()) {
      await stateSnapshots(page, testInfo, 'button:has-text("New Resource"), button:has-text("Create")', {
        ...COMMON_OPTIONS,
        name: 'create-button',
      });
    }
  });

  test('VIS-021: should match input field states', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await stateSnapshots(page, testInfo, 'input[type="email"], input[name="email"]', {
        ...COMMON_OPTIONS,
        name: 'email-input',
      });
    }
  });

  test('VIS-022: should match dropdown states', async ({ appPage, page }, testInfo) => {
    await appPage.goto('/resources');
    await page.waitForLoadState('networkidle');
    
    const dropdown = page.locator('select, [data-testid="dropdown"], [role="combobox"]').first();
    if (await dropdown.isVisible()) {
      // Default state
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        selector: 'select, [data-testid="dropdown"], [role="combobox"]',
        name: 'dropdown-closed',
      });
      
      // Open dropdown
      await dropdown.click();
      await page.waitForTimeout(200);
      
      await visualSnapshot(page, testInfo, {
        ...COMMON_OPTIONS,
        name: 'dropdown-open',
      });
    }
  });
});

// ============================================================================
// Theme Tests
// ============================================================================

test.describe('Theme Variations', () => {
  test('VIS-023: should match dashboard in light/dark themes', async ({ appPage, page }, testInfo) => {
    await appPage.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await themeSnapshots(page, testInfo, {
      ...COMMON_OPTIONS,
      name: 'dashboard',
    });
  });

  test('VIS-024: should match login page in light/dark themes', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await themeSnapshots(page, testInfo, {
      ...COMMON_OPTIONS,
      name: 'login',
    });
  });
});

// ============================================================================
// Modal & Dialog Tests
// ============================================================================

test.describe('Modals & Dialogs', () => {
  test('VIS-025: should match confirmation dialog', async ({ appPage, page }, testInfo) => {
    await appPage.goto('/resources');
    await page.waitForLoadState('networkidle');
    
    // Open a dialog (e.g., delete confirmation)
    const deleteBtn = page.locator('button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForSelector('[role="dialog"]');
      
      await componentSnapshot(page, testInfo, '[role="dialog"]', {
        ...COMMON_OPTIONS,
        name: 'confirmation-dialog',
      });
    }
  });

  test('VIS-026: should match notification toast', async ({ appPage, page }, testInfo) => {
    await appPage.goto('/resources');
    
    // Trigger a toast notification
    await page.locator('button:has-text("New Resource")').first().click();
    await page.waitForSelector('[role="dialog"], form');
    await page.locator('button[type="submit"]').click();
    
    // Wait for toast
    const toast = page.locator('[data-testid="toast"], [role="alert"]').first();
    if (await toast.isVisible({ timeout: 5000 })) {
      await componentSnapshot(page, testInfo, '[data-testid="toast"], [role="alert"]', {
        ...COMMON_OPTIONS,
        name: 'notification-toast',
      });
    }
  });
});

// ============================================================================
// Empty States
// ============================================================================

test.describe('Empty States', () => {
  test('VIS-027: should match empty list state', async ({ appPage, page }, testInfo) => {
    // Navigate to a potentially empty list
    await appPage.goto('/resources?status=ARCHIVED');
    await page.waitForLoadState('networkidle');
    
    const emptyState = page.locator('[data-testid="empty-state"], text=/no .* found/i').first();
    if (await emptyState.isVisible()) {
      await componentSnapshot(page, testInfo, '[data-testid="empty-state"]', {
        ...COMMON_OPTIONS,
        name: 'empty-list-state',
      });
    }
  });

  test('VIS-028: should match no search results state', async ({ appPage, page }, testInfo) => {
    await appPage.goto('/resources');
    await page.waitForLoadState('networkidle');
    
    // Search for something that doesn't exist
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('xyznonexistent12345');
      await page.waitForTimeout(500);
      
      const noResults = page.locator('text=/no .* found|no results/i').first();
      if (await noResults.isVisible()) {
        await visualSnapshot(page, testInfo, {
          ...COMMON_OPTIONS,
          name: 'no-search-results',
        });
      }
    }
  });
});

// ============================================================================
// Error States
// ============================================================================

test.describe('Error States', () => {
  test('VIS-029: should match 404 page', async ({ page }, testInfo) => {
    await page.goto('/non-existent-page-xyz');
    await page.waitForLoadState('networkidle');
    
    await visualSnapshot(page, testInfo, {
      ...COMMON_OPTIONS,
      name: '404-page',
    });
  });

  test('VIS-030: should match form validation errors', async ({ page }, testInfo) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Submit empty form
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(300);
    
    await visualSnapshot(page, testInfo, {
      ...COMMON_OPTIONS,
      name: 'form-validation-errors',
    });
  });
});

// ============================================================================
// Loading States
// ============================================================================

test.describe('Loading States', () => {
  test('VIS-031: should match skeleton loading', async ({ page }, testInfo) => {
    // Slow down network to capture loading state
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    
    await page.goto('/dashboard');
    
    // Capture loading state
    const skeleton = page.locator('[data-testid="skeleton"], [class*="skeleton"]').first();
    if (await skeleton.isVisible({ timeout: 2000 })) {
      await componentSnapshot(page, testInfo, '[data-testid="skeleton"], [class*="skeleton"]', {
        name: 'skeleton-loading',
      });
    }
  });
});
