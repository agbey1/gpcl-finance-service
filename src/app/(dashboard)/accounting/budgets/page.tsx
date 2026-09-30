'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api, errMsg, fmt, postJson } from '@/lib/clientApi';

interface Budget {
  Id: number;
  BudgetName: string;
  Description: string | null;
  Period: string;
  FiscalYear: number;
  Status: string;
}

interface VarianceRow {
  accountCode: string;
  accountName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'FAVORABLE' | 'UNFAVORABLE' | 'ON_TRACK';
}

interface Account {
  AccountCode: string;
  AccountName: string;
  AccountType: string;
  IsActive: boolean;
}

const thisYear = new Date().getFullYear();

export default function BudgetsPage() {
  const [year, setYear] = useState(thisYear);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [variance, setVariance] = useState<VarianceRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<{ accountCode: string; amount: string }[]>([{ accountCode: '', amount: '' }]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadVariance = useCallback(async (id: number) => {
    setSelectedId(id);
    try {
      const data = await api<{ variance: VarianceRow[] }>(`/api/v1/analytics/budgets/${id}/variance`);
      setVariance(data.variance);
    } catch (e) {
      setError(errMsg(e, 'Failed to load variance'));
    }
  }, []);

  const load = useCallback(async (fy: number) => {
    setLoading(true);
    setError('');
    try {
      const [b, a] = await Promise.all([
        api<{ budgets: Budget[] }>(`/api/v1/analytics/budgets?fiscalYear=${fy}&limit=100`),
        api<{ accounts: Account[] }>('/api/v1/accounting/accounts'),
      ]);
      setBudgets(b.budgets);
      setAccounts(a.accounts.filter((x) => x.IsActive && ['EXPENSE', 'REVENUE'].includes(x.AccountType)));
      setVariance([]);
      setSelectedId(null);
      if (b.budgets[0]) await loadVariance(b.budgets[0].Id);
    } catch (e) {
      setError(errMsg(e, 'Failed to load budgets'));
    } finally {
      setLoading(false);
    }
  }, [loadVariance]);

  useEffect(() => {
    // Load on mount / year change; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(year);
  }, [load, year]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await postJson('/api/v1/analytics/budgets', {
        budgetName: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        period: 'ANNUAL',
        fiscalYear: year,
        lineItems: lines
          .filter((l) => l.accountCode && Number(l.amount) > 0)
          .map((l) => ({ accountCode: l.accountCode, budgetAmount: Math.round(Number(l.amount) * 100) / 100 })),
      });
      setShowCreate(false);
      setName('');
      setDescription('');
      setLines([{ accountCode: '', amount: '' }]);
      await load(year);
    } catch (err) {
      setFormError(errMsg(err, 'Failed to create budget'));
    } finally {
      setSaving(false);
    }
  };

  const totals = variance.reduce((t, v) => ({ budgeted: t.budgeted + v.budgeted, actual: t.actual + v.actual }), { budgeted: 0, actual: 0 });
  const inputStyle = { padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Budgets vs. Actual</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Annual budgets per GL account compared with posted activity for the fiscal year.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={inputStyle}>
            {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>FY {y}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={() => load(year)} disabled={loading}>
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New Budget
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
        <div className="card" style={{ padding: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>BUDGETS — FY {year}</p>
          {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading…</p>}
          {!loading && budgets.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No budgets for this year.</p>}
          {budgets.map((b) => (
            <button
              key={b.Id}
              onClick={() => loadVariance(b.Id)}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'space-between', marginBottom: '6px', borderColor: selectedId === b.Id ? 'var(--accent-primary)' : undefined }}
            >
              <span>{b.BudgetName}</span>
              <span className="badge badge-info">{b.Status}</span>
            </button>
          ))}
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Budget (GHS)</th>
                <th style={{ textAlign: 'right' }}>Actual (GHS)</th>
                <th style={{ textAlign: 'right' }}>Variance (GHS)</th>
                <th>Consumption</th>
              </tr>
            </thead>
            <tbody>
              {variance.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Select a budget.</td></tr>}
              {variance.map((v) => {
                const pct = v.budgeted > 0 ? (v.actual / v.budgeted) * 100 : 0;
                const bad = v.status === 'UNFAVORABLE';
                return (
                  <tr key={v.accountCode}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent-primary)' }}>{v.accountCode}</span> {v.accountName}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(v.budgeted)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(v.actual)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: bad ? '#dc2626' : '#059669' }}>{fmt(v.variance)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: bad ? '#dc2626' : 'var(--accent-primary)' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '600', width: '52px' }}>{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {variance.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: '700' }}>
                  <td>Total</td>
                  <td style={{ textAlign: 'right' }}>{fmt(totals.budgeted)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(totals.actual)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(totals.budgeted - totals.actual)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={create} style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>New annual budget — FY {year}</h2>
            <input placeholder="Budget name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input placeholder="Description (optional)" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
            {lines.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1.3fr auto', gap: '8px' }}>
                <select value={l.accountCode} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, accountCode: e.target.value } : x)))} style={inputStyle} required>
                  <option value="">Account…</option>
                  {accounts.map((a) => <option key={a.AccountCode} value={a.AccountCode}>{a.AccountCode} — {a.AccountName}</option>)}
                </select>
                <input type="number" min="0.01" step="0.01" placeholder="Amount (GHS)" required value={l.amount} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} style={inputStyle} />
                <button type="button" className="btn btn-secondary" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={() => setLines([...lines, { accountCode: '', amount: '' }])} style={{ alignSelf: 'flex-start' }}>
              <Plus size={14} /> Add account
            </button>
            {formError && <p style={{ color: '#dc2626', fontSize: '13px' }}>{formError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create budget'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
