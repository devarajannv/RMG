/**
 * Approval Chain Routes
 * API routes for approval chain management
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as controller from './approval-chain.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Approval Chain CRUD
// ============================================================================

/**
 * @route POST /api/v1/approval-chains
 * @desc Create approval chain
 * @access Private (Admin)
 */
router.post('/', asyncHandler(controller.createApprovalChain));

/**
 * @route GET /api/v1/approval-chains
 * @desc List approval chains
 * @access Private
 */
router.get('/', asyncHandler(controller.listApprovalChains));

/**
 * @route GET /api/v1/approval-chains/:id
 * @desc Get approval chain
 * @access Private
 */
router.get('/:id', asyncHandler(controller.getApprovalChain));

/**
 * @route PUT /api/v1/approval-chains/:id
 * @desc Update approval chain
 * @access Private (Admin)
 */
router.put('/:id', asyncHandler(controller.updateApprovalChain));

/**
 * @route DELETE /api/v1/approval-chains/:id
 * @desc Delete approval chain
 * @access Private (Admin)
 */
router.delete('/:id', asyncHandler(controller.deleteApprovalChain));

// ============================================================================
// Approval Steps
// ============================================================================

/**
 * @route POST /api/v1/approval-chains/:id/steps
 * @desc Add step to chain
 * @access Private (Admin)
 */
router.post('/:id/steps', asyncHandler(controller.addApprovalStep));

/**
 * @route PUT /api/v1/approval-chains/:id/steps/reorder
 * @desc Reorder steps
 * @access Private (Admin)
 */
router.put('/:id/steps/reorder', asyncHandler(controller.reorderApprovalSteps));

/**
 * @route PUT /api/v1/approval-chains/:chainId/steps/:stepId
 * @desc Update step
 * @access Private (Admin)
 */
router.put('/:chainId/steps/:stepId', asyncHandler(controller.updateApprovalStep));

/**
 * @route DELETE /api/v1/approval-chains/:chainId/steps/:stepId
 * @desc Delete step
 * @access Private (Admin)
 */
router.delete('/:chainId/steps/:stepId', asyncHandler(controller.deleteApprovalStep));

// ============================================================================
// Request Type Assignment
// ============================================================================

/**
 * @route PUT /api/v1/approval-chains/:id/request-types
 * @desc Assign request types
 * @access Private (Admin)
 */
router.put('/:id/request-types', asyncHandler(controller.assignRequestTypes));

export default router;
