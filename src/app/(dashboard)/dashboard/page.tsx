'use client';

import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  FileCheck,
  CreditCard,
  Building,
  Plus,
  ArrowRight,
  Activity,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const revenueVsCogsData = [
  { month: 'Apr', Revenue: 420000, COGS: 210000 },
  { month: 'May', Revenue: 510000, COGS: 245000 },
  { month: 'Jun', Revenue: 480000, COGS: 230000 },
  { month: 'Jul', Revenue: 580000, COGS: 275000 },
  { month: 'Aug', Revenue: 640000, COGS: 310000 },
  { month: 'Sep', Revenue: 710000, COGS: 335000 },
];

const expensePieData = [
  { name: 'Cost of Goods Sold', value: 310000, color: 'hsl(215, 100%, 28%)' },
  { name: 'Salaries & Wages', value: 48750, color: '#10b981' },
  { name: 'Ghana Levies (VAT/NHIL)', value: 49700, color: 'hsl(43, 96%, 50%)' },
  { name: 'Utilities & Office', value: 18500, color: '#0284c7' },
  { name: 'Freight & Handling', value: 12400, color: '#8b5cf6' },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Page Title & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.02em' }}>Financial Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Executive General Ledger summary, AR/AP exposure, and financial performance metrics.
          </p>
        </div>

        {/* Executive Quick Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/finance/invoices" className="btn btn-secondary">
            <Plus size={15} />
            New Invoice
          </Link>
          <Link href="/finance/payments" className="btn btn-secondary">
            <DollarSign size={15} />
            Record Payment
          </Link>
          <Link href="/accounting/vouchers" className="btn btn-primary">
            <Zap size={15} />
            Post Voucher (F4-F9)
          </Link>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Trade Receivables (AR)</span>
            <div style={{ padding: '8px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', color: 'var(--accent-primary)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>GHS 248,500.00</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', color: '#059669', fontSize: '12.5px', fontWeight: '500' }}>
            <ArrowUpRight size={14} />
            <span>+12.4% vs last month</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Gross Operating Profit</span>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--accent-secondary)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>GHS 330,000.00</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', color: '#059669', fontSize: '12.5px', fontWeight: '500' }}>
            <span>51.5% Gross Margin</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ghana Levies (VAT/NHIL/GETFund)</span>
            <div style={{ padding: '8px', background: 'rgba(217, 119, 6, 0.1)', borderRadius: '8px', color: 'var(--accent-warning)' }}>
              <Building size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>GHS 49,700.00</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
            15% VAT | 2.5% NHIL | 2.5% GETFund
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Bank Account Balance</span>
            <div style={{ padding: '8px', background: 'rgba(2, 132, 199, 0.1)', borderRadius: '8px', color: 'var(--accent-info)' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>GHS 277,500.00</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
            GCB & Ecobank accounts
          </div>
        </div>
      </div>

      {/* Interactive Recharts Financial Performance Graphs */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Revenue vs COGS Bar Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Revenue vs Cost of Goods Sold (COGS)</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Monthly performance comparisons (GHS)</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: '600' }}>
              <span style={{ color: 'var(--accent-primary)' }}>■ Revenue</span>
              <span style={{ color: '#059669' }}>■ COGS</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueVsCogsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`GHS ${Number(value).toLocaleString()}`, '']}
                />
                <Bar dataKey="Revenue" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="COGS" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Pie Chart */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Expense Distribution</h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Current month operational expenses</p>

          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`GHS ${Number(value).toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
            {expensePieData.slice(0, 3).map(item => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>● {item.name}</span>
                <span style={{ fontWeight: '600' }}>GHS {item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Ledger Postings Grid & Financial Ratios */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Recent General Ledger Journal Activity</h3>
            <Link href="/accounting/journal-entries" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}>
              View All Register →
            </Link>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Entry Number</th>
                <th>Source Module</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount (GHS)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>JNL-2026-089412</td>
                <td><span className="badge badge-info">STORE_GRN</span></td>
                <td>GRN #GRN-2026-00142 - Paper Delivery</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>15,400.00</td>
                <td><span className="badge badge-success">POSTED</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>JNL-2026-089413</td>
                <td><span className="badge badge-info">INVOICE</span></td>
                <td>Customer Invoice #INV-2026-001054</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>27,000.00</td>
                <td><span className="badge badge-success">POSTED</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>JNL-2026-089414</td>
                <td><span className="badge badge-info">PAYMENT</span></td>
                <td>Customer Payment #PAY-2026-000412</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>10,000.00</td>
                <td><span className="badge badge-success">POSTED</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Ratios Card */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Key Financial Ratios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Current Ratio</span>
                <span style={{ fontWeight: '700', color: '#059669' }}>2.45 : 1</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Current Assets vs Current Liabilities</p>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Quick / Acid-Test Ratio</span>
                <span style={{ fontWeight: '700', color: '#059669' }}>1.82 : 1</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Liquid Cash & Receivables vs Liabilities</p>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Debt-to-Equity Ratio</span>
                <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>0.26 : 1</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Total Debt vs Equity Stated Capital</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
