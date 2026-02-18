import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../../middleware/auth';
import { aiMigrationService } from './ai-migration.service';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'migrations');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'application/pdf',
      'image/png',
      'image/jpeg',
    ];
    const allowedExtensions = ['.csv', '.xlsx', '.xls', '.json', '.pdf', '.png', '.jpg', '.jpeg'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

router.use(authenticate);

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/ai-migration/upload
 * Upload a file and create an import job
 */
router.post(
  '/upload',
  authorize('import:write'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const schema = z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        importPurpose: z.enum(['MIGRATION', 'SYNC', 'MANUAL']).default('MIGRATION'),
      });

      const input = schema.parse(req.body);

      // Determine file type from extension
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileTypeMap: Record<string, string> = {
        '.csv': 'CSV',
        '.xlsx': 'XLSX',
        '.xls': 'XLSX',
        '.json': 'JSON',
        '.pdf': 'PDF',
        '.png': 'IMAGE',
        '.jpg': 'IMAGE',
        '.jpeg': 'IMAGE',
      };
      const fileType = fileTypeMap[ext] || 'CSV';

      // Create import job
      const job = await aiMigrationService.createImportJob(
        req.tenantId!,
        req.user?.id || '',
        {
          name: input.name,
          description: input.description,
          sourceFileName: req.file.originalname,
          sourceFileType: fileType,
          sourceFileSize: req.file.size,
          sourceFilePath: req.file.path,
          importPurpose: input.importPurpose,
        }
      );

      res.status(201).json({
        success: true,
        data: job,
        message: 'File uploaded. Call /analyze to process.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/ai-migration/:jobId/analyze
 * Analyze the uploaded file with AI
 */
router.post(
  '/:jobId/analyze',
  authorize('import:write'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      // Get job to find file path
      const job = await aiMigrationService.getImportJob(req.tenantId!, jobId);
      if (!job) {
        res.status(404).json({ error: 'Import job not found' });
        return;
      }

      // Read file content
      const fileContent = fs.readFileSync(job.sourceFilePath);

      // Analyze with AI
      const analysis = await aiMigrationService.analyzeFile(
        req.tenantId!,
        jobId,
        fileContent
      );

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai-migration/jobs
 * List import jobs
 */
router.get(
  '/jobs',
  authorize('import:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, limit, offset } = req.query;

      const result = await aiMigrationService.listImportJobs(req.tenantId!, {
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result.jobs,
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit as string) : 20,
          offset: offset ? parseInt(offset as string) : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai-migration/:jobId
 * Get import job details
 */
router.get(
  '/:jobId',
  authorize('import:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;
      const job = await aiMigrationService.getImportJob(req.tenantId!, jobId);

      if (!job) {
        res.status(404).json({ error: 'Import job not found' });
        return;
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/ai-migration/:jobId/approve
 * Approve mappings and references, ready for import
 */
router.post(
  '/:jobId/approve',
  authorize('import:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      
      const schema = z.object({
        mappingOverrides: z.record(z.object({
          targetEntity: z.string(),
          targetField: z.string(),
        })).optional(),
        createReferences: z.boolean().default(true),
      });

      const input = schema.parse(req.body);

      const job = await aiMigrationService.approveImport(
        req.tenantId!,
        jobId,
        input
      );

      res.json({
        success: true,
        data: job,
        message: 'Import approved. Call /execute to start import.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/ai-migration/:jobId/execute
 * Execute the import
 */
router.post(
  '/:jobId/execute',
  authorize('import:write'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      // Get job to find file path
      const job = await aiMigrationService.getImportJob(req.tenantId!, jobId);
      if (!job) {
        res.status(404).json({ error: 'Import job not found' });
        return;
      }

      // Read file content
      const fileContent = fs.readFileSync(job.sourceFilePath);

      // Execute import
      const result = await aiMigrationService.executeImport(
        req.tenantId!,
        jobId,
        fileContent
      );

      res.json({
        success: true,
        data: result,
        message: `Import completed. ${result.importedRecords} imported, ${result.skippedRecords} skipped, ${result.errorRecords} errors.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/ai-migration/:jobId/rollback
 * Rollback an import
 */
router.post(
  '/:jobId/rollback',
  authorize('import:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;

      const result = await aiMigrationService.rollbackImport(
        req.tenantId!,
        jobId,
        req.user?.id || ''
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/ai-migration/:jobId/mappings
 * Update field mappings
 */
router.patch(
  '/:jobId/mappings',
  authorize('import:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      
      const schema = z.object({
        mappings: z.array(z.object({
          sourceColumn: z.string(),
          targetEntity: z.string(),
          targetField: z.string(),
        })),
      });

      const input = schema.parse(req.body);

      // Update each mapping
      for (const mapping of input.mappings) {
        await aiMigrationService.approveImport(req.tenantId!, jobId, {
          mappingOverrides: {
            [mapping.sourceColumn]: {
              targetEntity: mapping.targetEntity,
              targetField: mapping.targetField,
            },
          },
        });
      }

      const job = await aiMigrationService.getImportJob(req.tenantId!, jobId);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as aiMigrationRoutes };
export default router;
