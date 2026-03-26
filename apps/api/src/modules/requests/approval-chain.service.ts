/**
 * Approval Chain Service
 * Manages approval workflows, chains, steps, and dynamic approver resolution
 */

import { Prisma, ApprovalChainStatus, ApprovalChainScope, ApproverType, ApprovalMode, ConflictResolution, DelegationApprovalStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import { resolveFunctionToHolders } from '../functions/functions.service';
import { createAuditLog } from '../audit/audit.service';

// ============================================================================
// Types
// ============================================================================

export interface CreateApprovalChainInput {
  code?: string;
  name: string;
  description?: string;
  scope?: ApprovalChainScope;
  practiceId?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  steps: CreateApprovalStepInput[];
}

export interface CreateApprovalStepInput {
  name: string;
  instructions?: string;
  stepOrder: number;
  approverType: ApproverType;
  approverRoleId?: string;
  approverUserId?: string;
  practiceSource?: string;
  roleAssignmentMode?: string;
  fallbackType?: ApproverType;
  fallbackRoleId?: string;
  fallbackUserId?: string;
  skipIfUnresolvable?: boolean;
  approvalMode?: ApprovalMode;
  onConflict?: ConflictResolution;
  isOptional?: boolean;
  canDelegate?: boolean;
  skipCondition?: Record<string, unknown>;
  autoApproveAfterHours?: number;
  autoApproveCondition?: Record<string, unknown>;
  slaHours?: number;
  escalateAfterHours?: number;
  escalateToType?: ApproverType;
  escalateToRoleId?: string;
  escalateToUserId?: string;
  reminderAfterHours?: number;
  reminderIntervalHours?: number;
  maxReminders?: number;
}

export interface UpdateApprovalChainInput {
  name?: string;
  description?: string;
  scope?: ApprovalChainScope;
  practiceId?: string;
  status?: ApprovalChainStatus;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface ResolvedApprover {
  userId: string;
  stepId: string;
  stepOrder: number;
  stepName: string;
  approverType: ApproverType;
  reason: string;
  isDelegated?: boolean;
  delegatedFromId?: string;
}

export interface ApprovalChainFilters {
  status?: ApprovalChainStatus[];
  scope?: ApprovalChainScope[];
  practiceId?: string;
  search?: string;
}

export interface ApprovalChainListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function toWorkflowBaseCode(name: string): string {
  const normalized = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const fallback = normalized || 'WORKFLOW';
  const startsWithLetter = /^[A-Z]/.test(fallback);
  const prefixed = startsWithLetter ? fallback : `WF_${fallback}`;

  return prefixed.slice(0, 50);
}

function normalizeRequestedCode(code?: string): string | undefined {
  if (!code) return undefined;
  const trimmed = code.trim().toUpperCase();
  return trimmed || undefined;
}

function withSuffix(baseCode: string, suffix: number): string {
  if (suffix <= 1) return baseCode;
  const suffixText = `_${suffix}`;
  const maxBaseLength = 50 - suffixText.length;
  return `${baseCode.slice(0, maxBaseLength)}${suffixText}`;
}

async function resolveApprovalChainCode(
  tenantId: string,
  name: string,
  requestedCode?: string
): Promise<string> {
  const normalizedRequested = normalizeRequestedCode(requestedCode);
  const initialCode = normalizedRequested || toWorkflowBaseCode(name);

  if (!/^[A-Z][A-Z0-9_]{1,49}$/.test(initialCode)) {
    throw new ApiError(
      'Code must start with a letter and contain only uppercase letters, numbers, and underscores (2-50 chars)',
      400,
      'INVALID_CODE_FORMAT'
    );
  }

  let attempt = 1;
  while (attempt <= 200) {
    const candidate = withSuffix(initialCode, attempt);
    const existing = await prisma.approvalChain.findFirst({
      where: { tenantId, code: candidate, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    attempt += 1;
  }

  throw new ApiError('Unable to generate unique workflow code', 500, 'CODE_GENERATION_FAILED');
}

// ============================================================================
// Approval Chain CRUD
// ============================================================================

/**
 * Create a new approval chain with steps
 */
export async function createApprovalChain(
  tenantId: string,
  userId: string,
  input: CreateApprovalChainInput
): Promise<Record<string, unknown>> {
  const resolvedCode = await resolveApprovalChainCode(tenantId, input.name, input.code);

  // Validate steps
  if (!input.steps || input.steps.length === 0) {
    throw new ApiError('At least one approval step is required', 400, 'STEPS_REQUIRED');
  }

  // Validate step order
  const orders = input.steps.map(s => s.stepOrder);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    throw new ApiError('Step orders must be unique', 400, 'DUPLICATE_STEP_ORDER');
  }

  // Create chain with steps in transaction
  const chain = await prisma.$transaction(async (tx) => {
    const newChain = await tx.approvalChain.create({
      data: {
        tenantId,
        code: resolvedCode,
        name: input.name,
        description: input.description,
        scope: input.scope || 'TENANT',
        practiceId: input.practiceId,
        effectiveFrom: input.effectiveFrom || new Date(),
        effectiveTo: input.effectiveTo,
        status: 'DRAFT',
        version: 1,
        createdById: userId,
      },
    });

    // Create steps
    for (const step of input.steps) {
      await tx.approvalStep.create({
        data: {
          chainId: newChain.id,
          name: step.name,
          instructions: step.instructions,
          stepOrder: step.stepOrder,
          approverType: step.approverType,
          approverRoleId: step.approverRoleId,
          approverUserId: step.approverUserId,
          practiceSource: step.practiceSource as any,
          roleAssignmentMode: (step.roleAssignmentMode as any) || 'ANY',
          fallbackType: step.fallbackType,
          fallbackRoleId: step.fallbackRoleId,
          fallbackUserId: step.fallbackUserId,
          skipIfUnresolvable: step.skipIfUnresolvable || false,
          approvalMode: step.approvalMode || 'ANY',
          onConflict: step.onConflict || 'REJECTION_WINS',
          isOptional: step.isOptional || false,
          canDelegate: step.canDelegate ?? true,
          skipCondition: step.skipCondition as Prisma.InputJsonValue,
          autoApproveAfterHours: step.autoApproveAfterHours,
          autoApproveCondition: step.autoApproveCondition as Prisma.InputJsonValue,
          slaHours: step.slaHours,
          escalateAfterHours: step.escalateAfterHours,
          escalateToType: step.escalateToType,
          escalateToRoleId: step.escalateToRoleId,
          escalateToUserId: step.escalateToUserId,
          reminderAfterHours: step.reminderAfterHours || 24,
          reminderIntervalHours: step.reminderIntervalHours || 24,
          maxReminders: step.maxReminders || 3,
        },
      });
    }

    return newChain;
  });

  logger.info(`Approval chain created: ${chain.code}`, {
    chainId: chain.id,
    tenantId,
    userId,
    codeAutoGenerated: !input.code,
  });

  // Return with steps
  return getApprovalChain(tenantId, chain.id) as Promise<Record<string, unknown>>;
}

/**
 * Get approval chain by ID
 */
export async function getApprovalChain(
  tenantId: string,
  chainId: string
): Promise<Record<string, unknown> | null> {
  const chain = await prisma.approvalChain.findFirst({
    where: { id: chainId, tenantId, deletedAt: null },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: {
          approverRole: { select: { id: true, name: true } },
          approverUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      practice: { select: { id: true, name: true, code: true } },
      tenantConfigs: { select: { requestTypeId: true } },
    },
  });

  return chain as unknown as Record<string, unknown>;
}

/**
 * Get approval chain by code
 */
export async function getApprovalChainByCode(
  tenantId: string,
  code: string
): Promise<Record<string, unknown> | null> {
  const chain = await prisma.approvalChain.findFirst({
    where: { code, tenantId, deletedAt: null },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: {
          approverRole: { select: { id: true, name: true } },
        },
      },
    },
  });

  return chain as unknown as Record<string, unknown>;
}

/**
 * List approval chains
 */
export async function listApprovalChains(
  tenantId: string,
  filters: ApprovalChainFilters = {},
  options: ApprovalChainListOptions = {}
): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ApprovalChainWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.status?.length) {
    where.status = { in: filters.status };
  }

  if (filters.scope?.length) {
    where.scope = { in: filters.scope };
  }

  if (filters.practiceId) {
    where.practiceId = filters.practiceId;
  }

  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search, mode: 'insensitive' } },
      { name: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // M-17: sortBy allowlist
  const ALLOWED_CHAIN_SORT = ['createdAt', 'updatedAt', 'name', 'status', 'priority'];
  const safeSortBy = ALLOWED_CHAIN_SORT.includes(options.sortBy || '') ? options.sortBy! : 'createdAt';

  const [chains, total] = await Promise.all([
    prisma.approvalChain.findMany({
      where,
      include: {
        steps: { orderBy: { stepOrder: 'asc' }, select: { id: true, name: true, stepOrder: true } },
        practice: { select: { name: true } },
        _count: { select: { requests: true } },
      },
      orderBy: { [safeSortBy]: options.sortOrder || 'desc' },
      skip,
      take: limit,
    }),
    prisma.approvalChain.count({ where }),
  ]);

  return {
    data: chains as unknown as Record<string, unknown>[],
    total,
    page,
    limit,
  };
}

/**
 * Update approval chain
 */
export async function updateApprovalChain(
  tenantId: string,
  chainId: string,
  userId: string,
  input: UpdateApprovalChainInput
): Promise<Record<string, unknown>> {
  const chain = await prisma.approvalChain.findFirst({
    where: { id: chainId, tenantId, deletedAt: null },
  });

  if (!chain) {
    throw new ApiError('Approval chain not found', 404, 'CHAIN_NOT_FOUND');
  }

  // Check if chain is in use when archiving
  if (input.status === 'ARCHIVED') {
    const inUse = await prisma.request.count({
      where: {
        approvalChainId: chainId,
        status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'IN_PROGRESS'] },
      },
    });

    if (inUse > 0) {
      throw new ApiError('Cannot archive chain with active requests', 400, 'CHAIN_IN_USE');
    }
  }

  await prisma.approvalChain.update({
    where: { id: chainId },
    data: {
      name: input.name,
      description: input.description,
      scope: input.scope,
      practiceId: input.practiceId,
      status: input.status,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      version: { increment: 1 },
    },
  });

  logger.info(`Approval chain updated: ${chain.code}`, { chainId, tenantId, updatedBy: userId });

  return getApprovalChain(tenantId, chainId) as Promise<Record<string, unknown>>;
}

/**
 * Publish approval chain
 */
export async function publishApprovalChain(
  tenantId: string,
  chainId: string,
  userId: string
): Promise<Record<string, unknown>> {
  const chain = await prisma.approvalChain.findFirst({
    where: { id: chainId, tenantId, deletedAt: null },
    include: { steps: true },
  });

  if (!chain) {
    throw new ApiError('Approval chain not found', 404, 'CHAIN_NOT_FOUND');
  }

  if (chain.steps.length === 0) {
    throw new ApiError('Cannot publish chain with no steps', 400, 'NO_STEPS');
  }

  await prisma.approvalChain.update({
    where: { id: chainId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      publishedById: userId,
    },
  });

  logger.info(`Approval chain published: ${chain.code}`, { chainId, tenantId, publishedBy: userId });

  return getApprovalChain(tenantId, chainId) as Promise<Record<string, unknown>>;
}

/**
 * Delete approval chain (soft delete)
 */
export async function deleteApprovalChain(
  tenantId: string,
  chainId: string,
  _userId: string
): Promise<void> {
  const chain = await prisma.approvalChain.findFirst({
    where: { id: chainId, tenantId, deletedAt: null },
  });

  if (!chain) {
    throw new ApiError('Approval chain not found', 404, 'CHAIN_NOT_FOUND');
  }

  // Check if chain is in use
  const inUse = await prisma.request.count({
    where: {
      approvalChainId: chainId,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'REJECTED', 'REVERSED'] },
    },
  });

  if (inUse > 0) {
    throw new ApiError('Cannot delete chain with active requests', 400, 'CHAIN_IN_USE');
  }

  await prisma.approvalChain.update({
    where: { id: chainId },
    data: { deletedAt: new Date() },
  });

  logger.info(`Approval chain deleted: ${chain.code}`, { chainId, tenantId });
}

// ============================================================================
// Approval Step Management
// ============================================================================

/**
 * Add step to approval chain
 */
export async function addApprovalStep(
  tenantId: string,
  chainId: string,
  input: CreateApprovalStepInput
): Promise<Record<string, unknown>> {
  const chain = await prisma.approvalChain.findFirst({
    where: { id: chainId, tenantId, deletedAt: null },
    include: { steps: true },
  });

  if (!chain) {
    throw new ApiError('Approval chain not found', 404, 'CHAIN_NOT_FOUND');
  }

  // Check for duplicate order
  const existingOrder = chain.steps.find(s => s.stepOrder === input.stepOrder);
  if (existingOrder) {
    throw new ApiError('Step with this order already exists', 400, 'DUPLICATE_ORDER');
  }

  const step = await prisma.approvalStep.create({
    data: {
      chainId,
      name: input.name,
      instructions: input.instructions,
      stepOrder: input.stepOrder,
      approverType: input.approverType,
      approverRoleId: input.approverRoleId,
      approverUserId: input.approverUserId,
      practiceSource: input.practiceSource as any,
      roleAssignmentMode: (input.roleAssignmentMode as any) || 'ANY',
      fallbackType: input.fallbackType,
      fallbackRoleId: input.fallbackRoleId,
      fallbackUserId: input.fallbackUserId,
      skipIfUnresolvable: input.skipIfUnresolvable || false,
      approvalMode: input.approvalMode || 'ANY',
      onConflict: input.onConflict || 'REJECTION_WINS',
      isOptional: input.isOptional || false,
      canDelegate: input.canDelegate ?? true,
      skipCondition: input.skipCondition as Prisma.InputJsonValue,
      autoApproveAfterHours: input.autoApproveAfterHours,
      autoApproveCondition: input.autoApproveCondition as Prisma.InputJsonValue,
      slaHours: input.slaHours,
      escalateAfterHours: input.escalateAfterHours,
      escalateToType: input.escalateToType,
      escalateToRoleId: input.escalateToRoleId,
      escalateToUserId: input.escalateToUserId,
      reminderAfterHours: input.reminderAfterHours || 24,
      reminderIntervalHours: input.reminderIntervalHours || 24,
      maxReminders: input.maxReminders || 3,
    },
  });

  // Increment chain version
  await prisma.approvalChain.update({
    where: { id: chainId },
    data: { version: { increment: 1 } },
  });

  return step as unknown as Record<string, unknown>;
}

/**
 * Update approval step
 */
export async function updateApprovalStep(
  tenantId: string,
  stepId: string,
  input: Partial<CreateApprovalStepInput>
): Promise<Record<string, unknown>> {
  const step = await prisma.approvalStep.findFirst({
    where: { id: stepId },
    include: { chain: { select: { tenantId: true, id: true } } },
  });

  if (!step || step.chain.tenantId !== tenantId) {
    throw new ApiError('Approval step not found', 404, 'STEP_NOT_FOUND');
  }

  const updated = await prisma.approvalStep.update({
    where: { id: stepId },
    data: {
      name: input.name,
      instructions: input.instructions,
      stepOrder: input.stepOrder,
      approverType: input.approverType,
      approverRoleId: input.approverRoleId,
      approverUserId: input.approverUserId,
      practiceSource: input.practiceSource as any,
      roleAssignmentMode: input.roleAssignmentMode as any,
      fallbackType: input.fallbackType,
      fallbackRoleId: input.fallbackRoleId,
      fallbackUserId: input.fallbackUserId,
      skipIfUnresolvable: input.skipIfUnresolvable,
      approvalMode: input.approvalMode,
      onConflict: input.onConflict,
      isOptional: input.isOptional,
      canDelegate: input.canDelegate,
      skipCondition: input.skipCondition as Prisma.InputJsonValue,
      autoApproveAfterHours: input.autoApproveAfterHours,
      autoApproveCondition: input.autoApproveCondition as Prisma.InputJsonValue,
      slaHours: input.slaHours,
      escalateAfterHours: input.escalateAfterHours,
      escalateToType: input.escalateToType,
      escalateToRoleId: input.escalateToRoleId,
      escalateToUserId: input.escalateToUserId,
      reminderAfterHours: input.reminderAfterHours,
      reminderIntervalHours: input.reminderIntervalHours,
      maxReminders: input.maxReminders,
    },
  });

  // Increment chain version
  await prisma.approvalChain.update({
    where: { id: step.chain.id },
    data: { version: { increment: 1 } },
  });

  return updated as unknown as Record<string, unknown>;
}

/**
 * Delete approval step
 */
export async function deleteApprovalStep(
  tenantId: string,
  stepId: string
): Promise<void> {
  const step = await prisma.approvalStep.findFirst({
    where: { id: stepId },
    include: { chain: { select: { tenantId: true, id: true } } },
  });

  if (!step || step.chain.tenantId !== tenantId) {
    throw new ApiError('Approval step not found', 404, 'STEP_NOT_FOUND');
  }

  await prisma.approvalStep.delete({
    where: { id: stepId },
  });

  // Increment chain version
  await prisma.approvalChain.update({
    where: { id: step.chain.id },
    data: { version: { increment: 1 } },
  });
}

/**
 * Reorder approval steps
 */
export async function reorderApprovalSteps(
  tenantId: string,
  chainId: string,
  stepOrders: { stepId: string; stepOrder: number }[]
): Promise<void> {
  const chain = await prisma.approvalChain.findFirst({
    where: { id: chainId, tenantId, deletedAt: null },
  });

  if (!chain) {
    throw new ApiError('Approval chain not found', 404, 'CHAIN_NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    for (const { stepId, stepOrder } of stepOrders) {
      await tx.approvalStep.update({
        where: { id: stepId },
        data: { stepOrder },
      });
    }

    await tx.approvalChain.update({
      where: { id: chainId },
      data: { version: { increment: 1 } },
    });
  });
}

// ============================================================================
// Approver Resolution
// ============================================================================

/**
 * Resolve approvers for a request based on approval chain steps
 */
export async function resolveApproversForRequest(
  tenantId: string,
  requestId: string,
  chainId: string
): Promise<ResolvedApprover[]> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: {
      resource: {
        select: {
          id: true,
          managerId: true,
          practiceId: true,
          practice: { select: { headId: true } },
        },
      },
      project: {
        select: {
          id: true,
          managerId: true,
          practiceId: true,
          practice: { select: { headId: true } },
          clientId: true,
        },
      },
      allocation: {
        select: {
          resourceId: true,
          projectId: true,
          resource: { select: { managerId: true, practiceId: true } },
          project: { select: { managerId: true, practiceId: true } },
        },
      },
      requester: {
        select: { id: true, resourceId: true },
      },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  const chain = await prisma.approvalChain.findFirst({
    where: { id: chainId, tenantId, deletedAt: null },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: {
          approverRole: true,
        },
      },
    },
  });

  if (!chain) {
    throw new ApiError('Approval chain not found', 404, 'CHAIN_NOT_FOUND');
  }

  const resolvedApprovers: ResolvedApprover[] = [];

  for (const step of chain.steps) {
    const stepApprovers = await resolveStepApprovers(tenantId, step, request);

    // Check for delegation
    for (const approver of stepApprovers) {
      const delegation = await checkDelegation(approver.userId);
      if (delegation) {
        resolvedApprovers.push({
          ...approver,
          userId: delegation.delegateId,
          isDelegated: true,
          delegatedFromId: approver.userId,
        });
      } else {
        resolvedApprovers.push(approver);
      }
    }
  }

  return resolvedApprovers;
}

/**
 * Resolve approvers for a specific step
 */
async function resolveStepApprovers(
  tenantId: string,
  step: any,
  request: any
): Promise<ResolvedApprover[]> {
  const approvers: ResolvedApprover[] = [];

  switch (step.approverType) {
    case 'USER':
      // Specific user
      if (step.approverUserId) {
        approvers.push({
          userId: step.approverUserId,
          stepId: step.id,
          stepOrder: step.stepOrder,
          stepName: step.name,
          approverType: step.approverType,
          reason: `Assigned approver for step: ${step.name}`,
        });
      }
      break;

    case 'ROLE':
      // Users with specific role
      if (step.approverRoleId) {
        const roleUsers = await prisma.userRole.findMany({
          where: { roleId: step.approverRoleId },
          include: { user: { select: { id: true, tenantId: true } } },
        });

        for (const ru of roleUsers) {
          if (ru.user.tenantId === tenantId) {
            approvers.push({
              userId: ru.user.id,
              stepId: step.id,
              stepOrder: step.stepOrder,
              stepName: step.name,
              approverType: step.approverType,
              reason: `Role: ${step.approverRole?.name || 'Unknown'}`,
            });
          }
        }
      }
      break;

    case 'MANAGER':
      // Resource's manager
      const managerId = request.resource?.managerId || request.requester?.managerId;
      if (managerId) {
        approvers.push({
          userId: managerId,
          stepId: step.id,
          stepOrder: step.stepOrder,
          stepName: step.name,
          approverType: step.approverType,
          reason: 'Direct Manager',
        });
      }
      break;

    case 'PROJECT_MANAGER':
      // Project manager
      const pmId = request.project?.managerId || request.allocation?.project?.managerId;
      if (pmId) {
        approvers.push({
          userId: pmId,
          stepId: step.id,
          stepOrder: step.stepOrder,
          stepName: step.name,
          approverType: step.approverType,
          reason: 'Project Manager',
        });
      }
      break;

    case 'PRACTICE_HEAD':
      // Practice lead
      let practiceLeadId: string | null = null;

      // Determine which practice based on practiceSource setting
      const practiceSource = step.practiceSource;
      if (practiceSource === 'RESOURCE' && request.resource?.practice?.leadId) {
        practiceLeadId = request.resource.practice.leadId;
      } else if (practiceSource === 'PROJECT' && request.project?.practice?.leadId) {
        practiceLeadId = request.project.practice.leadId;
      } else if (request.resource?.practice?.leadId) {
        practiceLeadId = request.resource.practice.leadId;
      } else if (request.project?.practice?.leadId) {
        practiceLeadId = request.project.practice.leadId;
      }

      if (practiceLeadId) {
        approvers.push({
          userId: practiceLeadId,
          stepId: step.id,
          stepOrder: step.stepOrder,
          stepName: step.name,
          approverType: step.approverType,
          reason: 'Practice Lead',
        });
      }
      break;

    case 'RESOURCE_MANAGER':
      // Resource's manager for allocation requests
      const resourceMgrId = request.allocation?.resource?.managerId || request.resource?.managerId;
      if (resourceMgrId) {
        approvers.push({
          userId: resourceMgrId,
          stepId: step.id,
          stepOrder: step.stepOrder,
          stepName: step.name,
          approverType: step.approverType,
          reason: 'Resource Manager',
        });
      }
      break;

    case 'FUNCTION':
      // Approval function holders
      if (step.approvalFunctionId) {
        // Build scope context from request
        const scopeContext = {
          practiceId: request.resource?.practiceId || request.project?.practiceId,
          projectId: request.projectId || request.allocation?.projectId,
          departmentId: request.resource?.departmentId,
          teamId: request.resource?.teamId,
        };

        const holders = await resolveFunctionToHolders(
          tenantId,
          step.approvalFunctionId,
          scopeContext
        );

        for (const holder of holders) {
          approvers.push({
            userId: holder.userId,
            stepId: step.id,
            stepOrder: step.stepOrder,
            stepName: step.name,
            approverType: step.approverType,
            reason: `Function: ${holder.functionName}${holder.isDelegated ? ' (delegated)' : ''}`,
          });
        }
      }
      break;
  }

  // If no approvers resolved and there's a fallback
  if (approvers.length === 0 && step.fallbackType) {
    if (step.fallbackUserId) {
      approvers.push({
        userId: step.fallbackUserId,
        stepId: step.id,
        stepOrder: step.stepOrder,
        stepName: step.name,
        approverType: step.fallbackType,
        reason: 'Fallback Approver',
      });
    }
  }

  // Remove duplicates and self-approvals
  const uniqueApprovers = approvers.filter((approver, index, self) =>
    index === self.findIndex(a => a.userId === approver.userId) &&
    approver.userId !== request.requesterId
  );

  return uniqueApprovers;
}

/**
 * Check for active delegation
 */
async function checkDelegation(
  userId: string
): Promise<{ delegateId: string } | null> {
  const now = new Date();

  await expireDelegationsForUser(userId);

  const delegation = await prisma.delegation.findFirst({
    where: {
      delegatorId: userId,
      approvalStatus: 'APPROVED',
      revokedAt: null,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    select: { delegateId: true },
  });

  return delegation;
}

async function expireDelegationsForUser(userId: string): Promise<void> {
  const now = new Date();
  const expiringDelegations = await prisma.delegation.findMany({
    where: {
      revokedAt: null,
      endDate: { lt: now },
      OR: [
        { delegatorId: userId },
        { delegateId: userId },
      ],
    },
    select: {
      id: true,
      tenantId: true,
      delegatorId: true,
      delegateId: true,
      approvalStatus: true,
      endDate: true,
    },
  });

  for (const delegation of expiringDelegations) {
    const nowTs = new Date();
    const nextStatus: DelegationApprovalStatus = delegation.approvalStatus === 'PENDING'
      ? 'REJECTED'
      : delegation.approvalStatus;

    await prisma.delegation.update({
      where: { id: delegation.id },
      data: {
        approvalStatus: nextStatus,
        revokedAt: nowTs,
        revocationReason: 'Expired automatically',
      },
    });

    await createAuditLog(
      delegation.tenantId,
      null,
      'Delegation',
      delegation.id,
      'OVERRIDE_EXPIRED',
      {
        approvalStatus: {
          from: delegation.approvalStatus,
          to: nextStatus,
        },
        revokedAt: {
          from: null,
          to: nowTs.toISOString(),
        },
      },
      {
        delegatorId: delegation.delegatorId,
        delegateId: delegation.delegateId,
        expiredAt: nowTs.toISOString(),
        originalEndDate: delegation.endDate.toISOString(),
      }
    );
  }
}

// ============================================================================
// Chain Assignment
// ============================================================================

/**
 * Find the best matching approval chain for a request type
 */
export async function findApprovalChainForRequestType(
  tenantId: string,
  requestTypeId: string,
  practiceId?: string
): Promise<Record<string, unknown> | null> {
  // 1. Check for practice-specific chain
  if (practiceId) {
    const practiceChain = await prisma.approvalChain.findFirst({
      where: {
        tenantId,
        scope: 'PRACTICE',
        practiceId,
        tenantConfigs: { some: { requestTypeId } },
        status: 'PUBLISHED',
        deletedAt: null,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (practiceChain) {
      return practiceChain as unknown as Record<string, unknown>;
    }
  }

  // 2. Check for tenant-wide chain linked to request type
  const tenantChain = await prisma.approvalChain.findFirst({
    where: {
      tenantId,
      scope: 'TENANT',
      tenantConfigs: { some: { requestTypeId } },
      status: 'PUBLISHED',
      deletedAt: null,
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ],
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  if (tenantChain) {
    return tenantChain as unknown as Record<string, unknown>;
  }

  // 3. Check for any published chain (for testing)
  const anyChain = await prisma.approvalChain.findFirst({
    where: {
      tenantId,
      status: 'PUBLISHED',
      deletedAt: null,
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  return anyChain as unknown as Record<string, unknown>;
}

/**
 * Link approval chain to request types
 */
export async function linkChainToRequestTypes(
  tenantId: string,
  chainId: string,
  requestTypeIds: string[]
): Promise<void> {
  const chain = await prisma.approvalChain.findFirst({
    where: { id: chainId, tenantId, deletedAt: null },
  });

  if (!chain) {
    throw new ApiError('Approval chain not found', 404, 'CHAIN_NOT_FOUND');
  }

  // Update TenantRequestTypeConfig for each request type
  for (const requestTypeId of requestTypeIds) {
    await prisma.tenantRequestTypeConfig.upsert({
      where: {
        tenantId_requestTypeId: { tenantId, requestTypeId },
      },
      update: {
        approvalChainId: chainId,
      },
      create: {
        tenantId,
        requestTypeId,
        approvalChainId: chainId,
        isEnabled: true,
      },
    });
  }
}

// ============================================================================
// Delegation Management
// ============================================================================

/**
 * Create delegation
 */
export async function createDelegation(
  tenantId: string,
  delegatorId: string,
  input: {
    delegateId: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
    requestTypeIds?: string[];
  }
): Promise<Record<string, unknown>> {
  // H-02: Prevent self-delegation
  if (delegatorId === input.delegateId) {
    throw new ApiError('Cannot delegate to yourself', 400, 'SELF_DELEGATION_NOT_ALLOWED');
  }

  // Validate delegate exists and is in same tenant
  const delegate = await prisma.user.findFirst({
    where: { id: input.delegateId, tenantId },
  });

  if (!delegate) {
    throw new ApiError('Delegate user not found', 404, 'DELEGATE_NOT_FOUND');
  }

  // Check for overlapping delegations (not revoked)
  const overlap = await prisma.delegation.findFirst({
    where: {
      tenantId,
      delegatorId,
      revokedAt: null,
      OR: [
        {
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
      ],
    },
  });

  if (overlap) {
    throw new ApiError('Overlapping delegation exists', 400, 'DELEGATION_OVERLAP');
  }

  const delegation = await prisma.delegation.create({
    data: {
      tenantId,
      delegatorId,
      delegateId: input.delegateId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      requestTypeIds: input.requestTypeIds || [],
      practiceIds: [],
      requiresApproval: true,
      approvalStatus: 'PENDING', // L-06: Delegations require explicit approval
      createdById: delegatorId,
    },
    include: {
      delegator: { select: { id: true, firstName: true, lastName: true, email: true } },
      delegate: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  logger.info(`Delegation created`, {
    delegatorId,
    delegateId: input.delegateId,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  await createAuditLog(
    tenantId,
    delegatorId,
    'Delegation',
    delegation.id,
    'CREATE',
    {
      approvalStatus: {
        from: null,
        to: 'PENDING',
      },
      requiresApproval: {
        from: null,
        to: true,
      },
    },
    {
      delegatorId,
      delegateId: input.delegateId,
      startDate: input.startDate.toISOString(),
      endDate: input.endDate.toISOString(),
      requestTypeIds: input.requestTypeIds || [],
      reason: input.reason || null,
    }
  );

  return delegation as unknown as Record<string, unknown>;
}

/**
 * Approve delegation request
 */
export async function approveDelegation(
  tenantId: string,
  delegationId: string,
  reviewerId: string,
  notes?: string
): Promise<Record<string, unknown>> {
  const delegation = await prisma.delegation.findFirst({
    where: { id: delegationId, tenantId },
  });

  if (!delegation) {
    throw new ApiError('Delegation not found', 404, 'DELEGATION_NOT_FOUND');
  }

  if (delegation.delegatorId === reviewerId) {
    throw new ApiError('Delegator cannot approve own delegation', 403, 'SELF_APPROVAL_NOT_ALLOWED');
  }

  if (delegation.approvalStatus !== 'PENDING') {
    throw new ApiError('Only pending delegations can be approved', 400, 'INVALID_APPROVAL_STATUS');
  }

  if (delegation.revokedAt) {
    throw new ApiError('Delegation is already revoked', 400, 'DELEGATION_REVOKED');
  }

  const now = new Date();
  const updated = await prisma.delegation.update({
    where: { id: delegationId },
    data: {
      approvalStatus: 'APPROVED',
      approvedById: reviewerId,
      approvedAt: now,
    },
    include: {
      delegator: { select: { id: true, firstName: true, lastName: true, email: true } },
      delegate: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createAuditLog(
    tenantId,
    reviewerId,
    'Delegation',
    delegationId,
    'OVERRIDE_APPROVED',
    {
      approvalStatus: {
        from: delegation.approvalStatus,
        to: 'APPROVED',
      },
      approvedAt: {
        from: delegation.approvedAt?.toISOString() ?? null,
        to: now.toISOString(),
      },
    },
    {
      reviewerId,
      delegatorId: delegation.delegatorId,
      delegateId: delegation.delegateId,
      notes: notes || null,
    }
  );

  return updated as unknown as Record<string, unknown>;
}

/**
 * Reject delegation request
 */
export async function rejectDelegation(
  tenantId: string,
  delegationId: string,
  reviewerId: string,
  reason: string
): Promise<Record<string, unknown>> {
  const delegation = await prisma.delegation.findFirst({
    where: { id: delegationId, tenantId },
  });

  if (!delegation) {
    throw new ApiError('Delegation not found', 404, 'DELEGATION_NOT_FOUND');
  }

  if (delegation.delegatorId === reviewerId) {
    throw new ApiError('Delegator cannot reject own delegation', 403, 'SELF_APPROVAL_NOT_ALLOWED');
  }

  if (delegation.approvalStatus !== 'PENDING') {
    throw new ApiError('Only pending delegations can be rejected', 400, 'INVALID_APPROVAL_STATUS');
  }

  if (delegation.revokedAt) {
    throw new ApiError('Delegation is already revoked', 400, 'DELEGATION_REVOKED');
  }

  const now = new Date();
  const updated = await prisma.delegation.update({
    where: { id: delegationId },
    data: {
      approvalStatus: 'REJECTED',
      approvedById: reviewerId,
      approvedAt: now,
      revokedAt: now,
      revokedById: reviewerId,
      revocationReason: reason,
    },
    include: {
      delegator: { select: { id: true, firstName: true, lastName: true, email: true } },
      delegate: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createAuditLog(
    tenantId,
    reviewerId,
    'Delegation',
    delegationId,
    'OVERRIDE_REJECTED',
    {
      approvalStatus: {
        from: delegation.approvalStatus,
        to: 'REJECTED',
      },
      revokedAt: {
        from: null,
        to: now.toISOString(),
      },
    },
    {
      reviewerId,
      delegatorId: delegation.delegatorId,
      delegateId: delegation.delegateId,
      reason,
    }
  );

  return updated as unknown as Record<string, unknown>;
}

/**
 * Cancel delegation
 */
export async function cancelDelegation(
  tenantId: string,
  delegationId: string,
  userId: string
): Promise<void> {
  const delegation = await prisma.delegation.findFirst({
    where: { id: delegationId },
    include: { delegator: { select: { tenantId: true } } },
  });

  if (!delegation || delegation.delegator.tenantId !== tenantId) {
    throw new ApiError('Delegation not found', 404, 'DELEGATION_NOT_FOUND');
  }

  if (delegation.delegatorId !== userId) {
    throw new ApiError('Only the delegator can cancel', 403, 'NOT_DELEGATOR');
  }

  await prisma.delegation.update({
    where: { id: delegationId },
    data: { 
      revokedAt: new Date(),
      revokedById: userId,
      revocationReason: 'Cancelled by delegator',
    },
  });

  await createAuditLog(
    tenantId,
    userId,
    'Delegation',
    delegationId,
    'OVERRIDE_CANCELLED',
    {
      revokedAt: {
        from: delegation.revokedAt?.toISOString() ?? null,
        to: new Date().toISOString(),
      },
    },
    {
      delegatorId: delegation.delegatorId,
      cancelledBy: userId,
      approvalStatus: delegation.approvalStatus,
    }
  );

  logger.info(`Delegation cancelled`, { delegationId, cancelledBy: userId });
}

/**
 * List active delegations for a user
 */
export async function listDelegations(
  tenantId: string,
  userId: string,
  type: 'delegated_to_me' | 'delegated_by_me' = 'delegated_by_me'
): Promise<Record<string, unknown>[]> {
  await expireDelegationsForUser(userId);

  const now = new Date();
  // H-01: Include tenantId in query to prevent cross-tenant data leakage
  const where: Prisma.DelegationWhereInput = type === 'delegated_by_me'
    ? { 
        tenantId,
        delegatorId: userId, 
        approvalStatus: 'APPROVED',
        revokedAt: null,
        endDate: { gte: now },
      }
    : { 
        tenantId,
        delegateId: userId, 
        approvalStatus: 'APPROVED',
        revokedAt: null,
        endDate: { gte: now },
      };

  const delegations = await prisma.delegation.findMany({
    where,
    include: {
      delegator: { select: { id: true, firstName: true, lastName: true, email: true } },
      delegate: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  return delegations as unknown as Record<string, unknown>[];
}
