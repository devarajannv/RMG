/**
 * Audit Service - Comprehensive Tests
 * Tests all audit log functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as auditService from './audit.service';

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  default: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';

describe('Audit Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuditLogs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        userId: mockUserId,
        user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        entityType: 'Resource',
        entityId: 'res-1',
        action: 'CREATE',
        changes: { name: 'New Resource' },
        metadata: { ip: '127.0.0.1' },
        timestamp: new Date('2025-01-01'),
      },
      {
        id: 'log-2',
        userId: null,
        user: null,
        entityType: 'Project',
        entityId: 'proj-1',
        action: 'UPDATE',
        changes: { status: 'ACTIVE' },
        metadata: null,
        timestamp: new Date('2025-01-02'),
      },
    ];

    it('AUDIT-001: should return paginated audit logs', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(100);

      const result = await auditService.getAuditLogs(mockTenantId);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('AUDIT-002: should filter by entityType', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLogs[0]]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);

      const result = await auditService.getAuditLogs(mockTenantId, { entityType: 'Resource' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'Resource' }),
        })
      );
      expect(result.data).toHaveLength(1);
    });

    it('AUDIT-003: should filter by action', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLogs[0]]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);

      await auditService.getAuditLogs(mockTenantId, { action: 'CREATE' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'CREATE' }),
        })
      );
    });

    it('AUDIT-004: should filter by userId', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLogs[0]]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);

      await auditService.getAuditLogs(mockTenantId, { userId: mockUserId });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        })
      );
    });

    it('AUDIT-005: should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(2);

      await auditService.getAuditLogs(mockTenantId, { startDate, endDate });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: { gte: startDate, lte: endDate },
          }),
        })
      );
    });

    it('AUDIT-006: should handle pagination correctly', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(150);

      const result = await auditService.getAuditLogs(mockTenantId, {}, 3, 25);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50, // (3-1) * 25
          take: 25,
        })
      );
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(25);
      expect(result.pagination.totalPages).toBe(6);
    });

    it('AUDIT-007: should include user details in response', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(2);

      const result = await auditService.getAuditLogs(mockTenantId);

      expect(result.data[0].user).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
      });
      expect(result.data[1].user).toBeNull();
    });

    it('AUDIT-008: should handle empty results', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      const result = await auditService.getAuditLogs(mockTenantId);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('AUDIT-009: should order by timestamp descending', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(2);

      await auditService.getAuditLogs(mockTenantId);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' },
        })
      );
    });
  });

  describe('getAuditLogEntityTypes', () => {
    it('AUDIT-010: should return distinct entity types', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        { entityType: 'Resource' },
        { entityType: 'Project' },
        { entityType: 'Client' },
      ] as never);

      const result = await auditService.getAuditLogEntityTypes(mockTenantId);

      expect(result).toEqual(['Resource', 'Project', 'Client']);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['entityType'],
        })
      );
    });

    it('AUDIT-011: should return empty array when no logs exist', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      const result = await auditService.getAuditLogEntityTypes(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('createAuditLog', () => {
    it('AUDIT-012: should create audit log with all fields', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await auditService.createAuditLog(
        mockTenantId,
        mockUserId,
        'Resource',
        'res-1',
        'CREATE',
        { name: 'New' },
        { ip: '127.0.0.1' }
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          userId: mockUserId,
          entityType: 'Resource',
          entityId: 'res-1',
          action: 'CREATE',
          changes: { name: 'New' },
          metadata: { ip: '127.0.0.1' },
        },
      });
    });

    it('AUDIT-013: should create audit log without optional fields', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await auditService.createAuditLog(
        mockTenantId,
        null,
        'System',
        'sys-1',
        'STARTUP'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          changes: undefined,
          metadata: undefined,
        }),
      });
    });

    it('AUDIT-014: should handle system actions without user', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await auditService.createAuditLog(
        mockTenantId,
        null,
        'Batch',
        'batch-1',
        'PROCESS',
        { recordsProcessed: 100 }
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          entityType: 'Batch',
          action: 'PROCESS',
        }),
      });
    });
  });
});
