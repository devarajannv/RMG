import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface CreateClientInput {
  name: string;
  code: string;
  industry?: string;
  website?: string;
  tier?: 'STRATEGIC' | 'KEY' | 'STANDARD';
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contacts?: Array<{
    name: string;
    email: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
  }>;
  notes?: string;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  status?: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
}

export interface ClientFilters {
  search?: string;
  status?: string[];
  tier?: string[];
  industry?: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new client
 */
export async function createClient(
  tenantId: string,
  input: CreateClientInput,
  userId: string
) {
  // Check for duplicate code
  const existing = await prisma.client.findFirst({
    where: {
      tenantId,
      code: input.code.toUpperCase(),
      deletedAt: null,
    },
  });

  if (existing) {
    throw new ApiError(
      `Client with code ${input.code} already exists`,
      409,
      'DUPLICATE_CODE'
    );
  }

  const client = await prisma.client.create({
    data: {
      tenantId,
      name: input.name,
      code: input.code.toUpperCase(),
      industry: input.industry,
      website: input.website,
      tier: input.tier,
      status: 'ACTIVE',
      billingAddress: input.billingAddress as Prisma.JsonObject,
      contacts: input.contacts as unknown as Prisma.JsonArray,
      notes: input.notes,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Client',
      entityId: client.id,
      action: 'CREATE',
      changes: input as unknown as Prisma.JsonObject,
    },
  });

  logger.info('Client created', { clientId: client.id, code: client.code });

  return client;
}

/**
 * Get client by ID with related data
 */
export async function getClientById(tenantId: string, clientId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId,
      deletedAt: null,
    },
    include: {
      contracts: {
        where: { deletedAt: null },
        orderBy: { startDate: 'desc' },
        take: 10,
      },
      projects: {
        where: { deletedAt: null },
        orderBy: { startDate: 'desc' },
        take: 10,
        include: {
          manager: { select: { firstName: true, lastName: true } },
        },
      },
      _count: {
        select: {
          contracts: { where: { deletedAt: null } },
          projects: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!client) {
    throw new ApiError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  return client;
}

/**
 * List clients with filters
 */
export async function listClients(
  tenantId: string,
  filters: ClientFilters,
  pagination: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
) {
  const { page, limit, sortBy: rawSortBy = 'name', sortOrder = 'asc' } = pagination;
  // M-17: sortBy allowlist
  const ALLOWED_CLIENT_SORT = ['name', 'code', 'createdAt', 'updatedAt', 'status', 'industry'];
  const sortBy = ALLOWED_CLIENT_SORT.includes(rawSortBy) ? rawSortBy : 'name';
  const skip = (page - 1) * limit;

  const where: Prisma.ClientWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.status?.length) {
    where.status = { in: filters.status as ('ACTIVE' | 'INACTIVE' | 'PROSPECT')[] };
  }

  if (filters.tier?.length) {
    where.tier = { in: filters.tier as ('STRATEGIC' | 'KEY' | 'STANDARD')[] };
  }

  if (filters.industry) {
    where.industry = { contains: filters.industry, mode: 'insensitive' };
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            contracts: { where: { status: 'ACTIVE' } },
            projects: { where: { status: 'ACTIVE' } },
          },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    data: clients,
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
 * Update client
 */
export async function updateClient(
  tenantId: string,
  clientId: string,
  input: UpdateClientInput,
  userId: string
) {
  const existing = await prisma.client.findFirst({
    where: { id: clientId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  // Check duplicate code if changing
  if (input.code && input.code.toUpperCase() !== existing.code) {
    const codeExists = await prisma.client.findFirst({
      where: {
        tenantId,
        code: input.code.toUpperCase(),
        id: { not: clientId },
        deletedAt: null,
      },
    });
    if (codeExists) {
      throw new ApiError('Client code already in use', 409, 'DUPLICATE_CODE');
    }
  }

  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      name: input.name,
      code: input.code?.toUpperCase(),
      industry: input.industry,
      website: input.website,
      tier: input.tier,
      status: input.status,
      billingAddress: input.billingAddress as Prisma.JsonObject,
      contacts: input.contacts as unknown as Prisma.JsonArray,
      notes: input.notes,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Client',
      entityId: client.id,
      action: 'UPDATE',
      changes: { before: existing, after: input } as unknown as Prisma.JsonObject,
    },
  });

  return client;
}

/**
 * Soft delete client
 */
export async function deleteClient(
  tenantId: string,
  clientId: string,
  userId: string
) {
  const existing = await prisma.client.findFirst({
    where: { id: clientId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  // Check for active contracts/projects
  const activeContracts = await prisma.contract.count({
    where: { clientId, status: 'ACTIVE', deletedAt: null },
  });

  if (activeContracts > 0) {
    throw new ApiError(
      'Cannot delete client with active contracts',
      400,
      'HAS_ACTIVE_CONTRACTS'
    );
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      deletedAt: new Date(),
      status: 'INACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Client',
      entityId: clientId,
      action: 'DELETE',
    },
  });

  logger.info('Client deleted', { clientId });
}

/**
 * Get client summary stats
 */
export async function getClientStats(tenantId: string) {
  const [totalClients, byStatus, byTier] = await Promise.all([
    prisma.client.count({ where: { tenantId, deletedAt: null } }),
    prisma.client.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),
    prisma.client.groupBy({
      by: ['tier'],
      where: { tenantId, deletedAt: null, tier: { not: null } },
      _count: true,
    }),
  ]);

  return {
    total: totalClients,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    byTier: Object.fromEntries(byTier.map((t) => [t.tier, t._count])),
  };
}

