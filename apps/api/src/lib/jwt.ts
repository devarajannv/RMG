import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tenantId: string;
  type: 'refresh';
  tokenFamily: string; // For refresh token rotation
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

/**
 * Parse duration string to seconds
 * Supports: 15m, 1h, 7d, etc.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(m|h|d|s)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  const expiresIn = parseDuration(config.jwtAccessExpiresIn);
  
  return jwt.sign(
    { ...payload, type: 'access' },
    config.jwtSecret,
    {
      expiresIn,
      issuer: 'rmgaas',
      audience: 'rmgaas-api',
    }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  payload: Omit<RefreshTokenPayload, 'type'>
): string {
  const expiresIn = parseDuration(config.jwtRefreshExpiresIn);
  
  return jwt.sign(
    { ...payload, type: 'refresh' },
    config.jwtSecret,
    {
      expiresIn,
      issuer: 'rmgaas',
      audience: 'rmgaas-api',
    }
  );
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(
  userId: string,
  tenantId: string,
  email: string,
  tokenFamily: string
): TokenPair {
  const accessExpiresIn = parseDuration(config.jwtAccessExpiresIn);
  const refreshExpiresIn = parseDuration(config.jwtRefreshExpiresIn);

  const accessToken = generateAccessToken({
    sub: userId,
    tenantId,
    email,
  });

  const refreshToken = generateRefreshToken({
    sub: userId,
    tenantId,
    tokenFamily,
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresIn,
    refreshExpiresIn,
  };
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret, {
    issuer: 'rmgaas',
    audience: 'rmgaas-api',
  }) as AccessTokenPayload;

  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return decoded;
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret, {
    issuer: 'rmgaas',
    audience: 'rmgaas-api',
  }) as RefreshTokenPayload;

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return decoded;
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): unknown {
  return jwt.decode(token);
}

/**
 * Verify access token and return userId and tenantId
 * Used by WebSocket for authentication
 */
export function verifyToken(token: string): { userId: string; tenantId: string } | null {
  try {
    const decoded = verifyAccessToken(token);
    return {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
    };
  } catch {
    return null;
  }
}
