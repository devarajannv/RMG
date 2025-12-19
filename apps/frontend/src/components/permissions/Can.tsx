import React from 'react';
import { usePermissions, hasPermission as checkPermission, hasAnyPermission, hasRole as checkRole, hasAnyRole, canAccessModule } from '@/hooks/usePermissions';

// ============================================================================
// Can Component - Permission Gate
// ============================================================================

interface CanProps {
  /**
   * Single permission to check. User must have this permission.
   * Format: "module:action" or "module:action:scope"
   * Examples: "resources:read", "timesheets:approve", "analytics:read:practice"
   */
  permission?: string;
  
  /**
   * Multiple permissions - user must have ANY of these
   */
  anyPermission?: string[];
  
  /**
   * Multiple permissions - user must have ALL of these
   */
  allPermissions?: string[];
  
  /**
   * Check for a specific role
   */
  role?: string;
  
  /**
   * Multiple roles - user must have ANY of these
   */
  anyRole?: string[];
  
  /**
   * Check if user can access a module (has any permission for it)
   */
  module?: string;
  
  /**
   * What to render if user doesn't have permission
   * Defaults to null (render nothing)
   */
  fallback?: React.ReactNode;
  
  /**
   * Children to render if user has permission
   */
  children: React.ReactNode;
  
  /**
   * If true, inverts the permission check (render if user DOESN'T have permission)
   */
  not?: boolean;
}

/**
 * Permission gate component for conditional rendering based on user permissions.
 * 
 * @example
 * // Single permission
 * <Can permission="resources:create">
 *   <Button>Create Resource</Button>
 * </Can>
 * 
 * @example
 * // Any of multiple permissions
 * <Can anyPermission={['resources:update', 'resources:delete']}>
 *   <Button>Edit</Button>
 * </Can>
 * 
 * @example
 * // With fallback
 * <Can permission="settings:update" fallback={<span>Read only</span>}>
 *   <Button>Save Settings</Button>
 * </Can>
 * 
 * @example
 * // Role-based
 * <Can role="Admin">
 *   <AdminPanel />
 * </Can>
 * 
 * @example
 * // Module access
 * <Can module="analytics">
 *   <AnalyticsDashboard />
 * </Can>
 * 
 * @example
 * // Inverted (show if user DOESN'T have permission)
 * <Can permission="premium:access" not>
 *   <UpgradePrompt />
 * </Can>
 */
export function Can({
  permission,
  anyPermission,
  allPermissions,
  role,
  anyRole: anyRoleCheck,
  module,
  fallback = null,
  children,
  not = false,
}: CanProps): React.ReactElement | null {
  const { permissions, roles, isLoading } = usePermissions();
  
  // While loading, render nothing (or could show loading state)
  if (isLoading) {
    return null;
  }
  
  let hasAccess = false;
  
  // Check single permission
  if (permission) {
    hasAccess = checkPermission(permissions, permission);
  }
  // Check any of multiple permissions
  else if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAnyPermission(permissions, anyPermission);
  }
  // Check all permissions
  else if (allPermissions && allPermissions.length > 0) {
    hasAccess = allPermissions.every(p => checkPermission(permissions, p));
  }
  // Check single role
  else if (role) {
    hasAccess = checkRole(roles, role);
  }
  // Check any of multiple roles
  else if (anyRoleCheck && anyRoleCheck.length > 0) {
    hasAccess = hasAnyRole(roles, anyRoleCheck);
  }
  // Check module access
  else if (module) {
    hasAccess = canAccessModule(permissions, module);
  }
  // No check specified - allow access
  else {
    hasAccess = true;
  }
  
  // Invert if `not` is true
  if (not) {
    hasAccess = !hasAccess;
  }
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// ============================================================================
// CanAccess Component - Alias for Can
// ============================================================================

/**
 * Alias for Can component. Use whichever reads better in your code.
 */
export const CanAccess = Can;

// ============================================================================
// Cannot Component - Inverse permission gate
// ============================================================================

interface CannotProps {
  permission?: string;
  anyPermission?: string[];
  role?: string;
  anyRole?: string[];
  children: React.ReactNode;
}

/**
 * Renders children only if user DOESN'T have the specified permission.
 * Useful for upgrade prompts, access request buttons, etc.
 * 
 * @example
 * <Cannot permission="premium:access">
 *   <Button>Upgrade to Premium</Button>
 * </Cannot>
 */
export function Cannot({
  permission,
  anyPermission,
  role,
  anyRole: anyRoleCheck,
  children,
}: CannotProps): React.ReactElement | null {
  return (
    <Can
      permission={permission}
      anyPermission={anyPermission}
      role={role}
      anyRole={anyRoleCheck}
      not={true}
    >
      {children}
    </Can>
  );
}

// ============================================================================
// AdminOnly Component
// ============================================================================

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only for Admin users.
 * 
 * @example
 * <AdminOnly>
 *   <DangerZone />
 * </AdminOnly>
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps): React.ReactElement | null {
  return (
    <Can anyRole={['Admin', 'Super Admin', 'admin']} fallback={fallback}>
      {children}
    </Can>
  );
}

// ============================================================================
// ManagerOnly Component
// ============================================================================

interface ManagerOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only for Manager or Admin users.
 * 
 * @example
 * <ManagerOnly>
 *   <ApprovalQueue />
 * </ManagerOnly>
 */
export function ManagerOnly({ children, fallback = null }: ManagerOnlyProps): React.ReactElement | null {
  return (
    <Can anyRole={['Admin', 'Super Admin', 'admin', 'Manager', 'manager', 'Practice Lead', 'Delivery Head']} fallback={fallback}>
      {children}
    </Can>
  );
}

// ============================================================================
// IfCan Higher-Order Component (HOC)
// ============================================================================

interface IfCanOptions {
  permission?: string;
  anyPermission?: string[];
  role?: string;
  anyRole?: string[];
  fallback?: React.ComponentType;
}

/**
 * Higher-order component that wraps a component with permission check.
 * 
 * @example
 * const ProtectedButton = ifCan(Button, { permission: 'resources:create' });
 */
export function ifCan<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: IfCanOptions
): React.FC<P> {
  const WithPermission: React.FC<P> = (props) => {
    const FallbackComponent = options.fallback;
    
    return (
      <Can
        permission={options.permission}
        anyPermission={options.anyPermission}
        role={options.role}
        anyRole={options.anyRole}
        fallback={FallbackComponent ? <FallbackComponent {...props} /> : null}
      >
        <WrappedComponent {...props} />
      </Can>
    );
  };
  
  WithPermission.displayName = `IfCan(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithPermission;
}

// ============================================================================
// useRequirePermission Hook
// ============================================================================

interface RequirePermissionOptions {
  permission?: string;
  anyPermission?: string[];
  allPermissions?: string[];
  role?: string;
  anyRole?: string[];
  redirectTo?: string;
  onDenied?: () => void;
}

/**
 * Hook that checks permissions and optionally redirects or calls a callback if denied.
 * Useful for page-level permission checks.
 * 
 * @example
 * function AdminPage() {
 *   const { isAllowed, isChecking } = useRequirePermission({
 *     role: 'Admin',
 *     redirectTo: '/dashboard'
 *   });
 *   
 *   if (isChecking) return <Loading />;
 *   if (!isAllowed) return null; // Will redirect
 *   
 *   return <AdminContent />;
 * }
 */
export function useRequirePermission(options: RequirePermissionOptions): {
  isAllowed: boolean;
  isChecking: boolean;
} {
  const { permissions, roles, isLoading } = usePermissions();
  const [hasChecked, setHasChecked] = React.useState(false);
  
  const isAllowed = React.useMemo(() => {
    if (isLoading) return false;
    
    if (options.permission) {
      return checkPermission(permissions, options.permission);
    }
    if (options.anyPermission) {
      return hasAnyPermission(permissions, options.anyPermission);
    }
    if (options.allPermissions) {
      return options.allPermissions.every(p => checkPermission(permissions, p));
    }
    if (options.role) {
      return checkRole(roles, options.role);
    }
    if (options.anyRole) {
      return hasAnyRole(roles, options.anyRole);
    }
    
    return true;
  }, [permissions, roles, isLoading, options]);
  
  React.useEffect(() => {
    if (!isLoading && !hasChecked) {
      setHasChecked(true);
      
      if (!isAllowed) {
        if (options.redirectTo) {
          window.location.href = options.redirectTo;
        }
        if (options.onDenied) {
          options.onDenied();
        }
      }
    }
  }, [isLoading, isAllowed, hasChecked, options]);
  
  return {
    isAllowed,
    isChecking: isLoading || !hasChecked,
  };
}
