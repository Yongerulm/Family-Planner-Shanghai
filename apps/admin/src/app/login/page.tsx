'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.user.role !== 'super_admin' && result.user.role !== 'family_admin') {
        setError('Kein Admin-Zugang. Nur super_admin und family_admin können sich einloggen.');
        return;
      }

      localStorage.setItem('fp_access_token', result.accessToken);
      localStorage.setItem('fp_refresh_token', result.refreshToken);
      localStorage.setItem('fp_user_role', result.user.role);

      router.push('/dashboard');
    } catch {
      setError('Login fehlgeschlagen. E-Mail oder Passwort falsch.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Family Planner</h1>
            <p className="text-sm text-gray-500 mt-1">Admin Panel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">E-Mail</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@family.local"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Passwort</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Bitte warten…' : 'Einloggen'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Nur für autorisierte Administratoren
        </p>
      </div>
    </div>
  );
}
