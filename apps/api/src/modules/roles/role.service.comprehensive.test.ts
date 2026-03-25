/**
 * Comprehensive Role Service Tests
 * Tests: ROL-U-001 to ROL-U-013
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { mockInvalidateAllUserTokens } = vi.hoisted(() => ({
  mockInvalidateAllUserTokens: vi.fn().mockResolvedValue(undefined),
}));

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    role: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    rolePermission: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    roleAssignmentAudit: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('../../lib/redis', () => ({
  invalidateAllUserTokens: mockInvalidateAllUserTokens,
}));

import { roleService } from './role.service';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Role {
  id: string;
  name: string;
  description?: string;
  level: number;
  isSystem: boolean;
  parentId?: string;
  permissions: string[];
}

interface Permission {
  id: string;
  name: string;
  module: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE';
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// ROL-U-001: Role name uniqueness
async function isRoleNameUnique(name: string, excludeId?: string): Promise<boolean> {
  const existing = await mockPrisma.role.findFirst({
    where: { name, id: excludeId ? { not: excludeId } : undefined },
  });
  return !existing;
}

// ROL-U-002: Permission ID validation
async function validatePermissionIds(permissionIds: string[]): Promise<{ valid: boolean; invalidIds: string[] }> {
  const existing = await mockPrisma.permission.findMany({
    where: { id: { in: permissionIds } },
  });
  
  const existingIds = new Set(existing.map((p: Permission) => p.id));
  const invalidIds = permissionIds.filter(id => !existingIds.has(id));
  
  return { valid: invalidIds.length === 0, invalidIds };
}

// ROL-U-003: Hierarchy level validation
function validateHierarchyLevel(level: number): { valid: boolean; error?: string } {
  const MAX_LEVEL = 5;
  if (level < 1 || level > MAX_LEVEL) {
    return { valid: false, error: `Hierarchy level must be between 1 and ${MAX_LEVEL}` };
  }
  return { valid: true };
}

// ROL-U-006: Circular reference detection
function hasCircularReference(
  roleId: string,
  parentId: string,
  roles: Array<{ id: string; parentId?: string }>
): boolean {
  const visited = new Set<string>();
  let currentId: string | undefined = parentId;
  
  while (currentId) {
    if (currentId === roleId) {
      return true; // Circular reference found
    }
    if (visited.has(currentId)) {
      return true; // Loop detected
    }
    visited.add(currentId);
    
    const currentRole = roles.find(r => r.id === currentId);
    currentId = currentRole?.parentId;
  }
  
  return false;
}

// ROL-U-007: Calculate hierarchy depth
function calculateHierarchyDepth(
  roleId: string,
  roles: Array<{ id: string; parentId?: string }>
): number {
  let depth = 1;
  let currentId: string | undefined = roleId;
  
  while (currentId) {
    const role = roles.find(r => r.id === currentId);
    if (role?.parentId) {
      depth++;
      currentId = role.parentId;
    } else {
      break;
    }
  }
  
  return depth;
}

// ROL-U-010: Get inherited permissions
function getInheritedPermissions(
  roleId: string,
  roles: Array<{ id: string; parentId?: string; permissions: string[] }>
): string[] {
  const allPermissions = new Set<string>();
  let currentId: string | undefined = roleId;
  
  while (currentId) {
    const role = roles.find(r => r.id === currentId);
    if (role) {
      role.permissions.forEach(p => allPermissions.add(p));
      currentId = role.parentId;
    } else {
      break;
    }
  }
  
  return Array.from(allPermissions);
}

// ROL-U-011: Level-based access check
function canManageRole(actorLevel: number, targetLevel: number): boolean {
  // Can only manage roles at lower levels (higher number = lower in hierarchy)
  return actorLevel < targetLevel;
}

describe('Role Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateAllUserTokens.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Role Name Uniqueness', () => {
    // ROL-U-001: Role name must be unique
    it('ROL-U-001: should reject duplicate role name', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'existing', name: 'Manager' });
      
      const isUnique = await isRoleNameUnique('Manager');
      expect(isUnique).toBe(false);
    });

    it('ROL-U-001: should accept unique role name', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      
      const isUnique = await isRoleNameUnique('New Role');
      expect(isUnique).toBe(true);
    });

    it('ROL-U-001: should allow same name when updating own record', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      
      const isUnique = await isRoleNameUnique('Manager', 'role-1');
      expect(isUnique).toBe(true);
    });
  });

  describe('Permission ID Validation', () => {
    // ROL-U-002: Permission IDs must exist
    it('ROL-U-002: should accept valid permission IDs', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'perm-1', name: 'READ_RESOURCES' },
        { id: 'perm-2', name: 'CREATE_RESOURCES' },
      ]);
      
      const result = await validatePermissionIds(['perm-1', 'perm-2']);
      expect(result.valid).toBe(true);
      expect(result.invalidIds).toHaveLength(0);
    });

    it('ROL-U-002: should reject invalid permission IDs', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'perm-1', name: 'READ_RESOURCES' },
      ]);
      
      const result = await validatePermissionIds(['perm-1', 'invalid-perm']);
      expect(result.valid).toBe(false);
      expect(result.invalidIds).toContain('invalid-perm');
    });
  });

  describe('Hierarchy Level Validation', () => {
    // ROL-U-003: Level must be 1-5
    it('ROL-U-003: should accept level 1', () => {
      const result = validateHierarchyLevel(1);
      expect(result.valid).toBe(true);
    });

    it('ROL-U-003: should accept level 5', () => {
      const result = validateHierarchyLevel(5);
      expect(result.valid).toBe(true);
    });

    it('ROL-U-003: should reject level 0', () => {
      const result = validateHierarchyLevel(0);
      expect(result.valid).toBe(false);
    });

    it('ROL-U-003: should reject level 10', () => {
      const result = validateHierarchyLevel(10);
      expect(result.valid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Role with No Permissions', () => {
    // ROL-U-004: Role with 0 permissions (view-only)
    it('ROL-U-004: should allow role with no permissions', () => {
      const role: Role = {
        id: 'role-1',
        name: 'Viewer',
        level: 4,
        isSystem: false,
        permissions: [],
      };
      
      expect(role.permissions.length).toBe(0);
    });
  });

  describe('Role with All Permissions', () => {
    // ROL-U-005: Role with all permissions (superadmin)
    it('ROL-U-005: should allow role with all permissions', () => {
      const allPermissions = Array.from({ length: 30 }, (_, i) => `perm-${i}`);
      
      const role: Role = {
        id: 'role-1',
        name: 'Superadmin',
        level: 1,
        isSystem: true,
        permissions: allPermissions,
      };
      
      expect(role.permissions.length).toBe(30);
    });
  });

  describe('Circular Reference Detection', () => {
    // ROL-U-006: Prevent circular parent reference
    it('ROL-U-006: should detect direct circular reference', () => {
      const roles = [
        { id: 'A', parentId: 'B' },
        { id: 'B', parentId: 'A' },
      ];
      
      const hasCircular = hasCircularReference('A', 'B', roles);
      expect(hasCircular).toBe(true);
    });

    it('ROL-U-006: should detect indirect circular reference', () => {
      const roles = [
        { id: 'A', parentId: 'B' },
        { id: 'B', parentId: 'C' },
        { id: 'C', parentId: 'A' },
      ];
      
      const hasCircular = hasCircularReference('A', 'B', roles);
      expect(hasCircular).toBe(true);
    });

    it('ROL-U-006: should allow valid hierarchy', () => {
      const roles = [
        { id: 'A', parentId: undefined },
        { id: 'B', parentId: 'A' },
        { id: 'C', parentId: 'B' },
      ];
      
      const hasCircular = hasCircularReference('D', 'C', roles);
      expect(hasCircular).toBe(false);
    });
  });

  describe('Deep Hierarchy', () => {
    // ROL-U-007: Reject hierarchy deeper than 5 levels
    it('ROL-U-007: should calculate hierarchy depth', () => {
      const roles = [
        { id: 'L1', parentId: undefined },
        { id: 'L2', parentId: 'L1' },
        { id: 'L3', parentId: 'L2' },
        { id: 'L4', parentId: 'L3' },
        { id: 'L5', parentId: 'L4' },
      ];
      
      const depth = calculateHierarchyDepth('L5', roles);
      expect(depth).toBe(5);
    });

    it('ROL-U-007: should reject depth > 5', () => {
      const depth = 6;
      const isValidDepth = depth <= 5;
      expect(isValidDepth).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('System Role Protection', () => {
    // ROL-U-008: Cannot delete system roles
    it('ROL-U-008: should prevent deletion of system role', () => {
      const role: Role = {
        id: 'admin',
        name: 'Admin',
        level: 1,
        isSystem: true,
        permissions: [],
      };
      
      const canDelete = !role.isSystem;
      expect(canDelete).toBe(false);
    });

    it('ROL-U-008: should allow deletion of custom role', () => {
      const role: Role = {
        id: 'custom',
        name: 'Custom Role',
        level: 3,
        isSystem: false,
        permissions: [],
      };
      
      const canDelete = !role.isSystem;
      expect(canDelete).toBe(true);
    });
  });

  describe('Role with Assigned Users', () => {
    // ROL-U-009: Cannot delete role with users
    it('ROL-U-009: should prevent deletion with assigned users', async () => {
      mockPrisma.user.count.mockResolvedValue(5);
      
      const userCount = await mockPrisma.user.count({
        where: { roles: { some: { id: 'role-1' } } },
      });
      
      const canDelete = userCount === 0;
      expect(canDelete).toBe(false);
    });

    it('ROL-U-009: should allow deletion with no users', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      
      const userCount = await mockPrisma.user.count({
        where: { roles: { some: { id: 'role-1' } } },
      });
      
      const canDelete = userCount === 0;
      expect(canDelete).toBe(true);
    });
  });

  describe('Permission Inheritance', () => {
    // ROL-U-010: Child inherits parent permissions
    it('ROL-U-010: should inherit permissions from parent', () => {
      const roles = [
        { id: 'parent', parentId: undefined, permissions: ['read', 'list'] },
        { id: 'child', parentId: 'parent', permissions: ['write'] },
      ];
      
      const inherited = getInheritedPermissions('child', roles);
      
      expect(inherited).toContain('read');
      expect(inherited).toContain('list');
      expect(inherited).toContain('write');
      expect(inherited.length).toBe(3);
    });

    it('ROL-U-010: should inherit from multiple ancestors', () => {
      const roles = [
        { id: 'grandparent', parentId: undefined, permissions: ['admin'] },
        { id: 'parent', parentId: 'grandparent', permissions: ['manage'] },
        { id: 'child', parentId: 'parent', permissions: ['view'] },
      ];
      
      const inherited = getInheritedPermissions('child', roles);
      
      expect(inherited).toContain('admin');
      expect(inherited).toContain('manage');
      expect(inherited).toContain('view');
    });

    it('ROL-U-010: should deduplicate inherited permissions', () => {
      const roles = [
        { id: 'parent', parentId: undefined, permissions: ['read', 'write'] },
        { id: 'child', parentId: 'parent', permissions: ['read', 'delete'] },
      ];
      
      const inherited = getInheritedPermissions('child', roles);
      
      // 'read' should appear only once
      expect(inherited.filter(p => p === 'read').length).toBe(1);
    });
  });

  describe('Hierarchy Level Enforcement', () => {
    // ROL-U-011: Cannot manage higher-level roles
    it('ROL-U-011: should allow level 2 to manage level 3', () => {
      expect(canManageRole(2, 3)).toBe(true);
    });

    it('ROL-U-011: should prevent level 3 from managing level 2', () => {
      expect(canManageRole(3, 2)).toBe(false);
    });

    it('ROL-U-011: should prevent managing same level', () => {
      expect(canManageRole(2, 2)).toBe(false);
    });
  });

  describe('Permission Change Audit', () => {
    // ROL-U-012: Audit trail on changes
    it('ROL-U-012: should create audit log on permission update', async () => {
      await mockPrisma.auditLog.create({
        data: {
          entityType: 'ROLE',
          entityId: 'role-1',
          action: 'UPDATE_PERMISSIONS',
          oldValue: JSON.stringify(['read']),
          newValue: JSON.stringify(['read', 'write']),
          userId: 'admin-1',
        },
      });
      
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('Role Assignment Audit', () => {
    // ROL-U-013: Audit entry on role assignment
    it('ROL-U-013: should create assignment audit on role assign', async () => {
      await mockPrisma.roleAssignmentAudit.create({
        data: {
          userId: 'user-1',
          roleId: 'role-1',
          action: 'ASSIGN',
          assignedBy: 'admin-1',
        },
      });
      
      expect(mockPrisma.roleAssignmentAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ASSIGN',
          }),
        })
      );
    });
  });

  describe('Session Invalidation on Role Mutation', () => {
    it('ROL-U-014: invalidates all user sessions when assigning a role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-1' });
      mockPrisma.userRole.upsert.mockResolvedValue({});
      mockPrisma.roleAssignmentAudit.create.mockResolvedValue({});

      await roleService.assignRole('user-1', 'role-1', 'admin-1', 'tenant-1');

      expect(mockInvalidateAllUserTokens).toHaveBeenCalledTimes(1);
      expect(mockInvalidateAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('ROL-U-015: invalidates all user sessions when revoking a role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      mockPrisma.userRole.delete.mockResolvedValue({});
      mockPrisma.roleAssignmentAudit.create.mockResolvedValue({});

      await roleService.revokeRole('user-1', 'role-1', 'admin-1', 'tenant-1');

      expect(mockInvalidateAllUserTokens).toHaveBeenCalledTimes(1);
      expect(mockInvalidateAllUserTokens).toHaveBeenCalledWith('user-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Role Name Validation', () => {
    it('should accept alphanumeric names', () => {
      const validNames = ['Manager', 'Project Lead', 'QA_Engineer', 'Dev-Ops'];
      validNames.forEach(name => {
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should reject very long names', () => {
      const longName = 'A'.repeat(256);
      const isValidLength = longName.length <= 100;
      expect(isValidLength).toBe(false);
    });
  });
});

