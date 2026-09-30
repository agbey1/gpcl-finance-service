'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, ShieldAlert, RefreshCw } from 'lucide-react';
import { api, errMsg, fmt, postJson } from '@/lib/clientApi';

interface Period {
  fiscalYear: number;
  periodNumber: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  entries: number;
  totalDebit: number;
  totalCredit: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const thisYear = new Date().getUTCFullYear();

export default function PeriodClosePage() {
  const [year, setYear] = useState(thisYear);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ periods: Period[] }>(`/api/v1/accounting/periods?year=${y}`);
      setPeriods(data.periods);
    } catch (e) {
      setError(errMsg(e, 'Failed to load periods'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load on mount / year change; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(year);
  }, [load, year]);

  const closePeriod = async (p: Period) => {
    const label = `${MONTHS[p.periodNumber - 1]} ${p.fiscalYear}`;
    if (!confirm(`Close ${label}? No further postings will be accepted for this month. Re-opening requires a database administrator.`)) return;
    setBusy(p.periodNumber);
    try {
      await postJson('/api/v1/accounting/periods/close', {
        year: p.fiscalYear,
        periodNumber: p.periodNumber,
        notes: `${label} closed via Period Close screen`,
      });
      await load(year);
    } catch (e) {
      alert(errMsg(e, 'Failed to close period'));
    } finally {
      setBusy(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Financial Period Close</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Close months to stop any further postings (invoices, payments, journals, voids) dated in them.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>FY {y}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={() => load(year)} disabled={loading}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div style={{ padding: '14px 18px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid #d97706', borderRadius: '8px', color: '#d97706', fontSize: '13.5px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <ShieldAlert size={18} />
        <span>Closing is permanent from this screen. The ledger for the month must balance before it can be closed.</span>
      </div>

      <div className="card">
        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Date range</th>
              <th style={{ textAlign: 'right' }}>Journals</th>
              <th style={{ textAlign: 'right' }}>Debits (GHS)</th>
              <th style={{ textAlign: 'right' }}>Credits (GHS)</th>
              <th>Status</th>
              <th>Closed by</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>}
            {!loading && periods.map((p) => {
              const ended = p.endDate < today;
              return (
                <tr key={p.periodNumber}>
                  <td style={{ fontWeight: '600' }}>{MONTHS[p.periodNumber - 1]} {p.fiscalYear}</td>
                  <td style={{ fontSize: '12.5px' }}>{p.startDate} → {p.endDate}</td>
                  <td style={{ textAlign: 'right' }}>{p.entries}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(p.totalDebit)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(p.totalCredit)}</td>
                  <td><span className={`badge ${p.isClosed ? 'badge-danger' : 'badge-success'}`}>{p.isClosed ? 'CLOSED' : 'OPEN'}</span></td>
                  <td style={{ fontSize: '12.5px' }}>{p.closedBy ? `${p.closedBy} · ${String(p.closedAt).slice(0, 10)}` : '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {!p.isClosed && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        disabled={!ended || busy !== null}
                        title={ended ? 'Close this period' : 'The month has not ended yet'}
                        onClick={() => closePeriod(p)}
                      >
                        <Lock size={12} />
                        {busy === p.periodNumber ? 'Closing…' : 'Close'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
