# Phase 3: Mobile App Architektur, Offline/Sync, Navigation, UI

---

## 1. Projektstruktur (React Native + Expo Prebuild)

```
mobile/
├── android/                    # Native Android (nach expo prebuild generiert)
├── ios/                        # Native iOS (nach expo prebuild generiert)
├── src/
│   ├── app/                    # Expo Router v3 (file-based routing)
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── (adult)/            # Adult/Parent Layout
│   │   │   ├── _layout.tsx     # Bottom Tab Navigator
│   │   │   ├── dashboard.tsx
│   │   │   ├── shopping/
│   │   │   │   ├── index.tsx
│   │   │   │   └── [listId].tsx
│   │   │   ├── tasks/
│   │   │   ├── calendar/
│   │   │   ├── meals/
│   │   │   ├── notes/
│   │   │   ├── freezer/
│   │   │   ├── weather/
│   │   │   ├── vault/          # family_admin only
│   │   │   ├── emergency/
│   │   │   └── settings/
│   │   ├── (child)/            # Child Layout
│   │   │   ├── _layout.tsx     # Vereinfachte Navigation
│   │   │   ├── dashboard.tsx
│   │   │   ├── school/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── homework.tsx
│   │   │   │   ├── timetable.tsx
│   │   │   │   ├── exams.tsx
│   │   │   │   └── packing.tsx
│   │   │   ├── shopping/
│   │   │   ├── gamification/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── rewards.tsx
│   │   │   │   └── badges.tsx
│   │   │   └── meals/
│   │   └── _layout.tsx         # Root Layout (Auth-Gate)
│   │
│   ├── features/               # Feature-Module (Domänengrenzen)
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   └── auth.api.ts
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── store/
│   │   │   │   └── auth.store.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   ├── shopping/
│   │   │   ├── api/
│   │   │   │   └── shopping.api.ts
│   │   │   ├── components/
│   │   │   │   ├── ShoppingListCard.tsx
│   │   │   │   ├── ShoppingItemRow.tsx
│   │   │   │   └── AddItemSheet.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useShoppingLists.ts
│   │   │   │   └── useShoppingItems.ts
│   │   │   └── types/
│   │   │       └── shopping.types.ts
│   │   ├── tasks/
│   │   ├── notes/
│   │   ├── calendar/
│   │   ├── meals/
│   │   ├── school/
│   │   ├── freezer/
│   │   ├── weather/
│   │   ├── vault/
│   │   ├── emergency/
│   │   └── gamification/
│   │
│   ├── shared/                 # Shared, feature-unabhängige Teile
│   │   ├── components/
│   │   │   ├── ui/             # Primitive UI-Komponenten
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   └── index.ts    # Barrel Export
│   │   │   ├── layout/
│   │   │   │   ├── Screen.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── SafeArea.tsx
│   │   │   ├── feedback/
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── OfflineBanner.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── EmptyState.tsx
│   │   │   └── notifications/
│   │   │       └── NotificationCenter.tsx
│   │   ├── api/
│   │   │   ├── client.ts       # Axios-Instanz mit Interceptors
│   │   │   ├── queryClient.ts  # TanStack Query Client Konfiguration
│   │   │   └── types.ts        # API-Basis-Typen
│   │   ├── cache/
│   │   │   ├── mmkv.ts         # MMKV Storage Instance
│   │   │   ├── queryPersister.ts # TanStack Query Persister
│   │   │   └── pendingQueue.ts # Offline Pending Queue
│   │   ├── sync/
│   │   │   ├── SyncManager.ts
│   │   │   └── conflictResolver.ts
│   │   ├── hooks/
│   │   │   ├── useNetworkStatus.ts
│   │   │   ├── useSyncStatus.ts
│   │   │   └── useFamilyContext.ts
│   │   ├── theme/
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   ├── shadows.ts
│   │   │   └── index.ts
│   │   ├── i18n/
│   │   │   ├── de.json         # Deutsch
│   │   │   ├── en.json         # Englisch
│   │   │   ├── zh.json         # Chinesisch (optional)
│   │   │   └── i18n.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── format.ts
│   │       └── validation.ts
│   │
│   └── config/
│       ├── env.ts              # Typsichere Env-Variablen
│       └── constants.ts
│
├── assets/
│   ├── fonts/                  # Lokal gebündelte Fonts (keine Google Fonts)
│   ├── images/
│   └── icons/
├── app.json                    # Expo Konfiguration
├── app.config.ts               # Dynamische Expo Konfiguration
├── babel.config.js
├── tsconfig.json
├── package.json
└── .env.local                  # Lokale Umgebungsvariablen (nicht committen)
```

---

## 2. Benennungskonventionen

| Element | Konvention | Beispiel |
|---------|------------|---------|
| Komponenten | PascalCase | `ShoppingItemRow.tsx` |
| Hooks | camelCase mit `use` | `useShoppingLists.ts` |
| API-Dateien | kebab-case `.api.ts` | `shopping.api.ts` |
| Typen | PascalCase mit `.types.ts` | `shopping.types.ts` |
| Store | camelCase `.store.ts` | `auth.store.ts` |
| Screens (Expo Router) | kebab-case | `[listId].tsx` |
| Feature-Ordner | lowercase | `shopping/`, `school/` |
| Konstanten | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |

---

## 3. State-Management-Ansatz

### Drei Ebenen

```
1. Server State    → TanStack Query (remote data, caching, sync)
2. Persistent State → Zustand + MMKV (auth token, user preferences, pending queue)
3. Local UI State  → React useState/useReducer (forms, modals, transient UI)
```

**Warum kein Redux:**
Redux wäre Overengineering für diesen Use-Case. TanStack Query ersetzt 80% der State-Management-Anforderungen für Server-Daten. Zustand ist leichtgewichtig für persistenten State.

### TanStack Query Konfiguration

```typescript
// shared/api/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 Minuten
      gcTime: 1000 * 60 * 60 * 24,    // 24h im Cache behalten
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      networkMode: 'offlineFirst',     // Kritisch für China/Offline
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});
```

### MMKV für persistenten Storage

```typescript
// shared/cache/mmkv.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'family-planner-storage',
  encryptionKey: getDeviceEncryptionKey(), // Gerätespezifischer Key
});

// Zustand Persist Middleware mit MMKV
const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};
```

---

## 4. Auth Flow

```
App Start
  │
  ├─► Check MMKV: accessToken vorhanden?
  │     │
  │     ├─► Nein → AuthStack (Login/Register)
  │     │
  │     └─► Ja → Token valide?
  │               │
  │               ├─► Ja → App starten, Background-Refresh
  │               │
  │               └─► Nein → refreshToken noch gültig?
  │                           │
  │                           ├─► Ja → Neuen accessToken holen
  │                           │       → App starten
  │                           │
  │                           └─► Nein → Logout, AuthStack

Login erfolgreich:
  → Speichere accessToken + refreshToken in SecureStore (Keychain/Keystore)
  → Speichere user_id, family_id, role in MMKV
  → Starte App im richtigen Layout (adult/child basierend auf Rolle)
```

### Token-Verwaltung

```typescript
// SecureStore für Tokens (iOS Keychain, Android Keystore)
import * as SecureStore from 'expo-secure-store';

// MMKV für non-sensitive user data
// Kein accessToken in AsyncStorage oder MMKV (zu unsicher)
```

---

## 5. Caching-Strategie

### Cache-Schichten

```
1. In-Memory Cache (TanStack Query)
   - Sofortige UI-Updates
   - Optimistic Updates
   - Automatische Invalidierung

2. Persistierter Query Cache (MMKV via createAsyncStoragePersister)
   - Überlebt App-Neustarts
   - Sofortige Anzeige beim Start (stale-while-revalidate)
   - Konfigurierbar welche Queries persistiert werden

3. Offline Pending Queue (MMKV)
   - Schreiboperationen die offline durchgeführt wurden
   - Werden bei Wiederverbindung automatisch gesendet
```

### Was wird persistiert

| Daten | Persistiert | Strategie |
|-------|-------------|-----------|
| Shopping Lists | Ja | Full Cache |
| Shopping Items | Ja | Full Cache |
| Todo Items | Ja | Full Cache |
| Notizen | Ja | Full Cache (letzte 50) |
| Kalender-Events | Ja | Aktueller Monat ±1 |
| Schulplan | Ja | Aktuelle Woche |
| Wetterdaten | Ja | Letzter Snapshot |
| Vault Dokumente | Nein | Immer fresh (Sicherheit) |
| Audit Logs | Nein | Immer fresh |
| XP/Gamification | Ja | Eigene Daten |

---

## 6. Offline-Sync-Konzept

### Pending Queue

```typescript
// shared/cache/pendingQueue.ts
interface PendingOperation {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  method: string;
  payload: unknown;
  timestamp: number;
  attempts: number;
  maxAttempts: number; // default: 10
  optimisticId?: string; // für neue Entities
}
```

### Sync-Ablauf

```
Offline-Schreiben:
  1. Optimistic Update im lokalen Cache (TanStack Query setQueryData)
  2. Operation in PendingQueue speichern (MMKV)
  3. UI zeigt "pending" Indikator

Wiederverbindung (NetInfo Event):
  1. PendingQueue prüfen
  2. Operationen sequenziell senden (Reihenfolge ist wichtig!)
  3. Bei Erfolg: Operation aus Queue entfernen
  4. Bei Fehlschlag: attempts++ , bei maxAttempts → Conflict-UI
  5. Nach Flush: Full-Sync vom Server (Delta-Endpoint)

Konflikt-Strategie: Last-Write-Wins mit Timestamp
  - Jede Operation hat einen client_timestamp
  - Server vergleicht mit server_updated_at
  - Bei Konflikt: Server-Version gewinnt, Client wird benachrichtigt
  - Kritische Konflikte (z.B. gelöscht vs. editiert): Conflict-UI
```

### SyncManager

```typescript
// shared/sync/SyncManager.ts
class SyncManager {
  async flushPendingQueue(): Promise<void>
  async performDeltaSync(lastSyncToken: string): Promise<SyncResult>
  async resolveConflict(conflict: SyncConflict): Promise<void>

  // Wird von NetInfo aufgerufen wenn Verbindung wiederkehrt
  onNetworkReconnect(): void
}
```

---

## 7. Navigationsstruktur

### Root Layout (Auth Gate)

```
App Root
  ├── (auth)/          → Nicht eingeloggt
  │   ├── login
  │   ├── register
  │   └── forgot-password
  │
  └── (app)/           → Eingeloggt
      ├── (adult)/     → Rolle: adult, family_admin, super_admin
      │   └── [Bottom Tabs]
      │       ├── Dashboard
      │       ├── Listen (Shopping + Tasks)
      │       ├── Kalender
      │       ├── Mehr (Meals, Freezer, Weather, Notes, ...)
      │       └── Einstellungen
      │
      └── (child)/     → Rolle: child
          └── [Bottom Tabs]
              ├── Dashboard (XP, Streak, Aufgaben heute)
              ├── Schule (Stundenplan, Hausaufgaben, Prüfungen)
              ├── Gamification (Badges, Rewards)
              └── Einkaufsliste
```

### Screen-Hierarchie (Adult Mode)

```
Dashboard
  ├── Notifikations-Center
  ├── Familien-Widget-Overview
  └── Quick-Actions

Shopping Stack
  ├── Listen-Übersicht
  ├── Listen-Detail + Items
  └── Item-Bearbeiten (Bottom Sheet)

Kalender Stack
  ├── Monatsansicht
  ├── Tagesansicht
  ├── Event-Detail
  └── Event-Erstellen/Bearbeiten

Tasks Stack
  ├── Listen-Übersicht
  ├── Listen-Detail
  └── Task-Detail

Mehr Stack (Drawer oder Tab)
  ├── Notizen
  ├── Essensplan
  ├── Rezepte
  ├── Gefrierschrank
  ├── Wetter
  ├── Dokumententresor (nur family_admin)
  └── Katastrophenvorsorge
```

### Screen-Hierarchie (Child Mode)

```
Dashboard
  ├── Streak-Anzeige
  ├── XP-Bar
  ├── Aufgaben heute
  └── Prüfungs-Countdown

Schule Stack
  ├── Stundenplan (Heute-Ansicht + Wochenplan)
  ├── Hausaufgaben (nach Fach)
  ├── Prüfungen (mit Countdown)
  ├── Packliste (für morgen)
  └── Vokabeln

Gamification Stack
  ├── Profil (Level, XP)
  ├── Badges (gesammelt + ausstehend)
  ├── Rewards (einlösen)
  └── Leaderboard (Familie)

Shopping
  └── Liste lesen + Items hinzufügen
```

---

## 8. API Client Layer

```typescript
// shared/api/client.ts
const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 10_000, // 10 Sekunden (China-optimiert)
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': Config.APP_VERSION,
    'X-Platform': Platform.OS,
  },
});

// Request Interceptor: Auth Token anhängen
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Token-Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(error.config);
    }
    return Promise.reject(error);
  }
);

// Retry-Logik via axios-retry
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.response?.status === 503,
});
```

---

## 9. Theme-System

```typescript
// shared/theme/colors.ts
export const Colors = {
  // Semantic Colors
  primary: '#4F46E5',       // Indigo
  primaryLight: '#6366F1',
  secondary: '#10B981',     // Emerald
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',

  // Neutral
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',

  // Dark Mode
  dark: {
    background: '#111827',
    surface: '#1F2937',
    border: '#374151',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
  },

  // Feature Colors
  shopping: '#F59E0B',
  tasks: '#3B82F6',
  calendar: '#8B5CF6',
  school: '#10B981',
  gamification: '#F59E0B',
  vault: '#EF4444',
  weather: '#0EA5E9',
};
```

---

## 10. Error Handling

### Ebenen

```
1. API-Level: Axios Interceptors (401, 503, Timeout)
2. Query-Level: TanStack Query onError Callbacks + Error State
3. Component-Level: ErrorBoundary für unerwartete Fehler
4. Global: Unhandled Promise Rejection Handler
```

### ErrorBoundary

```tsx
// shared/components/feedback/ErrorBoundary.tsx
// Catch React render errors
// Zeige Fallback-UI mit "Neu laden" Button
// Logge Error (lokal, kein externer Dienst erforderlich)
```

### Offline-Banner

```tsx
// Zeige bei Offline-Status permanent sichtbaren Banner
// "Offline – Änderungen werden gespeichert"
// Zeige Pending-Queue-Größe wenn > 0
// Verschwindet bei Wiederverbindung nach kurzer Verzögerung
```

---

*Nächstes Dokument: 04-security-architecture.md (Phase 4)*
