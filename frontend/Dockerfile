# ─────────────────────────────────────────────────────────────────────────────
# SmartRecruit AI — Frontend Dockerfile
#
# Multi-stage build:
#   deps     : installs npm dependencies (cached layer)
#   builder  : runs `next build` with standalone output
#   runner   : slim Node runtime with the standalone bundle only
#
# Usage (standalone):
#   docker build -t smartrecruit-frontend .
#   docker run -p 3000:3000 smartrecruit-frontend
#
# In Docker Compose the NEXT_PUBLIC_API_URL build-arg is set automatically
# to http://backend:8000/api/v1 (internal Docker network name).
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile


# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_API_URL is used in next.config.ts rewrites(), which are evaluated
# at build time and baked into the standalone bundle.
# Default: http://backend:8000/api/v1 — correct for Docker Compose networking.
ARG NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable Next.js telemetry during build and at runtime
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# next.config.ts sets output: "standalone" which creates a self-contained
# server.js plus all required node_modules — no full node_modules needed here.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Note: this project has no public/ directory.
# If you add one later, uncomment the line below:
# COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
