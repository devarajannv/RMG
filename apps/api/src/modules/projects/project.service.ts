import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface CreateProjectInput {
  code: string;
  name: string;
  type: 'BILLABLE' | 'INTERNAL' | 'PRESALES' | 'SUPPORT';
  description?: string;
  category?: string;
  deliveryModel?: 'ONSITE' | 'OFFSHORE' | 'HYBRID';
  startDate: Date;
  endDate?: Date;
  clientId?: string;
  contractId?: string;
  managerId?: string;
  practiceId?: string;
  billingType?: 'TM' | 'FIXED' | 'RETAINER' | 'MILESTONE' | 'HYBRID';
  budgetHours?: number;
  budgetAmount?: number;
  defaultRate?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags?: string[];
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: 'PIPELINE' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  healthStatus?: 'GREEN' | 'AMBER' | 'RED';
  actualEndDate?: Date;
}

export interface ProjectFilters {
  search?: string;
  status?: string[];
  type?: string[];
  clientId?: string;
  contractId?: string;
  managerId?: string;
  practiceId?: string;
  priority?: string[];
  healthStatus?: string[];
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new project
 */
export async function createProject(
  tenantId: string,
  input: CreateProjectInput,
  userId: string
) {
  // Check duplicate code
  const existing = await prisma.project.findFirst({
    where: {
      tenantId,
      code: input.code.toUpperCase(),
      deletedAt: null,
    },
  });

  if (existing) {
    throw new ApiError(
      `Project with code ${input.code} already exists`,
      409,
      'DUPLICATE_CODE'
    );
  }

  // Validate references
  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, tenantId, deletedAt: null },
    });
    if (!client) {
      throw new ApiError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }
  }

  if (input.contractId) {
    const contract = await prisma.contract.findFirst({
      where: { id: input.contractId, tenantId, deletedAt: null },
    });
    if (!contract) {
      throw new ApiError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
    }
  }

  if (input.managerId) {
    const manager = await prisma.resource.findFirst({
      where: { id: input.managerId, tenantId, deletedAt: null },
    });
    if (!manager) {
      throw new ApiError('Manager not found', 404, 'MANAGER_NOT_FOUND');
    }
  }

  if (input.practiceId) {
    const practice = await prisma.practice.findFirst({
      where: { id: input.practiceId, tenantId },
    });
    if (!practice) {
      throw new ApiError('Practice not found', 404, 'PRACTICE_NOT_FOUND');
    }
  }

  const project = await prisma.project.create({
    data: {
      tenantId,
      code: input.code.toUpperCase(),
      name: input.name,
      type: input.type,
      description: input.description,
      category: input.category,
      deliveryModel: input.deliveryModel,
      startDate: input.startDate,
      endDate: input.endDate,
      clientId: input.clientId,
      contractId: input.contractId,
      managerId: input.managerId,
      practiceId: input.practiceId,
      billingType: input.billingType,
      budgetHours: input.budgetHours,
      budgetAmount: input.budgetAmount,
      defaultRate: input.defaultRate,
      priority: input.priority ?? 'MEDIUM',
      tags: input.tags ?? [],
      status: 'PIPELINE',
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
      contract: { select: { id: true, name: true, contractNumber: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      practice: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Project',
      entityId: project.id,
      action: 'CREATE',
      changes: input as unknown as Prisma.JsonObject,
    },
  });

  logger.info('Project created', { projectId: project.id, code: project.code });

  return project;
}

/**
 * Get project by ID with all related data
 */
export async function getProjectById(tenantId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      tenantId,
      deletedAt: null,
    },
    include: {
      client: true,
      contract: true,
      manager: { select: { id: true, firstName: true, lastName: true, email: true } },
      practice: true,
      allocations: {
        where: { deletedAt: null },
        include: {
          resource: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
              band: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
      },
    },
  });

  if (!project) {
    throw new ApiError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Calculate summary
  const activeAllocations = project.allocations.filter(
    (a) => a.status === 'ACTIVE' && a.startDate <= new Date() && a.endDate >= new Date()
  );

  const totalAllocatedPercentage = activeAllocations.reduce((sum, a) => sum + a.percentage, 0);
  const uniqueResources = new Set(activeAllocations.map((a) => a.resourceId)).size;

  return {
    ...project,
    summary: {
      totalAllocations: project.allocations.length,
      activeAllocations: activeAllocations.length,
      uniqueResources,
      totalAllocatedPercentage,
      fteEquivalent: totalAllocatedPercentage / 100,
    },
  };
}

/**
 * List projects with filters
 */
export async function listProjects(
  tenantId: string,
  filters: ProjectFilters,
  pagination: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
) {
  const { page, limit, sortBy = 'startDate', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
      { client: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  if (filters.status?.length) {
    where.status = { in: filters.status as ('PIPELINE' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED')[] };
  }

  if (filters.type?.length) {
    where.type = { in: filters.type as ('BILLABLE' | 'INTERNAL' | 'PRESALES' | 'SUPPORT')[] };
  }

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.contractId) {
    where.contractId = filters.contractId;
  }

  if (filters.managerId) {
    where.managerId = filters.managerId;
  }

  if (filters.practiceId) {
    where.practiceId = filters.practiceId;
  }

  if (filters.priority?.length) {
    where.priority = { in: filters.priority as ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[] };
  }

  if (filters.healthStatus?.length) {
    where.healthStatus = { in: filters.healthStatus as ('GREEN' | 'AMBER' | 'RED')[] };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        client: { select: { id: true, name: true, code: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        practice: { select: { id: true, name: true } },
        _count: {
          select: {
            allocations: { where: { status: 'ACTIVE', deletedAt: null } },
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    data: projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Update project
 */
export async function updateProject(
  tenantId: string,
  projectId: string,
  input: UpdateProjectInput,
  userId: string
) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Check code uniqueness if changing
  if (input.code && input.code.toUpperCase() !== existing.code) {
    const codeExists = await prisma.project.findFirst({
      where: {
        tenantId,
        code: input.code.toUpperCase(),
        id: { not: projectId },
        deletedAt: null,
      },
    });
    if (codeExists) {
      throw new ApiError('Project code already in use', 409, 'DUPLICATE_CODE');
    }
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      code: input.code?.toUpperCase(),
      name: input.name,
      type: input.type,
      description: input.description,
      category: input.category,
      deliveryModel: input.deliveryModel,
      startDate: input.startDate,
      endDate: input.endDate,
      actualEndDate: input.actualEndDate,
      clientId: input.clientId,
      contractId: input.contractId,
      managerId: input.managerId,
      practiceId: input.practiceId,
      billingType: input.billingType,
      budgetHours: input.budgetHours,
      budgetAmount: input.budgetAmount,
      defaultRate: input.defaultRate,
      status: input.status,
      healthStatus: input.healthStatus,
      priority: input.priority,
      tags: input.tags,
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      practice: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Project',
      entityId: project.id,
      action: 'UPDATE',
      changes: { before: existing, after: input } as unknown as Prisma.JsonObject,
    },
  });

  return project;
}

/**
 * Delete project
 */
export async function deleteProject(
  tenantId: string,
  projectId: string,
  userId: string
) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Check for active allocations
  const activeAllocations = await prisma.allocation.count({
    where: {
      projectId,
      status: { in: ['PROPOSED', 'CONFIRMED', 'ACTIVE'] },
      deletedAt: null,
    },
  });

  if (activeAllocations > 0) {
    throw new ApiError(
      'Cannot delete project with active allocations',
      400,
      'HAS_ACTIVE_ALLOCATIONS'
    );
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date(), status: 'CANCELLED' },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Project',
      entityId: projectId,
      action: 'DELETE',
    },
  });

  logger.info('Project deleted', { projectId });
}

/**
 * Get project stats
 */
export async function getProjectStats(tenantId: string) {
  const [total, byStatus, byType] = await Promise.all([
    prisma.project.count({ where: { tenantId, deletedAt: null } }),
    prisma.project.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),
    prisma.project.groupBy({
      by: ['type'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
  };
}

/**
 * Get projects ending soon
 */
export async function getProjectsEndingSoon(tenantId: string, days: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return prisma.project.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      endDate: {
        gte: new Date(),
        lte: futureDate,
      },
    },
    include: {
      client: { select: { name: true } },
      manager: { select: { firstName: true, lastName: true } },
      _count: { select: { allocations: { where: { status: 'ACTIVE' } } } },
    },
    orderBy: { endDate: 'asc' },
  });
}

