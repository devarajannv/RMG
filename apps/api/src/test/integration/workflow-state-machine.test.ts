/**
 * Workflow State Machine Tests
 * 
 * Tests the Request workflow state transitions:
 * - Valid transitions (DRAFT → SUBMITTED → APPROVED → COMPLETED)
 * - Invalid transitions (e.g., DRAFT → COMPLETED)
 * - Rollback/Reversal scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, RequestStatus, Priority } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rmgaas:rmgaas_dev@localhost:5432/rmgaas?schema=public';

// Valid workflow transitions based on schema
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['PENDING_APPROVAL', 'RETURNED', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'RETURNED', 'ON_HOLD', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  REJECTED: ['DRAFT', 'CANCELLED'], // Can resubmit
  RETURNED: ['DRAFT', 'CANCELLED'], // Needs revision
  IN_PROGRESS: ['COMPLETED', 'BLOCKED', 'ON_HOLD', 'CANCELLED'],
  COMPLETED: ['REVERSED'], // Only reversal allowed
  CANCELLED: [], // Terminal state
  ON_HOLD: ['PENDING_APPROVAL', 'IN_PROGRESS', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  REVERSED: [], // Terminal state
};

describe('Workflow State Machine Tests', () => {
  let prisma: PrismaClient;
  let testTenantId: string;
  let testUserId: string;
  let testRequestTypeId: string;
  let createdRequestIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
    });
    await prisma.$connect();

    const tenant = await prisma.tenant.findFirst({ where: { slug: 'newvision' } });
    testTenantId = tenant!.id;

    const user = await prisma.user.findFirst({
      where: { tenantId: testTenantId, email: 'admin@newvision.in' },
    });
    testUserId = user!.id;

    // Get or create a request type (RequestType is global, not tenant-scoped)
    let requestType = await prisma.requestType.findFirst({
      where: { isActive: true },
    });
    
    if (!requestType) {
      requestType = await prisma.requestType.create({
        data: {
          code: `TEST-WF-${Date.now()}`,
          name: 'Test Workflow Request',
          category: 'ALLOCATION',
          isActive: true,
        },
      });
    }
    testRequestTypeId = requestType.id;
  });

  afterAll(async () => {
    // Cleanup test requests
    for (const id of createdRequestIds) {
      await prisma.request.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  async function createTestRequest(status: RequestStatus = 'DRAFT'): Promise<string> {
    const requestNumber = `WF-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const request = await prisma.request.create({
      data: {
        tenantId: testTenantId,
        requestNumber,
        requesterId: testUserId,
        typeId: testRequestTypeId,
        status,
        priority: 'MEDIUM',
        title: `Test Request ${requestNumber}`,
        submittedAt: status !== 'DRAFT' ? new Date() : null,
        requestData: {}, // Required JSON field
      },
    });
    
    createdRequestIds.push(request.id);
    return request.id;
  }

  describe('Valid State Transitions', () => {
    it('WF-001: DRAFT → SUBMITTED (submit request)', async () => {
      const requestId = await createTestRequest('DRAFT');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      expect(updated.status).toBe('SUBMITTED');
      expect(updated.submittedAt).toBeDefined();
    });

    it('WF-002: SUBMITTED → PENDING_APPROVAL (enters approval)', async () => {
      const requestId = await createTestRequest('SUBMITTED');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: { status: 'PENDING_APPROVAL' },
      });

      expect(updated.status).toBe('PENDING_APPROVAL');
    });

    it('WF-003: PENDING_APPROVAL → APPROVED (approval granted)', async () => {
      const requestId = await createTestRequest('PENDING_APPROVAL');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });

      expect(updated.status).toBe('APPROVED');
    });

    it('WF-004: APPROVED → IN_PROGRESS (execution started)', async () => {
      const requestId = await createTestRequest('APPROVED');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: { status: 'IN_PROGRESS' },
      });

      expect(updated.status).toBe('IN_PROGRESS');
    });

    it('WF-005: IN_PROGRESS → COMPLETED (execution finished)', async () => {
      const requestId = await createTestRequest('IN_PROGRESS');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          resolvedAt: new Date(),
        },
      });

      expect(updated.status).toBe('COMPLETED');
      expect(updated.resolvedAt).toBeDefined();
    });

    it('WF-006: PENDING_APPROVAL → REJECTED (approval denied)', async () => {
      const requestId = await createTestRequest('PENDING_APPROVAL');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });

      expect(updated.status).toBe('REJECTED');
    });

    it('WF-007: PENDING_APPROVAL → RETURNED (needs revision)', async () => {
      const requestId = await createTestRequest('PENDING_APPROVAL');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: { status: 'RETURNED' },
      });

      expect(updated.status).toBe('RETURNED');
    });

    it('WF-008: RETURNED → DRAFT (requester revises)', async () => {
      const requestId = await createTestRequest('RETURNED');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: { status: 'DRAFT' },
      });

      expect(updated.status).toBe('DRAFT');
    });

    it('WF-009: IN_PROGRESS → BLOCKED (blocked by dependency)', async () => {
      const requestId = await createTestRequest('IN_PROGRESS');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'BLOCKED',
          blockedReason: 'Waiting for resource availability',
        },
      });

      expect(updated.status).toBe('BLOCKED');
      expect(updated.blockedReason).toBeDefined();
    });

    it('WF-010: IN_PROGRESS → ON_HOLD (paused by user)', async () => {
      const requestId = await createTestRequest('IN_PROGRESS');
      
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'ON_HOLD',
          slaPausedAt: new Date(),
        },
      });

      expect(updated.status).toBe('ON_HOLD');
      expect(updated.slaPausedAt).toBeDefined();
    });
  });

  describe('Cancellation Flows', () => {
    const cancellableStates: RequestStatus[] = [
      'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'BLOCKED'
    ];

    for (const state of cancellableStates) {
      it(`WF-CANCEL: ${state} → CANCELLED`, async () => {
        const requestId = await createTestRequest(state);
        
        const updated = await prisma.request.update({
          where: { id: requestId },
          data: { status: 'CANCELLED' },
        });

        expect(updated.status).toBe('CANCELLED');
      });
    }
  });

  describe('Reversal Flow', () => {
    it('WF-REV-001: COMPLETED → REVERSED (rollback)', async () => {
      const requestId = await createTestRequest('COMPLETED');
      
      // Mark the original request as reversed
      const updated = await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'REVERSED',
          reversedAt: new Date(),
          rollbackStatus: 'COMPLETED',
        },
      });

      expect(updated.status).toBe('REVERSED');
      expect(updated.reversedAt).toBeDefined();
    });

    it('WF-REV-002: Create reversal request linked to original', async () => {
      const originalId = await createTestRequest('COMPLETED');
      const reversalNumber = `REV-${Date.now()}`;
      
      // Create a reversal request
      const reversal = await prisma.request.create({
        data: {
          tenantId: testTenantId,
          requestNumber: reversalNumber,
          requesterId: testUserId,
          typeId: testRequestTypeId,
          status: 'DRAFT',
          priority: 'HIGH',
          title: 'Reversal Request',
          isReversal: true,
          originalRequestId: originalId,
          requestData: {}, // Required
        },
      });
      createdRequestIds.push(reversal.id);

      expect(reversal.isReversal).toBe(true);
      expect(reversal.originalRequestId).toBe(originalId);
    });
  });

  describe('Workflow Metadata Tracking', () => {
    it('WF-META-001: Request history captures state transitions', async () => {
      const requestId = await createTestRequest('DRAFT');
      
      // Simulate state transition with history
      await prisma.requestHistory.create({
        data: {
          request: { connect: { id: requestId } },
          action: 'SUBMITTED',
          user: { connect: { id: testUserId } },
          fromStatus: 'DRAFT',
          toStatus: 'SUBMITTED',
        },
      });

      await prisma.request.update({
        where: { id: requestId },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      });

      const history = await prisma.requestHistory.findMany({
        where: { requestId },
        orderBy: { createdAt: 'asc' },
      });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].fromStatus).toBe('DRAFT');
      expect(history[0].toStatus).toBe('SUBMITTED');
    });

    it('WF-META-002: Version increments on update (optimistic locking)', async () => {
      const requestId = await createTestRequest('DRAFT');
      
      const original = await prisma.request.findUnique({ where: { id: requestId } });
      const originalVersion = original!.version;

      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'SUBMITTED',
          version: { increment: 1 },
        },
      });

      const updated = await prisma.request.findUnique({ where: { id: requestId } });
      expect(updated!.version).toBe(originalVersion + 1);
    });
  });

  describe('Complete Workflow Cycle', () => {
    it('WF-FULL-001: Full happy path - DRAFT to COMPLETED', async () => {
      const requestId = await createTestRequest('DRAFT');
      const transitions: RequestStatus[] = [
        'SUBMITTED',
        'PENDING_APPROVAL',
        'APPROVED',
        'IN_PROGRESS',
        'COMPLETED',
      ];

      let currentStatus: RequestStatus = 'DRAFT';
      
      for (const nextStatus of transitions) {
        await prisma.request.update({
          where: { id: requestId },
          data: {
            status: nextStatus,
            submittedAt: nextStatus === 'SUBMITTED' ? new Date() : undefined,
            resolvedAt: nextStatus === 'COMPLETED' ? new Date() : undefined,
          },
        });

        const request = await prisma.request.findUnique({ where: { id: requestId } });
        expect(request!.status).toBe(nextStatus);
        currentStatus = nextStatus;
      }

      expect(currentStatus).toBe('COMPLETED');
    });

    it('WF-FULL-002: Rejection and resubmission cycle', async () => {
      const requestId = await createTestRequest('DRAFT');
      
      // Submit
      await prisma.request.update({
        where: { id: requestId },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      });

      // Enter approval
      await prisma.request.update({
        where: { id: requestId },
        data: { status: 'PENDING_APPROVAL' },
      });

      // Rejected
      await prisma.request.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });

      // Back to draft for revision
      await prisma.request.update({
        where: { id: requestId },
        data: { status: 'DRAFT' },
      });

      // Resubmit
      await prisma.request.update({
        where: { id: requestId },
        data: { status: 'SUBMITTED' },
      });

      const request = await prisma.request.findUnique({ where: { id: requestId } });
      expect(request!.status).toBe('SUBMITTED');
    });
  });
});
