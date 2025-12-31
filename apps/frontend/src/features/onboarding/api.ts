/**
 * Onboarding API Hooks
 * 
 * TanStack Query hooks for the Organization Onboarding module.
 * Provides data fetching, mutations, and cache management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  TenantProfile,
  TenantProfileInput,
  BrandingInput,
  RegionalInput,
  Industry,
  Department,
  DepartmentInput,
  Team,
  TeamInput,
  CostCenter,
  CostCenterInput,
  StructureSummary,
  BusinessRole,
  BusinessRoleInput,
  GradeBand,
  GradeBandInput,
  ResourceBusinessRole,
  Resource,
  ResourceInput,
  UserInvitation,
  InvitationInput,
  ImportResourceRow,
  ImportValidationResult,
  ImportResult,
  PeopleStats,
  DelegationRule,
  DelegationRuleInput,
  GovernanceStatus,
  OnboardingProgress,
  OnboardingSummary,
  PhaseConfig,
} from './types';

const BASE = '/onboarding';

// ============================================================================
// Query Keys
// ============================================================================

export const onboardingKeys = {
  all: ['onboarding'] as const,
  progress: () => [...onboardingKeys.all, 'progress'] as const,
  summary: () => [...onboardingKeys.all, 'summary'] as const,
  phases: () => [...onboardingKeys.all, 'phases'] as const,
  
  // Identity
  profile: () => [...onboardingKeys.all, 'profile'] as const,
  industries: () => [...onboardingKeys.all, 'industries'] as const,
  
  // Structure
  departments: () => [...onboardingKeys.all, 'departments'] as const,
  department: (id: string) => [...onboardingKeys.departments(), id] as const,
  teams: () => [...onboardingKeys.all, 'teams'] as const,
  team: (id: string) => [...onboardingKeys.teams(), id] as const,
  costCenters: () => [...onboardingKeys.all, 'cost-centers'] as const,
  costCenter: (id: string) => [...onboardingKeys.costCenters(), id] as const,
  structureSummary: () => [...onboardingKeys.all, 'structure-summary'] as const,
  
  // Roles
  businessRoles: () => [...onboardingKeys.all, 'business-roles'] as const,
  businessRole: (id: string) => [...onboardingKeys.businessRoles(), id] as const,
  gradeBands: () => [...onboardingKeys.all, 'grade-bands'] as const,
  gradeBand: (id: string) => [...onboardingKeys.gradeBands(), id] as const,
  resourceRoles: (resourceId: string) => [...onboardingKeys.all, 'resource-roles', resourceId] as const,
  
  // People
  resources: () => [...onboardingKeys.all, 'resources'] as const,
  resource: (id: string) => [...onboardingKeys.resources(), id] as const,
  invitations: () => [...onboardingKeys.all, 'invitations'] as const,
  invitation: (id: string) => [...onboardingKeys.invitations(), id] as const,
  peopleStats: () => [...onboardingKeys.all, 'people-stats'] as const,
  
  // Governance
  delegationRules: () => [...onboardingKeys.all, 'delegation-rules'] as const,
  delegationRule: (id: string) => [...onboardingKeys.delegationRules(), id] as const,
  governanceStatus: () => [...onboardingKeys.all, 'governance-status'] as const,
};

// ============================================================================
// Progress & Orchestration Hooks
// ============================================================================

export function useOnboardingProgress() {
  return useQuery({
    queryKey: onboardingKeys.progress(),
    queryFn: () => api.get<OnboardingProgress>(`${BASE}/progress`),
  });
}

export function useOnboardingSummary() {
  return useQuery({
    queryKey: onboardingKeys.summary(),
    queryFn: () => api.get<OnboardingSummary>(`${BASE}/summary`),
  });
}

export function usePhaseConfigs() {
  return useQuery({
    queryKey: onboardingKeys.phases(),
    queryFn: () => api.get<PhaseConfig[]>(`${BASE}/phases`),
  });
}

export function useCompleteStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { phase: number; stepCode: string }) =>
      api.post<{ message: string }>(`${BASE}/steps/complete`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.summary() });
    },
  });
}

export function useSkipStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { phase: number; stepCode: string }) =>
      api.post<{ message: string }>(`${BASE}/steps/skip`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.summary() });
    },
  });
}

export function useResetStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { phase: number; stepCode: string }) =>
      api.post<{ message: string }>(`${BASE}/steps/reset`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.summary() });
    },
  });
}

export function useInitializeDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ message: string; counts: Record<string, number> }>(`${BASE}/initialize`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
  });
}

export function useMarkOnboardingComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ message: string; profile: TenantProfile }>(`${BASE}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
  });
}

// ============================================================================
// Phase 1: Identity Hooks
// ============================================================================

export function useTenantProfile() {
  return useQuery({
    queryKey: onboardingKeys.profile(),
    queryFn: () => api.get<TenantProfile>(`${BASE}/profile`),
  });
}

export function useUpdateTenantProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TenantProfileInput) =>
      api.put<TenantProfile>(`${BASE}/profile`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.profile() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BrandingInput) =>
      api.patch<TenantProfile>(`${BASE}/profile/branding`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.profile() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateRegional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegionalInput) =>
      api.patch<TenantProfile>(`${BASE}/profile/regional`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.profile() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useIndustries() {
  return useQuery({
    queryKey: onboardingKeys.industries(),
    queryFn: () => api.get<Industry[]>(`${BASE}/industries`),
  });
}

// ============================================================================
// Phase 2: Structure Hooks
// ============================================================================

// Departments
export function useDepartments() {
  return useQuery({
    queryKey: onboardingKeys.departments(),
    queryFn: () => api.get<Department[]>(`${BASE}/departments`),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: onboardingKeys.department(id),
    queryFn: () => api.get<Department>(`${BASE}/departments/${id}`),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DepartmentInput) =>
      api.post<Department>(`${BASE}/departments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.departments() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.structureSummary() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DepartmentInput> }) =>
      api.put<Department>(`${BASE}/departments/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.departments() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.department(id) });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.departments() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.structureSummary() });
    },
  });
}

export function useSeedDefaultDepartments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ message: string; count: number }>(`${BASE}/departments/seed-defaults`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.departments() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.structureSummary() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

// Teams
export function useTeams() {
  return useQuery({
    queryKey: onboardingKeys.teams(),
    queryFn: () => api.get<Team[]>(`${BASE}/teams`),
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: onboardingKeys.team(id),
    queryFn: () => api.get<Team>(`${BASE}/teams/${id}`),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TeamInput) =>
      api.post<Team>(`${BASE}/teams`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.teams() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.structureSummary() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TeamInput> }) =>
      api.put<Team>(`${BASE}/teams/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.teams() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.team(id) });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.teams() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.structureSummary() });
    },
  });
}

// Cost Centers
export function useCostCenters() {
  return useQuery({
    queryKey: onboardingKeys.costCenters(),
    queryFn: () => api.get<CostCenter[]>(`${BASE}/cost-centers`),
  });
}

export function useCostCenter(id: string) {
  return useQuery({
    queryKey: onboardingKeys.costCenter(id),
    queryFn: () => api.get<CostCenter>(`${BASE}/cost-centers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCostCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CostCenterInput) =>
      api.post<CostCenter>(`${BASE}/cost-centers`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.costCenters() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.structureSummary() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateCostCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CostCenterInput> }) =>
      api.put<CostCenter>(`${BASE}/cost-centers/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.costCenters() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.costCenter(id) });
    },
  });
}

export function useDeleteCostCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/cost-centers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.costCenters() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.structureSummary() });
    },
  });
}

export function useStructureSummary() {
  return useQuery({
    queryKey: onboardingKeys.structureSummary(),
    queryFn: () => api.get<StructureSummary>(`${BASE}/structure/summary`),
  });
}

// ============================================================================
// Phase 3: Roles Hooks
// ============================================================================

// Business Roles
export function useBusinessRoles() {
  return useQuery({
    queryKey: onboardingKeys.businessRoles(),
    queryFn: () => api.get<BusinessRole[]>(`${BASE}/business-roles`),
  });
}

export function useBusinessRole(id: string) {
  return useQuery({
    queryKey: onboardingKeys.businessRole(id),
    queryFn: () => api.get<BusinessRole>(`${BASE}/business-roles/${id}`),
    enabled: !!id,
  });
}

export function useCreateBusinessRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BusinessRoleInput) =>
      api.post<BusinessRole>(`${BASE}/business-roles`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.businessRoles() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateBusinessRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BusinessRoleInput> }) =>
      api.put<BusinessRole>(`${BASE}/business-roles/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.businessRoles() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.businessRole(id) });
    },
  });
}

export function useDeleteBusinessRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/business-roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.businessRoles() });
    },
  });
}

export function useSeedDefaultBusinessRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ message: string; count: number }>(`${BASE}/business-roles/seed-defaults`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.businessRoles() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

// Grade Bands
export function useGradeBands() {
  return useQuery({
    queryKey: onboardingKeys.gradeBands(),
    queryFn: () => api.get<GradeBand[]>(`${BASE}/grade-bands`),
  });
}

export function useGradeBand(id: string) {
  return useQuery({
    queryKey: onboardingKeys.gradeBand(id),
    queryFn: () => api.get<GradeBand>(`${BASE}/grade-bands/${id}`),
    enabled: !!id,
  });
}

export function useCreateGradeBand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GradeBandInput) =>
      api.post<GradeBand>(`${BASE}/grade-bands`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.gradeBands() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateGradeBand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GradeBandInput> }) =>
      api.put<GradeBand>(`${BASE}/grade-bands/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.gradeBands() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.gradeBand(id) });
    },
  });
}

export function useDeleteGradeBand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/grade-bands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.gradeBands() });
    },
  });
}

export function useSeedDefaultGradeBands() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ message: string; count: number }>(`${BASE}/grade-bands/seed-defaults`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.gradeBands() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

// Resource Business Roles
export function useResourceRoles(resourceId: string) {
  return useQuery({
    queryKey: onboardingKeys.resourceRoles(resourceId),
    queryFn: () => api.get<ResourceBusinessRole[]>(`${BASE}/resources/${resourceId}/roles`),
    enabled: !!resourceId,
  });
}

export function useAssignRoleToResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, data }: { 
      resourceId: string; 
      data: { businessRoleId: string; effectiveFrom: string; isPrimary?: boolean } 
    }) => api.post<ResourceBusinessRole>(`${BASE}/resources/${resourceId}/roles`, data),
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resourceRoles(resourceId) });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resource(resourceId) });
    },
  });
}

export function useRemoveRoleFromResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, roleAssignmentId }: { resourceId: string; roleAssignmentId: string }) =>
      api.delete<void>(`${BASE}/resources/${resourceId}/roles/${roleAssignmentId}`),
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resourceRoles(resourceId) });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resource(resourceId) });
    },
  });
}

// ============================================================================
// Phase 4: People Hooks
// ============================================================================

// Resources
export function useResources() {
  return useQuery({
    queryKey: onboardingKeys.resources(),
    queryFn: () => api.get<Resource[]>(`${BASE}/resources`),
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: onboardingKeys.resource(id),
    queryFn: () => api.get<Resource>(`${BASE}/resources/${id}`),
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ResourceInput) =>
      api.post<Resource>(`${BASE}/resources`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resources() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.peopleStats() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ResourceInput> }) =>
      api.put<Resource>(`${BASE}/resources/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resources() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resource(id) });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resources() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.peopleStats() });
    },
  });
}

export function useCreateUserForResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, password }: { resourceId: string; password?: string }) =>
      api.post<{ user: { id: string; email: string }; temporaryPassword?: string }>(
        `${BASE}/resources/${resourceId}/user`,
        { password }
      ),
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resource(resourceId) });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resources() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.peopleStats() });
    },
  });
}

// Invitations
export function useInvitations() {
  return useQuery({
    queryKey: onboardingKeys.invitations(),
    queryFn: () => api.get<UserInvitation[]>(`${BASE}/invitations`),
  });
}

export function useInvitation(id: string) {
  return useQuery({
    queryKey: onboardingKeys.invitation(id),
    queryFn: () => api.get<UserInvitation>(`${BASE}/invitations/${id}`),
    enabled: !!id,
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvitationInput) =>
      api.post<UserInvitation>(`${BASE}/invitations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.invitations() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.peopleStats() });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.invitations() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.peopleStats() });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<UserInvitation>(`${BASE}/invitations/${id}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.invitations() });
    },
  });
}

// Import/Export
export function useValidateImport() {
  return useMutation({
    mutationFn: (data: ImportResourceRow[]) =>
      api.post<ImportValidationResult>(`${BASE}/resources/validate-import`, { rows: data }),
  });
}

export function useImportResources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ImportResourceRow[]) =>
      api.post<ImportResult>(`${BASE}/resources/import`, { rows: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.resources() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.peopleStats() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useExportResources() {
  return useQuery({
    queryKey: [...onboardingKeys.resources(), 'export'],
    queryFn: () => api.get<ImportResourceRow[]>(`${BASE}/resources/export`),
    enabled: false, // Manual trigger only
  });
}

// People Stats
export function usePeopleStats() {
  return useQuery({
    queryKey: onboardingKeys.peopleStats(),
    queryFn: () => api.get<PeopleStats>(`${BASE}/people/stats`),
  });
}

// ============================================================================
// Phase 5: Governance Hooks
// ============================================================================

export function useDelegationRules() {
  return useQuery({
    queryKey: onboardingKeys.delegationRules(),
    queryFn: () => api.get<DelegationRule[]>(`${BASE}/delegation-rules`),
  });
}

export function useDelegationRule(id: string) {
  return useQuery({
    queryKey: onboardingKeys.delegationRule(id),
    queryFn: () => api.get<DelegationRule>(`${BASE}/delegation-rules/${id}`),
    enabled: !!id,
  });
}

export function useCreateDelegationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DelegationRuleInput) =>
      api.post<DelegationRule>(`${BASE}/delegation-rules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.delegationRules() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.governanceStatus() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useUpdateDelegationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DelegationRuleInput> }) =>
      api.put<DelegationRule>(`${BASE}/delegation-rules/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.delegationRules() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.delegationRule(id) });
    },
  });
}

export function useDeleteDelegationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/delegation-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.delegationRules() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.governanceStatus() });
    },
  });
}

export function useSeedDefaultDelegationRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ message: string; count: number }>(`${BASE}/delegation-rules/seed-defaults`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.delegationRules() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.governanceStatus() });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() });
    },
  });
}

export function useGovernanceStatus() {
  return useQuery({
    queryKey: onboardingKeys.governanceStatus(),
    queryFn: () => api.get<GovernanceStatus>(`${BASE}/governance/status`),
  });
}
