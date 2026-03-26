# Phase 5: Deployment auf Hostinger VPS, Docker Compose, Betrieb & Backup

---

## 1. Container-Landschaft

### Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE STACK                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  PUBLIC NETWORK                          │    │
│  │                                                          │    │
│  │  traefik (80/443)                                        │    │
│  │    → api (3000)        → api.yourdomain.tld             │    │
│  │    → admin-web (3001)  → admin.yourdomain.tld           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  INTERNAL NETWORK                        │    │
│  │                                                          │    │
│  │  postgres:5432    (nur intern erreichbar)                │    │
│  │  redis:6379       (nur intern erreichbar)                │    │
│  │  minio:9000       (nur intern + MinIO Console :9001)    │    │
│  │  worker           (BullMQ Job Processor)                 │    │
│  │  scheduler        (Cron-basierte Jobs)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              OPTIONAL / MONITORING                       │    │
│  │                                                          │    │
│  │  uptime-kuma:3002  → status.yourdomain.tld (optional)   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Docker Compose Konfiguration

```yaml
# docker-compose.yml
version: '3.9'

networks:
  public:
    name: family_public
  internal:
    name: family_internal
    internal: true  # Kein Zugriff von außen

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  traefik_certs:
    driver: local
  app_logs:
    driver: local

services:

  # ─── REVERSE PROXY ──────────────────────────────────────────────
  traefik:
    image: traefik:v3.0
    container_name: family_traefik
    restart: unless-stopped
    networks:
      - public
      - internal
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/certs
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
    environment:
      - TRAEFIK_DASHBOARD_ENABLED=false  # Dashboard in Prod aus
    labels:
      - "traefik.enable=false"

  # ─── API ────────────────────────────────────────────────────────
  api:
    image: family-planner/api:${APP_VERSION:-latest}
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    container_name: family_api
    restart: unless-stopped
    networks:
      - public
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.${DOMAIN}`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.api.middlewares=security-headers,api-ratelimit"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
      - "traefik.docker.network=family_public"

  # ─── ADMIN WEB ──────────────────────────────────────────────────
  admin-web:
    image: family-planner/admin-web:${APP_VERSION:-latest}
    build:
      context: ./admin
      dockerfile: Dockerfile
      target: production
    container_name: family_admin
    restart: unless-stopped
    networks:
      - public
      - internal
    depends_on:
      - api
    env_file:
      - .env.admin
    environment:
      - NODE_ENV=production
      - PORT=3001
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(`admin.${DOMAIN}`)"
      - "traefik.http.routers.admin.entrypoints=websecure"
      - "traefik.http.routers.admin.tls.certresolver=letsencrypt"
      - "traefik.http.routers.admin.middlewares=security-headers,admin-ipwhitelist"
      - "traefik.http.services.admin.loadbalancer.server.port=3001"
      - "traefik.docker.network=family_public"

  # ─── WORKER ─────────────────────────────────────────────────────
  worker:
    image: family-planner/api:${APP_VERSION:-latest}  # Gleiche Image wie API
    container_name: family_worker
    restart: unless-stopped
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - APP_MODE=worker  # Startet nur Worker, keinen HTTP-Server
    volumes:
      - app_logs:/app/logs
    command: ["node", "dist/main.worker.js"]

  # ─── SCHEDULER ──────────────────────────────────────────────────
  scheduler:
    image: family-planner/api:${APP_VERSION:-latest}
    container_name: family_scheduler
    restart: unless-stopped
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - APP_MODE=scheduler  # Nur Cron-Jobs
    volumes:
      - app_logs:/app/logs
    command: ["node", "dist/main.scheduler.js"]

  # ─── POSTGRESQL ─────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: family_postgres
    restart: unless-stopped
    networks:
      - internal
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    # KEIN Port-Mapping nach außen!

  # ─── REDIS ──────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: family_redis
    restart: unless-stopped
    networks:
      - internal
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/etc/redis/redis.conf:ro
    command: redis-server /etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    # KEIN Port-Mapping nach außen!

  # ─── MINIO ──────────────────────────────────────────────────────
  minio:
    image: minio/minio:latest
    container_name: family_minio
    restart: unless-stopped
    networks:
      - internal
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BROWSER: "off"  # Keine externe Console in Prod
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 20s
      retries: 3
    # KEIN Port-Mapping nach außen!
    # MinIO Console nur über SSH-Tunnel erreichbar

  # ─── UPTIME KUMA (Optional) ─────────────────────────────────────
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: family_uptime
    restart: unless-stopped
    networks:
      - public
      - internal
    volumes:
      - ./uptime-kuma:/app/data
    profiles:
      - monitoring  # Nur wenn explizit aktiviert
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.status.rule=Host(`status.${DOMAIN}`)"
      - "traefik.http.routers.status.entrypoints=websecure"
      - "traefik.http.routers.status.tls.certresolver=letsencrypt"
      - "traefik.http.services.status.loadbalancer.server.port=3001"
      - "traefik.docker.network=family_public"
```

---

## 3. Traefik Konfiguration

```yaml
# traefik/traefik.yml
global:
  checkNewVersion: false
  sendAnonymousUsage: false

log:
  level: INFO
  format: json

accessLog:
  format: json
  fields:
    headers:
      defaultMode: drop
      names:
        User-Agent: keep
        X-Forwarded-For: keep

api:
  dashboard: false  # In Produktion aus

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.tld
      storage: /certs/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    exposedByDefault: false
    network: family_public
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true
```

```yaml
# traefik/dynamic.yml
http:
  middlewares:
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: "strict-origin-when-cross-origin"
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        customResponseHeaders:
          X-Powered-By: ""
          Server: ""

    api-ratelimit:
      rateLimit:
        average: 100
        period: 1m
        burst: 50

    admin-ipwhitelist:
      ipAllowList:
        # Nur bekannte IPs für Admin-Panel
        # Leer = alle erlaubt (anpassen!)
        sourceRange:
          - "0.0.0.0/0"  # Anpassen auf eigene IP(s)
```

---

## 4. Environment Variables Konzept

```bash
# .env (API + Worker + Scheduler)
# ─── App ───────────────────────────────────────────────────────
NODE_ENV=production
APP_VERSION=1.0.0
DOMAIN=yourdomain.tld

# ─── Database ──────────────────────────────────────────────────
DB_HOST=postgres
DB_PORT=5432
DB_NAME=family_planner
DB_USER=family_app
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD

# ─── Redis ─────────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_STRONG_PASSWORD

# ─── MinIO ─────────────────────────────────────────────────────
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=CHANGE_THIS
MINIO_ROOT_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
MINIO_BUCKET_PUBLIC=family-assets
MINIO_BUCKET_VAULT=family-vault
MINIO_BUCKET_BACKUPS=family-backups

# ─── Auth ──────────────────────────────────────────────────────
JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public.pem
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d
BCRYPT_PEPPER=CHANGE_THIS_SECRET_PEPPER

# ─── Vault ─────────────────────────────────────────────────────
VAULT_ENCRYPTION_KEY=CHANGE_THIS_32_BYTE_HEX_KEY_HERE

# ─── Push Notifications ────────────────────────────────────────
APNS_KEY_ID=YOUR_KEY_ID
APNS_TEAM_ID=YOUR_TEAM_ID
APNS_PRIVATE_KEY_PATH=/run/secrets/apns_private.p8
APNS_PRODUCTION=true

FCM_SERVER_KEY=YOUR_FCM_SERVER_KEY

# ─── Weather API ───────────────────────────────────────────────
WEATHER_API_PROVIDER=openweathermap  # oder weatherapi
WEATHER_API_KEY=YOUR_WEATHER_API_KEY
WEATHER_DEFAULT_LOCATION=Shanghai,CN

# ─── Google Calendar (Optional) ─────────────────────────────────
GOOGLE_CALENDAR_CLIENT_ID=optional
GOOGLE_CALENDAR_CLIENT_SECRET=optional

# ─── Logging ───────────────────────────────────────────────────
LOG_LEVEL=info
LOG_FORMAT=json

# ─── Admin ─────────────────────────────────────────────────────
ADMIN_EMAIL=admin@yourdomain.tld
```

---

## 5. Subdomain- und Netzwerkkonzept

```
Öffentlich erreichbar:
  api.yourdomain.tld      → NestJS API (HTTPS, Rate-Limited)
  admin.yourdomain.tld    → Next.js Admin Panel (HTTPS, IP-Whitelist optional)
  status.yourdomain.tld   → Uptime Kuma (optional, HTTPS)

Intern (nur via SSH-Tunnel oder VPN):
  VPS:9000                → MinIO API (S3-kompatibel)
  VPS:9001                → MinIO Console
  VPS:5432                → PostgreSQL (nur für DB-Admin-Zugriff)
  VPS:6379                → Redis (nur für Cache-Inspektion)

DNS-Konfiguration:
  *.yourdomain.tld  →  VPS-IP  (Wildcard oder einzelne A-Records)
  ODER:
  api.yourdomain.tld    → VPS-IP
  admin.yourdomain.tld  → VPS-IP
  status.yourdomain.tld → VPS-IP
```

---

## 6. Redis Konfiguration

```conf
# redis/redis.conf
requirepass YOUR_REDIS_PASSWORD

# Persistence (AOF - Append Only File)
appendonly yes
appendfsync everysec

# Memory Policy
maxmemory 512mb
maxmemory-policy allkeys-lru

# Security
protected-mode yes
bind 0.0.0.0

# Performance
tcp-keepalive 300
timeout 0

# Logging
loglevel notice
```

---

## 7. Backup-Konzept

### PostgreSQL Backup

```bash
#!/bin/bash
# scripts/backup-postgres.sh
# Täglich via Cron oder Scheduler-Container

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="/tmp/${BACKUP_FILE}"

# Dump
docker exec family_postgres pg_dump \
  -U ${DB_USER} \
  -d ${DB_NAME} \
  --no-owner \
  --no-acl \
  -Fp \
  | gzip > "${BACKUP_PATH}"

# Zu MinIO hochladen
docker exec family_minio mc cp \
  "${BACKUP_PATH}" \
  "local/family-backups/postgres/${BACKUP_FILE}"

# Lokale Datei entfernen
rm "${BACKUP_PATH}"

# Alte Backups löschen (älter als 30 Tage)
docker exec family_minio mc rm --recursive --force \
  --older-than 30d \
  "local/family-backups/postgres/"

echo "Backup ${BACKUP_FILE} erfolgreich"
```

### Backup-Strategie

```
Was wird gesichert:
  1. PostgreSQL Dump (täglich, Retention: 30 Tage lokal in MinIO)
  2. MinIO Vault-Daten (täglich, gleicher Retention)
  3. App-Konfiguration / .env (manuell, verschlüsselt in Passwort-Manager)
  4. Traefik Certs-Volume (automatisch über Let's Encrypt, kein Backup nötig)

Backup-Aufbewahrung:
  - Täglich: 30 Tage
  - Wöchentlich: 12 Wochen (optional, Cron)
  - Monatlich: 12 Monate (optional, Cron)

Offsite-Backup (optional, empfohlen):
  - rclone sync von MinIO-Backup-Bucket zu Backblaze B2
  - S3-kompatibel, günstig, nicht Google/AWS
  - Verschlüsselung mit rclone crypt vor Upload

Restore-Test:
  - Monatlich manuellen Restore in separate Test-Umgebung durchführen
  - Backup ohne getesteten Restore ist kein Backup
```

---

## 8. Update / Deployment-Workflow

```bash
# Produktions-Update (Zero-Downtime bei Einzel-Container)
# Kein echtes Zero-Downtime auf Single-VPS, aber kurze Downtime (<30s)

# 1. Neues Image bauen und pushen
docker build -t family-planner/api:1.1.0 ./backend
docker build -t family-planner/admin-web:1.1.0 ./admin

# 2. Compose Update (eine Service nach dem anderen)
APP_VERSION=1.1.0 docker compose up -d --no-deps api
APP_VERSION=1.1.0 docker compose up -d --no-deps worker
APP_VERSION=1.1.0 docker compose up -d --no-deps scheduler
APP_VERSION=1.1.0 docker compose up -d --no-deps admin-web

# 3. Health Check
docker compose ps
curl -sf https://api.yourdomain.tld/health

# 4. Rollback bei Fehlern
APP_VERSION=1.0.0 docker compose up -d --no-deps api
```

### Datenbankmigrationen

```
TypeORM Migration-Workflow:
  1. Migration vor API-Update ausführen (keine breaking migrations!)
  2. Migrations sind backward-compatible: addiere nur, lösche nie sofort
  3. Spalten nur nach Deprecation-Phase entfernen (mehrere Releases)
  4. Migration-Ausführung im API-Container beim Start (typeorm migration:run)
     ODER separater Init-Container der Migration ausführt
```

---

## 9. Monitoring-Konzept

```
Uptime Kuma (auf VPS):
  - HTTP-Checks: api.yourdomain.tld/health, admin.yourdomain.tld
  - TCP-Checks: postgres:5432, redis:6379
  - Push-Benachrichtigung bei Ausfall (eigener Push-Kanal)

Health-Endpoints (NestJS):
  GET /health         → Liveness (immer 200 wenn Prozess läuft)
  GET /health/ready   → Readiness (DB, Redis, MinIO erreichbar?)
  GET /health/metrics → Metriken (optional, für späteres Prometheus)

Log-Analyse:
  - JSON-Logs in app_logs Volume
  - Manuell oder mit einfachem Log-Viewer (Dozzle optional)
  - Kein externer Log-Dienst erforderlich
```

---

## 10. TLS / HTTPS-Konzept

```
Let's Encrypt via Traefik ACME:
  - Automatische Zertifikat-Ausstellung beim ersten Start
  - Automatische Erneuerung (30 Tage vor Ablauf)
  - Gespeichert in traefik_certs Volume (acme.json)
  - HTTP Challenge (Port 80 → 443 Redirect)
  - TLS 1.2 minimum, TLS 1.3 bevorzugt

Backup des Zertifikats:
  - acme.json täglich ins MinIO Backup (enthält Zertifikate + Keys)
  - Bei VPS-Ausfall: Neues Zertifikat kostenlos neu ausstellen lassen

China-Hinweis:
  - Let's Encrypt funktioniert in China
  - Traefik ACME Challenge läuft über Port 80 (öffentlich erreichbar)
  - Keine ACME-Probleme bekannt bei HTTP Challenge
```

---

*Nächstes Dokument: 06-implementation-roadmap.md (Phase 6)*
