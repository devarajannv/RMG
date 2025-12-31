/**
 * Structure Service
 * 
 * Handles Phase 2 of Organization Onboarding: Organization Structure
 * - Departments
 * - Teams
 * - Cost Centers
 */

import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { EntityStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface DepartmentInput {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  headId?: string;
  costCenterId?: string;
}

export interface TeamInput {
  code: string;
  name: string;
  description?: string;
  departmentId: string;
  leadId?: string;
}

export interface CostCenterInput {
  code: string;
  name: string;
  description?: string;
  managerId?: string;
  budget?: number;
  budgetCurrency?: string;
  fiscalYear?: number;
}

// =============================================================================
// DEPARTMENTS
// =============================================================================

/**
 * Get all departments
 */
export async function getDepartments(tenantId: string) {
  return prisma.department.findMany({
    where: { tenantId, status: 'ACTIVE' },
    include: {
      parent: { select: { id: true, code: true, name: true } },
      head: { select: { id: true, firstName: true, lastName: true } },
      costCenter: { select: { id: true, code: true, name: true } },
      _count: { select: { teams: true, children: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Get department by ID
 */
export async function getDepartmentById(tenantId: string, id: string) {
  return prisma.department.findFirst({
    where: { id, tenantId },
    include: {
      parent: true,
      head: true,
      costCenter: true,
      teams: { where: { status: 'ACTIVE' } },
    },
  });
}

/**
 * Create department
 */
export async function createDepartment(tenantId: string, input: DepartmentInput) {
  logger.info('Creating department', { tenantId, code: input.code });
  
  const maxOrder = await prisma.department.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });
  
  const department = await prisma.department.create({
    data: {
      tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      parentId: input.parentId,
      headId: input.headId,
      costCenterId: input.costCenterId,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
    include: {
      parent: { select: { id: true, code: true, name: true } },
    },
  });
  
  logger.info('Department created', { departmentId: department.id });
  return department;
}

/**
 * Update department
 */
export async function updateDepartment(tenantId: string, id: string, input: Partial<DepartmentInput & { status: EntityStatus }>) {
  logger.info('Updating department', { tenantId, id });
  
  return prisma.department.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
      ...(input.headId !== undefined && { headId: input.headId }),
      ...(input.costCenterId !== undefined && { costCenterId: input.costCenterId }),
      ...(input.status && { status: input.status }),
    },
  });
}

/**
 * Delete department (soft delete)
 */
export async function deleteDepartment(tenantId: string, id: string) {
  logger.info('Deleting department', { tenantId, id });
  
  return prisma.department.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}

// =============================================================================
// TEAMS
// =============================================================================

/**
 * Get all teams
 */
export async function getTeams(tenantId: string, departmentId?: string) {
  return prisma.team.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      ...(departmentId && { departmentId }),
    },
    include: {
      department: { select: { id: true, code: true, name: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { members: true } },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Create team
 */
export async function createTeam(tenantId: string, input: TeamInput) {
  logger.info('Creating team', { tenantId, code: input.code });
  
  const team = await prisma.team.create({
    data: {
      tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      departmentId: input.departmentId,
      leadId: input.leadId,
    },
    include: {
      department: { select: { id: true, code: true, name: true } },
    },
  });
  
  logger.info('Team created', { teamId: team.id });
  return team;
}

/**
 * Update team
 */
export async function updateTeam(tenantId: string, id: string, input: Partial<TeamInput & { status: EntityStatus }>) {
  logger.info('Updating team', { tenantId, id });
  
  return prisma.team.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.departmentId && { departmentId: input.departmentId }),
      ...(input.leadId !== undefined && { leadId: input.leadId }),
      ...(input.status && { status: input.status }),
    },
  });
}

/**
 * Delete team (soft delete)
 */
export async function deleteTeam(tenantId: string, id: string) {
  logger.info('Deleting team', { tenantId, id });
  
  return prisma.team.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}

// =============================================================================
// COST CENTERS
// =============================================================================

/**
 * Get all cost centers
 */
export async function getCostCenters(tenantId: string) {
  return prisma.costCenter.findMany({
    where: { tenantId, status: 'ACTIVE' },
    include: {
      manager: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { departments: true } },
    },
    orderBy: { code: 'asc' },
  });
}

/**
 * Create cost center
 */
export async function createCostCenter(tenantId: string, input: CostCenterInput) {
  logger.info('Creating cost center', { tenantId, code: input.code });
  
  const costCenter = await prisma.costCenter.create({
    data: {
      tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      managerId: input.managerId,
      budget: input.budget,
      budgetCurrency: input.budgetCurrency || 'INR',
      fiscalYear: input.fiscalYear,
    },
  });
  
  logger.info('Cost center created', { costCenterId: costCenter.id });
  return costCenter;
}

/**
 * Update cost center
 */
export async function updateCostCenter(tenantId: string, id: string, input: Partial<CostCenterInput & { status: EntityStatus }>) {
  logger.info('Updating cost center', { tenantId, id });
  
  return prisma.costCenter.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.managerId !== undefined && { managerId: input.managerId }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.budgetCurrency && { budgetCurrency: input.budgetCurrency }),
      ...(input.fiscalYear !== undefined && { fiscalYear: input.fiscalYear }),
      ...(input.status && { status: input.status }),
    },
  });
}

/**
 * Delete cost center (soft delete)
 */
export async function deleteCostCenter(tenantId: string, id: string) {
  logger.info('Deleting cost center', { tenantId, id });
  
  return prisma.costCenter.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}

// =============================================================================
// SEEDING
// =============================================================================

const DEFAULT_DEPARTMENTS = [
  { code: 'ENGR', name: 'Engineering', description: 'Software engineering and development' },
  { code: 'QA', name: 'Quality Assurance', description: 'Testing and quality control' },
  { code: 'PM', name: 'Project Management', description: 'Project and program management' },
  { code: 'SALES', name: 'Sales', description: 'Sales and business development' },
  { code: 'HR', name: 'Human Resources', description: 'People operations' },
  { code: 'FIN', name: 'Finance', description: 'Finance and accounting' },
];

/**
 * Seed default departments
 */
export async function seedDefaultDepartments(tenantId: string) {
  logger.info('Seeding default departments', { tenantId });
  
  const created: any[] = [];
  
  for (const dept of DEFAULT_DEPARTMENTS) {
    const existing = await prisma.department.findFirst({
      where: { tenantId, code: dept.code },
    });
    
    if (!existing) {
      const newDept = await createDepartment(tenantId, dept);
      created.push(newDept);
    }
  }
  
  return created;
}

/**
 * Get structure summary
 */
export async function getStructureSummary(tenantId: string) {
  const [departments, teams, costCenters] = await Promise.all([
    prisma.department.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.team.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.costCenter.count({ where: { tenantId, status: 'ACTIVE' } }),
  ]);
  
  return { departments, teams, costCenters };
}
