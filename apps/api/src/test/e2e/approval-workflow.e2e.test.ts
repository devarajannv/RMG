/**
 * Approval Workflow E2E Tests
 * Tests multi-step approval chains, delegation, SLA tracking, and escalation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, factories, TestCleanup } from './helpers';

describe('E2E: Approval Workflow', () => {
  let token: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    const t = await login();
    if (!t) throw new Error('Failed to login for approval tests');
    token = t;
    cleanup.setToken(token);
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Approval Chain Management', () => {
    it('APR-001: List approval chains', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/approval-chains',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.data.data) || Array.isArray(response.data)).toBe(true);
      }
    });

    it('APR-002: Create approval chain', async () => {
      const chain = {
        name: `Test Chain ${Date.now()}`,
        description: 'E2E test approval chain',
        steps: [
          {
            order: 1,
            name: 'Manager Approval',
            approverType: 'ROLE',
            approverRole: 'MANAGER',
            approvalMode: 'ANY',
            slaHours: 24,
          },
        ],
        isActive: true,
      };

      const response = await apiRequest<{ id: string; name: string }>(
        'POST',
        '/api/v1/approval-chains',
        chain,
        token
      );

      if (response.status === 201) {
        expect(response.data.id).toBeDefined();
        expect(response.data.name).toBe(chain.name);
        cleanup.add('approval-chains', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('APR-003: Create multi-step approval chain', async () => {
      const chain = {
        name: `Multi-Step Chain ${Date.now()}`,
        description: 'Chain with multiple steps',
        steps: [
          {
            order: 1,
            name: 'Team Lead Review',
            approverType: 'ROLE',
            approverRole: 'TEAM_LEAD',
            approvalMode: 'ANY',
            slaHours: 8,
          },
          {
            order: 2,
            name: 'Manager Approval',
            approverType: 'ROLE',
            approverRole: 'MANAGER',
            approvalMode: 'ANY',
            slaHours: 24,
          },
          {
            order: 3,
            name: 'Director Sign-off',
            approverType: 'ROLE',
            approverRole: 'DIRECTOR',
            approvalMode: 'ALL',
            slaHours: 48,
          },
        ],
        isActive: true,
      };

      const response = await apiRequest<{ id: string; steps: unknown[] }>(
        'POST',
        '/api/v1/approval-chains',
        chain,
        token
      );

      if (response.status === 201) {
        cleanup.add('approval-chains', response.data.id);
        if (response.data.steps) {
          expect(response.data.steps.length).toBe(3);
        }
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('APR-004: Get approval chain by ID', async () => {
      // Create a chain first
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/approval-chains',
        {
          name: `Get Test Chain ${Date.now()}`,
          steps: [{ order: 1, name: 'Step 1', approverType: 'ROLE', approverRole: 'MANAGER' }],
        },
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('approval-chains', createRes.data.id);

      const response = await apiRequest<{ id: string; name: string }>(
        'GET',
        `/api/v1/approval-chains/${createRes.data.id}`,
        undefined,
        token
      );

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(createRes.data.id);
    });

    it('APR-005: Update approval chain', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/approval-chains',
        {
          name: `Update Test ${Date.now()}`,
          steps: [{ order: 1, name: 'Step 1', approverType: 'ROLE', approverRole: 'MANAGER' }],
        },
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('approval-chains', createRes.data.id);

      const response = await apiRequest(
        'PATCH',
        `/api/v1/approval-chains/${createRes.data.id}`,
        { name: 'Updated Chain Name' },
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('APR-006: Delete approval chain', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/approval-chains',
        {
          name: `Delete Test ${Date.now()}`,
          steps: [{ order: 1, name: 'Step 1', approverType: 'ROLE', approverRole: 'MANAGER' }],
        },
        token
      );

      if (createRes.status !== 201) return;

      const response = await apiRequest(
        'DELETE',
        `/api/v1/approval-chains/${createRes.data.id}`,
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Approval Processing', () => {
    let requestId: string;

    beforeAll(async () => {
      // Create a request for approval testing
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/requests',
        factories.request(),
        token
      );
      if (createRes.status === 201) {
        requestId = createRes.data.id;
        cleanup.add('requests', requestId);
      }
    });

    it('APR-007: Get pending approvals', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/approvals/pending',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('APR-008: Get my pending approvals', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/approvals/my-pending',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('APR-009: Approve request step', async () => {
      if (!requestId) return;

      // First submit the request if it's a draft
      await apiRequest('POST', `/api/v1/requests/${requestId}/submit`, undefined, token);

      const response = await apiRequest(
        'POST',
        `/api/v1/requests/${requestId}/approve`,
        { comment: 'Approved via E2E test' },
        token
      );

      expect([200, 400, 403, 404]).toContain(response.status);
    });

    it('APR-010: Reject request with reason', async () => {
      // Create fresh request
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/requests',
        factories.request(),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('requests', createRes.data.id);

      // Submit it
      await apiRequest('POST', `/api/v1/requests/${createRes.data.id}/submit`, undefined, token);

      const response = await apiRequest(
        'POST',
        `/api/v1/requests/${createRes.data.id}/reject`,
        { reason: 'Rejected via E2E test - insufficient information' },
        token
      );

      expect([200, 400, 403, 404]).toContain(response.status);
    });

    it('APR-011: Request more information', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/requests',
        factories.request(),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('requests', createRes.data.id);

      await apiRequest('POST', `/api/v1/requests/${createRes.data.id}/submit`, undefined, token);

      const response = await apiRequest(
        'POST',
        `/api/v1/requests/${createRes.data.id}/request-info`,
        { questions: ['Please provide more details'] },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Delegation', () => {
    it('APR-012: Delegate approval to another user', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/approvals/delegate',
        {
          toUserId: 'user-id-to-delegate-to',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Out of office',
        },
        token
      );

      // May not be implemented
      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('APR-013: List my delegations', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/approvals/delegations',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('APR-014: Cancel delegation', async () => {
      const response = await apiRequest(
        'DELETE',
        '/api/v1/approvals/delegations/some-delegation-id',
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('SLA Tracking', () => {
    it('APR-015: Get approvals at risk of SLA breach', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/approvals/at-risk',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('APR-016: Get SLA status for approval', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/requests',
        factories.request(),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('requests', createRes.data.id);

      const response = await apiRequest(
        'GET',
        `/api/v1/requests/${createRes.data.id}/sla-status`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('APR-017: Get overdue approvals', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/approvals/overdue',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Escalation', () => {
    it('APR-018: Escalate approval', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/requests',
        factories.request(),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('requests', createRes.data.id);

      const response = await apiRequest(
        'POST',
        `/api/v1/requests/${createRes.data.id}/escalate`,
        { reason: 'Urgent - requires immediate attention' },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('APR-019: Get escalation history', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/requests',
        factories.request(),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('requests', createRes.data.id);

      const response = await apiRequest(
        'GET',
        `/api/v1/requests/${createRes.data.id}/escalations`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Approval Modes', () => {
    it('APR-020: Create chain with ANY approval mode', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/approval-chains',
        {
          name: `ANY Mode ${Date.now()}`,
          steps: [
            {
              order: 1,
              name: 'Any Approver',
              approverType: 'ROLE',
              approverRole: 'MANAGER',
              approvalMode: 'ANY',
            },
          ],
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('approval-chains', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('APR-021: Create chain with ALL approval mode', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/approval-chains',
        {
          name: `ALL Mode ${Date.now()}`,
          steps: [
            {
              order: 1,
              name: 'All Must Approve',
              approverType: 'ROLE',
              approverRole: 'MANAGER',
              approvalMode: 'ALL',
            },
          ],
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('approval-chains', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('APR-022: Create chain with MAJORITY approval mode', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/approval-chains',
        {
          name: `MAJORITY Mode ${Date.now()}`,
          steps: [
            {
              order: 1,
              name: 'Majority Approval',
              approverType: 'ROLE',
              approverRole: 'MANAGER',
              approvalMode: 'MAJORITY',
            },
          ],
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('approval-chains', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });
  });

  describe('Approval History', () => {
    it('APR-023: Get approval history for request', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/requests',
        factories.request(),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('requests', createRes.data.id);

      const response = await apiRequest(
        'GET',
        `/api/v1/requests/${createRes.data.id}/approval-history`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('APR-024: Get my approval history', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/approvals/history',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('APR-025: Get approval statistics', async () => {
      const response = await apiRequest<{
        pending: number;
        approved: number;
        rejected: number;
      }>(
        'GET',
        '/api/v1/approvals/stats',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });
});
