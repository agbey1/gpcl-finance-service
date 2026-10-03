import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt, UserSession, hasPermission } from './auth';
import { getEnv } from './env';
import { logger } from './logger';

export const SESSION_COOKIE = 'token';

/**
 * Extracts and verifies the UserSession from the Request Authorization header or HTTP cookie
 */
export function getSessionFromRequest(req: NextRequest): UserSession | null {
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) {
    token = req.cookies.get(SESSION_COOKIE)?.value || null;
  }
  if (!token) return null;
  return verifyJwt(token);
}

/**
 * Validates request authentication and permission check for API routes
 */
export function validateApiAuth(
  req: NextRequest,
  requiredPermission?: string
): { session: UserSession | null; errorResponse: NextResponse | null } {
  const session = getSessionFromRequest(req);

  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }

  if (requiredPermission && !hasPermission(session, requiredPermission)) {
    return {
      session,
      errorResponse: NextResponse.json(
        { status: 'ERROR', message: `Forbidden: Missing required permission '${requiredPermission}'` },
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}

/**
 * Client IP for rate limiting and audit. X-Forwarded-For is client-controlled,
 * so it is only honoured when TRUST_PROXY=true (a reverse proxy overwrites it).
 */
export function getClientIp(req: NextRequest): string {
  if (getEnv().TRUST_PROXY) {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
    const real = req.headers.get('x-real-ip');
    if (real) return real.trim();
  }
  const reqIp = (req as { ip?: string }).ip;
  if (reqIp) return reqIp;
  return 'direct';
}

/**
 * Logs an unexpected error with full detail and returns a generic 500 so that
 * SQL errors, stack traces and schema details never reach the client.
 */
export function serverError(err: unknown, context: string): NextResponse {
  const e = err instanceof Error ? err : new Error(String(err));
  logger.error(`Unhandled error in ${context}`, { error: e.message, stack: e.stack });
  return NextResponse.json(
    { status: 'ERROR', message: 'Internal server error' },
    { status: 500 }
  );
}
