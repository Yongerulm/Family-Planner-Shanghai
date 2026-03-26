# Datenschutzerklärung / Privacy Policy

**Letzte Aktualisierung / Last Updated:** 2024-01-01

**App:** Family Planner
**Entwickler / Developer:** [Dein Name]
**Kontakt / Contact:** [deine@email.de]

---

## Deutsch

### 1. Verantwortlicher

[Dein vollständiger Name]
[Deine Adresse]
[deine@email.de]

### 2. Welche Daten werden verarbeitet?

Family Planner speichert ausschließlich Daten, die Sie bewusst eingeben:

**Kontodaten:**
- E-Mail-Adresse (für Login)
- Passwort (verschlüsselt gespeichert, niemals lesbar)
- Anzeigename (optional)

**Familiendaten:**
- Einkaufslisten, Aufgaben, Notizen, Kalendereinträge
- Schulplaner-Daten (Stundenplan, Hausaufgaben, Noten)
- Dokumente im Vault (AES-256 verschlüsselt)
- Mahlzeiten-Pläne, Rezepte
- Gefriergerät-Inhalte
- Notfallvorrat-Liste

**Technische Daten:**
- Geräteplattform (iOS/Android) für Push-Benachrichtigungen
- IP-Adresse in Server-Logs (nicht dauerhaft gespeichert)

### 3. Datenspeicherung

Alle Daten werden **ausschließlich** auf Ihrem eigenen, selbst betriebenen Server gespeichert. Die App überträgt **keine Daten** an Apple, Google oder andere Dritte.

Push-Benachrichtigungen werden über Apple APNs (iOS) oder Firebase FCM (Android) übermittelt. Dabei werden nur Push-Token und ein Benachrichtigungstext übertragen — keine Familiendaten.

### 4. Datenweitergabe

Keine Weitergabe an Dritte. Keine Analytics. Keine Werbung.

### 5. Ihre Rechte

- Auskunft über gespeicherte Daten
- Löschung Ihres Kontos (über Einstellungen in der App)
- Datenexport (auf Anfrage an den Administrator Ihrer Familie)

### 6. Datensicherheit

- Passwörter: bcrypt mit individuellem Pepper
- Dokumente: AES-256-GCM Verschlüsselung
- Übertragung: ausschließlich HTTPS/TLS 1.2+
- JWT-Token: RS256, 15 Minuten Gültigkeit

### 7. Minderjährige

Die App kann von Kindern genutzt werden (Kinder-Rolle mit eingeschränkten Berechtigungen). Eltern/Erziehungsberechtigte verwalten die Konten der Kinder.

---

## English

### 1. Data Controller

[Your full name]
[Your address]
[your@email.com]

### 2. What data is processed?

Family Planner only stores data you explicitly enter:

**Account data:** Email address, encrypted password, display name

**Family data:** Shopping lists, tasks, notes, calendar events, school planner data, encrypted documents, meal plans, freezer contents, emergency supplies

**Technical data:** Device platform for push notifications, IP address in server logs (temporary)

### 3. Data Storage

All data is stored **exclusively** on your own self-hosted server. The app does **not** transmit data to Apple, Google, or any third party.

Push notifications are sent via Apple APNs (iOS) or Firebase FCM (Android). Only push tokens and notification text are transmitted — no family data.

### 4. Data Sharing

No third-party sharing. No analytics. No advertising.

### 5. Your Rights

- Access to your stored data
- Account deletion (via app settings)
- Data export (contact your family administrator)

### 6. Data Security

- Passwords: bcrypt with unique pepper
- Documents: AES-256-GCM encryption
- Transport: HTTPS/TLS 1.2+ only
- JWT tokens: RS256, 15-minute validity

### 7. Minors

The app supports child accounts with restricted permissions, managed by parents/guardians.

---

*Diese Datenschutzerklärung muss an deine spezifische Situation angepasst werden.*
*This privacy policy must be adapted to your specific situation.*
*Empfehlung: Rechtliche Überprüfung vor App-Store-Einreichung.*
