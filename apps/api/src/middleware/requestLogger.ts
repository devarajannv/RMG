import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, sanitizeLogData } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Add request ID
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.startTime = Date.now();

  // Set response header
  res.setHeader('X-Request-ID', req.requestId);

  // Log request (exclude sensitive paths)
  const sensitiveEndpoints = ['/api/v1/auth/login', '/api/v1/auth/register'];
  const isSensitive = sensitiveEndpoints.some((endpoint) =>
    req.path.startsWith(endpoint)
  );

  logger.info('Request received', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: !isSensitive && req.body ? sanitizeLogData(req.body) : undefined,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}


