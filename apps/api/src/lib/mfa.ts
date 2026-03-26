/**
 * MFA (Multi-Factor Authentication) Service
 * C-01: TOTP-based MFA implementation
 *
 * Uses HOTP/TOTP algorithm (RFC 6238) for generating time-based one-time passwords.
 * Compatible with Google Authenticator, Authy, etc.
 *
 * Note: For production, consider using a library like `otplib` or `speakeasy`.
 * This implementation provides the framework and will use crypto for TOTP generation.
 */

import crypto from 'crypto';
import prisma from './prisma';
import { logger } from './logger';
import { invalidateAllUserTokens } from './redis';

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const MFA_SECRET_LENGTH = 20; // bytes

/**
 * Generate a random MFA secret (base32 encoded)
 */
export function generateMfaSecret(): string {
  const buffer = crypto.randomBytes(MFA_SECRET_LENGTH);
  return base32Encode(buffer);
}

/**
 * Generate a TOTP URI for QR code scanning
 */
export function generateTotpUri(secret: string, email: string, issuer = 'RMGaaS'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Generate a TOTP code for the current time
 */
export function generateTotp(secret: string, timeOffset = 0): string {
  const time = Math.floor(Date.now() / 1000 / TOTP_PERIOD) + timeOffset;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(time, 4);

  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS);

  return code.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a TOTP code (checks current and adjacent time windows)
 */
export function verifyTotp(secret: string, code: string): boolean {
  // Check current and ±1 time window for clock drift
  for (let offset = -1; offset <= 1; offset++) {
    const expected = generateTotp(secret, offset);
    if (timingSafeEqual(expected, code)) {
      return true;
    }
  }
  return false;
}

/**
 * Enable MFA for a user
 * Returns the secret and QR code URI
 */
export async function enableMfa(userId: string): Promise<{ secret: string; uri: string; backupCodes: string[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (user.mfaEnabled) throw new Error('MFA is already enabled');

  const secret = generateMfaSecret();
  const uri = generateTotpUri(secret, user.email);

  // M-03: Generate backup codes with 64-bit entropy (was 32-bit)
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(8).toString('hex').toUpperCase()
  );

  // Store secret (will be confirmed after verification)
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaSecret: secret,
      // Store backup codes in preferences (hashed)
      preferences: {
        ...(user.preferences as Record<string, unknown> || {}),
        mfaBackupCodes: backupCodes.map(code =>
          crypto.createHash('sha256').update(code).digest('hex')
        ),
        mfaPending: true,
      },
    },
  });

  logger.info('MFA setup initiated', { userId });

  return { secret, uri, backupCodes };
}

/**
 * Confirm MFA setup by verifying a TOTP code
 */
export async function confirmMfa(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) throw new Error('MFA setup not initiated');

  if (!verifyTotp(user.mfaSecret, code)) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      preferences: {
        ...(user.preferences as Record<string, unknown> || {}),
        mfaPending: false,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'MFA_ENABLED' as any,
      userId,
      tenantId: user.tenantId,
      entityType: 'User',
      entityId: userId,
    },
  });

  logger.info('MFA enabled', { userId });

  // M-04: Invalidate all existing sessions — user must re-authenticate with MFA
  await invalidateAllUserTokens(userId);

  return true;
}

/**
 * Disable MFA for a user
 */
export async function disableMfa(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    throw new Error('MFA is not enabled');
  }

  if (!verifyTotp(user.mfaSecret, code)) {
    throw new Error('Invalid MFA code');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      preferences: {
        ...(user.preferences as Record<string, unknown> || {}),
        mfaBackupCodes: undefined,
        mfaPending: undefined,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'MFA_DISABLED' as any,
      userId,
      tenantId: user.tenantId,
      entityType: 'User',
      entityId: userId,
    },
  });

  logger.info('MFA disabled', { userId });

  // M-04: Invalidate all existing sessions — user must re-authenticate
  await invalidateAllUserTokens(userId);
}

/**
 * Verify MFA during login
 */
export async function verifyMfaLogin(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaEnabled || !user.mfaSecret) return false;

  // Try TOTP first
  if (verifyTotp(user.mfaSecret, code)) return true;

  // Try backup code
  const prefs = user.preferences as Record<string, unknown> | null;
  const backupHashes = (prefs?.mfaBackupCodes || []) as string[];
  const codeHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');

  const index = backupHashes.indexOf(codeHash);
  if (index >= 0) {
    // Remove used backup code
    backupHashes.splice(index, 1);
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: { ...prefs, mfaBackupCodes: backupHashes },
      },
    });
    logger.info('MFA backup code used', { userId });
    return true;
  }

  return false;
}

// ============================================================================
// Helpers
// ============================================================================

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}
