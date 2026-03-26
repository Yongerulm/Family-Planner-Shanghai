'use client';

import { useEffect, useState } from 'react';
import { listFamilies, deleteFamily } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export default function FamiliesPage() {
  const router = useRouter();
  const [families, setFamilies] = useState<Family[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(p = page) {
    setLoading(true);
    try {
      const res = await listFamilies(p, 20);
      setFamilies(res.data);
      setTotal(res.total);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('fp_access_token')) { router.push('/login'); return; }
    load();
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Familie "${name}" wirklich löschen? ALLE Daten dieser Familie werden unwiderruflich gelöscht!`)) return;
    if (!confirm('Wirklich? Diese Aktion kann NICHT rückgängig gemacht werden.')) return;
    await deleteFamily(id);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Familien ({total})</h1>

      {loading ? (
        <p className="text-gray-400">Laden…</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Invite-Code', 'Erstellt', 'Aktionen'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {families.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{f.name}</td>
                  <td className="px-4 py-3">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{f.inviteCode}</code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(f.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleDelete(f.id, f.name)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-500">Seite {page}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="btn-secondary text-xs py-1">← Zurück</button>
              <button disabled={families.length < 20} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="btn-secondary text-xs py-1">Weiter →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
