# Contopia — Backend Dockerfile
# Multi-stage: base → dev / production

# ============================================================================
# Stage 1: Base
# ============================================================================
FROM node:22-alpine AS base

RUN apk add --no-cache dumb-init wget

WORKDIR /app

# ============================================================================
# Stage 2: Development (includes devDependencies)
# ============================================================================
FROM base AS development

COPY backend/package*.json ./
RUN npm install

COPY backend/ .
COPY shared/ /shared/

EXPOSE 8000

  # /health  → liveness probe  (process alive, always 200)
  # /api/v1/ready → readiness probe (dependencies connected, 200 or 503)
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/main.js"]

# ============================================================================
# Stage 3: Production (non-root, prod deps only)
# ============================================================================
FROM base AS production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/ .
COPY shared/ /shared/

RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8000

  # /health  → liveness probe  (process alive, always 200)
  # /api/v1/ready → readiness probe (dependencies connected, 200 or 503)
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/main.js"]
