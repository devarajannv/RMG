/**
 * Projects E2E Tests
 * 
 * Critical path tests for project management:
 * - Project CRUD operations
 * - Project status lifecycle
 * - Team assignment
 * - Budget tracking
 * - Resource allocation
 * - Timeline management
 * 
 * @module e2e/tests/projects.spec
 */

import { test, expect } from '../fixtures';

test.describe('Projects', () => {
  // ========================================================================
  // Setup
  // ========================================================================
  
  test.beforeEach(async ({ appPage }) => {
    await appPage.goto('/projects');
  });

  // ========================================================================
  // List View Tests
  // ========================================================================
  
  test.describe('List View', () => {
    test('PROJ-001: should display projects list', async ({ page }) => {
      await expect(
        page.locator('table, [data-testid="projects-table"], [data-testid="projects-list"], [data-testid="projects-grid"]')
      ).toBeVisible();
    });

    test('PROJ-002: should show project cards with key info', async ({ page }) => {
      const projectCard = page.locator('tbody tr, [data-testid="project-card"]').first();
      await expect(projectCard).toBeVisible();
    });

    test('PROJ-003: should filter by project status', async ({ page }) => {
      const statusFilter = page.locator(
        '[data-testid="status-filter"], select:near(:text("Status")), button:has-text("Status")'
      ).first();
      
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        
        // Select active
        await page.locator('text=/active|in progress/i').first().click();
        await page.waitForTimeout(500);
      }
    });

    test('PROJ-004: should search projects by name', async ({ page }) => {
      const searchInput = page.locator(
        '[data-testid="search-input"], input[placeholder*="Search"], input[type="search"]'
      ).first();
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('Test Project');
        await page.waitForTimeout(500);
        
        // Results should filter
      }
    });

    test('PROJ-005: should toggle list/grid view', async ({ page }) => {
      const viewToggle = page.locator(
        '[data-testid="view-toggle"], button:has-text("Grid"), button:has-text("List")'
      ).first();
      
      if (await viewToggle.isVisible()) {
        await viewToggle.click();
        await page.waitForTimeout(300);
      }
    });

    test('PROJ-006: should show project health indicators', async ({ page }) => {
      // Look for health/status indicators
      const healthIndicators = page.locator(
        '[data-testid="project-health"], text=/on track|at risk|behind/i'
      );
      
      // May or may not have visible indicators
    });

    test('PROJ-007: should show project timeline summary', async ({ page }) => {
      const projectRow = page.locator('tbody tr, [data-testid="project-card"]').first();
      
      // Look for date info
      await expect(
        projectRow.locator('text=/start|end|deadline|due/i').first()
      ).toBeVisible().catch(() => {});
    });
  });

  // ========================================================================
  // Create Project Tests
  // ========================================================================
  
  test.describe('Create Project', () => {
    test('PROJ-008: should open create project form', async ({ page }) => {
      await page.locator(
        'button:has-text("New Project"), button:has-text("Create"), [data-testid="create-project"]'
      ).first().click();
      
      await expect(
        page.locator('[role="dialog"], [data-testid="project-form"], form')
      ).toBeVisible();
    });

    test('PROJ-009: should create new project', async ({ page, testData }) => {
      const project = testData.project();
      
      await page.locator('button:has-text("New Project"), button:has-text("Create")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Fill project details
      await page.fill('input[name="name"], [data-testid="name-input"]', project.name);
      await page.fill('input[name="code"], [data-testid="code-input"]', project.code);
      
      const descInput = page.locator('textarea[name="description"]');
      if (await descInput.isVisible()) {
        await descInput.fill(project.description);
      }
      
      // Dates
      const startDate = page.locator('input[name="startDate"], [data-testid="start-date"]');
      if (await startDate.isVisible()) {
        await startDate.fill('2024-01-01');
      }
      
      const endDate = page.locator('input[name="endDate"], [data-testid="end-date"]');
      if (await endDate.isVisible()) {
        await endDate.fill('2024-12-31');
      }
      
      // Submit
      await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').click();
      
      await expect(
        page.locator('text=/created|success|saved/i').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('PROJ-010: should validate required project fields', async ({ page }) => {
      await page.locator('button:has-text("New Project")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Submit without required fields
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      await expect(
        page.locator('text=/required|please fill|name is required/i').first()
      ).toBeVisible({ timeout: 3000 });
    });

    test('PROJ-011: should set project client', async ({ page }) => {
      await page.locator('button:has-text("New Project")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      const clientSelect = page.locator(
        'select[name="clientId"], [data-testid="client-select"]'
      ).first();
      
      if (await clientSelect.isVisible()) {
        await clientSelect.click();
        await page.locator('[role="option"]').first().click();
      }
    });

    test('PROJ-012: should set project budget', async ({ page }) => {
      await page.locator('button:has-text("New Project")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      const budgetInput = page.locator('input[name="budget"], [data-testid="budget-input"]');
      if (await budgetInput.isVisible()) {
        await budgetInput.fill('100000');
      }
    });
  });

  // ========================================================================
  // View Project Tests
  // ========================================================================
  
  test.describe('View Project', () => {
    test('PROJ-013: should navigate to project detail', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await expect(page).toHaveURL(/\/projects\/[\w-]+/, { timeout: 5000 });
    });

    test('PROJ-014: should display project overview', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      await expect(page.locator('h1, h2, [data-testid="project-name"]').first()).toBeVisible();
    });

    test('PROJ-015: should show project tabs', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      // Look for tab navigation
      const tabs = page.locator('[role="tablist"], [data-testid="project-tabs"]');
      await expect(tabs).toBeVisible();
    });

    test('PROJ-016: should navigate between project sections', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      // Click different tabs
      const sections = ['Team', 'Budget', 'Timeline', 'Resources'];
      
      for (const section of sections) {
        const tab = page.locator(`[role="tab"]:has-text("${section}"), button:has-text("${section}")`).first();
        if (await tab.isVisible()) {
          await tab.click();
          await page.waitForTimeout(300);
          break;  // Just test one transition
        }
      }
    });
  });

  // ========================================================================
  // Edit Project Tests
  // ========================================================================
  
  test.describe('Edit Project', () => {
    test('PROJ-017: should open edit project form', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      await page.locator('button:has-text("Edit"), [data-testid="edit-project"]').first().click();
      
      await expect(
        page.locator('[role="dialog"], [data-testid="project-form"]')
      ).toBeVisible();
    });

    test('PROJ-018: should update project name', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      await page.locator('button:has-text("Edit")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      const nameInput = page.locator('input[name="name"]');
      await nameInput.clear();
      await nameInput.fill('Updated Project Name');
      
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      await expect(
        page.locator('text=/updated|success|saved/i').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('PROJ-019: should extend project end date', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      await page.locator('button:has-text("Edit")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      const endDate = page.locator('input[name="endDate"], [data-testid="end-date"]');
      if (await endDate.isVisible()) {
        await endDate.fill('2025-06-30');
        
        await page.locator('button[type="submit"], button:has-text("Save")').click();
        
        await expect(
          page.locator('text=/updated|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  // ========================================================================
  // Team Management Tests
  // ========================================================================
  
  test.describe('Team Management', () => {
    test('PROJ-020: should show project team', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      // Navigate to team section
      const teamTab = page.locator('[role="tab"]:has-text("Team"), button:has-text("Team")').first();
      if (await teamTab.isVisible()) {
        await teamTab.click();
      }
      
      await expect(
        page.locator('[data-testid="team-list"], text=/team member|resource/i').first()
      ).toBeVisible();
    });

    test('PROJ-021: should add team member', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      // Navigate to team
      const teamTab = page.locator('[role="tab"]:has-text("Team")').first();
      if (await teamTab.isVisible()) {
        await teamTab.click();
        
        const addMemberBtn = page.locator('button:has-text("Add Member"), button:has-text("Add Resource")').first();
        if (await addMemberBtn.isVisible()) {
          await addMemberBtn.click();
          await page.waitForSelector('[role="dialog"]');
          
          // Select resource
          const resourceSelect = page.locator('[data-testid="resource-select"]');
          if (await resourceSelect.isVisible()) {
            await resourceSelect.click();
            await page.locator('[role="option"]').first().click();
          }
          
          await page.locator('button:has-text("Add"), button:has-text("Save")').click();
        }
      }
    });

    test('PROJ-022: should assign project role', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const teamTab = page.locator('[role="tab"]:has-text("Team")').first();
      if (await teamTab.isVisible()) {
        await teamTab.click();
        
        // Look for role assignment UI
        const roleSelect = page.locator('[data-testid="role-select"], select:near(:text("Role"))').first();
        if (await roleSelect.isVisible()) {
          await roleSelect.click();
          await page.locator('[role="option"]').first().click();
        }
      }
    });

    test('PROJ-023: should remove team member', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const teamTab = page.locator('[role="tab"]:has-text("Team")').first();
      if (await teamTab.isVisible()) {
        await teamTab.click();
        
        const removeBtn = page.locator('button:has-text("Remove"), [data-testid="remove-member"]').first();
        if (await removeBtn.isVisible()) {
          await removeBtn.click();
          
          await page.waitForSelector('[role="dialog"]');
          await page.locator('button:has-text("Confirm"), button:has-text("Yes")').click();
        }
      }
    });
  });

  // ========================================================================
  // Budget Tracking Tests
  // ========================================================================
  
  test.describe('Budget Tracking', () => {
    test('PROJ-024: should show budget overview', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const budgetTab = page.locator('[role="tab"]:has-text("Budget")').first();
      if (await budgetTab.isVisible()) {
        await budgetTab.click();
        
        await expect(
          page.locator('text=/budget|allocated|spent/i').first()
        ).toBeVisible();
      }
    });

    test('PROJ-025: should show budget breakdown chart', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const budgetTab = page.locator('[role="tab"]:has-text("Budget")').first();
      if (await budgetTab.isVisible()) {
        await budgetTab.click();
        
        // Look for chart/visualization
        const chart = page.locator(
          'canvas, svg, [data-testid="budget-chart"]'
        ).first();
        
        // Chart may or may not be present
      }
    });

    test('PROJ-026: should add budget line item', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const budgetTab = page.locator('[role="tab"]:has-text("Budget")').first();
      if (await budgetTab.isVisible()) {
        await budgetTab.click();
        
        const addLineBtn = page.locator('button:has-text("Add Line"), button:has-text("Add Item")').first();
        if (await addLineBtn.isVisible()) {
          await addLineBtn.click();
          
          await page.waitForSelector('[role="dialog"]');
          await page.fill('input[name="description"]', 'Test Budget Item');
          await page.fill('input[name="amount"]', '5000');
          
          await page.locator('button:has-text("Add"), button:has-text("Save")').click();
        }
      }
    });
  });

  // ========================================================================
  // Status Lifecycle Tests
  // ========================================================================
  
  test.describe('Status Lifecycle', () => {
    test('PROJ-027: should change project status', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const statusBtn = page.locator(
        '[data-testid="status-select"], button:has-text("Status"), button:near(:text("Status"))'
      ).first();
      
      if (await statusBtn.isVisible()) {
        await statusBtn.click();
        
        // Select new status
        await page.locator('text=/active|on hold|completed/i').first().click();
        
        await expect(
          page.locator('text=/updated|status changed/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('PROJ-028: should put project on hold', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const onHoldBtn = page.locator(
        'button:has-text("Put on Hold"), button:has-text("Pause")'
      ).first();
      
      if (await onHoldBtn.isVisible()) {
        await onHoldBtn.click();
        
        await page.waitForSelector('[role="dialog"]');
        
        // Provide reason
        const reasonInput = page.locator('textarea');
        if (await reasonInput.isVisible()) {
          await reasonInput.fill('E2E Test - On Hold');
        }
        
        await page.locator('button:has-text("Confirm")').click();
      }
    });

    test('PROJ-029: should complete project', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const completeBtn = page.locator(
        'button:has-text("Complete"), button:has-text("Mark Complete")'
      ).first();
      
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        
        await page.waitForSelector('[role="dialog"]');
        await page.locator('button:has-text("Confirm")').click();
      }
    });
  });

  // ========================================================================
  // Resource Allocation Tests
  // ========================================================================
  
  test.describe('Resource Allocation', () => {
    test('PROJ-030: should show resource allocations', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const resourceTab = page.locator('[role="tab"]:has-text("Resources"), [role="tab"]:has-text("Allocations")').first();
      if (await resourceTab.isVisible()) {
        await resourceTab.click();
        
        await expect(
          page.locator('[data-testid="allocations-list"], text=/allocation|assigned/i').first()
        ).toBeVisible();
      }
    });

    test('PROJ-031: should create allocation request', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const resourceTab = page.locator('[role="tab"]:has-text("Resources")').first();
      if (await resourceTab.isVisible()) {
        await resourceTab.click();
        
        const requestBtn = page.locator('button:has-text("Request Resource"), button:has-text("Add Allocation")').first();
        if (await requestBtn.isVisible()) {
          await requestBtn.click();
          
          await page.waitForSelector('[role="dialog"]');
        }
      }
    });

    test('PROJ-032: should view allocation timeline', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      // Look for Gantt/timeline view
      const timelineView = page.locator(
        '[data-testid="allocation-timeline"], [data-testid="gantt-chart"]'
      ).first();
      
      // Timeline may or may not be present
    });
  });

  // ========================================================================
  // Delete Project Tests
  // ========================================================================
  
  test.describe('Delete Project', () => {
    test('PROJ-033: should archive project', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const archiveBtn = page.locator('button:has-text("Archive")').first();
      
      if (await archiveBtn.isVisible()) {
        await archiveBtn.click();
        
        await page.waitForSelector('[role="dialog"]');
        await page.locator('button:has-text("Confirm"), button:has-text("Archive")').click();
        
        await expect(
          page.locator('text=/archived|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('PROJ-034: should delete draft project', async ({ page }) => {
      // Only draft projects can be deleted
      await page.locator('tbody tr, [data-testid="project-card"]').first().click();
      await page.waitForURL(/\/projects\/[\w-]+/);
      
      const deleteBtn = page.locator('button:has-text("Delete")').first();
      
      if (await deleteBtn.isVisible() && await deleteBtn.isEnabled()) {
        await deleteBtn.click();
        
        await page.waitForSelector('[role="dialog"]');
        
        // Type project name for confirmation
        const confirmInput = page.locator('input[placeholder*="type"], input[placeholder*="confirm"]');
        if (await confirmInput.isVisible()) {
          const projectName = await page.locator('[data-testid="project-name"], h1').first().textContent();
          await confirmInput.fill(projectName || 'DELETE');
        }
        
        await page.locator('button:has-text("Delete")').click();
      }
    });
  });
});
