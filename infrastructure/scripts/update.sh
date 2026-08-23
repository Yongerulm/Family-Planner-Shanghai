#!/usr/bin/env bash
# =============================================================================
# Family Planner — Rolling Restart Update
# =============================================================================
# Ausführen auf dem VPS im Repo-Root:
#   bash infrastructure/scripts/update.sh
#
# Was passiert:
#   1. Git Pull
#   2. Backup vor dem Update
#   3. Neue Images bauen
#   4. API → Worker → Scheduler → Admin rolling restart
#   5. Migrationen laufen automatisch beim API-Start
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${BOLD}─── $1 ───${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

[[ -f ".env" ]] || err ".env nicht gefunden!"

step "Automatisches Backup vor Update"
bash "$SCRIPT_DIR/backup.sh" || warn "Backup fehlgeschlagen — Update wird trotzdem fortgesetzt"

step "Neuesten Code holen"
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git pull origin "$CURRENT_BRANCH"
log "Code aktualisiert (Branch: $CURRENT_BRANCH)"

step "Neue Docker Images bauen"
docker compose build --no-cache api worker scheduler admin-web
log "Images gebaut"

step "API neu starten (Migrationen laufen automatisch)"
docker compose up -d --no-deps api
log "API gestartet"

step "Auf API-Readiness warten (max. 90s)"
ATTEMPTS=0
until docker compose exec -T api wget -qO- http://localhost:3000/api/health/ready &>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [[ $ATTEMPTS -ge 18 ]] && err "API nicht bereit nach 90s. Logs: docker compose logs api"
  echo -n "."; sleep 5
done
echo ""
log "API ist bereit (DB + Redis + MinIO gesund)"

step "Worker und Scheduler neu starten"
docker compose up -d --no-deps worker scheduler
log "Worker + Scheduler gestartet"

step "Admin Panel neu starten"
docker compose up -d --no-deps admin-web
log "Admin Panel gestartet"

step "Alte Images aufräumen"
docker image prune -f --filter "label=com.docker.compose.project=family-planner-shanghai" 2>/dev/null || true
docker image prune -f 2>/dev/null || true

step "Status"
docker compose ps

log "Update abgeschlossen"
