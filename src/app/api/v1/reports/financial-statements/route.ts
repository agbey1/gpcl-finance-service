import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {

    const db = await getDb();

    // Query aggregated balances by Chart of Accounts type
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
      LEFT JOIN JournalEntries je ON jel.JournalEntryId = je.Id AND je.Status = 'POSTED'
      GROUP BY coa.AccountCode, coa.AccountName, coa.AccountType, coa.Category
      ORDER BY coa.AccountCode ASC
    `);

    const accounts = result.recordset;

    // Income Statement Breakdown
    let totalRevenue = 0;
    let totalExpense = 0;

    // Balance Sheet Breakdown
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    accounts.forEach((acc: any) => {
      const debit = Number(acc.TotalDebit);
      const credit = Number(acc.TotalCredit);

      if (acc.AccountType === 'REVENUE') {
        totalRevenue += (credit - debit);
      } else if (acc.AccountType === 'EXPENSE') {
        totalExpense += (debit - credit);
      } else if (acc.AccountType === 'ASSET') {
        totalAssets += (debit - credit);
      } else if (acc.AccountType === 'LIABILITY') {
        totalLiabilities += (credit - debit);
      } else if (acc.AccountType === 'EQUITY') {
        totalEquity += (credit - debit);
      }
    });

    const netProfit = totalRevenue - totalExpense;

    return NextResponse.json(
      {
        status: 'SUCCESS',
        reportDate: new Date().toISOString().slice(0, 10),
        incomeStatement: {
          totalRevenue,
          totalExpense,
          netProfit,
        },
        balanceSheet: {
          totalAssets,
          totalLiabilities,
          statedCapitalAndEquities: totalEquity,
          retainedEarnings: netProfit,
          totalLiabilitiesAndEquity: totalLiabilities + totalEquity + netProfit,
          isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)) < 0.01,
        },
        accounts,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/reports/financial-statements');
  }
}
