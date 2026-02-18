/**
 * Request Types Routes
 * API routes for request type management
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import * as controller from './request-types.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Request Type Templates (placed before parameterized routes)
// ============================================================================

/**
 * @route GET /api/v1/request-types/templates
 * @desc List available request type templates
 * @access Private (request-templates:read)
 */
router.get('/templates', requirePermission('request-templates:read'), asyncHandler(controller.listTemplates));

/**
 * @route GET /api/v1/request-types/templates/:id
 * @desc Get a single template
 * @access Private (request-templates:read)
 */
router.get('/templates/:id', requirePermission('request-templates:read'), asyncHandler(controller.getTemplate));

/**
 * @route POST /api/v1/request-types/templates/:id/import
 * @desc Import a template to create request types and workflows
 * @access Private (request-templates:import)
 */
router.post('/templates/:id/import', requirePermission('request-templates:import'), asyncHandler(controller.importTemplate));

// ============================================================================
// Request Type CRUD
// ============================================================================

/**
 * @route GET /api/v1/request-types
 * @desc List available request types (system + tenant)
 * @access Private (request-types:read)
 */
router.get('/', requirePermission('request-types:read'), asyncHandler(controller.listRequestTypes));

/**
 * @route GET /api/v1/request-types/:id
 * @desc Get a single request type by ID
 * @access Private (request-types:read)
 */
router.get('/:id', requirePermission('request-types:read'), asyncHandler(controller.getRequestType));

/**
 * @route POST /api/v1/request-types
 * @desc Create a new tenant-specific request type
 * @access Private (request-types:create)
 */
router.post('/', requirePermission('request-types:create'), asyncHandler(controller.createRequestType));

/**
 * @route PUT /api/v1/request-types/:id
 * @desc Update a tenant-specific request type
 * @access Private (request-types:update)
 */
router.put('/:id', requirePermission('request-types:update'), asyncHandler(controller.updateRequestType));

/**
 * @route DELETE /api/v1/request-types/:id
 * @desc Delete a tenant-specific request type
 * @access Private (request-types:delete)
 */
router.delete('/:id', requirePermission('request-types:delete'), asyncHandler(controller.deleteRequestType));

/**
 * @route POST /api/v1/request-types/:id/clone
 * @desc Clone a request type (system or tenant) to create a new tenant-specific version
 * @access Private (request-types:clone)
 */
router.post('/:id/clone', requirePermission('request-types:clone'), asyncHandler(controller.cloneRequestType));

/**
 * @route PUT /api/v1/request-types/:id/workflow
 * @desc Assign or update the workflow for a request type
 * @access Private (request-types:update)
 */
router.put('/:id/workflow', requirePermission('request-types:update'), asyncHandler(controller.assignWorkflow));

export default router;
