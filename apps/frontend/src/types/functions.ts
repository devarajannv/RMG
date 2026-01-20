/**
 * Approval Functions Type Definitions
 * 
 * Types for the approval functions system - "hats" that users can wear
 * for approval authority, separate from organizational structure.
 * 
 * Created: January 20, 2026
 */

// =============================================================================
// Enums
// =============================================================================

export type FunctionCategory = 'APPROVAL' | 'LEADERSHIP';

export type FunctionScopeType = 'TENANT' | 'PRACTICE' | 'PROJECT' | 'DEPARTMENT' | 'TEAM';

export type AssignmentApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type EntityStatus = 'ACTIVE' | 'INACTIVE';

// =============================================================================
// Core Types
// =============================================================================

export interface ApprovalFunction {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category: FunctionCategory;
  scopeType: FunctionScopeType;
  allowMultipleHolders: boolean;
  requiresApproval: boolean;
  canDelegate: boolean;
  maxDelegationDays?: number;
  status: EntityStatus;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  _count?: {
    assignments: number;
    approvalSteps: number;
  };
}

export interface FunctionHolder {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  assignmentId: string;
  isDelegated: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface FunctionAssignment {
  id: string;
  tenantId: string;
  functionId: string;
  function: ApprovalFunction;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  scopeType?: FunctionScopeType;
  scopeEntityId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isDelegated: boolean;
  delegatedFromId?: string;
  delegatedFrom?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  delegationReason?: string;
  approvalStatus: AssignmentApprovalStatus;
  status: EntityStatus;
  assignedById: string;
  assignedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  revokedAt?: string;
  revokedById?: string;
  revocationReason?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Input Types
// =============================================================================

export interface CreateFunctionInput {
  code: string;
  name: string;
  description?: string;
  category?: FunctionCategory;
  scopeType?: FunctionScopeType;
  allowMultipleHolders?: boolean;
  requiresApproval?: boolean;
  canDelegate?: boolean;
  maxDelegationDays?: number;
  sortOrder?: number;
}

export interface UpdateFunctionInput {
  name?: string;
  description?: string;
  category?: FunctionCategory;
  scopeType?: FunctionScopeType;
  allowMultipleHolders?: boolean;
  requiresApproval?: boolean;
  canDelegate?: boolean;
  maxDelegationDays?: number;
  status?: EntityStatus;
  sortOrder?: number;
}

export interface CreateAssignmentInput {
  functionId: string;
  userId: string;
  scopeType?: FunctionScopeType;
  scopeEntityId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface DelegateInput {
  delegateToUserId: string;
  effectiveFrom?: string;
  effectiveTo: string;
  reason?: string;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface FunctionFilters {
  status?: EntityStatus[];
  category?: FunctionCategory[];
  scopeType?: FunctionScopeType[];
  isSystem?: boolean;
  search?: string;
}

export interface AssignmentFilters {
  functionId?: string;
  userId?: string;
  scopeType?: FunctionScopeType;
  scopeEntityId?: string;
  status?: EntityStatus[];
  isDelegated?: boolean;
  activeOnly?: boolean;
}

// =============================================================================
// Response Types
// =============================================================================

export interface FunctionsListResponse {
  success: boolean;
  data: ApprovalFunction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AssignmentsListResponse {
  success: boolean;
  data: FunctionAssignment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FunctionResponse {
  success: boolean;
  data: ApprovalFunction;
}

export interface AssignmentResponse {
  success: boolean;
  data: FunctionAssignment;
}

export interface HoldersResponse {
  success: boolean;
  data: FunctionHolder[];
}

export interface MyAssignmentsResponse {
  success: boolean;
  data: FunctionAssignment[];
}
