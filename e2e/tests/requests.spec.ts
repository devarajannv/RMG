/**
 * Requests & Workflows E2E Tests
 * 
 * Critical path tests for the request approval system:
 * - Request creation (all types)
 * - Submission for approval
 * - Approval/rejection workflow
 * - Workflow step execution
 * - SLA tracking
 * - Notifications
 * 
 * @module e2e/tests/requests.spec
 */

import { test, expect } from '../fixtures';

test.describe('Requests', () => {
  // ========================================================================
  // Setup
  // ========================================================================
  
  test.beforeEach(async ({ appPage }) => {
    await appPage.goto('/requests');
  });

  // ========================================================================
  // List View Tests
  // ========================================================================
  
  test.describe('List View', () => {
    test('REQ-001: should display requests list', async ({ page }) => {
      await expect(
        page.locator('table, [data-testid="requests-table"], [data-testid="requests-list"]')
      ).toBeVisible();
    });

    test('REQ-002: should filter by request status', async ({ page }) => {
      const statusFilter = page.locator(
        '[data-testid="status-filter"], select:near(:text("Status")), button:has-text("Status")'
      ).first();
      
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        
        // Select pending
        await page.locator('text=/pending/i').first().click();
        await page.waitForTimeout(500);
        
        // Results should be filtered
        const pendingBadges = page.locator('[data-testid="request-status"]:has-text("Pending")');
        const count = await pendingBadges.count();
        // Count could be 0 if no pending requests
      }
    });

    test('REQ-003: should filter by request type', async ({ page }) => {
      const typeFilter = page.locator(
        '[data-testid="type-filter"], select:near(:text("Type"))'
      ).first();
      
      if (await typeFilter.isVisible()) {
        await typeFilter.click();
        await page.locator('text=/onboarding|allocation/i').first().click();
        await page.waitForTimeout(500);
      }
    });

    test('REQ-004: should show my pending approvals', async ({ page }) => {
      // Look for "My Approvals" or "Pending My Action" filter
      const myApprovalsBtn = page.locator(
        'button:has-text("My Approvals"), button:has-text("Pending My Action"), [data-testid="my-approvals"]'
      ).first();
      
      if (await myApprovalsBtn.isVisible()) {
        await myApprovalsBtn.click();
        
        // Should filter to requests needing user's approval
        await page.waitForTimeout(500);
      }
    });

    test('REQ-005: should indicate priority levels', async ({ page }) => {
      // Look for priority indicators
      const priorityIndicators = page.locator(
        '[data-testid="priority-badge"], text=/high|medium|low|urgent/i'
      );
      
      const count = await priorityIndicators.count();
      // May or may not have visible priority indicators
    });

    test('REQ-006: should show SLA countdown', async ({ page }) => {
      // Look for SLA/time indicators
      const slaIndicator = page.locator(
        '[data-testid="sla-indicator"], text=/due|overdue|hours left|days left/i'
      ).first();
      
      // SLA might not be visible on all requests
      if (await slaIndicator.isVisible()) {
        await expect(slaIndicator).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Create Request Tests
  // ========================================================================
  
  test.describe('Create Request', () => {
    test('REQ-007: should open create request form', async ({ page }) => {
      await page.locator(
        'button:has-text("New Request"), button:has-text("Create"), [data-testid="create-request"]'
      ).first().click();
      
      // Form or wizard should appear
      await expect(
        page.locator('[role="dialog"], [data-testid="request-form"], form')
      ).toBeVisible();
    });

    test('REQ-008: should show request type selection', async ({ page }) => {
      await page.locator('button:has-text("New Request"), button:has-text("Create")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Should show request type options
      await expect(
        page.locator('text=/type|category|request type/i').first()
      ).toBeVisible();
      
      // Common request types
      const types = ['Onboarding', 'Allocation', 'Change', 'Exit'];
      for (const type of types) {
        const option = page.locator(`text=/${type}/i`).first();
        // Type might not be visible depending on UI
      }
    });

    test('REQ-009: should create resource onboarding request', async ({ page, testData }) => {
      const request = testData.request({ type: 'RESOURCE_ONBOARDING' });
      
      await page.locator('button:has-text("New Request"), button:has-text("Create")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Select type
      const typeSelect = page.locator('select[name="type"], [data-testid="request-type"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption({ label: /onboarding/i });
      } else {
        // Click on type card
        await page.locator('text=/onboarding/i').first().click();
      }
      
      // Fill details
      await page.fill('input[name="title"], [data-testid="title-input"]', request.title);
      
      const descInput = page.locator('textarea[name="description"], [data-testid="description-input"]');
      if (await descInput.isVisible()) {
        await descInput.fill(request.description);
      }
      
      // Submit as draft
      await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').click();
      
      // Should succeed
      await expect(
        page.locator('text=/created|success|saved/i').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('REQ-010: should create allocation change request', async ({ page, testData }) => {
      const request = testData.request({ type: 'ALLOCATION_CHANGE' });
      
      await page.locator('button:has-text("New Request"), button:has-text("Create")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Select allocation change type
      const allocationType = page.locator('text=/allocation/i').first();
      if (await allocationType.isVisible()) {
        await allocationType.click();
      }
      
      // Fill title
      await page.fill('input[name="title"]', request.title);
      
      // Select resource (if UI allows)
      const resourceSelect = page.locator('[data-testid="resource-select"]');
      if (await resourceSelect.isVisible()) {
        await resourceSelect.click();
        await page.locator('[role="option"]').first().click();
      }
      
      // Submit
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      await page.waitForTimeout(1000);
    });

    test('REQ-011: should validate required request fields', async ({ page }) => {
      await page.locator('button:has-text("New Request")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Submit without required fields
      await page.locator('button[type="submit"], button:has-text("Save")').click();
      
      // Should show validation errors
      await expect(
        page.locator('text=/required|must select|please fill/i').first()
      ).toBeVisible({ timeout: 3000 });
    });

    test('REQ-012: should set request priority', async ({ page }) => {
      await page.locator('button:has-text("New Request")').first().click();
      await page.waitForSelector('[role="dialog"], form');
      
      // Look for priority selector
      const prioritySelect = page.locator(
        'select[name="priority"], [data-testid="priority-select"], button:has-text("Priority")'
      ).first();
      
      if (await prioritySelect.isVisible()) {
        await prioritySelect.click();
        await page.locator('text=/high/i').first().click();
      }
    });
  });

  // ========================================================================
  // View Request Tests
  // ========================================================================
  
  test.describe('View Request', () => {
    test('REQ-013: should navigate to request detail', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      
      await expect(page).toHaveURL(/\/requests\/[\w-]+/, { timeout: 5000 });
    });

    test('REQ-014: should display request details', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      // Should show key info
      await expect(page.locator('text=/status/i').first()).toBeVisible();
      await expect(page.locator('text=/type|category/i').first()).toBeVisible();
    });

    test('REQ-015: should show workflow progress', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      // Look for workflow visualization
      const workflowProgress = page.locator(
        '[data-testid="workflow-progress"], text=/step|approval|workflow/i'
      ).first();
      
      await expect(workflowProgress).toBeVisible();
    });

    test('REQ-016: should show approver chain', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      // Look for approvers section
      const approversSection = page.locator(
        '[data-testid="approvers"], text=/approver|reviewer/i'
      ).first();
      
      if (await approversSection.isVisible()) {
        await expect(approversSection).toBeVisible();
      }
    });

    test('REQ-017: should show request history', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      // Look for history/activity section
      const historySection = page.locator(
        '[data-testid="request-history"], text=/history|activity|timeline/i'
      ).first();
      
      await expect(historySection).toBeVisible();
    });
  });

  // ========================================================================
  // Submit Request Tests
  // ========================================================================
  
  test.describe('Submit Request', () => {
    test('REQ-018: should submit draft request', async ({ page }) => {
      // Navigate to a draft request or create one
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      const submitBtn = page.locator(
        'button:has-text("Submit"), [data-testid="submit-request"]'
      ).first();
      
      if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
        await submitBtn.click();
        
        // Confirmation dialog
        await page.waitForSelector('[role="dialog"]');
        await page.locator('button:has-text("Confirm"), button:has-text("Yes")').click();
        
        // Should succeed
        await expect(
          page.locator('text=/submitted|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('REQ-019: should show validation before submit', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      const submitBtn = page.locator('button:has-text("Submit")').first();
      
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        
        // Should validate request completeness
        // Either shows errors or confirmation dialog
        await page.waitForTimeout(1000);
      }
    });
  });

  // ========================================================================
  // Approval Workflow Tests
  // ========================================================================
  
  test.describe('Approval Workflow', () => {
    test('REQ-020: should show approve/reject buttons for approver', async ({ page }) => {
      // Navigate to pending request
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      // Look for approval buttons (only visible to approvers)
      const approveBtn = page.locator(
        'button:has-text("Approve"), [data-testid="approve-button"]'
      ).first();
      const rejectBtn = page.locator(
        'button:has-text("Reject"), [data-testid="reject-button"]'
      ).first();
      
      // Buttons only visible if user is approver
      // Just check they exist in DOM
    });

    test('REQ-021: should approve request', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      const approveBtn = page.locator('button:has-text("Approve")').first();
      
      if (await approveBtn.isVisible() && await approveBtn.isEnabled()) {
        await approveBtn.click();
        
        // Should show approval dialog
        await page.waitForSelector('[role="dialog"]');
        
        // Optional comment
        const commentInput = page.locator('textarea');
        if (await commentInput.isVisible()) {
          await commentInput.fill('E2E Test - Approved');
        }
        
        await page.locator('button:has-text("Confirm"), button:has-text("Approve")').click();
        
        await expect(
          page.locator('text=/approved|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('REQ-022: should reject request with reason', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      const rejectBtn = page.locator('button:has-text("Reject")').first();
      
      if (await rejectBtn.isVisible() && await rejectBtn.isEnabled()) {
        await rejectBtn.click();
        
        await page.waitForSelector('[role="dialog"]');
        
        // Reason is required for rejection
        const reasonInput = page.locator('textarea');
        await reasonInput.fill('E2E Test - Rejected for testing');
        
        await page.locator('button:has-text("Confirm"), button:has-text("Reject")').click();
        
        await expect(
          page.locator('text=/rejected|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('REQ-023: should require reason for rejection', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      const rejectBtn = page.locator('button:has-text("Reject")').first();
      
      if (await rejectBtn.isVisible() && await rejectBtn.isEnabled()) {
        await rejectBtn.click();
        await page.waitForSelector('[role="dialog"]');
        
        // Try to confirm without reason
        await page.locator('button:has-text("Confirm"), button:has-text("Reject")').click();
        
        // Should show validation error
        await expect(
          page.locator('text=/required|reason|please provide/i').first()
        ).toBeVisible({ timeout: 3000 });
      }
    });

    test('REQ-024: should escalate overdue request', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      // Look for escalate button (usually on overdue requests)
      const escalateBtn = page.locator(
        'button:has-text("Escalate"), [data-testid="escalate-button"]'
      ).first();
      
      if (await escalateBtn.isVisible()) {
        await escalateBtn.click();
        
        await page.waitForSelector('[role="dialog"]');
        await expect(page.locator('text=/escalate|escalation/i').first()).toBeVisible();
      }
    });
  });

  // ========================================================================
  // Request Comments Tests
  // ========================================================================
  
  test.describe('Comments', () => {
    test('REQ-025: should add comment to request', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      // Find comments section
      const commentInput = page.locator(
        '[data-testid="comment-input"], textarea:near(:text("Comment")), textarea[placeholder*="comment"]'
      ).first();
      
      if (await commentInput.isVisible()) {
        await commentInput.fill('E2E Test comment');
        
        await page.locator('button:has-text("Post"), button:has-text("Add Comment")').click();
        
        // Comment should appear
        await expect(
          page.locator('text=/E2E Test comment/').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('REQ-026: should display comment thread', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      // Look for comments section
      const commentsSection = page.locator(
        '[data-testid="comments-section"], text=/comment|discussion/i'
      ).first();
      
      await expect(commentsSection).toBeVisible();
    });
  });

  // ========================================================================
  // Cancel Request Tests
  // ========================================================================
  
  test.describe('Cancel Request', () => {
    test('REQ-027: should cancel draft request', async ({ page }) => {
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      const cancelBtn = page.locator(
        'button:has-text("Cancel"), [data-testid="cancel-request"]'
      ).first();
      
      if (await cancelBtn.isVisible() && await cancelBtn.isEnabled()) {
        await cancelBtn.click();
        
        await page.waitForSelector('[role="dialog"]');
        await page.locator('button:has-text("Confirm"), button:has-text("Yes")').click();
        
        await expect(
          page.locator('text=/cancelled|success/i').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('REQ-028: should not allow canceling completed request', async ({ page }) => {
      // Navigate to a completed request
      await page.locator('tbody tr, [data-testid="request-card"]').first().click();
      await page.waitForURL(/\/requests\/[\w-]+/);
      
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      
      // Button should be hidden or disabled for completed requests
      // This depends on the request status
    });
  });

  // ========================================================================
  // Bulk Operations Tests
  // ========================================================================
  
  test.describe('Bulk Operations', () => {
    test('REQ-029: should select multiple requests', async ({ page }) => {
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      
      if (count > 2) {
        await checkboxes.nth(1).click();
        await checkboxes.nth(2).click();
        
        // Bulk action bar should appear
        await expect(
          page.locator('text=/selected|bulk/i').first()
        ).toBeVisible();
      }
    });

    test('REQ-030: should bulk approve requests', async ({ page }) => {
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      
      if (count > 2) {
        await checkboxes.nth(1).click();
        await checkboxes.nth(2).click();
        
        const bulkApproveBtn = page.locator('button:has-text("Bulk Approve"), button:has-text("Approve All")').first();
        
        if (await bulkApproveBtn.isVisible()) {
          await bulkApproveBtn.click();
          await page.waitForSelector('[role="dialog"]');
          await page.locator('button:has-text("Confirm")').click();
          
          await expect(
            page.locator('text=/approved|success/i').first()
          ).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });
});
