import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

/** Active bank accounts with their GL balance (posted debits - credits). */
export async function GET(req: NextRequest) {
  const { errorResponse } = validateApiAuth(req, 'reconciliation.manage');
  if (errorResponse) return errorResponse;

  try {
    const db = await getDb();
    const result = await db.request().query(`
      SELECT ba.Id, ba.AccountName, ba.AccountNumber, ba.BankName, ba.GLAccountCode, ba.Currency,
             ISNULL(b.Balance, 0) AS GLBalance
      FROM BankAccounts ba
      INNER JOIN ChartOfAccounts coa ON coa.AccountCode = ba.GLAccountCode
      OUTER APPLY (
        SELECT SUM(l.Debit - l.Credit) AS Balance
        FROM JournalEntryLines l
        INNER JOIN JournalEntries e ON e.Id = l.JournalEntryId AND e.Status = 'POSTED'
        WHERE l.AccountId = coa.Id
      ) b
      WHERE ba.IsActive = 1
      ORDER BY ba.AccountName
    `);
    return NextResponse.json({ status: 'SUCCESS', bankAccounts: result.recordset });
  } catch (err) {
    return serverError(err, '/api/v1/reconciliation/bank-accounts');
  }
}
