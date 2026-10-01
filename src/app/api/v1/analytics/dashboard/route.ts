import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { accountBalances, naturalBalance } from '@/lib/ledger';
import { getAccountMap } from '@/lib/accountMap';

/**
 * Executive dashboard figures, all from posted ledger entries:
 * balances as at today, year-to-date P&L, six months of revenue vs COGS,
 * the largest expense accounts and the latest journals.
 */
export async function GET(req: NextRequest) {
  const { errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const yearStart = `${today.slice(0, 4)}-01-01`;
    const now = new Date();
    const sixMonthsStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)).toISOString().slice(0, 10);

    const db = await getDb();
    const gl = await getAccountMap(db);
    const [cumulative, ytd, monthly, recent] = await Promise.all([
      accountBalances({ to: today }),
      accountBalances({ from: yearStart, to: today }),
      db.request().input('from', sixMonthsStart).query(`
        SELECT YEAR(e.EntryDate) AS Y, MONTH(e.EntryDate) AS M,
               SUM(CASE WHEN coa.AccountType = 'REVENUE' THEN l.Credit - l.Debit ELSE 0 END) AS Revenue,
               SUM(CASE WHEN coa.AccountType = 'EXPENSE' AND coa.Category = 'COGS' THEN l.Debit - l.Credit ELSE 0 END) AS COGS,
               SUM(CASE WHEN coa.AccountType = 'EXPENSE' THEN l.Debit - l.Credit ELSE 0 END) AS Expenses
        FROM JournalEntries e
        INNER JOIN JournalEntryLines l ON l.JournalEntryId = e.Id
        INNER JOIN ChartOfAccounts coa ON coa.Id = l.AccountId
        WHERE e.Status = 'POSTED' AND e.EntryDate >= CAST(@from AS date)
        GROUP BY YEAR(e.EntryDate), MONTH(e.EntryDate)
      `),
      db.request().query(`
        SELECT TOP 6 Id, EntryNumber, EntryDate, SourceModule, Description
        FROM JournalEntries WHERE Status = 'POSTED'
        ORDER BY EntryDate DESC, Id DESC
      `),
    ]);

    const sum = (rows: typeof cumulative, pred: (r: (typeof cumulative)[number]) => boolean) =>
      Math.round(rows.filter(pred).reduce((t, r) => t + naturalBalance(r) * 100, 0)) / 100;
    const cat = (r: { Category: string | null }) => (r.Category || '').toLowerCase();

    const revenueYtd = sum(ytd, (r) => r.AccountType === 'REVENUE');
    const cogsYtd = sum(ytd, (r) => r.AccountType === 'EXPENSE' && cat(r) === 'cogs');
    const expensesYtd = sum(ytd, (r) => r.AccountType === 'EXPENSE');

    const monthRows = monthly.recordset as { Y: number; M: number; Revenue: number; COGS: number; Expenses: number }[];
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
      const row = monthRows.find((r) => r.Y === d.getUTCFullYear() && r.M === d.getUTCMonth() + 1);
      return {
        month: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        revenue: Number(row?.Revenue ?? 0),
        cogs: Number(row?.COGS ?? 0),
        expenses: Number(row?.Expenses ?? 0),
      };
    });

    const expenseAccounts = ytd
      .filter((r) => r.AccountType === 'EXPENSE')
      .map((r) => ({ name: r.AccountName, value: naturalBalance(r) }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
    const topExpenses = expenseAccounts.slice(0, 5);
    const otherExpenses = expenseAccounts.slice(5).reduce((s, r) => s + r.value, 0);
    if (otherExpenses > 0) topExpenses.push({ name: 'Other', value: Math.round(otherExpenses * 100) / 100 });

    return NextResponse.json({
      status: 'SUCCESS',
      asOf: today,
      balances: {
        receivables: sum(cumulative, (r) => r.AccountType === 'ASSET' && cat(r) === 'receivables'),
        bank: sum(cumulative, (r) => r.AccountType === 'ASSET' && cat(r) === 'bank'),
        cash: sum(cumulative, (r) => r.AccountType === 'ASSET' && cat(r) === 'cash'),
        leviesPayable: sum(cumulative, (r) => [gl.vat, gl.nhil, gl.getfund].includes(r.AccountCode)),
      },
      yearToDate: {
        from: yearStart,
        revenue: revenueYtd,
        cogs: cogsYtd,
        grossProfit: Math.round((revenueYtd - cogsYtd) * 100) / 100,
        expenses: expensesYtd,
        netProfit: Math.round((revenueYtd - expensesYtd) * 100) / 100,
      },
      months,
      topExpenses,
      recentJournals: recent.recordset,
    });
  } catch (err) {
    return serverError(err, '/api/v1/analytics/dashboard');
  }
}
