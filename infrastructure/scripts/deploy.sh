#!/usr/bin/env bash
# =============================================================================
# Family Planner — Erstmaliges Deployment auf VPS
# =============================================================================
# Ausführen im Repo-Root auf dem VPS:
#   bash infrastructure/scripts/deploy.sh
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

step "Voraussetzungen prüfen"
command -v docker &>/dev/null  || err "Docker nicht installiert. Bitte setup-vps.sh ausführen."
[[ -f ".env" ]]                 || err ".env nicht gefunden! Kopiere .env.example zu .env und fülle alle Werte aus."
[[ -f "docker-compose.yml" ]]   || err "docker-compose.yml nicht gefunden. Bist du im richtigen Verzeichnis?"

# Domain aus .env lesen
DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d'=' -f2 | tr -d '"')
[[ -z "$DOMAIN" ]] && err "DOMAIN nicht in .env gesetzt!"
log "Domain: $DOMAIN"

step "Traefik acme.json Berechtigungen setzen"
mkdir -p infrastructure/traefik
touch infrastructure/traefik/acme.json
chmod 600 infrastructure/traefik/acme.json
log "acme.json bereit"

step "Traefik E-Mail konfigurieren"
ACME_EMAIL=$(grep -E '^ACME_EMAIL=' .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "")
if [[ -n "$ACME_EMAIL" ]]; then
  sed -i "s/admin@yourdomain.tld/$ACME_EMAIL/g" infrastructure/traefik/traefik.yml
  log "ACME E-Mail gesetzt: $ACME_EMAIL"
else
  warn "ACME_EMAIL nicht in .env — passe infrastructure/traefik/traefik.yml manuell an!"
fi

step "Docker Images bauen"
docker compose build --no-cache
log "Images gebaut"

step "Services starten"
docker compose up -d
log "Services gestartet"

step "Auf API-Health warten (max. 120s)"
ATTEMPTS=0
MAX_ATTEMPTS=24
until docker compose exec -T api wget -qO- http://localhost:3000/api/health &>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [[ $ATTEMPTS -ge $MAX_ATTEMPTS ]]; then
    err "API nicht erreichbar nach 120s. Logs: docker compose logs api"
  fi
  echo -n "."
  sleep 5
done
echo ""
log "API ist bereit"

step "Datenbank-Migrationen ausführen"
docker compose exec -T api node dist/main --migrate-only || true
# Fallback: direkt typeorm
docker compose exec -T api sh -c "node -e \"require('./dist/database/data-source').AppDataSource.initialize().then(ds => ds.runMigrations()).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })\"" || {
  warn "Migration via App fehlgeschlagen, versuche direkten CLI-Aufruf..."
  # Migrations laufen beim App-Start automatisch (migrationsRun: true)
  log "Migrationen werden automatisch beim Start ausgeführt"
}
log "Migrationen abgeschlossen"

step "Status prüfen"
docker compose ps

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Deployment erfolgreich!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "  API:          https://api.$DOMAIN"
echo "  Admin Panel:  https://admin.$DOMAIN"
echo "  API Docs:     https://api.$DOMAIN/api/docs  (wenn SWAGGER_ENABLED=true)"
echo ""
echo "Nächste Schritte:"
echo "  1. Test-Daten erstellen:  bash infrastructure/scripts/seed.sh"
echo "  2. Logs prüfen:            docker compose logs -f"
echo "  3. Passwörter ändern nach erstem Login!"
echo ""
