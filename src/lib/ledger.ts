import { getDb } from '@/lib/db';

export type AccountBalanceRow = {
  AccountCode: string;
  AccountName: string;
  AccountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  Category: string | null;
  TotalDebit: number;
  TotalCredit: number;
};

/**
 * Posted debit/credit totals per account for entries dated in [from, to]
 * (both optional, inclusive, YYYY-MM-DD). Every account is returned, with
 * zeros when it has no activity.
 */
export async function accountBalances(opts: { from?: string; to?: string } = {}): Promise<AccountBalanceRow[]> {
  const db = await getDb();
  const req = db.request();
  const conds = [`e.Status = 'POSTED'`];
  if (opts.from) {
    conds.push('e.EntryDate >= CAST(@from AS date)');
    req.input('from', opts.from);
  }
  if (opts.to) {
    conds.push('e.EntryDate < DATEADD(day, 1, CAST(@to AS date))');
    req.input('to', opts.to);
  }
  const result = await req.query(`
    SELECT coa.AccountCode, coa.AccountName, coa.AccountType, coa.Category,
           ISNULL(b.TotalDebit, 0) AS TotalDebit, ISNULL(b.TotalCredit, 0) AS TotalCredit
    FROM ChartOfAccounts coa
    OUTER APPLY (
      SELECT SUM(l.Debit) AS TotalDebit, SUM(l.Credit) AS TotalCredit
      FROM JournalEntryLines l
      INNER JOIN JournalEntries e ON e.Id = l.JournalEntryId
      WHERE l.AccountId = coa.Id AND ${conds.join(' AND ')}
    ) b
    ORDER BY coa.AccountCode
  `);
  return result.recordset.map((r: AccountBalanceRow) => ({
    ...r,
    TotalDebit: Number(r.TotalDebit),
    TotalCredit: Number(r.TotalCredit),
  }));
}

const cents = (n: number) => Math.round(n * 100);
const money = (c: number) => c / 100;

/** Natural-sign balance: debit-positive for assets/expenses, credit-positive otherwise. */
export function naturalBalance(r: Pick<AccountBalanceRow, 'AccountType' | 'TotalDebit' | 'TotalCredit'>): number {
  const net = cents(r.TotalDebit) - cents(r.TotalCredit);
  return money(r.AccountType === 'ASSET' || r.AccountType === 'EXPENSE' ? net : -net);
}

/**
 * Income statement for the period rows and balance sheet from cumulative rows.
 * With no closing entries, retained earnings are cumulative revenue - expenses.
 */
export function buildStatements(periodRows: AccountBalanceRow[], cumulativeRows: AccountBalanceRow[]) {
  const sumType = (rows: AccountBalanceRow[], type: AccountBalanceRow['AccountType']) =>
    rows.filter((r) => r.AccountType === type).reduce((s, r) => s + cents(naturalBalance(r)), 0);

  const revenue = sumType(periodRows, 'REVENUE');
  const expense = sumType(periodRows, 'EXPENSE');

  const assets = sumType(cumulativeRows, 'ASSET');
  const liabilities = sumType(cumulativeRows, 'LIABILITY');
  const equity = sumType(cumulativeRows, 'EQUITY');
  const retained = sumType(cumulativeRows, 'REVENUE') - sumType(cumulativeRows, 'EXPENSE');

  return {
    incomeStatement: {
      totalRevenue: money(revenue),
      totalExpense: money(expense),
      netProfit: money(revenue - expense),
    },
    balanceSheet: {
      totalAssets: money(assets),
      totalLiabilities: money(liabilities),
      statedCapitalAndEquities: money(equity),
      retainedEarnings: money(retained),
      totalLiabilitiesAndEquity: money(liabilities + equity + retained),
      isBalanced: assets === liabilities + equity + retained,
    },
  };
}
