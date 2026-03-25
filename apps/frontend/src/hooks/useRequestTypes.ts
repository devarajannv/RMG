/**
 * Request Types API Hooks
 *
 * React Query hooks for request type management.
 * Provides CRUD operations for request types and templates.
 *
 * Created: January 20, 2026
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  RequestTypesListResponse,
  RequestTypeResponse,
  RequestBlueprintResponse,
  TemplatesListResponse,
  TemplateResponse,
  ImportTemplateResponse,
  CreateRequestTypeInput,
  UpdateRequestTypeInput,
  CloneRequestTypeInput,
  AssignWorkflowInput,
  RequestTypeFilters,
} from '@/types/request-types';

// =============================================================================
// Query Keys
// =============================================================================

export const requestTypeKeys = {
  all: ['request-types'] as const,
  lists: () => [...requestTypeKeys.all, 'list'] as const,
  list: (filters?: RequestTypeFilters) => [...requestTypeKeys.lists(), filters] as const,
  details: () => [...requestTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...requestTypeKeys.details(), id] as const,
  blueprints: () => [...requestTypeKeys.all, 'blueprint'] as const,
  blueprint: (code: string) => [...requestTypeKeys.blueprints(), code] as const,
  templates: () => [...requestTypeKeys.all, 'templates'] as const,
  template: (id: string) => [...requestTypeKeys.templates(), id] as const,
};

// =============================================================================
// Request Type Queries
// =============================================================================

/**
 * Fetch all request types
 */
export function useRequestTypes(filters?: RequestTypeFilters) {
  const params = new URLSearchParams();

  if (filters?.category?.length) {
    params.set('category', filters.category.join(','));
  }
  if (filters?.isSystemType !== undefined) {
    params.set('isSystemType', String(filters.isSystemType));
  }
  if (filters?.isActive !== undefined) {
    params.set('isActive', String(filters.isActive));
  }
  if (filters?.search) {
    params.set('search', filters.search);
  }

  const queryString = params.toString();
  const endpoint = `/request-types${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: requestTypeKeys.list(filters),
    queryFn: () => api.get<RequestTypesListResponse>(endpoint),
    select: (response) => response.data,
  });
}

/**
 * Fetch a single request type by ID
 */
export function useRequestType(id: string) {
  return useQuery({
    queryKey: requestTypeKeys.detail(id),
    queryFn: () => api.get<RequestTypeResponse>(`/request-types/${id}`),
    select: (response) => response.data,
    enabled: !!id,
  });
}

/**
 * Fetch a blueprint by request type code
 */
export function useRequestBlueprint(code?: string | null) {
  return useQuery({
    queryKey: requestTypeKeys.blueprint(code || ''),
    queryFn: () => api.get<RequestBlueprintResponse>(`/request-types/blueprints/${code}`),
    select: (response) => response.data,
    enabled: !!code,
  });
}

// =============================================================================
// Request Type Mutations
// =============================================================================

/**
 * Create a new request type
 */
export function useCreateRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRequestTypeInput) =>
      api.post<RequestTypeResponse>('/request-types', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestTypeKeys.lists() });
    },
  });
}

/**
 * Update an existing request type
 */
export function useUpdateRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateRequestTypeInput & { id: string }) =>
      api.put<RequestTypeResponse>(`/request-types/${id}`, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestTypeKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a request type
 */
export function useDeleteRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/request-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestTypeKeys.lists() });
    },
  });
}

/**
 * Clone a request type
 */
export function useCloneRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: CloneRequestTypeInput & { id: string }) =>
      api.post<RequestTypeResponse>(`/request-types/${id}/clone`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestTypeKeys.lists() });
    },
  });
}

/**
 * Assign a workflow to a request type
 */
export function useAssignWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: AssignWorkflowInput & { id: string }) =>
      api.put(`/request-types/${id}/workflow`, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestTypeKeys.detail(variables.id) });
    },
  });
}

// =============================================================================
// Template Queries
// =============================================================================

/**
 * Fetch all request type templates
 */
export function useRequestTypeTemplates() {
  return useQuery({
    queryKey: requestTypeKeys.templates(),
    queryFn: () => api.get<TemplatesListResponse>('/request-types/templates'),
    select: (response) => response.data,
  });
}

/**
 * Fetch a single template by ID
 */
export function useRequestTypeTemplate(id: string) {
  return useQuery({
    queryKey: requestTypeKeys.template(id),
    queryFn: () => api.get<TemplateResponse>(`/request-types/templates/${id}`),
    select: (response) => response.data,
    enabled: !!id,
  });
}

/**
 * Import a template
 */
export function useImportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      api.post<ImportTemplateResponse>(`/request-types/templates/${templateId}/import`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestTypeKeys.lists() });
    },
  });
}
