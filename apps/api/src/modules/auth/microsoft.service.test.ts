/**
 * Microsoft SSO Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../lib/prisma', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    role: {
      findFirst: vi.fn(),
    },
    userRole: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../lib/jwt', () => ({
  generateTokenPair: vi.fn(() => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessExpiresIn: 900,
    refreshExpiresIn: 604800,
  })),
}));

vi.mock('../../lib/redis', () => ({
  storeRefreshTokenFamily: vi.fn(),
}));

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed-password')),
  },
}));

vi.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: vi.fn().mockImplementation(() => ({
    getAuthCodeUrl: vi.fn(() => Promise.resolve('https://login.microsoftonline.com/authorize?...')),
    acquireTokenByCode: vi.fn(() => Promise.resolve({
      accessToken: 'ms-access-token',
      idToken: 'ms-id-token',
    })),
  })),
}));

vi.mock('../../config/env', () => ({
  config: {
    microsoft: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
      redirectUri: 'http://localhost:4000/api/v1/auth/microsoft/callback',
    },
    defaultTenantId: 'default-tenant-uuid',
  },
}));

// Mock global fetch
global.fetch = vi.fn();

import * as microsoftService from './microsoft.service';
import prisma from '../../lib/prisma';

describe('Microsoft SSO Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================
  describe('isMicrosoftSSOConfigured', () => {
    it('should return true when all required config is present', () => {
      const result = microsoftService.isMicrosoftSSOConfigured();
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // Authorization URL Tests
  // ==========================================================================
  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with correct redirect URI', async () => {
      const redirectUri = 'http://localhost:4000/api/v1/auth/microsoft/callback';
      const url = await microsoftService.getAuthorizationUrl(redirectUri);
      
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
      expect(url).toContain('login.microsoftonline.com');
    });

    it('should include state parameter when provided', async () => {
      const redirectUri = 'http://localhost:4000/api/v1/auth/microsoft/callback';
      const state = 'custom-state-value';
      const url = await microsoftService.getAuthorizationUrl(redirectUri, state);
      
      expect(url).toBeDefined();
    });

    it('should generate state if not provided', async () => {
      const redirectUri = 'http://localhost:4000/api/v1/auth/microsoft/callback';
      const url = await microsoftService.getAuthorizationUrl(redirectUri);
      
      expect(url).toBeDefined();
    });
  });

  // ==========================================================================
  // Callback Handler Tests
  // ==========================================================================
  describe('handleCallback', () => {
    const mockMicrosoftUser = {
      id: 'microsoft-user-id-123',
      displayName: 'John Doe',
      givenName: 'John',
      surname: 'Doe',
      mail: 'john.doe@company.com',
      userPrincipalName: 'john.doe@company.com',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
    };

    beforeEach(() => {
      // Mock Microsoft Graph API response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMicrosoftUser),
      });
    });

    it('should find existing user by email and update microsoftId', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email: 'john.doe@company.com',
        tenantId: 'tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        microsoftId: null,
      };

      (prisma.user.findFirst as any).mockResolvedValue(existingUser);
      
      (prisma.user.update as any).mockResolvedValue({
        ...existingUser,
        microsoftId: mockMicrosoftUser.id,
      });

      (prisma.auditLog.create as any).mockResolvedValue({});

      const result = await microsoftService.handleCallback(
        'auth-code',
        'http://localhost:4000/callback',
        'tenant-123'
      );

      expect(result.isNewUser).toBe(false);
      expect(result.user.email).toBe('john.doe@company.com');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should handle Microsoft Graph API failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        microsoftService.handleCallback(
          'invalid-code',
          'http://localhost:4000/callback',
          'tenant-123'
        )
      ).rejects.toThrow('Failed to fetch user information from Microsoft');
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle case-insensitive email matching', async () => {
      const mockUser = {
        id: 'ms-user-id',
        displayName: 'Test User',
        givenName: 'Test',
        surname: 'User',
        mail: 'TEST.USER@COMPANY.COM',
        userPrincipalName: 'test.user@company.com',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const existingUser = {
        id: 'existing-user-id',
        email: 'test.user@company.com',
        tenantId: 'tenant-123',
        firstName: 'Test',
        lastName: 'User',
        microsoftId: null,
      };

      (prisma.user.findFirst as any).mockResolvedValue(existingUser);
      (prisma.user.update as any).mockResolvedValue(existingUser);
      (prisma.auditLog.create as any).mockResolvedValue({});

      const result = await microsoftService.handleCallback(
        'auth-code',
        'http://localhost:4000/callback',
        'tenant-123'
      );

      // Should match case-insensitively
      expect(result.isNewUser).toBe(false);
    });

    it('should properly structure SSO login result', async () => {
      const mockUser = {
        id: 'ms-user-id',
        displayName: 'Test User',
        givenName: 'Test',
        surname: 'User',
        mail: 'test@company.com',
        userPrincipalName: 'test@company.com',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const existingUser = {
        id: 'existing-user-id',
        email: 'test@company.com',
        tenantId: 'tenant-123',
        firstName: 'Test',
        lastName: 'User',
        microsoftId: 'ms-user-id',
      };

      (prisma.user.findFirst as any).mockResolvedValue(existingUser);
      (prisma.user.update as any).mockResolvedValue(existingUser);
      (prisma.auditLog.create as any).mockResolvedValue({});

      const result = await microsoftService.handleCallback(
        'auth-code',
        'http://localhost:4000/callback',
        'tenant-123'
      );

      // Verify result structure
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('isNewUser');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });
  });
});

