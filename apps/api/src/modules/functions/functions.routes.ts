/**
 * Approval Functions Routes
 * 
 * Defines REST API routes for approval function management.
 * 
 * Created: January 20, 2026
 */

import { Router } from 'express';
import * as controller from './functions.controller';
import { authenticate, requireRoles } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =============================================================================
// APPROVAL FUNCTION ROUTES
// =============================================================================

/**
 * @route   GET /api/functions/my-assignments
 * @desc    Get current user's function assignments
 * @access  Authenticated
 */
router.get('/my-assignments', controller.getMyAssignments);

/**
 * @route   GET /api/functions
 * @desc    List all approval functions
 * @access  Authenticated
 */
router.get('/', controller.listApprovalFunctions);

/**
 * @route   POST /api/functions
 * @desc    Create a new approval function
 * @access  Admin, Org Admin
 */
router.post('/', requireRoles('ADMIN', 'ORG_ADMIN'), controller.createApprovalFunction);

/**
 * @route   GET /api/functions/:functionId
 * @desc    Get approval function by ID
 * @access  Authenticated
 */
router.get('/:functionId', controller.getApprovalFunction);

/**
 * @route   PATCH /api/functions/:functionId
 * @desc    Update approval function
 * @access  Admin, Org Admin
 */
router.patch('/:functionId', requireRoles('ADMIN', 'ORG_ADMIN'), controller.updateApprovalFunction);

/**
 * @route   DELETE /api/functions/:functionId
 * @desc    Delete approval function
 * @access  Admin
 */
router.delete('/:functionId', requireRoles('ADMIN'), controller.deleteApprovalFunction);

/**
 * @route   GET /api/functions/:functionId/holders
 * @desc    Get all users holding a function
 * @access  Authenticated
 */
router.get('/:functionId/holders', controller.getFunctionHolders);

/**
 * @route   POST /api/functions/:functionId/assignments
 * @desc    Assign function to a user
 * @access  Admin, Org Admin
 */
router.post('/:functionId/assignments', requireRoles('ADMIN', 'ORG_ADMIN'), controller.createAssignment);

/**
 * @route   GET /api/functions/:functionId/assignments
 * @desc    List assignments for a function
 * @access  Authenticated
 */
router.get('/:functionId/assignments', controller.listFunctionAssignments);

/**
 * @route   GET /api/functions/:functionCode/check-holder
 * @desc    Check if a user holds a function
 * @access  Authenticated
 */
router.get('/:functionCode/check-holder', controller.checkFunctionHolder);

export default router;
