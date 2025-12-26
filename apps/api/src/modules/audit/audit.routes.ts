/**
 * Audit Log Routes
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as auditController from './audit.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get audit logs with filtering and pagination
router.get('/', auditController.getAuditLogs);

// Get distinct entity types for filter dropdown
router.get('/entity-types', auditController.getEntityTypes);

export default router;
