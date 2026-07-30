FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY admin/package.json ./admin/package.json
RUN pnpm install --frozen-lockfile --filter @node-template/admin...

COPY admin ./admin

ARG VITE_API_BASE_URL=/api
ARG VITE_APP_BASE=/admin/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_BASE=$VITE_APP_BASE

WORKDIR /app/admin
RUN pnpm build

FROM nginx:1.27-alpine

COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/admin/dist /usr/share/nginx/html/admin

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/healthz >/dev/null 2>&1 || exit 1
