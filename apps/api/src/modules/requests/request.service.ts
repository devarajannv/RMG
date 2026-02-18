/**
 * Request Flow Service
 * Handles all request lifecycle operations including CRUD, workflow, and SLA tracking
 */

import { Prisma, RequestStatus, Priority, RequestAction } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import {
  resolveApproversForRequest,
  findApprovalChainForRequestType,
} from './approval-chain.service';
import { createNotification, notifyApprovalDecision } from './notification.service';
import { executePostApprovalActions, buildActionContext } from './post-approval-actions.service';

// ============================================================================
// Types
// ============================================================================

export interface CreateRequestInput {
  typeCode: string;
  title: string;
  description?: string;
  requestData: Record<string, unknown>;
  priority?: Priority;
  urgencyJustification?: string;
  requestedCompletionDate?: Date;
  onBehalfOfId?: string;
  resourceId?: string;
  projectId?: string;
  allocationId?: string;
  contractId?: string;
  externalRef?: string;
  externalUrl?: string;
  dependsOnId?: string;
}

export interface UpdateRequestInput {
  title?: string;
  description?: string;
  requestData?: Record<string, unknown>;
  priority?: Priority;
  urgencyJustification?: string;
  requestedCompletionDate?: Date;
  externalRef?: string;
  externalUrl?: string;
}

export interface RequestFilters {
  status?: RequestStatus[];
  typeCode?: string[];
  priority?: Priority[];
  requesterId?: string;
  resourceId?: string;
  projectId?: string;
  submittedAfter?: Date;
  submittedBefore?: Date;
  isMyPending?: boolean; // Requests pending my approval
  isMyRequest?: boolean; // Requests I created
}

export interface ApproveRejectInput {
  comments?: string;
}

export interface RequestListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique request number for a tenant
 */
async function generateRequestNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  
  // Use transaction to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    // Find or create sequence for this tenant/year
    let sequence = await tx.requestSequence.findUnique({
      where: {
        tenantId_year: { tenantId, year },
      },
    });

    if (!sequence) {
      sequence = await tx.requestSequence.create({
        data: { tenantId, year, lastNumber: 0 },
      });
    }

    // Increment and get new number
    const updated = await tx.requestSequence.update({
      where: { id: sequence.id },
      data: { lastNumber: { increment: 1 } },
    });

    return updated.lastNumber;
  });

  // Get tenant slug for prefix
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });

  const prefix = tenant?.slug?.substring(0, 3).toUpperCase() || 'REQ';
  return `${prefix}-${year}-${String(result).padStart(5, '0')}`;
}

/**
 * Validate request data against the request type's form schema
 */
function validateRequestData(
  requestData: Record<string, unknown>,
  _formSchema: unknown,
  requiredFields: string[]
): void {
  // Basic required field validation
  for (const field of requiredFields) {
    const value = requestData[field];
    if (value === undefined || value === null || value === '') {
      throw new ApiError(`Missing required field: ${field}`, 400, 'VALIDATION_ERROR');
    }
  }

  // TODO: Add full JSON Schema validation using ajv
}

/**
 * Record action in request history
 */
async function recordHistory(
  requestId: string,
  userId: string,
  action: RequestAction,
  fromStatus?: RequestStatus,
  toStatus?: RequestStatus,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await prisma.requestHistory.create({
    data: {
      requestId,
      userId,
      action,
      fromStatus,
      toStatus,
      details: details ? (details as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress,
      userAgent,
    },
  });
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new request (as draft)
 */
export async function createRequest(
  tenantId: string,
  userId: string,
  input: CreateRequestInput
): Promise<Record<string, unknown>> {
  // Get request type
  const requestType = await prisma.requestType.findFirst({
    where: { code: input.typeCode },
    include: {
      tenantConfigs: {
        where: { tenantId, isEnabled: true },
      },
    },
  });

  if (!requestType) {
    throw new ApiError('Invalid request type', 400, 'INVALID_REQUEST_TYPE');
  }

  if (!requestType.isActive) {
    throw new ApiError('Request type is disabled', 400, 'REQUEST_TYPE_DISABLED');
  }

  // Check tenant-specific config
  const tenantConfig = requestType.tenantConfigs[0];
  if (tenantConfig && !tenantConfig.isEnabled) {
    throw new ApiError('Request type is not enabled for this organization', 400, 'REQUEST_TYPE_DISABLED');
  }

  // Validate required fields
  validateRequestData(
    input.requestData,
    requestType.formSchema,
    requestType.requiredFields
  );

  // Validate related entities if provided
  if (input.resourceId) {
    const resource = await prisma.resource.findFirst({
      where: { id: input.resourceId, tenantId, deletedAt: null },
    });
    if (!resource) {
      throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
    }
  }

  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, tenantId, deletedAt: null },
    });
    if (!project) {
      throw new ApiError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
  }

  if (input.allocationId) {
    const allocation = await prisma.allocation.findFirst({
      where: { id: input.allocationId, tenantId, deletedAt: null },
    });
    if (!allocation) {
      throw new ApiError('Allocation not found', 404, 'ALLOCATION_NOT_FOUND');
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

  // Generate request number
  const requestNumber = await generateRequestNumber(tenantId);

  // Determine priority
  const priority = input.priority || tenantConfig?.defaultPriority || requestType.defaultPriority;

  // Validate urgency justification for CRITICAL priority
  if (priority === 'CRITICAL' && !input.urgencyJustification) {
    throw new ApiError('Urgency justification required for CRITICAL priority', 400, 'URGENCY_REQUIRED');
  }

  // Create the request
  const request = await prisma.request.create({
    data: {
      tenantId,
      requestNumber,
      typeId: requestType.id,
      title: input.title,
      description: input.description,
      requestData: input.requestData as Prisma.InputJsonValue,
      priority,
      urgencyJustification: input.urgencyJustification,
      requestedCompletionDate: input.requestedCompletionDate,
      requesterId: userId,
      onBehalfOfId: input.onBehalfOfId,
      resourceId: input.resourceId,
      projectId: input.projectId,
      allocationId: input.allocationId,
      contractId: input.contractId,
      externalRef: input.externalRef,
      externalUrl: input.externalUrl,
      dependsOnId: input.dependsOnId,
      status: 'DRAFT',
      canRollback: requestType.allowRollback,
    },
    include: {
      type: { select: { code: true, name: true, category: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
      onBehalfOf: { select: { id: true, firstName: true, lastName: true, email: true } },
      resource: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      project: { select: { id: true, code: true, name: true } },
    },
  });

  // Record history
  await recordHistory(request.id, userId, 'CREATED', undefined, 'DRAFT', {
    requestType: requestType.code,
  });

  logger.info(`Request created: ${requestNumber}`, {
    requestId: request.id,
    tenantId,
    userId,
    type: requestType.code,
  });

  return request as unknown as Record<string, unknown>;
}

/**
 * Get a single request by ID
 */
export async function getRequest(
  tenantId: string,
  requestId: string,
  _userId: string
): Promise<Record<string, unknown>> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: {
      type: true,
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
      onBehalfOf: { select: { id: true, firstName: true, lastName: true, email: true } },
      resource: { select: { id: true, firstName: true, lastName: true, employeeId: true, email: true } },
      project: { select: { id: true, code: true, name: true, client: { select: { name: true } } } },
      allocation: { select: { id: true, role: true, percentage: true, startDate: true, endDate: true } },
      contract: { select: { id: true, contractNumber: true, name: true } },
      approvalChain: { select: { id: true, name: true, code: true } },
      dependsOn: { select: { id: true, requestNumber: true, title: true, status: true } },
      approvals: {
        include: {
          approver: { select: { id: true, firstName: true, lastName: true, email: true } },
          delegatedFrom: { select: { id: true, firstName: true, lastName: true } },
          step: { select: { name: true, instructions: true } },
        },
        orderBy: { stepOrder: 'asc' },
      },
      comments: {
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      attachments: {
        where: { deletedAt: null },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      watchers: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      history: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  // TODO: Check visibility based on type.visibilityScope

  return request as unknown as Record<string, unknown>;
}

/**
 * List requests with filtering and pagination
 */
export async function listRequests(
  tenantId: string,
  userId: string,
  filters: RequestFilters = {},
  options: RequestListOptions = {}
): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search } = options;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.RequestWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.status?.length) {
    where.status = { in: filters.status };
  }

  if (filters.typeCode?.length) {
    where.type = { code: { in: filters.typeCode } };
  }

  if (filters.priority?.length) {
    where.priority = { in: filters.priority };
  }

  if (filters.requesterId) {
    where.requesterId = filters.requesterId;
  }

  if (filters.resourceId) {
    where.resourceId = filters.resourceId;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.submittedAfter) {
    where.submittedAt = { ...where.submittedAt as object, gte: filters.submittedAfter };
  }

  if (filters.submittedBefore) {
    where.submittedAt = { ...where.submittedAt as object, lte: filters.submittedBefore };
  }

  if (filters.isMyRequest) {
    where.requesterId = userId;
  }

  if (filters.isMyPending) {
    where.approvals = {
      some: {
        approverId: userId,
        status: 'PENDING',
      },
    };
  }

  if (search) {
    where.OR = [
      { requestNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Execute query
  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        type: { select: { code: true, name: true, category: true } },
        requester: { select: { id: true, firstName: true, lastName: true } },
        resource: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        project: { select: { id: true, code: true, name: true } },
        approvals: {
          where: { status: 'PENDING' },
          select: { approverId: true, stepOrder: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.request.count({ where }),
  ]);

  return {
    data: requests as unknown as Record<string, unknown>[],
    total,
    page,
    limit,
  };
}

/**
 * Update a request (only allowed in DRAFT or RETURNED status)
 */
export async function updateRequest(
  tenantId: string,
  requestId: string,
  userId: string,
  input: UpdateRequestInput
): Promise<Record<string, unknown>> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: { type: true },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  // Only allow updates in DRAFT or RETURNED status
  if (request.status !== 'DRAFT' && request.status !== 'RETURNED') {
    throw new ApiError(
      'Can only update requests in DRAFT or RETURNED status',
      400,
      'INVALID_STATUS_FOR_UPDATE'
    );
  }

  // Only requester can update
  if (request.requesterId !== userId) {
    throw new ApiError('Only the requester can update this request', 403, 'FORBIDDEN');
  }

  // Merge request data if provided
  const newRequestData = input.requestData
    ? { ...(request.requestData as object), ...input.requestData }
    : request.requestData;

  // Validate if request data changed
  if (input.requestData) {
    validateRequestData(
      newRequestData as Record<string, unknown>,
      request.type.formSchema,
      request.type.requiredFields
    );
  }

  // Validate urgency justification for CRITICAL priority
  const newPriority = input.priority || request.priority;
  if (newPriority === 'CRITICAL' && !input.urgencyJustification && !request.urgencyJustification) {
    throw new ApiError('Urgency justification required for CRITICAL priority', 400, 'URGENCY_REQUIRED');
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      title: input.title,
      description: input.description,
      requestData: newRequestData as Prisma.InputJsonValue,
      priority: input.priority,
      urgencyJustification: input.urgencyJustification,
      requestedCompletionDate: input.requestedCompletionDate,
      externalRef: input.externalRef,
      externalUrl: input.externalUrl,
      version: { increment: 1 },
    },
    include: {
      type: { select: { code: true, name: true, category: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Record history
  await recordHistory(requestId, userId, 'UPDATED', undefined, undefined, {
    changes: input,
  });

  return updated as unknown as Record<string, unknown>;
}

/**
 * Delete a request (soft delete, only DRAFT status)
 */
export async function deleteRequest(
  tenantId: string,
  requestId: string,
  userId: string
): Promise<void> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'DRAFT') {
    throw new ApiError('Can only delete requests in DRAFT status', 400, 'INVALID_STATUS_FOR_DELETE');
  }

  if (request.requesterId !== userId) {
    throw new ApiError('Only the requester can delete this request', 403, 'FORBIDDEN');
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { deletedAt: new Date() },
  });

  logger.info(`Request deleted: ${request.requestNumber}`, {
    requestId,
    tenantId,
    userId,
  });
}

// ============================================================================
// Workflow Operations
// ============================================================================

/**
 * Submit a request for approval
 */
export async function submitRequest(
  tenantId: string,
  requestId: string,
  userId: string
): Promise<Record<string, unknown>> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: {
      type: {
        include: {
          tenantConfigs: { where: { tenantId } },
        },
      },
      resource: {
        select: { id: true, practiceId: true },
      },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'DRAFT' && request.status !== 'RETURNED') {
    throw new ApiError('Can only submit requests in DRAFT or RETURNED status', 400, 'INVALID_STATUS');
  }

  if (request.requesterId !== userId && request.onBehalfOfId !== userId) {
    throw new ApiError('Only the requester can submit this request', 403, 'FORBIDDEN');
  }

  // Check dependencies
  if (request.dependsOnId) {
    const dependency = await prisma.request.findUnique({
      where: { id: request.dependsOnId },
      select: { status: true, requestNumber: true },
    });
    if (dependency && dependency.status !== 'COMPLETED') {
      throw new ApiError(
        `Cannot submit: dependent request ${dependency.requestNumber} is not completed`,
        400,
        'DEPENDENCY_NOT_MET'
      );
    }
  }

  // Calculate SLA deadlines
  const now = new Date();
  const tenantConfig = request.type.tenantConfigs[0];
  const responseSlaHours = tenantConfig?.responseSlaHours || request.type.responseSlaHours;
  const resolutionSlaHours = tenantConfig?.resolutionSlaHours || request.type.resolutionSlaHours;

  // TODO: Use business hours calculation from SLA service
  const responseDueAt = new Date(now.getTime() + responseSlaHours * 60 * 60 * 1000);
  const resolutionDueAt = new Date(now.getTime() + resolutionSlaHours * 60 * 60 * 1000);

  // Calculate rollback deadline
  const rollbackDeadline = request.type.allowRollback
    ? new Date(now.getTime() + request.type.rollbackWindowDays * 24 * 60 * 60 * 1000)
    : null;

  // Determine new status
  let newStatus: RequestStatus = 'SUBMITTED';
  
  // If approval not required, go directly to approved
  if (!request.type.requiresApproval) {
    newStatus = 'APPROVED';
  }

  // Get approval chain
  const approvalChainId = tenantConfig?.approvalChainId;
  let approvalChainVersion: number | null = null;
  let createdApprovals: { approverId: string; stepOrder: number }[] = [];

  if (request.type.requiresApproval) {
    // Find the appropriate approval chain
    let chainId = approvalChainId;
    
    if (!chainId) {
      // Try to find a chain for this request type
      const chain = await findApprovalChainForRequestType(
        tenantId,
        request.type.id,
        request.resource?.practiceId || undefined
      );
      if (chain) {
        chainId = (chain as { id: string }).id;
      }
    }

    if (chainId) {
      const chain = await prisma.approvalChain.findUnique({
        where: { id: chainId },
        select: { id: true, version: true, status: true },
      });
      
      if (chain && chain.status === 'PUBLISHED') {
        approvalChainVersion = chain.version;
        newStatus = 'PENDING_APPROVAL';

        // Resolve approvers for this request
        const resolvedApprovers = await resolveApproversForRequest(tenantId, requestId, chainId);

        // Create RequestApproval records for step 1
        const step1Approvers = resolvedApprovers.filter(a => a.stepOrder === 1);
        
        for (const approver of step1Approvers) {
          await prisma.requestApproval.create({
            data: {
              requestId,
              stepId: approver.stepId,
              stepOrder: approver.stepOrder,
              stepName: approver.stepName,
              approverId: approver.userId,
              assignedVia: approver.approverType,
              assignmentReason: approver.reason,
              status: 'PENDING',
              delegatedFromId: approver.delegatedFromId,
            },
          });
          createdApprovals.push({
            approverId: approver.userId,
            stepOrder: approver.stepOrder,
          });
        }

        // Update chainId to use the resolved one
        if (!approvalChainId) {
          // Will update the request with the found chain
        }
      } else if (!chain) {
        logger.warn(`Approval chain ${chainId} not found, submitting without approval`, { requestId });
        newStatus = 'APPROVED';
      } else {
        logger.warn(`Approval chain ${chainId} not published, submitting without approval`, { requestId });
        newStatus = 'APPROVED';
      }
    } else {
      // No approval chain configured - auto-approve
      logger.info(`No approval chain configured for request type ${request.type.code}, auto-approving`, { requestId });
      newStatus = 'APPROVED';
    }
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      submittedAt: now,
      responseDueAt,
      resolutionDueAt,
      rollbackDeadline,
      approvalChainId,
      approvalChainVersion,
      currentStepOrder: 1,
    },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Record history
  await recordHistory(requestId, userId, 'SUBMITTED', 'DRAFT', newStatus);

  logger.info(`Request submitted: ${request.requestNumber}`, {
    requestId,
    tenantId,
    userId,
    newStatus,
    approversCreated: createdApprovals.length,
  });

  // Send notifications to approvers
  if (createdApprovals.length > 0) {
    for (const approval of createdApprovals) {
      try {
        await createNotification({
          userId: approval.approverId,
          tenantId,
          type: 'REQUEST_ASSIGNED',
          title: `Approval required: ${request.requestNumber}`,
          message: `Request "${request.title}" requires your approval (Step ${approval.stepOrder})`,
          requestId,
          actionUrl: `/requests/${requestId}`,
        });
      } catch (err) {
        logger.error('Failed to send approval notification', { 
          requestId, 
          approverId: approval.approverId,
          error: err 
        });
      }
    }
  }

  // If auto-approved (no approval required or no chain), trigger execution handler
  if (newStatus === 'APPROVED' && request.type.onApprovalHandler) {
    logger.info(`Request auto-approved, handler: ${request.type.onApprovalHandler}`, { requestId });
    // TODO: Trigger execution handler asynchronously
  }

  return updated as unknown as Record<string, unknown>;
}

/**
 * Approve a request
 */
export async function approveRequest(
  tenantId: string,
  requestId: string,
  userId: string,
  input: ApproveRejectInput
): Promise<Record<string, unknown>> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: {
      type: true,
      approvalChain: {
        include: {
          steps: { orderBy: { stepOrder: 'asc' } },
        },
      },
      approvals: {
        where: { approverId: userId, status: 'PENDING' },
      },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'PENDING_APPROVAL') {
    throw new ApiError('Request is not pending approval', 400, 'INVALID_STATUS');
  }

  // Check if user has a pending approval
  let pendingApproval = request.approvals[0];
  
  if (!pendingApproval) {
    // Check for delegation - user might be a delegate
    const delegation = await prisma.delegation.findFirst({
      where: {
        delegateId: userId,
        approvalStatus: 'APPROVED',
        revokedAt: null,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      select: { delegatorId: true },
    });

    if (delegation) {
      // Check if delegator has pending approval
      const delegatorApproval = await prisma.requestApproval.findFirst({
        where: {
          requestId,
          approverId: delegation.delegatorId,
          status: 'PENDING',
        },
      });
      
      if (delegatorApproval) {
        pendingApproval = delegatorApproval;
      }
    }
  }

  if (!pendingApproval) {
    throw new ApiError('You do not have a pending approval for this request', 403, 'NO_PENDING_APPROVAL');
  }

  // Prevent self-approval
  if (request.requesterId === userId) {
    throw new ApiError('Cannot approve your own request', 403, 'SELF_APPROVAL_NOT_ALLOWED');
  }

  const now = new Date();
  const currentStepOrder = pendingApproval.stepOrder;

  // Update the approval record
  await prisma.requestApproval.update({
    where: { id: pendingApproval.id },
    data: {
      status: 'APPROVED',
      decision: 'APPROVED',
      comments: input.comments,
      decidedAt: now,
      version: { increment: 1 },
    },
  });

  // Check if this was the first response (for SLA tracking)
  const isFirstResponse = !request.firstResponseAt;

  // Check if more approvals needed at current step
  const remainingAtCurrentStep = await prisma.requestApproval.count({
    where: {
      requestId,
      stepOrder: currentStepOrder,
      status: 'PENDING',
    },
  });

  let newStatus: RequestStatus = 'PENDING_APPROVAL';
  let nextStepOrder = currentStepOrder;
  const newApprovals: { approverId: string; stepOrder: number }[] = [];

  // If current step is complete, move to next step
  if (remainingAtCurrentStep === 0) {
    // Find the next step in the approval chain
    const nextStep = request.approvalChain?.steps.find(s => s.stepOrder > currentStepOrder);

    if (nextStep) {
      // Advance to next step
      nextStepOrder = nextStep.stepOrder;

      // Resolve approvers for next step
      if (request.approvalChainId) {
        const resolvedApprovers = await resolveApproversForRequest(tenantId, requestId, request.approvalChainId);
        const nextStepApprovers = resolvedApprovers.filter(a => a.stepOrder === nextStepOrder);

        // Create approval records for next step
        for (const approver of nextStepApprovers) {
          await prisma.requestApproval.create({
            data: {
              requestId,
              stepId: approver.stepId,
              stepOrder: approver.stepOrder,
              stepName: approver.stepName,
              approverId: approver.userId,
              assignedVia: approver.approverType,
              assignmentReason: approver.reason,
              status: 'PENDING',
              delegatedFromId: approver.delegatedFromId,
            },
          });
          newApprovals.push({
            approverId: approver.userId,
            stepOrder: approver.stepOrder,
          });
        }

        // If no approvers for next step (e.g., skip condition), keep advancing
        if (nextStepApprovers.length === 0) {
          logger.info(`No approvers for step ${nextStepOrder}, skipping`, { requestId });
          // Recursively check for more steps or mark as approved
          const furtherSteps = request.approvalChain?.steps.filter(s => s.stepOrder > nextStepOrder);
          if (!furtherSteps || furtherSteps.length === 0) {
            newStatus = 'APPROVED';
          }
        }
      }
    } else {
      // No more steps - fully approved!
      newStatus = 'APPROVED';
    }
  }

  // Update request
  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      firstResponseAt: isFirstResponse ? now : request.firstResponseAt,
      resolvedAt: newStatus === 'APPROVED' ? now : null,
      currentStepOrder: nextStepOrder,
    },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Record history
  await recordHistory(requestId, userId, 'APPROVED', 'PENDING_APPROVAL', newStatus, {
    approvalId: pendingApproval.id,
    stepOrder: currentStepOrder,
    nextStepOrder: nextStepOrder !== currentStepOrder ? nextStepOrder : undefined,
    comments: input.comments,
  });

  logger.info(`Request approved at step ${currentStepOrder}: ${request.requestNumber}`, {
    requestId,
    tenantId,
    userId,
    currentStep: currentStepOrder,
    nextStep: nextStepOrder,
    newStatus,
  });

  // Send notifications to next step approvers
  if (newApprovals.length > 0) {
    for (const approval of newApprovals) {
      try {
        await createNotification({
          userId: approval.approverId,
          tenantId,
          type: 'REQUEST_ASSIGNED',
          title: `Approval required: ${request.requestNumber}`,
          message: `Request "${request.title}" requires your approval (Step ${approval.stepOrder})`,
          requestId,
          actionUrl: `/requests/${requestId}`,
        });
      } catch (err) {
        logger.error('Failed to send approval notification', { requestId, approverId: approval.approverId, error: err });
      }
    }
  }

  // If fully approved, notify requester and trigger execution
  if (newStatus === 'APPROVED') {
    try {
      await notifyApprovalDecision(
        {
          id: requestId,
          requestNumber: request.requestNumber,
          title: request.title,
          requesterId: request.requesterId,
          tenantId,
        },
        'APPROVED',
        { id: userId, name: 'Approver' }, // TODO: Fetch actual user name
        input.comments
      );
    } catch (err) {
      logger.error('Failed to send approval notification to requester', { requestId, error: err });
    }

    // Trigger execution handler if configured
    if (request.type.onApprovalHandler) {
      logger.info(`Request fully approved, handler: ${request.type.onApprovalHandler}`, { requestId });
      // TODO: Trigger execution handler asynchronously
    }

    // Execute post-approval actions (async, don't block response)
    buildActionContext(tenantId, requestId, 'APPROVED', userId, input.comments)
      .then(context => executePostApprovalActions(context))
      .catch(err => logger.error('Post-approval actions failed', { requestId, error: err }));
  }

  return updated as unknown as Record<string, unknown>;
}

/**
 * Reject a request
 */
export async function rejectRequest(
  tenantId: string,
  requestId: string,
  userId: string,
  input: ApproveRejectInput
): Promise<Record<string, unknown>> {
  if (!input.comments) {
    throw new ApiError('Comments are required when rejecting a request', 400, 'COMMENTS_REQUIRED');
  }

  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: {
      type: { select: { code: true, name: true } },
      approvals: {
        where: { approverId: userId, status: 'PENDING' },
      },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'PENDING_APPROVAL') {
    throw new ApiError('Request is not pending approval', 400, 'INVALID_STATUS');
  }

  const pendingApproval = request.approvals[0];
  if (!pendingApproval) {
    throw new ApiError('You do not have a pending approval for this request', 403, 'NO_PENDING_APPROVAL');
  }

  const now = new Date();

  // Update the approval record
  await prisma.requestApproval.update({
    where: { id: pendingApproval.id },
    data: {
      status: 'REJECTED',
      decision: 'REJECTED',
      comments: input.comments,
      decidedAt: now,
      version: { increment: 1 },
    },
  });

  // Mark all other pending approvals as skipped
  await prisma.requestApproval.updateMany({
    where: {
      requestId,
      status: 'PENDING',
      id: { not: pendingApproval.id },
    },
    data: {
      status: 'SKIPPED',
    },
  });

  // Check if this was the first response
  const isFirstResponse = !request.firstResponseAt;

  // Update request
  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      firstResponseAt: isFirstResponse ? now : request.firstResponseAt,
      resolvedAt: now,
    },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Record history
  await recordHistory(requestId, userId, 'REJECTED', 'PENDING_APPROVAL', 'REJECTED', {
    approvalId: pendingApproval.id,
    stepOrder: pendingApproval.stepOrder,
    comments: input.comments,
  });

  logger.info(`Request rejected: ${request.requestNumber}`, {
    requestId,
    tenantId,
    userId,
  });

  // Notify requester of rejection
  try {
    await notifyApprovalDecision(
      {
        id: requestId,
        requestNumber: request.requestNumber,
        title: request.title,
        requesterId: request.requesterId,
        tenantId,
      },
      'REJECTED',
      { id: userId, name: 'Approver' }, // TODO: Fetch actual user name
      input.comments
    );
  } catch (err) {
    logger.error('Failed to send rejection notification', { requestId, error: err });
  }

  // Execute post-rejection actions (async, don't block response)
  buildActionContext(tenantId, requestId, 'REJECTED', userId, input.comments)
    .then(context => executePostApprovalActions(context))
    .catch(err => logger.error('Post-rejection actions failed', { requestId, error: err }));

  return updated as unknown as Record<string, unknown>;
}

/**
 * Return a request for revision
 */
export async function returnRequest(
  tenantId: string,
  requestId: string,
  userId: string,
  input: ApproveRejectInput
): Promise<Record<string, unknown>> {
  if (!input.comments) {
    throw new ApiError('Comments are required when returning a request', 400, 'COMMENTS_REQUIRED');
  }

  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: {
      approvals: {
        where: { approverId: userId, status: 'PENDING' },
      },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'PENDING_APPROVAL') {
    throw new ApiError('Request is not pending approval', 400, 'INVALID_STATUS');
  }

  const pendingApproval = request.approvals[0];
  if (!pendingApproval) {
    throw new ApiError('You do not have a pending approval for this request', 403, 'NO_PENDING_APPROVAL');
  }

  const now = new Date();

  // Update the approval record
  await prisma.requestApproval.update({
    where: { id: pendingApproval.id },
    data: {
      status: 'SKIPPED',
      decision: 'RETURNED',
      comments: input.comments,
      decidedAt: now,
      version: { increment: 1 },
    },
  });

  // Reset all approvals for re-submission
  await prisma.requestApproval.updateMany({
    where: { requestId },
    data: { status: 'SKIPPED' },
  });

  // Update request
  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      status: 'RETURNED',
      currentStepOrder: 0,
    },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Record history
  await recordHistory(requestId, userId, 'RETURNED', 'PENDING_APPROVAL', 'RETURNED', {
    approvalId: pendingApproval.id,
    comments: input.comments,
  });

  logger.info(`Request returned: ${request.requestNumber}`, {
    requestId,
    tenantId,
    userId,
  });

  // TODO: Create notifications

  return updated as unknown as Record<string, unknown>;
}

/**
 * Cancel a request
 */
export async function cancelRequest(
  tenantId: string,
  requestId: string,
  userId: string,
  reason: string
): Promise<Record<string, unknown>> {
  if (!reason) {
    throw new ApiError('Cancellation reason is required', 400, 'REASON_REQUIRED');
  }

  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  // Cannot cancel completed or already cancelled requests
  if (request.status === 'COMPLETED' || request.status === 'CANCELLED') {
    throw new ApiError(`Cannot cancel a ${request.status.toLowerCase()} request`, 400, 'INVALID_STATUS');
  }

  // Only requester or admin can cancel
  // TODO: Check for admin permission
  if (request.requesterId !== userId) {
    throw new ApiError('Only the requester can cancel this request', 403, 'FORBIDDEN');
  }

  const previousStatus = request.status;

  // Update request
  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      status: 'CANCELLED',
      resolvedAt: new Date(),
    },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Mark all pending approvals as skipped
  await prisma.requestApproval.updateMany({
    where: { requestId, status: 'PENDING' },
    data: { status: 'SKIPPED' },
  });

  // Record history
  await recordHistory(requestId, userId, 'CANCELLED', previousStatus, 'CANCELLED', {
    reason,
  });

  logger.info(`Request cancelled: ${request.requestNumber}`, {
    requestId,
    tenantId,
    userId,
    reason,
  });

  return updated as unknown as Record<string, unknown>;
}

// ============================================================================
// Comments & Attachments
// ============================================================================

/**
 * Add a comment to a request
 */
export async function addComment(
  tenantId: string,
  requestId: string,
  userId: string,
  content: string,
  isInternal = false,
  parentId?: string
): Promise<Record<string, unknown>> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  // Validate parent comment if provided
  if (parentId) {
    const parentComment = await prisma.requestComment.findFirst({
      where: { id: parentId, requestId, deletedAt: null },
    });
    if (!parentComment) {
      throw new ApiError('Parent comment not found', 404, 'PARENT_COMMENT_NOT_FOUND');
    }
  }

  const comment = await prisma.requestComment.create({
    data: {
      requestId,
      userId,
      content,
      isInternal,
      parentId,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Record history
  await recordHistory(requestId, userId, 'COMMENTED', undefined, undefined, {
    commentId: comment.id,
    isInternal,
  });

  // TODO: Notify watchers (if not internal)

  return comment as unknown as Record<string, unknown>;
}

/**
 * Get request comments
 */
export async function getComments(
  tenantId: string,
  requestId: string,
  _userId: string,
  includeInternal = false
): Promise<Record<string, unknown>[]> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  const where: Prisma.RequestCommentWhereInput = {
    requestId,
    deletedAt: null,
  };

  // Only show internal comments to approvers and requester
  if (!includeInternal) {
    where.isInternal = false;
  }

  const comments = await prisma.requestComment.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      replies: {
        where: { deletedAt: null, isInternal: includeInternal ? undefined : false },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return comments as unknown as Record<string, unknown>[];
}

// ============================================================================
// Dashboard & Stats
// ============================================================================

/**
 * Get request dashboard statistics
 */
export async function getDashboardStats(
  tenantId: string,
  userId: string
): Promise<Record<string, unknown>> {
  // Get counts by status
  const statusCounts = await prisma.request.groupBy({
    by: ['status'],
    where: { tenantId, deletedAt: null },
    _count: true,
  });

  // Get my pending approvals count
  const myPendingApprovals = await prisma.requestApproval.count({
    where: {
      approverId: userId,
      status: 'PENDING',
      request: { tenantId, deletedAt: null },
    },
  });

  // Get SLA breach counts
  const slaBreaches = await prisma.request.count({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { responseSlaBreached: true },
        { resolutionSlaBreached: true },
      ],
      status: { notIn: ['COMPLETED', 'CANCELLED', 'REJECTED'] },
    },
  });

  // Get requests by type
  const byType = await prisma.request.groupBy({
    by: ['typeId'],
    where: { tenantId, deletedAt: null },
    _count: true,
  });

  // Get request types for mapping
  const types = await prisma.requestType.findMany({
    where: { id: { in: byType.map(t => t.typeId) } },
    select: { id: true, code: true, name: true },
  });

  const typeMap = new Map(types.map(t => [t.id, t]));

  // Get recent requests
  const recentRequests = await prisma.request.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    statusCounts: statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>),
    myPendingApprovals,
    slaBreaches,
    byType: byType.map(t => ({
      type: typeMap.get(t.typeId),
      count: t._count,
    })),
    recentRequests,
  };
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovals(
  tenantId: string,
  userId: string,
  options: RequestListOptions = {}
): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.RequestApprovalWhereInput = {
    approverId: userId,
    status: 'PENDING',
    request: {
      tenantId,
      deletedAt: null,
    },
  };

  const [approvals, total] = await Promise.all([
    prisma.requestApproval.findMany({
      where,
      include: {
        request: {
          include: {
            type: { select: { code: true, name: true, category: true } },
            requester: { select: { id: true, firstName: true, lastName: true } },
            resource: { select: { id: true, firstName: true, lastName: true } },
            project: { select: { id: true, code: true, name: true } },
          },
        },
        step: { select: { name: true, instructions: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.requestApproval.count({ where }),
  ]);

  return {
    data: approvals as unknown as Record<string, unknown>[],
    total,
    page,
    limit,
  };
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * List available request types
 */
export async function listRequestTypes(
  tenantId: string
): Promise<Record<string, unknown>[]> {
  const types = await prisma.requestType.findMany({
    where: { isActive: true },
    include: {
      tenantConfigs: {
        where: { tenantId },
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // Filter out types disabled for this tenant
  return types
    .filter(t => {
      const config = t.tenantConfigs[0];
      return !config || config.isEnabled;
    })
    .map(t => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      category: t.category,
      defaultPriority: t.tenantConfigs[0]?.defaultPriority || t.defaultPriority,
      responseSlaHours: t.tenantConfigs[0]?.responseSlaHours || t.responseSlaHours,
      resolutionSlaHours: t.tenantConfigs[0]?.resolutionSlaHours || t.resolutionSlaHours,
      formSchema: t.formSchema,
      requiredFields: t.requiredFields,
      requiresApproval: t.requiresApproval,
      allowAttachments: t.allowAttachments,
      maxAttachmentSizeMb: t.maxAttachmentSizeMb,
      maxAttachments: t.maxAttachments,
    })) as Record<string, unknown>[];
}

/**
 * Get a single request type by code
 */
export async function getRequestType(
  code: string,
  tenantId?: string
): Promise<Record<string, unknown> | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const type: any = await prisma.requestType.findFirst({
    where: { code },
    include: tenantId ? {
      tenantConfigs: { where: { tenantId } },
    } : undefined,
  });

  if (!type) return null;

  const config = tenantId ? type.tenantConfigs?.[0] : undefined;

  return {
    id: type.id,
    code: type.code,
    name: type.name,
    description: type.description,
    category: type.category,
    defaultPriority: config?.defaultPriority || type.defaultPriority,
    responseSlaHours: config?.responseSlaHours || type.responseSlaHours,
    resolutionSlaHours: config?.resolutionSlaHours || type.resolutionSlaHours,
    formSchema: type.formSchema,
    requiredFields: type.requiredFields,
    requiresApproval: type.requiresApproval,
    allowAttachments: type.allowAttachments,
    maxAttachmentSizeMb: type.maxAttachmentSizeMb,
    maxAttachments: type.maxAttachments,
    isActive: type.isActive,
  };
}
