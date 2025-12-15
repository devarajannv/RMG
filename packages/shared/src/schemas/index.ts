// Zod schemas shared between frontend and backend

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().max(255).toLowerCase();

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

// ============================================================================
// Resource Schemas
// ============================================================================

export const employmentTypeSchema = z.enum(['fte', 'contractor', 'intern']);

export const resourceStatusSchema = z.enum(['active', 'inactive', 'notice']);

export const createResourceSchema = z.object({
  employeeId: z.string().min(1).max(50),
  email: emailSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  employmentType: employmentTypeSchema,
  band: z.string().min(1).max(10),
  designation: z.string().min(1).max(100),
  dateOfJoining: z.coerce.date(),
  practiceId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  managerId: uuidSchema.optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

// ============================================================================
// Project Schemas
// ============================================================================

export const projectTypeSchema = z.enum(['billable', 'internal', 'presales', 'support']);

export const projectStatusSchema = z.enum([
  'pipeline',
  'active',
  'on_hold',
  'completed',
  'cancelled',
]);

export const billingTypeSchema = z.enum(['tm', 'fixed', 'retainer', 'milestone', 'hybrid']);

export const createProjectSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().min(1).max(200),
  type: projectTypeSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  clientId: uuidSchema.optional(),
  contractId: uuidSchema.optional(),
  managerId: uuidSchema.optional(),
  practiceId: uuidSchema.optional(),
  billingType: billingTypeSchema.optional(),
  budgetHours: z.number().positive().optional(),
  budgetAmount: z.number().positive().optional(),
});

// ============================================================================
// Allocation Schemas
// ============================================================================

export const allocationStatusSchema = z.enum([
  'proposed',
  'confirmed',
  'active',
  'completed',
  'cancelled',
]);

export const createAllocationSchema = z.object({
  resourceId: uuidSchema,
  projectId: uuidSchema,
  role: z.string().min(1).max(100),
  percentage: z.number().int().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isBillable: z.boolean().default(true),
  billRate: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// ============================================================================
// Contract Schemas
// ============================================================================

export const contractTypeSchema = z.enum(['msa', 'sow', 'amendment', 'nda', 'other']);

export const contractStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'active',
  'expired',
  'terminated',
  'renewed',
]);

export const createContractSchema = z.object({
  clientId: uuidSchema,
  contractNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: contractTypeSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  value: z.number().positive().optional(),
  billingType: billingTypeSchema,
  paymentTerms: z.string().max(50).optional(),
});

// ============================================================================
// Timesheet Schemas
// ============================================================================

export const timesheetStatusSchema = z.enum([
  'draft',
  'submitted',
  'approved',
  'rejected',
  'invoiced',
]);

export const createTimesheetEntrySchema = z.object({
  resourceId: uuidSchema,
  projectId: uuidSchema,
  allocationId: uuidSchema.optional(),
  date: z.coerce.date(),
  hours: z.number().min(0.25).max(24),
  taskType: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  isBillable: z.boolean().default(true),
  isOvertime: z.boolean().default(false),
});

// ============================================================================
// Type Exports
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CreateTimesheetEntryInput = z.infer<typeof createTimesheetEntrySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;


