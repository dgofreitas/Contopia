# Frontend do Contopia - build em estágios
#
# O build roda na arquitetura da máquina que constrói ($BUILDPLATFORM): o Vite
# gera JS/CSS idênticos em qualquer arquitetura e só o /dist sai daqui. A imagem
# final continua arm64 para o servidor da OCI, sem emulação.

FROM --platform=$BUILDPLATFORM node:20-slim AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund && test -x node_modules/.bin/vite
COPY frontend/ .
RUN npm run build

FROM nginx:alpine AS production
COPY frontend/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
