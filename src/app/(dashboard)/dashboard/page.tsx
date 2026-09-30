'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, DollarSign, CreditCard, Building, Plus, Zap, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { api, day, errMsg, fmt } from '@/lib/clientApi';

interface Dashboard {
  asOf: string;
  balances: { receivables: number; bank: number; cash: number; leviesPayable: number };
  yearToDate: { from: string; revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number };
  months: { month: string; revenue: number; cogs: number; expenses: number }[];
  topExpenses: { name: string; value: number }[];
  recentJournals: { Id: number; EntryNumber: string; EntryDate: string; SourceModule: string; Description: string }[];
}

const PIE_COLORS = ['hsl(215, 100%, 28%)', '#10b981', 'hsl(43, 96%, 50%)', '#0284c7', '#8b5cf6', '#94a3b8'];

function Metric({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>{label}</span>
        <div style={{ padding: '8px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', color: 'var(--accent-primary)' }}>{icon}</div>
      </div>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color }}>{value}</h2>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>{sub}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api<Dashboard>('/api/v1/analytics/dashboard'));
    } catch (e) {
      setError(errMsg(e, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const ytd = data?.yearToDate;
  const margin = ytd && ytd.revenue > 0 ? ((ytd.grossProfit / ytd.revenue) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.02em' }}>Financial Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            {data ? `Posted ledger figures as at ${data.asOf}; P&L year to date from ${data.yearToDate.from}.` : 'Loading ledger figures…'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15} /></button>
          <Link href="/finance/invoices" className="btn btn-secondary"><Plus size={15} /> New Invoice</Link>
          <Link href="/finance/payments" className="btn btn-secondary"><DollarSign size={15} /> Record Payment</Link>
          <Link href="/accounting/vouchers" className="btn btn-primary"><Zap size={15} /> Post Voucher</Link>
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <Metric label="Trade Receivables (AR)" value={data ? `GHS ${fmt(data.balances.receivables)}` : '—'} sub="Outstanding customer balances" icon={<DollarSign size={18} />} />
        <Metric label="Gross Profit (YTD)" value={ytd ? `GHS ${fmt(ytd.grossProfit)}` : '—'} sub={`${margin}% gross margin · net profit GHS ${ytd ? fmt(ytd.netProfit) : '—'}`} icon={<TrendingUp size={18} />} color={ytd && ytd.grossProfit < 0 ? '#dc2626' : '#059669'} />
        <Metric label="Levies Payable (VAT/NHIL/GETFund)" value={data ? `GHS ${fmt(data.balances.leviesPayable)}` : '—'} sub="Balance on levy liability accounts" icon={<Building size={18} />} />
        <Metric label="Bank & Cash" value={data ? `GHS ${fmt(data.balances.bank + data.balances.cash)}` : '—'} sub={data ? `Bank ${fmt(data.balances.bank)} · Cash ${fmt(data.balances.cash)}` : ''} icon={<CreditCard size={18} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Revenue vs Cost of Goods Sold</h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Last six months (GHS)</p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.months ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => [`GHS ${fmt(Number(value))}`, '']}
                />
                <Bar dataKey="revenue" name="Revenue" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" name="COGS" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Expense breakdown (YTD)</h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Largest expense accounts</p>
          {data && data.topExpenses.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '20px' }}>No expenses posted this year.</p>}
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.topExpenses ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {(data?.topExpenses ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [`GHS ${fmt(Number(value))}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {(data?.topExpenses ?? []).map((e, i) => (
            <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginTop: '6px' }}>
              <span><span style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>■</span> {e.name}</span>
              <span style={{ fontWeight: '600' }}>{fmt(e.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Recent ledger postings</h3>
          <Link href="/accounting/journal-entries" style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>View all →</Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Entry</th>
              <th>Date</th>
              <th>Source</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data && data.recentJournals.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No postings yet.</td></tr>}
            {(data?.recentJournals ?? []).map((j) => (
              <tr key={j.Id}>
                <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent-primary)' }}>{j.EntryNumber}</td>
                <td>{day(j.EntryDate)}</td>
                <td><span className="badge badge-info">{j.SourceModule}</span></td>
                <td>{j.Description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
