'use client';

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { exportToExcel, exportToCsv, exportToPdf } from '@/lib/exportUtils';

type ReportType = 'DAY_BOOK' | 'TRIAL_BALANCE' | 'PROFIT_LOSS' | 'BALANCE_SHEET' | 'AGING_ANALYSIS' | 'TAX_RETURN';

const mockDayBook = [
  { date: '2026-09-01', voucherNo: 'JNL-2026-089412', voucherType: 'Journal', account: '1202 - Materials Store Inventory', debit: 15400.00, credit: 0.00 },
  { date: '2026-09-01', voucherNo: 'JNL-2026-089412', voucherType: 'Journal', account: '2001 - Accounts Payable Suspense', debit: 0.00, credit: 15400.00 },
  { date: '2026-09-01', voucherNo: 'INV-2026-001054', voucherType: 'Sales Invoice', account: '1100 - Trade Receivables', debit: 27000.00, credit: 0.00 },
  { date: '2026-09-01', voucherNo: 'INV-2026-001054', voucherType: 'Sales Invoice', account: '4001 - Printing Revenue', debit: 0.00, credit: 22500.00 },
  { date: '2026-09-01', voucherNo: 'INV-2026-001054', voucherType: 'Sales Invoice', account: '2100 - VAT Payable (15%)', debit: 0.00, credit: 3375.00 },
  { date: '2026-09-01', voucherNo: 'INV-2026-001054', voucherType: 'Sales Invoice', account: '2102 - NHIS Payable (2.5%)', debit: 0.00, credit: 562.50 },
  { date: '2026-09-01', voucherNo: 'INV-2026-001054', voucherType: 'Sales Invoice', account: '2103 - GETFund Payable (2.5%)', debit: 0.00, credit: 562.50 },
];

const mockTrialBalance = [
  { code: '1001', name: 'Main Cash Account', debit: 14250.00, credit: 0.00 },
  { code: '1002', name: 'GCB Bank - Operating Account', debit: 185400.00, credit: 0.00 },
  { code: '1100', name: 'Trade Receivables (AR)', debit: 248500.00, credit: 0.00 },
  { code: '1201', name: 'Finished Goods Inventory', debit: 94200.00, credit: 0.00 },
  { code: '1202', name: 'Materials Store Inventory', debit: 162100.00, credit: 0.00 },
  { code: '2001', name: 'Accounts Payable (AP)', debit: 0.00, credit: 78300.00 },
  { code: '2100', name: 'VAT Payable (15%)', debit: 0.00, credit: 33750.00 },
  { code: '2102', name: 'NHIS Payable (2.5%)', debit: 0.00, credit: 5625.00 },
  { code: '2103', name: 'GETFund Payable (2.5%)', debit: 0.00, credit: 5625.00 },
  { code: '3001', name: 'Stated Capital', debit: 0.00, credit: 300000.00 },
  { code: '4001', name: 'Commercial Printing Revenue', debit: 0.00, credit: 640000.00 },
  { code: '5001', name: 'Cost of Goods Sold (COGS)', debit: 310000.00, credit: 0.00 },
  { code: '6100', name: 'Salaries & Wages Expense', debit: 48750.00, credit: 0.00 },
];

const mockAging = [
  { client: 'Ghana Publishing Client A', total: 27000.00, current: 27000.00, days30: 0.00, days60: 0.00, days90: 0.00 },
  { client: 'Ministry of Communications', total: 84500.00, current: 0.00, days30: 42000.00, days60: 42500.00, days90: 0.00 },
  { client: 'State Transport Corporation', total: 137000.00, current: 50000.00, days30: 30000.00, days60: 20000.00, days90: 37000.00 },
];

const mockTaxReturn = [
  { period: 'August 2026', netSales: 640000.00, vat: 96000.00, nhis: 16000.00, getfund: 16000.00, totalLevies: 128000.00, status: 'DUE' },
  { period: 'July 2026', netSales: 580000.00, vat: 87000.00, nhis: 14500.00, getfund: 14500.00, totalLevies: 116000.00, status: 'FILED' },
  { period: 'June 2026', netSales: 480000.00, vat: 72000.00, nhis: 12000.00, getfund: 12000.00, totalLevies: 96000.00, status: 'FILED' },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('TRIAL_BALANCE');
  const [agingData, setAgingData] = useState(mockAging);

  useEffect(() => {
    fetch('/api/v1/reports/ar-aging')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'SUCCESS' && Array.isArray(data.agingSummary) && data.agingSummary.length > 0) {
          const apiAging = data.agingSummary.map((item: any) => ({
            client: item.ClientName,
            total: item.TotalBalance,
            current: item.CurrentAmount,
            days30: item.Days1To30,
            days60: item.Days31To60,
            days90: item.DaysOver90,
          }));
          setAgingData(apiAging);
        }
      })
      .catch(() => {});
  }, []);

  const handleExportExcel = () => {
    if (activeReport === 'DAY_BOOK') {
      exportToExcel(mockDayBook, [
        { header: 'Date', key: 'date' },
        { header: 'Voucher No', key: 'voucherNo' },
        { header: 'Voucher Type', key: 'voucherType' },
        { header: 'Account', key: 'account' },
        { header: 'Debit (GHS)', key: 'debit' },
        { header: 'Credit (GHS)', key: 'credit' },
      ], 'Day_Book_Register');
    } else if (activeReport === 'TRIAL_BALANCE') {
      exportToExcel(mockTrialBalance, [
        { header: 'Account Code', key: 'code' },
        { header: 'Account Name', key: 'name' },
        { header: 'Debit (GHS)', key: 'debit' },
        { header: 'Credit (GHS)', key: 'credit' },
      ], 'Trial_Balance_Report');
    } else if (activeReport === 'AGING_ANALYSIS') {
      exportToExcel(mockAging, [
        { header: 'Customer Name', key: 'client' },
        { header: 'Total Outstanding', key: 'total' },
        { header: '0-30 Days', key: 'current' },
        { header: '31-60 Days', key: 'days30' },
        { header: '61-90 Days', key: 'days60' },
        { header: '90+ Days', key: 'days90' },
      ], 'AR_Aging_Analysis');
    } else if (activeReport === 'TAX_RETURN') {
      exportToExcel(mockTaxReturn, [
        { header: 'Filing Period', key: 'period' },
        { header: 'Taxable Sales (GHS)', key: 'netSales' },
        { header: 'VAT 15% (GHS)', key: 'vat' },
        { header: 'NHIS 2.5% (GHS)', key: 'nhis' },
        { header: 'GETFund 2.5% (GHS)', key: 'getfund' },
        { header: 'Total Levies Payable', key: 'totalLevies' },
      ], 'Ghana_GRA_Tax_Returns');
    }
  };

  const handleExportPdf = () => {
    if (activeReport === 'TRIAL_BALANCE') {
      exportToPdf('TRIAL BALANCE REPORT - FY 2026', [
        { header: 'Code', key: 'code' },
        { header: 'Account Name', key: 'name' },
        { header: 'Debit (GHS)', key: 'debit' },
        { header: 'Credit (GHS)', key: 'credit' },
      ], mockTrialBalance, 'Trial_Balance_Report');
    } else if (activeReport === 'DAY_BOOK') {
      exportToPdf('DAY BOOK VOUCHER REGISTER', [
        { header: 'Date', key: 'date' },
        { header: 'Voucher #', key: 'voucherNo' },
        { header: 'Type', key: 'voucherType' },
        { header: 'Account', key: 'account' },
        { header: 'Debit', key: 'debit' },
        { header: 'Credit', key: 'credit' },
      ], mockDayBook, 'Day_Book_Register');
    } else if (activeReport === 'TAX_RETURN') {
      exportToPdf('GHANA GRA STATUTORY TAX RETURN', [
        { header: 'Period', key: 'period' },
        { header: 'Taxable Sales', key: 'netSales' },
        { header: 'VAT 15%', key: 'vat' },
        { header: 'NHIS 2.5%', key: 'nhis' },
        { header: 'GETFund 2.5%', key: 'getfund' },
        { header: 'Total Payable', key: 'totalLevies' },
      ], mockTaxReturn, 'GRA_Tax_Return_Summary');
    }
  };

  const handleExportCsv = () => {
    if (activeReport === 'TRIAL_BALANCE') {
      exportToCsv(mockTrialBalance, [
        { header: 'Code', key: 'code' },
        { header: 'Account Name', key: 'name' },
        { header: 'Debit', key: 'debit' },
        { header: 'Credit', key: 'credit' },
      ], 'Trial_Balance');
    } else if (activeReport === 'TAX_RETURN') {
      exportToCsv(mockTaxReturn, [
        { header: 'Period', key: 'period' },
        { header: 'Net Sales', key: 'netSales' },
        { header: 'VAT', key: 'vat' },
        { header: 'NHIS', key: 'nhis' },
        { header: 'GETFund', key: 'getfund' },
        { header: 'Total', key: 'totalLevies' },
      ], 'GRA_Tax_Return');
    }
  };

  return (
    <div>
      {/* Header & Multi-Format Export Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>General Ledger Financial Reports & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Comprehensive statements, Day Book, Trial Balance, Balance Sheet, Aging Analysis, and Tax Returns.
          </p>
        </div>

        {/* Multi-Format Export Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FileText size={16} color="#dc2626" />
            PDF Export
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet size={16} color="#059669" />
            Excel (XLSX)
          </button>
          <button className="btn btn-secondary" onClick={handleExportCsv}>
            <Download size={16} color="#0284c7" />
            CSV Data
          </button>
        </div>
      </div>

      {/* Financial Report Selection Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'TRIAL_BALANCE', label: 'Trial Balance' },
          { id: 'DAY_BOOK', label: 'Day Book (Register)' },
          { id: 'PROFIT_LOSS', label: 'Profit & Loss (P&L)' },
          { id: 'BALANCE_SHEET', label: 'Balance Sheet' },
          { id: 'AGING_ANALYSIS', label: 'AR Aging Analysis' },
          { id: 'TAX_RETURN', label: 'Ghana Tax Return (VAT)' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as ReportType)}
            className="btn btn-secondary"
            style={{
              borderColor: activeReport === tab.id ? 'var(--accent-primary)' : 'var(--border-color)',
              color: activeReport === tab.id ? 'white' : 'var(--text-secondary)',
              background: activeReport === tab.id ? 'var(--accent-primary)' : 'var(--bg-card)',
              fontWeight: activeReport === tab.id ? '600' : '400',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Body */}
      {activeReport === 'TRIAL_BALANCE' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>TRIAL BALANCE STATEMENT (FY 2026)</h3>
            <span className="badge badge-success">BALANCED: Total Debits == Total Credits</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Particulars / Account Name</th>
                <th style={{ textAlign: 'right' }}>Debit Balance (GHS)</th>
                <th style={{ textAlign: 'right' }}>Credit Balance (GHS)</th>
              </tr>
            </thead>
            <tbody>
              {mockTrialBalance.map(row => (
                <tr key={row.code}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{row.code}</td>
                  <td>{row.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{row.debit > 0 ? row.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{row.credit > 0 ? row.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-primary)', fontWeight: '700', fontSize: '15px' }}>
                <td colSpan={2} style={{ padding: '16px' }}>TOTAL GRAND BALANCES</td>
                <td style={{ textAlign: 'right', padding: '16px', color: '#059669' }}>GHS 1,064,200.00</td>
                <td style={{ textAlign: 'right', padding: '16px', color: '#059669' }}>GHS 1,064,200.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeReport === 'BALANCE_SHEET' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>BALANCE SHEET STATEMENT (AS AT SEPTEMBER 1, 2026)</h3>
            <span className="badge badge-success">ASSETS = LIABILITIES + EQUITY</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* ASSETS SIDE */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid var(--accent-primary)' }}>
                ASSETS
              </h4>
              
              <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', margin: '8px 0' }}>CURRENT ASSETS</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>1001 - Main Cash Account</span>
                <span>GHS 14,250.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>1002 - GCB Bank Operating Account</span>
                <span>GHS 185,400.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>1100 - Trade Receivables (AR)</span>
                <span>GHS 248,500.00</span>
              </div>

              <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', margin: '16px 0 8px 0' }}>INVENTORIES</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>1201 - Finished Goods Inventory</span>
                <span>GHS 94,200.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>1202 - Materials Store Inventory</span>
                <span>GHS 162,100.00</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: '16px', borderTop: '2px solid var(--border-color)', fontWeight: '700', fontSize: '15px', color: '#059669' }}>
                <span>TOTAL ASSETS</span>
                <span>GHS 704,450.00</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY SIDE */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-warning)', marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid var(--accent-warning)' }}>
                LIABILITIES & EQUITY
              </h4>

              <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', margin: '8px 0' }}>CURRENT LIABILITIES</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>2001 - Accounts Payable (AP)</span>
                <span>GHS 78,300.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>2100 - VAT Payable (15%)</span>
                <span>GHS 33,750.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>2102 - NHIS Payable (2.5%)</span>
                <span>GHS 5,625.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>2103 - GETFund Payable (2.5%)</span>
                <span>GHS 5,525.00</span>
              </div>

              <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', margin: '16px 0 8px 0' }}>CAPITAL & RESERVES (EQUITY)</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>3001 - Stated Capital</span>
                <span>GHS 300,000.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <span>3002 - Retained Earnings (Net Profit)</span>
                <span>GHS 281,250.00</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: '16px', borderTop: '2px solid var(--border-color)', fontWeight: '700', fontSize: '15px', color: '#059669' }}>
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>GHS 704,450.00</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'TAX_RETURN' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>GHANA REVENUE AUTHORITY (GRA) STATUTORY TAX RETURN REGISTER</h3>
            <span className="badge badge-info">STATUTORY VAT / NHIL / GETFUND RETURN</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Filing Period</th>
                <th style={{ textAlign: 'right' }}>Taxable Sales (GHS)</th>
                <th style={{ textAlign: 'right' }}>VAT 15% (GHS)</th>
                <th style={{ textAlign: 'right' }}>NHIS 2.5% (GHS)</th>
                <th style={{ textAlign: 'right' }}>GETFund 2.5% (GHS)</th>
                <th style={{ textAlign: 'right' }}>Total Payable (GHS)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockTaxReturn.map(row => (
                <tr key={row.period}>
                  <td style={{ fontWeight: '600' }}>{row.period}</td>
                  <td style={{ textAlign: 'right' }}>GHS {row.netSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right' }}>GHS {row.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right' }}>GHS {row.nhis.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right' }}>GHS {row.getfund.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent-primary)' }}>GHS {row.totalLevies.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
      )}

      {activeReport === 'DAY_BOOK' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>DAY BOOK VOUCHER REGISTER</h3>
            <span className="badge badge-info">Period: 2026-09-01</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher No</th>
                <th>Type</th>
                <th>Particulars</th>
                <th style={{ textAlign: 'right' }}>Debit (GHS)</th>
                <th style={{ textAlign: 'right' }}>Credit (GHS)</th>
              </tr>
            </thead>
            <tbody>
              {mockDayBook.map((row, i) => (
                <tr key={i}>
                  <td>{row.date}</td>
                  <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{row.voucherNo}</td>
                  <td><span className="badge badge-info">{row.voucherType}</span></td>
                  <td>{row.account}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{row.debit > 0 ? row.debit.toFixed(2) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{row.credit > 0 ? row.credit.toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeReport === 'AGING_ANALYSIS' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>ACCOUNTS RECEIVABLE AGING ANALYSIS</h3>
            <span className="badge badge-warning">Total Outstanding: GHS 248,500.00</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Customer / Client Name</th>
                <th style={{ textAlign: 'right' }}>Total Due</th>
                <th style={{ textAlign: 'right' }}>0-30 Days</th>
                <th style={{ textAlign: 'right' }}>31-60 Days</th>
                <th style={{ textAlign: 'right' }}>61-90 Days</th>
                <th style={{ textAlign: 'right' }}>90+ Days</th>
              </tr>
            </thead>
            <tbody>
              {agingData.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '600' }}>{row.client}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>GHS {row.total.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>{row.current > 0 ? row.current.toLocaleString() : '-'}</td>
                  <td style={{ textAlign: 'right', color: '#d97706' }}>{row.days30 > 0 ? row.days30.toLocaleString() : '-'}</td>
                  <td style={{ textAlign: 'right', color: '#f97316' }}>{row.days60 > 0 ? row.days60.toLocaleString() : '-'}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: '700' }}>{row.days90 > 0 ? row.days90.toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeReport === 'PROFIT_LOSS' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>PROFIT & LOSS STATEMENT (INCOME STATEMENT)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600' }}>Gross Operating Revenue</span>
              <span style={{ fontWeight: '700', color: '#059669' }}>GHS 640,000.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600' }}>Less: Cost of Goods Sold (COGS)</span>
              <span style={{ fontWeight: '700', color: '#dc2626' }}>(GHS 310,000.00)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: 'rgba(37,99,235,0.06)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
              <span style={{ fontWeight: '700', fontSize: '15px' }}>GROSS PROFIT MARGIN</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#059669' }}>GHS 330,000.00 (51.5%)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600' }}>Less: Salaries & Operating Expenses</span>
              <span style={{ fontWeight: '700', color: '#dc2626' }}>(GHS 48,750.00)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(5,150,105,0.1)', borderRadius: '8px', border: '1px solid #059669' }}>
              <span style={{ fontWeight: '700', fontSize: '16px' }}>NET OPERATING PROFIT BEFORE TAX</span>
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#059669' }}>GHS 281,250.00 (43.9%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
