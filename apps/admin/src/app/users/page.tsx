'use client';

import { useEffect, useState } from 'react';
import { listUsers, deleteUser, updateUser } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  cachedRole: string;
  createdAt: string;
}

const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    super_admin: 'badge-admin',
    family_admin: 'badge-admin',
    adult: 'badge-adult',
    child: 'badge-child',
  };
  return map[role] ?? 'badge';
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(p = page, s = search) {
    setLoading(true);
    try {
      const res = await listUsers(p, 20, s || undefined);
      setUsers(res.data);
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

  async function handleDeactivate(id: string, isActive: boolean) {
    if (!confirm(isActive ? 'Benutzer deaktivieren?' : 'Benutzer aktivieren?')) return;
    await updateUser(id, { isActive: !isActive });
    load();
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Benutzer "${email}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    await deleteUser(id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Benutzer ({total})</h1>
        <div className="flex gap-3">
          <input
            type="search"
            placeholder="E-Mail suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(1, search); } }}
            className="input w-64"
          />
          <button onClick={() => { setPage(1); load(1, search); }} className="btn-secondary">Suchen</button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Laden…</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['E-Mail', 'Name', 'Rolle', 'Status', 'Erstellt', 'Aktionen'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.displayName}</td>
                  <td className="px-4 py-3">
                    <span className={roleBadge(u.cachedRole)}>{u.cachedRole}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.isActive ? 'badge bg-green-100 text-green-800' : 'badge-inactive'}>
                      {u.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <button
                      onClick={() => handleDeactivate(u.id, u.isActive)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      {u.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
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
              <button
                disabled={page === 1}
                onClick={() => { const p = page - 1; setPage(p); load(p); }}
                className="btn-secondary text-xs py-1"
              >
                ← Zurück
              </button>
              <button
                disabled={users.length < 20}
                onClick={() => { const p = page + 1; setPage(p); load(p); }}
                className="btn-secondary text-xs py-1"
              >
                Weiter →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
