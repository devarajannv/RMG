import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

let mockPermissions = ['request-types:read'];

vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'requester-user-id',
      tenantId: 'tenant-123',
      permissions: mockPermissions,
    };
    next();
  },
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission: (_permission: string) => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: (..._permissions: string[]) => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('./request-types.service', () => ({
  listRequestTypes: vi.fn(),
  getRequestTypeById: vi.fn(),
  getRequestTypeByCode: vi.fn(),
  createRequestType: vi.fn(),
  updateRequestType: vi.fn(),
  deleteRequestType: vi.fn(),
  cloneRequestType: vi.fn(),
  assignWorkflowToRequestType: vi.fn(),
  listRequestTypeTemplates: vi.fn(),
  getRequestTypeTemplate: vi.fn(),
  importRequestTypeTemplate: vi.fn(),
  listRequestPacks: vi.fn(),
  getRequestPackByCode: vi.fn(),
  activateRequestPack: vi.fn(),
  listRequestBlueprints: vi.fn(),
  getRequestBlueprintByRequestTypeCode: vi.fn(),
}));

import requestTypesRoutes from './request-types.routes';
import * as requestTypesService from './request-types.service';
import { errorHandler } from '../../middleware/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/request-types', requestTypesRoutes);
  app.use(errorHandler);
  return app;
}

describe('Request Types Routes Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockPermissions = ['request-types:read'];
  });

  it('REQ-TYPE-RT-001: should allow request creators to list request types for the create modal', async () => {
    mockPermissions = ['request:create'];
    vi.mocked(requestTypesService.listRequestTypes).mockResolvedValue({
      data: [{ id: 'type-1', code: 'RESOURCE_ALLOCATION_BATCH', name: 'Batch Resource Allocation' }],
      total: 1,
      page: 1,
      limit: 50,
    } as never);

    const response = await request(createApp())
      .get('/api/v1/request-types');

    expect(response.status).toBe(200);
    expect(requestTypesService.listRequestTypes).toHaveBeenCalledWith(
      'tenant-123',
      {},
      expect.objectContaining({ page: 1, limit: 50, sortBy: 'name', sortOrder: 'asc' })
    );
  });

  it('REQ-TYPES-RT-001: should list available request packs', async () => {
    vi.mocked(requestTypesService.listRequestPacks).mockResolvedValue([
      { code: 'PRO_SERVICES_CORE', name: 'Professional Services Core' },
    ] as never);

    const response = await request(createApp()).get('/api/v1/request-types/packs');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      { code: 'PRO_SERVICES_CORE', name: 'Professional Services Core' },
    ]);
    expect(requestTypesService.listRequestPacks).toHaveBeenCalledWith('tenant-123');
  });

  it('REQ-TYPES-RT-002: should return 404 when request pack is missing', async () => {
    vi.mocked(requestTypesService.getRequestPackByCode).mockResolvedValue(null);

    const response = await request(createApp()).get('/api/v1/request-types/packs/MISSING_PACK');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('REQ-TYPES-RT-002A: should activate a request pack for the tenant', async () => {
    mockPermissions = ['request-types:update'];
    vi.mocked(requestTypesService.activateRequestPack).mockResolvedValue({
      code: 'PRO_SERVICES_CORE',
      activation: { status: 'ACTIVE' },
    } as never);

    const response = await request(createApp()).post('/api/v1/request-types/packs/PRO_SERVICES_CORE/activate');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Request pack activated successfully');
    expect(requestTypesService.activateRequestPack).toHaveBeenCalledWith(
      'tenant-123',
      'PRO_SERVICES_CORE',
      'requester-user-id'
    );
  });

  it('REQ-TYPES-RT-003: should list request blueprints with onlyActivated filter', async () => {
    vi.mocked(requestTypesService.listRequestBlueprints).mockResolvedValue([
      { code: 'MSA_CREATION', isActivatedForTenant: true },
    ] as never);

    const response = await request(createApp()).get('/api/v1/request-types/blueprints?onlyActivated=true');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      { code: 'MSA_CREATION', isActivatedForTenant: true },
    ]);
    expect(requestTypesService.listRequestBlueprints).toHaveBeenCalledWith('tenant-123', {
      onlyActivated: true,
    });
  });

  it('REQ-TYPES-RT-004: should get a request blueprint by request type code', async () => {
    vi.mocked(requestTypesService.getRequestBlueprintByRequestTypeCode).mockResolvedValue({
      code: 'SOW_CREATION',
      requestType: { code: 'SOW_CREATION' },
    } as never);

    const response = await request(createApp()).get('/api/v1/request-types/blueprints/SOW_CREATION');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      code: 'SOW_CREATION',
      requestType: { code: 'SOW_CREATION' },
    });
    expect(requestTypesService.getRequestBlueprintByRequestTypeCode).toHaveBeenCalledWith('tenant-123', 'SOW_CREATION');
  });

  it('REQ-TYPES-RT-005: should continue resolving request types by code on the base detail route', async () => {
    vi.mocked(requestTypesService.getRequestTypeByCode).mockResolvedValue({
      code: 'CUSTOMER_ONBOARDING',
      name: 'Customer Onboarding',
    } as never);

    const response = await request(createApp()).get('/api/v1/request-types/CUSTOMER_ONBOARDING');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      code: 'CUSTOMER_ONBOARDING',
      name: 'Customer Onboarding',
    });
    expect(requestTypesService.getRequestTypeByCode).toHaveBeenCalledWith('tenant-123', 'CUSTOMER_ONBOARDING');
  });
});