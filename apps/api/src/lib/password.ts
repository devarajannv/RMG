import argon2 from 'argon2';
import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Argon2 configuration following OWASP recommendations
 * https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id, // Hybrid type recommended for password hashing
  memoryCost: 65536, // 64 MiB
  timeCost: 3, // Number of iterations
  parallelism: 4, // Degree of parallelism
  hashLength: 32, // Output hash length
};

/** C-12: Number of previous passwords to check against */
const PASSWORD_HISTORY_COUNT = 5;

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // M-21: Log verification errors instead of silently swallowing
    logger.error('Password verification error — possible corrupted hash', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hashLength: hash?.length,
    });
    return false;
  }
}

/**
 * C-12: Check if a password has been used before by the user
 * Checks against the last N password hashes
 */
export async function isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: PASSWORD_HISTORY_COUNT,
    select: { passwordHash: true },
  });

  for (const entry of history) {
    const match = await verifyPassword(entry.passwordHash, newPassword);
    if (match) return true;
  }
  return false;
}

/**
 * C-12: Record a password hash in the user's password history
 */
export async function recordPasswordHistory(userId: string, passwordHash: string): Promise<void> {
  await prisma.passwordHistory.create({
    data: { userId, passwordHash },
  });

  // Prune old entries beyond the history count
  const entries = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (entries.length > PASSWORD_HISTORY_COUNT) {
    const idsToDelete = entries.slice(PASSWORD_HISTORY_COUNT).map((e) => e.id);
    await prisma.passwordHistory.deleteMany({
      where: { id: { in: idsToDelete } },
    });
  }
}

/**
 * Check if a hash needs to be rehashed (e.g., after security config update)
 */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}

/**
 * Password strength validation
 * Returns array of validation errors, empty if valid
 */
export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /^(?:abc|123|qwerty|password)/i, // Common sequences
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains a common pattern');
      break;
    }
  }

  return errors;
}

/**
 * Generate a secure random token (for email verification, password reset, etc.)
 */
export function generateSecureToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const crypto = require('crypto');
  let result = '';
  
  // L-13: Use crypto.randomInt to avoid modulo bias
  for (let i = 0; i < length; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  
  return result;
}

