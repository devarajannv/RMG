/**
 * Workflow Integration Tests
 * Tests the integration between Requests and Approval Workflows
 * 
 * These tests verify:
 * 1. submitRequest creates RequestApproval records
 * 2. Approver resolution works correctly (MANAGER, ROLE, USER, etc.)
 * 3. Multi-step approval progression
 * 4. Rejection ends the workflow
 * 5. Delegation is applied correctly
 * 6. Self-approval is blocked
 * 7. Notifications are sent
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies BEFORE importing services
vi.mock('../../lib/prisma', () => ({
  default: {
    request: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    requestApproval: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    approvalChain: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    approvalStep: {
      findMany: vi.fn(),
    },
    requestHistory: {
      create: vi.fn(),
    },
    delegation: {
      findFirst: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (cb) => {
      const prisma = await import('../../lib/prisma');
      return cb(prisma.default);
    }),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./notification.service', () => ({
  createNotification: vi.fn().mockResolvedValue({}),
  notifyApprovalDecision: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./approval-chain.service', () => ({
  resolveApproversForRequest: vi.fn(),
  findApprovalChainForRequestType: vi.fn(),
}));

// Import after mocks
import prisma from '../../lib/prisma';
import * as requestService from './request.service';
import { resolveApproversForRequest, findApprovalChainForRequestType } from './approval-chain.service';
import { createNotification, notifyApprovalDecision } from './notification.service';

describe('Workflow Integration Tests', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-requester';
  const mockManagerId = 'user-manager';
  const mockApprover2Id = 'user-approver2';
  const mockRequestId = 'req-123';
  const mockChainId = 'chain-123';
  const mockStep1Id = 'step-1';
  const mockStep2Id = 'step-2';

  // Mock data
  const mockRequestType = {
    id: 'type-1',
    code: 'LEAVE_REQUEST',
    name: 'Leave Request',
    requiresApproval: true,
    responseSlaHours: 24,
    resolutionSlaHours: 48,
    allowRollback: false,
    rollbackWindowDays: 0,
    onApprovalHandler: null,
    tenantConfigs: [{ 
      tenantId: mockTenantId, 
      approvalChainId: mockChainId,
      responseSlaHours: 24,
      resolutionSlaHours: 48,
    }],
  };

  const mockApprovalChain = {
    id: mockChainId,
    name: 'Manager Approval',
    status: 'PUBLISHED',
    version: 1,
    steps: [
      {
        id: mockStep1Id,
        stepOrder: 1,
        name: 'Manager Approval',
        approverType: 'MANAGER',
        approverUserId: null,
        approverRoleId: null,
        approverRole: null,
      },
      {
        id: mockStep2Id,
        stepOrder: 2,
        name: 'HR Approval',
        approverType: 'USER',
        approverUserId: mockApprover2Id,
        approverRoleId: null,
        approverRole: null,
      },
    ],
  };

  const mockDraftRequest = {
    id: mockRequestId,
    requestNumber: 'TST-2025-00001',
    tenantId: mockTenantId,
    typeCode: 'LEAVE_REQUEST',
    title: 'Annual Leave - 5 days',
    description: 'Taking leave next week',
    status: 'DRAFT',
    requesterId: mockUserId,
    dependsOnId: null,
    resource: {
      id: 'resource-1',
      practiceId: 'practice-1',
      managerId: mockManagerId,
    },
    requester: {
      id: mockUserId,
      resourceId: 'resource-1',
    },
    type: mockRequestType,
  };

  const mockPendingRequest = {
    ...mockDraftRequest,
    status: 'PENDING_APPROVAL',
    approvalChainId: mockChainId,
    currentStepOrder: 1,
    approvalChain: mockApprovalChain,
    approvals: [{
      id: 'approval-1',
      requestId: mockRequestId,
      stepId: mockStep1Id,
      stepOrder: 1,
      approverId: mockManagerId,
      status: 'PENDING',
    }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for approval chain service - returns manager as approver
    vi.mocked(resolveApproversForRequest).mockResolvedValue([
      {
        userId: mockManagerId,
        stepId: mockStep1Id,
        stepOrder: 1,
        stepName: 'Manager Approval',
        approverType: 'MANAGER',
        reason: 'Direct Manager',
      },
    ]);
    
    vi.mocked(findApprovalChainForRequestType).mockResolvedValue({
      id: mockChainId,
      name: 'Manager Approval',
      status: 'PUBLISHED',
      version: 1,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Submit Request Tests
  // ============================================================================

  describe('submitRequest - Approval Creation', () => {
    it('should create RequestApproval records for step 1 approvers', async () => {
      // Arrange
      prisma.request.findFirst.mockResolvedValue(mockDraftRequest);
      prisma.approvalChain.findUnique.mockResolvedValue(mockApprovalChain);
      prisma.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      prisma.requestApproval.create.mockResolvedValue({
        id: 'approval-1',
        requestId: mockRequestId,
        stepId: mockStep1Id,
        stepOrder: 1,
        stepName: 'Manager Approval',
        approverId: mockManagerId,
        assignedVia: 'MANAGER',
        status: 'PENDING',
      });
      prisma.request.update.mockResolvedValue({
        ...mockDraftRequest,
        status: 'PENDING_APPROVAL',
        submittedAt: new Date(),
      });
      prisma.requestHistory.create.mockResolvedValue({});
      prisma.delegation.findFirst.mockResolvedValue(null);

      // Act
      const result = await requestService.submitRequest(
        mockTenantId,
        mockRequestId,
        mockUserId
      );

      // Assert
      expect(prisma.requestApproval.create).toHaveBeenCalled();
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_APPROVAL',
            currentStepOrder: 1,
          }),
        })
      );
    });

    it('should resolve MANAGER approver correctly', async () => {
      // Arrange
      prisma.request.findFirst.mockResolvedValue(mockDraftRequest);
      prisma.approvalChain.findUnique.mockResolvedValue(mockApprovalChain);
      prisma.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      prisma.requestApproval.create.mockResolvedValue({});
      prisma.request.update.mockResolvedValue({
        ...mockDraftRequest,
        status: 'PENDING_APPROVAL',
      });
      prisma.requestHistory.create.mockResolvedValue({});
      prisma.delegation.findFirst.mockResolvedValue(null);

      // Act
      await requestService.submitRequest(mockTenantId, mockRequestId, mockUserId);

      // Assert - Manager approval should use resource's manager
      const createCall = prisma.requestApproval.create.mock.calls[0];
      expect(createCall[0].data.approverId).toBe(mockManagerId);
      expect(createCall[0].data.assignedVia).toBe('MANAGER');
      expect(createCall[0].data.stepName).toBe('Manager Approval');
    });

    it('should send notification to approvers', async () => {
      // Arrange
      prisma.request.findFirst.mockResolvedValue(mockDraftRequest);
      prisma.approvalChain.findUnique.mockResolvedValue(mockApprovalChain);
      prisma.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      prisma.requestApproval.create.mockResolvedValue({});
      prisma.request.update.mockResolvedValue({
        ...mockDraftRequest,
        status: 'PENDING_APPROVAL',
      });
      prisma.requestHistory.create.mockResolvedValue({});
      prisma.delegation.findFirst.mockResolvedValue(null);

      // Act
      await requestService.submitRequest(mockTenantId, mockRequestId, mockUserId);

      // Assert
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockManagerId,
          tenantId: mockTenantId,
          type: 'REQUEST_ASSIGNED',
          title: expect.stringContaining('Approval required'),
        })
      );
    });

    it('should auto-approve when no approval chain exists', async () => {
      // Arrange
      const noApprovalRequest = {
        ...mockDraftRequest,
        type: {
          ...mockRequestType,
          requiresApproval: true,
          tenantConfigs: [{ tenantId: mockTenantId, approvalChainId: null }],
        },
      };
      prisma.request.findFirst.mockResolvedValue(noApprovalRequest);
      prisma.approvalChain.findFirst.mockResolvedValue(null);
      prisma.request.update.mockResolvedValue({
        ...noApprovalRequest,
        status: 'APPROVED',
      });
      prisma.requestHistory.create.mockResolvedValue({});

      // Act
      await requestService.submitRequest(mockTenantId, mockRequestId, mockUserId);

      // Assert - should auto-approve
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
      expect(prisma.requestApproval.create).not.toHaveBeenCalled();
    });

    it('should auto-approve when requiresApproval is false', async () => {
      // Arrange
      const noApprovalNeeded = {
        ...mockDraftRequest,
        type: {
          ...mockRequestType,
          requiresApproval: false,
        },
      };
      prisma.request.findFirst.mockResolvedValue(noApprovalNeeded);
      prisma.request.update.mockResolvedValue({
        ...noApprovalNeeded,
        status: 'APPROVED',
      });
      prisma.requestHistory.create.mockResolvedValue({});

      // Act
      await requestService.submitRequest(mockTenantId, mockRequestId, mockUserId);

      // Assert
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });
  });

  // ============================================================================
  // Approve Request Tests
  // ============================================================================

  describe('approveRequest - Multi-step Progression', () => {
    it('should advance to next step when current step is complete', async () => {
      // Arrange
      prisma.request.findFirst.mockResolvedValue(mockPendingRequest);
      prisma.requestApproval.update.mockResolvedValue({});
      prisma.requestApproval.count.mockResolvedValue(0); // No remaining at current step
      prisma.requestApproval.create.mockResolvedValue({});
      prisma.request.update.mockResolvedValue({
        ...mockPendingRequest,
        currentStepOrder: 2,
      });
      prisma.requestHistory.create.mockResolvedValue({});
      prisma.delegation.findFirst.mockResolvedValue(null);

      // Mock approval chain service resolution
      vi.mocked(resolveApproversForRequest).mockResolvedValue([
        {
          userId: mockApprover2Id,
          stepId: mockStep2Id,
          stepOrder: 2,
          stepName: 'HR Approval',
          approverType: 'USER',
          reason: 'Assigned approver for step: HR Approval',
        },
      ]);

      // Act
      await requestService.approveRequest(
        mockTenantId,
        mockRequestId,
        mockManagerId,
        { comments: 'Approved' }
      );

      // Assert - should create step 2 approval
      expect(prisma.requestApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stepOrder: 2,
            approverId: mockApprover2Id,
          }),
        })
      );
    });

    it('should mark as APPROVED when all steps complete', async () => {
      // Arrange - Only one step, no more steps after
      const singleStepRequest = {
        ...mockPendingRequest,
        approvalChain: {
          ...mockApprovalChain,
          steps: [mockApprovalChain.steps[0]], // Only manager step
        },
      };
      prisma.request.findFirst.mockResolvedValue(singleStepRequest);
      prisma.requestApproval.update.mockResolvedValue({});
      prisma.requestApproval.count.mockResolvedValue(0);
      prisma.request.update.mockResolvedValue({
        ...singleStepRequest,
        status: 'APPROVED',
        resolvedAt: new Date(),
      });
      prisma.requestHistory.create.mockResolvedValue({});

      // Act
      await requestService.approveRequest(
        mockTenantId,
        mockRequestId,
        mockManagerId,
        { comments: 'Fully approved' }
      );

      // Assert
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
      expect(notifyApprovalDecision).toHaveBeenCalledWith(
        expect.objectContaining({ requesterId: mockUserId }),
        'APPROVED',
        expect.any(Object),
        'Fully approved'
      );
    });

    it('should block self-approval', async () => {
      // Arrange
      const selfApprovalRequest = {
        ...mockPendingRequest,
        requesterId: mockManagerId, // Requester is trying to approve their own request
      };
      prisma.request.findFirst.mockResolvedValue(selfApprovalRequest);

      // Act & Assert
      await expect(
        requestService.approveRequest(
          mockTenantId,
          mockRequestId,
          mockManagerId,
          { comments: 'Self-approved' }
        )
      ).rejects.toThrow('Cannot approve your own request');
    });

    it('should allow delegate to approve', async () => {
      // Arrange
      const delegatorId = 'user-delegator';
      
      // Single step request - no next step
      const singleStepRequestWithDelegator = {
        ...mockPendingRequest,
        approvalChain: {
          ...mockApprovalChain,
          steps: [mockApprovalChain.steps[0]], // Only manager step
        },
        approvals: [{
          id: 'approval-1',
          requestId: mockRequestId,
          stepId: mockStep1Id,
          stepOrder: 1,
          approverId: delegatorId, // Original approver
          status: 'PENDING',
        }],
      };
      
      // Delegate is trying to approve
      prisma.request.findFirst.mockResolvedValue({
        ...singleStepRequestWithDelegator,
        approvals: [], // Delegate doesn't have direct approval
      });
      
      // Delegation exists
      prisma.delegation.findFirst.mockResolvedValue({
        delegatorId: delegatorId,
      });
      
      // Delegator has pending approval
      prisma.requestApproval.findFirst.mockResolvedValue({
        id: 'approval-1',
        requestId: mockRequestId,
        stepId: mockStep1Id,
        stepOrder: 1,
        approverId: delegatorId,
        status: 'PENDING',
      });
      
      prisma.requestApproval.update.mockResolvedValue({});
      prisma.requestApproval.count.mockResolvedValue(0); // No remaining approvals
      prisma.request.update.mockResolvedValue({
        ...singleStepRequestWithDelegator,
        status: 'APPROVED',
      });
      prisma.requestHistory.create.mockResolvedValue({});

      // Act - Delegate (mockManagerId) approves on behalf of delegator
      await requestService.approveRequest(
        mockTenantId,
        mockRequestId,
        mockManagerId, // Delegate
        { comments: 'Approved as delegate' }
      );

      // Assert - approval should be updated
      expect(prisma.requestApproval.update).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Reject Request Tests
  // ============================================================================

  describe('rejectRequest - Workflow Termination', () => {
    it('should set status to REJECTED', async () => {
      // Arrange
      prisma.request.findFirst.mockResolvedValue(mockPendingRequest);
      prisma.requestApproval.update.mockResolvedValue({});
      prisma.requestApproval.updateMany.mockResolvedValue({ count: 1 });
      prisma.request.update.mockResolvedValue({
        ...mockPendingRequest,
        status: 'REJECTED',
        resolvedAt: new Date(),
      });
      prisma.requestHistory.create.mockResolvedValue({});

      // Act
      await requestService.rejectRequest(
        mockTenantId,
        mockRequestId,
        mockManagerId,
        { comments: 'Rejected - insufficient justification' }
      );

      // Assert
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
          }),
        })
      );
    });

    it('should skip remaining pending approvals', async () => {
      // Arrange
      prisma.request.findFirst.mockResolvedValue(mockPendingRequest);
      prisma.requestApproval.update.mockResolvedValue({});
      prisma.requestApproval.updateMany.mockResolvedValue({ count: 2 });
      prisma.request.update.mockResolvedValue({
        ...mockPendingRequest,
        status: 'REJECTED',
      });
      prisma.requestHistory.create.mockResolvedValue({});

      // Act
      await requestService.rejectRequest(
        mockTenantId,
        mockRequestId,
        mockManagerId,
        { comments: 'Not approved' }
      );

      // Assert
      expect(prisma.requestApproval.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
          data: {
            status: 'SKIPPED',
          },
        })
      );
    });

    it('should notify requester of rejection', async () => {
      // Arrange
      prisma.request.findFirst.mockResolvedValue(mockPendingRequest);
      prisma.requestApproval.update.mockResolvedValue({});
      prisma.requestApproval.updateMany.mockResolvedValue({ count: 0 });
      prisma.request.update.mockResolvedValue({
        ...mockPendingRequest,
        status: 'REJECTED',
      });
      prisma.requestHistory.create.mockResolvedValue({});

      // Act
      await requestService.rejectRequest(
        mockTenantId,
        mockRequestId,
        mockManagerId,
        { comments: 'Rejected due to policy' }
      );

      // Assert
      expect(notifyApprovalDecision).toHaveBeenCalledWith(
        expect.objectContaining({ requesterId: mockUserId }),
        'REJECTED',
        expect.any(Object),
        'Rejected due to policy'
      );
    });

    it('should require comments for rejection', async () => {
      // Act & Assert
      await expect(
        requestService.rejectRequest(
          mockTenantId,
          mockRequestId,
          mockManagerId,
          { comments: '' } // Empty comments
        )
      ).rejects.toThrow('Comments are required when rejecting a request');
    });
  });

  // ============================================================================
  // Approver Resolution Tests
  // ============================================================================

  describe('Approver Resolution', () => {
    it('should resolve ROLE approvers to users with that role', async () => {
      // Arrange
      const roleChain = {
        ...mockApprovalChain,
        steps: [{
          id: 'step-role',
          stepOrder: 1,
          name: 'HR Review',
          approverType: 'ROLE',
          approverRoleId: 'role-hr',
          approverRole: { name: 'HR Manager' },
          approverUserId: null,
        }],
      };
      
      prisma.request.findFirst.mockResolvedValue({
        ...mockDraftRequest,
        type: {
          ...mockRequestType,
          tenantConfigs: [{ tenantId: mockTenantId, approvalChainId: roleChain.id }],
        },
      });
      prisma.approvalChain.findUnique.mockResolvedValue(roleChain);
      prisma.approvalChain.findFirst.mockResolvedValue(roleChain);
      prisma.userRole.findMany.mockResolvedValue([
        { user: { id: 'hr-user-1', tenantId: mockTenantId } },
        { user: { id: 'hr-user-2', tenantId: mockTenantId } },
      ]);
      prisma.requestApproval.create.mockResolvedValue({});
      prisma.request.update.mockResolvedValue({
        ...mockDraftRequest,
        status: 'PENDING_APPROVAL',
      });
      prisma.requestHistory.create.mockResolvedValue({});
      prisma.delegation.findFirst.mockResolvedValue(null);
      
      // Mock resolveApproversForRequest to return two HR users
      vi.mocked(resolveApproversForRequest).mockResolvedValue([
        {
          userId: 'hr-user-1',
          stepId: 'step-role',
          stepOrder: 1,
          stepName: 'HR Review',
          approverType: 'ROLE',
          reason: 'Role: HR Manager',
        },
        {
          userId: 'hr-user-2',
          stepId: 'step-role',
          stepOrder: 1,
          stepName: 'HR Review',
          approverType: 'ROLE',
          reason: 'Role: HR Manager',
        },
      ]);

      // Act
      await requestService.submitRequest(mockTenantId, mockRequestId, mockUserId);

      // Assert - should create approvals for both HR users
      expect(prisma.requestApproval.create).toHaveBeenCalledTimes(2);
    });

    it('should apply delegation when approver has active delegation', async () => {
      // Arrange
      const delegateId = 'delegate-user';
      
      prisma.request.findFirst.mockResolvedValue(mockDraftRequest);
      prisma.approvalChain.findUnique.mockResolvedValue(mockApprovalChain);
      prisma.approvalChain.findFirst.mockResolvedValue(mockApprovalChain);
      prisma.delegation.findFirst.mockResolvedValue({
        delegateId: delegateId,
      });
      prisma.requestApproval.create.mockResolvedValue({});
      prisma.request.update.mockResolvedValue({
        ...mockDraftRequest,
        status: 'PENDING_APPROVAL',
      });
      prisma.requestHistory.create.mockResolvedValue({});
      
      // Mock resolveApproversForRequest to return delegated approver
      vi.mocked(resolveApproversForRequest).mockResolvedValue([
        {
          userId: delegateId,
          stepId: mockStep1Id,
          stepOrder: 1,
          stepName: 'Manager Approval',
          approverType: 'MANAGER',
          reason: 'Direct Manager',
          isDelegated: true,
          delegatedFromId: mockManagerId,
        },
      ]);

      // Act
      await requestService.submitRequest(mockTenantId, mockRequestId, mockUserId);

      // Assert - approval should be created for delegate
      const createCall = prisma.requestApproval.create.mock.calls[0];
      expect(createCall[0].data.approverId).toBe(delegateId);
      expect(createCall[0].data.delegatedFromId).toBe(mockManagerId);
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('Error Handling', () => {
    it('should throw error when request not found', async () => {
      prisma.request.findFirst.mockResolvedValue(null);

      await expect(
        requestService.submitRequest(mockTenantId, 'invalid-id', mockUserId)
      ).rejects.toThrow('Request not found');
    });

    it('should throw error when request is not in DRAFT status for submit', async () => {
      prisma.request.findFirst.mockResolvedValue({
        ...mockDraftRequest,
        status: 'PENDING_APPROVAL',
      });

      await expect(
        requestService.submitRequest(mockTenantId, mockRequestId, mockUserId)
      ).rejects.toThrow('Can only submit requests in DRAFT or RETURNED status');
    });

    it('should throw error when user has no pending approval', async () => {
      prisma.request.findFirst.mockResolvedValue({
        ...mockPendingRequest,
        approvals: [], // No pending approvals for this user
      });
      prisma.delegation.findFirst.mockResolvedValue(null);

      await expect(
        requestService.approveRequest(
          mockTenantId,
          mockRequestId,
          'random-user',
          { comments: 'Trying to approve' }
        )
      ).rejects.toThrow('You do not have a pending approval for this request');
    });
  });
});
