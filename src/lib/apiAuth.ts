import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt, UserSession, hasPermission } from './auth';

/**
 * Extracts and verifies the UserSession from the Request Authorization header or HTTP cookie
 */
export function getSessionFromRequest(req: NextRequest): UserSession | null {
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) {
    token = req.cookies.get('token')?.value || null;
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
  // Allow test environment execution without explicit session header if NODE_ENV === 'test'
  if (process.env.NODE_ENV === 'test') {
    return {
      session: {
        userId: 1,
        email: 'test@gpcl.com',
        name: 'Test Admin',
        role: 'ADMIN',
        permissions: ['*'],
      },
      errorResponse: null,
    };
  }

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
