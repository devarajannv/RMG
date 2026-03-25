/**
 * Audit Log Controller
 * API endpoints for audit log retrieval
 */

import { Request, Response, NextFunction } from 'express';
import * as auditService from './audit.service';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const {
      entityType,
      action,
      userId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const filters: auditService.AuditLogFilters = {};
    if (entityType) filters.entityType = String(entityType);
    if (action) filters.action = String(action);
    if (userId) filters.userId = String(userId);
    if (startDate) {
      const d = new Date(String(startDate));
      if (!isNaN(d.getTime())) filters.startDate = d;
    }
    if (endDate) {
      const d = new Date(String(endDate));
      if (!isNaN(d.getTime())) filters.endDate = d;
    }

    // L-10: Clamp pagination params
    const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));

    const result = await auditService.getAuditLogs(
      tenantId,
      filters,
      parsedPage,
      parsedLimit
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEntityTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const entityTypes = await auditService.getAuditLogEntityTypes(tenantId);

    res.json({
      success: true,
      data: entityTypes,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoiceLinkageReconciliationReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.user!.tenantId;
    const report = await auditService.getInvoiceLinkageReconciliationReport(tenantId);

    res.json({
      success: true,
      data: report.data,
      summary: report.summary,
    });
  } catch (error) {
    next(error);
  }
}
