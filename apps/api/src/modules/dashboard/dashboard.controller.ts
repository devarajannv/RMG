import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as dashboardService from './dashboard.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/dashboard/metrics
 * Get comprehensive dashboard metrics
 */
router.get(
  '/metrics',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await dashboardService.getDashboardMetrics(req.tenantId!);
      res.json({ data: metrics });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/dashboard/utilization-trend
 * Get utilization trend over time
 */
router.get(
  '/utilization-trend',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        granularity: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
      });

      const query = schema.parse(req.query);

      // Default to last 12 weeks
      const endDate = query.endDate ?? new Date();
      const startDate = query.startDate ?? new Date(endDate.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

      const trend = await dashboardService.getUtilizationTrend(
        req.tenantId!,
        startDate,
        endDate,
        query.granularity
      );

      res.json({ data: trend });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/dashboard/bench-analysis
 * Get detailed bench analysis
 */
router.get(
  '/bench-analysis',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analysis = await dashboardService.getBenchAnalysis(req.tenantId!);
      res.json({ data: analysis });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/dashboard/practice-utilization
 * Get utilization breakdown by practice
 */
router.get(
  '/practice-utilization',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const utilization = await dashboardService.getPracticeUtilization(req.tenantId!);
      res.json({ data: utilization });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/dashboard/capacity-forecast
 * Get capacity forecast for upcoming weeks
 */
router.get(
  '/capacity-forecast',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const weeks = parseInt(req.query.weeks as string) || 8;
      const forecast = await dashboardService.getCapacityForecast(req.tenantId!, weeks);
      res.json({ data: forecast });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/dashboard/skill-demand
 * Get skill demand analysis
 */
router.get(
  '/skill-demand',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analysis = await dashboardService.getSkillDemandAnalysis(req.tenantId!);
      res.json({ data: analysis });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

