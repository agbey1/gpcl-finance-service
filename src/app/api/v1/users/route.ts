import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/apiAuth';
import { createUserSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/password';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/auditLog';
import { roleAssignmentError } from '@/lib/roles';

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: string;
  roleName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

// In-memory store strictly for dev/test when DB is unpopulated
export const mockUsersStore: Array<UserRecord & { passwordHash: string }> = [
  { id: 1, email: 'admin@gpcl.com', name: 'Finance Administrator', role: 'ADMIN', roleName: 'Finance Administrator', status: 'ACTIVE', isActive: true, createdAt: '2026-01-01', lastLogin: '2026-09-01 22:45', passwordHash: '$2b$12$8s4Mq2jHRSa3rDjhkAKJuO0pHqk2yb5Oi.EOciq.dMgtZ7d8iqY/u' },
  { id: 2, email: 'kmensah@gpcl.com', name: 'Kofi Mensah', role: 'SENIOR_ACCOUNTANT', roleName: 'Senior Accountant', status: 'ACTIVE', isActive: true, createdAt: '2026-02-15', lastLogin: '2026-09-01 18:20', passwordHash: '$2b$12$8s4Mq2jHRSa3rDjhkAKJuO0pHqk2yb5Oi.EOciq.dMgtZ7d8iqY/u' },
  { id: 3, email: 'aosei@gpcl.com', name: 'Ama Osei', role: 'ACCOUNTS_RECEIVABLE_CLERK', roleName: 'AR Clerk', status: 'ACTIVE', isActive: true, createdAt: '2026-03-10', lastLogin: '2026-09-01 14:10', passwordHash: '$2b$12$8s4Mq2jHRSa3rDjhkAKJuO0pHqk2yb5Oi.EOciq.dMgtZ7d8iqY/u' },
  { id: 4, email: 'kappiah@gpcl.com', name: 'Kwaku Appiah', role: 'AUDITOR', roleName: 'Financial Auditor', status: 'INACTIVE', isActive: false, createdAt: '2026-04-01', lastLogin: '2026-08-20 09:30', passwordHash: '$2b$12$8s4Mq2jHRSa3rDjhkAKJuO0pHqk2yb5Oi.EOciq.dMgtZ7d8iqY/u' },
];

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.users.manage');
  if (errorResponse) return errorResponse;

  let dbErrorOccurred = false;

  try {
    const db = await getDb();
    const result = await db.request().query(`
      SELECT Id, Email, Name, Role, IsActive, CreatedAt, LastLoginAt FROM Users ORDER BY Id ASC
    `);

    if (result.recordset) {
      const users: UserRecord[] = result.recordset.map((u: any) => ({
        id: u.Id,
        email: u.Email,
        name: u.Name,
        role: u.Role,
        status: u.IsActive ? 'ACTIVE' : 'INACTIVE',
        isActive: Boolean(u.IsActive),
        createdAt: u.CreatedAt ? new Date(u.CreatedAt).toISOString() : new Date().toISOString(),
        lastLogin: u.LastLoginAt ? new Date(u.LastLoginAt).toISOString() : undefined,
      }));
      return NextResponse.json({ status: 'SUCCESS', users });
    }
  } catch (err: any) {
    dbErrorOccurred = true;
    logger.warn('Failed to fetch users from database', { error: err.message });
  }

  // In production, do not silently fallback to mock data on DB failure
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { status: 'ERROR', message: 'Database service unavailable' },
      { status: 500 }
    );
  }

  const users: UserRecord[] = mockUsersStore.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    roleName: u.roleName,
    status: u.isActive ? 'ACTIVE' : 'INACTIVE',
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin || 'Never',
  }));

  return NextResponse.json({ status: 'SUCCESS', users, _warning: 'Using development mock fallback' });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.users.manage');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parseResult = createUserSchema.safeParse(body);

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

    const { name, email, password, role, isActive } = parseResult.data;
    const lowerEmail = email.toLowerCase().trim();

    // Cryptographically hash user password
    const passwordHash = await hashPassword(password);

    // Database insert
    let dbErrorMsg = '';

    try {
      const db = await getDb();
      // Check duplicate email
      const existing = await db.request().input('email', lowerEmail).query(`
        SELECT Id FROM Users WHERE Email = @email
      `);

      if (existing.recordset && existing.recordset.length > 0) {
        return NextResponse.json(
          { status: 'ERROR', message: 'A user account with this email address already exists.' },
          { status: 409 }
        );
      }

      const roleErr = await roleAssignmentError(db, role, session!.role);
      if (roleErr) return NextResponse.json({ status: 'ERROR', message: roleErr.message }, { status: roleErr.status });

      const insertResult = await db.request()
        .input('email', lowerEmail)
        .input('name', name)
        .input('passwordHash', passwordHash)
        .input('role', role)
        .input('isActive', isActive ? 1 : 0)
        .query(`
          INSERT INTO Users (Email, Name, PasswordHash, Role, IsActive, CreatedAt, UpdatedAt)
          OUTPUT INSERTED.Id, INSERTED.CreatedAt
          VALUES (@email, @name, @passwordHash, @role, @isActive, GETDATE(), GETDATE());
        `);

      const inserted = insertResult.recordset[0];
      const newUser: UserRecord = {
        id: inserted.Id,
        email: lowerEmail,
        name,
        role,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        isActive: Boolean(isActive),
        createdAt: new Date(inserted.CreatedAt).toISOString(),
      };

      // Log audit trail
      await logAudit({
        entityType: 'USER',
        entityId: inserted.Id,
        action: 'CREATE',
        userId: session!.userId,
        newValue: {
          email: lowerEmail,
          name,
          role,
          isActive,
        },
        description: `User "${name}" (${lowerEmail}) created with role ${role}`,
      });

      logger.info('User created in database', { userId: inserted.Id, email: lowerEmail });
      return NextResponse.json({ status: 'SUCCESS', user: newUser }, { status: 201 });
    } catch (dbErr: any) {
      dbErrorMsg = dbErr.message;
      logger.warn('Database insert failed', { error: dbErr.message });
    }

    // Strict production isolation: return 500 error if DB insert failed in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Database error creating user account. Please contact system administrator.' },
        { status: 500 }
      );
    }

    // In-memory fallback (development & testing only)
    const existsInMemory = mockUsersStore.some(u => u.email.toLowerCase() === lowerEmail);
    if (existsInMemory) {
      return NextResponse.json(
        { status: 'ERROR', message: 'A user account with this email address already exists.' },
        { status: 409 }
      );
    }

    const newId = mockUsersStore.length > 0 ? Math.max(...mockUsersStore.map(u => u.id)) + 1 : 1;
    const newUserRecord = {
      id: newId,
      email: lowerEmail,
      name,
      role,
      roleName: role,
      status: (isActive ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
      isActive: Boolean(isActive),
      createdAt: new Date().toISOString(),
      lastLogin: 'Never',
      passwordHash,
    };

    mockUsersStore.push(newUserRecord);

    const { passwordHash: _, ...userWithoutHash } = newUserRecord;
    logger.info('User created in mock store (dev mode)', { userId: newId, email: lowerEmail });
    return NextResponse.json({ status: 'SUCCESS', user: userWithoutHash }, { status: 201 });
  } catch (err: any) {
    logger.error('Error creating user account', { error: err.message });
    return NextResponse.json({ status: 'ERROR', message: 'Failed to create user account' }, { status: 500 });
  }
}
