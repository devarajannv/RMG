import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Define all available permissions
export const PERMISSIONS = {
  // Resources
  'resources:create': { module: 'resources', action: 'create', description: 'Create resources' },
  'resources:read': { module: 'resources', action: 'read', description: 'View resources' },
  'resources:update': { module: 'resources', action: 'update', description: 'Update resources' },
  'resources:delete': { module: 'resources', action: 'delete', description: 'Delete resources' },
  'resources:read:own': { module: 'resources', action: 'read', scope: 'OWN', description: 'View own profile' },
  'resources:read:team': { module: 'resources', action: 'read', scope: 'TEAM', description: 'View team resources' },
  'resources:read:practice': { module: 'resources', action: 'read', scope: 'PRACTICE', description: 'View practice resources' },
  
  // Projects
  'projects:create': { module: 'projects', action: 'create', description: 'Create projects' },
  'projects:read': { module: 'projects', action: 'read', description: 'View projects' },
  'projects:update': { module: 'projects', action: 'update', description: 'Update projects' },
  'projects:delete': { module: 'projects', action: 'delete', description: 'Delete projects' },
  
  // Allocations
  'allocations:create': { module: 'allocations', action: 'create', description: 'Create allocations' },
  'allocations:read': { module: 'allocations', action: 'read', description: 'View allocations' },
  'allocations:update': { module: 'allocations', action: 'update', description: 'Update allocations' },
  'allocations:delete': { module: 'allocations', action: 'delete', description: 'Delete allocations' },
  'allocations:approve': { module: 'allocations', action: 'approve', description: 'Approve allocations' },
  
  // Timesheets
  'timesheets:create': { module: 'timesheets', action: 'create', description: 'Create timesheets' },
  'timesheets:read': { module: 'timesheets', action: 'read', description: 'View timesheets' },
  'timesheets:update': { module: 'timesheets', action: 'update', description: 'Update timesheets' },
  'timesheets:approve': { module: 'timesheets', action: 'approve', description: 'Approve timesheets' },
  
  // Clients
  'clients:create': { module: 'clients', action: 'create', description: 'Create clients' },
  'clients:read': { module: 'clients', action: 'read', description: 'View clients' },
  'clients:update': { module: 'clients', action: 'update', description: 'Update clients' },
  'clients:delete': { module: 'clients', action: 'delete', description: 'Delete clients' },
  
  // Contracts
  'contracts:create': { module: 'contracts', action: 'create', description: 'Create contracts' },
  'contracts:read': { module: 'contracts', action: 'read', description: 'View contracts' },
  'contracts:update': { module: 'contracts', action: 'update', description: 'Update contracts' },
  'contracts:delete': { module: 'contracts', action: 'delete', description: 'Delete contracts' },
  'contracts:approve': { module: 'contracts', action: 'approve', description: 'Approve contracts' },
  
  // Reports
  'reports:read': { module: 'reports', action: 'read', description: 'View reports' },
  'reports:export': { module: 'reports', action: 'export', description: 'Export reports' },
  
  // Analytics
  'analytics:read': { module: 'analytics', action: 'read', description: 'View analytics' },
  'analytics:read:practice': { module: 'analytics', action: 'read', scope: 'PRACTICE', description: 'View practice analytics' },
  
  // Settings
  'settings:read': { module: 'settings', action: 'read', description: 'View settings' },
  'settings:update': { module: 'settings', action: 'update', description: 'Update settings' },
  
  // Roles
  'roles:create': { module: 'roles', action: 'create', description: 'Create roles' },
  'roles:read': { module: 'roles', action: 'read', description: 'View roles' },
  'roles:update': { module: 'roles', action: 'update', description: 'Update roles' },
  'roles:delete': { module: 'roles', action: 'delete', description: 'Delete roles' },
  'roles:assign': { module: 'roles', action: 'assign', description: 'Assign roles to users' },
  
  // CTC (Sensitive)
  'ctc:read:own': { module: 'ctc', action: 'read', scope: 'OWN', description: 'View own CTC' },
  'ctc:read:all': { module: 'ctc', action: 'read', scope: 'ALL', description: 'View all CTC (requires approval)' },
  
  // Documents
  'documents:create': { module: 'documents', action: 'create', description: 'Upload documents' },
  'documents:read': { module: 'documents', action: 'read', description: 'View documents' },
  'documents:update': { module: 'documents', action: 'update', description: 'Update documents' },
  'documents:delete': { module: 'documents', action: 'delete', description: 'Delete documents' },
  'documents:approve': { module: 'documents', action: 'approve', description: 'Approve documents' },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// Role hierarchy levels
export const ROLE_LEVELS = {
  ORGANIZATION: 0,  // CEO, CFO, etc.
  DELIVERY: 1,      // Delivery Head
  PRACTICE: 2,      // Practice Head
  TEAM: 3,          // Manager
  INDIVIDUAL: 4,    // Employee
} as const;

export const roleService = {
  // Get all roles for a tenant
  async getRoles(tenantId: string): Promise<Role[]> {
    return prisma.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  },

  // Get a single role
  async getRole(tenantId: string, id: string): Promise<Role | null> {
    return prisma.role.findFirst({
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
  },

  // Create a custom role
  async createRole(tenantId: string, data: {
    name: string;
    description?: string;
    level?: number;
    parentRoleId?: string;
    permissionIds?: string[];
  }): Promise<Role> {
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
    if (data.permissionIds?.length) {
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map(permissionId => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    return this.getRole(tenantId, role.id) as Promise<Role>;
  },

  // Update a role
  async updateRole(tenantId: string, id: string, data: {
    name?: string;
    description?: string;
    level?: number;
    parentRoleId?: string;
    permissionIds?: string[];
  }): Promise<Role> {
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
    if (data.permissionIds !== undefined) {
      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      if (data.permissionIds.length) {
        await prisma.rolePermission.createMany({
          data: data.permissionIds.map(permissionId => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }

    return this.getRole(tenantId, id) as Promise<Role>;
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

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });
  },

  // Assign role to user
  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<void> {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: { assignedAt: new Date(), assignedBy },
      create: { userId, roleId, assignedBy },
    });

    // Log the assignment
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    await prisma.roleAssignmentAudit.create({
      data: {
        tenantId: role?.tenantId || '',
        userId,
        roleId,
        action: 'ASSIGNED',
        assignedBy,
      },
    });
  },

  // Revoke role from user
  async revokeRole(userId: string, roleId: string, revokedBy: string, reason?: string): Promise<void> {
    await prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    // Log the revocation
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    await prisma.roleAssignmentAudit.create({
      data: {
        tenantId: role?.tenantId || '',
        userId,
        roleId,
        action: 'REVOKED',
        assignedBy: revokedBy,
        reason,
      },
    });
  },

  // Get user's permissions
  async getUserPermissions(userId: string): Promise<string[]> {
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
          const key = `${rp.permission.module}:${rp.permission.action}`;
          if (rp.permission.scope !== 'ALL') {
            permissions.add(`${key}:${rp.permission.scope.toLowerCase()}`);
          } else {
            permissions.add(key);
          }
        }
      }
      
      // Add legacy permissions
      const legacyPerms = userRole.role.permissions as string[];
      if (Array.isArray(legacyPerms)) {
        legacyPerms.forEach(p => permissions.add(p));
      }
    }

    return Array.from(permissions);
  },

  // Check if user has permission
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    
    // Check exact match
    if (permissions.includes(permission)) return true;
    
    // Check if user has broader permission (e.g., resources:read includes resources:read:own)
    const [module, action] = permission.split(':');
    if (permissions.includes(`${module}:${action}`)) return true;
    
    return false;
  },

  // Initialize permissions in database
  async initializePermissions(tenantId: string): Promise<void> {
    for (const [_key, config] of Object.entries(PERMISSIONS)) {
      await prisma.permission.upsert({
        where: {
          tenantId_module_action_scope: {
            tenantId,
            module: config.module,
            action: config.action,
            scope: ('scope' in config ? config.scope : 'ALL') as string,
          },
        },
        update: {},
        create: {
          tenantId,
          module: config.module,
          action: config.action,
          scope: ('scope' in config ? config.scope : 'ALL') as string,
          description: config.description,
          isSystem: true,
        },
      });
    }
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

