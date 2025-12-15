import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as clientService from './client.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Validation Schemas
// ============================================================================

const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/),
  industry: z.string().max(100).optional(),
  website: z.string().url().max(255).optional().or(z.literal('')),
  tier: z.enum(['STRATEGIC', 'KEY', 'STANDARD']).optional(),
  billingAddress: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    role: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  notes: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROSPECT']).optional(),
});

const listClientsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  tier: z.union([z.string(), z.array(z.string())]).optional(),
  industry: z.string().optional(),
});

function normalizeArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/clients
 */
router.get(
  '/',
  authorize('client:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listClientsSchema.parse(req.query);
      
      const filters = {
        search: query.search,
        status: normalizeArray(query.status),
        tier: normalizeArray(query.tier),
        industry: query.industry,
      };

      const pagination = {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const result = await clientService.listClients(req.tenantId!, filters, pagination);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/clients/stats
 */
router.get(
  '/stats',
  authorize('client:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await clientService.getClientStats(req.tenantId!);
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/clients/:id
 */
router.get(
  '/:id',
  authorize('client:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await clientService.getClientById(req.tenantId!, req.params.id);
      res.json({ data: client });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/clients
 */
router.post(
  '/',
  authorize('client:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createClientSchema.parse(req.body);
      const client = await clientService.createClient(req.tenantId!, input, req.user!.id);
      res.status(201).json({ data: client });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/clients/:id
 */
router.put(
  '/:id',
  authorize('client:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateClientSchema.parse(req.body);
      const client = await clientService.updateClient(
        req.tenantId!,
        req.params.id,
        input,
        req.user!.id
      );
      res.json({ data: client });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/clients/:id
 */
router.delete(
  '/:id',
  authorize('client:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await clientService.deleteClient(req.tenantId!, req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

