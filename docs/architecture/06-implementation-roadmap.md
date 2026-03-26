# Phase 6: Implementierungs-Roadmap, Modul-Reihenfolge, Meilensteine

---

## 1. Prinzipien der Implementierungsreihenfolge

1. **Fundament vor Features:** Kern-Infrastruktur und Auth zuerst
2. **Vertikale Slices:** Jedes Modul vollständig (DB → API → App) bevor das nächste
3. **Keine blockierenden Abhängigkeiten:** Features unabhängig deploybar
4. **China-Resilienz von Anfang an:** Offline-First und Sync von Beginn einbauen
5. **Sicherheit ist kein Nachgedanke:** Guards und Audit von Phase 1

---

## 2. Roadmap in Phasen

### Phase A: Fundament (Muss fertig sein, bevor nichts anderes möglich ist)

```
A1. Repository-Struktur
  ├── Monorepo-Setup (empfohlen: pnpm workspaces)
  │   ├── packages/backend   (NestJS)
  │   ├── packages/mobile    (React Native)
  │   ├── packages/admin     (Next.js)
  │   └── packages/shared    (Shared Types)
  └── Grundlegende Tooling: ESLint, Prettier, TypeScript Configs

A2. Docker Compose Basis-Setup
  ├── postgres + init scripts
  ├── redis + redis.conf
  ├── minio + bucket init
  └── traefik + dynamische Konfiguration

A3. Backend: Projekt-Basis
  ├── NestJS Projekt initialisieren
  ├── TypeORM + PostgreSQL Connection
  ├── Redis Connection (ioredis)
  ├── MinIO Client Setup
  ├── Global Validation Pipe
  ├── Logger (Winston)
  ├── Health Module
  └── Swagger/OpenAPI Setup

A4. Datenbank: Basis-Migrations
  ├── families Tabelle
  ├── users Tabelle
  ├── user_family_roles Tabelle
  └── refresh_tokens Tabelle

A5. Auth-Modul (Backend)
  ├── Register / Login / Logout
  ├── JWT (RS256) + Refresh Token Rotation
  ├── Token-Reuse Detection
  ├── Passwort-Hashing (bcrypt + pepper)
  ├── Rate Limiting für Auth-Endpunkte
  └── Brute-Force-Schutz (Redis-based Lockout)

A6. Users + Families Module (Backend)
  ├── User-Profil CRUD
  ├── Familie erstellen
  ├── Invite-Code System
  └── Rollen zuweisen

A7. RBAC-System
  ├── RolesGuard
  ├── FamilyMemberGuard
  └── @Roles() + @CurrentUser() Dekoratoren

MEILENSTEIN A: Backend läuft, Auth funktioniert, User kann Familie erstellen und Mitglieder einladen
```

---

### Phase B: Mobile App Fundament

```
B1. React Native + Expo Prebuild Setup
  ├── Projekt initialisieren
  ├── TypeScript konfigurieren
  ├── Expo Prebuild ausführen (android/ + ios/ generieren)
  └── Lokale Fonts gebündelt

B2. Theme-System + UI-Basics
  ├── Colors, Typography, Spacing
  ├── Button, Card, Input, Modal Primitives
  └── Dark Mode Vorbereitung

B3. Navigation-Grundstruktur
  ├── Expo Router Setup
  ├── Auth Gate (eingeloggt vs. nicht eingeloggt)
  ├── Adult Layout (Bottom Tabs)
  └── Child Layout (Bottom Tabs)

B4. Auth Flow (Mobile)
  ├── Login Screen
  ├── Register Screen
  ├── Forgot Password Screen
  ├── SecureStore Integration (Tokens)
  ├── MMKV Setup
  └── Axios Client mit Interceptors (inkl. Token-Refresh)

B5. Offline-Basis
  ├── NetInfo Integration
  ├── OfflineBanner Komponente
  ├── TanStack Query Setup + MMKV Persister
  └── Pending Queue (Grundstruktur)

B6. Sync Manager (Grundstruktur)
  ├── SyncManager Klasse
  ├── Delta-Sync Endpoint (Backend)
  └── Konflikt-Grundlogik

MEILENSTEIN B: App startet, Login funktioniert, Offline-Banner erscheint, Grundstruktur steht
```

---

### Phase C: Kern-Features (Höchste Alltagsrelevanz)

```
C1. Shopping Liste (Modul 1)
  Backend:
    ├── shopping_lists + shopping_items Migrations
    ├── ShoppingModule (Controller, Service, DTOs)
    ├── Guards (FamilyMember)
    └── Redis Pub/Sub für Live-Sync
  Mobile:
    ├── Listen-Übersicht Screen
    ├── Listen-Detail + Items Screen
    ├── Item-Check-Funktionalität (Optimistic Update)
    ├── Offline: Items abhaken funktioniert offline
    └── Sync bei Wiederverbindung

C2. ToDo-Listen (Modul 2)
  Backend:
    ├── todo_lists + todo_items Migrations
    ├── TaskModule (inkl. Zuweisung, Fälligkeit)
    └── BullMQ Reminder Job
  Mobile:
    ├── Listen-Übersicht
    ├── Task-Detail (Zuweisung, Datum)
    └── Reminder-Integration (In-App)

C3. Notizen (Modul 3)
  Backend:
    ├── notes Migration
    └── NotesModule (Soft Delete, Volltextsuche)
  Mobile:
    ├── Notizen-Liste
    └── Notiz-Editor (einfach)

C4. Notifications-Modul (Querschnitt)
  Backend:
    ├── notification_events Migration
    ├── NotificationsModule
    ├── APNs Adapter (optional bei iOS-Test)
    └── FCM Adapter (optional bei Android-Test)
  Mobile:
    ├── Notification Center Screen
    ├── Push Permission Request (mit Fallback)
    └── Unread-Badge auf Tab

MEILENSTEIN C: Familie kann gemeinsam Einkaufen, ToDos verwalten und Notizen teilen
```

---

### Phase D: Kalender + Kommunikation

```
D1. Familienkalender (Modul 4)
  Backend:
    ├── calendar_events + event_reminders Migrations
    ├── CalendarModule
    ├── Recurrence Rule Handling (rrule Library)
    └── Event-Reminder BullMQ Jobs
  Mobile:
    ├── Monatsansicht
    ├── Tagesansicht
    ├── Event erstellen/bearbeiten
    └── Reminder-Auswahl

D2. Essensplan (Modul 5)
  Backend:
    ├── recipes + meal_plans + meal_plan_entries Migrations
    └── Meals + Recipes Module
  Mobile:
    ├── Wochenplan-Ansicht
    ├── Rezept-Liste
    ├── Kind: Vorschlag machen
    └── Eltern: Genehmigen/Ablehnen

MEILENSTEIN D: Familienorganisation komplett (Einkauf, Tasks, Kalender, Essen)
```

---

### Phase E: Schulplaner + Gamification

```
E1. Schulplaner (Modul 6) - Komplexestes Modul
  Backend:
    ├── Alle school_* Migrations
    ├── SchoolModule mit Sub-Services:
    │   ├── TimetableService (Versionen)
    │   ├── TaskService (Hausaufgaben etc.)
    │   ├── ExamService (Countdown)
    │   ├── GradeService
    │   ├── PackingListService
    │   └── CafeteriaService
    └── Jobs: PackingListReminder, ExamCountdown, DailyTaskGenerator
  Mobile (Child Mode):
    ├── Stundenplan Screen
    ├── Hausaufgaben-Übersicht
    ├── Prüfungs-Countdown Widget
    ├── Packliste für morgen
    └── Noten-Übersicht

E2. Gamification (Modul 11)
  Backend:
    ├── xp_ledger + badges + rewards Migrations
    ├── GamificationModule
    ├── XP-Engine (Event-basiert via NestJS Events)
    ├── Badge-Vergabe-Logic
    └── Reward-Redemption
  Mobile (Child Mode):
    ├── XP-Bar + Level Anzeige
    ├── Badge-Sammlung
    ├── Reward-Shop
    └── Streak-Anzeige

E3. Gamification-Integration in Schulplaner
  ├── Task completed → XP vergeben
  ├── Streak-Tracking
  └── Badge-Trigger

MEILENSTEIN E: Kind-Modus vollständig nutzbar, Schulorganisation + Gamification
```

---

### Phase F: Tracker-Module

```
F1. Gefrierschrank-Tracker (Modul 7)
  Backend + Mobile (straightforward)
  Job: Wöchentlicher Expiry-Check + Notification

F2. Wetterstation (Modul 8)
  Backend:
    ├── WeatherApiAdapter (abstrahiert)
    ├── weather_snapshots Migration
    └── Stündlicher Fetch-Job
  Mobile:
    ├── Wetter-Dashboard
    └── Historische Charts

F3. Katastrophenvorsorge (Modul 10)
  Backend + Mobile (einfaches CRUD + Expiry-Warnungen)

MEILENSTEIN F: Alle Tracker-Module nutzbar
```

---

### Phase G: Dokumententresor + Admin

```
G1. Dokumententresor (Modul 9) - Sicherheitskritisch
  Backend:
    ├── vault_documents Migration
    ├── VaultModule
    ├── AES-256-GCM Encryption Service
    ├── MinIO Integration (Private Bucket)
    ├── Presigned URL Generation (60s)
    ├── VaultAccessGuard
    └── Audit-Logging für alle Aktionen
  Mobile:
    ├── Vault-Liste (nur für family_admin)
    ├── Upload-Flow
    └── Download via Presigned URL

G2. Audit-Modul
  Backend:
    ├── audit_logs Migration
    ├── AuditModule
    ├── @AuditLog() Decorator (automatisches Logging)
    └── Admin-Query-Interface

G3. Admin-Panel (Next.js)
  ├── Login (nur super_admin)
  ├── User-Verwaltung
  ├── Familien-Übersicht
  ├── Audit-Log-Viewer
  ├── System-Health Dashboard
  └── Queue-Status (BullMQ Board)

MEILENSTEIN G: Admin-Panel nutzbar, Dokumententresor sicher, vollständiges Audit-Trail
```

---

### Phase H: App-Store-Readiness + Hardening

```
H1. iOS / Android Build Pipeline
  ├── Expo EAS Build konfigurieren
  ├── App-Signing (iOS: Certificates + Profiles, Android: Keystore)
  ├── app.config.ts für Dev/Stage/Prod Trennung
  ├── Privacy Manifest (iOS 17+)
  └── Google Play Store Policies prüfen

H2. Security Hardening
  ├── Penetration-Test (manuell oder Tool-basiert)
  ├── Dependency Audit (npm audit, Snyk)
  ├── Header-Security-Review
  └── Rate-Limit-Feintuning

H3. China-Tauglichkeit validieren
  ├── App ohne FCM testen
  ├── Offline-Szenarien durchspielen
  ├── Langsame Verbindung simulieren (Network Throttling)
  └── Alle externen Adapter-Calls prüfen

H4. Performance-Optimierung
  ├── Query-Optimierung (EXPLAIN ANALYZE auf kritischen Queries)
  ├── Redis-Caching für häufige Lesezugriffe
  └── Bilder komprimiert in MinIO (Sharp Library)

H5. Dokumentation
  ├── API-Dokumentation (Swagger auto-generiert)
  ├── Deployment-Guide
  └── User-Guide (optional)

MEILENSTEIN H: App ist store-ready, sicher gehärtet, China-validiert
```

---

## 3. Empfohlene Technologie-Versionen

```
Backend:
  Node.js:     22 LTS
  NestJS:      10.x
  TypeORM:     0.3.x
  PostgreSQL:  16
  Redis:       7.x
  BullMQ:      5.x

Mobile:
  React Native:  0.74+
  Expo:          51+
  TanStack Query: 5.x
  Expo Router:   3.x

Admin:
  Next.js:  14+ (App Router)
  React:    18

Infrastructure:
  Docker:          25+
  Docker Compose:  2.x
  Traefik:         3.x
  MinIO:           Latest Stable
```

---

## 4. App-Store-Checkliste

```
iOS App Store:
  [ ] Apple Developer Account (99 EUR/Jahr)
  [ ] Bundle ID registriert (com.yourname.familyplanner)
  [ ] Signing Certificate (Distribution)
  [ ] Provisioning Profile
  [ ] App Store Connect Eintrag
  [ ] Privacy Policy URL (öffentlich erreichbar)
  [ ] Datenschutzerklärung (DSGVO-konform)
  [ ] Privacy Manifest (PrivacyInfo.xcprivacy) für iOS 17+
  [ ] NSPhotoLibraryUsageDescription (wenn Bildupload)
  [ ] NSCameraUsageDescription (wenn Kamera)
  [ ] Push Notification Entitlement
  [ ] APNs Certificate / Key
  [ ] App Screenshots (alle Größen)
  [ ] App Icon (alle Größen)
  [ ] Age Rating konfiguriert
  [ ] In-App Purchase: Keine (oder korrekt konfiguriert)

Google Play Store:
  [ ] Google Play Developer Account (25 USD einmalig)
  [ ] Android Keystore (sicher aufbewahren!)
  [ ] App Signing (Play App Signing aktivieren)
  [ ] Package Name (com.yourname.familyplanner)
  [ ] Google Play Console Eintrag
  [ ] Privacy Policy URL
  [ ] Data Safety Section ausfüllen
  [ ] Target API Level (min. API 34 für 2024)
  [ ] Permissions erklärt
  [ ] Screenshots + Feature Graphic
  [ ] App Icon (512x512)
  [ ] FCM Setup (optional, China-Fallback implementiert)

Beide:
  [ ] Keine Produktions-API-Keys in App-Bundle
  [ ] Certificate Pinning (optional, aber empfohlen)
  [ ] App-Transport-Security (iOS: keine HTTP-Exceptions)
  [ ] ProGuard/R8 für Android (Code Obfuscation)
  [ ] Source Maps ausgeblendet (kein React Native Bundler-Leak)
```

---

## 5. Gesamtzeitraum (Schätzung für Einzelentwickler)

```
Phase A (Fundament Backend):     2-3 Wochen
Phase B (Mobile Fundament):      1-2 Wochen
Phase C (Kern-Features):         3-4 Wochen
Phase D (Kalender + Essen):      2-3 Wochen
Phase E (Schule + Gamification): 3-4 Wochen (komplexestes Modul)
Phase F (Tracker-Module):        2-3 Wochen
Phase G (Tresor + Admin):        2-3 Wochen
Phase H (Store-Readiness):       1-2 Wochen

Gesamt: ca. 16-24 Wochen
```

**Annahme:** Alle Angaben für einen erfahrenen Entwickler, der das Projekt
vollzeit bearbeitet. Bei Teilzeit entsprechend länger.

---

*Implementierung startet mit Phase 7: Code-Generierung*
