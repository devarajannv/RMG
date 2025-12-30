import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface CreateResourceInput {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  phone?: string;
  employmentType: 'FTE' | 'CONTRACTOR' | 'INTERN';
  band: string;
  designation: string;
  department?: string;
  dateOfJoining: Date;
  capacity?: number;
  costPerHour?: number;
  billRateDefault?: number;
  practiceId?: string;
  locationId?: string;
  managerId?: string;
  tags?: string[];
}

export interface UpdateResourceInput extends Partial<CreateResourceInput> {
  status?: 'ACTIVE' | 'INACTIVE' | 'NOTICE';
  dateOfExit?: Date;
  exitReason?: string;
}

export interface ResourceFilters {
  search?: string;
  status?: string[];
  employmentType?: string[];
  practiceId?: string;
  locationId?: string;
  managerId?: string;
  band?: string[];
  isOnBench?: boolean;
  skills?: string[];
  tags?: string[];
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new resource
 */
export async function createResource(
  tenantId: string,
  input: CreateResourceInput,
  userId: string
) {
  // Check for duplicate employee ID
  const existing = await prisma.resource.findFirst({
    where: {
      tenantId,
      employeeId: input.employeeId,
      deletedAt: null,
    },
  });

  if (existing) {
    throw new ApiError(
      `Resource with employee ID ${input.employeeId} already exists`,
      409,
      'DUPLICATE_EMPLOYEE_ID'
    );
  }

  // Check for duplicate email
  const existingEmail = await prisma.resource.findFirst({
    where: {
      tenantId,
      email: input.email.toLowerCase(),
      deletedAt: null,
    },
  });

  if (existingEmail) {
    throw new ApiError(
      `Resource with email ${input.email} already exists`,
      409,
      'DUPLICATE_EMAIL'
    );
  }

  // Validate references
  if (input.practiceId) {
    const practice = await prisma.practice.findFirst({
      where: { id: input.practiceId, tenantId },
    });
    if (!practice) {
      throw new ApiError('Practice not found', 404, 'PRACTICE_NOT_FOUND');
    }
  }

  if (input.locationId) {
    const location = await prisma.location.findFirst({
      where: { id: input.locationId, tenantId },
    });
    if (!location) {
      throw new ApiError('Location not found', 404, 'LOCATION_NOT_FOUND');
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

  const resource = await prisma.resource.create({
    data: {
      tenantId,
      employeeId: input.employeeId,
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      preferredName: input.preferredName,
      phone: input.phone,
      employmentType: input.employmentType,
      band: input.band,
      designation: input.designation,
      department: input.department,
      dateOfJoining: input.dateOfJoining,
      capacity: input.capacity ?? 100,
      costPerHour: input.costPerHour,
      billRateDefault: input.billRateDefault,
      practiceId: input.practiceId,
      locationId: input.locationId,
      managerId: input.managerId,
      tags: input.tags ?? [],
      status: 'ACTIVE',
      benchSince: new Date(), // New resources start on bench
    },
    include: {
      practice: true,
      location: true,
      manager: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Resource',
      entityId: resource.id,
      action: 'CREATE',
      changes: input as unknown as Prisma.JsonObject,
    },
  });

  logger.info('Resource created', { resourceId: resource.id, employeeId: resource.employeeId });

  return resource;
}

/**
 * Get resource by ID
 */
export async function getResourceById(tenantId: string, resourceId: string) {
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      tenantId,
      deletedAt: null,
    },
    include: {
      practice: true,
      location: true,
      manager: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      skills: {
        include: {
          skill: {
            include: { category: true },
          },
        },
      },
      allocations: {
        where: {
          status: { in: ['PROPOSED', 'CONFIRMED', 'ACTIVE'] },
        },
        include: {
          project: {
            select: { id: true, code: true, name: true, client: true },
          },
        },
        orderBy: { startDate: 'asc' },
      },
    },
  });

  if (!resource) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  // Calculate if on bench
  const activeAllocations = resource.allocations.filter(
    (a) => a.status === 'ACTIVE' && a.startDate <= new Date() && a.endDate >= new Date()
  );
  const totalAllocation = activeAllocations.reduce((sum, a) => sum + a.percentage, 0);
  const isOnBench = totalAllocation < resource.capacity;

  return {
    ...resource,
    isOnBench,
    currentUtilization: totalAllocation,
    availableCapacity: resource.capacity - totalAllocation,
  };
}

/**
 * List resources with filters and pagination
 */
export async function listResources(
  tenantId: string,
  filters: ResourceFilters,
  pagination: PaginationOptions
) {
  const { page, limit, sortBy = 'firstName', sortOrder = 'asc' } = pagination;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ResourceWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { employeeId: { contains: filters.search, mode: 'insensitive' } },
      { designation: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.status?.length) {
    where.status = { in: filters.status as ('ACTIVE' | 'INACTIVE' | 'NOTICE')[] };
  }

  if (filters.employmentType?.length) {
    where.employmentType = { in: filters.employmentType as ('FTE' | 'CONTRACTOR' | 'INTERN')[] };
  }

  if (filters.practiceId) {
    where.practiceId = filters.practiceId;
  }

  if (filters.locationId) {
    where.locationId = filters.locationId;
  }

  if (filters.managerId) {
    where.managerId = filters.managerId;
  }

  if (filters.band?.length) {
    where.band = { in: filters.band };
  }

  if (filters.tags?.length) {
    where.tags = { hasSome: filters.tags };
  }

  if (filters.skills?.length) {
    where.skills = {
      some: {
        skillId: { in: filters.skills },
      },
    };
  }

  // Get total count
  const total = await prisma.resource.count({ where });

  // Get resources
  const resources = await prisma.resource.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    include: {
      practice: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true, code: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      skills: {
        take: 5,
        include: {
          skill: { select: { id: true, name: true } },
        },
      },
      allocations: {
        where: {
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        select: {
          percentage: true,
          project: { select: { name: true } },
        },
      },
    },
  });

  // Calculate bench status for each resource
  const resourcesWithBench = resources.map((r) => {
    const currentAllocation = r.allocations.reduce((sum, a) => sum + a.percentage, 0);
    return {
      ...r,
      currentUtilization: currentAllocation,
      isOnBench: currentAllocation < r.capacity,
    };
  });

  // Filter by bench status if requested
  let filteredResources = resourcesWithBench;
  if (filters.isOnBench !== undefined) {
    filteredResources = resourcesWithBench.filter((r) => r.isOnBench === filters.isOnBench);
  }

  return {
    data: filteredResources,
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
 * Update resource
 */
export async function updateResource(
  tenantId: string,
  resourceId: string,
  input: UpdateResourceInput,
  userId: string
) {
  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  // Check duplicate email if changing
  if (input.email && input.email.toLowerCase() !== existing.email) {
    const emailExists = await prisma.resource.findFirst({
      where: {
        tenantId,
        email: input.email.toLowerCase(),
        id: { not: resourceId },
        deletedAt: null,
      },
    });
    if (emailExists) {
      throw new ApiError('Email already in use', 409, 'DUPLICATE_EMAIL');
    }
  }

  // Check duplicate employee ID if changing
  if (input.employeeId && input.employeeId !== existing.employeeId) {
    const empIdExists = await prisma.resource.findFirst({
      where: {
        tenantId,
        employeeId: input.employeeId,
        id: { not: resourceId },
        deletedAt: null,
      },
    });
    if (empIdExists) {
      throw new ApiError('Employee ID already in use', 409, 'DUPLICATE_EMPLOYEE_ID');
    }
  }

  // AUTO-CASCADE: When dateOfExit is set, automatically handle allocations
  // This is GOD LEVEL - no manual cleanup required
  if (input.dateOfExit && (!existing.dateOfExit || input.dateOfExit.getTime() !== existing.dateOfExit.getTime())) {
    const { executeResourceExitCascade } = await import('./resource-exit-cascade.service.js');
    const cascadeResult = await executeResourceExitCascade(
      tenantId,
      resourceId,
      input.dateOfExit,
      {
        performedBy: userId,
        exitReason: input.exitReason,
        skipNotification: false,
      }
    );

    if (!cascadeResult.success && cascadeResult.errors?.length) {
      logger.warn('Resource exit cascade had errors', {
        resourceId,
        errors: cascadeResult.errors,
      });
    }

    logger.info('Resource exit cascade completed', {
      resourceId,
      allocationsEnded: cascadeResult.allocationsEnded,
      projectsAffected: cascadeResult.projectsAffected,
    });
  }

  // If changing status to INACTIVE without exit date, still warn about allocations
  if (input.status && input.status !== 'ACTIVE' && existing.status === 'ACTIVE' && !input.dateOfExit) {
    const activeAllocations = await prisma.allocation.count({
      where: {
        resourceId,
        tenantId,
        deletedAt: null,
        status: { in: ['PROPOSED', 'CONFIRMED', 'ACTIVE'] },
        endDate: { gte: new Date() },
      },
    });
    
    if (activeAllocations > 0) {
      throw new ApiError(
        `Cannot mark resource as ${input.status}. They have ${activeAllocations} active/upcoming allocation(s). Set a dateOfExit to auto-cascade, or manually end allocations first.`,
        400,
        'RESOURCE_HAS_ACTIVE_ALLOCATIONS'
      );
    }
  }

  const updateData: Prisma.ResourceUpdateInput = {};

  if (input.email) updateData.email = input.email.toLowerCase();
  if (input.firstName) updateData.firstName = input.firstName;
  if (input.lastName) updateData.lastName = input.lastName;
  if (input.preferredName !== undefined) updateData.preferredName = input.preferredName;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.employmentType) updateData.employmentType = input.employmentType;
  if (input.band) updateData.band = input.band;
  if (input.designation) updateData.designation = input.designation;
  if (input.department !== undefined) updateData.department = input.department;
  if (input.dateOfJoining) updateData.dateOfJoining = input.dateOfJoining;
  if (input.dateOfExit !== undefined) updateData.dateOfExit = input.dateOfExit;
  if (input.exitReason !== undefined) updateData.exitReason = input.exitReason;
  if (input.capacity !== undefined) updateData.capacity = input.capacity;
  if (input.costPerHour !== undefined) updateData.costPerHour = input.costPerHour;
  if (input.billRateDefault !== undefined) updateData.billRateDefault = input.billRateDefault;
  if (input.status) updateData.status = input.status;
  if (input.tags) updateData.tags = input.tags;
  if (input.employeeId) updateData.employeeId = input.employeeId;

  // Handle relations
  if (input.practiceId !== undefined) {
    if (input.practiceId) {
      updateData.practice = { connect: { id: input.practiceId } };
    } else {
      updateData.practice = { disconnect: true };
    }
  }

  if (input.locationId !== undefined) {
    if (input.locationId) {
      updateData.location = { connect: { id: input.locationId } };
    } else {
      updateData.location = { disconnect: true };
    }
  }

  if (input.managerId !== undefined) {
    if (input.managerId) {
      updateData.manager = { connect: { id: input.managerId } };
    } else {
      updateData.manager = { disconnect: true };
    }
  }

  const resource = await prisma.resource.update({
    where: { id: resourceId },
    data: updateData,
    include: {
      practice: true,
      location: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Resource',
      entityId: resource.id,
      action: 'UPDATE',
      changes: {
        before: existing,
        after: input,
      } as unknown as Prisma.JsonObject,
    },
  });

  logger.info('Resource updated', { resourceId: resource.id });

  return resource;
}

/**
 * Soft delete resource
 */
export async function deleteResource(
  tenantId: string,
  resourceId: string,
  userId: string
) {
  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  // Check for active allocations
  const activeAllocations = await prisma.allocation.count({
    where: {
      resourceId,
      status: { in: ['PROPOSED', 'CONFIRMED', 'ACTIVE'] },
      endDate: { gte: new Date() },
    },
  });

  if (activeAllocations > 0) {
    throw new ApiError(
      'Cannot delete resource with active allocations',
      400,
      'HAS_ACTIVE_ALLOCATIONS'
    );
  }

  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      deletedAt: new Date(),
      status: 'INACTIVE',
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Resource',
      entityId: resourceId,
      action: 'DELETE',
    },
  });

  logger.info('Resource deleted', { resourceId });
}

/**
 * Get bench resources
 */
export async function getBenchResources(tenantId: string) {
  const resources = await prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      benchSince: { not: null },
    },
    include: {
      practice: { select: { name: true } },
      skills: {
        take: 5,
        include: {
          skill: { select: { name: true } },
        },
      },
    },
    orderBy: { benchSince: 'asc' },
  });

  return resources.map((r) => ({
    ...r,
    benchDays: r.benchSince
      ? Math.floor((Date.now() - r.benchSince.getTime()) / (1000 * 60 * 60 * 24))
      : 0,
  }));
}

/**
 * Get resource utilization summary
 */
export async function getResourceUtilizationSummary(tenantId: string) {
  const resources = await prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      allocations: {
        where: {
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          isBillable: true,
        },
        select: { percentage: true },
      },
    },
  });

  let totalCapacity = 0;
  let totalBillable = 0;
  let benchCount = 0;

  for (const resource of resources) {
    totalCapacity += resource.capacity;
    const billable = resource.allocations.reduce((sum, a) => sum + a.percentage, 0);
    totalBillable += billable;
    if (billable === 0) benchCount++;
  }

  return {
    totalResources: resources.length,
    totalCapacity,
    totalBillable,
    utilizationRate: totalCapacity > 0 ? (totalBillable / totalCapacity) * 100 : 0,
    benchCount,
    benchPercentage: resources.length > 0 ? (benchCount / resources.length) * 100 : 0,
  };
}

