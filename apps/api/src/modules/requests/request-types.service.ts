/**
 * Request Types Service
 * Manages request type CRUD operations including tenant-specific custom types
 */

import { Prisma, RequestCategory, Priority, SlaCalculationType, RequestVisibility, RollbackPermission } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface CreateRequestTypeInput {
  code: string;
  name: string;
  description?: string;
  category: RequestCategory;
  defaultPriority?: Priority;
  responseSlaHours?: number;
  resolutionSlaHours?: number;
  slaCalculationType?: SlaCalculationType;
  requiresApproval?: boolean;
  allowDraft?: boolean;
  allowAttachments?: boolean;
  maxAttachmentSizeMb?: number;
  maxAttachments?: number;
  formSchema?: Prisma.JsonValue;
  requiredFields?: string[];
  sensitiveFields?: string[];
  onApprovalHandler?: string;
  onRejectionHandler?: string;
  onCancellationHandler?: string;
  allowRollback?: boolean;
  rollbackWindowDays?: number;
  rollbackRequiresApproval?: boolean;
  rollbackPermission?: RollbackPermission;
  visibilityScope?: RequestVisibility;
  retentionDays?: number;
}

export interface UpdateRequestTypeInput {
  name?: string;
  description?: string;
  category?: RequestCategory;
  defaultPriority?: Priority;
  responseSlaHours?: number;
  resolutionSlaHours?: number;
  slaCalculationType?: SlaCalculationType;
  isActive?: boolean;
  requiresApproval?: boolean;
  allowDraft?: boolean;
  allowAttachments?: boolean;
  maxAttachmentSizeMb?: number;
  maxAttachments?: number;
  formSchema?: Prisma.JsonValue;
  requiredFields?: string[];
  sensitiveFields?: string[];
  onApprovalHandler?: string;
  onRejectionHandler?: string;
  onCancellationHandler?: string;
  allowRollback?: boolean;
  rollbackWindowDays?: number;
  rollbackRequiresApproval?: boolean;
  rollbackPermission?: RollbackPermission;
  visibilityScope?: RequestVisibility;
  retentionDays?: number;
}

export interface RequestTypeFilters {
  category?: RequestCategory;
  isActive?: boolean;
  isSystemType?: boolean;
  search?: string;
}

export interface RequestTypeListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// List Request Types (System + Tenant-specific)
// ============================================================================

/**
 * List all request types available to a tenant
 * Includes system types and tenant's custom types
 */
export async function listRequestTypes(
  tenantId: string,
  filters?: RequestTypeFilters,
  options?: RequestTypeListOptions
): Promise<{ data: unknown[]; total: number; page: number; limit: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const where: Prisma.RequestTypeWhereInput = {
    AND: [
      // Either system type (tenantId = null) OR belongs to this tenant
      {
        OR: [
          { tenantId: null, isSystemType: true },
          { tenantId: tenantId },
        ],
      },
      // Apply filters
      filters?.category ? { category: filters.category } : {},
      filters?.isActive !== undefined ? { isActive: filters.isActive } : {},
      filters?.isSystemType !== undefined ? { isSystemType: filters.isSystemType } : {},
      filters?.search ? {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { code: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.requestType.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [options?.sortBy || 'name']: options?.sortOrder || 'asc' },
      include: {
        _count: {
          select: {
            requests: true,
            tenantConfigs: true,
          },
        },
        tenantConfigs: {
          where: { tenantId },
          select: {
            id: true,
            isEnabled: true,
            approvalChainId: true,
            approvalChain: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    }),
    prisma.requestType.count({ where }),
  ]);

  return { data, total, page, limit };
}

// ============================================================================
// Get Single Request Type
// ============================================================================

/**
 * Get a single request type by ID
 */
export async function getRequestTypeById(
  tenantId: string,
  requestTypeId: string
): Promise<unknown | null> {
  const requestType = await prisma.requestType.findFirst({
    where: {
      id: requestTypeId,
      OR: [
        { tenantId: null, isSystemType: true },
        { tenantId: tenantId },
      ],
    },
    include: {
      _count: {
        select: {
          requests: true,
          tenantConfigs: true,
        },
      },
      tenantConfigs: {
        where: { tenantId },
        include: {
          approvalChain: {
            select: { id: true, name: true, code: true, status: true },
          },
        },
      },
      clonedFrom: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  return requestType;
}

/**
 * Get a request type by code (for a tenant)
 */
export async function getRequestTypeByCode(
  tenantId: string,
  code: string
): Promise<unknown | null> {
  // First check for tenant-specific type
  let requestType = await prisma.requestType.findFirst({
    where: {
      code: code,
      tenantId: tenantId,
    },
    include: {
      tenantConfigs: {
        where: { tenantId },
      },
    },
  });

  // If not found, check for system type
  if (!requestType) {
    requestType = await prisma.requestType.findFirst({
      where: {
        code: code,
        tenantId: null,
        isSystemType: true,
      },
      include: {
        tenantConfigs: {
          where: { tenantId },
        },
      },
    });
  }

  return requestType;
}

// ============================================================================
// Create Request Type
// ============================================================================

/**
 * Create a new tenant-specific request type
 */
export async function createRequestType(
  tenantId: string,
  userId: string,
  input: CreateRequestTypeInput
): Promise<unknown> {
  // Validate code format (uppercase, alphanumeric + underscore)
  const codeRegex = /^[A-Z][A-Z0-9_]{2,49}$/;
  if (!codeRegex.test(input.code)) {
    throw new ApiError(
      'Code must be uppercase, start with a letter, and contain only letters, numbers, and underscores (3-50 chars)',
      400,
      'INVALID_CODE_FORMAT'
    );
  }

  // Check for duplicate code within tenant
  const existingTenant = await prisma.requestType.findFirst({
    where: {
      code: input.code,
      tenantId: tenantId,
    },
  });

  if (existingTenant) {
    throw new ApiError('Request type code already exists for this tenant', 409, 'DUPLICATE_CODE');
  }

  // Check if code conflicts with system type
  const existingSystem = await prisma.requestType.findFirst({
    where: {
      code: input.code,
      tenantId: null,
      isSystemType: true,
    },
  });

  if (existingSystem) {
    throw new ApiError(
      'Request type code conflicts with a system type. Use a different code or clone the system type.',
      409,
      'CONFLICTS_WITH_SYSTEM_TYPE'
    );
  }

  const requestType = await prisma.requestType.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      category: input.category,
      defaultPriority: input.defaultPriority || 'MEDIUM',
      responseSlaHours: input.responseSlaHours || 24,
      resolutionSlaHours: input.resolutionSlaHours || 72,
      slaCalculationType: input.slaCalculationType || 'BUSINESS_HOURS',
      requiresApproval: input.requiresApproval ?? true,
      allowDraft: input.allowDraft ?? true,
      allowAttachments: input.allowAttachments ?? true,
      maxAttachmentSizeMb: input.maxAttachmentSizeMb || 10,
      maxAttachments: input.maxAttachments || 5,
      formSchema: (input.formSchema ?? undefined) as Prisma.InputJsonValue | undefined,
      requiredFields: input.requiredFields || [],
      sensitiveFields: input.sensitiveFields || [],
      onApprovalHandler: input.onApprovalHandler,
      onRejectionHandler: input.onRejectionHandler,
      onCancellationHandler: input.onCancellationHandler,
      allowRollback: input.allowRollback ?? true,
      rollbackWindowDays: input.rollbackWindowDays || 30,
      rollbackRequiresApproval: input.rollbackRequiresApproval ?? true,
      rollbackPermission: input.rollbackPermission || 'ADMIN_ONLY',
      visibilityScope: input.visibilityScope || 'TENANT',
      retentionDays: input.retentionDays || 2555,
      // Tenant ownership
      tenantId: tenantId,
      isSystemType: false,
    },
  });

  logger.info('Request type created', {
    requestTypeId: requestType.id,
    code: requestType.code,
    tenantId,
    userId,
  });

  return requestType;
}

// ============================================================================
// Update Request Type
// ============================================================================

/**
 * Update a tenant-specific request type
 * Cannot update system types directly (use TenantRequestTypeConfig for overrides)
 */
export async function updateRequestType(
  tenantId: string,
  requestTypeId: string,
  userId: string,
  input: UpdateRequestTypeInput
): Promise<unknown> {
  // Get the request type
  const requestType = await prisma.requestType.findUnique({
    where: { id: requestTypeId },
  });

  if (!requestType) {
    throw new ApiError('Request type not found', 404, 'NOT_FOUND');
  }

  // Cannot update system types
  if (requestType.isSystemType || requestType.tenantId === null) {
    throw new ApiError(
      'Cannot update system request types. Create tenant-specific overrides instead.',
      403,
      'CANNOT_UPDATE_SYSTEM_TYPE'
    );
  }

  // Ensure tenant owns this type
  if (requestType.tenantId !== tenantId) {
    throw new ApiError('Request type not found', 404, 'NOT_FOUND');
  }

  const updated = await prisma.requestType.update({
    where: { id: requestTypeId },
    data: {
      name: input.name,
      description: input.description,
      category: input.category,
      defaultPriority: input.defaultPriority,
      responseSlaHours: input.responseSlaHours,
      resolutionSlaHours: input.resolutionSlaHours,
      slaCalculationType: input.slaCalculationType,
      isActive: input.isActive,
      requiresApproval: input.requiresApproval,
      allowDraft: input.allowDraft,
      allowAttachments: input.allowAttachments,
      maxAttachmentSizeMb: input.maxAttachmentSizeMb,
      maxAttachments: input.maxAttachments,
      formSchema: input.formSchema as Prisma.InputJsonValue | undefined,
      requiredFields: input.requiredFields,
      sensitiveFields: input.sensitiveFields,
      onApprovalHandler: input.onApprovalHandler,
      onRejectionHandler: input.onRejectionHandler,
      onCancellationHandler: input.onCancellationHandler,
      allowRollback: input.allowRollback,
      rollbackWindowDays: input.rollbackWindowDays,
      rollbackRequiresApproval: input.rollbackRequiresApproval,
      rollbackPermission: input.rollbackPermission,
      visibilityScope: input.visibilityScope,
      retentionDays: input.retentionDays,
    },
  });

  logger.info('Request type updated', {
    requestTypeId,
    tenantId,
    userId,
  });

  return updated;
}

// ============================================================================
// Delete Request Type
// ============================================================================

/**
 * Delete a tenant-specific request type
 * Cannot delete system types
 */
export async function deleteRequestType(
  tenantId: string,
  requestTypeId: string,
  userId: string
): Promise<void> {
  // Get the request type
  const requestType = await prisma.requestType.findUnique({
    where: { id: requestTypeId },
    include: {
      _count: {
        select: { requests: true },
      },
    },
  });

  if (!requestType) {
    throw new ApiError('Request type not found', 404, 'NOT_FOUND');
  }

  // Cannot delete system types
  if (requestType.isSystemType || requestType.tenantId === null) {
    throw new ApiError('Cannot delete system request types', 403, 'CANNOT_DELETE_SYSTEM_TYPE');
  }

  // Ensure tenant owns this type
  if (requestType.tenantId !== tenantId) {
    throw new ApiError('Request type not found', 404, 'NOT_FOUND');
  }

  // Check if there are existing requests using this type
  if (requestType._count.requests > 0) {
    throw new ApiError(
      `Cannot delete request type that has ${requestType._count.requests} existing request(s). Deactivate it instead.`,
      409,
      'HAS_EXISTING_REQUESTS'
    );
  }

  // Delete the request type
  await prisma.requestType.delete({
    where: { id: requestTypeId },
  });

  logger.info('Request type deleted', {
    requestTypeId,
    code: requestType.code,
    tenantId,
    userId,
  });
}

// ============================================================================
// Clone Request Type
// ============================================================================

/**
 * Clone a system request type to create a tenant-specific version
 */
export async function cloneRequestType(
  tenantId: string,
  userId: string,
  sourceRequestTypeId: string,
  newCode: string,
  newName?: string
): Promise<unknown> {
  // Validate new code format
  const codeRegex = /^[A-Z][A-Z0-9_]{2,49}$/;
  if (!codeRegex.test(newCode)) {
    throw new ApiError(
      'Code must be uppercase, start with a letter, and contain only letters, numbers, and underscores (3-50 chars)',
      400,
      'INVALID_CODE_FORMAT'
    );
  }

  // Get the source request type
  const source = await prisma.requestType.findFirst({
    where: {
      id: sourceRequestTypeId,
      OR: [
        { tenantId: null, isSystemType: true },
        { tenantId: tenantId },
      ],
    },
  });

  if (!source) {
    throw new ApiError('Source request type not found', 404, 'SOURCE_NOT_FOUND');
  }

  // Check for duplicate code within tenant
  const existing = await prisma.requestType.findFirst({
    where: {
      code: newCode,
      OR: [
        { tenantId: tenantId },
        { tenantId: null, isSystemType: true },
      ],
    },
  });

  if (existing) {
    throw new ApiError('Request type code already exists', 409, 'DUPLICATE_CODE');
  }

  // Create the clone
  const cloned = await prisma.requestType.create({
    data: {
      code: newCode,
      name: newName || `${source.name} (Copy)`,
      description: source.description,
      category: source.category,
      defaultPriority: source.defaultPriority,
      responseSlaHours: source.responseSlaHours,
      resolutionSlaHours: source.resolutionSlaHours,
      slaCalculationType: source.slaCalculationType,
      requiresApproval: source.requiresApproval,
      allowDraft: source.allowDraft,
      allowAttachments: source.allowAttachments,
      maxAttachmentSizeMb: source.maxAttachmentSizeMb,
      maxAttachments: source.maxAttachments,
      formSchema: (source.formSchema ?? undefined) as Prisma.InputJsonValue | undefined,
      requiredFields: source.requiredFields,
      sensitiveFields: source.sensitiveFields,
      onApprovalHandler: source.onApprovalHandler,
      onRejectionHandler: source.onRejectionHandler,
      onCancellationHandler: source.onCancellationHandler,
      allowRollback: source.allowRollback,
      rollbackWindowDays: source.rollbackWindowDays,
      rollbackRequiresApproval: source.rollbackRequiresApproval,
      rollbackPermission: source.rollbackPermission,
      visibilityScope: source.visibilityScope,
      retentionDays: source.retentionDays,
      // Tenant ownership
      tenantId: tenantId,
      isSystemType: false,
      // Track the clone relationship
      clonedFromId: source.id,
    },
  });

  logger.info('Request type cloned', {
    sourceId: source.id,
    sourceCode: source.code,
    clonedId: cloned.id,
    clonedCode: cloned.code,
    tenantId,
    userId,
  });

  return cloned;
}

// ============================================================================
// Assign Workflow to Request Type
// ============================================================================

/**
 * Assign or update the workflow (approval chain) for a request type
 */
export async function assignWorkflowToRequestType(
  tenantId: string,
  requestTypeId: string,
  approvalChainId: string | null,
  userId: string
): Promise<unknown> {
  // Verify request type is accessible to tenant
  const requestType = await prisma.requestType.findFirst({
    where: {
      id: requestTypeId,
      OR: [
        { tenantId: null, isSystemType: true },
        { tenantId: tenantId },
      ],
    },
  });

  if (!requestType) {
    throw new ApiError('Request type not found', 404, 'NOT_FOUND');
  }

  // If assigning a workflow, verify it exists and belongs to tenant
  if (approvalChainId) {
    const approvalChain = await prisma.approvalChain.findFirst({
      where: {
        id: approvalChainId,
        tenantId: tenantId,
        deletedAt: null,
      },
    });

    if (!approvalChain) {
      throw new ApiError('Approval chain not found', 404, 'APPROVAL_CHAIN_NOT_FOUND');
    }
  }

  // Upsert TenantRequestTypeConfig
  const config = await prisma.tenantRequestTypeConfig.upsert({
    where: {
      tenantId_requestTypeId: {
        tenantId: tenantId,
        requestTypeId: requestTypeId,
      },
    },
    create: {
      tenantId: tenantId,
      requestTypeId: requestTypeId,
      approvalChainId: approvalChainId,
    },
    update: {
      approvalChainId: approvalChainId,
    },
    include: {
      approvalChain: {
        select: { id: true, name: true, code: true },
      },
      requestType: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  logger.info('Workflow assigned to request type', {
    requestTypeId,
    approvalChainId,
    tenantId,
    userId,
  });

  return config;
}

// ============================================================================
// Request Type Templates
// ============================================================================

/**
 * List all available templates
 */
export async function listRequestTypeTemplates(
  filters?: { category?: string; isActive?: boolean; search?: string }
): Promise<unknown[]> {
  const where: Prisma.RequestTypeTemplateWhereInput = {
    AND: [
      filters?.category ? { category: filters.category } : {},
      filters?.isActive !== undefined ? { isActive: filters.isActive } : { isActive: true },
      filters?.search ? {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } },
          { tags: { has: filters.search } },
        ],
      } : {},
    ],
  };

  const templates = await prisma.requestTypeTemplate.findMany({
    where,
    orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
  });

  return templates;
}

/**
 * Get a single template by ID
 */
export async function getRequestTypeTemplate(templateId: string): Promise<unknown | null> {
  return prisma.requestTypeTemplate.findUnique({
    where: { id: templateId },
  });
}

/**
 * Import a template for a tenant
 * Creates request types and optionally workflows from the template
 */
export async function importRequestTypeTemplate(
  tenantId: string,
  userId: string,
  templateId: string,
  options?: { includeWorkflows?: boolean; codePrefix?: string }
): Promise<{ requestTypes: unknown[]; workflows: unknown[] }> {
  const template = await prisma.requestTypeTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || !template.isActive) {
    throw new ApiError('Template not found or inactive', 404, 'TEMPLATE_NOT_FOUND');
  }

  const createdRequestTypes: unknown[] = [];
  const createdWorkflows: unknown[] = [];
  const prefix = options?.codePrefix || '';

  // Parse template content
  const requestTypeDefs = template.requestTypes as unknown as CreateRequestTypeInput[];

  // Create request types
  for (const rtDef of requestTypeDefs) {
    try {
      const code = prefix ? `${prefix}_${rtDef.code}` : rtDef.code;
      const rt = await createRequestType(tenantId, userId, {
        ...rtDef,
        code,
      });
      createdRequestTypes.push(rt);
    } catch (error) {
      // Log but continue - some types might already exist
      logger.warn('Failed to create request type from template', {
        code: rtDef.code,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // TODO: Create workflows if includeWorkflows is true
  // This would require importing approval-chain.service and creating chains

  // Update template usage count
  await prisma.requestTypeTemplate.update({
    where: { id: templateId },
    data: { usageCount: { increment: 1 } },
  });

  logger.info('Template imported', {
    templateId,
    templateCode: template.code,
    requestTypesCreated: createdRequestTypes.length,
    workflowsCreated: createdWorkflows.length,
    tenantId,
    userId,
  });

  return { requestTypes: createdRequestTypes, workflows: createdWorkflows };
}
