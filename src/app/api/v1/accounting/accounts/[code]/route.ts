import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const resolvedParams = await params;
    const accountCode = resolvedParams.code;

    const db = await getDb();
    const result = await db.request()
      .input('code', accountCode)
      .query(`
        SELECT AccountCode, AccountName, AccountType, Category, IsActive, CreatedAt
        FROM ChartOfAccounts
        WHERE AccountCode = @code
      `);

    if (!result.recordset.length) {
      return NextResponse.json({ status: 'ERROR', message: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ status: 'SUCCESS', account: result.recordset[0] }, { status: 200 });
  } catch (err: any) {
    return serverError(err, '/api/v1/accounting/accounts/[code]');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { session, errorResponse } = validateApiAuth(req, 'accounting.accounts.update');
    if (errorResponse) return errorResponse;


    const resolvedParams = await params;
    const accountCode = resolvedParams.code;
    const body = await req.json();
    const { accountName, category, isActive } = body;

    const db = await getDb();
    const checkRes = await db.request()
      .input('code', accountCode)
      .query("SELECT AccountCode FROM ChartOfAccounts WHERE AccountCode = @code");

    if (!checkRes.recordset.length) {
      return NextResponse.json({ status: 'ERROR', message: 'Account not found' }, { status: 404 });
    }

    await db.request()
      .input('code', accountCode)
      .input('name', accountName ?? null)
      .input('cat', category ?? null)
      .input('active', isActive !== undefined ? (isActive ? 1 : 0) : null)
      .query(`
        UPDATE ChartOfAccounts
        SET 
          AccountName = COALESCE(@name, AccountName),
          Category = COALESCE(@cat, Category),
          IsActive = COALESCE(@active, IsActive)
        WHERE AccountCode = @code
      `);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        accountCode,
        message: `Account ${accountCode} updated successfully.`,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/accounting/accounts/[code]');
  }
}
