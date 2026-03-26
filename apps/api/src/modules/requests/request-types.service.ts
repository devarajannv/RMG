/**
 * Request Types Service
 * Manages request type CRUD operations including tenant-specific custom types
 */

import {
  Prisma,
  RequestCategory,
  Priority,
  SlaCalculationType,
  RequestVisibility,
  RollbackPermission,
} from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import { parseRequestBlueprintDefinition } from './request-blueprint.schemas';

// ============================================================================
// Types
// ============================================================================

export interface CreateRequestTypeInput {
  code?: string;
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

export interface RequestBlueprintListOptions {
  onlyActivated?: boolean;
}

type PackActivationRecord = {
  id: string;
  tenantId: string;
  status: string;
  activatedAt: Date;
  activatedByUserId: string | null;
};

type RequestTypeRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: RequestCategory;
  defaultPriority: Priority;
  requiresApproval: boolean;
  allowDraft: boolean;
  allowAttachments: boolean;
  visibilityScope: RequestVisibility;
  isSystemType: boolean;
  tenantId: string | null;
};

type RequestBlueprintWithRelations = {
  id: string;
  code: string;
  schemaVersion: string;
  name: string;
  description: string | null;
  domain: string;
  category: string;
  icon: string | null;
  version: number;
  isSystemBlueprint: boolean;
  maturityLevel: string;
  renderMode: string;
  complexityLevel: string;
  allowDraft: boolean;
  allowSubmit: boolean;
  allowEditAfterReturn: boolean;
  allowAttachments: boolean;
  maxAttachments: number | null;
  maxAttachmentSizeMb: number | null;
  commonFields: Prisma.JsonValue;
  entityBindings: Prisma.JsonValue;
  customFields: Prisma.JsonValue;
  dependencyRules: Prisma.JsonValue;
  workflowPolicy: Prisma.JsonValue;
  overridePolicy: Prisma.JsonValue;
  requestType: RequestTypeRecord | null;
  packs: Array<{
    sortOrder: number;
    isRequired: boolean;
    pack: {
      code: string;
      name: string;
      activations: PackActivationRecord[];
    };
  }>;
};

type RequestPackWithRelations = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  domain: string;
  maturityLevel: string;
  isActive: boolean;
  sortOrder: number;
  iconName: string | null;
  activationDependencies: Prisma.JsonValue;
  recommendedOrgProfiles: string[];
  activations: PackActivationRecord[];
  blueprints: Array<{
    sortOrder: number;
    isRequired: boolean;
    blueprint: RequestBlueprintWithRelations;
  }>;
};

const prismaClient = prisma as typeof prisma & {
  requestPack: {
    findMany: (args: unknown) => Promise<RequestPackWithRelations[]>;
    findFirst: (args: unknown) => Promise<RequestPackWithRelations | null>;
  };
  requestBlueprint: {
    findMany: (args: unknown) => Promise<RequestBlueprintWithRelations[]>;
    findFirst: (args: unknown) => Promise<RequestBlueprintWithRelations | null>;
  };
};

function buildBlueprintDefinition(blueprint: RequestBlueprintWithRelations) {
  const packCodes = blueprint.packs.map((membership: RequestBlueprintWithRelations['packs'][number]) => membership.pack.code);

  return parseRequestBlueprintDefinition({
    schemaVersion: blueprint.schemaVersion,
    identity: {
      code: blueprint.code,
      name: blueprint.name,
      description: blueprint.description ?? undefined,
      domain: blueprint.domain,
      category: blueprint.category,
      icon: blueprint.icon ?? undefined,
      version: blueprint.version,
      isSystemBlueprint: blueprint.isSystemBlueprint,
      packCode: packCodes.length === 1 ? packCodes[0] : undefined,
      maturityLevel: blueprint.maturityLevel,
    },
    runtime: {
      renderMode: blueprint.renderMode,
      complexityLevel: blueprint.complexityLevel,
      allowDraft: blueprint.allowDraft,
      allowSubmit: blueprint.allowSubmit,
      allowEditAfterReturn: blueprint.allowEditAfterReturn,
      allowAttachments: blueprint.allowAttachments,
      maxAttachments: blueprint.maxAttachments ?? undefined,
      maxAttachmentSizeMb: blueprint.maxAttachmentSizeMb ?? undefined,
    },
    commonFields: blueprint.commonFields,
    entityBindings: blueprint.entityBindings,
    customFields: blueprint.customFields,
    dependencyRules: blueprint.dependencyRules,
    workflowPolicy: blueprint.workflowPolicy,
    overridePolicy: blueprint.overridePolicy,
  });
}

function mapPackActivation(activation: PackActivationRecord | undefined) {
  if (!activation) {
    return null;
  }

  return {
    id: activation.id,
    status: activation.status,
    activatedAt: activation.activatedAt,
    activatedByUserId: activation.activatedByUserId,
  };
}

function mapBlueprintSummary(
  blueprint: any,
  tenantId: string
) {
  if (!blueprint) {
    return null;
  }

  const packMemberships = blueprint.packs.map((membership: any) => {
    const activation = membership.pack.activations.find((item: PackActivationRecord) => item.tenantId === tenantId);

    return {
      packCode: membership.pack.code,
      packName: membership.pack.name,
      sortOrder: membership.sortOrder,
      isRequired: membership.isRequired,
      activation: mapPackActivation(activation),
    };
  });

  return {
    id: blueprint.id,
    code: blueprint.code,
    schemaVersion: blueprint.schemaVersion,
    version: blueprint.version,
    renderMode: blueprint.renderMode,
    complexityLevel: blueprint.complexityLevel,
    allowDraft: blueprint.allowDraft,
    allowSubmit: blueprint.allowSubmit,
    allowEditAfterReturn: blueprint.allowEditAfterReturn,
    allowAttachments: blueprint.allowAttachments,
    isActivatedForTenant: packMemberships.some((membership: any) => membership.activation?.status === 'ACTIVE'),
    packMemberships,
  };
}

function mapBlueprintRecord(
  blueprint: RequestBlueprintWithRelations,
  tenantId: string
) {
  const packMemberships = blueprint.packs.map((membership) => {
    const activation = membership.pack.activations.find((item: PackActivationRecord) => item.tenantId === tenantId);

    return {
      packCode: membership.pack.code,
      packName: membership.pack.name,
      sortOrder: membership.sortOrder,
      isRequired: membership.isRequired,
      activation: mapPackActivation(activation),
    };
  });

  return {
    id: blueprint.id,
    code: blueprint.code,
    schemaVersion: blueprint.schemaVersion,
    definition: buildBlueprintDefinition(blueprint),
    requestType: blueprint.requestType
      ? {
          id: blueprint.requestType.id,
          code: blueprint.requestType.code,
          name: blueprint.requestType.name,
          description: blueprint.requestType.description,
          category: blueprint.requestType.category,
          defaultPriority: blueprint.requestType.defaultPriority,
          requiresApproval: blueprint.requestType.requiresApproval,
          allowDraft: blueprint.requestType.allowDraft,
          allowAttachments: blueprint.requestType.allowAttachments,
          visibilityScope: blueprint.requestType.visibilityScope,
          isSystemType: blueprint.requestType.isSystemType,
          tenantId: blueprint.requestType.tenantId,
        }
      : null,
    isActivatedForTenant: packMemberships.some((membership) => membership.activation?.status === 'ACTIVE'),
    packMemberships,
  };
}

function mapPackRecord(pack: any, tenantId: string) {
  const activation = pack.activations.find((item: PackActivationRecord) => item.tenantId === tenantId);

  return {
    id: pack.id,
    code: pack.code,
    name: pack.name,
    description: pack.description,
    domain: pack.domain,
    maturityLevel: pack.maturityLevel,
    isActive: pack.isActive,
    sortOrder: pack.sortOrder,
    iconName: pack.iconName,
    activationDependencies: pack.activationDependencies,
    recommendedOrgProfiles: pack.recommendedOrgProfiles,
    blueprintCount: pack.blueprints.length,
    activation: mapPackActivation(activation),
    blueprints: pack.blueprints.map((membership: RequestPackWithRelations['blueprints'][number]) => ({
      packCode: pack.code,
      sortOrder: membership.sortOrder,
      isRequired: membership.isRequired,
      blueprint: {
        id: membership.blueprint.id,
        code: membership.blueprint.code,
        name: membership.blueprint.name,
        description: membership.blueprint.description,
        category: membership.blueprint.category,
        renderMode: membership.blueprint.renderMode,
        complexityLevel: membership.blueprint.complexityLevel,
        requestType: membership.blueprint.requestType
          ? {
              id: membership.blueprint.requestType.id,
              code: membership.blueprint.requestType.code,
              name: membership.blueprint.requestType.name,
              category: membership.blueprint.requestType.category,
            }
          : null,
      },
    })),
  };
}

function getRequestTypeListInclude(tenantId: string) {
  return {
    _count: {
      select: {
        requests: true,
        tenantConfigs: true,
      },
    },
    tenantConfigs: {
      include: {
        approvalChain: {
          select: { id: true, name: true, code: true },
        },
      },
    },
    blueprint: {
      include: {
        packs: {
          include: {
            pack: {
              include: {
                activations: {
                  where: {
                    tenantId,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function getRequestTypeDetailInclude(tenantId: string) {
  return {
    _count: {
      select: {
        requests: true,
        tenantConfigs: true,
      },
    },
    tenantConfigs: {
      include: {
        approvalChain: {
          select: { id: true, name: true, code: true, status: true },
        },
      },
    },
    clonedFrom: {
      select: { id: true, code: true, name: true },
    },
    blueprint: {
      include: {
        requestType: true,
        packs: {
          include: {
            pack: {
              include: {
                activations: {
                  where: {
                    tenantId,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function mapRequestTypeListRecord<T extends { tenantConfigs?: Array<{ tenantId: string }>; blueprint?: any }>(
  requestType: T,
  tenantId: string
) {
  const scoped = scopeTenantConfigs(requestType, tenantId);

  return {
    ...scoped,
    blueprint: mapBlueprintSummary(requestType.blueprint, tenantId),
  };
}

function mapRequestTypeDetailRecord<T extends { tenantConfigs?: Array<{ tenantId: string }>; blueprint?: any }>(
  requestType: T,
  tenantId: string
) {
  const scoped = scopeTenantConfigs(requestType, tenantId);

  return {
    ...scoped,
    blueprint: requestType.blueprint ? mapBlueprintRecord(requestType.blueprint, tenantId) : null,
  };
}

function scopeTenantConfigs<T extends { tenantConfigs?: Array<{ tenantId: string }> }>(
  requestType: T,
  tenantId: string
): T {
  if (!requestType.tenantConfigs) {
    return requestType;
  }

  return {
    ...requestType,
    tenantConfigs: requestType.tenantConfigs.filter((config) => config.tenantId === tenantId),
  };
}

function toRequestTypeBaseCode(name: string): string {
  const normalized = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const fallback = normalized || 'REQUEST_TYPE';
  const startsWithLetter = /^[A-Z]/.test(fallback);
  const prefixed = startsWithLetter ? fallback : `RT_${fallback}`;

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

async function codeExistsForTenantOrSystem(tenantId: string, code: string): Promise<boolean> {
  const existing = await prisma.requestType.findFirst({
    where: {
      code,
      OR: [
        { tenantId },
        { tenantId: null, isSystemType: true },
      ],
    },
    select: { id: true },
  });

  return !!existing;
}

async function resolveRequestTypeCode(
  tenantId: string,
  name: string,
  requestedCode?: string
): Promise<string> {
  const normalizedRequested = normalizeRequestedCode(requestedCode);
  const initialCode = normalizedRequested || toRequestTypeBaseCode(name);

  const codeRegex = /^[A-Z][A-Z0-9_]{2,49}$/;
  if (!codeRegex.test(initialCode)) {
    throw new ApiError(
      'Code must be uppercase, start with a letter, and contain only letters, numbers, and underscores (3-50 chars)',
      400,
      'INVALID_CODE_FORMAT'
    );
  }

  let attempt = 1;
  while (attempt <= 200) {
    const candidate = withSuffix(initialCode, attempt);
    const exists = await codeExistsForTenantOrSystem(tenantId, candidate);

    if (!exists) {
      return candidate;
    }

    attempt += 1;
  }

  throw new ApiError('Unable to generate unique request type code', 500, 'CODE_GENERATION_FAILED');
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
      include: getRequestTypeListInclude(tenantId),
    }),
    prisma.requestType.count({ where }),
  ]);

  return {
    data: data.map((requestType) => mapRequestTypeListRecord(requestType, tenantId)),
    total,
    page,
    limit,
  };
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
    include: getRequestTypeDetailInclude(tenantId),
  });

  return requestType ? mapRequestTypeDetailRecord(requestType, tenantId) : null;
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
    include: getRequestTypeDetailInclude(tenantId),
  });

  // If not found, check for system type
  if (!requestType) {
    requestType = await prisma.requestType.findFirst({
      where: {
        code: code,
        tenantId: null,
        isSystemType: true,
      },
      include: getRequestTypeDetailInclude(tenantId),
    });
  }

  return requestType ? mapRequestTypeDetailRecord(requestType, tenantId) : null;
}

// ============================================================================
// Request Packs & Blueprints
// ============================================================================

/**
 * List active request packs with tenant activation state
 */
export async function listRequestPacks(tenantId: string): Promise<unknown[]> {
  const packs = await prismaClient.requestPack.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      activations: {
        where: {
          tenantId,
        },
      },
      blueprints: {
        orderBy: [{ sortOrder: 'asc' }, { blueprint: { name: 'asc' } }],
        include: {
          blueprint: {
            include: {
              requestType: true,
            },
          },
        },
      },
    },
  });

  return packs.map((pack) => mapPackRecord(pack, tenantId));
}

/**
 * Get a single request pack by code
 */
export async function getRequestPackByCode(
  tenantId: string,
  code: string
): Promise<unknown | null> {
  const pack = await prismaClient.requestPack.findFirst({
    where: {
      code,
      isActive: true,
    },
    include: {
      activations: {
        where: {
          tenantId,
        },
      },
      blueprints: {
        orderBy: [{ sortOrder: 'asc' }, { blueprint: { name: 'asc' } }],
        include: {
          blueprint: {
            include: {
              requestType: true,
            },
          },
        },
      },
    },
  });

  return pack ? mapPackRecord(pack, tenantId) : null;
}

/**
 * Activate a request pack for a tenant
 */
export async function activateRequestPack(
  tenantId: string,
  code: string,
  userId: string
): Promise<unknown> {
  const pack = await prisma.requestPack.findFirst({
    where: {
      code,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      activationDependencies: true,
    },
  });

  if (!pack) {
    throw new ApiError('Request pack not found', 404, 'NOT_FOUND');
  }

  await prisma.tenantRequestPackActivation.upsert({
    where: {
      tenantId_packId: {
        tenantId,
        packId: pack.id,
      },
    },
    create: {
      tenantId,
      packId: pack.id,
      status: 'ACTIVE',
      activatedByUserId: userId,
      activationSummary: {
        activatedPackCode: pack.code,
        activatedPackName: pack.name,
      },
      readinessSnapshot: pack.activationDependencies as Prisma.InputJsonValue | undefined,
    },
    update: {
      status: 'ACTIVE',
      activatedByUserId: userId,
      activationSummary: {
        activatedPackCode: pack.code,
        activatedPackName: pack.name,
      },
      readinessSnapshot: pack.activationDependencies as Prisma.InputJsonValue | undefined,
    },
  });

  logger.info('Request pack activated', {
    tenantId,
    userId,
    packCode: pack.code,
  });

  return getRequestPackByCode(tenantId, code);
}

/**
 * List blueprint-backed request types visible to a tenant
 */
export async function listRequestBlueprints(
  tenantId: string,
  options?: RequestBlueprintListOptions
): Promise<unknown[]> {
  const blueprints = await prismaClient.requestBlueprint.findMany({
    where: {
      requestType: {
        OR: [
          { tenantId },
          { tenantId: null, isSystemType: true },
        ],
      },
      ...(options?.onlyActivated
        ? {
            packs: {
              some: {
                pack: {
                  activations: {
                    some: {
                      tenantId,
                      status: 'ACTIVE',
                    },
                  },
                },
              },
            },
          }
        : {}),
    },
    orderBy: [{ name: 'asc' }],
    include: {
      requestType: true,
      packs: {
        orderBy: { sortOrder: 'asc' },
        include: {
          pack: {
            include: {
              activations: {
                where: {
                  tenantId,
                },
              },
            },
          },
        },
      },
    },
  });

  return blueprints.map((blueprint: RequestBlueprintWithRelations) => mapBlueprintRecord(blueprint, tenantId));
}

/**
 * Get a blueprint by request type code
 */
export async function getRequestBlueprintByRequestTypeCode(
  tenantId: string,
  requestTypeCode: string
): Promise<unknown | null> {
  const blueprint = await prismaClient.requestBlueprint.findFirst({
    where: {
      requestType: {
        code: requestTypeCode,
        OR: [
          { tenantId },
          { tenantId: null, isSystemType: true },
        ],
      },
    },
    orderBy: {
      requestType: {
        tenantId: 'desc',
      },
    },
    include: {
      requestType: true,
      packs: {
        orderBy: { sortOrder: 'asc' },
        include: {
          pack: {
            include: {
              activations: {
                where: {
                  tenantId,
                },
              },
            },
          },
        },
      },
    },
  });

  return blueprint ? mapBlueprintRecord(blueprint, tenantId) : null;
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
  const resolvedCode = await resolveRequestTypeCode(tenantId, input.name, input.code);

  const requestType = await prisma.requestType.create({
    data: {
      code: resolvedCode,
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
    codeAutoGenerated: !input.code,
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
  // M-10: Use findFirst with tenantId to prevent cross-tenant data loading
  const requestType = await prisma.requestType.findFirst({
    where: { id: requestTypeId, OR: [{ tenantId }, { tenantId: null }] },
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
  // M-10: Use findFirst with tenantId to prevent cross-tenant data loading
  const requestType = await prisma.requestType.findFirst({
    where: { id: requestTypeId, OR: [{ tenantId }, { tenantId: null }] },
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

  // Ensure tenant owns this type (defense-in-depth after findFirst scoping)
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
