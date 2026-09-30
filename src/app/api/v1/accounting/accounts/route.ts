import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const db = await getDb();
    const result = await db.request().query(`
      SELECT AccountCode, AccountName, AccountType, Category, IsActive, CreatedAt
      FROM ChartOfAccounts
      ORDER BY AccountCode ASC
    `);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        accounts: result.recordset,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, errorResponse } = validateApiAuth(req, 'accounting.accounts.create');
    if (errorResponse) return errorResponse;


    const body = await req.json();
    const { accountCode, accountName, accountType, category } = body;

    if (!accountCode || !accountName || !accountType) {
      return NextResponse.json(
        { status: 'ERROR', message: 'accountCode, accountName, and accountType are required.' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if account already exists
    const checkRes = await db.request()
      .input('code', accountCode)
      .query("SELECT AccountCode FROM ChartOfAccounts WHERE AccountCode = @code");

    if (checkRes.recordset.length) {
      return NextResponse.json(
        { status: 'ERROR', message: `Account code ${accountCode} already exists.` },
        { status: 409 }
      );
    }

    await db.request()
      .input('code', accountCode)
      .input('name', accountName)
      .input('type', accountType)
      .input('cat', category || 'General')
      .query(`
        INSERT INTO ChartOfAccounts
          (AccountCode, AccountName, AccountType, Category, IsActive)
        VALUES
          (@code, @name, @type, @cat, 1)
      `);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        accountCode,
        accountName,
        accountType,
        category: category || 'General',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
