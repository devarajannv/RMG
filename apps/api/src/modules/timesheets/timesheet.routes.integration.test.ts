import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'timesheet-user-id',
      tenantId: 'tenant-123',
      permissions: ['timesheet:read'],
    };
    next();
  },
  authorize: (_permission: string) => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('./timesheet.service', () => ({
  getLinkedResourceForUser: vi.fn(),
  canAccessResourceTimesheet: vi.fn(),
  getTimesheetEntries: vi.fn(),
}));

import timesheetRoutes from './timesheet.controller';
import * as timesheetService from './timesheet.service';
import { errorHandler } from '../../middleware/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/timesheets', timesheetRoutes);
  app.use(errorHandler);
  return app;
}

describe('Timesheet Routes Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('TS-RT-001: fails closed when scoped user has no linked resource for list route', async () => {
    vi.mocked(timesheetService.getLinkedResourceForUser).mockResolvedValue(null as never);

    const response = await request(createApp()).get('/api/v1/timesheets');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('No linked resource found for scoped timesheet access');
    expect(timesheetService.getTimesheetEntries).not.toHaveBeenCalled();
  });

  it('TS-RT-002: rejects scoped user querying another resource without access', async () => {
    vi.mocked(timesheetService.canAccessResourceTimesheet).mockResolvedValue(false);

    const response = await request(createApp()).get('/api/v1/timesheets').query({
      resourceId: '11111111-1111-1111-1111-111111111111',
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Access denied to this resource timesheet data');
    expect(timesheetService.getTimesheetEntries).not.toHaveBeenCalled();
  });

  it('TS-RT-003: allows scoped user with linked resource and applies scoped filter', async () => {
    vi.mocked(timesheetService.getLinkedResourceForUser).mockResolvedValue({ id: 'resource-abc' } as never);
    vi.mocked(timesheetService.getTimesheetEntries).mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    } as never);

    const response = await request(createApp()).get('/api/v1/timesheets');

    expect(response.status).toBe(200);
    expect(timesheetService.getTimesheetEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-123',
        resourceId: 'resource-abc',
      })
    );
  });
});
