import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as projectService from './project.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Validation Schemas
// ============================================================================

const createProjectSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().min(1).max(200),
  type: z.enum(['BILLABLE', 'INTERNAL', 'PRESALES', 'SUPPORT']),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  deliveryModel: z.enum(['ONSITE', 'OFFSHORE', 'HYBRID']).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  clientId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  practiceId: z.string().uuid().optional(),
  billingType: z.enum(['TM', 'FIXED', 'RETAINER', 'MILESTONE', 'HYBRID']).optional(),
  budgetHours: z.number().int().positive().optional(),
  budgetAmount: z.number().positive().optional(),
  defaultRate: z.number().positive().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  tags: z.array(z.string()).optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['PIPELINE', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  healthStatus: z.enum(['GREEN', 'AMBER', 'RED']).optional(),
  actualEndDate: z.coerce.date().optional(),
});

const listProjectsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  clientId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  practiceId: z.string().uuid().optional(),
  priority: z.union([z.string(), z.array(z.string())]).optional(),
  healthStatus: z.union([z.string(), z.array(z.string())]).optional(),
});

function normalizeArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/projects
 */
router.get(
  '/',
  authorize('project:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listProjectsSchema.parse(req.query);
      
      const filters = {
        search: query.search,
        status: normalizeArray(query.status),
        type: normalizeArray(query.type),
        clientId: query.clientId,
        contractId: query.contractId,
        managerId: query.managerId,
        practiceId: query.practiceId,
        priority: normalizeArray(query.priority),
        healthStatus: normalizeArray(query.healthStatus),
      };

      const result = await projectService.listProjects(
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
 * GET /api/v1/projects/stats
 */
router.get(
  '/stats',
  authorize('project:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await projectService.getProjectStats(req.tenantId!);
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/projects/ending-soon
 */
router.get(
  '/ending-soon',
  authorize('project:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const projects = await projectService.getProjectsEndingSoon(req.tenantId!, days);
      res.json({ data: projects });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/projects/:id
 */
router.get(
  '/:id',
  authorize('project:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.tenantId!, req.params.id);
      res.json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/projects
 */
router.post(
  '/',
  authorize('project:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createProjectSchema.parse(req.body);
      const project = await projectService.createProject(
        req.tenantId!,
        input,
        req.user!.id
      );
      res.status(201).json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/projects/:id
 */
router.put(
  '/:id',
  authorize('project:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateProjectSchema.parse(req.body);
      const project = await projectService.updateProject(
        req.tenantId!,
        req.params.id,
        input,
        req.user!.id
      );
      res.json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/projects/:id
 */
router.delete(
  '/:id',
  authorize('project:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await projectService.deleteProject(req.tenantId!, req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

