import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as roleController from './role.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Role CRUD
router.get('/', roleController.getRoles);
router.get('/:id', roleController.getRole);
router.post('/', roleController.createRole);
router.put('/:id', roleController.updateRole);
router.delete('/:id', roleController.deleteRole);

// Role assignment
router.post('/assign', roleController.assignRole);
router.post('/revoke', roleController.revokeRole);

// Permissions
router.get('/permissions/user/:userId', roleController.getUserPermissions);
router.get('/permissions/check', roleController.checkPermission);
router.post('/permissions/initialize', roleController.initializePermissions);

// Audit
router.get('/audit/assignments', roleController.getAssignmentAudit);

export default router;

