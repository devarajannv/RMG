import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as allocationService from './allocation.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Validation Schemas
// ============================================================================

const createAllocationSchema = z.object({
  resourceId: z.string().uuid(),
  projectId: z.string().uuid(),
  role: z.string().min(1).max(100),
  percentage: z.number().int().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isBillable: z.boolean().optional(),
  billRate: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

const updateAllocationSchema = z.object({
  role: z.string().min(1).max(100).optional(),
  percentage: z.number().int().min(1).max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  actualEndDate: z.coerce.date().optional(),
  status: z.enum(['PROPOSED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  isBillable: z.boolean().optional(),
  billRate: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
  cancelReason: z.string().max(500).optional(),
});

const listAllocationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  resourceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  isBillable: z.coerce.boolean().optional(),
  startDateFrom: z.coerce.date().optional(),
  startDateTo: z.coerce.date().optional(),
  endDateFrom: z.coerce.date().optional(),
  endDateTo: z.coerce.date().optional(),
  rollingOffWithinDays: z.coerce.number().int().positive().optional(),
});

const availabilitySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const bulkCreateSchema = z.object({
  allocations: z.array(createAllocationSchema).min(1).max(50),
});

function normalizeArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/allocations
 */
router.get(
  '/',
  authorize('allocation:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listAllocationsSchema.parse(req.query);

      const filters = {
        resourceId: query.resourceId,
        projectId: query.projectId,
        status: normalizeArray(query.status),
        isBillable: query.isBillable,
        startDateFrom: query.startDateFrom,
        startDateTo: query.startDateTo,
        endDateFrom: query.endDateFrom,
        endDateTo: query.endDateTo,
        rollingOffWithinDays: query.rollingOffWithinDays,
      };

      const result = await allocationService.listAllocations(
        req.tenantId!,
        filters,
        {
          page: query.page,
          limit: query.limit,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/allocations/rolloffs
 */
router.get(
  '/rolloffs',
  authorize('allocation:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const rolloffs = await allocationService.getUpcomingRolloffs(req.tenantId!, days);
      res.json({ data: rolloffs });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/allocations/check-conflicts
 */
router.post(
  '/check-conflicts',
  authorize('allocation:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        resourceId: z.string().uuid(),
        percentage: z.number().int().min(1).max(100),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        excludeAllocationId: z.string().uuid().optional(),
      });

      const input = schema.parse(req.body);

      // Get resource capacity
      const resource = await require('../../lib/prisma').default.resource.findFirst({
        where: { id: input.resourceId, tenantId: req.tenantId },
        select: { capacity: true },
      });

      const conflict = await allocationService.checkAllocationConflicts(
        req.tenantId!,
        input.resourceId,
        input.percentage,
        input.startDate,
        input.endDate,
        resource?.capacity ?? 100,
        input.excludeAllocationId
      );

      res.json({
        hasConflict: !!conflict,
        conflict,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/allocations/:id
 */
router.get(
  '/:id',
  authorize('allocation:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allocation = await allocationService.getAllocationById(
        req.tenantId!,
        req.params.id
      );
      res.json({ data: allocation });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/allocations
 */
router.post(
  '/',
  authorize('allocation:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createAllocationSchema.parse(req.body);
      const allocation = await allocationService.createAllocation(
        req.tenantId!,
        input,
        req.user!.id
      );
      res.status(201).json({ data: allocation });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/allocations/bulk
 */
router.post(
  '/bulk',
  authorize('allocation:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = bulkCreateSchema.parse(req.body);
      const result = await allocationService.bulkCreateAllocations(
        req.tenantId!,
        input.allocations,
        req.user!.id
      );
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/allocations/:id
 */
router.put(
  '/:id',
  authorize('allocation:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateAllocationSchema.parse(req.body);
      const allocation = await allocationService.updateAllocation(
        req.tenantId!,
        req.params.id,
        input,
        req.user!.id
      );
      res.json({ data: allocation });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/allocations/:id/confirm
 */
router.post(
  '/:id/confirm',
  authorize('allocation:approve'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allocation = await allocationService.updateAllocation(
        req.tenantId!,
        req.params.id,
        { status: 'CONFIRMED' },
        req.user!.id
      );
      res.json({ data: allocation });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/allocations/:id/start
 */
router.post(
  '/:id/start',
  authorize('allocation:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allocation = await allocationService.updateAllocation(
        req.tenantId!,
        req.params.id,
        { status: 'ACTIVE' },
        req.user!.id
      );
      res.json({ data: allocation });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/allocations/:id/complete
 */
router.post(
  '/:id/complete',
  authorize('allocation:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        actualEndDate: z.coerce.date().optional(),
      });
      const input = schema.parse(req.body);

      const allocation = await allocationService.updateAllocation(
        req.tenantId!,
        req.params.id,
        { status: 'COMPLETED', actualEndDate: input.actualEndDate },
        req.user!.id
      );
      res.json({ data: allocation });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/allocations/:id
 */
router.delete(
  '/:id',
  authorize('allocation:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reason = req.body?.reason;
      await allocationService.deleteAllocation(
        req.tenantId!,
        req.params.id,
        req.user!.id,
        reason
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/resources/:resourceId/availability
 */
router.get(
  '/resources/:resourceId/availability',
  authorize('allocation:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = availabilitySchema.parse(req.query);
      const availability = await allocationService.getResourceAvailability(
        req.tenantId!,
        req.params.resourceId,
        query.startDate,
        query.endDate
      );
      res.json({ data: availability });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

