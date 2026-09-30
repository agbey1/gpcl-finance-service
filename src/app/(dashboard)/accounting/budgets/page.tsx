'use client';

import { useState } from 'react';
import { Target, TrendingUp, TrendingDown, AlertCircle, Plus } from 'lucide-react';

interface BudgetItem {
  code: string;
  name: string;
  budgetAmount: number;
  actualAmount: number;
  category: string;
}

const mockBudgets: BudgetItem[] = [
  { code: '5001', name: 'Cost of Goods Sold (Paper Stock)', budgetAmount: 350000.00, actualAmount: 310000.00, category: 'COGS' },
  { code: '6100', name: 'Salaries & Staff Payroll Expenses', budgetAmount: 50000.00, actualAmount: 48750.00, category: 'OPERATING' },
  { code: '6200', name: 'Utilities & Power Expenses', budgetAmount: 15000.00, actualAmount: 18500.00, category: 'OPERATING' },
  { code: '6300', name: 'Freight & Stock Handling Costs', budgetAmount: 15000.00, actualAmount: 12400.00, category: 'OPERATING' },
];

export default function BudgetsPage() {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Fiscal Budgets vs. Actual Variance Control</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Set annual operational budgets per expense code and monitor budget consumption variances.
          </p>
        </div>
      </div>

      {/* Budget Performance Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>GL Account Code</th>
              <th>Account Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Annual Budget (GHS)</th>
              <th style={{ textAlign: 'right' }}>Actual Spent (GHS)</th>
              <th style={{ textAlign: 'right' }}>Variance (GHS)</th>
              <th>Consumption %</th>
            </tr>
          </thead>
          <tbody>
            {mockBudgets.map(b => {
              const variance = b.budgetAmount - b.actualAmount;
              const percent = ((b.actualAmount / b.budgetAmount) * 100).toFixed(1);
              const isOver = b.actualAmount > b.budgetAmount;

              return (
                <tr key={b.code}>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{b.code}</td>
                  <td style={{ fontWeight: '600' }}>{b.name}</td>
                  <td><span className="badge badge-info">{b.category}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>GHS {b.budgetAmount.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>GHS {b.actualAmount.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: isOver ? '#dc2626' : '#059669' }}>
                    {isOver ? '-' : '+'}GHS {Math.abs(variance).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(Number(percent), 100)}%`, height: '100%', background: isOver ? '#dc2626' : 'var(--accent-primary)' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', width: '45px' }}>{percent}%</span>
                    </div>
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
