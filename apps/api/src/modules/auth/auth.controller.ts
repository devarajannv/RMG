import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { authenticate } from '../../middleware/auth';
import { config } from '../../config/env';
import { loginLimiter, registerLimiter, refreshLimiter, passwordResetLimiter } from '../../middleware/rateLimiter';

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
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 12
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               tenantSlug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error
 */
router.post(
  '/register',
  registerLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);

      // Set cookies
      setTokenCookies(res, result.tokens);

      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: user@example.com
 *             password: your-password-here
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/login',
  loginLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login({
        ...input,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Set cookies
      setTokenCookies(res, result.tokens);

      res.json({
        message: 'Login successful',
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post(
  '/refresh',
  refreshLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // L-15: Only accept refresh token from signed httpOnly cookie (no body fallback)
      const refreshToken = req.signedCookies?.refreshToken;

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
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken =
        req.headers.authorization?.substring(7) ||
        req.signedCookies?.accessToken;

      await authService.logout(req.user!.id, accessToken, undefined, req.tenantId);

      clearTokenCookies(res);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out from all devices
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/logout-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logoutAll(req.user!.id, req.tenantId);

      clearTokenCookies(res);

      res.json({ message: 'Logged out from all devices' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     tenantId:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
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

// ============================================================================
// C-06: Password Change & Forgot Password Routes
// ============================================================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

/**
 * C-06: Change password (authenticated)
 */
router.post(
  '/change-password',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.user!.id, currentPassword, newPassword, req.tenantId);
      clearTokenCookies(res);
      res.json({ message: 'Password changed successfully. Please log in again.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * C-06: Forgot password (unauthenticated)
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await authService.requestPasswordReset(email);
      // Always return success to prevent email enumeration
      res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * C-06: Reset password with token (unauthenticated)
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      await authService.resetPasswordWithToken(token, newPassword);
      res.json({ message: 'Password has been reset. Please log in with your new password.' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// C-04: Email Verification Routes
// ============================================================================

/**
 * C-04: Send/resend verification email (authenticated)
 */
router.post(
  '/send-verification',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.sendVerificationEmail(req.user!.id, req.tenantId);
      res.json({ message: 'Verification email sent.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * C-04: Verify email with token (public)
 */
router.post(
  '/verify-email',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
      await authService.verifyEmail(token);
      res.json({ message: 'Email verified successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
