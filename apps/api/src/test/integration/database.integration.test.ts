/**
 * Database Integration Tests
 * Uses the REAL PostgreSQL database (running in Docker)
 * These tests verify actual database operations work correctly
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Use real database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rmgaas:rmgaas_dev@localhost:5432/rmgaas?schema=public';

describe('Database Integration Tests', () => {
  let prisma: PrismaClient;
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
    });
    await prisma.$connect();

    // Get existing test tenant
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'newvision' },
    });
    
    if (!tenant) {
      throw new Error('Test tenant not found. Run: npx prisma db seed');
    }
    testTenantId = tenant.id;

    // Get existing test user
    const user = await prisma.user.findFirst({
      where: { tenantId: testTenantId, email: 'admin@newvision.in' },
    });
    
    if (!user) {
      throw new Error('Test user not found. Run: npx prisma db seed');
    }
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Tenant Operations', () => {
    it('INT-DB-001: Should read tenant with all relations', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: testTenantId },
        include: {
          users: { take: 1 },
          resources: { take: 1 },
          projects: { take: 1 },
          practices: { take: 1 },
        },
      });

      expect(tenant).toBeDefined();
      expect(tenant!.name).toContain('NewVision'); // Flexible match
      expect(tenant!.status).toBe('ACTIVE');
    });

    it('INT-DB-002: Should enforce unique tenant slug', async () => {
      await expect(
        prisma.tenant.create({
          data: {
            name: 'Duplicate Tenant',
            slug: 'newvision', // Already exists
            tier: 'FREE',
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Resource Operations', () => {
    it('INT-DB-003: Should list resources with skills', async () => {
      const resources = await prisma.resource.findMany({
        where: { tenantId: testTenantId, deletedAt: null },
        include: {
          skills: {
            include: { skill: true },
          },
          practice: true,
          location: true,
        },
        take: 5,
      });

      expect(resources.length).toBeGreaterThan(0);
      
      // Verify resource has expected structure
      const resource = resources[0];
      expect(resource.employeeId).toBeDefined();
      expect(resource.firstName).toBeDefined();
      expect(resource.tenantId).toBe(testTenantId);
    });

    it('INT-DB-004: Should enforce unique employeeId per tenant', async () => {
      // Get an existing resource's employeeId
      const existing = await prisma.resource.findFirst({
        where: { tenantId: testTenantId },
      });

      if (existing) {
        const practice = await prisma.practice.findFirst({
          where: { tenantId: testTenantId },
        });
        const location = await prisma.location.findFirst({
          where: { tenantId: testTenantId },
        });

        await expect(
          prisma.resource.create({
            data: {
              tenantId: testTenantId,
              employeeId: existing.employeeId, // Duplicate!
              firstName: 'Duplicate',
              lastName: 'Resource',
              email: 'duplicate@test.com',
              status: 'ACTIVE',
              practiceId: practice!.id,
              locationId: location!.id,
            },
          })
        ).rejects.toThrow();
      }
    });

    it('INT-DB-005: Should soft delete resources', async () => {
      // Create a test resource
      const practice = await prisma.practice.findFirst({
        where: { tenantId: testTenantId },
      });
      const location = await prisma.location.findFirst({
        where: { tenantId: testTenantId },
      });

      const testResource = await prisma.resource.create({
        data: {
          tenantId: testTenantId,
          employeeId: `TEST-DELETE-${Date.now()}`,
          firstName: 'Delete',
          lastName: 'Test',
          email: `delete-test-${Date.now()}@test.com`,
          status: 'ACTIVE',
          practiceId: practice!.id,
          locationId: location!.id,
          // Required fields per schema
          employmentType: 'FTE',
          band: 'L4',
          designation: 'Test Engineer',
          dateOfJoining: new Date('2024-01-01'),
        },
      });

      // Soft delete
      await prisma.resource.update({
        where: { id: testResource.id },
        data: { deletedAt: new Date() },
      });

      // Should not appear in normal queries
      const found = await prisma.resource.findFirst({
        where: { id: testResource.id, deletedAt: null },
      });
      expect(found).toBeNull();

      // But should exist when including deleted
      const foundWithDeleted = await prisma.resource.findFirst({
        where: { id: testResource.id },
      });
      expect(foundWithDeleted).toBeDefined();
      expect(foundWithDeleted!.deletedAt).toBeDefined();

      // Cleanup
      await prisma.resource.delete({ where: { id: testResource.id } });
    });
  });

  describe('Allocation Operations', () => {
    it('INT-DB-006: Should create allocation with valid references', async () => {
      const resource = await prisma.resource.findFirst({
        where: { tenantId: testTenantId, deletedAt: null },
      });
      const project = await prisma.project.findFirst({
        where: { tenantId: testTenantId, deletedAt: null },
      });

      if (resource && project) {
        const allocation = await prisma.allocation.create({
          data: {
            tenantId: testTenantId,
            resourceId: resource.id,
            projectId: project.id,
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-03-31'),
            percentage: 50,
            status: 'PROPOSED',
            isBillable: true,
            role: 'Developer', // Required field
          },
        });

        expect(allocation).toBeDefined();
        expect(allocation.percentage).toBe(50);

        // Cleanup
        await prisma.allocation.delete({ where: { id: allocation.id } });
      }
    });

    it('INT-DB-007: Should fail allocation with invalid resourceId', async () => {
      const project = await prisma.project.findFirst({
        where: { tenantId: testTenantId },
      });

      await expect(
        prisma.allocation.create({
          data: {
            tenantId: testTenantId,
            resourceId: '00000000-0000-0000-0000-000000000000', // Invalid
            projectId: project!.id,
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-03-31'),
            percentage: 100,
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Query Performance', () => {
    it('INT-DB-008: Should efficiently query resources with pagination', async () => {
      const start = Date.now();
      
      const [resources, count] = await Promise.all([
        prisma.resource.findMany({
          where: { tenantId: testTenantId, deletedAt: null },
          include: {
            practice: true,
            location: true,
            skills: { include: { skill: true }, take: 3 },
          },
          skip: 0,
          take: 20,
        }),
        prisma.resource.count({
          where: { tenantId: testTenantId, deletedAt: null },
        }),
      ]);

      const duration = Date.now() - start;
      
      expect(resources).toBeDefined();
      expect(count).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1000); // Should be under 1 second
    });
  });
});
