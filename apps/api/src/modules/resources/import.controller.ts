import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as importService from './import.service';
import { authenticate, authorize } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  },
});

router.use(authenticate);

/**
 * POST /api/v1/resources/import
 * Import resources from Excel file
 */
router.post(
  '/',
  authorize('resource:write'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new ApiError('No file uploaded', 400, 'NO_FILE');
      }

      const updateExisting = req.body.updateExisting === 'true';

      const result = await importService.importResources(
        req.tenantId!,
        req.file.buffer,
        req.user!.id,
        { updateExisting }
      );

      res.json({
        message: 'Import completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/resources/import/template
 * Download import template
 */
router.get(
  '/template',
  authorize('resource:read'),
  (_req: Request, res: Response) => {
    const buffer = importService.generateImportTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=resource-import-template.xlsx'
    );
    res.send(buffer);
  }
);

export default router;

