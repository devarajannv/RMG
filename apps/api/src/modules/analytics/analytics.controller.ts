import { Router, Request, Response, NextFunction } from 'express';
import * as analyticsService from './analytics.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/analytics/executive
 * Get executive dashboard metrics
 */
router.get(
  '/executive',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await analyticsService.getExecutiveMetrics(req.tenantId!);
      res.json({ data: metrics });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/practice
 * Get practice-level metrics
 */
router.get(
  '/practice',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await analyticsService.getPracticeMetrics(req.tenantId!);
      res.json({ data: metrics });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/financial
 * Get financial metrics
 */
router.get(
  '/financial',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await analyticsService.getFinancialMetrics(req.tenantId!);
      res.json({ data: metrics });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/projects
 * Get project health metrics
 */
router.get(
  '/projects',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await analyticsService.getProjectHealthMetrics(req.tenantId!);
      res.json({ data: metrics });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/locations
 * Get location metrics
 */
router.get(
  '/locations',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await analyticsService.getLocationMetrics(req.tenantId!);
      res.json({ data: metrics });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


