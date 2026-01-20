/**
 * Request Types API Types
 *
 * Type definitions for request type management.
 *
 * Created: January 20, 2026
 */

// =============================================================================
// Enums
// =============================================================================

export type RequestCategory =
  | 'CHANGE'
  | 'INCIDENT'
  | 'SERVICE_REQUEST'
  | 'PROBLEM'
  | 'ACCESS_REQUEST'
  | 'PROJECT_REQUEST';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SlaCalculationType = 'BUSINESS_HOURS' | 'CALENDAR_HOURS';

export type RequestVisibility = 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL';

export type RollbackPermission = 'REQUESTER' | 'APPROVER' | 'ADMIN_ONLY';

// =============================================================================
// Core Types
// =============================================================================

export interface RequestType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: RequestCategory;
  icon?: string | null;
  defaultPriority: Priority;
  requiresApproval: boolean;
  slaHours?: number | null;
  slaCalculationType: SlaCalculationType;
  autoAssign: boolean;
  visibility: RequestVisibility;
  rollbackPermission: RollbackPermission;
  isSystemType: boolean;
  isActive: boolean;
  tenantId?: string | null;
  clonedFromId?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, depending on include)
  tenant?: {
    id: string;
    name: string;
  } | null;
  clonedFrom?: {
    id: string;
    code: string;
    name: string;
  } | null;
  _count?: {
    requests: number;
    clones: number;
  };
}

export interface RequestTypeTemplate {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  requestTypes: TemplateRequestType[];
  workflows: TemplateWorkflow[];
  bindings: TemplateBinding[];
  version: string;
  isActive: boolean;
  usageCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRequestType {
  code: string;
  name: string;
  description?: string;
  category: RequestCategory;
  defaultPriority: Priority;
  requiresApproval: boolean;
  slaHours?: number;
  slaCalculationType: SlaCalculationType;
  autoAssign: boolean;
  visibility: RequestVisibility;
  rollbackPermission: RollbackPermission;
}

export interface TemplateWorkflow {
  code: string;
  name: string;
  description?: string;
  steps: TemplateWorkflowStep[];
}

export interface TemplateWorkflowStep {
  order: number;
  name: string;
  stepType: string;
  functionCode: string;
  isConditional: boolean;
}

export interface TemplateBinding {
  requestTypeCode: string;
  workflowCode: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface RequestTypesListResponse {
  data: RequestType[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RequestTypeResponse {
  data: RequestType;
}

export interface TemplatesListResponse {
  data: RequestTypeTemplate[];
}

export interface TemplateResponse {
  data: RequestTypeTemplate;
}

export interface ImportTemplateResponse {
  data: {
    message: string;
    requestTypesCreated: number;
    workflowsCreated: number;
    bindingsCreated: number;
  };
}

// =============================================================================
// Input Types
// =============================================================================

export interface CreateRequestTypeInput {
  code: string;
  name: string;
  description?: string;
  category: RequestCategory;
  icon?: string;
  defaultPriority?: Priority;
  requiresApproval?: boolean;
  slaHours?: number;
  slaCalculationType?: SlaCalculationType;
  autoAssign?: boolean;
  visibility?: RequestVisibility;
  rollbackPermission?: RollbackPermission;
}

export interface UpdateRequestTypeInput {
  name?: string;
  description?: string;
  category?: RequestCategory;
  icon?: string;
  defaultPriority?: Priority;
  requiresApproval?: boolean;
  slaHours?: number;
  slaCalculationType?: SlaCalculationType;
  autoAssign?: boolean;
  visibility?: RequestVisibility;
  rollbackPermission?: RollbackPermission;
  isActive?: boolean;
}

export interface CloneRequestTypeInput {
  newCode: string;
  newName?: string;
}

export interface AssignWorkflowInput {
  approvalChainId: string;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface RequestTypeFilters {
  category?: RequestCategory[];
  isSystemType?: boolean;
  isActive?: boolean;
  search?: string;
}
