# Multi-stage build — AdonisJS v7 + Vue 3/Inertia SSR
# node:24-alpine correspond à engines: { node: ">=24.0.0" }

########################################
# Stage 1 — builder
########################################
FROM node:24-alpine AS builder

RUN corepack enable pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN node ace build

########################################
# Stage 2 — runner (image de production)
########################################
FROM node:24-alpine AS runner

RUN corepack enable pnpm

WORKDIR /app

COPY --from=builder /app/build .

# Ghostscript pour la compression PDF (app/services/pdf_service.ts)
RUN apk add --no-cache ghostscript \
 && pnpm install --prod --frozen-lockfile

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs adonisjs \
 && mkdir -p /app/tmp \
 && chown -R adonisjs:nodejs /app

USER adonisjs

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333

EXPOSE 3333

CMD ["node", "bin/server.js"]
