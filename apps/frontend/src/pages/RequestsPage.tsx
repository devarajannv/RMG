import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit,
  X,
  ArrowUpRight,
  Calendar,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { PERMISSIONS } from '@/hooks/usePermissions';
import { Can } from '@/components/permissions/Can';
import { useRequestBlueprint } from '@/hooks/useRequestTypes';
import type {
  RequestBlueprintRecord,
  RequestBlueprintCommonFieldConfig,
  RequestBlueprintCondition,
  RequestBlueprintConditionGroup,
  RequestBlueprintCustomFieldConfig,
  RequestBlueprintEntityBindingConfig,
  RequestBlueprintFilterRule,
} from '@/types/request-types';

// ============================================================================
// Types
// ============================================================================

interface Request {
  id: string;
  requestNumber: string;
  typeCode: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'ON_HOLD';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requestData: Record<string, unknown>;
  requestedCompletionDate?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  resource?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  };
  currentApproval?: {
    id: string;
    stepOrder: number;
    status: string;
    approverRole: string;
    assignedTo?: {
      firstName: string;
      lastName: string;
    };
  };
  requestType: {
    code: string;
    name: string;
    category: string;
    icon?: string;
  };
}

interface CreateRequestPayload {
  typeCode: string;
  title: string;
  description?: string;
  submitForApproval?: boolean;
  priority: Request['priority'];
  urgencyJustification?: string;
  requestedCompletionDate?: string;
  onBehalfOfId?: string;
  resourceId?: string;
  projectId?: string;
  contractId?: string;
  dependsOnId?: string;
  requestData: Record<string, unknown>;
}

interface CreateRequestResponse {
  success: boolean;
  data: Request;
  message: string;
  meta?: {
    attachmentUploadAttempted?: boolean;
    attachmentUploadSucceeded?: boolean;
    attachmentUploadError?: {
      message: string;
      code?: string;
      statusCode?: number;
    };
    submissionAttempted: boolean;
    submissionSucceeded: boolean;
    submissionError?: {
      message: string;
      code?: string;
      statusCode?: number;
    };
  };
}

interface CreateRequestSubmission {
  data: CreateRequestPayload;
  action: 'draft' | 'submit';
  attachments: File[];
}

interface RequestType {
  code: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isSystemType?: boolean;
  tenantId?: string | null;
}

interface RequestsResponse {
  data: Request[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface DashboardStats {
  myRequests: {
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  pendingApprovals: number;
  recentRequests: Request[];
}

type RequestFormValue = string | number | boolean | string[] | null;
type EntityLookupSelection = EntityLookupOption | EntityLookupOption[] | null;

interface EntityLookupOption {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  raw?: Record<string, unknown>;
}

interface EntityLookupResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

function normalizeRequestTypeOptions(requestTypes: RequestType[]): RequestType[] {
  const deduped = new Map<string, RequestType>();

  requestTypes.forEach((requestType) => {
    const existing = deduped.get(requestType.code);
    if (!existing) {
      deduped.set(requestType.code, requestType);
      return;
    }

    const existingScore = (existing.tenantId ? 2 : 0) + (existing.isSystemType ? 0 : 1);
    const incomingScore = (requestType.tenantId ? 2 : 0) + (requestType.isSystemType ? 0 : 1);

    if (incomingScore > existingScore) {
      deduped.set(requestType.code, requestType);
    }
  });

  return Array.from(deduped.values()).sort((left, right) => left.name.localeCompare(right.name));
}

interface LookupClientRecord {
  id: string;
  name: string;
  code: string;
  status?: string;
}

interface LookupProjectRecord {
  id: string;
  code: string;
  name: string;
  status?: string;
  client?: LookupClientRecord | null;
}

interface LookupContractRecord {
  id: string;
  contractNumber: string;
  name: string;
  status?: string;
  client?: LookupClientRecord | null;
}

interface LookupResourceRecord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeId?: string;
}

interface LookupDepartmentRecord {
  id: string;
  code: string;
  name: string;
}

interface LookupTeamRecord {
  id: string;
  code: string;
  name: string;
  department?: LookupDepartmentRecord | null;
}

interface LookupCostCenterRecord {
  id: string;
  code: string;
  name: string;
}

interface LookupAllocationRecord {
  id: string;
  role: string;
  percentage: number;
  resource?: LookupResourceRecord | null;
  project?: LookupProjectRecord | null;
}

interface LookupRequestRecord {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  typeCode?: string;
  contractId?: string | null;
  projectId?: string | null;
  requestData?: Record<string, unknown>;
  type?: {
    code: string;
    name: string;
    category?: string;
  };
}

function isConditionGroup(input: RequestBlueprintCondition | RequestBlueprintConditionGroup): input is RequestBlueprintConditionGroup {
  return 'operator' in input;
}

function isValueEmpty(value: unknown): boolean {
  return value === undefined
    || value === null
    || value === ''
    || (Array.isArray(value) && value.length === 0);
}

function evaluateCondition(
  condition: RequestBlueprintCondition,
  context: Record<string, unknown>
): boolean {
  const leftValue = context[condition.left];

  switch (condition.op) {
    case 'EQUALS':
      return leftValue === condition.right;
    case 'NOT_EQUALS':
      return leftValue !== condition.right;
    case 'IN':
      return Array.isArray(condition.right) && condition.right.includes(leftValue);
    case 'NOT_IN':
      return Array.isArray(condition.right) && !condition.right.includes(leftValue);
    case 'IS_EMPTY':
      return isValueEmpty(leftValue);
    case 'IS_NOT_EMPTY':
      return !isValueEmpty(leftValue);
    default:
      return true;
  }
}

function evaluateConditionGroup(
  group: RequestBlueprintConditionGroup | undefined,
  context: Record<string, unknown>
): boolean {
  if (!group) {
    return true;
  }

  const evaluations = group.conditions.map((condition) => {
    if (isConditionGroup(condition)) {
      return evaluateConditionGroup(condition, context);
    }

    return evaluateCondition(condition, context);
  });

  return group.operator === 'AND'
    ? evaluations.every(Boolean)
    : evaluations.some(Boolean);
}

function formatFieldLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function stringifyFieldValue(value: RequestFormValue | undefined): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return value ?? '';
}

function getFileIdentity(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function normalizeApiLikeError(error: unknown): { message: string; code?: string; statusCode?: number } {
  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; code?: unknown; status?: unknown };
    return {
      message: typeof candidate.message === 'string' ? candidate.message : 'Request failed',
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      statusCode: typeof candidate.status === 'number' ? candidate.status : undefined,
    };
  }

  return { message: 'Request failed' };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getContextValue(context: Record<string, unknown>, key: string): unknown {
  if (key in context) {
    return context[key];
  }

  if (key.includes('.')) {
    return key.split('.').reduce<unknown>((current, part) => {
      if (!isPlainObject(current) || !(part in current)) {
        return undefined;
      }

      return current[part];
    }, context);
  }

  return undefined;
}

function normalizePrimitiveDefaultValue(value: unknown): RequestFormValue {
  if (
    typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || value === null
  ) {
    return value;
  }

  return null;
}

function matchesFilterRule(
  option: EntityLookupOption,
  rule: RequestBlueprintFilterRule,
  context: Record<string, unknown>
): boolean {
  const optionValue = option.raw ? getContextValue(option.raw, rule.field) : undefined;
  const expectedValue = typeof rule.value === 'string' && getContextValue(context, rule.value) !== undefined
    ? getContextValue(context, rule.value)
    : rule.value;

  switch (rule.op) {
    case 'EQUALS':
      return optionValue === expectedValue;
    case 'NOT_EQUALS':
      return optionValue !== expectedValue;
    case 'IN':
      return Array.isArray(expectedValue) && expectedValue.includes(optionValue);
    default:
      return true;
  }
}

function validateCustomFieldValue(
  field: RequestBlueprintCustomFieldConfig,
  value: unknown
): string[] {
  if (isValueEmpty(value)) {
    return [];
  }

  return (field.validation ?? []).flatMap((rule) => {
    switch (rule.type) {
      case 'MIN_LENGTH':
        return typeof value === 'string' && value.length < Number(rule.value) ? [rule.message] : [];
      case 'MAX_LENGTH':
        return typeof value === 'string' && value.length > Number(rule.value) ? [rule.message] : [];
      case 'MIN':
        return typeof value === 'number' && value < Number(rule.value) ? [rule.message] : [];
      case 'MAX':
        return typeof value === 'number' && value > Number(rule.value) ? [rule.message] : [];
      case 'REGEX':
        return typeof value === 'string' && !(new RegExp(String(rule.value)).test(value)) ? [rule.message] : [];
      default:
        return [];
    }
  });
}

function normalizeEntitySelection(selection: EntityLookupSelection): EntityLookupOption[] {
  if (!selection) {
    return [];
  }

  return Array.isArray(selection) ? selection : [selection];
}

function getEntitySelectionValue(selection: EntityLookupSelection): string | string[] | undefined {
  if (!selection) {
    return undefined;
  }

  if (Array.isArray(selection)) {
    return selection.map((option) => option.id);
  }

  return selection.id;
}

function inferPriorRequestTypeCode(binding: RequestBlueprintEntityBindingConfig): string | undefined {
  const hint = `${binding.key} ${binding.label}`.toUpperCase();

  if (hint.includes('CUSTOMER') && hint.includes('ONBOARD')) {
    return 'CUSTOMER_ONBOARDING';
  }

  if (hint.includes('PROJECT') && hint.includes('SETUP')) {
    return 'PROJECT_SETUP';
  }

  if (hint.includes('SOW')) {
    return 'SOW_CREATION';
  }

  if (hint.includes('MSA')) {
    return 'MSA_CREATION';
  }

  return undefined;
}

function buildClientLookupOption(client: LookupClientRecord): EntityLookupOption {
  return {
    id: client.id,
    label: client.name,
    description: client.code,
    badge: client.status,
    raw: client as unknown as Record<string, unknown>,
  };
}

function buildProjectLookupOption(project: LookupProjectRecord): EntityLookupOption {
  return {
    id: project.id,
    label: project.name,
    description: project.code,
    badge: project.status,
    raw: project as unknown as Record<string, unknown>,
  };
}

function buildContractLookupOption(contract: LookupContractRecord): EntityLookupOption {
  return {
    id: contract.id,
    label: contract.name,
    description: `${contract.contractNumber}${contract.client?.name ? ` • ${contract.client.name}` : ''}`,
    badge: contract.status,
    raw: contract as unknown as Record<string, unknown>,
  };
}

function buildResourceLookupOption(resource: LookupResourceRecord): EntityLookupOption {
  return {
    id: resource.id,
    label: `${resource.firstName} ${resource.lastName}`.trim(),
    description: resource.email || resource.employeeId,
    raw: resource as unknown as Record<string, unknown>,
  };
}

function buildDepartmentLookupOption(department: LookupDepartmentRecord): EntityLookupOption {
  return {
    id: department.id,
    label: department.name,
    description: department.code,
    raw: department as unknown as Record<string, unknown>,
  };
}

function buildTeamLookupOption(team: LookupTeamRecord): EntityLookupOption {
  return {
    id: team.id,
    label: team.name,
    description: `${team.code}${team.department?.name ? ` • ${team.department.name}` : ''}`,
    raw: team as unknown as Record<string, unknown>,
  };
}

function buildCostCenterLookupOption(costCenter: LookupCostCenterRecord): EntityLookupOption {
  return {
    id: costCenter.id,
    label: costCenter.name,
    description: costCenter.code,
    raw: costCenter as unknown as Record<string, unknown>,
  };
}

function buildAllocationLookupOption(allocation: LookupAllocationRecord): EntityLookupOption {
  return {
    id: allocation.id,
    label: allocation.role,
    description: `${allocation.project?.name || 'Project'} • ${allocation.resource ? `${allocation.resource.firstName} ${allocation.resource.lastName}` : `${allocation.percentage}%`}`,
    raw: allocation as unknown as Record<string, unknown>,
  };
}

function buildPriorRequestLookupOption(request: LookupRequestRecord): EntityLookupOption {
  return {
    id: request.id,
    label: request.title,
    description: `${request.requestNumber} • ${request.type?.name || request.typeCode || 'Request'}`,
    badge: request.status,
    raw: request as unknown as Record<string, unknown>,
  };
}

function deriveEntitySelection(
  binding: RequestBlueprintEntityBindingConfig,
  manualSelections: Record<string, EntityLookupSelection>
): EntityLookupSelection {
  if (!binding.derivedFrom) {
    return manualSelections[binding.key] ?? null;
  }

  const sourceSelection = manualSelections[binding.derivedFrom];
  if (!sourceSelection || Array.isArray(sourceSelection)) {
    return null;
  }

  if (binding.entityType === 'client' && binding.derivedFrom === 'project') {
    const project = sourceSelection.raw as LookupProjectRecord | undefined;
    if (project?.client) {
      return buildClientLookupOption(project.client);
    }
  }

  if (binding.entityType === 'contract') {
    const source = sourceSelection.raw as LookupRequestRecord | undefined;
    const requestData = source?.requestData ?? {};
    const contractId = source?.contractId
      || (typeof requestData.contract === 'string' ? requestData.contract : undefined);

    if (contractId) {
      return {
        id: contractId,
        label: binding.label,
        description: source?.requestNumber ? `Derived from ${source.requestNumber}` : 'Derived from linked request',
        raw: { id: contractId },
      };
    }
  }

  return null;
}

function buildEntityPayload(
  bindings: RequestBlueprintEntityBindingConfig[],
  selections: Record<string, EntityLookupSelection>,
  requestData: Record<string, unknown>
): CreateRequestPayload['requestData'] {
  const nextRequestData = { ...requestData };

  bindings.forEach((binding) => {
    const selection = selections[binding.key] ?? null;
    const value = getEntitySelectionValue(selection);

    if (value === undefined) {
      delete nextRequestData[binding.key];
      return;
    }

    nextRequestData[binding.key] = value;
  });

  return nextRequestData;
}

function buildCustomLookupPayload(
  customFields: RequestBlueprintCustomFieldConfig[],
  selections: Record<string, EntityLookupOption | null>,
  requestData: Record<string, unknown>
): CreateRequestPayload['requestData'] {
  const nextRequestData = { ...requestData };

  customFields.forEach((field) => {
    if (field.type !== 'USER_PICKER') {
      return;
    }

    const selection = selections[field.fieldKey];

    if (!selection) {
      delete nextRequestData[field.fieldKey];
      return;
    }

    nextRequestData[field.fieldKey] = selection.id;
  });

  return nextRequestData;
}

function applyEntitySelectionToPayload(
  payload: CreateRequestPayload,
  binding: RequestBlueprintEntityBindingConfig,
  selection: EntityLookupSelection
): void {
  if (!selection || Array.isArray(selection)) {
    return;
  }

  switch (binding.entityType) {
    case 'resource':
      payload.resourceId = selection.id;
      break;
    case 'project':
      payload.projectId = selection.id;
      break;
    case 'contract':
      payload.contractId = selection.id;
      break;
    case 'priorRequest':
      payload.dependsOnId = selection.id;
      break;
    default:
      break;
  }
}

async function fetchEntityLookupOptions(
  binding: RequestBlueprintEntityBindingConfig,
  searchTerm: string,
  context: Record<string, unknown>
): Promise<EntityLookupOption[]> {
  const params = new URLSearchParams({
    limit: '8',
  });

  if (searchTerm.trim()) {
    params.set('search', searchTerm.trim());
  }

  switch (binding.entityType) {
    case 'client': {
      const response = await api.get<EntityLookupResponse<LookupClientRecord>>(`/clients?${params.toString()}`);
      return response.data.map(buildClientLookupOption);
    }
    case 'project': {
      const response = await api.get<EntityLookupResponse<LookupProjectRecord>>(`/projects?${params.toString()}`);
      return response.data.map(buildProjectLookupOption);
    }
    case 'contract': {
      const response = await api.get<EntityLookupResponse<LookupContractRecord>>(`/contracts?${params.toString()}`);
      return response.data.map(buildContractLookupOption);
    }
    case 'resource':
    case 'user': {
      const response = await api.get<EntityLookupResponse<LookupResourceRecord>>(`/resources?${params.toString()}`);
      return response.data.map(buildResourceLookupOption);
    }
    case 'department': {
      const response = await api.get<{ data: LookupDepartmentRecord[] }>('/onboarding/departments');
      return response.data.map(buildDepartmentLookupOption);
    }
    case 'team': {
      const teamFilterRules = binding.filterRules ?? [];
      const departmentRule = teamFilterRules.find((rule) => rule.field === 'departmentId' || rule.field === 'department.id');
      const departmentValue = departmentRule
        ? (typeof departmentRule.value === 'string' && getContextValue(context, departmentRule.value) !== undefined
          ? getContextValue(context, departmentRule.value)
          : departmentRule.value)
        : undefined;

      if (typeof departmentValue === 'string' && departmentValue) {
        params.set('departmentId', departmentValue);
      }

      const response = await api.get<{ data: LookupTeamRecord[] }>(`/onboarding/teams?${params.toString()}`);
      return response.data.map(buildTeamLookupOption);
    }
    case 'costCenter': {
      const response = await api.get<{ data: LookupCostCenterRecord[] }>('/onboarding/cost-centers');
      return response.data.map(buildCostCenterLookupOption);
    }
    case 'allocation': {
      const allocationFilterRules = binding.filterRules ?? [];
      allocationFilterRules.forEach((rule) => {
        const resolvedValue = typeof rule.value === 'string' && getContextValue(context, rule.value) !== undefined
          ? getContextValue(context, rule.value)
          : rule.value;

        if (typeof resolvedValue === 'string' && (rule.field === 'projectId' || rule.field === 'resourceId')) {
          params.set(rule.field, resolvedValue);
        }
      });

      const response = await api.get<EntityLookupResponse<LookupAllocationRecord>>(`/allocations?${params.toString()}`);
      return response.data.map(buildAllocationLookupOption);
    }
    case 'priorRequest': {
      const requestTypeCode = inferPriorRequestTypeCode(binding);
      params.set('status', 'COMPLETED');
      if (requestTypeCode) {
        params.set('typeCode', requestTypeCode);
      }

      const response = await api.get<EntityLookupResponse<LookupRequestRecord>>(`/requests?${params.toString()}`);
      return response.data.map(buildPriorRequestLookupOption);
    }
    default:
      return [];
  }
}

async function fetchUserLookupOptions(searchTerm: string): Promise<EntityLookupOption[]> {
  const params = new URLSearchParams({
    limit: '8',
  });

  if (searchTerm.trim()) {
    params.set('search', searchTerm.trim());
  }

  const response = await api.get<EntityLookupResponse<LookupResourceRecord>>(`/resources?${params.toString()}`);
  return response.data.map(buildResourceLookupOption);
}

function EntityLookupField({
  binding,
  selection,
  onChange,
  context,
}: {
  binding: RequestBlueprintEntityBindingConfig;
  selection: EntityLookupSelection;
  onChange: (selection: EntityLookupSelection) => void;
  context: Record<string, unknown>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const selectedOptions = useMemo(() => normalizeEntitySelection(selection), [selection]);

  const { data: options = [], isLoading, error } = useQuery({
    queryKey: ['request-entity-lookup', binding.entityType, binding.key, searchTerm, JSON.stringify(binding.filterRules ?? []), JSON.stringify(context)],
    queryFn: () => fetchEntityLookupOptions(binding, searchTerm, context),
    enabled: binding.editable || binding.autoResolve,
    staleTime: 60_000,
  });

  const filteredOptions = useMemo(() => {
    if (!binding.filterRules?.length) {
      return options;
    }

    return options.filter((option) => binding.filterRules?.every((rule) => matchesFilterRule(option, rule, context)));
  }, [binding.filterRules, context, options]);

  const mergedOptions = useMemo(() => {
    const selectedById = new Map(selectedOptions.map((option) => [option.id, option]));

    filteredOptions.forEach((option) => {
      if (!selectedById.has(option.id)) {
        selectedById.set(option.id, option);
      }
    });

    return Array.from(selectedById.values());
  }, [filteredOptions, selectedOptions]);

  useEffect(() => {
    const strategy = binding.resolutionPolicy?.strategy;
    const shouldAutoResolve = binding.autoResolve && selectedOptions.length === 0 && mergedOptions.length === 1
      && (strategy === 'AUTO_FIRST' || !binding.allowManualSelection);

    if (shouldAutoResolve) {
      onChange(mergedOptions[0]);
    }
  }, [binding.allowManualSelection, binding.autoResolve, binding.resolutionPolicy?.strategy, mergedOptions, onChange, selectedOptions.length]);

  const handleSelect = (option: EntityLookupOption) => {
    if (binding.selectionMode === 'MULTI') {
      const alreadySelected = selectedOptions.some((selected) => selected.id === option.id);
      onChange(
        alreadySelected
          ? selectedOptions.filter((selected) => selected.id !== option.id)
          : [...selectedOptions, option]
      );
      return;
    }

    onChange(option);
  };

  const helperText = binding.editable
    ? `Search existing ${binding.label.toLowerCase()} records and select the right match.`
    : binding.derivedFrom
      ? `This field is auto-resolved from ${formatFieldLabel(binding.derivedFrom)}.`
      : 'This field will auto-resolve when enough context is available.';

  const resolutionMessage = !isLoading && mergedOptions.length === 0
    ? binding.resolutionPolicy?.emptyStateMessage
    : !isLoading && mergedOptions.length > 1 && binding.resolutionPolicy?.strategy === 'PROMPT_ON_AMBIGUITY'
      ? binding.resolutionPolicy.multipleMatchMessage
      : undefined;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        {selectedOptions.length > 0 ? (
          <div className="space-y-2">
            {selectedOptions.map((option) => (
              <div key={option.id} className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-emerald-900">{option.label}</p>
                  {option.description && (
                    <p className="text-xs text-emerald-700">{option.description}</p>
                  )}
                </div>
                {binding.editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-emerald-800 hover:text-emerald-900"
                    onClick={() => {
                      if (binding.selectionMode === 'MULTI') {
                        onChange(selectedOptions.filter((selected) => selected.id !== option.id));
                      } else {
                        onChange(null);
                      }
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No {binding.label.toLowerCase()} selected yet.</p>
        )}

        <p className="mt-2 text-xs text-gray-500">{resolutionMessage || helperText}</p>
      </div>

      {binding.editable && (
        <>
          <Input
            aria-label={`${binding.label} search`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${binding.label.toLowerCase()}...`}
          />

          <div className="rounded-lg border border-gray-200">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading results…</div>
            ) : error ? (
              <div className="px-3 py-2 text-sm text-amber-700">Lookup failed. Try again.</div>
            ) : mergedOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No matching records found.</div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                {mergedOptions.map((option) => {
                  const isSelected = selectedOptions.some((selected) => selected.id === option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={cn(
                        'w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors',
                        isSelected && 'bg-primary/5'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{option.label}</p>
                          {option.description && (
                            <p className="text-xs text-gray-500">{option.description}</p>
                          )}
                        </div>
                        {option.badge && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {option.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserLookupField({
  field,
  selection,
  onChange,
  disabled = false,
  helpText,
}: {
  field: { fieldKey: string; label: string; placeholder?: string };
  selection: EntityLookupOption | null;
  onChange: (selection: EntityLookupOption | null) => void;
  disabled?: boolean;
  helpText?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: options = [], isLoading, error } = useQuery({
    queryKey: ['request-custom-user-lookup', field.fieldKey, searchTerm],
    queryFn: () => fetchUserLookupOptions(searchTerm),
    staleTime: 60_000,
  });

  const mergedOptions = useMemo(() => {
    if (!selection) {
      return options;
    }

    return options.some((option) => option.id === selection.id)
      ? options
      : [selection, ...options];
  }, [options, selection]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        {selection ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-emerald-900">{selection.label}</p>
              {selection.description && (
                <p className="text-xs text-emerald-700">{selection.description}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-emerald-800 hover:text-emerald-900"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Clear
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No user selected yet.</p>
        )}

        <p className="mt-2 text-xs text-gray-500">
          {helpText || 'Search existing team members and select the person responsible for this field.'}
        </p>
      </div>

      <Input
        aria-label={`${field.label} search`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={field.placeholder || `Search ${field.label.toLowerCase()}...`}
        disabled={disabled}
      />

      <div className="rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-gray-500">Loading results…</div>
        ) : error ? (
          <div className="px-3 py-2 text-sm text-amber-700">Lookup failed. Try again.</div>
        ) : mergedOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">No matching users found.</div>
        ) : (
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {mergedOptions.map((option) => {
              const isSelected = selection?.id === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange(option)}
                  disabled={disabled}
                  className={cn(
                    'w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-gray-500">{option.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Status & Priority Helpers
// ============================================================================

const statusConfig: Record<Request['status'], { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: ArrowUpRight },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: X },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  ON_HOLD: { label: 'On Hold', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
};

const priorityConfig: Record<Request['priority'], { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-600' },
};

const categoryConfig: Record<string, { label: string; color: string }> = {
  RESOURCE: { label: 'Resource', color: 'text-violet-600' },
  PROJECT: { label: 'Project', color: 'text-blue-600' },
  TIME: { label: 'Time & Leave', color: 'text-green-600' },
  FINANCIAL: { label: 'Financial', color: 'text-amber-600' },
  ADMINISTRATIVE: { label: 'Administrative', color: 'text-gray-600' },
};

// ============================================================================
// Create Request Modal
// ============================================================================

function CreateRequestModal({
  isOpen,
  onClose,
  requestTypes,
  isRequestTypesLoading,
  requestTypesError,
  onSubmit,
  isLoading,
  pendingAction,
  errorMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  requestTypes: RequestType[];
  isRequestTypesLoading: boolean;
  requestTypesError?: string | null;
  onSubmit: (data: CreateRequestPayload, action: 'draft' | 'submit', attachments: File[]) => void;
  isLoading: boolean;
  pendingAction: 'draft' | 'submit' | null;
  errorMessage?: string | null;
}) {
  const [step, setStep] = useState<'select-type' | 'fill-form'>('select-type');
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [manualEntitySelections, setManualEntitySelections] = useState<Record<string, EntityLookupSelection>>({});
  const [customLookupSelections, setCustomLookupSelections] = useState<Record<string, EntityLookupOption | null>>({});
  const [onBehalfOfSelection, setOnBehalfOfSelection] = useState<EntityLookupOption | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const {
    data: selectedBlueprint,
    isLoading: isBlueprintLoading,
    error: blueprintError,
  } = useRequestBlueprint(step === 'fill-form' ? selectedType?.code : null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Request['priority'],
    urgencyJustification: '',
    requestedCompletionDate: '',
    requestData: {} as Record<string, unknown>,
  });

  const blueprintDefinition = selectedBlueprint?.definition;

  const commonFieldMap = useMemo(() => {
    const fields = blueprintDefinition?.commonFields ?? [];
    return fields.reduce((acc, field) => {
      acc[field.key] = field;
      return acc;
    }, {} as Partial<Record<RequestBlueprintCommonFieldConfig['key'], RequestBlueprintCommonFieldConfig>>);
  }, [blueprintDefinition]);

  const visibleEntityBindings = useMemo(
    () => (blueprintDefinition?.entityBindings ?? []).filter((binding) => (
      binding.visible
    )),
    [blueprintDefinition]
  );

  const effectiveEntitySelections = useMemo(
    () => visibleEntityBindings.reduce((acc, binding) => {
      acc[binding.key] = deriveEntitySelection(binding, manualEntitySelections);
      return acc;
    }, {} as Record<string, EntityLookupSelection>),
    [manualEntitySelections, visibleEntityBindings]
  );

  const effectiveRequestData = useMemo(
    () => buildCustomLookupPayload(
      blueprintDefinition?.customFields ?? [],
      customLookupSelections,
      buildEntityPayload(visibleEntityBindings, effectiveEntitySelections, formData.requestData)
    ),
    [blueprintDefinition?.customFields, customLookupSelections, effectiveEntitySelections, formData.requestData, visibleEntityBindings]
  );

  const blueprintContext = useMemo(() => ({
    title: formData.title,
    description: formData.description,
    priority: formData.priority,
    urgencyJustification: formData.urgencyJustification,
    neededBy: formData.requestedCompletionDate,
    onBehalfOf: onBehalfOfSelection?.id,
    attachments: attachmentFiles.map((file) => file.name),
    ...effectiveRequestData,
  }), [attachmentFiles, effectiveRequestData, formData.description, formData.priority, formData.requestedCompletionDate, formData.title, formData.urgencyJustification, onBehalfOfSelection?.id]);

  const visibleCommonFields = useMemo(
    () => (blueprintDefinition?.commonFields ?? []).filter((field) => (
      field.visible && evaluateConditionGroup(field.visibilityCondition, blueprintContext)
    )),
    [blueprintContext, blueprintDefinition]
  );

  const visibleCommonFieldKeys = useMemo(
    () => new Set(visibleCommonFields.map((field) => field.key)),
    [visibleCommonFields]
  );

  const visibleCustomFields = useMemo(
    () => [...(blueprintDefinition?.customFields ?? [])]
      .filter((field) => evaluateConditionGroup(field.visibilityCondition, blueprintContext))
      .sort((left, right) => left.displayOrder - right.displayOrder),
    [blueprintContext, blueprintDefinition]
  );

  const customFieldValidationErrors = useMemo(
    () => visibleCustomFields.reduce((acc, field) => {
      const errors = validateCustomFieldValue(field, effectiveRequestData[field.fieldKey]);
      if (errors.length > 0) {
        acc[field.fieldKey] = errors;
      }
      return acc;
    }, {} as Record<string, string[]>),
    [effectiveRequestData, visibleCustomFields]
  );

  const dependencyRuleBlockers = useMemo(() => {
    return (blueprintDefinition?.dependencyRules ?? []).reduce((acc, rule) => {
      const selectionKey = rule.requiredEntityBindingKey;
      if (!selectionKey) {
        return acc;
      }

      const selection = effectiveEntitySelections[selectionKey] ?? null;
      const firstSelection = Array.isArray(selection) ? selection[0] : selection;
      const raw = firstSelection?.raw as LookupRequestRecord | undefined;

      let isSatisfied = Boolean(firstSelection);

      if (isSatisfied && rule.requiredRequestTypeCode) {
        isSatisfied = raw?.type?.code === rule.requiredRequestTypeCode || raw?.typeCode === rule.requiredRequestTypeCode;
      }

      if (isSatisfied && rule.requiredStatus) {
        isSatisfied = raw?.status === rule.requiredStatus;
      }

      if (!isSatisfied) {
        acc.push(rule.message);
      }

      return acc;
    }, [] as string[]);
  }, [blueprintDefinition?.dependencyRules, effectiveEntitySelections]);

  const attachmentValidationErrors = useMemo(() => {
    if (!attachmentFiles.length || !blueprintDefinition) {
      return [] as string[];
    }

    if (!blueprintDefinition.runtime.allowAttachments) {
      return ['Attachments are not enabled for this request type.'];
    }

    const errors: string[] = [];
    const maxAttachments = blueprintDefinition.runtime.maxAttachments ?? 5;
    const maxAttachmentSizeMb = blueprintDefinition.runtime.maxAttachmentSizeMb ?? 10;
    const maxAttachmentSizeBytes = maxAttachmentSizeMb * 1024 * 1024;

    if (attachmentFiles.length > maxAttachments) {
      errors.push(`No more than ${maxAttachments} attachments can be added.`);
    }

    attachmentFiles.forEach((file) => {
      if (file.size > maxAttachmentSizeBytes) {
        errors.push(`${file.name} exceeds the ${maxAttachmentSizeMb} MB limit.`);
      }
    });

    return errors;
  }, [attachmentFiles, blueprintDefinition]);

  useEffect(() => {
    if (!blueprintDefinition) {
      return;
    }

    setFormData((prev) => {
      const next = { ...prev, requestData: { ...prev.requestData } };

      const priorityDefault = commonFieldMap.priority?.defaultValue ?? blueprintDefinition.workflowPolicy.defaultPriority;
      if (priorityDefault && next.priority === 'MEDIUM') {
        next.priority = priorityDefault as Request['priority'];
      }

      blueprintDefinition.commonFields.forEach((field) => {
        if (field.defaultValue === undefined) {
          return;
        }

        const normalized = normalizePrimitiveDefaultValue(field.defaultValue);
        if (field.key === 'description' && !next.description && typeof normalized === 'string') {
          next.description = normalized;
        }

        if (field.key === 'urgencyJustification' && !next.urgencyJustification && typeof normalized === 'string') {
          next.urgencyJustification = normalized;
        }

        if (field.key === 'neededBy' && !next.requestedCompletionDate && typeof normalized === 'string') {
          next.requestedCompletionDate = normalized;
        }
      });

      blueprintDefinition.customFields.forEach((field) => {
        if (field.defaultValue === undefined || next.requestData[field.fieldKey] !== undefined) {
          return;
        }

        next.requestData[field.fieldKey] = field.defaultValue;
      });

      return next;
    });
  }, [blueprintDefinition, commonFieldMap.priority?.defaultValue]);

  const draftReadinessBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!formData.title.trim()) {
      blockers.push('Title is required to save a draft.');
    }

    if (blueprintDefinition) {
      blueprintDefinition.commonFields.forEach((field) => {
        if (!visibleCommonFieldKeys.has(field.key)) {
          return;
        }

        const shouldRequire = field.requiredForDraft
          && evaluateConditionGroup(field.requirementCondition, blueprintContext);

        if (!shouldRequire) {
          return;
        }

        if (field.key === 'title') {
          return;
        }

        const value = field.key === 'neededBy'
          ? formData.requestedCompletionDate
          : field.key === 'urgencyJustification'
            ? formData.urgencyJustification
            : field.key === 'description'
              ? formData.description
              : field.key === 'priority'
                ? formData.priority
                : field.key === 'onBehalfOf'
                    ? onBehalfOfSelection?.id
                    : field.key === 'attachments'
                      ? attachmentFiles
                    : effectiveRequestData[field.key];

        if (isValueEmpty(typeof value === 'string' ? value.trim() : value)) {
          blockers.push(`${field.label || formatFieldLabel(field.key)} is required to save a draft.`);
        }
      });

      visibleEntityBindings.forEach((binding) => {
        const isRequired = binding.requiredForDraft
          && evaluateConditionGroup(undefined, blueprintContext);

        if (isRequired && isValueEmpty(getEntitySelectionValue(effectiveEntitySelections[binding.key] ?? null))) {
          blockers.push(`${binding.label} is required to save a draft.`);
        }
      });

      visibleCustomFields.forEach((field) => {
        const isRequired = field.requiredForDraft
          && evaluateConditionGroup(field.requirementCondition, blueprintContext);

        if (isRequired && isValueEmpty(effectiveRequestData[field.fieldKey])) {
          blockers.push(`${field.label} is required to save a draft.`);
        }
      });

      Object.values(customFieldValidationErrors).flat().forEach((message) => blockers.push(message));
      dependencyRuleBlockers.forEach((message) => blockers.push(message));
      attachmentValidationErrors.forEach((message) => blockers.push(message));
    } else if (formData.priority === 'CRITICAL' && !formData.urgencyJustification.trim()) {
      blockers.push('Urgency justification is required for critical requests.');
    }

    return blockers;
  }, [attachmentFiles, attachmentValidationErrors, blueprintContext, blueprintDefinition, customFieldValidationErrors, dependencyRuleBlockers, effectiveEntitySelections, effectiveRequestData, formData.description, formData.priority, formData.requestData, formData.requestedCompletionDate, formData.title, formData.urgencyJustification, onBehalfOfSelection?.id, visibleCommonFieldKeys, visibleCustomFields, visibleEntityBindings]);

  const submitReadinessBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!formData.title.trim()) {
      blockers.push('Title is required before submission.');
    }

    if (blueprintDefinition) {
      blueprintDefinition.commonFields.forEach((field) => {
        if (!visibleCommonFieldKeys.has(field.key)) {
          return;
        }

        const shouldRequire = field.requiredForSubmit
          && evaluateConditionGroup(field.requirementCondition, blueprintContext);

        if (!shouldRequire) {
          return;
        }

        if (field.key === 'title') {
          return;
        }

        const value = field.key === 'neededBy'
          ? formData.requestedCompletionDate
          : field.key === 'urgencyJustification'
            ? formData.urgencyJustification
            : field.key === 'description'
              ? formData.description
              : field.key === 'priority'
                ? formData.priority
                : field.key === 'onBehalfOf'
                    ? onBehalfOfSelection?.id
                    : field.key === 'attachments'
                      ? attachmentFiles
                    : effectiveRequestData[field.key];

        if (isValueEmpty(typeof value === 'string' ? value.trim() : value)) {
          blockers.push(`${field.label || formatFieldLabel(field.key)} is required before submission.`);
        }
      });

      visibleEntityBindings.forEach((binding) => {
        const isRequired = binding.requiredForSubmit;
        if (isRequired && isValueEmpty(getEntitySelectionValue(effectiveEntitySelections[binding.key] ?? null))) {
          blockers.push(`${binding.label} is required before submission.`);
        }
      });

      visibleCustomFields.forEach((field) => {
        const isRequired = field.requiredForSubmit
          && evaluateConditionGroup(field.requirementCondition, blueprintContext);

        if (isRequired && isValueEmpty(effectiveRequestData[field.fieldKey])) {
          blockers.push(`${field.label} is required before submission.`);
        }
      });

      Object.values(customFieldValidationErrors).flat().forEach((message) => blockers.push(message));
      dependencyRuleBlockers.forEach((message) => blockers.push(message));
      attachmentValidationErrors.forEach((message) => blockers.push(message));
    } else if (formData.priority === 'CRITICAL' && !formData.urgencyJustification.trim()) {
      blockers.push('Urgency justification is required for critical requests.');
    }

    return blockers;
  }, [attachmentFiles, attachmentValidationErrors, blueprintContext, blueprintDefinition, customFieldValidationErrors, dependencyRuleBlockers, effectiveEntitySelections, effectiveRequestData, formData.description, formData.priority, formData.requestData, formData.requestedCompletionDate, formData.title, formData.urgencyJustification, onBehalfOfSelection?.id, visibleCommonFieldKeys, visibleCustomFields, visibleEntityBindings]);

  const setRequestDataValue = (key: string, value: RequestFormValue) => {
    setFormData((prev) => ({
      ...prev,
      requestData: {
        ...prev.requestData,
        [key]: value,
      },
    }));
  };

  const renderEntityBindingField = (binding: RequestBlueprintEntityBindingConfig) => (
    <EntityLookupField
      binding={binding}
      selection={effectiveEntitySelections[binding.key] ?? null}
      context={blueprintContext}
      onChange={(selection) => {
        setManualEntitySelections((prev) => ({
          ...prev,
          [binding.key]: selection,
        }));
      }}
    />
  );

  const renderCustomField = (field: RequestBlueprintCustomFieldConfig) => {
    const value = formData.requestData[field.fieldKey] as RequestFormValue | undefined;

    switch (field.type) {
      case 'TEXTAREA':
        return (
          <textarea
            value={stringifyFieldValue(value)}
            onChange={(e) => setRequestDataValue(field.fieldKey, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        );
      case 'NUMBER':
        return (
          <Input
            type="number"
            value={stringifyFieldValue(value)}
            onChange={(e) => setRequestDataValue(field.fieldKey, e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder}
          />
        );
      case 'DATE':
        return (
          <Input
            type="date"
            value={stringifyFieldValue(value)}
            onChange={(e) => setRequestDataValue(field.fieldKey, e.target.value)}
          />
        );
      case 'DATETIME':
        return (
          <Input
            type="datetime-local"
            value={stringifyFieldValue(value)}
            onChange={(e) => setRequestDataValue(field.fieldKey, e.target.value)}
          />
        );
      case 'CHECKBOX':
        return (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => setRequestDataValue(field.fieldKey, e.target.checked)}
              className="rounded border-gray-300"
            />
            {field.helpText || field.label}
          </label>
        );
      case 'SELECT':
        return (
          <select
            value={stringifyFieldValue(value)}
            onChange={(e) => setRequestDataValue(field.fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Select an option</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        );
      case 'MULTI_SELECT':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => setRequestDataValue(field.fieldKey, Array.from(e.target.selectedOptions, (option) => option.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-32"
          >
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        );
      case 'RADIO':
        return (
          <div className="space-y-2">
            {(field.options ?? []).map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name={field.fieldKey}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => setRequestDataValue(field.fieldKey, e.target.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        );
      case 'USER_PICKER':
        return (
          <UserLookupField
            field={field}
            selection={customLookupSelections[field.fieldKey] ?? null}
            onChange={(selection) => {
              setCustomLookupSelections((prev) => ({
                ...prev,
                [field.fieldKey]: selection,
              }));
            }}
          />
        );
      case 'TEXT':
      default:
        return (
          <Input
            value={stringifyFieldValue(value)}
            onChange={(e) => setRequestDataValue(field.fieldKey, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const showDescriptionField = visibleCommonFieldKeys.has('description') || !blueprintDefinition;
  const showPriorityField = visibleCommonFieldKeys.has('priority') || !blueprintDefinition;
  const showNeededByField = visibleCommonFieldKeys.has('neededBy');
  const showUrgencyField = visibleCommonFieldKeys.has('urgencyJustification') || (!blueprintDefinition && formData.priority === 'CRITICAL');
  const showOnBehalfOfField = visibleCommonFieldKeys.has('onBehalfOf');
  const showAttachmentsField = visibleCommonFieldKeys.has('attachments') && Boolean(blueprintDefinition?.runtime.allowAttachments);
  const canSaveDraft = blueprintDefinition?.runtime.allowDraft ?? true;
  const canSubmitRequest = blueprintDefinition?.runtime.allowSubmit ?? true;

  const visibleBlueprintCommonFields = visibleCommonFields;

  const handleAttachmentSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    setAttachmentFiles((prev) => {
      const seen = new Set(prev.map((file) => getFileIdentity(file)));
      const next = [...prev];

      selectedFiles.forEach((file) => {
        const identity = getFileIdentity(file);
        if (!seen.has(identity)) {
          seen.add(identity);
          next.push(file);
        }
      });

      return next;
    });

    event.target.value = '';
  };

  const handleRemoveAttachment = (fileToRemove: File) => {
    const identity = getFileIdentity(fileToRemove);
    setAttachmentFiles((prev) => prev.filter((file) => getFileIdentity(file) !== identity));
  };

  const handleSelectType = (type: RequestType) => {
    setSelectedType(type);
    setFormData(prev => ({
      ...prev,
      title: '',
      description: '',
      urgencyJustification: '',
      requestData: {},
    }));
    setManualEntitySelections({});
    setCustomLookupSelections({});
    setOnBehalfOfSelection(null);
    setAttachmentFiles([]);
    setStep('fill-form');
  };

  const handleSubmit = (action: 'draft' | 'submit') => {
    if (!selectedType) return;

    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedUrgencyJustification = formData.urgencyJustification.trim();

    const payload: CreateRequestPayload = {
      typeCode: selectedType.code,
      title: trimmedTitle,
      priority: formData.priority,
      requestData: effectiveRequestData,
    };

    if (trimmedDescription) {
      payload.description = trimmedDescription;
    }

    if (trimmedUrgencyJustification) {
      payload.urgencyJustification = trimmedUrgencyJustification;
    }

    if (action === 'submit') {
      payload.submitForApproval = true;
    }

    if (formData.requestedCompletionDate) {
      payload.requestedCompletionDate = new Date(`${formData.requestedCompletionDate}T00:00:00.000Z`).toISOString();
    }

    if (onBehalfOfSelection?.id) {
      payload.onBehalfOfId = onBehalfOfSelection.id;
    }

    visibleEntityBindings.forEach((binding) => {
      applyEntitySelectionToPayload(payload, binding, effectiveEntitySelections[binding.key] ?? null);
    });

    onSubmit(payload, action, attachmentFiles);
  };

  const handleClose = () => {
    setStep('select-type');
    setSelectedType(null);
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      urgencyJustification: '',
      requestedCompletionDate: '',
      requestData: {},
    });
    setManualEntitySelections({});
    setCustomLookupSelections({});
    setOnBehalfOfSelection(null);
    setAttachmentFiles([]);
    onClose();
  };

  // Group request types by category
  const groupedTypes = requestTypes.reduce((acc, type) => {
    const category = type.category || 'OTHER';
    if (!acc[category]) acc[category] = [];
    acc[category].push(type);
    return acc;
  }, {} as Record<string, RequestType[]>);
  const activeRequestTypeCount = requestTypes.filter((type) => type.isActive).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(step === 'select-type' ? 'max-w-3xl' : 'max-w-xl')} preventDismiss>
        <DialogHeader>
          <DialogTitle>
            {step === 'select-type' ? 'Create New Request' : `New ${selectedType?.name}`}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {errorMessage && step === 'fill-form' && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {errorMessage}
            </div>
          )}

          {step === 'select-type' ? (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                Select the type of request you want to create
              </p>
              {isRequestTypesLoading ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  Loading request types…
                </div>
              ) : requestTypesError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {requestTypesError}
                </div>
              ) : activeRequestTypeCount === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No active request types are available for this tenant yet.
                </div>
              ) : (
                Object.entries(groupedTypes).map(([category, types]) => (
                  <div key={category}>
                    <h3 className={cn(
                      'text-sm font-medium mb-3',
                      categoryConfig[category]?.color || 'text-gray-600'
                    )}>
                      {categoryConfig[category]?.label || category}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {types.filter(t => t.isActive).map((type) => (
                        <button
                          key={type.code}
                          onClick={() => handleSelectType(type)}
                          className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{type.name}</p>
                            {type.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {type.description}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setStep('select-type')}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                ← Change request type
              </button>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                You can save a draft for later or submit immediately for approval. Submission starts the workflow and limits later editing.
              </div>

              {selectedBlueprint && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                  <p className="font-medium">Blueprint-driven intake</p>
                  <p className="mt-1 text-violet-800">
                    {selectedBlueprint.definition.identity.name} uses a {selectedBlueprint.definition.runtime.renderMode.toLowerCase()} runtime definition with {selectedBlueprint.definition.runtime.complexityLevel.toLowerCase()} complexity.
                  </p>
                  <p className="mt-1 text-violet-800">
                    {selectedBlueprint.definition.workflowPolicy.requiresApproval
                      ? 'Submission starts an approval workflow.'
                      : 'This request type can proceed without approval when submitted.'}
                  </p>
                </div>
              )}

              {isBlueprintLoading && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  Loading request blueprint…
                </div>
              )}

              {blueprintError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Blueprint data could not be loaded. Using the fallback request form for now.
                </div>
              )}

              {blueprintDefinition && (!canSaveDraft || !canSubmitRequest) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {!canSaveDraft && 'This blueprint does not allow draft saves. '}
                  {!canSubmitRequest && 'This blueprint does not allow direct submission from this renderer.'}
                </div>
              )}

              <div>
                <label htmlFor="request-title" className="block text-sm font-medium text-gray-700 mb-1">
                  {commonFieldMap.title?.label || 'Title'} <span className="text-red-500">*</span>
                </label>
                <Input
                  id="request-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={commonFieldMap.title?.placeholder || `Enter ${selectedType?.name?.toLowerCase()} title`}
                  disabled={commonFieldMap.title?.editable === false}
                />
                {commonFieldMap.title?.helpText && (
                  <p className="mt-1 text-xs text-gray-500">{commonFieldMap.title.helpText}</p>
                )}
              </div>

              {showDescriptionField && (
                <div>
                  <label htmlFor="request-description" className="block text-sm font-medium text-gray-700 mb-1">
                    {commonFieldMap.description?.label || 'Description'}
                  </label>
                  <textarea
                    id="request-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={commonFieldMap.description?.placeholder || 'Provide details about your request...'}
                    rows={4}
                    disabled={commonFieldMap.description?.editable === false}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {commonFieldMap.description?.helpText && (
                    <p className="mt-1 text-xs text-gray-500">{commonFieldMap.description.helpText}</p>
                  )}
                </div>
              )}

              {(showPriorityField || showNeededByField) && (
                <div className="grid grid-cols-2 gap-4">
                  {showPriorityField && (
                    <div>
                      <label htmlFor="request-priority" className="block text-sm font-medium text-gray-700 mb-1">
                        {commonFieldMap.priority?.label || 'Priority'}
                      </label>
                      <select
                        id="request-priority"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Request['priority'] }))}
                        disabled={commonFieldMap.priority?.editable === false}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  )}

                  {showNeededByField && (
                    <div>
                      <label htmlFor="request-needed-by" className="block text-sm font-medium text-gray-700 mb-1">
                        {commonFieldMap.neededBy?.label || 'Needed By'}
                      </label>
                      <Input
                        id="request-needed-by"
                        type="date"
                        value={formData.requestedCompletionDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, requestedCompletionDate: e.target.value }))}
                        disabled={commonFieldMap.neededBy?.editable === false}
                      />
                    </div>
                  )}
                </div>
              )}

              {showOnBehalfOfField && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {commonFieldMap.onBehalfOf?.label || 'On Behalf Of'}
                  </label>
                  <UserLookupField
                    field={{
                      fieldKey: 'onBehalfOf',
                      label: commonFieldMap.onBehalfOf?.label || 'On Behalf Of',
                      placeholder: commonFieldMap.onBehalfOf?.placeholder,
                    }}
                    selection={onBehalfOfSelection}
                    onChange={setOnBehalfOfSelection}
                    disabled={commonFieldMap.onBehalfOf?.editable === false}
                    helpText={commonFieldMap.onBehalfOf?.helpText}
                  />
                </div>
              )}

              {showUrgencyField && (
                <div>
                  <label htmlFor="request-urgency-justification" className="block text-sm font-medium text-gray-700 mb-1">
                    {commonFieldMap.urgencyJustification?.label || 'Urgency Justification'}
                    {submitReadinessBlockers.some((message) => message.toLowerCase().includes('urgency justification')) && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>
                  <textarea
                    id="request-urgency-justification"
                    value={formData.urgencyJustification}
                    onChange={(e) => setFormData(prev => ({ ...prev, urgencyJustification: e.target.value }))}
                    placeholder={commonFieldMap.urgencyJustification?.placeholder || 'Explain why this request is critical and what impact delay would cause...'}
                    rows={3}
                    disabled={commonFieldMap.urgencyJustification?.editable === false}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {commonFieldMap.urgencyJustification?.helpText || 'Required for critical requests so approvers understand the business impact.'}
                  </p>
                </div>
              )}

              {showAttachmentsField && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900">{commonFieldMap.attachments?.label || 'Attachments'}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {commonFieldMap.attachments?.helpText || `Attachment support is enabled for this blueprint (${blueprintDefinition?.runtime.maxAttachments || 'multiple'} files, up to ${blueprintDefinition?.runtime.maxAttachmentSizeMb || 10} MB each).`}
                  </p>
                  <div className="mt-3">
                    <Input
                      type="file"
                      multiple
                      aria-label="Request attachments"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip"
                      onChange={handleAttachmentSelection}
                      disabled={isLoading || isBlueprintLoading}
                    />
                  </div>

                  {attachmentFiles.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {attachmentFiles.map((file) => (
                        <div
                          key={getFileIdentity(file)}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleRemoveAttachment(file)}
                            disabled={isLoading}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-gray-500">No files selected yet.</p>
                  )}

                  {attachmentValidationErrors.length > 0 && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                      <ul className="space-y-1 text-xs text-red-700">
                        {attachmentValidationErrors.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="mt-3 text-xs text-amber-700">
                    Files are uploaded right after the draft is created so each attachment is linked to the new request record.
                  </p>
                </div>
              )}

              {visibleEntityBindings.length > 0 && (
                <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Linked records</h3>
                    <p className="text-xs text-gray-500 mt-1">Capture the business records this request depends on.</p>
                  </div>

                  {visibleEntityBindings.map((binding) => (
                    <div key={binding.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {binding.label}
                        {binding.requiredForSubmit && <span className="text-red-500"> *</span>}
                      </label>
                      {renderEntityBindingField(binding)}
                      {binding.helpText && (
                        <p className="mt-1 text-xs text-gray-500">{binding.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {visibleCustomFields.length > 0 && (
                <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Request details</h3>
                    <p className="text-xs text-gray-500 mt-1">These fields come directly from the request blueprint.</p>
                  </div>

                  {visibleCustomFields.map((field) => (
                    <div key={field.fieldKey}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.requiredForSubmit && <span className="text-red-500"> *</span>}
                      </label>
                      {renderCustomField(field)}
                      {customFieldValidationErrors[field.fieldKey]?.map((message) => (
                        <p key={`${field.fieldKey}-${message}`} className="mt-1 text-xs text-red-600">{message}</p>
                      ))}
                      {field.helpText && (
                        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {blueprintDefinition && (visibleBlueprintCommonFields.length > 0 || visibleEntityBindings.length > 0 || visibleCustomFields.length > 0) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="font-medium">Readiness summary</p>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-gray-600">
                    {draftReadinessBlockers.length === 0 ? (
                      <li>Draft can be saved with the currently completed fields.</li>
                    ) : (
                      draftReadinessBlockers.map((blocker, index) => <li key={`draft-${index}-${blocker}`}>{blocker}</li>)
                    )}
                    {submitReadinessBlockers.length === 0 ? (
                      <li>Submission is currently ready.</li>
                    ) : (
                      submitReadinessBlockers.map((blocker, index) => <li key={`submit-${index}-${blocker}`}>{blocker}</li>)
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        {step === 'fill-form' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit('draft')}
              disabled={!canSaveDraft || draftReadinessBlockers.length > 0 || isLoading || isBlueprintLoading}
            >
              {isLoading && pendingAction === 'draft' ? 'Saving Draft...' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => handleSubmit('submit')}
              disabled={!canSubmitRequest || submitReadinessBlockers.length > 0 || isLoading || isBlueprintLoading}
            >
              {isLoading && pendingAction === 'submit' ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Request Card Component
// ============================================================================

function RequestCard({ request, onClick }: { request: Request; onClick: () => void }) {
  const status = statusConfig[request.status] || { label: request.status || 'Unknown', color: 'bg-gray-100 text-gray-700', icon: FileText };
  const priority = priorityConfig[request.priority] || { label: request.priority || 'Medium', color: 'bg-blue-100 text-blue-600' };
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">{request.requestNumber}</span>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', priority.color)}>
            {priority.label}
          </span>
        </div>
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1', status.color)}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{request.title}</h3>
      
      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
        {request.description || 'No description provided'}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className={cn('font-medium', request.requestType ? categoryConfig[request.requestType.category]?.color : 'text-gray-600')}>
          {request.requestType?.name || request.typeCode || 'Unknown Type'}
        </span>
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {request.requester?.firstName} {request.requester?.lastName}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(request.createdAt)}
        </span>
      </div>

      {request.currentApproval && request.status === 'PENDING_APPROVAL' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-amber-600">
            Pending: {request.currentApproval.approverRole}
            {request.currentApproval.assignedTo && (
              <span className="text-gray-500">
                {' '}({request.currentApproval.assignedTo.firstName} {request.currentApproval.assignedTo.lastName})
              </span>
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function RequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my-requests' | 'pending-approvals'>('all');
  const [pendingCreateAction, setPendingCreateAction] = useState<'draft' | 'submit' | null>(null);

  const openCreateModal = () => {
    createMutation.reset();
    setPendingCreateAction(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    createMutation.reset();
    setPendingCreateAction(null);
    setShowCreateModal(false);
  };

  // Fetch request types
  const {
    data: requestTypesData,
    isLoading: isRequestTypesLoading,
    error: requestTypesError,
  } = useQuery({
    queryKey: ['request-types'],
    queryFn: async () => {
      try {
        const response = await api.get<{ data: RequestType[] }>('/request-types');
        return normalizeRequestTypeOptions(response.data);
      } catch (primaryError) {
        const fallbackResponse = await api.get<{ data: RequestBlueprintRecord[] }>('/request-types/blueprints?onlyActivated=true');
        const fallbackTypes = fallbackResponse.data
          .map((record) => record.requestType)
          .filter((requestType): requestType is NonNullable<RequestBlueprintRecord['requestType']> => Boolean(requestType))
          .map((requestType) => ({
            code: requestType.code,
            name: requestType.name,
            category: requestType.category,
            description: requestType.description ?? undefined,
            isActive: true,
            isSystemType: requestType.isSystemType,
            tenantId: requestType.tenantId ?? null,
          } satisfies RequestType));

        if (fallbackTypes.length === 0) {
          throw primaryError;
        }

        return normalizeRequestTypeOptions(fallbackTypes);
      }
    },
  });

  // Fetch dashboard stats
  const { data: dashboardData } = useQuery({
    queryKey: ['requests-dashboard'],
    queryFn: async () => {
      const response = await api.get<{ data: DashboardStats }>('/requests/dashboard');
      return response.data;
    },
  });

  // Fetch requests based on active tab
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['requests', activeTab, searchQuery, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      statusFilter.forEach(s => params.append('status', s));
      typeFilter.forEach(t => params.append('typeCode', t));
      
      let endpoint = '/requests';
      if (activeTab === 'my-requests') endpoint = '/requests/my-requests';
      if (activeTab === 'pending-approvals') endpoint = '/requests/pending-approvals';
      
      const response = await api.get<RequestsResponse>(`${endpoint}?${params}`);
      return response;
    },
  });

  // Create request mutation
  const createMutation = useMutation({
    mutationFn: async ({ data, action, attachments }: CreateRequestSubmission) => {
      if (attachments.length === 0) {
        const response = await api.post<CreateRequestResponse>('/requests', data);
        return response;
      }

      const createPayload: CreateRequestPayload = { ...data };
      delete createPayload.submitForApproval;

      const createResponse = await api.post<CreateRequestResponse>('/requests', createPayload);

      for (const file of attachments) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          await api.post(`/requests/${createResponse.data.id}/attachments`, formData);
        } catch (error) {
          return {
            ...createResponse,
            message: 'Draft saved, but attachment upload failed',
            meta: {
              attachmentUploadAttempted: true,
              attachmentUploadSucceeded: false,
              attachmentUploadError: normalizeApiLikeError(error),
              submissionAttempted: false,
              submissionSucceeded: false,
            },
          } satisfies CreateRequestResponse;
        }
      }

      if (action !== 'submit') {
        return {
          ...createResponse,
          meta: {
            ...createResponse.meta,
            attachmentUploadAttempted: true,
            attachmentUploadSucceeded: true,
            submissionAttempted: false,
            submissionSucceeded: false,
          },
        } satisfies CreateRequestResponse;
      }

      try {
        const submittedResponse = await api.post<{ success: boolean; data: Request }>(`/requests/${createResponse.data.id}/submit`, {});
        return {
          success: true,
          data: submittedResponse.data,
          message: 'Request submitted successfully',
          meta: {
            attachmentUploadAttempted: true,
            attachmentUploadSucceeded: true,
            submissionAttempted: true,
            submissionSucceeded: true,
          },
        } satisfies CreateRequestResponse;
      } catch (error) {
        return {
          ...createResponse,
          message: 'Draft saved, but submission failed',
          meta: {
            attachmentUploadAttempted: true,
            attachmentUploadSucceeded: true,
            submissionAttempted: true,
            submissionSucceeded: false,
            submissionError: normalizeApiLikeError(error),
          },
        } satisfies CreateRequestResponse;
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['requests-dashboard'] });
      closeCreateModal();

      const attachmentFailed = response.meta?.attachmentUploadAttempted && !response.meta?.attachmentUploadSucceeded;
      const submissionFailed = response.meta?.submissionAttempted && !response.meta?.submissionSucceeded;

      navigate(`/requests/${response.data.id}`, {
        state: attachmentFailed
          ? {
            notice: {
              type: 'warning',
              title: 'Draft saved, but attachment upload failed',
              message: response.meta?.attachmentUploadError?.message || 'Open the draft and try uploading the files again.',
            },
          }
          : submissionFailed
          ? {
            notice: {
              type: 'warning',
              title: 'Draft saved, but submission failed',
              message: response.meta?.submissionError?.message || 'Open the draft, fix the issue, and submit again.',
            },
          }
          : {
            notice: {
              type: response.meta?.submissionSucceeded ? 'success' : 'info',
              title: response.meta?.submissionSucceeded ? 'Request submitted for approval' : 'Draft saved',
              message: response.meta?.submissionSucceeded
                ? 'Your request has entered the workflow.'
                : 'You can continue editing this draft before submitting it.',
            },
          },
      });
    },
    onSettled: () => {
      setPendingCreateAction(null);
    },
  });

  const stats = dashboardData;
  const requests = requestsData?.data || [];
  const requestTypes = requestTypesData || [];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
            <p className="text-gray-500 mt-1">Manage and track all requests</p>
          </div>
          <Can permission={PERMISSIONS.REQUESTS_CREATE}>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </Can>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.myRequests?.total || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Drafts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.myRequests?.draft || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Edit className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.myRequests?.pending || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.myRequests?.approved || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">My Approvals</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.pendingApprovals || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            All Requests
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'my-requests' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab('pending-approvals')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              activeTab === 'pending-approvals' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Pending My Approval
            {(stats?.pendingApprovals || 0) > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                {stats?.pendingApprovals}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Status
                {statusFilter.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-primary text-white rounded text-xs">
                    {statusFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {Object.entries(statusConfig).map(([value, config]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => {
                    setStatusFilter(prev =>
                      prev.includes(value)
                        ? prev.filter(s => s !== value)
                        : [...prev, value]
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(value)}
                      onChange={() => {}}
                      className="rounded"
                    />
                    <span className={cn('px-2 py-0.5 rounded text-xs', config.color)}>
                      {config.label}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              {statusFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter([])}>
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                Type
                {typeFilter.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-primary text-white rounded text-xs">
                    {typeFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
              {requestTypes.map((type) => (
                <DropdownMenuItem
                  key={type.code}
                  onClick={() => {
                    setTypeFilter(prev =>
                      prev.includes(type.code)
                        ? prev.filter(t => t !== type.code)
                        : [...prev, type.code]
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={typeFilter.includes(type.code)}
                      onChange={() => {}}
                      className="rounded"
                    />
                    <span>{type.name}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              {typeFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter([])}>
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Request List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'pending-approvals'
                  ? "You don't have any requests pending your approval"
                  : "Get started by creating your first request"}
              </p>
              {activeTab !== 'pending-approvals' && (
                <Button onClick={openCreateModal} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Request
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onClick={() => navigate(`/requests/${request.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        requestTypes={requestTypes}
        isRequestTypesLoading={isRequestTypesLoading}
        requestTypesError={requestTypesError instanceof Error ? requestTypesError.message : null}
        onSubmit={(data, action, attachments) => {
          setPendingCreateAction(action);
          createMutation.mutate({ data, action, attachments });
        }}
        isLoading={createMutation.isPending}
        pendingAction={pendingCreateAction}
        errorMessage={createMutation.error instanceof Error ? createMutation.error.message : null}
      />
    </>
  );
}
