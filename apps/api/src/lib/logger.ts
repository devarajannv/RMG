import winston from 'winston';
import { config } from '../config/env';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Async local storage for request context (correlation IDs)
export const requestContext = new AsyncLocalStorage<RequestContext>();

export interface RequestContext {
  requestId: string;
  correlationId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  method?: string;
  path?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Generate a new request ID
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Get current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(additionalContext: Record<string, unknown>) {
  return {
    info: (message: string, meta?: Record<string, unknown>) => 
      logger.info(message, { ...additionalContext, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) => 
      logger.warn(message, { ...additionalContext, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) => 
      logger.error(message, { ...additionalContext, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) => 
      logger.debug(message, { ...additionalContext, ...meta }),
  };
}

// Development format - human readable
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const ctx = getRequestContext();
  let log = `${timestamp} [${level}]`;
  if (ctx?.requestId) {
    log += ` [${ctx.requestId.slice(0, 8)}]`;
  }
  log += `: ${message}`;
  
  // Add relevant meta (excluding context which is handled above)
  const { requestId, correlationId, ...restMeta } = meta;
  if (Object.keys(restMeta).length > 0) {
    log += ` ${JSON.stringify(restMeta)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

// Production format - structured JSON
const prodFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const ctx = getRequestContext();
  
  const logEntry: Record<string, unknown> = {
    '@timestamp': timestamp,
    level,
    message,
    service: 'rmgaas-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    host: process.env.HOSTNAME || 'unknown',
  };
  
  // Add request context
  if (ctx) {
    logEntry.requestId = ctx.requestId;
    if (ctx.correlationId) logEntry.correlationId = ctx.correlationId;
    if (ctx.userId) logEntry.userId = ctx.userId;
    if (ctx.traceId) logEntry.traceId = ctx.traceId;
    if (ctx.spanId) logEntry.spanId = ctx.spanId;
    if (ctx.method) logEntry.http = { method: ctx.method, path: ctx.path };
    if (ctx.ip) logEntry.client = { ip: ctx.ip, userAgent: ctx.userAgent };
  }
  
  // Add additional metadata
  const { requestId, correlationId, userId, traceId, spanId, method, path, ip, userAgent, ...restMeta } = meta;
  if (Object.keys(restMeta).length > 0) {
    logEntry.meta = restMeta;
  }
  
  // Add stack trace for errors
  if (stack) {
    logEntry.stack = stack;
  }
  
  return JSON.stringify(logEntry);
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }) // ISO 8601 format
  ),
  defaultMeta: {
    service: 'rmgaas-api',
  },
  transports: [
    new winston.transports.Console({
      format: config.isDev
        ? combine(colorize(), devFormat)
        : prodFormat,
    }),
  ],
  // Never log sensitive data
  exceptionHandlers: [
    new winston.transports.Console({
      format: config.isDev
        ? combine(colorize(), devFormat)
        : prodFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: config.isDev
        ? combine(colorize(), devFormat)
        : prodFormat,
    }),
  ],
});

// Prevent logging of sensitive fields
const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie', 'apikey', 'bearer', 'jwt', 'session'];

export function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key] as Record<string, unknown>);
    }
  }
  return sanitized;
}

/**
 * Log levels for structured logging
 */
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

/**
 * Structured log helper for audit events
 */
export function logAuditEvent(
  action: string,
  resource: string,
  details: Record<string, unknown> = {}
) {
  const ctx = getRequestContext();
  logger.info(`Audit: ${action} on ${resource}`, {
    audit: true,
    action,
    resource,
    ...details,
    userId: ctx?.userId,
    requestId: ctx?.requestId,
  });
}

/**
 * Structured log helper for security events
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, unknown> = {}
) {
  const ctx = getRequestContext();
  const logFn = severity === 'critical' || severity === 'high' ? logger.error : logger.warn;
  
  logFn(`Security: ${event}`, {
    security: true,
    event,
    severity,
    ...details,
    userId: ctx?.userId,
    requestId: ctx?.requestId,
    ip: ctx?.ip,
  });
}

/**
 * Structured log helper for performance metrics
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  details: Record<string, unknown> = {}
) {
  const ctx = getRequestContext();
  const level = durationMs > 1000 ? 'warn' : 'debug';
  
  logger.log(level, `Performance: ${operation} took ${durationMs}ms`, {
    performance: true,
    operation,
    durationMs,
    slow: durationMs > 1000,
    ...details,
    requestId: ctx?.requestId,
  });
}


