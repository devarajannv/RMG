/**
 * Onboarding Zod Schemas
 * Input validation for all organization onboarding endpoints
 */

import { z } from 'zod';

// =============================================================================
// PROGRESS & ORCHESTRATION
// =============================================================================

export const completeStepSchema = z.object({
  phase: z.number().int().min(1).max(10),
  stepCode: z.string().min(1).max(100),
}).strict();

export const skipStepSchema = completeStepSchema;

export const initializeDefaultsSchema = z.object({
  departments: z.boolean().optional(),
  businessRoles: z.boolean().optional(),
  gradeBands: z.boolean().optional(),
  delegationRules: z.boolean().optional(),
});

// =============================================================================
// PHASE 1: IDENTITY
// =============================================================================

export const upsertProfileSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  legalName: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  subIndustry: z.string().max(100).optional(),
  companySize: z.string().max(50).optional(),
  website: z.string().url().max(500).optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  taxId: z.string().max(100).optional(),
  registrationNumber: z.string().max(100).optional(),
  // Address
  addressLine1: z.string().max(500).optional(),
  addressLine2: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  state: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
});

export const updateBrandingSchema = z.object({
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal('')),
  faviconUrl: z.string().url().max(500).optional().or(z.literal('')),
  fontFamily: z.string().max(100).optional(),
});

export const updateRegionalSettingsSchema = z.object({
  timezone: z.string().max(100).optional(),
  dateFormat: z.string().max(50).optional(),
  timeFormat: z.string().max(50).optional(),
  currency: z.string().max(10).optional(),
  language: z.string().max(10).optional(),
  numberFormat: z.string().max(50).optional(),
});

// =============================================================================
// PHASE 2: STRUCTURE
// =============================================================================

export const createDepartmentSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional(),
  headId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createTeamSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  departmentId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const createCostCenterSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  status: z.string().max(50).optional(),
});

export const updateCostCenterSchema = createCostCenterSchema.partial();

// =============================================================================
// PHASE 3: BUSINESS ROLES
// =============================================================================

export const createBusinessRoleSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  level: z.number().int().min(0).optional(),
  gradeBandId: z.string().uuid().optional().nullable(),
  permissions: z.array(z.string().max(100)).optional(),
  status: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateBusinessRoleSchema = createBusinessRoleSchema.partial();

export const createGradeBandSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  level: z.number().int().min(0),
  minSalary: z.number().min(0).optional(),
  maxSalary: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  status: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateGradeBandSchema = createGradeBandSchema.partial();

// =============================================================================
// PHASE 4: PEOPLE
// =============================================================================

export const createResourceSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  employeeId: z.string().max(50).optional(),
  title: z.string().max(200).optional(),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  businessRoleId: z.string().uuid().optional(),
  gradeBandId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  status: z.string().max(50).optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const createUserForResourceSchema = z.object({
  resourceId: z.string().uuid(),
  email: z.string().email().max(255),
  password: z.string().min(12).max(128).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  sendInvitation: z.boolean().optional(),
});

export const sendInvitationSchema = z.object({
  email: z.string().email().max(255),
  resourceId: z.string().uuid().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  message: z.string().max(2000).optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1).max(500),
  password: z.string().min(12).max(128),
}).strict();

export const importRowsSchema = z.object({
  rows: z.array(z.record(z.unknown())).min(1).max(10000),
});

// =============================================================================
// PHASE 5: GOVERNANCE
// =============================================================================

export const createDelegationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  delegatorRoleId: z.string().uuid().optional(),
  delegateRoleId: z.string().uuid().optional(),
  maxDurationDays: z.number().int().min(1).max(365).optional(),
  requiresApproval: z.boolean().optional(),
  approverRoleId: z.string().uuid().optional().nullable(),
  allowedScopes: z.array(z.string().max(100)).optional(),
  conditions: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const updateDelegationRuleSchema = createDelegationRuleSchema.partial();
