import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { config } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

interface ErrorResponseBody {
  error: string;
  code: string;
  requestId?: string;
  details?: Array<{ field: string; message: string }>;
}

function getRequestId(req: Request): string | undefined {
  return req.requestId || (req.headers['x-request-id'] as string | undefined);
}

function sendError(
  req: Request,
  res: Response,
  statusCode: number,
  body: Omit<ErrorResponseBody, 'requestId'>
) {
  return res.status(statusCode).json({
    ...body,
    requestId: getRequestId(req),
  });
}

function isPrismaKnownRequestError(err: unknown): err is { name: string; code: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    'code' in err &&
    (err as { name?: string }).name === 'PrismaClientKnownRequestError'
  );
}

function isPrismaValidationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'PrismaClientValidationError'
  );
}

function isPrismaInitializationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'PrismaClientInitializationError'
  );
}

function isBodyParserSyntaxError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.parse.failed'
  );
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = getRequestId(req);

  logger.error('Unhandled request error', {
    requestId,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: err.statusCode,
    code: err.code,
    isOperational: err.isOperational,
    errorName: err?.name,
    errorMessage: err?.message,
    stack: err?.stack,
    userId: req.user?.id,
    tenantId: req.tenantId || req.user?.tenantId,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return sendError(req, res, 400, {
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((issue) => ({
        field: config.isProd ? (issue.path[issue.path.length - 1] || 'input').toString() : issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (isBodyParserSyntaxError(err)) {
    return sendError(req, res, 400, {
      error: 'Invalid JSON payload',
      code: 'INVALID_JSON',
    });
  }

  if (isPrismaKnownRequestError(err)) {
    if (err.code === 'P2002') {
      return sendError(req, res, 409, {
        error: 'A record with this value already exists',
        code: 'CONFLICT',
      });
    }

    if (err.code === 'P2025') {
      return sendError(req, res, 404, {
        error: 'Requested record was not found',
        code: 'NOT_FOUND',
      });
    }

    return sendError(req, res, 400, {
      error: 'Request could not be completed',
      code: 'REQUEST_FAILED',
    });
  }

  if (isPrismaValidationError(err)) {
    return sendError(req, res, 400, {
      error: 'Invalid request payload',
      code: 'VALIDATION_ERROR',
    });
  }

  if (isPrismaInitializationError(err)) {
    return sendError(req, res, 503, {
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
    });
  }

  // Known operational errors
  if (err.isOperational) {
    const statusCode = err.statusCode || 400;
    const safeMessage = statusCode >= 500 ? 'Operation failed. Please try again.' : err.message;

    return sendError(req, res, statusCode, {
      error: safeMessage,
      code: err.code || 'ERROR',
    });
  }

  return sendError(req, res, 500, {
    error: 'Something went wrong. Please try again.',
    code: 'INTERNAL_ERROR',
  });
}

// Custom error class
export class ApiError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode = 400, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common errors
export const Errors = {
  notFound: (resource = 'Resource') =>
    new ApiError(`${resource} not found`, 404, 'NOT_FOUND'),
  unauthorized: (message = 'Unauthorized') =>
    new ApiError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') =>
    new ApiError(message, 403, 'FORBIDDEN'),
  badRequest: (message: string) =>
    new ApiError(message, 400, 'BAD_REQUEST'),
  conflict: (message: string) =>
    new ApiError(message, 409, 'CONFLICT'),
  tooManyRequests: () =>
    new ApiError('Too many requests', 429, 'RATE_LIMITED'),
};

/**
 * Async handler wrapper for Express route handlers
 * Catches async errors and passes them to the error handler
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}


