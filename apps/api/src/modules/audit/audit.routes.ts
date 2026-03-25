/**
 * Audit Log Routes
 * 
 * SECURITY: Audit logs are highly sensitive and contain information about
 * all user actions in the system. Only users with audit:read permission
 * (typically security admins) should have access.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as auditController from './audit.controller';

const router = Router();

// All routes require authentication AND audit permission
router.use(authenticate);

// Get audit logs with filtering and pagination - ADMIN ONLY
router.get('/', authorize('audit:read'), auditController.getAuditLogs);

// Get distinct entity types for filter dropdown - ADMIN ONLY
router.get('/entity-types', authorize('audit:read'), auditController.getEntityTypes);

// Get invoice-linkage reconciliation report grouped by invoiceReference - ADMIN ONLY
router.get(
	'/invoice-linkage/reconciliation-report',
	authorize('audit:read'),
	auditController.getInvoiceLinkageReconciliationReport
);

export default router;
