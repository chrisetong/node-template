FROM node:20-alpine AS server-builder

WORKDIR /app

RUN corepack enable
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile --filter @node-template/server...

COPY server/prisma ./server/prisma
COPY server/src ./server/src
COPY server/test ./server/test
COPY server/nest-cli.json server/tsconfig.json server/tsconfig.build.json server/prisma.config.ts ./server/

WORKDIR /app/server
RUN pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm exec nest build

FROM node:20-alpine AS admin-builder

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

FROM node:20-alpine AS runner

WORKDIR /app/server
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat nginx supervisor curl \
  && mkdir -p /run/nginx /app/server/logs /app/server/public/uploads \
  && chown -R node:node /app/server

COPY --from=server-builder /app/node_modules /app/node_modules
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./package.json
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma
COPY admin/src/views /app/admin/src/views
COPY --from=admin-builder /app/admin/dist /usr/share/nginx/html/admin
COPY server/nginx.production.conf /etc/nginx/http.d/default.conf
COPY server/supervisord.conf /etc/supervisord.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=12 --start-period=10s \
  CMD curl --fail --silent http://localhost/healthz >/dev/null \
    && curl --fail --silent http://localhost/api/health >/dev/null || exit 1

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
