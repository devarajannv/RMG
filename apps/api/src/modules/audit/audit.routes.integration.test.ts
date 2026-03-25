import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Errors } from '../../middleware/errorHandler';

const { mockAuthenticate, mockAuthorize } = vi.hoisted(() => ({
  mockAuthenticate: vi.fn((req, _res, next) => {
    req.user = {
      id: 'user-123',
      tenantId: 'tenant-123',
      email: 'admin@example.com',
      roles: ['Admin'],
      permissions: ['audit:read'],
    };
    next();
  }),
  mockAuthorize: vi.fn((permission: string) => (req, _res, next) => {
    const permissions = req.user?.permissions ?? [];
    if (permissions.includes('*') || permissions.includes(permission)) {
      next();
      return;
    }

    next(Errors.forbidden('Insufficient permissions'));
  }),
}));

vi.mock('../../middleware/auth', () => ({
  authenticate: mockAuthenticate,
  authorize: mockAuthorize,
}));

vi.mock('./audit.service', () => ({
  getAuditLogs: vi.fn(),
  getAuditLogEntityTypes: vi.fn(),
  createAuditLog: vi.fn(),
  createInvoiceLinkageAuditEvent: vi.fn(),
  getInvoiceLinkageReconciliationReport: vi.fn(),
}));

import auditRoutes from './audit.routes';
import * as auditService from './audit.service';
import { errorHandler } from '../../middleware/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/audit-logs', auditRoutes);
  app.use(errorHandler);
  return app;
}

describe('Audit Routes Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('AUDIT-RT-001: should return invoice linkage reconciliation report', async () => {
    vi.mocked(auditService.getInvoiceLinkageReconciliationReport).mockResolvedValue({
      data: [
        {
          invoiceReference: 'INV-2026-0001',
          requestCount: 2,
          timesheetEntryCount: 5,
          timesheetPeriodCount: 1,
          totalLinkedRecords: 8,
        },
      ],
      summary: {
        invoiceReferenceCount: 1,
        requestCount: 2,
        timesheetEntryCount: 5,
        timesheetPeriodCount: 1,
        totalLinkedRecords: 8,
      },
    });

    const app = createApp();
    const response = await request(app).get('/api/v1/audit-logs/invoice-linkage/reconciliation-report');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          invoiceReference: 'INV-2026-0001',
          requestCount: 2,
          timesheetEntryCount: 5,
          timesheetPeriodCount: 1,
          totalLinkedRecords: 8,
        },
      ],
      summary: {
        invoiceReferenceCount: 1,
        requestCount: 2,
        timesheetEntryCount: 5,
        timesheetPeriodCount: 1,
        totalLinkedRecords: 8,
      },
    });
    expect(auditService.getInvoiceLinkageReconciliationReport).toHaveBeenCalledWith('tenant-123');
    expect(mockAuthenticate).toHaveBeenCalled();
    expect(mockAuthorize).toHaveBeenCalledWith('audit:read');
  });

  it('AUDIT-RT-002: should return 500 when reconciliation report service fails', async () => {
    vi.mocked(auditService.getInvoiceLinkageReconciliationReport).mockRejectedValue(
      new Error('reconciliation failed')
    );

    const app = createApp();
    const response = await request(app).get('/api/v1/audit-logs/invoice-linkage/reconciliation-report');

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('INTERNAL_ERROR');
  });

  it('AUDIT-RT-003: should return 403 when audit:read permission is missing', async () => {
    mockAuthenticate.mockImplementationOnce((req, _res, next) => {
      req.user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'viewer@example.com',
        roles: ['Viewer'],
        permissions: [],
      };
      next();
    });

    const app = createApp();
    const response = await request(app).get('/api/v1/audit-logs/invoice-linkage/reconciliation-report');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(response.body.error).toBe('Insufficient permissions');
    expect(auditService.getInvoiceLinkageReconciliationReport).not.toHaveBeenCalled();
  });
});
