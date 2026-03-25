/**
 * Functions Zod Schemas
 * Input validation for approval functions and assignments
 */

import { z } from 'zod';

export const createApprovalFunctionSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(['APPROVAL', 'MANAGEMENT', 'FINANCIAL', 'ADMINISTRATIVE', 'CUSTOM']),
  scopeType: z.enum(['TENANT', 'PRACTICE', 'DEPARTMENT', 'PROJECT', 'TEAM']),
  allowMultipleHolders: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  canDelegate: z.boolean().optional(),
  maxDelegationDays: z.number().int().min(1).max(365).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
}).strict();

export const updateApprovalFunctionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(['APPROVAL', 'MANAGEMENT', 'FINANCIAL', 'ADMINISTRATIVE', 'CUSTOM']).optional(),
  scopeType: z.enum(['TENANT', 'PRACTICE', 'DEPARTMENT', 'PROJECT', 'TEAM']).optional(),
  allowMultipleHolders: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  canDelegate: z.boolean().optional(),
  maxDelegationDays: z.number().int().min(1).max(365).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict();

export const createAssignmentSchema = z.object({
  userId: z.string().uuid(),
  scopeType: z.enum(['TENANT', 'PRACTICE', 'DEPARTMENT', 'PROJECT', 'TEAM']).optional(),
  scopeEntityId: z.string().uuid().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
}).strict();

export const delegateAssignmentSchema = z.object({
  delegateUserId: z.string().uuid(),
  effectiveTo: z.string().datetime(),
  reason: z.string().max(2000).optional(),
}).strict();

export const revokeAssignmentSchema = z.object({
  reason: z.string().max(2000).optional(),
}).strict();
