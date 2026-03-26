/**
 * Push-Adapter-Schicht
 *
 * Design-Prinzip:
 * - Push ist OPTIONAL, niemals kritisch für den Kernbetrieb
 * - Das In-App Notification Center (DB-backed) ist die primäre Quelle der Wahrheit
 * - Push ist ein Enhancement, das fehlschlagen darf ohne die App zu brechen
 * - China: FCM ist unzuverlässig, APNs funktioniert meist, aber beide sind optional
 *
 * Ablauf:
 * 1. Notification in DB speichern (immer, unabhängig von Push)
 * 2. Push-Dispatch als fire-and-forget via BullMQ
 * 3. Bei Push-Fehler: Error in DB loggen, App holt beim nächsten Start nach
 */

export interface PushPayload {
  userId: string;
  deviceTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
}

export interface PushResult {
  success: boolean;
  error?: string;
  failedTokens?: string[];
}

/**
 * Abstrakte Basis-Klasse für Push-Adapter.
 * Konkrete Implementierungen: ApnsPushAdapter, FcmPushAdapter
 */
export abstract class PushAdapter {
  abstract readonly platform: 'apns' | 'fcm';

  abstract send(payload: PushPayload): Promise<PushResult>;

  abstract isConfigured(): boolean;
}
