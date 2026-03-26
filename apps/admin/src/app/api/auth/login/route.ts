import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const REFRESH_TOKEN_COOKIE = 'fp_rt';

/**
 * POST /api/auth/login
 *
 * Proxies login to NestJS backend, then:
 * - Stores the refresh token in an httpOnly, Secure, SameSite=Strict cookie
 * - Returns the access token in the JSON response body (stored in-memory by the client)
 *
 * This prevents XSS from stealing the long-lived refresh token.
 * The access token (15-min TTL) is the only thing that can be stolen via XSS.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email: string; password: string };

    const backendRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });

    if (!backendRes.ok) {
      const err = await backendRes.json().catch(() => ({ message: 'Login fehlgeschlagen' }));
      return NextResponse.json(err, { status: backendRes.status });
    }

    const payload = await backendRes.json() as {
      data: {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; role: string; familyId?: string };
      };
    };

    const { accessToken, refreshToken, user } = payload.data;

    // Reject non-admin roles at the BFF layer
    if (user.role !== 'super_admin' && user.role !== 'family_admin') {
      return NextResponse.json(
        { message: 'Kein Admin-Zugang' },
        { status: 403 },
      );
    }

    const res = NextResponse.json({ accessToken, user });

    // Refresh token → httpOnly cookie (never accessible from JavaScript)
    res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',          // only sent to /api/auth/* routes
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch {
    return NextResponse.json({ message: 'Interner Fehler' }, { status: 500 });
  }
}
