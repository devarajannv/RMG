/**
 * Budget Tracking Controller
 * 
 * REST API endpoints for budget vs actual tracking analytics.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import * as budgetService from './budget-tracking.service';

const router = Router();

router.use(authenticate);

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/analytics/budget/summary
 * Get executive budget summary
 */
router.get(
  '/summary',
  authorize('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await budgetService.getExecutiveBudgetSummary(req.tenantId!);
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/budget/projects
 * Get budget status for all projects
 */
router.get(
  '/projects',
  authorize('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        status: z.string().optional(),
        type: z.string().optional(),
        practiceId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        healthStatus: z.string().optional(),
        hasBudget: z.string().optional(),
      });

      const query = schema.parse(req.query);

      const filters: Parameters<typeof budgetService.getAllProjectsBudgetStatus>[1] = {};

      if (query.status) {
        filters.status = query.status.split(',') as any;
      }
      if (query.type) {
        filters.type = query.type.split(',') as any;
      }
      if (query.practiceId) {
        filters.practiceId = query.practiceId;
      }
      if (query.clientId) {
        filters.clientId = query.clientId;
      }
      if (query.healthStatus) {
        filters.healthStatus = query.healthStatus.split(',') as any;
      }
      if (query.hasBudget !== undefined) {
        filters.hasBudget = query.hasBudget === 'true';
      }

      const result = await budgetService.getAllProjectsBudgetStatus(
        req.tenantId!,
        filters
      );

      res.json({ data: result.projects, summary: result.summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/budget/projects/:projectId
 * Get detailed budget status for a single project
 */
router.get(
  '/projects/:projectId',
  authorize('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await budgetService.getProjectBudgetStatus(
        req.tenantId!,
        req.params.projectId
      );

      if (!status) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/budget/projects/:projectId/forecast
 * Get budget forecast for a project
 */
router.get(
  '/projects/:projectId/forecast',
  authorize('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const forecast = await budgetService.generateBudgetForecast(
        req.tenantId!,
        req.params.projectId
      );

      if (!forecast) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({ data: forecast });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/budget/teams
 * Get budget performance by team/practice
 */
router.get(
  '/teams',
  authorize('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const performance = await budgetService.getTeamBudgetPerformance(
        req.tenantId!
      );
      res.json({ data: performance });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/budget/trends
 * Get budget trend data
 */
router.get(
  '/trends',
  authorize('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        projectId: z.string().uuid().optional(),
        periodType: z.enum(['weekly', 'monthly']).optional(),
        monthsBack: z.coerce.number().int().min(1).max(24).optional(),
      });

      const query = schema.parse(req.query);

      const trends = await budgetService.getBudgetTrends(
        req.tenantId!,
        query.projectId || null,
        query.periodType || 'monthly',
        query.monthsBack || 6
      );

      res.json({ data: trends });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analytics/budget/variance
 * Get variance report
 */
router.get(
  '/variance',
  authorize('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        projectIds: z.string().optional(),
        practiceIds: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      });

      const query = schema.parse(req.query);

      const options: Parameters<typeof budgetService.generateVarianceReport>[1] = {};

      if (query.projectIds) {
        options.projectIds = query.projectIds.split(',');
      }
      if (query.practiceIds) {
        options.practiceIds = query.practiceIds.split(',');
      }
      if (query.startDate) {
        options.startDate = query.startDate;
      }
      if (query.endDate) {
        options.endDate = query.endDate;
      }

      const report = await budgetService.generateVarianceReport(
        req.tenantId!,
        options
      );

      res.json({ data: report });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
