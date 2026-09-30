import { NextRequest } from 'next/server';
import { buildStatements, naturalBalance, type AccountBalanceRow } from '../lib/ledger';
import { budgetVarianceRow } from '../lib/budgeting';
import { metricsFromBalances } from '../lib/financialRatios';
import { POST as reverseJournal } from '../app/api/v1/journals/[journalId]/reverse/route';
import { POST as postJournalEvent } from '../app/api/v1/journals/events/route';
import { authHeader } from '../test-utils/auth';

const row = (
  AccountCode: string,
  AccountType: AccountBalanceRow['AccountType'],
  TotalDebit: number,
  TotalCredit: number,
  Category: string | null = null,
): AccountBalanceRow => ({ AccountCode, AccountName: AccountCode, AccountType, Category, TotalDebit, TotalCredit });

// A small, balanced ledger: capital 1000, sales 1200 (+ 240 levies) on credit,
// 500 collected into the bank, 300 COGS paid from the bank.
const ledger: AccountBalanceRow[] = [
  row('1002', 'ASSET', 500, 300, 'Bank'),
  row('1001', 'ASSET', 1000, 0, 'Cash'),
  row('1100', 'ASSET', 1440, 500, 'Receivables'),
  row('2100', 'LIABILITY', 0, 180, 'Tax'),
  row('2102', 'LIABILITY', 0, 30, 'Tax'),
  row('2103', 'LIABILITY', 0, 30, 'Tax'),
  row('3001', 'EQUITY', 0, 1000),
  row('4001', 'REVENUE', 0, 1200),
  row('5001', 'EXPENSE', 300, 0, 'COGS'),
];

describe('Ledger statements', () => {
  it('uses each account type\'s natural sign', () => {
    expect(naturalBalance(row('1100', 'ASSET', 100, 40))).toBe(60);
    expect(naturalBalance(row('4001', 'REVENUE', 10, 110))).toBe(100);
    expect(naturalBalance(row('2100', 'LIABILITY', 0, 15))).toBe(15);
  });

  it('builds a P&L and a balance sheet that balances', () => {
    const { incomeStatement, balanceSheet } = buildStatements(ledger, ledger);
    expect(incomeStatement).toEqual({ totalRevenue: 1200, totalExpense: 300, netProfit: 900 });
    expect(balanceSheet.totalAssets).toBe(200 + 1000 + 940);
    expect(balanceSheet.totalLiabilities).toBe(240);
    expect(balanceSheet.retainedEarnings).toBe(900);
    expect(balanceSheet.totalLiabilitiesAndEquity).toBe(2140);
    expect(balanceSheet.isBalanced).toBe(true);
  });

  it('separates period profit from cumulative retained earnings', () => {
    const period = [row('4001', 'REVENUE', 0, 200), row('5001', 'EXPENSE', 50, 0)];
    const { incomeStatement, balanceSheet } = buildStatements(period, ledger);
    expect(incomeStatement.netProfit).toBe(150);
    expect(balanceSheet.retainedEarnings).toBe(900);
  });
});

describe('Budget variance', () => {
  it('treats overspending on an expense as unfavourable', () => {
    const v = budgetVarianceRow('6100', 'Salaries', 'EXPENSE', 1000, 1200);
    expect(v.actual).toBe(1200);
    expect(v.status).toBe('UNFAVORABLE');
  });

  it('treats revenue above budget as favourable (credit-natured account)', () => {
    // Revenue is credit-natured: a net debit of -1500 means 1500 of revenue.
    const v = budgetVarianceRow('4001', 'Sales', 'REVENUE', 1000, -1500);
    expect(v.actual).toBe(1500);
    expect(v.status).toBe('FAVORABLE');
  });

  it('reports within 5% as on track', () => {
    expect(budgetVarianceRow('6100', 'Salaries', 'EXPENSE', 1000, 970).status).toBe('ON_TRACK');
  });
});

describe('Financial ratio inputs', () => {
  it('aggregates across all accounts (not just the first row)', () => {
    const m = metricsFromBalances(ledger, ledger);
    expect(m.assets).toBe(2140);
    expect(m.currentAssets).toBe(2140);
    expect(m.accountsReceivable).toBe(940);
    expect(m.currentLiabilities).toBe(240);
    expect(m.revenue).toBe(1200);
    expect(m.netIncome).toBe(900);
    expect(m.equity).toBe(1900);
  });

  it('excludes inventory from quick assets', () => {
    const m = metricsFromBalances([...ledger, row('1201', 'ASSET', 400, 0, 'Inventory')], ledger);
    expect(m.currentAssets - m.quickAssets).toBe(400);
  });
});

describe('Journal endpoints guards', () => {
  const post = (url: string, body: unknown, headers: Record<string, string>) =>
    new NextRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

  it('requires accounting.journal.reverse to reverse', async () => {
    const res = await reverseJournal(
      post('http://localhost/api/v1/journals/3/reverse', { reason: 'wrong account' }, authHeader('AUDITOR', ['accounting.journal.view'])),
      { params: Promise.resolve({ journalId: '3' }) }
    );
    expect(res.status).toBe(403);
  });

  it('requires a reason to reverse', async () => {
    const res = await reverseJournal(
      post('http://localhost/api/v1/journals/3/reverse', {}, authHeader()),
      { params: Promise.resolve({ journalId: '3' }) }
    );
    expect(res.status).toBe(400);
  });

  it('rejects an unbalanced manual journal before touching the database', async () => {
    const res = await postJournalEvent(
      post('http://localhost/api/v1/journals/events', {
        sourceModule: 'MANUAL_JOURNAL',
        sourceId: 'T1',
        description: 'test',
        lines: [{ accountCode: '6100', debit: 100 }, { accountCode: '1001', credit: 99.99 }],
      }, authHeader())
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('UNBALANCED_JOURNAL');
  });
});
