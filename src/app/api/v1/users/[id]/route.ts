import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { updateUserSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/auditLog';
import { mockUsersStore, UserRecord } from '../route';
import { roleAssignmentError } from '@/lib/roles';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.users.manage');
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ status: 'ERROR', message: 'Invalid user ID' }, { status: 400 });
  }

  let dbError: Error | null = null;
  try {
    const db = await getDb();
    const result = await db.request().input('id', userId).query(`
      SELECT Id, Email, Name, Role, IsActive, CreatedAt FROM Users WHERE Id = @id
    `);

    if (result.recordset && result.recordset.length > 0) {
      const u = result.recordset[0];
      const user: UserRecord = {
        id: u.Id,
        email: u.Email,
        name: u.Name,
        role: u.Role,
        status: u.IsActive ? 'ACTIVE' : 'INACTIVE',
        isActive: Boolean(u.IsActive),
        createdAt: u.CreatedAt ? new Date(u.CreatedAt).toISOString() : new Date().toISOString(),
      };
      return NextResponse.json({ status: 'SUCCESS', user });
    } else {
      // User not found in DB
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ status: 'ERROR', message: 'User account not found' }, { status: 404 });
      }
    }
  } catch (err: any) {
    dbError = err;
    logger.warn('Failed to fetch user from DB', { error: err.message });
  }

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { status: 'ERROR', message: `Database error: ${dbError?.message || 'Database unavailable'}` },
      { status: 500 }
    );
  }

  // Development/Test mock fallback
  const mockUser = mockUsersStore.find(u => u.id === userId);
  if (!mockUser) {
    return NextResponse.json({ status: 'ERROR', message: 'User account not found' }, { status: 404 });
  }

  const { passwordHash: _, ...userWithoutHash } = mockUser;
  return NextResponse.json({ status: 'SUCCESS', user: userWithoutHash });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.users.manage');
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ status: 'ERROR', message: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parseResult = updateUserSchema.safeParse(body);

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

    const updates = parseResult.data;
    let newPasswordHash: string | undefined;

    if (updates.password && updates.password.trim().length > 0) {
      newPasswordHash = await hashPassword(updates.password);
    }

    let dbErrorMsg = '';

    // Database update
    try {
      const db = await getDb();
      const checkUser = await db.request().input('id', userId).query(`
        SELECT Id, Email, Name, Role, IsActive FROM Users WHERE Id = @id
      `);

      if (checkUser.recordset && checkUser.recordset.length > 0) {
        const target = checkUser.recordset[0];
        const actorRole = session!.role;
        if (target.Role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { status: 'ERROR', message: 'Only a Super Administrator can modify a Super Administrator account.' },
            { status: 403 }
          );
        }
        if (updates.role !== undefined && updates.role !== target.Role) {
          const roleErr = await roleAssignmentError(db, updates.role, actorRole);
          if (roleErr) return NextResponse.json({ status: 'ERROR', message: roleErr.message }, { status: roleErr.status });
        }
        const demotesOrDisables =
          target.Role === 'SUPER_ADMIN' && target.IsActive &&
          ((updates.role !== undefined && updates.role !== 'SUPER_ADMIN') || updates.isActive === false);
        if (demotesOrDisables) {
          const others = await db.request().input('id', userId).query(
            `SELECT COUNT(*) AS n FROM Users WHERE Role = 'SUPER_ADMIN' AND IsActive = 1 AND Id <> @id`
          );
          if (!others.recordset[0].n) {
            return NextResponse.json(
              { status: 'ERROR', message: 'This is the last active Super Administrator; create another before demoting or deactivating it.' },
              { status: 409 }
            );
          }
        }

        // If email is changing, check duplicate
        if (updates.email) {
          const lowerEmail = updates.email.toLowerCase().trim();
          const dupCheck = await db.request()
            .input('email', lowerEmail)
            .input('id', userId)
            .query(`SELECT Id FROM Users WHERE Email = @email AND Id <> @id`);

          if (dupCheck.recordset && dupCheck.recordset.length > 0) {
            return NextResponse.json(
              { status: 'ERROR', message: 'Email address is already in use by another account.' },
              { status: 409 }
            );
          }
        }

        const req = db.request().input('id', userId);
        const setClauses: string[] = ['UpdatedAt = GETDATE()'];

        if (updates.name !== undefined) {
          req.input('name', updates.name);
          setClauses.push('Name = @name');
        }
        if (updates.email !== undefined) {
          req.input('email', updates.email.toLowerCase().trim());
          setClauses.push('Email = @email');
        }
        if (updates.role !== undefined) {
          req.input('role', updates.role);
          setClauses.push('Role = @role');
        }
        if (updates.isActive !== undefined) {
          req.input('isActive', updates.isActive ? 1 : 0);
          setClauses.push('IsActive = @isActive');
        }
        if (newPasswordHash) {
          req.input('passwordHash', newPasswordHash);
          setClauses.push('PasswordHash = @passwordHash');
        }

        await req.query(`
          UPDATE Users SET ${setClauses.join(', ')} WHERE Id = @id
        `);

        const updatedRes = await db.request().input('id', userId).query(`
          SELECT Id, Email, Name, Role, IsActive, CreatedAt FROM Users WHERE Id = @id
        `);

        const u = updatedRes.recordset[0];
        const updatedUser: UserRecord = {
          id: u.Id,
          email: u.Email,
          name: u.Name,
          role: u.Role,
          status: u.IsActive ? 'ACTIVE' : 'INACTIVE',
          isActive: Boolean(u.IsActive),
          createdAt: u.CreatedAt ? new Date(u.CreatedAt).toISOString() : new Date().toISOString(),
        };

        // Log audit trail for user updates
        const changesSummary: string[] = [];
        if (updates.name !== undefined) changesSummary.push(`name changed to "${updates.name}"`);
        if (updates.email !== undefined) changesSummary.push(`email changed to "${updates.email}"`);
        if (updates.role !== undefined) changesSummary.push(`role changed to ${updates.role}`);
        if (updates.isActive !== undefined) changesSummary.push(`status changed to ${updates.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        if (updates.password !== undefined) changesSummary.push('password reset');

        await logAudit({
          entityType: 'USER',
          entityId: userId,
          action: 'UPDATE',
          userId: session!.userId,
          newValue: updatedUser,
          description: `User account updated: ${changesSummary.join(', ')}`,
        });

        logger.info('Updated user account in DB', { userId, changes: changesSummary });
        return NextResponse.json({ status: 'SUCCESS', user: updatedUser });
      } else {
        // User not found in DB
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({ status: 'ERROR', message: 'User account not found' }, { status: 404 });
        }
      }
    } catch (dbErr: any) {
      dbErrorMsg = dbErr.message;
      logger.warn('Database update failed', { error: dbErr.message });
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { status: 'ERROR', message: `Database update failed: ${dbErrorMsg || 'Database unavailable'}` },
        { status: 500 }
      );
    }

    // In-memory fallback update (development/testing only)
    const mockIndex = mockUsersStore.findIndex(u => u.id === userId);
    if (mockIndex === -1) {
      return NextResponse.json({ status: 'ERROR', message: 'User account not found' }, { status: 404 });
    }

    const currentMock = mockUsersStore[mockIndex];

    if (updates.email && updates.email.toLowerCase() !== currentMock.email.toLowerCase()) {
      const emailTaken = mockUsersStore.some(u => u.id !== userId && u.email.toLowerCase() === updates.email!.toLowerCase());
      if (emailTaken) {
        return NextResponse.json(
          { status: 'ERROR', message: 'Email address is already in use by another account.' },
          { status: 409 }
        );
      }
    }

    const updatedMockUser = {
      ...currentMock,
      name: updates.name !== undefined ? updates.name : currentMock.name,
      email: updates.email !== undefined ? updates.email.toLowerCase().trim() : currentMock.email,
      role: updates.role !== undefined ? updates.role : currentMock.role,
      roleName: updates.role !== undefined ? updates.role : currentMock.roleName,
      isActive: updates.isActive !== undefined ? updates.isActive : currentMock.isActive,
      status: (updates.isActive !== undefined ? (updates.isActive ? 'ACTIVE' : 'INACTIVE') : currentMock.status) as 'ACTIVE' | 'INACTIVE',
      passwordHash: newPasswordHash || currentMock.passwordHash,
    };

    mockUsersStore[mockIndex] = updatedMockUser;

    const { passwordHash: _, ...userWithoutHash } = updatedMockUser;
    logger.info('Updated user account in mock store (dev mode)', { userId });
    return NextResponse.json({ status: 'SUCCESS', user: userWithoutHash });
  } catch (err: any) {
    logger.error('Error updating user account', { error: err.message });
    return NextResponse.json({ status: 'ERROR', message: 'Failed to update user account' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.users.manage');
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ status: 'ERROR', message: 'Invalid user ID' }, { status: 400 });
  }

  let dbHandled = false;
  let userFoundInDb = false;

  try {
    const db = await getDb();
    const checkRes = await db.request().input('id', userId).query(`SELECT Id, Email, Role, IsActive FROM Users WHERE Id = @id`);

    if (checkRes.recordset && checkRes.recordset.length > 0) {
      userFoundInDb = true;
      const target = checkRes.recordset[0];
      if (target.Role === 'SUPER_ADMIN') {
        if (session!.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { status: 'ERROR', message: 'Only a Super Administrator can deactivate a Super Administrator account.' },
            { status: 403 }
          );
        }
        const others = await db.request().input('id', userId).query(
          `SELECT COUNT(*) AS n FROM Users WHERE Role = 'SUPER_ADMIN' AND IsActive = 1 AND Id <> @id`
        );
        if (target.IsActive && !others.recordset[0].n) {
          return NextResponse.json(
            { status: 'ERROR', message: 'This is the last active Super Administrator; create another before deactivating it.' },
            { status: 409 }
          );
        }
      }
      await db.request().input('id', userId).query(`UPDATE Users SET IsActive = 0, UpdatedAt = GETDATE() WHERE Id = @id`);
      dbHandled = true;
      await logAudit({
        entityType: 'USER',
        entityId: userId,
        action: 'UPDATE',
        userId: session!.userId,
        oldValue: { isActive: Boolean(target.IsActive) },
        newValue: { isActive: false },
        description: `User account deactivated: ${target.Email}`,
      });
      return NextResponse.json({ status: 'SUCCESS', message: 'User account deactivated successfully' });
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ status: 'ERROR', message: 'User account not found' }, { status: 404 });
    }
  } catch (dbErr: any) {
    logger.warn('Failed DB soft delete', { error: dbErr.message });
    if (process.env.NODE_ENV === 'production') {
      return serverError(dbErr, '/api/v1/users/[id]');
    }
  }

  // Development/Test mock fallback
  const mockIndex = mockUsersStore.findIndex(u => u.id === userId);
  if (mockIndex === -1) {
    return NextResponse.json({ status: 'ERROR', message: 'User account not found' }, { status: 404 });
  }

  mockUsersStore[mockIndex].isActive = false;
  mockUsersStore[mockIndex].status = 'INACTIVE';

  return NextResponse.json({ status: 'SUCCESS', message: 'User account deactivated successfully (dev mock mode)' });
}
