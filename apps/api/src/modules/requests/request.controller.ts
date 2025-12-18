/**
 * Request Flow Controller
 * Handles HTTP requests for the request flow system
 */

import { Request, Response } from 'express';
import { ApiError } from '../../middleware/errorHandler';
import * as requestService from './request.service';
import { RequestStatus, Priority } from '@prisma/client';

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

  const request = await requestService.createRequest(tenantId, userId, {
    typeCode: req.body.typeCode,
    title: req.body.title,
    description: req.body.description,
    requestData: req.body.requestData,
    priority: req.body.priority,
    urgencyJustification: req.body.urgencyJustification,
    requestedCompletionDate: req.body.requestedCompletionDate
      ? new Date(req.body.requestedCompletionDate)
      : undefined,
    onBehalfOfId: req.body.onBehalfOfId,
    resourceId: req.body.resourceId,
    projectId: req.body.projectId,
    allocationId: req.body.allocationId,
    contractId: req.body.contractId,
    externalRef: req.body.externalRef,
    externalUrl: req.body.externalUrl,
    dependsOnId: req.body.dependsOnId,
  });

  res.status(201).json({
    success: true,
    data: request,
    message: 'Request created successfully',
  });
}

/**
 * Get a single request
 * GET /api/v1/requests/:id
 */
export async function getRequest(req: Request, res: Response): Promise<void> {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = req.params.id;

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
  const requestId = req.params.id;

  const request = await requestService.updateRequest(tenantId, requestId, userId, {
    title: req.body.title,
    description: req.body.description,
    requestData: req.body.requestData,
    priority: req.body.priority,
    urgencyJustification: req.body.urgencyJustification,
    requestedCompletionDate: req.body.requestedCompletionDate
      ? new Date(req.body.requestedCompletionDate)
      : undefined,
    externalRef: req.body.externalRef,
    externalUrl: req.body.externalUrl,
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
  const requestId = req.params.id;

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
  const requestId = req.params.id;

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
  const requestId = req.params.id;

  const request = await requestService.approveRequest(tenantId, requestId, userId, {
    comments: req.body.comments,
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
  const requestId = req.params.id;

  const request = await requestService.rejectRequest(tenantId, requestId, userId, {
    comments: req.body.comments,
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
  const requestId = req.params.id;

  const request = await requestService.returnRequest(tenantId, requestId, userId, {
    comments: req.body.comments,
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
  const requestId = req.params.id;

  if (!req.body.reason) {
    throw new ApiError('Cancellation reason is required', 400, 'REASON_REQUIRED');
  }

  const request = await requestService.cancelRequest(tenantId, requestId, userId, req.body.reason);

  res.json({
    success: true,
    data: request,
    message: 'Request cancelled',
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
  const requestId = req.params.id;

  if (!req.body.content) {
    throw new ApiError('Comment content is required', 400, 'CONTENT_REQUIRED');
  }

  const comment = await requestService.addComment(
    tenantId,
    requestId,
    userId,
    req.body.content,
    req.body.isInternal || false,
    req.body.parentId
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
  const requestId = req.params.id;

  // TODO: Check if user is approver to show internal comments
  const includeInternal = req.query.includeInternal === 'true';

  const comments = await requestService.getComments(tenantId, requestId, userId, includeInternal);

  res.json({
    success: true,
    data: comments,
  });
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
  const requestId = req.params.id;

  // Use getRequest to check access and include history
  const request = await requestService.getRequest(tenantId, requestId, userId) as { history: unknown[] };

  res.json({
    success: true,
    data: request.history || [],
  });
}
