import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv } from './env';

export interface UserSession {
  userId: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  exp?: number;
  iat?: number;
}

const JWT_HEADER = { alg: 'HS256', typ: 'JWT' } as const;
const CLOCK_SKEW_SECONDS = 30;

/**
 * Signs a session as an HS256 JWT (RFC 7519) using a real HMAC-SHA256.
 */
export function signJwt(
  payload: Omit<UserSession, 'iat' | 'exp'>,
  expiresInSeconds = getEnv().JWT_EXPIRES_IN_SECONDS,
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: UserSession = { ...payload, iat: now, exp: now + expiresInSeconds };
  const signingInput = `${b64url(JSON.stringify(JWT_HEADER))}.${b64url(JSON.stringify(fullPayload))}`;
  return `${signingInput}.${hmac(signingInput)}`;
}

/**
 * Verifies an HS256 JWT. Rejects any other algorithm, bad signatures,
 * missing/expired `exp`, and payloads that are not a well-formed session.
 */
export function verifyJwt(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;

    const header = JSON.parse(fromB64url(encodedHeader));
    if (header?.alg !== 'HS256') return null;

    const expected = Buffer.from(hmac(`${encodedHeader}.${encodedPayload}`));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

    const payload = JSON.parse(fromB64url(encodedPayload)) as UserSession;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS < now) return null;
    if (typeof payload.userId !== 'number' || !Array.isArray(payload.permissions)) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Checks if a session has the required permission
 */
export function hasPermission(session: UserSession | null, requiredPermission: string): boolean {
  if (!session) return false;
  if (session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') return true;
  return session.permissions ? session.permissions.includes(requiredPermission) : false;
}

function hmac(input: string): string {
  return createHmac('sha256', getEnv().JWT_SECRET).update(input).digest('base64url');
}

function b64url(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64url');
}

function fromB64url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}
