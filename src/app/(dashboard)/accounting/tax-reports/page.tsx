'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { api, errMsg, fmt } from '@/lib/clientApi';

interface TaxReturn {
  period: { from: string; to: string };
  taxableSales: number;
  levies: { levy: string; accountCode: string; rate: number; amount: number; expected: number }[];
  totalLevies: number;
  grossSales: number;
  invoiceCount: number;
  creditNoteCount: number;
}

interface Row {
  label: string;
  data: TaxReturn;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() - 1 - i; // start with last complete month
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    return {
      label: `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  });
}

const levyAmount = (r: TaxReturn, levy: string) => r.levies.find((l) => l.levy === levy)?.amount ?? 0;

export default function TaxReportsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const months = lastMonths(6);
      const results = await Promise.all(
        months.map((m) => api<TaxReturn>(`/api/v1/reports/tax-return?from=${m.from}&to=${m.to}`))
      );
      setRows(results.map((data, i) => ({ label: months[i].label, data })));
    } catch (e) {
      setError(errMsg(e, 'Failed to load tax returns'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load on mount; state updates happen after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const latest = rows[0]?.data;
  const exportRows = rows.map((r) => ({
    period: r.label,
    netSales: fmt(r.data.taxableSales),
    vat: fmt(levyAmount(r.data, 'VAT')),
    nhil: fmt(levyAmount(r.data, 'NHIL')),
    getfund: fmt(levyAmount(r.data, 'GETFund')),
    total: fmt(r.data.totalLevies),
    invoices: r.data.invoiceCount,
  }));
  const exportCols = [
    { header: 'Filing Period', key: 'period' },
    { header: 'Taxable Sales (GHS)', key: 'netSales' },
    { header: 'VAT 15%', key: 'vat' },
    { header: 'NHIL 2.5%', key: 'nhil' },
    { header: 'GETFund 2.5%', key: 'getfund' },
    { header: 'Total Levies', key: 'total' },
    { header: 'Invoices', key: 'invoices' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Ghana Statutory Levy Returns (GRA)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Output VAT (15%), NHIL (2.5%) and GETFund (2.5%) per month, from the general ledger (voids and credit notes netted off).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /></button>
          <button className="btn btn-secondary" onClick={() => exportToExcel(exportRows, exportCols, 'GRA_Levy_Returns')} disabled={!rows.length}>
            <Download size={16} /> Excel
          </button>
          <button className="btn btn-primary" onClick={() => exportToPdf('GHANA GRA LEVY RETURN SUMMARY', exportCols, exportRows, 'GRA_Levy_Returns')} disabled={!rows.length}>
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
        {(['VAT', 'NHIL', 'GETFund'] as const).map((levy) => (
          <div className="card" key={levy}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{levy.toUpperCase()} PAYABLE — {rows[0]?.label ?? '…'}</p>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: '4px' }}>
              GHS {latest ? fmt(levyAmount(latest, levy)) : '—'}
            </h2>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Monthly levy register (last 6 complete months)</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Period</th>
              <th style={{ textAlign: 'right' }}>Taxable Sales</th>
              <th style={{ textAlign: 'right' }}>VAT 15%</th>
              <th style={{ textAlign: 'right' }}>NHIL 2.5%</th>
              <th style={{ textAlign: 'right' }}>GETFund 2.5%</th>
              <th style={{ textAlign: 'right' }}>Total Levies</th>
              <th style={{ textAlign: 'right' }}>Invoices / Credit notes</th>
              <th>Check</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>}
            {rows.map((r) => {
              // Levies should equal rate x taxable sales (within rounding) when every sale carries levies.
              const mismatch = r.data.levies.some((l) => Math.abs(l.amount - l.expected) > 0.05 * Math.max(1, r.data.invoiceCount));
              return (
                <tr key={r.label}>
                  <td style={{ fontWeight: '600' }}>{r.label}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(r.data.taxableSales)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(levyAmount(r.data, 'VAT'))}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(levyAmount(r.data, 'NHIL'))}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(levyAmount(r.data, 'GETFund'))}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(r.data.totalLevies)}</td>
                  <td style={{ textAlign: 'right' }}>{r.data.invoiceCount} / {r.data.creditNoteCount}</td>
                  <td>
                    <span className={`badge ${mismatch ? 'badge-warning' : 'badge-success'}`} title={mismatch ? 'Levies differ from rate × taxable sales; some sales may be levy-exempt or mis-posted' : ''}>
                      {mismatch ? 'REVIEW' : 'OK'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Output levies only; input VAT on purchases is not tracked in this service. Withholding tax is not included.
        </p>
      </div>
    </div>
  );
}
