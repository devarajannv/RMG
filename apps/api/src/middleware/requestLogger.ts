import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeLogData, requestContext, generateRequestId, RequestContext } from '../lib/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  const correlationId = req.headers['x-correlation-id'] as string;
  const traceId = req.headers['x-trace-id'] as string;
  const spanId = req.headers['x-span-id'] as string;
  
  // Set on request object for backwards compatibility
  req.requestId = requestId;
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Set response headers
  res.setHeader('X-Request-ID', requestId);
  if (correlationId) {
    res.setHeader('X-Correlation-ID', correlationId);
  }

  // Create request context for async local storage
  const ctx: RequestContext = {
    requestId,
    correlationId,
    traceId,
    spanId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };

  // Run the rest of the request in the context
  requestContext.run(ctx, () => {
    // Log request (exclude sensitive paths)
    const sensitiveEndpoints = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];
    const isSensitive = sensitiveEndpoints.some((endpoint) =>
      req.path.startsWith(endpoint)
    );

    // Skip health check logging in production to reduce noise
    const isHealthCheck = req.path.startsWith('/health');
    const skipLogging = isHealthCheck && process.env.NODE_ENV === 'production';

    if (!skipLogging) {
      logger.info('Request received', {
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        body: !isSensitive && req.body && Object.keys(req.body).length > 0 
          ? sanitizeLogData(req.body) 
          : undefined,
        contentLength: req.headers['content-length'],
      });
    }

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      
      if (!skipLogging) {
        const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel]('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: duration,
          contentLength: res.getHeader('content-length'),
        });
      }
    });

    next();
  });
}


