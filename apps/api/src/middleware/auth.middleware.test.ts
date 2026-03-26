import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifyAccessToken, mockIsTokenBlacklisted, mockFindFirst } = vi.hoisted(() => ({
  mockVerifyAccessToken: vi.fn(),
  mockIsTokenBlacklisted: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock('../lib/jwt', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

vi.mock('../lib/redis', () => ({
  isTokenBlacklisted: mockIsTokenBlacklisted,
}));

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findFirst: mockFindFirst,
    },
  },
}));

import { authenticate, authorize } from './auth';
import { requireAnyPermission } from './rbac';

describe('authenticate middleware email verification policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
      tenantId: 'tenant-1',
    });
    mockIsTokenBlacklisted.mockResolvedValue(false);
  });

  it('blocks unverified users on protected routes', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'user@example.com',
      emailVerified: false,
      status: 'ACTIVE',
      roles: [
        {
          role: {
            name: 'User',
            permissions: ['resource:read'],
            rolePermissions: [],
          },
        },
      ],
    });

    const req: any = {
      headers: { authorization: 'Bearer test-token' },
      signedCookies: {},
      originalUrl: '/api/v1/resources',
      path: '/api/v1/resources',
    };
    const next = vi.fn();

    await authenticate(req, {} as any, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err).toBeTruthy();
    expect(err.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('allows unverified users on send-verification route', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'user@example.com',
      emailVerified: false,
      status: 'ACTIVE',
      roles: [
        {
          role: {
            name: 'User',
            permissions: ['resource:read'],
            rolePermissions: [],
          },
        },
      ],
    });

    const req: any = {
      headers: { authorization: 'Bearer test-token' },
      signedCookies: {},
      originalUrl: '/api/v1/auth/send-verification',
      path: '/api/v1/auth/send-verification',
    };
    const next = vi.fn();

    await authenticate(req, {} as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user).toBeTruthy();
  });

  it('hydrates effective permissions from relational and legacy role grants', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'user@example.com',
      emailVerified: true,
      status: 'ACTIVE',
      roles: [
        {
          role: {
            name: 'PMO',
            permissions: ['projects:read'],
            rolePermissions: [
              {
                granted: true,
                permission: {
                  module: 'client',
                  action: 'write',
                  scope: 'ALL',
                },
              },
            ],
          },
        },
      ],
    });

    const req: any = {
      headers: { authorization: 'Bearer test-token' },
      signedCookies: {},
      originalUrl: '/api/v1/clients',
      path: '/api/v1/clients',
    };
    const next = vi.fn();

    await authenticate(req, {} as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user.permissions).toContain('client:write');
    expect(req.user.permissions).toContain('clients:create');
    expect(req.user.permissions).toContain('projects:read');
    expect(req.user.permissions).toContain('project:read');
  });
});

describe('permission alias matching', () => {
  it('allows plural request permissions to satisfy singular route checks', () => {
    const middleware = authorize('request:create');
    const next = vi.fn();
    const req: any = {
      user: {
        permissions: ['requests:create'],
      },
    };

    middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  it('allows singular request wildcards to satisfy plural route checks', () => {
    const middleware = authorize('requests:read');
    const next = vi.fn();
    const req: any = {
      user: {
        permissions: ['request:*'],
      },
    };

    middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  it('allows requireAnyPermission to match aliased request permissions', () => {
    const middleware = requireAnyPermission('request:read', 'request:create');
    const next = vi.fn();
    const req: any = {
      user: {
        permissions: ['requests:read'],
      },
    };

    middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  it('allows singular document permissions to satisfy plural frontend checks', () => {
    const middleware = authorize('documents:read');
    const next = vi.fn();
    const req: any = {
      user: {
        permissions: ['document:read'],
      },
    };

    middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeUndefined();
  });
});
