import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp, SESSION_COOKIE } from '@/lib/apiAuth';

const PUBLIC_PATHS = new Set(['/api/v1/auth/login', '/api/v1/health', '/login']);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  if (pathname === '/api/v1/auth/login') {
    // Brute-force protection: 10 login attempts per minute per client.
    const limit = checkRateLimit(`login_${ip}`, { windowMs: 60 * 1000, maxRequests: 10 });
    if (!limit.isAllowed) {
      return tooMany(limit.resetTime, 'Too many login attempts. Please try again later.');
    }
  }

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    const limit = checkRateLimit(`api_${ip}`, { windowMs: 60 * 1000, maxRequests: 300 });
    if (!limit.isAllowed) {
      return tooMany(limit.resetTime, 'Rate limit exceeded. Too many requests.');
    }
  }

  const authHeader = req.headers.get('authorization');
  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null) ||
    req.cookies.get(SESSION_COOKIE)?.value ||
    null;

  const session = token ? verifyJwt(token) : null;
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { status: 'ERROR', message: token ? 'Unauthorized: Invalid or expired token' : 'Unauthorized: Authentication token required' },
        { status: 401 }
      );
    }
    const res = NextResponse.redirect(new URL('/login', req.url));
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

function tooMany(resetTime: number, message: string) {
  const retryAfter = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
  return NextResponse.json(
    { status: 'ERROR', message },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.jpg|logo.jpg).*)'],
};
