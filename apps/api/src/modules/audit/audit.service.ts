/**
 * Audit Log Service
 * Retrieve and query audit logs
 */

import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import {
  type InvoiceLinkageEventInput,
  toInvoiceLinkageAuditPayload,
  validateInvoiceLinkageEventInput,
} from '../../config/invoice-linkage-events';

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

export interface InvoiceLinkageReconciliationEntry {
  invoiceReference: string;
  requestCount: number;
  timesheetEntryCount: number;
  timesheetPeriodCount: number;
  totalLinkedRecords: number;
}

export interface InvoiceLinkageReconciliationReport {
  data: InvoiceLinkageReconciliationEntry[];
  summary: {
    invoiceReferenceCount: number;
    requestCount: number;
    timesheetEntryCount: number;
    timesheetPeriodCount: number;
    totalLinkedRecords: number;
  };
}

type InvoiceLinkageReconciliationRow = {
  invoiceReference: string;
  requestCount: number | bigint;
  timesheetEntryCount: number | bigint;
  timesheetPeriodCount: number | bigint;
  totalLinkedRecords: number | bigint;
};

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

export async function getInvoiceLinkageReconciliationReport(
  tenantId: string
): Promise<InvoiceLinkageReconciliationReport> {
  const rows = (await prisma.$queryRaw`
    WITH request_counts AS (
      SELECT
        r."requestData" ->> 'invoiceReference' AS "invoiceReference",
        COUNT(*)::int AS "requestCount"
      FROM "Request" r
      WHERE r."tenantId" = ${tenantId}
        AND r."deletedAt" IS NULL
        AND COALESCE(NULLIF(TRIM(r."requestData" ->> 'invoiceReference'), ''), '') <> ''
      GROUP BY 1
    ),
    timesheet_entry_counts AS (
      SELECT
        te."customFields" ->> 'invoiceReference' AS "invoiceReference",
        COUNT(*)::int AS "timesheetEntryCount"
      FROM "TimesheetEntry" te
      WHERE te."tenantId" = ${tenantId}
        AND te."deletedAt" IS NULL
        AND COALESCE(NULLIF(TRIM(te."customFields" ->> 'invoiceReference'), ''), '') <> ''
      GROUP BY 1
    ),
    timesheet_period_counts AS (
      SELECT
        refs."invoiceReference",
        COUNT(DISTINCT tp."id")::int AS "timesheetPeriodCount"
      FROM (
        SELECT
          te."tenantId",
          te."resourceId",
          te."date",
          te."customFields" ->> 'invoiceReference' AS "invoiceReference"
        FROM "TimesheetEntry" te
        WHERE te."tenantId" = ${tenantId}
          AND te."deletedAt" IS NULL
          AND COALESCE(NULLIF(TRIM(te."customFields" ->> 'invoiceReference'), ''), '') <> ''
      ) refs
      INNER JOIN "TimesheetPeriod" tp
        ON tp."tenantId" = refs."tenantId"
       AND tp."resourceId" = refs."resourceId"
       AND refs."date" BETWEEN tp."periodStart" AND tp."periodEnd"
      GROUP BY refs."invoiceReference"
    ),
    combined AS (
      SELECT
        COALESCE(r."invoiceReference", e."invoiceReference", p."invoiceReference") AS "invoiceReference",
        COALESCE(r."requestCount", 0)::int AS "requestCount",
        COALESCE(e."timesheetEntryCount", 0)::int AS "timesheetEntryCount",
        COALESCE(p."timesheetPeriodCount", 0)::int AS "timesheetPeriodCount"
      FROM request_counts r
      FULL OUTER JOIN timesheet_entry_counts e
        ON e."invoiceReference" = r."invoiceReference"
      FULL OUTER JOIN timesheet_period_counts p
        ON p."invoiceReference" = COALESCE(r."invoiceReference", e."invoiceReference")
    )
    SELECT
      "invoiceReference",
      "requestCount",
      "timesheetEntryCount",
      "timesheetPeriodCount",
      ("requestCount" + "timesheetEntryCount" + "timesheetPeriodCount")::int AS "totalLinkedRecords"
    FROM combined
    ORDER BY "invoiceReference" ASC
  `) as unknown as InvoiceLinkageReconciliationRow[];

  const data: InvoiceLinkageReconciliationEntry[] = rows.map((row) => ({
    invoiceReference: row.invoiceReference,
    requestCount: Number(row.requestCount),
    timesheetEntryCount: Number(row.timesheetEntryCount),
    timesheetPeriodCount: Number(row.timesheetPeriodCount),
    totalLinkedRecords: Number(row.totalLinkedRecords),
  }));

  const summary = data.reduce(
    (acc, row) => {
      acc.requestCount += row.requestCount;
      acc.timesheetEntryCount += row.timesheetEntryCount;
      acc.timesheetPeriodCount += row.timesheetPeriodCount;
      acc.totalLinkedRecords += row.totalLinkedRecords;
      return acc;
    },
    {
      invoiceReferenceCount: data.length,
      requestCount: 0,
      timesheetEntryCount: 0,
      timesheetPeriodCount: 0,
      totalLinkedRecords: 0,
    }
  );

  return {
    data,
    summary,
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

// M-20: PII fields to redact from audit log changes
const PII_FIELDS = ['email', 'firstName', 'lastName', 'phone', 'address', 'ssn', 'dateOfBirth', 'passwordHash', 'mfaSecret', 'bankAccount'];

function redactPiiFromChanges(changes: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...changes };
  for (const key of Object.keys(redacted)) {
    if (PII_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      if (typeof redacted[key] === 'string') {
        const val = redacted[key] as string;
        redacted[key] = val.length > 2 ? val[0] + '***' + val[val.length - 1] : '[REDACTED]';
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null && !Array.isArray(redacted[key])) {
      redacted[key] = redactPiiFromChanges(redacted[key] as Record<string, unknown>);
    }
  }
  return redacted;
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
  // M-20: Redact PII fields from changes before persisting
  const safeChanges = changes ? redactPiiFromChanges(changes) : undefined;

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType,
      entityId,
      action: action as never,
      changes: (safeChanges ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function createInvoiceLinkageAuditEvent(input: InvoiceLinkageEventInput): Promise<void> {
  validateInvoiceLinkageEventInput(input);
  const payload = toInvoiceLinkageAuditPayload(input);

  await createAuditLog(
    input.tenantId,
    input.userId,
    payload.entityType,
    payload.entityId,
    payload.action,
    payload.changes,
    payload.metadata
  );
}
