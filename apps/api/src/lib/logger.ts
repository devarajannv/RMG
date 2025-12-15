import winston from 'winston';
import { config } from '../config/env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

const prodFormat = printf(({ level, message, timestamp, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
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
const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie'];

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


