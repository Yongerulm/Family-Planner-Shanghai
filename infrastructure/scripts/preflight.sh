#!/usr/bin/env bash
# =============================================================================
# Family Planner Shanghai — Preflight Check
# =============================================================================
# Prüft alle Voraussetzungen bevor deploy.sh ausgeführt wird.
# Ausführen im Repo-Root auf dem VPS:
#   bash infrastructure/scripts/preflight.sh
# =============================================================================

set -uo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo -e "${RED}[✗]${NC} $1"; ERRORS=$((ERRORS + 1)); }
step() { echo -e "\n${BOLD}─── $1 ───${NC}"; }

ERRORS=0
WARNINGS=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

echo -e "${BOLD}Family Planner Shanghai — Preflight Check${NC}"
echo "Prüfdatum: $(date '+%Y-%m-%d %H:%M:%S')"

# ─── 1. .env vorhanden ───────────────────────────────────────────────────────
step ".env Datei"

if [[ ! -f ".env" ]]; then
  fail ".env nicht gefunden! Erstelle sie mit: cp .env.example .env && nano .env"
  echo ""
  echo -e "${RED}${BOLD}Ohne .env können weitere Checks nicht ausgeführt werden.${NC}"
  exit 1
fi
ok ".env vorhanden"

# .env laden (nur KEY=VALUE Zeilen, keine Kommentare)
set -a
# shellcheck disable=SC1090
source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | grep -v '^#')
set +a

# ─── 2. Pflichtfelder in .env ─────────────────────────────────────────────────
step "Pflichtfelder"

check_var() {
  local var="$1"
  local value="${!var:-}"
  if [[ -z "$value" ]]; then
    fail "$var: nicht gesetzt"
  elif [[ "$value" == *"HIER_"* ]]; then
    fail "$var: enthält noch Platzhalterwert (HIER_*)"
  else
    ok "$var: gesetzt"
  fi
}

check_var DOMAIN
check_var ACME_EMAIL
check_var DB_PASSWORD
check_var REDIS_PASSWORD
check_var JWT_PRIVATE_KEY
check_var JWT_PUBLIC_KEY
check_var VAULT_ENCRYPTION_KEY
check_var BCRYPT_PEPPER
check_var MINIO_ROOT_USER
check_var MINIO_ROOT_PASSWORD

# VAULT_ENCRYPTION_KEY: exakt 64 Hex-Zeichen
VAULT_KEY="${VAULT_ENCRYPTION_KEY:-}"
if [[ ${#VAULT_KEY} -ne 64 ]]; then
  fail "VAULT_ENCRYPTION_KEY: muss exakt 64 Hex-Zeichen haben (hat: ${#VAULT_KEY})"
elif ! [[ "$VAULT_KEY" =~ ^[0-9a-fA-F]{64}$ ]]; then
  fail "VAULT_ENCRYPTION_KEY: enthält ungültige Zeichen (nur 0-9 a-f A-F erlaubt)"
else
  ok "VAULT_ENCRYPTION_KEY: gültige 64-Hex-Zeichen"
fi

# JWT Keys: müssen PEM-Header enthalten
JWT_PRIV="${JWT_PRIVATE_KEY:-}"
JWT_PUB="${JWT_PUBLIC_KEY:-}"
[[ "$JWT_PRIV" == *"BEGIN RSA PRIVATE KEY"* || "$JWT_PRIV" == *"BEGIN PRIVATE KEY"* ]] \
  && ok "JWT_PRIVATE_KEY: PEM-Format erkannt" \
  || fail "JWT_PRIVATE_KEY: kein gültiger PEM-Header gefunden"
[[ "$JWT_PUB" == *"BEGIN PUBLIC KEY"* ]] \
  && ok "JWT_PUBLIC_KEY: PEM-Format erkannt" \
  || fail "JWT_PUBLIC_KEY: kein gültiger PEM-Header gefunden"

# ─── 3. Docker ───────────────────────────────────────────────────────────────
step "Docker"

if ! command -v docker &>/dev/null; then
  fail "Docker nicht installiert — ausführen: bash infrastructure/scripts/setup-vps.sh"
else
  DOCKER_VERSION=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  ok "Docker $DOCKER_VERSION installiert"
fi

if ! docker compose version &>/dev/null; then
  fail "docker compose Plugin nicht verfügbar (Docker ≥ 20.10 erforderlich)"
else
  COMPOSE_VERSION=$(docker compose version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  ok "docker compose $COMPOSE_VERSION verfügbar"
fi

if ! docker info &>/dev/null 2>&1; then
  fail "Docker Daemon läuft nicht — starte ihn mit: sudo systemctl start docker"
else
  ok "Docker Daemon läuft"
fi

# ─── 4. Ports 80 und 443 ─────────────────────────────────────────────────────
step "Ports"

check_port() {
  local port="$1"
  # Prüfe ob Port belegt ist
  local occupied=false
  if command -v ss &>/dev/null; then
    ss -tlnp 2>/dev/null | grep -qE ":${port}\s" && occupied=true
  elif command -v netstat &>/dev/null; then
    netstat -tlnp 2>/dev/null | grep -qE ":${port}\s" && occupied=true
  fi

  if [[ "$occupied" == true ]]; then
    # Ist es Docker/Traefik?
    if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "0.0.0.0:${port}->"; then
      ok "Port $port: belegt von Docker (Traefik bereits aktiv)"
    else
      warn "Port $port: belegt von einem Fremdprozess — Traefik kann nicht starten"
    fi
  else
    ok "Port $port: frei"
  fi
}

check_port 80
check_port 443

# ─── 5. Speicherplatz ────────────────────────────────────────────────────────
step "Speicherplatz"

AVAIL_KB=$(df -k / | awk 'NR==2 {print $4}')
AVAIL_GB=$(( AVAIL_KB / 1024 / 1024 ))

if [[ $AVAIL_GB -lt 5 ]]; then
  fail "Weniger als 5 GB frei: ${AVAIL_GB} GB verfügbar — Deployment nicht möglich"
elif [[ $AVAIL_GB -lt 10 ]]; then
  warn "Weniger als 10 GB frei: ${AVAIL_GB} GB verfügbar — Backup-Speicher prüfen"
else
  ok "Speicherplatz: ${AVAIL_GB} GB verfügbar"
fi

# ─── 6. Konfigurationsdateien ────────────────────────────────────────────────
step "Konfigurationsdateien"

check_file() {
  [[ -f "$1" ]] && ok "$1 vorhanden" || fail "$1 fehlt"
}

check_file "docker-compose.yml"
check_file "infrastructure/traefik/traefik.yml"
check_file "infrastructure/traefik/dynamic.yml"

# traefik.yml darf keinen unersetzten Placeholder enthalten
if grep -q "ACME_EMAIL_PLACEHOLDER" infrastructure/traefik/traefik.yml 2>/dev/null; then
  warn "infrastructure/traefik/traefik.yml: ACME_EMAIL_PLACEHOLDER noch nicht ersetzt — deploy.sh erledigt das automatisch"
fi

# ─── Ergebnis ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"

if [[ $ERRORS -gt 0 ]]; then
  echo -e "${RED}${BOLD}  $ERRORS Fehler gefunden — Deployment nicht möglich!${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Behebe alle mit [✗] markierten Fehler und führe dieses Skript erneut aus."
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo -e "${YELLOW}${BOLD}  $WARNINGS Warnung(en) — Deployment möglich, aber bitte prüfen${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Starte das Deployment mit:"
  echo "  bash infrastructure/scripts/deploy.sh"
  exit 0
else
  echo -e "${GREEN}${BOLD}  Alle Checks bestanden — Bereit für Deployment!${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Starte das Deployment mit:"
  echo "  bash infrastructure/scripts/deploy.sh"
  exit 0
fi
