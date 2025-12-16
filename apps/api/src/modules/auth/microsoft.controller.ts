/**
 * Microsoft 365 SSO Controller
 * Handles OAuth endpoints for Microsoft authentication
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as microsoftService from './microsoft.service';
import { config } from '../../config/env';
import { logger } from '../../lib/logger';

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const callbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const initiateSchema = z.object({
  tenantId: z.string().uuid().optional(),
  redirectUrl: z.string().url().optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

function getRedirectUri(req: Request): string {
  // Use configured redirect URI or construct from request
  if (config.microsoft.redirectUri) {
    return config.microsoft.redirectUri;
  }
  
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host');
  return `${protocol}://${host}/api/v1/auth/microsoft/callback`;
}

function setAuthCookies(res: Response, tokens: any): void {
  // Access token cookie
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax', // 'lax' for OAuth redirects
    signed: true,
    maxAge: tokens.accessExpiresIn * 1000,
    path: '/',
  });

  // Refresh token cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    signed: true,
    maxAge: tokens.refreshExpiresIn * 1000,
    path: '/api/v1/auth/refresh',
  });
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/v1/auth/microsoft/status
 * Check if Microsoft SSO is configured
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    enabled: microsoftService.isMicrosoftSSOConfigured(),
    provider: 'Microsoft 365',
  });
});

/**
 * GET /api/v1/auth/microsoft
 * Initiate Microsoft OAuth flow
 * 
 * Query params:
 * - tenantId: Optional tenant ID to associate with the user
 * - redirectUrl: Optional URL to redirect after successful login
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if SSO is configured
    if (!microsoftService.isMicrosoftSSOConfigured()) {
      res.status(503).json({
        error: 'Microsoft SSO not configured',
        code: 'SSO_NOT_CONFIGURED',
        message: 'Please configure MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID',
      });
      return;
    }

    const query = initiateSchema.parse(req.query);
    const redirectUri = getRedirectUri(req);
    
    // Store state with tenant info and redirect URL
    const stateData = {
      tenantId: query.tenantId || config.defaultTenantId,
      redirectUrl: query.redirectUrl || config.frontendUrl,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Get Microsoft authorization URL
    const authUrl = await microsoftService.getAuthorizationUrl(redirectUri, state);
    
    logger.info('Initiating Microsoft SSO', { redirectUri });
    
    // Redirect to Microsoft login
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/microsoft/callback
 * Handle Microsoft OAuth callback
 */
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = callbackSchema.parse(req.query);

    // Handle OAuth errors
    if (params.error) {
      logger.error('Microsoft OAuth error', {
        error: params.error,
        description: params.error_description,
      });
      
      const frontendUrl = config.frontendUrl || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/login?error=${encodeURIComponent(params.error)}&message=${encodeURIComponent(params.error_description || 'Authentication failed')}`;
      return res.redirect(errorUrl);
    }

    // Decode state
    let stateData = {
      tenantId: config.defaultTenantId,
      redirectUrl: config.frontendUrl || 'http://localhost:3000',
    };
    
    if (params.state) {
      try {
        stateData = JSON.parse(Buffer.from(params.state, 'base64').toString());
      } catch {
        logger.warn('Failed to decode OAuth state');
      }
    }

    const redirectUri = getRedirectUri(req);
    
    // Exchange code for tokens and provision user
    const result = await microsoftService.handleCallback(
      params.code,
      redirectUri,
      stateData.tenantId
    );

    logger.info('Microsoft SSO successful', {
      userId: result.user.id,
      email: result.user.email,
      isNewUser: result.isNewUser,
    });

    // Set authentication cookies
    setAuthCookies(res, result.tokens);

    // Redirect to frontend with success
    const successUrl = `${stateData.redirectUrl}?sso=success&provider=microsoft`;
    res.redirect(successUrl);
  } catch (error) {
    logger.error('Microsoft SSO callback failed', { error });
    
    const frontendUrl = config.frontendUrl || 'http://localhost:3000';
    const errorUrl = `${frontendUrl}/login?error=sso_failed&message=${encodeURIComponent('Microsoft authentication failed. Please try again.')}`;
    res.redirect(errorUrl);
  }
});

/**
 * POST /api/v1/auth/microsoft/token
 * Exchange Microsoft token for app tokens (for SPA flow)
 * Used when frontend handles OAuth flow directly
 */
router.post('/token', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { code, redirectUri, tenantId } = req.body;

    if (!code) {
      res.status(400).json({
        error: 'Authorization code is required',
        code: 'MISSING_CODE',
      });
      return;
    }

    const result = await microsoftService.handleCallback(
      code,
      redirectUri || getRedirectUri(req),
      tenantId || config.defaultTenantId
    );

    // Set authentication cookies
    setAuthCookies(res, result.tokens);

    res.json({
      message: 'Microsoft SSO successful',
      user: result.user,
      isNewUser: result.isNewUser,
      accessToken: result.tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

