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
    if (startDate) filters.startDate = new Date(String(startDate));
    if (endDate) filters.endDate = new Date(String(endDate));

    const result = await auditService.getAuditLogs(
      tenantId,
      filters,
      parseInt(String(page), 10),
      parseInt(String(limit), 10)
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
