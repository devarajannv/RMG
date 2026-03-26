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

export type RequestBlueprintDomain =
  | 'PROFESSIONAL_SERVICES'
  | 'INTERNAL_OPERATIONS'
  | 'PEOPLE_OPERATIONS'
  | 'FINANCE'
  | 'OTHER';

export type RequestPackMaturityLevel = 'STARTER' | 'STANDARD' | 'ADVANCED';

export type RequestBlueprintRenderMode = 'MODAL' | 'DRAWER' | 'PAGE' | 'WIZARD';

export type RequestBlueprintComplexityLevel = 'SIMPLE' | 'STANDARD' | 'ADVANCED';

export type RequestBlueprintCommonFieldKey =
  | 'title'
  | 'description'
  | 'priority'
  | 'urgencyJustification'
  | 'neededBy'
  | 'onBehalfOf'
  | 'attachments';

export type RequestBlueprintEntityType =
  | 'client'
  | 'project'
  | 'contract'
  | 'resource'
  | 'allocation'
  | 'user'
  | 'department'
  | 'team'
  | 'costCenter'
  | 'priorRequest';

export type RequestBlueprintCustomFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'DATETIME'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'USER_PICKER';

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

export interface RequestBlueprintCondition {
  left: string;
  op: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'IS_EMPTY' | 'IS_NOT_EMPTY';
  right?: unknown;
}

export interface RequestBlueprintConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Array<RequestBlueprintCondition | RequestBlueprintConditionGroup>;
}

export interface RequestBlueprintValidationRule {
  type: 'MIN_LENGTH' | 'MAX_LENGTH' | 'MIN' | 'MAX' | 'REGEX';
  value: string | number;
  message: string;
}

export interface RequestBlueprintFilterRule {
  field: string;
  op: 'EQUALS' | 'IN' | 'NOT_EQUALS';
  value: unknown;
}

export interface RequestBlueprintResolutionPolicy {
  strategy: 'AUTO_FIRST' | 'PROMPT_ON_AMBIGUITY' | 'MANUAL_ONLY';
  emptyStateMessage?: string;
  multipleMatchMessage?: string;
}

export interface RequestBlueprintOption {
  label: string;
  value: string;
}

export interface RequestBlueprintIdentity {
  code: string;
  name: string;
  description?: string;
  domain: RequestBlueprintDomain;
  category: string;
  icon?: string;
  version: number;
  isSystemBlueprint: boolean;
  packCode?: string;
  maturityLevel: RequestPackMaturityLevel;
}

export interface RequestBlueprintRuntime {
  renderMode: RequestBlueprintRenderMode;
  complexityLevel: RequestBlueprintComplexityLevel;
  allowDraft: boolean;
  allowSubmit: boolean;
  allowEditAfterReturn: boolean;
  allowAttachments: boolean;
  maxAttachments?: number;
  maxAttachmentSizeMb?: number;
}

export interface RequestBlueprintCommonFieldConfig {
  key: RequestBlueprintCommonFieldKey;
  visible: boolean;
  editable: boolean;
  requiredForDraft: boolean;
  requiredForSubmit: boolean;
  label?: string;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
  visibilityCondition?: RequestBlueprintConditionGroup;
  requirementCondition?: RequestBlueprintConditionGroup;
}

export interface RequestBlueprintEntityBindingConfig {
  key: string;
  entityType: RequestBlueprintEntityType;
  label: string;
  visible: boolean;
  editable: boolean;
  selectionMode: 'SINGLE' | 'MULTI';
  requiredForDraft: boolean;
  requiredForSubmit: boolean;
  autoResolve: boolean;
  allowManualSelection: boolean;
  derivedFrom?: string;
  helpText?: string;
  filterRules?: RequestBlueprintFilterRule[];
  resolutionPolicy?: RequestBlueprintResolutionPolicy;
}

export interface RequestBlueprintCustomFieldConfig {
  fieldKey: string;
  label: string;
  type: RequestBlueprintCustomFieldType;
  group?: string;
  displayOrder: number;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  requiredForDraft: boolean;
  requiredForSubmit: boolean;
  options?: RequestBlueprintOption[];
  validation?: RequestBlueprintValidationRule[];
  visibilityCondition?: RequestBlueprintConditionGroup;
  requirementCondition?: RequestBlueprintConditionGroup;
}

export interface RequestBlueprintDependencyRule {
  ruleKey: string;
  dependencyType: 'PRIOR_REQUEST' | 'RELATED_RECORD' | 'CONFIGURATION';
  blockingStage: 'CREATE' | 'SUBMIT';
  message: string;
  requiredRequestTypeCode?: string;
  requiredStatus?: string;
  requiredEntityBindingKey?: string;
  resolutionMode?: 'AUTO_ONLY' | 'AUTO_OR_PICK' | 'USER_MUST_SELECT' | 'HARD_BLOCK';
  autoResolveIfSingle?: boolean;
  promptIfMultiple?: boolean;
}

export interface RequestBlueprintWorkflowPolicy {
  requiresApproval: boolean;
  workflowTemplateCode?: string;
  slaProfileCode?: string;
  defaultPriority?: Priority;
  autoApproveWhenNoChainResolved: boolean;
}

export interface RequestBlueprintOverridePolicy {
  editableSections: Array<
    | 'identity-labels'
    | 'runtime'
    | 'commonFields'
    | 'entityBindings'
    | 'customFields'
    | 'dependencyRules'
    | 'workflowPolicy'
  >;
  lockedKeys?: string[];
  mode: 'PACK_SAFE' | 'STANDARD_EDITABLE' | 'ADVANCED_EDITABLE';
}

export interface RequestBlueprintDefinition {
  schemaVersion: '1.0';
  identity: RequestBlueprintIdentity;
  runtime: RequestBlueprintRuntime;
  commonFields: RequestBlueprintCommonFieldConfig[];
  entityBindings: RequestBlueprintEntityBindingConfig[];
  customFields: RequestBlueprintCustomFieldConfig[];
  dependencyRules: RequestBlueprintDependencyRule[];
  workflowPolicy: RequestBlueprintWorkflowPolicy;
  overridePolicy: RequestBlueprintOverridePolicy;
}

export interface RequestBlueprintPackMembership {
  packCode: string;
  packName: string;
  sortOrder: number;
  isRequired: boolean;
  activation: {
    id: string;
    status: string;
    activatedAt: string;
    activatedByUserId?: string | null;
  } | null;
}

export interface RequestBlueprintRecord {
  id: string;
  code: string;
  schemaVersion: string;
  definition: RequestBlueprintDefinition;
  requestType: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    category: RequestCategory | string;
    defaultPriority: Priority;
    requiresApproval: boolean;
    allowDraft: boolean;
    allowAttachments: boolean;
    visibilityScope: RequestVisibility;
    isSystemType: boolean;
    tenantId?: string | null;
  } | null;
  isActivatedForTenant: boolean;
  packMemberships: RequestBlueprintPackMembership[];
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

export interface RequestBlueprintResponse {
  data: RequestBlueprintRecord;
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
  code?: string;
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
