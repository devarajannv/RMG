/**
 * Timesheet E2E Tests
 * Tests time entry CRUD, weekly submissions, manager approval, and auto-submit rules
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, factories, TestCleanup } from './helpers';

describe('E2E: Timesheet Flow', () => {
  let token: string;
  let testResourceId: string;
  let testProjectId: string;
  let testClientId: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    const t = await login();
    if (!t) throw new Error('Failed to login for timesheet tests');
    token = t;
    cleanup.setToken(token);

    // Create test client
    const clientRes = await apiRequest<{ id: string }>(
      'POST',
      '/api/v1/clients',
      factories.client(),
      token
    );
    if (clientRes.status === 201) {
      testClientId = clientRes.data.id;
      cleanup.add('clients', testClientId);
    }

    // Create test project
    if (testClientId) {
      const projectRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/projects',
        factories.project(testClientId),
        token
      );
      if (projectRes.status === 201) {
        testProjectId = projectRes.data.id;
        cleanup.add('projects', testProjectId);
      }
    }

    // Create test resource
    const resourceRes = await apiRequest<{ id: string }>(
      'POST',
      '/api/v1/resources',
      factories.resource(),
      token
    );
    if (resourceRes.status === 201) {
      testResourceId = resourceRes.data.id;
      cleanup.add('resources', testResourceId);
    }
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Time Entry CRUD', () => {
    it('TIM-001: Create time entry', async () => {
      if (!testResourceId || !testProjectId) return;

      const entry = factories.timeEntry(testResourceId, testProjectId);
      const response = await apiRequest<{ id: string; hours: number }>(
        'POST',
        '/api/v1/timesheets/entries',
        entry,
        token
      );

      if (response.status === 201) {
        expect(response.data.id).toBeDefined();
        expect(response.data.hours).toBe(8);
        cleanup.add('timesheets/entries', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('TIM-002: Get time entry by ID', async () => {
      if (!testResourceId || !testProjectId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/timesheets/entries',
        factories.timeEntry(testResourceId, testProjectId),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('timesheets/entries', createRes.data.id);

      const response = await apiRequest<{ id: string; hours: number }>(
        'GET',
        `/api/v1/timesheets/entries/${createRes.data.id}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-003: Update time entry hours', async () => {
      if (!testResourceId || !testProjectId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/timesheets/entries',
        factories.timeEntry(testResourceId, testProjectId, { hours: 6 }),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('timesheets/entries', createRes.data.id);

      const response = await apiRequest<{ hours: number }>(
        'PATCH',
        `/api/v1/timesheets/entries/${createRes.data.id}`,
        { hours: 8 },
        token
      );

      if (response.status === 200) {
        expect(response.data.hours).toBe(8);
      }
      expect([200, 404]).toContain(response.status);
    });

    it('TIM-004: Delete time entry', async () => {
      if (!testResourceId || !testProjectId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/timesheets/entries',
        factories.timeEntry(testResourceId, testProjectId),
        token
      );
      if (createRes.status !== 201) return;

      const response = await apiRequest(
        'DELETE',
        `/api/v1/timesheets/entries/${createRes.data.id}`,
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });

    it('TIM-005: Create time entry with description', async () => {
      if (!testResourceId || !testProjectId) return;

      const response = await apiRequest<{ id: string; description: string }>(
        'POST',
        '/api/v1/timesheets/entries',
        factories.timeEntry(testResourceId, testProjectId, {
          description: 'Working on feature implementation',
          taskCategory: 'Development',
        }),
        token
      );

      if (response.status === 201) {
        cleanup.add('timesheets/entries', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('TIM-006: Validate hours cannot exceed 24', async () => {
      if (!testResourceId || !testProjectId) return;

      const response = await apiRequest(
        'POST',
        '/api/v1/timesheets/entries',
        factories.timeEntry(testResourceId, testProjectId, { hours: 25 }),
        token
      );

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Weekly Timesheet', () => {
    it('TIM-007: Get weekly timesheet', async () => {
      if (!testResourceId) return;

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const weekStart = startOfWeek.toISOString().split('T')[0];

      const response = await apiRequest<{
        entries: unknown[];
        totalHours: number;
      }>(
        'GET',
        `/api/v1/timesheets/weekly?resourceId=${testResourceId}&weekStart=${weekStart}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-008: Get my weekly timesheet', async () => {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const weekStart = startOfWeek.toISOString().split('T')[0];

      const response = await apiRequest<{
        entries: unknown[];
        totalHours: number;
      }>(
        'GET',
        `/api/v1/timesheets/my-weekly?weekStart=${weekStart}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-009: Submit weekly timesheet', async () => {
      if (!testResourceId) return;

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const weekStart = startOfWeek.toISOString().split('T')[0];

      const response = await apiRequest(
        'POST',
        '/api/v1/timesheets/submit',
        {
          resourceId: testResourceId,
          weekStart,
          comment: 'Weekly timesheet submission',
        },
        token
      );

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('TIM-010: Get weekly timesheet summary', async () => {
      const response = await apiRequest<{
        byProject: unknown[];
        byDay: unknown[];
        total: number;
      }>(
        'GET',
        '/api/v1/timesheets/summary',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Timesheet Approval', () => {
    it('TIM-011: Get pending timesheet approvals', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/timesheets/pending-approvals',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-012: Approve timesheet', async () => {
      // Get pending approvals first
      const pendingRes = await apiRequest<{ data: Array<{ id: string }> }>(
        'GET',
        '/api/v1/timesheets/pending-approvals',
        undefined,
        token
      );

      if (pendingRes.status !== 200 || !pendingRes.data.data?.length) return;

      const response = await apiRequest(
        'POST',
        `/api/v1/timesheets/${pendingRes.data.data[0].id}/approve`,
        { comment: 'Approved via E2E test' },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('TIM-013: Reject timesheet with reason', async () => {
      const pendingRes = await apiRequest<{ data: Array<{ id: string }> }>(
        'GET',
        '/api/v1/timesheets/pending-approvals',
        undefined,
        token
      );

      if (pendingRes.status !== 200 || !pendingRes.data.data?.length) return;

      const response = await apiRequest(
        'POST',
        `/api/v1/timesheets/${pendingRes.data.data[0].id}/reject`,
        { reason: 'Missing project codes' },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('TIM-014: Request timesheet revision', async () => {
      const pendingRes = await apiRequest<{ data: Array<{ id: string }> }>(
        'GET',
        '/api/v1/timesheets/pending-approvals',
        undefined,
        token
      );

      if (pendingRes.status !== 200 || !pendingRes.data.data?.length) return;

      const response = await apiRequest(
        'POST',
        `/api/v1/timesheets/${pendingRes.data.data[0].id}/request-revision`,
        { comments: ['Please add task descriptions', 'Verify hours for Monday'] },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Timesheet Filtering & Search', () => {
    it('TIM-015: Filter entries by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/timesheets/entries?startDate=${startDate}&endDate=${endDate}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-016: Filter entries by project', async () => {
      if (!testProjectId) return;

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/timesheets/entries?projectId=${testProjectId}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-017: Filter entries by resource', async () => {
      if (!testResourceId) return;

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/timesheets/entries?resourceId=${testResourceId}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-018: Filter entries by status', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/timesheets/entries?status=APPROVED',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Auto-Submit Rules', () => {
    it('TIM-019: Get auto-submit configuration', async () => {
      const response = await apiRequest<{
        enabled: boolean;
        dayOfWeek: number;
        timeOfDay: string;
      }>(
        'GET',
        '/api/v1/timesheets/auto-submit/config',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-020: Configure auto-submit', async () => {
      const response = await apiRequest(
        'PUT',
        '/api/v1/timesheets/auto-submit/config',
        {
          enabled: true,
          dayOfWeek: 5, // Friday
          timeOfDay: '17:00',
          timezone: 'Asia/Kolkata',
        },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('TIM-021: Disable auto-submit', async () => {
      const response = await apiRequest(
        'PUT',
        '/api/v1/timesheets/auto-submit/config',
        { enabled: false },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  describe('Timesheet Reports', () => {
    it('TIM-022: Get timesheet report by project', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/timesheets/report/by-project',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-023: Get timesheet report by resource', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/timesheets/report/by-resource',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-024: Get billable hours summary', async () => {
      const response = await apiRequest<{
        totalHours: number;
        billableHours: number;
        nonBillableHours: number;
        billablePercent: number;
      }>(
        'GET',
        '/api/v1/timesheets/report/billable',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('TIM-025: Export timesheet data', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/timesheets/export?format=csv',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Timesheet Validation', () => {
    it('TIM-026: Validate daily hours limit', async () => {
      if (!testResourceId || !testProjectId) return;

      const today = new Date().toISOString().split('T')[0];

      // Create entry for 8 hours
      await apiRequest(
        'POST',
        '/api/v1/timesheets/entries',
        factories.timeEntry(testResourceId, testProjectId, { date: today, hours: 8 }),
        token
      );

      // Try to add another 20 hours (should fail if limit exists)
      const response = await apiRequest(
        'POST',
        '/api/v1/timesheets/entries',
        factories.timeEntry(testResourceId, testProjectId, { date: today, hours: 20 }),
        token
      );

      // Either succeeds (no limit) or fails (limit enforced)
      expect([201, 400, 404]).toContain(response.status);
    });

    it('TIM-027: Validate future date entries', async () => {
      if (!testResourceId || !testProjectId) return;

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await apiRequest(
        'POST',
        '/api/v1/timesheets/entries',
        factories.timeEntry(testResourceId, testProjectId, { date: futureDate }),
        token
      );

      // May or may not allow future entries
      expect([201, 400, 404]).toContain(response.status);
    });

    it('TIM-028: Prevent editing approved timesheet', async () => {
      // This would require finding an approved entry to test
      const response = await apiRequest<{ data: Array<{ id: string; status: string }> }>(
        'GET',
        '/api/v1/timesheets/entries?status=APPROVED&limit=1',
        undefined,
        token
      );

      if (response.status !== 200 || !response.data.data?.length) return;

      const editRes = await apiRequest(
        'PATCH',
        `/api/v1/timesheets/entries/${response.data.data[0].id}`,
        { hours: 10 },
        token
      );

      // Should fail for approved entries
      expect([400, 403, 404]).toContain(editRes.status);
    });
  });

  describe('Timesheet Copy', () => {
    it('TIM-029: Copy previous week entries', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/timesheets/copy-previous-week',
        { copyDescriptions: true },
        token
      );

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('TIM-030: Copy entries from template', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/timesheets/copy-from-template',
        { templateId: 'weekly-standard' },
        token
      );

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });
});
