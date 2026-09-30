'use client';

import { useState } from 'react';
import { Building, FileText, Download, ShieldCheck } from 'lucide-react';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';

export default function TaxReportsPage() {
  const vatSummary = [
    { period: 'August 2026', netSales: 640000.00, vatAmount: 96000.00, nhisAmount: 16000.00, getfundAmount: 16000.00, totalLevies: 128000.00, status: 'DUE' },
    { period: 'July 2026', netSales: 580000.00, vatAmount: 87000.00, nhisAmount: 14500.00, getfundAmount: 14500.00, totalLevies: 116000.00, status: 'FILED' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Ghana Statutory Tax & Levy Returns (GRA)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Ghana Revenue Authority statutory filing reports for VAT (15%), NHIL (2.5%), GETFund (2.5%), and WHT.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => exportToPdf('GHANA GRA TAX RETURN SUMMARY', [
          { header: 'Filing Period', key: 'period' },
          { header: 'Net Sales (GHS)', key: 'netSales' },
          { header: 'VAT (15%)', key: 'vatAmount' },
          { header: 'NHIS (2.5%)', key: 'nhisAmount' },
          { header: 'GETFund (2.5%)', key: 'getfundAmount' },
          { header: 'Total Levies Payable', key: 'totalLevies' },
        ], vatSummary, 'GRA_Tax_Return_Summary')}>
          <Download size={16} />
          Export GRA Return PDF
        </button>
      </div>

      {/* Tax Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
        <div className="card">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>VAT PAYABLE (15%)</p>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: '4px' }}>GHS 96,000.00</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Due by 15th of next month</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>NHIL LEVY PAYABLE (2.5%)</p>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-secondary)', marginTop: '4px' }}>GHS 16,000.00</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>National Health Insurance Fund</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>GETFUND LEVY PAYABLE (2.5%)</p>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-warning)', marginTop: '4px' }}>GHS 16,000.00</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Ghana Education Trust Fund</p>
        </div>
      </div>

      {/* Filing History Register */}
      <div className="card">
        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Monthly GRA Return Filing Register</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Filing Period</th>
              <th style={{ textAlign: 'right' }}>Taxable Sales (GHS)</th>
              <th style={{ textAlign: 'right' }}>VAT 15% (GHS)</th>
              <th style={{ textAlign: 'right' }}>NHIS 2.5% (GHS)</th>
              <th style={{ textAlign: 'right' }}>GETFund 2.5% (GHS)</th>
              <th style={{ textAlign: 'right' }}>Total Payable (GHS)</th>
              <th>Filing Status</th>
            </tr>
          </thead>
          <tbody>
            {vatSummary.map(row => (
              <tr key={row.period}>
                <td style={{ fontWeight: '600' }}>{row.period}</td>
                <td style={{ textAlign: 'right' }}>{row.netSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>{row.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>{row.nhisAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>{row.getfundAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent-primary)' }}>{row.totalLevies.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`badge ${row.status === 'FILED' ? 'badge-success' : 'badge-warning'}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
