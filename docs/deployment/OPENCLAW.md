# OpenClaw Deployment Guide — Family Planner Shanghai

**Ziel:** Vollautomatisches Erstdeployment auf einem frischen Ubuntu VPS.  
**Voraussetzungen:** VPS mit Root-Zugang, Domain auf VPS-IP zeigend, `.env` ausgefüllt.

---

## Schritt-für-Schritt Ablauf

### Phase 0: Voraussetzungen auf dem VPS installieren

```bash
bash infrastructure/scripts/setup-vps.sh
```

**Erwartete Ausgabe:** `[✓] Setup abgeschlossen` (Docker, docker compose, pnpm installiert)  
**Erfolg:** `docker --version` gibt `Docker version 24.x` oder höher zurück.

---

### Phase 1: Repository klonen

```bash
git clone https://github.com/yongerulm/family-planner-shanghai.git /opt/family-planner
cd /opt/family-planner
```

**Erwartete Ausgabe:** Repository in `/opt/family-planner` vorhanden.

---

### Phase 2: Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
nano .env
```

**Pflichtfelder — alle müssen gesetzt werden (kein `HIER_*` Placeholder):**

| Variable | Wert | Befehl zum Generieren |
|---|---|---|
| `DOMAIN` | z.B. `familyplanner.example.de` | manuell |
| `ACME_EMAIL` | E-Mail für Let's Encrypt | manuell |
| `DB_PASSWORD` | min. 16 Zeichen | `openssl rand -base64 24` |
| `REDIS_PASSWORD` | min. 16 Zeichen | `openssl rand -base64 24` |
| `JWT_PRIVATE_KEY` | RSA 2048 Private Key | siehe unten |
| `JWT_PUBLIC_KEY` | RSA 2048 Public Key | siehe unten |
| `VAULT_ENCRYPTION_KEY` | 64 Hex-Zeichen (32 Byte) | `openssl rand -hex 32` |
| `BCRYPT_PEPPER` | min. 32 Zeichen | `openssl rand -base64 32` |
| `MINIO_ROOT_USER` | min. 3 Zeichen | z.B. `minio_admin` |
| `MINIO_ROOT_PASSWORD` | min. 8 Zeichen | `openssl rand -base64 24` |

**JWT Keys generieren:**
```bash
openssl genrsa -out /tmp/jwt_private.pem 2048
openssl rsa -in /tmp/jwt_private.pem -pubout -out /tmp/jwt_public.pem
# Als einzeiligen ENV-String:
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' /tmp/jwt_private.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' /tmp/jwt_public.pem
# Keys danach löschen:
rm /tmp/jwt_private.pem /tmp/jwt_public.pem
```

---

### Phase 3: Preflight-Check ausführen

```bash
bash infrastructure/scripts/preflight.sh
```

**Erwartete Ausgabe:**
```
[✓] .env vorhanden
[✓] DOMAIN: gesetzt
[✓] ACME_EMAIL: gesetzt
[✓] DB_PASSWORD: gesetzt
[✓] REDIS_PASSWORD: gesetzt
[✓] JWT_PRIVATE_KEY: PEM-Format erkannt
[✓] JWT_PUBLIC_KEY: PEM-Format erkannt
[✓] VAULT_ENCRYPTION_KEY: gültige 64-Hex-Zeichen
[✓] BCRYPT_PEPPER: gesetzt
[✓] MINIO_ROOT_USER: gesetzt
[✓] MINIO_ROOT_PASSWORD: gesetzt
[✓] Docker 24.x installiert
[✓] docker compose 2.x verfügbar
[✓] Docker Daemon läuft
[✓] Port 80: frei
[✓] Port 443: frei
[✓] Speicherplatz: XX GB verfügbar
[✓] docker-compose.yml vorhanden
[✓] infrastructure/traefik/traefik.yml vorhanden
[✓] infrastructure/traefik/dynamic.yml vorhanden
═══════════════════════════════════════════════════════
  Alle Checks bestanden — Bereit für Deployment!
```

**Wenn Fehler:** Alle `[✗]` Zeilen beheben, dann erneut ausführen. Nicht mit `deploy.sh` fortfahren solange Fehler vorhanden.

---

### Phase 4: Erstdeployment ausführen

```bash
bash infrastructure/scripts/deploy.sh
```

**Interner Ablauf (automatisch):**
1. Docker Images bauen (`docker compose build --no-cache`)
2. Services starten (`docker compose up -d`)
3. Warten bis `/api/health/ready` antwortet (max. 120s)
4. Datenbank-Migrationen laufen beim API-Start automatisch (`migrationsRun: true`)
5. Status-Ausgabe aller Services

**Erwartete Ausgabe (Endzeilen):**
```
[✓] API ist bereit (DB + Redis + MinIO gesund)
[✓] Status: alle Services running
═══════════════════════════════════════════════════════
  Deployment erfolgreich!
═══════════════════════════════════════════════════════

  API:          https://api.DEINE_DOMAIN
  Admin Panel:  https://admin.DEINE_DOMAIN
```

**Erfolgs-Kriterien:**
- Exit Code 0
- `https://api.DEINE_DOMAIN/api/health` gibt `{"status":"ok"}` zurück
- `https://api.DEINE_DOMAIN/api/health/ready` gibt alle Komponenten als `"up"` zurück
- SSL-Zertifikat gültig (Let's Encrypt, nicht selbstsigniert)

---

### Phase 5: Readiness-Verifikation

```bash
# Liveness-Check (immer ok wenn Prozess läuft)
curl -s https://api.DEINE_DOMAIN/api/health
# Erwartung: {"status":"ok","timestamp":"2024-..."}

# Readiness-Check (DB + Redis + MinIO + Memory + Disk)
curl -s https://api.DEINE_DOMAIN/api/health/ready | python3 -m json.tool
# Erwartung: alle Komponenten "up"

# Service-Status lokal
docker compose ps
# Erwartung: alle Services "running (healthy)"
```

**Readiness-Response Beispiel:**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "minio": { "status": "up", "httpStatus": 200 },
    "memory_heap": { "status": "up" },
    "disk": { "status": "up" }
  }
}
```

---

### Phase 6: Admin-Konto erstellen

```bash
bash infrastructure/scripts/seed.sh
```

**Erwartete Ausgabe:** `[✓] Admin-User erstellt` mit E-Mail und temporärem Passwort.  
**Danach:** Sofort im Admin Panel einloggen und Passwort ändern.

---

## Updates einspielen

Für Updates nach dem Erstdeployment:

```bash
bash infrastructure/scripts/update.sh
```

**Ablauf:**
1. Automatisches Backup
2. `git pull`
3. Images bauen
4. API neu starten (Migrationen laufen automatisch)
5. Warten auf `/api/health/ready`
6. Worker + Scheduler + Admin Panel neu starten

---

## Troubleshooting

### API startet nicht (health/ready schlägt fehl)

```bash
docker compose logs api --tail=100
```

Häufige Ursachen:
- `DB_PASSWORD` oder `REDIS_PASSWORD` falsch → `.env` prüfen, `docker compose up -d` erneut
- Migration fehlgeschlagen → Logs enthalten `QueryFailedError`
- Port 5432/6379 von anderem Prozess belegt

### Let's Encrypt Zertifikat wird nicht ausgestellt

```bash
docker compose logs traefik --tail=50
```

Häufige Ursachen:
- DNS nicht propagiert (prüfen: `dig A api.DEINE_DOMAIN`)
- Port 80 blockiert (Firewall, ISP)
- `ACME_EMAIL` ungültig oder Placeholder nicht ersetzt

### Minio-Bucket nicht initialisiert

```bash
docker compose exec minio mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
docker compose exec minio mc mb local/family-assets local/family-vault local/family-backups
```

---

## Checkliste nach Deployment

- [ ] `https://api.DOMAIN/api/health/ready` → alle Komponenten `"up"`
- [ ] SSL-Zertifikat gültig (grünes Schloss im Browser)
- [ ] Admin Panel unter `https://admin.DOMAIN` erreichbar
- [ ] Admin-Passwort nach erstem Login geändert
- [ ] `VAULT_ENCRYPTION_KEY` im Passwort-Manager gesichert
- [ ] JWT Private Key sicher aufbewahrt (außerhalb des Repos)
- [ ] Backup-Job läuft: `docker compose logs backup --tail=20`
- [ ] `SWAGGER_ENABLED=false` in Produktion (`.env` prüfen)
