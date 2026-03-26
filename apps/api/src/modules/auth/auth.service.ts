import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { hashPassword, verifyPassword, needsRehash, validatePasswordStrength, isPasswordReused, recordPasswordHistory } from '../../lib/password';
import { generateTokenPair, TokenPair, verifyRefreshToken } from '../../lib/jwt';
import {
  storeRefreshTokenFamily,
  isRefreshTokenFamilyValid,
  invalidateRefreshTokenFamily,
  invalidateAllUserTokens,
  blacklistToken,
  enforceSessionLimit,
  getRedis,
} from '../../lib/redis';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import { config } from '../../config/env';
import { emailService } from '../notifications/email.service';

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
  ipAddress?: string;
  userAgent?: string;
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
const BASE_LOCKOUT_MINUTES = 15;
const MAX_LOCKOUT_MINUTES = 480; // 8 hours cap
/** H-04: Maximum concurrent sessions per user */
const MAX_CONCURRENT_SESSIONS = 5;

/**
 * L-14: Calculate exponential lockout duration using Redis counter
 */
async function getLockoutDuration(userId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return BASE_LOCKOUT_MINUTES;
  
  const key = `lockout_count:${userId}`;
  const count = await redis.incr(key);
  // Reset counter after 24 hours of no lockouts
  await redis.expire(key, 86400);
  
  // Exponential: 15, 30, 60, 120, 240, 480 (capped)
  const duration = Math.min(BASE_LOCKOUT_MINUTES * Math.pow(2, count - 1), MAX_LOCKOUT_MINUTES);
  return duration;
}

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

  // H-04: Enforce concurrent session limit
  await enforceSessionLimit(user.id, MAX_CONCURRENT_SESSIONS);

  logger.info('User registered', { userId: user.id, email: user.email });

  // C-03: Audit log for registration
  await prisma.auditLog.create({
    data: {
      action: 'REGISTER' as any,
      userId: user.id,
      tenantId: tenant.id,
      entityType: 'User',
      entityId: user.id,
      changes: { email: user.email, firstName, lastName },
    },
  });

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
      // L-14: Exponential backoff for lockout duration
      const lockoutMinutes = await getLockoutDuration(user.id);
      updateData.lockedUntil = new Date(
        Date.now() + lockoutMinutes * 60000
      );
      updateData.failedLogins = 0;
      // LOG-03: Don't log email in lockout warning
      logger.warn('Account locked due to failed attempts', {
        userId: user.id,
        lockoutMinutes,
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
  // L-14: Reset lockout counter on successful login
  const redis = getRedis();
  if (redis) {
    await redis.del(`lockout_count:${user.id}`);
  }
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

  // H-04: Enforce concurrent session limit (evicts oldest if exceeded)
  const evicted = await enforceSessionLimit(user.id, MAX_CONCURRENT_SESSIONS);
  if (evicted > 0) {
    logger.info('Evicted oldest sessions due to limit', { userId: user.id, evicted });
  }

  // Log audit event
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN',
      metadata: {
        ip: input.ipAddress || 'unknown',
        userAgent: input.userAgent || 'unknown',
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
    // M-23: Don't log full token family — truncate for security
    logger.warn('Refresh token family invalid - possible theft', {
      userId: payload.sub,
      tokenFamilyPrefix: payload.tokenFamily?.substring(0, 8),
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
  tokenFamily?: string,
  tenantId?: string
): Promise<void> {
  // Blacklist current access token
  const accessTtl = parseDuration(config.jwtAccessExpiresIn);
  await blacklistToken(accessToken, accessTtl);

  // Invalidate refresh token family if provided
  if (tokenFamily) {
    await invalidateRefreshTokenFamily(userId, tokenFamily);
  }

  // Log audit event
  // H-06: Include tenantId in user lookup for tenant isolation
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
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
export async function logoutAll(userId: string, tenantId?: string): Promise<void> {
  await invalidateAllUserTokens(userId);

  // C-03: Audit log for logout-all
  // H-06: Include tenantId in user lookup for tenant isolation
  const user = tenantId 
    ? await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { tenantId: true } })
    : await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
  if (user) {
    await prisma.auditLog.create({
      data: {
        action: 'LOGOUT' as any,
        userId,
        tenantId: user.tenantId,
        entityType: 'User',
        entityId: userId,
        changes: { scope: 'all_devices' },
      },
    });
  }
  
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

// ============================================================================
// C-06: Password Change & Forgot Password
// ============================================================================

const PASSWORD_RESET_PREFIX = 'pwd_reset:';
const PASSWORD_RESET_TTL = 3600; // 1 hour

/**
 * C-06: Change password for authenticated user
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  tenantId?: string
): Promise<void> {
  // H-06: Include tenantId in user lookup for tenant isolation
  const user = tenantId
    ? await prisma.user.findFirst({ where: { id: userId, tenantId } })
    : await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

  // Verify current password
  const isValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isValid) throw new ApiError('Current password is incorrect', 401, 'INVALID_PASSWORD');

  // Validate new password strength
  const errors = validatePasswordStrength(newPassword);
  if (errors.length > 0) throw new ApiError(errors.join('. '), 400, 'WEAK_PASSWORD');

  // C-12: Check password history
  const reused = await isPasswordReused(userId, newPassword);
  if (reused) throw new ApiError('Password has been used recently. Choose a different password.', 400, 'PASSWORD_REUSED');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Record in password history
  await recordPasswordHistory(userId, passwordHash);

  // Invalidate all sessions except current (force re-login on other devices)
  await invalidateAllUserTokens(userId);

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'PASSWORD_RESET' as any,
      userId,
      tenantId: user.tenantId,
      entityType: 'User',
      entityId: userId,
      changes: { method: 'self_service_change' },
    },
  });

  logger.info('Password changed by user', { userId });
}

/**
 * C-06: Request password reset (forgot password)
 * Always returns success to prevent email enumeration
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), status: 'ACTIVE', deletedAt: null },
    include: { tenant: true },
  });

  if (!user) {
    // Don't reveal whether user exists — silently return
    logger.info('Password reset requested for non-existent email', { email: email.toLowerCase() });
    return;
  }

  // Generate secure reset token
  const token = crypto.randomBytes(32).toString('hex');
  const redis = getRedis();
  const redisKey = `${PASSWORD_RESET_PREFIX}${token}`;
  await redis.setex(redisKey, PASSWORD_RESET_TTL, JSON.stringify({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
  }));

  const resetUrl = `${config.frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const emailResult = await emailService.send({
    tenantId: user.tenantId,
    to: {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
    },
    subject: 'Reset your password',
    text: `Hello ${user.firstName},\n\nWe received a request to reset your password. Use the link below to continue:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html: `<p>Hello ${user.firstName},</p><p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
    tags: ['auth', 'password-reset'],
  });

  if (!emailResult.success) {
    await redis.del(redisKey);
    logger.error('Failed to send password reset email', {
      userId: user.id,
      tenantId: user.tenantId,
      error: emailResult.error,
    });
    return;
  }

  // L-01: Don't log any part of the reset token
  logger.info('Password reset token generated', { userId: user.id, tokenGenerated: true });
}

/**
 * C-06: Reset password using a token (from forgot-password email)
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const redis = getRedis();
  const data = await redis.get(`${PASSWORD_RESET_PREFIX}${token}`);
  if (!data) throw new ApiError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');

  const { userId, tenantId } = JSON.parse(data) as { userId: string; tenantId: string; email: string };

  // Validate password strength
  const errors = validatePasswordStrength(newPassword);
  if (errors.length > 0) throw new ApiError(errors.join('. '), 400, 'WEAK_PASSWORD');

  // C-12: Check password history
  const reused = await isPasswordReused(userId, newPassword);
  if (reused) throw new ApiError('Password has been used recently. Choose a different password.', 400, 'PASSWORD_REUSED');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Record in password history
  await recordPasswordHistory(userId, passwordHash);

  // Invalidate all sessions
  await invalidateAllUserTokens(userId);

  // Delete the reset token (one-time use)
  await redis.del(`${PASSWORD_RESET_PREFIX}${token}`);

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'PASSWORD_RESET' as any,
      userId,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: { method: 'forgot_password_reset' },
    },
  });

  logger.info('Password reset via token', { userId });
}

// ============================================================================
// C-04: Email Verification
// ============================================================================

const EMAIL_VERIFY_PREFIX = 'email_verify:';
const EMAIL_VERIFY_TTL = 86400; // 24 hours

/**
 * C-04: Generate and store email verification token
 */
export async function sendVerificationEmail(userId: string, tenantId?: string): Promise<void> {
  // H-06: Include tenantId in user lookup for tenant isolation
  const user = tenantId
    ? await prisma.user.findFirst({ where: { id: userId, tenantId } })
    : await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

  if (user.emailVerified) {
    throw new ApiError('Email already verified', 400, 'ALREADY_VERIFIED');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const redis = getRedis();
  const redisKey = `${EMAIL_VERIFY_PREFIX}${token}`;
  await redis.setex(redisKey, EMAIL_VERIFY_TTL, JSON.stringify({
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
  }));

  const verifyUrl = `${config.frontendUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
  const emailResult = await emailService.send({
    tenantId: user.tenantId,
    to: {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
    },
    subject: 'Verify your email address',
    text: `Hello ${user.firstName},\n\nPlease verify your email address using the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Hello ${user.firstName},</p><p>Please verify your email address using the link below:</p><p><a href="${verifyUrl}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
    tags: ['auth', 'email-verification'],
  });

  if (!emailResult.success) {
    await redis.del(redisKey);
    logger.error('Failed to send verification email', {
      userId: user.id,
      tenantId: user.tenantId,
      error: emailResult.error,
    });
    throw new ApiError('Failed to send verification email', 500, 'EMAIL_SEND_FAILED');
  }

  logger.info('Email verification token generated', { userId: user.id });
}

/**
 * C-04: Verify email with token
 */
export async function verifyEmail(token: string): Promise<void> {
  const redis = getRedis();
  const data = await redis.get(`${EMAIL_VERIFY_PREFIX}${token}`);
  if (!data) throw new ApiError('Invalid or expired verification token', 400, 'INVALID_TOKEN');

  const { userId } = JSON.parse(data) as { userId: string; email: string; tenantId: string };

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });

  // Delete token (one-time use)
  await redis.del(`${EMAIL_VERIFY_PREFIX}${token}`);

  logger.info('Email verified', { userId });
}

