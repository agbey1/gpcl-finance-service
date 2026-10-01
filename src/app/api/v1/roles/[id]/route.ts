import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse, parseBody } from '@/lib/apiErrors';
import { getDb, sql } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { SYSTEM_ROLES } from '@/lib/permissionCatalog';
import { assertNotReservedName, roleNameSchema } from '@/lib/roles';

// [id] is the role name (Roles.Name), URL-encoded.

const updateRoleSchema = z.object({
  name: roleNameSchema.optional(),
  description: z.string().trim().max(500).optional(),
});

async function roleKey(params: Promise<{ id: string }>): Promise<string> {
  const key = decodeURIComponent((await params).id);
  if (SYSTEM_ROLES[key]) throw new ApiError(400, 'Built-in roles cannot be renamed or deleted.');
  return key;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'admin.roles.manage');
  if (authError) return authError;

  try {
    const oldName = await roleKey(params);
    const { name, description } = await parseBody(req, updateRoleSchema);
    const newName = name ?? oldName;
    if (newName.toLowerCase() !== oldName.toLowerCase()) assertNotReservedName(newName);

    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();
    let before: { Name: string; Description: string | null };
    let movedUsers = 0;
    try {
      const role = await new sql.Request(tx)
        .input('n', sql.NVarChar, oldName)
        .query('SELECT Name, Description FROM Roles WITH (UPDLOCK, HOLDLOCK) WHERE Name = @n');
      if (!role.recordset.length) throw new ApiError(404, 'Role not found.');
      before = role.recordset[0];

      if (newName !== before.Name) {
        const dup = await new sql.Request(tx)
          .input('n', sql.NVarChar, newName)
          .input('old', sql.NVarChar, before.Name)
          .query('SELECT 1 AS x FROM Roles WITH (UPDLOCK, HOLDLOCK) WHERE LOWER(Name) = LOWER(@n) AND Name <> @old');
        if (dup.recordset.length) throw new ApiError(409, `A role named "${newName}" already exists.`);
      }

      // RolePermissions follows via ON UPDATE CASCADE (migration 011); Users.Role has no FK.
      await new sql.Request(tx)
        .input('old', sql.NVarChar, before.Name)
        .input('n', sql.NVarChar, newName)
        .input('d', sql.NVarChar, description !== undefined ? description || null : before.Description)
        .query('UPDATE Roles SET Name = @n, Description = @d, UpdatedAt = GETDATE() WHERE Name = @old');
      if (newName !== before.Name) {
        const u = await new sql.Request(tx)
          .input('old', sql.NVarChar, before.Name)
          .input('n', sql.NVarChar, newName)
          .query('UPDATE Users SET Role = @n, UpdatedAt = GETDATE() WHERE Role = @old');
        movedUsers = u.rowsAffected[0] ?? 0;
      }
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    await logAudit({
      entityType: 'ROLE',
      entityId: newName,
      action: 'UPDATE',
      userId: session!.userId,
      oldValue: { name: before.Name, description: before.Description },
      newValue: { name: newName, description: description ?? before.Description, usersMoved: movedUsers },
      description: newName !== before.Name ? `Role "${before.Name}" renamed to "${newName}"` : `Role "${newName}" updated`,
    });

    return NextResponse.json({
      status: 'SUCCESS',
      role: { id: newName, name: newName, description: description ?? before.Description },
    });
  } catch (err) {
    return errorResponse(err, '/api/v1/roles/[id]');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'admin.roles.manage');
  if (authError) return authError;

  try {
    const name = await roleKey(params);
    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();
    let permissions: string[];
    try {
      const role = await new sql.Request(tx)
        .input('n', sql.NVarChar, name)
        .query('SELECT Name FROM Roles WITH (UPDLOCK, HOLDLOCK) WHERE Name = @n');
      if (!role.recordset.length) throw new ApiError(404, 'Role not found.');

      // Any assigned user (active or not) would be left without a valid role.
      const users = await new sql.Request(tx)
        .input('n', sql.NVarChar, name)
        .query('SELECT COUNT(*) AS n FROM Users WHERE Role = @n');
      const n = users.recordset[0].n as number;
      if (n > 0) throw new ApiError(409, `Cannot delete role "${name}": ${n} user(s) are assigned to it. Reassign them first.`);

      const p = await new sql.Request(tx)
        .input('n', sql.NVarChar, name)
        .query('SELECT PermissionId FROM RolePermissions WHERE RoleName = @n');
      permissions = p.recordset.map((r: { PermissionId: string }) => r.PermissionId);

      // RolePermissions rows go with it (ON DELETE CASCADE).
      await new sql.Request(tx).input('n', sql.NVarChar, name).query('DELETE FROM Roles WHERE Name = @n');
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    await logAudit({
      entityType: 'ROLE',
      entityId: name,
      action: 'DELETE',
      userId: session!.userId,
      oldValue: { name, permissions },
      description: `Role "${name}" deleted`,
    });

    return NextResponse.json({ status: 'SUCCESS', message: `Role "${name}" deleted successfully` });
  } catch (err) {
    return errorResponse(err, '/api/v1/roles/[id]');
  }
}
