import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';
import { errorResponse, parseBody } from '@/lib/apiErrors';
import { logAudit } from '@/lib/auditLog';
import {
  AccountMapValidationError,
  GL_ROLES,
  GL_ROLE_KEYS,
  getAccountMap,
  loadAccountInfo,
  saveAccountMap,
} from '@/lib/accountMap';

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = validateApiAuth(req, 'accounting.view');
  if (authError) return authError;

  try {
    const db = await getDb();
    const mapping = await getAccountMap(db);
    const [info, accounts] = await Promise.all([
      loadAccountInfo(db, Object.values(mapping)),
      db.request().query(`SELECT Code, AccountName, AccountType FROM Accounts WHERE IsActive = 1 ORDER BY Code`),
    ]);
    const roles = GL_ROLE_KEYS.map((role) => ({
      role,
      label: GL_ROLES[role].label,
      accountType: GL_ROLES[role].type,
      code: mapping[role],
      locked: GL_ROLES[role].lockOnceUsed && Boolean(info.get(mapping[role])?.HasPostings),
    }));
    return NextResponse.json({ status: 'SUCCESS', mapping, roles, accounts: accounts.recordset });
  } catch (err) {
    return errorResponse(err, '/api/v1/settings/gl-accounts');
  }
}

const bodySchema = z.object({
  mapping: z.object(Object.fromEntries(GL_ROLE_KEYS.map((r) => [r, z.string().trim().min(1).max(20).optional()]))).strict(),
});

export async function PUT(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'admin.roles.manage');
  if (authError) return authError;

  try {
    const { mapping } = await parseBody(req, bodySchema);
    const { previous, mapping: saved } = await saveAccountMap(mapping, session!.userId);
    await logAudit({
      entityType: 'SETTINGS',
      entityId: 'gl-accounts',
      action: 'UPDATE',
      userId: session!.userId,
      oldValue: previous,
      newValue: saved,
      description: 'GL account mapping for system postings updated',
    });
    return NextResponse.json({ status: 'SUCCESS', mapping: saved });
  } catch (err) {
    if (err instanceof AccountMapValidationError) {
      return NextResponse.json(
        { status: 'ERROR', code: 'INVALID_ACCOUNT_MAPPING', message: err.message, problems: err.problems },
        { status: 400 },
      );
    }
    return errorResponse(err, '/api/v1/settings/gl-accounts');
  }
}
