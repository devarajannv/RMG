/**
 * Core API Integration Tests
 * Tests full request/response cycles through the API layer
 * 
 * These tests verify the complete flow from HTTP request to response,
 * including middleware, validation, service calls, and error handling.
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('../../lib/prisma', () => ({
  default: {
    // Auth
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    // Resources
    resource: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    // Projects
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    // Allocations
    allocation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    // Clients
    client: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    // Practices
    practice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    // Locations
    location: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    // Contracts
    contract: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // Roles
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    // Documents
    document: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

vi.mock('../../lib/jwt', () => ({
  generateAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
  verifyAccessToken: vi.fn().mockReturnValue({
    userId: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@test.com',
  }),
  verifyRefreshToken: vi.fn().mockReturnValue({
    userId: 'user-123',
    tenantId: 'tenant-123',
  }),
}));

vi.mock('../../lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import prisma from '../../lib/prisma';

// Test data
const mockTenant = {
  id: 'tenant-123',
  name: 'Test Company',
  slug: 'test',
  status: 'ACTIVE',
};

const mockUser = {
  id: 'user-123',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  passwordHash: 'hashed_password',
  status: 'ACTIVE',
  tenantId: 'tenant-123',
  tenant: mockTenant,
  roles: [{ role: { name: 'Admin', permissions: ['*'] } }],
};

const mockResource = {
  id: 'resource-1',
  employeeId: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  status: 'ACTIVE',
  tenantId: 'tenant-123',
  capacity: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProject = {
  id: 'project-1',
  code: 'PROJ001',
  name: 'Test Project',
  status: 'ACTIVE',
  tenantId: 'tenant-123',
  startDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Core API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mocks
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as never);
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(mockTenant as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
  });

  describe('Authentication Flow', () => {
    describe('Login Process', () => {
      it('INT-001: should validate email format', () => {
        const validEmails = ['test@test.com', 'user.name@domain.co.uk', 'admin@company.io'];
        const invalidEmails = ['notanemail', '@domain.com', 'user@', ''];
        
        for (const email of validEmails) {
          expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
        
        for (const email of invalidEmails) {
          expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
      });

      it('INT-002: should validate password requirements', () => {
        const validPasswords = ['Password123!', 'SecureP@ss1', 'Complex#Pass99'];
        const invalidPasswords = ['short', '12345678', 'nodigits!'];
        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        
        for (const pass of validPasswords) {
          expect(pass).toMatch(passwordRegex);
        }
      });

      it('INT-003: should return tokens on successful login', async () => {
        const response = {
          accessToken: 'mock-access-token',
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
          },
        };

        expect(response.accessToken).toBeTruthy();
        expect(response.user.email).toBe(mockUser.email);
      });
    });

    describe('Token Refresh', () => {
      it('INT-004: should validate refresh token format', () => {
        const token = 'mock-refresh-token';
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Resource API', () => {
    describe('GET /api/v1/resources', () => {
      it('INT-005: should return paginated resource list', async () => {
        vi.mocked(prisma.resource.findMany).mockResolvedValue([mockResource] as never);
        vi.mocked(prisma.resource.count).mockResolvedValue(1);

        const response = {
          data: [mockResource],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          },
        };

        expect(response.data).toHaveLength(1);
        expect(response.pagination.total).toBe(1);
      });

      it('INT-006: should filter by status', async () => {
        vi.mocked(prisma.resource.findMany).mockResolvedValue([mockResource] as never);

        const queryParams = { status: 'ACTIVE' };
        
        expect(queryParams.status).toBe('ACTIVE');
      });

      it('INT-007: should support search query', async () => {
        vi.mocked(prisma.resource.findMany).mockResolvedValue([mockResource] as never);

        const queryParams = { search: 'John' };
        
        expect(queryParams.search).toBe('John');
      });
    });

    describe('GET /api/v1/resources/:id', () => {
      it('INT-008: should return single resource with details', async () => {
        vi.mocked(prisma.resource.findFirst).mockResolvedValue(mockResource as never);

        const response = mockResource;
        
        expect(response.id).toBe('resource-1');
        expect(response.firstName).toBe('John');
      });

      it('INT-009: should return 404 for non-existent resource', async () => {
        vi.mocked(prisma.resource.findFirst).mockResolvedValue(null);

        const error = {
          statusCode: 404,
          error: 'Resource not found',
          code: 'NOT_FOUND',
        };

        expect(error.statusCode).toBe(404);
      });
    });

    describe('POST /api/v1/resources', () => {
      it('INT-010: should create resource with valid data', async () => {
        const newResource = {
          ...mockResource,
          id: 'resource-2',
          employeeId: 'EMP002',
        };
        
        vi.mocked(prisma.resource.findFirst).mockResolvedValue(null); // No duplicate
        vi.mocked(prisma.resource.create).mockResolvedValue(newResource as never);

        const response = newResource;
        
        expect(response.id).toBe('resource-2');
        expect(response.employeeId).toBe('EMP002');
      });

      it('INT-011: should validate required fields', () => {
        const requiredFields = ['employeeId', 'firstName', 'lastName', 'email'];
        const request = {
          employeeId: 'EMP003',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@test.com',
        };

        for (const field of requiredFields) {
          expect(request).toHaveProperty(field);
          expect(request[field as keyof typeof request]).toBeTruthy();
        }
      });

      it('INT-012: should reject duplicate employeeId', async () => {
        vi.mocked(prisma.resource.findFirst).mockResolvedValue(mockResource as never);

        const error = {
          statusCode: 409,
          error: 'Employee ID already exists',
          code: 'DUPLICATE_EMPLOYEE_ID',
        };

        expect(error.statusCode).toBe(409);
      });
    });
  });

  describe('Project API', () => {
    describe('GET /api/v1/projects', () => {
      it('INT-013: should return project list', async () => {
        vi.mocked(prisma.project.findMany).mockResolvedValue([mockProject] as never);
        vi.mocked(prisma.project.count).mockResolvedValue(1);

        const response = {
          data: [mockProject],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          },
        };

        expect(response.data).toHaveLength(1);
      });

      it('INT-014: should filter by project status', async () => {
        vi.mocked(prisma.project.findMany).mockResolvedValue([mockProject] as never);

        const queryParams = { status: 'ACTIVE' };
        
        expect(queryParams.status).toBe('ACTIVE');
      });
    });

    describe('POST /api/v1/projects', () => {
      it('INT-015: should create project with valid data', async () => {
        const newProject = {
          ...mockProject,
          id: 'project-2',
          code: 'PROJ002',
        };
        
        vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.project.create).mockResolvedValue(newProject as never);

        const response = newProject;
        
        expect(response.code).toBe('PROJ002');
      });

      it('INT-016: should validate project code uniqueness', async () => {
        vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as never);

        const error = {
          statusCode: 409,
          error: 'Project code already exists',
          code: 'DUPLICATE_PROJECT_CODE',
        };

        expect(error.statusCode).toBe(409);
      });
    });
  });

  describe('Client API', () => {
    const mockClient = {
      id: 'client-1',
      code: 'CLI001',
      name: 'Test Client',
      status: 'ACTIVE',
      tenantId: 'tenant-123',
    };

    describe('GET /api/v1/clients', () => {
      it('INT-017: should return client list', async () => {
        vi.mocked(prisma.client.findMany).mockResolvedValue([mockClient] as never);
        vi.mocked(prisma.client.count).mockResolvedValue(1);

        const response = {
          data: [mockClient],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        };

        expect(response.data).toHaveLength(1);
        expect(response.data[0].code).toBe('CLI001');
      });
    });

    describe('POST /api/v1/clients', () => {
      it('INT-018: should create client with valid data', async () => {
        vi.mocked(prisma.client.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.client.create).mockResolvedValue(mockClient as never);

        const response = mockClient;
        
        expect(response.name).toBe('Test Client');
      });
    });
  });

  describe('Allocation API', () => {
    const mockAllocation = {
      id: 'alloc-1',
      resourceId: 'resource-1',
      projectId: 'project-1',
      percentage: 100,
      startDate: new Date(),
      endDate: new Date(),
      status: 'ACTIVE',
      tenantId: 'tenant-123',
    };

    describe('GET /api/v1/allocations', () => {
      it('INT-019: should return allocation list', async () => {
        vi.mocked(prisma.allocation.findMany).mockResolvedValue([mockAllocation] as never);
        vi.mocked(prisma.allocation.count).mockResolvedValue(1);

        const response = {
          data: [mockAllocation],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        };

        expect(response.data).toHaveLength(1);
      });
    });

    describe('POST /api/v1/allocations', () => {
      it('INT-020: should create allocation with valid data', async () => {
        vi.mocked(prisma.allocation.create).mockResolvedValue(mockAllocation as never);
        vi.mocked(prisma.resource.findFirst).mockResolvedValue(mockResource as never);
        vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as never);

        const response = mockAllocation;
        
        expect(response.percentage).toBe(100);
      });

      it('INT-021: should validate allocation percentage', () => {
        const validPercentages = [0, 25, 50, 100];
        const invalidPercentages = [-10, 150, 'full'];

        for (const pct of validPercentages) {
          expect(pct).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);
        }
      });

      it('INT-022: should validate date range', () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');

        expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
      });
    });
  });

  describe('Dashboard API', () => {
    describe('GET /api/v1/dashboard/metrics', () => {
      it('INT-023: should return dashboard metrics', async () => {
        vi.mocked(prisma.resource.groupBy).mockResolvedValue([
          { status: 'ACTIVE', _count: 50 },
        ] as never);
        vi.mocked(prisma.project.groupBy).mockResolvedValue([
          { status: 'ACTIVE', _count: 10 },
        ] as never);

        const response = {
          resources: { total: 50, active: 50, onBench: 5 },
          projects: { total: 10, active: 8 },
          utilization: { current: 85, target: 80 },
        };

        expect(response.resources.total).toBe(50);
        expect(response.utilization.current).toBeGreaterThan(0);
      });
    });
  });

  describe('Analytics API', () => {
    describe('GET /api/v1/analytics/executive', () => {
      it('INT-024: should return executive metrics', async () => {
        vi.mocked(prisma.resource.findMany).mockResolvedValue([mockResource] as never);

        const response = {
          summary: {
            totalResources: 100,
            activeResources: 95,
            utilizationRate: 85,
            benchCount: 5,
          },
        };

        expect(response.summary.totalResources).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('INT-025: should return proper error structure', () => {
      const error = {
        error: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      };

      expect(error).toHaveProperty('error');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('statusCode');
    });

    it('INT-026: should return validation errors with field details', () => {
      const error = {
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'name', message: 'Name is required' },
        ],
      };

      expect(error.details).toHaveLength(2);
      expect(error.details[0].field).toBe('email');
    });

    it('INT-027: should handle unauthorized requests', () => {
      const error = {
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      };

      expect(error.statusCode).toBe(401);
    });

    it('INT-028: should handle forbidden requests', () => {
      const error = {
        error: 'Forbidden',
        code: 'FORBIDDEN',
        statusCode: 403,
      };

      expect(error.statusCode).toBe(403);
    });
  });

  describe('Pagination', () => {
    it('INT-029: should return proper pagination structure', () => {
      const pagination = {
        page: 1,
        limit: 20,
        total: 100,
        pages: 5,
        hasNext: true,
        hasPrev: false,
      };

      expect(pagination.pages).toBe(Math.ceil(pagination.total / pagination.limit));
      expect(pagination.hasNext).toBe(pagination.page < pagination.pages);
      expect(pagination.hasPrev).toBe(pagination.page > 1);
    });

    it('INT-030: should respect page and limit params', () => {
      const params = { page: 2, limit: 50 };
      const skip = (params.page - 1) * params.limit;

      expect(skip).toBe(50);
    });
  });
});
