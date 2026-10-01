import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse, parseBody } from '@/lib/apiErrors';
import { getDb, sql } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { PERMISSION_IDS, SYSTEM_ROLES, SUPER_ADMIN_ROLE } from '@/lib/permissionCatalog';
import { assertNotReservedName, roleNameSchema } from '@/lib/roles';

// Roles are identified by Roles.Name, which is what Users.Role and
// RolePermissions.RoleName (foreign key) store and what login resolves.

const permissionList = z
  .array(z.string())
  .max(100)
  .refine((ps) => ps.every((p) => PERMISSION_IDS.has(p)), { message: 'Unknown permission ID' })
  .transform((ps) => [...new Set(ps)]);

const createRoleSchema = z.object({
  name: roleNameSchema,
  description: z.string().trim().max(500).optional(),
  permissions: permissionList.optional(),
});

const updatePermissionsSchema = z.object({
  roleId: z.string().min(1).max(100),
  permissions: permissionList,
});

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = validateApiAuth(req);
  if (authError) return authError;

  try {
    const db = await getDb();
    const [rolesRes, usersRes, permsRes] = await Promise.all([
      db.request().query('SELECT Name, Description FROM Roles'),
      db.request().query('SELECT Role, COUNT(*) AS n FROM Users WHERE IsActive = 1 GROUP BY Role'),
      db.request().query('SELECT RoleName, PermissionId FROM RolePermissions ORDER BY PermissionId'),
    ]);
    const users = new Map<string, number>(usersRes.recordset.map((r: { Role: string; n: number }) => [r.Role, r.n]));
    const perms = new Map<string, string[]>();
    for (const r of permsRes.recordset as { RoleName: string; PermissionId: string }[]) {
      perms.set(r.RoleName, [...(perms.get(r.RoleName) ?? []), r.PermissionId]);
    }
    const systemOrder = Object.keys(SYSTEM_ROLES);
    const roles = (rolesRes.recordset as { Name: string; Description: string | null }[])
      .map((r) => {
        const sys = SYSTEM_ROLES[r.Name];
        return {
          id: r.Name,
          name: sys?.label ?? r.Name,
          description: sys?.description ?? r.Description ?? 'Custom role',
          userCount: users.get(r.Name) ?? 0,
          permissions: perms.get(r.Name) ?? [],
          isSystem: Boolean(sys),
        };
      })
      .sort((a, b) => {
        const ia = systemOrder.indexOf(a.id), ib = systemOrder.indexOf(b.id);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        return a.name.localeCompare(b.name);
      });
    return NextResponse.json({ status: 'SUCCESS', roles });
  } catch (err) {
    return errorResponse(err, '/api/v1/roles');
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'admin.roles.manage');
  if (authError) return authError;

  try {
    const { name, description, permissions = [] } = await parseBody(req, createRoleSchema);
    assertNotReservedName(name);

    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();
    try {
      const dup = await new sql.Request(tx)
        .input('n', sql.NVarChar, name)
        .query('SELECT 1 AS x FROM Roles WITH (UPDLOCK, HOLDLOCK) WHERE LOWER(Name) = LOWER(@n)');
      if (dup.recordset.length) throw new ApiError(409, `A role named "${name}" already exists.`);

      await new sql.Request(tx)
        .input('n', sql.NVarChar, name)
        .input('d', sql.NVarChar, description || null)
        .query('INSERT INTO Roles (Name, Description, CreatedAt, UpdatedAt) VALUES (@n, @d, GETDATE(), GETDATE())');
      for (const p of permissions) {
        await new sql.Request(tx)
          .input('n', sql.NVarChar, name)
          .input('p', sql.NVarChar, p)
          .query('INSERT INTO RolePermissions (RoleName, PermissionId) VALUES (@n, @p)');
      }
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    await logAudit({
      entityType: 'ROLE',
      entityId: name,
      action: 'CREATE',
      userId: session!.userId,
      newValue: { name, description: description || null, permissions },
      description: `Role "${name}" created with ${permissions.length} permission(s)`,
    });

    return NextResponse.json(
      {
        status: 'SUCCESS',
        role: { id: name, name, description: description || 'Custom role', userCount: 0, permissions, isSystem: false },
      },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err, '/api/v1/roles');
  }
}

/** Replaces a role's permissions. */
export async function PUT(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'admin.roles.manage');
  if (authError) return authError;

  try {
    const { roleId, permissions } = await parseBody(req, updatePermissionsSchema);
    if (roleId === 'ADMIN' || roleId === SUPER_ADMIN_ROLE) {
      throw new ApiError(400, 'This role has full access by design; its permissions cannot be edited.');
    }

    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();
    let previous: string[];
    try {
      const role = await new sql.Request(tx)
        .input('n', sql.NVarChar, roleId)
        .query('SELECT Name FROM Roles WITH (UPDLOCK, HOLDLOCK) WHERE Name = @n');
      if (!role.recordset.length) throw new ApiError(404, 'Role not found.');

      const old = await new sql.Request(tx)
        .input('n', sql.NVarChar, roleId)
        .query('SELECT PermissionId FROM RolePermissions WHERE RoleName = @n ORDER BY PermissionId');
      previous = old.recordset.map((r: { PermissionId: string }) => r.PermissionId);

      await new sql.Request(tx).input('n', sql.NVarChar, roleId).query('DELETE FROM RolePermissions WHERE RoleName = @n');
      for (const p of permissions) {
        await new sql.Request(tx)
          .input('n', sql.NVarChar, roleId)
          .input('p', sql.NVarChar, p)
          .query('INSERT INTO RolePermissions (RoleName, PermissionId) VALUES (@n, @p)');
      }
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    await logAudit({
      entityType: 'ROLE',
      entityId: roleId,
      action: 'UPDATE',
      userId: session!.userId,
      oldValue: { permissions: previous },
      newValue: { permissions },
      description: `Permissions for role "${roleId}" updated (${previous.length} -> ${permissions.length})`,
    });

    return NextResponse.json({ status: 'SUCCESS', message: 'Permissions updated successfully', roleId, permissions });
  } catch (err) {
    return errorResponse(err, '/api/v1/roles');
  }
}
