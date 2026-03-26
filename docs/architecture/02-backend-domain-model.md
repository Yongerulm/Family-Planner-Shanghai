# Phase 2: Backend-Domänenmodell, Datenbankschema, Rollen & Berechtigungen

---

## 1. Backend-Domänenmodell (NestJS Module)

### Modulstruktur-Prinzip

Jedes Domänenmodul ist vollständig eigenständig und folgt dieser internen Struktur:

```
modules/
  <domain>/
    dto/
      create-<entity>.dto.ts
      update-<entity>.dto.ts
      <entity>-response.dto.ts
    entities/
      <entity>.entity.ts
    guards/
      <domain>-owner.guard.ts      (falls nötig)
    events/                        (falls nötig)
      <domain>.events.ts
    jobs/                          (falls nötig)
      <domain>.processor.ts
    <domain>.controller.ts
    <domain>.service.ts
    <domain>.module.ts
```

---

### Modul 1: `auth`

**Verantwortlichkeiten:**
- Login, Logout, Token-Refresh
- Password-Reset Flow
- JWT Access Token (15 Min) + Refresh Token (30 Tage, DB-gespeichert)
- Device-Tracking (welches Gerät hat Token)

**Entities:** `RefreshToken`
**DTOs:** `LoginDto`, `RegisterDto`, `RefreshTokenDto`, `ResetPasswordDto`
**Guards:** `JwtAuthGuard`, `LocalAuthGuard`
**Jobs:** `CleanupExpiredTokensJob` (täglich via BullMQ)

---

### Modul 2: `users`

**Verantwortlichkeiten:**
- Benutzerprofil (Name, Avatar, Einstellungen)
- Passwort-Management
- Benutzerstatus (aktiv, deaktiviert)
- Familienzugehörigkeit auflösen

**Entities:** `User`
**DTOs:** `CreateUserDto`, `UpdateProfileDto`, `ChangePasswordDto`, `UserResponseDto`
**Guards:** `SelfOrAdminGuard`

---

### Modul 3: `families`

**Verantwortlichkeiten:**
- Familie erstellen, verwalten
- Mitglieder einladen (Invite-Code)
- Familienmitglied entfernen
- Familieneinstellungen

**Entities:** `Family`, `FamilyInvite`, `UserFamilyRole`
**DTOs:** `CreateFamilyDto`, `InviteMemberDto`, `UpdateFamilyDto`
**Guards:** `FamilyAdminGuard`

---

### Modul 4: `roles` + `permissions`

**Verantwortlichkeiten:**
- Rolle einem User in einer Familie zuweisen
- Permission-Matrix definieren und prüfen
- Feature-Flags per Rolle

**Entities:** `Role`, `Permission`, `RolePermission`
**Guards:** `RolesGuard` (verwendet `@Roles()` Decorator)

---

### Modul 5: `shopping`

**Verantwortlichkeiten:**
- Listen erstellen/verwalten
- Items hinzufügen, abhaken, löschen
- Kategorisierung
- Real-Time-Sync via Redis Pub/Sub

**Entities:** `ShoppingList`, `ShoppingItem`
**DTOs:** `CreateListDto`, `AddItemDto`, `UpdateItemDto`, `CheckItemDto`
**Jobs:** `SyncShoppingStateJob`
**Events:** `ItemCheckedEvent` → Redis Pub/Sub → alle verbundenen Clients

---

### Modul 6: `tasks`

**Verantwortlichkeiten:**
- To-Do-Listen und Items
- Zuweisung, Fälligkeitsdatum
- Private vs. Familie-weit
- Reminder-Planung via BullMQ

**Entities:** `TodoList`, `TodoItem`
**DTOs:** `CreateTodoItemDto`, `AssignTaskDto`, `UpdateTaskDto`
**Jobs:** `TaskReminderJob` (Delayed Job in BullMQ)

---

### Modul 7: `notes`

**Verantwortlichkeiten:**
- Notizen erstellen/bearbeiten/löschen
- Familien-Notizen vs. persönliche Notizen
- Soft Delete

**Entities:** `Note`
**DTOs:** `CreateNoteDto`, `UpdateNoteDto`

---

### Modul 8: `calendar`

**Verantwortlichkeiten:**
- Interne Kalender-Events
- Wiederkehrende Events
- Erinnerungen (BullMQ Delayed Jobs)
- Google Calendar optionaler Sync (Adapter)

**Entities:** `CalendarEvent`, `EventReminder`
**DTOs:** `CreateEventDto`, `UpdateEventDto`, `EventReminderDto`
**Jobs:** `EventReminderJob`, `GoogleCalendarSyncJob` (optional)
**Guards:** `CalendarAccessGuard`

---

### Modul 9: `meals`

**Verantwortlichkeiten:**
- Wochenplan verwalten
- Mahlzeit-Vorschläge von Kind
- Genehmigung durch Eltern
- Verbindung zu Recipes

**Entities:** `MealPlan`, `MealPlanEntry`
**DTOs:** `CreateMealPlanDto`, `SuggestMealDto`, `ApproveMealDto`
**Guards:** `FamilyAdminGuard` (für Genehmigungen)

---

### Modul 10: `recipes`

**Verantwortlichkeiten:**
- Rezepte verwalten
- Zutaten, Zubereitungszeit, Tags
- Verknüpfung mit Meals

**Entities:** `Recipe`, `RecipeIngredient`
**DTOs:** `CreateRecipeDto`, `UpdateRecipeDto`

---

### Modul 11: `school`

**Verantwortlichkeiten:**
- Stundenplan mit Versionen
- Hausaufgaben, Vokabeln, Prüfungen
- Noten-Tracking
- Packliste
- Kantinenplan
- Gamification-Integration (XP bei Aufgabe erledigt)

**Entities:** `SchoolTimetable`, `TimetableVersion`, `SchoolTask`, `SchoolExam`, `SchoolGrade`, `CafeteriaMenu`, `PackingList`, `PackingItem`
**DTOs:** Jeweils Create/Update/Response
**Jobs:** `PackingListReminderJob` (Abend vorher), `ExamCountdownJob`, `DailyTaskGeneratorJob`
**Events:** `TaskCompletedEvent` → GamificationService.awardXP()

---

### Modul 12: `freezer`

**Verantwortlichkeiten:**
- Gefrierschrank-Standorte verwalten
- Eingelagerte Items mit Datum
- Warnungen bei langer Lagerzeit (BullMQ Scheduled Check)

**Entities:** `FreezerLocation`, `FreezerItem`
**DTOs:** `AddFreezerItemDto`, `UpdateFreezerItemDto`
**Jobs:** `FreezerExpiryCheckJob` (wöchentlich)

---

### Modul 13: `weather`

**Verantwortlichkeiten:**
- Externe Wetter-API abfragen (Adapter-Schicht)
- Historische Snapshots speichern
- Dashboard-Daten bereitstellen

**Entities:** `WeatherSnapshot`
**DTOs:** `WeatherDataDto`, `WeatherHistoryQueryDto`
**Jobs:** `WeatherFetchJob` (stündlich via BullMQ)
**Adapter:** `WeatherApiAdapter` (abstrakt, konkrete Implementierung z.B. OpenWeatherMap oder WeatherAPI)

---

### Modul 14: `vault`

**Verantwortlichkeiten:**
- Verschlüsselte Dokumente hochladen
- Presigned Download-URLs (kurze Gültigkeit)
- Zugriffshistorie
- Nur für family_admin und super_admin

**Entities:** `VaultDocument`
**DTOs:** `UploadDocumentDto`, `DocumentResponseDto`
**Guards:** `VaultAccessGuard` (only family_admin+)
**Jobs:** `CleanupExpiredPresignedUrlsJob`
**Audit:** Jeder Zugriff wird in `audit_logs` protokolliert

---

### Modul 15: `emergency`

**Verantwortlichkeiten:**
- Notvorräte und Equipment tracken
- Lagerorte
- Ablaufdaten
- Farbliche Warnkennzeichnung

**Entities:** `EmergencyItem`
**DTOs:** `CreateEmergencyItemDto`, `UpdateEmergencyItemDto`
**Jobs:** `EmergencyExpiryCheckJob` (monatlich)

---

### Modul 16: `gamification`

**Verantwortlichkeiten:**
- XP vergeben und tracken
- Level berechnen
- Badges vergeben
- Rewards verwalten
- Medienzeitfreischaltung
- Events von anderen Modulen empfangen

**Entities:** `XpLedger`, `Badge`, `UserBadge`, `Reward`, `UserReward`
**DTOs:** `AwardXpDto`, `GrantRewardDto`, `BadgeResponseDto`
**Jobs:** `DailyStreakCheckJob`, `RewardExpiryJob`

---

### Modul 17: `notifications`

**Verantwortlichkeiten:**
- In-App Notification Center (DB-backed)
- Push Dispatch (APNs + FCM als optionale Adapter)
- Notification-Events empfangen und verteilen
- Ungelesene Zählen, Markieren

**Entities:** `NotificationEvent`
**DTOs:** `CreateNotificationDto`, `NotificationResponseDto`
**Adapter:** `PushAdapter` (abstrakt), `ApnsAdapter`, `FcmAdapter`
**Jobs:** `PushDispatchJob` (non-blocking, fire-and-forget)

---

### Modul 18: `sync`

**Verantwortlichkeiten:**
- Delta-Sync-Endpunkt für App
- Sync-Job-Status tracking
- Conflict-Detection

**Entities:** `SyncJob`
**DTOs:** `SyncRequestDto`, `SyncResponseDto`

---

### Modul 19: `audit`

**Verantwortlichkeiten:**
- Sensitive Aktionen protokollieren
- Unveränderliche Log-Einträge
- Query-Interface für Admin

**Entities:** `AuditLog`
**DTOs:** `AuditLogQueryDto`, `AuditLogResponseDto`
**Hinweis:** Audit-Einträge werden NICHT gelöscht (kein Soft Delete, kein Hard Delete via API)

---

### Modul 20: `admin`

**Verantwortlichkeiten:**
- System-Übersicht
- User-Management für super_admin
- Familien-Management
- Queue-Status
- System-Einstellungen

**Guards:** `SuperAdminGuard`

---

### Modul 21: `health`

**Verantwortlichkeiten:**
- `/health` Liveness-Probe
- `/health/ready` Readiness-Probe (DB, Redis, MinIO)
- Für Docker HEALTHCHECK und Monitoring

---

## 2. Datenbankschema (PostgreSQL)

### Kern-Tabellen

```sql
-- families
CREATE TABLE families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  invite_code VARCHAR(20)  UNIQUE NOT NULL,
  settings    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Index: invite_code für schnelle Einladungsvalidierung

-- users
CREATE TABLE users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id         UUID        REFERENCES families(id) ON DELETE CASCADE,
  email             VARCHAR(255) UNIQUE NOT NULL,
  username          VARCHAR(50)  NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  display_name      VARCHAR(100),
  avatar_url        VARCHAR(500),
  date_of_birth     DATE,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  last_login_at     TIMESTAMPTZ,
  settings          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ          -- Soft Delete
);
-- Index: email (UNIQUE), family_id, deleted_at

-- user_family_roles
CREATE TABLE user_family_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role        VARCHAR(30) NOT NULL CHECK (role IN ('super_admin','family_admin','adult','child')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, family_id)
);
-- Index: (user_id, family_id)

-- refresh_tokens
CREATE TABLE refresh_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(255) NOT NULL UNIQUE,
  device_info   JSONB,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index: token_hash, user_id, expires_at
```

### Shopping

```sql
CREATE TABLE shopping_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shopping_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  quantity        VARCHAR(50),
  category        VARCHAR(50),
  is_checked      BOOLEAN NOT NULL DEFAULT false,
  checked_by      UUID REFERENCES users(id),
  checked_at      TIMESTAMPTZ,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index: list_id, is_checked
```

### Tasks

```sql
CREATE TABLE todo_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID REFERENCES families(id) ON DELETE CASCADE,
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  is_private  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Entweder family_id ODER owner_id (private Liste) - Constraint via CHECK oder App-Logik
);

CREATE TABLE todo_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      UUID NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  description  TEXT,
  assigned_to  UUID REFERENCES users(id),
  due_date     TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority     SMALLINT NOT NULL DEFAULT 0, -- 0=normal, 1=high, 2=urgent
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ -- Soft Delete
);
-- Index: list_id, assigned_to, due_date, deleted_at
```

### Notes

```sql
CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID REFERENCES families(id) ON DELETE CASCADE,
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200),
  content     TEXT NOT NULL DEFAULT '',
  is_private  BOOLEAN NOT NULL DEFAULT false,
  color       VARCHAR(10),
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ -- Soft Delete
);
-- Index: family_id, owner_id, deleted_at
-- GIN Index für Volltextsuche: CREATE INDEX notes_content_fts ON notes USING gin(to_tsvector('german', coalesce(title,'') || ' ' || content));
```

### Calendar

```sql
CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id),
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  location        VARCHAR(300),
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  all_day         BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule VARCHAR(500), -- iCal RRULE Format
  color           VARCHAR(10),
  external_id     VARCHAR(255), -- Google Calendar ID falls sync
  external_source VARCHAR(50),  -- 'google_calendar' etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
-- Index: family_id, start_at, end_at

CREATE TABLE event_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  remind_at   TIMESTAMPTZ NOT NULL,
  job_id      VARCHAR(255), -- BullMQ Job ID für Cancellation
  is_sent     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Meals + Recipes

```sql
CREATE TABLE recipes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  description      TEXT,
  prep_time_min    INTEGER,
  cook_time_min    INTEGER,
  servings         INTEGER,
  image_url        VARCHAR(500),
  tags             TEXT[],
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  quantity    VARCHAR(100),
  unit        VARCHAR(50),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE meal_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL, -- Montag der Woche
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, week_start)
);

CREATE TABLE meal_plan_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  meal_type     VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  recipe_id     UUID REFERENCES recipes(id),
  custom_name   VARCHAR(200),
  suggested_by  UUID REFERENCES users(id),
  approved_by   UUID REFERENCES users(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### School

```sql
CREATE TABLE school_timetables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL REFERENCES families(id),
  name        VARCHAR(100) NOT NULL,
  valid_from  DATE NOT NULL,
  valid_until DATE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE school_timetable_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id    UUID NOT NULL REFERENCES school_timetables(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  period_number   SMALLINT NOT NULL,
  subject         VARCHAR(100) NOT NULL,
  teacher         VARCHAR(100),
  room            VARCHAR(50),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL
);

CREATE TABLE school_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id     UUID NOT NULL REFERENCES families(id),
  subject       VARCHAR(100),
  title         VARCHAR(300) NOT NULL,
  description   TEXT,
  type          VARCHAR(30) NOT NULL CHECK (type IN ('homework','vocabulary','project','exam_prep','other')),
  due_date      DATE NOT NULL,
  is_completed  BOOLEAN NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  xp_reward     INTEGER NOT NULL DEFAULT 10,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index: user_id, due_date, is_completed

CREATE TABLE school_exams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id     UUID NOT NULL REFERENCES families(id),
  subject       VARCHAR(100) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  exam_date     DATE NOT NULL,
  location      VARCHAR(200),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index: user_id, exam_date

CREATE TABLE school_grades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL REFERENCES families(id),
  subject     VARCHAR(100) NOT NULL,
  grade_value DECIMAL(4,2) NOT NULL,
  grade_type  VARCHAR(50), -- 'test', 'oral', 'homework', etc.
  exam_id     UUID REFERENCES school_exams(id),
  date        DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cafeteria_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id),
  user_id     UUID REFERENCES users(id),
  week_start  DATE NOT NULL,
  day_of_week SMALLINT NOT NULL,
  menu_text   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE packing_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id     UUID NOT NULL REFERENCES families(id),
  name          VARCHAR(200) NOT NULL,
  is_always     BOOLEAN NOT NULL DEFAULT false, -- immer einpacken?
  day_of_week   SMALLINT, -- NULL = täglich
  is_packed     BOOLEAN NOT NULL DEFAULT false,
  packed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Freezer

```sql
CREATE TABLE freezer_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE freezer_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     UUID NOT NULL REFERENCES freezer_locations(id) ON DELETE CASCADE,
  family_id       UUID NOT NULL REFERENCES families(id),
  name            VARCHAR(200) NOT NULL,
  quantity        VARCHAR(100),
  frozen_date     DATE NOT NULL,
  best_before     DATE,
  notes           TEXT,
  image_url       VARCHAR(500),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at     TIMESTAMPTZ -- NULL = noch vorhanden
);
-- Index: location_id, family_id, consumed_at, frozen_date
```

### Weather

```sql
CREATE TABLE weather_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id),
  location_name   VARCHAR(100) NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL,
  temperature_c   DECIMAL(5,2),
  feels_like_c    DECIMAL(5,2),
  humidity_pct    SMALLINT,
  wind_speed_ms   DECIMAL(5,2),
  condition_code  VARCHAR(50),
  condition_text  VARCHAR(100),
  icon_code       VARCHAR(20),
  raw_data        JSONB, -- vollständige API-Antwort
  source          VARCHAR(50) NOT NULL -- 'openweathermap', 'weatherapi' etc.
);
-- Index: family_id, recorded_at DESC
-- TimescaleDB Hypertable optional für großen Zeitreihendatensatz
```

### Vault

```sql
CREATE TABLE vault_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  uploaded_by         UUID NOT NULL REFERENCES users(id),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  category            VARCHAR(100),
  storage_key         VARCHAR(500) NOT NULL, -- MinIO object key
  storage_bucket      VARCHAR(100) NOT NULL,
  file_size_bytes     BIGINT,
  mime_type           VARCHAR(100),
  is_encrypted        BOOLEAN NOT NULL DEFAULT true,
  encryption_iv       VARCHAR(100), -- AES IV (nicht der Key, der liegt im Secret)
  checksum_sha256     VARCHAR(64),
  tags                TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ -- Soft Delete (Datei bleibt in MinIO bis Hard-Delete)
);
-- Kein direkter public access auf storage_key
```

### Emergency

```sql
CREATE TABLE emergency_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  category        VARCHAR(100),
  location        VARCHAR(200),
  quantity        DECIMAL(8,2),
  unit            VARCHAR(50),
  expiry_date     DATE,
  min_quantity    DECIMAL(8,2), -- Mindestbestand-Warnung
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index: family_id, expiry_date
```

### Gamification

```sql
CREATE TABLE xp_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL REFERENCES families(id),
  delta       INTEGER NOT NULL, -- positiv = gewonnen, negativ = ausgegeben
  reason      VARCHAR(100) NOT NULL,
  source_type VARCHAR(50),  -- 'school_task', 'shopping', etc.
  source_id   UUID,
  balance_after INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index: user_id, created_at DESC
-- Immutable: Keine Updates, kein Delete

CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url    VARCHAR(500),
  xp_required INTEGER,
  condition   JSONB -- flexible Bedingungslogik
);

CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id),
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  xp_cost         INTEGER NOT NULL,
  reward_type     VARCHAR(50) NOT NULL, -- 'media_time', 'activity', 'item'
  media_minutes   INTEGER, -- bei reward_type='media_time'
  created_by      UUID REFERENCES users(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id     UUID NOT NULL REFERENCES rewards(id),
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by   UUID REFERENCES users(id),
  expires_at    TIMESTAMPTZ,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','used','expired'))
);
```

### Notifications

```sql
CREATE TABLE notification_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id       UUID REFERENCES families(id),
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  body            TEXT,
  data            JSONB,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  push_sent       BOOLEAN NOT NULL DEFAULT false,
  push_sent_at    TIMESTAMPTZ,
  push_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index: user_id, is_read, created_at DESC
```

### System

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  family_id   UUID REFERENCES families(id),
  action      VARCHAR(100) NOT NULL, -- z.B. 'vault.document.download'
  resource    VARCHAR(100),
  resource_id UUID,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index: user_id, action, created_at DESC
-- Keine Updates, keine Deletes via API

CREATE TABLE sync_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  device_id     VARCHAR(100),
  last_sync_at  TIMESTAMPTZ,
  sync_token    VARCHAR(255), -- Cursor/Version für Delta-Sync
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, device_id)
);

CREATE TABLE settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       VARCHAR(20) NOT NULL CHECK (scope IN ('system','family','user')),
  scope_id    UUID, -- family_id oder user_id, NULL für system
  key         VARCHAR(100) NOT NULL,
  value       JSONB NOT NULL,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope, scope_id, key)
);
```

---

## 3. Rollen- und Berechtigungskonzept

### 3.1 Rollenhierarchie

```
super_admin
    ├── Alle Rechte auf alle Familien
    ├── System-Administration
    ├── Kann andere super_admins ernennen
    └── Nicht familiengebunden

family_admin (pro Familie)
    ├── Vollzugriff auf eigene Familie
    ├── Dokumententresor
    ├── Mitglieder verwalten
    ├── Rollen zuweisen (adult, child)
    ├── Gamification verwalten
    └── Schulplaner-Genehmigungen

adult (pro Familie)
    ├── Gemeinsame Listen R/W
    ├── Eigene Tasks, Notizen
    ├── Kalender R/W
    ├── Essensplan R/W
    ├── Gefrierschrank R/W
    ├── Katastrophenvorsorge R/W
    ├── Kein Dokumententresor
    └── Kein Admin

child (pro Familie)
    ├── Schulplaner (eigene Daten R/W)
    ├── Shopping-Liste lesen + Items hinzufügen
    ├── Gemeinsame Notizen lesen
    ├── Kalender lesen
    ├── Essensplan-Vorschläge
    ├── Gamification-Ansicht (eigene XP, Badges)
    └── KEIN Schreiben auf kritische Daten
```

### 3.2 Permission-Matrix

| Resource            | super_admin | family_admin | adult | child |
|---------------------|-------------|--------------|-------|-------|
| vault.*             | ✓           | ✓            | ✗     | ✗     |
| admin.*             | ✓           | ✗            | ✗     | ✗     |
| family.manage       | ✓           | ✓            | ✗     | ✗     |
| family.view         | ✓           | ✓            | ✓     | ✓     |
| users.manage        | ✓           | ✓ (Familie)  | ✗     | ✗     |
| shopping.write      | ✓           | ✓            | ✓     | ✓ (add only) |
| tasks.write         | ✓           | ✓            | ✓     | ✗     |
| notes.write         | ✓           | ✓            | ✓     | ✗     |
| calendar.write      | ✓           | ✓            | ✓     | ✗     |
| school.own.write    | ✓           | ✓            | ✓     | ✓     |
| meals.approve       | ✓           | ✓            | ✗     | ✗     |
| gamification.manage | ✓           | ✓            | ✗     | ✗     |
| gamification.view   | ✓           | ✓            | ✓     | ✓ (own) |
| audit.view          | ✓           | ✗            | ✗     | ✗     |

### 3.3 Guard-Implementierungskonzept

```typescript
// Basis-Guard-Hierarchie
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class RolesGuard implements CanActivate {
  // Prüft @Roles(['family_admin', 'super_admin']) Decorator
  // Liest user.role aus JWT-Payload
}

@Injectable()
export class FamilyMemberGuard implements CanActivate {
  // Prüft ob user Mitglied der angefragten Familie ist
  // family_id aus Route-Params oder Request-Body
}

@Injectable()
export class VaultAccessGuard extends FamilyMemberGuard {
  // Zusätzlich: Rolle muss family_admin oder super_admin sein
  // Jeder Zugriff wird automatisch in audit_logs geschrieben
}

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  // Prüft ob resource.created_by === request.user.id
  // Oder user ist family_admin
}
```

---

*Nächstes Dokument: 03-mobile-app-architecture.md (Phase 3)*
