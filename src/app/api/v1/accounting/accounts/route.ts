import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { ApiError, errorResponse, parseBody } from '@/lib/apiErrors';
import { logAudit } from '@/lib/auditLog';

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;

const createAccountSchema = z.object({
  accountCode: z.string().trim().regex(/^[0-9A-Z-]{2,20}$/, 'Account code must be 2-20 digits/letters'),
  accountName: z.string().trim().min(2).max(255),
  accountType: z.enum(ACCOUNT_TYPES),
  category: z.string().trim().max(100).optional(),
  isControl: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = validateApiAuth(req, 'accounting.view');
  if (authError) return authError;

  try {
    const db = await getDb();
    // Balance is posted activity in the account's natural direction:
    // debit-positive for assets/expenses, credit-positive for the rest.
    const result = await db.request().query(`
      SELECT
        coa.AccountCode, coa.AccountName, coa.AccountType, coa.Category, coa.IsControl, coa.IsActive, coa.CreatedAt,
        ISNULL(b.TotalDebit, 0) AS TotalDebit,
        ISNULL(b.TotalCredit, 0) AS TotalCredit,
        CASE WHEN coa.AccountType IN ('ASSET', 'EXPENSE')
             THEN ISNULL(b.TotalDebit, 0) - ISNULL(b.TotalCredit, 0)
             ELSE ISNULL(b.TotalCredit, 0) - ISNULL(b.TotalDebit, 0) END AS Balance
      FROM ChartOfAccounts coa
      OUTER APPLY (
        SELECT SUM(l.Debit) AS TotalDebit, SUM(l.Credit) AS TotalCredit
        FROM JournalEntryLines l
        INNER JOIN JournalEntries e ON e.Id = l.JournalEntryId AND e.Status = 'POSTED'
        WHERE l.AccountId = coa.Id
      ) b
      ORDER BY coa.AccountCode ASC
    `);

    return NextResponse.json({ status: 'SUCCESS', accounts: result.recordset });
  } catch (err) {
    return serverError(err, '/api/v1/accounting/accounts');
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'accounting.accounts.create');
  if (authError || !session) return authError!;

  try {
    const input = await parseBody(req, createAccountSchema);
    const db = await getDb();

    const checkRes = await db.request()
      .input('code', input.accountCode)
      .query('SELECT AccountCode FROM ChartOfAccounts WHERE AccountCode = @code');
    if (checkRes.recordset.length) {
      throw new ApiError(409, `Account code ${input.accountCode} already exists.`);
    }

    await db.request()
      .input('code', input.accountCode)
      .input('name', input.accountName)
      .input('type', input.accountType)
      .input('cat', input.category || 'General')
      .input('control', input.isControl ? 1 : 0)
      .query(`
        INSERT INTO ChartOfAccounts (AccountCode, AccountName, AccountType, Category, IsControl, IsActive)
        VALUES (@code, @name, @type, @cat, @control, 1)
      `);

    await logAudit({
      entityType: 'ACCOUNT',
      entityId: input.accountCode,
      action: 'CREATE',
      userId: session.userId,
      newValue: input,
      description: `Account ${input.accountCode} ${input.accountName} created`,
    });

    return NextResponse.json({ status: 'SUCCESS', ...input, category: input.category || 'General' }, { status: 201 });
  } catch (err) {
    return errorResponse(err, 'POST /api/v1/accounting/accounts');
  }
}
