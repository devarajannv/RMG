/**
 * Approval Chain Zod Schemas
 * Input validation for approval chain endpoints
 */

import { z } from 'zod';

const approvalStepSchema = z.object({
  name: z.string().min(1).max(200),
  instructions: z.string().max(2000).optional(),
  stepOrder: z.number().int().min(0),
  approverType: z.enum(['FUNCTION', 'ROLE', 'USER', 'MANAGER', 'RESOURCE_MANAGER', 'PRACTICE_HEAD', 'PROJECT_MANAGER', 'CONTRACT_OWNER', 'CUSTOM']),
  approverRoleId: z.string().uuid().optional().nullable(),
  approverUserId: z.string().uuid().optional().nullable(),
  practiceSource: z.string().max(100).optional().nullable(),
  roleAssignmentMode: z.string().max(50).optional().nullable(),
  fallbackType: z.string().max(50).optional().nullable(),
  fallbackRoleId: z.string().uuid().optional().nullable(),
  fallbackUserId: z.string().uuid().optional().nullable(),
  skipIfUnresolvable: z.boolean().optional(),
  approvalMode: z.string().max(50).optional().nullable(),
  onConflict: z.string().max(50).optional().nullable(),
  isOptional: z.boolean().optional(),
  canDelegate: z.boolean().optional(),
  skipCondition: z.string().max(500).optional().nullable(),
  autoApproveAfterHours: z.number().int().min(0).optional().nullable(),
  autoApproveCondition: z.string().max(500).optional().nullable(),
  slaHours: z.number().int().min(0).optional().nullable(),
  escalateAfterHours: z.number().int().min(0).optional().nullable(),
  escalateToType: z.string().max(50).optional().nullable(),
  escalateToRoleId: z.string().uuid().optional().nullable(),
  escalateToUserId: z.string().uuid().optional().nullable(),
  reminderAfterHours: z.number().int().min(0).optional().nullable(),
  reminderIntervalHours: z.number().int().min(0).optional().nullable(),
  maxReminders: z.number().int().min(0).optional().nullable(),
}).strict();

export const createApprovalChainSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  scope: z.enum(['TENANT', 'PRACTICE', 'PROJECT']).default('TENANT'),
  practiceId: z.string().uuid().optional().nullable(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
  steps: z.array(approvalStepSchema).min(1),
}).strict();

export const updateApprovalChainSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  scope: z.enum(['TENANT', 'PRACTICE', 'PROJECT']).optional(),
  practiceId: z.string().uuid().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
}).strict();

export const addApprovalStepSchema = approvalStepSchema;

export const updateApprovalStepSchema = approvalStepSchema.partial();

export const assignRequestTypesSchema = z.object({
  requestTypeIds: z.array(z.string().uuid()).min(1),
}).strict();

export const reorderStepsSchema = z.object({
  steps: z.array(z.object({
    stepId: z.string().uuid(),
    stepOrder: z.number().int().min(0),
  })).min(1),
}).strict();

export const createDelegationSchema = z.object({
  delegateId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(2000).optional(),
  requestTypeIds: z.array(z.string().uuid()).optional(),
}).strict();

export const approveDelegationSchema = z.object({
  notes: z.string().max(2000).optional(),
}).strict();

export const rejectDelegationSchema = z.object({
  reason: z.string().min(1).max(2000),
}).strict();
