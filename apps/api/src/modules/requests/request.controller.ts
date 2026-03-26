/**
 * Request Flow Controller
 * Handles HTTP requests for the request flow system
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../../middleware/errorHandler';
import * as requestService from './request.service';
import { RequestStatus, Priority } from '@prisma/client';
import {
  createRequestSchema,
  updateRequestSchema,
  approveRejectSchema,
  addCommentSchema,
  requestAttachmentParamSchema,
  requestIdParamSchema,
  cancelRequestSchema,
  includeInternalCommentsSchema,
} from './request.schemas';

const invoiceLinkSchema = z.object({
  invoiceReference: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(500).optional(),
  correlationId: z.string().trim().max(100).optional(),
});

const invoiceUnlinkSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  correlationId: z.string().trim().max(100).optional(),
});

// ============================================================================
// Request CRUD
// ============================================================================

/**
 * Create a new request
 * POST /api/v1/requests
 */
export async function createRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const input = createRequestSchema.parse(req.body);

  const request = await requestService.createRequest(tenantId, userId, {
    typeCode: input.typeCode,
    title: input.title,
    description: input.description,
    requestData: input.requestData || {},
    priority: input.priority,
    urgencyJustification: input.urgencyJustification,
    requestedCompletionDate: input.requestedCompletionDate
      ? new Date(input.requestedCompletionDate)
      : undefined,
    onBehalfOfId: input.onBehalfOfId,
    resourceId: input.resourceId,
    projectId: input.projectId,
    allocationId: input.allocationId,
    contractId: input.contractId,
    externalRef: input.externalRef,
    externalUrl: input.externalUrl,
    dependsOnId: input.dependsOnId,
  });

  if (!input.submitForApproval) {
    res.status(201).json({
      success: true,
      data: request,
      message: 'Request created successfully',
      meta: {
        submissionAttempted: false,
        submissionSucceeded: false,
      },
    });
    return;
  }

  try {
    const submittedRequest = await requestService.submitRequest(
      tenantId,
      String(request.id),
      userId
    );

    res.status(201).json({
      success: true,
      data: submittedRequest,
      message: 'Request submitted successfully',
      meta: {
        submissionAttempted: true,
        submissionSucceeded: true,
      },
    });
    return;
  } catch (error) {
    const submissionError = error instanceof ApiError
      ? {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      }
      : {
        message: 'Draft saved, but submission failed. Please open the draft and try again.',
        code: 'SUBMIT_AFTER_CREATE_FAILED',
        statusCode: 500,
      };

    res.status(201).json({
      success: true,
      data: request,
      message: 'Draft saved, but submission failed',
      meta: {
        submissionAttempted: true,
        submissionSucceeded: false,
        submissionError,
      },
    });
    return;
  }
}

/**
 * Get a single request
 * GET /api/v1/requests/:id
 */
export async function getRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  const request = await requestService.getRequest(tenantId, requestId, userId);

  res.json({
    success: true,
    data: request,
  });
}

/**
 * List requests with filters
 * GET /api/v1/requests
 */
export async function listRequests(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  // Parse filters
  const filters: requestService.RequestFilters = {};

  if (req.query.status) {
    filters.status = (Array.isArray(req.query.status)
      ? req.query.status
      : [req.query.status]) as RequestStatus[];
  }

  if (req.query.typeCode) {
    filters.typeCode = Array.isArray(req.query.typeCode)
      ? req.query.typeCode as string[]
      : [req.query.typeCode as string];
  }

  if (req.query.priority) {
    filters.priority = (Array.isArray(req.query.priority)
      ? req.query.priority
      : [req.query.priority]) as Priority[];
  }

  if (req.query.invoiceReference) {
    filters.invoiceReference = req.query.invoiceReference as string;
  }

  if (req.query.requesterId) {
    filters.requesterId = req.query.requesterId as string;
  }

  if (req.query.resourceId) {
    filters.resourceId = req.query.resourceId as string;
  }

  if (req.query.projectId) {
    filters.projectId = req.query.projectId as string;
  }

  if (req.query.submittedAfter) {
    filters.submittedAfter = new Date(req.query.submittedAfter as string);
  }

  if (req.query.submittedBefore) {
    filters.submittedBefore = new Date(req.query.submittedBefore as string);
  }

  if (req.query.isMyPending === 'true') {
    filters.isMyPending = true;
  }

  if (req.query.isMyRequest === 'true') {
    filters.isMyRequest = true;
  }

  // Parse pagination
  const options: requestService.RequestListOptions = {
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    sortBy: (req.query.sortBy as string) || 'createdAt',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    search: req.query.search as string,
  };

  const result = await requestService.listRequests(tenantId, userId, filters, options);

  res.json({
    success: true,
    ...result,
  });
}

/**
 * Update a request
 * PUT /api/v1/requests/:id
 */
export async function updateRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;
  const input = updateRequestSchema.parse(req.body);

  const request = await requestService.updateRequest(tenantId, requestId, userId, {
    title: input.title,
    description: input.description,
    requestData: input.requestData,
    priority: input.priority,
    urgencyJustification: input.urgencyJustification,
    requestedCompletionDate: input.requestedCompletionDate
      ? new Date(input.requestedCompletionDate)
      : undefined,
    externalRef: input.externalRef,
    externalUrl: input.externalUrl,
  });

  res.json({
    success: true,
    data: request,
    message: 'Request updated successfully',
  });
}

/**
 * Delete a request (soft delete)
 * DELETE /api/v1/requests/:id
 */
export async function deleteRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  await requestService.deleteRequest(tenantId, requestId, userId);

  res.json({
    success: true,
    message: 'Request deleted successfully',
  });
}

// ============================================================================
// Workflow Actions
// ============================================================================

/**
 * Submit a request for approval
 * POST /api/v1/requests/:id/submit
 */
export async function submitRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  const request = await requestService.submitRequest(tenantId, requestId, userId);

  res.json({
    success: true,
    data: request,
    message: 'Request submitted successfully',
  });
}

/**
 * Approve a request
 * POST /api/v1/requests/:id/approve
 */
export async function approveRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  const request = await requestService.approveRequest(tenantId, requestId, userId, {
    comments: approveRejectSchema.parse(req.body).comments,
  });

  res.json({
    success: true,
    data: request,
    message: 'Request approved successfully',
  });
}

/**
 * Reject a request
 * POST /api/v1/requests/:id/reject
 */
export async function rejectRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  const request = await requestService.rejectRequest(tenantId, requestId, userId, {
    comments: approveRejectSchema.parse(req.body).comments,
  });

  res.json({
    success: true,
    data: request,
    message: 'Request rejected',
  });
}

/**
 * Return a request for revision
 * POST /api/v1/requests/:id/return
 */
export async function returnRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;
  const input = approveRejectSchema.parse(req.body);

  const request = await requestService.returnRequest(tenantId, requestId, userId, {
    comments: input.comments,
  });

  res.json({
    success: true,
    data: request,
    message: 'Request returned for revision',
  });
}

/**
 * Cancel a request
 * POST /api/v1/requests/:id/cancel
 */
export async function cancelRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;
  const input = cancelRequestSchema.parse(req.body);

  const request = await requestService.cancelRequest(tenantId, requestId, userId, input.reason);

  res.json({
    success: true,
    data: request,
    message: 'Request cancelled',
  });
}

/**
 * Link request to invoice reference
 * POST /api/v1/requests/:id/invoice-link
 */
export async function linkRequestInvoice(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  const input = invoiceLinkSchema.parse(req.body);
  const request = await requestService.linkRequestToInvoice(tenantId, requestId, userId, input);

  res.json({
    success: true,
    data: request,
    message: 'Request linked to invoice successfully',
  });
}

/**
 * Unlink request from invoice reference
 * DELETE /api/v1/requests/:id/invoice-link
 */
export async function unlinkRequestInvoice(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  const input = invoiceUnlinkSchema.parse(req.body ?? {});
  const request = await requestService.unlinkRequestFromInvoice(tenantId, requestId, userId, input);

  res.json({
    success: true,
    data: request,
    message: 'Request invoice linkage removed successfully',
  });
}

// ============================================================================
// Comments
// ============================================================================

/**
 * Add a comment to a request
 * POST /api/v1/requests/:id/comments
 */
export async function addComment(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;
  const input = addCommentSchema.parse(req.body);

  const comment = await requestService.addComment(
    tenantId,
    requestId,
    userId,
    input.content,
    input.isInternal || false,
    input.parentId
  );

  res.status(201).json({
    success: true,
    data: comment,
    message: 'Comment added successfully',
  });
}

/**
 * Get comments for a request
 * GET /api/v1/requests/:id/comments
 */
export async function getComments(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  // TODO: Check if user is approver to show internal comments
  const includeInternal = includeInternalCommentsSchema.parse(req.query).includeInternal === 'true';

  const comments = await requestService.getComments(tenantId, requestId, userId, includeInternal);

  res.json({
    success: true,
    data: comments,
  });
}

/**
 * Upload an attachment to a request
 * POST /api/v1/requests/:id/attachments
 */
export async function uploadAttachment(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;

  if (!req.file) {
    throw new ApiError('No file uploaded', 400, 'FILE_REQUIRED');
  }

  const attachment = await requestService.addAttachment(tenantId, requestId, userId, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname,
    size: req.file.size,
  });

  res.status(201).json({
    success: true,
    data: attachment,
    message: 'Attachment uploaded successfully',
  });
}

/**
 * Download a request attachment
 * GET /api/v1/requests/:id/attachments/:attachmentId/download
 */
export async function downloadAttachment(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id: requestId, attachmentId } = requestAttachmentParamSchema.parse(req.params);

  const file = await requestService.downloadAttachment(tenantId, requestId, attachmentId, userId);
  const safeFileName = file.filename.replace(/"/g, '');

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
  res.send(file.buffer);
}

// ============================================================================
// Dashboard & Stats
// ============================================================================

/**
 * Get request dashboard statistics
 * GET /api/v1/requests/dashboard
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const stats = await requestService.getDashboardStats(tenantId, userId);

  res.json({
    success: true,
    data: stats,
  });
}

/**
 * Get pending approvals for current user
 * GET /api/v1/requests/pending-approvals
 */
export async function getPendingApprovals(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const options: requestService.RequestListOptions = {
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
  };

  const result = await requestService.getPendingApprovals(tenantId, userId, options);

  res.json({
    success: true,
    ...result,
  });
}

/**
 * Get current user's requests
 * GET /api/v1/requests/my-requests
 */
export async function getMyRequests(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const filters: requestService.RequestFilters = {
    isMyRequest: true,
  };

  if (req.query.status) {
    filters.status = (Array.isArray(req.query.status)
      ? req.query.status
      : [req.query.status]) as RequestStatus[];
  }

  const options: requestService.RequestListOptions = {
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    sortBy: (req.query.sortBy as string) || 'createdAt',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
  };

  const result = await requestService.listRequests(tenantId, userId, filters, options);

  res.json({
    success: true,
    ...result,
  });
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * List available request types
 * GET /api/v1/request-types
 */
export async function listRequestTypes(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;

  const types = await requestService.listRequestTypes(tenantId);

  res.json({
    success: true,
    data: types,
  });
}

/**
 * Get a single request type
 * GET /api/v1/request-types/:code
 */
export async function getRequestType(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const code = req.params.code;

  const type = await requestService.getRequestType(code, tenantId);

  if (!type) {
    throw new ApiError('Request type not found', 404, 'REQUEST_TYPE_NOT_FOUND');
  }

  res.json({
    success: true,
    data: type,
  });
}

// ============================================================================
// History
// ============================================================================

/**
 * Get request history
 * GET /api/v1/requests/:id/history
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = requestIdParamSchema.parse(req.params).id;
  const mode = (req.query.mode as string | undefined) === 'current-state' ? 'current-state' : 'as-was';

  // Use getRequest to check access and include history
  const request = await requestService.getRequest(tenantId, requestId, userId) as { history: unknown[] };

  res.json({
    success: true,
    data: request.history || [],
    meta: {
      mode,
      defaultMode: 'as-was',
    },
  });
}
