#!/usr/bin/env bash
# =============================================================================
# Family Planner — Initiales VPS Setup
# =============================================================================
# Ausführen als root oder sudo-User auf dem Hostinger VPS:
#   bash setup-vps.sh
#
# Was dieses Script tut:
#   1. System-Updates
#   2. Docker + Docker Compose installieren
#   3. Git installieren
#   4. Firewall konfigurieren (nur 22, 80, 443)
#   5. App-User erstellen
#   6. Deployment-Verzeichnis vorbereiten
# =============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${BOLD}─── $1 ───${NC}"; }

# Root-Check
if [[ $EUID -ne 0 ]]; then
  err "Bitte als root ausführen: sudo bash setup-vps.sh"
fi

APP_USER="${APP_USER:-deploy}"
APP_DIR="/opt/family-planner"

step "System Update"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git unzip htop ufw fail2ban \
  ca-certificates gnupg lsb-release
log "System aktualisiert"

step "Docker installieren"
if command -v docker &>/dev/null; then
  log "Docker bereits installiert ($(docker --version))"
else
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  log "Docker $(docker --version) installiert"
fi

step "App-User '$APP_USER' erstellen"
if id "$APP_USER" &>/dev/null; then
  log "User '$APP_USER' existiert bereits"
else
  useradd -m -s /bin/bash -G docker "$APP_USER"
  log "User '$APP_USER' erstellt und zur Docker-Gruppe hinzugefügt"
fi

step "Deployment-Verzeichnis vorbereiten"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
log "Verzeichnis $APP_DIR bereit"

step "Firewall konfigurieren"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "UFW Firewall aktiv: nur SSH (22), HTTP (80), HTTPS (443)"

step "Fail2Ban aktivieren"
systemctl enable fail2ban
systemctl start fail2ban
log "Fail2Ban aktiv (schützt gegen Brute-Force auf SSH)"

step "Traefik Cert-Datei vorbereiten"
# Traefik braucht diese Datei mit 600-Berechtigungen
CERTS_DIR="$APP_DIR/infrastructure/traefik"
mkdir -p "$CERTS_DIR"
touch "$CERTS_DIR/acme.json" 2>/dev/null || true
chmod 600 "$CERTS_DIR/acme.json" 2>/dev/null || true
log "acme.json vorbereitet"

step "Sicherheits-Härtung"
# SSH Root-Login deaktivieren (optional, auskommentieren wenn du root brauchst)
# sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
# systemctl restart sshd

# Swap einrichten (für 2GB VPS empfohlen)
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  log "2GB Swap eingerichtet"
fi

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  VPS Setup abgeschlossen!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════${NC}"
echo ""
echo "Nächste Schritte:"
echo "  1. Als User '$APP_USER' einloggen: su - $APP_USER"
echo "  2. Repository klonen:  git clone <repo-url> $APP_DIR"
echo "  3. .env ausfüllen:     cp $APP_DIR/.env.example $APP_DIR/.env && nano $APP_DIR/.env"
echo "  4. Deployen:           cd $APP_DIR && bash infrastructure/scripts/deploy.sh"
echo ""
