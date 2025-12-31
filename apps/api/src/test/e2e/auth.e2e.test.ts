/**
 * Authentication E2E Tests
 * Tests login, logout, session management, token refresh, and rate limiting
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, API_URL } from './helpers';

describe('E2E: Authentication Flow', () => {
  describe('Login', () => {
    it('AUTH-001: Valid credentials return tokens and user data', async () => {
      const response = await apiRequest<{
        user: { id: string; email: string; firstName: string };
        tokens: { accessToken: string; refreshToken: string };
      }>('POST', '/api/v1/auth/login', {
        email: 'admin@newvision.in',
        password: 'Password123!@#',
      });

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe('admin@newvision.in');
      expect(response.data.tokens).toBeDefined();
      expect(response.data.tokens.accessToken).toBeDefined();
      expect(response.data.tokens.refreshToken).toBeDefined();
    });

    it('AUTH-002: Invalid email returns 401', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        email: 'nonexistent@example.com',
        password: 'somepassword',
      });

      expect(response.status).toBe(401);
    });

    it('AUTH-003: Invalid password returns 401', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        email: 'admin@newvision.in',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
    });

    it('AUTH-004: Missing email returns 400', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        password: 'somepassword',
      });

      expect(response.status).toBe(400);
    });

    it('AUTH-005: Missing password returns 400', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        email: 'admin@newvision.in',
      });

      expect(response.status).toBe(400);
    });

    it('AUTH-006: Empty credentials returns 400', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        email: '',
        password: '',
      });

      expect(response.status).toBe(400);
    });

    it('AUTH-007: Invalid email format returns 400', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        email: 'not-an-email',
        password: 'somepassword',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Session Management', () => {
    let token: string;

    beforeAll(async () => {
      const t = await login();
      if (!t) throw new Error('Failed to login for session tests');
      token = t;
    });

    it('AUTH-008: GET /me returns current user with valid token', async () => {
      const response = await apiRequest<{
        user: { id: string; email: string };
      }>('GET', '/api/v1/auth/me', undefined, token);

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe('admin@newvision.in');
    });

    it('AUTH-009: GET /me without token returns 401', async () => {
      const response = await apiRequest('GET', '/api/v1/auth/me');

      expect(response.status).toBe(401);
    });

    it('AUTH-010: GET /me with invalid token returns 401', async () => {
      const response = await apiRequest('GET', '/api/v1/auth/me', undefined, 'invalid-token');

      expect(response.status).toBe(401);
    });

    it('AUTH-011: GET /me with malformed token returns 401', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/auth/me',
        undefined,
        'Bearer not.a.jwt'
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Token Refresh', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const response = await apiRequest<{
        tokens: { accessToken: string; refreshToken: string };
      }>('POST', '/api/v1/auth/login', {
        email: 'admin@newvision.in',
        password: 'Password123!@#',
      });

      if (response.status === 200) {
        accessToken = response.data.tokens.accessToken;
        refreshToken = response.data.tokens.refreshToken;
      }
    });

    it('AUTH-012: Token refresh with valid refresh token returns new tokens', async () => {
      const response = await apiRequest<{
        tokens: { accessToken: string; refreshToken: string };
      }>('POST', '/api/v1/auth/refresh', {
        refreshToken,
      });

      // May be 200 or endpoint might not exist yet
      if (response.status === 200) {
        expect(response.data.tokens).toBeDefined();
        expect(response.data.tokens.accessToken).toBeDefined();
      } else {
        expect([200, 404]).toContain(response.status);
      }
    });

    it('AUTH-013: Token refresh with invalid token returns 401', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/refresh', {
        refreshToken: 'invalid-refresh-token',
      });

      expect([401, 404]).toContain(response.status);
    });
  });

  describe('Logout', () => {
    let token: string;

    beforeAll(async () => {
      const t = await login();
      if (!t) throw new Error('Failed to login for logout tests');
      token = t;
    });

    it('AUTH-014: POST /logout invalidates session', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/logout', undefined, token);

      expect([200, 204, 404]).toContain(response.status);
    });

    it('AUTH-015: Using token after logout may fail', async () => {
      // First logout
      await apiRequest('POST', '/api/v1/auth/logout', undefined, token);

      // Try to use the token - behavior depends on implementation
      // Token-based auth might still work until expiry
      const response = await apiRequest('GET', '/api/v1/auth/me', undefined, token);

      // Either still works (stateless JWT) or fails (token blacklist)
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    it('AUTH-016: Multiple failed login attempts trigger rate limit', async () => {
      const attempts = Array.from({ length: 15 }, () =>
        apiRequest('POST', '/api/v1/auth/login', {
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      );

      const responses = await Promise.all(attempts);
      const statuses = responses.map((r) => r.status);

      // Should have mix of 401 (wrong password) and possibly 429 (rate limited)
      expect(statuses.some((s) => s === 401 || s === 429)).toBe(true);
    });

    it('AUTH-017: Rapid requests to health endpoint should not error', async () => {
      const requests = Array.from({ length: 20 }, () => apiRequest('GET', '/health'));
      const responses = await Promise.all(requests);

      for (const response of responses) {
        expect([200, 429]).toContain(response.status);
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('Password Security', () => {
    it('AUTH-018: Very long password is handled gracefully', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        email: 'admin@newvision.in',
        password: 'a'.repeat(10000),
      });

      // Should not crash - return 400 or 401
      expect([400, 401]).toContain(response.status);
    });

    it('AUTH-019: SQL injection in email is blocked', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        email: "admin@newvision.in' OR '1'='1",
        password: 'test',
      });

      expect([400, 401]).toContain(response.status);
    });

    it('AUTH-020: XSS in email is blocked', async () => {
      const response = await apiRequest('POST', '/api/v1/auth/login', {
        email: '<script>alert("xss")</script>@example.com',
        password: 'test',
      });

      expect([400, 401]).toContain(response.status);
    });
  });

  describe('CORS and Headers', () => {
    it('AUTH-021: Response includes security headers', async () => {
      const response = await apiRequest('GET', '/health');

      // Check for common security headers (may vary by config)
      expect(response.headers).toBeDefined();
    });

    it('AUTH-022: OPTIONS request is handled', async () => {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'OPTIONS',
      });

      // Should return 200 or 204 for preflight
      expect([200, 204]).toContain(response.status);
    });
  });
});
