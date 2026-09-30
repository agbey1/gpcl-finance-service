import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const db = await getDb();

    const result = await db.request().query(`
      SELECT
        coa.AccountCode,
        coa.AccountName,
        coa.AccountType,
        coa.Category,
        ISNULL(SUM(jel.Debit), 0) AS TotalDebit,
        ISNULL(SUM(jel.Credit), 0) AS TotalCredit
      FROM ChartOfAccounts coa
      LEFT JOIN JournalEntryLines jel ON coa.Id = jel.AccountId
      LEFT JOIN JournalEntries je ON jel.JournalEntryId = je.Id
      WHERE je.Status = 'POSTED' OR je.Id IS NULL
      GROUP BY coa.Id, coa.AccountCode, coa.AccountName, coa.AccountType, coa.Category
      ORDER BY coa.AccountCode ASC
    `);

    const accounts = result.recordset;
    const totalDebit = accounts.reduce((sum: number, acc: any) => sum + Number(acc.TotalDebit), 0);
    const totalCredit = accounts.reduce((sum: number, acc: any) => sum + Number(acc.TotalCredit), 0);
    const variance = Math.abs(totalDebit - totalCredit);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        reportDate: new Date().toISOString().slice(0, 10),
        trialBalance: accounts,
        totals: {
          totalDebit: Number(totalDebit.toFixed(2)),
          totalCredit: Number(totalCredit.toFixed(2)),
          variance: Number(variance.toFixed(2)),
          isBalanced: variance < 0.01,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Internal server error' }, { status: 500 });
  }
}
