import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as resourceService from './resource.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Validation Schemas
// ============================================================================

const createResourceSchema = z.object({
  employeeId: z.string().min(1).max(50),
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  preferredName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  employmentType: z.enum(['FTE', 'CONTRACTOR', 'INTERN']),
  band: z.string().min(1).max(10),
  designation: z.string().min(1).max(100),
  department: z.string().max(100).optional(),
  dateOfJoining: z.coerce.date(),
  capacity: z.number().int().min(0).max(100).optional(),
  costPerHour: z.number().positive().optional(),
  billRateDefault: z.number().positive().optional(),
  practiceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

const updateResourceSchema = createResourceSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'NOTICE']).optional(),
  dateOfExit: z.coerce.date().optional(),
  exitReason: z.string().max(200).optional(),
});

const listResourcesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('firstName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  employmentType: z.union([z.string(), z.array(z.string())]).optional(),
  practiceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  band: z.union([z.string(), z.array(z.string())]).optional(),
  isOnBench: z.coerce.boolean().optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid('Invalid resource ID format'),
});

// Helper to normalize array params
function normalizeArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/resources
 * List resources with filters
 */
router.get(
  '/',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listResourcesSchema.parse(req.query);
      
      const filters = {
        search: query.search,
        status: normalizeArray(query.status),
        employmentType: normalizeArray(query.employmentType),
        practiceId: query.practiceId,
        locationId: query.locationId,
        managerId: query.managerId,
        band: normalizeArray(query.band),
        isOnBench: query.isOnBench,
        skills: normalizeArray(query.skills),
        tags: normalizeArray(query.tags),
      };

      const pagination = {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const result = await resourceService.listResources(
        req.tenantId!,
        filters,
        pagination
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/resources/bench
 * Get bench resources
 */
router.get(
  '/bench',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resources = await resourceService.getBenchResources(req.tenantId!);
      res.json({ data: resources });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/resources/utilization-summary
 * Get utilization summary
 */
router.get(
  '/utilization-summary',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await resourceService.getResourceUtilizationSummary(req.tenantId!);
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/resources/:id
 * Get resource by ID
 */
router.get(
  '/:id',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const resource = await resourceService.getResourceById(
        req.tenantId!,
        id
      );
      res.json({ data: resource });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/resources
 * Create a new resource
 */
router.post(
  '/',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createResourceSchema.parse(req.body);
      const resource = await resourceService.createResource(
        req.tenantId!,
        input,
        req.user!.id
      );
      res.status(201).json({ data: resource });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/resources/:id
 * Update resource
 */
router.put(
  '/:id',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const input = updateResourceSchema.parse(req.body);
      const resource = await resourceService.updateResource(
        req.tenantId!,
        id,
        input,
        req.user!.id
      );
      res.json({ data: resource });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/resources/:id
 * Partial update resource
 */
router.patch(
  '/:id',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const input = updateResourceSchema.parse(req.body);
      const resource = await resourceService.updateResource(
        req.tenantId!,
        id,
        input,
        req.user!.id
      );
      res.json({ data: resource });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/resources/:id
 * Delete resource (soft delete)
 */
router.delete(
  '/:id',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      await resourceService.deleteResource(
        req.tenantId!,
        id,
        req.user!.id
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

