import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Planner Admin',
  description: 'Admin Panel — Family Planner Shanghai',
  robots: 'noindex,nofollow', // Admin panel nie für Suchmaschinen
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
