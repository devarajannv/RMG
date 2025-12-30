/**
 * API Contract Tests
 * Validates that API responses match expected schemas
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ============================================================================
// Schema Definitions - These define the API contract
// ============================================================================

// Common schemas
const PaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pages: z.number().int().nonnegative(),
});

const TimestampSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

// Health endpoint
const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
});

// Auth schemas
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  tenantId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']),
});

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  user: UserSchema,
  expiresIn: z.number().optional(),
});

const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1),
});

// Resource schemas
const ResourceStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'NOTICE', 'TERMINATED']);

const ResourceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  employeeId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  status: ResourceStatusSchema,
  designation: z.string().nullable().optional(),
  band: z.string().nullable().optional(),
  joiningDate: z.string().datetime().nullable().optional(),
  capacity: z.number().int().default(100),
  practiceId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
}).merge(TimestampSchema.partial());

const ResourceListResponseSchema = z.object({
  data: z.array(ResourceSchema),
  pagination: PaginationSchema,
});

const CreateResourceRequestSchema = z.object({
  employeeId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  status: ResourceStatusSchema.optional(),
  designation: z.string().optional(),
  band: z.string().optional(),
  joiningDate: z.string().datetime().optional(),
  practiceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

// Project schemas
const ProjectStatusSchema = z.enum(['PIPELINE', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);
const HealthStatusSchema = z.enum(['GREEN', 'YELLOW', 'RED']).nullable();

const ProjectSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  status: ProjectStatusSchema,
  healthStatus: HealthStatusSchema.optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  clientId: z.string().uuid(),
}).merge(TimestampSchema.partial());

const ProjectListResponseSchema = z.object({
  data: z.array(ProjectSchema),
  pagination: PaginationSchema,
});

// Allocation schemas
const AllocationStatusSchema = z.enum(['PROPOSED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']);

const AllocationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  resourceId: z.string().uuid(),
  projectId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  percentage: z.number().int().min(0).max(100),
  status: AllocationStatusSchema,
  isBillable: z.boolean(),
}).merge(TimestampSchema.partial());

// Request Flow schemas
const RequestStatusSchema = z.enum([
  'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'IN_PROGRESS',
  'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'RETURNED'
]);
const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const RequestSchema = z.object({
  id: z.string().uuid(),
  requestNumber: z.string(),
  tenantId: z.string().uuid(),
  typeId: z.string().uuid().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: RequestStatusSchema,
  priority: PrioritySchema,
  requesterId: z.string().uuid(),
  requestData: z.record(z.unknown()),
}).merge(TimestampSchema.partial());

const RequestListResponseSchema = z.object({
  data: z.array(RequestSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

const CreateRequestSchema = z.object({
  typeCode: z.string(),
  title: z.string(),
  description: z.string().optional(),
  requestData: z.record(z.unknown()),
  priority: PrioritySchema.optional(),
});

// Dashboard schemas
const DashboardMetricsSchema = z.object({
  resources: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    onBench: z.number().int().nonnegative(),
    inNotice: z.number().int().nonnegative(),
    contractors: z.number().int().nonnegative(),
  }),
  utilization: z.object({
    current: z.number(),
    target: z.number(),
    billable: z.number(),
    nonBillable: z.number(),
  }).partial(),
  projects: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    pipeline: z.number().int().nonnegative(),
    atRisk: z.number().int().nonnegative(),
  }),
  allocations: z.object({
    active: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    rolloffsNext30Days: z.number().int().nonnegative(),
  }),
});

// ============================================================================
// Contract Tests
// ============================================================================

describe('API Contract Tests', () => {
  describe('Schema Validation - Health Endpoint', () => {
    it('CONTRACT-001: Health response should match schema', () => {
      const validResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      };

      const result = HealthResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-002: Health response should reject invalid status', () => {
      const invalidResponse = {
        status: 'broken', // Invalid status
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      };

      const result = HealthResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Validation - Auth Endpoints', () => {
    it('CONTRACT-003: Login request should validate email and password', () => {
      const validRequest = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };

      const result = LoginRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-004: Login request should reject invalid email', () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: 'SecurePass123!',
      };

      const result = LoginRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('CONTRACT-005: Login request should reject short password', () => {
      const invalidRequest = {
        email: 'user@example.com',
        password: 'short',
      };

      const result = LoginRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('CONTRACT-006: Login response should contain token and user', () => {
      const validResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          tenantId: '550e8400-e29b-41d4-a716-446655440001',
          status: 'ACTIVE',
        },
      };

      const result = LoginResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-007: Register request should validate all fields', () => {
      const validRequest = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        organizationName: 'New Company',
      };

      const result = RegisterRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('Schema Validation - Resource Endpoints', () => {
    it('CONTRACT-008: Resource should match schema', () => {
      const validResource = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        status: 'ACTIVE',
        designation: 'Senior Developer',
        band: 'B4',
        capacity: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = ResourceSchema.safeParse(validResource);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-009: Resource list response should match schema', () => {
      const validResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            tenantId: '550e8400-e29b-41d4-a716-446655440001',
            employeeId: 'EMP001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            status: 'ACTIVE',
            capacity: 100,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      const result = ResourceListResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-010: Create resource request should validate required fields', () => {
      const validRequest = {
        employeeId: 'EMP002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      };

      const result = CreateResourceRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-011: Resource should reject invalid status', () => {
      const invalidResource = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'UNKNOWN_STATUS', // Invalid
        capacity: 100,
      };

      const result = ResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Validation - Project Endpoints', () => {
    it('CONTRACT-012: Project should match schema', () => {
      const validProject = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        code: 'PROJ001',
        name: 'Project Alpha',
        status: 'ACTIVE',
        healthStatus: 'GREEN',
        clientId: '550e8400-e29b-41d4-a716-446655440002',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      };

      const result = ProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-013: Project should allow null health status', () => {
      const validProject = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        code: 'PROJ001',
        name: 'Project Alpha',
        status: 'PIPELINE',
        healthStatus: null, // null is valid for pipeline projects
        clientId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = ProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });
  });

  describe('Schema Validation - Allocation Endpoints', () => {
    it('CONTRACT-014: Allocation should match schema', () => {
      const validAllocation = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        resourceId: '550e8400-e29b-41d4-a716-446655440002',
        projectId: '550e8400-e29b-41d4-a716-446655440003',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        percentage: 100,
        status: 'ACTIVE',
        isBillable: true,
      };

      const result = AllocationSchema.safeParse(validAllocation);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-015: Allocation percentage must be 0-100', () => {
      const invalidAllocation = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        resourceId: '550e8400-e29b-41d4-a716-446655440002',
        projectId: '550e8400-e29b-41d4-a716-446655440003',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        percentage: 150, // Invalid - over 100
        status: 'ACTIVE',
        isBillable: true,
      };

      const result = AllocationSchema.safeParse(invalidAllocation);
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Validation - Request Flow Endpoints', () => {
    it('CONTRACT-016: Request should match schema', () => {
      const validRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        requestNumber: 'TST-2025-00001',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Onboard New Resource',
        status: 'DRAFT',
        priority: 'MEDIUM',
        requesterId: '550e8400-e29b-41d4-a716-446655440002',
        requestData: { resourceName: 'John', startDate: '2025-01-15' },
      };

      const result = RequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-017: Request list response should match schema', () => {
      const validResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            requestNumber: 'TST-2025-00001',
            tenantId: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Test Request',
            status: 'SUBMITTED',
            priority: 'HIGH',
            requesterId: '550e8400-e29b-41d4-a716-446655440002',
            requestData: {},
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      const result = RequestListResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-018: Create request should validate required fields', () => {
      const validRequest = {
        typeCode: 'RESOURCE_ONBOARDING',
        title: 'Onboard John Doe',
        requestData: {
          resourceName: 'John Doe',
          startDate: '2025-01-15',
        },
        priority: 'MEDIUM',
      };

      const result = CreateRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-019: Request should reject invalid status', () => {
      const invalidRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        requestNumber: 'TST-2025-00001',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test',
        status: 'INVALID_STATUS', // Not a valid status
        priority: 'MEDIUM',
        requesterId: '550e8400-e29b-41d4-a716-446655440002',
        requestData: {},
      };

      const result = RequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Validation - Dashboard Endpoints', () => {
    it('CONTRACT-020: Dashboard metrics should match schema', () => {
      const validMetrics = {
        resources: {
          total: 100,
          active: 90,
          onBench: 10,
          inNotice: 2,
          contractors: 15,
        },
        utilization: {
          current: 85.5,
          target: 85,
          billable: 80,
          nonBillable: 5.5,
        },
        projects: {
          total: 25,
          active: 20,
          pipeline: 3,
          atRisk: 2,
        },
        allocations: {
          active: 150,
          pending: 10,
          rolloffsNext30Days: 5,
        },
      };

      const result = DashboardMetricsSchema.safeParse(validMetrics);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-021: Dashboard should reject negative counts', () => {
      const invalidMetrics = {
        resources: {
          total: -1, // Invalid - negative
          active: 90,
          onBench: 10,
          inNotice: 2,
          contractors: 15,
        },
        projects: {
          total: 25,
          active: 20,
          pipeline: 3,
          atRisk: 2,
        },
        allocations: {
          active: 150,
          pending: 10,
          rolloffsNext30Days: 5,
        },
      };

      const result = DashboardMetricsSchema.safeParse(invalidMetrics);
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Validation - Error Responses', () => {
    it('CONTRACT-022: Error response should match schema', () => {
      const validError = {
        error: 'Resource not found',
        code: 'NOT_FOUND',
        details: { id: '123' },
      };

      const result = ErrorResponseSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('CONTRACT-023: Simple error response should be valid', () => {
      const simpleError = {
        error: 'Something went wrong',
      };

      const result = ErrorResponseSchema.safeParse(simpleError);
      expect(result.success).toBe(true);
    });
  });
});

// Export schemas for use in other tests
export {
  HealthResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  UserSchema,
  ResourceSchema,
  ResourceListResponseSchema,
  CreateResourceRequestSchema,
  ProjectSchema,
  ProjectListResponseSchema,
  AllocationSchema,
  RequestSchema,
  RequestListResponseSchema,
  CreateRequestSchema,
  DashboardMetricsSchema,
  ErrorResponseSchema,
  PaginationSchema,
};
