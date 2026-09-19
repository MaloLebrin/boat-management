# Multi-stage build — AdonisJS v7 + Vue 3/Inertia SSR
# node:24-alpine correspond à engines: { node: ">=24.0.0" }

########################################
# Stage 1 — builder
########################################
FROM node:24-alpine AS builder

RUN corepack enable pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# `patches/` porte le correctif jsonschema sans lequel le kernel Ace ne boote
# pas sur Node >= 24.20 — il doit etre present avant l'installation.
COPY patches ./patches
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

# Ghostscript pour la compression PDF (app/services/pdf_service.ts).
#
# Plancher de version explicite (#772) : sans contrainte, la version déployée
# est un effet de bord de la date de build. `-dSAFER` est actif par défaut
# depuis 9.50 et le service le passe désormais explicitement, mais 10.03 fixe
# aussi un plancher sur les CVE de l'interpréteur. Un plancher est une décision
# vérifiable là où un numéro exact casserait le build au premier retrait du
# paquet de l'index Alpine.
RUN apk add --no-cache 'ghostscript>=10.03' \
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
