import { PrismaClient, Prisma, TimesheetStatus, PeriodStatus } from '@prisma/client';
import { addDays, startOfWeek, endOfWeek, format, parseISO } from 'date-fns';
import { createAuditLog, createInvoiceLinkageAuditEvent } from '../audit/audit.service';
import { resolveBillabilityDomain, clampBillableRatio } from '../../config/billability-domain';

const prisma = new PrismaClient();

// ============================================================================
// Types
// ============================================================================

export interface TimesheetEntryInput {
  tenantId: string;
  resourceId: string;
  projectId: string;
  allocationId?: string;
  date: Date;
  hours: number;
  taskType?: string;
  description?: string;
  isBillable?: boolean;
  billableRatio?: number;
  isOvertime?: boolean;
}

export interface TimesheetFilters {
  tenantId: string;
  resourceId?: string;
  projectId?: string;
  invoiceReference?: string;
  startDate?: Date;
  endDate?: Date;
  status?: TimesheetStatus[];
  page?: number;
  limit?: number;
}

export interface WeeklyTimesheetData {
  period: {
    start: Date;
    end: Date;
    status: PeriodStatus;
    periodId?: string;
  };
  entries: Array<{
    projectId: string;
    projectName: string;
    projectCode: string;
    clientName: string;
    isBillable: boolean;
    days: { [date: string]: { id?: string; hours: number; status: TimesheetStatus; billableRatio?: number } };
  }>;
  totals: {
    daily: { [date: string]: number };
    weekly: number;
    billable: number;
    nonBillable: number;
  };
}

export interface TimesheetInvoiceLinkageInput {
  invoiceReference: string;
  reason?: string;
  correlationId?: string;
}

export interface TimesheetPeriodInvoiceUnlinkInput {
  invoiceReference: string;
  reason?: string;
  correlationId?: string;
}

function readBillableRatioFromCustomFields(customFields: Prisma.JsonValue | null, fallbackIsBillable: boolean): number {
  const root = (customFields as Record<string, unknown> | null) ?? null;
  const billabilityDomain = (root?.billabilityDomain as Record<string, unknown> | undefined) ?? undefined;
  return clampBillableRatio(billabilityDomain?.billableRatio, fallbackIsBillable ? 1 : 0);
}

function buildBillabilityCustomFields(
  existingCustomFields: Prisma.JsonValue | null,
  hours: number,
  isBillable: boolean,
  billableRatio?: number,
  status: TimesheetStatus = 'DRAFT'
): Prisma.InputJsonValue {
  const root = ((existingCustomFields as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const billabilityDomain = resolveBillabilityDomain({
    isBillable,
    billableRatio,
    status,
    hours,
  });

  return {
    ...root,
    billabilityDomain,
  } as unknown as Prisma.InputJsonValue;
}

function readTimesheetInvoiceReference(customFields: Prisma.JsonValue | null): string | null {
  const root = (customFields as Record<string, unknown> | null) ?? null;
  const invoiceReference = root?.invoiceReference;
  return typeof invoiceReference === 'string' && invoiceReference.trim().length > 0
    ? invoiceReference.trim()
    : null;
}

function buildTimesheetInvoiceLinkedCustomFields(
  existingCustomFields: Prisma.JsonValue | null,
  invoiceReference: string,
  userId: string,
  reason?: string
): Prisma.InputJsonValue {
  const root = ((existingCustomFields as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
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

function buildTimesheetInvoiceUnlinkedCustomFields(
  existingCustomFields: Prisma.JsonValue | null,
  userId: string,
  reason?: string
): Prisma.InputJsonValue {
  const root = ((existingCustomFields as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
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

// ============================================================================
// Timesheet Entry CRUD
// ============================================================================

export async function createTimesheetEntry(input: TimesheetEntryInput) {
  const isBillable = input.isBillable ?? true;
  const customFields = buildBillabilityCustomFields(
    null,
    input.hours,
    isBillable,
    input.billableRatio,
    'DRAFT'
  );

  // Check for existing entry
  const existing = await prisma.timesheetEntry.findFirst({
    where: {
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      projectId: input.projectId,
      date: input.date,
      deletedAt: null,
    },
  });

  if (existing) {
    // Update existing entry
    return prisma.timesheetEntry.update({
      where: { id: existing.id },
      data: {
        hours: input.hours,
        taskType: input.taskType,
        description: input.description,
        isBillable,
        isOvertime: input.isOvertime ?? false,
        customFields,
        status: 'DRAFT',
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        resource: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  return prisma.timesheetEntry.create({
    data: {
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      projectId: input.projectId,
      allocationId: input.allocationId,
      date: input.date,
      hours: input.hours,
      taskType: input.taskType,
      description: input.description,
      isBillable,
      isOvertime: input.isOvertime ?? false,
      customFields,
      status: 'DRAFT',
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      resource: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function updateTimesheetEntry(
  id: string,
  tenantId: string,
  data: Partial<TimesheetEntryInput>
) {
  const entry = await prisma.timesheetEntry.findFirst({
    where: { id, tenantId, deletedAt: null },
  });

  if (!entry) {
    throw new Error('Timesheet entry not found');
  }

  if (entry.status !== 'DRAFT' && entry.status !== 'REJECTED') {
    throw new Error('Cannot edit submitted or approved entries');
  }

  return prisma.timesheetEntry.update({
    where: { id },
    data: {
      hours: data.hours,
      taskType: data.taskType,
      description: data.description,
      isBillable: data.isBillable,
      isOvertime: data.isOvertime,
      customFields: buildBillabilityCustomFields(
        entry.customFields,
        data.hours ?? Number(entry.hours),
        data.isBillable ?? entry.isBillable,
        data.billableRatio,
        'DRAFT'
      ),
      status: 'DRAFT',
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      resource: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function linkTimesheetEntryToInvoice(
  tenantId: string,
  entryId: string,
  userId: string,
  input: TimesheetInvoiceLinkageInput
) {
  const invoiceReference = input.invoiceReference.trim();
  if (!invoiceReference) {
    throw new Error('invoiceReference is required');
  }

  const entry = await prisma.timesheetEntry.findFirst({
    where: { id: entryId, tenantId, deletedAt: null },
    select: {
      id: true,
      status: true,
      customFields: true,
      date: true,
      resourceId: true,
      projectId: true,
    },
  });

  if (!entry) {
    throw new Error('Timesheet entry not found');
  }

  if (entry.status !== 'APPROVED' && entry.status !== 'INVOICED') {
    await createInvoiceLinkageAuditEvent({
      tenantId,
      userId,
      eventType: 'INVOICE_LINK_REJECTED',
      invoiceReference,
      linkedEntityType: 'TimesheetEntry',
      linkedEntityId: entryId,
      reason: 'Timesheet entry must be APPROVED before invoice linkage',
      correlationId: input.correlationId,
      metadata: {
        entryStatus: entry.status,
      },
    });
    throw new Error('Timesheet entry must be APPROVED before invoice linkage');
  }

  const currentInvoiceReference = readTimesheetInvoiceReference(entry.customFields);
  if (currentInvoiceReference && currentInvoiceReference !== invoiceReference) {
    await createInvoiceLinkageAuditEvent({
      tenantId,
      userId,
      eventType: 'INVOICE_LINK_REJECTED',
      invoiceReference,
      linkedEntityType: 'TimesheetEntry',
      linkedEntityId: entryId,
      reason: 'Timesheet entry already linked to a different invoice reference',
      correlationId: input.correlationId,
      metadata: {
        currentInvoiceReference,
      },
    });
    throw new Error(`Timesheet entry already linked to invoice ${currentInvoiceReference}`);
  }

  const updated = await prisma.timesheetEntry.update({
    where: { id: entryId },
    data: {
      status: 'INVOICED',
      customFields: buildTimesheetInvoiceLinkedCustomFields(entry.customFields, invoiceReference, userId, input.reason),
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      resource: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await createInvoiceLinkageAuditEvent({
    tenantId,
    userId,
    eventType: 'INVOICE_LINKED',
    invoiceReference,
    linkedEntityType: 'TimesheetEntry',
    linkedEntityId: entryId,
    reason: input.reason,
    correlationId: input.correlationId,
    metadata: {
      entryStatusBefore: entry.status,
      entryDate: entry.date.toISOString(),
      resourceId: entry.resourceId,
      projectId: entry.projectId,
    },
  });

  return updated;
}

export async function unlinkTimesheetEntryFromInvoice(
  tenantId: string,
  entryId: string,
  userId: string,
  input?: Omit<TimesheetInvoiceLinkageInput, 'invoiceReference'>
) {
  const entry = await prisma.timesheetEntry.findFirst({
    where: { id: entryId, tenantId, deletedAt: null },
    select: {
      id: true,
      status: true,
      customFields: true,
      date: true,
      resourceId: true,
      projectId: true,
    },
  });

  if (!entry) {
    throw new Error('Timesheet entry not found');
  }

  const currentInvoiceReference = readTimesheetInvoiceReference(entry.customFields);
  if (!currentInvoiceReference) {
    throw new Error('Timesheet entry is not linked to any invoice');
  }

  const updated = await prisma.timesheetEntry.update({
    where: { id: entryId },
    data: {
      status: entry.status === 'INVOICED' ? 'APPROVED' : entry.status,
      customFields: buildTimesheetInvoiceUnlinkedCustomFields(entry.customFields, userId, input?.reason),
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      resource: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await createInvoiceLinkageAuditEvent({
    tenantId,
    userId,
    eventType: 'INVOICE_UNLINKED',
    invoiceReference: currentInvoiceReference,
    linkedEntityType: 'TimesheetEntry',
    linkedEntityId: entryId,
    reason: input?.reason,
    correlationId: input?.correlationId,
    metadata: {
      entryStatusBefore: entry.status,
      entryDate: entry.date.toISOString(),
      resourceId: entry.resourceId,
      projectId: entry.projectId,
    },
  });

  return updated;
}

export async function linkTimesheetPeriodToInvoice(
  tenantId: string,
  periodId: string,
  userId: string,
  input: TimesheetInvoiceLinkageInput
) {
  const invoiceReference = input.invoiceReference.trim();
  if (!invoiceReference) {
    throw new Error('invoiceReference is required');
  }

  const period = await prisma.timesheetPeriod.findFirst({
    where: { id: periodId, tenantId },
    select: {
      id: true,
      status: true,
      resourceId: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  if (!period) {
    throw new Error('Timesheet period not found');
  }

  if (period.status !== 'APPROVED') {
    await createInvoiceLinkageAuditEvent({
      tenantId,
      userId,
      eventType: 'INVOICE_LINK_REJECTED',
      invoiceReference,
      linkedEntityType: 'TimesheetPeriod',
      linkedEntityId: periodId,
      reason: 'Timesheet period must be APPROVED before invoice linkage',
      correlationId: input.correlationId,
      metadata: {
        periodStatus: period.status,
      },
    });
    throw new Error('Timesheet period must be APPROVED before invoice linkage');
  }

  const entries = await prisma.timesheetEntry.findMany({
    where: {
      tenantId,
      resourceId: period.resourceId,
      date: { gte: period.periodStart, lte: period.periodEnd },
      status: { in: ['APPROVED', 'INVOICED'] },
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      customFields: true,
    },
  });

  if (entries.length === 0) {
    throw new Error('No approved timesheet entries available for invoice linkage in this period');
  }

  const conflictingEntry = entries.find((entry) => {
    const currentInvoiceReference = readTimesheetInvoiceReference(entry.customFields);
    return !!currentInvoiceReference && currentInvoiceReference !== invoiceReference;
  });

  if (conflictingEntry) {
    const currentInvoiceReference = readTimesheetInvoiceReference(conflictingEntry.customFields);
    await createInvoiceLinkageAuditEvent({
      tenantId,
      userId,
      eventType: 'INVOICE_LINK_REJECTED',
      invoiceReference,
      linkedEntityType: 'TimesheetPeriod',
      linkedEntityId: periodId,
      reason: 'One or more timesheet entries are already linked to a different invoice reference',
      correlationId: input.correlationId,
      metadata: {
        conflictingEntryId: conflictingEntry.id,
        currentInvoiceReference,
      },
    });
    throw new Error(`Timesheet entry ${conflictingEntry.id} already linked to invoice ${currentInvoiceReference}`);
  }

  let linkedCount = 0;
  for (const entry of entries) {
    await prisma.timesheetEntry.update({
      where: { id: entry.id },
      data: {
        status: entry.status === 'APPROVED' ? 'INVOICED' : entry.status,
        customFields: buildTimesheetInvoiceLinkedCustomFields(
          entry.customFields,
          invoiceReference,
          userId,
          input.reason
        ),
      },
    });
    linkedCount += 1;
  }

  await createInvoiceLinkageAuditEvent({
    tenantId,
    userId,
    eventType: 'INVOICE_LINKED',
    invoiceReference,
    linkedEntityType: 'TimesheetPeriod',
    linkedEntityId: periodId,
    reason: input.reason,
    correlationId: input.correlationId,
    metadata: {
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
      resourceId: period.resourceId,
      linkedEntries: linkedCount,
    },
  });

  return {
    periodId,
    invoiceReference,
    linkedEntries: linkedCount,
  };
}

export async function unlinkTimesheetPeriodFromInvoice(
  tenantId: string,
  periodId: string,
  userId: string,
  input: TimesheetPeriodInvoiceUnlinkInput
) {
  const invoiceReference = input.invoiceReference.trim();
  if (!invoiceReference) {
    throw new Error('invoiceReference is required');
  }

  const period = await prisma.timesheetPeriod.findFirst({
    where: { id: periodId, tenantId },
    select: {
      id: true,
      resourceId: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  if (!period) {
    throw new Error('Timesheet period not found');
  }

  const linkedEntries = await prisma.timesheetEntry.findMany({
    where: {
      tenantId,
      resourceId: period.resourceId,
      date: { gte: period.periodStart, lte: period.periodEnd },
      deletedAt: null,
      customFields: {
        path: ['invoiceReference'],
        equals: invoiceReference,
      },
    },
    select: {
      id: true,
      status: true,
      customFields: true,
    },
  });

  if (linkedEntries.length === 0) {
    throw new Error(`No timesheet entries in this period are linked to invoice ${invoiceReference}`);
  }

  let unlinkedCount = 0;
  for (const entry of linkedEntries) {
    await prisma.timesheetEntry.update({
      where: { id: entry.id },
      data: {
        status: entry.status === 'INVOICED' ? 'APPROVED' : entry.status,
        customFields: buildTimesheetInvoiceUnlinkedCustomFields(entry.customFields, userId, input.reason),
      },
    });
    unlinkedCount += 1;
  }

  await createInvoiceLinkageAuditEvent({
    tenantId,
    userId,
    eventType: 'INVOICE_UNLINKED',
    invoiceReference,
    linkedEntityType: 'TimesheetPeriod',
    linkedEntityId: periodId,
    reason: input.reason,
    correlationId: input.correlationId,
    metadata: {
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
      resourceId: period.resourceId,
      unlinkedEntries: unlinkedCount,
    },
  });

  return {
    periodId,
    invoiceReference,
    unlinkedEntries: unlinkedCount,
  };
}

export async function deleteTimesheetEntry(id: string, tenantId: string) {
  const entry = await prisma.timesheetEntry.findFirst({
    where: { id, tenantId, deletedAt: null },
  });

  if (!entry) {
    throw new Error('Timesheet entry not found');
  }

  if (entry.status !== 'DRAFT' && entry.status !== 'REJECTED') {
    throw new Error('Cannot delete submitted or approved entries');
  }

  return prisma.timesheetEntry.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getTimesheetEntries(filters: TimesheetFilters) {
  const {
    tenantId,
    resourceId,
    projectId,
    invoiceReference,
    startDate,
    endDate,
    status,
    page = 1,
    limit = 50,
  } = filters;

  const where: Prisma.TimesheetEntryWhereInput = {
    tenantId,
    deletedAt: null,
    ...(resourceId && { resourceId }),
    ...(projectId && { projectId }),
    ...(invoiceReference && {
      customFields: {
        path: ['invoiceReference'],
        equals: invoiceReference,
      },
    }),
    ...(startDate && endDate && {
      date: { gte: startDate, lte: endDate },
    }),
    ...(status && status.length > 0 && { status: { in: status } }),
  };

  const [entries, total] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true, client: { select: { name: true } } } },
        resource: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        allocation: { select: { id: true, role: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.timesheetEntry.count({ where }),
  ]);

  return {
    data: entries,
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

// ============================================================================
// Weekly Timesheet View
// ============================================================================

export async function getWeeklyTimesheet(
  tenantId: string,
  resourceId: string,
  weekStart: Date
): Promise<WeeklyTimesheetData> {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(weekStart, { weekStartsOn: 1 }); // Sunday

  // Get the period record if it exists
  const period = await prisma.timesheetPeriod.findFirst({
    where: {
      tenantId,
      resourceId,
      periodStart: start,
      periodEnd: end,
    },
  });

  // Get all entries for the week
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      tenantId,
      resourceId,
      date: { gte: start, lte: end },
      deletedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  // Get active allocations for the resource to show available projects
  const allocations = await prisma.allocation.findMany({
    where: {
      tenantId,
      resourceId,
      status: 'ACTIVE',
      startDate: { lte: end },
      endDate: { gte: start },
    },
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          client: { select: { name: true } },
        },
      },
    },
  });

  // Build project rows
  const projectMap = new Map<string, {
    projectId: string;
    projectName: string;
    projectCode: string;
    clientName: string;
    isBillable: boolean;
    days: { [date: string]: { id?: string; hours: number; status: TimesheetStatus; billableRatio?: number } };
  }>();

  // Initialize with allocated projects
  for (const alloc of allocations) {
    if (!projectMap.has(alloc.projectId)) {
      projectMap.set(alloc.projectId, {
        projectId: alloc.projectId,
        projectName: alloc.project.name,
        projectCode: alloc.project.code,
        clientName: alloc.project.client?.name || 'N/A',
        isBillable: alloc.isBillable,
        days: {},
      });
    }
  }

  // Add entries
  for (const entry of entries) {
    const dateKey = format(entry.date, 'yyyy-MM-dd');
    
    if (!projectMap.has(entry.projectId)) {
      projectMap.set(entry.projectId, {
        projectId: entry.projectId,
        projectName: entry.project.name,
        projectCode: entry.project.code,
        clientName: entry.project.client?.name || 'N/A',
        isBillable: entry.isBillable,
        days: {},
      });
    }

    const proj = projectMap.get(entry.projectId)!;
    const billableRatio = readBillableRatioFromCustomFields(entry.customFields, entry.isBillable);
    proj.days[dateKey] = {
      id: entry.id,
      hours: Number(entry.hours),
      status: entry.status,
      billableRatio,
    };
  }

  // Calculate totals
  const dailyTotals: { [date: string]: number } = {};
  let weeklyTotal = 0;
  let billableTotal = 0;
  let nonBillableTotal = 0;

  for (let d = 0; d < 7; d++) {
    const dateKey = format(addDays(start, d), 'yyyy-MM-dd');
    dailyTotals[dateKey] = 0;
  }

  for (const [, proj] of projectMap) {
    for (const [dateKey, entry] of Object.entries(proj.days)) {
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.hours;
      weeklyTotal += entry.hours;
      const ratio = clampBillableRatio(entry.billableRatio, proj.isBillable ? 1 : 0);
      const billableHours = entry.hours * ratio;
      billableTotal += billableHours;
      nonBillableTotal += (entry.hours - billableHours);
    }
  }

  return {
    period: {
      start,
      end,
      status: period?.status || 'OPEN',
      periodId: period?.id,
    },
    entries: Array.from(projectMap.values()),
    totals: {
      daily: dailyTotals,
      weekly: weeklyTotal,
      billable: billableTotal,
      nonBillable: nonBillableTotal,
    },
  };
}

// ============================================================================
// Bulk Save (for weekly grid)
// ============================================================================

export async function saveWeeklyTimesheet(
  tenantId: string,
  resourceId: string,
  _weekStart: Date,
  entries: Array<{
    projectId: string;
    date: string;
    hours: number;
    isBillable?: boolean;
    billableRatio?: number;
    description?: string;
  }>
) {
  // Use transaction for atomicity
  return prisma.$transaction(async (tx) => {
    const savedEntries = [];

    for (const entry of entries) {
      const date = parseISO(entry.date);

      if (entry.hours <= 0) {
        // Delete entry if hours is 0
        await tx.timesheetEntry.updateMany({
          where: {
            tenantId,
            resourceId,
            projectId: entry.projectId,
            date,
            deletedAt: null,
            status: { in: ['DRAFT', 'REJECTED'] },
          },
          data: { deletedAt: new Date() },
        });
        continue;
      }

      const existing = await tx.timesheetEntry.findFirst({
        where: {
          tenantId,
          resourceId,
          projectId: entry.projectId,
          date,
          deletedAt: null,
        },
      });

      if (existing) {
        if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
          continue; // Skip locked entries
        }
        const updated = await tx.timesheetEntry.update({
          where: { id: existing.id },
          data: {
            hours: entry.hours,
            isBillable: entry.isBillable ?? existing.isBillable,
            customFields: buildBillabilityCustomFields(
              existing.customFields,
              entry.hours,
              entry.isBillable ?? existing.isBillable,
              entry.billableRatio,
              'DRAFT'
            ),
            description: entry.description,
          },
        });
        savedEntries.push(updated);
      } else {
        const created = await tx.timesheetEntry.create({
          data: {
            tenantId,
            resourceId,
            projectId: entry.projectId,
            date,
            hours: entry.hours,
            isBillable: entry.isBillable ?? true,
            customFields: buildBillabilityCustomFields(
              null,
              entry.hours,
              entry.isBillable ?? true,
              entry.billableRatio,
              'DRAFT'
            ),
            description: entry.description,
            status: 'DRAFT',
          },
        });
        savedEntries.push(created);
      }
    }

    return savedEntries;
  });
}

// ============================================================================
// Submit Timesheet
// ============================================================================

export async function submitTimesheet(
  tenantId: string,
  resourceId: string,
  weekStart: Date,
  submittedByUserId: string
) {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });

  const result = await prisma.$transaction(async (tx) => {
    // Update all draft entries to submitted
    const updateResult = await tx.timesheetEntry.updateMany({
      where: {
        tenantId,
        resourceId,
        date: { gte: start, lte: end },
        status: { in: ['DRAFT', 'REJECTED'] },
        deletedAt: null,
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Get total hours
    const entries = await tx.timesheetEntry.findMany({
      where: {
        tenantId,
        resourceId,
        date: { gte: start, lte: end },
        status: 'SUBMITTED',
        deletedAt: null,
      },
    });

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const billableHours = entries.reduce((sum, e) => {
      const ratio = readBillableRatioFromCustomFields(e.customFields, e.isBillable);
      return sum + (Number(e.hours) * ratio);
    }, 0);
    const overtimeHours = entries.filter(e => e.isOvertime).reduce((sum, e) => sum + Number(e.hours), 0);

    // Create or update period record
    const existingPeriod = await tx.timesheetPeriod.findFirst({
      where: { tenantId, resourceId, periodStart: start, periodEnd: end },
    });

    let periodId: string;

    if (existingPeriod) {
      await tx.timesheetPeriod.update({
        where: { id: existingPeriod.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          totalHours,
          billableHours,
          overtimeHours,
        },
      });
      periodId = existingPeriod.id;
    } else {
      const createdPeriod = await tx.timesheetPeriod.create({
        data: {
          tenantId,
          resourceId,
          periodStart: start,
          periodEnd: end,
          periodType: 'WEEKLY',
          status: 'SUBMITTED',
          submittedAt: new Date(),
          totalHours,
          billableHours,
          overtimeHours,
        },
      });
      periodId = createdPeriod.id;
    }

    return { entriesSubmitted: updateResult.count, totalHours, billableHours, periodId };
  });

  await createAuditLog(
    tenantId,
    submittedByUserId,
    'TimesheetPeriod',
    result.periodId,
    'SUBMIT',
    {
      resourceId,
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      entriesSubmitted: result.entriesSubmitted,
      totalHours: result.totalHours,
      billableHours: result.billableHours,
      billabilitySnapshot: {
        modelVersion: 'timesheet-billability-v1',
        billableRatioApplied: true,
        nonBillableHours: Math.round((result.totalHours - result.billableHours) * 100) / 100,
      },
    }
  );

  return {
    entriesSubmitted: result.entriesSubmitted,
    totalHours: result.totalHours,
    billableHours: result.billableHours,
  };
}

// ============================================================================
// Approve/Reject Timesheet
// ============================================================================

export async function approveTimesheet(
  tenantId: string,
  periodId: string,
  approverId: string
) {
  const period = await prisma.timesheetPeriod.findFirst({
    where: { id: periodId, tenantId },
  });

  if (!period) throw new Error('Timesheet period not found');
  if (period.status !== 'SUBMITTED') throw new Error('Only submitted timesheets can be approved');

  const updatedPeriod = await prisma.$transaction(async (tx) => {
    // Update period
    const approvedPeriod = await tx.timesheetPeriod.update({
      where: { id: periodId },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    // Update all entries
    await tx.timesheetEntry.updateMany({
      where: {
        tenantId,
        resourceId: period.resourceId,
        date: { gte: period.periodStart, lte: period.periodEnd },
        status: 'SUBMITTED',
        deletedAt: null,
      },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    return approvedPeriod;
  });

  await createAuditLog(
    tenantId,
    approverId,
    'TimesheetPeriod',
    updatedPeriod.id,
    'APPROVE',
    {
      periodStart: updatedPeriod.periodStart.toISOString(),
      periodEnd: updatedPeriod.periodEnd.toISOString(),
      resourceId: updatedPeriod.resourceId,
      approvedAt: updatedPeriod.approvedAt?.toISOString(),
    }
  );

  return updatedPeriod;
}

export async function rejectTimesheet(
  tenantId: string,
  periodId: string,
  approverId: string,
  reason: string
) {
  const period = await prisma.timesheetPeriod.findFirst({
    where: { id: periodId, tenantId },
  });

  if (!period) throw new Error('Timesheet period not found');
  if (period.status !== 'SUBMITTED') throw new Error('Only submitted timesheets can be rejected');

  const updatedPeriod = await prisma.$transaction(async (tx) => {
    // Update period
    const rejectedPeriod = await tx.timesheetPeriod.update({
      where: { id: periodId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        comments: reason,
      },
    });

    // Update all entries
    await tx.timesheetEntry.updateMany({
      where: {
        tenantId,
        resourceId: period.resourceId,
        date: { gte: period.periodStart, lte: period.periodEnd },
        status: 'SUBMITTED',
        deletedAt: null,
      },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return rejectedPeriod;
  });

  await createAuditLog(
    tenantId,
    approverId,
    'TimesheetPeriod',
    updatedPeriod.id,
    'REJECT',
    {
      periodStart: updatedPeriod.periodStart.toISOString(),
      periodEnd: updatedPeriod.periodEnd.toISOString(),
      resourceId: updatedPeriod.resourceId,
      rejectedAt: updatedPeriod.rejectedAt?.toISOString(),
      reason,
    }
  );

  return updatedPeriod;
}

// ============================================================================
// Pending Approvals
// ============================================================================

export async function getPendingApprovals(tenantId: string, managerId?: string) {
  const periods = await prisma.timesheetPeriod.findMany({
    where: {
      tenantId,
      status: 'SUBMITTED',
      ...(managerId && {
        resource: {
          OR: [
            { managerId },
            { practice: { headId: managerId } },
          ],
        },
      }),
    },
    include: {
      resource: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          practice: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  return periods;
}

// ============================================================================
// Analytics
// ============================================================================

export async function getTimesheetStats(tenantId: string, resourceId?: string, startDate?: Date, endDate?: Date) {
  const where: Prisma.TimesheetEntryWhereInput = {
    tenantId,
    deletedAt: null,
    ...(resourceId && { resourceId }),
    ...(startDate && endDate && { date: { gte: startDate, lte: endDate } }),
  };

  const entries = await prisma.timesheetEntry.findMany({
    where,
    select: {
      hours: true,
      isBillable: true,
      isOvertime: true,
      status: true,
      customFields: true,
    },
  });

  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
  const billableHours = entries.reduce((sum, e) => {
    const ratio = readBillableRatioFromCustomFields(e.customFields, e.isBillable);
    return sum + (Number(e.hours) * ratio);
  }, 0);
  const overtimeHours = entries.filter(e => e.isOvertime).reduce((sum, e) => sum + Number(e.hours), 0);
  const submittedHours = entries.filter(e => e.status !== 'DRAFT').reduce((sum, e) => sum + Number(e.hours), 0);
  const approvedHours = entries.filter(e => e.status === 'APPROVED' || e.status === 'INVOICED').reduce((sum, e) => sum + Number(e.hours), 0);

  return {
    totalHours,
    billableHours,
    nonBillableHours: totalHours - billableHours,
    overtimeHours,
    submittedHours,
    approvedHours,
    billablePercentage: totalHours > 0 ? (billableHours / totalHours) * 100 : 0,
  };
}

// ============================================================================
// Security & Access Control
// ============================================================================

/**
 * Get the resource linked to a user account
 */
export async function getLinkedResourceForUser(tenantId: string, userId: string) {
  // First check if user has a linked resource (same email)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) return null;

  const resource = await prisma.resource.findFirst({
    where: {
      tenantId,
      email: user.email,
      deletedAt: null,
    },
    select: { id: true },
  });

  return resource;
}

/**
 * Check if user can access a resource's timesheet
 * Rules:
 * 1. Admin (timesheet:*) can access all
 * 2. User can access their own linked resource
 * 3. Manager can access their direct reports
 * 4. timesheet:read:all permission grants read access to all
 */
export async function canAccessResourceTimesheet(
  tenantId: string,
  userId: string,
  resourceId: string,
  permissions: string[]
): Promise<boolean> {
  // Admin or all-access permission
  if (
    permissions.includes('*') ||
    permissions.includes('timesheet:*') ||
    permissions.includes('timesheet:read:all') ||
    permissions.includes('timesheet:write:all')
  ) {
    return true;
  }

  // Check if user is linked to this resource
  const linkedResource = await getLinkedResourceForUser(tenantId, userId);
  if (linkedResource?.id === resourceId) {
    return true;
  }

  // Check if user is the manager of this resource
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { managerId: true },
  });

  if (resource?.managerId) {
    // Check if the manager resource is linked to this user
    const managerResource = await prisma.resource.findUnique({
      where: { id: resource.managerId },
      select: { email: true },
    });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (managerResource?.email === user?.email) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user can modify a specific timesheet entry
 * Rules:
 * 1. Admin can modify all
 * 2. Entry owner can modify if status is DRAFT
 * 3. Manager can modify if status is DRAFT
 */
export async function canModifyTimesheetEntry(
  tenantId: string,
  userId: string,
  entryId: string,
  permissions: string[]
): Promise<boolean> {
  // Admin access
  if (
    permissions.includes('*') ||
    permissions.includes('timesheet:*') ||
    permissions.includes('timesheet:write:all')
  ) {
    return true;
  }

  // Get the entry
  const entry = await prisma.timesheetEntry.findUnique({
    where: { id: entryId },
    select: {
      tenantId: true,
      resourceId: true,
      status: true,
    },
  });

  if (!entry || entry.tenantId !== tenantId) {
    return false;
  }

  // Can only modify draft entries (unless admin)
  if (entry.status !== 'DRAFT') {
    return false;
  }

  // Check if user can access this resource's timesheet
  return canAccessResourceTimesheet(tenantId, userId, entry.resourceId, permissions);
}

/**
 * Check if user can approve a timesheet period
 * Rules:
 * 1. Admin can approve all
 * 2. Manager of the resource can approve
 * 3. Anyone with timesheet:approve:all permission
 */
export async function canApproveTimesheet(
  tenantId: string,
  userId: string,
  periodId: string,
  permissions: string[]
): Promise<boolean> {
  // Admin or all-approve access
  if (
    permissions.includes('*') ||
    permissions.includes('timesheet:*') ||
    permissions.includes('timesheet:approve:all')
  ) {
    return true;
  }

  // Get the period and resource
  const period = await prisma.timesheetPeriod.findUnique({
    where: { id: periodId },
    select: {
      tenantId: true,
      resource: {
        select: { id: true, managerId: true },
      },
    },
  });

  if (!period || period.tenantId !== tenantId) {
    return false;
  }

  // Check if user is the manager
  if (period.resource.managerId) {
    const managerResource = await prisma.resource.findUnique({
      where: { id: period.resource.managerId },
      select: { email: true },
    });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (managerResource?.email === user?.email) {
      return true;
    }
  }

  return false;
}
