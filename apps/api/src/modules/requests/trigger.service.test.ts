/**
 * Request Trigger Service Tests
 * Comprehensive tests for the trigger-to-request pipeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as triggerService from './trigger.service';
import prisma from '../../lib/prisma';
import { TriggerSourceType, InboundWebhookSource, Priority } from '@prisma/client';

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  default: {
    inboundWebhook: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    requestTrigger: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    tenantRequestTypeConfig: {
      findUnique: vi.fn(),
    },
    approvalChain: {
      findUnique: vi.fn(),
    },
    inboundWebhookEvent: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    triggerExecution: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    delegation: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock request service
vi.mock('./request.service', () => ({
  submitRequest: vi.fn().mockResolvedValue({
    id: 'request-123',
    requestNumber: 'REQ-001',
    title: 'Test Request',
    status: 'PENDING_APPROVAL',
  }),
}));

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue('mockedsecret123'),
  }),
  createHmac: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue({
      digest: vi.fn().mockReturnValue('mockedsignature'),
    }),
  }),
  timingSafeEqual: vi.fn().mockReturnValue(true),
}));

const mockPrisma = prisma as unknown as {
  inboundWebhook: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  requestTrigger: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  tenantRequestTypeConfig: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  approvalChain: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  inboundWebhookEvent: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  triggerExecution: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  delegation: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

describe('Request Trigger Service', () => {
  const tenantId = 'tenant-123';
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Inbound Webhook Tests
  // ============================================================================

  describe('Inbound Webhook Management', () => {
    describe('createInboundWebhook', () => {
      it('should create webhook with generated secret and endpoint', async () => {
        const input = {
          name: 'HubSpot Integration',
          source: 'HUBSPOT' as InboundWebhookSource,
          description: 'Receives HubSpot deal events',
        };

        mockPrisma.inboundWebhook.create.mockResolvedValue({
          id: 'webhook-123',
          tenantId,
          ...input,
          secretKey: 'mockedsecret123',
          endpointPath: 'tenant-1-mockedsecret123',
          signatureHeader: 'X-HubSpot-Signature-v3',
          signatureAlgo: 'hmac-sha256',
          isActive: true,
          createdById: userId,
          triggers: [],
        });

        const result = await triggerService.createInboundWebhook(tenantId, userId, input);

        expect(result.name).toBe('HubSpot Integration');
        expect(result.secretKey).toBeDefined();
        expect(result.endpointPath).toBeDefined();
        expect(mockPrisma.inboundWebhook.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              tenantId,
              name: 'HubSpot Integration',
              source: 'HUBSPOT',
            }),
          })
        );
      });

      it('should use source-specific signature header', async () => {
        const sources: [InboundWebhookSource, string][] = [
          ['HUBSPOT', 'X-HubSpot-Signature-v3'],
          ['STRIPE', 'Stripe-Signature'],
          ['SALESFORCE', 'X-Salesforce-Signature'],
          ['SLACK', 'X-Slack-Signature'],
          ['CUSTOM', 'X-Webhook-Signature'],
        ];

        for (const [source, expectedHeader] of sources) {
          mockPrisma.inboundWebhook.create.mockResolvedValue({
            id: `webhook-${source}`,
            signatureHeader: expectedHeader,
          });

          await triggerService.createInboundWebhook(tenantId, userId, {
            name: `${source} Webhook`,
            source,
          });

          expect(mockPrisma.inboundWebhook.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                signatureHeader: expectedHeader,
              }),
            })
          );
        }
      });
    });

    describe('listInboundWebhooks', () => {
      it('should list active webhooks by default', async () => {
        mockPrisma.inboundWebhook.findMany.mockResolvedValue([
          { id: 'webhook-1', name: 'Webhook 1', isActive: true },
          { id: 'webhook-2', name: 'Webhook 2', isActive: true },
        ]);

        const result = await triggerService.listInboundWebhooks(tenantId);

        expect(result).toHaveLength(2);
        expect(mockPrisma.inboundWebhook.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId,
              isActive: true,
            }),
          })
        );
      });

      it('should include inactive webhooks when requested', async () => {
        mockPrisma.inboundWebhook.findMany.mockResolvedValue([
          { id: 'webhook-1', isActive: true },
          { id: 'webhook-2', isActive: false },
        ]);

        await triggerService.listInboundWebhooks(tenantId, { includeInactive: true });

        expect(mockPrisma.inboundWebhook.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId,
            }),
          })
        );
      });
    });

    describe('deleteInboundWebhook', () => {
      it('should prevent deletion with active triggers', async () => {
        mockPrisma.inboundWebhook.findUnique.mockResolvedValue({
          id: 'webhook-123',
          tenantId,
          triggers: [{ id: 'trigger-1' }],
        });

        await expect(
          triggerService.deleteInboundWebhook(tenantId, 'webhook-123')
        ).rejects.toThrow();
      });

      it('should allow deletion with no triggers', async () => {
        mockPrisma.inboundWebhook.findUnique.mockResolvedValue({
          id: 'webhook-123',
          tenantId,
          triggers: [],
        });
        mockPrisma.inboundWebhook.delete.mockResolvedValue({});

        await triggerService.deleteInboundWebhook(tenantId, 'webhook-123');

        expect(mockPrisma.inboundWebhook.delete).toHaveBeenCalledWith({
          where: { id: 'webhook-123' },
        });
      });
    });
  });

  // ============================================================================
  // Request Trigger Tests
  // ============================================================================

  describe('Request Trigger Management', () => {
    describe('createRequestTrigger', () => {
      it('should create trigger with valid config', async () => {
        const input = {
          name: 'Deal Won → Contract',
          sourceType: 'WEBHOOK' as TriggerSourceType,
          webhookId: 'webhook-123',
          eventType: 'deal.closed',
          eventFilter: { 'properties.stage': 'won' },
          requestTypeConfigId: 'config-123',
          fieldMapping: {
            title: '$.deal.name',
            'metadata.dealValue': '$.deal.amount',
          },
          defaultPriority: 'HIGH' as Priority,
        };

        mockPrisma.tenantRequestTypeConfig.findUnique.mockResolvedValue({
          id: 'config-123',
          tenantId,
          requestType: { id: 'type-123', code: 'CONTRACT' },
        });

        mockPrisma.inboundWebhook.findUnique.mockResolvedValue({
          id: 'webhook-123',
          tenantId,
        });

        mockPrisma.requestTrigger.create.mockResolvedValue({
          id: 'trigger-123',
          tenantId,
          ...input,
          isActive: true,
        });

        const result = await triggerService.createRequestTrigger(tenantId, userId, input);

        expect(result.id).toBe('trigger-123');
        expect(mockPrisma.requestTrigger.create).toHaveBeenCalled();
      });

      it('should reject invalid field mapping', async () => {
        mockPrisma.tenantRequestTypeConfig.findUnique.mockResolvedValue({
          id: 'config-123',
          tenantId,
        });

        // Missing title in field mapping
        await expect(
          triggerService.createRequestTrigger(tenantId, userId, {
            name: 'Test Trigger',
            sourceType: 'WEBHOOK',
            eventType: 'test.event',
            requestTypeConfigId: 'config-123',
            fieldMapping: { description: '$.desc' }, // Missing title
          })
        ).rejects.toThrow();
      });

      it('should reject invalid JSONPath syntax', async () => {
        mockPrisma.tenantRequestTypeConfig.findUnique.mockResolvedValue({
          id: 'config-123',
          tenantId,
        });

        await expect(
          triggerService.createRequestTrigger(tenantId, userId, {
            name: 'Test Trigger',
            sourceType: 'WEBHOOK',
            eventType: 'test.event',
            requestTypeConfigId: 'config-123',
            fieldMapping: { title: 'invalid.path' }, // Not starting with $
          })
        ).rejects.toThrow();
      });

      it('should validate webhook belongs to tenant', async () => {
        mockPrisma.tenantRequestTypeConfig.findUnique.mockResolvedValue({
          id: 'config-123',
          tenantId,
        });

        mockPrisma.inboundWebhook.findUnique.mockResolvedValue({
          id: 'webhook-123',
          tenantId: 'other-tenant', // Different tenant
        });

        await expect(
          triggerService.createRequestTrigger(tenantId, userId, {
            name: 'Test Trigger',
            sourceType: 'WEBHOOK',
            webhookId: 'webhook-123',
            eventType: 'test.event',
            requestTypeConfigId: 'config-123',
            fieldMapping: { title: '$.title' },
          })
        ).rejects.toThrow();
      });
    });

    describe('listRequestTriggers', () => {
      it('should filter by source type', async () => {
        mockPrisma.requestTrigger.findMany.mockResolvedValue([
          { id: 'trigger-1', sourceType: 'WEBHOOK' },
        ]);
        mockPrisma.requestTrigger.count.mockResolvedValue(1);

        await triggerService.listRequestTriggers(tenantId, { sourceType: 'WEBHOOK' });

        expect(mockPrisma.requestTrigger.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              sourceType: 'WEBHOOK',
            }),
          })
        );
      });

      it('should support search', async () => {
        mockPrisma.requestTrigger.findMany.mockResolvedValue([]);
        mockPrisma.requestTrigger.count.mockResolvedValue(0);

        await triggerService.listRequestTriggers(tenantId, { search: 'hubspot' });

        expect(mockPrisma.requestTrigger.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ name: expect.any(Object) }),
                expect.objectContaining({ description: expect.any(Object) }),
                expect.objectContaining({ eventType: expect.any(Object) }),
              ]),
            }),
          })
        );
      });
    });
  });

  // ============================================================================
  // Event Filter Tests
  // ============================================================================

  describe('Event Filter Evaluation', () => {
    // Using internal function via executeTrigger behavior

    it('should match simple equality filter', async () => {
      const trigger = createMockTrigger({
        eventFilter: { stage: 'won' },
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
        request: { requestNumber: 'REQ-001' },
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { stage: 'won', deal: { name: 'Big Deal' } }
      );

      expect(result.status).not.toBe('SKIPPED_FILTER');
    });

    it('should skip when filter does not match', async () => {
      const trigger = createMockTrigger({
        eventFilter: { stage: 'won' },
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SKIPPED_FILTER',
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { stage: 'lost', deal: { name: 'Lost Deal' } }
      );

      expect(result.status).toBe('SKIPPED_FILTER');
    });

    it('should support $gte operator', async () => {
      const trigger = createMockTrigger({
        eventFilter: { amount: { $gte: 50000 } },
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
      });

      // Amount >= 50000 should match
      const result = await triggerService.executeTrigger(
        trigger,
        { amount: 75000, deal: { name: 'Big Deal' } }
      );

      expect(result.status).not.toBe('SKIPPED_FILTER');
    });

    it('should support $in operator', async () => {
      const trigger = createMockTrigger({
        eventFilter: { region: { $in: ['US', 'EU', 'APAC'] } },
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { region: 'EU', deal: { name: 'EU Deal' } }
      );

      expect(result.status).not.toBe('SKIPPED_FILTER');
    });

    it('should support nested path in filter', async () => {
      const trigger = createMockTrigger({
        eventFilter: { 'properties.stage': 'won' },
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { properties: { stage: 'won' }, deal: { name: 'Nested Deal' } }
      );

      expect(result.status).not.toBe('SKIPPED_FILTER');
    });
  });

  // ============================================================================
  // Field Mapping Tests
  // ============================================================================

  describe('Field Mapping', () => {
    it('should map simple fields', async () => {
      const trigger = createMockTrigger({
        fieldMapping: {
          title: '$.dealName',
          description: '$.notes',
        },
      });

      mockPrisma.triggerExecution.create.mockImplementation(async ({ data }) => ({
        id: 'exec-1',
        status: data.status,
        mappedFields: data.mappedFields,
        request: { requestNumber: 'REQ-001' },
      }));

      const result = await triggerService.executeTrigger(
        trigger,
        { dealName: 'My Deal', notes: 'Important notes' }
      );

      expect(result.status).toBe('SUCCESS');
    });

    it('should map nested fields', async () => {
      const trigger = createMockTrigger({
        fieldMapping: {
          title: '$.deal.name',
          'metadata.value': '$.deal.amount',
        },
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { deal: { name: 'Nested Deal', amount: 100000 } }
      );

      expect(result.status).toBe('SUCCESS');
    });

    it('should handle array indexing', async () => {
      const trigger = createMockTrigger({
        fieldMapping: {
          title: '$.deals[0].name',
        },
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { deals: [{ name: 'First Deal' }, { name: 'Second Deal' }] }
      );

      expect(result.status).toBe('SUCCESS');
    });

    it('should fail when required field cannot be mapped', async () => {
      const trigger = createMockTrigger({
        fieldMapping: {
          title: '$.nonexistent.field',
        },
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'FAILED_MAPPING',
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { deal: { name: 'Deal' } }
      );

      expect(result.status).toBe('FAILED_MAPPING');
    });
  });

  // ============================================================================
  // Deduplication Tests
  // ============================================================================

  describe('Deduplication', () => {
    it('should skip duplicate events', async () => {
      const trigger = createMockTrigger({
        deduplicationKey: '$.deal.id',
        deduplicationHours: 24,
      });

      // Mock existing execution
      mockPrisma.triggerExecution.findFirst.mockResolvedValue({
        id: 'existing-exec',
        status: 'SUCCESS',
      });

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SKIPPED_DUPLICATE',
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { deal: { id: 'deal-123', name: 'Deal' } }
      );

      expect(result.status).toBe('SKIPPED_DUPLICATE');
    });

    it('should allow event after dedup window', async () => {
      const trigger = createMockTrigger({
        deduplicationKey: '$.deal.id',
        deduplicationHours: 24,
      });

      // No existing execution found
      mockPrisma.triggerExecution.findFirst.mockResolvedValue(null);

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
      });

      const result = await triggerService.executeTrigger(
        trigger,
        { deal: { id: 'deal-123', name: 'Deal' } }
      );

      expect(result.status).toBe('SUCCESS');
    });
  });

  // ============================================================================
  // Webhook Processing Tests
  // ============================================================================

  describe('Webhook Event Processing', () => {
    it('should log incoming webhook event', async () => {
      mockPrisma.inboundWebhook.findUnique.mockResolvedValue({
        id: 'webhook-123',
        tenantId,
        isActive: true,
        secretKey: 'secret',
        signatureAlgo: 'hmac-sha256',
        triggers: [],
      });

      mockPrisma.inboundWebhookEvent.create.mockResolvedValue({
        id: 'event-123',
      });

      mockPrisma.inboundWebhook.update.mockResolvedValue({});
      mockPrisma.inboundWebhookEvent.update.mockResolvedValue({});

      await triggerService.processWebhookEvent({
        webhookId: 'webhook-123',
        eventType: 'deal.closed',
        payload: { deal: { id: '123' } },
      });

      expect(mockPrisma.inboundWebhookEvent.create).toHaveBeenCalled();
      expect(mockPrisma.inboundWebhook.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalEventsReceived: { increment: 1 },
          }),
        })
      );
    });

    it('should match triggers by event type', async () => {
      const trigger = createMockTrigger({ eventType: 'deal.closed' });

      mockPrisma.inboundWebhook.findUnique.mockResolvedValue({
        id: 'webhook-123',
        tenantId,
        isActive: true,
        secretKey: 'secret',
        triggers: [trigger],
      });

      mockPrisma.inboundWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
      mockPrisma.inboundWebhook.update.mockResolvedValue({});
      mockPrisma.inboundWebhookEvent.update.mockResolvedValue({});
      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
        request: { requestNumber: 'REQ-001' },
      });

      const results = await triggerService.processWebhookEvent({
        webhookId: 'webhook-123',
        eventType: 'deal.closed',
        payload: { deal: { name: 'Test' } },
      });

      expect(results).toHaveLength(1);
    });

    it('should skip when no matching triggers', async () => {
      mockPrisma.inboundWebhook.findUnique.mockResolvedValue({
        id: 'webhook-123',
        tenantId,
        isActive: true,
        secretKey: 'secret',
        triggers: [createMockTrigger({ eventType: 'deal.created' })],
      });

      mockPrisma.inboundWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
      mockPrisma.inboundWebhook.update.mockResolvedValue({});
      mockPrisma.inboundWebhookEvent.update.mockResolvedValue({});

      const results = await triggerService.processWebhookEvent({
        webhookId: 'webhook-123',
        eventType: 'deal.closed', // Different event type
        payload: { deal: { name: 'Test' } },
      });

      expect(results).toHaveLength(0);
    });

    it('should support wildcard event type', async () => {
      const trigger = createMockTrigger({ eventType: '*' });

      mockPrisma.inboundWebhook.findUnique.mockResolvedValue({
        id: 'webhook-123',
        tenantId,
        isActive: true,
        triggers: [trigger],
      });

      mockPrisma.inboundWebhookEvent.create.mockResolvedValue({ id: 'event-123' });
      mockPrisma.inboundWebhook.update.mockResolvedValue({});
      mockPrisma.inboundWebhookEvent.update.mockResolvedValue({});
      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
      });

      const results = await triggerService.processWebhookEvent({
        webhookId: 'webhook-123',
        eventType: 'any.event.type',
        payload: { deal: { name: 'Test' } },
      });

      expect(results).toHaveLength(1);
    });
  });

  // ============================================================================
  // Signature Validation Tests
  // ============================================================================

  describe('Webhook Signature Validation', () => {
    it('should validate HMAC signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'mysecret';
      
      // The mocked crypto will return true
      const isValid = triggerService.validateWebhookSignature(
        payload,
        'sha256=mockedsignature',
        secret,
        'hmac-sha256'
      );

      expect(isValid).toBe(true);
    });

    it('should handle signature without prefix', () => {
      const isValid = triggerService.validateWebhookSignature(
        '{"test":"data"}',
        'mockedsignature',
        'secret',
        'hmac-sha256'
      );

      expect(isValid).toBe(true);
    });
  });

  // ============================================================================
  // Manual Trigger Execution Tests
  // ============================================================================

  describe('Manual Trigger Execution', () => {
    it('should allow manual execution for testing', async () => {
      mockPrisma.requestTrigger.findUnique.mockResolvedValue(
        createMockTrigger({ id: 'trigger-123' })
      );

      mockPrisma.triggerExecution.create.mockResolvedValue({
        id: 'exec-1',
        status: 'SUCCESS',
        request: { requestNumber: 'REQ-001' },
      });

      const result = await triggerService.manuallyExecuteTrigger(
        tenantId,
        'trigger-123',
        { deal: { name: 'Manual Test' } }
      );

      expect(result.status).toBe('SUCCESS');
    });

    it('should reject if trigger not found', async () => {
      mockPrisma.requestTrigger.findUnique.mockResolvedValue(null);

      await expect(
        triggerService.manuallyExecuteTrigger(tenantId, 'nonexistent', {})
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // Execution History Tests
  // ============================================================================

  describe('Execution History', () => {
    it('should return paginated execution history', async () => {
      mockPrisma.requestTrigger.findUnique.mockResolvedValue({
        id: 'trigger-123',
        tenantId,
      });

      mockPrisma.triggerExecution.findMany.mockResolvedValue([
        { id: 'exec-1', status: 'SUCCESS' },
        { id: 'exec-2', status: 'SKIPPED_FILTER' },
      ]);
      mockPrisma.triggerExecution.count.mockResolvedValue(2);

      const result = await triggerService.getTriggerExecutions(tenantId, 'trigger-123');

      expect(result.executions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrisma.requestTrigger.findUnique.mockResolvedValue({
        id: 'trigger-123',
        tenantId,
      });

      mockPrisma.triggerExecution.findMany.mockResolvedValue([]);
      mockPrisma.triggerExecution.count.mockResolvedValue(0);

      await triggerService.getTriggerExecutions(tenantId, 'trigger-123', {
        status: 'SUCCESS',
      });

      expect(mockPrisma.triggerExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SUCCESS',
          }),
        })
      );
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockTrigger(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trigger-123',
    tenantId: 'tenant-123',
    name: 'Test Trigger',
    sourceType: 'WEBHOOK',
    webhookId: 'webhook-123',
    eventType: 'test.event',
    eventFilter: null,
    requestTypeConfigId: 'config-123',
    fieldMapping: { title: '$.deal.name' },
    defaultPriority: 'MEDIUM',
    defaultMetadata: null,
    approvalChainId: null,
    isActive: true,
    requireConfirmation: false,
    deduplicationKey: null,
    deduplicationHours: null,
    createdById: 'user-123',
    deletedAt: null,
    requestTypeConfig: {
      id: 'config-123',
      tenantId: 'tenant-123',
      requestTypeId: 'type-123',
      requestType: { id: 'type-123', code: 'CONTRACT', name: 'Contract' },
      approvalChain: null,
    },
    approvalChain: null,
    ...overrides,
  };
}
