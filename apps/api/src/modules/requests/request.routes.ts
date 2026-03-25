/**
 * Request Flow Routes
 * API routes for the request flow system
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as controller from './request.controller';

const router = Router();

const ALLOWED_ATTACHMENT_MIME_TYPES = [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'text/plain',
	'text/csv',
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'application/zip',
	'application/x-zip-compressed',
];

const ALLOWED_ATTACHMENT_EXTENSIONS = [
	'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
	'.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.zip',
];

const attachmentUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 50 * 1024 * 1024,
	},
	fileFilter: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		if (ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype) && ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
			cb(null, true);
			return;
		}

		cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ')}`));
	},
});

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
router.get('/dashboard', authorize('request:read'), asyncHandler(controller.getDashboard));

/**
 * @route GET /api/v1/requests/pending-approvals
 * @desc Get pending approvals for current user
 * @access Private
 */
router.get('/pending-approvals', authorize('request:read'), asyncHandler(controller.getPendingApprovals));

/**
 * @route GET /api/v1/requests/my-requests
 * @desc Get current user's requests
 * @access Private
 */
router.get('/my-requests', authorize('request:read'), asyncHandler(controller.getMyRequests));

// ============================================================================
// Request CRUD Routes
// ============================================================================

/**
 * @route POST /api/v1/requests
 * @desc Create a new request
 * @access Private
 */
router.post('/', authorize('request:create'), asyncHandler(controller.createRequest));

/**
 * @route GET /api/v1/requests
 * @desc List requests with filters
 * @access Private
 */
router.get('/', authorize('request:read'), asyncHandler(controller.listRequests));

/**
 * @route GET /api/v1/requests/:id
 * @desc Get a single request
 * @access Private
 */
router.get('/:id', authorize('request:read'), asyncHandler(controller.getRequest));

/**
 * @route PUT /api/v1/requests/:id
 * @desc Update a request
 * @access Private
 */
router.put('/:id', authorize('request:update'), asyncHandler(controller.updateRequest));

/**
 * @route DELETE /api/v1/requests/:id
 * @desc Delete a request (soft delete)
 * @access Private
 */
router.delete('/:id', authorize('request:delete'), asyncHandler(controller.deleteRequest));

// ============================================================================
// Workflow Action Routes
// ============================================================================

/**
 * @route POST /api/v1/requests/:id/submit
 * @desc Submit request for approval
 * @access Private
 */
router.post('/:id/submit', authorize('request:create'), asyncHandler(controller.submitRequest));

/**
 * @route POST /api/v1/requests/:id/approve
 * @desc Approve a request
 * @access Private
 */
router.post('/:id/approve', authorize('request:approve'), asyncHandler(controller.approveRequest));

/**
 * @route POST /api/v1/requests/:id/reject
 * @desc Reject a request
 * @access Private
 */
router.post('/:id/reject', authorize('request:approve'), asyncHandler(controller.rejectRequest));

/**
 * @route POST /api/v1/requests/:id/return
 * @desc Return request for revision
 * @access Private
 */
router.post('/:id/return', authorize('request:approve'), asyncHandler(controller.returnRequest));

/**
 * @route POST /api/v1/requests/:id/cancel
 * @desc Cancel a request
 * @access Private
 */
router.post('/:id/cancel', authorize('request:create'), asyncHandler(controller.cancelRequest));

/**
 * @route POST /api/v1/requests/:id/invoice-link
 * @desc Link request to invoice reference
 * @access Private
 */
router.post('/:id/invoice-link', authorize('request:update'), asyncHandler(controller.linkRequestInvoice));

/**
 * @route DELETE /api/v1/requests/:id/invoice-link
 * @desc Unlink request from invoice reference
 * @access Private
 */
router.delete('/:id/invoice-link', authorize('request:update'), asyncHandler(controller.unlinkRequestInvoice));

// ============================================================================
// Comment Routes
// ============================================================================

/**
 * @route POST /api/v1/requests/:id/comments
 * @desc Add a comment to a request
 * @access Private
 */
router.post('/:id/comments', authorize('request:read'), asyncHandler(controller.addComment));

/**
 * @route GET /api/v1/requests/:id/comments
 * @desc Get comments for a request
 * @access Private
 */
router.get('/:id/comments', authorize('request:read'), asyncHandler(controller.getComments));

// ============================================================================
// Attachment Routes
// ============================================================================

/**
 * @route POST /api/v1/requests/:id/attachments
 * @desc Upload an attachment for a request
 * @access Private
 */
router.post('/:id/attachments', authorize('request:create'), attachmentUpload.single('file'), asyncHandler(controller.uploadAttachment));

/**
 * @route GET /api/v1/requests/:id/attachments/:attachmentId/download
 * @desc Download a request attachment
 * @access Private
 */
router.get('/:id/attachments/:attachmentId/download', authorize('request:read'), asyncHandler(controller.downloadAttachment));

// ============================================================================
// History Routes
// ============================================================================

/**
 * @route GET /api/v1/requests/:id/history
 * @desc Get request history
 * @access Private
 */
router.get('/:id/history', authorize('request:read'), asyncHandler(controller.getHistory));

export default router;
