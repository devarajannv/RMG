/**
 * Organization Service - Comprehensive Tests
 * Tests organization stats functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as organizationService from './organization.service';

vi.mock('../audit/audit.service', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  default: {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      groupBy: vi.fn(),
    },
    resource: {
      count: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    client: {
      count: vi.fn(),
    },
    document: {
      count: vi.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';

describe('Organization Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrganizationStats', () => {
    const mockTenant = {
      id: mockTenantId,
      name: 'Test Organization',
      slug: 'test-org',
      status: 'ACTIVE',
      createdAt: new Date('2024-01-01'),
    } as any;

    const setupMocks = (overrides: Record<string, unknown> = {}) => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant);
      vi.mocked(prisma.user.groupBy).mockResolvedValue([
        { status: 'ACTIVE', _count: 50 },
        { status: 'INACTIVE', _count: 10 },
      ] as never);
      
      // Resource count calls - 3 separate calls
      const resourceCount = vi.mocked(prisma.resource.count);
      resourceCount
        .mockResolvedValueOnce(overrides.activeResources as number ?? 100) // Active
        .mockResolvedValueOnce(overrides.inactiveResources as number ?? 20) // Inactive
        .mockResolvedValueOnce(overrides.benchResources as number ?? 15); // On bench

      // Project count calls - 3 separate calls
      const projectCount = vi.mocked(prisma.project.count);
      projectCount
        .mockResolvedValueOnce(overrides.totalProjects as number ?? 50) // Total
        .mockResolvedValueOnce(overrides.activeProjects as number ?? 30) // Active
        .mockResolvedValueOnce(overrides.completedProjects as number ?? 15); // Completed

      // Client count calls - 2 separate calls
      const clientCount = vi.mocked(prisma.client.count);
      clientCount
        .mockResolvedValueOnce(overrides.totalClients as number ?? 25) // Total
        .mockResolvedValueOnce(overrides.activeClients as number ?? 20); // Active

      vi.mocked(prisma.document.count).mockResolvedValue(overrides.documents as number ?? 500);
    };

    it('ORG-001: should return complete organization stats', async () => {
      setupMocks();

      const result = await organizationService.getOrganizationStats(mockTenantId);

      expect(result.tenant).toEqual(mockTenant);
      expect(result.users.total).toBe(60);
      expect(result.users.active).toBe(50);
      expect(result.users.inactive).toBe(10);
    });

    it('ORG-002: should return correct resource stats', async () => {
      setupMocks({
        activeResources: 150,
        inactiveResources: 30,
        benchResources: 25,
      });

      const result = await organizationService.getOrganizationStats(mockTenantId);

      expect(result.resources.total).toBe(180); // 150 + 30
      expect(result.resources.active).toBe(150);
      expect(result.resources.inactive).toBe(30);
      expect(result.resources.onBench).toBe(25);
    });

    it('ORG-003: should return correct project stats', async () => {
      setupMocks({
        totalProjects: 100,
        activeProjects: 60,
        completedProjects: 35,
      });

      const result = await organizationService.getOrganizationStats(mockTenantId);

      expect(result.projects.total).toBe(100);
      expect(result.projects.active).toBe(60);
      expect(result.projects.completed).toBe(35);
    });

    it('ORG-004: should return correct client stats', async () => {
      setupMocks({
        totalClients: 40,
        activeClients: 35,
      });

      const result = await organizationService.getOrganizationStats(mockTenantId);

      expect(result.clients.total).toBe(40);
      expect(result.clients.active).toBe(35);
    });

    it('ORG-005: should return document count in storage', async () => {
      setupMocks({ documents: 1500 });

      const result = await organizationService.getOrganizationStats(mockTenantId);

      expect(result.storage.documentsCount).toBe(1500);
    });

    it('ORG-006: should handle zero users', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant);
      vi.mocked(prisma.user.groupBy).mockResolvedValue([]);
      
      const resourceCount = vi.mocked(prisma.resource.count);
      resourceCount.mockResolvedValue(0);
      
      const projectCount = vi.mocked(prisma.project.count);
      projectCount.mockResolvedValue(0);
      
      const clientCount = vi.mocked(prisma.client.count);
      clientCount.mockResolvedValue(0);
      
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      const result = await organizationService.getOrganizationStats(mockTenantId);

      expect(result.users.total).toBe(0);
      expect(result.users.active).toBe(0);
      expect(result.users.inactive).toBe(0);
    });

    it('ORG-007: should query tenant by ID', async () => {
      setupMocks();

      await organizationService.getOrganizationStats(mockTenantId);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: mockTenantId },
        select: expect.objectContaining({
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
        }),
      });
    });

    it('ORG-008: should filter users by tenant and exclude deleted', async () => {
      setupMocks();

      await organizationService.getOrganizationStats(mockTenantId);

      expect(prisma.user.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, deletedAt: null },
        })
      );
    });

    it('ORG-009: should count only active resources correctly', async () => {
      setupMocks();

      await organizationService.getOrganizationStats(mockTenantId);

      expect(prisma.resource.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, status: 'ACTIVE' },
        })
      );
    });

    it('ORG-010: should calculate bench resources correctly', async () => {
      setupMocks();

      await organizationService.getOrganizationStats(mockTenantId);

      // The bench count query checks for resources with no active allocations
      expect(prisma.resource.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: 'ACTIVE',
            allocations: expect.any(Object),
          }),
        })
      );
    });

    it('ORG-011: should handle multiple user statuses', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant);
      vi.mocked(prisma.user.groupBy).mockResolvedValue([
        { status: 'ACTIVE', _count: 100 },
        { status: 'INACTIVE', _count: 20 },
        { status: 'SUSPENDED', _count: 5 },
        { status: 'PENDING', _count: 3 },
      ] as never);
      
      vi.mocked(prisma.resource.count).mockResolvedValue(0);
      vi.mocked(prisma.project.count).mockResolvedValue(0);
      vi.mocked(prisma.client.count).mockResolvedValue(0);
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      const result = await organizationService.getOrganizationStats(mockTenantId);

      expect(result.users.active).toBe(100);
      expect(result.users.inactive).toBe(28); // 20 + 5 + 3
      expect(result.users.total).toBe(128);
    });

    it('ORG-012: should return tenant info including creation date', async () => {
      setupMocks();

      const result = await organizationService.getOrganizationStats(mockTenantId);

      expect(result.tenant.createdAt).toEqual(new Date('2024-01-01'));
      expect(result.tenant.name).toBe('Test Organization');
      expect(result.tenant.slug).toBe('test-org');
      expect(result.tenant.status).toBe('ACTIVE');
    });
  });

  describe('billing taxonomy settings', () => {
    it('ORG-BILL-001: should return default taxonomy when tenant settings are missing', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ settings: null } as any);

      const policy = await organizationService.getBillingTaxonomyPolicy(mockTenantId);

      expect(policy.allowedInvoicingModels).toEqual(['CONTRACT_LED', 'PROJECT_LED', 'HYBRID']);
      expect(policy.allowedBillingTypes).toContain('TM');
      expect(policy.allowContractProjectLinkage).toBe(true);
    });

    it('ORG-BILL-002: should update tenant billing taxonomy in tenant-scoped settings', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ settings: { existing: true } } as any);
      vi.mocked(prisma.tenant.update).mockResolvedValue({ id: mockTenantId } as any);

      const updated = await organizationService.updateBillingTaxonomyPolicy(
        mockTenantId,
        'user-1',
        {
          allowedInvoicingModels: ['PROJECT_LED'],
          allowedBillingTypes: ['TM', 'FIXED'],
          allowContractProjectLinkage: false,
        }
      );

      expect(updated.allowedInvoicingModels).toEqual(['PROJECT_LED']);
      expect(updated.allowedBillingTypes).toEqual(['TM', 'FIXED']);
      expect(updated.allowContractProjectLinkage).toBe(false);
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTenantId },
        })
      );
    });
  });

  describe('document taxonomy settings', () => {
    it('ORG-DOC-001: should return default document taxonomy when tenant settings are missing', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ settings: null } as any);

      const policy = await organizationService.getDocumentTaxonomyPolicy(mockTenantId);

      expect(policy.allowedCategories).toContain('NDA');
      expect(policy.allowedCategories).toContain('MSA');
    });

    it('ORG-DOC-002: should update tenant document taxonomy in tenant-scoped settings', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ settings: { existing: true } } as any);
      vi.mocked(prisma.tenant.update).mockResolvedValue({ id: mockTenantId } as any);

      const updated = await organizationService.updateDocumentTaxonomyPolicy(mockTenantId, 'user-1', {
        allowedCategories: ['nda', 'sow', 'invoice'],
      });

      expect(updated.allowedCategories).toEqual(['NDA', 'SOW', 'INVOICE']);
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTenantId },
        })
      );
    });
  });
});
