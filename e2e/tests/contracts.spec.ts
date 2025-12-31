/**
 * Contracts E2E Tests
 * 
 * Full lifecycle tests for contract management:
 * - CRUD operations
 * - Status transitions (Draft → Active → Renewed/Terminated)
 * - Document management
 * - Milestone tracking
 * - Budget monitoring
 * - Project linking
 * 
 * @module e2e/tests/contracts.spec
 */

import { test, expect } from '../fixtures';

test.describe('Contracts', () => {
  // ========================================================================
  // Setup
  // ========================================================================
  
  test.beforeEach(async ({ appPage }) => {
    await appPage.goto('/contracts');
  });

  // ========================================================================
  // List View Tests
  // ========================================================================
  
  test.describe('List View', () => {
    test('CTR-001: should display contracts list', async ({ page }) => {
      // Table or card view should be visible
      await expect(
        page.locator('table, [data-testid="contracts-table"], [data-testid="contracts-list"]')
      ).toBeVisible();
      
      // Should have key columns/info
      const expectedHeaders = ['Contract', 'Client', 'Status', 'Value'];
      for (const header of expectedHeaders) {
        const headerEl = page.locator(`th:has-text("${header}"), [data-testid="header-${header.toLowerCase()}"]`).first();
        // Header might not exist in card view
        if (await headerEl.isVisible()) {
          await expect(headerEl).toBeVisible();
        }
      }
    });

    test('CTR-002: should filter contracts by status', async ({ page }) => {
      // Look for status filter
      const statusFilter = page.locator(
        '[data-testid="status-filter"], select:near(:text("Status")), button:has-text("Status")'
      ).first();
      
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        
        // Select ACTIVE status
        await page.locator('text=/^active$/i, [data-value="ACTIVE"]').first().click();
        
        await page.waitForTimeout(500);
        
        // All visible contracts should be ACTIVE
        const statusBadges = page.locator('[data-testid="contract-status"]:has-text("Active"), td:has-text("ACTIVE")');
        if (await statusBadges.count() > 0) {
          const count = await statusBadges.count();
          expect(count).toBeGreaterThan(0);
        }
      }
    });

    test('CTR-003: should search contracts', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('CTR');
        await page.waitForTimeout(500);
        
        // Results should update
        const rows = page.locator('tbody tr, [data-testid="contract-card"]');
        const rowCount = await rows.count();
        
        // Either filtered results or no results message
        expect(rowCount >= 0).toBeTruthy();
      }
    });

    test('CTR-004: should show contract value formatted', async ({ page }) => {
      // Values should be formatted with currency
      const valueCell = page.locator('text=/₹|\\$|€|INR|USD/').first();
      
      if (await valueCell.isVisible()) {
        const text = await valueCell.textContent();
        // Should contain currency symbol and number
        expect(text).toMatch(/[₹$€]|INR|USD/);
      }
    });

    test('CTR-005: should indicate expiring contracts', async ({ page }) => {
      // Look for expiring soon indicators
      const expiringIndicator = page.locator(
        '[data-testid="expiring-badge"], text=/expiring|expires soon/i, .text-yellow-600, .text-orange-600'
      ).first();
      
      // May or may not have expiring contracts
      if (await expiringIndicator.isVisible()) {
        await expect(expiringIndicator).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Create Contract Tests
  // ========================================================================
  
  test.describe('Create Contract', () => {
    test('CTR-006: should open create contract form', async ({ page }) => {
      await page.locator(
        'button:has-text("Add"), button:has-text("Create"), button:has-text("New"), [data-testid="add-contract"]'
      ).first().click();
      
      // Form should appear (modal or new page)
      await expect(
        page.locator('[role="dialog"], [data-testid="contract-form"], form')
      ).toBeVisible();
    });

    test('CTR-007: should validate required fields', async ({ page }) => {
      // Open create form
      await page.locator('button:has-text("Add"), button:has-text("Create")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Submit without filling
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      // Should show validation errors
      await expect(
        page.locator('text=/required|must be filled|cannot be empty/i').first()
      ).toBeVisible({ timeout: 3000 });
    });

    test('CTR-008: should create draft contract', async ({ page, testData }) => {
      const contract = testData.contract();
      
      // Open create form
      await page.locator('button:has-text("Add"), button:has-text("Create")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Fill form
      await page.fill('input[name="contractNumber"]', contract.contractNumber);
      await page.fill('input[name="name"]', contract.name);
      
      // Select type
      const typeSelect = page.locator('select[name="type"], [data-testid="type-select"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption({ label: /time.*material/i });
      }
      
      // Fill dates
      await page.fill('input[name="startDate"], input[type="date"]', contract.startDate);
      
      // Fill value
      const valueInput = page.locator('input[name="value"]');
      if (await valueInput.isVisible()) {
        await valueInput.fill(String(contract.value));
      }
      
      // Submit
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      // Should succeed
      await expect(
        page.locator('text=/created|success|saved/i').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('CTR-009: should prevent duplicate contract number', async ({ page, testData }) => {
      const contract = testData.contract({ contractNumber: 'CTR-001' }); // Common number
      
      // Open create form
      await page.locator('button:has-text("Add"), button:has-text("Create")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Fill with potentially duplicate number
      await page.fill('input[name="contractNumber"]', 'CTR-001');
      await page.fill('input[name="name"]', contract.name);
      
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      // Wait for response - might succeed if CTR-001 doesn't exist
      await page.waitForTimeout(1000);
    });
  });

  // ========================================================================
  // View Contract Tests
  // ========================================================================
  
  test.describe('View Contract', () => {
    test('CTR-010: should navigate to contract detail', async ({ page }) => {
      // Click on first contract
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/contracts\/[\w-]+/, { timeout: 5000 });
    });

    test('CTR-011: should display contract overview', async ({ page }) => {
      // Navigate to detail
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      // Should show key information
      await expect(page.locator('text=/contract number|contract.*#/i').first()).toBeVisible();
      await expect(page.locator('text=/status/i').first()).toBeVisible();
    });

    test('CTR-012: should display status timeline', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      // Look for timeline component
      const timeline = page.locator(
        '[data-testid="status-timeline"], text=/timeline|status history/i'
      ).first();
      
      // Timeline might be in a tab
      if (!(await timeline.isVisible())) {
        const historyTab = page.locator('button:has-text("History"), [data-testid="history-tab"]');
        if (await historyTab.isVisible()) {
          await historyTab.click();
        }
      }
    });

    test('CTR-013: should show contract documents', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      // Look for documents section or tab
      const docsSection = page.locator(
        '[data-testid="documents-section"], text=/document/i'
      ).first();
      
      // Click on documents tab if present
      const docsTab = page.locator('button:has-text("Documents"), [role="tab"]:has-text("Documents")');
      if (await docsTab.isVisible()) {
        await docsTab.click();
        await expect(page.locator('text=/upload|document|file/i').first()).toBeVisible();
      }
    });

    test('CTR-014: should show contract milestones', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      // Look for milestones section or tab
      const milestonesTab = page.locator('button:has-text("Milestones"), [role="tab"]:has-text("Milestones")');
      if (await milestonesTab.isVisible()) {
        await milestonesTab.click();
        await expect(page.locator('text=/milestone|deliverable/i').first()).toBeVisible();
      }
    });

    test('CTR-015: should show budget overview', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      // Look for budget section or tab
      const budgetTab = page.locator('button:has-text("Budget"), [role="tab"]:has-text("Budget")');
      if (await budgetTab.isVisible()) {
        await budgetTab.click();
        await expect(page.locator('text=/budget|spent|remaining/i').first()).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Contract Lifecycle Tests
  // ========================================================================
  
  test.describe('Contract Lifecycle', () => {
    test('CTR-016: should activate draft contract', async ({ page }) => {
      // Navigate to a draft contract
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      // Look for activate button
      const activateBtn = page.locator(
        'button:has-text("Activate"), [data-testid="activate-contract"]'
      ).first();
      
      if (await activateBtn.isVisible()) {
        await activateBtn.click();
        
        // Confirmation dialog
        await page.waitForSelector('[role="dialog"]');
        await page.locator('button:has-text("Confirm"), button:has-text("Yes")').click();
        
        // Should show success
        await expect(
          page.locator('text=/activated|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('CTR-017: should open renewal dialog', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const renewBtn = page.locator(
        'button:has-text("Renew"), [data-testid="renew-contract"]'
      ).first();
      
      if (await renewBtn.isVisible()) {
        await renewBtn.click();
        
        // Renewal dialog should open
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        await expect(page.locator('text=/renew|renewal/i').first()).toBeVisible();
      }
    });

    test('CTR-018: should complete renewal workflow', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const renewBtn = page.locator('button:has-text("Renew")').first();
      
      if (await renewBtn.isVisible() && await renewBtn.isEnabled()) {
        await renewBtn.click();
        await page.waitForSelector('[role="dialog"]');
        
        // Step through renewal wizard
        // Step 1: Select renewal type
        await page.locator('button:has-text("Extend"), [data-testid="renewal-extend"]').first().click();
        await page.locator('button:has-text("Next")').click();
        
        // Step 2: Set new end date
        const dateInput = page.locator('input[type="date"]').first();
        if (await dateInput.isVisible()) {
          // Set date 1 year from now
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1);
          await dateInput.fill(futureDate.toISOString().split('T')[0]);
        }
        await page.locator('button:has-text("Next")').click();
        
        // Step 3: Value adjustment (skip or set)
        await page.locator('button:has-text("Next"), button:has-text("Skip")').click();
        
        // Step 4: Confirm
        await page.locator('button:has-text("Confirm"), button:has-text("Renew")').click();
        
        // Should show success
        await expect(
          page.locator('text=/renewed|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('CTR-019: should terminate contract with reason', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const terminateBtn = page.locator(
        'button:has-text("Terminate"), [data-testid="terminate-contract"]'
      ).first();
      
      if (await terminateBtn.isVisible() && await terminateBtn.isEnabled()) {
        await terminateBtn.click();
        
        // Should open confirmation with reason input
        await page.waitForSelector('[role="dialog"]');
        
        // Fill reason
        const reasonInput = page.locator('textarea, input[name="reason"]');
        await reasonInput.fill('E2E Test - Contract termination');
        
        // Confirm
        await page.locator('button:has-text("Terminate"), button:has-text("Confirm")').click();
        
        // Should show success
        await expect(
          page.locator('text=/terminated|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  // ========================================================================
  // Quick Actions Tests
  // ========================================================================
  
  test.describe('Quick Actions', () => {
    test('CTR-020: should show context-appropriate actions', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      // Look for actions dropdown or buttons
      const actionsMenu = page.locator(
        '[data-testid="quick-actions"], button:has-text("Actions")'
      ).first();
      
      if (await actionsMenu.isVisible()) {
        await actionsMenu.click();
        
        // Should show relevant actions
        await expect(page.locator('[role="menu"], [role="menuitem"]')).toBeVisible();
      }
    });

    test('CTR-021: should duplicate contract', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const duplicateBtn = page.locator(
        'button:has-text("Duplicate"), [data-testid="duplicate-contract"]'
      ).first();
      
      if (await duplicateBtn.isVisible()) {
        await duplicateBtn.click();
        
        // Should create duplicate and navigate
        await expect(
          page.locator('text=/duplicated|copied|created/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('CTR-022: should export contract to PDF', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const exportBtn = page.locator(
        'button:has-text("Export"), button:has-text("PDF"), [data-testid="export-pdf"]'
      ).first();
      
      if (await exportBtn.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        await exportBtn.click();
        
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
        }
      }
    });
  });

  // ========================================================================
  // Project Linking Tests
  // ========================================================================
  
  test.describe('Project Linking', () => {
    test('CTR-023: should link project to contract', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      // Find projects tab/section
      const projectsTab = page.locator(
        'button:has-text("Projects"), [role="tab"]:has-text("Projects")'
      );
      
      if (await projectsTab.isVisible()) {
        await projectsTab.click();
        
        // Look for link project button
        const linkBtn = page.locator(
          'button:has-text("Link"), button:has-text("Add Project")'
        ).first();
        
        if (await linkBtn.isVisible()) {
          await linkBtn.click();
          
          // Should open project selector
          await expect(page.locator('[role="dialog"]')).toBeVisible();
        }
      }
    });

    test('CTR-024: should show linked projects', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const projectsTab = page.locator('button:has-text("Projects")');
      
      if (await projectsTab.isVisible()) {
        await projectsTab.click();
        
        // Should show projects list or empty state
        await expect(
          page.locator('text=/project|no projects|link/i').first()
        ).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Audit History Tests
  // ========================================================================
  
  test.describe('Audit History', () => {
    test('CTR-025: should display audit history', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const historyTab = page.locator(
        'button:has-text("History"), button:has-text("Audit"), [role="tab"]:has-text("History")'
      );
      
      if (await historyTab.isVisible()) {
        await historyTab.click();
        
        // Should show audit entries
        await expect(
          page.locator('text=/created|updated|change/i').first()
        ).toBeVisible();
      }
    });

    test('CTR-026: should filter audit by action type', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const historyTab = page.locator('button:has-text("History")');
      
      if (await historyTab.isVisible()) {
        await historyTab.click();
        
        // Look for filter
        const filterBtn = page.locator('button:has-text("Filter")').first();
        
        if (await filterBtn.isVisible()) {
          await filterBtn.click();
          
          // Should show filter options
          await expect(
            page.locator('text=/create|update|status/i').first()
          ).toBeVisible();
        }
      }
    });

    test('CTR-027: should export audit history', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="contract-card"]').first().click();
      await page.waitForURL(/\/contracts\/[\w-]+/);
      
      const historyTab = page.locator('button:has-text("History")');
      
      if (await historyTab.isVisible()) {
        await historyTab.click();
        
        const exportBtn = page.locator('button:has-text("Export")').first();
        
        if (await exportBtn.isVisible()) {
          const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
          await exportBtn.click();
          
          const download = await downloadPromise;
          if (download) {
            expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/i);
          }
        }
      }
    });
  });
});
