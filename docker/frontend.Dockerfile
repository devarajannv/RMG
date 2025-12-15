# RMGaaS Frontend Dockerfile
# Multi-stage build for development and production

# =============================================================================
# Base Stage
# =============================================================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# =============================================================================
# Dependencies Stage
# =============================================================================
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

# =============================================================================
# Development Stage
# =============================================================================
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=@rmgaas/frontend", "--", "--host", "0.0.0.0"]

# =============================================================================
# Builder Stage
# =============================================================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build
RUN npm run build --workspace=@rmgaas/frontend

# =============================================================================
# Production Stage (with Nginx)
# =============================================================================
FROM nginx:alpine AS production

# Copy custom nginx config
COPY docker/nginx.frontend.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


