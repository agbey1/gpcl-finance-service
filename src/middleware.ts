import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, favicon, login API, and login page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname === '/api/v1/auth/login' ||
    pathname === '/login'
  ) {
    // Apply rate limit on login attempts (max 10 login attempts per minute per IP)
    if (pathname === '/api/v1/auth/login') {
      const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
      const limit = checkRateLimit(`login_${ip}`, { windowMs: 60 * 1000, maxRequests: 10 });
      if (!limit.isAllowed) {
        return NextResponse.json(
          { status: 'ERROR', message: 'Too many login attempts. Please try again later.' },
          { status: 429 }
        );
      }
    }
    return NextResponse.next();
  }

  // Rate Limiting for all API routes (max 100 requests per minute per IP)
  if (pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const limit = checkRateLimit(`api_${ip}`, { windowMs: 60 * 1000, maxRequests: 100 });
    if (!limit.isAllowed) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Rate limit exceeded. Too many requests.' },
        { status: 429 }
      );
    }
  }

  // Auth check for protected routes
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    token = req.cookies.get('token')?.value || null;
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized: Authentication token required' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const session = verifyJwt(token);
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
