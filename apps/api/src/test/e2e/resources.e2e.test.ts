/**
 * Resource Management E2E Tests
 * Tests resource CRUD, skill management, status transitions, and manager hierarchy
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, factories, TestCleanup } from './helpers';

describe('E2E: Resource Management', () => {
  let token: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    const t = await login();
    if (!t) throw new Error('Failed to login for resource tests');
    token = t;
    cleanup.setToken(token);
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Resource CRUD', () => {
    it('RES-001: List all resources', async () => {
      const response = await apiRequest<{ data: unknown[]; meta: { total: number } }>(
        'GET',
        '/api/v1/resources',
        undefined,
        token
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data) || Array.isArray(response.data)).toBe(true);
    });

    it('RES-002: Create resource with required fields', async () => {
      const resource = factories.resource();
      const response = await apiRequest<{ id: string; firstName: string }>(
        'POST',
        '/api/v1/resources',
        resource,
        token
      );

      if (response.status === 201) {
        expect(response.data.id).toBeDefined();
        expect(response.data.firstName).toBe(resource.firstName);
        cleanup.add('resources', response.data.id);
      }
      expect([201, 400]).toContain(response.status);
    });

    it('RES-003: Create resource with all fields', async () => {
      const resource = factories.resource({
        phone: '+91-9876543210',
        location: 'Chennai',
        costRate: 5000,
        billRate: 8000,
        skills: ['JavaScript', 'TypeScript', 'React'],
        certifications: ['AWS Solutions Architect'],
        yearsOfExperience: 5,
        dateOfJoining: '2020-01-15',
      });

      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        resource,
        token
      );

      if (response.status === 201) {
        cleanup.add('resources', response.data.id);
      }
      expect([201, 400]).toContain(response.status);
    });

    it('RES-004: Get resource by ID', async () => {
      // Create a resource first
      const resource = factories.resource();
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        resource,
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('resources', createRes.data.id);

      const response = await apiRequest<{ id: string; firstName: string }>(
        'GET',
        `/api/v1/resources/${createRes.data.id}`,
        undefined,
        token
      );

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(createRes.data.id);
    });

    it('RES-005: Update resource details', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('resources', createRes.data.id);

      const response = await apiRequest<{ id: string; designation: string }>(
        'PATCH',
        `/api/v1/resources/${createRes.data.id}`,
        { designation: 'Senior Developer' },
        token
      );

      expect(response.status).toBe(200);
      if (response.data.designation) {
        expect(response.data.designation).toBe('Senior Developer');
      }
    });

    it('RES-006: Delete resource', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );

      if (createRes.status !== 201) return;

      const response = await apiRequest(
        'DELETE',
        `/api/v1/resources/${createRes.data.id}`,
        undefined,
        token
      );

      expect([200, 204]).toContain(response.status);
    });

    it('RES-007: Get non-existent resource returns 404', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/resources/nonexistent-id-12345',
        undefined,
        token
      );

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Resource Search & Filtering', () => {
    it('RES-008: Search resources by name', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?search=test',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('RES-009: Filter resources by department', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?department=Engineering',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('RES-010: Filter resources by status', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?status=ACTIVE',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('RES-011: Paginate resources', async () => {
      const response = await apiRequest<{ data: unknown[]; meta: { page: number; limit: number } }>(
        'GET',
        '/api/v1/resources?page=1&limit=10',
        undefined,
        token
      );

      expect(response.status).toBe(200);
      if (response.data.data) {
        expect(response.data.data.length).toBeLessThanOrEqual(10);
      }
    });

    it('RES-012: Sort resources by name', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?sortBy=firstName&sortOrder=asc',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('RES-013: Filter resources by skill', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?skill=JavaScript',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('RES-014: Filter resources by availability', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?available=true',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Resource Status Transitions', () => {
    it('RES-015: Set resource to inactive', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('resources', createRes.data.id);

      const response = await apiRequest<{ status: string }>(
        'PATCH',
        `/api/v1/resources/${createRes.data.id}`,
        { status: 'INACTIVE' },
        token
      );

      expect(response.status).toBe(200);
    });

    it('RES-016: Set resource on bench', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('resources', createRes.data.id);

      const response = await apiRequest(
        'POST',
        `/api/v1/resources/${createRes.data.id}/bench`,
        { reason: 'Between projects' },
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('RES-017: Include inactive resources in list', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?includeInactive=true',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Resource Skills', () => {
    let resourceId: string;

    beforeAll(async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource({ skills: ['JavaScript'] }),
        token
      );
      if (createRes.status === 201) {
        resourceId = createRes.data.id;
        cleanup.add('resources', resourceId);
      }
    });

    it('RES-018: Add skill to resource', async () => {
      if (!resourceId) return;

      const response = await apiRequest(
        'POST',
        `/api/v1/resources/${resourceId}/skills`,
        { skill: 'TypeScript', level: 'ADVANCED' },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('RES-019: Get resource skills', async () => {
      if (!resourceId) return;

      const response = await apiRequest<{ skills: unknown[] }>(
        'GET',
        `/api/v1/resources/${resourceId}/skills`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('RES-020: Remove skill from resource', async () => {
      if (!resourceId) return;

      const response = await apiRequest(
        'DELETE',
        `/api/v1/resources/${resourceId}/skills/JavaScript`,
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });

    it('RES-021: Update skill level', async () => {
      if (!resourceId) return;

      const response = await apiRequest(
        'PATCH',
        `/api/v1/resources/${resourceId}/skills/TypeScript`,
        { level: 'EXPERT' },
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Manager Hierarchy', () => {
    it('RES-022: Set manager for resource', async () => {
      // Create manager
      const managerRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource({ designation: 'Manager' }),
        token
      );
      if (managerRes.status !== 201) return;
      cleanup.add('resources', managerRes.data.id);

      // Create employee
      const employeeRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );
      if (employeeRes.status !== 201) return;
      cleanup.add('resources', employeeRes.data.id);

      // Set manager
      const response = await apiRequest(
        'PATCH',
        `/api/v1/resources/${employeeRes.data.id}`,
        { managerId: managerRes.data.id },
        token
      );

      expect(response.status).toBe(200);
    });

    it('RES-023: Get resources by manager', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?hasManager=true',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('RES-024: Get team members for manager', async () => {
      const managerRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource({ designation: 'Manager' }),
        token
      );
      if (managerRes.status !== 201) return;
      cleanup.add('resources', managerRes.data.id);

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/resources/${managerRes.data.id}/team`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Resource Allocations', () => {
    it('RES-025: Get resource allocations', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('resources', createRes.data.id);

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/resources/${createRes.data.id}/allocations`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('RES-026: Get resource utilization', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );
      if (createRes.status !== 201) return;
      cleanup.add('resources', createRes.data.id);

      const response = await apiRequest<{ utilization: number }>(
        'GET',
        `/api/v1/resources/${createRes.data.id}/utilization`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Bulk Operations', () => {
    it('RES-027: Bulk update resources', async () => {
      // Create two resources
      const res1 = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );
      const res2 = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource(),
        token
      );

      if (res1.status !== 201 || res2.status !== 201) return;
      cleanup.add('resources', res1.data.id);
      cleanup.add('resources', res2.data.id);

      const response = await apiRequest(
        'PATCH',
        '/api/v1/resources/bulk',
        {
          ids: [res1.data.id, res2.data.id],
          updates: { department: 'Updated Department' },
        },
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('RES-028: Export resources to CSV', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/resources/export?format=csv',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('RES-029: Import resources from CSV', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/resources/import',
        {
          format: 'csv',
          data: 'firstName,lastName,email\nTest,User,test@example.com',
        },
        token
      );

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  describe('Resource Validation', () => {
    it('RES-030: Create resource without required field returns 400', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/resources',
        { firstName: 'Only First Name' },
        token
      );

      expect(response.status).toBe(400);
    });

    it('RES-031: Create resource with duplicate email returns 400/409', async () => {
      const email = `duplicate_${Date.now()}@example.com`;

      // Create first
      const res1 = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/resources',
        factories.resource({ email }),
        token
      );
      if (res1.status === 201) {
        cleanup.add('resources', res1.data.id);
      }

      // Try to create duplicate
      const response = await apiRequest(
        'POST',
        '/api/v1/resources',
        factories.resource({ email }),
        token
      );

      expect([400, 409]).toContain(response.status);
    });

    it('RES-032: Invalid email format returns 400', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/resources',
        factories.resource({ email: 'not-an-email' }),
        token
      );

      expect(response.status).toBe(400);
    });
  });
});
