import { PrismaClient, Prisma, TimesheetStatus, PeriodStatus, PeriodType } from '@prisma/client';
import { addDays, startOfWeek, endOfWeek, format, parseISO, differenceInDays } from 'date-fns';

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
  isOvertime?: boolean;
}

export interface TimesheetFilters {
  tenantId: string;
  resourceId?: string;
  projectId?: string;
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
    days: { [date: string]: { id?: string; hours: number; status: TimesheetStatus } };
  }>;
  totals: {
    daily: { [date: string]: number };
    weekly: number;
    billable: number;
    nonBillable: number;
  };
}

// ============================================================================
// Timesheet Entry CRUD
// ============================================================================

export async function createTimesheetEntry(input: TimesheetEntryInput) {
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
        isBillable: input.isBillable ?? true,
        isOvertime: input.isOvertime ?? false,
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
      isBillable: input.isBillable ?? true,
      isOvertime: input.isOvertime ?? false,
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
      status: 'DRAFT',
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      resource: { select: { id: true, firstName: true, lastName: true } },
    },
  });
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
  const { tenantId, resourceId, projectId, startDate, endDate, status, page = 1, limit = 50 } = filters;

  const where: Prisma.TimesheetEntryWhereInput = {
    tenantId,
    deletedAt: null,
    ...(resourceId && { resourceId }),
    ...(projectId && { projectId }),
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
    days: { [date: string]: { id?: string; hours: number; status: TimesheetStatus } };
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
    proj.days[dateKey] = {
      id: entry.id,
      hours: Number(entry.hours),
      status: entry.status,
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
      if (proj.isBillable) {
        billableTotal += entry.hours;
      } else {
        nonBillableTotal += entry.hours;
      }
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
  weekStart: Date,
  entries: Array<{
    projectId: string;
    date: string;
    hours: number;
    isBillable?: boolean;
    description?: string;
  }>
) {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });

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
  weekStart: Date
) {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });

  return prisma.$transaction(async (tx) => {
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
    const billableHours = entries.filter(e => e.isBillable).reduce((sum, e) => sum + Number(e.hours), 0);
    const overtimeHours = entries.filter(e => e.isOvertime).reduce((sum, e) => sum + Number(e.hours), 0);

    // Create or update period record
    const existingPeriod = await tx.timesheetPeriod.findFirst({
      where: { tenantId, resourceId, periodStart: start, periodEnd: end },
    });

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
    } else {
      await tx.timesheetPeriod.create({
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
    }

    return { entriesSubmitted: updateResult.count, totalHours, billableHours };
  });
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

  return prisma.$transaction(async (tx) => {
    // Update period
    const updatedPeriod = await tx.timesheetPeriod.update({
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

    return updatedPeriod;
  });
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

  return prisma.$transaction(async (tx) => {
    // Update period
    const updatedPeriod = await tx.timesheetPeriod.update({
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

    return updatedPeriod;
  });
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
    },
  });

  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
  const billableHours = entries.filter(e => e.isBillable).reduce((sum, e) => sum + Number(e.hours), 0);
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

