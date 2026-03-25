import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'admin-user-id',
      tenantId: 'tenant-123',
      permissions: ['users:create', 'users:update', 'users:read', 'users:delete'],
    };
    next();
  },
  authorize: (_permission: string) => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('./user.service', () => ({
  listUsers: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  assignRoleToUser: vi.fn(),
  removeRoleFromUser: vi.fn(),
  resetUserPassword: vi.fn(),
  toggleUserStatus: vi.fn(),
}));

import userRoutes from './user.routes';
import * as userService from './user.service';
import { errorHandler } from '../../middleware/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/users', userRoutes);
  app.use(errorHandler);
  return app;
}

describe('User Routes Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('USER-RT-001: should reject create user with invalid email', async () => {
    const response = await request(createApp()).post('/api/v1/users').send({
      email: 'not-an-email',
      firstName: 'John',
      lastName: 'Doe',
      password: 'Str0ng!Pass1234',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it('USER-RT-002: should reject update user with non-uuid id', async () => {
    const response = await request(createApp()).put('/api/v1/users/not-a-uuid').send({
      firstName: 'Updated',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('USER-RT-003: should return 400 for cross-tenant roleIds error', async () => {
    vi.mocked(userService.createUser).mockRejectedValue(
      new Error('One or more roleIds are invalid for this tenant')
    );

    const response = await request(createApp()).post('/api/v1/users').send({
      email: 'john.doe@newvision.test',
      firstName: 'John',
      lastName: 'Doe',
      password: 'Str0ng!Pass1234',
      roleIds: ['11111111-1111-1111-1111-111111111111'],
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('roleIds');
  });
});
