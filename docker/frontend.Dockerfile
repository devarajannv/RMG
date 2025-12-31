# RMGaaS Frontend Dockerfile
# Multi-stage build for development and production
# Optimized for build caching and minimal image size

# =============================================================================
# Base Stage - Common setup
# =============================================================================
FROM node:20-alpine AS base

WORKDIR /app

# Install essential packages
RUN apk add --no-cache libc6-compat dumb-init

# Set npm configurations
ENV NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# =============================================================================
# Dependencies Stage - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy only package files first (better caching)
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (ignore scripts to skip husky)
RUN npm ci --ignore-scripts

# =============================================================================
# Development Stage - Hot reload enabled
# =============================================================================
FROM base AS development

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Environment
ENV NODE_ENV=development

EXPOSE 3000

CMD ["dumb-init", "npm", "run", "dev", "--workspace=@rmgaas/frontend", "--", "--host", "0.0.0.0"]

# =============================================================================
# Builder Stage - Build the application
# =============================================================================
FROM base AS builder

WORKDIR /app

# Accept build-time arguments
ARG VITE_API_URL
ARG VITE_APP_ENV=production

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_APP_ENV=${VITE_APP_ENV}

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build shared package first
RUN npm run build --workspace=@rmgaas/shared 2>/dev/null || echo "Shared build skipped"

# Build frontend
RUN npm run build --workspace=@rmgaas/frontend

# =============================================================================
# Production Stage - Nginx serving static files
# =============================================================================
FROM nginx:1.25-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx configuration
COPY docker/nginx.frontend.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Create nginx cache directories
RUN mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Security: Run as non-root
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80

# Use nginx user
USER nginx

CMD ["nginx", "-g", "daemon off;"]


