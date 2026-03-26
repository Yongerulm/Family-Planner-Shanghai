# Release Checklist

## Backend / Server
- [ ] VPS läuft, alle Container `healthy` (`docker compose ps`)
- [ ] `api.yourdomain.tld` erreichbar, HTTPS grünes Schloss
- [ ] `admin.yourdomain.tld` erreichbar, Login funktioniert
- [ ] Migrationen alle durchgelaufen (`docker compose logs api | grep Migration`)
- [ ] Backup-Cron eingerichtet (`crontab -l`)
- [ ] Seed-Daten entfernt oder Passwörter geändert
- [ ] `SWAGGER_ENABLED=false` in .env
- [ ] JWT Keys generiert (nicht die Default-Keys!)
- [ ] VAULT_ENCRYPTION_KEY gesetzt und sicher gespeichert
- [ ] APNS Key für iOS Push konfiguriert

## iOS Build
- [ ] Bundle Identifier gesetzt: `com.deinname.familyplanner`
- [ ] Provisioning Profile: Distribution (App Store)
- [ ] Signing Certificate: Apple Distribution
- [ ] App Icon: alle Größen vorhanden (1024×1024 PNG)
- [ ] Splash Screen vorhanden
- [ ] Notification Icon vorhanden
- [ ] `eas.json` → `extra.eas.projectId` gesetzt
- [ ] EAS Build ausgeführt: `eas build --platform ios --profile production`
- [ ] Testflug auf echtem Gerät (nicht nur Simulator)
- [ ] App Store Connect: App erstellt, Bundle ID konfiguriert
- [ ] App Store Connect: App-Info ausgefüllt (Name, Kategorie, Rating)
- [ ] Screenshots hochgeladen (5 Screenshots für 6.7")
- [ ] Datenschutzerklärung URL hinterlegt
- [ ] Datenverarbeitungsangaben (App Privacy) ausgefüllt

## Android Build
- [ ] Package Name gesetzt: `com.deinname.familyplanner`
- [ ] Keystore generiert und sicher gespeichert:
      `eas credentials` oder manuell:
      `keytool -genkey -v -keystore release.keystore -alias family -keyalg RSA -keysize 2048 -validity 10000`
- [ ] Keystore-Passwort sicher gespeichert (Passwort-Manager!)
- [ ] App Icon: Adaptive Icon vorhanden
- [ ] EAS Build: `eas build --platform android --profile production`
- [ ] APK auf Testgerät installiert und getestet
- [ ] Google Play Console: App erstellt
- [ ] Inhaltsbewertung ausgefüllt
- [ ] Datenschutzerklärung URL hinterlegt
- [ ] Internal Testing → Closed Testing → Production

## Funktionstest vor Release
- [ ] Login / Logout
- [ ] Einkaufsliste: erstellen, Artikel hinzufügen, abhaken
- [ ] Aufgabe: erstellen, Fälligkeit, erledigen → XP sehen
- [ ] Kalender: Termin erstellen, Erinnerung testen
- [ ] Schulplaner: Hausaufgabe eintragen und erledigen
- [ ] Push-Notification empfangen (echter Test auf Gerät)
- [ ] Offline: App im Flugzeugmodus testen, dann Sync
- [ ] Admin Panel: Login als family_admin, Benutzer sehen

## Manuell zu erledigende Schritte VOR Go-Live

1. **Apple Developer Account** (~100 USD/Jahr)
   - https://developer.apple.com/programs/enroll/
   - Bundle Identifier registrieren
   - APNs Key erstellen (Push Notifications)

2. **EAS Account** (kostenlos für privaten Gebrauch)
   - `npx eas-cli login`
   - `npx eas-cli init` (im apps/mobile Verzeichnis)
   - Project ID in app.json eintragen

3. **Google Play Console** (~25 USD einmalig)
   - https://play.google.com/console
   - App erstellen
   - Service Account Key für `eas submit` erstellen

4. **App Store Connect**
   - https://appstoreconnect.apple.com
   - App erstellen mit korrektem Bundle Identifier

5. **Domain + DNS**
   - A-Record: `api.yourdomain.tld` → VPS IP
   - A-Record: `admin.yourdomain.tld` → VPS IP
   - A-Record: `status.yourdomain.tld` → VPS IP (optional)
   - TTL: 300 (5 Minuten) für schnelles Update

6. **Hostinger VPS (min. Empfehlung für Familiengebrauch)**
   - Plan: KVM 2 (2 CPU, 8GB RAM, 100GB SSD) ~12 USD/Monat
   - OS: Ubuntu 22.04 LTS
   - Snapshot-Backup in Hostinger Panel aktivieren
