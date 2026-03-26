import { RequestHandler, Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, authorize } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';
import * as documentController from './document.controller';

const router = Router();

// Allowed file types whitelist
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
];

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.zip',
];

// Configure multer for file uploads with file type validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  },
});

function uploadSingle(fieldName: string): RequestHandler {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error?: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          next(new ApiError('File size exceeds maximum of 50MB', 400, 'FILE_SIZE_ERROR'));
          return;
        }

        next(new ApiError(error.message, 400, 'UPLOAD_ERROR'));
        return;
      }

      if (error instanceof Error && error.message.startsWith('File type not allowed')) {
        next(new ApiError(error.message, 400, 'FILE_TYPE_NOT_ALLOWED'));
        return;
      }

      next(error);
    });
  };
}

// All routes require authentication
router.use(authenticate);

// Document CRUD
router.get('/', authorize('document:read'), documentController.getDocuments);
router.get('/:id', authorize('document:read'), documentController.getDocument);
router.post('/', authorize('document:create'), uploadSingle('file'), documentController.uploadDocument);
router.put('/:id', authorize('document:update'), documentController.updateDocument);
router.delete('/:id', authorize('document:delete'), documentController.deleteDocument);

// Download
router.get('/:id/download', authorize('document:read'), documentController.downloadDocument);

// Versioning
router.get('/:id/versions', authorize('document:read'), documentController.getVersions);
router.post('/:id/versions', authorize('document:create'), uploadSingle('file'), documentController.uploadVersion);

// Access control
router.post('/:id/access', authorize('document:manage'), documentController.grantAccess);
router.delete('/:id/access/:accessId', authorize('document:manage'), documentController.revokeAccess);

// Audit
router.get('/:id/logs', authorize('document:read'), documentController.getAccessLogs);

export default router;

