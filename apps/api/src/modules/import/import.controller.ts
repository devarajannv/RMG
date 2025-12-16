import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as importService from './import.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/import/resources
 * Import resources from CSV
 */
router.post(
  '/resources',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        data: z.string().min(1, 'CSV data is required'),
        updateExisting: z.boolean().default(false),
      });

      const input = schema.parse(req.body);

      const result = await importService.importResources(
        req.tenantId!,
        input.data,
        req.userId!,
        { updateExisting: input.updateExisting }
      );

      res.json({
        success: result.success,
        data: {
          totalRows: result.totalRows,
          importedRows: result.importedRows,
          skippedRows: result.skippedRows,
          errors: result.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/import/allocations
 * Import allocations from CSV
 */
router.post(
  '/allocations',
  authorize('allocation:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        data: z.string().min(1, 'CSV data is required'),
        updateExisting: z.boolean().default(false),
      });

      const input = schema.parse(req.body);

      const result = await importService.importAllocations(
        req.tenantId!,
        input.data,
        req.userId!,
        { updateExisting: input.updateExisting }
      );

      res.json({
        success: result.success,
        data: {
          totalRows: result.totalRows,
          importedRows: result.importedRows,
          skippedRows: result.skippedRows,
          errors: result.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/import/projects
 * Import projects from CSV
 */
router.post(
  '/projects',
  authorize('project:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        data: z.string().min(1, 'CSV data is required'),
        updateExisting: z.boolean().default(false),
      });

      const input = schema.parse(req.body);

      const result = await importService.importProjects(
        req.tenantId!,
        input.data,
        req.userId!,
        { updateExisting: input.updateExisting }
      );

      res.json({
        success: result.success,
        data: {
          totalRows: result.totalRows,
          importedRows: result.importedRows,
          skippedRows: result.skippedRows,
          errors: result.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/import/template/:type
 * Get import template
 */
router.get(
  '/template/:type',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.params.type as 'resources' | 'allocations' | 'projects';
      
      if (!['resources', 'allocations', 'projects'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid template type',
          validTypes: ['resources', 'allocations', 'projects'],
        });
      }

      const template = importService.getImportTemplate(type);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
      res.send(template);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/import/validate
 * Validate import data without importing
 */
router.post(
  '/validate',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        type: z.enum(['resources', 'allocations', 'projects']),
        data: z.string().min(1, 'CSV data is required'),
      });

      const input = schema.parse(req.body);

      // Parse CSV and validate structure
      const lines = input.data.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.json({
          valid: false,
          errors: ['CSV must have at least a header row and one data row'],
        });
      }

      const headers = lines[0].split(',').map(h => h.trim());
      
      const requiredHeaders: Record<string, string[]> = {
        resources: ['employeeId', 'firstName', 'lastName', 'email'],
        allocations: ['resourceEmployeeId', 'projectCode', 'startDate', 'endDate'],
        projects: ['code', 'name'],
      };

      const missing = requiredHeaders[input.type].filter(h => 
        !headers.some(header => header.toLowerCase() === h.toLowerCase())
      );

      if (missing.length > 0) {
        return res.json({
          valid: false,
          errors: [`Missing required headers: ${missing.join(', ')}`],
          headers,
        });
      }

      res.json({
        valid: true,
        headers,
        rowCount: lines.length - 1,
        message: `Ready to import ${lines.length - 1} ${input.type}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

