/**
 * User Service
 * Full user management: CRUD, role assignment, status management
 */

import prisma from '../../lib/prisma';
import { hashPassword } from '../../lib/password';

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
  status?: string;
  roleIds?: string[];
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
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

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      status: (data.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      roles: data.roleIds?.length
        ? {
            create: data.roleIds.map((roleId) => ({
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

  return user;
}

// Update user details
export async function updateUser(
  userId: string,
  tenantId: string,
  data: UpdateUserInput
): Promise<UserListItem> {
  // If email is being changed, check it doesn't already exist
  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: { tenantId, email: data.email, id: { not: userId }, deletedAt: null },
    });
    if (existing) {
      throw new Error('A user with this email already exists');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.email && { email: data.email }),
      ...(data.status && { status: data.status as 'ACTIVE' | 'INACTIVE' }),
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
}

// Assign role to user
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy: string
): Promise<void> {
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
}

// Remove role from user
export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  await prisma.userRole.deleteMany({
    where: { userId, roleId },
  });
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

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
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

  return prisma.user.update({
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
}
