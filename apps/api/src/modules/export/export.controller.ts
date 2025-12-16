import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as exportService from './export.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Validation Schema
// ============================================================================

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/export/resources
 * Export all resources
 */
router.get(
  '/resources',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = exportQuerySchema.parse(req.query);
      
      const result = await exportService.exportResources(req.tenantId!, {
        format: query.format,
        dateRange: query.startDate && query.endDate ? {
          start: query.startDate,
          end: query.endDate,
        } : undefined,
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Record-Count', result.recordCount.toString());
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/export/projects
 * Export all projects
 */
router.get(
  '/projects',
  authorize('project:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = exportQuerySchema.parse(req.query);
      
      const result = await exportService.exportProjects(req.tenantId!, {
        format: query.format,
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Record-Count', result.recordCount.toString());
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/export/allocations
 * Export allocations
 */
router.get(
  '/allocations',
  authorize('allocation:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = exportQuerySchema.parse(req.query);
      
      const result = await exportService.exportAllocations(req.tenantId!, {
        format: query.format,
        dateRange: query.startDate && query.endDate ? {
          start: query.startDate,
          end: query.endDate,
        } : undefined,
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Record-Count', result.recordCount.toString());
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/export/bench-report
 * Export bench report
 */
router.get(
  '/bench-report',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = exportQuerySchema.parse(req.query);
      
      const result = await exportService.exportBenchReport(req.tenantId!, {
        format: query.format,
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Record-Count', result.recordCount.toString());
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/export/utilization-report
 * Export utilization report
 */
router.get(
  '/utilization-report',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = exportQuerySchema.parse(req.query);
      
      const result = await exportService.exportUtilizationReport(req.tenantId!, {
        format: query.format,
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Record-Count', result.recordCount.toString());
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/export/clients
 * Export clients
 */
router.get(
  '/clients',
  authorize('client:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = exportQuerySchema.parse(req.query);
      
      const result = await exportService.exportClients(req.tenantId!, {
        format: query.format,
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Record-Count', result.recordCount.toString());
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/export/skills-inventory
 * Export skills inventory
 */
router.get(
  '/skills-inventory',
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = exportQuerySchema.parse(req.query);
      
      const result = await exportService.exportSkillsInventory(req.tenantId!, {
        format: query.format,
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Record-Count', result.recordCount.toString());
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

