import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface UserPermissions {
  permissions: string[];
  roles: string[];
}

export interface PermissionResponse {
  user: {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
    permissions: string[];
  };
}

// Permission modules for easy reference
export const MODULES = {
  RESOURCES: 'resources',
  PROJECTS: 'projects',
  ALLOCATIONS: 'allocations',
  TIMESHEETS: 'timesheets',
  CLIENTS: 'clients',
  CONTRACTS: 'contracts',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  ROLES: 'roles',
  DOCUMENTS: 'documents',
  REQUESTS: 'requests',
  BENCH: 'bench',
  CTC: 'ctc',
} as const;

// Permission actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
  ASSIGN: 'assign',
} as const;

// Permission scopes
export const SCOPES = {
  OWN: 'own',
  TEAM: 'team',
  PRACTICE: 'practice',
  ALL: 'all',
} as const;

// Commonly used permission strings
export const PERMISSIONS = {
  // Resources
  RESOURCES_CREATE: 'resources:create',
  RESOURCES_READ: 'resources:read',
  RESOURCES_UPDATE: 'resources:update',
  RESOURCES_DELETE: 'resources:delete',
  RESOURCES_READ_OWN: 'resources:read:own',
  RESOURCES_READ_TEAM: 'resources:read:team',
  
  // Projects
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_READ: 'projects:read',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  
  // Allocations
  ALLOCATIONS_CREATE: 'allocations:create',
  ALLOCATIONS_READ: 'allocations:read',
  ALLOCATIONS_UPDATE: 'allocations:update',
  ALLOCATIONS_DELETE: 'allocations:delete',
  ALLOCATIONS_APPROVE: 'allocations:approve',
  
  // Timesheets
  TIMESHEETS_CREATE: 'timesheets:create',
  TIMESHEETS_READ: 'timesheets:read',
  TIMESHEETS_UPDATE: 'timesheets:update',
  TIMESHEETS_APPROVE: 'timesheets:approve',
  
  // Clients
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_READ: 'clients:read',
  CLIENTS_UPDATE: 'clients:update',
  CLIENTS_DELETE: 'clients:delete',
  
  // Contracts
  CONTRACTS_CREATE: 'contracts:create',
  CONTRACTS_READ: 'contracts:read',
  CONTRACTS_UPDATE: 'contracts:update',
  CONTRACTS_DELETE: 'contracts:delete',
  CONTRACTS_APPROVE: 'contracts:approve',
  
  // Reports & Analytics
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_READ_PRACTICE: 'analytics:read:practice',
  
  // Settings & Roles
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_ASSIGN: 'roles:assign',
  
  // Documents
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_UPDATE: 'documents:update',
  DOCUMENTS_DELETE: 'documents:delete',
  DOCUMENTS_APPROVE: 'documents:approve',
  
  // Requests
  REQUESTS_CREATE: 'requests:create',
  REQUESTS_READ: 'requests:read',
  REQUESTS_UPDATE: 'requests:update',
  REQUESTS_APPROVE: 'requests:approve',
  
  // CTC (sensitive)
  CTC_READ_OWN: 'ctc:read:own',
  CTC_READ_ALL: 'ctc:read:all',
} as const;

// ============================================================================
// Permission Checking Utilities
// ============================================================================

/**
 * Check if a specific permission is in the permissions array
 * Handles hierarchical permissions (e.g., resources:read includes resources:read:own)
 * Handles wildcard permissions (e.g., '*' matches everything, 'resources:*' matches all resource permissions)
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  // Wildcard - has all permissions
  if (permissions.includes('*')) return true;
  
  // Exact match
  if (permissions.includes(permission)) return true;
  
  // Check for module-level wildcard (e.g., 'resources:*' matches 'resources:read')
  const parts = permission.split(':');
  if (parts.length >= 2) {
    const moduleWildcard = `${parts[0]}:*`;
    if (permissions.includes(moduleWildcard)) return true;
  }
  
  // Check for broader permission
  // e.g., if user has 'resources:read', they implicitly have 'resources:read:own'
  if (parts.length === 3) {
    const broaderPermission = `${parts[0]}:${parts[1]}`;
    if (permissions.includes(broaderPermission)) return true;
  }
  
  return false;
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(p => hasPermission(permissions, p));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(p => hasPermission(permissions, p));
}

/**
 * Check if user has a specific role
 */
export function hasRole(roles: string[], role: string): boolean {
  return roles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(roles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some(r => roles.includes(r));
}

/**
 * Check if user can access a specific module (has any permission for it)
 */
export function canAccessModule(permissions: string[], module: string): boolean {
  return permissions.some(p => p.startsWith(`${module}:`));
}

// ============================================================================
// React Query Hook
// ============================================================================

const PERMISSIONS_QUERY_KEY = ['user-permissions'];

export function usePermissions() {
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: async (): Promise<UserPermissions> => {
      const response = await api.get<PermissionResponse>('/auth/me');
      return {
        permissions: response.user.permissions || [],
        roles: response.user.roles || [],
      };
    },
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    // Use initial data from auth store if available
    initialData: user?.roles ? {
      permissions: [],
      roles: user.roles,
    } : undefined,
  });

  const permissions = data?.permissions ?? [];
  const roles = data?.roles ?? [];

  return {
    // Data
    permissions,
    roles,
    
    // Loading states
    isLoading,
    error,
    
    // Permission checks (memoized via closure)
    hasPermission: (permission: string) => hasPermission(permissions, permission),
    hasAnyPermission: (requiredPermissions: string[]) => hasAnyPermission(permissions, requiredPermissions),
    hasAllPermissions: (requiredPermissions: string[]) => hasAllPermissions(permissions, requiredPermissions),
    
    // Role checks
    hasRole: (role: string) => hasRole(roles, role),
    hasAnyRole: (requiredRoles: string[]) => hasAnyRole(roles, requiredRoles),
    
    // Module access
    canAccessModule: (module: string) => canAccessModule(permissions, module),
    
    // Utility
    refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY }),
    
    // Admin check
    isAdmin: hasAnyRole(roles, ['Admin', 'Super Admin', 'admin']),
    
    // Quick permission checks for common actions
    can: {
      // Resources
      createResource: hasPermission(permissions, PERMISSIONS.RESOURCES_CREATE),
      readResources: hasAnyPermission(permissions, [PERMISSIONS.RESOURCES_READ, PERMISSIONS.RESOURCES_READ_TEAM]),
      updateResource: hasPermission(permissions, PERMISSIONS.RESOURCES_UPDATE),
      deleteResource: hasPermission(permissions, PERMISSIONS.RESOURCES_DELETE),
      
      // Projects
      createProject: hasPermission(permissions, PERMISSIONS.PROJECTS_CREATE),
      readProjects: hasPermission(permissions, PERMISSIONS.PROJECTS_READ),
      updateProject: hasPermission(permissions, PERMISSIONS.PROJECTS_UPDATE),
      deleteProject: hasPermission(permissions, PERMISSIONS.PROJECTS_DELETE),
      
      // Allocations
      createAllocation: hasPermission(permissions, PERMISSIONS.ALLOCATIONS_CREATE),
      readAllocations: hasPermission(permissions, PERMISSIONS.ALLOCATIONS_READ),
      approveAllocation: hasPermission(permissions, PERMISSIONS.ALLOCATIONS_APPROVE),
      
      // Timesheets
      createTimesheet: hasPermission(permissions, PERMISSIONS.TIMESHEETS_CREATE),
      readTimesheets: hasPermission(permissions, PERMISSIONS.TIMESHEETS_READ),
      approveTimesheet: hasPermission(permissions, PERMISSIONS.TIMESHEETS_APPROVE),
      
      // Clients
      createClient: hasPermission(permissions, PERMISSIONS.CLIENTS_CREATE),
      readClients: hasPermission(permissions, PERMISSIONS.CLIENTS_READ),
      updateClient: hasPermission(permissions, PERMISSIONS.CLIENTS_UPDATE),
      deleteClient: hasPermission(permissions, PERMISSIONS.CLIENTS_DELETE),
      
      // Contracts
      createContract: hasPermission(permissions, PERMISSIONS.CONTRACTS_CREATE),
      readContracts: hasPermission(permissions, PERMISSIONS.CONTRACTS_READ),
      approveContract: hasPermission(permissions, PERMISSIONS.CONTRACTS_APPROVE),
      
      // Reports & Analytics
      readReports: hasPermission(permissions, PERMISSIONS.REPORTS_READ),
      exportReports: hasPermission(permissions, PERMISSIONS.REPORTS_EXPORT),
      readAnalytics: hasPermission(permissions, PERMISSIONS.ANALYTICS_READ),
      
      // Settings
      readSettings: hasPermission(permissions, PERMISSIONS.SETTINGS_READ),
      updateSettings: hasPermission(permissions, PERMISSIONS.SETTINGS_UPDATE),
      
      // Roles
      manageRoles: hasAnyPermission(permissions, [PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_UPDATE]),
      assignRoles: hasPermission(permissions, PERMISSIONS.ROLES_ASSIGN),
      
      // Requests
      createRequest: hasPermission(permissions, PERMISSIONS.REQUESTS_CREATE),
      readRequests: hasPermission(permissions, PERMISSIONS.REQUESTS_READ),
      approveRequest: hasPermission(permissions, PERMISSIONS.REQUESTS_APPROVE),
      
      // CTC
      readOwnCTC: hasPermission(permissions, PERMISSIONS.CTC_READ_OWN),
      readAllCTC: hasPermission(permissions, PERMISSIONS.CTC_READ_ALL),
    },
  };
}

// ============================================================================
// Export types
// ============================================================================

export type UsePermissionsReturn = ReturnType<typeof usePermissions>;
