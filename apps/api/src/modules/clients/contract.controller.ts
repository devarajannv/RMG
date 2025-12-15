import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as contractService from './contract.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Validation Schemas
// ============================================================================

const createContractSchema = z.object({
  clientId: z.string().uuid(),
  contractNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.enum(['MSA', 'SOW', 'AMENDMENT', 'NDA', 'OTHER']),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  signedDate: z.coerce.date().optional(),
  value: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  billingType: z.enum(['TM', 'FIXED', 'RETAINER', 'MILESTONE', 'HYBRID']),
  paymentTerms: z.string().max(50).optional(),
  autoRenew: z.boolean().optional(),
  accountMgrId: z.string().uuid().optional(),
  documentUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

const updateContractSchema = createContractSchema.partial().extend({
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED']).optional(),
  renewalDate: z.coerce.date().optional(),
});

const listContractsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  clientId: z.string().uuid().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  billingType: z.union([z.string(), z.array(z.string())]).optional(),
  expiringWithinDays: z.coerce.number().int().positive().optional(),
});

function normalizeArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/contracts
 */
router.get(
  '/',
  authorize('contract:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listContractsSchema.parse(req.query);
      
      const filters = {
        search: query.search,
        clientId: query.clientId,
        status: normalizeArray(query.status),
        type: normalizeArray(query.type),
        billingType: normalizeArray(query.billingType),
        expiringWithinDays: query.expiringWithinDays,
      };

      const result = await contractService.listContracts(
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
 * GET /api/v1/contracts/expiring
 */
router.get(
  '/expiring',
  authorize('contract:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const contracts = await contractService.getExpiringContracts(req.tenantId!, days);
      res.json({ data: contracts });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/contracts/:id
 */
router.get(
  '/:id',
  authorize('contract:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await contractService.getContractById(req.tenantId!, req.params.id);
      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/contracts
 */
router.post(
  '/',
  authorize('contract:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createContractSchema.parse(req.body);
      const contract = await contractService.createContract(
        req.tenantId!,
        input,
        req.user!.id
      );
      res.status(201).json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/contracts/:id
 */
router.put(
  '/:id',
  authorize('contract:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateContractSchema.parse(req.body);
      const contract = await contractService.updateContract(
        req.tenantId!,
        req.params.id,
        input,
        req.user!.id
      );
      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/contracts/:id
 */
router.delete(
  '/:id',
  authorize('contract:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await contractService.deleteContract(req.tenantId!, req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/contracts/stats/summary
 */
router.get(
  '/stats/summary',
  authorize('contract:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await contractService.getContractStats(req.tenantId!);
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/contracts/:id/activate
 */
router.post(
  '/:id/activate',
  authorize('contract:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await contractService.activateContract(
        req.tenantId!,
        req.params.id,
        req.user!.id
      );
      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/contracts/:id/terminate
 */
router.post(
  '/:id/terminate',
  authorize('contract:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
      const contract = await contractService.terminateContract(
        req.tenantId!,
        req.params.id,
        reason,
        req.user!.id
      );
      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/contracts/:id/renew
 */
router.post(
  '/:id/renew',
  authorize('contract:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const renewalData = z.object({
        newEndDate: z.coerce.date(),
        newValue: z.number().positive().optional(),
        notes: z.string().optional(),
      }).parse(req.body);

      const result = await contractService.renewContract(
        req.tenantId!,
        req.params.id,
        renewalData,
        req.user!.id
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/contracts/:id/link-project
 */
router.post(
  '/:id/link-project',
  authorize('contract:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = z.object({ projectId: z.string().uuid() }).parse(req.body);
      const project = await contractService.linkProjectToContract(
        req.tenantId!,
        req.params.id,
        projectId,
        req.user!.id
      );
      res.json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/contracts/:id/unlink-project
 */
router.post(
  '/:id/unlink-project',
  authorize('contract:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = z.object({ projectId: z.string().uuid() }).parse(req.body);
      const project = await contractService.unlinkProjectFromContract(
        req.tenantId!,
        projectId,
        req.user!.id
      );
      res.json({ data: project });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

