/**
 * Approval Functions Service
 * 
 * Manages approval functions (capabilities) and their assignments.
 * Functions are "hats" that users can wear - they define WHO can approve WHAT,
 * separate from organizational structure.
 * 
 * Key concepts:
 * - ApprovalFunction: A capability definition (e.g., "Resource Allocator")
 * - FunctionAssignment: Who holds a function, optionally scoped and time-bound
 * 
 * Created: January 20, 2026
 */

import { Prisma, EntityStatus, FunctionCategory, FunctionScopeType } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateApprovalFunctionInput {
  code: string;
  name: string;
  description?: string;
  category?: FunctionCategory;
  scopeType?: FunctionScopeType;
  allowMultipleHolders?: boolean;
  requiresApproval?: boolean;
  canDelegate?: boolean;
  maxDelegationDays?: number;
  isSystem?: boolean;
  sortOrder?: number;
}

export interface UpdateApprovalFunctionInput {
  name?: string;
  description?: string;
  category?: FunctionCategory;
  scopeType?: FunctionScopeType;
  allowMultipleHolders?: boolean;
  requiresApproval?: boolean;
  canDelegate?: boolean;
  maxDelegationDays?: number;
  status?: EntityStatus;
  sortOrder?: number;
}

export interface CreateFunctionAssignmentInput {
  functionId: string;
  userId: string;
  scopeType?: FunctionScopeType;
  scopeEntityId?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface DelegateFunctionInput {
  delegateUserId: string;
  effectiveTo: Date;
  reason?: string;
}

export interface FunctionFilters {
  status?: EntityStatus[];
  category?: FunctionCategory[];
  scopeType?: FunctionScopeType[];
  isSystem?: boolean;
  search?: string;
}

export interface AssignmentFilters {
  functionId?: string;
  userId?: string;
  scopeType?: FunctionScopeType;
  scopeEntityId?: string;
  status?: EntityStatus[];
  isDelegated?: boolean;
  activeOnly?: boolean;
}

export interface ListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// APPROVAL FUNCTION CRUD
// =============================================================================

/**
 * Create a new approval function
 */
export async function createApprovalFunction(
  tenantId: string,
  input: CreateApprovalFunctionInput
): Promise<Record<string, unknown>> {
  // Check for duplicate code
  const existing = await prisma.approvalFunction.findFirst({
    where: { tenantId, code: input.code, deletedAt: null },
  });

  if (existing) {
    throw new ApiError('Approval function code already exists', 409, 'DUPLICATE_CODE');
  }

  const func = await prisma.approvalFunction.create({
    data: {
      tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      category: input.category || 'APPROVAL',
      scopeType: input.scopeType || 'TENANT',
      allowMultipleHolders: input.allowMultipleHolders ?? true,
      requiresApproval: input.requiresApproval ?? false,
      canDelegate: input.canDelegate ?? true,
      maxDelegationDays: input.maxDelegationDays,
      isSystem: input.isSystem ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  logger.info(`Approval function created: ${func.code}`, { functionId: func.id, tenantId });

  return func as unknown as Record<string, unknown>;
}

/**
 * Get approval function by ID
 */
export async function getApprovalFunction(
  tenantId: string,
  functionId: string
): Promise<Record<string, unknown> | null> {
  const func = await prisma.approvalFunction.findFirst({
    where: { id: functionId, tenantId, deletedAt: null },
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          assignments: { where: { status: 'ACTIVE' } },
          approvalSteps: true,
        },
      },
    },
  });

  return func as unknown as Record<string, unknown>;
}

/**
 * Get approval function by code
 */
export async function getApprovalFunctionByCode(
  tenantId: string,
  code: string
): Promise<Record<string, unknown> | null> {
  const func = await prisma.approvalFunction.findFirst({
    where: { tenantId, code, deletedAt: null },
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return func as unknown as Record<string, unknown>;
}

/**
 * List approval functions
 */
export async function listApprovalFunctions(
  tenantId: string,
  filters: FunctionFilters = {},
  options: ListOptions = {}
): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ApprovalFunctionWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.status?.length) {
    where.status = { in: filters.status };
  }

  if (filters.category?.length) {
    where.category = { in: filters.category };
  }

  if (filters.scopeType?.length) {
    where.scopeType = { in: filters.scopeType };
  }

  if (filters.isSystem !== undefined) {
    where.isSystem = filters.isSystem;
  }

  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search, mode: 'insensitive' } },
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [functions, total] = await Promise.all([
    prisma.approvalFunction.findMany({
      where,
      include: {
        _count: {
          select: {
            assignments: { where: { status: 'ACTIVE' } },
            approvalSteps: true,
          },
        },
      },
      // M-17: sortBy allowlist
      orderBy: { [['sortOrder', 'createdAt', 'updatedAt', 'name', 'code', 'status'].includes(options.sortBy || '') ? options.sortBy! : 'sortOrder']: options.sortOrder || 'asc' },
      skip,
      take: limit,
    }),
    prisma.approvalFunction.count({ where }),
  ]);

  return {
    data: functions as unknown as Record<string, unknown>[],
    total,
    page,
    limit,
  };
}

/**
 * Update approval function
 */
export async function updateApprovalFunction(
  tenantId: string,
  functionId: string,
  input: UpdateApprovalFunctionInput
): Promise<Record<string, unknown>> {
  const func = await prisma.approvalFunction.findFirst({
    where: { id: functionId, tenantId, deletedAt: null },
  });

  if (!func) {
    throw new ApiError('Approval function not found', 404, 'FUNCTION_NOT_FOUND');
  }

  if (func.isSystem && input.status === 'INACTIVE') {
    throw new ApiError('Cannot deactivate system function', 400, 'SYSTEM_FUNCTION');
  }

  const updated = await prisma.approvalFunction.update({
    where: { id: functionId },
    data: {
      name: input.name,
      description: input.description,
      category: input.category,
      scopeType: input.scopeType,
      allowMultipleHolders: input.allowMultipleHolders,
      requiresApproval: input.requiresApproval,
      canDelegate: input.canDelegate,
      maxDelegationDays: input.maxDelegationDays,
      status: input.status,
      sortOrder: input.sortOrder,
    },
  });

  logger.info(`Approval function updated: ${func.code}`, { functionId, tenantId });

  return updated as unknown as Record<string, unknown>;
}

/**
 * Delete approval function (soft delete)
 */
export async function deleteApprovalFunction(
  tenantId: string,
  functionId: string
): Promise<void> {
  const func = await prisma.approvalFunction.findFirst({
    where: { id: functionId, tenantId, deletedAt: null },
    include: {
      _count: {
        select: {
          approvalSteps: true,
          assignments: { where: { status: 'ACTIVE' } },
        },
      },
    },
  });

  if (!func) {
    throw new ApiError('Approval function not found', 404, 'FUNCTION_NOT_FOUND');
  }

  if (func.isSystem) {
    throw new ApiError('Cannot delete system function', 400, 'SYSTEM_FUNCTION');
  }

  if (func._count.approvalSteps > 0) {
    throw new ApiError('Cannot delete function used in approval steps', 400, 'FUNCTION_IN_USE');
  }

  await prisma.approvalFunction.update({
    where: { id: functionId },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });

  logger.info(`Approval function deleted: ${func.code}`, { functionId, tenantId });
}

// =============================================================================
// FUNCTION ASSIGNMENT CRUD
// =============================================================================

/**
 * Create a function assignment
 */
export async function createFunctionAssignment(
  tenantId: string,
  assignedById: string,
  input: CreateFunctionAssignmentInput
): Promise<Record<string, unknown>> {
  // Verify function exists
  const func = await prisma.approvalFunction.findFirst({
    where: { id: input.functionId, tenantId, deletedAt: null, status: 'ACTIVE' },
  });

  if (!func) {
    throw new ApiError('Approval function not found', 404, 'FUNCTION_NOT_FOUND');
  }

  // Verify user exists
  const user = await prisma.user.findFirst({
    where: { id: input.userId, tenantId, status: 'ACTIVE' },
  });

  if (!user) {
    throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Check if user already holds this function with same scope
  if (!func.allowMultipleHolders) {
    const existingAssignment = await prisma.functionAssignment.findFirst({
      where: {
        tenantId,
        functionId: input.functionId,
        status: 'ACTIVE',
        scopeType: input.scopeType || null,
        scopeEntityId: input.scopeEntityId || null,
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
    });

    if (existingAssignment && existingAssignment.userId !== input.userId) {
      throw new ApiError('Function already assigned to another user', 409, 'FUNCTION_ALREADY_ASSIGNED');
    }
  }

  const assignment = await prisma.functionAssignment.create({
    data: {
      tenantId,
      functionId: input.functionId,
      userId: input.userId,
      scopeType: input.scopeType,
      scopeEntityId: input.scopeEntityId,
      effectiveFrom: input.effectiveFrom || new Date(),
      effectiveTo: input.effectiveTo,
      assignedById,
      approvalStatus: func.requiresApproval ? 'PENDING' : 'APPROVED',
    },
    include: {
      function: { select: { code: true, name: true } },
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  logger.info(`Function assigned: ${func.code} to ${user.email}`, {
    assignmentId: assignment.id,
    functionId: input.functionId,
    userId: input.userId,
    tenantId,
  });

  return assignment as unknown as Record<string, unknown>;
}

/**
 * Get function assignment by ID
 */
export async function getFunctionAssignment(
  tenantId: string,
  assignmentId: string
): Promise<Record<string, unknown> | null> {
  const assignment = await prisma.functionAssignment.findFirst({
    where: { id: assignmentId, tenantId },
    include: {
      function: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      delegatedFrom: { select: { id: true, email: true, firstName: true, lastName: true } },
      assignedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  return assignment as unknown as Record<string, unknown>;
}

/**
 * List function assignments
 */
export async function listFunctionAssignments(
  tenantId: string,
  filters: AssignmentFilters = {},
  options: ListOptions = {}
): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const skip = (page - 1) * limit;

  const now = new Date();
  const where: Prisma.FunctionAssignmentWhereInput = { tenantId };

  if (filters.functionId) {
    where.functionId = filters.functionId;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.scopeType) {
    where.scopeType = filters.scopeType;
  }

  if (filters.scopeEntityId) {
    where.scopeEntityId = filters.scopeEntityId;
  }

  if (filters.status?.length) {
    where.status = { in: filters.status };
  }

  if (filters.isDelegated !== undefined) {
    where.isDelegated = filters.isDelegated;
  }

  if (filters.activeOnly) {
    where.status = 'ACTIVE';
    where.approvalStatus = 'APPROVED';
    where.effectiveFrom = { lte: now };
    where.OR = [
      { effectiveTo: null },
      { effectiveTo: { gte: now } },
    ];
  }

  const [assignments, total] = await Promise.all([
    prisma.functionAssignment.findMany({
      where,
      include: {
        function: { select: { code: true, name: true, category: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        delegatedFrom: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { [options.sortBy || 'createdAt']: options.sortOrder || 'desc' },
      skip,
      take: limit,
    }),
    prisma.functionAssignment.count({ where }),
  ]);

  return {
    data: assignments as unknown as Record<string, unknown>[],
    total,
    page,
    limit,
  };
}

/**
 * Revoke a function assignment
 */
export async function revokeFunctionAssignment(
  tenantId: string,
  assignmentId: string,
  revokedById: string,
  reason?: string
): Promise<Record<string, unknown>> {
  const assignment = await prisma.functionAssignment.findFirst({
    where: { id: assignmentId, tenantId },
    include: { function: true, user: true },
  });

  if (!assignment) {
    throw new ApiError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
  }

  if (assignment.status !== 'ACTIVE') {
    throw new ApiError('Assignment is not active', 400, 'ASSIGNMENT_NOT_ACTIVE');
  }

  const updated = await prisma.functionAssignment.update({
    where: { id: assignmentId },
    data: {
      status: 'INACTIVE',
      revokedAt: new Date(),
      revokedById,
      revocationReason: reason,
    },
  });

  logger.info(`Function assignment revoked: ${assignment.function.code} from ${assignment.user.email}`, {
    assignmentId,
    tenantId,
    revokedBy: revokedById,
    reason,
  });

  return updated as unknown as Record<string, unknown>;
}

/**
 * Delegate a function to another user
 */
export async function delegateFunction(
  tenantId: string,
  assignmentId: string,
  delegatorId: string,
  input: DelegateFunctionInput
): Promise<Record<string, unknown>> {
  const assignment = await prisma.functionAssignment.findFirst({
    where: { id: assignmentId, tenantId, userId: delegatorId, status: 'ACTIVE' },
    include: { function: true },
  });

  if (!assignment) {
    throw new ApiError('Assignment not found or you are not the holder', 404, 'ASSIGNMENT_NOT_FOUND');
  }

  if (!assignment.function.canDelegate) {
    throw new ApiError('This function cannot be delegated', 400, 'DELEGATION_NOT_ALLOWED');
  }

  // Check max delegation days
  if (assignment.function.maxDelegationDays) {
    const days = Math.ceil((input.effectiveTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days > assignment.function.maxDelegationDays) {
      throw new ApiError(
        `Delegation cannot exceed ${assignment.function.maxDelegationDays} days`,
        400,
        'DELEGATION_TOO_LONG'
      );
    }
  }

  // H-03: Prevent self-delegation
  if (delegatorId === input.delegateUserId) {
    throw new ApiError('Cannot delegate a function to yourself', 400, 'SELF_DELEGATION_NOT_ALLOWED');
  }

  // Verify delegate user exists
  const delegateUser = await prisma.user.findFirst({
    where: { id: input.delegateUserId, tenantId, status: 'ACTIVE' },
  });

  if (!delegateUser) {
    throw new ApiError('Delegate user not found', 404, 'USER_NOT_FOUND');
  }

  // Create delegation assignment
  const delegation = await prisma.functionAssignment.create({
    data: {
      tenantId,
      functionId: assignment.functionId,
      userId: input.delegateUserId,
      scopeType: assignment.scopeType,
      scopeEntityId: assignment.scopeEntityId,
      effectiveFrom: new Date(),
      effectiveTo: input.effectiveTo,
      isDelegated: true,
      delegatedFromId: delegatorId,
      delegationReason: input.reason,
      assignedById: delegatorId,
      approvalStatus: 'APPROVED',
    },
    include: {
      function: { select: { code: true, name: true } },
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  logger.info(`Function delegated: ${assignment.function.code}`, {
    delegationId: delegation.id,
    from: delegatorId,
    to: input.delegateUserId,
    until: input.effectiveTo,
    tenantId,
  });

  return delegation as unknown as Record<string, unknown>;
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get all active function assignments for a user
 */
export async function getAssignmentsForUser(
  tenantId: string,
  userId: string
): Promise<Record<string, unknown>[]> {
  const now = new Date();

  const assignments = await prisma.functionAssignment.findMany({
    where: {
      tenantId,
      userId,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      effectiveFrom: { lte: now },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: now } },
      ],
    },
    include: {
      function: true,
    },
    orderBy: { function: { name: 'asc' } },
  });

  return assignments as unknown as Record<string, unknown>[];
}

/**
 * Get all users who hold a specific function
 */
export async function getFunctionHolders(
  tenantId: string,
  functionId: string,
  scopeType?: FunctionScopeType,
  scopeEntityId?: string
): Promise<{ userId: string; email: string; firstName: string; lastName: string; assignmentId: string; isDelegated: boolean }[]> {
  const now = new Date();

  const where: Prisma.FunctionAssignmentWhereInput = {
    tenantId,
    functionId,
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    effectiveFrom: { lte: now },
    OR: [
      { effectiveTo: null },
      { effectiveTo: { gte: now } },
    ],
  };

  if (scopeType) {
    where.scopeType = scopeType;
  }

  if (scopeEntityId) {
    where.scopeEntityId = scopeEntityId;
  }

  const assignments = await prisma.functionAssignment.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  return assignments.map(a => ({
    userId: a.userId,
    email: a.user.email,
    firstName: a.user.firstName,
    lastName: a.user.lastName,
    assignmentId: a.id,
    isDelegated: a.isDelegated,
  }));
}

/**
 * Check if a user holds a specific function
 */
export async function checkUserHasFunction(
  tenantId: string,
  userId: string,
  functionCode: string,
  scopeType?: FunctionScopeType,
  scopeEntityId?: string
): Promise<boolean> {
  const now = new Date();

  const where: Prisma.FunctionAssignmentWhereInput = {
    tenantId,
    userId,
    function: { code: functionCode },
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    effectiveFrom: { lte: now },
    OR: [
      { effectiveTo: null },
      { effectiveTo: { gte: now } },
    ],
  };

  if (scopeType) {
    where.scopeType = scopeType;
  }

  if (scopeEntityId) {
    where.scopeEntityId = scopeEntityId;
  }

  const count = await prisma.functionAssignment.count({ where });

  return count > 0;
}

/**
 * Resolve function to current holders (for approver resolution)
 */
export async function resolveFunctionToHolders(
  tenantId: string,
  functionId: string,
  scopeContext?: { practiceId?: string; projectId?: string; departmentId?: string; teamId?: string }
): Promise<{ userId: string; functionName: string; assignmentId: string; isDelegated: boolean }[]> {
  const func = await prisma.approvalFunction.findFirst({
    where: { id: functionId, tenantId, deletedAt: null, status: 'ACTIVE' },
  });

  if (!func) {
    return [];
  }

  // Determine scope filter based on function's scopeType and provided context
  let scopeEntityId: string | undefined;
  if (func.scopeType === 'PRACTICE' && scopeContext?.practiceId) {
    scopeEntityId = scopeContext.practiceId;
  } else if (func.scopeType === 'PROJECT' && scopeContext?.projectId) {
    scopeEntityId = scopeContext.projectId;
  } else if (func.scopeType === 'DEPARTMENT' && scopeContext?.departmentId) {
    scopeEntityId = scopeContext.departmentId;
  } else if (func.scopeType === 'TEAM' && scopeContext?.teamId) {
    scopeEntityId = scopeContext.teamId;
  }

  const holders = await getFunctionHolders(
    tenantId,
    functionId,
    func.scopeType !== 'TENANT' ? func.scopeType : undefined,
    scopeEntityId
  );

  return holders.map(h => ({
    userId: h.userId,
    functionName: func.name,
    assignmentId: h.assignmentId,
    isDelegated: h.isDelegated,
  }));
}
