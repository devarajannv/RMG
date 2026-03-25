/**
 * User Service
 * Full user management: CRUD, role assignment, status management
 */

import prisma from '../../lib/prisma';
import { hashPassword, isPasswordReused, recordPasswordHistory } from '../../lib/password';
import { invalidateAllUserTokens } from '../../lib/redis';
import { logger } from '../../lib/logger';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  roles: { roleId: string; role: { id: string; name: string } }[];
}

export interface UserDetail extends UserListItem {
  phone?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  roleIds?: string[];
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
}

// List all users with their roles
export async function listUsers(tenantId: string, includeInactive = false): Promise<UserListItem[]> {
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(includeInactive ? {} : { status: 'ACTIVE' }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      roles: {
        select: {
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return users;
}

// Get single user by ID
export async function getUserById(userId: string, tenantId: string): Promise<UserDetail | null> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerified: true,
      mfaEnabled: true,
      roles: {
        select: {
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return user;
}

// Create a new user
export async function createUser(tenantId: string, data: CreateUserInput): Promise<UserListItem> {
  // Check if email already exists
  const existing = await prisma.user.findFirst({
    where: { tenantId, email: data.email, deletedAt: null },
  });
  if (existing) {
    throw new Error('A user with this email already exists');
  }

  const passwordHash = await hashPassword(data.password);
  const roleIds = data.roleIds?.length ? [...new Set(data.roleIds)] : [];

  if (roleIds.length > 0) {
    const tenantRoles = await prisma.role.findMany({
      where: {
        tenantId,
        id: {
          in: roleIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (tenantRoles.length !== roleIds.length) {
      throw new Error('One or more roleIds are invalid for this tenant');
    }
  }

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      status: data.status || 'ACTIVE',
      roles: roleIds.length
        ? {
            create: roleIds.map((roleId) => ({
              roleId,
              assignedBy: tenantId, // System assigned
            })),
          }
        : undefined,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      roles: {
        select: {
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // C-03: Audit log for user creation
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      userId: user.id,
      tenantId,
      entityType: 'User',
      entityId: user.id,
      changes: { email: data.email, firstName: data.firstName, lastName: data.lastName },
    },
  });

  return user;
}

// Update user details
export async function updateUser(
  userId: string,
  tenantId: string,
  data: UpdateUserInput
): Promise<UserListItem> {
  const existingUser = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existingUser) {
    throw new Error('User not found');
  }

  // If email is being changed, check it doesn't already exist
  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: { tenantId, email: data.email, id: { not: userId }, deletedAt: null },
    });
    if (existing) {
      throw new Error('A user with this email already exists');
    }
  }

  const updateResult = await prisma.user.updateMany({
    where: { id: userId, tenantId, deletedAt: null },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.email && { email: data.email }),
      ...(data.status && { status: data.status }),
    },
  });

  if (updateResult.count === 0) {
    throw new Error('User not found');
  }

  // C-03: Audit log for user update
  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      userId,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: data as Record<string, unknown>,
    },
  });

  const user = await getUserById(userId, tenantId);
  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

// Delete user (soft delete)
export async function deleteUser(userId: string, tenantId: string): Promise<void> {
  // Ensure user belongs to tenant before deleting
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
  if (!user) {
    throw new Error('User not found');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });

  // C-03: Audit log for user deletion
  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      userId,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: { softDelete: true },
    },
  });

  // Invalidate deleted user's sessions
  await invalidateAllUserTokens(userId);
}

// Assign role to user
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy: string,
  tenantId: string
): Promise<void> {
  // Verify user belongs to the caller's tenant
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
  if (!user) {
    throw new Error('User not found');
  }

  // M-24: Verify role belongs to the same tenant
  const role = await prisma.role.findFirst({
    where: { id: roleId, tenantId },
  });
  if (!role) {
    throw new Error('Role not found in tenant');
  }

  // Check if already assigned
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId },
  });
  if (existing) {
    throw new Error('User already has this role');
  }

  await prisma.userRole.create({
    data: {
      userId,
      roleId,
      assignedBy,
    },
  });

  // C-07: Force-logout on role change — user gets new JWT with updated roles on re-login
  await invalidateAllUserTokens(userId);

  // C-03: Audit log for role assignment
  await prisma.auditLog.create({
    data: {
      action: 'ROLE_ASSIGNED',
      userId: assignedBy,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: { roleId },
    },
  });

  logger.info('Role assigned with session invalidation', { userId, roleId, assignedBy });
}

// Remove role from user
export async function removeRoleFromUser(userId: string, roleId: string, tenantId: string): Promise<void> {
  // Verify user belongs to the caller's tenant
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
  if (!user) {
    throw new Error('User not found');
  }

  await prisma.userRole.deleteMany({
    where: { userId, roleId },
  });

  // C-07: Force-logout on role removal — user gets new JWT with updated roles on re-login
  await invalidateAllUserTokens(userId);

  // C-03: Audit log for role removal
  await prisma.auditLog.create({
    data: {
      action: 'ROLE_REMOVED',
      userId,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: { roleId },
    },
  });

  logger.info('Role removed with session invalidation', { userId, roleId });
}

// Reset user password
export async function resetUserPassword(
  userId: string,
  tenantId: string,
  newPassword: string
): Promise<void> {
  // Ensure user belongs to tenant before resetting password
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
  if (!user) {
    throw new Error('User not found');
  }

  // C-12: Check password history to prevent reuse
  const reused = await isPasswordReused(userId, newPassword);
  if (reused) {
    throw new Error('Password has been used recently. Please choose a different password.');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // C-12: Record in password history
  await recordPasswordHistory(userId, passwordHash);

  // C-02: Force-logout — invalidate all existing sessions after password reset
  await invalidateAllUserTokens(userId);

  // C-03: Audit log for password reset
  await prisma.auditLog.create({
    data: {
      action: 'PASSWORD_RESET',
      userId,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: { method: 'admin_reset' },
    },
  });

  logger.info('Password reset with session invalidation', { userId, tenantId });
}

// Toggle user status
export async function toggleUserStatus(userId: string, tenantId: string): Promise<UserListItem> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
  if (!user) {
    throw new Error('User not found');
  }

  const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      roles: {
        select: {
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // C-03: Audit log for status toggle
  await prisma.auditLog.create({
    data: {
      action: 'USER_STATUS_CHANGED' as any,
      userId,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: { oldStatus: user.status, newStatus },
    },
  });

  // If deactivated, invalidate all sessions
  if (newStatus === 'INACTIVE') {
    await invalidateAllUserTokens(userId);
  }

  return updated;
}
