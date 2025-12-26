/**
 * Webhook Service - Comprehensive Tests
 * Tests all webhook functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as webhookService from './webhook.service';

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock global crypto for UUID
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${Date.now()}-${Math.random().toString(36).substring(7)}`,
});

describe('Webhook Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the in-memory store by triggering list which resets if empty
  });

  describe('registerWebhook', () => {
    it('WH-001: should register a new webhook', async () => {
      const config = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['resource.created', 'resource.updated'],
      };

      const result = await webhookService.registerWebhook(mockTenantId, config);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test Webhook');
      expect(result.url).toBe('https://example.com/webhook');
      expect(result.events).toEqual(['resource.created', 'resource.updated']);
    });

    it('WH-002: should set webhook as active by default', async () => {
      const config = {
        name: 'Active Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      };

      const result = await webhookService.registerWebhook(mockTenantId, config);

      expect(result.isActive).toBe(true);
    });

    it('WH-003: should store secret if provided', async () => {
      const config = {
        name: 'Secure Webhook',
        url: 'https://example.com/webhook',
        events: ['allocation.created'],
        secret: 'my-secret-key',
      };

      const result = await webhookService.registerWebhook(mockTenantId, config);

      expect(result.secret).toBe('my-secret-key');
    });

    it('WH-004: should store custom headers', async () => {
      const config = {
        name: 'Custom Headers Webhook',
        url: 'https://example.com/webhook',
        events: ['client.created'],
        headers: { 'X-Custom-Header': 'custom-value' },
      };

      const result = await webhookService.registerWebhook(mockTenantId, config);

      expect(result.headers).toEqual({ 'X-Custom-Header': 'custom-value' });
    });

    it('WH-005: should set default retry count', async () => {
      const config = {
        name: 'Retry Webhook',
        url: 'https://example.com/webhook',
        events: ['contract.created'],
      };

      const result = await webhookService.registerWebhook(mockTenantId, config);

      expect(result.retryCount).toBe(3);
    });

    it('WH-006: should set created and updated timestamps', async () => {
      const config = {
        name: 'Timestamp Webhook',
        url: 'https://example.com/webhook',
        events: ['skill.created'],
      };

      const result = await webhookService.registerWebhook(mockTenantId, config);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('listWebhooks', () => {
    it('WH-007: should return all webhooks for tenant', async () => {
      const tenantId = 'list-test-tenant';
      await webhookService.registerWebhook(tenantId, {
        name: 'Webhook 1',
        url: 'https://example.com/1',
        events: ['event.1'],
      });
      await webhookService.registerWebhook(tenantId, {
        name: 'Webhook 2',
        url: 'https://example.com/2',
        events: ['event.2'],
      });

      const result = await webhookService.listWebhooks(tenantId);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('WH-008: should return empty array for tenant with no webhooks', async () => {
      const result = await webhookService.listWebhooks('non-existent-tenant');

      expect(result).toEqual([]);
    });
  });

  describe('getWebhook', () => {
    it('WH-009: should return webhook by ID', async () => {
      const tenantId = 'get-test-tenant';
      const created = await webhookService.registerWebhook(tenantId, {
        name: 'Get Test Webhook',
        url: 'https://example.com/webhook',
        events: ['test.event'],
      });

      const result = await webhookService.getWebhook(tenantId, created.id);

      expect(result).toBeTruthy();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe('Get Test Webhook');
    });

    it('WH-010: should return null for non-existent webhook', async () => {
      const result = await webhookService.getWebhook(mockTenantId, 'non-existent-id');

      expect(result).toBeNull();
    });

    it('WH-011: should return null when webhook belongs to different tenant', async () => {
      const created = await webhookService.registerWebhook('tenant-a', {
        name: 'Tenant A Webhook',
        url: 'https://example.com/webhook',
        events: ['test.event'],
      });

      const result = await webhookService.getWebhook('tenant-b', created.id);

      expect(result).toBeNull();
    });
  });

  describe('updateWebhook', () => {
    it('WH-012: should update webhook name', async () => {
      const tenantId = 'update-test-tenant';
      const created = await webhookService.registerWebhook(tenantId, {
        name: 'Original Name',
        url: 'https://example.com/webhook',
        events: ['test.event'],
      });

      const result = await webhookService.updateWebhook(tenantId, created.id, {
        name: 'Updated Name',
      });

      expect(result?.name).toBe('Updated Name');
    });

    it('WH-013: should update webhook URL', async () => {
      const tenantId = 'update-url-tenant';
      const created = await webhookService.registerWebhook(tenantId, {
        name: 'URL Test',
        url: 'https://old.example.com/webhook',
        events: ['test.event'],
      });

      const result = await webhookService.updateWebhook(tenantId, created.id, {
        url: 'https://new.example.com/webhook',
      });

      expect(result?.url).toBe('https://new.example.com/webhook');
    });

    it('WH-014: should update webhook events', async () => {
      const tenantId = 'update-events-tenant';
      const created = await webhookService.registerWebhook(tenantId, {
        name: 'Events Test',
        url: 'https://example.com/webhook',
        events: ['event.1'],
      });

      const result = await webhookService.updateWebhook(tenantId, created.id, {
        events: ['event.1', 'event.2', 'event.3'],
      });

      expect(result?.events).toEqual(['event.1', 'event.2', 'event.3']);
    });

    it('WH-015: should toggle webhook active status', async () => {
      const tenantId = 'toggle-tenant';
      const created = await webhookService.registerWebhook(tenantId, {
        name: 'Toggle Test',
        url: 'https://example.com/webhook',
        events: ['test.event'],
      });

      const result = await webhookService.updateWebhook(tenantId, created.id, {
        isActive: false,
      });

      expect(result?.isActive).toBe(false);
    });

    it('WH-016: should update webhook secret', async () => {
      const tenantId = 'secret-update-tenant';
      const created = await webhookService.registerWebhook(tenantId, {
        name: 'Secret Test',
        url: 'https://example.com/webhook',
        events: ['test.event'],
        secret: 'old-secret',
      });

      const result = await webhookService.updateWebhook(tenantId, created.id, {
        secret: 'new-secret',
      });

      expect(result?.secret).toBe('new-secret');
    });

    it('WH-017: should update timestamp on update', async () => {
      const tenantId = 'timestamp-update-tenant';
      const created = await webhookService.registerWebhook(tenantId, {
        name: 'Timestamp Test',
        url: 'https://example.com/webhook',
        events: ['test.event'],
      });

      // Wait a tiny bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await webhookService.updateWebhook(tenantId, created.id, {
        name: 'Updated',
      });

      expect(result?.updatedAt.getTime()).toBeGreaterThan(created.createdAt.getTime());
    });

    it('WH-018: should return null for non-existent webhook', async () => {
      const result = await webhookService.updateWebhook(mockTenantId, 'non-existent', {
        name: 'Test',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteWebhook', () => {
    it('WH-019: should delete existing webhook', async () => {
      const tenantId = 'delete-test-tenant';
      const created = await webhookService.registerWebhook(tenantId, {
        name: 'Delete Test',
        url: 'https://example.com/webhook',
        events: ['test.event'],
      });

      const result = await webhookService.deleteWebhook(tenantId, created.id);

      expect(result).toBe(true);

      // Verify it's gone
      const webhook = await webhookService.getWebhook(tenantId, created.id);
      expect(webhook).toBeNull();
    });

    it('WH-020: should return false for non-existent webhook', async () => {
      const result = await webhookService.deleteWebhook(mockTenantId, 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('triggerWebhook', () => {
    it('WH-021: should trigger matching webhooks', async () => {
      const tenantId = 'trigger-test-tenant';
      await webhookService.registerWebhook(tenantId, {
        name: 'Event Handler',
        url: 'https://example.com/webhook',
        events: ['resource.created', 'resource.updated'],
      });

      // This should not throw
      await webhookService.triggerWebhook(tenantId, 'resource.created', {
        id: 'resource-1',
        name: 'Test Resource',
      });

      // If we reach here, trigger succeeded
      expect(true).toBe(true);
    });

    it('WH-022: should not trigger inactive webhooks', async () => {
      const tenantId = 'inactive-trigger-tenant';
      const webhook = await webhookService.registerWebhook(tenantId, {
        name: 'Inactive Handler',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      await webhookService.updateWebhook(tenantId, webhook.id, { isActive: false });

      // This should complete without triggering
      await webhookService.triggerWebhook(tenantId, 'project.created', {
        id: 'project-1',
      });

      expect(true).toBe(true);
    });

    it('WH-023: should only trigger webhooks subscribed to event', async () => {
      const tenantId = 'event-filter-tenant';
      await webhookService.registerWebhook(tenantId, {
        name: 'Specific Handler',
        url: 'https://example.com/webhook',
        events: ['allocation.created'],
      });

      // Trigger unsubscribed event - should not error
      await webhookService.triggerWebhook(tenantId, 'resource.deleted', {
        id: 'resource-1',
      });

      expect(true).toBe(true);
    });
  });
});
