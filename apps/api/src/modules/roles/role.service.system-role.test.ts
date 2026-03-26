import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockInvalidateAllUserTokens } = vi.hoisted(() => ({
  mockInvalidateAllUserTokens: vi.fn().mockResolvedValue(undefined),
}));

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    role: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    permission: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    rolePermission: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('../../lib/redis', () => ({
  invalidateAllUserTokens: mockInvalidateAllUserTokens,
}));

import { roleService } from './role.service';
import { PERMISSION_PRESETS } from './permission-catalog';

const pmoPreset = PERMISSION_PRESETS.find((preset) => preset.code === 'PMO');

function buildStoredPermissions() {
  return (pmoPreset?.permissionKeys ?? []).map((permissionKey, index) => {
    const [module, action, scope] = permissionKey.split(':');
    return {
      id: `perm-${index + 1}`,
      module,
      action,
      scope: scope?.toUpperCase() ?? 'ALL',
    };
  });
}

describe('roleService.provisionSystemRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.tenant.findUnique.mockResolvedValue({ slug: 'newvision' });
    mockPrisma.permission.upsert.mockResolvedValue({});
    mockPrisma.permission.findMany.mockResolvedValue(buildStoredPermissions());
  });

  it('creates the PMO system role when it does not exist', async () => {
    mockPrisma.role.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'role-1',
        name: 'PMO',
        description: pmoPreset?.description,
        level: 1,
        isSystem: true,
        permissions: [],
        rolePermissions: buildStoredPermissions().map((permission) => ({
          granted: true,
          permission,
        })),
      });
    mockPrisma.role.create.mockResolvedValue({ id: 'role-1' });
    mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.rolePermission.createMany.mockResolvedValue({ count: pmoPreset?.permissionKeys.length ?? 0 });

    const role = await roleService.provisionSystemRole('tenant-1', 'PMO');

    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'PMO',
          isSystem: true,
          level: 1,
        }),
      })
    );
    expect(mockPrisma.rolePermission.createMany).toHaveBeenCalled();
    expect(role).toMatchObject({
      id: 'role-1',
      name: 'PMO',
      isSystem: true,
    });
  });

  it('resyncs an existing PMO system role in place', async () => {
    mockPrisma.role.findFirst
      .mockResolvedValueOnce({ id: 'role-1', isSystem: true })
      .mockResolvedValueOnce({
        id: 'role-1',
        name: 'PMO',
        description: pmoPreset?.description,
        level: 1,
        isSystem: true,
        permissions: [],
        rolePermissions: buildStoredPermissions().map((permission) => ({
          granted: true,
          permission,
        })),
      });
    mockPrisma.role.update.mockResolvedValue({ id: 'role-1' });
    mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 3 });
    mockPrisma.rolePermission.createMany.mockResolvedValue({ count: pmoPreset?.permissionKeys.length ?? 0 });

    const role = await roleService.provisionSystemRole('tenant-1', 'PMO');

    expect(mockPrisma.role.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'role-1' },
        data: expect.objectContaining({
          isSystem: true,
        }),
      })
    );
    expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role-1' } });
    expect(role).toMatchObject({
      id: 'role-1',
      name: 'PMO',
    });
  });

  it('rejects provisioning when a custom PMO role already exists', async () => {
    mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-1', isSystem: false });

    await expect(roleService.provisionSystemRole('tenant-1', 'PMO')).rejects.toThrow(
      'Role name PMO is already in use by a custom role'
    );
  });

  it('does not auto-provision the PMO baseline for non-newvision tenants', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce({ slug: 'other-tenant' });

    await expect(roleService.ensureNewVisionPmoBaseline('tenant-2')).resolves.toBeNull();
    expect(mockPrisma.role.findFirst).not.toHaveBeenCalled();
  });

  it('auto-provisions the PMO baseline for the newvision tenant', async () => {
    mockPrisma.role.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'role-1',
        name: 'PMO',
        description: pmoPreset?.description,
        level: 1,
        isSystem: true,
        permissions: [],
        rolePermissions: buildStoredPermissions().map((permission) => ({
          granted: true,
          permission,
        })),
      });
    mockPrisma.role.create.mockResolvedValue({ id: 'role-1' });
    mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.rolePermission.createMany.mockResolvedValue({ count: pmoPreset?.permissionKeys.length ?? 0 });

    const role = await roleService.ensureNewVisionPmoBaseline('tenant-1');

    expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      select: { slug: true },
    });
    expect(role).toMatchObject({ id: 'role-1', name: 'PMO', isSystem: true });
  });
});