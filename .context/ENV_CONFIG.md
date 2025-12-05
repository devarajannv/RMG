# Environment Configuration

> **Version:** 1.0  
> **Last Updated:** 2025-12-06T00:00:00Z  
> **Status:** APPROVED  
> **⚠️ NEVER commit actual secrets to version control**

---

## Overview

This document defines all environment variables, configuration files, and secrets management for RMGaaS. **AI assistants MUST use these variable names exactly.**

---

## Environment Files

```
project-root/
├── .env.example          # Template (committed to git)
├── .env                  # Local development (gitignored)
├── .env.test            # Test environment (gitignored)
├── .env.staging         # Staging (DO NOT COMMIT)
└── .env.production      # Production (DO NOT COMMIT)
```

---

## Environment Variables

### Application

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `APP_NAME` | Application name | `RMGaaS` | ✅ |
| `APP_VERSION` | Application version | `0.1.0` | ❌ |
| `PORT` | Server port | `3001` | ✅ |
| `HOST` | Server host | `0.0.0.0` | ❌ |
| `API_URL` | Backend API URL | `http://localhost:3001` | ✅ |
| `CLIENT_URL` | Frontend URL | `http://localhost:3000` | ✅ |
| `LOG_LEVEL` | Logging level | `debug` | ❌ |

### Database

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/rmgaas?schema=public` | ✅ |
| `DATABASE_POOL_MIN` | Minimum connections | `2` | ❌ |
| `DATABASE_POOL_MAX` | Maximum connections | `10` | ❌ |

### Redis

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection | `redis://localhost:6379` | ✅ |
| `REDIS_PASSWORD` | Redis password | `(secret)` | ❌ |

### Authentication

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT signing secret | `(32+ char secret)` | ✅ |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` | ✅ |
| `COOKIE_SECRET` | Cookie signing secret | `(32+ char secret)` | ✅ |
| `COOKIE_DOMAIN` | Cookie domain | `.rmgaas.io` | ❌ |

### Security

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000,https://app.rmgaas.io` | ✅ |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` | ❌ |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | ❌ |
| `BCRYPT_ROUNDS` | Password hash rounds | `12` | ❌ |

### Email (Future)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | SMTP server | `smtp.sendgrid.net` | ❌ |
| `SMTP_PORT` | SMTP port | `587` | ❌ |
| `SMTP_USER` | SMTP username | `apikey` | ❌ |
| `SMTP_PASS` | SMTP password | `(API key)` | ❌ |
| `EMAIL_FROM` | From address | `noreply@rmgaas.io` | ❌ |

### Monitoring (Future)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SENTRY_DSN` | Sentry error tracking | `https://xxx@sentry.io/xxx` | ❌ |

---

## .env.example Template

```bash
# =============================================================================
# RMGaaS Environment Configuration
# =============================================================================
# Copy this file to .env and fill in the values
# NEVER commit .env to version control
# =============================================================================

# -----------------------------------------------------------------------------
# Application
# -----------------------------------------------------------------------------
NODE_ENV=development
APP_NAME=RMGaaS
PORT=3001
HOST=0.0.0.0
API_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000
LOG_LEVEL=debug

# -----------------------------------------------------------------------------
# Database (PostgreSQL)
# -----------------------------------------------------------------------------
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rmgaas?schema=public
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# -----------------------------------------------------------------------------
# Cache (Redis)
# -----------------------------------------------------------------------------
REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=

# -----------------------------------------------------------------------------
# Authentication
# -----------------------------------------------------------------------------
# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=your-cookie-secret-key-change-in-production
# COOKIE_DOMAIN=.rmgaas.io

# -----------------------------------------------------------------------------
# Security
# -----------------------------------------------------------------------------
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# -----------------------------------------------------------------------------
# Email (Optional - for notifications)
# -----------------------------------------------------------------------------
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=
# EMAIL_FROM=noreply@rmgaas.io

# -----------------------------------------------------------------------------
# Monitoring (Optional)
# -----------------------------------------------------------------------------
# SENTRY_DSN=

# =============================================================================
# End of Configuration
# =============================================================================
```

---

## Environment-Specific Values

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rmgaas_dev?schema=public
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
JWT_EXPIRES_IN=1h  # Longer for easier debugging
```

### Test

```bash
NODE_ENV=test
LOG_LEVEL=error
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rmgaas_test?schema=public
REDIS_URL=redis://localhost:6379/1
JWT_EXPIRES_IN=5m
```

### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@staging-db.internal:5432/rmgaas?schema=public
REDIS_URL=redis://:password@staging-redis.internal:6379/0
CORS_ORIGINS=https://staging.rmgaas.io
API_URL=https://api.staging.rmgaas.io
CLIENT_URL=https://staging.rmgaas.io
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgresql://user:pass@prod-db.internal:5432/rmgaas?schema=public
REDIS_URL=redis://:password@prod-redis.internal:6379/0
CORS_ORIGINS=https://app.rmgaas.io
API_URL=https://api.rmgaas.io
CLIENT_URL=https://app.rmgaas.io
```

---

## Configuration Loading

### Backend (TypeScript)

```typescript
// src/config/env.ts

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  APP_NAME: z.string().default('RMGaaS'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('0.0.0.0'),
  API_URL: z.string().url(),
  CLIENT_URL: z.string().url(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.string().transform(Number).default('2'),
  DATABASE_POOL_MAX: z.string().transform(Number).default('10'),
  
  // Redis
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),
  
  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().optional(),
  
  // Security
  CORS_ORIGINS: z.string().transform((s) => s.split(',')),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Type export
export type Env = z.infer<typeof envSchema>;
```

### Frontend (Vite)

```typescript
// vite.config.ts - environment variables with VITE_ prefix only

// .env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=RMGaaS

// Usage in code
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## Secrets Management

### Local Development
- Use `.env` files (gitignored)
- Use Docker secrets for databases

### CI/CD (GitHub Actions)
- Use GitHub Secrets
- Never print secrets in logs

### Production
- Use environment variables from hosting platform
- Or use secrets manager (AWS Secrets Manager, HashiCorp Vault)

### Secret Rotation
| Secret | Rotation Frequency |
|--------|-------------------|
| JWT_SECRET | Quarterly |
| DATABASE passwords | Quarterly |
| API keys | On compromise or annually |

---

## Docker Compose Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rmgaas
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  server:
    build: ./server
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"

  client:
    build: ./client
    env_file:
      - .env
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:
```

---

## Validation Checklist

Before deploying to any environment:

- [ ] All required variables are set
- [ ] Secrets are not committed to git
- [ ] URLs are correct for environment
- [ ] CORS origins match frontend URLs
- [ ] Database connection works
- [ ] Redis connection works
- [ ] JWT secret is unique per environment
- [ ] Log level is appropriate

---

*Last Updated: 2025-12-06T00:00:00Z*
*Version: 1.0*
