/**
 * Request Flow Routes
 * API routes for the request flow system
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as controller from './request.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Dashboard Routes (before :id params to avoid conflicts)
// ============================================================================

/**
 * @route GET /api/v1/requests/dashboard
 * @desc Get dashboard statistics
 * @access Private
 */
router.get('/dashboard', asyncHandler(controller.getDashboard));

/**
 * @route GET /api/v1/requests/pending-approvals
 * @desc Get pending approvals for current user
 * @access Private
 */
router.get('/pending-approvals', asyncHandler(controller.getPendingApprovals));

/**
 * @route GET /api/v1/requests/my-requests
 * @desc Get current user's requests
 * @access Private
 */
router.get('/my-requests', asyncHandler(controller.getMyRequests));

// ============================================================================
// Request CRUD Routes
// ============================================================================

/**
 * @route POST /api/v1/requests
 * @desc Create a new request
 * @access Private
 */
router.post('/', asyncHandler(controller.createRequest));

/**
 * @route GET /api/v1/requests
 * @desc List requests with filters
 * @access Private
 */
router.get('/', asyncHandler(controller.listRequests));

/**
 * @route GET /api/v1/requests/:id
 * @desc Get a single request
 * @access Private
 */
router.get('/:id', asyncHandler(controller.getRequest));

/**
 * @route PUT /api/v1/requests/:id
 * @desc Update a request
 * @access Private
 */
router.put('/:id', asyncHandler(controller.updateRequest));

/**
 * @route DELETE /api/v1/requests/:id
 * @desc Delete a request (soft delete)
 * @access Private
 */
router.delete('/:id', asyncHandler(controller.deleteRequest));

// ============================================================================
// Workflow Action Routes
// ============================================================================

/**
 * @route POST /api/v1/requests/:id/submit
 * @desc Submit request for approval
 * @access Private
 */
router.post('/:id/submit', asyncHandler(controller.submitRequest));

/**
 * @route POST /api/v1/requests/:id/approve
 * @desc Approve a request
 * @access Private
 */
router.post('/:id/approve', asyncHandler(controller.approveRequest));

/**
 * @route POST /api/v1/requests/:id/reject
 * @desc Reject a request
 * @access Private
 */
router.post('/:id/reject', asyncHandler(controller.rejectRequest));

/**
 * @route POST /api/v1/requests/:id/return
 * @desc Return request for revision
 * @access Private
 */
router.post('/:id/return', asyncHandler(controller.returnRequest));

/**
 * @route POST /api/v1/requests/:id/cancel
 * @desc Cancel a request
 * @access Private
 */
router.post('/:id/cancel', asyncHandler(controller.cancelRequest));

// ============================================================================
// Comment Routes
// ============================================================================

/**
 * @route POST /api/v1/requests/:id/comments
 * @desc Add a comment to a request
 * @access Private
 */
router.post('/:id/comments', asyncHandler(controller.addComment));

/**
 * @route GET /api/v1/requests/:id/comments
 * @desc Get comments for a request
 * @access Private
 */
router.get('/:id/comments', asyncHandler(controller.getComments));

// ============================================================================
// History Routes
// ============================================================================

/**
 * @route GET /api/v1/requests/:id/history
 * @desc Get request history
 * @access Private
 */
router.get('/:id/history', asyncHandler(controller.getHistory));

export default router;
