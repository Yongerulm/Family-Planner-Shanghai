/**
 * Offline Mutation Queue
 *
 * Problem: Wenn der User offline ist und z.B. ein Todo abhakt oder eine
 * Einkaufsliste ändert, schlägt der API-Request fehl und die Änderung geht verloren.
 *
 * Lösung:
 * - Fehlgeschlagene Mutations (POST/PATCH/DELETE) werden in MMKV gespeichert
 * - Bei Netzwerk-Reconnect werden alle gespeicherten Requests wiederholt
 * - MMKV ist synchron und überlebt App-Neustarts
 *
 * Nutzung:
 *   import { enqueueOfflineMutation, startOfflineQueueProcessor } from '@/lib/offlineQueue';
 *
 *   // In _layout.tsx: startOfflineQueueProcessor() aufrufen
 *   // Bei API-Fehler mit isNetworkError(): enqueueOfflineMutation({ method, url, data })
 */

import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from '../api/client';

const storage = new MMKV({ id: 'offline-queue' });
const QUEUE_KEY = 'fp_offline_mutations';

export interface OfflineMutation {
  id: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;           // relative URL, e.g. /families/xxx/shopping/yyy/items/zzz
  data?: unknown;
  enqueuedAt: number;    // Date.now()
  attempts: number;
}

function loadQueue(): OfflineMutation[] {
  try {
    const raw = storage.getString(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineMutation[];
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflineMutation[]): void {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Fügt eine fehlgeschlagene Mutation zur Queue hinzu.
 * Maximal 100 Einträge — älteste werden verworfen.
 */
export function enqueueOfflineMutation(
  mutation: Pick<OfflineMutation, 'method' | 'url' | 'data'>,
): void {
  const queue = loadQueue();

  const entry: OfflineMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method: mutation.method,
    url: mutation.url,
    data: mutation.data,
    enqueuedAt: Date.now(),
    attempts: 0,
  };

  const updated = [...queue, entry].slice(-100); // max 100 Einträge
  saveQueue(updated);
}

/**
 * Gibt true zurück wenn der Fehler auf einen Netzwerkausfall hinweist
 * (kein Response = Timeout/Offline, nicht ein 4xx/5xx vom Server).
 */
export function isOfflineError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const axiosError = error as { response?: unknown; code?: string };
  return (
    !axiosError.response ||
    axiosError.code === 'ECONNABORTED' ||
    axiosError.code === 'ERR_NETWORK'
  );
}

/**
 * Verarbeitet alle gespeicherten Mutations.
 * Wird bei Netzwerk-Reconnect aufgerufen.
 * Erfolgreich wiederholte Mutations werden aus der Queue gelöscht.
 * Nach 5 Fehlversuchen wird eine Mutation verworfen.
 */
async function processQueue(): Promise<void> {
  const queue = loadQueue();
  if (queue.length === 0) return;

  const remaining: OfflineMutation[] = [];

  for (const mutation of queue) {
    // Mutations älter als 7 Tage verwerfen
    if (Date.now() - mutation.enqueuedAt > 7 * 24 * 60 * 60 * 1000) {
      continue;
    }

    // Nach 5 Versuchen verwerfen
    if (mutation.attempts >= 5) {
      continue;
    }

    try {
      await apiClient.request({
        method: mutation.method,
        url: mutation.url,
        data: mutation.data,
      });
      // Erfolgreich → nicht wieder in die Queue
    } catch {
      // Fehlgeschlagen → mit erhöhtem Zähler zurück
      remaining.push({ ...mutation, attempts: mutation.attempts + 1 });
    }
  }

  saveQueue(remaining);
}

let unsubscribeNetInfo: (() => void) | null = null;

/**
 * Startet den Offline-Queue-Prozessor.
 * Muss einmal in _layout.tsx aufgerufen werden.
 * Lauscht auf NetInfo-Events und verarbeitet die Queue bei Reconnect.
 */
export function startOfflineQueueProcessor(): () => void {
  // Sofort beim Start versuchen (für den Fall, dass wir online sind
  // und beim letzten App-Start offline waren)
  processQueue().catch(() => {});

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      processQueue().catch(() => {});
    }
  });

  return () => {
    if (unsubscribeNetInfo) {
      unsubscribeNetInfo();
      unsubscribeNetInfo = null;
    }
  };
}

export function getQueueLength(): number {
  return loadQueue().length;
}
