import { NextResponse } from 'next/server';

const REFRESH_TOKEN_COOKIE = 'fp_rt';

/**
 * POST /api/auth/logout
 *
 * Clears the httpOnly refresh token cookie.
 * The in-memory access token on the client side is discarded by the client on 401/logout.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(REFRESH_TOKEN_COOKIE);
  return res;
}
