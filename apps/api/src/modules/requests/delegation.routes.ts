/**
 * Delegation Routes
 * API routes for delegation management
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
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
router.post('/', asyncHandler(controller.createDelegation));

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
router.delete('/:id', asyncHandler(controller.cancelDelegation));

export default router;
