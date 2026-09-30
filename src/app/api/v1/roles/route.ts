import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import sql from 'mssql';
import { z } from 'zod';

const createRoleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
});

const updatePermissionsSchema = z.object({
  roleId: z.string(),
  permissions: z.array(z.string()),
});

// Default system roles
const DEFAULT_ROLES = [
  { id: 'ADMIN', name: 'Finance Administrator', description: 'Full administrative access to all financial sub-modules and RBAC management.' },
  { id: 'SENIOR_ACCOUNTANT', name: 'Senior Accountant', description: 'Can post journals, manage invoices, record payments, and run period closes.' },
  { id: 'ACCOUNTS_RECEIVABLE_CLERK', name: 'AR Clerk', description: 'Can create customer invoices and record payment receipts.' },
  { id: 'AUDITOR', name: 'Financial Auditor', description: 'Read-only access to General Ledger and financial reports.' },
];

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const db = await getDb();

    // 1. Query user counts per role
    const userResult = await db.request().query(`
      SELECT
        u.Role as roleId,
        COUNT(u.Id) as userCount
      FROM Users u
      WHERE u.IsActive = 1
      GROUP BY u.Role
    `);

    const userCountsByRole = new Map<string, number>();
    if (userResult.recordset) {
      userResult.recordset.forEach((row: any) => {
        userCountsByRole.set(String(row.roleId), row.userCount);
      });
    }

    // 2. Query permissions per role
    const permResult = await db.request().query(`
      SELECT
        RoleName,
        PermissionId
      FROM RolePermissions
      ORDER BY RoleName, PermissionId
    `);

    const permissionsByRole = new Map<string, string[]>();
    if (permResult.recordset) {
      permResult.recordset.forEach((row: any) => {
        const key = String(row.RoleName);
        if (!permissionsByRole.has(key)) {
          permissionsByRole.set(key, []);
        }
        permissionsByRole.get(key)!.push(row.PermissionId);
      });
    }

    // 3. Query custom roles from Roles table
    let dbCustomRoles: any[] = [];
    try {
      const dbRolesResult = await db.request().query(`
        SELECT Id, Name, Description FROM Roles ORDER BY Name ASC
      `);
      dbCustomRoles = dbRolesResult.recordset || [];
    } catch (e: any) {
      logger.warn('Could not query Roles table:', { error: e.message });
    }

    // 4. Map default system roles
    const systemRoles = DEFAULT_ROLES.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: userCountsByRole.get(role.id) || 0,
      permissions: permissionsByRole.get(role.id) || [],
      isSystem: true,
    }));

    // 5. Map custom roles (exclude any duplicate names)
    const existingNames = new Set(DEFAULT_ROLES.map(r => r.name.toLowerCase()));
    const customRoles = dbCustomRoles
      .filter(r => !existingNames.has(r.Name.toLowerCase()))
      .map(r => {
        const roleIdStr = String(r.Id);
        return {
          id: roleIdStr,
          name: r.Name,
          description: r.Description || 'Custom enterprise role',
          userCount: userCountsByRole.get(roleIdStr) || userCountsByRole.get(r.Name) || 0,
          permissions: permissionsByRole.get(roleIdStr) || permissionsByRole.get(r.Name) || [],
          isSystem: false,
        };
      });

    const roles = [...systemRoles, ...customRoles];

    return NextResponse.json({
      status: 'SUCCESS',
      roles,
    });
  } catch (err: any) {
    logger.warn('Failed to fetch roles from database', { error: err.message });

    const roles = DEFAULT_ROLES.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: 0,
      permissions: [],
      isSystem: true,
    }));

    return NextResponse.json({
      status: 'SUCCESS',
      roles,
    });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.roles.manage');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parseResult = createRoleSchema.safeParse(body);

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

    const { name, description, permissions } = parseResult.data;
    const db = await getDb();

    // Check for duplicate role name in DEFAULT_ROLES or DB Roles table
    const isSystemDup = DEFAULT_ROLES.some(r => r.name.toLowerCase() === name.toLowerCase());
    if (isSystemDup) {
      return NextResponse.json(
        { status: 'ERROR', message: 'A system role with this name already exists' },
        { status: 409 }
      );
    }

    const existing = await db.request()
      .input('name', sql.NVarChar, name)
      .query(`SELECT Id FROM Roles WHERE LOWER(Name) = LOWER(@name)`);

    if (existing.recordset && existing.recordset.length > 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'A role with this name already exists' },
        { status: 409 }
      );
    }

    // Insert new role
    const insertResult = await db.request()
      .input('n', sql.NVarChar, name)
      .input('d', sql.NVarChar, description || 'Custom enterprise role')
      .query(`
        INSERT INTO Roles (Name, Description, CreatedAt, UpdatedAt)
        VALUES (@n, @d, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() AS Id;
      `);

    const insertedId = Math.floor(insertResult.recordset[0].Id);
    const roleIdStr = String(insertedId);

    // Save initial permissions if provided
    if (permissions && permissions.length > 0) {
      for (const permId of permissions) {
        await db.request()
          .input('rName', sql.NVarChar, roleIdStr)
          .input('pId', sql.NVarChar, permId)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = @rName AND PermissionId = @pId)
            INSERT INTO RolePermissions (RoleName, PermissionId) VALUES (@rName, @pId)
          `);
      }
    }

    logger.info('Role created', { roleId: insertedId, name });

    return NextResponse.json(
      {
        status: 'SUCCESS',
        role: {
          id: roleIdStr,
          name,
          description: description || 'Custom enterprise role',
          userCount: 0,
          permissions: permissions || [],
          isSystem: false,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    logger.error('Error creating role', { error: err.message });
    return serverError(err, '/api/v1/roles');
  }
}

export async function PUT(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.roles.manage');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parseResult = updatePermissionsSchema.safeParse(body);

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

    const { roleId, permissions } = parseResult.data;
    const db = await getDb();

    // Delete existing permissions for this roleId
    await db.request()
      .input('rId', sql.NVarChar, roleId)
      .query(`DELETE FROM RolePermissions WHERE RoleName = @rId`);

    // Insert updated permissions
    for (const permId of permissions) {
      await db.request()
        .input('rId', sql.NVarChar, roleId)
        .input('pId', sql.NVarChar, permId)
        .query(`INSERT INTO RolePermissions (RoleName, PermissionId) VALUES (@rId, @pId)`);
    }

    logger.info('Role permissions updated', { roleId, permissionCount: permissions.length });

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Permissions updated successfully',
      roleId,
      permissions,
    });
  } catch (err: any) {
    logger.error('Error updating role permissions', { error: err.message });
    return serverError(err, '/api/v1/roles');
  }
}
