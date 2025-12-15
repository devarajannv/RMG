import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { authenticate } from '../../middleware/auth';
import { config } from '../../config/env';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  tenantSlug: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional(),
});

// ============================================================================
// Cookie Configuration
// ============================================================================

function setTokenCookies(res: Response, tokens: authService.AuthResult['tokens']) {
  // Access token cookie
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    signed: true,
    maxAge: tokens.accessExpiresIn * 1000,
    path: '/',
  });

  // Refresh token cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    signed: true,
    maxAge: tokens.refreshExpiresIn * 1000,
    path: '/api/v1/auth/refresh',
  });
}

function clearTokenCookies(res: Response) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);

      // Set cookies
      setTokenCookies(res, result.tokens);

      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
        // Also return tokens in body for non-cookie clients
        tokens: {
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.accessExpiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);

      // Set cookies
      setTokenCookies(res, result.tokens);

      res.json({
        message: 'Login successful',
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.accessExpiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get refresh token from cookie or body
      const refreshToken =
        req.signedCookies?.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token required',
          code: 'NO_REFRESH_TOKEN',
        });
      }

      const tokens = await authService.refreshTokens(refreshToken);

      // Set new cookies
      setTokenCookies(res, tokens);

      return res.json({
        message: 'Tokens refreshed',
        tokens: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.accessExpiresIn,
        },
      });
    } catch (error) {
      // Clear cookies on refresh failure
      clearTokenCookies(res);
      return next(error);
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Logout current session
 */
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken =
        req.headers.authorization?.substring(7) ||
        req.signedCookies?.accessToken;

      await authService.logout(req.user!.id, accessToken);

      clearTokenCookies(res);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/logout-all
 * Logout from all devices
 */
router.post(
  '/logout-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logoutAll(req.user!.id);

      clearTokenCookies(res);

      res.json({ message: 'Logged out from all devices' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Get current user
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response) => {
    res.json({
      user: {
        id: req.user!.id,
        email: req.user!.email,
        tenantId: req.user!.tenantId,
        roles: req.user!.roles,
        permissions: req.user!.permissions,
      },
    });
  }
);

export default router;

