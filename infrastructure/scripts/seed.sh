#!/usr/bin/env bash
# =============================================================================
# Family Planner — Datenbank mit Test-Daten befüllen
# =============================================================================
# Ausführen auf dem VPS NACH dem ersten Deployment:
#   bash infrastructure/scripts/seed.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

# Sicherheitsabfrage
echo -e "${YELLOW}WARNUNG: Dieser Befehl erstellt Test-Daten in der Datenbank.${NC}"
echo "Wenn bereits Daten vorhanden sind, wird der Seed übersprungen."
echo ""
read -rp "Fortfahren? (y/N): " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Abgebrochen."; exit 0; }

# API-Container nutzen (hat alle Dependencies)
log "Seed wird ausgeführt..."
docker compose exec -T api node -e "
const { AppDataSource } = require('./dist/database/data-source');
AppDataSource.initialize().then(async (ds) => {
  // Seed-Script als dynamischer Import
  process.chdir('/app');
  require('./dist/database/seed');
}).catch(e => {
  console.error('DB-Verbindung fehlgeschlagen:', e.message);
  process.exit(1);
});
" || {
  warn "Seed via compiled script fehlgeschlagen"
  warn "Falls das System frisch deployed wurde, wurden Migrationen möglicherweise noch nicht abgeschlossen."
  warn "Versuche: docker compose logs api | grep Migration"
}

log "Seed-Prozess beendet"
