/**
 * Organization Controller
 */

import { Request, Response, NextFunction } from 'express';
import * as organizationService from './organization.service';

export async function getOrganizationStats(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const stats = await organizationService.getOrganizationStats(tenantId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
