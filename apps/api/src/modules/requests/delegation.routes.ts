/**
 * Delegation Routes
 * API routes for delegation management
 */

import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as controller from './approval-chain.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/delegations
 * @desc Create delegation
 * @access Private
 */
router.post('/', requireRoles('ADMIN', 'ORG_ADMIN', 'MANAGER'), asyncHandler(controller.createDelegation));

/**
 * @route POST /api/v1/delegations/:id/approve
 * @desc Approve delegation
 * @access Private
 */
router.post('/:id/approve', requireRoles('ADMIN', 'ORG_ADMIN'), asyncHandler(controller.approveDelegation));

/**
 * @route POST /api/v1/delegations/:id/reject
 * @desc Reject delegation
 * @access Private
 */
router.post('/:id/reject', requireRoles('ADMIN', 'ORG_ADMIN'), asyncHandler(controller.rejectDelegation));

/**
 * @route GET /api/v1/delegations
 * @desc List delegations
 * @access Private
 */
router.get('/', asyncHandler(controller.listDelegations));

/**
 * @route DELETE /api/v1/delegations/:id
 * @desc Cancel delegation
 * @access Private
 */
router.delete('/:id', requireRoles('ADMIN', 'ORG_ADMIN', 'MANAGER'), asyncHandler(controller.cancelDelegation));

export default router;
