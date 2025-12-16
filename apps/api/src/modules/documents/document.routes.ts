import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import * as documentController from './document.controller';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// All routes require authentication
router.use(authenticate);

// Document CRUD
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocument);
router.post('/', upload.single('file'), documentController.uploadDocument);
router.put('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);

// Download
router.get('/:id/download', documentController.downloadDocument);

// Versioning
router.get('/:id/versions', documentController.getVersions);
router.post('/:id/versions', upload.single('file'), documentController.uploadVersion);

// Access control
router.post('/:id/access', documentController.grantAccess);
router.delete('/:id/access/:accessId', documentController.revokeAccess);

// Audit
router.get('/:id/logs', documentController.getAccessLogs);

export default router;

