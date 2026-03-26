/**
 * Request Service - Comprehensive Tests
 * Tests all request lifecycle operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as requestService from './request.service';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  default: {
    requestType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    request: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    requestHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    requestApproval: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    requestSequence: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    approvalChain: {
      findFirst: vi.fn(),
    },
    slaConfig: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (cb) => cb({
      requestSequence: {
        findUnique: vi.fn().mockResolvedValue({ id: 'seq-1', lastNumber: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'seq-1', lastNumber: 1 }),
        update: vi.fn().mockResolvedValue({ id: 'seq-1', lastNumber: 2 }),
      },
    })),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../audit/audit.service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  createInvoiceLinkageAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import prisma from '../../lib/prisma';

describe('Request Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockRequestType = {
    code: 'RESOURCE_ONBOARDING',
    name: 'Resource Onboarding',
    description: 'Request to onboard a new resource',
    isActive: true,
    formSchema: { type: 'object', properties: {} },
    requiredFields: ['resourceName', 'startDate'],
    visibilityScope: 'TENANT',
    tenantConfigs: [{ tenantId: mockTenantId, isEnabled: true }],
  };

  const mockRequest = {
    id: 'req-1',
    requestNumber: 'TST-2025-00001',
    tenantId: mockTenantId,
    typeCode: 'RESOURCE_ONBOARDING',
    title: 'Onboard John Doe',
    description: 'New hire onboarding',
    status: 'DRAFT',
    priority: 'MEDIUM',
    requestData: { resourceName: 'John Doe', startDate: '2025-01-15' },
    requesterId: mockUserId,
    onBehalfOfId: null,
    submittedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    requester: { id: mockUserId, firstName: 'Test', lastName: 'User' },
    type: mockRequestType,
    approvals: [],
    watchers: [],
    resource: null,
    onBehalfOf: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ id: mockTenantId, slug: 'test' } as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: mockUserId,
      resource: { practiceId: null },
      roles: [],
    } as never);
  });

  describe('createRequest', () => {
    it('REQ-001: should create a new request as draft', async () => {
      vi.mocked(prisma.requestType.findFirst).mockResolvedValue(mockRequestType as never);
      vi.mocked(prisma.request.create).mockResolvedValue(mockRequest as never);

      const input = {
        typeCode: 'RESOURCE_ONBOARDING',
        title: 'Onboard John Doe',
        requestData: { resourceName: 'John Doe', startDate: '2025-01-15' },
      };

      const result = await requestService.createRequest(mockTenantId, mockUserId, input);

      expect(result).toHaveProperty('id');
      expect(prisma.request.create).toHaveBeenCalled();
    });

    it('REQ-002: should throw error for invalid request type', async () => {
      vi.mocked(prisma.requestType.findFirst).mockResolvedValue(null);

      const input = {
        typeCode: 'INVALID_TYPE',
        title: 'Test',
        requestData: {},
      };

      await expect(requestService.createRequest(mockTenantId, mockUserId, input))
        .rejects.toThrow('Invalid request type');
    });

    it('REQ-003: should throw error for disabled request type', async () => {
      vi.mocked(prisma.requestType.findFirst).mockResolvedValue({
        ...mockRequestType,
        isActive: false,
      } as never);

      const input = {
        typeCode: 'RESOURCE_ONBOARDING',
        title: 'Test',
        requestData: { resourceName: 'Test', startDate: '2025-01-15' },
      };

      await expect(requestService.createRequest(mockTenantId, mockUserId, input))
        .rejects.toThrow('Request type is disabled');
    });

    it('REQ-004: should validate required fields', async () => {
      vi.mocked(prisma.requestType.findFirst).mockResolvedValue(mockRequestType as never);

      const input = {
        typeCode: 'RESOURCE_ONBOARDING',
        title: 'Test',
        requestData: { resourceName: 'John' }, // Missing startDate
      };

      await expect(requestService.createRequest(mockTenantId, mockUserId, input))
        .rejects.toThrow('Missing required field');
    });

    it('REQ-005: should use request type default priority when not specified', async () => {
      const requestTypeWithDefaultPriority = {
        ...mockRequestType,
        defaultPriority: 'MEDIUM',
      };
      vi.mocked(prisma.requestType.findFirst).mockResolvedValue(requestTypeWithDefaultPriority as never);
      vi.mocked(prisma.request.create).mockResolvedValue(mockRequest as never);

      const input = {
        typeCode: 'RESOURCE_ONBOARDING',
        title: 'Test',
        requestData: { resourceName: 'John', startDate: '2025-01-15' },
      };

      await requestService.createRequest(mockTenantId, mockUserId, input);

      expect(prisma.request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 'MEDIUM',
          }),
        })
      );
    });
  });

  describe('getRequest', () => {
    it('REQ-006: should return request by ID', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest as never);

      const result = await requestService.getRequest(mockTenantId, 'req-1', mockUserId);

      expect(result).toBeTruthy();
      expect(result?.id).toBe('req-1');
    });

    it('REQ-007: should throw error for non-existent request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue(null);

      await expect(requestService.getRequest(mockTenantId, 'non-existent', mockUserId))
        .rejects.toThrow();
    });

    it('REQ-008: should include request type details', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest as never);

      const result = await requestService.getRequest(mockTenantId, 'req-1', mockUserId);

      expect(result?.type).toBeTruthy();
      expect(result?.type.code).toBe('RESOURCE_ONBOARDING');
    });

    it('REQ-028: should allow participant access for PARTICIPANTS visibility', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        requesterId: 'another-user',
        type: { ...mockRequestType, visibilityScope: 'PARTICIPANTS' },
        approvals: [{ approverId: mockUserId }],
      } as never);

      const result = await requestService.getRequest(mockTenantId, 'req-1', mockUserId);
      expect(result).toBeTruthy();
    });

    it('REQ-029: should deny non-participant access for PARTICIPANTS visibility', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        requesterId: 'another-user',
        onBehalfOfId: null,
        type: { ...mockRequestType, visibilityScope: 'PARTICIPANTS' },
        approvals: [],
        watchers: [],
      } as never);

      await expect(requestService.getRequest(mockTenantId, 'req-1', mockUserId))
        .rejects.toThrow('You do not have access to this request');
    });

    it('REQ-030: should allow practice visibility for same-practice users', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: mockUserId,
        resource: { practiceId: 'practice-1' },
        roles: [],
      } as never);

      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        requesterId: 'another-user',
        type: { ...mockRequestType, visibilityScope: 'PRACTICE' },
        resource: { id: 'res-1', practiceId: 'practice-1' },
        requester: {
          id: 'another-user',
          firstName: 'Other',
          lastName: 'User',
          resource: { practiceId: 'practice-1' },
        },
        approvals: [],
        watchers: [],
      } as never);

      const result = await requestService.getRequest(mockTenantId, 'req-1', mockUserId);
      expect(result).toBeTruthy();
    });

    it('REQ-031: should deny watcher-only access for CONFIDENTIAL visibility', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        requesterId: 'another-user',
        type: { ...mockRequestType, visibilityScope: 'CONFIDENTIAL' },
        approvals: [],
        watchers: [{ userId: mockUserId }],
      } as never);

      await expect(requestService.getRequest(mockTenantId, 'req-1', mockUserId))
        .rejects.toThrow('You do not have access to this request');
    });
  });

  describe('listRequests', () => {
    it('REQ-009: should return paginated list of requests', async () => {
      vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest] as never);
      vi.mocked(prisma.request.count).mockResolvedValue(1);

      const result = await requestService.listRequests(mockTenantId, mockUserId, {}, { page: 1, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result.data).toHaveLength(1);
    });

    it('REQ-010: should filter by status', async () => {
      vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest] as never);
      vi.mocked(prisma.request.count).mockResolvedValue(1);

      await requestService.listRequests(
        mockTenantId,
        mockUserId,
        { status: ['DRAFT', 'SUBMITTED'] },
        {}
      );

      expect(prisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['DRAFT', 'SUBMITTED'] },
          }),
        })
      );
    });

    it('REQ-011: should filter by type code', async () => {
      vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest] as never);
      vi.mocked(prisma.request.count).mockResolvedValue(1);

      await requestService.listRequests(
        mockTenantId,
        mockUserId,
        { typeCode: ['RESOURCE_ONBOARDING'] },
        {}
      );

      expect(prisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { code: { in: ['RESOURCE_ONBOARDING'] } },
          }),
        })
      );
    });

    it('REQ-012: should filter by priority', async () => {
      vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest] as never);
      vi.mocked(prisma.request.count).mockResolvedValue(1);

      await requestService.listRequests(
        mockTenantId,
        mockUserId,
        { priority: ['HIGH', 'CRITICAL'] },
        {}
      );

      expect(prisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: { in: ['HIGH', 'CRITICAL'] },
          }),
        })
      );
    });

    it('REQ-013: should support search', async () => {
      vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest] as never);
      vi.mocked(prisma.request.count).mockResolvedValue(1);

      await requestService.listRequests(
        mockTenantId,
        mockUserId,
        {},
        { search: 'John' }
      );

      expect(prisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('REQ-014: should return correct pagination metadata', async () => {
      vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest] as never);
      vi.mocked(prisma.request.count).mockResolvedValue(25);

      const result = await requestService.listRequests(
        mockTenantId,
        mockUserId,
        {},
        { page: 2, limit: 10 }
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
    });

    it('REQ-027: should filter by invoice reference in requestData', async () => {
      vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest] as never);
      vi.mocked(prisma.request.count).mockResolvedValue(1);

      await requestService.listRequests(
        mockTenantId,
        mockUserId,
        { invoiceReference: 'INV-2026-0101' },
        {}
      );

      expect(prisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requestData: {
              path: ['invoiceReference'],
              equals: 'INV-2026-0101',
            },
          }),
        })
      );
    });
  });

  describe('updateRequest', () => {
    it('REQ-015: should update draft request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest as never);
      vi.mocked(prisma.request.update).mockResolvedValue({
        ...mockRequest,
        title: 'Updated Title',
      } as never);

      const result = await requestService.updateRequest(
        mockTenantId,
        'req-1',
        mockUserId,
        { title: 'Updated Title' }
      );

      expect(result.title).toBe('Updated Title');
    });

    it('REQ-016: should throw error for non-existent request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue(null);

      await expect(requestService.updateRequest(
        mockTenantId,
        'non-existent',
        mockUserId,
        { title: 'Test' }
      )).rejects.toThrow();
    });

    it('REQ-017: should not allow update of non-draft request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        status: 'SUBMITTED',
      } as never);

      await expect(requestService.updateRequest(
        mockTenantId,
        'req-1',
        mockUserId,
        { title: 'Test' }
      )).rejects.toThrow();
    });
  });

  describe('submitRequest', () => {
    it('REQ-018: should submit a draft request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest as never);
      vi.mocked(prisma.approvalChain.findFirst).mockResolvedValue({
        id: 'chain-1',
        steps: [{ stepOrder: 1, approverId: 'approver-1' }],
      } as never);
      vi.mocked(prisma.slaConfig.findFirst).mockResolvedValue({
        id: 'sla-1',
        responseTimeHours: 4,
        resolutionTimeHours: 24,
      } as never);
      vi.mocked(prisma.request.update).mockResolvedValue({
        ...mockRequest,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      } as never);

      const result = await requestService.submitRequest(
        mockTenantId,
        'req-1',
        mockUserId
      );

      expect(result.status).toBe('SUBMITTED');
    });

    it('REQ-019: should throw error for non-draft request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        status: 'SUBMITTED',
      } as never);

      await expect(requestService.submitRequest(mockTenantId, 'req-1', mockUserId))
        .rejects.toThrow();
    });

    it('REQ-020: should record history on submit', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest as never);
      vi.mocked(prisma.approvalChain.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.slaConfig.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.request.update).mockResolvedValue({
        ...mockRequest,
        status: 'SUBMITTED',
      } as never);

      await requestService.submitRequest(mockTenantId, 'req-1', mockUserId);

      expect(prisma.requestHistory.create).toHaveBeenCalled();
    });
  });

  describe('deleteRequest', () => {
    it('REQ-021: should delete draft request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue(mockRequest as never);
      vi.mocked(prisma.request.update).mockResolvedValue({
        ...mockRequest,
        deletedAt: new Date(),
      } as never);

      await requestService.deleteRequest(mockTenantId, 'req-1', mockUserId);

      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it('REQ-022: should not allow deletion of submitted request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        status: 'SUBMITTED',
      } as never);

      await expect(requestService.deleteRequest(mockTenantId, 'req-1', mockUserId))
        .rejects.toThrow();
    });
  });

  describe('getDashboardStats', () => {
    it('REQ-023: should return dashboard statistics', async () => {
      vi.mocked(prisma.request.groupBy).mockResolvedValue([
        { status: 'DRAFT', _count: 5 },
        { status: 'SUBMITTED', _count: 10 },
      ] as never);
      vi.mocked(prisma.requestApproval.count).mockResolvedValue(3);
      vi.mocked(prisma.request.count).mockResolvedValue(15);
      vi.mocked(prisma.requestType.findMany).mockResolvedValue([
        { id: 'type-1', code: 'ONBOARDING', name: 'Resource Onboarding' },
      ] as never);
      vi.mocked(prisma.request.findMany).mockResolvedValue([mockRequest] as never);

      const result = await requestService.getDashboardStats(mockTenantId, mockUserId);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty('statusCounts');
      expect(result).toHaveProperty('myPendingApprovals');
    });
  });

  describe('getPendingApprovals', () => {
    it('REQ-024: should return pending approvals for user', async () => {
      vi.mocked(prisma.requestApproval.findMany).mockResolvedValue([{
        id: 'approval-1',
        requestId: 'req-1',
        approverId: mockUserId,
        status: 'PENDING',
        request: mockRequest,
      }] as never);
      vi.mocked(prisma.requestApproval.count).mockResolvedValue(1);

      const result = await requestService.getPendingApprovals(mockTenantId, mockUserId);

      expect(result).toHaveProperty('data');
      expect(prisma.requestApproval.findMany).toHaveBeenCalled();
    });
  });

  describe('invoice linkage', () => {
    it('REQ-025: should link approved request to invoice reference', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
        requestData: { resourceName: 'John Doe', startDate: '2025-01-15' },
        type: { code: 'RESOURCE_ONBOARDING' },
      } as never);
      vi.mocked(prisma.request.update).mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
        requestData: {
          resourceName: 'John Doe',
          startDate: '2025-01-15',
          invoiceReference: 'INV-2026-0001',
        },
      } as never);

      const result = await requestService.linkRequestToInvoice(mockTenantId, 'req-1', mockUserId, {
        invoiceReference: 'INV-2026-0001',
        reason: 'Finance run',
      });

      expect(result).toBeTruthy();
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestData: expect.objectContaining({
              invoiceReference: 'INV-2026-0001',
            }),
          }),
        })
      );
    });

    it('REQ-026: should unlink existing invoice reference from request', async () => {
      vi.mocked(prisma.request.findFirst).mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
        requestData: {
          resourceName: 'John Doe',
          startDate: '2025-01-15',
          invoiceReference: 'INV-2026-0001',
        },
        type: { code: 'RESOURCE_ONBOARDING' },
      } as never);
      vi.mocked(prisma.request.update).mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
        requestData: {
          resourceName: 'John Doe',
          startDate: '2025-01-15',
          invoiceLinkage: {
            invoiceReference: null,
          },
        },
      } as never);

      const result = await requestService.unlinkRequestFromInvoice(mockTenantId, 'req-1', mockUserId, {
        reason: 'Credit note',
      });

      expect(result).toBeTruthy();
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestData: expect.not.objectContaining({
              invoiceReference: 'INV-2026-0001',
            }),
          }),
        })
      );
    });
  });
});
