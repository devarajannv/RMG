# RMGaaS API Dockerfile
# Multi-stage build for development and production
# Optimized for build caching and minimal image size

# =============================================================================
# Base Stage - Common setup for all stages
# =============================================================================
FROM node:20-alpine AS base

# Install essential packages
RUN apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init

WORKDIR /app

# Set npm configurations for better performance
ENV NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# =============================================================================
# Dependencies Stage - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy only package files first (better caching)
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (dev + prod), ignore scripts to skip husky
RUN npm ci --include=dev --ignore-scripts

# =============================================================================
# Production Dependencies Stage - Only production deps
# =============================================================================
FROM base AS prod-deps

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install only production dependencies (ignore scripts to skip husky)
RUN npm ci --omit=dev --ignore-scripts

# =============================================================================
# Development Stage - Hot reload enabled
# =============================================================================
FROM base AS development

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN cd apps/api && npx prisma generate || true

# Environment
ENV NODE_ENV=development \
    PORT=4000

EXPOSE 4000

# Use dumb-init to handle signals properly
CMD ["dumb-init", "npm", "run", "dev", "--workspace=@rmgaas/api"]

# =============================================================================
# Builder Stage - Build the application
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build shared package first
RUN npm run build --workspace=@rmgaas/shared 2>/dev/null || echo "Shared build skipped"

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build API
RUN npm run build --workspace=@rmgaas/api

# Prune dev dependencies after build
RUN npm prune --omit=dev

# =============================================================================
# Production Stage - Minimal runtime image
# =============================================================================
FROM node:20-alpine AS production

# Install only runtime essentials
RUN apk add --no-cache \
    dumb-init \
    curl

WORKDIR /app

# Production environment
ENV NODE_ENV=production \
    PORT=4000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 rmgaas

# Copy production dependencies from prod-deps stage
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy Prisma generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy shared package
COPY --from=builder /app/packages/shared ./packages/shared

# Copy root package.json
COPY package.json ./

# Set ownership
RUN chown -R rmgaas:nodejs /app

# Switch to non-root user
USER rmgaas

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Use dumb-init for proper signal handling
CMD ["dumb-init", "node", "apps/api/dist/index.js"]


