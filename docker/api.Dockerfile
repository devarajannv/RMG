# RMGaaS API Dockerfile
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
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

# =============================================================================
# Development Stage
# =============================================================================
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN cd apps/api && npx prisma generate || true

EXPOSE 4000
CMD ["npm", "run", "dev", "--workspace=@rmgaas/api"]

# =============================================================================
# Builder Stage
# =============================================================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared package first
RUN npm run build --workspace=@rmgaas/shared || true

# Generate Prisma and build API
RUN cd apps/api && npx prisma generate && npm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 rmgaas

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/packages/shared ./packages/shared
COPY package.json ./

USER rmgaas

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]


