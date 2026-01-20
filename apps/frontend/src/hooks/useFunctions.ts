/**
 * Approval Functions API Hooks
 * 
 * React Query hooks for the approval functions system.
 * Provides CRUD operations for functions and assignments.
 * 
 * Created: January 20, 2026
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ApprovalFunction,
  FunctionsListResponse,
  AssignmentsListResponse,
  FunctionResponse,
  AssignmentResponse,
  HoldersResponse,
  MyAssignmentsResponse,
  CreateFunctionInput,
  UpdateFunctionInput,
  CreateAssignmentInput,
  DelegateInput,
  FunctionFilters,
} from '@/types/functions';

// =============================================================================
// Query Keys
// =============================================================================

export const functionKeys = {
  all: ['functions'] as const,
  lists: () => [...functionKeys.all, 'list'] as const,
  list: (filters?: FunctionFilters) => [...functionKeys.lists(), filters] as const,
  details: () => [...functionKeys.all, 'detail'] as const,
  detail: (id: string) => [...functionKeys.details(), id] as const,
  holders: (id: string) => [...functionKeys.all, 'holders', id] as const,
  assignments: (id: string) => [...functionKeys.all, 'assignments', id] as const,
  myAssignments: () => [...functionKeys.all, 'my-assignments'] as const,
};

export const assignmentKeys = {
  all: ['assignments'] as const,
  detail: (id: string) => [...assignmentKeys.all, id] as const,
};

// =============================================================================
// Function Queries
// =============================================================================

/**
 * Fetch all approval functions
 */
export function useFunctions(filters?: FunctionFilters) {
  const params = new URLSearchParams();
  
  if (filters?.status?.length) {
    params.set('status', filters.status.join(','));
  }
  if (filters?.category?.length) {
    params.set('category', filters.category.join(','));
  }
  if (filters?.scopeType?.length) {
    params.set('scopeType', filters.scopeType.join(','));
  }
  if (filters?.isSystem !== undefined) {
    params.set('isSystem', String(filters.isSystem));
  }
  if (filters?.search) {
    params.set('search', filters.search);
  }

  const queryString = params.toString();
  const endpoint = `/functions${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: functionKeys.list(filters),
    queryFn: () => api.get<FunctionsListResponse>(endpoint),
    select: (response) => response.data,
  });
}

/**
 * Fetch a single approval function by ID
 */
export function useFunction(id: string) {
  return useQuery({
    queryKey: functionKeys.detail(id),
    queryFn: () => api.get<FunctionResponse>(`/functions/${id}`),
    select: (response) => response.data,
    enabled: !!id,
  });
}

/**
 * Fetch holders of a function
 */
export function useFunctionHolders(functionId: string) {
  return useQuery({
    queryKey: functionKeys.holders(functionId),
    queryFn: () => api.get<HoldersResponse>(`/functions/${functionId}/holders`),
    select: (response) => response.data,
    enabled: !!functionId,
  });
}

/**
 * Fetch assignments for a function
 */
export function useFunctionAssignments(functionId: string, activeOnly = true) {
  return useQuery({
    queryKey: functionKeys.assignments(functionId),
    queryFn: () =>
      api.get<AssignmentsListResponse>(
        `/functions/${functionId}/assignments?activeOnly=${activeOnly}`
      ),
    select: (response) => response.data,
    enabled: !!functionId,
  });
}

/**
 * Fetch current user's function assignments
 */
export function useMyAssignments() {
  return useQuery({
    queryKey: functionKeys.myAssignments(),
    queryFn: () => api.get<MyAssignmentsResponse>('/functions/my-assignments'),
    select: (response) => response.data,
  });
}

// =============================================================================
// Function Mutations
// =============================================================================

/**
 * Create a new approval function
 */
export function useCreateFunction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFunctionInput) =>
      api.post<FunctionResponse>('/functions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: functionKeys.lists() });
    },
  });
}

/**
 * Update an approval function
 */
export function useUpdateFunction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFunctionInput }) =>
      api.patch<FunctionResponse>(`/functions/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: functionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: functionKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete an approval function
 */
export function useDeleteFunction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/functions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: functionKeys.lists() });
    },
  });
}

// =============================================================================
// Assignment Mutations
// =============================================================================

/**
 * Create a function assignment
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssignmentInput) =>
      api.post<AssignmentResponse>(`/functions/${data.functionId}/assignments`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: functionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: functionKeys.holders(variables.functionId) });
      queryClient.invalidateQueries({ queryKey: functionKeys.assignments(variables.functionId) });
      queryClient.invalidateQueries({ queryKey: functionKeys.myAssignments() });
    },
  });
}

/**
 * Revoke a function assignment
 */
export function useRevokeAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason?: string }) =>
      api.delete(`/assignments/${assignmentId}`, {
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: functionKeys.all });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

/**
 * Delegate a function to another user
 */
export function useDelegateFunction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: DelegateInput }) =>
      api.post<AssignmentResponse>(`/assignments/${assignmentId}/delegate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: functionKeys.all });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Get functions for dropdown selection (active only)
 */
export function useFunctionsForSelect() {
  return useFunctions({ status: ['ACTIVE'] });
}

/**
 * Check if a function can be deleted
 */
export function canDeleteFunction(func: ApprovalFunction): { canDelete: boolean; reason?: string } {
  if (func.isSystem) {
    return { canDelete: false, reason: 'System functions cannot be deleted' };
  }
  if (func._count?.approvalSteps && func._count.approvalSteps > 0) {
    return { canDelete: false, reason: 'Function is used in approval workflows' };
  }
  return { canDelete: true };
}
