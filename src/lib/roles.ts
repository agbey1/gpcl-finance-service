import { z } from 'zod';
import { ApiError } from '@/lib/apiErrors';
import { SYSTEM_ROLES, SUPER_ADMIN_ROLE } from '@/lib/permissionCatalog';

export const roleNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[A-Za-z0-9 _&().-]+$/, 'Use letters, numbers, spaces and - _ & . ( ) only');

/** Throws 409 if the name collides with a built-in role key/label or SUPER_ADMIN. */
export function assertNotReservedName(name: string): void {
  const n = name.trim().toLowerCase();
  const reserved = [
    SUPER_ADMIN_ROLE,
    'Super Administrator',
    ...Object.keys(SYSTEM_ROLES),
    ...Object.values(SYSTEM_ROLES).map((r) => r.label),
  ];
  if (reserved.some((r) => r.toLowerCase() === n)) {
    throw new ApiError(409, `"${name}" is a built-in role name. Choose a different name.`);
  }
}

/**
 * Why `actorRole` may not give `role` to someone, or null if allowed.
 * Only SUPER_ADMIN may grant SUPER_ADMIN; any other role must exist in Roles.
 */
export async function roleAssignmentError(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mssql pool
  db: any,
  role: string,
  actorRole: string,
): Promise<{ status: number; message: string } | null> {
  if (role === SUPER_ADMIN_ROLE) {
    return actorRole === SUPER_ADMIN_ROLE
      ? null
      : { status: 403, message: 'Only a Super Administrator can grant the Super Administrator role.' };
  }
  const r = await db.request().input('n', role).query('SELECT 1 AS x FROM Roles WHERE Name = @n');
  return r.recordset.length ? null : { status: 400, message: `Unknown role "${role}".` };
}
