import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'document-user-id',
      tenantId: 'tenant-123',
      permissions: ['document:create'],
    };
    next();
  },
  authorize: (_permission: string) => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('./document.service', () => ({
  documentService: {
    uploadDocument: vi.fn(),
  },
}));

import documentRoutes from './document.routes';
import { errorHandler } from '../../middleware/errorHandler';
import { documentService } from './document.service';

function createApp() {
  const app = express();
  app.use('/api/v1/documents', documentRoutes);
  app.use(errorHandler);
  return app;
}

describe('Document Routes Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('DOC-RT-001: should return a client error when the upload file type is not allowed', async () => {
    const response = await request(createApp())
      .post('/api/v1/documents')
      .field('name', 'malware.exe')
      .attach('file', Buffer.from('bad payload'), 'malware.exe');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(response.body.error).toContain('File type not allowed');
  });

  it('DOC-RT-002: should return taxonomy violations from the upload controller', async () => {
    vi.mocked(documentService.uploadDocument).mockRejectedValue(
      new Error('Document category INVALID_CATEGORY is not allowed by tenant policy')
    );

    const response = await request(createApp())
      .post('/api/v1/documents')
      .field('name', 'taxonomy-smoke.txt')
      .field('category', 'INVALID_CATEGORY')
      .field('classification', 'INTERNAL')
      .attach('file', Buffer.from('taxonomy payload'), {
        filename: 'taxonomy-smoke.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('DOCUMENT_TAXONOMY_VIOLATION');
    expect(response.body.error).toContain('INVALID_CATEGORY');
  });
});