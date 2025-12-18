/**
 * SLA Service
 * Business hours calculation, SLA tracking, breach detection, and escalation
 */

import { Prisma, SlaBreachType, RequestStatus, Priority, RequestAction } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

interface BusinessHours {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number; // 0-23
  endMinute: number; // 0-59
}

interface SlaCalculationResult {
  businessHoursElapsed: number;
  responseDeadline: Date;
  resolutionDeadline: Date;
  isOverdue: boolean;
  hoursRemaining: number;
}

interface PriorityMultiplier {
  response: number;
  resolution: number;
}

// Default priority multipliers
const DEFAULT_PRIORITY_MULTIPLIERS: Record<Priority, PriorityMultiplier> = {
  LOW: { response: 1.5, resolution: 1.5 },
  MEDIUM: { response: 1.0, resolution: 1.0 },
  HIGH: { response: 0.5, resolution: 0.5 },
  CRITICAL: { response: 0.25, resolution: 0.25 },
};

// ============================================================================
// Business Hours Configuration
// ============================================================================

/**
 * Get business hours configuration for a tenant
 */
export async function getBusinessHoursConfig(tenantId: string): Promise<{
  businessHours: BusinessHours[];
  holidays: Date[];
  timezone: string;
}> {
  const config = await prisma.businessHoursConfig.findFirst({
    where: { tenantId },
  });

  // Convert config to BusinessHours array
  const businessHours: BusinessHours[] = [];
  
  if (config) {
    for (const dayOfWeek of config.workDays) {
      businessHours.push({
        dayOfWeek,
        startHour: config.startHour,
        startMinute: config.startMinute,
        endHour: config.endHour,
        endMinute: config.endMinute,
      });
    }
  } else {
    // Default: Monday to Friday, 9 AM to 6 PM
    for (let day = 1; day <= 5; day++) {
      businessHours.push({
        dayOfWeek: day,
        startHour: 9,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
      });
    }
  }

  // Get holidays for next 365 days
  const now = new Date();
  const yearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const holidays = await prisma.holiday.findMany({
    where: {
      tenantId,
      date: {
        gte: now,
        lte: yearFromNow,
      },
    },
    select: { date: true },
  });

  return {
    businessHours,
    holidays: holidays.map(h => h.date),
    timezone: config?.timezone || 'Asia/Kolkata',
  };
}

/**
 * Update business hours configuration
 */
export async function updateBusinessHoursConfig(
  tenantId: string,
  _userId: string,
  config: {
    startHour?: number;
    startMinute?: number;
    endHour?: number;
    endMinute?: number;
    workDays?: number[];
    timezone?: string;
  }
): Promise<Record<string, unknown>> {
  const existing = await prisma.businessHoursConfig.findFirst({
    where: { tenantId },
  });

  const data: Prisma.BusinessHoursConfigUpdateInput = {};

  if (config.startHour !== undefined) data.startHour = config.startHour;
  if (config.startMinute !== undefined) data.startMinute = config.startMinute;
  if (config.endHour !== undefined) data.endHour = config.endHour;
  if (config.endMinute !== undefined) data.endMinute = config.endMinute;
  if (config.workDays !== undefined) data.workDays = config.workDays;
  if (config.timezone !== undefined) data.timezone = config.timezone;

  if (existing) {
    const updated = await prisma.businessHoursConfig.update({
      where: { id: existing.id },
      data,
    });
    logger.info('Business hours config updated', { tenantId });
    return updated as unknown as Record<string, unknown>;
  } else {
    const created = await prisma.businessHoursConfig.create({
      data: {
        tenantId,
        startHour: config.startHour || 9,
        startMinute: config.startMinute || 0,
        endHour: config.endHour || 18,
        endMinute: config.endMinute || 0,
        workDays: config.workDays || [1, 2, 3, 4, 5],
        timezone: config.timezone || 'Asia/Kolkata',
      },
    });
    logger.info('Business hours config created', { tenantId });
    return created as unknown as Record<string, unknown>;
  }
}

// ============================================================================
// Holiday Management
// ============================================================================

/**
 * Add holiday to calendar
 */
export async function addHoliday(
  tenantId: string,
  _userId: string,
  holiday: {
    date: Date;
    name: string;
    type?: 'COMPANY' | 'NATIONAL' | 'REGIONAL' | 'OPTIONAL';
    isOptional?: boolean;
    isRecurring?: boolean;
  }
): Promise<Record<string, unknown>> {
  // Check for duplicate
  const existing = await prisma.holiday.findFirst({
    where: {
      tenantId,
      date: holiday.date,
    },
  });

  if (existing) {
    throw new ApiError('Holiday already exists for this date', 409, 'DUPLICATE_HOLIDAY');
  }

  const created = await prisma.holiday.create({
    data: {
      tenantId,
      date: holiday.date,
      name: holiday.name,
      type: holiday.type || 'COMPANY',
      isOptional: holiday.isOptional || false,
      isRecurring: holiday.isRecurring || false,
    },
  });

  logger.info('Holiday added', { tenantId, date: holiday.date, name: holiday.name });
  return created as unknown as Record<string, unknown>;
}

/**
 * Remove holiday from calendar
 */
export async function removeHoliday(tenantId: string, holidayId: string): Promise<void> {
  const holiday = await prisma.holiday.findFirst({
    where: { id: holidayId, tenantId },
  });

  if (!holiday) {
    throw new ApiError('Holiday not found', 404, 'HOLIDAY_NOT_FOUND');
  }

  await prisma.holiday.delete({ where: { id: holidayId } });
  logger.info('Holiday removed', { tenantId, holidayId });
}

/**
 * List holidays
 */
export async function listHolidays(
  tenantId: string,
  year?: number
): Promise<Record<string, unknown>[]> {
  const startDate = year
    ? new Date(year, 0, 1)
    : new Date();
  const endDate = year
    ? new Date(year, 11, 31)
    : new Date(new Date().getFullYear() + 1, 11, 31);

  const holidays = await prisma.holiday.findMany({
    where: {
      tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  return holidays as unknown as Record<string, unknown>[];
}

// ============================================================================
// SLA Calculation
// ============================================================================

/**
 * Check if a date is a business day
 */
function isBusinessDay(
  date: Date,
  businessHours: BusinessHours[],
  holidays: Date[]
): boolean {
  const dayOfWeek = date.getDay();

  // Check if this day has business hours configured
  const hasBusinessHours = businessHours.some(bh => bh.dayOfWeek === dayOfWeek);
  if (!hasBusinessHours) return false;

  // Check if it's a holiday
  const dateStr = date.toISOString().split('T')[0];
  const isHoliday = holidays.some(h => h.toISOString().split('T')[0] === dateStr);

  return !isHoliday;
}

/**
 * Get business hours for a specific day
 */
function getBusinessHoursForDay(
  date: Date,
  businessHours: BusinessHours[]
): BusinessHours | null {
  const dayOfWeek = date.getDay();
  return businessHours.find(bh => bh.dayOfWeek === dayOfWeek) || null;
}

/**
 * Calculate business minutes between two times on the same business day
 */
function calculateBusinessMinutesInDay(
  startTime: Date,
  endTime: Date,
  businessHours: BusinessHours
): number {
  // Clamp to business hours
  const dayStart = new Date(startTime);
  dayStart.setHours(businessHours.startHour, businessHours.startMinute, 0, 0);

  const dayEnd = new Date(startTime);
  dayEnd.setHours(businessHours.endHour, businessHours.endMinute, 0, 0);

  const effectiveStart = new Date(Math.max(startTime.getTime(), dayStart.getTime()));
  const effectiveEnd = new Date(Math.min(endTime.getTime(), dayEnd.getTime()));

  if (effectiveEnd <= effectiveStart) {
    return 0;
  }

  return Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60));
}

/**
 * Calculate business hours between two dates
 */
export function calculateBusinessHours(
  startDate: Date,
  endDate: Date,
  businessHours: BusinessHours[],
  holidays: Date[]
): number {
  let totalMinutes = 0;
  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
    if (isBusinessDay(currentDate, businessHours, holidays)) {
      const bh = getBusinessHoursForDay(currentDate, businessHours);
      if (bh) {
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const effectiveEnd = endDate < dayEnd ? endDate : dayEnd;
        totalMinutes += calculateBusinessMinutesInDay(currentDate, effectiveEnd, bh);
      }
    }

    // Move to next day at start of business hours
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return totalMinutes / 60; // Return hours
}

/**
 * Add business hours to a date
 */
export function addBusinessHours(
  startDate: Date,
  hoursToAdd: number,
  businessHours: BusinessHours[],
  holidays: Date[]
): Date {
  let minutesRemaining = hoursToAdd * 60;
  let currentDate = new Date(startDate);

  while (minutesRemaining > 0) {
    if (isBusinessDay(currentDate, businessHours, holidays)) {
      const bh = getBusinessHoursForDay(currentDate, businessHours);
      if (bh) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(bh.startHour, bh.startMinute, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(bh.endHour, bh.endMinute, 0, 0);

        // If current time is before business hours, move to start
        if (currentDate < dayStart) {
          currentDate = dayStart;
        }

        // If current time is after business hours, skip to next day
        if (currentDate >= dayEnd) {
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(0, 0, 0, 0);
          continue;
        }

        // Calculate minutes available today
        const minutesAvailable = Math.floor(
          (dayEnd.getTime() - currentDate.getTime()) / (1000 * 60)
        );

        if (minutesRemaining <= minutesAvailable) {
          // We can finish today
          currentDate = new Date(currentDate.getTime() + minutesRemaining * 60 * 1000);
          minutesRemaining = 0;
        } else {
          // Use all available time and continue to next day
          minutesRemaining -= minutesAvailable;
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(0, 0, 0, 0);
        }
      } else {
        // No business hours for this day, skip
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
      }
    } else {
      // Not a business day, skip
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }
  }

  return currentDate;
}

/**
 * Calculate SLA deadlines for a request
 */
export async function calculateSlaDeadlines(
  tenantId: string,
  requestTypeId: string,
  priority: Priority,
  submittedAt: Date
): Promise<SlaCalculationResult> {
  // Get request type SLA settings
  const requestType = await prisma.requestType.findFirst({
    where: { id: requestTypeId },
  });

  if (!requestType) {
    throw new ApiError('Request type not found', 404, 'REQUEST_TYPE_NOT_FOUND');
  }

  // Get tenant config (may override SLA)
  const tenantConfig = await prisma.tenantRequestTypeConfig.findFirst({
    where: { tenantId, requestTypeId },
  });

  // Get priority multiplier
  const multiplier = await getPriorityMultiplier(tenantId, priority);

  // Calculate base SLA hours
  const responseSlaHours = (tenantConfig?.responseSlaHours || requestType.responseSlaHours) * multiplier.response;
  const resolutionSlaHours = (tenantConfig?.resolutionSlaHours || requestType.resolutionSlaHours) * multiplier.resolution;

  // Get business hours config
  const { businessHours, holidays } = await getBusinessHoursConfig(tenantId);

  // Calculate deadlines
  const responseDeadline = addBusinessHours(submittedAt, responseSlaHours, businessHours, holidays);
  const resolutionDeadline = addBusinessHours(submittedAt, resolutionSlaHours, businessHours, holidays);

  // Calculate current status
  const now = new Date();
  const businessHoursElapsed = calculateBusinessHours(submittedAt, now, businessHours, holidays);
  const isOverdue = now > resolutionDeadline;
  const hoursRemaining = isOverdue ? 0 : calculateBusinessHours(now, resolutionDeadline, businessHours, holidays);

  return {
    businessHoursElapsed,
    responseDeadline,
    resolutionDeadline,
    isOverdue,
    hoursRemaining,
  };
}

/**
 * Get priority multiplier for SLA calculation
 */
async function getPriorityMultiplier(
  tenantId: string,
  priority: Priority
): Promise<PriorityMultiplier> {
  const matrix = await prisma.slaPriorityMatrix.findFirst({
    where: { tenantId, priority },
  });

  if (matrix) {
    return {
      response: matrix.responseSlaHours / 24, // Convert to multiplier
      resolution: matrix.resolutionSlaHours / 72, // Convert to multiplier
    };
  }

  return DEFAULT_PRIORITY_MULTIPLIERS[priority];
}

// ============================================================================
// SLA Breach Detection
// ============================================================================

/**
 * Check for SLA breaches and create breach events
 */
export async function checkSlaBreaches(tenantId?: string): Promise<number> {
  const pendingStatuses: RequestStatus[] = ['SUBMITTED', 'PENDING_APPROVAL', 'IN_PROGRESS'];
  
  const where: Prisma.RequestWhereInput = {
    status: { in: pendingStatuses },
    deletedAt: null,
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const requests = await prisma.request.findMany({
    where,
  });

  let breachCount = 0;
  const now = new Date();

  for (const request of requests) {
    try {
      // Skip if no request type
      if (!request.typeId) continue;

      const sla = await calculateSlaDeadlines(
        request.tenantId,
        request.typeId,
        request.priority,
        request.submittedAt || request.createdAt
      );

      // Check response SLA breach
      if (!request.firstResponseAt && now > sla.responseDeadline) {
        const existingBreach = await prisma.slaBreachEvent.findFirst({
          where: { requestId: request.id, breachType: 'RESPONSE_SLA' },
        });

        if (!existingBreach) {
          await createSlaBreachEvent(request.id, 'RESPONSE_SLA', sla.responseDeadline);
          breachCount++;
        }
      }

      // Check resolution SLA breach
      if (now > sla.resolutionDeadline) {
        const existingBreach = await prisma.slaBreachEvent.findFirst({
          where: { requestId: request.id, breachType: 'RESOLUTION_SLA' },
        });

        if (!existingBreach) {
          await createSlaBreachEvent(request.id, 'RESOLUTION_SLA', sla.resolutionDeadline);
          breachCount++;
        }
      }
    } catch (error) {
      logger.error(`Error checking SLA for request ${request.id}:`, error);
    }
  }

  if (breachCount > 0) {
    logger.warn(`Detected ${breachCount} new SLA breaches`);
  }

  return breachCount;
}

/**
 * Create SLA breach event and trigger escalation
 */
async function createSlaBreachEvent(
  requestId: string,
  breachType: SlaBreachType,
  dueAt: Date
): Promise<void> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!request) return;

  // Create breach event
  await prisma.slaBreachEvent.create({
    data: {
      requestId,
      breachType,
      dueAt,
      breachedAt: new Date(),
      escalationLevel: 1,
    },
  });

  logger.warn(`SLA breach: ${breachType} for request ${request.requestNumber}`);

  // TODO: Trigger escalation notification
}

/**
 * Pause SLA for a request
 */
export async function pauseSla(
  requestId: string,
  userId: string,
  reason: string,
  until?: Date
): Promise<void> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  // Default pause until next business day if not specified
  const pauseUntil = until || new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.request.update({
    where: { id: requestId },
    data: {
      slaPausedAt: pauseUntil,
    },
  });

  // Create history entry
  const action: RequestAction = 'ON_HOLD';
  await prisma.requestHistory.create({
    data: {
      requestId,
      userId,
      action,
      details: {
        type: 'SLA_PAUSED',
        reason,
        pausedUntil: pauseUntil.toISOString(),
      } as Prisma.JsonObject,
    },
  });

  logger.info(`SLA paused for request ${requestId}`, { reason, until: pauseUntil });
}

/**
 * Resume SLA for a request
 */
export async function resumeSla(requestId: string, userId: string): Promise<void> {
  await prisma.request.update({
    where: { id: requestId },
    data: {
      slaPausedAt: null,
    },
  });

  const action: RequestAction = 'RESUMED';
  await prisma.requestHistory.create({
    data: {
      requestId,
      userId,
      action,
      details: { type: 'SLA_RESUMED' } as Prisma.JsonObject,
    },
  });

  logger.info(`SLA resumed for request ${requestId}`);
}

// ============================================================================
// SLA Reports
// ============================================================================

/**
 * Get SLA compliance report
 */
export async function getSlaComplianceReport(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalRequests: number;
  completedOnTime: number;
  completedLate: number;
  pending: number;
  overdue: number;
  complianceRate: number;
  avgResponseHours: number;
  avgResolutionHours: number;
  byRequestType: Record<string, {
    total: number;
    onTime: number;
    late: number;
    compliance: number;
  }>;
}> {
  // Get all requests in date range
  const requests = await prisma.request.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    },
    include: {
      type: true,
    },
  });

  const totalRequests = requests.length;
  let completedOnTime = 0;
  let completedLate = 0;
  let pending = 0;
  let overdue = 0;
  let totalResponseHours = 0;
  let responseCount = 0;
  let totalResolutionHours = 0;
  let resolutionCount = 0;

  const byRequestType: Record<string, {
    total: number;
    onTime: number;
    late: number;
    compliance: number;
  }> = {};

  const { businessHours, holidays } = await getBusinessHoursConfig(tenantId);

  for (const request of requests) {
    const typeCode = request.type?.code || 'UNKNOWN';

    if (!byRequestType[typeCode]) {
      byRequestType[typeCode] = { total: 0, onTime: 0, late: 0, compliance: 0 };
    }
    byRequestType[typeCode].total++;

    // Calculate response time
    if (request.firstResponseAt && request.submittedAt) {
      const responseHours = calculateBusinessHours(
        request.submittedAt,
        request.firstResponseAt,
        businessHours,
        holidays
      );
      totalResponseHours += responseHours;
      responseCount++;
    }

    // Calculate resolution time
    if (request.resolvedAt && request.submittedAt) {
      const resolutionHours = calculateBusinessHours(
        request.submittedAt,
        request.resolvedAt,
        businessHours,
        holidays
      );
      totalResolutionHours += resolutionHours;
      resolutionCount++;
    }

    // Classify request
    const completedStatuses: RequestStatus[] = ['COMPLETED', 'APPROVED'];
    const pendingStatuses: RequestStatus[] = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'IN_PROGRESS'];

    if (completedStatuses.includes(request.status)) {
      // Check if there was a breach
      const breachCount = await prisma.slaBreachEvent.count({
        where: { requestId: request.id },
      });
      
      if (breachCount > 0) {
        completedLate++;
        byRequestType[typeCode].late++;
      } else {
        completedOnTime++;
        byRequestType[typeCode].onTime++;
      }
    } else if (pendingStatuses.includes(request.status)) {
      pending++;
      // Check if overdue
      if (request.typeId && request.submittedAt) {
        try {
          const sla = await calculateSlaDeadlines(
            tenantId,
            request.typeId,
            request.priority,
            request.submittedAt
          );
          if (sla.isOverdue) {
            overdue++;
          }
        } catch {
          // Skip if can't calculate SLA
        }
      }
    }
  }

  // Calculate compliance for each type
  for (const typeCode of Object.keys(byRequestType)) {
    const type = byRequestType[typeCode];
    const completed = type.onTime + type.late;
    type.compliance = completed > 0 ? (type.onTime / completed) * 100 : 100;
  }

  const totalCompleted = completedOnTime + completedLate;
  const complianceRate = totalCompleted > 0
    ? (completedOnTime / totalCompleted) * 100
    : 100;

  return {
    totalRequests,
    completedOnTime,
    completedLate,
    pending,
    overdue,
    complianceRate: Math.round(complianceRate * 100) / 100,
    avgResponseHours: responseCount > 0
      ? Math.round((totalResponseHours / responseCount) * 100) / 100
      : 0,
    avgResolutionHours: resolutionCount > 0
      ? Math.round((totalResolutionHours / resolutionCount) * 100) / 100
      : 0,
    byRequestType,
  };
}

/**
 * Get SLA breach summary
 */
export async function getSlaBreachSummary(
  tenantId: string,
  days: number = 30
): Promise<{
  totalBreaches: number;
  responseBreaches: number;
  resolutionBreaches: number;
  byDay: Array<{
    date: string;
    count: number;
  }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const breaches = await prisma.slaBreachEvent.findMany({
    where: {
      request: { tenantId },
      breachedAt: { gte: startDate },
    },
    include: { request: true },
  });

  const totalBreaches = breaches.length;
  let responseBreaches = 0;
  let resolutionBreaches = 0;

  const byDayMap = new Map<string, number>();

  for (const breach of breaches) {
    if (breach.breachType === 'RESPONSE_SLA') responseBreaches++;
    if (breach.breachType === 'RESOLUTION_SLA') resolutionBreaches++;

    const dateStr = breach.breachedAt.toISOString().split('T')[0];
    byDayMap.set(dateStr, (byDayMap.get(dateStr) || 0) + 1);
  }

  const byDay = Array.from(byDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalBreaches,
    responseBreaches,
    resolutionBreaches,
    byDay,
  };
}
