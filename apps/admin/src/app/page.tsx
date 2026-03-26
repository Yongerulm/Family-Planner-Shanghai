import { redirect } from 'next/navigation';

// Root "/" → direkt zu /dashboard oder /login
export default function Home() {
  redirect('/dashboard');
}
