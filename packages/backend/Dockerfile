# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# pnpm installieren
RUN corepack enable && corepack prepare pnpm@latest --activate

# Package files kopieren
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod=false

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

# ─── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:22-alpine AS production

# Sicherheit: Non-root User
RUN addgroup -g 1001 -S nestjs && \
    adduser -S nestjs -u 1001

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Nur Production Dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod=true && \
    pnpm store prune

# Build artifacts
COPY --from=builder /app/dist ./dist

# Logs-Verzeichnis
RUN mkdir -p /app/logs && chown nestjs:nestjs /app/logs

# Non-root User aktivieren
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

EXPOSE 3000

CMD ["node", "dist/main"]
