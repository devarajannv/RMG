/**
 * Request Types Controller
 * HTTP handlers for request type management
 */

import { Request, Response } from 'express';
import { ApiError } from '../../middleware/errorHandler';
import * as requestTypesService from './request-types.service';
import { RequestCategory } from '@prisma/client';

// ============================================================================
// Request Type CRUD
// ============================================================================

/**
 * List available request types
 * GET /api/v1/request-types
 */
export async function listRequestTypes(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;

  const filters: requestTypesService.RequestTypeFilters = {};
  if (req.query.category) {
    filters.category = req.query.category as RequestCategory;
  }
  if (req.query.isActive !== undefined) {
    filters.isActive = req.query.isActive === 'true';
  }
  if (req.query.isSystemType !== undefined) {
    filters.isSystemType = req.query.isSystemType === 'true';
  }
  if (req.query.search) {
    filters.search = req.query.search as string;
  }

  const options: requestTypesService.RequestTypeListOptions = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    sortBy: (req.query.sortBy as string) || 'name',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
  };

  const result = await requestTypesService.listRequestTypes(tenantId, filters, options);

  res.json({
    success: true,
    data: result.data,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    },
  });
}

/**
 * List available request packs
 * GET /api/v1/request-types/packs
 */
export async function listRequestPacks(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;

  const packs = await requestTypesService.listRequestPacks(tenantId);

  res.json({
    success: true,
    data: packs,
  });
}

/**
 * Get a single request pack by code
 * GET /api/v1/request-types/packs/:code
 */
export async function getRequestPack(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const code = req.params.code;

  const pack = await requestTypesService.getRequestPackByCode(tenantId, code);

  if (!pack) {
    throw new ApiError('Request pack not found', 404, 'NOT_FOUND');
  }

  res.json({
    success: true,
    data: pack,
  });
}

/**
 * Activate a request pack for the tenant
 * POST /api/v1/request-types/packs/:code/activate
 */
export async function activateRequestPack(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const code = req.params.code;

  const pack = await requestTypesService.activateRequestPack(tenantId, code, userId);

  res.status(200).json({
    success: true,
    data: pack,
    message: 'Request pack activated successfully',
  });
}

/**
 * List request blueprints visible to the tenant
 * GET /api/v1/request-types/blueprints
 */
export async function listRequestBlueprints(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;

  const blueprints = await requestTypesService.listRequestBlueprints(tenantId, {
    onlyActivated: req.query.onlyActivated === 'true',
  });

  res.json({
    success: true,
    data: blueprints,
  });
}

/**
 * Get a blueprint by request type code
 * GET /api/v1/request-types/blueprints/:code
 */
export async function getRequestBlueprint(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const code = req.params.code;

  const blueprint = await requestTypesService.getRequestBlueprintByRequestTypeCode(tenantId, code);

  if (!blueprint) {
    throw new ApiError('Request blueprint not found', 404, 'NOT_FOUND');
  }

  res.json({
    success: true,
    data: blueprint,
  });
}

/**
 * Get a single request type
 * GET /api/v1/request-types/:id
 */
export async function getRequestType(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const id = req.params.id;

  // Check if ID is a UUID or a code
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  let requestType;
  if (isUuid) {
    requestType = await requestTypesService.getRequestTypeById(tenantId, id);
  } else {
    requestType = await requestTypesService.getRequestTypeByCode(tenantId, id);
  }

  if (!requestType) {
    throw new ApiError('Request type not found', 404, 'NOT_FOUND');
  }

  res.json({
    success: true,
    data: requestType,
  });
}

/**
 * Create a new request type
 * POST /api/v1/request-types
 */
export async function createRequestType(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  // Validate required fields
  if (!req.body.name || !req.body.category) {
    throw new ApiError('Name and category are required', 400, 'VALIDATION_ERROR');
  }

  const input: requestTypesService.CreateRequestTypeInput = {
    code: typeof req.body.code === 'string' ? req.body.code.toUpperCase() : undefined,
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    defaultPriority: req.body.defaultPriority,
    responseSlaHours: req.body.responseSlaHours,
    resolutionSlaHours: req.body.resolutionSlaHours,
    slaCalculationType: req.body.slaCalculationType,
    requiresApproval: req.body.requiresApproval,
    allowDraft: req.body.allowDraft,
    allowAttachments: req.body.allowAttachments,
    maxAttachmentSizeMb: req.body.maxAttachmentSizeMb,
    maxAttachments: req.body.maxAttachments,
    formSchema: req.body.formSchema,
    requiredFields: req.body.requiredFields,
    sensitiveFields: req.body.sensitiveFields,
    onApprovalHandler: req.body.onApprovalHandler,
    onRejectionHandler: req.body.onRejectionHandler,
    onCancellationHandler: req.body.onCancellationHandler,
    allowRollback: req.body.allowRollback,
    rollbackWindowDays: req.body.rollbackWindowDays,
    rollbackRequiresApproval: req.body.rollbackRequiresApproval,
    rollbackPermission: req.body.rollbackPermission,
    visibilityScope: req.body.visibilityScope,
    retentionDays: req.body.retentionDays,
  };

  const requestType = await requestTypesService.createRequestType(tenantId, userId, input);

  res.status(201).json({
    success: true,
    data: requestType,
    message: 'Request type created successfully',
  });
}

/**
 * Update a request type
 * PUT /api/v1/request-types/:id
 */
export async function updateRequestType(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestTypeId = req.params.id;

  const input: requestTypesService.UpdateRequestTypeInput = {
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    defaultPriority: req.body.defaultPriority,
    responseSlaHours: req.body.responseSlaHours,
    resolutionSlaHours: req.body.resolutionSlaHours,
    slaCalculationType: req.body.slaCalculationType,
    isActive: req.body.isActive,
    requiresApproval: req.body.requiresApproval,
    allowDraft: req.body.allowDraft,
    allowAttachments: req.body.allowAttachments,
    maxAttachmentSizeMb: req.body.maxAttachmentSizeMb,
    maxAttachments: req.body.maxAttachments,
    formSchema: req.body.formSchema,
    requiredFields: req.body.requiredFields,
    sensitiveFields: req.body.sensitiveFields,
    onApprovalHandler: req.body.onApprovalHandler,
    onRejectionHandler: req.body.onRejectionHandler,
    onCancellationHandler: req.body.onCancellationHandler,
    allowRollback: req.body.allowRollback,
    rollbackWindowDays: req.body.rollbackWindowDays,
    rollbackRequiresApproval: req.body.rollbackRequiresApproval,
    rollbackPermission: req.body.rollbackPermission,
    visibilityScope: req.body.visibilityScope,
    retentionDays: req.body.retentionDays,
  };

  const requestType = await requestTypesService.updateRequestType(tenantId, requestTypeId, userId, input);

  res.json({
    success: true,
    data: requestType,
    message: 'Request type updated successfully',
  });
}

/**
 * Delete a request type
 * DELETE /api/v1/request-types/:id
 */
export async function deleteRequestType(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestTypeId = req.params.id;

  await requestTypesService.deleteRequestType(tenantId, requestTypeId, userId);

  res.json({
    success: true,
    message: 'Request type deleted successfully',
  });
}

/**
 * Clone a request type
 * POST /api/v1/request-types/:id/clone
 */
export async function cloneRequestType(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const sourceId = req.params.id;

  if (!req.body.code) {
    throw new ApiError('New code is required', 400, 'VALIDATION_ERROR');
  }

  const requestType = await requestTypesService.cloneRequestType(
    tenantId,
    userId,
    sourceId,
    req.body.code.toUpperCase(),
    req.body.name
  );

  res.status(201).json({
    success: true,
    data: requestType,
    message: 'Request type cloned successfully',
  });
}

/**
 * Assign workflow to a request type
 * PUT /api/v1/request-types/:id/workflow
 */
export async function assignWorkflow(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestTypeId = req.params.id;

  const config = await requestTypesService.assignWorkflowToRequestType(
    tenantId,
    requestTypeId,
    req.body.approvalChainId || null,
    userId
  );

  res.json({
    success: true,
    data: config,
    message: 'Workflow assigned successfully',
  });
}

// ============================================================================
// Request Type Templates
// ============================================================================

/**
 * List available templates
 * GET /api/v1/request-types/templates
 */
export async function listTemplates(req: Request, res: Response): Promise<void> {
  const filters = {
    category: req.query.category as string | undefined,
    isActive: req.query.isActive === 'false' ? false : true,
    search: req.query.search as string | undefined,
  };

  const templates = await requestTypesService.listRequestTypeTemplates(filters);

  res.json({
    success: true,
    data: templates,
  });
}

/**
 * Get a single template
 * GET /api/v1/request-types/templates/:id
 */
export async function getTemplate(req: Request, res: Response): Promise<void> {
  const templateId = req.params.id;

  const template = await requestTypesService.getRequestTypeTemplate(templateId);

  if (!template) {
    throw new ApiError('Template not found', 404, 'NOT_FOUND');
  }

  res.json({
    success: true,
    data: template,
  });
}

/**
 * Import a template
 * POST /api/v1/request-types/templates/:id/import
 */
export async function importTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const templateId = req.params.id;

  const options = {
    includeWorkflows: req.body.includeWorkflows ?? true,
    codePrefix: req.body.codePrefix as string | undefined,
  };

  const result = await requestTypesService.importRequestTypeTemplate(
    tenantId,
    userId,
    templateId,
    options
  );

  res.status(201).json({
    success: true,
    data: result,
    message: `Imported ${result.requestTypes.length} request type(s) and ${result.workflows.length} workflow(s)`,
  });
}
