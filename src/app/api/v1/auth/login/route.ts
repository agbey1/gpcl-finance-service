import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { comparePassword } from '@/lib/password';
import { getDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { loginSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { getClientIp, serverError, SESSION_COOKIE } from '@/lib/apiAuth';
import { loadRolePermissions } from '@/lib/permissions';

// Compared against when the user does not exist, so response timing does not
// reveal which email addresses have accounts.
const DUMMY_HASH = '$2b$12$zegxbpTclnUXMCrK2pG9xe076s7LfvcFLYHBH5sHO3cXiJjR9mo0C';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          status: 'ERROR',
          message: 'Invalid request parameters',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const email = parseResult.data.email.toLowerCase().trim();
    const { password } = parseResult.data;
    const ip = getClientIp(req);

    const db = await getDb();
    const r = await db.request().input('email', email).query(`
      SELECT Id, Email, Name, Role, PasswordHash FROM Users WHERE Email = @email AND IsActive = 1
    `);
    const user: { Id: number; Email: string; Name: string; Role: string | null; PasswordHash: string } | undefined =
      r.recordset[0];

    const isPasswordValid = await comparePassword(password, user?.PasswordHash ?? DUMMY_HASH);
    if (!user || !isPasswordValid) {
      logger.warn('Failed login attempt', { email, ip, reason: user ? 'bad_password' : 'unknown_user' });
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid email address or password. Please try again.' },
        { status: 401 }
      );
    }

    const role = user.Role || '';
    const permissions = await loadRolePermissions(db, role);

    const sessionData = {
      userId: user.Id,
      email: user.Email,
      name: user.Name,
      role,
      permissions,
    };

    const env = getEnv();
    const token = signJwt(sessionData, env.JWT_EXPIRES_IN_SECONDS);
    logger.audit('User logged in', { userId: user.Id, email: user.Email, ip });
    try {
      await db.request().input('id', user.Id).query('UPDATE Users SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @id');
    } catch (err) {
      // Never block sign-in because the timestamp could not be written.
      logger.warn('Could not record last login', { userId: user.Id, error: err instanceof Error ? err.message : String(err) });
    }

    const response = NextResponse.json({ status: 'SUCCESS', token, user: sessionData }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
      maxAge: env.JWT_EXPIRES_IN_SECONDS,
    });

    return response;
  } catch (err) {
    return serverError(err, 'POST /api/v1/auth/login');
  }
}
