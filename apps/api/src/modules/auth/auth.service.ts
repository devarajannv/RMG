import { v4 as uuidv4 } from 'uuid';
import prisma from '../../lib/prisma';
import { hashPassword, verifyPassword, needsRehash, validatePasswordStrength } from '../../lib/password';
import { generateTokenPair, TokenPair, verifyRefreshToken } from '../../lib/jwt';
import {
  storeRefreshTokenFamily,
  isRefreshTokenFamilyValid,
  invalidateRefreshTokenFamily,
  invalidateAllUserTokens,
  blacklistToken,
} from '../../lib/redis';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import { config } from '../../config/env';

// ============================================================================
// Types
// ============================================================================

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantSlug?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: string;
  };
  tokens: TokenPair;
}

// ============================================================================
// Service
// ============================================================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const { email, password, firstName, lastName, tenantSlug } = input;

  // Validate password strength
  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length > 0) {
    throw new ApiError(passwordErrors.join('. '), 400, 'WEAK_PASSWORD');
  }

  // Find or create tenant
  let tenant;
  if (tenantSlug) {
    tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new ApiError('Organization not found', 404, 'TENANT_NOT_FOUND');
    }
  } else {
    // Create a new tenant for the user (self-registration)
    const slug = `${firstName.toLowerCase()}-${Date.now()}`;
    tenant = await prisma.tenant.create({
      data: {
        name: `${firstName}'s Organization`,
        slug,
        tier: 'FREE',
        status: 'TRIAL',
      },
    });
  }

  // Check if user already exists in this tenant
  const existingUser = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      tenantId: tenant.id,
    },
  });

  if (existingUser) {
    throw new ApiError('User already exists', 409, 'USER_EXISTS');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      status: 'ACTIVE',
      emailVerified: false,
    },
  });

  // Assign default role
  const defaultRole = await prisma.role.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Employee',
    },
  });

  if (defaultRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: defaultRole.id,
        assignedBy: user.id,
      },
    });
  }

  // Generate tokens
  const tokenFamily = uuidv4();
  const tokens = generateTokenPair(user.id, tenant.id, user.email, tokenFamily);

  // Store refresh token family
  await storeRefreshTokenFamily(user.id, tokenFamily, tokens.refreshExpiresIn);

  logger.info('User registered', { userId: user.id, email: user.email });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
    },
    tokens,
  };
}

/**
 * Login user
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password, tenantSlug } = input;

  // Find user
  const whereClause: Record<string, unknown> = {
    email: email.toLowerCase(),
    deletedAt: null,
  };

  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    whereClause.tenantId = tenant.id;
  }

  const user = await prisma.user.findFirst({
    where: whereClause,
    include: { tenant: true },
  });

  if (!user) {
    // Use same error for security (don't reveal if user exists)
    throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw new ApiError(
      `Account locked. Try again in ${remainingMinutes} minutes`,
      423,
      'ACCOUNT_LOCKED'
    );
  }

  // Check user status
  if (user.status !== 'ACTIVE') {
    throw new ApiError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
  }

  // Verify password
  const isValid = await verifyPassword(user.passwordHash, password);

  if (!isValid) {
    // Increment failed login attempts
    const failedLogins = user.failedLogins + 1;
    const updateData: Record<string, unknown> = { failedLogins };

    if (failedLogins >= MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60000
      );
      updateData.failedLogins = 0;
      logger.warn('Account locked due to failed attempts', {
        userId: user.id,
        email: user.email,
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check if password needs rehash
  if (needsRehash(user.passwordHash)) {
    const newHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
  }

  // Reset failed login attempts and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLogins: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // Generate tokens
  const tokenFamily = uuidv4();
  const tokens = generateTokenPair(
    user.id,
    user.tenantId,
    user.email,
    tokenFamily
  );

  // Store refresh token family
  await storeRefreshTokenFamily(user.id, tokenFamily, tokens.refreshExpiresIn);

  // Log audit event
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN',
      metadata: {
        ip: 'unknown', // Will be added by controller
        userAgent: 'unknown',
      },
    },
  });

  logger.info('User logged in', { userId: user.id, email: user.email });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
    },
    tokens,
  };
}

/**
 * Refresh access token
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  // Verify refresh token
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  // Check if token family is valid
  const isValid = await isRefreshTokenFamilyValid(
    payload.sub,
    payload.tokenFamily
  );

  if (!isValid) {
    // Token family was invalidated - possible token theft
    logger.warn('Refresh token family invalid - possible theft', {
      userId: payload.sub,
      tokenFamily: payload.tokenFamily,
    });
    
    // Invalidate all user tokens as security measure
    await invalidateAllUserTokens(payload.sub);
    
    throw new ApiError('Session expired', 401, 'SESSION_EXPIRED');
  }

  // Get user
  const user = await prisma.user.findFirst({
    where: {
      id: payload.sub,
      tenantId: payload.tenantId,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  if (!user) {
    throw new ApiError('User not found', 401, 'USER_NOT_FOUND');
  }

  // Rotate tokens - invalidate old family, create new one
  await invalidateRefreshTokenFamily(payload.sub, payload.tokenFamily);

  const newTokenFamily = uuidv4();
  const tokens = generateTokenPair(
    user.id,
    user.tenantId,
    user.email,
    newTokenFamily
  );

  await storeRefreshTokenFamily(user.id, newTokenFamily, tokens.refreshExpiresIn);

  return tokens;
}

/**
 * Logout user
 */
export async function logout(
  userId: string,
  accessToken: string,
  tokenFamily?: string
): Promise<void> {
  // Blacklist current access token
  const accessTtl = parseDuration(config.jwtAccessExpiresIn);
  await blacklistToken(accessToken, accessTtl);

  // Invalidate refresh token family if provided
  if (tokenFamily) {
    await invalidateRefreshTokenFamily(userId, tokenFamily);
  }

  // Log audit event
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        action: 'LOGOUT',
      },
    });
  }

  logger.info('User logged out', { userId });
}

/**
 * Logout from all devices
 */
export async function logoutAll(userId: string): Promise<void> {
  await invalidateAllUserTokens(userId);
  
  logger.info('User logged out from all devices', { userId });
}

// Helper
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(m|h|d|s)$/);
  if (!match) return 900; // Default 15 min
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return 900;
  }
}

