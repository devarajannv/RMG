/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * This module provides RBAC functionality by wrapping the authorize middleware.
 * It exports `requirePermission` as an alias for cleaner API.
 */

import { Request, Response, NextFunction } from 'express';
import { authorize, matchesPermission } from './auth';
import { Errors } from './errorHandler';

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
 * Check if user has ANY of the specified permissions (OR logic)
 * Unlike authorize() which requires ALL permissions, this requires at least one.
 */
export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(Errors.unauthorized('Authentication required'));
    }

    // Admin has all permissions
    if (req.user.permissions.includes('*')) {
      return next();
    }

    // Check if user has ANY of the required permissions
    const hasAnyPermission = permissions.some((permission) =>
      req.user!.permissions.some((userPermission) => matchesPermission(userPermission, permission))
    );

    if (!hasAnyPermission) {
      return next(Errors.forbidden('Insufficient permissions'));
    }

    next();
  };
}

// Re-export authorize for backwards compatibility
export { authorize };
