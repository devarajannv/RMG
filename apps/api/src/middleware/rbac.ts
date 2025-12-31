/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * This module provides RBAC functionality by wrapping the authorize middleware.
 * It exports `requirePermission` as an alias for cleaner API.
 */

import { authorize } from './auth';

/**
 * Require specific permission(s) to access a route
 * This is an alias for the authorize middleware with a clearer name
 * 
 * @example
 * // Single permission
 * router.get('/', authenticate, requirePermission('resource:read'), handler);
 * 
 * // Multiple permissions (all required)
 * router.post('/', authenticate, requirePermission('resource:write', 'resource:create'), handler);
 */
export const requirePermission = authorize;

/**
 * Check if user has ANY of the specified permissions
 */
export function requireAnyPermission(...permissions: string[]) {
  return authorize(...permissions);
}

// Re-export authorize for backwards compatibility
export { authorize };
