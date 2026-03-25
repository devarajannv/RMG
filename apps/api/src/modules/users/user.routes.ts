/**
 * User Routes
 * Full user management CRUD operations
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as userController from './user.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List users (for workflow assignment dropdowns and admin list)
router.get('/', authorize('users:read'), userController.listUsers);

// Get single user
router.get('/:id', authorize('users:read'), userController.getUserById);

// Create new user (admin only)
router.post('/', authorize('users:create'), userController.createUser);

// Update user (admin only)
router.put('/:id', authorize('users:update'), userController.updateUser);

// Delete user (admin only)
router.delete('/:id', authorize('users:delete'), userController.deleteUser);

// Toggle user status (admin only)
router.patch('/:id/status', authorize('users:update'), userController.toggleStatus);

// Assign role to user (admin only)
router.post('/:id/roles', authorize('users:update'), userController.assignRole);

// Remove role from user (admin only)
router.delete('/:id/roles/:roleId', authorize('users:update'), userController.removeRole);

// Reset user password (admin only)
router.post('/:id/reset-password', authorize('users:update'), userController.resetPassword);

export default router;
