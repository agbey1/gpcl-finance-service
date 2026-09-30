'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Printer, Download, RefreshCw } from 'lucide-react';
import { exportToExcel, exportToCsv, exportToPdf } from '@/lib/exportUtils';
import { api, day, errMsg, fmt, todayIso } from '@/lib/clientApi';

type ReportType = 'DAY_BOOK' | 'TRIAL_BALANCE' | 'PROFIT_LOSS' | 'BALANCE_SHEET' | 'AGING_ANALYSIS' | 'TAX_RETURN';

const REPORTS: { type: ReportType; label: string; range: 'period' | 'asOf' | 'none' }[] = [
  { type: 'DAY_BOOK', label: 'Day Book', range: 'period' },
  { type: 'TRIAL_BALANCE', label: 'Trial Balance', range: 'asOf' },
  { type: 'PROFIT_LOSS', label: 'Profit & Loss', range: 'period' },
  { type: 'BALANCE_SHEET', label: 'Balance Sheet', range: 'asOf' },
  { type: 'AGING_ANALYSIS', label: 'AR Aging', range: 'none' },
  { type: 'TAX_RETURN', label: 'Levy Return', range: 'period' },
];

type Column = { header: string; key: string; money?: boolean };
type ReportRow = Record<string, string | number>;
interface Report {
  title: string;
  columns: Column[];
  rows: ReportRow[];
  footer?: ReportRow;
  notes?: string[];
}

interface BalanceRow {
  AccountCode: string;
  AccountName: string;
  AccountType: string;
  TotalDebit: number;
  TotalCredit: number;
  Balance: number;
}

const firstOfYear = () => `${todayIso().slice(0, 4)}-01-01`;

async function buildReport(type: ReportType, from: string, to: string): Promise<Report> {
  switch (type) {
    case 'DAY_BOOK': {
      const d = await api<{ lines: { EntryDate: string; EntryNumber: string; SourceModule: string; AccountCode: string; AccountName: string; Description: string | null; EntryDescription: string; Debit: number; Credit: number }[] }>(
        `/api/v1/journals/events/query?lines=1&from=${from}&to=${to}&take=5000`
      );
      const rows = d.lines.map((l) => ({
        date: day(l.EntryDate),
        voucherNo: l.EntryNumber,
        source: l.SourceModule,
        account: `${l.AccountCode} - ${l.AccountName}`,
        narration: l.Description || l.EntryDescription,
        debit: Number(l.Debit),
        credit: Number(l.Credit),
      }));
      return {
        title: `DAY BOOK ${from} TO ${to}`,
        columns: [
          { header: 'Date', key: 'date' },
          { header: 'Voucher No', key: 'voucherNo' },
          { header: 'Source', key: 'source' },
          { header: 'Account', key: 'account' },
          { header: 'Narration', key: 'narration' },
          { header: 'Debit (GHS)', key: 'debit', money: true },
          { header: 'Credit (GHS)', key: 'credit', money: true },
        ],
        rows,
        footer: { date: 'TOTAL', debit: rows.reduce((s, r) => s + r.debit, 0), credit: rows.reduce((s, r) => s + r.credit, 0) },
        notes: rows.length >= 5000 ? ['Showing the first 5,000 lines; narrow the date range for the rest.'] : undefined,
      };
    }
    case 'TRIAL_BALANCE': {
      const d = await api<{ trialBalance: BalanceRow[]; totals: { totalDebit: number; totalCredit: number; isBalanced: boolean } }>(
        `/api/v1/reports/trial-balance?asOf=${to}`
      );
      // Present each account's net balance in its debit or credit column.
      const rows = d.trialBalance
        .filter((a) => Number(a.TotalDebit) || Number(a.TotalCredit))
        .map((a) => {
          const net = Math.round((Number(a.TotalDebit) - Number(a.TotalCredit)) * 100) / 100;
          return { code: a.AccountCode, name: a.AccountName, type: a.AccountType, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
        });
      const dr = rows.reduce((s, r) => s + r.debit, 0);
      const cr = rows.reduce((s, r) => s + r.credit, 0);
      return {
        title: `TRIAL BALANCE AS AT ${to}`,
        columns: [
          { header: 'Code', key: 'code' },
          { header: 'Account', key: 'name' },
          { header: 'Type', key: 'type' },
          { header: 'Debit (GHS)', key: 'debit', money: true },
          { header: 'Credit (GHS)', key: 'credit', money: true },
        ],
        rows,
        footer: { code: 'TOTAL', debit: dr, credit: cr },
        notes: [d.totals.isBalanced ? 'The ledger balances.' : 'WARNING: total debits and credits differ.'],
      };
    }
    case 'PROFIT_LOSS': {
      const d = await api<{ accounts: BalanceRow[]; incomeStatement: { totalRevenue: number; totalExpense: number; netProfit: number } }>(
        `/api/v1/reports/financial-statements?from=${from}&to=${to}`
      );
      const section = (t: string) => d.accounts.filter((a) => a.AccountType === t && Number(a.Balance));
      const rows: ReportRow[] = [
        { name: 'REVENUE', amount: '' },
        ...section('REVENUE').map((a) => ({ code: a.AccountCode, name: a.AccountName, amount: Number(a.Balance) })),
        { name: 'Total revenue', amount: d.incomeStatement.totalRevenue },
        { name: 'EXPENSES', amount: '' },
        ...section('EXPENSE').map((a) => ({ code: a.AccountCode, name: a.AccountName, amount: Number(a.Balance) })),
        { name: 'Total expenses', amount: d.incomeStatement.totalExpense },
      ];
      return {
        title: `PROFIT & LOSS ${from} TO ${to}`,
        columns: [{ header: 'Code', key: 'code' }, { header: 'Line', key: 'name' }, { header: 'Amount (GHS)', key: 'amount', money: true }],
        rows,
        footer: { name: d.incomeStatement.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS', amount: d.incomeStatement.netProfit },
      };
    }
    case 'BALANCE_SHEET': {
      const [tb, fs] = await Promise.all([
        api<{ trialBalance: BalanceRow[] }>(`/api/v1/reports/trial-balance?asOf=${to}`),
        api<{ balanceSheet: { totalAssets: number; totalLiabilities: number; statedCapitalAndEquities: number; retainedEarnings: number; totalLiabilitiesAndEquity: number; isBalanced: boolean } }>(
          `/api/v1/reports/financial-statements?from=${firstOfYear()}&to=${to}`
        ),
      ]);
      const bs = fs.balanceSheet;
      const section = (t: string) => tb.trialBalance.filter((a) => a.AccountType === t && Number(a.Balance)).map((a) => ({ code: a.AccountCode, name: a.AccountName, amount: Number(a.Balance) }));
      return {
        title: `BALANCE SHEET AS AT ${to}`,
        columns: [{ header: 'Code', key: 'code' }, { header: 'Line', key: 'name' }, { header: 'Amount (GHS)', key: 'amount', money: true }],
        rows: [
          { name: 'ASSETS', amount: '' },
          ...section('ASSET'),
          { name: 'Total assets', amount: bs.totalAssets },
          { name: 'LIABILITIES', amount: '' },
          ...section('LIABILITY'),
          { name: 'Total liabilities', amount: bs.totalLiabilities },
          { name: 'EQUITY', amount: '' },
          ...section('EQUITY'),
          { name: 'Retained earnings (cumulative profit)', amount: bs.retainedEarnings },
          { name: 'Total equity', amount: bs.statedCapitalAndEquities + bs.retainedEarnings },
        ],
        footer: { name: 'TOTAL LIABILITIES & EQUITY', amount: bs.totalLiabilitiesAndEquity },
        notes: [bs.isBalanced ? 'Assets equal liabilities plus equity.' : 'WARNING: the balance sheet does not balance.'],
      };
    }
    case 'AGING_ANALYSIS': {
      const d = await api<{ reportDate: string; agingSummary: { ClientName: string; CurrentAmount: number; Days1To30: number; Days31To60: number; Days61To90: number; DaysOver90: number; TotalBalance: number }[] }>(
        '/api/v1/reports/ar-aging'
      );
      const rows = d.agingSummary.map((a) => ({
        client: a.ClientName,
        current: Number(a.CurrentAmount),
        d30: Number(a.Days1To30),
        d60: Number(a.Days31To60),
        d90: Number(a.Days61To90),
        over90: Number(a.DaysOver90),
        total: Number(a.TotalBalance),
      }));
      const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + Number(r[k]), 0);
      return {
        title: `ACCOUNTS RECEIVABLE AGING AS AT ${d.reportDate}`,
        columns: [
          { header: 'Customer', key: 'client' },
          { header: 'Not yet due', key: 'current', money: true },
          { header: '1-30 days', key: 'd30', money: true },
          { header: '31-60 days', key: 'd60', money: true },
          { header: '61-90 days', key: 'd90', money: true },
          { header: '90+ days', key: 'over90', money: true },
          { header: 'Total', key: 'total', money: true },
        ],
        rows,
        footer: { client: 'TOTAL', current: sum('current'), d30: sum('d30'), d60: sum('d60'), d90: sum('d90'), over90: sum('over90'), total: sum('total') },
        notes: ['Days past the invoice due date.'],
      };
    }
    case 'TAX_RETURN': {
      const d = await api<{ taxableSales: number; levies: { levy: string; rate: number; amount: number }[]; totalLevies: number; invoiceCount: number; creditNoteCount: number }>(
        `/api/v1/reports/tax-return?from=${from}&to=${to}`
      );
      return {
        title: `GRA LEVY RETURN ${from} TO ${to}`,
        columns: [{ header: 'Line', key: 'name' }, { header: 'Rate', key: 'rate' }, { header: 'Amount (GHS)', key: 'amount', money: true }],
        rows: [
          { name: 'Taxable sales (net of credit notes and voids)', rate: '', amount: d.taxableSales },
          ...d.levies.map((l) => ({ name: `${l.levy} payable`, rate: `${(l.rate * 100).toFixed(1)}%`, amount: l.amount })),
        ],
        footer: { name: 'TOTAL LEVIES PAYABLE', amount: d.totalLevies },
        notes: [`${d.invoiceCount} invoices, ${d.creditNoteCount} credit notes in the period. Output levies only.`],
      };
    }
  }
}

export default function ReportsPage() {
  const [active, setActive] = useState<ReportType>('TRIAL_BALANCE');
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(todayIso);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (type: ReportType, f: string, t: string) => {
    setLoading(true);
    setError('');
    try {
      setReport(await buildReport(type, f, t));
    } catch (e) {
      setReport(null);
      setError(errMsg(e, 'Failed to run report'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Run the selected report; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run(active, from, to);
    // Dates are applied with the Run button, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, run]);

  const meta = REPORTS.find((r) => r.type === active)!;
  const exportData = () =>
    report
      ? [...report.rows, ...(report.footer ? [report.footer] : [])].map((r) => {
          const o: ReportRow = {};
          report.columns.forEach((c) => { o[c.key] = c.money && typeof r[c.key] === 'number' ? fmt(r[c.key] as number) : r[c.key] ?? ''; });
          return o;
        })
      : [];
  const fileName = `${meta.label.replace(/\W+/g, '_')}_${meta.range === 'period' ? `${from}_${to}` : to}`;
  const inputStyle = { padding: '7px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };
  const cell = (c: Column, r: ReportRow) => (c.money && typeof r[c.key] === 'number' ? fmt(r[c.key] as number) : r[c.key] ?? '');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Financial Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>Generated from posted ledger entries.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" disabled={!report} onClick={() => report && exportToExcel(exportData(), report.columns, fileName)}><FileSpreadsheet size={16} /> Excel</button>
          <button className="btn btn-secondary" disabled={!report} onClick={() => report && exportToCsv(exportData(), report.columns, fileName)}><Download size={16} /> CSV</button>
          <button className="btn btn-secondary" disabled={!report} onClick={() => report && exportToPdf(report.title, report.columns, exportData(), fileName)}><FileText size={16} /> PDF</button>
          <button className="btn btn-secondary" disabled={!report} onClick={() => window.print()}><Printer size={16} /> Print</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {REPORTS.map((r) => (
          <button key={r.type} className={active === r.type ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActive(r.type)}>{r.label}</button>
        ))}
      </div>

      {meta.range !== 'none' && (
        <div className="card no-print" style={{ padding: '12px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {meta.range === 'period' && <label style={{ fontSize: '13px' }}>From <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={inputStyle} /></label>}
          <label style={{ fontSize: '13px' }}>{meta.range === 'period' ? 'To' : 'As at'} <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} /></label>
          <button className="btn btn-secondary" onClick={() => run(active, from, to)} disabled={loading}><RefreshCw size={14} /> Run</button>
        </div>
      )}

      <div className="card">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Running report…</p>}
        {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}
        {report && !loading && (
          <>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>{report.title}</h3>
            <table className="data-table">
              <thead>
                <tr>{report.columns.map((c) => <th key={c.key} style={{ textAlign: c.money ? 'right' : 'left' }}>{c.header}</th>)}</tr>
              </thead>
              <tbody>
                {report.rows.length === 0 && <tr><td colSpan={report.columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No activity.</td></tr>}
                {report.rows.map((r, i) => {
                  const heading = r.amount === '' && !r.code;
                  return (
                    <tr key={i} style={heading ? { fontWeight: 700, background: 'var(--bg-primary)' } : undefined}>
                      {report.columns.map((c) => <td key={c.key} style={{ textAlign: c.money ? 'right' : 'left' }}>{cell(c, r)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
              {report.footer && (
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    {report.columns.map((c) => <td key={c.key} style={{ textAlign: c.money ? 'right' : 'left' }}>{report.footer ? cell(c, report.footer) : ''}</td>)}
                  </tr>
                </tfoot>
              )}
            </table>
            {report.notes?.map((n) => <p key={n} style={{ fontSize: '12px', color: n.startsWith('WARNING') ? '#dc2626' : 'var(--text-muted)', marginTop: '10px' }}>{n}</p>)}
          </>
        )}
      </div>
    </div>
  );
}
