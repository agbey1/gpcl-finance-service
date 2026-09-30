'use client';

import { useState } from 'react';
import { Lock, Unlock, ShieldAlert, CheckCircle2, Calendar } from 'lucide-react';

interface Period {
  periodKey: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'LOCKED' | 'CLOSED';
  closedBy?: string;
}

const initialPeriods: Period[] = [
  { periodKey: '2026-09', name: 'September 2026', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' },
  { periodKey: '2026-08', name: 'August 2026', startDate: '2026-08-01', endDate: '2026-08-31', status: 'LOCKED', closedBy: 'admin@gpcl.com' },
  { periodKey: '2026-07', name: 'July 2026', startDate: '2026-07-01', endDate: '2026-07-31', status: 'CLOSED', closedBy: 'admin@gpcl.com' },
  { periodKey: '2026-06', name: 'June 2026', startDate: '2026-06-01', endDate: '2026-06-30', status: 'CLOSED', closedBy: 'admin@gpcl.com' },
];

export default function PeriodClosePage() {
  const [periods, setPeriods] = useState<Period[]>(initialPeriods);

  const togglePeriodLock = async (periodKey: string) => {
    const [yearStr, monthStr] = periodKey.split('-');
    const year = parseInt(yearStr, 10);
    const periodNumber = parseInt(monthStr, 10);

    try {
      const res = await fetch('/api/v1/accounting/periods/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, periodNumber, notes: `Period ${periodKey} locked via Financial Period Close UI` }),
      });
      const data = await res.json();
      if (!res.ok || data.status === 'ERROR') {
        alert(data.message || 'Failed to lock period');
        return;
      }

      setPeriods(periods.map(p => p.periodKey === periodKey ? {
        ...p,
        status: p.status === 'OPEN' ? 'LOCKED' : 'OPEN',
        closedBy: 'admin@gpcl.com',
      } : p));
    } catch (e: any) {
      alert(e.message || 'Network error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Financial Period Close & Fiscal Year Lock</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Lock accounting periods to prevent retrospective voucher posting into closed financial periods.
          </p>
        </div>
      </div>

      {/* Info Warning Card */}
      <div style={{ padding: '14px 18px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid #d97706', borderRadius: '8px', color: '#d97706', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ShieldAlert size={18} />
        <span>Locking a period restricts all non-admin accountants from posting, editing, or reversing vouchers for that fiscal date range.</span>
      </div>

      {/* Periods Register */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Period Code</th>
              <th>Period Name</th>
              <th>Date Range</th>
              <th>Lock Status</th>
              <th>Closed By</th>
              <th style={{ textAlign: 'center' }}>Period Control Action</th>
            </tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.periodKey}>
                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{p.periodKey}</td>
                <td style={{ fontWeight: '600' }}>{p.name}</td>
                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.startDate} to {p.endDate}</td>
                <td>
                  <span className={`badge ${
                    p.status === 'OPEN' ? 'badge-success' :
                    p.status === 'LOCKED' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{p.closedBy || 'N/A'}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => togglePeriodLock(p.periodKey)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  >
                    {p.status === 'OPEN' ? <Lock size={12} /> : <Unlock size={12} />}
                    {p.status === 'OPEN' ? 'Lock Period' : 'Unlock Period'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
