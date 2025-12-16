import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as benchService from './bench.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/bench/summary
 * Get comprehensive bench summary with metrics
 */
router.get(
  '/summary',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await benchService.getBenchSummary(req.tenantId!);
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/bench/resources
 * Get detailed list of bench resources
 */
router.get(
  '/resources',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        agingCategory: z.enum(['fresh', 'moderate', 'critical', 'severe']).optional(),
        practiceId: z.string().uuid().optional(),
        band: z.string().optional(),
        skills: z.string().transform(s => s.split(',')).optional(),
        sortBy: z.enum(['benchDays', 'benchCost', 'name']).default('benchDays'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      });

      const query = schema.parse(req.query);

      const result = await benchService.getBenchResourcesDetailed(req.tenantId!, {
        agingCategory: query.agingCategory,
        practiceId: query.practiceId,
        band: query.band,
        skills: query.skills,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      });

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/bench/rolloffs
 * Get upcoming rolloffs (resources becoming available)
 */
router.get(
  '/rolloffs',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        days: z.coerce.number().min(1).max(180).default(30),
        practiceId: z.string().uuid().optional(),
        includeWithNextAllocation: z.coerce.boolean().default(false),
      });

      const query = schema.parse(req.query);

      const rolloffs = await benchService.getUpcomingRolloffs(req.tenantId!, {
        days: query.days,
        practiceId: query.practiceId,
        includeWithNextAllocation: query.includeWithNextAllocation,
      });

      res.json({ data: rolloffs });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/bench/alerts
 * Get proactive alerts for resources who will be on bench soon
 */
router.get(
  '/alerts',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        days: z.coerce.number().min(1).max(90).default(30),
      });

      const query = schema.parse(req.query);

      const alerts = await benchService.getWillBeOnBenchAlerts(req.tenantId!, {
        days: query.days,
      });

      res.json({ data: alerts });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/bench/forecast
 * Get bench forecast for future periods
 */
router.get(
  '/forecast',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        days: z.coerce.number().min(7).max(180).default(90),
        granularity: z.enum(['daily', 'weekly']).default('weekly'),
      });

      const query = schema.parse(req.query);

      const forecast = await benchService.getBenchForecast(req.tenantId!, {
        days: query.days,
        granularity: query.granularity,
      });

      res.json({ data: forecast });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/bench/cost-trend
 * Get bench cost trends over time
 */
router.get(
  '/cost-trend',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        months: z.coerce.number().min(1).max(12).default(6),
      });

      const query = schema.parse(req.query);

      const trend = await benchService.getBenchCostTrend(req.tenantId!, {
        months: query.months,
      });

      res.json({ data: trend });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/bench/matching-projects/:resourceId
 * Get matching projects for a bench resource
 */
router.get(
  '/matching-projects/:resourceId',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.resourceId;

      const matches = await benchService.getMatchingProjectsForResource(
        req.tenantId!,
        resourceId
      );

      res.json({ data: matches });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/bench/quick-allocate
 * Quick allocation from bench to project
 */
router.post(
  '/quick-allocate',
  authorize('allocation:create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        resourceId: z.string().uuid(),
        projectId: z.string().uuid(),
        role: z.string().min(1).max(100),
        percentage: z.number().min(1).max(100),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        isBillable: z.boolean().default(true),
        notes: z.string().max(500).optional(),
      });

      const input = schema.parse(req.body);

      // Validate dates
      if (input.endDate <= input.startDate) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATES',
            message: 'End date must be after start date',
          },
        });
      }

      const allocation = await benchService.quickAllocateFromBench(
        req.tenantId!,
        input,
        req.userId!
      );

      res.status(201).json({ data: allocation });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

