'use client';

import { useEffect, useState } from 'react';
import { getStats } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Stats { totalUsers: number; totalFamilies: number; serverTime: string }

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('fp_access_token');
    if (!token) { router.push('/login'); return; }

    getStats()
      .then(setStats)
      .catch(() => { router.push('/login'); });
  }, [router]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <p className="text-gray-400">Laden…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard label="Registrierte Benutzer" value={stats.totalUsers} />
        <StatCard label="Familien" value={stats.totalFamilies} />
        <StatCard label="Server-Zeit" value={new Date(stats.serverTime).toLocaleString('de-DE')} />
      </div>
      <div className="mt-10 card">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Links</h2>
        <ul className="space-y-2 text-sm">
          <li><a href="/users" className="text-blue-600 hover:underline">→ Alle Benutzer verwalten</a></li>
          <li><a href="/families" className="text-blue-600 hover:underline">→ Alle Familien verwalten</a></li>
          <li>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/api/docs`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              → API Dokumentation (Swagger)
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
