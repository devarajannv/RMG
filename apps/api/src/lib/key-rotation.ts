/**
 * H-09: Key Rotation Support
 * 
 * Supports rotating JWT signing keys with zero-downtime by maintaining
 * both current and previous keys during transition periods.
 * 
 * Rotation procedure:
 * 1. Set JWT_SECRET_PREVIOUS to current JWT_SECRET value
 * 2. Generate and set new JWT_SECRET
 * 3. Deploy - new tokens signed with new key, old tokens still verified
 * 4. After max token lifetime (4h), remove JWT_SECRET_PREVIOUS
 * 
 * Same process applies to JWT_REFRESH_SECRET / JWT_REFRESH_SECRET_PREVIOUS
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from './logger';

interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  [key: string]: unknown;
}

/**
 * Verify a JWT token, trying current key first, then previous key
 * This enables zero-downtime key rotation
 */
export function verifyTokenWithRotation(
  token: string,
  type: 'access' | 'refresh' = 'access'
): TokenPayload {
  const currentSecret = type === 'access'
    ? config.jwtSecret
    : (config as any).jwtRefreshSecret || config.jwtSecret;

  const previousSecret = type === 'access'
    ? process.env.JWT_SECRET_PREVIOUS
    : process.env.JWT_REFRESH_SECRET_PREVIOUS;

  try {
    // Try current key first
    return jwt.verify(token, currentSecret) as TokenPayload;
  } catch (currentError) {
    // If there's a previous key, try that
    if (previousSecret) {
      try {
        const payload = jwt.verify(token, previousSecret) as TokenPayload;
        logger.debug('Token verified with previous key (rotation in progress)');
        return payload;
      } catch (previousError) {
        // Both keys failed
        throw currentError;
      }
    }
    // No previous key configured, throw original error
    throw currentError;
  }
}

/**
 * Check if key rotation is currently active
 */
export function isKeyRotationActive(): boolean {
  return !!(process.env.JWT_SECRET_PREVIOUS || process.env.JWT_REFRESH_SECRET_PREVIOUS);
}

/**
 * Get key rotation status for health checks
 */
export function getKeyRotationStatus(): {
  accessKeyRotating: boolean;
  refreshKeyRotating: boolean;
} {
  return {
    accessKeyRotating: !!process.env.JWT_SECRET_PREVIOUS,
    refreshKeyRotating: !!process.env.JWT_REFRESH_SECRET_PREVIOUS,
  };
}
