import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  APP_NAME: z.string().default('RMGaaS'),
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:4000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Microsoft 365 SSO (Optional)
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default('common'), // 'common' for multi-tenant, or specific tenant ID
  MICROSOFT_REDIRECT_URI: z.string().optional(),

  // Default Tenant (for SSO user provisioning)
  DEFAULT_TENANT_ID: z.string().uuid().optional(),

  // Security
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  COOKIE_SECRET: z.string().min(32),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());

  // In development, provide defaults for optional values
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ Using development defaults...');
  } else {
    throw new Error('Invalid environment configuration');
  }
}

const env = parsed.success ? parsed.data : envSchema.parse({
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://rmgaas:rmgaas_dev@localhost:5432/rmgaas',
  JWT_SECRET: process.env.JWT_SECRET || 'development-jwt-secret-change-in-production-32chars',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'development-cookie-secret-change-in-prod-32char',
});

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  appName: env.APP_NAME,
  appUrl: env.APP_URL,
  apiUrl: env.API_URL,
  frontendUrl: env.FRONTEND_URL,

  // Database
  databaseUrl: env.DATABASE_URL,

  // Redis
  redisUrl: env.REDIS_URL,

  // JWT
  jwtSecret: env.JWT_SECRET,
  jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,

  // Microsoft 365 SSO
  microsoft: {
    clientId: env.MICROSOFT_CLIENT_ID || '',
    clientSecret: env.MICROSOFT_CLIENT_SECRET || '',
    tenantId: env.MICROSOFT_TENANT_ID,
    redirectUri: env.MICROSOFT_REDIRECT_URI,
  },

  // Default tenant for SSO
  defaultTenantId: env.DEFAULT_TENANT_ID || '',

  // Security
  corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
  rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  rateLimitMaxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  cookieSecret: env.COOKIE_SECRET,

  // Logging
  logLevel: env.LOG_LEVEL,

  // Flags
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};


