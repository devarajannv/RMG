import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as roleController from './role.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Role CRUD - only admins can manage roles
router.get('/', authorize('role:read'), roleController.getRoles);
router.get('/:id', authorize('role:read'), roleController.getRole);
router.post('/', authorize('role:write'), roleController.createRole);
router.put('/:id', authorize('role:write'), roleController.updateRole);
router.delete('/:id', authorize('role:delete'), roleController.deleteRole);

// Role assignment - CRITICAL: only admins can assign/revoke roles
router.post('/assign', authorize('role:assign'), roleController.assignRole);
router.post('/revoke', authorize('role:assign'), roleController.revokeRole);

// Permissions - users can check their own, admins can check others
router.get('/permissions/user/:userId', authorize('role:read'), roleController.getUserPermissions);
router.get('/permissions/check', roleController.checkPermission); // Users can check their own
router.post('/permissions/initialize', authorize('role:admin'), roleController.initializePermissions);

// Audit - admin only
router.get('/audit/assignments', authorize('role:audit'), roleController.getAssignmentAudit);

export default router;

