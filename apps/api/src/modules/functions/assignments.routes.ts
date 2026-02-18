/**
 * Assignments Routes
 * 
 * Separate routes for assignment-specific operations.
 * These are mounted at /api/v1/assignments
 * 
 * Created: January 20, 2026
 */

import { Router } from 'express';
import * as controller from './functions.controller';
import { authenticate, requireRoles } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/assignments/:assignmentId
 * @desc    Get assignment by ID
 * @access  Authenticated
 */
router.get('/:assignmentId', controller.getAssignment);

/**
 * @route   DELETE /api/v1/assignments/:assignmentId
 * @desc    Revoke an assignment
 * @access  Admin, Org Admin
 */
router.delete('/:assignmentId', requireRoles('ADMIN', 'ORG_ADMIN'), controller.revokeAssignment);

/**
 * @route   POST /api/v1/assignments/:assignmentId/delegate
 * @desc    Delegate a function to another user
 * @access  Authenticated (only the holder can delegate)
 */
router.post('/:assignmentId/delegate', controller.delegateAssignment);

export default router;
