/**
 * Approval Chain Controller
 * HTTP handlers for approval chain management
 */

import { Request, Response } from 'express';
import { ApiError } from '../../middleware/errorHandler';
import * as approvalChainService from './approval-chain.service';
import { ApprovalChainStatus, ApprovalChainScope } from '@prisma/client';

// ============================================================================
// Approval Chain CRUD
// ============================================================================

/**
 * Create approval chain
 * POST /api/v1/approval-chains
 */
export async function createApprovalChain(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  if (!req.body.code || !req.body.name || !req.body.steps) {
    throw new ApiError('Code, name, and steps are required', 400, 'VALIDATION_ERROR');
  }

  const chain = await approvalChainService.createApprovalChain(tenantId, userId, {
    code: req.body.code,
    name: req.body.name,
    description: req.body.description,
    scope: req.body.scope || 'GLOBAL',
    practiceId: req.body.practiceId,
    effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : undefined,
    effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : undefined,
    steps: req.body.steps,
  });

  res.status(201).json({
    success: true,
    data: chain,
    message: 'Approval chain created successfully',
  });
}

/**
 * Get approval chain
 * GET /api/v1/approval-chains/:id
 */
export async function getApprovalChain(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const chainId = req.params.id;

  const chain = await approvalChainService.getApprovalChain(tenantId, chainId);

  if (!chain) {
    throw new ApiError('Approval chain not found', 404, 'CHAIN_NOT_FOUND');
  }

  res.json({
    success: true,
    data: chain,
  });
}

/**
 * List approval chains
 * GET /api/v1/approval-chains
 */
export async function listApprovalChains(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;

  const filters: approvalChainService.ApprovalChainFilters = {};

  if (req.query.status) {
    filters.status = (Array.isArray(req.query.status)
      ? req.query.status
      : [req.query.status]) as ApprovalChainStatus[];
  }

  if (req.query.scope) {
    filters.scope = (Array.isArray(req.query.scope)
      ? req.query.scope
      : [req.query.scope]) as ApprovalChainScope[];
  }

  if (req.query.practiceId) {
    filters.practiceId = req.query.practiceId as string;
  }

  if (req.query.search) {
    filters.search = req.query.search as string;
  }

  const options: approvalChainService.ApprovalChainListOptions = {
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    sortBy: (req.query.sortBy as string) || 'createdAt',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
  };

  const result = await approvalChainService.listApprovalChains(tenantId, filters, options);

  res.json({
    success: true,
    ...result,
  });
}

/**
 * Update approval chain
 * PUT /api/v1/approval-chains/:id
 */
export async function updateApprovalChain(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const chainId = req.params.id;

  const chain = await approvalChainService.updateApprovalChain(tenantId, chainId, userId, {
    name: req.body.name,
    description: req.body.description,
    scope: req.body.scope,
    practiceId: req.body.practiceId,
    status: req.body.status,
    effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : undefined,
    effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : undefined,
  });

  res.json({
    success: true,
    data: chain,
    message: 'Approval chain updated successfully',
  });
}

/**
 * Delete approval chain
 * DELETE /api/v1/approval-chains/:id
 */
export async function deleteApprovalChain(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const chainId = req.params.id;

  await approvalChainService.deleteApprovalChain(tenantId, chainId, userId);

  res.json({
    success: true,
    message: 'Approval chain deleted successfully',
  });
}

// ============================================================================
// Approval Steps
// ============================================================================

/**
 * Add step to chain
 * POST /api/v1/approval-chains/:id/steps
 */
export async function addApprovalStep(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const chainId = req.params.id;

  if (!req.body.name || req.body.stepOrder === undefined || !req.body.approverType) {
    throw new ApiError('Name, stepOrder, and approverType are required', 400, 'VALIDATION_ERROR');
  }

  const step = await approvalChainService.addApprovalStep(tenantId, chainId, {
    name: req.body.name,
    instructions: req.body.instructions,
    stepOrder: req.body.stepOrder,
    approverType: req.body.approverType,
    approverRoleId: req.body.approverRoleId,
    approverUserId: req.body.approverUserId,
    practiceSource: req.body.practiceSource,
    roleAssignmentMode: req.body.roleAssignmentMode,
    fallbackType: req.body.fallbackType,
    fallbackRoleId: req.body.fallbackRoleId,
    fallbackUserId: req.body.fallbackUserId,
    skipIfUnresolvable: req.body.skipIfUnresolvable,
    approvalMode: req.body.approvalMode,
    onConflict: req.body.onConflict,
    isOptional: req.body.isOptional,
    canDelegate: req.body.canDelegate,
    skipCondition: req.body.skipCondition,
    autoApproveAfterHours: req.body.autoApproveAfterHours,
    autoApproveCondition: req.body.autoApproveCondition,
    slaHours: req.body.slaHours,
    escalateAfterHours: req.body.escalateAfterHours,
    escalateToType: req.body.escalateToType,
    escalateToRoleId: req.body.escalateToRoleId,
    escalateToUserId: req.body.escalateToUserId,
    reminderAfterHours: req.body.reminderAfterHours,
    reminderIntervalHours: req.body.reminderIntervalHours,
    maxReminders: req.body.maxReminders,
  });

  res.status(201).json({
    success: true,
    data: step,
    message: 'Approval step added successfully',
  });
}

/**
 * Update approval step
 * PUT /api/v1/approval-chains/:chainId/steps/:stepId
 */
export async function updateApprovalStep(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const stepId = req.params.stepId;

  const step = await approvalChainService.updateApprovalStep(tenantId, stepId, {
    name: req.body.name,
    instructions: req.body.instructions,
    stepOrder: req.body.stepOrder,
    approverType: req.body.approverType,
    approverRoleId: req.body.approverRoleId,
    approverUserId: req.body.approverUserId,
    practiceSource: req.body.practiceSource,
    roleAssignmentMode: req.body.roleAssignmentMode,
    fallbackType: req.body.fallbackType,
    fallbackRoleId: req.body.fallbackRoleId,
    fallbackUserId: req.body.fallbackUserId,
    skipIfUnresolvable: req.body.skipIfUnresolvable,
    approvalMode: req.body.approvalMode,
    onConflict: req.body.onConflict,
    isOptional: req.body.isOptional,
    canDelegate: req.body.canDelegate,
    skipCondition: req.body.skipCondition,
    autoApproveAfterHours: req.body.autoApproveAfterHours,
    autoApproveCondition: req.body.autoApproveCondition,
    slaHours: req.body.slaHours,
    escalateAfterHours: req.body.escalateAfterHours,
    escalateToType: req.body.escalateToType,
    escalateToRoleId: req.body.escalateToRoleId,
    escalateToUserId: req.body.escalateToUserId,
    reminderAfterHours: req.body.reminderAfterHours,
    reminderIntervalHours: req.body.reminderIntervalHours,
    maxReminders: req.body.maxReminders,
  });

  res.json({
    success: true,
    data: step,
    message: 'Approval step updated successfully',
  });
}

/**
 * Delete approval step
 * DELETE /api/v1/approval-chains/:chainId/steps/:stepId
 */
export async function deleteApprovalStep(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const stepId = req.params.stepId;

  await approvalChainService.deleteApprovalStep(tenantId, stepId);

  res.json({
    success: true,
    message: 'Approval step deleted successfully',
  });
}

/**
 * Reorder approval steps
 * PUT /api/v1/approval-chains/:id/steps/reorder
 */
export async function reorderApprovalSteps(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const chainId = req.params.id;

  if (!req.body.stepOrders || !Array.isArray(req.body.stepOrders)) {
    throw new ApiError('stepOrders array is required', 400, 'VALIDATION_ERROR');
  }

  await approvalChainService.reorderApprovalSteps(tenantId, chainId, req.body.stepOrders);

  res.json({
    success: true,
    message: 'Steps reordered successfully',
  });
}

// ============================================================================
// Request Type Assignment
// ============================================================================

/**
 * Assign request types to chain
 * PUT /api/v1/approval-chains/:id/request-types
 */
export async function assignRequestTypes(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const chainId = req.params.id;

  if (!req.body.requestTypeIds || !Array.isArray(req.body.requestTypeIds)) {
    throw new ApiError('requestTypeIds array is required', 400, 'VALIDATION_ERROR');
  }

  await approvalChainService.linkChainToRequestTypes(tenantId, chainId, req.body.requestTypeIds);

  res.json({
    success: true,
    message: 'Request types assigned successfully',
  });
}

// ============================================================================
// Delegation
// ============================================================================

/**
 * Create delegation
 * POST /api/v1/delegations
 */
export async function createDelegation(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  if (!req.body.delegateId || !req.body.startDate || !req.body.endDate) {
    throw new ApiError('delegateId, startDate, and endDate are required', 400, 'VALIDATION_ERROR');
  }

  const delegation = await approvalChainService.createDelegation(tenantId, userId, {
    delegateId: req.body.delegateId,
    startDate: new Date(req.body.startDate),
    endDate: new Date(req.body.endDate),
    reason: req.body.reason,
    requestTypeIds: req.body.requestTypeIds,
  });

  res.status(201).json({
    success: true,
    data: delegation,
    message: 'Delegation created successfully',
  });
}

/**
 * Cancel delegation
 * DELETE /api/v1/delegations/:id
 */
export async function cancelDelegation(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const delegationId = req.params.id;

  await approvalChainService.cancelDelegation(tenantId, delegationId, userId);

  res.json({
    success: true,
    message: 'Delegation cancelled successfully',
  });
}

/**
 * List delegations
 * GET /api/v1/delegations
 */
export async function listDelegations(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const type = req.query.type === 'delegated_to_me' ? 'delegated_to_me' : 'delegated_by_me';

  const delegations = await approvalChainService.listDelegations(tenantId, userId, type);

  res.json({
    success: true,
    data: delegations,
  });
}
