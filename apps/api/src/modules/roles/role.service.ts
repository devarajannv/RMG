import { PrismaClient } from '@prisma/client';
import { invalidateAllUserTokens } from '../../lib/redis';
import {
  buildPermissionKey,
  canonicalizePermissionKey,
  expandPermissionKeys,
  getPermissionCatalog,
  getPermissionDefinition,
  PERMISSION_CATALOG,
} from './permission-catalog';

const prisma = new PrismaClient();

export const PERMISSIONS = Object.fromEntries(
  PERMISSION_CATALOG.map((definition) => [
    definition.key,
    {
      module: definition.key.split(':')[0],
      action: definition.key.split(':')[1],
      scope: definition.key.split(':')[2]?.toUpperCase(),
      description: definition.description,
    },
  ])
);

export type PermissionKey = keyof typeof PERMISSIONS;

// Role hierarchy levels
export const ROLE_LEVELS = {
  ORGANIZATION: 0,  // CEO, CFO, etc.
  DELIVERY: 1,      // Delivery Head
  PRACTICE: 2,      // Practice Head
  TEAM: 3,          // Manager
  INDIVIDUAL: 4,    // Employee
} as const;

const SYSTEM_ROLE_PRESET_LEVELS: Record<string, number> = {
  PMO: ROLE_LEVELS.DELIVERY,
};

function serializeRole(role: any) {
  const relationalPermissions = role.rolePermissions?.flatMap((rolePermission: any) => {
    if (!rolePermission.granted || !rolePermission.permission) {
      return [];
    }

    return [
      buildPermissionKey(
        rolePermission.permission.module,
        rolePermission.permission.action,
        rolePermission.permission.scope
      ),
    ];
  }) ?? [];

  const legacyPermissions = Array.isArray(role.permissions) ? role.permissions : [];

  return {
    ...role,
    permissions: expandPermissionKeys([...relationalPermissions, ...legacyPermissions]),
  };
}

async function resolvePermissionIds(tenantId: string, permissionKeys: string[]): Promise<string[]> {
  const canonicalKeys = Array.from(new Set(permissionKeys.map((permissionKey) => canonicalizePermissionKey(permissionKey))));

  if (canonicalKeys.length === 0) {
    return [];
  }

  await roleService.initializePermissions(tenantId);

  const requestedDefinitions = canonicalKeys
    .map((permissionKey) => getPermissionDefinition(permissionKey))
    .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition));

  const storedPermissions = await prisma.permission.findMany({
    where: {
      tenantId,
      OR: requestedDefinitions.map((definition) => {
        const [module, action, scope] = definition.key.split(':');
        return {
          module,
          action,
          scope: scope?.toUpperCase() ?? 'ALL',
        };
      }),
    },
  });

  const permissionIdByKey = new Map<string, string>();
  for (const permission of storedPermissions) {
    permissionIdByKey.set(buildPermissionKey(permission.module, permission.action, permission.scope), permission.id);
  }

  const missingPermissions = canonicalKeys.filter((permissionKey) => !permissionIdByKey.has(permissionKey));
  if (missingPermissions.length > 0) {
    throw new Error(`Unknown permissions: ${missingPermissions.join(', ')}`);
  }

  return canonicalKeys.map((permissionKey) => permissionIdByKey.get(permissionKey) as string);
}

async function replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  await prisma.rolePermission.deleteMany({
    where: { roleId },
  });

  if (permissionIds.length === 0) {
    return;
  }

  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    })),
  });
}

export const roleService = {
  // Get all roles for a tenant
  async getRoles(tenantId: string): Promise<any[]> {
    const roles = await prisma.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return roles.map((role) => serializeRole(role));
  },

  // Get a single role
  async getRole(tenantId: string, id: string): Promise<any | null> {
    const role = await prisma.role.findFirst({
      where: { id, tenantId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        parentRole: true,
        childRoles: true,
        _count: { select: { users: true } },
      },
    });

    return role ? serializeRole(role) : null;
  },

  // Create a custom role
  async createRole(tenantId: string, data: {
    name: string;
    description?: string;
    level?: number;
    parentRoleId?: string;
    permissions?: string[];
    permissionIds?: string[];
  }): Promise<any> {
    const role = await prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        level: data.level ?? ROLE_LEVELS.TEAM,
        parentRoleId: data.parentRoleId,
        isSystem: false,
        permissions: [], // Legacy field
      },
    });

    // Assign permissions if provided
    const permissionIds = data.permissionIds ?? (data.permissions ? await resolvePermissionIds(tenantId, data.permissions) : []);
    if (permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    return this.getRole(tenantId, role.id);
  },

  // Update a role
  async updateRole(tenantId: string, id: string, data: {
    name?: string;
    description?: string;
    level?: number;
    parentRoleId?: string;
    permissions?: string[];
    permissionIds?: string[];
  }): Promise<any> {
    const role = await prisma.role.findFirst({
      where: { id, tenantId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem && data.name) {
      throw new Error('Cannot rename system roles');
    }

    // Update role
    await prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        level: data.level,
        parentRoleId: data.parentRoleId,
      },
    });

    // Update permissions if provided
    if (data.permissionIds !== undefined || data.permissions !== undefined) {
      const permissionIds = data.permissionIds ?? await resolvePermissionIds(tenantId, id ? (data.permissions ?? []) : []);

      await replaceRolePermissions(id, permissionIds);
    }

    return this.getRole(tenantId, id);
  },

  async provisionSystemRole(tenantId: string, presetCode: string): Promise<any> {
    const preset = this.getPermissionCatalog().presets.find((candidate) => candidate.code === presetCode);
    if (!preset) {
      throw new Error(`Unknown role preset: ${presetCode}`);
    }

    await this.initializePermissions(tenantId);

    const permissionIds = await resolvePermissionIds(tenantId, preset.permissionKeys);
    const existingRole = await prisma.role.findFirst({
      where: {
        tenantId,
        name: preset.name,
      },
      select: {
        id: true,
        isSystem: true,
      },
    });

    if (existingRole && !existingRole.isSystem) {
      throw new Error(`Role name ${preset.name} is already in use by a custom role`);
    }

    const level = SYSTEM_ROLE_PRESET_LEVELS[preset.code] ?? ROLE_LEVELS.TEAM;

    const role = existingRole
      ? await prisma.role.update({
          where: { id: existingRole.id },
          data: {
            description: preset.description,
            level,
            isSystem: true,
            permissions: [],
          },
          select: { id: true },
        })
      : await prisma.role.create({
          data: {
            tenantId,
            name: preset.name,
            description: preset.description,
            level,
            isSystem: true,
            permissions: [],
          },
          select: { id: true },
        });

    await replaceRolePermissions(role.id, permissionIds);

    return this.getRole(tenantId, role.id);
  },

  // Delete a role
  async deleteRole(tenantId: string, id: string): Promise<void> {
    const role = await prisma.role.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    if (role._count.users > 0) {
      throw new Error('Cannot delete role with assigned users');
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.role.delete({ where: { id } }),
    ]);
  },

  // Assign role to user
  async assignRole(userId: string, roleId: string, assignedBy: string, tenantId: string): Promise<void> {
    // Verify user belongs to the caller's tenant
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new Error('User not found in this tenant');
    }

    // Verify role belongs to the same tenant
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!role) {
      throw new Error('Role not found in this tenant');
    }

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: { assignedAt: new Date(), assignedBy },
      create: { userId, roleId, assignedBy },
    });

    await invalidateAllUserTokens(userId);

    // Log the assignment
    await prisma.roleAssignmentAudit.create({
      data: {
        tenantId,
        userId,
        roleId,
        action: 'ASSIGNED',
        assignedBy,
      },
    });
  },

  // Revoke role from user
  async revokeRole(userId: string, roleId: string, revokedBy: string, tenantId: string, reason?: string): Promise<void> {
    // Verify user belongs to the caller's tenant
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new Error('User not found in this tenant');
    }

    await prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    await invalidateAllUserTokens(userId);

    // Log the revocation
    await prisma.roleAssignmentAudit.create({
      data: {
        tenantId,
        userId,
        roleId,
        action: 'REVOKED',
        assignedBy: revokedBy,
        reason,
      },
    });
  },

  // Get user's permissions
  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    // Verify user belongs to the caller's tenant
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new Error('User not found in this tenant');
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    
    for (const userRole of userRoles) {
      // Add permissions from role permissions table
      for (const rp of userRole.role.rolePermissions) {
        if (rp.granted) {
          permissions.add(buildPermissionKey(rp.permission.module, rp.permission.action, rp.permission.scope));
        }
      }
      
      // Add legacy permissions
      const legacyPerms = userRole.role.permissions as string[];
      if (Array.isArray(legacyPerms)) {
        legacyPerms.forEach(p => permissions.add(p));
      }
    }

    return expandPermissionKeys(Array.from(permissions));
  },

  // Check if user has permission
  async hasPermission(userId: string, permission: string, tenantId?: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId || '');
    
    // Check exact match
    if (permissions.includes(permission)) return true;
    
    // Check if user has broader permission (e.g., resources:read includes resources:read:own)
    const [module, action] = permission.split(':');
    if (permissions.includes(`${module}:${action}`)) return true;
    
    return false;
  },

  // Initialize permissions in database
  async initializePermissions(tenantId: string): Promise<void> {
    for (const definition of PERMISSION_CATALOG) {
      const [module, action, scope] = definition.key.split(':');
      await prisma.permission.upsert({
        where: {
          tenantId_module_action_scope: {
            tenantId,
            module,
            action,
            scope: scope?.toUpperCase() ?? 'ALL',
          },
        },
        update: {},
        create: {
          tenantId,
          module,
          action,
          scope: scope?.toUpperCase() ?? 'ALL',
          description: definition.description,
          isSystem: true,
        },
      });
    }
  },

  getPermissionCatalog() {
    return getPermissionCatalog();
  },

  // Get role assignment audit log
  async getAssignmentAudit(tenantId: string, filters?: {
    userId?: string;
    roleId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    const where: any = { tenantId };
    
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.roleId) where.roleId = filters.roleId;
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return prisma.roleAssignmentAudit.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  },
};

export default roleService;

