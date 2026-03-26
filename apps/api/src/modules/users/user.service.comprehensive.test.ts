/**
 * User Service - Comprehensive Tests
 * Tests all user management functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userService from './user.service';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  default: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    role: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password_123'),
  isPasswordReused: vi.fn().mockResolvedValue(false),
  recordPasswordHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/redis', () => ({
  invalidateAllUserTokens: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

import prisma from '../../lib/prisma';
import { hashPassword } from '../../lib/password';

describe('User Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockUser = {
    id: mockUserId,
    email: 'john@test.com',
    firstName: 'John',
    lastName: 'Doe',
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2025-01-01'),
    emailVerified: true,
    mfaEnabled: false,
    roles: [
      {
        roleId: 'role-1',
        role: { id: 'role-1', name: 'Admin' },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('USER-001: should return list of active users by default', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never);

      const result = await userService.listUsers(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('john@test.com');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            deletedAt: null,
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('USER-002: should include inactive users when requested', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never);

      await userService.listUsers(mockTenantId, true);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            deletedAt: null,
          }),
        })
      );
      // Should NOT have status filter
      const call = vi.mocked(prisma.user.findMany).mock.calls[0][0];
      expect(call?.where).not.toHaveProperty('status');
    });

    it('USER-003: should include user roles in response', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never);

      const result = await userService.listUsers(mockTenantId);

      expect(result[0].roles).toHaveLength(1);
      expect(result[0].roles[0].role.name).toBe('Admin');
    });

    it('USER-004: should order users by first name then last name', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      await userService.listUsers(mockTenantId);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        })
      );
    });

    it('USER-005: should exclude deleted users', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      await userService.listUsers(mockTenantId);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it('USER-006: should return empty array when no users exist', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const result = await userService.listUsers(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('USER-007: should return user details by ID', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

      const result = await userService.getUserById(mockUserId, mockTenantId);

      expect(result).toBeTruthy();
      expect(result?.id).toBe(mockUserId);
      expect(result?.email).toBe('john@test.com');
    });

    it('USER-008: should return null for non-existent user', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const result = await userService.getUserById('non-existent', mockTenantId);

      expect(result).toBeNull();
    });

    it('USER-009: should include MFA and email verification status', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

      const result = await userService.getUserById(mockUserId, mockTenantId);

      expect(result?.emailVerified).toBe(true);
      expect(result?.mfaEnabled).toBe(false);
    });

    it('USER-010: should filter by tenant for security', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await userService.getUserById(mockUserId, mockTenantId);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockUserId,
            tenantId: mockTenantId,
            deletedAt: null,
          }),
        })
      );
    });
  });

  // Note: getUserByEmail function not exported from service - testing via auth module instead

  describe('createUser', () => {
    const createInput = {
      email: 'new@test.com',
      firstName: 'New',
      lastName: 'User',
      password: 'SecurePass123!',
      status: 'ACTIVE' as const,
      roleIds: ['role-1'],
    };

    it('USER-013: should create user with hashed password', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.role.findMany).mockResolvedValue([{ id: 'role-1' }] as never);
      vi.mocked(prisma.user.create).mockResolvedValue({ ...mockUser, id: 'new-user' } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.createUser(mockTenantId, createInput);

      expect(hashPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: 'hashed_password_123',
          }),
        })
      );
    });

    it('USER-014: should throw error if email already exists', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

      await expect(userService.createUser(mockTenantId, createInput))
        .rejects.toThrow('A user with this email already exists');
    });

    it('USER-015: should assign roles during creation', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.role.findMany).mockResolvedValue([{ id: 'role-1' }] as never);
      vi.mocked(prisma.user.create).mockResolvedValue({ ...mockUser, id: 'new-user' } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.createUser(mockTenantId, createInput);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roles: {
              create: [{ roleId: 'role-1', assignedBy: expect.any(String) }],
            },
          }),
        })
      );
    });

    it('USER-016: should set default status to ACTIVE', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.role.findMany).mockResolvedValue([{ id: 'role-1' }] as never);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.createUser(mockTenantId, {
        ...createInput,
        status: undefined,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('USER-016A: should reject cross-tenant roleIds during creation', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.role.findMany).mockResolvedValue([] as never);

      await expect(userService.createUser(mockTenantId, createInput)).rejects.toThrow(
        'One or more roleIds are invalid for this tenant'
      );
    });
  });

  describe('updateUser', () => {
    it('USER-017: should update user fields', async () => {
      vi.mocked(prisma.user.findFirst)
        .mockResolvedValueOnce({ id: mockUserId } as never)
        .mockResolvedValueOnce(mockUser as never);
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.updateUser(mockUserId, mockTenantId, {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: mockUserId, tenantId: mockTenantId }),
          data: expect.objectContaining({
            firstName: 'Updated',
            lastName: 'Name',
          }),
        })
      );
    });

    it('USER-018: should throw error if new email already exists', async () => {
      vi.mocked(prisma.user.findFirst)
        .mockResolvedValueOnce({ id: mockUserId } as never)
        .mockResolvedValueOnce(mockUser as never);

      await expect(userService.updateUser(mockUserId, mockTenantId, {
        email: 'existing@test.com',
      })).rejects.toThrow('A user with this email already exists');
    });

    it('USER-019: should allow updating status', async () => {
      vi.mocked(prisma.user.findFirst)
        .mockResolvedValueOnce({ id: mockUserId } as never)
        .mockResolvedValueOnce(mockUser as never);
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.updateUser(mockUserId, mockTenantId, {
        status: 'INACTIVE',
      });

      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'INACTIVE',
          }),
        })
      );
    });

    it('USER-019A: should throw error when user is outside tenant scope', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(
        userService.updateUser(mockUserId, mockTenantId, {
          firstName: 'Updated',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('USER-020: should soft delete user', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.deleteUser(mockUserId, mockTenantId);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            status: 'INACTIVE',
          }),
        })
      );
    });

    it('USER-021: should throw error if user not found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(userService.deleteUser('non-existent', mockTenantId))
        .rejects.toThrow('User not found');
    });
  });

  describe('toggleUserStatus', () => {
    it('USER-022: should toggle from ACTIVE to INACTIVE', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, status: 'INACTIVE' } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await userService.toggleUserStatus(mockUserId, mockTenantId);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'INACTIVE' },
        })
      );
    });

    it('USER-023: should toggle from INACTIVE to ACTIVE', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ ...mockUser, status: 'INACTIVE' } as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.toggleUserStatus(mockUserId, mockTenantId);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ACTIVE' },
        })
      );
    });

    it('USER-024: should throw error if user not found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(userService.toggleUserStatus('non-existent', mockTenantId))
        .rejects.toThrow('User not found');
    });
  });

  describe('assignRoleToUser', () => {
    it('USER-025: should assign role to user', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.role.findFirst).mockResolvedValue({ id: 'role-1' } as never);
      vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.userRole.create).mockResolvedValue({} as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.assignRoleToUser(mockUserId, 'role-1', 'admin-1', mockTenantId);

      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          roleId: 'role-1',
          assignedBy: 'admin-1',
        },
      });
    });

    it('USER-026: should throw error if role already assigned', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.role.findFirst).mockResolvedValue({ id: 'role-1' } as never);
      vi.mocked(prisma.userRole.findFirst).mockResolvedValue({ id: 'existing' } as never);

      await expect(userService.assignRoleToUser(mockUserId, 'role-1', 'admin-1', mockTenantId))
        .rejects.toThrow('User already has this role');
    });
  });

  describe('removeRoleFromUser', () => {
    it('USER-027: should remove role from user', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.userRole.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.removeRoleFromUser(mockUserId, 'role-1', mockTenantId);

      expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, roleId: 'role-1' },
      });
    });
  });

  describe('resetUserPassword', () => {
    it('USER-028: should reset user password', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await userService.resetUserPassword(mockUserId, mockTenantId, 'NewPassword123!');

      expect(hashPassword).toHaveBeenCalledWith('NewPassword123!');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { passwordHash: 'hashed_password_123' },
        })
      );
    });

    it('USER-029: should throw error if user not found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(userService.resetUserPassword('non-existent', mockTenantId, 'NewPass'))
        .rejects.toThrow('User not found');
    });
  });
});
