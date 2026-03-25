import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import { createAuditLog } from '../audit/audit.service';

// ============================================================================
// Types
// ============================================================================

export interface CreateAllocationInput {
  resourceId: string;
  projectId: string;
  role: string;
  percentage: number;
  startDate: Date;
  endDate: Date;
  isBillable?: boolean;
  billRate?: number;
  notes?: string;
}

export interface UpdateAllocationInput extends Partial<CreateAllocationInput> {
  status?: 'PROPOSED' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  actualEndDate?: Date;
  cancelReason?: string;
}

export interface AllocationFilters {
  resourceId?: string;
  projectId?: string;
  status?: string[];
  isBillable?: boolean;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  rollingOffWithinDays?: number;
}

export interface AvailabilitySlot {
  startDate: Date;
  endDate: Date;
  availablePercentage: number;
}

export interface AllocationConflict {
  resourceId: string;
  resourceName: string;
  existingAllocations: Array<{
    projectName: string;
    percentage: number;
    startDate: Date;
    endDate: Date;
  }>;
  requestedPercentage: number;
  totalPercentage: number;
  overallocationPercentage: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new allocation
 */
export async function createAllocation(
  tenantId: string,
  input: CreateAllocationInput,
  userId: string,
  skipConflictCheck = false
) {
  // Validate resource exists
  const resource = await prisma.resource.findFirst({
    where: { id: input.resourceId, tenantId, deletedAt: null },
  });

  if (!resource) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  // Check resource is active (cannot allocate to inactive/former employees)
  if (resource.status !== 'ACTIVE') {
    throw new ApiError(
      `Cannot create allocation for inactive resource. ${resource.firstName} ${resource.lastName} has status: ${resource.status}`,
      400,
      'RESOURCE_INACTIVE'
    );
  }

  // Validate project
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, tenantId, deletedAt: null },
  });

  if (!project) {
    throw new ApiError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Validate dates
  if (input.endDate < input.startDate) {
    throw new ApiError('End date must be after start date', 400, 'INVALID_DATES');
  }

  // Check for conflicts
  if (!skipConflictCheck) {
    const conflict = await checkAllocationConflicts(
      tenantId,
      input.resourceId,
      input.percentage,
      input.startDate,
      input.endDate,
      resource.capacity
    );

    if (conflict) {
      throw new ApiError(
        `Resource would be over-allocated by ${conflict.overallocationPercentage}%`,
        409,
        'ALLOCATION_CONFLICT',
      );
    }
  }

  const allocation = await prisma.allocation.create({
    data: {
      tenantId,
      resourceId: input.resourceId,
      projectId: input.projectId,
      requestedById: userId,
      role: input.role,
      percentage: input.percentage,
      startDate: input.startDate,
      endDate: input.endDate,
      isBillable: input.isBillable ?? true,
      billRate: input.billRate,
      notes: input.notes,
      status: 'PROPOSED',
    },
    include: {
      resource: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      project: { select: { id: true, code: true, name: true, client: true } },
      requestedBy: { select: { firstName: true, lastName: true } },
    },
  });

  // Update resource bench status if allocation starts now or in past
  if (input.startDate <= new Date()) {
    await updateResourceBenchStatus(tenantId, input.resourceId);
  }

  await createAuditLog(
    tenantId,
    userId,
    'Allocation',
    allocation.id,
    'CREATE',
    input as unknown as Record<string, unknown>
  );

  logger.info('Allocation created', { allocationId: allocation.id });

  return allocation;
}

/**
 * Get allocation by ID
 */
export async function getAllocationById(tenantId: string, allocationId: string) {
  const allocation = await prisma.allocation.findFirst({
    where: { id: allocationId, tenantId, deletedAt: null },
    include: {
      resource: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          email: true,
          designation: true,
          band: true,
          practice: true,
        },
      },
      project: {
        include: {
          client: { select: { id: true, name: true } },
          manager: { select: { firstName: true, lastName: true } },
        },
      },
      requestedBy: { select: { firstName: true, lastName: true } },
      approvedBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!allocation) {
    throw new ApiError('Allocation not found', 404, 'ALLOCATION_NOT_FOUND');
  }

  return allocation;
}

/**
 * List allocations with filters
 */
export async function listAllocations(
  tenantId: string,
  filters: AllocationFilters,
  pagination: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
) {
  const { page, limit, sortBy: rawSortBy = 'startDate', sortOrder = 'desc' } = pagination;
  // M-17: sortBy allowlist
  const ALLOWED_ALLOC_SORT = ['startDate', 'endDate', 'createdAt', 'updatedAt', 'status', 'allocationPercentage'];
  const sortBy = ALLOWED_ALLOC_SORT.includes(rawSortBy) ? rawSortBy : 'startDate';
  const skip = (page - 1) * limit;

  const where: Prisma.AllocationWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.resourceId) {
    where.resourceId = filters.resourceId;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.status?.length) {
    where.status = { in: filters.status as ('PROPOSED' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED')[] };
  }

  if (filters.isBillable !== undefined) {
    where.isBillable = filters.isBillable;
  }

  if (filters.startDateFrom || filters.startDateTo) {
    where.startDate = {};
    if (filters.startDateFrom) where.startDate.gte = filters.startDateFrom;
    if (filters.startDateTo) where.startDate.lte = filters.startDateTo;
  }

  if (filters.endDateFrom || filters.endDateTo) {
    where.endDate = {};
    if (filters.endDateFrom) where.endDate.gte = filters.endDateFrom;
    if (filters.endDateTo) where.endDate.lte = filters.endDateTo;
  }

  if (filters.rollingOffWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.rollingOffWithinDays);
    where.status = { in: ['ACTIVE', 'CONFIRMED'] };
    where.endDate = {
      gte: new Date(),
      lte: futureDate,
    };
  }

  const [allocations, total] = await Promise.all([
    prisma.allocation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        resource: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            designation: true,
            practice: { select: { name: true } },
          },
        },
        project: {
          select: {
            id: true,
            code: true,
            name: true,
            client: { select: { name: true } },
          },
        },
      },
    }),
    prisma.allocation.count({ where }),
  ]);

  return {
    data: allocations,
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
 * Update allocation
 */
export async function updateAllocation(
  tenantId: string,
  allocationId: string,
  input: UpdateAllocationInput,
  userId: string
) {
  const existing = await prisma.allocation.findFirst({
    where: { id: allocationId, tenantId, deletedAt: null },
    include: { resource: true },
  });

  if (!existing) {
    throw new ApiError('Allocation not found', 404, 'ALLOCATION_NOT_FOUND');
  }

  // Prevent updates to completed/cancelled allocations
  if (['COMPLETED', 'CANCELLED'].includes(existing.status) && input.status !== 'ACTIVE') {
    throw new ApiError('Cannot modify completed or cancelled allocation', 400, 'ALLOCATION_CLOSED');
  }

  // Check conflicts if changing percentage or dates
  if (
    (input.percentage && input.percentage !== existing.percentage) ||
    (input.startDate && input.startDate !== existing.startDate) ||
    (input.endDate && input.endDate !== existing.endDate)
  ) {
    const conflict = await checkAllocationConflicts(
      tenantId,
      existing.resourceId,
      input.percentage ?? existing.percentage,
      input.startDate ?? existing.startDate,
      input.endDate ?? existing.endDate,
      existing.resource.capacity,
      allocationId // Exclude self
    );

    if (conflict) {
      throw new ApiError(
        `Resource would be over-allocated by ${conflict.overallocationPercentage}%`,
        409,
        'ALLOCATION_CONFLICT'
      );
    }
  }

  // Handle status transitions
  const updateData: Prisma.AllocationUpdateInput = {};

  if (input.role) updateData.role = input.role;
  if (input.percentage) updateData.percentage = input.percentage;
  if (input.startDate) updateData.startDate = input.startDate;
  if (input.endDate) updateData.endDate = input.endDate;
  if (input.actualEndDate) updateData.actualEndDate = input.actualEndDate;
  if (input.isBillable !== undefined) updateData.isBillable = input.isBillable;
  if (input.billRate !== undefined) updateData.billRate = input.billRate;
  if (input.notes !== undefined) updateData.notes = input.notes;

  if (input.status) {
    updateData.status = input.status;

    switch (input.status) {
      case 'CONFIRMED':
        updateData.confirmedAt = new Date();
        updateData.approvedBy = { connect: { id: userId } };
        break;
      case 'ACTIVE':
        if (!existing.confirmedAt) {
          updateData.confirmedAt = new Date();
          updateData.approvedBy = { connect: { id: userId } };
        }
        updateData.startedAt = new Date();
        break;
      case 'COMPLETED':
        updateData.completedAt = new Date();
        updateData.actualEndDate = input.actualEndDate ?? new Date();
        break;
      case 'CANCELLED':
        updateData.cancelledAt = new Date();
        updateData.cancelReason = input.cancelReason;
        break;
    }
  }

  const allocation = await prisma.allocation.update({
    where: { id: allocationId },
    data: updateData,
    include: {
      resource: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, code: true, name: true } },
    },
  });

  // Update resource bench status
  await updateResourceBenchStatus(tenantId, existing.resourceId);

  await createAuditLog(
    tenantId,
    userId,
    'Allocation',
    allocation.id,
    'UPDATE',
    { before: existing, after: input } as unknown as Record<string, unknown>
  );

  return allocation;
}

/**
 * Delete allocation
 */
export async function deleteAllocation(
  tenantId: string,
  allocationId: string,
  userId: string,
  reason?: string
) {
  const existing = await prisma.allocation.findFirst({
    where: { id: allocationId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Allocation not found', 404, 'ALLOCATION_NOT_FOUND');
  }

  await prisma.allocation.update({
    where: { id: allocationId },
    data: {
      deletedAt: new Date(),
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });

  // Update resource bench status
  await updateResourceBenchStatus(tenantId, existing.resourceId);

  await createAuditLog(
    tenantId,
    userId,
    'Allocation',
    allocationId,
    'DELETE',
    { reason }
  );

  logger.info('Allocation deleted', { allocationId });
}

/**
 * Check for allocation conflicts
 */
export async function checkAllocationConflicts(
  tenantId: string,
  resourceId: string,
  percentage: number,
  startDate: Date,
  endDate: Date,
  capacity: number = 100,
  excludeAllocationId?: string
): Promise<AllocationConflict | null> {
  // Get overlapping allocations
  const overlapping = await prisma.allocation.findMany({
    where: {
      tenantId,
      resourceId,
      status: { in: ['PROPOSED', 'CONFIRMED', 'ACTIVE'] },
      deletedAt: null,
      id: excludeAllocationId ? { not: excludeAllocationId } : undefined,
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    },
    include: {
      project: { select: { name: true } },
    },
  });

  if (overlapping.length === 0) {
    return null;
  }

  // Calculate total allocation during the period
  const existingTotal = overlapping.reduce((sum, a) => sum + a.percentage, 0);
  const totalPercentage = existingTotal + percentage;

  if (totalPercentage <= capacity) {
    return null;
  }

  // Get resource name
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { firstName: true, lastName: true },
  });

  return {
    resourceId,
    resourceName: resource ? `${resource.firstName} ${resource.lastName}` : 'Unknown',
    existingAllocations: overlapping.map((a) => ({
      projectName: a.project.name,
      percentage: a.percentage,
      startDate: a.startDate,
      endDate: a.endDate,
    })),
    requestedPercentage: percentage,
    totalPercentage,
    overallocationPercentage: totalPercentage - capacity,
  };
}

/**
 * Get resource availability
 */
export async function getResourceAvailability(
  tenantId: string,
  resourceId: string,
  startDate: Date,
  endDate: Date
): Promise<AvailabilitySlot[]> {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
  });

  if (!resource) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  const allocations = await prisma.allocation.findMany({
    where: {
      tenantId,
      resourceId,
      status: { in: ['CONFIRMED', 'ACTIVE'] },
      deletedAt: null,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    orderBy: { startDate: 'asc' },
  });

  // Generate daily availability (simplified - could be optimized)
  const slots: AvailabilitySlot[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayEnd = new Date(currentDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayAllocations = allocations.filter(
      (a) => a.startDate <= currentDate && a.endDate >= currentDate
    );

    const allocatedPercentage = dayAllocations.reduce((sum, a) => sum + a.percentage, 0);
    const availablePercentage = Math.max(0, resource.capacity - allocatedPercentage);

    // Merge consecutive days with same availability
    const lastSlot = slots[slots.length - 1];
    if (lastSlot && lastSlot.availablePercentage === availablePercentage) {
      lastSlot.endDate = dayEnd;
    } else {
      slots.push({
        startDate: new Date(currentDate),
        endDate: dayEnd,
        availablePercentage,
      });
    }

    currentDate = dayEnd;
  }

  return slots;
}

/**
 * Get upcoming roll-offs
 */
export async function getUpcomingRolloffs(tenantId: string, days: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return prisma.allocation.findMany({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'CONFIRMED'] },
      deletedAt: null,
      endDate: {
        gte: new Date(),
        lte: futureDate,
      },
    },
    include: {
      resource: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          email: true,
          designation: true,
          practice: { select: { name: true } },
        },
      },
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          client: { select: { name: true } },
          manager: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { endDate: 'asc' },
  });
}

/**
 * Update resource bench status
 */
async function updateResourceBenchStatus(tenantId: string, resourceId: string) {
  const now = new Date();

  const activeAllocations = await prisma.allocation.findMany({
    where: {
      tenantId,
      resourceId,
      status: 'ACTIVE',
      deletedAt: null,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  const totalAllocation = activeAllocations.reduce((sum, a) => sum + a.percentage, 0);
  const isOnBench = totalAllocation === 0;

  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      benchSince: isOnBench ? (await prisma.resource.findUnique({ where: { id: resourceId } }))?.benchSince ?? now : null,
      lastAllocatedAt: !isOnBench ? now : undefined,
    },
  });
}

/**
 * Bulk create allocations
 */
export async function bulkCreateAllocations(
  tenantId: string,
  allocations: CreateAllocationInput[],
  userId: string
) {
  const results = {
    created: 0,
    failed: 0,
    errors: [] as Array<{ index: number; error: string }>,
  };

  for (let i = 0; i < allocations.length; i++) {
    try {
      await createAllocation(tenantId, allocations[i], userId);
      results.created++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        index: i,
        error: (error as Error).message,
      });
    }
  }

  return results;
}

