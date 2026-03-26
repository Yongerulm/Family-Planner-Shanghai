'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { restoreSession } from '@/lib/api';

/**
 * Stellt den In-Memory Access Token bei Seiten-Reload wieder her.
 *
 * Flow bei Reload:
 * 1. Seite lädt → inMemoryAccessToken = null
 * 2. SessionRestorer ruft /api/auth/refresh auf
 * 3. Next.js Route Handler liest httpOnly Cookie → ruft NestJS /auth/refresh auf
 * 4. Neuer Access Token → in-memory gespeichert, API-Calls funktionieren wieder
 *
 * Wenn kein aktiver Session-Cookie vorhanden → Weiterleitung zu /login
 */
export default function SessionRestorer() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') return; // Kein Restore auf der Login-Seite nötig

    restoreSession().then((user) => {
      if (!user) {
        router.replace('/login');
      }
    });
  }, []); // Nur einmal beim Mount

  return null;
}
