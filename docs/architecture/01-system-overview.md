# System Architecture: Family Planner Shanghai

**Version:** 1.0
**Status:** Production Architecture
**Last Updated:** 2026-03-26

---

## 1. Systemüberblick

Family Planner Shanghai ist eine vollständig selbst gehostete, multi-tenant-fähige Familien-App mit iOS/Android Native App, Web-Admin-Panel und einem robusten Backend auf einem Hostinger VPS. Das System ist primär für die Nutzung in Europa und China ausgelegt.

### 1.1 Ziele

- Vollständige Datensouveränität auf eigenem Server
- China-taugliche Architektur (GFW-Resilienz, Offline-First)
- App-Store-ready (iOS + Android)
- Erweiterbar ohne Architekturänderungen
- Produktionstaugliche Sicherheit

---

## 2. Systemarchitektur in Textform

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INTERNET / NUTZER                                 │
│                                                                          │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│   │  iOS Native App  │    │ Android Native   │    │  Admin Browser   │  │
│   │  (React Native)  │    │ (React Native)   │    │  (Next.js Web)   │  │
│   └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│            │ HTTPS                 │ HTTPS                  │ HTTPS      │
└────────────┼─────────────────────-─┼────────────────────────┼────────────┘
             │                       │                         │
┌────────────▼───────────────────────▼─────────────────────-──▼────────────┐
│                        HOSTINGER VPS                                      │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    TRAEFIK REVERSE PROXY                             │  │
│  │         api.domain.tld  │  admin.domain.tld  │  TLS Termination     │  │
│  └──────────────┬──────────┴──────────┬──────────┴─────────────────────┘  │
│                 │                     │                                    │
│  ┌──────────────▼──────────┐  ┌───────▼──────────────────────────────┐   │
│  │    NestJS API Server    │  │      Next.js Admin Panel              │   │
│  │    (api container)      │  │      (admin-web container)            │   │
│  │                         │  │                                       │   │
│  │  ┌─────────────────┐    │  │  ┌─────────────────────────────────┐ │   │
│  │  │ Domain Modules  │    │  │  │  Admin UI / Dashboard           │ │   │
│  │  │ auth            │    │  │  │  Familie, User, Audit, System   │ │   │
│  │  │ users           │    │  │  └─────────────────────────────────┘ │   │
│  │  │ families        │    │  └──────────────────────────────────────┘   │
│  │  │ shopping        │    │                                              │
│  │  │ tasks           │    │  ┌───────────────────────────────────────┐  │
│  │  │ notes           │    │  │       BullMQ Worker Container         │  │
│  │  │ calendar        │    │  │                                       │  │
│  │  │ meals           │    │  │  ┌─────────────────────────────────┐  │  │
│  │  │ school          │    │  │  │ Jobs / Queues                   │  │  │
│  │  │ freezer         │    │  │  │ - Notification Dispatch         │  │  │
│  │  │ weather         │    │  │  │ - Reminder Scheduler            │  │  │
│  │  │ vault           │    │  │  │ - Calendar Sync                 │  │  │
│  │  │ emergency       │    │  │  │ - Weather Fetch                 │  │  │
│  │  │ gamification    │    │  │  │ - Cleanup Jobs                  │  │  │
│  │  │ notifications   │    │  │  │ - Audit Flush                   │  │  │
│  │  │ sync            │    │  │  └─────────────────────────────────┘  │  │
│  │  │ audit           │    │  └───────────────────────────────────────┘  │
│  │  │ admin           │    │                                              │
│  │  │ health          │    │  ┌───────────────────────────────────────┐  │
│  │  └─────────────────┘    │  │      Scheduler Container              │  │
│  └────────────┬────────────┘  │  (Cron-basierte Jobs, täglich etc.)   │  │
│               │               └───────────────────────────────────────┘  │
│               │                                                           │
│  ┌────────────▼──────────────────────────────────────────────────────┐   │
│  │                    INTERNE DATENSCHICHT                            │   │
│  │                                                                    │   │
│  │  ┌──────────────────┐   ┌──────────────────┐  ┌───────────────┐  │   │
│  │  │   PostgreSQL     │   │     Redis         │  │  MinIO        │  │   │
│  │  │   (postgres)     │   │   (redis)         │  │  (minio)      │  │   │
│  │  │                  │   │                   │  │               │  │   │
│  │  │  Primäre DB      │   │  Cache            │  │  S3-kompat.   │  │   │
│  │  │  Alle Entitäten  │   │  Session Store    │  │  Dokumente    │  │   │
│  │  │  Audit Logs      │   │  Rate Limiter     │  │  Bilder       │  │   │
│  │  │  Sync State      │   │  BullMQ Queues    │  │  Anhänge      │  │   │
│  │  │                  │   │  Pub/Sub          │  │  Vault Files  │  │   │
│  │  └──────────────────┘   └──────────────────┘  └───────────────┘  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │               OPTIONALE EXTERNE ADAPTER (entkoppelt)               │  │
│  │                                                                    │  │
│  │   Google Calendar Connector  │  Weather API Adapter               │  │
│  │   APNs Push Adapter          │  FCM Push Adapter                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technologieentscheidungen

### 3.1 Mobile App: React Native + Expo Prebuild

**Entscheidung:** React Native mit Expo Prebuild (Managed Workflow verlassen, natives Build behalten)

**Begründung:**
- Expo Prebuild gibt vollständige Kontrolle über natives Projekt (android/, ios/)
- TypeScript als Default für Typsicherheit
- Kein Expo Go Dependency in Production - echter nativer Build
- EAS Build als optionaler CI-Schritt, eigener Build-Prozess bleibt möglich
- React Native ist die einzige cross-platform Lösung mit echter nativer Performance und vollem Store-Support ohne Google-Zwangsabhängigkeit (Flutter hätte hier ähnliche Stärken, aber das Team-Ökosystem spricht für RN/TS)

**Alternative abgelehnt:** Flutter - Dart-Ökosystem kleiner, weniger TS/JS-Reuse mit Backend

### 3.2 Backend: NestJS

**Entscheidung:** NestJS auf Node.js/TypeScript

**Begründung:**
- Vollständige TypeScript-Typsicherheit vom Backend bis zur App (shared types möglich)
- Modulares System entspricht exakt den Domänengrenzen
- Dependency Injection, Guards, Interceptors, Pipes - alles eingebaut
- Swagger/OpenAPI auto-generiert aus Decorators
- BullMQ-Integration out-of-the-box
- Kein Framework-Lock: Module sind plain TypeScript, leicht extrahierbar
- Gut dokumentiert, stabile Release-Zyklen, LTS auf Node.js

**Alternative abgelehnt:** Go/Gin - Performance-Vorteil nicht relevant bei VPS-Single-Family-Nutzung; TypeScript-Reuse verloren

### 3.3 Datenbank: PostgreSQL

**Entscheidung:** PostgreSQL 16

**Begründung:**
- ACID-Transaktionen für Sync-Konfliktauflösung kritisch
- JSONB für semi-strukturierte Metadaten (Settings, Gamification-Events) ohne Schema-Overhead
- pg_trgm für Volltextsuche (Notizen, Dokumente)
- Row-Level Security als zusätzliche Verteidigungsschicht
- TimescaleDB-Extension optional für Wetterdaten-Timeseries

**Alternative abgelehnt:** MongoDB - Keine echten Transaktionen für Multi-Table-Sync-Operationen; MySQL - Schwächerer JSONB-Support

### 3.4 Cache + Queue: Redis + BullMQ

**Entscheidung:** Redis 7 mit BullMQ

**Begründung:**
- Redis als einziger Cache/Queue/Pub-Sub-Dienst - kein zweites System
- BullMQ bietet Job-Priorität, Retry-Logik, Delayed Jobs, Concurrency-Limits
- Reminder-System komplett über BullMQ Delayed Jobs - kein Cron-Wildwuchs
- Rate Limiting über Redis (ioredis + NestJS Throttler)
- Session Store für Web-Admin über Redis

**Risiko:** Redis ist Single Point of Failure - auf VPS akzeptabel, Persistence (AOF) aktiviert

### 3.5 Object Storage: MinIO

**Entscheidung:** MinIO selbst gehostet auf VPS

**Begründung:**
- S3-kompatible API - alle S3-SDKs funktionieren unverändert
- Vollständig selbst gehostet - keine westlichen Cloud-Dienste
- Bucket-Policies für Vault (privat) vs. Assets (semi-public) konfigurierbar
- Presigned URLs für sichere Dokument-Downloads
- China-Problem eliminiert: kein Routing über AWS/GCS

**Alternative:** Backblaze B2 als Backup-Target (S3-kompatibel, günstiger als AWS)

### 3.6 Admin Panel: Next.js

**Entscheidung:** Next.js 14+ (App Router)

**Begründung:**
- Server Components für sensitive Admin-Daten - kein Client-Side-Leak
- Gleicher TypeScript-Stack wie API und App
- Shared Type-Definitionen möglich
- Kein separates Backend für Admin - kommuniziert direkt mit NestJS API
- Deployment als eigenständiger Container

### 3.7 Reverse Proxy: Traefik

**Entscheidung:** Traefik v3

**Begründung:**
- Native Docker-Integration: Labels statt Konfigurationsdateien
- Automatisches Let's Encrypt HTTPS - kein manuelles certbot
- Middleware-System für Rate Limiting, Auth-Header, IP-Whitelist
- Dashboard für Debugging
- Einfacheres Routing als Nginx bei Docker Compose

**Wann Nginx besser:** Bei komplexen Static-File-Serving-Anforderungen - hier nicht der Fall

### 3.8 Push Notifications: APNs + FCM + In-App-Fallback

**Entscheidung:** Dreischichtiges Notification-System

**Begründung (China-kritisch):**
- FCM ist in China blockiert oder unzuverlässig
- APNs funktioniert in China, aber nicht garantiert
- Deshalb: Eigenes In-App Notification Center als primäre Quelle der Wahrheit
- Push ist Enhancement, nicht Kernsystem
- Beim App-Start: Sync aller verpassten Notifications aus DB
- BullMQ-Scheduler löst Reminders aus → versucht Push → wenn Push fehlschlägt, bleibt Event in DB → App holt beim nächsten Start

---

## 4. China-Tauglichkeit: Architekturentscheidungen

### 4.1 Kernsystem ohne westliche Dependencies

| Dienst | Standard | China-sichere Alternative |
|--------|----------|--------------------------|
| Push | FCM | APNs + In-App-Fallback |
| Fonts | Google Fonts | Lokal gebundelt |
| Analytics | Firebase | Keins / Posthog selbst gehostet |
| Maps | Google Maps | Nicht benötigt |
| CDN | Cloudflare | Assets auf VPS über Traefik |
| Auth | Firebase Auth | Eigenes JWT-System |

### 4.2 Offline-First-Strategie

```
App startet
  │
  ├─► Lade lokalen Cache (MMKV / SQLite)
  │     └─► Zeige sofort Daten an
  │
  ├─► Versuche API-Verbindung
  │     ├─► Erfolg: Sync Delta, aktualisiere Cache
  │     └─► Fehlschlag: Zeige "Offline" Banner, speichere Änderungen in PendingQueue
  │
  └─► Bei Wiederverbindung:
        └─► Flush PendingQueue mit Retry-Logik (exponential backoff)
```

### 4.3 Netzwerk-Resilienz

- Axios-Interceptor mit Retry-Logic (3 Versuche, 1s/2s/4s Backoff)
- Timeout: 10 Sekunden (nicht 30s default)
- API-Requests priorisiert: Kleine Payloads, kein unnötiger Overhead
- Keine externen Fonts/Scripts in App
- Alle Assets lokal gebundelt oder von eigenem Server

### 4.4 Sync-Strategie bei Unterbrechung

```
PendingQueue (MMKV on-device)
  │
  ├─► Entry: { id, operation, payload, timestamp, attempts }
  ├─► Versuche bei Netzwerk-Wiederherstellung
  ├─► Max 10 Versuche pro Operation
  └─► Nach 10 Fehlversuchen: Conflict-UI anzeigen
```

---

## 5. Rollen- und Berechtigungsmodell (Überblick)

```
super_admin
  └─► Vollzugriff auf alle Familien, System-Admin-Panel, Audit-Logs

family_admin (= Elternteil mit Admin-Rechten)
  ├─► Familienverwaltung
  ├─► Dokumententresor
  ├─► Schulplaner-Genehmigungen
  ├─► Gamification-Rewards verwalten
  └─► Alle Familienmitglieder-Daten

adult (= Erwachsenes Familienmitglied)
  ├─► Gemeinsame Listen lesen/schreiben
  ├─► Eigene Tasks, Notizen
  ├─► Kalender
  └─► Kein Dokumententresor, kein Admin

child (= Kind)
  ├─► Schulplaner (eigene Ansicht)
  ├─► Einkaufsliste lesen, Items hinzufügen
  ├─► Gamification-Ansicht
  ├─► Essensplan-Vorschläge
  └─► Stark eingeschränkte Ansicht
```

---

## 6. Modul-Übersicht und Abhängigkeiten

```
KERN (keine Abhängigkeiten von Feature-Modulen):
  auth → users → families → roles → permissions

FEATURE-MODULE (abhängig von Kern):
  shopping     → families, users
  tasks        → families, users
  notes        → families, users
  calendar     → families, users, notifications
  meals        → families, users, recipes
  school       → families, users, gamification, notifications
  freezer      → families, users
  weather      → (extern: Weather-API-Adapter)
  vault        → families, users, audit (admin_only)
  emergency    → families, users

QUERSCHNITT (von allen nutzbar):
  gamification → users, families, notifications
  notifications → users, families (Redis Pub/Sub + DB)
  sync         → alle Module
  audit        → alle sensitiven Module
  admin        → alle Module (super_admin only)
  health       → Systemstatus
```

---

## 7. Datensouveränität und Betrieb

- **Alle Daten auf eigenem VPS:** Postgres, Redis, MinIO - keine Cloud-Abhängigkeit
- **Backup:** Täglicher Postgres-Dump zu MinIO + optionaler Offsite-Transfer
- **Monitoring:** Uptime-Kuma selbst gehostet (optional)
- **Logs:** Strukturiertes JSON-Logging, kein externer Log-Dienst erforderlich
- **Secrets:** Alle Secrets in `.env`-Dateien, nie im Repository
- **Updates:** Container-basiert, Rolling Updates ohne Downtime möglich

---

*Nächstes Dokument: 02-backend-domain-model.md (Phase 2)*
