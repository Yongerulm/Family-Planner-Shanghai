#!/usr/bin/env bash
# =============================================================================
# Family Planner — Vollständiges Backup
# =============================================================================
# Cron-Empfehlung (täglich 3:00 Uhr):
#   0 3 * * * /opt/family-planner/infrastructure/scripts/backup.sh >> /var/log/fp-backup.log 2>&1
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

[[ -f ".env" ]] || err ".env nicht gefunden!"
source <(grep -E '^(DB_|MINIO_|BACKUP_)' .env | grep -v '#')

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/fp_backup_$TIMESTAMP"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

# ─── PostgreSQL Dump ──────────────────────────────────────────────────────────
log "PostgreSQL Dump..."
docker compose exec -T postgres pg_dump \
  -U "${DB_USER:-family_app}" \
  -d "${DB_NAME:-family_planner}" \
  --no-password \
  --format=custom \
  --compress=9 \
  > "$BACKUP_DIR/postgres_$TIMESTAMP.dump" 2>/dev/null

DUMP_SIZE=$(du -sh "$BACKUP_DIR/postgres_$TIMESTAMP.dump" | cut -f1)
log "PostgreSQL Dump: $DUMP_SIZE"

# ─── .env Backup ─────────────────────────────────────────────────────────────
log "Environment Backup..."
cp "$ROOT_DIR/.env" "$BACKUP_DIR/env_$TIMESTAMP.txt"

# ─── Redis Snapshot ──────────────────────────────────────────────────────────
log "Redis Snapshot..."
docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-}" BGSAVE &>/dev/null || warn "Redis BGSAVE fehlgeschlagen"
sleep 2  # Warten auf Snapshot

# ─── Zu MinIO hochladen ───────────────────────────────────────────────────────
BUCKET="${MINIO_BUCKET_BACKUPS:-family-backups}"
MINIO_ALIAS="fp_minio"

if docker compose exec -T minio mc alias set "$MINIO_ALIAS" \
    "http://localhost:9000" \
    "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" &>/dev/null; then

  log "Hochladen zu MinIO (Bucket: $BUCKET)..."
  docker compose exec -T minio mc mb --ignore-existing "$MINIO_ALIAS/$BUCKET" &>/dev/null || true
  docker cp "$BACKUP_DIR/postgres_$TIMESTAMP.dump" family_minio:/tmp/
  docker compose exec -T minio mc cp "/tmp/postgres_$TIMESTAMP.dump" "$MINIO_ALIAS/$BUCKET/postgres/"
  log "Backup in MinIO gespeichert"

  # Alte Backups löschen (Retention)
  CUTOFF=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%dT%H:%M:%S 2>/dev/null || \
           date -v-${RETENTION_DAYS}d +%Y-%m-%dT%H:%M:%S)
  docker compose exec -T minio mc rm --recursive --force \
    --older-than "${RETENTION_DAYS}d24h" "$MINIO_ALIAS/$BUCKET/postgres/" 2>/dev/null || true
  log "Alte Backups gelöscht (älter als $RETENTION_DAYS Tage)"
else
  warn "MinIO nicht erreichbar — Backup nur lokal"
fi

# ─── Lokales Backup behalten ──────────────────────────────────────────────────
LOCAL_BACKUP_DIR="/opt/family-planner/backups"
mkdir -p "$LOCAL_BACKUP_DIR"
cp "$BACKUP_DIR/postgres_$TIMESTAMP.dump" "$LOCAL_BACKUP_DIR/"

# Lokale Backups auch aufräumen
find "$LOCAL_BACKUP_DIR" -name "*.dump" -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
log "Lokales Backup: $LOCAL_BACKUP_DIR/postgres_$TIMESTAMP.dump"

# Temp-Verzeichnis aufräumen
rm -rf "$BACKUP_DIR"

log "Backup abgeschlossen: $TIMESTAMP"
echo "  PostgreSQL: $DUMP_SIZE"
echo "  Retention:  $RETENTION_DAYS Tage"
