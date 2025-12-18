/**
 * SLA Controller
 * HTTP handlers for SLA management
 */

import { Request, Response } from 'express';
import { ApiError } from '../../middleware/errorHandler';
import * as slaService from './sla.service';

// ============================================================================
// Business Hours
// ============================================================================

/**
 * Get business hours configuration
 * GET /api/v1/sla/business-hours
 */
export async function getBusinessHours(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;

  const config = await slaService.getBusinessHoursConfig(tenantId);

  res.json({
    success: true,
    data: config,
  });
}

/**
 * Update business hours configuration
 * PUT /api/v1/sla/business-hours
 */
export async function updateBusinessHours(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const config = await slaService.updateBusinessHoursConfig(tenantId, userId, {
    startHour: req.body.startHour,
    startMinute: req.body.startMinute,
    endHour: req.body.endHour,
    endMinute: req.body.endMinute,
    workDays: req.body.workDays,
    timezone: req.body.timezone,
  });

  res.json({
    success: true,
    data: config,
    message: 'Business hours updated successfully',
  });
}

// ============================================================================
// Holidays
// ============================================================================

/**
 * List holidays
 * GET /api/v1/sla/holidays
 */
export async function listHolidays(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;

  const holidays = await slaService.listHolidays(tenantId, year);

  res.json({
    success: true,
    data: holidays,
  });
}

/**
 * Add holiday
 * POST /api/v1/sla/holidays
 */
export async function addHoliday(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  if (!req.body.date || !req.body.name) {
    throw new ApiError('Date and name are required', 400, 'VALIDATION_ERROR');
  }

  const holiday = await slaService.addHoliday(tenantId, userId, {
    date: new Date(req.body.date),
    name: req.body.name,
    type: req.body.type,
    isOptional: req.body.isOptional,
    isRecurring: req.body.isRecurring,
  });

  res.status(201).json({
    success: true,
    data: holiday,
    message: 'Holiday added successfully',
  });
}

/**
 * Remove holiday
 * DELETE /api/v1/sla/holidays/:id
 */
export async function removeHoliday(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const holidayId = req.params.id;

  await slaService.removeHoliday(tenantId, holidayId);

  res.json({
    success: true,
    message: 'Holiday removed successfully',
  });
}

// ============================================================================
// SLA Status
// ============================================================================

/**
 * Calculate SLA for a specific request
 * GET /api/v1/sla/requests/:id/calculate
 */
export async function calculateRequestSla(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const requestId = req.params.id;

  // Get the request
  const request = await require('../../lib/prisma').default.request.findFirst({
    where: { id: requestId, tenantId, deletedAt: null },
  });

  if (!request) {
    throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
  }

  const sla = await slaService.calculateSlaDeadlines(
    tenantId,
    request.requestTypeId,
    request.priority,
    request.submittedAt || request.createdAt
  );

  res.json({
    success: true,
    data: {
      requestId,
      requestNumber: request.requestNumber,
      priority: request.priority,
      ...sla,
    },
  });
}

/**
 * Pause SLA for a request
 * POST /api/v1/sla/requests/:id/pause
 */
export async function pauseRequestSla(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const requestId = req.params.id;

  if (!req.body.reason) {
    throw new ApiError('Reason is required', 400, 'VALIDATION_ERROR');
  }

  await slaService.pauseSla(
    requestId,
    userId,
    req.body.reason,
    req.body.until ? new Date(req.body.until) : undefined
  );

  res.json({
    success: true,
    message: 'SLA paused successfully',
  });
}

/**
 * Resume SLA for a request
 * POST /api/v1/sla/requests/:id/resume
 */
export async function resumeRequestSla(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const requestId = req.params.id;

  await slaService.resumeSla(requestId, userId);

  res.json({
    success: true,
    message: 'SLA resumed successfully',
  });
}

// ============================================================================
// SLA Reports
// ============================================================================

/**
 * Get SLA compliance report
 * GET /api/v1/sla/reports/compliance
 */
export async function getSlaComplianceReport(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;

  // Default to last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  if (req.query.startDate) {
    startDate.setTime(new Date(req.query.startDate as string).getTime());
  }
  if (req.query.endDate) {
    endDate.setTime(new Date(req.query.endDate as string).getTime());
  }

  const report = await slaService.getSlaComplianceReport(tenantId, startDate, endDate);

  res.json({
    success: true,
    data: {
      ...report,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    },
  });
}

/**
 * Get SLA breach summary
 * GET /api/v1/sla/reports/breaches
 */
export async function getSlaBreachSummary(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const days = req.query.days ? parseInt(req.query.days as string) : 30;

  const report = await slaService.getSlaBreachSummary(tenantId, days);

  res.json({
    success: true,
    data: report,
  });
}

/**
 * Check for SLA breaches (admin/scheduled job endpoint)
 * POST /api/v1/sla/check-breaches
 */
export async function checkSlaBreaches(req: Request, res: Response): Promise<void> {
  const tenantId = req.user?.tenantId;

  const breachCount = await slaService.checkSlaBreaches(tenantId);

  res.json({
    success: true,
    message: `Checked for SLA breaches, found ${breachCount} new breaches`,
    data: { breachCount },
  });
}
