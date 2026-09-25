# Backend do Contopia - build em estágios

FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

FROM base AS build
COPY backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM base AS production
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 \
 && mkdir -p /data/uploads && chown nodejs:nodejs /data/uploads
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs backend/package.json ./
COPY --chown=nodejs:nodejs backend/src ./src
USER nodejs
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8000/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/main.js"]
