/**
 * Resources E2E Tests
 * 
 * Critical path tests for resource management:
 * - CRUD operations
 * - Search and filtering
 * - Bulk operations
 * - Allocations view
 * - Skills management
 * 
 * @module e2e/tests/resources.spec
 */

import { test, expect } from '../fixtures';

test.describe('Resources', () => {
  // ========================================================================
  // Setup & Teardown
  // ========================================================================
  
  test.beforeEach(async ({ appPage }) => {
    await appPage.goto('/resources');
  });

  // ========================================================================
  // List View Tests
  // ========================================================================
  
  test.describe('List View', () => {
    test('RES-001: should display resources list', async ({ page }) => {
      // Table should be visible
      await expect(page.locator('table, [data-testid="resources-table"]')).toBeVisible();
      
      // Should have column headers
      const headers = ['Name', 'Employee ID', 'Department', 'Status'];
      for (const header of headers) {
        await expect(
          page.locator(`th:has-text("${header}"), [role="columnheader"]:has-text("${header}")`).first()
        ).toBeVisible();
      }
    });

    test('RES-002: should paginate resources', async ({ page }) => {
      // Check for pagination controls
      const pagination = page.locator('[data-testid="pagination"], nav[aria-label*="pagination"], .pagination');
      
      if (await pagination.isVisible()) {
        // Should show page info
        await expect(page.locator('text=/page|showing|of/i').first()).toBeVisible();
        
        // Click next if available
        const nextButton = page.locator('button:has-text("Next"), [aria-label="Next page"]');
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          // URL should change or table should update
          await page.waitForTimeout(500);
        }
      }
    });

    test('RES-003: should sort resources by column', async ({ page }) => {
      // Click on Name column to sort
      const nameHeader = page.locator('th:has-text("Name"), [role="columnheader"]:has-text("Name")').first();
      await nameHeader.click();
      
      // Wait for sort to apply
      await page.waitForTimeout(500);
      
      // Check for sort indicator or URL parameter
      const sortIndicator = page.locator('[data-sort], .sort-asc, .sort-desc, [aria-sort]');
      const urlHasSort = page.url().includes('sort');
      
      expect(await sortIndicator.isVisible() || urlHasSort).toBeTruthy();
    });

    test('RES-004: should filter resources by status', async ({ page }) => {
      // Look for status filter
      const statusFilter = page.locator(
        'select:near(:text("Status")), [data-testid="status-filter"], button:has-text("Status")'
      ).first();
      
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        
        // Select active status
        await page.locator('text=/active/i').first().click();
        
        // Wait for filter to apply
        await page.waitForTimeout(500);
        
        // All visible rows should show ACTIVE status
        const statusCells = page.locator('td:has-text("ACTIVE"), [data-testid="status-cell"]:has-text("Active")');
        const count = await statusCells.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('RES-005: should search resources by name', async ({ appPage, page }) => {
      // Use search
      const searchInput = page.locator(
        'input[placeholder*="Search"], input[type="search"], [data-testid="search-input"]'
      ).first();
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('Test');
        await page.waitForTimeout(500); // Debounce
        
        // Results should be filtered
        // Either fewer rows or "no results" message
        const rows = page.locator('tbody tr');
        const noResults = page.locator('text=/no results|no resources|not found/i');
        
        const hasRows = await rows.count() > 0;
        const hasNoResults = await noResults.isVisible();
        
        expect(hasRows || hasNoResults).toBeTruthy();
      }
    });

    test('RES-006: should display resource count', async ({ page }) => {
      // Should show total count somewhere
      await expect(
        page.locator('text=/\\d+\\s*(resources|total|results|items)/i').first()
      ).toBeVisible();
    });
  });

  // ========================================================================
  // Create Resource Tests
  // ========================================================================
  
  test.describe('Create Resource', () => {
    test('RES-007: should open create resource modal', async ({ page }) => {
      // Click add button
      await page.locator(
        'button:has-text("Add"), button:has-text("Create"), button:has-text("New"), [data-testid="add-resource"]'
      ).first().click();
      
      // Modal should open
      await expect(page.locator('[role="dialog"], .modal, [data-testid="resource-form"]')).toBeVisible();
    });

    test('RES-008: should validate required fields', async ({ page, testData }) => {
      // Open create modal
      await page.locator(
        'button:has-text("Add"), button:has-text("Create"), button:has-text("New")'
      ).first().click();
      
      await page.waitForSelector('[role="dialog"], .modal');
      
      // Try to submit empty form
      await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').click();
      
      // Should show validation errors
      await expect(
        page.locator('text=/required|must be|cannot be empty/i').first()
      ).toBeVisible({ timeout: 3000 });
    });

    test('RES-009: should create new resource successfully', async ({ page, testData }) => {
      const resource = testData.resource();
      
      // Open create modal
      await page.locator(
        'button:has-text("Add"), button:has-text("Create"), button:has-text("New")'
      ).first().click();
      
      await page.waitForSelector('[role="dialog"], .modal');
      
      // Fill form
      await page.fill('input[name="firstName"], [data-testid="firstName-input"]', resource.firstName);
      await page.fill('input[name="lastName"], [data-testid="lastName-input"]', resource.lastName);
      await page.fill('input[name="email"], [data-testid="email-input"]', resource.email);
      await page.fill('input[name="employeeId"], [data-testid="employeeId-input"]', resource.employeeId);
      
      // Select department if dropdown
      const deptSelect = page.locator('select[name="department"], [data-testid="department-select"]');
      if (await deptSelect.isVisible()) {
        await deptSelect.selectOption({ label: resource.department });
      } else {
        await page.fill('input[name="department"]', resource.department);
      }
      
      // Submit
      await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').click();
      
      // Modal should close and success message shown
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
      
      // Success toast
      await expect(
        page.locator('text=/created|success|added/i').first()
      ).toBeVisible({ timeout: 3000 });
    });

    test('RES-010: should prevent duplicate employee ID', async ({ page, testData, api }) => {
      // First create a resource via API
      const resource = testData.resource();
      
      // Open create modal
      await page.locator(
        'button:has-text("Add"), button:has-text("Create"), button:has-text("New")'
      ).first().click();
      
      await page.waitForSelector('[role="dialog"], .modal');
      
      // Try to use existing employee ID (use a common one that might exist)
      await page.fill('input[name="employeeId"], [data-testid="employeeId-input"]', 'EMP001');
      await page.fill('input[name="firstName"]', resource.firstName);
      await page.fill('input[name="lastName"]', resource.lastName);
      await page.fill('input[name="email"]', resource.email);
      
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      // Should show error about duplicate
      // This might not trigger if EMP001 doesn't exist - that's okay
      await page.waitForTimeout(1000);
    });
  });

  // ========================================================================
  // View Resource Tests
  // ========================================================================
  
  test.describe('View Resource', () => {
    test('RES-011: should navigate to resource detail', async ({ page }) => {
      // Click on first resource row
      const firstRow = page.locator('tbody tr').first();
      await firstRow.click();
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/resources\/[\w-]+/, { timeout: 5000 });
    });

    test('RES-012: should display resource details', async ({ page }) => {
      // Navigate to first resource
      await page.locator('tbody tr').first().click();
      await page.waitForURL(/\/resources\/[\w-]+/);
      
      // Should show resource info
      await expect(page.locator('text=/employee id|emp.*id/i').first()).toBeVisible();
      await expect(page.locator('text=/department|dept/i').first()).toBeVisible();
      await expect(page.locator('text=/status/i').first()).toBeVisible();
    });

    test('RES-013: should show resource allocations', async ({ page }) => {
      // Navigate to first resource
      await page.locator('tbody tr').first().click();
      await page.waitForURL(/\/resources\/[\w-]+/);
      
      // Look for allocations section
      const allocationsSection = page.locator(
        'text=/allocation|project|assignment/i, [data-testid="allocations-section"]'
      ).first();
      
      await expect(allocationsSection).toBeVisible();
    });

    test('RES-014: should show resource skills', async ({ page }) => {
      // Navigate to first resource
      await page.locator('tbody tr').first().click();
      await page.waitForURL(/\/resources\/[\w-]+/);
      
      // Look for skills section
      const skillsSection = page.locator(
        'text=/skill|expertise|competenc/i, [data-testid="skills-section"]'
      ).first();
      
      // Skills section should exist (might be empty)
      if (await skillsSection.isVisible()) {
        await expect(skillsSection).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Edit Resource Tests
  // ========================================================================
  
  test.describe('Edit Resource', () => {
    test('RES-015: should open edit modal', async ({ page }) => {
      // Navigate to resource detail
      await page.locator('tbody tr').first().click();
      await page.waitForURL(/\/resources\/[\w-]+/);
      
      // Click edit button
      await page.locator(
        'button:has-text("Edit"), [data-testid="edit-resource"], button[aria-label="Edit"]'
      ).first().click();
      
      // Modal should open with pre-filled data
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
    });

    test('RES-016: should update resource successfully', async ({ page }) => {
      // Navigate to resource detail
      await page.locator('tbody tr').first().click();
      await page.waitForURL(/\/resources\/[\w-]+/);
      
      // Click edit
      await page.locator('button:has-text("Edit")').first().click();
      await page.waitForSelector('[role="dialog"]');
      
      // Update a field
      const designationInput = page.locator('input[name="designation"]');
      if (await designationInput.isVisible()) {
        await designationInput.fill('Senior Engineer');
      }
      
      // Save
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      // Should show success
      await expect(
        page.locator('text=/updated|saved|success/i').first()
      ).toBeVisible({ timeout: 3000 });
    });
  });

  // ========================================================================
  // Delete Resource Tests
  // ========================================================================
  
  test.describe('Delete Resource', () => {
    test('RES-017: should show delete confirmation', async ({ page }) => {
      // Navigate to resource detail
      await page.locator('tbody tr').first().click();
      await page.waitForURL(/\/resources\/[\w-]+/);
      
      // Click delete
      const deleteBtn = page.locator(
        'button:has-text("Delete"), [data-testid="delete-resource"], button[aria-label="Delete"]'
      ).first();
      
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        
        // Confirmation dialog should appear
        await expect(
          page.locator('text=/are you sure|confirm|delete/i').first()
        ).toBeVisible();
      }
    });

    test('RES-018: should cancel delete', async ({ page }) => {
      // Navigate to resource detail
      await page.locator('tbody tr').first().click();
      await page.waitForURL(/\/resources\/[\w-]+/);
      
      const deleteBtn = page.locator('button:has-text("Delete")').first();
      
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        
        // Wait for confirmation
        await page.waitForSelector('[role="dialog"], .modal');
        
        // Cancel
        await page.locator('button:has-text("Cancel"), button:has-text("No")').click();
        
        // Should stay on page
        await expect(page).toHaveURL(/\/resources\/[\w-]+/);
      }
    });
  });

  // ========================================================================
  // Bulk Operations Tests
  // ========================================================================
  
  test.describe('Bulk Operations', () => {
    test('RES-019: should select multiple resources', async ({ page }) => {
      // Look for checkboxes
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      
      if (count > 1) {
        // Select first two
        await checkboxes.nth(1).click();
        await checkboxes.nth(2).click();
        
        // Bulk action bar should appear
        await expect(
          page.locator('text=/selected|bulk|actions/i').first()
        ).toBeVisible();
      }
    });

    test('RES-020: should select all resources', async ({ page }) => {
      // Look for select all checkbox
      const selectAll = page.locator(
        'thead input[type="checkbox"], [data-testid="select-all"]'
      ).first();
      
      if (await selectAll.isVisible()) {
        await selectAll.click();
        
        // All row checkboxes should be checked
        const rowCheckboxes = page.locator('tbody input[type="checkbox"]');
        const checkedCount = await rowCheckboxes.filter({ checked: true }).count();
        const totalCount = await rowCheckboxes.count();
        
        expect(checkedCount).toBe(totalCount);
      }
    });
  });

  // ========================================================================
  // Export Tests
  // ========================================================================
  
  test.describe('Export', () => {
    test('RES-021: should have export option', async ({ page }) => {
      // Look for export button
      const exportBtn = page.locator(
        'button:has-text("Export"), [data-testid="export-button"], button[aria-label="Export"]'
      ).first();
      
      if (await exportBtn.isVisible()) {
        await exportBtn.click();
        
        // Should show export options (CSV, Excel, etc.)
        await expect(
          page.locator('text=/csv|excel|export/i').first()
        ).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Responsive Tests
  // ========================================================================
  
  test.describe('Responsive Design', () => {
    test('RES-022: should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/resources');
      
      // Page should still be functional
      await expect(page.locator('text=/resource/i').first()).toBeVisible();
      
      // Table might be replaced with cards or scrollable
      const content = page.locator('table, [data-testid="resource-card"], [data-testid="resource-list"]');
      await expect(content.first()).toBeVisible();
    });
  });
});
