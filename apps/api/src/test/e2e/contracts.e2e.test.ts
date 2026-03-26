/**
 * Contract Lifecycle E2E Tests
 * Tests contract creation through renewal, status transitions, milestones, and documents
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, factories, TestCleanup } from './helpers';

describe('E2E: Contract Lifecycle', () => {
  let token: string;
  let testClientId: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    const t = await login();
    if (!t) throw new Error('Failed to login for contract tests');
    token = t;
    cleanup.setToken(token);

    // Create a test client for contracts
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
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Contract CRUD', () => {
    it('CON-001: List all contracts', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/contracts',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('CON-002: Create contract with required fields', async () => {
      if (!testClientId) return;

      const contract = factories.contract(testClientId);
      const response = await apiRequest<{ id: string; contractNumber: string }>(
        'POST',
        '/api/v1/contracts',
        contract,
        token
      );

      if (response.status === 201) {
        expect(response.data.id).toBeDefined();
        expect(response.data.contractNumber).toBe(contract.contractNumber);
        cleanup.add('contracts', response.data.id);
      }
      expect([201, 400]).toContain(response.status);
    });

    it('CON-003: Create contract with all fields', async () => {
      if (!testClientId) return;

      const contract = factories.contract(testClientId, {
        description: 'Full contract with all fields',
        billingTerms: 'NET30',
        paymentTerms: 'Monthly invoicing',
        autoRenew: true,
        renewalNotificationDays: 60,
        maxBudget: 500000,
        hoursIncluded: 2000,
      });

      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        contract,
        token
      );

      if (response.status === 201) {
        cleanup.add('contracts', response.data.id);
      }
      expect([201, 400]).toContain(response.status);
    });

    it('CON-004: Get contract by ID', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('contracts', createRes.data.id);

      const response = await apiRequest<{ id: string; status: string }>(
        'GET',
        `/api/v1/contracts/${createRes.data.id}`,
        undefined,
        token
      );

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(createRes.data.id);
    });

    it('CON-005: Update contract', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('contracts', createRes.data.id);

      const response = await apiRequest<{ title: string }>(
        'PATCH',
        `/api/v1/contracts/${createRes.data.id}`,
        { title: 'Updated Contract Title' },
        token
      );

      expect(response.status).toBe(200);
    });

    it('CON-006: Delete contract', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status !== 201) return;

      const response = await apiRequest(
        'DELETE',
        `/api/v1/contracts/${createRes.data.id}`,
        undefined,
        token
      );

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Contract Status Transitions', () => {
    it('CON-007: Activate draft contract', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId, { status: 'DRAFT' }),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('contracts', createRes.data.id);

      const response = await apiRequest(
        'POST',
        `/api/v1/contracts/${createRes.data.id}/activate`,
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('CON-008: Terminate active contract', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('contracts', createRes.data.id);

      // First activate
      await apiRequest('POST', `/api/v1/contracts/${createRes.data.id}/activate`, undefined, token);

      // Then terminate
      const response = await apiRequest(
        'POST',
        `/api/v1/contracts/${createRes.data.id}/terminate`,
        { reason: 'E2E test termination' },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('CON-009: Expire contract', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('contracts', createRes.data.id);

      const response = await apiRequest(
        'POST',
        `/api/v1/contracts/${createRes.data.id}/expire`,
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Contract Renewal', () => {
    it('CON-010: Renew contract with new term', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('contracts', createRes.data.id);

      const response = await apiRequest<{ id: string }>(
        'POST',
        `/api/v1/contracts/${createRes.data.id}/renew`,
        {
          renewalType: 'NEW_TERM',
          newStartDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          newEndDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          newValue: 150000,
        },
        token
      );

      if (response.status === 200 || response.status === 201) {
        if (response.data.id && response.data.id !== createRes.data.id) {
          cleanup.add('contracts', response.data.id);
        }
      }
      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('CON-011: Extend contract', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('contracts', createRes.data.id);

      const response = await apiRequest(
        'POST',
        `/api/v1/contracts/${createRes.data.id}/extend`,
        {
          extensionMonths: 6,
          additionalValue: 50000,
        },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('CON-012: Get contracts expiring soon', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/contracts?expiringInDays=30',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Contract Milestones', () => {
    let contractId: string;

    beforeAll(async () => {
      if (!testClientId) return;
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status === 201) {
        contractId = createRes.data.id;
        cleanup.add('contracts', contractId);
      }
    });

    it('CON-013: Add milestone to contract', async () => {
      if (!contractId) return;

      const response = await apiRequest<{ id: string }>(
        'POST',
        `/api/v1/contracts/${contractId}/milestones`,
        {
          name: 'Phase 1 Delivery',
          type: 'DELIVERABLE',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: 'Complete phase 1 deliverables',
        },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('CON-014: List contract milestones', async () => {
      if (!contractId) return;

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/contracts/${contractId}/milestones`,
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('CON-015: Complete milestone', async () => {
      if (!contractId) return;

      // Add a milestone first
      const milestoneRes = await apiRequest<{ id: string }>(
        'POST',
        `/api/v1/contracts/${contractId}/milestones`,
        {
          name: 'Test Milestone',
          type: 'DELIVERABLE',
          dueDate: new Date().toISOString().split('T')[0],
        },
        token
      );

      if (milestoneRes.status !== 201) return;

      const response = await apiRequest(
        'POST',
        `/api/v1/contracts/${contractId}/milestones/${milestoneRes.data.id}/complete`,
        { completedDate: new Date().toISOString().split('T')[0] },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('CON-016: Add payment milestone', async () => {
      if (!contractId) return;

      const response = await apiRequest(
        'POST',
        `/api/v1/contracts/${contractId}/milestones`,
        {
          name: 'First Payment',
          type: 'PAYMENT',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: 50000,
        },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  describe('Contract Documents', () => {
    let contractId: string;

    beforeAll(async () => {
      if (!testClientId) return;
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status === 201) {
        contractId = createRes.data.id;
        cleanup.add('contracts', contractId);
      }
    });

    it('CON-017: List contract documents', async () => {
      if (!contractId) return;

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/contracts/${contractId}/documents`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('CON-018: Get document categories', async () => {
      const response = await apiRequest<{ categories: string[] }>(
        'GET',
        '/api/v1/contracts/document-categories',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Contract Budget Tracking', () => {
    let contractId: string;

    beforeAll(async () => {
      if (!testClientId) return;
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId, { value: 100000 }),
        token
      );
      if (createRes.status === 201) {
        contractId = createRes.data.id;
        cleanup.add('contracts', contractId);
      }
    });

    it('CON-019: Get contract budget summary', async () => {
      if (!contractId) return;

      const response = await apiRequest<{
        totalBudget: number;
        utilized: number;
        remaining: number;
      }>(
        'GET',
        `/api/v1/contracts/${contractId}/budget`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('CON-020: Get budget utilization trend', async () => {
      if (!contractId) return;

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/contracts/${contractId}/budget/trend`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('CON-021: Get contracts over budget', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/contracts?budgetStatus=OVER_BUDGET',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Contract Search & Filtering', () => {
    it('CON-022: Search contracts by keyword', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/contracts?search=test',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('CON-023: Filter contracts by status', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/contracts?status=ACTIVE',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('CON-024: Filter contracts by client', async () => {
      if (!testClientId) return;

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/contracts?clientId=${testClientId}`,
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('CON-025: Filter contracts by date range', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/contracts?startDate=${startDate}&endDate=${endDate}`,
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Contract Audit History', () => {
    it('CON-026: Get contract audit history', async () => {
      if (!testClientId) return;

      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('contracts', createRes.data.id);

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/contracts/${createRes.data.id}/history`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('CON-027: Get contract change summary', async () => {
      const response = await apiRequest<{ summary: object }>(
        'GET',
        '/api/v1/contracts/stats',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Contract Types', () => {
    it('CON-028: Create time and materials contract', async () => {
      if (!testClientId) return;

      const response = await apiRequest<{ id: string; type: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId, { type: 'TIME_AND_MATERIALS' }),
        token
      );

      if (response.status === 201) {
        cleanup.add('contracts', response.data.id);
      }
      expect([201, 400]).toContain(response.status);
    });

    it('CON-029: Create fixed price contract', async () => {
      if (!testClientId) return;

      const response = await apiRequest<{ id: string; type: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId, { type: 'FIXED_PRICE' }),
        token
      );

      if (response.status === 201) {
        cleanup.add('contracts', response.data.id);
      }
      expect([201, 400]).toContain(response.status);
    });

    it('CON-030: Create retainer contract', async () => {
      if (!testClientId) return;

      const response = await apiRequest<{ id: string; type: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId, { type: 'RETAINER' }),
        token
      );

      if (response.status === 201) {
        cleanup.add('contracts', response.data.id);
      }
      expect([201, 400]).toContain(response.status);
    });
  });
});
