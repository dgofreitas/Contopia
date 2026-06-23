# Contopia — Backend Dockerfile
# Two-Target Pattern: development (devDeps + nodemon) + production (prodDeps only, non-root)
# Multi-stage: base → development / build → production
#
# Build commands:
#   docker build --target development -t contopia/backend:dev    -f backend/Dockerfile .
#   docker build --target production  -t contopia/backend:latest -f backend/Dockerfile .

# ============================================================================
# Stage 1: Base (shared by all stages — has runtime libs for canvas/sharp)
# ============================================================================
FROM node:22-alpine AS base

RUN apk add --no-cache dumb-init wget python3 make g++ cairo-dev pango-dev libpng-dev jpeg-dev giflib-dev gcompat

WORKDIR /app

# ============================================================================
# Stage 2: Development (devDeps + nodemon for hot reload)
# ============================================================================
FROM base AS development

COPY backend/package*.json ./
RUN npm ci --include=dev
COPY backend/ .
COPY shared/ /shared/

EXPOSE 8000

# /health  → liveness probe  (process alive, always 200)
# /api/v1/ready → readiness probe (dependencies connected, 200 or 503)
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]   # nodemon via package.json script

# ============================================================================
# Stage 3: Build (prod deps only)
# ============================================================================
FROM base AS build

COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY backend/ .
COPY shared/ /shared/

# ============================================================================
# Stage 4: Production (non-root, minimal)
# ============================================================================
FROM base AS production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs backend/ .
COPY --chown=nodejs:nodejs shared/ /shared/

# Ensure /app is writable by nodejs (WORKDIR creates it as root)
RUN chown nodejs:nodejs /app

USER nodejs

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/main.js"]
