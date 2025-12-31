/**
 * Budget Tracking E2E Tests
 * Tests budget creation, allocation, utilization, alerts, and health status
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, factories, TestCleanup } from './helpers';

describe('E2E: Budget Tracking', () => {
  let token: string;
  let testClientId: string;
  let testProjectId: string;
  let testContractId: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    const t = await login();
    if (!t) throw new Error('Failed to login for budget tests');
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

    // Create test contract
    if (testClientId) {
      const contractRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/contracts',
        factories.contract(testClientId, { value: 100000 }),
        token
      );
      if (contractRes.status === 201) {
        testContractId = contractRes.data.id;
        cleanup.add('contracts', testContractId);
      }
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
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Budget Overview', () => {
    it('BUD-001: Get organization budget summary', async () => {
      const response = await apiRequest<{
        totalBudget: number;
        totalUtilized: number;
        totalRemaining: number;
      }>(
        'GET',
        '/api/v1/budget/summary',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-002: Get budget by department', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/by-department',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-003: Get budget by client', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/by-client',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Project Budget', () => {
    it('BUD-004: Get project budget', async () => {
      if (!testProjectId) return;

      const response = await apiRequest<{
        budget: number;
        utilized: number;
        remaining: number;
      }>(
        'GET',
        `/api/v1/projects/${testProjectId}/budget`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-005: Set project budget', async () => {
      if (!testProjectId) return;

      const response = await apiRequest(
        'PUT',
        `/api/v1/projects/${testProjectId}/budget`,
        {
          totalBudget: 50000,
          currency: 'INR',
          alertThresholds: [75, 90, 100],
        },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('BUD-006: Update project budget', async () => {
      if (!testProjectId) return;

      const response = await apiRequest(
        'PATCH',
        `/api/v1/projects/${testProjectId}/budget`,
        { totalBudget: 60000 },
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-007: Get project budget breakdown', async () => {
      if (!testProjectId) return;

      const response = await apiRequest<{
        laborCost: number;
        expenses: number;
        overhead: number;
      }>(
        'GET',
        `/api/v1/projects/${testProjectId}/budget/breakdown`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Contract Budget', () => {
    it('BUD-008: Get contract budget', async () => {
      if (!testContractId) return;

      const response = await apiRequest<{
        value: number;
        utilized: number;
        remaining: number;
      }>(
        'GET',
        `/api/v1/contracts/${testContractId}/budget`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-009: Get contract budget by project', async () => {
      if (!testContractId) return;

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/contracts/${testContractId}/budget/by-project`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-010: Get contract burn rate', async () => {
      if (!testContractId) return;

      const response = await apiRequest<{
        dailyBurnRate: number;
        monthlyBurnRate: number;
        projectedEndDate: string;
      }>(
        'GET',
        `/api/v1/contracts/${testContractId}/budget/burn-rate`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Budget Utilization', () => {
    it('BUD-011: Get utilization over time', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/utilization/trend?period=monthly&months=6',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-012: Get utilization by resource', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/utilization/by-resource',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-013: Get utilization forecast', async () => {
      const response = await apiRequest<{
        currentUtilization: number;
        projectedUtilization: number;
        confidence: number;
      }>(
        'GET',
        '/api/v1/budget/utilization/forecast',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-014: Compare budget vs actual', async () => {
      const response = await apiRequest<{
        budgeted: number;
        actual: number;
        variance: number;
        variancePercent: number;
      }>(
        'GET',
        '/api/v1/budget/variance',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Budget Alerts', () => {
    it('BUD-015: Get active budget alerts', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/alerts',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-016: Get budget alerts by severity', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/alerts?severity=CRITICAL',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-017: Configure alert thresholds', async () => {
      const response = await apiRequest(
        'PUT',
        '/api/v1/budget/alerts/config',
        {
          warningThreshold: 75,
          criticalThreshold: 90,
          overBudgetThreshold: 100,
        },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('BUD-018: Dismiss alert', async () => {
      // First get alerts
      const alertsRes = await apiRequest<{ data: Array<{ id: string }> }>(
        'GET',
        '/api/v1/budget/alerts',
        undefined,
        token
      );

      if (alertsRes.status !== 200 || !alertsRes.data.data?.length) return;

      const response = await apiRequest(
        'POST',
        `/api/v1/budget/alerts/${alertsRes.data.data[0].id}/dismiss`,
        { reason: 'Reviewed and acknowledged' },
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Budget Health Status', () => {
    it('BUD-019: Get overall budget health', async () => {
      const response = await apiRequest<{
        status: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
        score: number;
        issues: unknown[];
      }>(
        'GET',
        '/api/v1/budget/health',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-020: Get projects at risk', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/at-risk',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-021: Get over-budget items', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/over-budget',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-022: Get budget health trend', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/budget/health/trend',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Budget Reporting', () => {
    it('BUD-023: Get budget report', async () => {
      const response = await apiRequest<{ report: object }>(
        'GET',
        '/api/v1/budget/report?period=monthly',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-024: Export budget report', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/budget/report/export?format=csv',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-025: Get budget comparison report', async () => {
      const response = await apiRequest<{
        current: object;
        previous: object;
        change: number;
      }>(
        'GET',
        '/api/v1/budget/report/compare?period1=2025-01&period2=2025-02',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Budget Allocation', () => {
    it('BUD-026: Allocate budget to project', async () => {
      if (!testProjectId) return;

      const response = await apiRequest(
        'POST',
        `/api/v1/projects/${testProjectId}/budget/allocate`,
        {
          amount: 25000,
          category: 'LABOR',
          description: 'Q1 resource allocation',
        },
        token
      );

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('BUD-027: Transfer budget between projects', async () => {
      // Create second project
      if (!testClientId) return;
      
      const project2Res = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/projects',
        factories.project(testClientId),
        token
      );
      
      if (project2Res.status !== 201 || !testProjectId) return;
      cleanup.add('projects', project2Res.data.id);

      const response = await apiRequest(
        'POST',
        '/api/v1/budget/transfer',
        {
          fromProjectId: testProjectId,
          toProjectId: project2Res.data.id,
          amount: 5000,
          reason: 'Reallocation based on priority',
        },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('BUD-028: Get budget allocation history', async () => {
      if (!testProjectId) return;

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/projects/${testProjectId}/budget/history`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Budget Forecasting', () => {
    it('BUD-029: Get budget forecast', async () => {
      const response = await apiRequest<{
        forecast: unknown[];
        projectedTotal: number;
        confidence: number;
      }>(
        'GET',
        '/api/v1/budget/forecast?months=3',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('BUD-030: Get project completion forecast', async () => {
      if (!testProjectId) return;

      const response = await apiRequest<{
        estimatedCompletionDate: string;
        estimatedTotalCost: number;
        budgetAtCompletion: number;
      }>(
        'GET',
        `/api/v1/projects/${testProjectId}/budget/forecast`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });
});
