# Contopia — Frontend Dockerfile
# Two-Target Pattern: development (Vite HMR) + production (nginx serving dist/)
# Multi-stage: development → build → production
#
# Build commands:
#   docker build --target development -t contopia/frontend:dev  -f frontend/Dockerfile .
#   docker build --target production  -t contopia/frontend:latest --build-arg VITE_API_URL=/api -f frontend/Dockerfile .

# ============================================================================
# Stage 1: Development (Vite HMR, node-based)
# ============================================================================
FROM node:22-alpine AS development

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
COPY shared/ ./shared/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["npm", "run", "dev", "--", "--host", "--port", "80"]

# ============================================================================
# Stage 2: Build (Vite → dist/)
# ============================================================================
FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
COPY shared/ ./shared/

# ⚠️ VITE_* são BUILD-TIME. Passadas via --build-arg.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ============================================================================
# Stage 3: Production (nginx serving dist/)
# ============================================================================
FROM nginx:alpine AS production

# In-container nginx config (NOT the reverse proxy at ./nginx/nginx.conf)
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Pre-built dist/ from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
