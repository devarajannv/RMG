import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface CreateContractInput {
  clientId: string;
  contractNumber: string;
  name: string;
  type: 'MSA' | 'SOW' | 'AMENDMENT' | 'NDA' | 'OTHER';
  description?: string;
  startDate: Date;
  endDate?: Date;
  signedDate?: Date;
  value?: number;
  currency?: string;
  billingType: 'TM' | 'FIXED' | 'RETAINER' | 'MILESTONE' | 'HYBRID';
  paymentTerms?: string;
  autoRenew?: boolean;
  accountMgrId?: string;
  documentUrl?: string;
  notes?: string;
}

export interface UpdateContractInput extends Partial<CreateContractInput> {
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
  renewalDate?: Date;
}

export interface ContractFilters {
  search?: string;
  clientId?: string;
  status?: string[];
  type?: string[];
  billingType?: string[];
  expiringWithinDays?: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new contract
 */
export async function createContract(
  tenantId: string,
  input: CreateContractInput,
  userId: string
) {
  // Validate client exists
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, tenantId, deletedAt: null },
  });

  if (!client) {
    throw new ApiError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  // Check duplicate contract number
  const existing = await prisma.contract.findFirst({
    where: {
      tenantId,
      contractNumber: input.contractNumber,
      deletedAt: null,
    },
  });

  if (existing) {
    throw new ApiError(
      `Contract ${input.contractNumber} already exists`,
      409,
      'DUPLICATE_CONTRACT'
    );
  }

  // Validate account manager if provided
  if (input.accountMgrId) {
    const manager = await prisma.resource.findFirst({
      where: { id: input.accountMgrId, tenantId, deletedAt: null },
    });
    if (!manager) {
      throw new ApiError('Account manager not found', 404, 'MANAGER_NOT_FOUND');
    }
  }

  const contract = await prisma.contract.create({
    data: {
      tenantId,
      clientId: input.clientId,
      contractNumber: input.contractNumber,
      name: input.name,
      type: input.type,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      signedDate: input.signedDate,
      value: input.value,
      currency: input.currency ?? 'INR',
      billingType: input.billingType,
      paymentTerms: input.paymentTerms,
      autoRenew: input.autoRenew ?? false,
      accountMgrId: input.accountMgrId,
      documentUrl: input.documentUrl,
      notes: input.notes,
      status: 'DRAFT',
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
      accountManager: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Contract',
      entityId: contract.id,
      action: 'CREATE',
      changes: input as unknown as Prisma.JsonObject,
    },
  });

  logger.info('Contract created', { contractId: contract.id });

  return contract;
}

/**
 * Get contract by ID
 */
export async function getContractById(tenantId: string, contractId: string) {
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      tenantId,
      deletedAt: null,
    },
    include: {
      client: true,
      accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
      projects: {
        where: { deletedAt: null },
        include: {
          manager: { select: { firstName: true, lastName: true } },
          _count: { select: { allocations: true } },
        },
        orderBy: { startDate: 'desc' },
      },
    },
  });

  if (!contract) {
    throw new ApiError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  }

  return contract;
}

/**
 * List contracts with filters
 */
export async function listContracts(
  tenantId: string,
  filters: ContractFilters,
  pagination: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
) {
  const { page, limit, sortBy = 'startDate', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.ContractWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { contractNumber: { contains: filters.search, mode: 'insensitive' } },
      { client: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.status?.length) {
    where.status = { in: filters.status as ('DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED')[] };
  }

  if (filters.type?.length) {
    where.type = { in: filters.type as ('MSA' | 'SOW' | 'AMENDMENT' | 'NDA' | 'OTHER')[] };
  }

  if (filters.billingType?.length) {
    where.billingType = { in: filters.billingType as ('TM' | 'FIXED' | 'RETAINER' | 'MILESTONE' | 'HYBRID')[] };
  }

  if (filters.expiringWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
    where.endDate = {
      gte: new Date(),
      lte: futureDate,
    };
    where.status = 'ACTIVE';
  }

  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        client: { select: { id: true, name: true, code: true } },
        accountManager: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { projects: { where: { deletedAt: null } } } },
      },
    }),
    prisma.contract.count({ where }),
  ]);

  return {
    data: contracts,
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
 * Update contract
 */
export async function updateContract(
  tenantId: string,
  contractId: string,
  input: UpdateContractInput,
  userId: string
) {
  const existing = await prisma.contract.findFirst({
    where: { id: contractId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  }

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: {
      name: input.name,
      type: input.type,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      signedDate: input.signedDate,
      value: input.value,
      currency: input.currency,
      billingType: input.billingType,
      paymentTerms: input.paymentTerms,
      status: input.status,
      autoRenew: input.autoRenew,
      renewalDate: input.renewalDate,
      accountMgrId: input.accountMgrId,
      documentUrl: input.documentUrl,
      notes: input.notes,
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
      accountManager: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Contract',
      entityId: contract.id,
      action: 'UPDATE',
      changes: { before: existing, after: input } as unknown as Prisma.JsonObject,
    },
  });

  return contract;
}

/**
 * Delete contract
 */
export async function deleteContract(
  tenantId: string,
  contractId: string,
  userId: string
) {
  const existing = await prisma.contract.findFirst({
    where: { id: contractId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  }

  // Check for linked projects
  const linkedProjects = await prisma.project.count({
    where: { contractId, deletedAt: null },
  });

  if (linkedProjects > 0) {
    throw new ApiError(
      'Cannot delete contract with linked projects',
      400,
      'HAS_LINKED_PROJECTS'
    );
  }

  await prisma.contract.update({
    where: { id: contractId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Contract',
      entityId: contractId,
      action: 'DELETE',
    },
  });

  logger.info('Contract deleted', { contractId });
}

/**
 * Get expiring contracts
 */
export async function getExpiringContracts(tenantId: string, days: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return prisma.contract.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      endDate: {
        gte: new Date(),
        lte: futureDate,
      },
    },
    include: {
      client: { select: { name: true, code: true } },
      accountManager: { select: { firstName: true, lastName: true } },
    },
    orderBy: { endDate: 'asc' },
  });
}

/**
 * Get contract statistics
 */
export async function getContractStats(tenantId: string) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [
    totalContracts,
    byStatus,
    byType,
    expiringSoon,
    expiringLater,
    totalValue,
  ] = await Promise.all([
    prisma.contract.count({ where: { tenantId, deletedAt: null } }),
    prisma.contract.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),
    prisma.contract.groupBy({
      by: ['type'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),
    prisma.contract.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { gte: now, lte: thirtyDaysFromNow },
      },
    }),
    prisma.contract.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { gte: thirtyDaysFromNow, lte: ninetyDaysFromNow },
      },
    }),
    prisma.contract.aggregate({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
      _sum: { value: true },
    }),
  ]);

  return {
    total: totalContracts,
    byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
    byType: byType.reduce((acc, t) => ({ ...acc, [t.type]: t._count }), {}),
    expiringSoon, // Within 30 days
    expiringLater, // 30-90 days
    totalActiveValue: totalValue._sum.value?.toNumber() ?? 0,
  };
}

/**
 * Renew a contract
 */
export async function renewContract(
  tenantId: string,
  contractId: string,
  renewalData: {
    newEndDate: Date;
    newValue?: number;
    notes?: string;
  },
  userId: string
) {
  const existing = await prisma.contract.findFirst({
    where: { id: contractId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  }

  if (existing.status !== 'ACTIVE') {
    throw new ApiError('Only active contracts can be renewed', 400, 'INVALID_STATUS');
  }

  // Update the existing contract as renewed and create audit
  const renewedContract = await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: 'RENEWED',
      renewalDate: new Date(),
      notes: renewalData.notes
        ? `${existing.notes || ''}\n[Renewed ${new Date().toISOString()}] ${renewalData.notes}`
        : existing.notes,
    },
  });

  // Create new contract period
  const newContract = await prisma.contract.create({
    data: {
      tenantId,
      clientId: existing.clientId,
      contractNumber: `${existing.contractNumber}-R${Date.now().toString(36).toUpperCase()}`,
      name: `${existing.name} (Renewed)`,
      type: existing.type,
      description: existing.description,
      startDate: existing.endDate || new Date(),
      endDate: renewalData.newEndDate,
      value: renewalData.newValue ?? existing.value,
      currency: existing.currency,
      billingType: existing.billingType,
      paymentTerms: existing.paymentTerms,
      autoRenew: existing.autoRenew,
      accountMgrId: existing.accountMgrId,
      status: 'ACTIVE',
      notes: `Renewal of contract ${existing.contractNumber}`,
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
      accountManager: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Contract',
      entityId: contractId,
      action: 'RENEW',
      changes: { originalId: contractId, newId: newContract.id, newEndDate: renewalData.newEndDate.toISOString() } as Prisma.JsonObject,
    },
  });

  logger.info('Contract renewed', { originalId: contractId, newId: newContract.id });

  return { original: renewedContract, renewed: newContract };
}

/**
 * Activate a draft contract
 */
export async function activateContract(
  tenantId: string,
  contractId: string,
  userId: string
) {
  const existing = await prisma.contract.findFirst({
    where: { id: contractId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  }

  if (existing.status !== 'DRAFT' && existing.status !== 'PENDING_APPROVAL') {
    throw new ApiError('Only draft or pending contracts can be activated', 400, 'INVALID_STATUS');
  }

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: 'ACTIVE',
      signedDate: existing.signedDate ?? new Date(),
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
      accountManager: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Contract',
      entityId: contractId,
      action: 'ACTIVATE',
    },
  });

  logger.info('Contract activated', { contractId });

  return contract;
}

/**
 * Terminate a contract
 */
export async function terminateContract(
  tenantId: string,
  contractId: string,
  reason: string,
  userId: string
) {
  const existing = await prisma.contract.findFirst({
    where: { id: contractId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ApiError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  }

  if (existing.status !== 'ACTIVE') {
    throw new ApiError('Only active contracts can be terminated', 400, 'INVALID_STATUS');
  }

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: 'TERMINATED',
      notes: `${existing.notes || ''}\n[Terminated ${new Date().toISOString()}] ${reason}`,
    },
    include: {
      client: { select: { id: true, name: true, code: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Contract',
      entityId: contractId,
      action: 'TERMINATE',
      changes: { reason } as Prisma.JsonObject,
    },
  });

  logger.info('Contract terminated', { contractId, reason });

  return contract;
}

/**
 * Link project to contract
 */
export async function linkProjectToContract(
  tenantId: string,
  contractId: string,
  projectId: string,
  userId: string
) {
  const [contract, project] = await Promise.all([
    prisma.contract.findFirst({ where: { id: contractId, tenantId, deletedAt: null } }),
    prisma.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null } }),
  ]);

  if (!contract) {
    throw new ApiError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  }

  if (!project) {
    throw new ApiError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.clientId !== contract.clientId) {
    throw new ApiError('Project must belong to the same client as the contract', 400, 'CLIENT_MISMATCH');
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { contractId },
    include: {
      contract: { select: { id: true, contractNumber: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Project',
      entityId: projectId,
      action: 'LINK_CONTRACT',
      changes: { contractId } as Prisma.JsonObject,
    },
  });

  return updatedProject;
}

/**
 * Unlink project from contract
 */
export async function unlinkProjectFromContract(
  tenantId: string,
  projectId: string,
  userId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
  });

  if (!project) {
    throw new ApiError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (!project.contractId) {
    throw new ApiError('Project is not linked to any contract', 400, 'NOT_LINKED');
  }

  const previousContractId = project.contractId;

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { contractId: null },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Project',
      entityId: projectId,
      action: 'UNLINK_CONTRACT',
      changes: { previousContractId } as Prisma.JsonObject,
    },
  });

  return updatedProject;
}

