/**
 * Expo Dynamic App Config
 *
 * Zieht alle umgebungsabhängigen Werte aus ENV-Variablen.
 * Statische app.json wird durch diese Datei ersetzt (Expo bevorzugt app.config.ts).
 *
 * Pflicht-ENV für Builds:
 *   APP_BUNDLE_ID    — iOS bundleIdentifier + Android package (z.B. com.meinefamilie.planner)
 *   EAS_PROJECT_ID   — Expo Application Services Project ID (aus eas.json / EAS Dashboard)
 *   EXPO_PUBLIC_API_URL — Backend API URL (z.B. https://api.meinedomain.de)
 *
 * Für lokale Entwicklung: .env.local anlegen (wird von Expo geladen)
 */

import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const bundleId = process.env.APP_BUNDLE_ID ?? 'com.familyplanner.app';
  const easProjectId = process.env.EAS_PROJECT_ID ?? '';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? process.env.API_URL ?? '';

  if (!bundleId || bundleId === 'com.familyplanner.app') {
    console.warn('[app.config] APP_BUNDLE_ID nicht gesetzt — verwende Standardwert.');
  }
  if (!easProjectId) {
    console.warn('[app.config] EAS_PROJECT_ID nicht gesetzt — EAS Build wird fehlschlagen.');
  }

  return {
    ...config,
    name: 'Family Planner',
    slug: 'family-planner-shanghai',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      bundleIdentifier: bundleId,
      supportsTablet: true,
      buildNumber: process.env.BUILD_NUMBER ?? '1',
      infoPlist: {
        NSCameraUsageDescription: 'Zum Fotografieren von Dokumenten und Rezepten',
        NSPhotoLibraryUsageDescription: 'Zum Hochladen von Fotos für Rezepte und Dokumente',
        NSPhotoLibraryAddUsageDescription: 'Zum Speichern von Fotos in deiner Bibliothek',
        // NSMicrophoneUsageDescription: entfernt — App nutzt kein Mikrofon.
        // Apple lehnt Apps ab, die den Usage String als "nicht verwendet" deklarieren.
        UIBackgroundModes: ['remote-notification'],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
        },
      },
    },
    android: {
      package: bundleId,
      versionCode: parseInt(process.env.VERSION_CODE ?? '1', 10),
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        // READ/WRITE_EXTERNAL_STORAGE entfernt — deprecated seit Android 10,
        // Google Play gibt Warning. expo-image-picker und expo-document-picker
        // nutzen MediaStore API direkt ohne diese Permissions.
        'android.permission.CAMERA',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#2563eb',
          sounds: [],
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Zum Hochladen von Fotos für Rezepte und Dokumente',
          cameraPermission: 'Zum Fotografieren von Dokumenten',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      apiUrl,
      eas: {
        projectId: easProjectId,
      },
    },
  };
};
