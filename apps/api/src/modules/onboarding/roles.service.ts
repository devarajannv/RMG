/**
 * Business Roles Service
 * 
 * Handles Phase 3 of Organization Onboarding: Business Roles
 * - Business role management
 * - Grade bands
 * - Role assignments
 */

import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { RoleCategory, GradeLevel, EntityStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface BusinessRoleInput {
  code: string;
  name: string;
  description?: string;
  category?: RoleCategory;
  level?: GradeLevel;
  canApprove?: boolean;
  canManage?: boolean;
  canBillable?: boolean;
  competencies?: string[];
}

export interface GradeBandInput {
  code: string;
  name: string;
  level: number;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  billRateMin?: number;
  billRateMax?: number;
}

// =============================================================================
// BUSINESS ROLES
// =============================================================================

/**
 * Get all business roles
 */
export async function getBusinessRoles(tenantId: string) {
  return prisma.businessRole.findMany({
    where: { tenantId, status: 'ACTIVE' },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
}

/**
 * Get business role by ID
 */
export async function getBusinessRoleById(tenantId: string, id: string) {
  return prisma.businessRole.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Create business role
 */
export async function createBusinessRole(tenantId: string, input: BusinessRoleInput) {
  logger.info('Creating business role', { tenantId, code: input.code });
  
  const maxOrder = await prisma.businessRole.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });
  
  const role = await prisma.businessRole.create({
    data: {
      tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      category: input.category || 'INDIVIDUAL',
      level: input.level,
      canApprove: input.canApprove ?? false,
      canManage: input.canManage ?? false,
      canBillable: input.canBillable ?? true,
      competencies: input.competencies || [],
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
  });
  
  logger.info('Business role created', { roleId: role.id });
  return role;
}

/**
 * Update business role
 */
export async function updateBusinessRole(
  tenantId: string,
  id: string,
  input: Partial<BusinessRoleInput & { status: EntityStatus }>
) {
  logger.info('Updating business role', { tenantId, id });
  
  return prisma.businessRole.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category && { category: input.category }),
      ...(input.level !== undefined && { level: input.level }),
      ...(input.canApprove !== undefined && { canApprove: input.canApprove }),
      ...(input.canManage !== undefined && { canManage: input.canManage }),
      ...(input.canBillable !== undefined && { canBillable: input.canBillable }),
      ...(input.competencies && { competencies: input.competencies }),
      ...(input.status && { status: input.status }),
    },
  });
}

/**
 * Delete business role (soft delete)
 */
export async function deleteBusinessRole(tenantId: string, id: string) {
  logger.info('Deleting business role', { tenantId, id });
  
  return prisma.businessRole.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}

// =============================================================================
// GRADE BANDS
// =============================================================================

/**
 * Get all grade bands
 */
export async function getGradeBands(tenantId: string) {
  return prisma.gradeBand.findMany({
    where: { tenantId },
    orderBy: { level: 'asc' },
  });
}

/**
 * Create grade band
 */
export async function createGradeBand(tenantId: string, input: GradeBandInput) {
  logger.info('Creating grade band', { tenantId, code: input.code });
  
  const gradeBand = await prisma.gradeBand.create({
    data: {
      tenantId,
      code: input.code,
      name: input.name,
      level: input.level,
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
      currency: input.currency || 'INR',
      billRateMin: input.billRateMin,
      billRateMax: input.billRateMax,
    },
  });
  
  logger.info('Grade band created', { gradeBandId: gradeBand.id });
  return gradeBand;
}

/**
 * Update grade band
 */
export async function updateGradeBand(tenantId: string, id: string, input: Partial<GradeBandInput>) {
  logger.info('Updating grade band', { tenantId, id });
  
  return prisma.gradeBand.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.level !== undefined && { level: input.level }),
      ...(input.minSalary !== undefined && { minSalary: input.minSalary }),
      ...(input.maxSalary !== undefined && { maxSalary: input.maxSalary }),
      ...(input.currency && { currency: input.currency }),
      ...(input.billRateMin !== undefined && { billRateMin: input.billRateMin }),
      ...(input.billRateMax !== undefined && { billRateMax: input.billRateMax }),
    },
  });
}

/**
 * Delete grade band
 */
export async function deleteGradeBand(tenantId: string, id: string) {
  logger.info('Deleting grade band', { tenantId, id });
  
  await prisma.gradeBand.delete({ where: { id } });
}

// =============================================================================
// ROLE ASSIGNMENTS
// =============================================================================

/**
 * Assign business role to resource
 */
export async function assignRoleToResource(
  resourceId: string,
  businessRoleId: string,
  assignedBy: string,
  isPrimary: boolean = false
) {
  logger.info('Assigning role to resource', { resourceId, businessRoleId });
  
  const effectiveFrom = new Date();
  
  // If setting as primary, unset other primary roles first
  if (isPrimary) {
    await prisma.resourceBusinessRole.updateMany({
      where: { resourceId, isPrimary: true },
      data: { isPrimary: false },
    });
  }
  
  return prisma.resourceBusinessRole.upsert({
    where: {
      resourceId_businessRoleId_effectiveFrom: { resourceId, businessRoleId, effectiveFrom },
    },
    create: {
      resourceId,
      businessRoleId,
      assignedBy,
      isPrimary,
      effectiveFrom,
    },
    update: {
      isPrimary,
    },
  });
}

/**
 * Remove role from resource
 */
export async function removeRoleFromResource(resourceId: string, businessRoleId: string) {
  logger.info('Removing role from resource', { resourceId, businessRoleId });
  
  await prisma.resourceBusinessRole.deleteMany({
    where: {
      resourceId,
      businessRoleId,
    },
  });
}

/**
 * Get roles for a resource
 */
export async function getResourceRoles(resourceId: string) {
  return prisma.resourceBusinessRole.findMany({
    where: { resourceId },
    include: {
      businessRole: true,
    },
  });
}

// =============================================================================
// SEEDING
// =============================================================================

const DEFAULT_BUSINESS_ROLES: Omit<BusinessRoleInput, 'tenantId'>[] = [
  { code: 'DEV', name: 'Software Developer', category: 'INDIVIDUAL', level: 'L3', canBillable: true },
  { code: 'SR_DEV', name: 'Senior Developer', category: 'INDIVIDUAL', level: 'L4', canBillable: true },
  { code: 'LEAD', name: 'Tech Lead', category: 'DELIVERY', level: 'L5', canBillable: true, canManage: true },
  { code: 'ARCH', name: 'Architect', category: 'INDIVIDUAL', level: 'L6', canBillable: true },
  { code: 'PM', name: 'Project Manager', category: 'DELIVERY', level: 'L5', canManage: true, canApprove: true },
  { code: 'QA', name: 'QA Engineer', category: 'INDIVIDUAL', level: 'L3', canBillable: true },
  { code: 'SR_QA', name: 'Senior QA Engineer', category: 'INDIVIDUAL', level: 'L4', canBillable: true },
  { code: 'BA', name: 'Business Analyst', category: 'INDIVIDUAL', level: 'L4', canBillable: true },
  { code: 'EM', name: 'Engineering Manager', category: 'MANAGEMENT', level: 'L6', canManage: true, canApprove: true },
  { code: 'DIR', name: 'Director', category: 'LEADERSHIP', level: 'L7', canManage: true, canApprove: true },
];

const DEFAULT_GRADE_BANDS: Omit<GradeBandInput, 'tenantId'>[] = [
  { code: 'G1', name: 'Entry Level', level: 1 },
  { code: 'G2', name: 'Junior', level: 2 },
  { code: 'G3', name: 'Mid Level', level: 3 },
  { code: 'G4', name: 'Senior', level: 4 },
  { code: 'G5', name: 'Staff', level: 5 },
  { code: 'G6', name: 'Principal', level: 6 },
  { code: 'G7', name: 'Director', level: 7 },
  { code: 'G8', name: 'VP', level: 8 },
];

/**
 * Seed default business roles
 */
export async function seedDefaultBusinessRoles(tenantId: string) {
  logger.info('Seeding default business roles', { tenantId });
  
  const created: any[] = [];
  
  for (const role of DEFAULT_BUSINESS_ROLES) {
    const existing = await prisma.businessRole.findFirst({
      where: { tenantId, code: role.code },
    });
    
    if (!existing) {
      const newRole = await createBusinessRole(tenantId, role);
      created.push(newRole);
    }
  }
  
  return created;
}

/**
 * Seed default grade bands
 */
export async function seedDefaultGradeBands(tenantId: string) {
  logger.info('Seeding default grade bands', { tenantId });
  
  const created: any[] = [];
  
  for (const band of DEFAULT_GRADE_BANDS) {
    const existing = await prisma.gradeBand.findFirst({
      where: { tenantId, code: band.code },
    });
    
    if (!existing) {
      const newBand = await createGradeBand(tenantId, band);
      created.push(newBand);
    }
  }
  
  return created;
}

/**
 * Get roles summary
 */
export async function getRolesSummary(tenantId: string) {
  const [roles, gradeBands] = await Promise.all([
    prisma.businessRole.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.gradeBand.count({ where: { tenantId } }),
  ]);
  
  return { businessRoles: roles, gradeBands };
}
