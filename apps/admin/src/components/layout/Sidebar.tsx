'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/families', label: 'Familien', icon: '👨‍👩‍👧‍👦' },
  { href: '/users', label: 'Benutzer', icon: '👤' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900 text-white">
      <div className="px-4 py-6 border-b border-gray-700">
        <h1 className="text-sm font-semibold text-gray-200">Family Planner</h1>
        <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Ausloggen
        </button>
      </div>
    </aside>
  );
}
