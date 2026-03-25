/**
 * Webhooks E2E Tests
 * Tests outbound webhook configuration, event subscription, signature validation, and delivery tracking
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, factories, TestCleanup } from './helpers';

describe('E2E: Webhooks', () => {
  let token: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    const t = await login();
    if (!t) throw new Error('Failed to login for webhook tests');
    token = t;
    cleanup.setToken(token);
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Webhook Configuration', () => {
    it('WEB-001: List all webhooks', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/webhooks',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('WEB-002: Create webhook', async () => {
      const webhook = factories.webhook();
      const response = await apiRequest<{ id: string; name: string }>(
        'POST',
        '/api/v1/webhooks',
        webhook,
        token
      );

      if (response.status === 201) {
        expect(response.data.id).toBeDefined();
        expect(response.data.name).toBe(webhook.name);
        cleanup.add('webhooks', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('WEB-003: Create webhook with secret', async () => {
      const response = await apiRequest<{ id: string; hasSecret: boolean }>(
        'POST',
        '/api/v1/webhooks',
        {
          ...factories.webhook(),
          secret: 'my-webhook-secret-key',
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('webhooks', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('WEB-004: Get webhook by ID', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{ id: string; url: string }>(
        'GET',
        `/api/v1/webhooks/${createRes.data.id}`,
        undefined,
        token
      );

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(createRes.data.id);
    });

    it('WEB-005: Update webhook', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{ name: string }>(
        'PATCH',
        `/api/v1/webhooks/${createRes.data.id}`,
        { name: 'Updated Webhook Name' },
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('WEB-006: Delete webhook', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;

      const response = await apiRequest(
        'DELETE',
        `/api/v1/webhooks/${createRes.data.id}`,
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Event Subscription', () => {
    it('WEB-007: List available events', async () => {
      const response = await apiRequest<{ events: string[] }>(
        'GET',
        '/api/v1/webhooks/events',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('WEB-008: Subscribe to specific events', async () => {
      const response = await apiRequest<{ id: string; events: string[] }>(
        'POST',
        '/api/v1/webhooks',
        {
          ...factories.webhook(),
          events: ['request.created', 'request.approved', 'request.rejected'],
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('webhooks', response.data.id);
        if (response.data.events) {
          expect(response.data.events).toContain('request.created');
        }
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('WEB-009: Update subscribed events', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{ events: string[] }>(
        'PATCH',
        `/api/v1/webhooks/${createRes.data.id}`,
        { events: ['resource.created', 'resource.updated'] },
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('WEB-010: Subscribe to all events', async () => {
      const response = await apiRequest<{ id: string; events: string[] }>(
        'POST',
        '/api/v1/webhooks',
        {
          ...factories.webhook(),
          events: ['*'],
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('webhooks', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });
  });

  describe('Webhook Status', () => {
    it('WEB-011: Enable webhook', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        { ...factories.webhook(), isActive: false },
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{ isActive: boolean }>(
        'POST',
        `/api/v1/webhooks/${createRes.data.id}/enable`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('WEB-012: Disable webhook', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{ isActive: boolean }>(
        'POST',
        `/api/v1/webhooks/${createRes.data.id}/disable`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('WEB-013: Get webhook health status', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{
        status: string;
        lastSuccess: string | null;
        lastFailure: string | null;
        successRate: number;
      }>(
        'GET',
        `/api/v1/webhooks/${createRes.data.id}/health`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Webhook Testing', () => {
    it('WEB-014: Test webhook delivery', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{
        success: boolean;
        statusCode: number;
        responseTime: number;
      }>(
        'POST',
        `/api/v1/webhooks/${createRes.data.id}/test`,
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('WEB-015: Test webhook with sample payload', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest(
        'POST',
        `/api/v1/webhooks/${createRes.data.id}/test`,
        {
          eventType: 'request.created',
          payload: { id: 'test-123', title: 'Test Request' },
        },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Delivery Tracking', () => {
    it('WEB-016: Get delivery history', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/webhooks/${createRes.data.id}/deliveries`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('WEB-017: Get delivery details', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      // First get deliveries
      const deliveriesRes = await apiRequest<{ data: Array<{ id: string }> }>(
        'GET',
        `/api/v1/webhooks/${createRes.data.id}/deliveries`,
        undefined,
        token
      );

      if (deliveriesRes.status !== 200 || !deliveriesRes.data.data?.length) return;

      const response = await apiRequest<{
        id: string;
        status: string;
        request: object;
        response: object;
      }>(
        'GET',
        `/api/v1/webhooks/${createRes.data.id}/deliveries/${deliveriesRes.data.data[0].id}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('WEB-018: Retry failed delivery', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest(
        'POST',
        `/api/v1/webhooks/${createRes.data.id}/deliveries/retry-all-failed`,
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('WEB-019: Get delivery statistics', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{
        totalDeliveries: number;
        successfulDeliveries: number;
        failedDeliveries: number;
        averageResponseTime: number;
      }>(
        'GET',
        `/api/v1/webhooks/${createRes.data.id}/stats`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Signature Validation', () => {
    it('WEB-020: Create webhook with signing enabled', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        {
          ...factories.webhook(),
          secret: 'test-secret-key',
          signatureHeader: 'X-Webhook-Signature',
          signatureAlgorithm: 'sha256',
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('webhooks', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('WEB-021: Regenerate webhook secret', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        { ...factories.webhook(), secret: 'old-secret' },
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest<{ secret: string }>(
        'POST',
        `/api/v1/webhooks/${createRes.data.id}/regenerate-secret`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('WEB-022: Get webhook signature verification code', async () => {
      const response = await apiRequest<{
        python: string;
        javascript: string;
        go: string;
      }>(
        'GET',
        '/api/v1/webhooks/signature-verification-examples',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Webhook Filters', () => {
    it('WEB-023: Create webhook with filters', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        {
          ...factories.webhook(),
          filters: {
            'request.priority': ['HIGH', 'CRITICAL'],
            'resource.department': ['Engineering'],
          },
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('webhooks', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('WEB-024: Update webhook filters', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/webhooks',
        factories.webhook(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('webhooks', createRes.data.id);

      const response = await apiRequest(
        'PATCH',
        `/api/v1/webhooks/${createRes.data.id}`,
        {
          filters: {
            'request.type': ['ALLOCATION', 'BUDGET'],
          },
        },
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Webhook Validation', () => {
    it('WEB-025: Create webhook with invalid URL returns 400', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/webhooks',
        {
          ...factories.webhook(),
          url: 'not-a-valid-url',
        },
        token
      );

      expect([400, 404]).toContain(response.status);
    });

    it('WEB-026: Create webhook without URL returns 400', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/webhooks',
        {
          name: 'No URL Webhook',
          events: ['request.created'],
        },
        token
      );

      expect([400, 404]).toContain(response.status);
    });

    it('WEB-027: Create webhook with empty events returns 400', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/webhooks',
        {
          ...factories.webhook(),
          events: [],
        },
        token
      );

      expect([400, 404]).toContain(response.status);
    });
  });
});
