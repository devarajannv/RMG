import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ZodError, z } from 'zod';
import { ApiError, errorHandler } from './errorHandler';

const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  logger: {
    error: mockLoggerError,
  },
}));

function createResponseMock() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns safe internal error payload with requestId for unknown errors', () => {
    const req: any = {
      method: 'GET',
      path: '/api/v1/test',
      originalUrl: '/api/v1/test',
      requestId: 'req-123',
      headers: {},
    };
    const res = createResponseMock();

    errorHandler(new Error('database exploded'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Something went wrong. Please try again.',
      code: 'INTERNAL_ERROR',
      requestId: 'req-123',
    });
  });

  it('returns operational ApiError message for client errors', () => {
    const req: any = {
      method: 'GET',
      path: '/api/v1/test',
      originalUrl: '/api/v1/test',
      requestId: 'req-abc',
      headers: {},
    };
    const res = createResponseMock();

    errorHandler(new ApiError('Forbidden', 403, 'FORBIDDEN'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      code: 'FORBIDDEN',
      requestId: 'req-abc',
    });
  });

  it('normalizes Prisma unique errors to safe conflict responses', () => {
    const req: any = {
      method: 'POST',
      path: '/api/v1/users',
      originalUrl: '/api/v1/users',
      requestId: 'req-prisma',
      headers: {},
    };
    const res = createResponseMock();

    const prismaErr: any = {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      message: 'Unique constraint failed on the fields: (`email`)',
      stack: 'stack',
    };

    errorHandler(prismaErr, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'A record with this value already exists',
      code: 'CONFLICT',
      requestId: 'req-prisma',
    });
  });

  it('returns structured zod validation errors', () => {
    const req: any = {
      method: 'POST',
      path: '/api/v1/users',
      originalUrl: '/api/v1/users',
      requestId: 'req-zod',
      headers: {},
    };
    const res = createResponseMock();

    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: 'not-an-email' });
    expect(parsed.success).toBe(false);

    if (parsed.success) {
      return;
    }

    errorHandler(parsed.error as ZodError, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        requestId: 'req-zod',
      })
    );
  });
});
