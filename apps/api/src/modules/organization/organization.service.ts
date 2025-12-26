/**
 * Organization Service
 * Organization stats and settings
 */

import prisma from '../../lib/prisma';

export interface OrganizationStats {
  tenant: {
    id: string;
    name: string;
    code: string;
    status: string;
    createdAt: Date;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  resources: {
    total: number;
    active: number;
    inactive: number;
    onBench: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  clients: {
    total: number;
    active: number;
  };
  storage: {
    documentsCount: number;
    // Storage size would need file system integration
  };
}

export async function getOrganizationStats(tenantId: string): Promise<OrganizationStats> {
  const [
    tenant,
    userStats,
    resourceStats,
    projectStats,
    clientStats,
    documentCount,
  ] = await Promise.all([
    // Tenant info
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        createdAt: true,
      },
    }),

    // User stats
    prisma.user.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),

    // Resource stats
    Promise.all([
      prisma.resource.count({
        where: { tenantId, status: 'ACTIVE' },
      }),
      prisma.resource.count({
        where: { tenantId, status: { not: 'ACTIVE' } },
      }),
      prisma.resource.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          allocations: {
            none: {
              status: 'ACTIVE',
              startDate: { lte: new Date() },
              endDate: { gte: new Date() },
            },
          },
        },
      }),
    ]),

    // Project stats
    Promise.all([
      prisma.project.count({ where: { tenantId } }),
      prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.project.count({ where: { tenantId, status: 'COMPLETED' } }),
    ]),

    // Client stats
    Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.client.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]),

    // Document count
    prisma.document.count({ where: { tenantId } }),
  ]);

  const activeUsers = userStats.find((s) => s.status === 'ACTIVE')?._count || 0;
  const inactiveUsers = userStats.filter((s) => s.status !== 'ACTIVE').reduce((sum, s) => sum + s._count, 0);

  return {
    tenant: tenant!,
    users: {
      total: activeUsers + inactiveUsers,
      active: activeUsers,
      inactive: inactiveUsers,
    },
    resources: {
      total: resourceStats[0] + resourceStats[1],
      active: resourceStats[0],
      inactive: resourceStats[1],
      onBench: resourceStats[2],
    },
    projects: {
      total: projectStats[0],
      active: projectStats[1],
      completed: projectStats[2],
    },
    clients: {
      total: clientStats[0],
      active: clientStats[1],
    },
    storage: {
      documentsCount: documentCount,
    },
  };
}
