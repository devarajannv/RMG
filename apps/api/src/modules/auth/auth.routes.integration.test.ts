import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import cookieParser from 'cookie-parser';

vi.mock('../../middleware/rateLimiter', () => {
  const passthrough = (_req, _res, next) => next();
  return {
    loginLimiter: passthrough,
    registerLimiter: passthrough,
    refreshLimiter: passthrough,
    passwordResetLimiter: passthrough,
  };
});

vi.mock('../../middleware/auth', () => ({
  authenticate: (_req, _res, next) => next(),
}));

vi.mock('./auth.service', () => ({
  register: vi.fn(),
  login: vi.fn(),
  refreshTokens: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  changePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPasswordWithToken: vi.fn(),
  sendVerificationEmail: vi.fn(),
  verifyEmail: vi.fn(),
}));

import authRoutes from './auth.controller';
import * as authService from './auth.service';
import { errorHandler } from '../../middleware/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser('test-secret'));
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

describe('Auth Routes Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not return access token in register response body', async () => {
    vi.mocked(authService.register).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'User',
        lastName: 'One',
        tenantId: 'tenant-1',
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessExpiresIn: 900,
        refreshExpiresIn: 604800,
      },
    });

    const response = await request(createApp()).post('/api/v1/auth/register').send({
      email: 'user@example.com',
      password: 'StrongPass123!',
      firstName: 'User',
      lastName: 'One',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('user@example.com');
    expect(response.body.tokens).toBeUndefined();
  });

  it('should not return access token in login response body', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'User',
        lastName: 'One',
        tenantId: 'tenant-1',
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessExpiresIn: 900,
        refreshExpiresIn: 604800,
      },
    });

    const response = await request(createApp()).post('/api/v1/auth/login').send({
      email: 'user@example.com',
      password: 'StrongPass123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('user@example.com');
    expect(response.body.tokens).toBeUndefined();
  });
});
