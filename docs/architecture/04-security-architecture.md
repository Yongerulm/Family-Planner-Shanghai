# Phase 4: Sicherheitsarchitektur, Dokumententresor, Audit & Logging

---

## 1. Sicherheitsarchitektur: Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
│                                                                  │
│  Network Layer:   TLS 1.3, HSTS, Traefik-Middleware             │
│  API Layer:       Rate Limiting, Throttling, Input Validation    │
│  Auth Layer:      JWT, Refresh Token Rotation, Device Tracking  │
│  AuthZ Layer:     RBAC Guards, Resource-Level Permissions       │
│  Data Layer:      Encryption at Rest, Signed URLs              │
│  Audit Layer:     Immutable Audit Logs, Sensitive Action Trails │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication: JWT + Refresh Token System

### Token-Strategie

```
Access Token:
  - Typ: JWT (RS256 - asymmetrisch, nicht HS256)
  - Gültigkeit: 15 Minuten
  - Payload: { sub, email, role, familyId, deviceId }
  - Signing: Private Key im Secret, Public Key für Verification
  - Gespeichert: Nur in-memory / SecureStore (Keychain/Keystore)
  - NIEMALS in localStorage, AsyncStorage, MMKV

Refresh Token:
  - Typ: Opaque Token (zufälliger 64-Byte Hex-String)
  - Gültigkeit: 30 Tage
  - Gespeichert: DB (token_hash = SHA-256 des Tokens), SecureStore auf Client
  - Rotation: Bei jedem Refresh wird neues Refresh Token ausgegeben
    (altes wird sofort invalidiert)
  - Familie: Refresh Token ist gerätebunden (device_id)
  - Erkennung von Token-Reuse: Wenn altes Refresh Token nochmals verwendet
    wird → ALLE Tokens des Users invalidieren (Kompromittierungsindiz)
```

### Token-Invalidierung

```
Gründe für sofortige Invalidierung aller User-Tokens:
  - Passwort-Änderung
  - Account-Deaktivierung
  - Verdächtiger Token-Reuse erkannt
  - Expliziter Logout auf allen Geräten

Implementierung:
  - token_version Feld in users Tabelle
  - Bei Invalidierung: token_version++
  - JWT enthält token_version
  - API prüft: user.token_version === jwt.tokenVersion
```

---

## 3. Rollenbasierte Zugriffskontrolle (RBAC)

### Guard-Dekoratoren

```typescript
// Verwendung am Controller
@Controller('vault')
@UseGuards(JwtAuthGuard, RolesGuard, FamilyMemberGuard)
export class VaultController {

  @Get(':id/download')
  @Roles('family_admin', 'super_admin')  // Nur diese Rollen
  @AuditLog('vault.document.download')   // Automatisches Audit
  async downloadDocument(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) { ... }
}
```

### Hierarchische Permission-Prüfung

```
1. JwtAuthGuard: Ist Token valide?
2. RolesGuard: Hat User die erforderliche Rolle?
3. FamilyMemberGuard: Gehört User zur angefragten Familie?
4. ResourceOwnerGuard: Ist User Eigentümer der Resource?
   (oder family_admin?)
5. Spezifische Guards (VaultAccessGuard etc.)
```

---

## 4. Input Validation und Sanitization

```typescript
// Jedes DTO verwendet class-validator + class-transformer
import { IsString, IsUUID, IsEmail, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeHtml } from '../utils/sanitize';

export class CreateNoteDto {
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsString()
  @MaxLength(50_000) // Maximale Notizgröße
  @Transform(({ value }) => sanitizeHtml(value)) // HTML-Strip
  content: string;
}
```

### Global Validation Pipe

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,        // Unbekannte Felder entfernen
  forbidNonWhitelisted: true, // Fehler bei unbekannten Feldern
  transform: true,        // Automatische Typ-Transformation
  transformOptions: { enableImplicitConversion: true },
}));
```

### SQL Injection Prävention

- Ausschließlich TypeORM mit Query Builder oder parametrisierten Queries
- Kein String-Concatenation in SQL
- Raw Queries nur mit expliziten Parametern (`:param` Notation)
- Kein direktes User-Input in PostgreSQL LIKE ohne Escaping

---

## 5. Rate Limiting und Throttling

```typescript
// Globales Rate Limiting via @nestjs/throttler + Redis
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1_000,   // 1 Sekunde
    limit: 10,    // max 10 Requests
  },
  {
    name: 'medium',
    ttl: 60_000,  // 1 Minute
    limit: 100,   // max 100 Requests
  },
  {
    name: 'long',
    ttl: 3_600_000, // 1 Stunde
    limit: 1000,
  },
])

// Spezifische Limits für sensible Endpunkte:
@Throttle({ short: { limit: 5, ttl: 60_000 } }) // 5/Minute
@Post('auth/login')

@Throttle({ short: { limit: 3, ttl: 3_600_000 } }) // 3/Stunde
@Post('auth/forgot-password')

@Throttle({ short: { limit: 2, ttl: 86_400_000 } }) // 2/Tag
@Post('vault/documents') // Upload-Limit
```

---

## 6. CSRF-Schutz (Admin Web Panel)

```
Admin-Panel ist Next.js SSR:
  - Kein CSRF-Token bei Cookie-freier JWT-Auth
  - Admin-Panel verwendet httpOnly Cookies für Session
  - CSRF-Protection via Double-Submit Cookie Pattern
  - SameSite=Strict für Admin-Cookies
  - X-CSRF-Token Header Required für Mutations

API selbst:
  - Nur Bearer Token Auth → kein CSRF erforderlich
  - Keine Cookie-basierte Auth für die API
```

---

## 7. Secret Management

```
Prinzipien:
  1. Keine Secrets im Repository (je)
  2. Alle Secrets in .env-Dateien (Docker Compose env_file)
  3. Produktions-.env niemals ins Git
  4. Verschiedene Secrets für Dev / Stage / Prod

Kritische Secrets:
  - JWT_PRIVATE_KEY (RSA 2048 Bit)
  - JWT_PUBLIC_KEY
  - DB_PASSWORD
  - REDIS_PASSWORD
  - MINIO_SECRET_KEY
  - VAULT_ENCRYPTION_KEY (AES-256, 32 Byte)
  - APNS_PRIVATE_KEY
  - FCM_SERVER_KEY
  - WEATHER_API_KEY

Key Rotation:
  - JWT Keys: Rotation alle 90 Tage (altes Public Key für
    Grace Period behalten)
  - VAULT_ENCRYPTION_KEY: NIEMALS rotieren ohne Migration
    (bestehende Dateien müssen re-verschlüsselt werden)
  - DB/Redis Passwörter: Rotation nach Bedarf

Vault Encryption Key Backup:
  - Key in sicherem Offline-Speicher (Passwort-Manager)
  - Ohne diesen Key sind Vault-Dokumente permanent verloren
  - WARNUNG: Dieser Aspekt ist kritisch
```

---

## 8. Dokumententresor-Architektur

### Upload-Flow

```
Client (family_admin) → API → Validation → Encrypt → MinIO

Schritt für Schritt:
1. Client sendet Datei via Multipart/Form-Data
2. API validiert:
   - Rolle (family_admin oder super_admin)
   - Dateigröße (max 50MB pro Datei)
   - MIME-Type Whitelist (PDF, JPG, PNG, DOCX, etc.)
   - Virus-Scan: ClamAV optional (on-VPS)
3. Datei im RAM (nicht auf Disk) verschlüsseln:
   - AES-256-GCM
   - IV: 12 Byte random (sicher für GCM)
   - Key: VAULT_ENCRYPTION_KEY aus Env
   - AAD (Additional Authenticated Data): document_id + user_id
     (verhindert Ciphertext-Swapping zwischen Dokumenten)
4. Verschlüsselte Datei an MinIO hochladen:
   - Bucket: 'vault' (private, kein public access)
   - Key: {familyId}/{documentId}/{randomSuffix}.enc
5. Metadata in DB speichern (encryption_iv, storage_key, checksum)
6. Audit Log schreiben
```

### Download-Flow

```
Client → API → Auth-Check → Presigned URL → Client → MinIO → Decrypt

Schritt für Schritt:
1. Client fragt Download an
2. API validiert Rolle + Familienzugehörigkeit
3. API schreibt Audit-Log-Eintrag (BEVOR Download ermöglicht wird)
4. API fragt MinIO nach Presigned URL:
   - Gültigkeit: 60 Sekunden
   - Method: GET
   - Spezifischer Object Key
5. API gibt Presigned URL an Client zurück
6. Client downloaded direkt von MinIO (entlastet API)
7. Client entschlüsselt mit AES-256-GCM:
   - Encryption IV aus API-Response (nicht in MinIO-URL)
   - Key: Wird NICHT an Client gesendet

WICHTIG: Client kann NICHT selbst entschlüsseln ohne API.
Alternative: API entschlüsselt und streamt → sicherer, aber mehr Last.
Empfehlung: API streamt entschlüsselt (kein Key auf Client).
```

### Vault-Sicherheitsgarantien

```
✓ Dateien nicht direkt öffentlich erreichbar (Private MinIO Bucket)
✓ Presigned URLs zeitlich begrenzt (60 Sekunden)
✓ Jeder Zugriff in audit_logs protokolliert
✓ AES-256-GCM Verschlüsselung (authentifiziert, kein Ciphertext-Tampering)
✓ Nur family_admin und super_admin haben Zugriff
✓ Soft Delete verhindert sofortigen Datenverlust bei Fehlern
✓ Checksummen-Verifikation bei Download (SHA-256)
✗ Key-Material NICHT auf Client (immer server-seitig)
```

---

## 9. Passwort-Policies

```
Mindestanforderungen:
  - Mindestlänge: 10 Zeichen
  - Muss enthalten: Groß- + Kleinbuchstaben + Ziffer
  - Maximallänge: 128 Zeichen
  - Keine Passwort-History (zu komplex für Single-Family-App)
  - Kein Passwort-Ablauf (zu nervig, schwächt Sicherheitsverhalten)

Hashing:
  - Algorithmus: bcrypt mit cost factor 12
  - Kein SHA-* direkt für Passwörter
  - Pepper: BCRYPT_PEPPER env var (zusätzlich zu salt)
    → Datenbankdump allein reicht nicht für Brute-Force

Brute-Force-Schutz:
  - 5 fehlgeschlagene Logins → Account für 15 Minuten gesperrt
  - Lockout-Status in Redis (nicht DB, um Performance zu schonen)
  - Benachrichtigung bei Lockout
```

---

## 10. Sichere Datei-Uploads (allgemein)

```typescript
// Nicht-Vault Uploads (Avatare, Rezeptbilder etc.)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Validation:
// 1. Größencheck VOR Buffer-Erstellung
// 2. MIME-Type via 'file-type' Library (nicht nur Content-Type Header)
//    → Header kann gefälscht werden
// 3. Filename sanitization: nur alphanumerisch + Bindestrich
// 4. Eigener Filename generieren (UUID), Original-Name nur in DB
// 5. Separat von API-Disk: nur zu MinIO, niemals auf API-Filesystem

// Virus-Scan (optional, wenn ClamAV auf VPS):
// Scan vor Upload zu MinIO
// Bei Fund: Datei verwerfen, Audit-Log, Benachrichtigung an Admin
```

---

## 11. Bedrohungsmodell

### Angriffsvektoren und Gegenmaßnahmen

| Bedrohung | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme |
|-----------|-------------------|-----------|---------------|
| Credential Brute-Force | Mittel | Hoch | Rate Limiting, Account-Lockout |
| SQL Injection | Niedrig | Kritisch | Parameterized Queries, TypeORM |
| JWT-Fälschung | Niedrig | Kritisch | RS256 (asymmetrisch), kurze Gültigkeit |
| Refresh Token Diebstahl | Niedrig | Hoch | Rotation, Reuse-Detection, SecureStore |
| Vault-Datei unautorisierter Zugriff | Niedrig | Kritisch | Presigned URLs, Encryption, Guards |
| XSS im Admin-Panel | Mittel | Hoch | CSP Headers, React's Auto-Escaping |
| MITM-Angriff | Niedrig | Kritisch | TLS 1.3, HSTS, HPKP |
| Insider-Threat | Niedrig | Hoch | Audit Logs, Least-Privilege |
| DoS auf API | Mittel | Mittel | Rate Limiting, Traefik-Middleware |
| Datenleck durch Logging | Mittel | Mittel | Log-Sanitization (kein PW, kein Token) |
| Kontokompromittierung durch Kind | Niedrig | Mittel | Kinderrolle stark eingeschränkt |
| VPS-Kompromittierung | Sehr niedrig | Kritisch | Verschlüsselte Vault-Dateien, Backups |

### Kritischste Risiken

1. **VAULT_ENCRYPTION_KEY Verlust** → Vault-Dokumente permanent verloren
   - Gegenmaßnahme: Offline-Backup in Passwort-Manager, keine Rotation ohne Migration

2. **Refresh Token Diebstahl** → Dauerhafte Kontoübernahme
   - Gegenmaßnahme: Token Rotation + Reuse Detection + kurze Gültigkeit

3. **VPS-Kompromittierung** → Alle Daten exponiert
   - Gegenmaßnahme: Vault-Verschlüsselung (Key in Env, nicht DB), regelmäßige Backups

---

## 12. Audit Logging

### Was wird geloggt

```
IMMER geloggt:
  - auth.login.success / auth.login.failed
  - auth.logout
  - auth.password.changed
  - vault.document.upload
  - vault.document.download
  - vault.document.delete
  - users.role.changed
  - family.member.added / removed
  - admin.*

OPTIONAL (konfigurierbar):
  - shopping.item.checked
  - tasks.completed
  - school.grade.added
```

### Log-Format

```typescript
interface AuditLogEntry {
  id: string;           // UUID
  userId: string;       // Wer hat gehandelt?
  familyId?: string;    // In welcher Familie?
  action: string;       // z.B. 'vault.document.download'
  resource: string;     // z.B. 'VaultDocument'
  resourceId?: string;  // ID der betroffenen Entity
  ipAddress: string;    // Maskiert: letzte Stelle 0 (Privacy)
  userAgent?: string;   // Gekürzt
  metadata?: Record<string, unknown>; // Zusätzliche Infos (nie PII)
  createdAt: Date;      // Unveränderlich
}
```

### Audit Log Schutz

```
- Kein UPDATE auf audit_logs via API
- Kein DELETE auf audit_logs via API
- Separate DB-Rolle für Audit-Tabelle (READ-ONLY für API-User)
- Nur super_admin kann Audit Logs lesen
- Retention: Mindestens 365 Tage (konfigurierbar)
- Optional: Export zu sicherem Offline-Speicher
```

---

## 13. Logging ohne Datenleck

```typescript
// Logger-Konfiguration (Winston)
const logger = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    // KRITISCH: Sensible Felder maskieren
    winston.format((info) => {
      const sensitiveFields = ['password', 'token', 'authorization',
                               'encryption_iv', 'secret', 'cookie'];
      sensitiveFields.forEach(field => {
        if (info[field]) info[field] = '[REDACTED]';
      });
      return info;
    })(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' }),
  ],
});
```

### HTTP Request Logging

```
Geloggt: Method, Path, StatusCode, ResponseTime, UserID
NICHT geloggt: Request-Body, Authorization-Header, Cookies
Ausnahmen: POST /auth/login → nur Status, kein Body
```

---

## 14. Security Headers (Traefik Middleware)

```yaml
# Traefik Security Headers Middleware
http:
  middlewares:
    security-headers:
      headers:
        frameDeny: true                          # X-Frame-Options: DENY
        contentTypeNosniff: true                  # X-Content-Type-Options
        browserXssFilter: true                    # X-XSS-Protection
        referrerPolicy: "strict-origin-when-cross-origin"
        permissionsPolicy: "camera=(), microphone=(), geolocation=()"
        customResponseHeaders:
          X-Powered-By: ""                        # Server-Info entfernen
        contentSecurityPolicy: >
          default-src 'self';
          script-src 'self';
          style-src 'self' 'unsafe-inline';
          img-src 'self' data:;
          connect-src 'self' api.yourdomain.tld;
          frame-ancestors 'none'
        stsSeconds: 31536000                      # HSTS 1 Jahr
        stsIncludeSubdomains: true
        stsPreload: true
```

---

*Nächstes Dokument: 05-deployment-architecture.md (Phase 5)*
