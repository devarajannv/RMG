/**
 * People Service
 * 
 * Handles Phase 4 of Organization Onboarding: People Setup
 * - Resource management
 * - User invitations
 * - Bulk import
 */

import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { hashPassword } from '../../lib/password';
import crypto from 'crypto';
import type { ResourceStatus, EmploymentType, InviteStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface ResourceInput {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employmentType?: EmploymentType;
  band?: string;
  designation?: string;
  dateOfJoining?: Date;
  departmentId?: string;
  practiceId?: string;
  locationId?: string;
  managerId?: string;
  gradeBandId?: string;
  capacity?: number;
}

export interface InvitationInput {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  resourceId?: string;
  message?: string;
}

// =============================================================================
// RESOURCES
// =============================================================================

/**
 * Get all resources
 */
export async function getResources(
  tenantId: string,
  options?: {
    status?: ResourceStatus;
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const where: any = {
    tenantId,
    deletedAt: null,
    ...(options?.status && { status: options.status }),
    ...(options?.departmentId && { departmentId: options.departmentId }),
  };
  
  if (options?.search) {
    where.OR = [
      { firstName: { contains: options.search, mode: 'insensitive' } },
      { lastName: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
      { employeeId: { contains: options.search, mode: 'insensitive' } },
    ];
  }
  
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      include: {
        deptRef: { select: { id: true, code: true, name: true } },
        practice: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        gradeBand: { select: { id: true, code: true, name: true } },
        user: { select: { id: true, email: true, status: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.resource.count({ where }),
  ]);
  
  return { data, total };
}

/**
 * Get resource by ID
 */
export async function getResourceById(tenantId: string, resourceId: string) {
  return prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
    include: {
      deptRef: true,
      practice: true,
      location: true,
      manager: { select: { id: true, firstName: true, lastName: true, email: true } },
      gradeBand: true,
      user: { select: { id: true, email: true, status: true } },
    },
  });
}

/**
 * Create resource
 */
export async function createResource(tenantId: string, input: ResourceInput) {
  logger.info('Creating resource', { tenantId, email: input.email });
  
  const resource = await prisma.resource.create({
    data: {
      tenantId,
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      employmentType: input.employmentType || 'FTE',
      band: input.band || 'G1',
      designation: input.designation || 'Employee',
      dateOfJoining: input.dateOfJoining || new Date(),
      departmentId: input.departmentId,
      practiceId: input.practiceId,
      locationId: input.locationId,
      managerId: input.managerId,
      gradeBandId: input.gradeBandId,
      capacity: input.capacity ?? 100,
    },
    include: {
      deptRef: { select: { id: true, code: true, name: true } },
    },
  });
  
  logger.info('Resource created', { resourceId: resource.id });
  return resource;
}

/**
 * Update resource
 */
export async function updateResource(
  tenantId: string,
  resourceId: string,
  input: Partial<ResourceInput & { status: ResourceStatus }>
) {
  logger.info('Updating resource', { tenantId, resourceId });
  
  return prisma.resource.update({
    where: { id: resourceId },
    data: {
      ...(input.firstName && { firstName: input.firstName }),
      ...(input.lastName && { lastName: input.lastName }),
      ...(input.email && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.employmentType && { employmentType: input.employmentType }),
      ...(input.band && { band: input.band }),
      ...(input.designation && { designation: input.designation }),
      ...(input.dateOfJoining && { dateOfJoining: input.dateOfJoining }),
      ...(input.departmentId !== undefined && { departmentId: input.departmentId }),
      ...(input.practiceId !== undefined && { practiceId: input.practiceId }),
      ...(input.locationId !== undefined && { locationId: input.locationId }),
      ...(input.managerId !== undefined && { managerId: input.managerId }),
      ...(input.gradeBandId !== undefined && { gradeBandId: input.gradeBandId }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.status && { status: input.status }),
    },
  });
}

/**
 * Delete resource (soft delete)
 */
export async function deleteResource(tenantId: string, resourceId: string) {
  logger.info('Deleting resource', { tenantId, resourceId });
  
  await prisma.resource.update({
    where: { id: resourceId },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });
}

// =============================================================================
// USER ACCOUNTS
// =============================================================================

/**
 * Create user account for a resource
 */
export async function createUserForResource(
  tenantId: string,
  input: { resourceId: string; roleId: string; password?: string },
  createdBy: string
) {
  logger.info('Creating user for resource', { tenantId, resourceId: input.resourceId });
  
  const resource = await prisma.resource.findFirst({
    where: { id: input.resourceId, tenantId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  
  if (!resource) {
    throw new Error('Resource not found');
  }
  
  const existingUser = await prisma.user.findFirst({
    where: { tenantId, email: resource.email },
  });
  
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  const password = input.password || generateTemporaryPassword();
  const passwordHash = await hashPassword(password);
  
  const user = await prisma.user.create({
    data: {
      tenantId,
      resourceId: input.resourceId,
      email: resource.email,
      passwordHash,
      firstName: resource.firstName,
      lastName: resource.lastName,
      status: 'ACTIVE',
      emailVerified: false,
    },
  });
  
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: input.roleId,
      assignedBy: createdBy,
    },
  });
  
  logger.info('User created for resource', { userId: user.id, resourceId: input.resourceId });
  
  return { user, temporaryPassword: password };
}

// =============================================================================
// INVITATIONS
// =============================================================================

/**
 * Send invitation
 */
export async function sendInvitation(tenantId: string, input: InvitationInput, invitedBy: string) {
  logger.info('Sending invitation', { tenantId, email: input.email });
  
  const existingUser = await prisma.user.findFirst({
    where: { tenantId, email: input.email },
  });
  
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const invitation = await prisma.userInvitation.create({
    data: {
      tenantId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      roleId: input.roleId,
      resourceId: input.resourceId,
      token,
      expiresAt,
      invitedBy,
      message: input.message,
    },
    include: {
      role: { select: { id: true, name: true } },
    },
  });
  
  logger.info('Invitation created', { invitationId: invitation.id });
  
  return {
    ...invitation,
    inviteUrl: `/accept-invite?token=${token}`,
  };
}

/**
 * Get invitations
 */
export async function getInvitations(tenantId: string, status?: InviteStatus) {
  return prisma.userInvitation.findMany({
    where: {
      tenantId,
      ...(status && { status }),
    },
    include: {
      role: { select: { id: true, name: true } },
    },
    orderBy: { invitedAt: 'desc' },
  });
}

/**
 * Revoke invitation
 */
export async function revokeInvitation(tenantId: string, invitationId: string) {
  logger.info('Revoking invitation', { tenantId, invitationId });
  
  await prisma.userInvitation.update({
    where: { id: invitationId },
    data: { status: 'REVOKED' },
  });
}

/**
 * Accept invitation (public endpoint)
 */
export async function acceptInvitation(token: string, password: string) {
  logger.info('Accepting invitation');
  
  const invitation = await prisma.userInvitation.findFirst({
    where: { token, status: 'PENDING' },
    include: { tenant: true },
  });
  
  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }
  
  if (invitation.expiresAt < new Date()) {
    await prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Invitation has expired');
  }
  
  const passwordHash = await hashPassword(password);
  
  const user = await prisma.user.create({
    data: {
      tenantId: invitation.tenantId,
      resourceId: invitation.resourceId,
      email: invitation.email,
      passwordHash,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: invitation.roleId,
      assignedBy: invitation.invitedBy,
    },
  });
  
  await prisma.userInvitation.update({
    where: { id: invitation.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });
  
  logger.info('Invitation accepted', { userId: user.id });
  
  return { user, tenantSlug: invitation.tenant.slug };
}

// =============================================================================
// IMPORT/EXPORT
// =============================================================================

/**
 * Validate import data
 */
export async function validateImport(tenantId: string, rows: any[]) {
  const errors: { row: number; field: string; message: string }[] = [];
  
  const existingResources = await prisma.resource.findMany({
    where: { tenantId },
    select: { employeeId: true, email: true },
  });
  
  const existingIds = new Set(existingResources.map(r => r.employeeId));
  const existingEmails = new Set(existingResources.map(r => r.email.toLowerCase()));
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    
    if (!row.employeeId) errors.push({ row: rowNum, field: 'employeeId', message: 'Required' });
    if (!row.firstName) errors.push({ row: rowNum, field: 'firstName', message: 'Required' });
    if (!row.lastName) errors.push({ row: rowNum, field: 'lastName', message: 'Required' });
    if (!row.email) errors.push({ row: rowNum, field: 'email', message: 'Required' });
    
    if (row.employeeId && existingIds.has(row.employeeId)) {
      errors.push({ row: rowNum, field: 'employeeId', message: 'Already exists' });
    }
    if (row.email && existingEmails.has(row.email.toLowerCase())) {
      errors.push({ row: rowNum, field: 'email', message: 'Already exists' });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Import resources
 */
export async function importResources(tenantId: string, rows: any[]) {
  logger.info('Importing resources', { tenantId, count: rows.length });
  
  let created = 0;
  const errors: string[] = [];
  
  for (const row of rows) {
    try {
      if (!row.employeeId || !row.firstName || !row.lastName || !row.email) {
        errors.push(`Row missing required fields`);
        continue;
      }
      
      await createResource(tenantId, {
        employeeId: row.employeeId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        employmentType: row.employmentType,
        band: row.band,
        designation: row.designation,
        dateOfJoining: row.dateOfJoining ? new Date(row.dateOfJoining) : undefined,
      });
      created++;
    } catch (error: any) {
      // LOG-06: Don't expose internal error details to users
      logger.error('Import row failed', { employeeId: row.employeeId, error: error.message });
      errors.push(`${row.employeeId}: Failed to process — duplicate or invalid data`);
    }
  }
  
  logger.info('Import completed', { created, errors: errors.length });
  
  return { created, errors };
}

/**
 * Export resources
 */
export async function exportResources(tenantId: string) {
  const resources = await prisma.resource.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { employeeId: 'asc' },
  });
  
  return resources.map(r => ({
    employeeId: r.employeeId,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    phone: r.phone,
    employmentType: r.employmentType,
    band: r.band,
    designation: r.designation,
    dateOfJoining: r.dateOfJoining.toISOString().split('T')[0],
  }));
}

/**
 * Get people stats
 */
export async function getPeopleStats(tenantId: string) {
  const [active, inactive, withUsers, pending] = await Promise.all([
    prisma.resource.count({ where: { tenantId, deletedAt: null, status: 'ACTIVE' } }),
    prisma.resource.count({ where: { tenantId, deletedAt: null, status: { not: 'ACTIVE' } } }),
    prisma.resource.count({ where: { tenantId, deletedAt: null, user: { some: {} } } }),
    prisma.userInvitation.count({ where: { tenantId, status: 'PENDING' } }),
  ]);
  
  return {
    total: active + inactive,
    active,
    inactive,
    withUserAccounts: withUsers,
    pendingInvitations: pending,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function generateTemporaryPassword(length = 16): string {
  const { randomBytes } = require('crypto');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}
