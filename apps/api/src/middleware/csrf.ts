/**
 * M-02: CSRF Protection Middleware
 * 
 * Uses the Signed Double-Submit Cookie pattern:
 * 1. Server sets a CSRF token in a readable cookie
 * 2. Client reads the cookie and sends it in a header
 * 3. Server validates the header matches the cookie
 * 
 * This works because:
 * - Attacker can't read cookies from another origin (Same-Origin Policy)
 * - Attacker can't set custom headers in cross-origin requests
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-xsrf-token';
const TOKEN_LENGTH = 32;

// Methods that don't need CSRF protection (safe/idempotent)
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths exempt from CSRF (public APIs, webhooks with their own auth)
const EXEMPT_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/microsoft',
  '/api/v1/auth/microsoft/callback',
  '/api/v1/webhooks/inbound',
  '/api/v1/health',
  '/ws',
];

/**
 * Generate a new CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Set CSRF token cookie on the response
 * The cookie is NOT httpOnly so the frontend can read it
 */
export function setCsrfCookie(res: Response): string {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JS
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
  return token;
}

/**
 * CSRF protection middleware
 * 
 * - Safe methods (GET/HEAD/OPTIONS): Sets CSRF cookie if not present
 * - Unsafe methods (POST/PUT/DELETE/PATCH): Validates CSRF header matches cookie
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip for safe methods - just ensure cookie is set
  if (SAFE_METHODS.has(req.method)) {
    if (!req.cookies[CSRF_COOKIE_NAME]) {
      setCsrfCookie(res);
    }
    return next();
  }

  // Skip for exempt paths
  const path = req.path;
  if (EXEMPT_PATHS.some(exempt => path.startsWith(exempt))) {
    return next();
  }

  // Skip if no authentication cookie (public endpoints)
  if (!req.signedCookies?.accessToken && !req.signedCookies?.refreshToken) {
    return next();
  }

  // Validate CSRF token
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken) {
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  // Timing-safe comparison
  if (cookieToken.length !== headerToken.length) {
    res.status(403).json({ error: 'CSRF token invalid' });
    return;
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );

  if (!isValid) {
    res.status(403).json({ error: 'CSRF token invalid' });
    return;
  }

  // Rotate token after successful validation
  setCsrfCookie(res);
  next();
}
