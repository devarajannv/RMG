import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/jwt';
import { isTokenBlacklisted } from '../lib/redis';
import { Errors } from './errorHandler';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
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

    // Load user with roles
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw Errors.unauthorized('User not found or inactive');
    }

    // Extract roles and permissions
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = new Set<string>();
    
    for (const userRole of user.roles) {
      const rolePermissions = userRole.role.permissions as string[];
      rolePermissions.forEach((p) => permissions.add(p));
    }

    // Attach user to request
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
      permissions: Array.from(permissions),
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
      // Support wildcard matching (e.g., 'resource:*' matches 'resource:read')
      const parts = permission.split(':');
      return req.user!.permissions.some((p) => {
        if (p === permission) return true;
        const pParts = p.split(':');
        return pParts[0] === parts[0] && pParts[1] === '*';
      });
    });

    if (!hasAllPermissions) {
      return next(
        Errors.forbidden(
          `Missing required permissions: ${requiredPermissions.join(', ')}`
        )
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

    const hasRole = requiredRoles.some((role) =>
      req.user!.roles.includes(role)
    );

    if (!hasRole) {
      return next(
        Errors.forbidden(`Required role: ${requiredRoles.join(' or ')}`)
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

