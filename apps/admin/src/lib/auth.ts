import { cookies } from 'next/headers';

export const ACCESS_TOKEN_COOKIE = 'fp_at';
export const REFRESH_TOKEN_COOKIE = 'fp_rt';

export function getServerToken(): string | undefined {
  return cookies().get(ACCESS_TOKEN_COOKIE)?.value;
}

export function isAdminRole(role: string): boolean {
  return role === 'super_admin' || role === 'family_admin';
}
