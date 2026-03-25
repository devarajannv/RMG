import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as roleController from './role.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Role CRUD - only admins can manage roles
router.get('/', authorize('role:read'), roleController.getRoles);
router.get('/catalog', authorize('role:read'), roleController.getPermissionCatalog);
router.post('/system/provision', authorize('role:admin'), roleController.provisionSystemRole);
router.get('/:id', authorize('role:read'), roleController.getRole);
router.post('/', authorize('role:write'), roleController.createRole);
router.put('/:id', authorize('role:write'), roleController.updateRole);
router.delete('/:id', authorize('role:delete'), roleController.deleteRole);

// Role assignment - CRITICAL: only admins can assign/revoke roles
router.post('/assign', authorize('role:assign'), roleController.assignRole);
router.post('/revoke', authorize('role:assign'), roleController.revokeRole);

// Permissions - L-04: users can only check their own, access controlled by middleware
router.get('/permissions/user/:userId', authorize('role:read'), roleController.getUserPermissions);
router.get('/permissions/check', roleController.checkPermission); // Scoped to own user by authenticate middleware
router.post('/permissions/initialize', authorize('role:admin'), roleController.initializePermissions);

// Audit - admin only
router.get('/audit/assignments', authorize('role:audit'), roleController.getAssignmentAudit);

export default router;

