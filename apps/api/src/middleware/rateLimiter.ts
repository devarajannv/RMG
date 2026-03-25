/**
 * Rate Limiting Configuration
 * Per-endpoint rate limiters for sensitive operations
 */

import { rateLimit } from 'express-rate-limit';

const isProductionEnv = () => process.env.NODE_ENV === 'production';
const isE2eEnv = () => process.env.E2E_TEST_MODE === 'true' || process.env.VITEST === 'true';

const shouldSkipRateLimit = (req: { headers: Record<string, unknown> }) =>
  !isProductionEnv() || isE2eEnv() || req.headers['x-e2e-test-mode'] === '1';

/**
 * Strict rate limiter for login attempts
 * 5 attempts per 15-minute window per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: () => (isProductionEnv() ? 5 : 10000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    // Rate limit by IP + email combination to prevent distributed attacks
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  },
});

/**
 * Rate limiter for registration (includes tenant creation)
 * H-03: 3 attempts per hour per IP to prevent tenant-creation abuse
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
  skip: shouldSkipRateLimit,
});

/**
 * H-03: Stricter rate limiter for tenant provisioning endpoints
 * 2 attempts per day per IP
 */
export const tenantCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tenant creation attempts. Please try again tomorrow.' },
  skip: shouldSkipRateLimit,
});

/**
 * Rate limiter for token refresh
 * 20 attempts per minute per IP
 */
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts. Please try again later.' },
  skip: shouldSkipRateLimit,
});

/**
 * Rate limiter for password reset requests
 * 3 attempts per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' },
  skip: shouldSkipRateLimit,
});

/**
 * Rate limiter for invitation acceptance (public endpoint)
 * 5 attempts per 15-minute window per IP
 */
export const invitationAcceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
  skip: shouldSkipRateLimit,
});

/**
 * Rate limiter for inbound webhooks
 * 30 per minute per IP
 */
export const webhookInboundLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests. Please try again later.' },
  skip: shouldSkipRateLimit,
});

/**
 * Rate limiter for agent query endpoints
 * 60 requests per minute per authenticated user/IP
 */
export const agentQueryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many agent requests. Please try again later.' },
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    return `${req.ip}-${userId}`;
  },
});

/**
 * Rate limiter for intelligence recommendation endpoints
 * 90 requests per minute per authenticated user/IP
 */
export const intelligenceQueryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many intelligence requests. Please try again later.' },
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    return `${req.ip}-${userId}`;
  },
});
