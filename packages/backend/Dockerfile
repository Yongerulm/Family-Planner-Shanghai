# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
# Build-Context ist das Repo-Root (context: ./ in docker-compose.yml)
# Das ermöglicht Zugriff auf pnpm-lock.yaml und packages/shared
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Root-Lockfile + workspace package.json kopieren
COPY pnpm-lock.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Source kopieren
COPY packages/shared/src/ ./packages/shared/src/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/backend/src/ ./packages/backend/src/
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/tsconfig.build.json ./packages/backend/

# shared zuerst bauen (falls vorhanden), dann backend
# "pnpm run build" = "tsc -p tsconfig.json" → kompiliert src/**/* inkl. main.worker + main.scheduler
RUN cd packages/shared && pnpm run build 2>/dev/null || true
RUN cd packages/backend && pnpm run build

# ─── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:22-alpine AS production

# Sicherheit: Non-root User
RUN addgroup -g 1001 -S nestjs && \
    adduser -S nestjs -u 1001

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Nur Production Dependencies
COPY pnpm-lock.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# Build artifacts
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist 2>/dev/null || true

# Convenience symlink: node dist/main → packages/backend/dist/main
RUN ln -sf /app/packages/backend/dist /app/dist

# Logs-Verzeichnis
RUN mkdir -p /app/logs && chown nestjs:nestjs /app/logs

# Non-root User aktivieren
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

EXPOSE 3000

CMD ["node", "packages/backend/dist/main"]
