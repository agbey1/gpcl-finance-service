'use client';

import { useState } from 'react';
import { Plus, Check, FileCheck, Keyboard, ArrowRightLeft } from 'lucide-react';

type VoucherType = 'JOURNAL' | 'PAYMENT' | 'RECEIPT' | 'CONTRA' | 'SALES' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export default function VouchersPage() {
  const [voucherType, setVoucherType] = useState<VoucherType>('JOURNAL');
  const [voucherDate, setVoucherDate] = useState('2026-09-01');
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');

  const [lines, setLines] = useState([
    { accountCode: '1100', accountName: 'Trade Receivables', debit: 1000, credit: 0 },
    { accountCode: '4001', accountName: 'Commercial Printing Revenue', debit: 0, credit: 1000 },
  ]);

  const totalDebit = lines.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.001;

  const addLine = () => {
    setLines([...lines, { accountCode: '1001', accountName: 'Main Cash Account', debit: 0, credit: 0 }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Multi-Voucher Entry Workspace</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            High-speed double-entry voucher posting engine with shortcut keys (`F4` to `F9`).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Keyboard size={16} color="var(--accent-primary)" />
          Shortcuts: F4 (Contra) | F5 (Payment) | F6 (Receipt) | F7 (Journal) | F8 (Sales) | F9 (Purchase)
        </div>
      </div>

      {/* Voucher Type Selector Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { type: 'JOURNAL', key: 'F7', label: 'Journal Voucher (F7)' },
          { type: 'PAYMENT', key: 'F5', label: 'Payment Voucher (F5)' },
          { type: 'RECEIPT', key: 'F6', label: 'Receipt Voucher (F6)' },
          { type: 'CONTRA', key: 'F4', label: 'Contra Voucher (F4)' },
          { type: 'SALES', key: 'F8', label: 'Sales Voucher (F8)' },
          { type: 'PURCHASE', key: 'F9', label: 'Purchase Voucher (F9)' },
          { type: 'CREDIT_NOTE', key: 'Ctrl+F8', label: 'Credit Note' },
          { type: 'DEBIT_NOTE', key: 'Ctrl+F9', label: 'Debit Note' },
        ].map(item => (
          <button
            key={item.type}
            onClick={() => setVoucherType(item.type as VoucherType)}
            className="btn btn-secondary"
            style={{
              borderColor: voucherType === item.type ? 'var(--accent-primary)' : 'var(--border-color)',
              color: voucherType === item.type ? 'white' : 'var(--text-secondary)',
              background: voucherType === item.type ? 'linear-gradient(135deg, var(--accent-primary), #4f46e5)' : 'rgba(255,255,255,0.02)',
              fontWeight: voucherType === item.type ? '600' : '400',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Voucher Entry Form Card */}
      <div className="glass-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Voucher Type</label>
            <input
              type="text"
              value={voucherType}
              disabled
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--accent-primary)', fontWeight: '700' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Voucher Date</label>
            <input
              type="date"
              value={voucherDate}
              onChange={e => setVoucherDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Reference / Ref No.</label>
            <input
              type="text"
              placeholder="e.g. INV-9941 / CHQ-0012"
              value={reference}
              onChange={e => setReference(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
            />
          </div>
        </div>

        {/* Voucher Line Items Grid */}
        <table className="data-table" style={{ marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Account Code</th>
              <th>Particulars / Account Name</th>
              <th style={{ width: '180px', textAlign: 'right' }}>Debit (GHS)</th>
              <th style={{ width: '180px', textAlign: 'right' }}>Credit (GHS)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={line.accountCode}
                    onChange={e => updateLine(idx, 'accountCode', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', fontFamily: 'monospace' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.accountName}
                    onChange={e => updateLine(idx, 'accountName', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={line.debit}
                    onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', textAlign: 'right' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={line.credit}
                    onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', textAlign: 'right' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: '700', fontSize: '15px', background: 'rgba(255,255,255,0.03)' }}>
              <td colSpan={2}>Voucher Totals</td>
              <td style={{ textAlign: 'right', color: isBalanced ? '#34d399' : '#ef4444' }}>GHS {totalDebit.toFixed(2)}</td>
              <td style={{ textAlign: 'right', color: isBalanced ? '#34d399' : '#ef4444' }}>GHS {totalCredit.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Narration Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Narration / Entry Notes</label>
          <input
            type="text"
            placeholder="Provide entry narration..."
            value={narration}
            onChange={e => setNarration(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          />
        </div>

        {/* Actions Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={addLine}>
            <Plus size={16} />
            Add Entry Line
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className={`badge ${isBalanced ? 'badge-success' : 'badge-danger'}`}>
              {isBalanced ? '✓ DOUBLE ENTRY BALANCED' : '⚠ UNBALANCED VOUCHER'}
            </span>
            <button className="btn btn-primary" disabled={!isBalanced}>
              <Check size={16} />
              Post Voucher to Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
