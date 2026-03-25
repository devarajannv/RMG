import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/jwt';
import { isTokenBlacklisted } from '../lib/redis';
import { ApiError, Errors } from './errorHandler';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';
import { buildPermissionKey, canonicalizePermissionKey, expandPermissionKeys } from '../modules/roles/permission-catalog';

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

const PERMISSION_MODULE_ALIASES: Record<string, string[]> = {
  resource: ['resources'],
  resources: ['resource'],
  project: ['projects'],
  projects: ['project'],
  allocation: ['allocations'],
  allocations: ['allocation'],
  timesheet: ['timesheets'],
  timesheets: ['timesheet'],
  client: ['clients'],
  clients: ['client'],
  contract: ['contracts'],
  contracts: ['contract'],
  document: ['documents'],
  documents: ['document'],
  request: ['requests'],
  requests: ['request'],
  role: ['roles'],
  roles: ['role'],
  workflow: ['workflows'],
  workflows: ['workflow'],
  report: ['reports'],
  reports: ['report'],
};

function getPermissionVariants(permission: string): string[] {
  const parts = permission.split(':');
  if (parts.length < 2) {
    return [permission];
  }

  const [module, ...rest] = parts;
  const moduleVariants = [module, ...(PERMISSION_MODULE_ALIASES[module] ?? [])];

  return moduleVariants.map((moduleVariant) => [moduleVariant, ...rest].join(':'));
}

export function matchesPermission(userPermission: string, requiredPermission: string): boolean {
  const normalizedUserPermission = canonicalizePermissionKey(userPermission);
  const requiredVariants = getPermissionVariants(canonicalizePermissionKey(requiredPermission));

  return requiredVariants.some((variant) => {
    if (normalizedUserPermission === variant) {
      return true;
    }

    const userParts = normalizedUserPermission.split(':');
    const variantParts = variant.split(':');

    return userParts[0] === variantParts[0] && userParts[1] === '*';
  });
}

/**
 * Authentication middleware
 * Verifies JWT and attaches user to request
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.signedCookies?.accessToken;
    
    let token: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      throw Errors.unauthorized('No authentication token provided');
    }

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      throw Errors.unauthorized('Token has been revoked');
    }

    // Verify token
    let payload: AccessTokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      logger.warn('Token verification failed', { error: (err as Error).message });
      throw Errors.unauthorized('Invalid or expired token');
    }

    // Load user with roles (exclude sensitive fields from memory)
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        emailVerified: true,
        status: true,
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw Errors.unauthorized('User not found or inactive');
    }

    const emailVerificationExemptPaths = ['/api/v1/auth/send-verification'];
    const currentPath = req.originalUrl || req.path || '';
    const isEmailVerificationExempt = emailVerificationExemptPaths.some((path) =>
      currentPath.startsWith(path)
    );

    if (!user.emailVerified && !isEmailVerificationExempt) {
      throw new ApiError('Email verification required', 403, 'EMAIL_NOT_VERIFIED');
    }

    // Extract roles and permissions
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = new Set<string>();
    
    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        if (!rolePermission.granted) {
          continue;
        }

        permissions.add(
          buildPermissionKey(
            rolePermission.permission.module,
            rolePermission.permission.action,
            rolePermission.permission.scope
          )
        );
      }

      const legacyPermissions = Array.isArray(userRole.role.permissions)
        ? (userRole.role.permissions as string[])
        : [];
      for (const permission of legacyPermissions) {
        permissions.add(permission);
      }
    }

    const effectivePermissions = expandPermissionKeys(Array.from(permissions));

    // Attach user to request
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
      permissions: effectivePermissions,
    };
    req.tenantId = user.tenantId;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await authenticate(req, res, () => {});
  } catch {
    // Ignore auth errors for optional auth
  }
  next();
}

/**
 * Authorization middleware factory
 * Check if user has required permissions
 */
export function authorize(...requiredPermissions: string[]) {
  // M-08: Prevent accidental authorization bypass with zero arguments
  if (requiredPermissions.length === 0) {
    throw new Error('authorize() requires at least one permission argument');
  }

  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(Errors.unauthorized('Authentication required'));
    }

    // Admin has all permissions
    if (req.user.permissions.includes('*')) {
      return next();
    }

    // Check each required permission
    const hasAllPermissions = requiredPermissions.every((permission) => {
      return req.user!.permissions.some((userPermission) =>
        matchesPermission(userPermission, permission)
      );
    });

    if (!hasAllPermissions) {
      return next(
        Errors.forbidden('Insufficient permissions')
      );
    }

    next();
  };
}

/**
 * Role check middleware factory
 */
export function requireRoles(...requiredRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(Errors.unauthorized('Authentication required'));
    }

    const normalizeRole = (role: string) => role.replace(/[\s_-]+/g, '').toUpperCase();
    const normalizedUserRoles = new Set(req.user.roles.map((role) => normalizeRole(role)));

    const hasRole = requiredRoles.some((role) =>
      normalizedUserRoles.has(normalizeRole(role))
    );

    if (!hasRole) {
      return next(
        Errors.forbidden('Insufficient permissions')
      );
    }

    next();
  };
}

/**
 * Tenant isolation middleware
 * Ensures user can only access their tenant's data
 */
export function ensureTenant(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user || !req.tenantId) {
    return next(Errors.unauthorized('Authentication required'));
  }

  // For routes with :tenantId param, verify it matches
  if (req.params.tenantId && req.params.tenantId !== req.tenantId) {
    return next(Errors.forbidden('Access denied to this tenant'));
  }

  next();
}

