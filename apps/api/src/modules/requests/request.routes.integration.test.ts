import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'requester-user-id',
      tenantId: 'tenant-123',
      permissions: ['request:create', 'request:read', 'request:update', 'request:approve', 'request:delete'],
    };
    next();
  },
  authorize: (_permission: string) => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('./request.service', () => ({
  createRequest: vi.fn(),
  getRequest: vi.fn(),
  listRequests: vi.fn(),
  updateRequest: vi.fn(),
  deleteRequest: vi.fn(),
  submitRequest: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  returnRequest: vi.fn(),
  cancelRequest: vi.fn(),
  linkRequestToInvoice: vi.fn(),
  unlinkRequestFromInvoice: vi.fn(),
  addComment: vi.fn(),
  getComments: vi.fn(),
  addAttachment: vi.fn(),
  downloadAttachment: vi.fn(),
  getDashboardStats: vi.fn(),
  getPendingApprovals: vi.fn(),
  listRequestTypes: vi.fn(),
  getRequestType: vi.fn(),
}));

import requestRoutes from './request.routes';
import * as requestService from './request.service';
import { ApiError, errorHandler } from '../../middleware/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/requests', requestRoutes);
  app.use(errorHandler);
  return app;
}

describe('Request Routes Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('REQ-RT-001: should reject update request with non-uuid id', async () => {
    const response = await request(createApp())
      .put('/api/v1/requests/not-a-uuid')
      .send({ title: 'Updated title' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(requestService.updateRequest).not.toHaveBeenCalled();
  });

  it('REQ-RT-002: should reject return request with invalid payload shape', async () => {
    const response = await request(createApp())
      .post('/api/v1/requests/11111111-1111-1111-1111-111111111111/return')
      .send({ comments: 12345 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(requestService.returnRequest).not.toHaveBeenCalled();
  });

  it('REQ-RT-003: should reject cancel request when reason is missing', async () => {
    const response = await request(createApp())
      .post('/api/v1/requests/11111111-1111-1111-1111-111111111111/cancel')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(requestService.cancelRequest).not.toHaveBeenCalled();
  });

  it('REQ-RT-004: should create and immediately submit when submitForApproval is true', async () => {
    vi.mocked(requestService.createRequest).mockResolvedValue({ id: 'request-1', status: 'DRAFT' } as never);
    vi.mocked(requestService.submitRequest).mockResolvedValue({ id: 'request-1', status: 'PENDING_APPROVAL' } as never);

    const response = await request(createApp())
      .post('/api/v1/requests')
      .send({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Allocate staffing',
        requestData: {},
        submitForApproval: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Request submitted successfully');
    expect(response.body.meta).toEqual({
      submissionAttempted: true,
      submissionSucceeded: true,
    });
    expect(requestService.createRequest).toHaveBeenCalled();
    expect(requestService.submitRequest).toHaveBeenCalledWith('tenant-123', 'request-1', 'requester-user-id');
  });

  it('REQ-RT-005: should return saved draft when submit after create fails', async () => {
    vi.mocked(requestService.createRequest).mockResolvedValue({ id: 'request-2', status: 'DRAFT' } as never);
    vi.mocked(requestService.submitRequest).mockRejectedValue(
      new ApiError('Dependency missing', 400, 'DEPENDENCY_NOT_MET')
    );

    const response = await request(createApp())
      .post('/api/v1/requests')
      .send({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Allocate staffing',
        requestData: {},
        submitForApproval: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id: 'request-2', status: 'DRAFT' });
    expect(response.body.message).toBe('Draft saved, but submission failed');
    expect(response.body.meta).toEqual({
      submissionAttempted: true,
      submissionSucceeded: false,
      submissionError: {
        message: 'Dependency missing',
        code: 'DEPENDENCY_NOT_MET',
        statusCode: 400,
      },
    });
  });

  it('REQ-RT-006: should upload a request attachment', async () => {
    vi.mocked(requestService.addAttachment).mockResolvedValue({
      id: 'attachment-1',
      fileName: 'brief.txt',
      fileSize: 12,
    } as never);

    const response = await request(createApp())
      .post('/api/v1/requests/11111111-1111-1111-1111-111111111111/attachments')
      .attach('file', Buffer.from('hello world'), 'brief.txt');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Attachment uploaded successfully');
    expect(requestService.addAttachment).toHaveBeenCalledWith(
      'tenant-123',
      '11111111-1111-1111-1111-111111111111',
      'requester-user-id',
      expect.objectContaining({
        originalname: 'brief.txt',
        mimetype: 'text/plain',
      })
    );
  });

  it('REQ-RT-007: should download a request attachment', async () => {
    vi.mocked(requestService.downloadAttachment).mockResolvedValue({
      buffer: Buffer.from('attachment-body'),
      filename: 'brief.txt',
      mimeType: 'text/plain',
    });

    const response = await request(createApp())
      .get('/api/v1/requests/11111111-1111-1111-1111-111111111111/attachments/22222222-2222-2222-2222-222222222222/download');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.headers['content-disposition']).toContain('attachment; filename="brief.txt"');
    expect(requestService.downloadAttachment).toHaveBeenCalledWith(
      'tenant-123',
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'requester-user-id'
    );
  });
});
