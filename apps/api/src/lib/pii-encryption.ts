/**
 * PII Encryption Utility
 * C-11: Encrypt/decrypt sensitive PII fields at rest
 *
 * Uses AES-256-GCM for authenticated encryption.
 * The encryption key should be stored securely (env var or secrets manager).
 */

import crypto from 'crypto';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCODING = 'hex';
const HKDF_SALT = 'rmgaas-pii-encryption-salt';
const HKDF_INFO = 'rmgaas-pii-aes256gcm';

/**
 * Get encryption key from environment.
 * M-01: Uses HKDF instead of raw SHA-256 for proper key derivation.
 * Requires PII_ENCRYPTION_KEY env var (no fallback to cookieSecret).
 */
let _cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const keyHex = process.env.PII_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 32) {
    throw new Error('PII_ENCRYPTION_KEY environment variable is required (minimum 32 characters)');
  }

  // M-01: Derive a 32-byte key using HKDF
  _cachedKey = crypto.hkdfSync(
    'sha256',
    keyHex,
    HKDF_SALT,
    HKDF_INFO,
    32
  ) as unknown as Buffer;
  return Buffer.from(_cachedKey);
}

/**
 * Encrypt a plaintext value.
 * Returns: iv:tag:ciphertext (all hex-encoded)
 */
export function encryptPII(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  const tag = cipher.getAuthTag();

  return `${iv.toString(ENCODING)}:${tag.toString(ENCODING)}:${encrypted}`;
}

/**
 * Decrypt an encrypted value.
 * Expects format: iv:tag:ciphertext (all hex-encoded)
 */
export function decryptPII(encryptedValue: string): string {
  const key = getEncryptionKey();
  const parts = encryptedValue.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const iv = Buffer.from(parts[0], ENCODING);
  const tag = Buffer.from(parts[1], ENCODING);
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a value is already encrypted (has the iv:tag:ciphertext format)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // Check if all parts are valid hex
  return parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 * Encrypt a value only if it's not already encrypted
 */
export function ensureEncrypted(value: string): string {
  if (isEncrypted(value)) return value;
  return encryptPII(value);
}

/**
 * Decrypt a value, returning the original if it's not encrypted
 */
export function safeDecrypt(value: string): string {
  try {
    if (!isEncrypted(value)) return value;
    return decryptPII(value);
  } catch (error) {
    // M-22: Log decryption failures instead of silently returning ciphertext
    logger.error('PII decryption failed — possible key rotation issue', {
      error: error instanceof Error ? error.message : 'Unknown error',
      valueLength: value.length,
    });
    return '[DECRYPTION_FAILED]';
  }
}
