# Family Planner — Deployment Anleitung

> Diese Anleitung führt dich Schritt für Schritt vom leeren Hostinger VPS
> bis zum laufenden System. Kein DevOps-Wissen nötig.

---

## Voraussetzungen (was du brauchst)

- [ ] Hostinger VPS (min. KVM 2: 2 CPU, 8 GB RAM, 100 GB SSD)
- [ ] Ubuntu 22.04 LTS installiert (im Hostinger Panel wählbar)
- [ ] Eine Domain (z.B. `familyplanner.meinname.de`)
- [ ] Zugang zu deinem Domain-Anbieter (DNS-Einstellungen)
- [ ] SSH-Client (auf Mac/Linux: Terminal; Windows: PuTTY oder Windows Terminal)

---

## Phase 1 — DNS einrichten (5 Minuten)

Gehe zu deinem Domain-Anbieter und erstelle diese DNS-Einträge:

| Typ | Name | Ziel | TTL |
|-----|------|------|-----|
| A | `api` | `DEINE_VPS_IP` | 300 |
| A | `admin` | `DEINE_VPS_IP` | 300 |

Beispiel wenn deine Domain `meinefamilie.de` ist:
- `api.meinefamilie.de` → VPS IP
- `admin.meinefamilie.de` → VPS IP

**Deine VPS IP findest du im Hostinger Panel unter "VPS" → dein Server → IP-Adresse.**

Warte 5-10 Minuten bis die DNS-Änderungen aktiv sind.

---

## Phase 2 — VPS vorbereiten (10 Minuten)

### 2.1 Per SSH einloggen

```bash
# Auf deinem Computer (Mac/Linux):
ssh root@DEINE_VPS_IP

# Windows: PuTTY → Host: DEINE_VPS_IP → Port: 22
```

Das Root-Passwort findest du im Hostinger Panel.

### 2.2 Setup-Script ausführen

```bash
# Als root auf dem VPS:
curl -fsSL https://raw.githubusercontent.com/DEIN_GITHUB_NAME/Family-Planner-Shanghai/main/infrastructure/scripts/setup-vps.sh | bash
```

**Oder wenn du das Repo bereits geklont hast:**
```bash
bash /opt/family-planner/infrastructure/scripts/setup-vps.sh
```

Das Script:
- Installiert Docker
- Erstellt einen Deploy-User
- Konfiguriert die Firewall
- Richtet Swap-Speicher ein

---

## Phase 3 — Code auf den Server laden (5 Minuten)

```bash
# Zum Deploy-User wechseln:
su - deploy

# Repository klonen:
git clone https://github.com/DEIN_GITHUB_NAME/Family-Planner-Shanghai.git /opt/family-planner

cd /opt/family-planner
```

---

## Phase 4 — Konfiguration ausfüllen (15 Minuten)

```bash
# Auf dem VPS, im Repo-Verzeichnis:
cd /opt/family-planner

# Vorlage kopieren:
cp .env.example .env

# Datei bearbeiten:
nano .env
```

### Was du in .env ausfüllen MUSST:

**1. Domain:**
```
DOMAIN=meinefamilie.de          ← deine echte Domain
CORS_ORIGINS=https://admin.meinefamilie.de
ACME_EMAIL=deine@email.de       ← für SSL-Zertifikat
```

**2. JWT Keys generieren** (einmalig auf dem VPS):
```bash
# Private Key generieren:
openssl genrsa -out /tmp/jwt_private.pem 2048

# Public Key ableiten:
openssl rsa -in /tmp/jwt_private.pem -pubout -out /tmp/jwt_public.pem

# Keys als einzeilige Strings anzeigen:
echo "Private Key:"
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' /tmp/jwt_private.pem

echo ""
echo "Public Key:"
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' /tmp/jwt_public.pem
```
Kopiere die Ausgaben in die .env Datei bei `JWT_PRIVATE_KEY` und `JWT_PUBLIC_KEY`.

**3. Sichere Passwörter generieren:**
```bash
# Für DB_PASSWORD, REDIS_PASSWORD, BCRYPT_PEPPER:
openssl rand -base64 24

# Für VAULT_ENCRYPTION_KEY (64 Hex-Zeichen):
openssl rand -hex 32
```

**4. MinIO Credentials:**
```
MINIO_ROOT_USER=meinMinioAdmin
MINIO_ROOT_PASSWORD=<sicheres-passwort>
```

**5. Traefik E-Mail** in `infrastructure/traefik/traefik.yml` anpassen:
```bash
sed -i 's/admin@yourdomain.tld/deine@email.de/g' infrastructure/traefik/traefik.yml
```

---

## Phase 5 — Deployment starten (10-20 Minuten)

```bash
# Im Repo-Verzeichnis auf dem VPS:
cd /opt/family-planner
bash infrastructure/scripts/deploy.sh
```

Das Script:
1. Baut alle Docker Images (dauert 5-15 Min beim ersten Mal)
2. Startet alle Container
3. Holt automatisch SSL-Zertifikate von Let's Encrypt
4. Führt Datenbank-Migrationen aus

**Fortschritt beobachten:**
```bash
docker compose logs -f
```

---

## Phase 6 — Testen (5 Minuten)

```bash
# Alle Container laufen?
docker compose ps

# Alle sollten "healthy" oder "Up" zeigen:
# family_traefik    Up
# family_api        Up (healthy)
# family_admin      Up (healthy)
# family_worker     Up
# family_scheduler  Up
# family_postgres   Up (healthy)
# family_redis      Up (healthy)
# family_minio      Up (healthy)
```

**Im Browser testen:**
- `https://api.meinefamilie.de/api/health` → `{"status":"ok"}`
- `https://admin.meinefamilie.de` → Login-Seite

---

## Phase 7 — Test-Daten erstellen (optional)

```bash
bash infrastructure/scripts/seed.sh
```

Test-Accounts:
| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@family.local | Admin1234! |
| Erwachsener | erwachsener@family.local | Adult1234! |
| Kind | kind@family.local | Kind1234! |

**⚠️ Passwörter sofort nach dem ersten Login ändern!**

---

## Updates einspielen

Wenn neue Code-Versionen verfügbar sind:

```bash
cd /opt/family-planner
bash infrastructure/scripts/update.sh
```

Das Script:
1. Erstellt automatisch ein Backup
2. Zieht neuen Code per `git pull`
3. Baut neue Images
4. Startet Container nacheinander neu (minimale Ausfallzeit)

---

## Backup

Automatisches tägliches Backup einrichten:

```bash
# Crontab bearbeiten:
crontab -e

# Diese Zeile hinzufügen (täglich 3:00 Uhr):
0 3 * * * /opt/family-planner/infrastructure/scripts/backup.sh >> /var/log/fp-backup.log 2>&1
```

Manuelles Backup:
```bash
bash infrastructure/scripts/backup.sh
```

Backups landen in `/opt/family-planner/backups/` und in MinIO (Bucket: `family-backups`).

---

## Logs anschauen

```bash
# Alle Services:
docker compose logs -f

# Nur API:
docker compose logs -f api

# Nur Fehler:
docker compose logs api | grep -i error

# Letzte 100 Zeilen:
docker compose logs --tail=100 api
```

---

## Häufige Probleme

### "SSL-Zertifikat fehlt / HTTPS geht nicht"

```bash
# Traefik-Logs prüfen:
docker compose logs traefik | grep -i acme

# Häufige Ursachen:
# 1. DNS noch nicht aktiv (warte 10-30 Min)
# 2. Port 80 nicht erreichbar (Firewall prüfen)
# 3. acme.json Berechtigungen falsch:
chmod 600 infrastructure/traefik/acme.json
docker compose restart traefik
```

### "API startet nicht"

```bash
docker compose logs api

# Häufige Ursachen:
# 1. .env fehlerhaft ausgefüllt
# 2. JWT Keys falsch formatiert (kein \n am Ende)
# 3. Datenbank nicht erreichbar
docker compose logs postgres
```

### "Admin Panel zeigt API-Fehler"

```bash
# Prüfe ob API läuft:
curl https://api.meinefamilie.de/api/health

# CORS konfiguriert?
grep CORS_ORIGINS .env
# Muss sein: CORS_ORIGINS=https://admin.meinefamilie.de
```

### "Ich habe die .env Datei verloren"

Alle Secrets SIND WEG wenn du .env verlierst.
- JWT Keys: Alle eingeloggten User werden ausgeloggt → neu generieren
- VAULT_ENCRYPTION_KEY: Alle Vault-Dokumente sind NICHT MEHR ENTSCHLÜSSELBAR
- **→ VAULT_ENCRYPTION_KEY in Passwort-Manager sichern!**

---

## Mobile App bauen

### Vorbereitung (einmalig)

```bash
# Im apps/mobile Verzeichnis auf deinem Entwicklungsrechner:
cd apps/mobile

# EAS CLI installieren:
npm install -g eas-cli

# Bei Expo einloggen:
eas login

# Projekt initialisieren:
eas init
# → kopiere die Project ID in app.json unter extra.eas.projectId
```

### API-URL in app.json setzen

```json
"env": {
  "API_URL": "https://api.meinefamilie.de"
}
```

### iOS Build

```bash
# Development Build (für Testen):
eas build --platform ios --profile development

# Production Build (für App Store):
eas build --platform ios --profile production

# App Store Submit:
eas submit --platform ios
```

### Android Build

```bash
# APK für direktes Testen:
eas build --platform android --profile preview

# AAB für Google Play:
eas build --platform android --profile production

# Google Play Submit:
eas submit --platform android
```

---

## Monitoring (optional)

Uptime Kuma für Verfügbarkeitsüberwachung starten:

```bash
docker compose --profile monitoring up -d uptime-kuma
```

Dann erreichbar unter `https://status.meinefamilie.de`.

Empfohlene Checks in Uptime Kuma:
- `https://api.meinefamilie.de/api/health` — API
- `https://api.meinefamilie.de/api/health/ready` — API Readiness
- `https://admin.meinefamilie.de` — Admin Panel

---

## Manuell auf MinIO Console zugreifen (für Dateiverwaltung)

MinIO ist nicht öffentlich erreichbar (Sicherheit). Zugriff via SSH-Tunnel:

```bash
# Von deinem Computer:
ssh -L 9001:localhost:9001 deploy@DEINE_VPS_IP

# Dann im Browser:
# http://localhost:9001
# Login: MINIO_ROOT_USER / MINIO_ROOT_PASSWORD aus .env
```

---

## System komplett zurücksetzen (ACHTUNG: löscht alle Daten)

```bash
cd /opt/family-planner
docker compose down -v   # -v löscht auch alle Volumes (ALLE DATEN WEG!)
```
