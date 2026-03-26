#!/bin/bash
# PostgreSQL Backup Script
# Family Planner Shanghai
# Aufruf: ./backup-postgres.sh
# Cron: 0 2 * * * /path/to/backup-postgres.sh >> /var/log/family-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Lade .env
if [ -f "$PROJECT_DIR/.env" ]; then
  source "$PROJECT_DIR/.env"
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="postgres_backup_${TIMESTAMP}.sql.gz"
TEMP_FILE="/tmp/${BACKUP_FILE}"

echo "[$(date -Iseconds)] Starting PostgreSQL backup..."

# Dump & Compress
docker exec family_postgres pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-acl \
  --format=plain \
  | gzip > "${TEMP_FILE}"

BACKUP_SIZE=$(du -sh "${TEMP_FILE}" | cut -f1)
echo "[$(date -Iseconds)] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Upload zu MinIO
docker exec family_minio sh -c "
  mc alias set local http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD} 2>/dev/null || true
" 2>/dev/null || true

docker cp "${TEMP_FILE}" "family_minio:/tmp/${BACKUP_FILE}"
docker exec family_minio sh -c "
  mc cp /tmp/${BACKUP_FILE} local/${MINIO_BUCKET_BACKUPS:-family-backups}/postgres/${BACKUP_FILE}
  rm /tmp/${BACKUP_FILE}
"

# Lokale Temp-Datei entfernen
rm "${TEMP_FILE}"

echo "[$(date -Iseconds)] Backup uploaded to MinIO: postgres/${BACKUP_FILE}"

# Alte Backups aufräumen (älter als 30 Tage)
# MinIO lifecycle policies sind besser, aber als Fallback:
echo "[$(date -Iseconds)] Backup completed successfully"
