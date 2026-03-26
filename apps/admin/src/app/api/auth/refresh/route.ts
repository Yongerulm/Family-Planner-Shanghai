import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const REFRESH_TOKEN_COOKIE = 'fp_rt';

/**
 * POST /api/auth/refresh
 *
 * Reads the httpOnly refresh token cookie and exchanges it for a new access token
 * with the NestJS backend. Returns the new access token in the JSON body.
 * Updates the refresh token cookie with the rotated token.
 *
 * Called automatically by the admin axios interceptor on 401 responses.
 * Also called on page load (by SessionProvider) to restore the in-memory access token.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No session' }, { status: 401 });
  }

  try {
    const backendRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!backendRes.ok) {
      // Refresh token is invalid/revoked → clear cookie and return 401
      const res = NextResponse.json({ message: 'Session expired' }, { status: 401 });
      res.cookies.delete(REFRESH_TOKEN_COOKIE);
      return res;
    }

    const payload = await backendRes.json() as {
      data: {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; role: string };
      };
    };

    const { accessToken, refreshToken: newRefreshToken, user } = payload.data;

    const res = NextResponse.json({ accessToken, user });

    // Rotate the refresh token cookie
    res.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.json({ message: 'Interner Fehler' }, { status: 500 });
  }
}
