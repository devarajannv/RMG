import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { config } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error (sanitized)
  logger.error('Error occurred', {
    message: err.message,
    code: err.code,
    stack: config.isDev ? err.stack : undefined,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      error: err.message,
      code: err.code || 'ERROR',
    });
  }

  // Unknown errors - don't leak details in production
  const statusCode = err.statusCode || 500;
  const message = config.isProd ? 'Internal server error' : err.message;

  return res.status(statusCode).json({
    error: message,
    code: 'INTERNAL_ERROR',
    ...(config.isDev && { stack: err.stack }),
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


