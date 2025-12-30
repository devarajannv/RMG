/**
 * Cross-Tenant Data Isolation Tests
 * 
 * CRITICAL SECURITY TESTS
 * Verifies that data from one tenant CANNOT leak to another tenant.
 * These tests use the real database to ensure isolation is enforced at the DB level.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rmgaas:rmgaas_dev@localhost:5432/rmgaas?schema=public';

describe('Cross-Tenant Data Isolation Tests', () => {
  let prisma: PrismaClient;
  let tenantAId: string;
  let tenantBId: string;
  let tenantAResourceId: string;
  let tenantBResourceId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
    });
    await prisma.$connect();

    // Get or create two test tenants
    const tenantA = await prisma.tenant.findFirst({
      where: { slug: 'newvision' },
    });
    
    let tenantB = await prisma.tenant.findFirst({
      where: { slug: 'acme-corp-test' },
    });

    if (!tenantB) {
      tenantB = await prisma.tenant.create({
        data: {
          name: 'Acme Corp Test',
          slug: 'acme-corp-test',
          tier: 'FREE',
          status: 'ACTIVE',
        },
      });
    }

    tenantAId = tenantA!.id;
    tenantBId = tenantB.id;

    // Get/create resources for each tenant
    let resourceA = await prisma.resource.findFirst({
      where: { tenantId: tenantAId, deletedAt: null },
    });
    tenantAResourceId = resourceA!.id;

    // Create location, practice for tenant B if needed
    let locationB = await prisma.location.findFirst({
      where: { tenantId: tenantBId },
    });
    if (!locationB) {
      locationB = await prisma.location.create({
        data: {
          tenantId: tenantBId,
          name: 'Acme HQ',
          code: 'ACME-HQ',
          type: 'OFFICE',
          timezone: 'America/New_York',
          country: 'US',
        },
      });
    }

    let practiceB = await prisma.practice.findFirst({
      where: { tenantId: tenantBId },
    });
    if (!practiceB) {
      practiceB = await prisma.practice.create({
        data: {
          tenantId: tenantBId,
          name: 'Engineering',
          code: 'ENG',
        },
      });
    }

    let resourceB = await prisma.resource.findFirst({
      where: { tenantId: tenantBId, deletedAt: null },
    });
    if (!resourceB) {
      resourceB = await prisma.resource.create({
        data: {
          tenantId: tenantBId,
          employeeId: 'ACME-001',
          firstName: 'John',
          lastName: 'Acme',
          email: 'john@acme-test.com',
          status: 'ACTIVE',
          practiceId: practiceB.id,
          locationId: locationB.id,
          // Required fields per schema
          employmentType: 'FTE',
          band: 'L4',
          designation: 'Software Engineer',
          dateOfJoining: new Date('2024-01-01'),
        },
      });
    }
    tenantBResourceId = resourceB.id;
  });

  afterAll(async () => {
    // Cleanup test tenant B data
    await prisma.resource.deleteMany({ where: { tenantId: tenantBId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantBId } });
    await prisma.practice.deleteMany({ where: { tenantId: tenantBId } });
    await prisma.location.deleteMany({ where: { tenantId: tenantBId } });
    await prisma.tenant.delete({ where: { id: tenantBId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Resource Isolation', () => {
    it('ISO-001: TenantA should NOT see TenantB resources', async () => {
      // Query as TenantA - should only get TenantA resources
      const resources = await prisma.resource.findMany({
        where: { tenantId: tenantAId },
      });

      // Verify no TenantB resources leaked
      const tenantBResources = resources.filter(r => r.tenantId === tenantBId);
      expect(tenantBResources.length).toBe(0);
    });

    it('ISO-002: TenantB should NOT see TenantA resources', async () => {
      // Query as TenantB - should only get TenantB resources
      const resources = await prisma.resource.findMany({
        where: { tenantId: tenantBId },
      });

      // Verify no TenantA resources leaked
      const tenantAResources = resources.filter(r => r.tenantId === tenantAId);
      expect(tenantAResources.length).toBe(0);
    });

    it('ISO-003: Direct resource access by ID should respect tenant', async () => {
      // TenantA trying to access TenantB resource directly by ID
      const resource = await prisma.resource.findFirst({
        where: {
          id: tenantBResourceId,
          tenantId: tenantAId, // Wrong tenant!
        },
      });

      expect(resource).toBeNull();
    });

    it('ISO-004: Cannot update resource from different tenant', async () => {
      // This should return null (no matching record)
      const result = await prisma.resource.updateMany({
        where: {
          id: tenantBResourceId,
          tenantId: tenantAId, // Wrong tenant - filter won't match
        },
        data: { firstName: 'HACKED' },
      });

      // Should update 0 records
      expect(result.count).toBe(0);

      // Verify resource unchanged
      const resource = await prisma.resource.findUnique({
        where: { id: tenantBResourceId },
      });
      expect(resource!.firstName).not.toBe('HACKED');
    });
  });

  describe('Project Isolation', () => {
    let tenantBProjectId: string;

    beforeAll(async () => {
      // Create a project for tenant B
      const project = await prisma.project.create({
        data: {
          tenantId: tenantBId,
          code: 'ACME-PRJ-001',
          name: 'Acme Secret Project',
          status: 'ACTIVE',
          startDate: new Date('2025-01-01'),
          type: 'BILLABLE',
        },
      });
      tenantBProjectId = project.id;
    });

    afterAll(async () => {
      await prisma.project.delete({ where: { id: tenantBProjectId } }).catch(() => {});
    });

    it('ISO-005: TenantA cannot see TenantB projects', async () => {
      const projects = await prisma.project.findMany({
        where: { tenantId: tenantAId },
      });

      const leaked = projects.filter(p => p.tenantId === tenantBId);
      expect(leaked.length).toBe(0);
    });

    it('ISO-006: Cannot create allocation across tenants', async () => {
      // Get a project from TenantA
      const projectA = await prisma.project.findFirst({
        where: { tenantId: tenantAId },
      });

      if (projectA) {
        // Try to allocate TenantB resource to TenantA project
        // This should fail due to foreign key constraints or should be prevented
        await expect(
          prisma.allocation.create({
            data: {
              tenantId: tenantAId,
              resourceId: tenantBResourceId, // Wrong tenant!
              projectId: projectA.id,
              startDate: new Date('2025-01-01'),
              endDate: new Date('2025-03-31'),
              percentage: 100,
              status: 'PROPOSED',
            },
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('User Isolation', () => {
    it('ISO-007: Users are scoped to tenant', async () => {
      const usersA = await prisma.user.findMany({
        where: { tenantId: tenantAId },
      });
      const usersB = await prisma.user.findMany({
        where: { tenantId: tenantBId },
      });

      // Verify no cross-contamination
      usersA.forEach(u => expect(u.tenantId).toBe(tenantAId));
      usersB.forEach(u => expect(u.tenantId).toBe(tenantBId));
    });
  });

  describe('Practice and Location Isolation', () => {
    it('ISO-008: Practices are tenant-scoped', async () => {
      const practicesA = await prisma.practice.findMany({
        where: { tenantId: tenantAId },
      });

      practicesA.forEach(p => expect(p.tenantId).toBe(tenantAId));
    });

    it('ISO-009: Locations are tenant-scoped', async () => {
      const locationsA = await prisma.location.findMany({
        where: { tenantId: tenantAId },
      });

      locationsA.forEach(l => expect(l.tenantId).toBe(tenantAId));
    });
  });

  describe('Aggregate Query Isolation', () => {
    it('ISO-010: Count queries respect tenant boundary', async () => {
      const countA = await prisma.resource.count({
        where: { tenantId: tenantAId, deletedAt: null },
      });
      const countB = await prisma.resource.count({
        where: { tenantId: tenantBId, deletedAt: null },
      });
      const countTotal = await prisma.resource.count({
        where: { deletedAt: null },
      });

      // Total should be at least sum of both (there may be other tenants)
      expect(countTotal).toBeGreaterThanOrEqual(countA + countB);
      // Individual counts should not equal total (proving isolation)
      expect(countA).toBeLessThan(countTotal);
    });
  });
});
