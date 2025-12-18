/**
 * Request Types Routes
 * API routes for request type management
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as controller from './request.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/request-types
 * @desc List available request types
 * @access Private
 */
router.get('/', asyncHandler(controller.listRequestTypes));

/**
 * @route GET /api/v1/request-types/:code
 * @desc Get a single request type
 * @access Private
 */
router.get('/:code', asyncHandler(controller.getRequestType));

export default router;
