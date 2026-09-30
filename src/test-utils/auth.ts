import { signJwt } from '../lib/auth';

/** Bearer header for a signed test session. */
export function authHeader(role = 'ADMIN', permissions: string[] = []): Record<string, string> {
  const token = signJwt({ userId: 1, email: 'test@gpcl.com', name: 'Test User', role, permissions }, 3600);
  return { Authorization: `Bearer ${token}` };
}
