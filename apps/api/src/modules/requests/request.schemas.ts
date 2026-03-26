/**
 * Request Flow Zod Schemas
 * Input validation for request flow endpoints
 */

import { z } from 'zod';

export const createRequestSchema = z.object({
  typeCode: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  requestData: z.record(z.unknown()).optional(),
  submitForApproval: z.boolean().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  urgencyJustification: z.string().max(1000).optional(),
  requestedCompletionDate: z.string().datetime().optional(),
  onBehalfOfId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  allocationId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  externalRef: z.string().max(200).optional(),
  externalUrl: z.string().url().max(2000).optional(),
  dependsOnId: z.string().uuid().optional(),
}).strict();

export const updateRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  requestData: z.record(z.unknown()).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  urgencyJustification: z.string().max(1000).optional(),
  requestedCompletionDate: z.string().datetime().optional(),
  externalRef: z.string().max(200).optional(),
  externalUrl: z.string().url().max(2000).optional(),
}).strict();

export const approveRejectSchema = z.object({
  comments: z.string().max(2000).optional(),
}).strict();

export const addCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
  parentId: z.string().uuid().optional(),
}).strict();

export const requestIdParamSchema = z.object({
  id: z.string().uuid(),
}).strict();

export const requestAttachmentParamSchema = z.object({
  id: z.string().uuid(),
  attachmentId: z.string().uuid(),
}).strict();

export const cancelRequestSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
}).strict();

export const includeInternalCommentsSchema = z.object({
  includeInternal: z.union([z.literal('true'), z.literal('false')]).optional(),
}).strict();

export const listRequestsSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  typeCode: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).strict();
