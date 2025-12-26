/**
 * Audit Log Service
 * Retrieve and query audit logs
 */

import prisma from '../../lib/prisma';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
}

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getAuditLogs(
  tenantId: string,
  filters: AuditLogFilters = {},
  page = 1,
  limit = 50
): Promise<PaginatedAuditLogs> {
  const where: Record<string, unknown> = { tenantId };

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) {
      (where.timestamp as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.timestamp as Record<string, unknown>).lte = filters.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      user: log.user,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      changes: log.changes as Record<string, unknown> | null,
      metadata: log.metadata as Record<string, unknown> | null,
      timestamp: log.timestamp,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAuditLogEntityTypes(tenantId: string): Promise<string[]> {
  const result = await prisma.auditLog.findMany({
    where: { tenantId },
    select: { entityType: true },
    distinct: ['entityType'],
  });
  return result.map((r) => r.entityType);
}

export async function createAuditLog(
  tenantId: string,
  userId: string | null,
  entityType: string,
  entityId: string,
  action: string,
  changes?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType,
      entityId,
      action: action as never,
      changes: changes ?? undefined,
      metadata: metadata ?? undefined,
    },
  });
}
