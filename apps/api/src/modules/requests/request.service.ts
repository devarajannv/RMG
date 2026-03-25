/**
 * Request Flow Service
 * Handles all request lifecycle operations including CRUD, workflow, and SLA tracking
 */

import { Prisma, RequestStatus, Priority, RequestAction } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import {
  resolveApproversForRequest,
  findApprovalChainForRequestType,
} from './approval-chain.service';
import { createNotification, notifyApprovalDecision } from './notification.service';
import { executePostApprovalActions, buildActionContext } from './post-approval-actions.service';
import { createAuditLog, createInvoiceLinkageAuditEvent } from '../audit/audit.service';
import {
  getTenantBillingTaxonomyPolicy,
  evaluateBillingTaxonomyCompliance,
  resolveBillingType,
  resolveInvoicingModel,
  type BillingTaxonomyEvaluationInput,
} from '../../config/billing-taxonomy';
import { resolveBillabilityDomain } from '../../config/billability-domain';

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
  invoiceReference?: string;
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

export interface InvoiceLinkageInput {
  invoiceReference: string;
  reason?: string;
  correlationId?: string;
}

const LIFECYCLE_PREREQUISITE_BY_TYPE: Record<string, string> = {
  MSA_CREATION: 'CUSTOMER_ONBOARDING',
  SOW_CREATION: 'MSA_CREATION',
  PROJECT_SETUP: 'SOW_CREATION',
  RESOURCE_ALLOCATION_BATCH: 'PROJECT_SETUP',
};

const REQUEST_ATTACHMENT_UPLOAD_DIR = process.env.REQUEST_ATTACHMENT_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'requests');

const REQUEST_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
];

const REQUEST_ATTACHMENT_ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.zip',
];

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

async function enforceBillingTaxonomy(
  tenantId: string,
  input: BillingTaxonomyEvaluationInput
): Promise<void> {
  const policy = await getTenantBillingTaxonomyPolicy(tenantId);
  const evaluation = evaluateBillingTaxonomyCompliance(policy, input);
  if (!evaluation.allowed) {
    throw new ApiError(
      evaluation.reason ?? 'Request violates tenant billing taxonomy policy',
      400,
      'BILLING_TAXONOMY_VIOLATION'
    );
  }
}

async function buildDecisionContextSnapshot(
  tenantId: string,
  input: BillingTaxonomyEvaluationInput,
  action: string
): Promise<Record<string, unknown>> {
  const policy = await getTenantBillingTaxonomyPolicy(tenantId);
  const evaluation = evaluateBillingTaxonomyCompliance(policy, input);
  const requestData = input.requestData ?? {};
  const billability = resolveBillabilityDomain({
    isBillable: requestData.isBillable as boolean | undefined,
    billableRatio: requestData.billableRatio as number | undefined,
  });

  return {
    action,
    asWasCapturedAt: new Date().toISOString(),
    policyVersion: policy.version,
    invoicingModel: resolveInvoicingModel(input),
    billingType: resolveBillingType(input),
    taxonomyCompliant: evaluation.allowed,
    billability,
  };
}

function ensureRequestAttachmentDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function resolveRequestAttachmentPath(filePath: string): string {
  const basePath = path.resolve(REQUEST_ATTACHMENT_UPLOAD_DIR);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(`${basePath}${path.sep}`) && resolvedPath !== basePath) {
    throw new ApiError('Invalid attachment path', 400, 'INVALID_ATTACHMENT_PATH');
  }

  return resolvedPath;
}

/**
 * Record action in request history
 */
async function recordHistory(
  tenantId: string,
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

  const auditActionMap: Partial<Record<RequestAction, 'CREATE' | 'UPDATE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REQUEST_RETURNED' | 'REQUEST_CANCELLED'>> = {
    CREATED: 'CREATE',
    UPDATED: 'UPDATE',
    SUBMITTED: 'SUBMIT',
    APPROVED: 'APPROVE',
    REJECTED: 'REJECT',
    RETURNED: 'REQUEST_RETURNED',
    CANCELLED: 'REQUEST_CANCELLED',
    COMPLETED: 'UPDATE',
    ON_HOLD: 'UPDATE',
    RESUMED: 'UPDATE',
    ESCALATED: 'UPDATE',
    REASSIGNED: 'UPDATE',
    DELEGATED: 'UPDATE',
    COMMENTED: 'UPDATE',
    ATTACHMENT_ADDED: 'UPDATE',
    ATTACHMENT_REMOVED: 'UPDATE',
    WATCHER_ADDED: 'UPDATE',
    WATCHER_REMOVED: 'UPDATE',
    ROLLBACK_INITIATED: 'UPDATE',
    ROLLBACK_COMPLETED: 'UPDATE',
    ROLLBACK_FAILED: 'UPDATE',
    PRIORITY_CHANGED: 'UPDATE',
    SLA_BREACHED: 'UPDATE',
  };

  const mappedAuditAction = auditActionMap[action] ?? 'UPDATE';

  try {
    await createAuditLog(
      tenantId,
      userId,
      'Request',
      requestId,
      mappedAuditAction,
      {
        requestAction: action,
        fromStatus,
        toStatus,
        details,
      },
      {
        source: 'request-history-dual-write',
        ipAddress,
        userAgent,
      }
    );
  } catch (error) {
    logger.error('Failed to dual-write request action to canonical audit log', {
      requestId,
      tenantId,
      action,
      error,
    });
  }
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

  await enforceBillingTaxonomy(tenantId, {
    contractId: input.contractId,
    projectId: input.projectId,
    requestData: input.requestData,
  });

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
  await recordHistory(tenantId, request.id, userId, 'CREATED', undefined, 'DRAFT', {
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
  userId: string
): Promise<Record<string, unknown>> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: {
      type: true,
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          resource: { select: { practiceId: true } },
        },
      },
      onBehalfOf: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          resource: { select: { practiceId: true } },
        },
      },
      resource: { select: { id: true, firstName: true, lastName: true, employeeId: true, email: true, practiceId: true } },
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

  const currentUser = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: {
      id: true,
      resource: { select: { practiceId: true } },
      roles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!currentUser) {
    throw new ApiError('User not found', 401, 'UNAUTHORIZED');
  }

  const isAdminUser = currentUser.roles.some(({ role }) =>
    ['ADMIN', 'ORG_ADMIN'].includes(role.name.toUpperCase())
  );

  const participantIds = new Set<string>([
    request.requesterId,
    request.onBehalfOfId ?? '',
    ...request.approvals.map((approval) => approval.approverId),
    ...request.watchers.map((watcher) => watcher.userId),
  ]);
  const isParticipant = participantIds.has(userId);

  const visibilityScope = request.type.visibilityScope;
  if (visibilityScope === 'TENANT') {
    return request as unknown as Record<string, unknown>;
  }

  if (visibilityScope === 'PARTICIPANTS') {
    if (isParticipant || isAdminUser) {
      return request as unknown as Record<string, unknown>;
    }

    throw new ApiError('You do not have access to this request', 403, 'FORBIDDEN');
  }

  if (visibilityScope === 'CONFIDENTIAL') {
    const confidentialParticipantIds = new Set<string>([
      request.requesterId,
      request.onBehalfOfId ?? '',
      ...request.approvals.map((approval) => approval.approverId),
    ]);

    if (confidentialParticipantIds.has(userId) || isAdminUser) {
      return request as unknown as Record<string, unknown>;
    }

    throw new ApiError('You do not have access to this request', 403, 'FORBIDDEN');
  }

  if (visibilityScope === 'PRACTICE') {
    const userPracticeId = currentUser.resource?.practiceId ?? null;
    const requestPracticeIds = new Set<string>([
      request.resource?.practiceId ?? '',
      request.requester.resource?.practiceId ?? '',
      request.onBehalfOf?.resource?.practiceId ?? '',
    ]);

    if (isParticipant || isAdminUser || (userPracticeId !== null && requestPracticeIds.has(userPracticeId))) {
      return request as unknown as Record<string, unknown>;
    }

    throw new ApiError('You do not have access to this request', 403, 'FORBIDDEN');
  }

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
  const { page = 1, limit = 20, sortBy: rawSortBy = 'createdAt', sortOrder = 'desc', search } = options;
  // M-17: Validate sortBy against allowlist
  const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'status', 'priority', 'requestNumber', 'title', 'submittedAt'];
  const sortBy = ALLOWED_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'createdAt';
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

  if (filters.invoiceReference) {
    where.requestData = {
      path: ['invoiceReference'],
      equals: filters.invoiceReference,
    };
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
  await recordHistory(tenantId, requestId, userId, 'UPDATED', undefined, undefined, {
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

function readRequestInvoiceReference(requestData: Prisma.JsonValue): string | null {
  const root = (requestData as Record<string, unknown> | null) ?? null;
  const invoiceReference = root?.invoiceReference;
  return typeof invoiceReference === 'string' && invoiceReference.trim().length > 0
    ? invoiceReference.trim()
    : null;
}

function buildRequestInvoiceLinkedData(
  currentRequestData: Prisma.JsonValue,
  invoiceReference: string,
  userId: string,
  reason?: string
): Prisma.InputJsonValue {
  const root = ((currentRequestData as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  return {
    ...root,
    invoiceReference,
    invoiceLinkage: {
      invoiceReference,
      linkedAt: new Date().toISOString(),
      linkedBy: userId,
      reason: reason ?? null,
    },
  } as Prisma.InputJsonValue;
}

function buildRequestInvoiceUnlinkedData(
  currentRequestData: Prisma.JsonValue,
  userId: string,
  reason?: string
): Prisma.InputJsonValue {
  const root = ((currentRequestData as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const { invoiceReference: _discardedInvoiceReference, ...withoutInvoiceReference } = root;
  const currentInvoiceLinkage = (root.invoiceLinkage as Record<string, unknown> | undefined) ?? undefined;

  return {
    ...withoutInvoiceReference,
    invoiceLinkage: {
      ...(currentInvoiceLinkage ?? {}),
      invoiceReference: null,
      unlinkedAt: new Date().toISOString(),
      unlinkedBy: userId,
      unlinkReason: reason ?? null,
    },
  } as Prisma.InputJsonValue;
}

export async function linkRequestToInvoice(
  tenantId: string,
  requestId: string,
  userId: string,
  input: InvoiceLinkageInput
): Promise<Record<string, unknown>> {
  const invoiceReference = input.invoiceReference.trim();
  if (!invoiceReference) {
    throw new ApiError('invoiceReference is required', 400, 'INVOICE_REFERENCE_REQUIRED');
  }

  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    select: {
      id: true,
      status: true,
      requestData: true,
      type: { select: { code: true } },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'APPROVED' && request.status !== 'COMPLETED') {
    await createInvoiceLinkageAuditEvent({
      tenantId,
      userId,
      eventType: 'INVOICE_LINK_REJECTED',
      invoiceReference,
      linkedEntityType: 'Request',
      linkedEntityId: requestId,
      reason: 'Request must be APPROVED or COMPLETED before invoice linkage',
      correlationId: input.correlationId,
      metadata: {
        requestStatus: request.status,
      },
    });
    throw new ApiError(
      'Request must be APPROVED or COMPLETED before invoice linkage',
      400,
      'REQUEST_NOT_INVOICE_LINKABLE'
    );
  }

  const currentInvoiceReference = readRequestInvoiceReference(request.requestData);
  if (currentInvoiceReference && currentInvoiceReference !== invoiceReference) {
    await createInvoiceLinkageAuditEvent({
      tenantId,
      userId,
      eventType: 'INVOICE_LINK_REJECTED',
      invoiceReference,
      linkedEntityType: 'Request',
      linkedEntityId: requestId,
      reason: 'Request already linked to a different invoice reference',
      correlationId: input.correlationId,
      metadata: {
        currentInvoiceReference,
      },
    });
    throw new ApiError(
      `Request already linked to invoice ${currentInvoiceReference}`,
      400,
      'REQUEST_ALREADY_INVOICED'
    );
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      requestData: buildRequestInvoiceLinkedData(request.requestData, invoiceReference, userId, input.reason),
      version: { increment: 1 },
    },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createInvoiceLinkageAuditEvent({
    tenantId,
    userId,
    eventType: 'INVOICE_LINKED',
    invoiceReference,
    linkedEntityType: 'Request',
    linkedEntityId: requestId,
    reason: input.reason,
    correlationId: input.correlationId,
    metadata: {
      requestTypeCode: request.type.code,
      requestStatus: request.status,
    },
  });

  await recordHistory(tenantId, requestId, userId, 'UPDATED', request.status, request.status, {
    invoiceLinkage: {
      eventType: 'INVOICE_LINKED',
      invoiceReference,
      reason: input.reason ?? null,
    },
  });

  return updated as unknown as Record<string, unknown>;
}

export async function unlinkRequestFromInvoice(
  tenantId: string,
  requestId: string,
  userId: string,
  input?: Omit<InvoiceLinkageInput, 'invoiceReference'>
): Promise<Record<string, unknown>> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    select: {
      id: true,
      status: true,
      requestData: true,
      type: { select: { code: true } },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  const currentInvoiceReference = readRequestInvoiceReference(request.requestData);
  if (!currentInvoiceReference) {
    throw new ApiError('Request is not linked to any invoice', 400, 'REQUEST_NOT_INVOICED');
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      requestData: buildRequestInvoiceUnlinkedData(request.requestData, userId, input?.reason),
      version: { increment: 1 },
    },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createInvoiceLinkageAuditEvent({
    tenantId,
    userId,
    eventType: 'INVOICE_UNLINKED',
    invoiceReference: currentInvoiceReference,
    linkedEntityType: 'Request',
    linkedEntityId: requestId,
    reason: input?.reason,
    correlationId: input?.correlationId,
    metadata: {
      requestTypeCode: request.type.code,
      requestStatus: request.status,
    },
  });

  await recordHistory(tenantId, requestId, userId, 'UPDATED', request.status, request.status, {
    invoiceLinkage: {
      eventType: 'INVOICE_UNLINKED',
      invoiceReference: currentInvoiceReference,
      reason: input?.reason ?? null,
    },
  });

  return updated as unknown as Record<string, unknown>;
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
          tenantConfigs: true,
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

  const requestData = (request.requestData as Record<string, unknown> | null) ?? {};
  await enforceBillingTaxonomy(tenantId, {
    contractId: request.contractId,
    projectId: request.projectId,
    requestData,
  });

  const decisionContext = await buildDecisionContextSnapshot(
    tenantId,
    {
      contractId: request.contractId,
      projectId: request.projectId,
      requestData,
    },
    'SUBMITTED'
  );

  // Check dependencies
  let resolvedDependsOnId = request.dependsOnId ?? null;
  const prerequisiteTypeCode = LIFECYCLE_PREREQUISITE_BY_TYPE[request.type.code];

  if (prerequisiteTypeCode) {
    if (request.dependsOnId) {
      const dependency = await prisma.request.findFirst({
        where: { id: request.dependsOnId, tenantId, deletedAt: null },
        select: {
          status: true,
          requestNumber: true,
          type: { select: { code: true } },
        },
      });

      if (!dependency) {
        throw new ApiError('Dependent request not found', 404, 'DEPENDENCY_NOT_FOUND');
      }

      if (dependency.type.code !== prerequisiteTypeCode) {
        throw new ApiError(
          `Cannot submit: ${request.type.code} requires dependency type ${prerequisiteTypeCode}`,
          400,
          'DEPENDENCY_TYPE_MISMATCH'
        );
      }

      if (dependency.status !== 'COMPLETED') {
        throw new ApiError(
          `Cannot submit: dependent request ${dependency.requestNumber} is not completed`,
          400,
          'DEPENDENCY_NOT_MET'
        );
      }
    } else {
      const prerequisiteCandidates = await prisma.request.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: 'COMPLETED',
          type: { code: prerequisiteTypeCode },
        },
        select: { id: true, requestNumber: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 2,
      });

      if (prerequisiteCandidates.length === 1) {
        resolvedDependsOnId = prerequisiteCandidates[0].id;
      } else if (prerequisiteCandidates.length === 0) {
        throw new ApiError(
          `Cannot submit: ${request.type.code} requires a completed ${prerequisiteTypeCode} request`,
          400,
          'DEPENDENCY_NOT_MET'
        );
      } else {
        throw new ApiError(
          `Cannot submit: multiple completed ${prerequisiteTypeCode} requests found; set dependsOnId explicitly`,
          400,
          'DEPENDENCY_AMBIGUOUS'
        );
      }
    }
  } else if (request.dependsOnId) {
    const dependency = await prisma.request.findFirst({
      where: { id: request.dependsOnId, tenantId, deletedAt: null },
      select: { status: true, requestNumber: true },
    });
    if (!dependency) {
      throw new ApiError('Dependent request not found', 404, 'DEPENDENCY_NOT_FOUND');
    }
    if (dependency.status !== 'COMPLETED') {
      throw new ApiError(
        `Cannot submit: dependent request ${dependency.requestNumber} is not completed`,
        400,
        'DEPENDENCY_NOT_MET'
      );
    }
  }

  // Calculate SLA deadlines
  const now = new Date();
  const tenantConfig = request.type.tenantConfigs.find((config) => config.tenantId === tenantId);
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
      dependsOnId: resolvedDependsOnId,
      currentStepOrder: 1,
    },
    include: {
      type: { select: { code: true, name: true } },
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Record history
  await recordHistory(tenantId, requestId, userId, 'SUBMITTED', request.status, newStatus, {
    decisionContext,
  });

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
    // C-01: Include tenantId to prevent cross-tenant delegation bypass
    const delegation = await prisma.delegation.findFirst({
      where: {
        tenantId,
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
  // L-08: Add tenant scoping via request relation for defense-in-depth
  const remainingAtCurrentStep = await prisma.requestApproval.count({
    where: {
      requestId,
      stepOrder: currentStepOrder,
      status: 'PENDING',
      request: { tenantId },
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
  const decisionContext = await buildDecisionContextSnapshot(
    tenantId,
    {
      contractId: request.contractId,
      projectId: request.projectId,
      requestData: (request.requestData as Record<string, unknown> | null) ?? {},
    },
    'APPROVED'
  );

  await recordHistory(tenantId, requestId, userId, 'APPROVED', 'PENDING_APPROVAL', newStatus, {
    approvalId: pendingApproval.id,
    stepOrder: currentStepOrder,
    nextStepOrder: nextStepOrder !== currentStepOrder ? nextStepOrder : undefined,
    comments: input.comments,
    decisionContext,
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
  const decisionContext = await buildDecisionContextSnapshot(
    tenantId,
    {
      contractId: request.contractId,
      projectId: request.projectId,
      requestData: (request.requestData as Record<string, unknown> | null) ?? {},
    },
    'REJECTED'
  );

  await recordHistory(tenantId, requestId, userId, 'REJECTED', 'PENDING_APPROVAL', 'REJECTED', {
    approvalId: pendingApproval.id,
    stepOrder: pendingApproval.stepOrder,
    comments: input.comments,
    decisionContext,
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
  await recordHistory(tenantId, requestId, userId, 'RETURNED', 'PENDING_APPROVAL', 'RETURNED', {
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
  await recordHistory(tenantId, requestId, userId, 'CANCELLED', previousStatus, 'CANCELLED', {
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
  await recordHistory(tenantId, requestId, userId, 'COMMENTED', undefined, undefined, {
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

/**
 * Add an attachment to a request
 */
export async function addAttachment(
  tenantId: string,
  requestId: string,
  userId: string,
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  }
): Promise<Record<string, unknown>> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
    include: {
      type: {
        select: {
          allowAttachments: true,
          maxAttachments: true,
          maxAttachmentSizeMb: true,
        },
      },
    },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  if (!request.type.allowAttachments) {
    throw new ApiError('Attachments are disabled for this request type', 400, 'ATTACHMENTS_DISABLED');
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!REQUEST_ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.mimetype) || !REQUEST_ATTACHMENT_ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ApiError('File type not allowed', 400, 'ATTACHMENT_TYPE_NOT_ALLOWED');
  }

  const maxAttachmentSizeMb = request.type.maxAttachmentSizeMb ?? 10;
  const maxAttachmentSizeBytes = maxAttachmentSizeMb * 1024 * 1024;

  if (file.size > maxAttachmentSizeBytes) {
    throw new ApiError(
      `Attachment exceeds maximum size of ${maxAttachmentSizeMb}MB`,
      400,
      'ATTACHMENT_TOO_LARGE'
    );
  }

  const attachmentCount = await prisma.requestAttachment.count({
    where: { requestId, deletedAt: null },
  });

  const maxAttachments = request.type.maxAttachments ?? 5;
  if (attachmentCount >= maxAttachments) {
    throw new ApiError(
      `This request already has the maximum of ${maxAttachments} attachments`,
      400,
      'ATTACHMENT_LIMIT_REACHED'
    );
  }

  const requestDir = path.join(REQUEST_ATTACHMENT_UPLOAD_DIR, tenantId, requestId);
  ensureRequestAttachmentDirectoryExists(requestDir);

  const storageFileName = `${crypto.randomUUID()}${ext}`;
  const storagePath = path.join(requestDir, storageFileName);
  const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

  fs.writeFileSync(storagePath, file.buffer);

  const attachment = await prisma.requestAttachment.create({
    data: {
      requestId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath: storagePath,
      checksum,
      uploadedById: userId,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  await recordHistory(tenantId, requestId, userId, 'ATTACHMENT_ADDED', undefined, undefined, {
    attachmentId: attachment.id,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
  });

  return attachment as unknown as Record<string, unknown>;
}

/**
 * Download a request attachment
 */
export async function downloadAttachment(
  tenantId: string,
  requestId: string,
  attachmentId: string,
  _userId: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const attachment = await prisma.requestAttachment.findFirst({
    where: {
      id: attachmentId,
      requestId,
      deletedAt: null,
      request: {
        tenantId,
        deletedAt: null,
      },
    },
  });

  if (!attachment) {
    throw new ApiError('Attachment not found', 404, 'ATTACHMENT_NOT_FOUND');
  }

  const resolvedPath = resolveRequestAttachmentPath(attachment.filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new ApiError('Attachment file not found', 404, 'ATTACHMENT_FILE_NOT_FOUND');
  }

  return {
    buffer: fs.readFileSync(resolvedPath),
    filename: attachment.fileName,
    mimeType: attachment.mimeType,
  };
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
    where: {
      isActive: true,
      OR: [
        { tenantId: null, isSystemType: true },
        { tenantId },
      ],
    },
    include: {
      tenantConfigs: true,
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // Filter out types disabled for this tenant
  return types
    .filter(t => {
      const config = t.tenantConfigs.find((tenantConfig) => tenantConfig.tenantId === tenantId);
      return !config || config.isEnabled;
    })
    .map(t => ({
      tenantConfig: t.tenantConfigs.find((tenantConfig) => tenantConfig.tenantId === tenantId),
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      category: t.category,
      defaultPriority: t.tenantConfigs.find((tenantConfig) => tenantConfig.tenantId === tenantId)?.defaultPriority || t.defaultPriority,
      responseSlaHours: t.tenantConfigs.find((tenantConfig) => tenantConfig.tenantId === tenantId)?.responseSlaHours || t.responseSlaHours,
      resolutionSlaHours: t.tenantConfigs.find((tenantConfig) => tenantConfig.tenantId === tenantId)?.resolutionSlaHours || t.resolutionSlaHours,
      formSchema: t.formSchema,
      requiredFields: t.requiredFields,
      requiresApproval: t.requiresApproval,
      allowAttachments: t.allowAttachments,
      maxAttachmentSizeMb: t.maxAttachmentSizeMb,
      maxAttachments: t.maxAttachments,
    }))
    .map(({ tenantConfig: _tenantConfig, ...requestType }) => requestType) as Record<string, unknown>[];
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
      tenantConfigs: true,
    } : undefined,
  });

  if (!type) return null;

  const config = tenantId
    ? type.tenantConfigs?.find((tenantConfig: { tenantId: string }) => tenantConfig.tenantId === tenantId)
    : undefined;

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
