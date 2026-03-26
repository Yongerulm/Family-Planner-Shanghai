import type { Metadata } from 'next';
import './globals.css';
import SessionRestorer from '@/components/SessionRestorer';

export const metadata: Metadata = {
  title: 'Family Planner Admin',
  description: 'Admin Panel — Family Planner Shanghai',
  robots: 'noindex,nofollow', // Admin panel nie für Suchmaschinen
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        {/* Stellt In-Memory Access Token bei Seiten-Reload wieder her */}
        <SessionRestorer />
        {children}
      </body>
    </html>
  );
}
