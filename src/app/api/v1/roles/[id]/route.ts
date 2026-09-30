import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/apiAuth';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import sql from 'mssql';
import { z } from 'zod';

const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

const DEFAULT_SYSTEM_ROLES = ['ADMIN', 'SENIOR_ACCOUNTANT', 'ACCOUNTS_RECEIVABLE_CLERK', 'AUDITOR'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.roles.manage');
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const roleIdNum = parseInt(id, 10);

    if (isNaN(roleIdNum) || roleIdNum <= 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'System roles cannot be edited or invalid role ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parseResult = updateRoleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid request body', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description } = parseResult.data;
    const db = await getDb();

    // Check if role exists
    const roleRes = await db.request()
      .input('id', sql.Int, roleIdNum)
      .query('SELECT Id, Name, Description FROM Roles WHERE Id = @id');

    if (!roleRes.recordset || roleRes.recordset.length === 0) {
      return NextResponse.json({ status: 'ERROR', message: 'Role not found' }, { status: 404 });
    }

    const oldName = roleRes.recordset[0].Name;

    // Check duplicate name if changing
    if (name && name.toLowerCase() !== oldName.toLowerCase()) {
      const dupCheck = await db.request()
        .input('n', sql.NVarChar, name)
        .input('id', sql.Int, roleIdNum)
        .query('SELECT Id FROM Roles WHERE LOWER(Name) = LOWER(@n) AND Id <> @id');

      if (dupCheck.recordset && dupCheck.recordset.length > 0) {
        return NextResponse.json({ status: 'ERROR', message: 'A role with this name already exists' }, { status: 409 });
      }
    }

    const newName = name ? name.trim() : oldName;
    const newDesc = description !== undefined ? description.trim() : roleRes.recordset[0].Description;

    // Update Roles table
    await db.request()
      .input('id', sql.Int, roleIdNum)
      .input('n', sql.NVarChar, newName)
      .input('d', sql.NVarChar, newDesc)
      .query(`
        UPDATE Roles
        SET Name = @n, Description = @d, UpdatedAt = GETDATE()
        WHERE Id = @id
      `);

    // If role name changed, update RolePermissions and Users references
    if (newName !== oldName) {
      const roleIdStr = String(roleIdNum);
      await db.request()
        .input('oldKey', sql.NVarChar, oldName)
        .input('newKey', sql.NVarChar, roleIdStr)
        .query(`
          UPDATE RolePermissions SET RoleName = @newKey WHERE RoleName = @oldKey;
          UPDATE Users SET Role = @newKey WHERE Role = @oldKey;
        `);
    }

    logger.info('Role updated', { roleId: roleIdNum, newName });

    return NextResponse.json({
      status: 'SUCCESS',
      role: {
        id: String(roleIdNum),
        name: newName,
        description: newDesc,
      },
    });
  } catch (err: any) {
    logger.error('Error updating role', { error: err.message });
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.roles.manage');
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const roleIdNum = parseInt(id, 10);

    if (isNaN(roleIdNum) || roleIdNum <= 0 || DEFAULT_SYSTEM_ROLES.includes(id)) {
      return NextResponse.json(
        { status: 'ERROR', message: 'System default roles cannot be deleted' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if role exists
    const roleRes = await db.request()
      .input('id', sql.Int, roleIdNum)
      .query('SELECT Id, Name FROM Roles WHERE Id = @id');

    if (!roleRes.recordset || roleRes.recordset.length === 0) {
      return NextResponse.json({ status: 'ERROR', message: 'Role not found' }, { status: 404 });
    }

    const roleName = roleRes.recordset[0].Name;
    const roleIdStr = String(roleIdNum);

    // Check if any active user is assigned to this role
    const userCheck = await db.request()
      .input('rId', sql.NVarChar, roleIdStr)
      .input('rName', sql.NVarChar, roleName)
      .query('SELECT COUNT(*) AS cnt FROM Users WHERE (Role = @rId OR Role = @rName) AND IsActive = 1');

    if (userCheck.recordset && userCheck.recordset[0].cnt > 0) {
      return NextResponse.json(
        {
          status: 'ERROR',
          message: `Cannot delete role "${roleName}": ${userCheck.recordset[0].cnt} active user(s) are assigned to this role. Reassign users first.`,
        },
        { status: 409 }
      );
    }

    // Delete associated permissions
    await db.request()
      .input('rId', sql.NVarChar, roleIdStr)
      .input('rName', sql.NVarChar, roleName)
      .query('DELETE FROM RolePermissions WHERE RoleName = @rId OR RoleName = @rName');

    // Delete role from Roles table
    await db.request()
      .input('id', sql.Int, roleIdNum)
      .query('DELETE FROM Roles WHERE Id = @id');

    logger.info('Role deleted', { roleId: roleIdNum, roleName });

    return NextResponse.json({
      status: 'SUCCESS',
      message: `Role "${roleName}" deleted successfully`,
    });
  } catch (err: any) {
    logger.error('Error deleting role', { error: err.message });
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Failed to delete role' }, { status: 500 });
  }
}
